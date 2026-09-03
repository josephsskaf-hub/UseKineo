#!/usr/bin/env node
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import vm from 'node:vm'
import ts from 'typescript'
import {
  AFFILIATE_BUSINESS_CONTRACT,
  AFFILIATE_BUSINESS_MIN_MATURE_PEOPLE,
  AFFILIATE_BUSINESS_SUBSCRIPTION_VERSION,
  buildAffiliateBusinessSubscriptionReport,
} from './affiliate-business-subscription-report.mjs'
import { collectAffiliateBusinessSubscription } from './measure-affiliate-business-subscription.mjs'

let checks = 0
const equal = (actual, expected, label) => { assert.deepEqual(actual, expected, label); checks += 1 }
const check = (value, label) => { assert.ok(value, label); checks += 1 }
const base = Date.parse('2026-09-01T00:00:00.000Z')
const iso = (hours) => new Date(base + hours * 3_600_000).toISOString()
const generatedAt = iso(10 * 24)
const windowStart = iso(-20 * 24)
const exactUtm = {
  signup_utm_source: 'affiliate',
  signup_utm_medium: 'partner',
  signup_utm_campaign: 'affiliate_business_plan',
}
const profile = (id, overrides = {}) => ({
  id,
  email: `${id}@example.com`,
  created_at: iso(3),
  ...exactUtm,
  ...overrides,
})
const event = (id, name, user, session, hour, metadata = {}) => ({
  id, name, user_id: user, session_id: session, created_at: iso(hour), metadata,
})
const landing = (id, session, hour = 1, extra = {}) => event(id, 'affiliate_landing_context_viewed', null, session, hour, {
  variant: 'affiliate_landing_context_v1',
  destination: 'business',
  ...extra,
})
const plan = (id, user, session, hour = 2, extra = {}) => event(id, 'business_content_plan_generated', user, session, hour, {
  version: 'weekly_business_video_plan_share_v1',
  surface: 'business_video_content_plan',
  attribution_version: 'business_content_plan_attribution_v1',
  entry: 'affiliate_business',
  referral_campaign: 'affiliate_business_plan',
  cadence: 'five',
  item_count: 5,
  ...extra,
})
const owner = (id, user, session, hour = 3) => event(id, 'signed_in', user, session, hour)
const referral = (user, overrides = {}) => ({
  id: `ref-${user}`,
  affiliate_id: 'affiliate-external',
  referred_user_id: user,
  status: 'signup',
  first_touch_at: iso(3.5),
  converted_at: null,
  ...overrides,
})
const affiliateOwner = profile('partner-owner', {
  email: 'partner-owner@example.com',
  created_at: iso(-24),
  signup_utm_source: null,
  signup_utm_medium: null,
  signup_utm_campaign: null,
})
const affiliate = (overrides = {}) => ({
  id: 'affiliate-external',
  user_id: 'partner-owner',
  email: 'partner-owner@example.com',
  status: 'active',
  created_at: iso(-20),
  ...overrides,
})
const start = (id, user, hour, stripe, extra = {}) => event(id, 'checkout_started', user, `browser-${user}`, hour, {
  stripe_session_id: stripe,
  tier: 'starter',
  billing: 'monthly',
  ...extra,
})
const payment = (id, user, hour, stripe, amount = 1500, currency = 'usd', extra = {}) => event(id, 'payment_success', user, null, hour, {
  stripe_session_id: stripe,
  checkout_mode: 'subscription',
  amount_total: amount,
  currency,
  ...extra,
})
const packStart = (id, user, hour, stripe) => event(id, 'bulk_checkout_started', user, `browser-${user}`, hour, {
  stripe_session_id: stripe,
  sku: 'bulk20',
})
const packPaid = (id, user, hour, stripe, amount = 9900, currency = 'usd') => event(id, 'bulk_purchase_completed', user, null, hour, {
  stripe_session_id: stripe,
  sku: 'bulk20',
  amount_total: amount,
  currency,
})

function fixture(user = 'u1', session = 'browser1') {
  const evidenceEvents = [landing(`landing-${user}`, session), plan(`plan-${user}`, null, session)]
  return {
    evidenceEvents,
    sessionEvents: [...evidenceEvents, owner(`owner-${user}`, user, session)],
    profiles: [profile(user), affiliateOwner],
    referrals: [referral(user)],
    affiliates: [affiliate()],
  }
}

function report(overrides = {}) {
  const baseFixture = fixture()
  return buildAffiliateBusinessSubscriptionReport({
    generatedAt,
    windowStart,
    financialEvents: [],
    ...baseFixture,
    ...overrides,
  })
}

