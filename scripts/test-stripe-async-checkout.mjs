import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const root = process.cwd()
const helperPath = path.join(root, 'lib', 'stripeCheckoutAsyncSettlement.ts')
const helper = await import(pathToFileURL(helperPath).href)
const helperSource = fs.readFileSync(helperPath, 'utf8')
const webhook = fs.readFileSync(path.join(root, 'app', 'api', 'stripe', 'webhook', 'route.ts'), 'utf8')
const eventsRoute = fs.readFileSync(path.join(root, 'app', 'api', 'events', 'route.ts'), 'utf8')

let checks = 0
function expect(condition, message) {
  checks += 1
  if (!condition) throw new Error(message)
}
function equal(actual, expected, message) {
  checks += 1
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`${message}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`)
  }
}

equal(helper.checkoutPaymentIsSettled('paid'), true, 'paid Checkout is settled')
equal(helper.checkoutPaymentIsSettled('no_payment_required'), true, 'zero-charge Checkout is settled')
equal(helper.checkoutPaymentIsSettled('unpaid'), false, 'delayed Checkout remains pending')
equal(helper.checkoutPaymentIsSettled(null), false, 'missing status fails closed')

const rawSession = 'cs_live_sensitive_reference_123'
const pending = helper.buildStripeAsyncCheckoutMetadata({
  sessionId: rawSession,
  outcome: 'pending',
  paymentStatus: 'unpaid',
  checkoutMode: 'subscription',
  amountMinor: 2900,
  currency: 'USD',
  tier: 'Starter',
  billing: 'Monthly',
  checkoutOrigin: 'Post Video',
  intentCampaign: 'checkout_payment_guidance_v1',
})
equal(pending.version, 'stripe_async_checkout_v1', 'version is explicit')
equal(pending.settlement_state, 'pending', 'pending state is explicit')
equal(pending.payment_status, 'unpaid', 'payment status is allowlisted')
equal(pending.currency, 'usd', 'currency is normalized')
equal(pending.amount_minor, 2900, 'minor amount is preserved')
equal(pending.tier, 'starter', 'tier is normalized')
equal(pending.checkout_origin, 'post_video', 'origin is normalized')
expect(typeof pending.session_ref === 'string' && pending.session_ref.length === 24, 'session reference is bounded')
expect(!JSON.stringify(pending).includes(rawSession), 'raw Checkout Session id never enters analytics')
equal(
  helper.stripeCheckoutSessionReference(rawSession),
  helper.stripeCheckoutSessionReference(rawSession),
  'session reference is deterministic',
)
expect(
  helper.stripeCheckoutSessionReference(rawSession) !== helper.stripeCheckoutSessionReference(`${rawSession}x`),
  'different sessions have different references',
)

const failed = helper.buildStripeAsyncCheckoutMetadata({
  sessionId: 'cs_failed',
  outcome: 'failed',
  paymentStatus: 'unpaid',
  amountMinor: Number.NaN,
  currency: 'provider sentence',
})
equal(failed.settlement_state, 'failed', 'failed state is distinct')
equal(failed.amount_minor, null, 'invalid amount fails closed')
equal(failed.currency, null, 'invalid currency fails closed')

const completedStart = webhook.indexOf("case 'checkout.session.completed'")
const failedStart = webhook.indexOf("case 'checkout.session.async_payment_failed'")
const paymentIntentStart = webhook.indexOf("case 'payment_intent.payment_failed'")
expect(completedStart >= 0, 'completed handler is reachable')
expect(failedStart > completedStart, 'async failed handler is reachable after Checkout completion')
expect(paymentIntentStart > failedStart, 'async failure stays distinct from canonical PaymentIntent failure')
const completedRegion = webhook.slice(completedStart, failedStart)
const asyncFailedRegion = webhook.slice(failedStart, paymentIntentStart)
expect(completedRegion.includes("recordAsyncCheckoutState(session, 'pending')"), 'pending completion is persisted')
expect(asyncFailedRegion.includes("recordAsyncCheckoutState(session, 'failed')"), 'async failure is persisted')
expect(webhook.includes("case 'checkout.session.async_payment_succeeded'"), 'late success shares fulfillment path')
expect(webhook.includes('duplicateSafeObservation'), 'pending and failed observations can resume safely')
expect(webhook.includes('RetryableCheckoutAnalyticsError(`Could not persist ${eventName}`)'), 'sink failure asks Stripe to retry')
expect(eventsRoute.includes("'checkout_payment_pending'"), 'browser cannot forge pending state')
expect(eventsRoute.includes("'checkout_async_payment_failed'"), 'browser cannot forge async failure')
expect(!helperSource.includes('stripe_event_id'), 'helper excludes raw Stripe event id')
expect(!helperSource.includes('stripe_customer_id'), 'helper excludes raw Stripe customer id')
expect(!helperSource.includes('stripe_session_id'), 'helper excludes raw Stripe session metadata')

console.log(`stripe async checkout: ${checks}/${checks} checks passed`)
