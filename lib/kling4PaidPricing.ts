// Founder 28/10: keep 150cr/60s; short-film approximations are subordinate to the 40% floor.
// Explicit budget, not a vendor invoice: one still (0.10), at most one Seedance fallback
// (3 x 6s x 0.026 per 15-second chunk), and 0.33 provision for non-video costs.
export const KLING4_PAID_CREDITS = { 15: 45, 30: 80, 60: 150 } as const
export const KLING4_CREATOR_CREDIT_USD = 0.133
export const KLING4_PAID_OTHER_PROVISION_MILLIUSD = 330
export const KLING4_PAID_STILL_MILLIUSD = 100
export const KLING4_PAID_FALLBACK_CHUNK_MILLIUSD = 468

export function kling4PaidCredits(seconds: number): number {
  if (seconds !== 15 && seconds !== 30 && seconds !== 60) throw new Error('kling4_paid_duration_not_offered')
  return KLING4_PAID_CREDITS[seconds]
}

export function kling4PaidFalExtrasMilliUsd(seconds: number): number {
  kling4PaidCredits(seconds)
  return KLING4_PAID_STILL_MILLIUSD + seconds / 15 * KLING4_PAID_FALLBACK_CHUNK_MILLIUSD
}

export function kling4PaidBudget(seconds: number) {
  const credits = kling4PaidCredits(seconds)
  const falMilliUsd = seconds * 157 + kling4PaidFalExtrasMilliUsd(seconds)
  const totalMilliUsd = falMilliUsd + KLING4_PAID_OTHER_PROVISION_MILLIUSD
  const revenueMilliUsd = credits * 133
  return { credits, falMilliUsd, totalMilliUsd, revenueMilliUsd,
    marginFloorMet: totalMilliUsd * 5 <= revenueMilliUsd * 3,
    costBasis: 'bounded_fal_calls_plus_nonfal_provision' as const }
}
