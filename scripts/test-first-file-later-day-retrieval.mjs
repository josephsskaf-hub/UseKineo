#!/usr/bin/env node
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  FIRST_FILE_RETRIEVAL_REPORT_VERSION,
  buildFirstFileLaterDayRetrievalReport,
} from './first-file-later-day-retrieval-report.mjs'
import { mergeRowsById, unwrapFirstFileRetrievalResult } from './measure-first-file-later-day-retrieval.mjs'

let checks = 0
function equal(actual, expected, label) {
  assert.deepEqual(actual, expected, label)
  checks += 1
}

const generatedAt = '2026-09-02T18:00:00.000Z'
const windowStart = '2026-08-03T18:00:00.000Z'

function profile(user, email = `${user}@example.com`) {
  return { id: user, email, created_at: '2026-08-19T00:00:00Z' }
}
function video(user, id = `v-${user}`, at = '2026-08-20T10:00:00Z') {
  return { id, user_id: user, status: 'completed', video_url: `https://cdn/${id}.mp4`, created_at: at }
}
function blob(id, user, at, surface = 'done_screen', overrides = {}) {
  return {
    id, name: 'video_downloaded', user_id: user, session_id: `browser-${user}`, created_at: at,
    metadata: { video_id: `v-${user}`, method: 'blob', bytes: 1000, surface, ...overrides },
  }
}
function checkout(id, user, sid, at) {
  return { id, name: 'checkout_started', user_id: user, session_id: `browser-${user}`, created_at: at,
    metadata: { stripe_session_id: sid, tier: 'starter', billing: 'monthly' } }
}
function payment(id, user, sid, at, amount = 490) {
  return { id, name: 'payment_success', user_id: user, session_id: `browser-${user}`, created_at: at,
    metadata: { stripe_session_id: sid, checkout_mode: 'subscription', amount_total: amount, currency: 'usd' } }
}

const profiles = []
const videos = []
const events = []
for (let index = 1; index <= 20; index += 1) {
  const user = `u${index}`
  profiles.push(profile(user))
  videos.push(video(user))
  events.push(blob(`first-${user}`, user, '2026-08-20T10:05:00Z'))
  if (index <= 5) events.push(blob(`retrieval-${user}`, user, '2026-08-21T10:05:00Z', index % 2 ? 'history' : 'my_videos'))
  if (index <= 6) events.push(checkout(`checkout-${user}`, user, `cs-${user}`, '2026-08-22T10:00:00Z'))
}
events.push(payment('paid-u1', 'u1', 'cs-u1', '2026-08-22T10:01:00Z', 490))
events.push(payment('paid-u6', 'u6', 'cs-u6', '2026-08-22T10:02:00Z', 990))

const report = buildFirstFileLaterDayRetrievalReport({ generatedAt, windowStart, events, profiles, videos })
equal(report.schemaVersion, FIRST_FILE_RETRIEVAL_REPORT_VERSION, 'schema version')
equal(report.cohort.matureAcquisitionPeople, 20, 'twenty mature acquisition people')
equal(report.cohort.maturePeopleWithExactFirstBlob, 20, 'twenty exact first blobs')
equal(report.cohort.analyzablePeopleWithExactFirstBlob, 20, 'all twenty blobs have analyzable chronology')
equal(report.cohort.confirmedLaterDayRetrieval.people, 5, 'five exact later-day retrieval people')
equal(report.cohort.noConfirmedLaterDayRetrieval.people, 15, 'fifteen clean comparison people')
equal(report.cohort.confirmedLaterDayRetrieval.exactRecurringCheckoutPeople, 5, 'five retrieval people reached exact checkout')
equal(report.cohort.noConfirmedLaterDayRetrieval.exactRecurringCheckoutPeople, 1, 'one comparison person reached exact checkout')
equal(report.cohort.confirmedLaterDayRetrieval.exactPaidPeople, 1, 'one retrieval person paid')
equal(report.cohort.noConfirmedLaterDayRetrieval.exactPaidPeople, 1, 'one comparison person paid')
equal(report.cohort.confirmedLaterDayRetrieval.exactRevenueMinorByCurrency, { usd: 490 }, 'retrieval revenue exact')
equal(report.cohort.noConfirmedLaterDayRetrieval.exactRevenueMinorByCurrency, { usd: 990 }, 'comparison revenue exact')
equal(report.cohort.totalExactRecurringCheckoutPeople, 6, 'people not event rows')
equal(report.cohort.totalExactRecurringStripeSessions, 6, 'exact Stripe Sessions are separate from people')
equal(report.cohort.analyzableExactRecurringCheckoutPeople, 6, 'all six checkouts are analyzable')
equal(report.gate.completeSample, true, 'all sample floors met')
equal(report.gate.state, 'ready_for_reconciliation', 'payment opens reconciliation only')
equal(report.gate.neverAuthorizesProductChange, true, 'report never authorizes runtime')
equal(report.quality.anotherUtcDayIsNotClaimedAsAnotherVisit, true, 'day is not mislabeled as visit')
equal(report.note.includes('later paid Session never cleans it'), true, 'first Session invariant declared')