let result = report({
  financialEvents: [start('start', 'u1', 4, 'cs-first'), payment('paid', 'u1', 5, 'cs-first')],
})
equal(result.schemaVersion, AFFILIATE_BUSINESS_SUBSCRIPTION_VERSION, 'schema version is stable')
equal(result.attributionLabel, 'campaign_assist_not_protected_click_attribution', 'label refuses protected-click attribution')
equal(result.contract, { source: 'affiliate', medium: 'partner', campaign: 'affiliate_business_plan', entry: 'affiliate_business' }, 'public contract is categorical')
equal(result.funnel.qualifiedExternalPeople, 1, 'one external owner is one person')
equal(result.funnel.recurringCheckoutStripeSessions, 1, 'first recurring Stripe Session counts')
equal(result.funnel.exactSubscriptionPaidPeople, 1, 'same owner and Session payment counts')
equal(result.funnel.subscriptionRevenueMinorByCurrency, { usd: 1500 }, 'subscription revenue stays in minor units by currency')
equal(result.gate.state, 'ready_for_reconciliation', 'first exact recurring Session opens reconciliation without claiming causality')
equal(result.gate.firstExactRecurringStripeSessionObserved, true, 'first exact Session is diagnostic only')
equal(result.gate.neverAuthorizesCausalClaimOrProductChange, true, 'report never authorizes a causal claim')

const exact = fixture()
result = report({
  evidenceEvents: [exact.evidenceEvents[0], plan('bad-first', null, 'browser1', 2, { entry: 'direct_or_other' }), plan('good-later', null, 'browser1', 2.5)],
  sessionEvents: [...exact.sessionEvents, plan('bad-first', null, 'browser1', 2, { entry: 'direct_or_other' }), plan('good-later', null, 'browser1', 2.5)],
})
equal(result.funnel.qualifiedExternalPeople, 0, 'invalid first generated event cannot be cleaned by a later exact event')
equal(result.exclusionsAndDiagnostics.browserSessionsByResolutionState.first_plan_contract_invalid, 1, 'invalid first plan is diagnosed')

result = report({
  evidenceEvents: [landing('l', 'browser1'), plan('p1', null, 'browser1', 2), plan('p2', null, 'browser1', 2)],
  sessionEvents: [landing('l', 'browser1'), plan('p1', null, 'browser1', 2), plan('p2', null, 'browser1', 2), owner('o', 'u1', 'browser1')],
})
equal(result.funnel.qualifiedExternalPeople, 0, 'two first generated rows at the same clock fail closed')

for (const field of ['signup_utm_source', 'signup_utm_medium', 'signup_utm_campaign']) {
  result = report({ profiles: [profile('u1', { [field]: 'wrong' }), affiliateOwner] })
  equal(result.funnel.qualifiedExternalPeople, 0, `wrong profile ${field} cannot enter the cohort`)
}
result = report({ profiles: [profile('u1'), profile('u1'), affiliateOwner] })
equal(result.funnel.qualifiedExternalPeople, 0, 'duplicate profile rows fail closed even when identical')
result = report({ profiles: [profile('u1', { email: null }), affiliateOwner] })
equal(result.funnel.qualifiedExternalPeople, 0, 'profile without email is unknown')
result = report({ profiles: [profile('u1', { created_at: null }), affiliateOwner] })
equal(result.funnel.qualifiedExternalPeople, 0, 'profile without a clock is unknown')
result = report({ profiles: [profile('u1', { email: 'josephsskaf@gmail.com' }), affiliateOwner] })
equal(result.funnel.qualifiedExternalPeople, 0, 'canonical internal account is excluded')

result = report({ referrals: [] })
equal(result.funnel.qualifiedExternalPeople, 0, 'missing canonical referral excludes the candidate')
result = report({ referrals: [referral('u1'), referral('u1', { id: 'ref-duplicate' })] })
equal(result.funnel.qualifiedExternalPeople, 0, 'multiple canonical referrals fail closed')
result = report({ referrals: [referral('u1', { status: 'mystery' })] })
equal(result.funnel.qualifiedExternalPeople, 0, 'unknown referral state fails closed without being treated as payment proof')
result = report({ affiliates: [affiliate({ status: 'pending' })] })
equal(result.funnel.qualifiedExternalPeople, 0, 'referral to a non-active affiliate fails closed')
result = report({ affiliates: [affiliate({ email: 'josephsskaf@gmail.com' })] })
equal(result.funnel.qualifiedExternalPeople, 0, 'referral to an internal affiliate fails closed')
result = report({ affiliates: [affiliate({ email: 'different-external@example.com' })] })
equal(result.funnel.qualifiedExternalPeople, 0, 'affiliate row and owner profile must identify the same external email')
result = report({ affiliates: [affiliate({ created_at: null })] })
equal(result.funnel.qualifiedExternalPeople, 0, 'affiliate without a clock fails closed')
result = report({ affiliates: [affiliate({ created_at: iso(11 * 24) })] })
equal(result.funnel.qualifiedExternalPeople, 0, 'future affiliate cannot validate an earlier referral')
result = report({ profiles: [profile('u1'), { ...affiliateOwner, created_at: null }] })
equal(result.funnel.qualifiedExternalPeople, 0, 'affiliate owner profile without a clock fails closed')
result = report({ profiles: [profile('u1'), { ...affiliateOwner, created_at: iso(11 * 24) }] })
equal(result.funnel.qualifiedExternalPeople, 0, 'future affiliate owner profile fails closed')
result = report({
  profiles: [profile('u1')],
  affiliates: [affiliate({ user_id: 'u1', email: 'u1@example.com' })],
})
equal(result.funnel.qualifiedExternalPeople, 0, 'self-referral is never a qualified campaign assist')

