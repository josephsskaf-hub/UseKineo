// Server-only admission for NEW fal calls in an already accepted free promotion job.
// A later UTC day must reserve today's capacity too; yesterday's reservation is never replenished.
import type { SupabaseClient } from '@supabase/supabase-js'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu

/** Call before each new fal dispatch phase, not before read-only provider polling.
 * The RPC derives the entire amount from the immutable service-owned original reservation.
 * false means no new provider POST: preserve the existing accepted job and retry admission later.
 */
export async function ensureKling4PromoBudgetToday(admin: SupabaseClient,
  i: { userId: string; jobId: string }): Promise<boolean> {
  if (!UUID.test(i.userId) || typeof i.jobId !== 'string' || !i.jobId.trim() || i.jobId.length > 200) return false
  try {
    const result = await admin.rpc('ensure_kling4_promo_budget_today', { p_user_id: i.userId, p_job_id: i.jobId })
    const row = Array.isArray(result.data) ? result.data[0] : result.data
    return !result.error && row?.allowed === true && ['current_day', 'reserved', 'duplicate'].includes(row.reason)
      && Number.isSafeInteger(row.reserved_milliusd) && row.reserved_milliusd >= 157 && row.reserved_milliusd <= 19_420
  } catch { return false }
}
