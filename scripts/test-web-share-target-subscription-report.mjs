#!/usr/bin/env node
import assert from 'node:assert/strict'
import { buildWebShareTargetSubscriptionReport } from './web-share-target-subscription-report.mjs'

let checks = 0
const equal = (actual, expected, message) => { assert.deepEqual(actual, expected, message); checks += 1 }
const NOW = '2026-09-20T12:00:00.000Z'
const START = '2026-08-21T12:00:00.000Z'
const stamp = (day, hour = 12, minute = 0) => `2026-09-${String(day).padStart(2, '0')}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00.000Z`
const closedMetadata = (name, extra = {}) => name === 'web_share_target_arrived'
  ? { handoff_status: 'received', input_kind: 'title', surface: 'free_script_generator', topic_prefilled: true, version: 'web_share_target_v1', ...extra }
  : name === 'web_share_target_script_generated'
    ? { input_kind: 'title', surface: 'free_script_generator', version: 'web_share_target_v1', ...extra }
    : { placement: 'result', surface: 'free_script_generator', version: 'web_share_target_v1', ...extra }
const event = (name, created_at, user_id = null, session_id = 'browser-1', metadata = null, path = '/free-script-generator') => ({
  id: `${name}-${created_at}-${user_id ?? 'anon'}-${session_id ?? 'none'}`,
  name, user_id, session_id, path, created_at,
  metadata: metadata ?? (name.startsWith('web_share_target_') ? closedMetadata(name) : {}),
})
const profile = (extra = {}) => ({
  id: 'u1', email: 'creator@example.com', created_at: stamp(1, 12, 20), plan: 'basic', is_pro: true,
  stripe_subscription_id: 'sub_one', ...extra,
})
const build = (extra = {}) => buildWebShareTargetSubscriptionReport({
  generatedAt: NOW, windowStart: START, events: [], profiles: [], videos: [], ...extra,
})
const paidJourney = (extraEvents = [], profileRow = profile()) => ({
  events: [
    event('web_share_target_arrived', stamp(1, 12, 0)),
    event('web_share_target_script_generated', stamp(1, 12, 5)),
    event('web_share_target_signup_clicked', stamp(1, 12, 10)),
    event('signup_completed', stamp(1, 12, 30), 'u1'),
    event('checkout_started', stamp(3), 'u1', 'pay-browser', { tier: 'basic', billing: 'monthly', stripe_session_id: 'cs_one' }, '/pricing'),
    event('payment_success', stamp(3, 12, 5), 'u1', 'pay-browser', { checkout_mode: 'subscription', stripe_session_id: 'cs_one', amount_total: 1500, currency: 'usd' }, '/checkout/success'),
    ...extraEvents,
  ],
  profiles: [profileRow],
  videos: [{ id: 'v1', user_id: 'u1', status: 'completed', created_at: stamp(2) }],
})

let report = build(paidJourney())
equal(report.funnel.arrivalSessions, 1, 'arrival is one browser session')
equal(report.funnel.scriptGeneratedSessions, 1, 'later value is one browser session')
equal(report.funnel.signupClickedSessions, 1, 'later signup intent is one browser session')
equal(report.funnel.externalAttributedPeople, 1, 'same-session owner becomes one external person')
equal(report.funnel.newAcquisitionPeople, 1, 'profile created after arrival is new acquisition')
equal(report.funnel.returningActivationPeople, 0, 'new acquisition is not returning activation')
equal(report.funnel.completedVideoPeople, 1, 'new completed video is linked')
equal(report.funnel.recurringCheckoutPeople, 1, 'later recurring Checkout is linked')
equal(report.funnel.exactActiveSubscriberPeople, 1, 'active profile plus canonical payment is one subscriber')
equal(report.funnel.exactPaidStripeSessions, 1, 'paid Stripe Session is counted once')
equal(report.funnel.exactRevenueMinorByCurrency, { usd: 1500 }, 'revenue preserves currency and minor units')
equal(report.segments.new_acquisition.activeSubscriberPeople, 1, 'new-acquisition subscriber is split terminally')
equal(report.segments.new_acquisition.revenueMinorByCurrency, { usd: 1500 }, 'new-acquisition revenue is split terminally')
equal(report.segments.returning_activation.revenueMinorByCurrency, {}, 'returning revenue is not conflated with acquisition')
equal(report.gate.state, 'channel_revenue_observed', 'canonical revenue wins the gate')

report = build(paidJourney([], profile({ created_at: stamp(1, 10) })))
equal(report.funnel.newAcquisitionPeople, 0, 'older profile is not misreported as acquisition')
equal(report.funnel.returningActivationPeople, 1, 'older profile is returning activation')

report = build({ events: [event('web_share_target_arrived', stamp(1)), event('web_share_target_arrived', stamp(1), null, 'browser-1')] })
equal(report.funnel.arrivalSessions, 1, 'duplicate rows never become extra sessions')
equal(report.funnel.externalAttributedPeople, 0, 'anonymous browser session never becomes a person')
equal(report.quality.qualityMet, true, 'an anonymous session is expected, not bad data')

report = build({
  events: [event('web_share_target_arrived', stamp(1)), event('page_view', stamp(1, 13), 'u1')],
  profiles: [profile({ email: 'josephsskaf@gmail.com' })],
})
equal(report.funnel.externalAttributedPeople, 0, 'internal account is excluded')
equal(report.quality.internalAttributedPeople, 1, 'internal exclusion is visible')

report = build({ events: [event('web_share_target_arrived', stamp(1), null, 'browser-1', closedMetadata('web_share_target_arrived', { gclid: 'forged' }))] })
equal(report.funnel.arrivalSessions, 0, 'extra free-form metadata rejects the event contract')
equal(report.quality.rejectedContractRows, 1, 'rejected closed-contract row is visible')
equal(report.gate.state, 'blocked_quality', 'rejected closed-contract row blocks a decision')

