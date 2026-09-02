#!/usr/bin/env node
import assert from 'node:assert/strict'
import fs from 'node:fs'
import {
  buildResultVideoDecisionReport,
  RESULT_VIDEO_DECISION_EVENT_NAMES,
} from './result-video-decision-report.mjs'

let checks = 0
const equal = (actual, expected, message) => { assert.deepEqual(actual, expected, message); checks++ }
const ok = (value, message) => { assert.ok(value, message); checks++ }

const at = (day, minute = 0) => `2026-09-${String(day).padStart(2, '0')}T00:${String(minute).padStart(2, '0')}:00.000Z`
const event = (name, user_id, created_at, metadata = {}) => ({ name, user_id, created_at, metadata })
const video = (id, user_id, created_at) => ({ id, user_id, status: 'completed', created_at })

const profiles = [
  { id: 'internal', email: 'josephsskaf@gmail.com' },
  { id: 'u1', email: 'buyer@example.com' },
  { id: 'u2', email: 'creator@example.com' },
  { id: 'u3', email: '' },
  { id: 'returning', email: 'returning@example.com' },
]
const videos = [
  video('internal-first', 'internal', at(1, 1)),
  video('u1-first', 'u1', at(1, 10)),
  video('u2-first', 'u2', at(2)),
  video('u3-first', 'u3', at(2, 1)),
  video('unknown-first', 'missing-profile', at(2, 2)),
  video('returning-old', 'returning', '2026-08-20T00:00:00.000Z'),
  video('returning-second', 'returning', at(2, 3)),
]
const events = [
  event('result_video_value_sampled', 'internal', at(1, 2), { version: 'result_video_value_sampled_v1', first_delivery_status: 'confirmed', attempt_id: 'internal-a' }),
  event('result_video_value_sampled', 'u1', at(1, 11), { version: 'result_video_value_sampled_v1', first_delivery_status: 'confirmed', attempt_id: 'a1' }),
  event('result_video_value_sampled', 'u1', at(1, 12), { version: 'result_video_value_sampled_v1', first_delivery_status: 'confirmed', attempt_id: 'a1' }),
  event('history_first_video_offer_viewed', 'u1', at(1, 13), { version: 'legacy-v1' }),
  event('history_first_video_offer_viewed', 'u1', at(1, 14), { version: 'history_first_video_human_view_v2' }),
  event('plan_fit_card_rendered', 'u1', at(1, 15)),
  event('plan_fit_impression', 'u1', at(1, 16)),
  event('plan_fit_checkout_cta_viewed', 'u1', at(1, 17), { offer_version: 'plan_fit_direct_win_v3', event_unit: 'first_completed_video' }),
  event('plan_fit_checkout_clicked', 'u1', at(1, 18)),
  event('pricing_view', 'u1', at(1, 19)),
  event('checkout_started', 'u1', at(1, 20)),
  event('payment_success', 'u1', at(1, 21)),
  event('video_generation_completed', 'u1', at(1, 22), { attempt_id: 'a1' }),
  event('checkout_resume_choice_viewed', 'u1', at(1, 23), { version: 'wrong-version' }),
  event('video_generation_completed', 'u2', at(2, 1), { attempt_id: 'a2' }),
  event('trial_balance_bridge_viewed', 'u2', at(2, 2), { bridge_version: 'trial_balance_seedance_35s_v2' }),
  event('history_first_video_offer_viewed', 'u2', at(2, 3), { version: 'legacy-v1' }),
  event('video_generation_completed', 'u2', at(2, 4), {}),
  event('video_generation_completed', 'u2', at(2, 5), { attempt_id: 'b2' }),
  event('result_video_value_sampled', 'u3', at(2, 2), { version: 'result_video_value_sampled_v1', first_delivery_status: 'confirmed', attempt_id: 'u3-a' }),
  event('result_video_value_sampled', 'missing-profile', at(2, 3), { version: 'result_video_value_sampled_v1', first_delivery_status: 'confirmed', attempt_id: 'unknown-a' }),
]

