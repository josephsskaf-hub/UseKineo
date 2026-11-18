import type { SupabaseClient } from '@supabase/supabase-js'
import { recordedFilmEngine } from './engineLabel'

/** History has already persisted the video. A best-effort metadata repair must never veto delivery. */
export async function existingFilmId(admin: SupabaseClient, userId: string, renderId: string, engine?: string | null): Promise<string | undefined> {
  let id: string | undefined
  try {
    const row = await admin.from('videos').select('id,engine_used').eq('render_id', renderId).eq('user_id', userId).maybeSingle()
    if (row.error) throw row.error
    if (!row.data?.id) return
    id = String(row.data.id)
    const before = row.data.engine_used
    const after = recordedFilmEngine(engine)
    if (!after || (before !== null && before !== 'unknown')) return id
    const update = admin.from('videos').update({ engine_used: after }).eq('id', id).eq('user_id', userId).eq('render_id', renderId)
    const repair = await (before === null ? update.is('engine_used', null) : update.eq('engine_used', before)).select('id').maybeSingle()
    if (repair.error) throw repair.error
    if (repair.data) console.info('[history] repaired engine receipt', { id, renderId, before, after })
  } catch (error) {
    console.warn('[history] duplicate engine receipt unavailable', { renderId, error: String(error instanceof Error ? error.message : (error as {message?: string} | null)?.message ?? error) })
  }
  return id
}
