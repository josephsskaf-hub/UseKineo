// Server-only. Provider clients are loaded lazily; offline tests inject a verified subscription resolver.
import type { SupabaseClient } from '@supabase/supabase-js'
import { buildKling4PromoAvailability, type Kling4PromoAvailability } from './kling4Promo'
import { KLING4_PROMO_DAILY_CAP_MILLIUSD, isKling4PaidPlan, normalizeKling4PaidPlan, kling4PromoPolicy,
  kling4PromoPolicyReason, kling4PromoReservedMilliUsd, kling4PromoWindow,
  type Kling4PaidSubscription, type Kling4PromoPolicy, type Kling4PromoReason } from './kling4PaidPolicy'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu
const validIdentity = (i: {userId: string; jobId: string}) => UUID.test(i.userId)
  && typeof i.jobId === 'string' && i.jobId.trim().length > 0 && i.jobId.length <= 200
type PromoIdentity = { userId: string; jobId: string; seconds: number; kind: 'film' | 'ad'; falExtrasMilliUsd?: number }
export type Kling4PromoReservation = { isFree: boolean; reason: Kling4PromoReason; duplicate: boolean
  reservationId: string | null; reservedUsd: number; expiresAt: string | null; remaining: number | null }
export type Kling4SubscriptionResolver = (admin: SupabaseClient, userId: string, now: number) => Promise<Kling4PaidSubscription | null>
type ServerOptions = { policy?: Kling4PromoPolicy; now?: number; resolveSubscription?: Kling4SubscriptionResolver }
const noReservation = (reason: Kling4PromoReason): Kling4PromoReservation =>
  ({ isFree: false, reason, duplicate: false, reservationId: null, reservedUsd: 0, expiresAt: null, remaining: null })

/** A profile/has_paid/is_pro flag is not a subscription. Revalidate status, owner, payment and period with its provider. */
export const resolveKling4PaidSubscription: Kling4SubscriptionResolver = async (admin, userId, now) => {
  if (!UUID.test(userId)) return null
  const profileResult = await admin.from('profiles').select('id,plan,stripe_customer_id,stripe_subscription_id,paypal_subscription_id,dodo_subscription_id')
    .eq('id', userId).maybeSingle()
  const p = profileResult.data
  if (profileResult.error || !p || !isKling4PaidPlan(p.plan)) return null
  const plan = p.plan
  const evidence = (provider: Kling4PaidSubscription['provider'], subscriptionId: string, startedAt: unknown, paidThrough: unknown): Kling4PaidSubscription | null => {
    if (typeof startedAt !== 'string' || typeof paidThrough !== 'string'
      || !Number.isFinite(Date.parse(startedAt)) || !Number.isFinite(Date.parse(paidThrough))
      || Date.parse(startedAt) > now || Date.parse(paidThrough) <= now) return null
    return { userId, provider, subscriptionId, plan, status: 'active', startedAt, paidThrough,
      verifiedAt: new Date(now).toISOString() }
  }
  // No SDK/provider response, IDs, email, error bodies or credentials leave this helper.
  if (typeof p.stripe_subscription_id === 'string' && p.stripe_subscription_id) {
    if (!process.env.STRIPE_SECRET_KEY) return null
    const { stripe } = await import('./stripe')
    const sub = await stripe.subscriptions.retrieve(p.stripe_subscription_id, { expand: ['latest_invoice'] }, { timeout: 8_000, maxNetworkRetries: 0 })
    const invoice = typeof sub.latest_invoice === 'object' ? sub.latest_invoice : null
    const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id
    const through = (sub as unknown as { current_period_end?: number }).current_period_end
    if (sub.id !== p.stripe_subscription_id || sub.livemode !== true || sub.status !== 'active'
      || sub.metadata?.supabase_user_id !== userId || customerId !== p.stripe_customer_id
      || !invoice || invoice.status !== 'paid' || invoice.paid !== true || invoice.amount_paid <= 0
      || !Number.isFinite(through)) return null
    return evidence('stripe', sub.id, new Date(sub.start_date * 1000).toISOString(), new Date(through! * 1000).toISOString())
  }
  if (typeof p.paypal_subscription_id === 'string' && p.paypal_subscription_id) {
    if (!process.env.PAYPAL_CLIENT_ID || !process.env.PAYPAL_CLIENT_SECRET || process.env.PAYPAL_ENV === 'sandbox') return null
    const { paypalFetch, tierFromPlanId } = await import('./paypal')
    const sub = await paypalFetch(`/v1/billing/subscriptions/${encodeURIComponent(p.paypal_subscription_id)}`,
      { signal: AbortSignal.timeout(8_000) })
    const billing = sub?.billing_info as { next_billing_time?: string; last_payment?: { time?: string; amount?: {value?: string} } } | undefined
    if (!sub || sub.id !== p.paypal_subscription_id || sub.status !== 'ACTIVE' || sub.custom_id !== userId
      || !billing?.last_payment?.time || Date.parse(billing.last_payment.time) > now
      || !(Number(billing.last_payment.amount?.value) > 0)) return null
    const mapped = await tierFromPlanId(admin, String(sub.plan_id ?? ''))
    if (!mapped || normalizeKling4PaidPlan(mapped.tier) !== normalizeKling4PaidPlan(plan)) return null
    return evidence('paypal', p.paypal_subscription_id, sub.start_time, billing.next_billing_time)
  }
  if (typeof p.dodo_subscription_id === 'string' && p.dodo_subscription_id) {
    const { dodoMode, dodoApiKey, dodoBaseUrl } = await import('./dodo')
    if (dodoMode() !== 'live' || !dodoApiKey()) return null
    const response = await fetch(`${dodoBaseUrl()}/subscriptions/${encodeURIComponent(p.dodo_subscription_id)}`, {
      headers: { Authorization: `Bearer ${dodoApiKey()}` }, signal: AbortSignal.timeout(8_000), cache: 'no-store' })
    if (!response.ok) return null
    const sub = await response.json() as Record<string, unknown>
    const metadata = sub.metadata as {supabase_user_id?: string} | undefined
    if (sub.subscription_id !== p.dodo_subscription_id || sub.status !== 'active' || metadata?.supabase_user_id !== userId) return null
    // Dodo subscription.active alone can mean mandate/trial. Require the signed, successful paid event too.
    const payment = await admin.from('events').select('metadata').eq('user_id', userId).eq('name', 'payment_success')
      .contains('metadata', { source: 'dodo_webhook', dodo_mode: 'live', dodo_subscription_id: p.dodo_subscription_id })
      .order('created_at', { ascending: false }).limit(1).maybeSingle()
    if (payment.error || !(Number(payment.data?.metadata?.amount_total) > 0)) return null
    return evidence('dodo', p.dodo_subscription_id, sub.created_at, sub.next_billing_date)
  }
  return null
}

