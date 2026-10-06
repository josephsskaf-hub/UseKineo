// KINEO-CLIPE-MARCA-2026-10-06 — a fiação real da marca do clipe grátis (regra, desenho e ordem em
// lib/clips/freeClipWatermark.ts, executados pelo guardião). Este arquivo só é carregado por import dinâmico em
// lib/clips/clipServer.ts persistClipVideo, e só com FREE_CLIP_WATERMARK_LIVE=true: desligado, ele nem entra na rota.
// KINEO-MARCA-TESTE-INTERNO-2026-10-06 — exceção única: o clipe de PROVA (chave com FREE_CLIP_MARK_TEST_KEY_PREFIX) também
// entra, e aqui o e-mail do dono decide — só conta da casa (isInternalEmail) recebe a marca; conta de fora sai limpa.
//
// Reaproveitado da casa, sem cópia de regra:
//   · Creatomate → submitCreatomateRender / pollCreatomateRender de lib/compose.ts (o mesmo submit da marca dos filmes,
//     com a política de 429 da casa; lib/ads/v2Advance.ts usa os mesmos dois);
//   · bucket → `renders`, pasta clips/<uid>/ do próprio clipe (nenhum bucket novo);
//   · eventos → writeServerEvent (nunca lança, nunca segura a entrega).
import type { SupabaseClient } from '@supabase/supabase-js'
import { pollCreatomateRender, submitCreatomateRender } from '@/lib/compose'
import { writeServerEvent } from '@/lib/serverEvents'
import { isInternalEmail } from '@/lib/internalAccounts' // KINEO-MARCA-TESTE-INTERNO-2026-10-06
import type { ClipRow } from '@/lib/clips/clipFlow'
import {
  CLIP_OWNER_PROFILE_COLUMNS,
  FREE_CLIP_WATERMARK_LIVE,
  brandFreeClip,
  brandedClipPath,
  cleanClipSourcePath,
  freeClipWatermarkDecision,
  isFreeClipMarkTestKey,
  parseBrandMarker,
  type BrandClaim,
  type BrandRenderState,
  type ClipOwnerProfile,
  type FreeClipBrandDeps,
  type FreeClipMarkReason,
} from '@/lib/clips/freeClipWatermark'

const DOWNLOAD_TIMEOUT_MS = 45_000
const MAX_CLIP_BYTES = 200 * 1024 * 1024
const EVENT_VERSION = 'clipe_marca_20261006'

async function downloadBytes(url: string): Promise<Uint8Array> {
  const res = await fetch(url, { signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS), cache: 'no-store' })
  if (!res.ok) throw new Error(`download ${res.status}`)
  const buf = await res.arrayBuffer()
  if (buf.byteLength === 0 || buf.byteLength > MAX_CLIP_BYTES) throw new Error(`bad size ${buf.byteLength}`)
  return new Uint8Array(buf)
}

/**
 * A URL que o clipe recebe ao virar `done` — com marca, ou o limpo quando a marca falhou depois de a cópia limpa existir.
 * null = caminho de sempre (interruptor desligado, quem pagou, perfil ilegível, perto do prazo, trava não gravada).
 * Lança FreeClipNotReady enquanto o render anda (settleClip espera o próximo poll).
 */
