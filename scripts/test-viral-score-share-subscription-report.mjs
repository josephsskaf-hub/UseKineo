#!/usr/bin/env node
import assert from 'node:assert/strict'
import {
  buildViralScoreShareSubscriptionReport,
  isExactViralScoreShareLanding,
  isExactViralScoreShareRequest,
  isExactViralScoreShareResult,
  VIRAL_SCORE_SHARE_CAMPAIGN,
  VIRAL_SCORE_SHARE_LANDING_PATH,
  VIRAL_SCORE_SHARE_MEDIUM,
  VIRAL_SCORE_SHARE_SOURCE,
} from './viral-score-share-subscription-report.mjs'
import { collectViralScoreShareSubscription } from './measure-viral-score-share-subscription.mjs'

let checks = 0
const equal = (actual, expected, label) => { assert.deepEqual(actual, expected, label); checks += 1 }
const ok = (value, label) => { assert.ok(value, label); checks += 1 }
const generatedAt = '2026-09-10T00:00:00.000Z'
const windowStart = '2026-08-11T00:00:00.000Z'
const T = {
  landing: '2026-09-01T00:00:00.000Z',
  result: '2026-09-01T00:01:00.000Z',
  profile: '2026-09-01T00:02:00.000Z',
  video: '2026-09-01T01:00:00.000Z',
  checkout: '2026-09-02T00:00:00.000Z',
  payment: '2026-09-02T00:01:00.000Z',
}
const campaign = {
  utm_source: VIRAL_SCORE_SHARE_SOURCE,
  utm_medium: VIRAL_SCORE_SHARE_MEDIUM,
  utm_campaign: VIRAL_SCORE_SHARE_CAMPAIGN,
}
const event = (id, name, userId, sessionId, createdAt, metadata = {}, path = VIRAL_SCORE_SHARE_LANDING_PATH) => ({
  id, name, user_id: userId, session_id: sessionId, created_at: createdAt, metadata, path,
})
const landing = (id, session, at = T.landing) =>
  event(id, 'landing_session_started', null, session, at, campaign)
const result = (id, session, at = T.result, extra = {}) =>
  event(id, 'viral_score_completed', null, session, at, { ...campaign, score_band: 80, ...extra })
const owner = (id, userId, session, at = T.profile) =>
  event(id, 'generate_page_view', userId, session, at, {}, '/generate')
const share = (id, userId, session, at = T.result, extra = {}) =>
  event(id, 'viral_score_scorecard_share_requested', userId, session, at, {
    variant: VIRAL_SCORE_SHARE_CAMPAIGN, method: 'native', score_band: 80, ...extra,
  })
const profile = (id, extra = {}) => ({
  id, email: id + '@external.example', created_at: T.profile,
  signup_utm_source: VIRAL_SCORE_SHARE_SOURCE,
  signup_utm_medium: VIRAL_SCORE_SHARE_MEDIUM,
  signup_utm_campaign: VIRAL_SCORE_SHARE_CAMPAIGN,
  ...extra,
})
const ordinaryProfile = (id, extra = {}) => ({
  id, email: id + '@external.example', created_at: '2026-08-01T00:00:00.000Z',
  signup_utm_source: 'other', signup_utm_medium: 'other', signup_utm_campaign: 'other', ...extra,
})
const video = (userId, at = T.video) => ({
  id: 'video-' + userId, user_id: userId, status: 'completed', created_at: at,
})
const start = (id, userId, stripe, at = T.checkout, extra = {}) =>
  event(id, 'checkout_started', userId, 'pay-' + userId, at, {
    stripe_session_id: stripe, tier: 'starter', billing: 'monthly', ...extra,
  }, '/pricing')
const paid = (id, userId, stripe, at = T.payment, extra = {}) =>
  event(id, 'payment_success', userId, 'pay-' + userId, at, {
    stripe_session_id: stripe, checkout_mode: 'subscription',
    amount_total: 1500, currency: 'usd', ...extra,
  }, '/checkout/success')