result = report({
  sessionEvents: [...fixture().sessionEvents, owner('hidden-other-owner', 'u2', 'browser1', 2.8)],
  profiles: [profile('u1'), profile('u2'), affiliateOwner],
})
equal(result.funnel.qualifiedExternalPeople, 0, 'any second owner anywhere in the browser-session inventory fails closed')
result = report({ sessionEvents: fixture().evidenceEvents })
equal(result.funnel.qualifiedExternalPeople, 0, 'anonymous continuation without a proven owner stays anonymous')
result = report({
  sessionEvents: [...fixture().sessionEvents, owner('future-owner', 'u2', 'browser1', 3 + 7 * 24 + 1)],
  profiles: [profile('u1'), profile('u2'), affiliateOwner],
})
equal(result.funnel.qualifiedExternalPeople, 1, 'owner appearing only after the individual cutoff cannot rewrite earlier identity')
result = report({ profiles: [profile('u1', { created_at: iso(11 * 24) }), affiliateOwner] })
equal(result.funnel.qualifiedExternalPeople, 0, 'future profile clock cannot resolve an owner retroactively')
result = report({
  sessionEvents: [...fixture().evidenceEvents, owner('early-owner', 'u1', 'browser1', 2.5)],
})
equal(result.funnel.qualifiedExternalPeople, 0, 'session owner observed before profile creation cannot resolve identity retroactively')
result = report({ referrals: [referral('u1', { first_touch_at: iso(11 * 24) })] })
equal(result.funnel.qualifiedExternalPeople, 0, 'future referral clock cannot establish the journey')
result = report({ referrals: [referral('u1', { first_touch_at: iso(2.5) })] })
equal(result.funnel.qualifiedExternalPeople, 0, 'referral before profile creation cannot establish canonical signup linkage')

result = report({
  evidenceEvents: [plan('early-plan', null, 'browser1', 1), landing('late-landing', 'browser1', 2)],
  sessionEvents: [plan('early-plan', null, 'browser1', 1), landing('late-landing', 'browser1', 2), owner('o', 'u1', 'browser1', 3)],
})
equal(result.funnel.qualifiedExternalPeople, 0, 'plan before landing cannot establish the ordered journey')
result = report({
  evidenceEvents: [landing('same-time-landing', 'browser1', 1), plan('same-time-plan', null, 'browser1', 1), plan('later-plan', null, 'browser1', 2)],
  sessionEvents: [landing('same-time-landing', 'browser1', 1), plan('same-time-plan', null, 'browser1', 1), plan('later-plan', null, 'browser1', 2), owner('o', 'u1', 'browser1', 3)],
})
equal(result.funnel.qualifiedExternalPeople, 0, 'plan tied with landing cannot be cleaned by a later plan')
result = report({
  evidenceEvents: [landing('identified-landing', 'browser1', 1), plan('identified-plan', 'u1', 'browser1', 2)],
  sessionEvents: [landing('identified-landing', 'browser1', 1), plan('identified-plan', 'u1', 'browser1', 2)],
})
equal(result.funnel.qualifiedExternalPeople, 0, 'identified plan at or before profile creation fails its chronology')
result = report({
  evidenceEvents: [landing('tie-landing', 'browser1', 1), plan('tie-plan', null, 'browser1', 3)],
  sessionEvents: [landing('tie-landing', 'browser1', 1), plan('tie-plan', null, 'browser1', 3), owner('tie-owner', 'u1', 'browser1', 3)],
})
equal(result.funnel.qualifiedExternalPeople, 0, 'anonymous plan tied with profile creation is clock-ambiguous')

