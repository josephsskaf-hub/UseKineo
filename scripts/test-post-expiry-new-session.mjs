#!/usr/bin/env node
import assert from 'node:assert/strict'
import {
  POST_EXPIRY_NEW_SESSION_MIN_PEOPLE,
  buildPostExpiryNewSessionReport,
} from './post-expiry-new-session-report.mjs'
import { collectPostExpiryNewSession } from './measure-post-expiry-new-session.mjs'

let checks = 0
function equal(actual, expected, label) {
  assert.deepEqual(actual, expected, label)
  checks += 1
}
function check(value, label) {
  assert.ok(value, label)
  checks += 1
}

const generatedAt = '2026-08-20T00:00:00.000Z'
const windowStart = '2026-08-01T00:00:00.000Z'
const at = (day, hour = 0) => `2026-08-${String(day).padStart(2, '0')}T${String(hour).padStart(2, '0')}:00:00.000Z`
const profile = (id, email = `${id}@example.com`) => ({ id, email, created_at: at(5) })
const video = (user, day = 10) => ({ id: `v_${user}`, user_id: user, status: 'completed', video_url: 'https://example.test/v.mp4', created_at: at(day) })
const event = (id, name, user, day, hour, metadata = {}, session = `browser_${user}`) => ({
  id, name, user_id: user, session_id: session, created_at: at(day, hour), metadata,
})
const blob = (user, day = 10, hour = 1, extra = {}) => event(`b_${user}`, 'video_downloaded', user, day, hour, {
  method: 'blob', video_id: `v_${user}`, surface: 'done_screen', bytes: 1000, ...extra,
})
const start = (id, user, day, hour, stripe, extra = {}) => event(id, 'checkout_started', user, day, hour, {
  stripe_session_id: stripe, tier: 'starter', billing: 'monthly', checkout_session_window_hours: 24, ...extra,
})
const expired = (id, user, day, hour, stripe, status = 'unpaid') => event(id, 'checkout_session_expired', user, day, hour, {
  stripe_session_id: stripe, checkout_mode: 'subscription', tier: 'starter', billing: 'monthly', payment_status: status,
})
const paid = (id, user, day, hour, stripe, amount = 2900, currency = 'usd') => event(id, 'payment_success', user, day, hour, {
  stripe_session_id: stripe, checkout_mode: 'subscription', amount_total: amount, currency,
})

function report({ profiles = [profile('u1')], videos = [video('u1')], events = [] } = {}) {
  return buildPostExpiryNewSessionReport({ generatedAt, windowStart, profiles, videos, events })
}

const paidLater = report({ events: [
  blob('u1'),
  start('s1', 'u1', 10, 2, 'cs_first'),
  expired('x1', 'u1', 11, 2, 'cs_first'),
  start('s2', 'u1', 12, 2, 'cs_later'),
  paid('p2', 'u1', 12, 3, 'cs_later'),
] })
equal(paidLater.funnel.matureExternalFirstVideoPeople, 1, 'counts one mature external first-video person')
equal(paidLater.funnel.exactFirstFileBlobPeople, 1, 'requires the exact first-file blob')
equal(paidLater.funnel.firstExactExpiredUnpaidPeople, 1, 'preserves the exact first expired outcome')
equal(paidLater.funnel.firstExactExpiredUnpaidStripeSessions, 1, 'reports the first-expiry Stripe Session unit explicitly')
equal(paidLater.funnel.distinctLaterSessionPeople, 1, 'counts a distinct later Stripe Session once')
equal(paidLater.funnel.firstDistinctLaterStripeSessions, 1, 'reports the first distinct later Stripe Session unit explicitly')
equal(paidLater.funnel.resolvedLaterOutcomePeople, 1, 'reports terminal later people explicitly')
equal(paidLater.funnel.resolvedLaterOutcomeStripeSessions, 1, 'reports terminal later Stripe Sessions explicitly')
equal(paidLater.funnel.laterPaidPeople, 1, 'counts the exact later payer once')
equal(paidLater.funnel.laterPaidStripeSessions, 1, 'reports paid later Stripe Sessions explicitly')
equal(paidLater.funnel.laterRevenueMinorByCurrency, { usd: 2900 }, 'attributes exact later revenue without currency mixing')
equal(paidLater.transitions[0].firstOutcome, 'expired_unpaid', 'later payment never cleans the first expiration')
check(paidLater.transitions[0].firstSessionReference !== paidLater.transitions[0].laterSessionReference, 'exports distinct opaque Session references')
check(!JSON.stringify(paidLater).includes('u1') && !JSON.stringify(paidLater).includes('cs_first'), 'report emits no raw actor or Stripe identifier')
equal(paidLater.gate.state, 'collecting', 'one transition stays below the declared sample gate')
equal(paidLater.gate.minimumResolvedLaterSessionPeople, POST_EXPIRY_NEW_SESSION_MIN_PEOPLE, 'gate reports its exact resolved denominator')
equal(paidLater.gate.neverAuthorizesProductChange, true, 'diagnostic cannot authorize a product change')

