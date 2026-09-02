#!/usr/bin/env node
import assert from 'node:assert/strict'
import { buildB2cSubscriptionTruthReport } from './b2c-subscription-truth-report.mjs'

let checks = 0
const equal = (actual, expected, message) => { assert.deepEqual(actual, expected, message); checks += 1 }
const ok = (value, message) => { assert.ok(value, message); checks += 1 }
const at = (day, minute = 0) => `2026-09-${String(day).padStart(2, '0')}T10:${String(minute).padStart(2, '0')}:00.000Z`
const event = (name, user_id, day, minute, metadata = {}, session_id = `browser-${user_id ?? 'anon'}`) => ({
  id: `${name}-${user_id ?? 'anon'}-${day}-${minute}-${Math.random()}`,
  name,
  user_id,
  session_id,
  created_at: at(day, minute),
  metadata,
})
const video = (id, user, day, minute = 0) => ({ id, user_id: user, status: 'completed', created_at: at(day, minute) })
const start = (user, day, minute, stripeSessionId, browser, extra = {}) => event('checkout_started', user, day, minute, {
  tier: 'basic', billing: 'monthly', stripe_session_id: stripeSessionId, ...extra,
}, browser)
const paid = (user, day, minute, stripeSessionId, extra = {}) => event('payment_success', user, day, minute, {
  checkout_mode: 'subscription', stripe_session_id: stripeSessionId, amount_total: 1500, currency: 'usd', ...extra,
})
const profiles = [
  { id: 'u1', email: 'buyer@example.com' },
  { id: 'u2', email: 'other@example.com' },
  { id: 'internal', email: 'josephsskaf@gmail.com' },
]
const build = (events, videos = [video('v1', 'u1', 1)]) => buildB2cSubscriptionTruthReport({
  generatedAt: at(9, 59),
  windowStart: at(1),
  events,
  profiles,
  videos,
})
const resultExposure = event('result_video_value_sampled', 'u1', 1, 2, {
  version: 'result_video_value_sampled_v1', first_delivery_status: 'confirmed',
})
const historyExposure = event('history_first_video_offer_viewed', 'u1', 1, 3, {
  version: 'history_first_video_human_view_v2',
})
const inlineExposure = event('inline_pricing_value_anchor_viewed', 'u1', 1, 4, {
  version: 'inline_pricing_decision_v1',
})

let report = build([
  resultExposure,
  historyExposure,
  inlineExposure,
  event('checkout_cta_clicked', 'u1', 1, 10, { surface: 'generate_step_1' }, 'browser-pay'),
  start('u1', 1, 11, 'cs_one', 'browser-pay'),
  paid('u1', 1, 12, 'cs_one'),
])
equal(report.financialTruth.exactExternalPaidPeople, 1, 'one payer is counted')
equal(report.financialTruth.exactExternalPaidStripeSessions, 1, 'one paid Session is counted')
equal(report.financialTruth.externalRevenueMinorByCurrency, { usd: 1500 }, 'revenue is counted once')
equal(report.checkoutOriginTruth.exactOriginPaidStripeSessions, 1, 'only one origin owns the paid Session')
equal(report.experiments.find((row) => row.experiment === 'inline_pricing').exactOriginPaidStripeSessions, 1, 'inline is the exclusive origin')
equal(report.experiments.find((row) => row.experiment === 'history_offer').exactOriginPaidStripeSessions, 0, 'history does not double-claim origin')
equal(report.experiments.find((row) => row.experiment === 'result_value_sample').exactOriginPaidStripeSessions, 0, 'value sample is never an origin')
equal(report.assistanceTruth.paidStripeSessionsWithMultiplePriorExposures, 1, 'the same payment can have several assists')
equal(report.experiments.find((row) => row.experiment === 'history_offer').assistedPaidStripeSessions, 1, 'history remains an assist')

report = build([
  historyExposure,
  event('checkout_started', 'u1', 1, 11, { sku: 'pack_100', stripe_session_id: 'cs_pack' }, 'browser-pack'),
  event('payment_success', 'u1', 1, 12, { checkout_mode: 'payment', stripe_session_id: 'cs_pack', amount_total: 900, currency: 'usd' }),
])
equal(report.financialTruth.exactExternalPaidStripeSessions, 0, 'a pack never becomes a subscriber')
equal(report.financialTruth.packSessions, 1, 'pack remains visible as pack')

report = build([
  inlineExposure,
  event('checkout_cta_clicked', 'u1', 1, 10, { surface: 'generate_step_1' }, 'browser-conflict'),
  start('u1', 1, 11, 'cs_conflict', 'browser-conflict'),
  paid('u2', 1, 12, 'cs_conflict'),
])
equal(report.financialTruth.exactExternalPaidStripeSessions, 0, 'same Session with two owners yields zero external revenue')
equal(report.financialTruth.conflictStripeSessions, 1, 'owner conflict is diagnosed')