result = report({
  financialEvents: [
    start('invalid-first', 'u1', 4, 'cs-invalid', { tier: 'fake' }),
    start('valid-later', 'u1', 5, 'cs-valid'),
    payment('later-paid', 'u1', 6, 'cs-valid'),
  ],
})
equal(result.funnel.recurringCheckoutPeople, 0, 'invalid first recurring start cannot be replaced by a later valid Session')
equal(result.exclusionsAndDiagnostics.firstRecurringInvalidPeople, 1, 'invalid first recurring start is diagnosed')
result = report({
  financialEvents: [
    start('pre-referral-start', 'u1', 3.25, 'cs-too-early'),
    start('post-referral-start', 'u1', 4, 'cs-later'),
  ],
})
equal(result.funnel.recurringCheckoutPeople, 0, 'first start after plan but before canonical referral cannot be replaced later')
equal(result.funnel.eligibleNonSubscriberPeople, 0, 'pre-referral recurring intent is excluded from campaign assistance')
equal(result.exclusionsAndDiagnostics.preexistingRecurringIntentPeople, 1, 'preexisting recurring intent is diagnosed')
result = report({
  financialEvents: [
    start('anchor-tie-start', 'u1', 3.5, 'cs-tied'),
    start('after-anchor-start', 'u1', 4, 'cs-after'),
    payment('after-anchor-paid', 'u1', 5, 'cs-after'),
  ],
})
equal(result.funnel.recurringCheckoutPeople, 0, 'start tied with the identity/referral anchor cannot be cleaned by a later paid Session')
equal(result.funnel.eligibleNonSubscriberPeople, 0, 'anchor-tied intent is not an eligible assisted prospect')
result = report({
  financialEvents: [
    start('old-invalid-intent', 'u1', 1.5, 'cs-old-invalid', { tier: 'fake' }),
    start('later-valid-intent', 'u1', 4, 'cs-new'),
    payment('later-valid-paid', 'u1', 5, 'cs-new'),
  ],
})
equal(result.funnel.exactSubscriptionPaidPeople, 0, 'old invalid recurring intent prevents later paid Session from becoming campaign primary')
equal(result.exclusionsAndDiagnostics.preexistingRecurringIntentPeople, 1, 'old invalid recurring intent remains visible')
result = report({
  financialEvents: [
    start('ambiguous-product-first', 'u1', 4, 'cs-mixed', { sku: 'bulk20' }),
    start('valid-after-mixed', 'u1', 5, 'cs-valid'),
  ],
})
equal(result.funnel.recurringCheckoutPeople, 0, 'sku plus recurring fields is an invalid first subscription-like start, not a pack')

result = report({
  financialEvents: [start('tie-a', 'u1', 4, 'cs-a'), start('tie-b', 'u1', 4, 'cs-b')],
})
equal(result.funnel.recurringCheckoutPeople, 0, 'two first recurring starts at the same clock fail closed')
equal(result.exclusionsAndDiagnostics.ambiguousFirstRecurringPeople, 1, 'first recurring tie is diagnosed')
result = report({
  financialEvents: [start('dupe-a', 'u1', 4, 'cs-same'), start('dupe-b', 'u1', 4, 'cs-same')],
})
equal(result.funnel.recurringCheckoutPeople, 0, 'duplicate first start rows fail closed even for the same Session')

result = report({
  financialEvents: [
    start('first-unpaid', 'u1', 4, 'cs-first'),
    start('later-paid-start', 'u1', 5, 'cs-later'),
    payment('later-payment', 'u1', 6, 'cs-later'),
  ],
})
equal(result.funnel.recurringCheckoutPeople, 1, 'the first exact unpaid Session remains the checkout denominator')
equal(result.funnel.exactSubscriptionPaidPeople, 0, 'payment on a later Session never replaces the first')