const laterExpired = report({ events: [
  blob('u1'), start('s1', 'u1', 10, 2, 'cs_first'), expired('x1', 'u1', 11, 2, 'cs_first'),
  start('s2', 'u1', 12, 2, 'cs_later'), expired('x2', 'u1', 13, 2, 'cs_later'),
] })
equal(laterExpired.funnel.laterOutcomeByStatus, { expired_unpaid: 1 }, 'classifies a second exact expiration separately')
equal(laterExpired.funnel.laterPaidPeople, 0, 'does not turn a later expiration into a payer')
equal(laterExpired.funnel.laterRevenueMinorByCurrency, {}, 'expired Session contributes zero revenue')

const sameSession = report({ events: [
  blob('u1'), start('s1', 'u1', 10, 2, 'cs_same'), expired('x1', 'u1', 11, 2, 'cs_same'),
  start('s1b', 'u1', 12, 2, 'cs_same'),
] })
equal(sameSession.funnel.distinctLaterSessionPeople, 0, 'reopening the same Stripe Session is never a new Session')

const beforeExpiry = report({ events: [
  blob('u1'), start('s1', 'u1', 10, 2, 'cs_first'),
  start('s2', 'u1', 10, 3, 'cs_later'), paid('p2', 'u1', 10, 4, 'cs_later'),
  expired('x1', 'u1', 11, 2, 'cs_first'),
] })
equal(beforeExpiry.funnel.distinctLaterSessionPeople, 0, 'new Session before anchor expiration is not post-expiry recovery')
equal(beforeExpiry.exclusionsAndDiagnostics.preExpiryDistinctSessionPeople, 1, 'pre-expiry distinct Session remains visible diagnostically')

const firstPaid = report({ events: [
  blob('u1'), start('s1', 'u1', 10, 2, 'cs_first'), paid('p1', 'u1', 10, 3, 'cs_first'),
  start('s2', 'u1', 12, 2, 'cs_later'), paid('p2', 'u1', 12, 3, 'cs_later'),
] })
equal(firstPaid.funnel.firstExactExpiredUnpaidPeople, 0, 'first paid Session is outside the post-expiry cohort')
equal(firstPaid.funnel.distinctLaterSessionPeople, 0, 'later Session is ignored unless the first exactly expired')

const missingTerminal = report({ events: [blob('u1'), start('s1', 'u1', 10, 2, 'cs_first'), start('s2', 'u1', 12, 2, 'cs_later')] })
equal(missingTerminal.funnel.firstExactExpiredUnpaidPeople, 0, 'deadline passage without webhook is not called expiration')

const expiredOther = report({ events: [blob('u1'), start('s1', 'u1', 10, 2, 'cs_first'), expired('x1', 'u1', 11, 2, 'cs_first', 'no_payment_required')] })
equal(expiredOther.funnel.firstExactExpiredUnpaidPeople, 0, 'no-payment-required expiration is not abandonment')