function parseReservation(row: Record<string, unknown> | null, expectedCost: number): Kling4PromoReservation {
  if (!row) return noReservation('unavailable')
  const reason = row.reason as Kling4PromoReason
  if (row.is_free === true && (row.reason !== 'ok' || row.reserved_milliusd !== expectedCost
    || typeof row.reservation_id !== 'string' || !UUID.test(row.reservation_id))) return noReservation('unavailable')
  if (!['ok','paid_off','promo_off','launch_unconfigured','not_launched','not_subscribed','subscription_unverified',
    'signup_closed','expired','daily_limit','daily_cap','unavailable','invalid_request','identity_conflict'].includes(String(reason))) return noReservation('unavailable')
  return { isFree: row.is_free === true, reason, duplicate: row.duplicate === true,
    reservationId: typeof row.reservation_id === 'string' ? row.reservation_id : null,
    reservedUsd: typeof row.reserved_milliusd === 'number' ? row.reserved_milliusd / 1000 : 0,
    expiresAt: typeof row.expires_at === 'string' ? row.expires_at : null,
    remaining: typeof row.remaining === 'number' ? row.remaining : null }
}

/** Replays return the stored decision and duplicate=true; they NEVER authorize another provider POST. */
export async function reserveKling4Promo(admin: SupabaseClient, i: PromoIdentity, options: ServerOptions = {}): Promise<Kling4PromoReservation> {
  const cost = kling4PromoReservedMilliUsd(i.seconds, i.falExtrasMilliUsd)
  if (!validIdentity(i) || !['film','ad'].includes(i.kind) || cost === null) return noReservation('invalid_request')
  const policy = options.policy ?? kling4PromoPolicy(), now = options.now ?? Date.now()
  try {
    // Accepted jobs remain recoverable after expiry/rollback; a retry must preserve its original bill.
    const prior = await admin.from('kling4_promo_uses').select('kind,seconds,is_free,reason,reservation_id,reserved_milliusd,estimated_milliusd,expires_at,remaining')
      .eq('user_id', i.userId).eq('job_id', i.jobId).maybeSingle()
    if (prior.error) return noReservation('unavailable')
    if (prior.data) {
      if (prior.data.kind !== i.kind || prior.data.seconds !== i.seconds || prior.data.estimated_milliusd !== cost)
        return { ...noReservation('identity_conflict'), duplicate: true }
      return parseReservation({ ...prior.data, duplicate: true }, cost)
    }
    const reason = kling4PromoPolicyReason(policy, now)
    if (reason !== 'ok') return noReservation(reason)
    const subscription = await (options.resolveSubscription ?? resolveKling4PaidSubscription)(admin, i.userId, now)
    if (!subscription || subscription.userId !== i.userId) return noReservation('not_subscribed')
    const window = kling4PromoWindow(subscription, policy, now)
    if (!window.eligible) return { ...noReservation(window.reason), expiresAt: window.expiresAt }
    const result = await admin.rpc('reserve_kling4_promo', {
      p_user_id: i.userId, p_job_id: i.jobId, p_kind: i.kind, p_seconds: i.seconds,
      p_fal_extras_milliusd: i.falExtrasMilliUsd ?? 0, p_plan: subscription.plan, p_provider: subscription.provider,
      p_subscription_id: subscription.subscriptionId, p_started_at: subscription.startedAt,
      p_paid_through: subscription.paidThrough, p_verified_at: subscription.verifiedAt,
      p_launch_at: policy.launchAt, p_paid_live: policy.paidLive, p_promo_live: policy.promoLive,
    })
    return result.error ? noReservation('unavailable') : parseReservation(Array.isArray(result.data) ? result.data[0] : result.data, cost)
  } catch { return noReservation('unavailable') }
}