const base = (overrides = {}) => ({
  generatedAt,
  windowStart,
  landingEvents: [landing('l1', 'browser-1')],
  sessionEvents: [
    landing('l1', 'browser-1'),
    result('r1', 'browser-1'),
    owner('o1', 'buyer', 'browser-1'),
  ],
  shareEvents: [
    share('sh1', 'buyer', 'share-1'),
    share('sh2', 'sharer-two', 'share-2'),
    share('sh3', 'sharer-three', 'share-3'),
  ],
  financialEvents: [start('s1', 'buyer', 'cs_1'), paid('p1', 'buyer', 'cs_1')],
  profiles: [
    profile('buyer', { is_pro: true, stripe_subscription_id: 'sub_1' }),
    ordinaryProfile('sharer-two'),
    ordinaryProfile('sharer-three'),
  ],
  videos: [video('buyer')],
  ...overrides,
})

equal(isExactViralScoreShareLanding(landing('exact-l', 'exact')), true, 'exact landing contract')
equal(isExactViralScoreShareResult(result('exact-r', 'exact')), true, 'exact result contract')
equal(isExactViralScoreShareRequest(share('exact-s', 'buyer', 'exact')), true, 'exact share contract')
equal(isExactViralScoreShareResult(result('bad-band', 'exact', T.result, { score_band: 85 })), false, 'non-band score rejected')
equal(isExactViralScoreShareRequest(share('bad-method', 'buyer', 'exact', T.result, { method: 'manual' })), false, 'manual selection is not a confirmed share')
equal(isExactViralScoreShareRequest(share('extra-key', 'buyer', 'exact', T.result, { extra: 'no' })), false, 'share metadata must use the exact closed key set')

const clean = buildViralScoreShareSubscriptionReport(base())
equal(clean.acquisition.externalPeople, 1, 'one fully linked external recipient')
equal(clean.acquisition.exactLandingSessions, 1, 'one exact landing session')
equal(clean.acquisition.firstVideoPeople, 1, 'strict later completed video')
equal(clean.acquisition.recurringCheckoutPeople, 1, 'one person, not event rows')
equal(clean.acquisition.exactActiveSubscriberPeople, 1, 'same Session payment plus active profile')
equal(clean.acquisition.exactPaidStripeSessions, 1, 'one exact paid Stripe Session')
equal(clean.acquisition.exactRevenueMinorByCurrency, { usd: 1500 }, 'canonical revenue only')
equal(clean.sharing.distinctExternalSharers, 3, 'distinct authenticated external sharers')
equal(clean.sharing.loopObserved, true, 'three external sharers observe use of the button')
equal(clean.gate.shareLoopObserved, true, 'gate exposes loop evidence separately')
equal(clean.gate.state, 'channel_proven_not_causal', 'payment proves channel, not button causality')
equal(clean.quality.qualityMet, true, 'clean evidence passes')
ok(clean.note.includes('never sender-to-recipient attribution'), 'note refuses sender-to-recipient causality')

const noResult = buildViralScoreShareSubscriptionReport(base({
  sessionEvents: [landing('l1', 'browser-1'), owner('o1', 'buyer', 'browser-1')],
  financialEvents: [], videos: [],
}))
equal(noResult.acquisition.externalPeople, 0, 'landing plus signup without tool result is not a person in cohort')
equal(noResult.quality.ownerStateCounts.result_missing, 1, 'missing result is visible')
equal(noResult.gate.state, 'blocked_quality', 'an attributed profile without the full chain blocks quality')

const resultAfterProfile = buildViralScoreShareSubscriptionReport(base({
  sessionEvents: [
    landing('l1', 'browser-1'),
    owner('o1', 'buyer', 'browser-1'),
    result('late-r', 'browser-1', '2026-09-01T00:03:00.000Z'),
  ],
  financialEvents: [], videos: [],
}))
equal(resultAfterProfile.acquisition.externalPeople, 0, 'result after profile never backfills tool use')
equal(resultAfterProfile.quality.lateExactResultRows, 1, 'late exact result remains visible')

