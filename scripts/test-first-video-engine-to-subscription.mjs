#!/usr/bin/env node
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { fetchAllPages } from './measurement-helpers.mjs'
import {
  FIRST_VIDEO_ENGINE_CONTRACT_BOUNDARY,
  FIRST_VIDEO_ENGINE_MIN_MATURE_PEOPLE,
  FIRST_VIDEO_ENGINE_MIN_PEOPLE_PER_ENGINE,
  FIRST_VIDEO_ENGINE_OBSERVATION_DAYS,
  FIRST_VIDEO_ENGINE_WINDOW_DAYS,
  buildFirstVideoEngineToSubscriptionReport,
} from './first-video-engine-to-subscription-report.mjs'
import { unwrapFirstVideoEngineResult } from './measure-first-video-engine-to-subscription.mjs'

const DAY = 86_400_000
const BASE = Date.parse(FIRST_VIDEO_ENGINE_CONTRACT_BOUNDARY)
const GENERATED = BASE + 10 * DAY
const WINDOW_START = GENERATED - 30 * DAY
let checks = 0

function check(condition, message) {
  assert.ok(condition, message)
  checks += 1
}

function equal(actual, expected, message) {
  assert.deepEqual(actual, expected, message)
  checks += 1
}

function iso(day, extraMs = 0) {
  return new Date(BASE + day * DAY + extraMs).toISOString()
}

function profile(id, email = id + '@example.com', extra = {}) {
  return { id, email, created_at: iso(-1), ...extra }
}

function video(id, userId, day = 1, extra = {}) {
  return {
    id,
    user_id: userId,
    status: 'completed',
    video_url: 'https://cdn.example/' + id + '.mp4',
    created_at: iso(day),
    ...extra,
  }
}

function decision(id, userId, engine, day = 0.5, extra = {}) {
  return {
    id,
    name: 'first_video_engine_decided',
    user_id: userId,
    session_id: 'browser-' + userId,
    created_at: iso(day),
    metadata: { surface: 'niche_onboarding', engine, ...(extra.metadata ?? {}) },
    ...extra,
  }
}

function start(id, userId, stripeSession, day = 2, extra = {}) {
  return {
    id,
    name: 'checkout_started',
    user_id: userId,
    session_id: 'browser-' + userId,
    created_at: iso(day),
    metadata: {
      stripe_session_id: stripeSession,
      tier: 'starter',
      billing: 'monthly',
      ...(extra.metadata ?? {}),
    },
    ...extra,
  }
}

function payment(id, userId, stripeSession, day = 2.1, amount = 700, currency = 'usd', extra = {}) {
  return {
    id,
    name: 'payment_success',
    user_id: userId,
    session_id: 'browser-' + userId,
    created_at: iso(day),
    metadata: {
      stripe_session_id: stripeSession,
      checkout_mode: 'subscription',
      amount_total: amount,
      currency,
      ...(extra.metadata ?? {}),
    },
    ...extra,
  }
}

function report({ profiles = [], videos = [], events = [], generatedAt = new Date(GENERATED).toISOString(), windowStart = new Date(WINDOW_START).toISOString() } = {}) {
  return buildFirstVideoEngineToSubscriptionReport({ generatedAt, windowStart, profiles, videos, events })
}

equal(FIRST_VIDEO_ENGINE_WINDOW_DAYS, 30, 'window is fixed at 30 days')
equal(FIRST_VIDEO_ENGINE_OBSERVATION_DAYS, 7, 'individual observation is fixed at seven days')
equal(FIRST_VIDEO_ENGINE_MIN_MATURE_PEOPLE, 20, 'minimum total mature sample is explicit')
equal(FIRST_VIDEO_ENGINE_MIN_PEOPLE_PER_ENGINE, 5, 'minimum per-engine sample is explicit')
equal(FIRST_VIDEO_ENGINE_CONTRACT_BOUNDARY, '2026-09-02T04:00:53.307Z', 'boundary is the READY aliased production deploy, not commit time')