const wrongBlob = report({ events: [
  blob('u1', 10, 1, { video_id: 'another_video' }),
  start('s1', 'u1', 10, 2, 'cs_first'), expired('x1', 'u1', 11, 2, 'cs_first'),
  start('s2', 'u1', 12, 2, 'cs_later'), paid('p2', 'u1', 12, 3, 'cs_later'),
] })
equal(wrongBlob.funnel.exactFirstFileBlobPeople, 0, 'foreign video blob cannot enter the cohort')
equal(wrongBlob.funnel.distinctLaterSessionPeople, 0, 'foreign video blob cannot create a transition')

const invalidBytes = report({ events: [blob('u1', 10, 1, { bytes: '1000' })] })
equal(invalidBytes.funnel.exactFirstFileBlobPeople, 0, 'numeric-looking string does not satisfy the client blob contract')

const internal = report({ profiles: [profile('u1', 'joseph+testcase@gmail.com')], events: [blob('u1')] })
equal(internal.funnel.matureExternalFirstVideoPeople, 0, 'canonical internal account patterns are excluded')

const preexisting = report({ events: [
  start('old_s', 'u1', 6, 1, 'cs_old'), paid('old_p', 'u1', 6, 2, 'cs_old'), blob('u1'),
  start('s1', 'u1', 10, 2, 'cs_first'), expired('x1', 'u1', 11, 2, 'cs_first'),
] })
equal(preexisting.funnel.matureExternalFirstVideoPeople, 0, 'preexisting exact subscriber is excluded')
equal(preexisting.exclusionsAndDiagnostics.preexistingExactSubscriberPeople, 1, 'preexisting exact subscriber remains visible diagnostically')

const tiedFirst = report({ events: [
  blob('u1'), start('s1', 'u1', 10, 2, 'cs_a'), expired('x1', 'u1', 11, 2, 'cs_a'),
  start('s2', 'u1', 10, 2, 'cs_b'), expired('x2', 'u1', 11, 2, 'cs_b'),
] })
equal(tiedFirst.exclusionsAndDiagnostics.ambiguousFirstSessionPeople, 1, 'equal first timestamps fail closed')
equal(tiedFirst.funnel.firstExactExpiredUnpaidPeople, 0, 'tied first Sessions cannot become an anchor')
equal(tiedFirst.gate.state, 'blocked_data_quality', 'ambiguous first Session blocks the gate')

const paidAndExpired = report({ events: [
  blob('u1'), start('s1', 'u1', 10, 2, 'cs_first'), expired('x1', 'u1', 11, 2, 'cs_first'), paid('p1', 'u1', 11, 3, 'cs_first'),
] })
equal(paidAndExpired.funnel.firstExactExpiredUnpaidPeople, 0, 'same Session paid-and-expired conflict is never abandonment')
equal(paidAndExpired.gate.state, 'blocked_data_quality', 'ledger conflict blocks the gate')

const invalidLaterPayment = report({ events: [
  blob('u1'), start('s1', 'u1', 10, 2, 'cs_first'), expired('x1', 'u1', 11, 2, 'cs_first'),
  start('s2', 'u1', 12, 2, 'cs_later'), paid('p2', 'u1', 12, 3, 'cs_later', 0),
] })
equal(invalidLaterPayment.funnel.distinctLaterSessionPeople, 1, 'invalid later payment remains in the Session denominator')
equal(invalidLaterPayment.funnel.laterPaidPeople, 0, 'invalid later payment never becomes revenue')
equal(invalidLaterPayment.funnel.laterOutcomeByStatus, { conflict: 1 }, 'invalid later payment is explicitly unresolved')
equal(invalidLaterPayment.gate.state, 'blocked_data_quality', 'invalid financial evidence blocks the gate')