result = report({
  financialEvents: [start('old-start', 'u1', 1.5, 'cs-old'), payment('old-paid-late', 'u1', 5, 'cs-old')],
})
equal(result.funnel.eligibleNonSubscriberPeople, 0, 'Session started before the plan is a preexisting subscription even if payment is later')
equal(result.exclusionsAndDiagnostics.preexistingSubscriberPeople, 1, 'preexisting subscription is diagnosed')
result = report({
  financialEvents: [payment('unlinked-prior-payment', 'u1', 1.5, 'cs-unlinked')],
})
equal(result.funnel.eligibleNonSubscriberPeople, 0, 'unlinked prior subscription payment fails closed')
equal(result.exclusionsAndDiagnostics.preexistingSubscriptionUnknownPeople, 1, 'uncertain prior subscriber is diagnosed')
equal(result.gate.state, 'blocked_data_quality', 'uncertain prior subscription blocks the gate')
result = report({
  financialEvents: [
    payment('plan-tie-payment', 'u1', 2, 'cs-plan-tie'),
    start('later-after-plan-tie', 'u1', 4, 'cs-later-plan-tie'),
    payment('later-after-plan-tie-paid', 'u1', 5, 'cs-later-plan-tie'),
  ],
})
equal(result.funnel.eligibleNonSubscriberPeople, 0, 'raw payment tied with plan excludes campaign assistance')
equal(result.funnel.exactSubscriptionPaidPeople, 0, 'later paid Session cannot clean a payment tied with plan')
result = report({
  financialEvents: [
    payment('between-plan-referral-payment', 'u1', 3.25, 'cs-between'),
    start('later-after-between', 'u1', 4, 'cs-later-between'),
    payment('later-after-between-paid', 'u1', 5, 'cs-later-between'),
  ],
})
equal(result.funnel.eligibleNonSubscriberPeople, 0, 'raw payment between plan and referral excludes campaign assistance')
equal(result.funnel.exactSubscriptionPaidPeople, 0, 'later paid Session cannot clean a pre-referral payment')
result = report({
  financialEvents: [
    payment('before-first-session-payment', 'u1', 4, 'cs-unlinked-before-first'),
    start('first-session-after-raw-payment', 'u1', 5, 'cs-first-after-payment'),
    payment('first-session-after-raw-payment-paid', 'u1', 6, 'cs-first-after-payment'),
  ],
})
equal(result.funnel.exactSubscriptionPaidPeople, 0, 'unresolved raw payment before the first canonical Session fails closed')
equal(result.exclusionsAndDiagnostics.preexistingSubscriptionUnknownPeople, 1, 'pre-Session raw payment is diagnosed')

result = report({
  financialEvents: [start('late-start', 'u1', 4, 'cs-late'), payment('late-pay', 'u1', 3 + 7 * 24 + 1, 'cs-late')],
})
equal(result.funnel.recurringCheckoutPeople, 1, 'first Session remains an exact checkout when payment misses cutoff')
equal(result.funnel.exactSubscriptionPaidPeople, 0, 'payment after immutable cutoff is excluded')
result = report({
  financialEvents: [start('clock-tie-start', 'u1', 4, 'cs-clock-tie'), payment('clock-tie-pay', 'u1', 4, 'cs-clock-tie')],
})
equal(result.funnel.recurringCheckoutPeople, 0, 'payment tied with checkout does not prove ordered settlement')

result = report({
  financialEvents: [packStart('pack-start', 'u1', 4, 'cs-pack'), packPaid('pack-paid', 'u1', 5, 'cs-pack', 9900, 'brl')],
})
equal(result.funnel.recurringCheckoutPeople, 0, 'one-time pack never counts as recurring checkout')
equal(result.funnel.oneTimePackPaidPeople, 1, 'one-time pack is reported separately')
equal(result.funnel.oneTimePackRevenueMinorByCurrency, { brl: 9900 }, 'pack revenue stays separate in minor units by currency')
result = report({
  financialEvents: [
    packStart('pack-owner-start', 'u1', 4, 'cs-shared-pack'),
    packStart('pack-other-start', 'u2', 4.1, 'cs-shared-pack'),
    packPaid('pack-owner-paid', 'u1', 5, 'cs-shared-pack'),
  ],
})
equal(result.funnel.oneTimePackCheckoutStripeSessions, 0, 'cross-owner bulk start on one Stripe Session fails closed')
equal(result.gate.state, 'blocked_data_quality', 'cross-owner pack Session blocks the data-quality gate')
result = report({
  financialEvents: [packStart('pack-tie-start', 'u1', 4, 'cs-pack-tie'), packPaid('pack-tie-paid', 'u1', 4, 'cs-pack-tie')],
})
equal(result.funnel.oneTimePackPaidPeople, 0, 'pack payment tied with start does not prove ordered settlement')

result = report({
  financialEvents: [{ ...start('null-linked', 'u1', 4, 'cs-null'), created_at: null }],
})
equal(result.gate.state, 'blocked_data_quality', 'undatable financial evidence linked to the candidate blocks the gate')
result = report({
  financialEvents: [
    start('dated-start', 'u1', 4, 'cs-null-payment'),
    { ...payment('null-payment', null, 5, 'cs-null-payment'), created_at: null },
  ],
})
equal(result.funnel.recurringCheckoutPeople, 0, 'undatable row on the anchored Stripe Session fails closed even without user_id')
equal(result.gate.state, 'blocked_data_quality', 'undatable anchored Stripe Session blocks reconciliation')
result = report({
  financialEvents: [{ ...start('null-unrelated', 'unrelated', 4, 'cs-null'), created_at: null }],
})
equal(result.gate.state, 'collecting', 'unrelated undatable financial noise does not block this campaign forever')
result = report({
  evidenceEvents: [...fixture().evidenceEvents, { ...plan('null-plan', null, 'browser1', 2.5), created_at: null }],
  sessionEvents: [...fixture().sessionEvents, { ...plan('null-plan', null, 'browser1', 2.5), created_at: null }],
})
equal(result.funnel.qualifiedExternalPeople, 0, 'undatable campaign evidence in the candidate session fails closed')
equal(result.gate.state, 'blocked_data_quality', 'undatable candidate-session evidence blocks the gate')