const firstSessionWins = buildFirstFileLaterDayRetrievalReport({
  generatedAt,
  windowStart,
  profiles: [profile('u1')],
  videos: [video('u1')],
  events: [
    blob('fs-first', 'u1', '2026-08-20T10:05:00Z'),
    blob('fs-retrieval', 'u1', '2026-08-21T10:05:00Z', 'history'),
    checkout('fs-c1', 'u1', 'fs-unpaid', '2026-08-22T10:00:00Z'),
    checkout('fs-c2', 'u1', 'fs-paid', '2026-08-23T10:00:00Z'),
    payment('fs-p2', 'u1', 'fs-paid', '2026-08-23T10:01:00Z'),
  ],
})
equal(firstSessionWins.cohort.confirmedLaterDayRetrieval.exactRecurringCheckoutPeople, 1, 'first recurring Session remains checkout anchor')
equal(firstSessionWins.cohort.confirmedLaterDayRetrieval.exactPaidPeople, 0, 'later paid Session cannot clean first unpaid Session')
equal(firstSessionWins.cohort.totalExactRecurringStripeSessions, 2, 'both exact Stripe Sessions remain counted')
equal(firstSessionWins.exclusionsAndDiagnostics.laterRecurringStripeSessions, 1, 'later recurring Session remains visible as a separate Session')

const invalidPaymentAnchor = buildFirstFileLaterDayRetrievalReport({
  generatedAt,
  windowStart,
  profiles: [profile('u1')],
  videos: [video('u1')],
  events: [
    blob('ip-first', 'u1', '2026-08-20T10:05:00Z'),
    checkout('ip-c', 'u1', 'ip-session', '2026-08-21T10:00:00Z'),
    payment('ip-p', 'u1', 'ip-session', '2026-08-21T10:01:00Z', 0),
  ],
})
equal(invalidPaymentAnchor.cohort.noConfirmedLaterDayRetrieval.exactRecurringCheckoutPeople, 1, 'invalid payment preserves exact checkout')
equal(invalidPaymentAnchor.cohort.noConfirmedLaterDayRetrieval.exactPaidPeople, 0, 'invalid payment is never revenue')
equal(invalidPaymentAnchor.exclusionsAndDiagnostics.invalidRecurringPaymentPeople, 1, 'invalid payment remains explicit')
equal(invalidPaymentAnchor.gate.state, 'blocked_data_quality', 'invalid payment blocks inference')
equal(invalidPaymentAnchor.quality.denominatorPeople, 1, 'unresolved denominator includes the mature person')
equal(invalidPaymentAnchor.quality.unresolvedPeopleRatio, 1, 'unresolved ratio cannot exceed its denominator by omission')

