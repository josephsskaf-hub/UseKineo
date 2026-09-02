#!/usr/bin/env node
// KINEO-PUBLIC-PROMO-TRUTH-2026-09-02
// Executa a política pura e prova que a rota só cria Checkout depois de
// verificar exatamente a promessa pública mostrada pelo WelcomeOfferModal.

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const requireFromRepo = createRequire(join(root, 'package.json'))
const ts = requireFromRepo('typescript')
const source = (rel) => readFileSync(join(root, rel), 'utf8')

function loadTs(rel) {
  const output = ts.transpileModule(source(rel), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
    fileName: join(root, rel),
  }).outputText
  const module = { exports: {} }
  new Function('require', 'module', 'exports', output)(
    (id) => { throw new Error(rel + ' imported unexpected module: ' + id) },
    module,
    module.exports,
  )
  return module.exports
}

const policy = loadTs('lib/growth/publicPromoTruth.ts')
const route = source('app/api/stripe/checkout/route.ts')
const modal = source('components/WelcomeOfferModal.tsx')

let checks = 0
const ok = (value, message) => { assert.ok(value, message); checks += 1 }
const equal = (actual, expected, message) => { assert.deepEqual(actual, expected, message); checks += 1 }

equal(policy.promisedPublicPromoKind('WELCOME20', false), 'welcome_first_month_20', 'canonical WELCOME20 is recognized')
equal(policy.promisedPublicPromoKind(' welcome20 ', false), 'welcome_first_month_20', 'recognition is case and whitespace safe')
equal(policy.promisedPublicPromoKind('WELCOME20', true), null, 'private offers are never relabeled public')
equal(policy.promisedPublicPromoKind('FIRST50', false), null, 'unrelated historical promo is outside this live promise')
equal(policy.promisedPublicPromoKind(undefined, false), null, 'missing promo creates no public promise')

equal(policy.publicPromoTruthMetadata(null, 'requested'), {}, 'ordinary checkout gets no promo metadata')
equal(policy.publicPromoTruthMetadata('welcome_first_month_20', 'requested'), {
  public_promo_truth_version: 'public_promo_truth_v1',
  public_promo_kind: 'welcome_first_month_20',
  public_promo_state: 'requested',
}, 'requested metadata is closed and categorical')
equal(policy.publicPromoTruthMetadata('welcome_first_month_20', 'failed', 'coupon_invalid'), {
  public_promo_truth_version: 'public_promo_truth_v1',
  public_promo_kind: 'welcome_first_month_20',
  public_promo_state: 'failed',
  public_promo_failure_reason: 'coupon_invalid',
}, 'failure metadata has only a closed reason')
const metadataText = JSON.stringify(policy.publicPromoTruthMetadata('welcome_first_month_20', 'applied'))
ok(!metadataText.includes('WELCOME20') && !metadataText.includes('cus_'), 'metadata never carries raw code or customer id')
equal(policy.publicPromoTruthMetadata('welcome_first_month_20', 'verified').public_promo_state, 'verified', 'verified is distinct from a created Stripe Session')

const nowMs = Date.UTC(2026, 8, 2, 18, 0, 0)
const exact = {
  kind: 'welcome_first_month_20',
  promotionCode: 'WELCOME20',
  promotionActive: true,
  promotionExpiresAtSeconds: null,
  promotionMaxRedemptions: null,
  promotionTimesRedeemed: 0,
  promotionFirstTimeTransaction: false,
  promotionMinimumAmount: null,
  promotionMinimumAmountCurrency: null,
  promotionCurrencyOptionCodes: [],
  restrictedCustomerId: null,
  currentCustomerId: 'cus_current',
  couponId: 'KINEO_WELCOME20',
  couponDeleted: false,
  couponValid: true,
  couponPercentOff: 20,
  couponAmountOff: null,
  couponDuration: 'once',
  couponRedeemBySeconds: null,
  couponCurrencyOptionCodes: [],
  couponProductIds: [],
  nowMs,
}
equal(policy.publicPromoVerificationFailure(exact), null, 'exact public promise passes')
equal(policy.publicPromoVerificationFailure({ ...exact, restrictedCustomerId: 'cus_current' }), null, 'matching customer restriction passes')
equal(policy.publicPromoVerificationFailure({ ...exact, promotionExpiresAtSeconds: nowMs / 1000 + 1 }), null, 'future promotion expiry passes')
equal(policy.publicPromoVerificationFailure({ ...exact, promotionMaxRedemptions: 2, promotionTimesRedeemed: 1 }), null, 'one remaining redemption passes')
equal(policy.publicPromoFirstChargeMinor('welcome_first_month_20', 1500), 1200, 'Creator first charge reflects exact 20% discount')
equal(policy.publicPromoFirstChargeMinor('welcome_first_month_20', 2900), 2320, 'Studio first charge reflects exact 20% discount')
equal(policy.publicPromoFirstChargeMinor('welcome_first_month_20', 0), null, 'invalid money amount fails closed')