const currencies = fixture()
result = buildAffiliateBusinessSubscriptionReport({
  generatedAt,
  windowStart,
  evidenceEvents: [
    ...currencies.evidenceEvents,
    landing('landing-u2', 'browser2', 1),
    plan('plan-u2', null, 'browser2', 2),
  ],
  sessionEvents: [
    ...currencies.sessionEvents,
    landing('landing-u2', 'browser2', 1),
    plan('plan-u2', null, 'browser2', 2),
    owner('owner-u2', 'u2', 'browser2'),
  ],
  profiles: [profile('u1'), profile('u2'), affiliateOwner],
  referrals: [referral('u1'), referral('u2', { id: 'ref-u2' })],
  affiliates: [affiliate()],
  financialEvents: [
    start('s1', 'u1', 4, 'cs-usd'), payment('p1', 'u1', 5, 'cs-usd', 1500, 'usd'),
    start('s2', 'u2', 4, 'cs-brl'), payment('p2', 'u2', 5, 'cs-brl', 7900, 'BRL'),
  ],
})
equal(result.funnel.subscriptionRevenueMinorByCurrency, { brl: 7900, usd: 1500 }, 'currencies are never summed together')
result = report({
  financialEvents: [start('pii-currency-start', 'u1', 4, 'cs-pii-currency'), payment('pii-currency-paid', 'u1', 5, 'cs-pii-currency', 1500, 'u1@example.com')],
})
equal(result.funnel.exactSubscriptionPaidPeople, 0, 'non-ISO subscription currency fails closed')
equal(result.gate.state, 'blocked_data_quality', 'non-ISO subscription currency blocks reconciliation')
check(!JSON.stringify(result).includes('u1@example.com'), 'invalid subscription currency cannot leak through report keys')
result = report({
  financialEvents: [packStart('pii-pack-start', 'u1', 4, 'cs-pii-pack'), packPaid('pii-pack-paid', 'u1', 5, 'cs-pii-pack', 9900, 'private-id')],
})
equal(result.funnel.oneTimePackPaidPeople, 0, 'non-ISO pack currency fails closed')
check(!JSON.stringify(result).includes('private-id'), 'invalid pack currency cannot leak through report keys')

const people = Array.from({ length: AFFILIATE_BUSINESS_MIN_MATURE_PEOPLE }, (_, index) => `gate-${index}`)
const gateEvidence = people.flatMap((user, index) => [
  landing(`gl-${index}`, `gs-${index}`, 1),
  plan(`gp-${index}`, null, `gs-${index}`, 2),
])
const gateSessions = gateEvidence.concat(people.map((user, index) => owner(`go-${index}`, user, `gs-${index}`)))
result = buildAffiliateBusinessSubscriptionReport({
  generatedAt, windowStart, evidenceEvents: gateEvidence, sessionEvents: gateSessions, financialEvents: [],
  profiles: [...people.map((user) => profile(user)), affiliateOwner],
  referrals: people.map((user, index) => referral(user, { id: `gr-${index}` })),
  affiliates: [affiliate()],
})
equal(result.funnel.matureQualifiedExternalPeople, 5, 'gate counts mature external people, not rows or sessions')
equal(result.gate.state, 'ready_for_hypothesis_review', 'five individually mature people open review')

const freshProfiles = people.map((user) => profile(user, { created_at: iso(9 * 24) }))
const freshReferrals = people.map((user, index) => referral(user, { id: `fresh-ref-${index}`, first_touch_at: iso(9 * 24 + 1) }))
const freshEvidence = people.flatMap((user, index) => [
  landing(`fl-${index}`, `fs-${index}`, 9 * 24 - 1),
  plan(`fp-${index}`, null, `fs-${index}`, 9 * 24 + 0.5),
])
result = buildAffiliateBusinessSubscriptionReport({
  generatedAt, windowStart, evidenceEvents: freshEvidence,
  sessionEvents: freshEvidence.concat(people.map((user, index) => owner(`fo-${index}`, user, `fs-${index}`, 9 * 24))),
  financialEvents: [], profiles: [...freshProfiles, affiliateOwner], referrals: freshReferrals, affiliates: [affiliate()],
})
equal(result.funnel.qualifiedExternalPeople, 5, 'fresh candidates still count as qualified people')
equal(result.funnel.matureQualifiedExternalPeople, 0, 'fresh people are not prematurely mature')
equal(result.gate.state, 'collecting', 'five fresh people do not open the gate')