const baseProfiles = Array.from({ length: 20 }, (_, index) => profile('base-user-' + index))
const baseVideos = baseProfiles.map((row, index) => video('base-video-' + index, row.id, 1, { created_at: iso(1, index * 1000) }))
const baseEvents = baseProfiles.map((row, index) => decision('base-decision-' + index, row.id, index < 10 ? 'seedance' : 'fast', 0.5, { created_at: iso(0.5, index * 1000) }))
baseEvents.push(
  start('seedance-start', 'base-user-0', 'cs-seedance', 2),
  payment('seedance-paid', 'base-user-0', 'cs-seedance', 2.1, 700, 'usd'),
  start('fast-start', 'base-user-10', 'cs-fast', 2.2),
  payment('fast-paid', 'base-user-10', 'cs-fast', 2.3, 1500, 'eur'),
)
const baseReport = report({ profiles: baseProfiles, videos: baseVideos, events: baseEvents })
equal(baseReport.contract.effectiveWindowStart, FIRST_VIDEO_ENGINE_CONTRACT_BOUNDARY, 'effective window never starts before production contract')
equal(baseReport.primaryFunnel.maturedFirstPersistedCompletedVideoPeople, 20, 'counts mature people, not events')
equal(baseReport.primaryFunnel.exactPreVideoEngineDecisionPeople, 20, 'all exact pre-video decisions enter the eligible engine cohort')
equal(baseReport.primaryFunnel.cleanEngineCohortPeople, 20, 'clean cohort remains person-level')
equal(baseReport.primaryFunnel.byEngine[0], {
  engine: 'seedance', maturePeople: 10, firstRecurringCheckoutPeople: 1, firstRecurringStripeSessions: 1,
  exactPaidPeople: 1, exactPaidStripeSessions: 1, exactRevenueMinorByCurrency: { usd: 700 },
}, 'Seedance keeps exact same-Session revenue')
equal(baseReport.primaryFunnel.byEngine[1], {
  engine: 'fast', maturePeople: 10, firstRecurringCheckoutPeople: 1, firstRecurringStripeSessions: 1,
  exactPaidPeople: 1, exactPaidStripeSessions: 1, exactRevenueMinorByCurrency: { eur: 1500 },
}, 'Fast keeps its currency separate')
equal(baseReport.gate.state, 'ready_for_reconciliation', 'first exact payment opens reconciliation only after sample gate')
equal(baseReport.gate.neverAuthorizesOnboardingChange, true, 'diagnostic never authorizes an onboarding change')
equal(baseReport.quality.associationIsNotCausality, true, 'association is explicitly not causality')
equal(baseReport.quality.decisionDoesNotIndependentlyProveRenderedEngine, true, 'router decision is not mislabeled as rendered-engine proof')

const missing = report({
  profiles: [profile('missing'), profile('post-only')],
  videos: [video('missing-v', 'missing'), video('post-v', 'post-only')],
  events: [decision('post-d', 'post-only', 'fast', 2)],
})
equal(missing.primaryFunnel.exactPreVideoEngineDecisionPeople, 0, 'absence and post-video-only decisions never become an engine decision')
equal(missing.primaryFunnel.byEngine.find((row) => row.engine === 'fast').maturePeople, 0, 'absence never defaults to Fast')
equal(missing.exclusionsAndDiagnostics.missingPreVideoDecisionPeople, 2, 'missing decisions remain an explicit exclusion')
equal(missing.exclusionsAndDiagnostics.decisionExclusionsByReason, { no_decision: 1, post_video_decision_only: 1 }, 'missing reasons stay disjoint')

const badDecisionProfiles = ['surface', 'case', 'tie', 'contradict', 'equal', 'null-clock'].map((id) => profile(id))
const badDecisionVideos = badDecisionProfiles.map((row, index) => video('bad-d-v-' + index, row.id))
const badDecisionEvents = [
  decision('surface-d', 'surface', 'fast', 0.5, { metadata: { surface: 'other', engine: 'fast' } }),
  decision('case-d', 'case', 'Fast'),
  decision('tie-a', 'tie', 'fast'), decision('tie-b', 'tie', 'fast'),
  decision('contradict-a', 'contradict', 'seedance', 0.4), decision('contradict-b', 'contradict', 'fast', 0.6),
  decision('equal-d', 'equal', 'seedance', 1),
  { ...decision('null-d', 'null-clock', 'seedance'), created_at: null },
]
const badDecisions = report({ profiles: badDecisionProfiles, videos: badDecisionVideos, events: badDecisionEvents })
equal(badDecisions.primaryFunnel.exactPreVideoEngineDecisionPeople, 0, 'invalid, tied, contradictory, equal and null-clock decisions all fail closed')
equal(badDecisions.exclusionsAndDiagnostics.unresolvedDecisionPeople, 6, 'each decision defect is counted once per person')
equal(badDecisions.exclusionsAndDiagnostics.decisionExclusionsByReason, {
  contradictory_pre_video_engines: 1,
  decision_equal_to_first_video: 1,
  first_decision_timestamp_tie: 1,
  invalid_decision_contract: 2,
  invalid_decision_timestamp: 1,
}, 'decision failures retain exact reasons')
equal(badDecisions.gate.state, 'blocked_data_quality', 'decision ambiguity blocks the diagnostic gate')

