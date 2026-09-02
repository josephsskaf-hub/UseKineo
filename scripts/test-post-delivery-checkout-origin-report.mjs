#!/usr/bin/env node
import assert from 'node:assert/strict'
import { buildPostDeliveryCheckoutOriginReport } from './post-delivery-checkout-origin-report.mjs'

const GENERATED_AT = '2026-09-02T12:00:00.000Z'
const WINDOW_START = '2026-08-02T12:00:00.000Z'
let checks = 0

function check(actual, expected, label) {
  assert.deepEqual(actual, expected, label)
  checks += 1
}

function profile(id, email = `${id}@customer.example`) {
  return { id, email }
}

function event(id, name, userId, sessionId, createdAt, metadata = {}) {
  return { id, name, user_id: userId, session_id: sessionId, created_at: createdAt, metadata }
}

function video(id, userId, createdAt, status = 'completed') {
  return { id, user_id: userId, created_at: createdAt, status }
}

function recurringIntent(extra = {}) {
  return { tier: 'basic', billing: 'monthly', ...extra }
}

const profiles = [
  profile('u1'), profile('u2'), profile('u3'), profile('u4'), profile('u5'),
  profile('u6'), profile('u7'), profile('u8'), profile('u9'), profile('u10'),
  profile('internal', 'josephsskaf@gmail.com'),
  profile('missing', ''),
]
const videos = profiles.map((row, index) => video(`v${index}`, row.id, '2026-08-10T00:00:00.000Z'))
const events = [
  // Exact click → recurring attempt → exact Stripe Session → exact paid webhook.
  event('1', 'checkout_cta_clicked', 'u1', 'session_u1', '2026-08-12T00:00:00.000Z', { surface: 'result_plan_fit', selection: 'basic' }),
  event('2', 'checkout_attempted', 'u1', 'session_u1', '2026-08-12T00:00:01.000Z', recurringIntent()),
  event('3', 'checkout_started', 'u1', 'session_u1', '2026-08-12T00:00:02.000Z', recurringIntent({ stripe_session_id: 'cs_1' })),
  event('4a', 'checkout_cta_clicked', 'u1', 'session_u1', '2026-08-12T00:00:08.000Z', { surface: 'checkout_resume_banner', selection: 'basic' }),
  event('4', 'payment_success', 'u1', 'session_u1', '2026-08-12T00:00:10.000Z', { checkout_mode: 'subscription', stripe_session_id: 'cs_1', amount_total: 1990, currency: 'USD' }),
  // Duplicate webhook row must not duplicate money.
  event('5', 'payment_success', 'u1', 'session_u1', '2026-08-12T00:00:11.000Z', { checkout_mode: 'subscription', stripe_session_id: 'cs_1', amount_total: 1990, currency: 'usd' }),
  // Exact surface but real checkout abandonment (no start).
  event('6', 'checkout_cta_clicked', 'u2', 'session_u2', '2026-08-13T00:00:00.000Z', { surface: 'history_first_video', selection: 'starter' }),
  event('7', 'checkout_attempted', 'u2', 'session_u2', '2026-08-13T00:00:01.000Z', recurringIntent({ tier: 'starter' })),
  // Two different surfaces in the causal window: deliberately ambiguous.
  event('8', 'checkout_cta_clicked', 'u3', 'session_u3', '2026-08-14T00:00:00.000Z', { surface: 'pricing', selection: 'basic' }),
  event('9', 'checkout_cta_clicked', 'u3', 'session_u3', '2026-08-14T00:00:00.500Z', { surface: 'exit_intent', selection: 'basic' }),
  event('10', 'checkout_attempted', 'u3', 'session_u3', '2026-08-14T00:00:01.000Z', recurringIntent()),
  // A click after the attempt cannot be back-attributed.
  event('11', 'checkout_attempted', 'u4', 'session_u4', '2026-08-15T00:00:00.000Z', recurringIntent()),
  event('12', 'checkout_cta_clicked', 'u4', 'session_u4', '2026-08-15T00:00:01.000Z', { surface: 'future_click', selection: 'basic' }),
  // A click more than 30 seconds old is not linked.
  event('13', 'checkout_cta_clicked', 'u5', 'session_u5', '2026-08-16T00:00:00.000Z', { surface: 'stale_click', selection: 'basic' }),
  event('14', 'checkout_attempted', 'u5', 'session_u5', '2026-08-16T00:00:31.000Z', recurringIntent()),
  // Same surface repeated is still a single categorical attribution.
  event('15', 'checkout_cta_clicked', 'u6', 'session_u6', '2026-08-17T00:00:00.000Z', { surface: 'pricing', selection: 'basic' }),
  event('16', 'checkout_cta_clicked', 'u6', 'session_u6', '2026-08-17T00:00:00.500Z', { surface: 'pricing', selection: 'basic' }),
  event('17', 'checkout_attempted', 'u6', 'session_u6', '2026-08-17T00:00:01.000Z', recurringIntent()),
  event('18', 'checkout_started', 'u6', 'session_u6', '2026-08-17T00:00:02.000Z', recurringIntent({ stripe_session_id: 'cs_6' })),
  // Wrong Stripe Session payment cannot receive attribution.
  event('19', 'payment_success', 'u6', 'session_u6', '2026-08-17T00:00:03.000Z', { checkout_mode: 'subscription', stripe_session_id: 'cs_other', amount_total: 2900, currency: 'usd' }),
  // Two different start sessions for one attempt: ambiguous, neither credited.
  event('20', 'checkout_cta_clicked', 'u7', 'session_u7', '2026-08-18T00:00:00.000Z', { surface: 'pricing', selection: 'basic' }),
  event('21', 'checkout_attempted', 'u7', 'session_u7', '2026-08-18T00:00:01.000Z', recurringIntent()),
  event('22', 'checkout_started', 'u7', 'session_u7', '2026-08-18T00:00:02.000Z', recurringIntent({ stripe_session_id: 'cs_7a' })),
  event('23', 'checkout_started', 'u7', 'session_u7', '2026-08-18T00:00:03.000Z', recurringIntent({ stripe_session_id: 'cs_7b' })),
  // Pre-delivery attempt is kept outside the post-delivery funnel.
  event('24', 'checkout_cta_clicked', 'u8', 'session_u8', '2026-08-03T00:00:00.000Z', { surface: 'pricing', selection: 'basic' }),
  event('25', 'checkout_attempted', 'u8', 'session_u8', '2026-08-03T00:00:01.000Z', recurringIntent()),
  // One-time pack must not contaminate subscription counts.
  event('26', 'checkout_cta_clicked', 'u9', 'session_u9', '2026-08-19T00:00:00.000Z', { surface: 'pack', selection: 'starter10' }),
  event('27', 'checkout_attempted', 'u9', 'session_u9', '2026-08-19T00:00:01.000Z', { mode: 'payment', sku: 'starter10' }),
  // Internal and missing-email identities are excluded even with perfect paths.
  event('28', 'checkout_attempted', 'internal', 'session_internal', '2026-08-20T00:00:01.000Z', recurringIntent()),
  event('29', 'checkout_attempted', 'missing', 'session_missing', '2026-08-20T00:00:01.000Z', recurringIntent()),
  // Anonymous click can be a signal for an identified attempt on the same browser session.
  event('30', 'checkout_cta_clicked', null, 'session_u10', '2026-08-21T00:00:00.000Z', { surface: 'result_offer', selection: 'basic' }),
  event('31', 'checkout_attempted', 'u10', 'session_u10', '2026-08-21T00:00:01.000Z', recurringIntent()),
  // A webhook timestamped before the exact start cannot be counted as its payment.
  event('32', 'payment_success', 'u6', 'session_u6', '2026-08-17T00:00:01.500Z', { checkout_mode: 'subscription', stripe_session_id: 'cs_6', amount_total: 2900, currency: 'usd' }),
]

