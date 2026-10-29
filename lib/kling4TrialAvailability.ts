// Public announcement state only: this read does not reserve a film or promise capacity to a later request.
import type { SupabaseClient } from '@supabase/supabase-js'
import { KLING4_TRIAL_LIVE } from '@/lib/kling4TrialPolicy'
import { KLING4_TRIAL_COST_USD, KLING4_TRIAL_DAILY_CAP_USD } from '@/lib/kling4TrialBudget'
import { filmeGratisPermitido } from '@/lib/freeFilmPolicy'

export type Kling4TrialAvailability = {
  available: boolean
  utcDay: string
  checkedAt: string
  validUntil: string
}

export const KLING4_ANNOUNCEMENT_RECHECK_MS = 15_000

/** Point-in-time display check. Only reserve_kling4_trial can authorize spending, atomically at generation. */
export async function readKling4TrialAvailability(
  admin: SupabaseClient | null,
  opts: { country?: string | null; now?: Date; live?: boolean } = {},
): Promise<Kling4TrialAvailability> {
  const now = opts.now ?? new Date()
  const day = now.toISOString().slice(0, 10)
  const midnight = Date.parse(`${day}T00:00:00.000Z`) + 86_400_000
  const state: Kling4TrialAvailability = {
    available: false, utcDay: day, checkedAt: now.toISOString(),
    validUntil: new Date(Math.min(now.getTime() + KLING4_ANNOUNCEMENT_RECHECK_MS, midnight)).toISOString(),
  }
  if (!(opts.live ?? KLING4_TRIAL_LIVE) || !admin || !filmeGratisPermitido(opts.country)) return state
  try {
    const r = await admin.from('kling4_trial_days').select('reserved_milliusd')
      .eq('request_day', day).abortSignal(AbortSignal.timeout(1_500)).maybeSingle()
    if (r.error) return state
    // A known-empty day has its entire allowance. Missing table/schema/query errors never mean zero spending.
    const reserved = r.data === null ? 0 : r.data?.reserved_milliusd
    const cap = Math.round(KLING4_TRIAL_DAILY_CAP_USD * 1000)
    const nextFilm = Math.round(KLING4_TRIAL_COST_USD * 1000)
    if (typeof reserved !== 'number' || !Number.isInteger(reserved) || reserved < 0 || reserved > cap) return state
    return { ...state, available: reserved + nextFilm <= cap }
  } catch { return state }
}
