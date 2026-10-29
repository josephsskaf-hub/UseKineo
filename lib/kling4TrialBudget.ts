// KINEO-KLING4-TRIAL-2810: reserve before the paid call; uncertainty never replenishes the daily allowance.
import type { SupabaseClient } from '@supabase/supabase-js'

export const KLING4_TRIAL_COST_USD = 2.355
export const KLING4_TRIAL_DAILY_CAP_USD = 60
export type Kling4TrialEngineUsed = 'kling4' | 'seedance15_fallback' | 'seedance15_cap'
type Identity = { jobId: string; userId: string; country?: string | null }
export type Kling4TrialReservation =
  | { allowed: true; reservedUsd: number }
  | { allowed: false; reason: 'cap' | 'duplicate' | 'unavailable' }

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu
const validIdentity = (i: Identity) => UUID.test(i.userId) && typeof i.jobId === 'string' && i.jobId.trim().length > 0 && i.jobId.length <= 200
const country = (value: string | null | undefined) => typeof value === 'string' && /^[a-z]{2}$/iu.test(value) ? value.toUpperCase() : null

/** Only a NEW atomic reservation permits one Kling submission. Replays must use the existing claim or Seedance. */
export async function reserveKling4Trial(admin: SupabaseClient, i: Identity): Promise<Kling4TrialReservation> {
  if (!validIdentity(i)) return { allowed: false, reason: 'unavailable' }
  try {
    const r = await admin.rpc('reserve_kling4_trial', { p_job_id: i.jobId, p_user_id: i.userId, p_country: country(i.country) })
    const row = Array.isArray(r.data) ? r.data[0] : r.data
    if (r.error || !row) return { allowed: false, reason: 'unavailable' }
    if (row.code === 'ok' && row.reserved_milliusd === 2355) return { allowed: true, reservedUsd: KLING4_TRIAL_COST_USD }
    if (row.code === 'cap' || row.code === 'duplicate') return { allowed: false, reason: row.code }
  } catch { /* A missing/unreachable ledger must never authorize a paid request. */ }
  return { allowed: false, reason: 'unavailable' }
}

/** One result/event per film; only the terminal async Kling-to-Seedance transition may correct its engine. */
export async function recordKling4TrialFilm(admin: SupabaseClient, i: Identity & { engineUsed: Kling4TrialEngineUsed; costUsd: number }): Promise<boolean> {
  if (!validIdentity(i) || !['kling4', 'seedance15_fallback', 'seedance15_cap'].includes(i.engineUsed)
      || ![0, KLING4_TRIAL_COST_USD].includes(i.costUsd)) return false
  try {
    const r = await admin.rpc('record_kling4_trial_film', {
      p_job_id: i.jobId, p_user_id: i.userId, p_country: country(i.country),
      p_engine_used: i.engineUsed, p_cost_milliusd: Math.round(i.costUsd * 1000),
    })
    const row = Array.isArray(r.data) ? r.data[0] : r.data
    if (r.error || (row?.code !== 'ok' && row?.code !== 'unchanged')) return false
    // A lambda may die after the fallback authority CAS and before correcting its initial Kling event.
    // Common birth/compose replays repair that one-way transition without changing cost or country.
    if (row.code === 'unchanged' && i.engineUsed === 'seedance15_fallback' && i.costUsd === KLING4_TRIAL_COST_USD) {
      const transitioned = await admin.rpc('transition_kling4_trial_fallback', { p_job_id: i.jobId, p_user_id: i.userId })
      const terminal = Array.isArray(transitioned.data) ? transitioned.data[0] : transitioned.data
      return !transitioned.error && (terminal?.code === 'ok' || terminal?.code === 'unchanged')
    }
    return true
  } catch { return false }
}
