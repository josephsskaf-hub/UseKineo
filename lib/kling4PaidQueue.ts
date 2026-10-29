import { randomUUID } from 'node:crypto'
import type { SupabaseClient } from '@supabase/supabase-js'

export type Kling4PaidPhase = 'kling4' | 'fallback'
type Identity = { userId: string; jobId: string; phase: Kling4PaidPhase; index: number }
export type Kling4PaidSlot =
  | { code: 'claimed'; token: string }
  | { code: 'existing'; state: string; requestId: string | null; model: string | null }
  | { code: 'unavailable' }

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu
function validIdentity(i: Identity): boolean {
  return uuid.test(i.userId) && /^[A-Za-z0-9_-]{8,100}$/u.test(i.jobId) &&
    ['kling4','fallback'].includes(i.phase) && Number.isInteger(i.index) && i.index >= 0 && i.index < (i.phase === 'kling4' ? 4 : 12)
}
const rowOf = (data: unknown): Record<string, unknown> | undefined =>
  (Array.isArray(data) ? data[0] : data) as Record<string, unknown> | undefined
const rpcIdentity = (i: Identity) => ({ p_user_id: i.userId, p_job_id: i.jobId, p_phase: i.phase, p_scene_index: i.index })

/** Only a new durable slot permits a POST. An existing pending/ambiguous slot is never reclaimed. */
export async function claimKling4PaidSlot(db: SupabaseClient, i: Identity): Promise<Kling4PaidSlot> {
  if (!validIdentity(i)) return { code: 'unavailable' }
  const token = randomUUID()
  try {
    const r = await db.rpc('claim_kling4_paid_scene', { ...rpcIdentity(i), p_claim_token: token })
    const row = rowOf(r.data)
    if (r.error || !row) return { code: 'unavailable' }
    if (row.code === 'claimed') return { code: 'claimed', token }
    if (row.code === 'existing' && ['pending','accepted','rejected','ambiguous'].includes(String(row.state))) return {
      code: 'existing', state: String(row.state), requestId: typeof row.request_id === 'string' ? row.request_id : null,
      model: typeof row.model === 'string' ? row.model : null,
    }
  } catch { /* No ledger means no paid submission. */ }
  return { code: 'unavailable' }
}

/** Retry only persistence of the same receipt, never inference. */
export async function finishKling4PaidSlot(db: SupabaseClient,
  i: Identity & { token: string; state: 'accepted' | 'rejected' | 'ambiguous'; requestId: string | null; model: string },
): Promise<boolean> {
  if (!validIdentity(i) || !uuid.test(i.token)) return false
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const r = await db.rpc('finish_kling4_paid_scene', { ...rpcIdentity(i), p_claim_token: i.token,
        p_state: i.state, p_request_id: i.requestId, p_model: i.model })
      const row = rowOf(r.data)
      if (!r.error && (row?.code === 'ok' || row?.code === 'unchanged')) return true
      if (row?.code === 'frozen' || row?.code === 'not_owner' || row?.code === 'invalid') return false
    } catch { /* Same immutable receipt can be persisted again. */ }
  }
  return false
}

export async function readKling4PaidSlots(db: SupabaseClient,
  i: { userId: string; jobId: string; phase: Kling4PaidPhase; count: number },
): Promise<{ finalized: false } | { finalized: true; ids: (string | null)[]; states: string[] }> {
  if (!validIdentity({ ...i, index: 0 }) || !(i.phase === 'kling4' ? [1,2,4] : [3,6,12]).includes(i.count)) return { finalized: false }
  try {
    const r = await db.rpc('read_kling4_paid_scenes', { p_user_id: i.userId, p_job_id: i.jobId, p_phase: i.phase, p_count: i.count })
    const row = rowOf(r.data)
    if (r.error || row?.code !== 'finalized' || !Array.isArray(row.request_ids) || !Array.isArray(row.states) ||
      row.request_ids.length !== i.count || row.states.length !== i.count ||
      row.request_ids.some(id => id !== null && (typeof id !== 'string' || !id.trim() || id.length > 512)) ||
      row.states.some(state => !['accepted','rejected','ambiguous'].includes(String(state))) ||
      row.request_ids.some((id, n) => (id !== null) !== (row.states as string[])[n].includes('accepted'))) return { finalized: false }
    return { finalized: true, ids: row.request_ids as (string | null)[], states: row.states as string[] }
  } catch { return { finalized: false } }
}