/** FIRST ad start only, while the order is still planned. A prepared photo set is not an accepted video job.
 * Frozen prior decisions are safe for in-flight recovery, but must not stockpile free starts across UTC days,
 * subscription cancellation, promotion expiry or a rollback. Never replenish the old reservation on rejection.
 */
export async function validateKling4PromoStart(admin: SupabaseClient,
  i: { userId: string; jobId: string; kind?: 'ad'; seconds?: number }, options: ServerOptions = {}):
  Promise<{ isFree: boolean; reason: Kling4PromoReason; expiresAt: string | null; hadFreeReservation: boolean }> {
  let hadFreeReservation = false
  const deny = (reason: Kling4PromoReason, expiresAt: string | null = null) => ({ isFree: false, reason, expiresAt, hadFreeReservation })
  if (!validIdentity(i) || i.kind !== undefined && i.kind !== 'ad'
    || i.seconds !== undefined && (!Number.isSafeInteger(i.seconds) || i.seconds < 1 || i.seconds > 60)) return deny('invalid_request')
  const now = options.now ?? Date.now(), policy = options.policy ?? kling4PromoPolicy()
  const policyReason = kling4PromoPolicyReason(policy, now)
  try {
    const result = await admin.from('kling4_promo_uses')
      .select('kind,seconds,is_free,reason,reservation_id,request_day,expires_at,reserved_milliusd,estimated_milliusd,submitted_at,subscription_started_at')
      .eq('user_id', i.userId).eq('job_id', i.jobId).maybeSingle()
    const r = result.data
    hadFreeReservation = r?.is_free === true
    if (policyReason !== 'ok') return deny(policyReason)
    if (result.error || !r) return deny('unavailable')
    if (r.kind !== 'ad' || i.seconds !== undefined && r.seconds !== i.seconds) return deny('identity_conflict')
    if (r.is_free !== true) return deny(['daily_limit','daily_cap'].includes(r.reason) ? r.reason : 'unavailable')
    if (r.reason !== 'ok' || !UUID.test(r.reservation_id) || !Number.isSafeInteger(r.seconds)
      || r.seconds < 1 || r.seconds > 60 || !Number.isSafeInteger(r.reserved_milliusd)
      || r.reserved_milliusd !== r.estimated_milliusd || r.reserved_milliusd < r.seconds * 157) return deny('unavailable')
    const expiresAt = typeof r.expires_at === 'string' && Number.isFinite(Date.parse(r.expires_at)) ? r.expires_at : null
    if (!expiresAt) return deny('unavailable')
    if (r.submitted_at) return deny('identity_conflict', expiresAt)
    if (r.request_day !== new Date(now).toISOString().slice(0, 10)) return deny('reservation_expired', expiresAt)
    if (Date.parse(expiresAt) <= now) return deny('expired', expiresAt)
    const subscription = await (options.resolveSubscription ?? resolveKling4PaidSubscription)(admin, i.userId, now)
    if (!subscription || subscription.userId !== i.userId) return deny('not_subscribed', expiresAt)
    // The ledger already proved the enrollment start/cutoff. A verified subscription replacement must not
    // reset that window, nor revoke its remaining days merely because the replacement started in December.
    const window = kling4PromoWindow({ ...subscription, startedAt: r.subscription_started_at }, policy, now)
    if (!window.eligible) return deny(window.reason, expiresAt)
    return { isFree: true, reason: 'ok', expiresAt, hadFreeReservation }
  } catch { return deny('unavailable') }
}

