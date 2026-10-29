// Founder decision, 2026-10-28. Server policy; the public UI reads the availability endpoint.
// Explicit opt-in; false, absent or malformed values keep the rollout off.
export const KLING4_PAID_LIVE = process.env.KLING4_PAID_LIVE === 'true'
export const KLING4_PROMO_LIVE = process.env.KLING4_PROMO_LIVE === 'true'
export const KLING4_PROMO_DAILY_LIMIT = 3
export const KLING4_PROMO_DAILY_CAP_MILLIUSD = 100_000
export const KLING4_FAL_MILLIUSD_PER_SECOND = 157
// Inclusive 30 November, using the same UTC calendar as the daily counters.
export const KLING4_PROMO_SIGNUP_CUTOFF = '2026-12-01T00:00:00.000Z'
export const KLING4_PROMO_DAYS = 30
export const KLING4_PAID_PLANS = ['starter', 'basic', 'pro', 'business', 'autopilot', 'autopilot_lite'] as const

export type Kling4PaidPlan = typeof KLING4_PAID_PLANS[number]
export type Kling4PromoPolicy = { paidLive: boolean; promoLive: boolean; launchAt: string | null }
export type Kling4PaidSubscription = {
  userId: string; provider: 'stripe' | 'paypal' | 'dodo'; subscriptionId: string
  plan: Kling4PaidPlan; status: 'active'; startedAt: string; paidThrough: string; verifiedAt: string
}
export type Kling4PromoReason = 'ok' | 'paid_off' | 'promo_off' | 'launch_unconfigured' | 'not_launched'
  | 'not_subscribed' | 'subscription_unverified' | 'signup_closed' | 'expired' | 'daily_limit'
  | 'daily_cap' | 'unavailable' | 'invalid_request' | 'identity_conflict'

export const isKling4PaidPlan = (value: unknown): value is Kling4PaidPlan =>
  typeof value === 'string' && (KLING4_PAID_PLANS as readonly string[]).includes(value)

/** Require an explicit UTC ISO timestamp; never turn an absent launch date into "today". */
export function kling4PromoLaunchAt(value: unknown): string | null {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value)) return null
  const parsed = Date.parse(value)
  return Number.isFinite(parsed) && new Date(parsed).toISOString().slice(0, 19) === value.slice(0, 19)
    && parsed < Date.parse(KLING4_PROMO_SIGNUP_CUTOFF)
    ? new Date(parsed).toISOString() : null
}

export function kling4PromoPolicy(env: Record<string, string | undefined> = process.env): Kling4PromoPolicy {
  return { paidLive: env.KLING4_PAID_LIVE === 'true', promoLive: env.KLING4_PROMO_LIVE === 'true',
    launchAt: kling4PromoLaunchAt(env.KLING4_PROMO_LAUNCH_AT) }
}

export function kling4PromoPolicyReason(policy: Kling4PromoPolicy, now = Date.now()): Kling4PromoReason {
  if (!policy.paidLive) return 'paid_off'
  if (!policy.promoLive) return 'promo_off'
  const launch = kling4PromoLaunchAt(policy.launchAt)
  if (!launch) return 'launch_unconfigured'
  if (now < Date.parse(launch)) return 'not_launched'
  return 'ok'
}

/** A real active paid subscription, not a previous pack purchase, grants a single 30-day window. */
export function kling4PromoWindow(subscription: Kling4PaidSubscription | null, policy: Kling4PromoPolicy,
  now = Date.now()): { eligible: boolean; reason: Kling4PromoReason; expiresAt: string | null; startsAt: string | null } {
  const policyReason = kling4PromoPolicyReason(policy, now)
  const empty = { eligible: false, expiresAt: null, startsAt: null }
  if (policyReason !== 'ok') return { ...empty, reason: policyReason }
  if (!subscription) return { ...empty, reason: 'not_subscribed' }
  const started = Date.parse(subscription.startedAt), through = Date.parse(subscription.paidThrough)
  const verified = Date.parse(subscription.verifiedAt)
  if (subscription.status !== 'active' || !isKling4PaidPlan(subscription.plan)
    || !Number.isFinite(started) || started > now || !Number.isFinite(through) || through <= now
    || !Number.isFinite(verified) || verified > now + 5_000 || now - verified > 60_000) {
    return { ...empty, reason: 'subscription_unverified' }
  }
  if (started >= Date.parse(KLING4_PROMO_SIGNUP_CUTOFF)) return { ...empty, reason: 'signup_closed' }
  const starts = Math.max(started, Date.parse(policy.launchAt!))
  const expiresAt = new Date(starts + KLING4_PROMO_DAYS * 86_400_000).toISOString()
  return { eligible: now < Date.parse(expiresAt), reason: now < Date.parse(expiresAt) ? 'ok' : 'expired',
    startsAt: new Date(starts).toISOString(), expiresAt }
}

/** Extras must include every bounded fal expense incurred by this request, before making those calls. */
export function kling4PromoReservedMilliUsd(seconds: number, falExtrasMilliUsd = 0): number | null {
  if (!Number.isSafeInteger(seconds) || seconds < 1 || seconds > 60
    || !Number.isSafeInteger(falExtrasMilliUsd) || falExtrasMilliUsd < 0 || falExtrasMilliUsd > 10_000) return null
  return seconds * KLING4_FAL_MILLIUSD_PER_SECOND + falExtrasMilliUsd
}