const missingEmail = buildViralScoreShareSubscriptionReport(base({
  profiles: [profile('buyer', { email: null })],
  shareEvents: [], financialEvents: [], videos: [],
}))
equal(missingEmail.acquisition.externalPeople, 0, 'missing-email profile never becomes external person')
equal(missingEmail.quality.unknownAttributedProfilePeople, 1, 'unknown attributed profile is visible')
equal(missingEmail.gate.state, 'blocked_quality', 'missing email on attributed profile blocks decision')

const nullVideo = buildViralScoreShareSubscriptionReport(base({
  videos: [video('buyer', null)],
  financialEvents: [],
}))
equal(nullVideo.quality.undatableVideoPeople, 1, 'completed video without clock is visible for cohort owner')
equal(nullVideo.gate.state, 'blocked_quality', 'cohort video without clock blocks decision')

const tiedVideo = buildViralScoreShareSubscriptionReport(base({
  videos: [video('buyer', T.profile)],
  financialEvents: [],
}))
equal(tiedVideo.acquisition.firstVideoPeople, 0, 'video tied with profile is not later')

const ownerConflict = buildViralScoreShareSubscriptionReport(base({
  sessionEvents: [
    landing('l1', 'browser-1'), result('r1', 'browser-1'),
    owner('o1', 'buyer', 'browser-1'), owner('o2', 'other', 'browser-1'),
  ],
  profiles: [profile('buyer'), ordinaryProfile('other')],
  shareEvents: [], financialEvents: [], videos: [],
}))
equal(ownerConflict.acquisition.externalPeople, 0, 'multi-owner browser session never becomes a person')
equal(ownerConflict.quality.ownerStateCounts.owner_conflict, 1, 'owner conflict is visible')
equal(ownerConflict.gate.state, 'blocked_quality', 'owner conflict blocks decision')

const profileWithoutLanding = buildViralScoreShareSubscriptionReport(base({
  landingEvents: [], sessionEvents: [], shareEvents: [], financialEvents: [], videos: [],
}))
equal(profileWithoutLanding.quality.unlinkedAttributedProfilePeople, 1, 'attributed profile without landing is visible')
equal(profileWithoutLanding.gate.state, 'blocked_quality', 'attributed profile without landing blocks quality')

const ownerAbsent = buildViralScoreShareSubscriptionReport(base({
  sessionEvents: [landing('l1', 'browser-1'), result('r1', 'browser-1')],
  shareEvents: [], financialEvents: [], videos: [],
}))
equal(ownerAbsent.quality.unlinkedAttributedProfilePeople, 1, 'attributed profile without an owner witness is visible')
equal(ownerAbsent.gate.state, 'blocked_quality', 'missing owner witness cannot shrink the denominator silently')

const anonymous = buildViralScoreShareSubscriptionReport(base({
  shareEvents: [
    share('a1', null, 'anonymous-one'),
    share('a2', null, 'anonymous-one'),
    share('a3', null, 'anonymous-two'),
  ],
  financialEvents: [], videos: [],
}))
equal(anonymous.sharing.distinctExternalSharers, 0, 'anonymous sessions never become people')
equal(anonymous.sharing.anonymousShareSessions, 2, 'anonymous activity is separate session diagnostics')
equal(anonymous.sharing.loopObserved, false, 'anonymous activity cannot prove external sharers')

const duplicateShares = buildViralScoreShareSubscriptionReport(base({
  shareEvents: [
    share('d1', 'buyer', 'd-one'),
    share('d2', 'buyer', 'd-two'),
    share('d3', 'buyer', 'd-three'),
  ],
}))
equal(duplicateShares.sharing.exactShareRows, 3, 'share rows remain visible')
equal(duplicateShares.sharing.distinctExternalSharers, 1, 'three events by one person count once')
equal(duplicateShares.sharing.loopObserved, false, 'one person cannot satisfy loop gate')

const internalShare = buildViralScoreShareSubscriptionReport(base({
  profiles: [
    profile('buyer', { is_pro: true, stripe_subscription_id: 'sub_1' }),
    ordinaryProfile('founder', { email: 'josephsskaf@gmail.com' }),
  ],
  shareEvents: [share('internal', 'founder', 'internal-session')],
}))
equal(internalShare.sharing.distinctExternalSharers, 0, 'internal account never counts as sharer')
equal(internalShare.sharing.internalShareRows, 1, 'internal share row is disclosed')