const rejects = [
  ['promotion_code_mismatch', { promotionCode: 'OTHER20' }],
  ['promotion_inactive', { promotionActive: false }],
  ['promotion_expired', { promotionExpiresAtSeconds: nowMs / 1000 }],
  ['promotion_exhausted', { promotionMaxRedemptions: 2, promotionTimesRedeemed: 2 }],
  ['first_transaction_restricted', { promotionFirstTimeTransaction: true }],
  ['minimum_amount_restricted', { promotionMinimumAmount: 1000, promotionMinimumAmountCurrency: 'usd' }],
  ['minimum_amount_restricted', { promotionMinimumAmountCurrency: 'usd' }],
  ['promotion_currency_restricted', { promotionCurrencyOptionCodes: ['usd'] }],
  ['customer_mismatch', { restrictedCustomerId: 'cus_other' }],
  ['coupon_identity_mismatch', { couponId: 'WRONG_COUPON' }],
  ['coupon_deleted', { couponDeleted: true }],
  ['coupon_invalid', { couponValid: false }],
  ['percent_mismatch', { couponPercentOff: 19 }],
  ['amount_discount_mismatch', { couponAmountOff: 300 }],
  ['duration_mismatch', { couponDuration: 'repeating' }],
  ['coupon_expired', { couponRedeemBySeconds: nowMs / 1000 }],
  ['coupon_currency_restricted', { couponCurrencyOptionCodes: ['usd'] }],
  ['product_restricted', { couponProductIds: ['prod_creator_only'] }],
]
for (const [reason, changes] of rejects) {
  equal(policy.publicPromoVerificationFailure({ ...exact, ...changes }), reason, 'rejects ' + reason)
}

let loaderCalls = 0
const appliedResolution = await policy.resolvePromisedPublicPromo(
  'welcome_first_month_20',
  1500,
  async () => {
    loaderCalls += 1
    return { ...exact, promotionCodeId: 'promo_exact' }
  },
)
equal(loaderCalls, 1, 'real policy invokes its candidate loader once')
equal(appliedResolution, {
  status: 'applied',
  promotionCodeId: 'promo_exact',
  firstChargeMinor: 1200,
}, 'real policy returns the exact promotion and discounted charge')

equal(
  await policy.resolvePromisedPublicPromo('welcome_first_month_20', 1500, async () => null),
  { status: 'rejected', reason: 'not_found_or_inactive' },
  'not-found loader fails closed',
)
equal(
  await policy.resolvePromisedPublicPromo('welcome_first_month_20', 1500, async () => { throw new Error('Stripe body') }),
  { status: 'rejected', reason: 'verification_failed' },
  'thrown Stripe lookup fails closed without leaking its body',
)
equal(
  await policy.resolvePromisedPublicPromo(
    'welcome_first_month_20',
    1500,
    async () => ({ ...exact, couponId: 'WRONG', promotionCodeId: 'promo_wrong' }),
  ),
  { status: 'rejected', reason: 'coupon_identity_mismatch' },
  'resolver rejects a mismatched coupon',
)
equal(
  await policy.resolvePromisedPublicPromo(
    'welcome_first_month_20',
    1500,
    async () => ({ ...exact, promotionFirstTimeTransaction: true, promotionCodeId: 'promo_restricted' }),
  ),
  { status: 'rejected', reason: 'first_transaction_restricted' },
  'resolver rejects a hidden PromotionCode restriction',
)

let checkoutCreates = 0
await assert.rejects(
  () => policy.createCheckoutWithPublicPromoTruth(
    'welcome_first_month_20',
    false,
    async () => { checkoutCreates += 1; return 'should-not-exist' },
  ),
  (error) => error?.name === 'UnverifiedPublicPromoError',
  'unverified public promise rejects at the Session boundary',
)
checks += 1
equal(checkoutCreates, 0, 'unverified public promise makes zero Checkout Session calls')
equal(
  await policy.createCheckoutWithPublicPromoTruth(
    'welcome_first_month_20',
    true,
    async () => { checkoutCreates += 1; return 'cs_verified' },
  ),
  'cs_verified',
  'verified public promise returns the fake Stripe Session',
)
equal(checkoutCreates, 1, 'verified public promise makes exactly one Checkout Session call')