const identity = report({
  profiles: [
    profile('duplicate', 'same@example.com'), profile('duplicate', 'same@example.com'),
    profile('conflict', 'one@example.com'), profile('conflict', 'two@example.com'),
    profile('blank', ''), profile('internal', 'josephsskaf@gmail.com'),
  ],
  videos: [video('duplicate-v', 'duplicate'), video('conflict-v', 'conflict'), video('blank-v', 'blank'), video('internal-v', 'internal')],
  events: [decision('dup-d', 'duplicate', 'fast'), decision('conflict-d', 'conflict', 'seedance')],
})
equal(identity.primaryFunnel.maturedFirstPersistedCompletedVideoPeople, 0, 'duplicate, conflicting, unknown and internal profiles never enter the cohort')
equal(identity.exclusionsAndDiagnostics.duplicateProfileIds, 2, 'any duplicate profile id fails closed even with identical emails')
equal(identity.exclusionsAndDiagnostics.conflictingProfileIds, 1, 'conflicting duplicate email is separately visible')
equal(identity.exclusionsAndDiagnostics.unknownProfileIds, 1, 'blank profile email is unknown')
equal(identity.exclusionsAndDiagnostics.internalProfileIdsExcluded, 1, 'canonical internal account is excluded')
equal(identity.exclusionsAndDiagnostics.unresolvedIdentityVideoOwnersEligibleWindow, 3, 'non-internal unresolved identities enter the eligible quality denominator')

const profileClock = report({
  profiles: [
    profile('profile-after-video', 'after@example.com', { created_at: iso(2) }),
    profile('profile-null-clock', 'null@example.com', { created_at: null }),
    profile('profile-invalid-clock', 'invalid@example.com', { created_at: 'not-a-date' }),
  ],
  videos: [
    video('profile-after-v', 'profile-after-video', 1),
    video('profile-null-v', 'profile-null-clock', 1),
    video('profile-invalid-v', 'profile-invalid-clock', 1),
  ],
  events: [decision('profile-after-d', 'profile-after-video', 'fast')],
})
equal(profileClock.primaryFunnel.maturedFirstPersistedCompletedVideoPeople, 0, 'profile created after video or without a valid clock never validates ownership retrospectively')
equal(profileClock.exclusionsAndDiagnostics.profileCreatedAfterFirstVideoPeople, 1, 'profile created after first video is explicit')
equal(profileClock.exclusionsAndDiagnostics.invalidProfileClockIds, 2, 'null and invalid profile clocks are explicit')
equal(profileClock.exclusionsAndDiagnostics.unresolvedIdentityVideoOwnersEligibleWindow, 2, 'invalid profile clocks enter eligible identity quality loss')
equal(profileClock.gate.state, 'blocked_data_quality', 'profile chronology defects block quality')

const videoTruth = report({
  profiles: ['old', 'null', 'tie-video', 'url', 'owner-a', 'owner-b', 'failed-only'].map((id) => profile(id)),
  videos: [
    video('old-first', 'old', -1), video('old-second', 'old', 1),
    { ...video('null-v', 'null', 1), created_at: null }, video('null-later', 'null', 2),
    video('tie-v-a', 'tie-video', 1), video('tie-v-b', 'tie-video', 1),
    video('url-v', 'url', 1, { video_url: '' }),
    video('shared-v', 'owner-a', 1), video('shared-v', 'owner-b', 1),
    video('failed-v', 'failed-only', 1, { status: 'failed' }),
  ],
  events: [],
})
equal(videoTruth.primaryFunnel.maturedFirstPersistedCompletedVideoPeople, 0, 'only unequivocal first all-history completed files can enter')
equal(videoTruth.exclusionsAndDiagnostics.firstVideoBeforeEffectiveWindowPeople, 1, 'an older all-history first video prevents a later video becoming first')
equal(videoTruth.exclusionsAndDiagnostics.unresolvedFirstVideoPeopleEligibleWindow, 5, 'null clock, tie, missing URL and both shared-id owners are unresolved')
equal(videoTruth.exclusionsAndDiagnostics.undatableCompletedVideoOwnersAllHistory, 1, 'null video clocks remain explicit')
equal(videoTruth.gate.state, 'blocked_data_quality', 'undatable video history blocks a selective cohort')