const laterInvalidPayment = buildFirstFileLaterDayRetrievalReport({
  generatedAt,
  windowStart,
  profiles: [profile('u1')],
  videos: [video('u1')],
  events: [
    blob('lip-first', 'u1', '2026-08-20T10:05:00Z'),
    checkout('lip-c1', 'u1', 'lip-unpaid', '2026-08-21T10:00:00Z'),
    checkout('lip-c2', 'u1', 'lip-invalid', '2026-08-22T10:00:00Z'),
    payment('lip-p2', 'u1', 'lip-invalid', '2026-08-22T10:01:00Z', 0),
  ],
})
equal(laterInvalidPayment.cohort.noConfirmedLaterDayRetrieval.exactRecurringCheckoutPeople, 1, 'first unpaid Session remains the anchor')
equal(laterInvalidPayment.cohort.totalExactRecurringStripeSessions, 2, 'later invalid Session remains an exact Checkout Session')
equal(laterInvalidPayment.cohort.noConfirmedLaterDayRetrieval.exactPaidPeople, 0, 'later invalid Session never becomes revenue')
equal(laterInvalidPayment.exclusionsAndDiagnostics.invalidRecurringPaymentPeople, 1, 'later invalid payment is explicit')
equal(laterInvalidPayment.gate.state, 'blocked_data_quality', 'later invalid payment blocks inference')

const nullClockThroughStripeSession = buildFirstFileLaterDayRetrievalReport({
  generatedAt,
  windowStart,
  profiles: [profile('u1')],
  videos: [video('u1')],
  events: [
    blob('ns-first', 'u1', '2026-08-20T10:05:00Z'),
    checkout('ns-c', 'u1', 'ns-session', '2026-08-21T10:00:00Z'),
    { ...payment('ns-p', null, 'ns-session', '2026-08-21T10:01:00Z'), created_at: null },
  ],
})
equal(nullClockThroughStripeSession.exclusionsAndDiagnostics.undatableCohortEventPeople, 1, 'null clock links through exact Stripe Session')
equal(nullClockThroughStripeSession.gate.state, 'blocked_data_quality', 'session-linked null clock blocks inference')

const preexistingAnonymousPayment = buildFirstFileLaterDayRetrievalReport({
  generatedAt,
  windowStart,
  profiles: [profile('u1')],
  videos: [video('u1')],
  events: [
    checkout('pa-c', 'u1', 'pa-session', '2026-08-19T10:00:00Z'),
    payment('pa-p', null, 'pa-session', '2026-08-19T10:01:00Z'),
    blob('pa-first', 'u1', '2026-08-20T10:05:00Z'),
  ],
})
equal(preexistingAnonymousPayment.cohort.matureAcquisitionPeople, 0, 'anonymous payment linked to prior user Session is not acquisition')
equal(preexistingAnonymousPayment.exclusionsAndDiagnostics.preexistingSubscriptionUnknownPeople, 1, 'prior session-linked payment stays explicit')

const chronology = buildFirstFileLaterDayRetrievalReport({
  generatedAt,
  windowStart,
  profiles: [profile('u1'), profile('u2'), profile('u3')],
  videos: [video('u1'), video('u2'), video('u3')],
  events: [
    checkout('ch-c1', 'u1', 'ch-1', '2026-08-21T09:00:00Z'),
    blob('ch-b1', 'u1', '2026-08-21T10:00:00Z'),
    checkout('ch-c2', 'u2', 'ch-2', '2026-08-21T10:00:00Z'),
    blob('ch-b2', 'u2', '2026-08-21T10:00:00Z'),
    checkout('ch-c3a', 'u3', 'ch-3a', '2026-08-21T09:00:00Z'),
    blob('ch-b3', 'u3', '2026-08-21T10:00:00Z'),
    checkout('ch-c3b', 'u3', 'ch-3b', '2026-08-21T11:00:00Z'),
  ],
})
equal(chronology.cohort.maturePeopleWithExactFirstBlob, 3, 'chronology exclusions do not erase exact blobs')
equal(chronology.cohort.analyzablePeopleWithExactFirstBlob, 0, 'pre/equal checkout chronologies are not hypothesis observations')
equal(chronology.cohort.totalExactRecurringCheckoutPeople, 3, 'chronology exclusions do not erase checkouts')
equal(chronology.exclusionsAndDiagnostics.firstBlobAfterFirstCheckoutPeople, 2, 'before-blob checkouts explicit')
equal(chronology.exclusionsAndDiagnostics.firstBlobEqualFirstCheckoutPeople, 1, 'equal clock explicit')
equal(chronology.exclusionsAndDiagnostics.mixedCheckoutBlobChronologyPeople, 1, 'mixed chronology explicit')

