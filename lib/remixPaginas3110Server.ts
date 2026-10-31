// KINEO-REMIX-PAGINAS-3110 — o motor do filme público, para o "faça a sua versão" abrir o Studio no MESMO motor.
//
// Leitura separada e mínima de propósito (o mesmo idioma da consulta de consentimento em lib/publicVideos.ts): a
// allow-list PUBLIC_VIDEO_COLUMNS é auditada e não cresce para carregar um campo que só serve ao botão. Só é chamada
// pela /v/[id] DEPOIS de getPublicVideoResult devolver 'ok' — ou seja, depois do consentimento do dono. Nunca lança:
// sem motor, o botão leva só a ideia e a duração.
import { createClient as createAdminClient } from '@supabase/supabase-js'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function getPublicVideoEngineUsed(id: string): Promise<string | null> {
  if (!UUID.test(id)) return null
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  try {
    const admin = createAdminClient(url, key, {
      auth: { autoRefreshToken: false, persistSession: false },
      global: { fetch: (input, init) => fetch(input, { ...init, cache: 'no-store' }) },
    })
    const { data, error } = await admin
      .from('videos')
      .select('engine_used')
      .eq('id', id)
      .not('published_at', 'is', null)
      .maybeSingle()
    if (error || !data) return null
    const value = (data as { engine_used: string | null }).engine_used
    return typeof value === 'string' && value.trim() ? value.trim().slice(0, 40) : null
  } catch {
    return null
  }
}