const ownerless = report({
  profiles: [],
  videos: [video('ownerless', null, 1), { ...video('ownerless-null', null, 1), created_at: null }],
  events: [decision('ownerless-decision', null, 'fast', 0.5), { ...decision('ownerless-null-decision', null, 'fast', 0.5), created_at: null }],
})
equal(ownerless.exclusionsAndDiagnostics.eligibleOwnerlessCompletedVideoRows, 1, 'eligible ownerless completed video is explicit')
equal(ownerless.exclusionsAndDiagnostics.undatableOwnerlessCompletedVideoRows, 1, 'undatable ownerless completed video is explicit')
equal(ownerless.exclusionsAndDiagnostics.eligibleMalformedDecisionRows, 1, 'decision without user_id is never silently discarded from quality')
equal(ownerless.exclusionsAndDiagnostics.undatableMalformedDecisionRows, 1, 'ownerless decision without a clock is an explicit hard blocker')
equal(ownerless.gate.state, 'blocked_data_quality', 'ownerless eligible evidence blocks quality')

const financeIds = ['pre', 'later-paid', 'other-session', 'pack', 'auto', 'unknown', 'late-pay', 'tie-session', 'bad-currency', 'good'].map((id) => profile(id))
const financeVideos = financeIds.map((row, index) => video('finance-v-' + index, row.id))
const financeDecisions = financeIds.map((row) => decision('finance-d-' + row.id, row.id, row.id === 'good' ? 'seedance' : 'fast'))
const financeEvents = [
  ...financeDecisions,
  start('pre-start', 'pre', 'cs-pre', 0.75),
  start('later-first', 'later-paid', 'cs-later-first', 2),
  start('later-second', 'later-paid', 'cs-later-second', 3), payment('later-second-paid', 'later-paid', 'cs-later-second', 3.1),
  start('other-start', 'other-session', 'cs-other-start', 2), payment('other-paid', 'other-session', 'cs-other-payment', 2.1),
  start('pack-start', 'pack', 'cs-pack', 2, { metadata: { stripe_session_id: 'cs-pack', sku: 'bulk10', tier: undefined, billing: undefined } }),
  payment('pack-paid', 'pack', 'cs-pack', 2.1, 9900, 'usd', { metadata: { stripe_session_id: 'cs-pack', checkout_mode: 'payment', amount_total: 9900, currency: 'usd' } }),
  start('auto-start', 'auto', 'cs-auto', 2, { metadata: { stripe_session_id: 'cs-auto', tier: 'autopilot', billing: 'monthly' } }),
  start('unknown-start', 'unknown', 'cs-unknown', 2, { metadata: { stripe_session_id: 'cs-unknown', tier: 'fake', billing: 'monthly' } }),
  start('late-start', 'late-pay', 'cs-late', 2), payment('late-paid', 'late-pay', 'cs-late', 9, 700, 'usd'),
  start('tie-start-a', 'tie-session', 'cs-tie-a', 2), start('tie-start-b', 'tie-session', 'cs-tie-b', 2),
  start('currency-start', 'bad-currency', 'cs-currency', 2), payment('currency-paid', 'bad-currency', 'cs-currency', 2.1, 700, 'usdollars'),
  start('good-start', 'good', 'cs-good', 2), payment('good-paid', 'good', 'cs-good', 2.1, 2900, 'usd'),
]
const finance = report({ profiles: financeIds, videos: financeVideos, events: financeEvents })
equal(finance.exclusionsAndDiagnostics.preexistingRecurringIntentPeople, 1, 'self-serve checkout before first video is excluded from acquisition association')
equal(finance.exclusionsAndDiagnostics.laterRecurringSessionsIgnored, 2, 'later or concurrent recurring Sessions never replace the first')
equal(finance.exclusionsAndDiagnostics.packSessionsExcluded, 1, 'pack Session never counts')
equal(finance.exclusionsAndDiagnostics.autopilotSessionsExcluded, 1, 'Autopilot Session never counts')
check(finance.exclusionsAndDiagnostics.unknownOrConflictingProductSessionsExcluded >= 1, 'unknown product never counts')
equal(finance.exclusionsAndDiagnostics.unknownPostVideoProductPeople, 1, 'unknown post-video product is unresolved, not a clean non-converter')
equal(finance.exclusionsAndDiagnostics.ambiguousFirstRecurringSessionPeople, 1, 'tied first recurring Sessions fail closed')
equal(finance.exclusionsAndDiagnostics.invalidCurrencyPeople, 1, 'currency must satisfy lowercase three-letter contract')
const financeFast = finance.primaryFunnel.byEngine.find((row) => row.engine === 'fast')
const financeSeedance = finance.primaryFunnel.byEngine.find((row) => row.engine === 'seedance')
equal(financeFast.exactPaidPeople, 0, 'later paid, other-session paid and post-cutoff paid evidence never becomes Fast revenue')
equal(financeSeedance.exactPaidPeople, 1, 'valid same-Session in-window payment counts once')
equal(financeSeedance.exactRevenueMinorByCurrency, { usd: 2900 }, 'valid revenue remains integer minor units by currency')