let ordinaryCreates = 0
equal(
  await policy.createCheckoutWithPublicPromoTruth(
    null,
    false,
    async () => { ordinaryCreates += 1; return 'cs_ordinary' },
  ),
  'cs_ordinary',
  'ordinary checkout is not blocked by an absent public promise',
)
equal(ordinaryCreates, 1, 'ordinary checkout still makes exactly one Session call')

const importAt = route.indexOf("from '@/lib/growth/publicPromoTruth'")
const recognizeAt = route.indexOf('const promisedPublicPromo = promisedPublicPromoKind')
const metadataAt = route.indexOf("...publicPromoTruthMetadata(promisedPublicPromo, 'requested')")
const attemptedAt = route.indexOf("recordCheckoutEvent('checkout_attempted'")
const resolveAt = route.indexOf('const publicPromoResolution = await resolvePromisedPublicPromo')
const discountsAt = route.indexOf('sessionParams.discounts = [{ promotion_code: publicPromoResolution.promotionCodeId }]')
const markAt = route.indexOf('markPromisedPublicPromoApplied(publicPromoResolution.firstChargeMinor)')
const finalGateAt = route.indexOf('if (promisedPublicPromo && !promisedPublicPromoVerified)')
const manualPromoAt = route.indexOf('sessionParams.allow_promotion_codes = true')
const invariantAt = route.indexOf('return createCheckoutWithPublicPromoTruth(', manualPromoAt)
const createAt = route.indexOf('() => stripe.checkout.sessions.create(', invariantAt)
const checkoutStartedAt = route.indexOf("'checkout_started',", createAt)

ok(importAt > 0, 'production route imports the executable policy')
ok(recognizeAt > importAt && recognizeAt < metadataAt, 'promise is recognized before metadata is built')
ok(metadataAt < attemptedAt, 'requested state exists before checkout_attempted')
ok(resolveAt > attemptedAt && resolveAt < discountsAt, 'executable Stripe resolution runs before applying the discount')
ok(discountsAt < markAt, 'applied state is impossible before the discount enters Session params')
ok(finalGateAt > markAt && finalGateAt < manualPromoAt, 'unverified promise fails before the manual promo fallback')
ok(finalGateAt < createAt, 'unverified promise fails before Checkout Session creation')
ok(invariantAt > finalGateAt && invariantAt < createAt, 'executable invariant directly wraps the Stripe Session call')
ok(route.indexOf('public_promo_truth: sessionParams.metadata?.public_promo_state ?? null') < createAt, 'promo truth changes the idempotency signature')
ok(checkoutStartedAt > createAt && route.slice(checkoutStartedAt, checkoutStartedAt + 700).includes('public_promo_applied: promisedPublicPromoVerified'), 'checkout_started exposes verified application')
ok(route.includes('Object.assign(sessionParams.metadata!, appliedMetadata)'), 'verified state reaches Checkout Session metadata')
ok(route.includes('Object.assign(sessionParams.subscription_data!.metadata!, appliedMetadata)'), 'verified state reaches Subscription metadata')
ok(route.includes("const verifiedMetadata = publicPromoTruthMetadata(promisedPublicPromo, 'verified')"), 'pre-Session failure telemetry says verified, not applied')
ok(route.includes('Only this boundary upgrades telemetry from `verified` to `applied`'), 'applied telemetry begins only after a Stripe Session exists')
ok(route.includes('amount: firstChargeAmount'), 'success telemetry receives the actual discounted first charge')
ok(route.includes('public_promo_first_charge_minor = String(firstChargeAmount)'), 'Stripe metadata preserves the actual discounted first charge')
ok(!route.includes('WELCOME20 self-provision falhou (checkout segue a preço cheio)'), 'WELCOME20 no longer documents silent full-price fallback')

ok(modal.includes('your first month is '), 'visible welcome offer copy is unchanged')
ok(modal.includes('<span className="grad-text">20% off.</span>'), 'visible percentage is unchanged')
ok(modal.includes('the discount applies itself at checkout'), 'visible automatic-application promise is unchanged')
ok(modal.includes('promo=WELCOME20&checkout_origin=welcome20_modal'), 'visible CTA destination is unchanged')

console.log(`public-promo-truth: ${checks}/${checks} checks passed`)