const retrievalAfterCheckout = buildFirstFileLaterDayRetrievalReport({
  generatedAt, windowStart, profiles: [profile('u1')], videos: [video('u1')],
  events: [blob('rac-first', 'u1', '2026-08-20T10:05:00Z'), checkout('rac-c', 'u1', 'rac', '2026-08-21T09:00:00Z'), blob('rac-late', 'u1', '2026-08-21T10:05:00Z', 'history')],
})
equal(retrievalAfterCheckout.cohort.confirmedLaterDayRetrieval.people, 0, 'retrieval after first checkout is not credited')
equal(retrievalAfterCheckout.cohort.noConfirmedLaterDayRetrieval.people, 1, 'post-checkout retrieval stays in comparison')

const sameDay = buildFirstFileLaterDayRetrievalReport({
  generatedAt, windowStart, profiles: [profile('u1')], videos: [video('u1')],
  events: [blob('sd-first', 'u1', '2026-08-20T01:00:00Z'), blob('sd-again', 'u1', '2026-08-20T23:00:00Z', 'history')],
})
equal(sameDay.cohort.confirmedLaterDayRetrieval.people, 0, 'same UTC date is not later-day retrieval')

const invalidLiteral = buildFirstFileLaterDayRetrievalReport({
  generatedAt, windowStart, profiles: [profile('u1')], videos: [video('u1')],
  events: [
    blob('il-first', 'u1', '2026-08-20T10:05:00Z'),
    blob('il-space', 'u1', '2026-08-21T10:05:00Z', 'history', { method: 'blob ' }),
  ],
})
equal(invalidLiteral.cohort.confirmedLaterDayRetrieval.people, 0, 'trimmed method is not exact')
equal(invalidLiteral.exclusionsAndDiagnostics.unresolvedLaterDayRetrievalPeople, 1, 'invalid same-file later row is unresolved')

const stringBytes = buildFirstFileLaterDayRetrievalReport({
  generatedAt, windowStart, profiles: [profile('u1')], videos: [video('u1')],
  events: [blob('sb-first', 'u1', '2026-08-20T10:05:00Z', 'done_screen', { bytes: '1000' })],
})
equal(stringBytes.cohort.maturePeopleWithExactFirstBlob, 0, 'string bytes are not coerced')

const preexisting = buildFirstFileLaterDayRetrievalReport({
  generatedAt, windowStart, profiles: [profile('u1')], videos: [video('u1')],
  events: [checkout('pre-c', 'u1', 'pre', '2026-08-19T10:00:00Z'), payment('pre-p', 'u1', 'pre', '2026-08-19T10:01:00Z'), blob('pre-d', 'u1', '2026-08-20T10:05:00Z')],
})
equal(preexisting.cohort.matureAcquisitionPeople, 0, 'preexisting exact subscriber excluded')
equal(preexisting.exclusionsAndDiagnostics.preexistingExactSubscriberPeople, 1, 'preexisting subscriber explicit')

const immature = buildFirstFileLaterDayRetrievalReport({
  generatedAt, windowStart, profiles: [profile('u1')], videos: [video('u1', 'v-u1', '2026-08-30T10:00:00Z')], events: [] },
)
equal(immature.cohort.matureAcquisitionPeople, 0, 'first video without seven days is excluded')

const outOfWindow = buildFirstFileLaterDayRetrievalReport({
  generatedAt, windowStart, profiles: [profile('u1')], videos: [video('u1', 'v-u1', '2026-08-04T10:00:00Z')], events: [] },
)
equal(outOfWindow.cohort.matureAcquisitionPeople, 0, 'first video before contract boundary excluded')

const ownerless = buildFirstFileLaterDayRetrievalReport({
  generatedAt, windowStart, profiles: [], videos: [{ ...video('u1'), user_id: null }], events: [] },
)
equal(ownerless.exclusionsAndDiagnostics.eligibleOwnerlessCompletedRows, 1, 'eligible ownerless video explicit')
equal(ownerless.gate.state, 'blocked_data_quality', 'ownerless eligible row blocks quality')