const priorProfiles = ['prior-self', 'prior-auto', 'prior-pack', 'prior-payment', 'prior-unknown'].map((id) => profile(id))
const prior = report({
  profiles: priorProfiles,
  videos: priorProfiles.map((row, index) => video('prior-v-' + index, row.id)),
  events: [
    ...priorProfiles.map((row) => decision('prior-d-' + row.id, row.id, 'fast')),
    start('prior-self-start', 'prior-self', 'cs-prior-self', 0.75),
    start('prior-auto-start', 'prior-auto', 'cs-prior-auto', 0.75, { metadata: { stripe_session_id: 'cs-prior-auto', tier: 'autopilot', billing: 'monthly' } }),
    start('prior-pack-start', 'prior-pack', 'cs-prior-pack', 1, { metadata: { stripe_session_id: 'cs-prior-pack', sku: 'bulk10', tier: undefined, billing: undefined } }),
    payment('prior-one-time-paid', 'prior-payment', 'cs-prior-one-time', 0.75, 490, 'usd', { metadata: { stripe_session_id: 'cs-prior-one-time', checkout_mode: 'payment', amount_total: 490, currency: 'usd' } }),
    start('prior-unknown-start', 'prior-unknown', 'cs-prior-unknown', 0.75, { metadata: { stripe_session_id: 'cs-prior-unknown', tier: 'mystery', billing: 'monthly' } }),
  ],
})
equal(prior.exclusionsAndDiagnostics.preexistingRecurringIntentPeople, 2, 'pre-video self-serve and Autopilot recurring intent are preexisting')
equal(prior.exclusionsAndDiagnostics.priorOneTimeCommercialIntentPeople, 2, 'pre-video pack checkout and one-time payment are prior commercial intent')
equal(prior.exclusionsAndDiagnostics.unknownPriorCommercialIntentPeople, 1, 'unclassifiable prior money event is unresolved quality')
equal(prior.exclusionsAndDiagnostics.allPriorCommercialIntentPeople, 5, 'all prior commercial intent is excluded at person level')
equal(prior.primaryFunnel.cleanEngineCohortPeople, 0, 'no prior buyer or checkout visitor contaminates the clean cohort')
equal(prior.gate.state, 'blocked_data_quality', 'unknown prior product blocks quality rather than becoming non-conversion')

const nullFinance = report({
  profiles: [profile('null-finance')],
  videos: [video('null-finance-v', 'null-finance')],
  events: [
    decision('null-finance-d', 'null-finance', 'seedance'),
    start('null-finance-start', 'null-finance', 'cs-null-finance', 2),
    { ...payment('null-finance-payment', null, 'cs-null-finance', 2.1), created_at: null },
  ],
})
equal(nullFinance.exclusionsAndDiagnostics.undatableFinancialClockPeople, 1, 'null financial clock is linked through exact Session and fails closed')
equal(nullFinance.primaryFunnel.cleanEngineCohortPeople, 0, 'null financial evidence cannot enter a clean engine cohort')
equal(nullFinance.gate.state, 'blocked_data_quality', 'null financial clock blocks quality')