report = build({ events: [
  event('web_share_target_arrived', stamp(1)),
  event('page_view', stamp(1, 13), 'u1'),
  event('page_view', stamp(1, 14), 'u2'),
], profiles: [profile(), profile({ id: 'u2', email: 'other@example.com' })] })
equal(report.funnel.externalAttributedPeople, 0, 'multi-owner browser session is never attributed')
equal(report.quality.conflictingOwnerSessions, 1, 'owner collision blocks quality')
equal(report.gate.state, 'blocked_quality', 'owner collision blocks decision')

report = build({ events: [event('web_share_target_arrived', stamp(1), null, null)] })
equal(report.quality.customRowsMissingSession, 1, 'missing custom-event session is visible')
equal(report.gate.state, 'blocked_quality', 'missing custom-event session blocks decision')
report = build({ events: [event('web_share_target_arrived', null)] })
equal(report.quality.customRowsMissingClock, 1, 'missing custom-event clock is visible')

const collision = event('payment_success', stamp(3, 12, 5), 'u2', 'other-browser', {
  checkout_mode: 'subscription', stripe_session_id: 'cs_one', amount_total: 1500, currency: 'usd',
}, '/checkout/success')
report = build({ ...paidJourney([collision]), profiles: [profile(), profile({ id: 'u2', email: 'other@example.com' })] })
equal(report.funnel.exactActiveSubscriberPeople, 0, 'cross-owner Stripe Session never becomes revenue')
equal(report.quality.ledgerConflictStripeSessions, 1, 'cross-owner Stripe Session collision is visible')
equal(report.gate.state, 'blocked_quality', 'financial owner collision blocks decision')

const nullClockOtherOwner = event('payment_success', null, 'u2', 'other-browser', {
  checkout_mode: 'subscription', stripe_session_id: 'cs_one', amount_total: 1500, currency: 'usd',
}, '/checkout/success')
report = build({ ...paidJourney([nullClockOtherOwner]), profiles: [profile(), profile({ id: 'u2', email: 'other@example.com' })] })
equal(report.quality.undatableFinancialRows, 1, 'null-clock row from another Stripe Session owner is visible')
equal(report.gate.state, 'blocked_quality', 'null-clock row from another owner blocks decision before ledger loss')

report = build({
  events: [event('web_share_target_arrived', stamp(1, 12)), event('page_view', stamp(1, 12, 30), 'u1')],
  profiles: [profile({ created_at: stamp(1, 13) })],
})
equal(report.funnel.externalAttributedPeople, 0, 'profile created after its owner witness is impossible')
equal(report.quality.impossibleIdentityTimelinePeople, 1, 'impossible identity chronology is visible')
equal(report.gate.state, 'blocked_quality', 'impossible identity chronology blocks decision')

report = build({ ...paidJourney(), videos: [{ id: 'v0', user_id: 'u1', status: 'completed', created_at: null }] })
equal(report.quality.undatableVideoRows, 1, 'null-clock relevant video is visible')
equal(report.gate.state, 'blocked_quality', 'null-clock relevant video blocks decision')

const unlinked = paidJourney().events.filter((row) => row.name !== 'checkout_started')
report = build({ events: unlinked, profiles: [profile()], videos: [{ id: 'v1', user_id: 'u1', status: 'completed', created_at: stamp(2) }] })
equal(report.quality.unlinkedSubscriptionPaymentPeople, 1, 'payment without cohort start is visible')
equal(report.gate.state, 'blocked_quality', 'unlinked cohort payment blocks decision')

const malformedStart = event('checkout_started', stamp(3), 'u1', 'pay-browser', { tier: 'basic' }, '/pricing')
const baseWithoutFinancial = paidJourney().events.filter((row) => !['checkout_started', 'payment_success'].includes(row.name))
report = build({ events: [...baseWithoutFinancial, malformedStart], profiles: [profile()], videos: [{ id: 'v1', user_id: 'u1', status: 'completed', created_at: stamp(2) }] })
equal(report.quality.malformedFinancialRows, 1, 'malformed recurring start is visible')
equal(report.gate.state, 'blocked_quality', 'malformed recurring start blocks decision')

report = build({
  events: [event('web_share_target_script_generated', stamp(1, 11)), event('web_share_target_arrived', stamp(1, 12))],
})
equal(report.funnel.scriptGeneratedSessions, 0, 'script before arrival fails chronology')

report = build({ ...paidJourney(), videos: [{ id: 'v0', user_id: 'u1', status: 'completed', created_at: stamp(1, 11) }] })
equal(report.funnel.completedVideoPeople, 0, 'historic video before arrival is not activation')
equal(report.funnel.recurringCheckoutPeople, 0, 'checkout cannot skip a new activation')

report = build({ events: Array.from({ length: 5 }, (_, index) => event('web_share_target_arrived', stamp(1), null, `browser-${index}`)) })
equal(report.gate.state, 'stop_no_value', 'five mature arrivals without script stop the channel')

const valueOnly = []
for (let index = 0; index < 5; index += 1) {
  valueOnly.push(event('web_share_target_arrived', stamp(1), null, `browser-${index}`))
  valueOnly.push(event('web_share_target_script_generated', stamp(1, 13), null, `browser-${index}`))
}
report = build({ events: valueOnly })
equal(report.gate.state, 'stop_no_identified_user', 'five mature value sessions without an identified user stop the channel')

assert.throws(() => build({ generatedAt: 'bad' }), /valid ordered/); checks += 1
assert.throws(() => build({ events: null }), /must be arrays/); checks += 1

console.log(`web-share-target-subscription-report: ${checks}/${checks} checks passed`)