/** Used by shared credit settlement. Only a server ledger row can authorize a zero-credit birth. */
export async function verifyKling4PromoReservation(admin: SupabaseClient,
  i: { userId: string; jobId: string; kind?: 'film' | 'ad'; seconds?: number }): Promise<boolean> {
  if (!validIdentity(i)) return false
  try {
    const result = await admin.from('kling4_promo_uses').select('is_free,reason,kind,seconds,reservation_id,reserved_milliusd,estimated_milliusd')
      .eq('user_id', i.userId).eq('job_id', i.jobId).maybeSingle()
    const r = result.data
    return !result.error && r?.is_free === true && r.reason === 'ok' && UUID.test(r.reservation_id)
      && Number.isSafeInteger(r.reserved_milliusd) && r.reserved_milliusd === r.estimated_milliusd && r.reserved_milliusd >= r.seconds * 157
      && (!i.kind || r.kind === i.kind) && (i.seconds === undefined || r.seconds === i.seconds)
  } catch { return false }
}

/** Call after the provider accepted its one submission. This is attempted use, not completed delivery or billed spend. */
export async function recordKling4PaidUse(admin: SupabaseClient, i: { userId: string; jobId: string }): Promise<boolean> {
  if (!validIdentity(i)) return false
  try {
    const result = await admin.rpc('record_kling4_paid_use', { p_user_id: i.userId, p_job_id: i.jobId })
    const row = Array.isArray(result.data) ? result.data[0] : result.data
    return !result.error && (row?.code === 'ok' || row?.code === 'unchanged')
  } catch { return false }
}

export async function readKling4PaidAvailability(admin: SupabaseClient | null,
  i: { userId?: string | null; seconds?: number; falExtrasMilliUsd?: number } = {}, options: ServerOptions = {}): Promise<Kling4PromoAvailability> {
  const now = options.now ?? Date.now(), policy = options.policy ?? kling4PromoPolicy()
  let budgetAvailable: boolean | null = null, usedToday: number | null = i.userId ? null : 0
  let subscription: Kling4PaidSubscription | null = null, enrollmentExpiresAt: string | null = null, subscriptionUnavailable = false
  try {
    if (admin && kling4PromoPolicyReason(policy, now) === 'ok') {
      // For generic copy require room for a FULL 60-second request and every allowed fal extra ($10 max).
      const required = kling4PromoReservedMilliUsd(i.seconds ?? 60, i.falExtrasMilliUsd ?? 10_000)
      const day = new Date(now).toISOString().slice(0, 10)
      const budget = await admin.from('kling4_promo_days').select('reserved_milliusd').eq('request_day', day).maybeSingle()
      if (!budget.error && required !== null) {
        const spent = budget.data?.reserved_milliusd ?? 0
        budgetAvailable = Number.isSafeInteger(spent) && spent >= 0 && spent + required <= KLING4_PROMO_DAILY_CAP_MILLIUSD
      }
      if (i.userId && UUID.test(i.userId)) {
        const [daily, enrollment] = await Promise.all([
          admin.from('kling4_promo_user_days').select('uses').eq('user_id', i.userId).eq('request_day', day).maybeSingle(),
          admin.from('kling4_promo_enrollments').select('expires_at').eq('user_id', i.userId).maybeSingle(),
        ])
        if (!daily.error && Number.isSafeInteger(daily.data?.uses ?? 0)) usedToday = daily.data?.uses ?? 0
        if (enrollment.error) budgetAvailable = null
        else enrollmentExpiresAt = enrollment.data?.expires_at ?? null
        try { subscription = await (options.resolveSubscription ?? resolveKling4PaidSubscription)(admin, i.userId, now) }
        catch { subscriptionUnavailable = true }
      }
    }
  } catch { budgetAvailable = null }
  return buildKling4PromoAvailability({ policy, now, subscription, budgetAvailable, usedToday, enrollmentExpiresAt, subscriptionUnavailable })
}
