export const TRIAL_DOWNGRADE_PLAN_CHOICE_VERSION = 'trial_downgrade_plan_choice_v1'

export const TRIAL_DOWNGRADE_PLAN_COMPARE_HREF =
  '/pricing?intent_campaign=trial_downgrade_plan_choice_v1#plans'

/**
 * Visiting the plan grid is not a rejection of the downgrade offer. Pause the
 * modal long enough for a deliberate comparison, without turning that visit
 * into the permanent `stay_free` decision or consuming the final deferral.
 */
export function comparisonDeferralValue(
  current: string | null,
  nowMs: number,
  maxDeferrals: number,
): string {
  const safeNow = Number.isFinite(nowMs) && nowMs >= 0 ? Math.floor(nowMs) : 0
  const safeMax = Number.isFinite(maxDeferrals) ? Math.max(2, Math.floor(maxDeferrals)) : 2
  const parts = current?.split(':') ?? []
  const prior = Number(parts[1])
  const safePrior = Number.isFinite(prior) && prior >= 1 ? Math.floor(prior) : 1
  const count = Math.min(safePrior, safeMax - 1)
  return `${safeNow}:${count}`
}