const paidAfterObservation = report({ events: [
  blob('u1'), start('s1', 'u1', 10, 2, 'cs_first'), expired('x1', 'u1', 11, 2, 'cs_first'),
  start('s2', 'u1', 16, 2, 'cs_later'), paid('p2', 'u1', 18, 3, 'cs_later'),
] })
equal(paidAfterObservation.funnel.distinctLaterSessionPeople, 1, 'later Session opened inside the window remains in the denominator')
equal(paidAfterObservation.funnel.laterPaidPeople, 0, 'payment after the fixed observation window is never attributed')
equal(paidAfterObservation.funnel.laterOutcomeByStatus, { open_before_deadline: 1 }, 'outcome is frozen at the person cutoff')
equal(paidAfterObservation.funnel.laterRevenueMinorByCurrency, {}, 'post-window payment contributes zero cohort revenue')

const validThenConflictingAfterCutoff = report({ events: [
  blob('u1'), start('s1', 'u1', 10, 2, 'cs_first'), expired('x1', 'u1', 11, 2, 'cs_first'),
  start('s2', 'u1', 12, 2, 'cs_later'), paid('p2', 'u1', 12, 3, 'cs_later', 2900),
  paid('p3', 'u1', 18, 3, 'cs_later', 4900),
] })
equal(validThenConflictingAfterCutoff.funnel.laterPaidPeople, 1, 'post-cutoff conflicting payment cannot contaminate the fixed observation ledger')
equal(validThenConflictingAfterCutoff.funnel.laterRevenueMinorByCurrency, { usd: 2900 }, 'fixed observation keeps only in-window exact revenue')

const expirationBeforeStart = report({ events: [
  blob('u1', 10, 0), expired('x1', 'u1', 10, 1, 'cs_first'),
  start('s1', 'u1', 10, 2, 'cs_first'),
  start('s2', 'u1', 12, 2, 'cs_later'), paid('p2', 'u1', 12, 3, 'cs_later'),
] })
equal(expirationBeforeStart.funnel.distinctLaterSessionPeople, 0, 'expiration before its own Session start cannot create a post-expiry transition')
equal(expirationBeforeStart.funnel.firstExactExpiredUnpaidPeople, 0, 'invalid expiration chronology cannot inflate the first-expired people count')
equal(expirationBeforeStart.funnel.firstExactExpiredUnpaidStripeSessions, 0, 'invalid expiration chronology cannot inflate the first-expired Session count')
equal(expirationBeforeStart.exclusionsAndDiagnostics.invalidAnchorExpirationChronologyPeople, 1, 'inverted expiration clock is diagnosed explicitly')
equal(expirationBeforeStart.gate.state, 'blocked_data_quality', 'inverted expiration clock blocks the gate')

const firstExpiryAfterObservation = report({ events: [
  blob('u1'), start('s1', 'u1', 10, 2, 'cs_first'), expired('x1', 'u1', 18, 2, 'cs_first'),
] })
equal(firstExpiryAfterObservation.funnel.firstExactExpiredUnpaidPeople, 0, 'anchor expiration after the fixed observation window is excluded')

const laterExpiryAfterObservation = report({ events: [
  blob('u1'), start('s1', 'u1', 10, 2, 'cs_first'), expired('x1', 'u1', 11, 2, 'cs_first'),
  start('s2', 'u1', 16, 2, 'cs_later'), expired('x2', 'u1', 18, 2, 'cs_later'),
] })
equal(laterExpiryAfterObservation.funnel.resolvedLaterOutcomePeople, 0, 'later expiration after cutoff is not a terminal observed outcome')
equal(laterExpiryAfterObservation.funnel.laterOutcomeByStatus, { open_before_deadline: 1 }, 'later status is frozen before post-cutoff expiration')