export async function persistFreeClipWithMark(ctx: {
  admin: SupabaseClient
  row: ClipRow
  providerUrl: string
  bucket: string
  table: string
  cleanToken: string
  expireMs: number
}): Promise<string | null> {
  const { admin, row, bucket, table } = ctx
  const event = async (name: string, metadata: Record<string, unknown>) => {
    await writeServerEvent({ name, userId: row.user_id, path: '/api/clips', metadata: { ...metadata, version: EVENT_VERSION } }).catch(() => false)
  }

  // A decisão só é tomada uma vez, antes da trava. Com a marca já em andamento, segue até o fim com o motivo gravado nela.
  let reason: FreeClipMarkReason | null = null
  if (!parseBrandMarker(row.video_url)) {
    // KINEO-MARCA-TESTE-INTERNO-2026-10-06 — o clipe de prova (chave de teste) lê também o e-mail do dono: só conta da casa
    // (isInternalEmail, a fonte única) ganha a marca com o interruptor desligado. Qualquer outro clipe: a leitura de sempre.
    const markTestKey = isFreeClipMarkTestKey(row.idempotency_key)
    const { data, error } = await admin
      .from('profiles')
      .select(markTestKey ? `${CLIP_OWNER_PROFILE_COLUMNS},email` : CLIP_OWNER_PROFILE_COLUMNS)
      .eq('id', row.user_id)
      .maybeSingle()
    const profile = error ? null : ((data ?? null) as (ClipOwnerProfile & { email?: unknown }) | null)
    const decision = freeClipWatermarkDecision({
      live: FREE_CLIP_WATERMARK_LIVE,
      profile,
      markTest: markTestKey
        ? { key: row.idempotency_key, ownerInternal: isInternalEmail(typeof profile?.email === 'string' ? profile.email : null) }
        : undefined,
    })
    if (!decision.brand) {
      if (decision.reason === 'profile_unreadable') {
        await event('clip_watermark_failed', { clip_id: row.id, engine: row.engine, seconds: row.seconds, stage: 'profile', error: error?.message?.slice(0, 160) ?? null, delivered: 'clean' })
      }
      return null
    }
    reason = decision.reason
  }

  const cleanPath = cleanClipSourcePath(row.user_id, row.id, ctx.cleanToken)
  const publicUrl = (path: string) => {
    const { data } = admin.storage.from(bucket).getPublicUrl(path)
    if (!data?.publicUrl) throw new Error('no public url')
    return data.publicUrl
  }
  const upload = async (path: string, bytes: Uint8Array) => {
    const { error } = await admin.storage.from(bucket).upload(path, bytes, { contentType: 'video/mp4', upsert: true })
    if (error) throw new Error(error.message)
    return publicUrl(path)
  }

  const deps: FreeClipBrandDeps = {
    now: () => Date.now(),
    claim: async (marker): Promise<BrandClaim> => {
      const { data, error } = await admin
        .from(table)
        .update({ video_url: marker })
        .eq('id', row.id)
        .eq('status', 'processing')
        .is('video_url', null)
        .select('id')
      if (error) {
        console.error(`[clips/marca] claim failed clip=${row.id}:`, error.message)
        return 'error'
      }
      return (data ?? []).length > 0 ? 'claimed' : 'taken'
    },
    swap: async (from, to) => {
      const { data, error } = await admin
        .from(table)
        .update({ video_url: to })
        .eq('id', row.id)
        .eq('status', 'processing')
        .eq('video_url', from)
        .select('id')
      if (error) console.error(`[clips/marca] swap failed clip=${row.id}:`, error.message)
      return !error && (data ?? []).length > 0
    },
    download: downloadBytes,
    uploadClean: (bytes) => upload(cleanPath, bytes),
    cleanUrl: () => publicUrl(cleanPath),
    submit: (source) => submitCreatomateRender(source),
    poll: async (renderId): Promise<BrandRenderState> => {
      const st = await pollCreatomateRender(renderId)
      if (st.status === 'succeeded' && st.url) return { status: 'succeeded', url: st.url }
      if (st.status === 'failed' || st.status === 'cancelled') return { status: 'failed', error: st.error }
      return { status: 'pending' }
    },
    copyBranded: async (url) => upload(brandedClipPath(row.user_id, row.id), await downloadBytes(url)),
    event: (name, metadata) => event(name, metadata),
  }

  return brandFreeClip(deps, {
    row,
    providerUrl: ctx.providerUrl,
    reason,
    ageMs: Date.now() - Date.parse(row.created_at),
    expireMs: ctx.expireMs,
  })
}
