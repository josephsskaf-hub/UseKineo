import { KLING4_PROMO_DAILY_LIMIT, kling4PromoPolicyReason, kling4PromoWindow,
  KLING4_PROMO_SIGNUP_CUTOFF, type Kling4PaidSubscription, type Kling4PromoPolicy,
  type Kling4PromoReason } from './kling4PaidPolicy'

export type Kling4PromoAvailability = {
  paidLive: boolean; promoLive: boolean; promoAvailable: boolean; publicOfferLive: boolean
  reason: Kling4PromoReason; expiresAt: string | null; remainingToday: number | null
  checkedAt: string; validUntil: string; message: string
}

export function kling4PromoMessage(reason: Kling4PromoReason): string {
  if (reason === 'ok') return 'Kling 4.0 included today — no credits charged.'
  if (reason === 'daily_cap') return 'Today’s shared Kling 4.0 promotion budget is used up. Normal credit prices apply today.'
  if (reason === 'daily_limit') return 'You have used your 3 included Kling 4.0 videos today. Normal credit prices apply until the next UTC day.'
  if (reason === 'plan_not_included') return 'Kling 4.0 free for 30 days comes with Creator or above. On Starter, Kling 4.0 uses regular credits.' // KINEO-PROMO-CREATOR-2910
  if (reason === 'expired') return 'Your 30-day Kling 4.0 promotion has ended. Normal credit prices apply.'
  if (reason === 'reservation_expired') return 'This prepared ad’s promotion reservation has expired. Review the normal credit price before starting, or create a new eligible ad.'
  return 'Normal credit prices apply. Your generation request checks promotion eligibility again before charging.'
}

/** Point-in-time display only. The generation route must still reserve the full request atomically. */
export function buildKling4PromoAvailability(i: {
  policy: Kling4PromoPolicy; subscription: Kling4PaidSubscription | null; now: number
  budgetAvailable: boolean | null; usedToday: number | null; enrollmentExpiresAt?: string | null
  subscriptionUnavailable?: boolean
}): Kling4PromoAvailability {
  const window = kling4PromoWindow(i.subscription, i.policy, i.now)
  const policyReason = kling4PromoPolicyReason(i.policy, i.now)
  const cutoff = Date.parse(KLING4_PROMO_SIGNUP_CUTOFF)
  let reason = window.reason
  let expiresAt = window.expiresAt
  if (i.enrollmentExpiresAt && Number.isFinite(Date.parse(i.enrollmentExpiresAt))) {
    expiresAt = i.enrollmentExpiresAt
    if (i.now >= Date.parse(expiresAt)) reason = 'expired'
  }
  if (i.subscriptionUnavailable && policyReason === 'ok') reason = 'subscription_unverified'
  if (reason === 'ok') {
    if (i.budgetAvailable === null || i.usedToday === null) reason = 'unavailable'
    else if (i.usedToday >= KLING4_PROMO_DAILY_LIMIT) reason = 'daily_limit'
    else if (!i.budgetAvailable) reason = 'daily_cap'
  }
  const publicOfferLive = policyReason === 'ok' && i.now < cutoff && i.budgetAvailable === true
  const nextDay = Date.parse(new Date(i.now).toISOString().slice(0, 10) + 'T00:00:00.000Z') + 86_400_000
  const boundaries = [i.now + 15_000, nextDay]
  if (i.now < cutoff) boundaries.push(cutoff)
  if (expiresAt && Date.parse(expiresAt) > i.now) boundaries.push(Date.parse(expiresAt))
  if (i.subscription && Date.parse(i.subscription.paidThrough) > i.now) boundaries.push(Date.parse(i.subscription.paidThrough))
  return { paidLive: i.policy.paidLive, promoLive: i.policy.promoLive,
    promoAvailable: reason === 'ok', publicOfferLive, reason, expiresAt,
    remainingToday: i.usedToday === null ? null : Math.max(0, KLING4_PROMO_DAILY_LIMIT - i.usedToday),
    checkedAt: new Date(i.now).toISOString(), validUntil: new Date(Math.min(...boundaries)).toISOString(),
    message: kling4PromoMessage(reason) }
}
