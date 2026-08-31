import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const root = process.cwd()
const helperPath = path.join(root, 'lib', 'stripeCheckoutFailure.ts')
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

const stageCases = [
  [{ hasInvoice: false, billingReason: null }, 'initial'],
  [{ hasInvoice: true, billingReason: 'subscription_create' }, 'initial'],
  [{ hasInvoice: true, billingReason: 'subscription_cycle' }, 'renewal'],
  [{ hasInvoice: true, billingReason: 'subscription_update' }, 'unknown'],
  [{ hasInvoice: true, billingReason: 'manual' }, 'unknown'],
  [{ hasInvoice: true, billingReason: null }, 'unknown'],
]
for (const [input, expected] of stageCases) {
  equal(helper.classifyStripeCheckoutFailureStage(input), expected, `stage ${JSON.stringify(input)}`)
}

const reasonCases = [
  ['insufficient_funds', null, 'insufficient_funds'],
  ['authentication_required', null, 'authentication_required'],
  ['expired_card', null, 'expired_card'],
  ['incorrect_cvc', null, 'incorrect_card_details'],
  ['do_not_honor', null, 'card_restricted'],
  ['transaction_not_allowed', null, 'card_restricted'],
  ['fraudulent', null, 'fraud_or_risk'],
  ['currency_not_supported', null, 'unsupported'],
  ['processing_error', null, 'processing_error'],
  ['generic_decline', null, 'generic_decline'],
  [null, 'card_declined', 'generic_decline'],
  ['brand_new_provider_code', null, 'other_decline'],
  [null, null, 'unknown'],
]
for (const [decline, code, expected] of reasonCases) {
  equal(helper.classifyStripeFailureReason(decline, code), expected, `reason ${decline ?? code ?? 'empty'}`)
}

const secretIntent = 'pi_live_secret_reference_123'
const canonical = helper.buildCanonicalStripeCheckoutFailure({
  paymentIntentId: secretIntent,
  errorCode: 'card_declined',
  declineCode: 'do_not_honor',
  currency: 'USD',
  amountMinor: 2900,
  cardCountry: 'us',
  cardBrand: 'visa',
  cardFunding: 'credit',
  paymentMethodType: 'card',
  hasInvoice: true,
  billingReason: 'subscription_create',
})

equal(canonical.version, 'stripe_checkout_failure_v1', 'canonical version')
equal(canonical.stage, 'initial', 'first subscription invoice stays initial')
equal(canonical.is_renewal, false, 'initial invoice is not renewal')
equal(canonical.reason_category, 'card_restricted', 'canonical reason bucket')
equal(canonical.currency, 'usd', 'currency normalized')
equal(canonical.amount_minor, 2900, 'amount remains integer minor units')
equal(canonical.card_country, 'US', 'country normalized')
equal(canonical.card_brand, 'visa', 'brand allowlisted')
equal(canonical.card_funding, 'credit', 'funding allowlisted')
equal(canonical.payment_method_family, 'card', 'payment family allowlisted')
expect(typeof canonical.failure_ref === 'string' && canonical.failure_ref.length === 24, 'failure reference is bounded hash')
expect(!JSON.stringify(canonical).includes(secretIntent), 'raw PaymentIntent id never leaves helper')
equal(helper.stripeFailureReference(secretIntent), helper.stripeFailureReference(secretIntent), 'failure reference is deterministic')
expect(helper.stripeFailureReference(secretIntent) !== helper.stripeFailureReference(`${secretIntent}x`), 'different intents get different references')

const renewal = helper.buildCanonicalStripeCheckoutFailure({
  paymentIntentId: 'pi_renewal',
  hasInvoice: true,
  billingReason: 'subscription_cycle',
  cardBrand: 'untrusted-provider-brand',
  cardFunding: 'crypto',
  paymentMethodType: 'sepa_debit',
  amountMinor: Number.NaN,
})
equal(renewal.stage, 'renewal', 'cycle invoice is renewal')
equal(renewal.is_renewal, true, 'renewal compatibility boolean is truthful')
equal(renewal.card_brand, 'other', 'unknown brand cannot leak')
equal(renewal.card_funding, 'other', 'unknown funding cannot leak')
equal(renewal.payment_method_family, 'bank', 'bank method collapses to family')
equal(renewal.amount_minor, null, 'invalid amount fails closed')