const privateReport = report({
  financialEvents: [start('private-start', 'u1', 4, 'cs_private_secret'), payment('private-paid', 'u1', 5, 'cs_private_secret')],
})
const serialized = JSON.stringify(privateReport)
for (const secret of ['u1', 'cs_private_secret', 'u1@example.com', 'affiliate-external', 'ref-u1']) {
  check(!serialized.includes(secret), `aggregate report omits PII/identifier sentinel ${secret}`)
}

assert.throws(() => buildAffiliateBusinessSubscriptionReport({
  generatedAt: 'bad', windowStart, evidenceEvents: [], sessionEvents: [], financialEvents: [], profiles: [], referrals: [], affiliates: [],
}), /valid ordered timestamps/)
checks += 1

function queryFor({ table, calls, rowsByTable, filters }) {
  const query = {
    select(...args) { calls.push([table, 'select', ...args]); return query },
    gte(...args) { filters.push(['gte', ...args]); calls.push([table, 'gte', ...args]); return query },
    lte(...args) { filters.push(['lte', ...args]); calls.push([table, 'lte', ...args]); return query },
    is(...args) { filters.push(['is', ...args]); calls.push([table, 'is', ...args]); return query },
    in(...args) { filters.push(['in', ...args]); calls.push([table, 'in', ...args]); return query },
    order(...args) { calls.push([table, 'order', ...args]); return query },
    range(from, to) {
      calls.push([table, 'range', from, to, structuredClone(filters)])
      let rows = typeof rowsByTable[table] === 'function'
        ? rowsByTable[table](structuredClone(filters))
        : rowsByTable[table] ?? []
      for (const [kind, field, value] of filters) {
        if (kind === 'in') rows = rows.filter((row) => value.includes(row?.[field]))
        if (kind === 'is' && value === null) rows = rows.filter((row) => row?.[field] == null)
        if (kind === 'gte') rows = rows.filter((row) => row?.[field] != null && row[field] >= value)
        if (kind === 'lte') rows = rows.filter((row) => row?.[field] != null && row[field] <= value)
      }
      return Promise.resolve({ data: rows.slice(from, to + 1), error: null })
    },
  }
  return query
}

const calls = []
const baseRows = fixture()
const rowsByTable = {
  profiles: baseRows.profiles,
  affiliate_referrals: baseRows.referrals,
  affiliates: baseRows.affiliates,
  events: [
    ...baseRows.evidenceEvents,
    owner('loader-owner', 'u1', 'browser1'),
    start('loader-start', 'u1', 4, 'cs-loader'),
    payment('loader-paid', 'u1', 5, 'cs-loader'),
  ],
}
const collected = await collectAffiliateBusinessSubscription({
  db: { from(table) { calls.push([table, 'from']); return queryFor({ table, calls, rowsByTable, filters: [] }) } },
  generatedAt: new Date(generatedAt),
})
equal(collected.funnel.qualifiedExternalPeople, 1, 'runner executes the report end to end')
equal(collected.funnel.exactSubscriptionPaidPeople, 1, 'runner reconciles exact subscription payment')
const sessionRead = calls.find((call) =>
  call[1] === 'range' &&
  call[4].some((filter) => filter[0] === 'in' && filter[1] === 'session_id') &&
  call[4].some((filter) => filter[0] === 'lte' && filter[1] === 'created_at'))
const nullSessionRead = calls.find((call) =>
  call[1] === 'range' &&
  call[4].some((filter) => filter[0] === 'in' && filter[1] === 'session_id') &&
  call[4].some((filter) => filter[0] === 'is' && filter[1] === 'created_at'))
check(Boolean(sessionRead), 'runner performs dated browser-session inventory through generatedAt')
check(Boolean(nullSessionRead), 'runner separately inventories undatable session rows')
check(sessionRead[4].every((filter) =>
  (filter[0] === 'in' && filter[1] === 'session_id') ||
  (filter[0] === 'lte' && filter[1] === 'created_at')), 'dated session inventory has no event-name filter')
check(nullSessionRead[4].every((filter) =>
  (filter[0] === 'in' && filter[1] === 'session_id') ||
  (filter[0] === 'is' && filter[1] === 'created_at')), 'undatable session inventory has no event-name filter')

const emptyCalls = []
await collectAffiliateBusinessSubscription({
  db: { from(table) { emptyCalls.push([table, 'from']); return queryFor({ table, calls: emptyCalls, rowsByTable: { profiles: [], affiliates: [], affiliate_referrals: [], events: [] }, filters: [] }) } },
  generatedAt: new Date(generatedAt),
})
check(!emptyCalls.some((call) =>
  call[1] === 'in' && call[2] === 'session_id'), 'runner makes zero session query when there are no candidates')

