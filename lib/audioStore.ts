// lib/audioStore.ts — KINEO-AUDIO-2026-08-17 ([STAGE] Kineo Audio)
//
// Mesma lei do imageStore (fundador: "precisa ter o storage, obvio"): a URL
// do fal nao e permanente — cada audio gerado e copiado pro nosso bucket
// publico ('renders', path audio/) e gravado na tabela `audios` (RLS: dono
// le as proprias). Best-effort: falha na copia devolve a URL do fal.

import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { randomUUID } from 'crypto'

const BUCKET = 'renders'

function svc(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    console.warn('[audioStore] service env missing — skipping persistence')
    return null
  }
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
}

export async function persistAudio(args: {
  userId: string
  text: string
  model: string
  voice: string | null
  sourceUrl: string
  durationMs: number | null
}): Promise<{ id: string | null; url: string }> {
  const supabase = svc()
  if (!supabase) return { id: null, url: args.sourceUrl }
  try {
    const res = await fetch(args.sourceUrl, { signal: AbortSignal.timeout(30000) })
    if (!res.ok) throw new Error(`download ${res.status}`)
    const buf = await res.arrayBuffer()
    const ct = res.headers.get('content-type') ?? 'audio/mpeg'
    const ext = ct.includes('wav') ? 'wav' : 'mp3'
    const path = `audio/${args.userId}/${randomUUID()}.${ext}`
    const { error } = await supabase.storage.from(BUCKET).upload(path, buf, { contentType: ct, upsert: false })
    if (error) throw new Error(error.message)
    const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path)
    const url = pub.publicUrl
    const { data: row, error: insErr } = await supabase
      .from('audios')
      .insert({
        user_id: args.userId,
        text: args.text.slice(0, 2000),
        model: args.model,
        voice: args.voice,
        url,
        duration_ms: args.durationMs,
      })
      .select('id')
      .single()
    if (insErr || !row) {
      console.warn('[audioStore] insert failed:', insErr?.message)
      return { id: null, url }
    }
    return { id: String(row.id), url }
  } catch (e) {
    console.warn('[audioStore] persist failed — falling back to provider URL:', e instanceof Error ? e.message : String(e))
    return { id: null, url: args.sourceUrl }
  }
}