const openPeople = Array.from({ length: POST_EXPIRY_NEW_SESSION_MIN_PEOPLE }, (_, index) => 'open' + index)
const fiveOpen = report({
  profiles: openPeople.map((user) => profile(user)),
  videos: openPeople.map((user) => video(user)),
  events: openPeople.flatMap((user, index) => [
    blob(user), start('s1_' + index, user, 10, 2, 'cs_first_' + index),
    expired('x1_' + index, user, 11, 2, 'cs_first_' + index),
    start('s2_' + index, user, 16, 12, 'cs_later_' + index),
  ]),
})
equal(fiveOpen.funnel.distinctLaterSessionPeople, POST_EXPIRY_NEW_SESSION_MIN_PEOPLE, 'open later Sessions remain in the factual denominator')
equal(fiveOpen.funnel.resolvedLaterOutcomePeople, 0, 'open later Sessions never mature the resolved denominator')
equal(fiveOpen.gate.state, 'collecting', 'five open later Sessions cannot open the gate')

const resolvedPeople = Array.from({ length: POST_EXPIRY_NEW_SESSION_MIN_PEOPLE }, (_, index) => 'resolved' + index)
const fiveResolved = report({
  profiles: resolvedPeople.map((user) => profile(user)),
  videos: resolvedPeople.map((user) => video(user)),
  events: resolvedPeople.flatMap((user, index) => [
    blob(user), start('rs1_' + index, user, 10, 2, 'rcs_first_' + index),
    expired('rx1_' + index, user, 11, 2, 'rcs_first_' + index),
    start('rs2_' + index, user, 12, 2, 'rcs_later_' + index),
    expired('rx2_' + index, user, 13, 2, 'rcs_later_' + index),
  ]),
})
equal(fiveResolved.funnel.resolvedLaterOutcomePeople, POST_EXPIRY_NEW_SESSION_MIN_PEOPLE, 'five exact terminal transitions satisfy the declared denominator')
equal(fiveResolved.gate.state, 'ready_for_diagnosis', 'only a clean resolved sample opens the diagnostic gate')

const outsideConflict = report({
  profiles: [profile('u1'), profile('outside')],
  videos: [video('u1')],
  events: [
    blob('u1'), start('s1', 'u1', 10, 2, 'cs_first'), expired('x1', 'u1', 11, 2, 'cs_first'),
    start('s2', 'u1', 12, 2, 'cs_later'), paid('p2', 'u1', 12, 3, 'cs_later'),
    start('outside_a', 'outside', 12, 2, 'cs_outside'),
    start('outside_b', 'outside', 12, 3, 'cs_outside', { tier: 'basic' }),
  ],
})
equal(outsideConflict.gate.state, 'collecting', 'financial conflict outside the first-file cohort cannot poison its gate')

const multipleLater = report({ events: [
  blob('u1'), start('s1', 'u1', 10, 2, 'cs_first'), expired('x1', 'u1', 11, 2, 'cs_first'),
  start('s2', 'u1', 12, 2, 'cs_later_a'), expired('x2', 'u1', 13, 2, 'cs_later_a'),
  start('s3', 'u1', 14, 2, 'cs_later_b'), expired('x3', 'u1', 15, 2, 'cs_later_b'),
] })
equal(multipleLater.funnel.distinctLaterSessionPeople, 1, 'one person remains one person with multiple later Sessions')
equal(multipleLater.funnel.firstDistinctLaterStripeSessions, 1, 'only the first post-expiry Session is the transition anchor')
equal(multipleLater.funnel.allLaterDistinctStripeSessions, 2, 'all later distinct Stripe Sessions remain separately counted')

const serializedPaidLater = JSON.stringify(paidLater)
check(
  !serializedPaidLater.includes('u1') &&
  !serializedPaidLater.includes('u1@example.com') &&
  !serializedPaidLater.includes('v_u1') &&
  !serializedPaidLater.includes('https://example.test/v.mp4') &&
  !serializedPaidLater.includes('cs_first') &&
  !serializedPaidLater.includes('cs_later'),
  'report emits no raw actor, email, video, URL or Stripe identifier',
)