const report = buildResultVideoDecisionReport({
  generatedAt: at(3),
  instrumentedAt: at(1),
  events,
  profiles,
  videos,
})

equal(report.schemaVersion, 'result_video_decision_report_v2', 'schema version is explicit')
equal(report.exclusions.internalProfileRows, 1, 'internal profile is excluded')
equal(report.exclusions.profileRowsMissingEmail, 1, 'profile without email stays unclassified')
equal(report.exclusions.firstDeliveryPeopleWithUnknownIdentity, 2, 'missing email and missing profile deliveries stay unknown')
equal(report.cohortTruth.firstDeliveryPeople, 2, 'cohort counts known external first deliveries')
equal(report.cohortTruth.sampledPeople, 1, 'sampled cohort counts people, not duplicate events')
equal(report.cohortTruth.notSampledPeople, 1, 'not-sampled first deliveries remain in the denominator')
equal(report.cohortTruth.completeExternalPeopleCountAvailable, false, 'unknown identities prevent a complete external count claim')
equal(report.associationAfterFirstDelivery.sampled.strictDwellSurfacePeople, 1, 'versioned dwell exposure is counted')
equal(report.associationAfterFirstDelivery.sampled.qualifiedViewportSurfacePeople, 1, 'qualified Plan Fit CTA viewport is counted')
equal(report.associationAfterFirstDelivery.sampled.anyDecisionSurfacePeople, 1, 'sampled decision exposure is a people union')
equal(report.associationAfterFirstDelivery.sampled.decisionClickedPeople, 1, 'sampled click is counted')
equal(report.associationAfterFirstDelivery.sampled.pricingViewedPeople, 1, 'pricing after first delivery is counted')
equal(report.associationAfterFirstDelivery.sampled.checkoutStartedPeople, 1, 'checkout after first delivery is counted')
equal(report.associationAfterFirstDelivery.sampled.paymentSucceededPeople, 1, 'payment after first delivery is counted')
equal(report.associationAfterFirstDelivery.sampled.verifiedSecondCompletionPeople, 0, 'same attempt is not a second completion')
equal(report.associationAfterFirstDelivery.notSampled.qualifiedViewportSurfacePeople, 1, 'versioned balance bridge is viewport exposure')
equal(report.associationAfterFirstDelivery.notSampled.strictDwellSurfacePeople, 0, 'legacy history view is not strict dwell')
equal(report.associationAfterFirstDelivery.notSampled.verifiedSecondCompletionPeople, 1, 'a distinct completion attempt proves continuation')
equal(report.diagnostics.technicalPlanFitRenderedPeople, 1, 'technical mount remains diagnostic')
equal(report.diagnostics.planFitCardImpressionDiagnosticPeople, 1, 'current Plan Fit card impression remains diagnostic')
equal(report.diagnostics.unversionedHistoryOfferPeople, 2, 'legacy history rows are visible but not decision exposure')
equal(report.diagnostics.completionRowsWithoutAttempt, 1, 'completion without attempt stays unverifiable')
equal(report.afterValueSampleOnly.anyDecisionSurfacePeople, 1, 'post-sample exposure uses the sample boundary')
equal(report.afterValueSampleOnly.checkoutStartedPeople, 1, 'post-sample checkout uses sequence truth')
equal(report.gate.state, 'collecting', 'small and young sample cannot open the gate')
ok(report.note.includes('association'), 'report forbids causal lift claims')
ok(report.note.includes('present non-internal email'), 'people unit requires classifiable identity')