const report = buildPostDeliveryCheckoutOriginReport({
  generatedAt: GENERATED_AT,
  windowStart: WINDOW_START,
  events,
  profiles,
  videos,
})

check(report.schemaVersion, 'post_delivery_checkout_origin_report_v1', 'schema version')
check(report.exclusions.internalProfileRows, 1, 'internal identity excluded')
check(report.exclusions.profileRowsMissingEmail, 1, 'missing email excluded')
check(report.funnel.externalSubscriptionAttemptPeople, 9, 'external subscription people only')
check(report.funnel.postDeliverySubscriptionAttemptPeople, 8, 'pre-delivery attempt excluded from post-delivery funnel')
check(report.funnel.postDeliveryExactSurfacePeople, 5, 'same-session exact surfaces by people')
check(report.funnel.postDeliveryCheckoutStartedPeople, 2, 'only exact starts count')
check(report.funnel.postDeliveryStartedStripeSessions, 2, 'started sessions deduped')
check(report.paymentAssociation.paymentObservedForOriginSessionPeople, 1, 'exact Stripe payment counts only in aggregate')
check(report.paymentAssociation.paymentObservedForOriginStripeSessions, 1, 'paid sessions deduped')
check(report.paymentAssociation.revenueMinorByCurrency, { usd: 1990 }, 'aggregate revenue deduped and grouped by currency')
check(report.paymentAssociation.conversionSurfaceState, 'unknown_without_server_side_resume_correlation', 'resume conversion surface remains unknown')
check(report.uncorrelatedRecoverySignals, {
  people: 1,
  surfaces: [{ surface: 'checkout_resume_banner', people: 1 }],
}, 'recovery click is visible but never receives payment attribution')
check(report.attributionQuality.postDeliveryMissingSurfacePeople, 1, 'stale click remains missing')
check(report.attributionQuality.postDeliveryAmbiguousSurfacePeople, 2, 'conflicting surface and persistence race remain ambiguous')
check(report.attributionQuality.postDeliveryAmbiguousStartPeople, 1, 'multiple starts remain ambiguous')
check(report.attributionQuality.postDeliveryNoStartPeople, 2, 'no start is a real outcome')
check(report.attributionQuality.duplicatePaymentRowsInCohort, 1, 'cohort-only duplicate payment diagnostic')
check(report.attributionQuality.zeroOrUnknownRevenuePaidSessions, 0, 'known positive revenue')
check(report.originSurfaces, [
  {
    surface: 'history_first_video',
    originAttemptPeople: 1,
    originCheckoutStartedPeople: 0,
    originCheckoutStartedStripeSessions: 0,
  },
  {
    surface: 'pricing',
    originAttemptPeople: 2,
    originCheckoutStartedPeople: 1,
    originCheckoutStartedStripeSessions: 1,
  },
  {
    surface: 'result_offer',
    originAttemptPeople: 1,
    originCheckoutStartedPeople: 0,
    originCheckoutStartedStripeSessions: 0,
  },
  {
    surface: 'result_plan_fit',
    originAttemptPeople: 1,
    originCheckoutStartedPeople: 1,
    originCheckoutStartedStripeSessions: 1,
  },
], 'origin surfaces stop at checkout start and never claim a payment')
check(report.gate.sampleMet, false, 'sample gate')
check(report.gate.durationMet, true, 'duration gate')
check(report.gate.attributionQualityMet, false, 'quality gate')
check(report.gate.state, 'collecting', 'gate state')