assert.throws(() => buildPostExpiryNewSessionReport({ generatedAt: 'bad', windowStart, profiles: [], videos: [], events: [] }), /valid ordered timestamps/)
checks += 1

function emptyQuery(calls, table) {
  const query = {
    select(...args) { calls.push([table, 'select', ...args]); return query },
    lte(...args) { calls.push([table, 'lte', ...args]); return query },
    lt(...args) { calls.push([table, 'lt', ...args]); return query },
    gte(...args) { calls.push([table, 'gte', ...args]); return query },
    eq(...args) { calls.push([table, 'eq', ...args]); return query },
    is(...args) { calls.push([table, 'is', ...args]); return query },
    in(...args) { calls.push([table, 'in', ...args]); return query },
    order(...args) { calls.push([table, 'order', ...args]); return query },
    range(from, to) { calls.push([table, 'range', from, to]); return Promise.resolve({ data: [], error: null }) },
  }
  return query
}

const collectorCalls = []
const emptyCollected = await collectPostExpiryNewSession({
  db: { from(table) { collectorCalls.push([table, 'from']); return emptyQuery(collectorCalls, table) } },
  generatedAt,
})
equal(emptyCollected.funnel.matureExternalFirstVideoPeople, 0, 'collector executes end-to-end against an empty paginated database')
check(collectorCalls.some((call) => call[0] === 'profiles' && call[1] === 'is' && call[2] === 'created_at' && call[3] === null), 'collector explicitly fetches profiles without clocks')
check(collectorCalls.some((call) => call[0] === 'events' && call[1] === 'lt'), 'collector fetches pre-boundary financial evidence')
check(collectorCalls.filter((call) => call[1] === 'range').length === 7, 'every collector source is paginated')

function pagedProfileDb({ failSecondPage = false } = {}) {
  const calls = []
  return {
    calls,
    db: {
      from(table) {
        const filters = []
        const query = {
          select(...args) { calls.push([table, 'select', ...args]); return query },
          lte(...args) { filters.push(['lte', ...args]); calls.push([table, 'lte', ...args]); return query },
          lt(...args) { filters.push(['lt', ...args]); calls.push([table, 'lt', ...args]); return query },
          gte(...args) { filters.push(['gte', ...args]); calls.push([table, 'gte', ...args]); return query },
          eq(...args) { filters.push(['eq', ...args]); calls.push([table, 'eq', ...args]); return query },
          is(...args) { filters.push(['is', ...args]); calls.push([table, 'is', ...args]); return query },
          in(...args) { filters.push(['in', ...args]); calls.push([table, 'in', ...args]); return query },
          order(...args) { calls.push([table, 'order', ...args]); return query },
          range(from, to) {
            calls.push([table, 'range', from, to])
            const mainProfiles = table === 'profiles' && filters.some((filter) => filter[0] === 'lte')
            if (!mainProfiles) return Promise.resolve({ data: [], error: null })
            if (from === 0) {
              return Promise.resolve({
                data: Array.from({ length: 1000 }, (_, index) => profile('page_' + index)),
                error: null,
              })
            }
            if (failSecondPage) return Promise.resolve({ data: null, error: { code: 'PAGE_2', message: 'second page failed' } })
            return Promise.resolve({ data: [profile('page_1000')], error: null })
          },
        }
        return query
      },
    },
  }
}

const pagedSuccess = pagedProfileDb()
await collectPostExpiryNewSession({ db: pagedSuccess.db, generatedAt })
check(
  pagedSuccess.calls.some((call) => call[0] === 'profiles' && call[1] === 'range' && call[2] === 1000 && call[3] === 1999),
  'collector requests the second page instead of truncating at 1000 rows',
)
const pagedFailure = pagedProfileDb({ failSecondPage: true })
await assert.rejects(
  collectPostExpiryNewSession({ db: pagedFailure.db, generatedAt }),
  /profiles\[1000:1999\]: PAGE_2 second page failed/,
)
checks += 1

console.log(`post-expiry-new-session: ${checks}/${checks}`)