const enriched = helper.buildStripeChargeFailureEnrichment({
  paymentIntentId: secretIntent,
  declineCode: 'fraudulent',
  networkStatus: 'declined_by_network',
  riskLevel: 'highest',
  cardCountry: 'BR',
  cardBrand: 'mastercard',
  cardFunding: 'debit',
  paymentMethodType: 'card',
})
equal(enriched.object, 'charge_enrichment', 'charge has a distinct non-canonical object')
equal(enriched.failure_ref, canonical.failure_ref, 'charge correlates through the same hash')
equal(enriched.network_status, 'declined_by_network', 'network status allowlisted')
equal(enriched.risk_level, 'highest', 'risk level allowlisted')
equal(enriched.reason_category, 'fraud_or_risk', 'charge reason categorized')

const unknownEnrichment = helper.buildStripeChargeFailureEnrichment({
  paymentIntentId: 'pi_unknown',
  networkStatus: 'free form provider sentence',
  riskLevel: 'custom',
})
equal(unknownEnrichment.network_status, 'unknown', 'free network status fails closed')
equal(unknownEnrichment.risk_level, 'unknown', 'free risk value fails closed')

const failureStart = webhook.indexOf("case 'payment_intent.payment_failed'")
const failureEnd = webhook.indexOf("case 'invoice.payment_succeeded'", failureStart)
const failureRegion = webhook.slice(failureStart, failureEnd)
expect(failureStart >= 0 && failureEnd > failureStart, 'failure handlers are reachable in webhook switch')
equal((failureRegion.match(/name: 'checkout_payment_failed'/g) ?? []).length, 1, 'only PaymentIntent writes canonical failure')
equal((failureRegion.match(/name: 'checkout_payment_failure_enriched'/g) ?? []).length, 1, 'Charge writes one enrichment event')
expect(failureRegion.includes('resolvePaymentIntentInvoiceContext(failedIntent)'), 'PaymentIntent resolves billing reason')
// The invoice lookup lives in the shared resolver above the switch; restricting
// this assertion to the case body falsely reported that the lookup did not exist.
expect(webhook.includes('stripe.invoices.retrieve(invoiceId)'), 'route reads authoritative invoice')
expect(!failureRegion.includes('Boolean(intentInvoiceId)'), 'invoice presence is never renewal classification')
expect(failureRegion.includes('sessionId: failureRef'), 'canonical failure has a hashed dedupe key')
expect(failureRegion.includes('sessionId: enrichmentRef'), 'enrichment has the same hashed dedupe key')
expect((failureRegion.match(/dedupeMinutes: 24 \* 60/g) ?? []).length === 2, 'both streams dedupe for 24 hours')
expect(failureRegion.includes("throw new RetryableCheckoutAnalyticsError('Could not persist canonical checkout failure')"), 'canonical sink failure is retryable')
expect(failureRegion.includes("throw new RetryableCheckoutAnalyticsError('Could not persist checkout failure enrichment')"), 'enrichment sink failure is retryable')
expect(webhook.includes('error instanceof RetryableCheckoutAnalyticsError'), 'outer webhook releases event guard for analytics retry')
expect(eventsRoute.includes("'checkout_payment_failure_enriched'"), 'browser sink cannot forge charge enrichment')

for (const forbidden of [
  'stripe_event_id',
  'stripe_payment_intent_id',
  'stripe_charge_id',
  'stripe_invoice_id',
  'error_message',
  'failure_message',
  'seller_message',
]) {
  expect(!helperSource.includes(forbidden), `analytics metadata helper excludes raw field ${forbidden}`)
}
// `stripe_customer_id` is legitimately used to resolve the owning profile. The
// contract is that it never becomes a metadata property.
expect(!/stripe_customer_id\s*:/.test(failureRegion), 'failure metadata excludes raw customer id')

console.log(`stripe checkout failure truth: ${checks}/${checks} checks passed`)
