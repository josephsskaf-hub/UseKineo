// lib/imageStore.ts — KINEO-IMAGES-STORE-2026-08-17
//
// PROD-BLOCKER resolvido (fundador: "precisa ter o storage, obvio"): a URL
// que o fal devolve NAO e permanente. Este modulo copia cada imagem gerada
// pro NOSSO bucket publico ('renders', mesmo dos videos — path images/) e
// grava a linha na tabela `images` (RLS: dono le as proprias). Mesma
// arquitetura do lib/renderAssets.ts que ja salvou as thumbnails dos videos.
// Best-effort: qualquer falha devolve a URL do fal como fallback — o usuario
// nunca perde a imagem na hora, no maximo perde a permanencia.

import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { randomUUID } from 'crypto'

const BUCKET = 'renders'

function svc(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    console.warn('[imageStore] service env missing — skipping persistence')
    return null
  }
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
}

async function copyToBucket(supabase: SupabaseClient, userId: string, sourceUrl: string): Promise<string> {
  const res = await fetch(sourceUrl, { signal: AbortSignal.timeout(30000) })
  if (!res.ok) throw new Error(`download ${res.status}`)
  const buf = await res.arrayBuffer()
  const ct = res.headers.get('content-type') ?? 'image/png'
  const ext = ct.includes('jpeg') ? 'jpg' : ct.includes('webp') ? 'webp' : 'png'
  const path = `images/${userId}/${randomUUID()}.${ext}`
  const { error } = await supabase.storage.from(BUCKET).upload(path, buf, { contentType: ct, upsert: false })
  if (error) throw new Error(error.message)
  const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path)
  return pub.publicUrl
}

/** Persiste a imagem gerada: storage + linha na tabela. Fallback = URL do fal. */
export async function persistImage(args: {
  userId: string
  prompt: string
  model: string
  sourceUrl: string
}): Promise<{ id: string | null; url: string }> {
  const supabase = svc()
  if (!supabase) return { id: null, url: args.sourceUrl }
  try {
    const url = await copyToBucket(supabase, args.userId, args.sourceUrl)
    const { data: row, error } = await supabase
      .from('images')
      .insert({ user_id: args.userId, prompt: args.prompt.slice(0, 2000), model: args.model, url })
      .select('id')
      .single()
    if (error || !row) {
      console.warn('[imageStore] insert failed:', error?.message)
      return { id: null, url }
    }
    return { id: String(row.id), url }
  } catch (e) {
    console.warn('[imageStore] persist failed — falling back to provider URL:', e instanceof Error ? e.message : String(e))
    return { id: null, url: args.sourceUrl }
  }
}

/** Persiste o upscale e atualiza a linha (se houver id). Fallback = URL do fal. */
export async function persistUpscale(args: {
  userId: string
  imageId: string | null
  sourceUrl: string
}): Promise<string> {
  const supabase = svc()
  if (!supabase) return args.sourceUrl
  try {
    const url = await copyToBucket(supabase, args.userId, args.sourceUrl)
    if (args.imageId) {
      await supabase.from('images').update({ upscaled_url: url }).eq('id', args.imageId).eq('user_id', args.userId)
    }
    return url
  } catch (e) {
    console.warn('[imageStore] upscale persist failed:', e instanceof Error ? e.message : String(e))
    return args.sourceUrl
  }
}