const nullClock = buildFirstFileLaterDayRetrievalReport({
  generatedAt, windowStart, profiles: [profile('u1')], videos: [video('u1')],
  events: [blob('nc-first', 'u1', '2026-08-20T10:05:00Z'), { ...checkout('nc-c', 'u1', 'nc', '2026-08-21T10:00:00Z'), created_at: null }],
})
equal(nullClock.exclusionsAndDiagnostics.undatableCohortEventPeople, 1, 'null event clock explicit')
equal(nullClock.gate.state, 'blocked_data_quality', 'null cohort clock blocks quality')

const tiedSessions = buildFirstFileLaterDayRetrievalReport({
  generatedAt, windowStart, profiles: [profile('u1')], videos: [video('u1')],
  events: [blob('tie-first', 'u1', '2026-08-20T10:05:00Z'), checkout('tie-a', 'u1', 'tie-a', '2026-08-21T10:00:00Z'), checkout('tie-b', 'u1', 'tie-b', '2026-08-21T10:00:00Z')],
})
equal(tiedSessions.exclusionsAndDiagnostics.ambiguousFirstRecurringSessionPeople, 1, 'same-time first Sessions ambiguous')
equal(tiedSessions.cohort.totalExactRecurringStripeSessions, 2, 'tied exact Sessions remain visible in the total')
equal(tiedSessions.exclusionsAndDiagnostics.laterRecurringStripeSessions, 0, 'same-time Sessions are not mislabeled later')
equal(tiedSessions.gate.state, 'blocked_data_quality', 'ambiguous anchor blocks quality')

const conflictingSession = buildFirstFileLaterDayRetrievalReport({
  generatedAt, windowStart, profiles: [profile('u1')], videos: [video('u1')],
  events: [
    blob('conf-first', 'u1', '2026-08-20T10:05:00Z'),
    checkout('conf-a', 'u1', 'conflict-session', '2026-08-21T10:00:00Z'),
    { ...checkout('conf-b', 'u1', 'conflict-session', '2026-08-21T10:01:00Z'), metadata: {
      stripe_session_id: 'conflict-session', tier: 'creator', billing: 'monthly',
    } },
  ],
})
equal(conflictingSession.cohort.totalExactRecurringStripeSessions, 0, 'conflicting Session is never counted as exact')
equal(conflictingSession.exclusionsAndDiagnostics.cohortLedgerConflictStripeSessions, 1, 'conflicting Session remains a quality diagnostic')
equal(conflictingSession.gate.state, 'blocked_data_quality', 'conflicting Session blocks inference')

const conflictingIdentity = buildFirstFileLaterDayRetrievalReport({
  generatedAt, windowStart, profiles: [profile('u1'), profile('u1', 'other@example.com')], videos: [video('u1')], events: [] },
)
equal(conflictingIdentity.exclusionsAndDiagnostics.unresolvedIdentityVideoOwnersEligibleWindow, 1, 'conflicting profile identity unresolved')

equal(mergeRowsById([{ id: 'a', name: 'x' }], [{ id: 'a', name: 'x' }, { id: 'b', name: 'y' }]).length, 2, 'runner deduplicates overlap by id')
assert.throws(() => mergeRowsById([{ name: 'x' }]), /must have an id/)
checks += 1
equal(unwrapFirstFileRetrievalResult({ data: [] }, 'ok'), [], 'runner unwraps arrays')
assert.throws(() => unwrapFirstFileRetrievalResult({ error: { code: 'x', message: 'boom' } }, 'bad'), /bad: x boom/)
checks += 1
assert.throws(() => buildFirstFileLaterDayRetrievalReport({ generatedAt: 'bad', windowStart, events: [], profiles: [], videos: [] }))
checks += 1

const here = dirname(fileURLToPath(import.meta.url))
const runnerSource = readFileSync(join(here, 'measure-first-file-later-day-retrieval.mjs'), 'utf8')
equal((runnerSource.match(/\.is\('created_at', null\)/g) ?? []).length, 3, 'runner separately paginates null profile, video and event clocks')
equal(runnerSource.includes("paged('profiles with null timestamp'"), true, 'runner includes nullable profile timestamps fail-closed')

process.stdout.write(`first-file-later-day-retrieval: ${checks}/${checks} checks passed\n`)