const internallyAttributed = buildViralScoreShareSubscriptionReport(base({
  landingEvents: [], sessionEvents: [], shareEvents: [], financialEvents: [], videos: [],
  profiles: [profile('founder', { email: 'josephsskaf@gmail.com' })],
}))
equal(internallyAttributed.quality.internalProfileRows, 1, 'internally attributed profile is disclosed')
equal(internallyAttributed.quality.unknownAttributedProfilePeople, 0, 'known internal profile is not unknown identity')
equal(internallyAttributed.acquisition.externalPeople, 0, 'internally attributed profile never enters external cohort')
equal(internallyAttributed.quality.qualityMet, true, 'internal QA activity alone does not block evidence quality')

const malformedShare = buildViralScoreShareSubscriptionReport(base({
  shareEvents: [share('bad', 'buyer', 'bad-session', T.result, { method: 'manual' })],
}))
equal(malformedShare.sharing.exactShareRows, 0, 'invalid share contract does not count')
equal(malformedShare.quality.invalidShareContractRows, 1, 'invalid share contract remains visible')

const wrongSession = buildViralScoreShareSubscriptionReport(base({
  financialEvents: [start('ws1', 'buyer', 'cs_start'), paid('ws2', 'buyer', 'cs_other')],
}))
equal(wrongSession.acquisition.exactActiveSubscriberPeople, 0, 'different Stripe Session never counts')
equal(wrongSession.quality.unlinkedSubscriptionPaymentPeople, 1, 'different payment Session is visible')
equal(wrongSession.gate.state, 'blocked_quality', 'unlinked payment blocks decision')

const inactive = buildViralScoreShareSubscriptionReport(base({
  profiles: [profile('buyer'), ordinaryProfile('sharer-two'), ordinaryProfile('sharer-three')],
}))
equal(inactive.acquisition.exactActiveSubscriberPeople, 0, 'payment without active profile is not subscriber')
equal(inactive.acquisition.exactRevenueMinorByCurrency, {}, 'inactive payment adds no attributed revenue')

const nullFinancial = buildViralScoreShareSubscriptionReport(base({
  financialEvents: [start('nf', 'buyer', 'cs_nf', null)],
}))
equal(nullFinancial.quality.undatableFinancialPeople, 1, 'undatable financial row is visible')
equal(nullFinancial.gate.state, 'blocked_quality', 'undatable financial evidence blocks decision')

const people20 = Array.from({ length: 20 }, (_, index) => {
  const id = 'stop-' + index
  const session = 'stop-browser-' + index
  return { id, session }
})
const stop = buildViralScoreShareSubscriptionReport({
  generatedAt,
  windowStart,
  landingEvents: people20.map((row, index) => landing('sl-' + index, row.session)),
  sessionEvents: people20.flatMap((row, index) => [
    landing('sl-' + index, row.session),
    result('sr-' + index, row.session),
    owner('so-' + index, row.id, row.session),
  ]),
  shareEvents: people20.slice(0, 3).map((row, index) => share('ss-' + index, row.id, 'share-' + index)),
  financialEvents: [],
  profiles: people20.map((row) => profile(row.id)),
  videos: people20.slice(0, 5).map((row) => video(row.id)),
})
equal(stop.acquisition.matureExternalPeople, 20, 'twenty people mature individually')
equal(stop.acquisition.matureFirstVideoPeople, 5, 'five mature people reached video')
equal(stop.sharing.distinctExternalSharers, 3, 'three mature external sharers observed')
equal(stop.gate.state, 'stop_no_checkout', 'stop gate requires people and finds zero checkout')