const sharedStartReport = buildPostDeliveryCheckoutOriginReport({
  generatedAt: GENERATED_AT,
  windowStart: WINDOW_START,
  profiles: [profile('shared')],
  videos: [video('shared_video', 'shared', '2026-08-10T00:00:00.000Z')],
  events: [
    event('shared_1', 'checkout_cta_clicked', 'shared', 'shared_session', '2026-08-22T00:00:00.000Z', { surface: 'pricing', selection: 'basic' }),
    event('shared_2', 'checkout_attempted', 'shared', 'shared_session', '2026-08-22T00:00:01.000Z', recurringIntent()),
    event('shared_3', 'checkout_attempted', 'shared', 'shared_session', '2026-08-22T00:00:01.500Z', recurringIntent()),
    event('shared_4', 'checkout_started', 'shared', 'shared_session', '2026-08-22T00:00:02.000Z', recurringIntent({ stripe_session_id: 'cs_shared' })),
    event('shared_5', 'payment_success', 'shared', 'shared_session', '2026-08-22T00:00:03.000Z', { checkout_mode: 'subscription', stripe_session_id: 'cs_shared', amount_total: 1990, currency: 'usd' }),
  ],
})
check(sharedStartReport.funnel.postDeliveryExactSurfacePeople, 1, 'shared-start actor still has an exact surface')
check(sharedStartReport.funnel.postDeliveryCheckoutStartedPeople, 0, 'one Stripe Session is never credited to two attempts')
check(sharedStartReport.paymentAssociation.paymentObservedForOriginSessionPeople, 0, 'ambiguous start cannot claim aggregate payment')
check(sharedStartReport.attributionQuality.postDeliveryAmbiguousStartPeople, 1, 'shared start is explicit ambiguity')

assert.throws(
  () => buildPostDeliveryCheckoutOriginReport({
    generatedAt: WINDOW_START,
    windowStart: GENERATED_AT,
    events: [], profiles: [], videos: [],
  }),
  /valid ordered timestamps/,
)
checks += 1

const emptyReport = buildPostDeliveryCheckoutOriginReport({
  generatedAt: GENERATED_AT,
  windowStart: WINDOW_START,
  events: [], profiles: [], videos: [],
})
check(emptyReport.window.originObservationStartedAt, null, 'empty data has no invented observation frontier')
check(emptyReport.window.observedDays, null, 'empty data has no invented elapsed days')
check(emptyReport.gate.durationMet, false, 'empty data cannot pass duration gate')

const recentReport = buildPostDeliveryCheckoutOriginReport({
  generatedAt: GENERATED_AT,
  windowStart: WINDOW_START,
  profiles: [profile('recent')],
  videos: [video('recent_video', 'recent', '2026-09-01T00:00:00.000Z')],
  events: [
    event('recent_click', 'checkout_cta_clicked', 'recent', 'recent_session', '2026-09-01T11:59:59.000Z', { surface: 'pricing_page', selection: 'basic' }),
    event('recent_attempt', 'checkout_attempted', 'recent', 'recent_session', '2026-09-01T12:00:00.000Z', recurringIntent()),
  ],
})
check(recentReport.window.observedDays, 1, 'duration starts at first eligible observed origin')
check(recentReport.gate.durationMet, false, 'recent instrumentation cannot pass seven-day gate')

process.stdout.write(`post-delivery checkout origin report: ${checks}/${checks} checks passed\n`)
