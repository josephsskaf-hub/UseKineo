// lib/renderAssets.ts — Push #230
//
// Problem: Creatomate hosts a finished render's MP4 (`output_url`) and its
// JPG thumbnail (`snapshot_url`) on its own CDN. Those URLs expire / get
// garbage-collected after Creatomate's retention window, which is why the
// dashboard's recent-shorts thumbnails (and eventually the videos) break.
//
// Solution: as soon as a render is confirmed SUCCEEDED, copy both assets
// into a public Supabase Storage bucket and persist THOSE permanent URLs in
// the `videos` table instead. Mirrors lib/videoCache.ts (download server-
// side, upload to Storage, HEAD-check for idempotency, graceful fallback).
//
// Setup: a public bucket (created automatically on first run by the service
// role) — see RENDER_BUCKET below. Requires SUPABASE_SERVICE_ROLE_KEY.

import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const RENDER_BUCKET = 'renders'

function getServiceClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) {
    console.warn('[renderAssets] Supabase env vars not configured — skipping migration')
    return null
  }
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
}

// Best-effort, once per warm instance. Creating an existing bucket returns a
// "already exists" error which we treat as success. Any other failure is left
// to surface on upload (which then falls back to the Creatomate URL).
let bucketEnsured = false
async function ensureBucket(supabase: SupabaseClient): Promise<void> {
  if (bucketEnsured) return
  try {
    const { error } = await supabase.storage.createBucket(RENDER_BUCKET, { public: true })
    if (error && !/already exists|exists/i.test(error.message)) {
      console.warn('[renderAssets] createBucket error:', error.message)
    }
  } catch (e) {
    console.warn('[renderAssets] createBucket threw:', e instanceof Error ? e.message : String(e))
  }
  bucketEnsured = true
}

/**
 * Copy one asset to Supabase Storage and return its permanent public URL.
 * Returns null on any failure so the caller can fall back to the source URL.
 * Idempotent: if the object is already in Storage, we skip the download.
 */
async function migrateAsset(args: {
  supabase: SupabaseClient
  path: string
  sourceUrl: string
  contentType: string
  downloadTimeoutMs: number
}): Promise<string | null> {
  const { supabase, path, sourceUrl, contentType, downloadTimeoutMs } = args
  const { data: pub } = supabase.storage.from(RENDER_BUCKET).getPublicUrl(path)
  const publicUrl = pub.publicUrl

  // Idempotency: already migrated → reuse without re-downloading.
  try {
    const head = await fetch(publicUrl, { method: 'HEAD', signal: AbortSignal.timeout(5000) })
    if (head.ok) {
      console.log(`[renderAssets] HIT path=${path}`)
      return publicUrl
    }
  } catch {
    // Not cached yet — fall through to download + upload.
  }

  let buffer: ArrayBuffer
  try {
    const res = await fetch(sourceUrl, { signal: AbortSignal.timeout(downloadTimeoutMs) })
    if (!res.ok) {
      console.warn(`[renderAssets] download failed path=${path} HTTP ${res.status}`)
      return null
    }
    buffer = await res.arrayBuffer()
  } catch (e) {
    console.warn(`[renderAssets] download error path=${path}:`, e instanceof Error ? e.message : String(e))
    return null
  }

  const { error: uploadError } = await supabase.storage
    .from(RENDER_BUCKET)
    .upload(path, buffer, { contentType, upsert: true })
  if (uploadError) {
    console.warn(`[renderAssets] upload failed path=${path}:`, uploadError.message)
    return null
  }

  console.log(`[renderAssets] MIGRATED path=${path} bytes=${buffer.byteLength}`)
  return publicUrl
}

/**
 * Migrate a finished render's video + thumbnail to permanent Supabase Storage
 * URLs. Best-effort and bounded: any asset that fails to copy keeps its
 * original Creatomate URL, so this never blocks the user's video delivery.
 *
 * Paths are keyed by userId + renderId so re-running for the same render is a
 * cheap no-op (HEAD hit) rather than a re-upload.
 */
export async function persistRenderAssets(args: {
  userId: string
  renderId: string
  videoUrl: string
  snapshotUrl: string | null
}): Promise<{ videoUrl: string; thumbnailUrl: string | null }> {
  const { userId, renderId, videoUrl, snapshotUrl } = args

  const supabase = getServiceClient()
  if (!supabase) return { videoUrl, thumbnailUrl: snapshotUrl }

  await ensureBucket(supabase)

  const videoPath = `${userId}/${renderId}.mp4`
  const thumbPath = `${userId}/${renderId}.jpg`

  const [videoRes, thumbRes] = await Promise.allSettled([
    migrateAsset({
      supabase,
      path: videoPath,
      sourceUrl: videoUrl,
      contentType: 'video/mp4',
      downloadTimeoutMs: 25_000,
    }),
    snapshotUrl
      ? migrateAsset({
          supabase,
          path: thumbPath,
          sourceUrl: snapshotUrl,
          contentType: 'image/jpeg',
          downloadTimeoutMs: 10_000,
        })
      : Promise.resolve(null),
  ])

  const permanentVideo =
    videoRes.status === 'fulfilled' && videoRes.value ? videoRes.value : videoUrl
  const permanentThumb =
    thumbRes.status === 'fulfilled' && thumbRes.value ? thumbRes.value : snapshotUrl

  // KINEO-RESGATE-FILME-DO-FORNECEDOR-2026-09-08 — O SILÊNCIO ERA O DEFEITO.
  // Quando a cópia falha, esta função devolve a URL do Creatomate e segue em
  // frente: o filme é entregue, a pessoa fica feliz, e ~30 dias depois o link
  // morre. A única marca que ficava era um `console.warn` que expira junto com
  // o log da Vercel — por isso 126 filmes de 57 pessoas vazaram sem que
  // ninguém visse, e 91 já estão mortos (medido em 08/09; a fronteira de
  // retenção está entre 06/08 e 17/08).
  // O `downloadTimeoutMs` de 25s NÃO foi aumentado de propósito: quem chama
  // isto é `/api/compose/status`, que tem `maxDuration = 60` e a PESSOA
  // esperando o filme do outro lado. Um orçamento maior aqui trocaria um link
  // que morre em 30 dias por uma entrega que falha agora. O download longo
  // mora onde não há ninguém esperando: `/api/cron/rescue-vendor-assets`.
  // O que muda aqui é só isto: a falha passa a deixar rastro em `events`, com
  // dono e render, para que o resgate saiba a quem voltar.
  if (permanentVideo === videoUrl) {
    try {
      await supabase.from('events').insert({
        user_id: userId,
        name: 'render_asset_left_on_vendor',
        path: '/lib/renderAssets',
        metadata: {
          render_id: renderId,
          vendor_url: videoUrl,
          thumb_migrated: !!permanentThumb && permanentThumb !== snapshotUrl,
          download_timeout_ms: 25_000,
        },
      })
    } catch {
      // Carimbo é best-effort: nunca pode atrapalhar a entrega do filme.
    }
  }

  return { videoUrl: permanentVideo, thumbnailUrl: permanentThumb }
}