const unlinkedPayment = report({
  profiles: [profile('unlinked-payment')],
  videos: [video('unlinked-payment-v', 'unlinked-payment')],
  events: [
    decision('unlinked-payment-d', 'unlinked-payment', 'fast'),
    start('unlinked-payment-start', 'unlinked-payment', 'cs-unlinked-start', 2),
    payment('unlinked-payment-paid', 'unlinked-payment', 'cs-no-start', 2.1),
  ],
})
equal(unlinkedPayment.exclusionsAndDiagnostics.unlinkedPostVideoRecurringPaymentPeople, 1, 'recurring payment without an exact same-owner self-serve start is explicit')
equal(unlinkedPayment.primaryFunnel.cleanEngineCohortPeople, 0, 'unlinked recurring payment cannot become a clean non-converter')
equal(unlinkedPayment.primaryFunnel.byEngine.find((row) => row.engine === 'fast').exactPaidPeople, 0, 'payment on a different Session remains zero revenue')
equal(unlinkedPayment.gate.state, 'blocked_data_quality', 'unlinked recurring payment blocks diagnosis')

const laterRequestedWindow = report({
  generatedAt: iso(40),
  windowStart: iso(10),
  profiles: [profile('pre-window-decision')],
  videos: [video('pre-window-video', 'pre-window-decision', 11)],
  events: [decision('pre-window-d', 'pre-window-decision', 'seedance', 9)],
})
equal(laterRequestedWindow.contract.effectiveWindowStart, iso(10), 'a requested start after deployment remains the effective cohort start')
equal(laterRequestedWindow.primaryFunnel.exactPreVideoEngineDecisionPeople, 1, 'runner-contract keeps a pre-video decision between deploy boundary and requested cohort start')

assert.throws(() => report({ windowStart: iso(-19) }), /fixed 30-day window/)
checks += 1
assert.throws(() => report({ generatedAt: iso(-1), windowStart: iso(-31) }), /predates the production contract boundary/)
checks += 1
assert.throws(() => buildFirstVideoEngineToSubscriptionReport({ generatedAt: iso(10), windowStart: iso(-20), events: null, profiles: [], videos: [] }), /must be arrays/)
checks += 1

const serialized = JSON.stringify(baseReport)
for (const forbidden of ['base-user-0', 'base-user-10', 'base-video-0', 'cs-seedance', 'browser-base-user-0', 'base-user-0@example.com']) {
  check(!serialized.includes(forbidden), 'aggregate report excludes raw identifier ' + forbidden)
}

equal(unwrapFirstVideoEngineResult({ data: [] }, 'ok'), [], 'runner unwrap accepts array results')
assert.throws(() => unwrapFirstVideoEngineResult({ error: { code: '42501', message: 'denied' } }, 'events'), /events: 42501 denied/)
checks += 1
assert.throws(() => unwrapFirstVideoEngineResult({ data: null }, 'events'), /expected an array result/)
checks += 1

const overThousand = Array.from({ length: 1005 }, (_, index) => index)
let pageCalls = 0
const paged = await fetchAllPages(async (from, to) => {
  pageCalls += 1
  return overThousand.slice(from, to + 1)
})
equal(paged.length, 1005, 'pagination does not truncate above 1000 rows')
equal(pageCalls, 2, 'pagination stops only after the final short page')

const here = dirname(fileURLToPath(import.meta.url))
const runnerSource = readFileSync(join(here, 'measure-first-video-engine-to-subscription.mjs'), 'utf8')
check(runnerSource.includes('fetchAllPages'), 'runner paginates every source')
check(runnerSource.includes(".eq('status', 'completed')"), 'runner requests persisted completed videos')
check(runnerSource.includes(".gte('created_at', FIRST_VIDEO_ENGINE_CONTRACT_BOUNDARY)"), 'runner never requests decision attribution before production contract')
equal((runnerSource.match(/\.is\('created_at', null\)/g) ?? []).length, 4, 'runner separately fetches null profile, video, decision and financial clocks')
check(/\.select\('id,email,created_at'\)\s*\.lte\('created_at', generatedAtIso\)/.test(runnerSource), 'runner snapshots profile identity and clock no later than generatedAt')
check(!/dotenv|\.env\.local|loadEnvConfig/.test(runnerSource), 'runner never reads an env file by itself')
check(runnerSource.includes('process.env.NEXT_PUBLIC_SUPABASE_URL') && runnerSource.includes('process.env.SUPABASE_SERVICE_ROLE_KEY'), 'CLI reads only inherited standard process env names')
check(runnerSource.includes('buildFirstVideoEngineToSubscriptionReport'), 'runner delegates truth to the pure report contract')

console.log('first-video-engine-to-subscription: ' + checks + '/' + checks + ' checks passed')