const conflictCalls = []
const primaryLanding = landing('same-id', 'conflict-browser')
await assert.rejects(
  collectAffiliateBusinessSubscription({
    db: { from(table) { conflictCalls.push([table, 'from']); return queryFor({
      table,
      calls: conflictCalls,
      rowsByTable: {
        profiles: [],
        affiliates: [],
        affiliate_referrals: [],
        events(filters) {
          const isNullRead = filters.some((filter) => filter[0] === 'is')
          const sessionRead = filters.some((filter) => filter[0] === 'in' && filter[1] === 'session_id')
          const evidenceRead = filters.some((filter) =>
            filter[0] === 'in' && filter[1] === 'name' &&
            filter[2].includes('affiliate_landing_context_viewed'))
          if (isNullRead) return []
          if (sessionRead) return [{ ...primaryLanding, metadata: { ...primaryLanding.metadata, destination: 'video' } }]
          if (evidenceRead) return [primaryLanding]
          return []
        },
      },
      filters: [],
    }) } },
    generatedAt: new Date(generatedAt),
  }),
  /conflicting duplicate row id/,
)
checks += 1

const pagingCalls = []
await collectAffiliateBusinessSubscription({
  db: { from(table) { pagingCalls.push([table, 'from']); return queryFor({
    table, calls: pagingCalls,
    rowsByTable: { profiles: Array.from({ length: 1001 }, (_, index) => profile(`page-${index}`)), affiliates: [], affiliate_referrals: [], events: [] },
    filters: [],
  }) } },
  generatedAt: new Date(generatedAt),
})
check(pagingCalls.some((call) => call[0] === 'profiles' && call[1] === 'range' && call[2] === 1000), 'runner paginates profiles beyond 1000 rows')

function pageTwoErrorQuery(table) {
  const query = {
    select() { return query },
    gte() { return query },
    lte() { return query },
    is() { return query },
    in() { return query },
    order() { return query },
    range(from) {
      if (table === 'profiles' && from === 0) {
        return Promise.resolve({
          data: Array.from({ length: 1000 }, (_, index) => profile(`error-page-${index}`)),
          error: null,
        })
      }
      if (table === 'profiles') {
        return Promise.resolve({ data: null, error: { code: 'PAGE2', message: 'second page failed' } })
      }
      return Promise.resolve({ data: [], error: null })
    },
  }
  return query
}
await assert.rejects(
  collectAffiliateBusinessSubscription({
    db: { from(table) { return pageTwoErrorQuery(table) } },
    generatedAt: new Date(generatedAt),
  }),
  /profiles\[1000:1999\]: PAGE2 second page failed/,
)
checks += 1

await assert.rejects(
  collectAffiliateBusinessSubscription({
    db: { from() { return { select() { return this }, gte() { return this }, lte() { return this }, is() { return this }, in() { return this }, order() { return this }, range() { return Promise.resolve({ data: null, error: null }) } } } },
    generatedAt: new Date(generatedAt),
  }),
  /expected an array result/,
)
checks += 1

equal(AFFILIATE_BUSINESS_CONTRACT.source, 'affiliate', 'report derives canonical affiliate source')
equal(AFFILIATE_BUSINESS_CONTRACT.medium, 'partner', 'report derives canonical affiliate medium')
equal(AFFILIATE_BUSINESS_CONTRACT.campaign, 'affiliate_business_plan', 'report derives canonical affiliate campaign')
equal(AFFILIATE_BUSINESS_CONTRACT.entry, 'affiliate_business', 'report derives canonical plan entry')
equal(AFFILIATE_BUSINESS_CONTRACT.planVersion, 'weekly_business_video_plan_share_v1', 'report derives canonical plan event version')
equal(AFFILIATE_BUSINESS_CONTRACT.landingVariant, 'affiliate_landing_context_v1', 'report derives canonical landing variant')

function executeTs(file) {
  const compiled = ts.transpileModule(readFileSync(join(process.cwd(), file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText
  const box = { exports: {} }
  vm.runInNewContext(compiled, {
    module: box,
    exports: box.exports,
    require: (id) => { throw new Error(`unexpected import ${id}`) },
    URL,
    Map,
  }, { filename: file })
  return box.exports
}
const destinationContract = executeTs('lib/affiliateDestinations.ts')
equal(
  destinationContract.AFFILIATE_DESTINATIONS.find((row) => row.key === 'business').campaign,
  AFFILIATE_BUSINESS_CONTRACT.campaign,
  'business-plan campaign matches the canonical affiliate destination',
)

console.log(`affiliate business subscription: ${checks}/${checks} checks passed`)