function fakeDb(tables, { failTable = null, failFrom = null } = {}) {
  const calls = []
  return {
    calls,
    from(table) {
      const filters = []
      const chain = {
        select() { return chain },
        eq(column, value) { filters.push(['eq', column, value]); return chain },
        in(column, value) { filters.push(['in', column, value]); return chain },
        gte(column, value) { filters.push(['gte', column, value]); return chain },
        lte(column, value) { filters.push(['lte', column, value]); return chain },
        is(column, value) { filters.push(['is', column, value]); return chain },
        order() { return chain },
        async range(from, to) {
          calls.push({ table, filters: filters.map((row) => [...row]) })
          if (table === failTable && from === failFrom) {
            return { data: null, error: { code: 'TEST_PAGE_FAILURE', message: 'forced page failure' } }
          }
          let rows = [...(tables[table] ?? [])]
          for (const [kind, column, value] of filters) {
            if (kind === 'eq') rows = rows.filter((row) => row?.[column] === value)
            if (kind === 'in') rows = rows.filter((row) => value.includes(row?.[column]))
            if (kind === 'gte') rows = rows.filter((row) => row?.[column] !== null && row?.[column] >= value)
            if (kind === 'lte') rows = rows.filter((row) => row?.[column] !== null && row?.[column] <= value)
            if (kind === 'is') rows = rows.filter((row) => row?.[column] === value)
          }
          return { data: rows.slice(from, to + 1), error: null }
        },
      }
      return chain
    },
  }
}

const collectorDb = fakeDb({
  profiles: base().profiles,
  videos: base().videos,
  events: [
    landing('l1', 'browser-1'),
    result('r1', 'browser-1'),
    owner('o1', 'buyer', 'browser-1'),
    ...base().shareEvents,
    ...base().financialEvents,
  ],
})
const collected = await collectViralScoreShareSubscription({
  db: collectorDb,
  generatedAt: new Date(generatedAt),
})
equal(collected.acquisition.externalPeople, 1, 'collector resolves exact landing, result and owner')
equal(collected.acquisition.exactActiveSubscriberPeople, 1, 'collector reaches canonical paid subscription')
equal(collected.sharing.distinctExternalSharers, 3, 'collector counts external people sharing')
ok(collectorDb.calls.some((call) => call.table === 'videos' &&
  call.filters.some(([kind, column, value]) => kind === 'is' && column === 'created_at' && value === null)),
'collector inventories completed videos without clock')
ok(collectorDb.calls.some((call) => call.table === 'events' &&
  call.filters.some(([kind, column, value]) => kind === 'eq' &&
    column === 'name' && value === 'viral_score_scorecard_share_requested')),
'collector fetches dedicated share requests')
ok(collectorDb.calls.some((call) => call.table === 'events' &&
  call.filters.some(([kind, column]) => kind === 'in' && column === 'session_id')),
'collector resolves the full browser session')
equal(Object.hasOwn(collected, 'people'), false, 'collector output never exposes IDs')

const manyProfiles = [
  ...base().profiles,
  ...Array.from({ length: 1001 }, (_, index) => ordinaryProfile('page-' + index)),
]
const paginatedDb = fakeDb({
  profiles: manyProfiles,
  videos: base().videos,
  events: [
    landing('l1', 'browser-1'), result('r1', 'browser-1'),
    owner('o1', 'buyer', 'browser-1'), ...base().shareEvents, ...base().financialEvents,
  ],
})
await collectViralScoreShareSubscription({ db: paginatedDb, generatedAt: new Date(generatedAt) })
ok(paginatedDb.calls.filter((call) => call.table === 'profiles' &&
  call.filters.some(([kind, column]) => kind === 'lte' && column === 'created_at')).length >= 2,
'collector reads the second profile page')

const failingDb = fakeDb({
  profiles: manyProfiles,
  videos: base().videos,
  events: [
    landing('l1', 'browser-1'), result('r1', 'browser-1'),
    owner('o1', 'buyer', 'browser-1'), ...base().shareEvents, ...base().financialEvents,
  ],
}, { failTable: 'profiles', failFrom: 1000 })
await assert.rejects(
  collectViralScoreShareSubscription({ db: failingDb, generatedAt: new Date(generatedAt) }),
  /TEST_PAGE_FAILURE/,
  'collector fails closed on page two',
)
checks += 1

console.log('PASS - ' + checks + '/' + checks + ' Viral Score subscription truth checks')