report = build([
  event('checkout_resume_choice_viewed', 'u1', 1, 2, { version: 'checkout_resume_human_view_v1' }),
  event('checkout_cta_clicked', 'u1', 1, 10, { surface: 'checkout_resume_banner' }, 'browser-resume'),
  start('u1', 1, 11, 'cs_resume', 'browser-resume'),
  paid('u1', 1, 12, 'cs_resume'),
])
equal(report.financialTruth.exactExternalPaidStripeSessions, 1, 'resume payment remains financial truth')
equal(report.checkoutOriginTruth.exactOriginPaidStripeSessions, 0, 'resume gap receives no exact origin credit')
equal(report.checkoutOriginTruth.unknownResumeGapStripeSessions, 1, 'resume gap is explicit')

report = build([
  event('welcome_offer_viewed', 'u1', 1, 2, { version: 'welcome_offer_frequency_truth_v1' }, 'browser-welcome'),
  event('welcome_offer_checkout_clicked', 'u1', 1, 10, { version: 'welcome_offer_frequency_truth_v1' }, 'other-browser'),
  start('u1', 1, 11, 'cs_welcome_wrong_browser', 'browser-welcome', {
    checkout_origin: 'welcome20_modal',
    public_promo_truth_version: 'public_promo_truth_v1',
    public_promo_kind: 'welcome_first_month_20',
    public_promo_state: 'applied',
  }),
  paid('u1', 1, 12, 'cs_welcome_wrong_browser'),
])
equal(report.checkoutOriginTruth.exactOriginPaidStripeSessions, 0, 'welcome click from another browser is not exact')

report = build([
  event('welcome_offer_viewed', 'u1', 1, 2, { version: 'welcome_offer_frequency_truth_v1' }, 'browser-welcome'),
  event('welcome_offer_checkout_clicked', 'u1', 1, 10, { version: 'welcome_offer_frequency_truth_v1' }, 'browser-welcome'),
  start('u1', 1, 11, 'cs_welcome_no_promo', 'browser-welcome', { checkout_origin: 'welcome20_modal' }),
  paid('u1', 1, 12, 'cs_welcome_no_promo'),
])
equal(report.checkoutOriginTruth.exactOriginPaidStripeSessions, 0, 'welcome without applied promo truth is ineligible')

report = build([
  event('welcome_offer_viewed', 'u1', 1, 2, { version: 'welcome_offer_frequency_truth_v1' }, 'browser-welcome'),
  event('welcome_offer_checkout_clicked', 'u1', 1, 10, { version: 'welcome_offer_frequency_truth_v1' }, 'browser-welcome'),
  start('u1', 1, 11, 'cs_welcome', 'browser-welcome', {
    checkout_origin: 'welcome20_modal',
    public_promo_truth_version: 'public_promo_truth_v1',
    public_promo_kind: 'welcome_first_month_20',
    public_promo_state: 'applied',
  }),
  paid('u1', 1, 12, 'cs_welcome'),
])
equal(report.experiments.find((row) => row.experiment === 'welcome_offer').exactOriginPaidStripeSessions, 1, 'welcome requires click, browser and applied promo truth')

report = build([
  event('plan_fit_checkout_cta_viewed', 'u1', 1, 2, { offer_version: 'plan_fit_direct_win_v3', event_unit: 'first_completed_video' }, 'browser-plan'),
  event('checkout_cta_clicked', 'u1', 1, 10, { surface: 'generate_plan_fit' }, 'browser-plan'),
  start('u1', 1, 11, 'cs_plan', 'browser-plan'),
  paid('u1', 1, 12, 'cs_plan'),
])
equal(report.experiments.find((row) => row.experiment === 'plan_fit').exactOriginPaidStripeSessions, 1, 'Plan Fit can own one exact origin')

report = build([paid('u1', 1, 12, 'cs_unlinked')])
equal(report.financialTruth.unlinkedSubscriptionPaymentSessions, 1, 'payment without start remains explicit')
equal(report.financialTruth.exactExternalPaidStripeSessions, 0, 'unlinked payment does not become revenue attribution')

report = build([])
equal(report.financialTruth.exactExternalPaidPeople, 0, 'empty input invents no payer')
equal(report.checkoutOriginTruth.unresolvedStartedRatio, null, 'empty input invents no unresolved ratio')
equal(report.gate.state, 'collecting', 'empty gate keeps collecting')
ok(report.limitations.some((line) => line.includes('legacy admin')), 'legacy admin limitation is explicit')
ok(report.assistanceTruth.rule.includes('never add revenue'), 'assists cannot inflate revenue')

console.log(`b2c-subscription-truth-report: ${checks}/${checks} checks passed`)