const readyProfiles = Array.from({ length: 20 }, (_, index) => ({
  id: `person-${index}`,
  email: `person-${index}@example.com`,
}))
const readyVideos = readyProfiles.map((profile, index) =>
  video(`video-${index}`, profile.id, at(1, index)),
)
const readyEvents = readyProfiles.slice(0, 5).map((profile, index) =>
  event('result_video_value_sampled', profile.id, at(1, index + 30), {
    version: 'result_video_value_sampled_v1',
    first_delivery_status: 'confirmed',
    attempt_id: `attempt-${index}`,
  }),
)
const ready = buildResultVideoDecisionReport({
  generatedAt: '2026-09-09T00:01:00.000Z',
  instrumentedAt: at(1),
  events: readyEvents,
  profiles: readyProfiles,
  videos: readyVideos,
})
equal(ready.gate.firstDeliveryPeopleMet, true, 'people gate opens at exactly twenty')
equal(ready.gate.sampledPeopleMet, true, 'sampled gate opens at exactly five')
equal(ready.gate.notSampledPeopleMet, true, 'not-sampled gate opens with fifteen')
equal(ready.gate.elapsedDaysMet, true, 'fixed boundary proves seven complete days')
equal(ready.gate.state, 'ready_for_decision', 'all sample-mix and maturity gates are required')

const tooYoung = buildResultVideoDecisionReport({
  generatedAt: '2026-09-07T23:59:59.000Z',
  instrumentedAt: at(1),
  events: readyEvents,
  profiles: readyProfiles,
  videos: readyVideos,
})
equal(tooYoung.gate.elapsedDaysMet, false, 'less than seven complete days stays collecting')
equal(tooYoung.gate.state, 'collecting', 'sample size cannot bypass maturity')

const trialVariantReport = buildResultVideoDecisionReport({
  generatedAt: at(3),
  instrumentedAt: at(1),
  profiles: [
    { id: 'trial-valid', email: 'trial-valid@example.com' },
    { id: 'trial-invalid', email: 'trial-invalid@example.com' },
  ],
  videos: [
    video('trial-valid-video', 'trial-valid', at(1, 1)),
    video('trial-invalid-video', 'trial-invalid', at(1, 2)),
  ],
  events: [
    event('trial_post_video_offer_viewed', 'trial-valid', at(1, 3), {
      source: 'result_trial_continue',
      offer_layout: 'engine_fit_starter_first_v1',
    }),
    event('trial_post_video_offer_viewed', 'trial-invalid', at(1, 4), {
      source: 'result_trial_continue',
    }),
  ],
})
equal(
  trialVariantReport.associationAfterFirstDelivery.notSampled.qualifiedViewportSurfacePeople,
  1,
  'only a canonical trial post-video variant is a qualified viewport exposure',
)
equal(
  trialVariantReport.associationAfterFirstDelivery.notSampled.noDecisionSurfacePeople,
  1,
  'missing trial post-video variant remains outside the decision-surface cohort',
)
equal(
  trialVariantReport.diagnostics.invalidTrialPostVideoOfferPeople,
  1,
  'invalid trial post-video row stays visible as a diagnostic person',
)

for (const required of [
  'result_video_value_sampled',
  'plan_fit_checkout_cta_viewed',
  'history_first_video_offer_viewed',
  'video_generation_completed',
  'pricing_view',
  'checkout_started',
  'payment_success',
]) {
  ok(RESULT_VIDEO_DECISION_EVENT_NAMES.includes(required), `measurement includes ${required}`)
}

const caller = fs.readFileSync('scripts/measure-result-video-decision-funnel.mjs', 'utf8')
ok(caller.includes("from './result-video-decision-report.mjs'"), 'production measurement executes the tested report')
ok(caller.includes("from './measurement-helpers.mjs'"), 'production measurement reuses canonical pagination')
equal((caller.match(/\.range\(from, to\)/g) ?? []).length, 3, 'events, profiles, and videos are explicitly paginated')
ok(caller.includes(".gte('created_at', RESULT_VIDEO_DECISION_INSTRUMENTED_AT)"), 'events use a fixed instrument boundary')
ok(caller.includes(".from('videos')"), 'first-delivery denominator comes from delivered videos')
ok(caller.includes(".eq('status', 'completed')"), 'only completed videos enter the delivery denominator')
ok(!caller.includes(".from('videos')\n      .select('id,user_id,status,created_at')\n      .gte("), 'video history is not truncated by a moving cutoff')
ok(!caller.includes('--days'), 'moving seven-day window cannot erase the fixed boundary')
ok(!caller.includes('count(distinct coalesce'), 'caller cannot merge people and sessions')

console.log(`result video decision report: ${checks}/${checks} checks passed`)
