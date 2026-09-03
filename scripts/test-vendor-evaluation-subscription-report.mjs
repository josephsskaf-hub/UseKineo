#!/usr/bin/env node
import assert from 'node:assert/strict'
import {
  buildVendorEvaluationSubscriptionReport,
  VENDOR_EVALUATION_CAMPAIGN,
  VENDOR_EVALUATION_MEDIUM,
  VENDOR_EVALUATION_SOURCE,
} from './vendor-evaluation-subscription-report.mjs'
import { collectVendorEvaluationSubscription } from './measure-vendor-evaluation-subscription.mjs'

let checks = 0
const check = (actual, expected, label) => { assert.deepEqual(actual, expected, label); checks += 1 }
const T = {
  landing: '2026-09-01T00:00:00.000Z', profile: '2026-09-01T00:01:00.000Z',
  brief: '2026-09-01T00:02:00.000Z', video: '2026-09-01T00:03:00.000Z',
  start: '2026-09-01T00:04:00.000Z', paid: '2026-09-01T00:05:00.000Z',
  generated: '2026-09-10T00:00:00.000Z', window: '2026-08-11T00:00:00.000Z',
}
const profile = (id, extra = {}) => ({
  id, email: id + '@business.example', created_at: T.profile,
  signup_utm_source: VENDOR_EVALUATION_SOURCE, signup_utm_medium: VENDOR_EVALUATION_MEDIUM,
  signup_utm_campaign: VENDOR_EVALUATION_CAMPAIGN, plan: 'free', is_pro: false, ...extra,
})
const event = (id, name, userId, sessionId, createdAt, metadata = {}, path = null) =>
  ({ id, name, user_id: userId, session_id: sessionId, created_at: createdAt, metadata, path })
const landing = (id, sessionId, createdAt = T.landing) => event(id, 'landing_session_started', null, sessionId, createdAt, {
  utm_source: VENDOR_EVALUATION_SOURCE, utm_medium: VENDOR_EVALUATION_MEDIUM, utm_campaign: VENDOR_EVALUATION_CAMPAIGN,
}, '/client-video-brief-generator')
const owner = (id, userId, sessionId) => event(id, 'organic_signup_completed', userId, sessionId, T.profile)
const brief = (id, sessionId) => event(id, 'client_short_brief_generated', null, sessionId, T.brief, {
  version: 'client_short_brief_v1', surface: 'client_video_brief_generator',
})
const video = (userId) => ({ id: 'v_' + userId, user_id: userId, status: 'completed', created_at: T.video })
const start = (id, userId, stripe, sessionId = 'browser') => event(id, 'checkout_started', userId, sessionId, T.start, {
  stripe_session_id: stripe, tier: 'starter', billing: 'monthly',
})
const paid = (id, userId, stripe, amount = 1500) => event(id, 'payment_success', userId, null, T.paid, {
  stripe_session_id: stripe, checkout_mode: 'subscription', amount_total: amount, currency: 'usd',
})
const build = (overrides = {}) => buildVendorEvaluationSubscriptionReport({
  generatedAt: T.generated, windowStart: T.window,
  landingEvents: [], sessionEvents: [], financialEvents: [], profiles: [], videos: [], ...overrides,
})

const clean = build({
  landingEvents: [landing('l1', 's1')],
  sessionEvents: [landing('l1', 's1'), brief('b1', 's1'), owner('o1', 'buyer', 's1')],
  financialEvents: [start('c1', 'buyer', 'cs_1'), paid('p1', 'buyer', 'cs_1')],
  profiles: [profile('buyer', { is_pro: true, stripe_subscription_id: 'sub_1' })],
  videos: [video('buyer')],
})
check(clean.funnel.externalAttributedPeople, 1, 'one external attributed person')
check(clean.funnel.briefGeneratedPeople, 1, 'brief resolved in same browser session')
check(clean.funnel.firstVideoPeople, 1, 'video follows brief')
check(clean.funnel.recurringCheckoutPeople, 1, 'checkout follows video')
check(clean.funnel.exactActiveSubscriberPeople, 1, 'same-Session payment plus active profile')
check(clean.funnel.exactRevenueMinorByCurrency, { usd: 1500 }, 'canonical ledger revenue')
check(clean.gate.state, 'channel_proven_not_causal', 'one payment proves channel, not causality')
check(clean.quality.qualityMet, true, 'clean chain passes quality')

const noBrief = build({
  landingEvents: [landing('l2', 's2')],
  sessionEvents: [landing('l2', 's2'), owner('o2', 'no_brief', 's2')],
  financialEvents: [start('c2', 'no_brief', 'cs_2'), paid('p2', 'no_brief', 'cs_2')],
  profiles: [profile('no_brief', { is_pro: true })], videos: [video('no_brief')],
})
check(noBrief.funnel.firstVideoPeople, 0, 'video without resolved brief is outside strict chain')
check(noBrief.funnel.exactActiveSubscriberPeople, 0, 'payment without brief cannot prove channel')

const wrongPayment = build({
  landingEvents: [landing('l3', 's3')],
  sessionEvents: [landing('l3', 's3'), brief('b3', 's3'), owner('o3', 'wrong', 's3')],
  financialEvents: [start('c3', 'wrong', 'cs_start'), paid('p3', 'wrong', 'cs_other')],
  profiles: [profile('wrong', { is_pro: true })], videos: [video('wrong')],
})
check(wrongPayment.quality.unlinkedSubscriptionPaymentPeople, 1, 'wrong payment Session is visible')
check(wrongPayment.gate.state, 'blocked_quality', 'wrong payment Session blocks decision')

const collision = build({
  landingEvents: [landing('l4', 's4')],
  sessionEvents: [landing('l4', 's4'), brief('b4', 's4'), owner('o4', 'one', 's4')],
  financialEvents: [start('c4', 'one', 'cs_conflict'), start('c5', 'two', 'cs_conflict'), paid('p4', 'one', 'cs_conflict')],
  profiles: [profile('one', { is_pro: true }), profile('two', { signup_utm_campaign: 'other' })],
  videos: [video('one')],
})
check(collision.quality.qualityMet, false, 'cross-owner Stripe Session fails quality')
check(collision.gate.state, 'blocked_quality', 'financial conflict blocks decision')

const people = Array.from({ length: 20 }, (_, index) => profile('m' + index))
const landings = people.map((row, index) => landing('ml' + index, 'ms' + index))
const sessions = people.flatMap((row, index) => [
  landings[index], owner('mo' + index, row.id, 'ms' + index),
  ...(index < 5 ? [brief('mb' + index, 'ms' + index)] : []),
])
const stopped = build({ landingEvents: landings, sessionEvents: sessions, profiles: people, videos: [] })
check(stopped.funnel.matureExternalPeople, 20, 'gate counts mature people')
check(stopped.funnel.matureBriefGeneratedPeople, 5, 'gate counts mature brief people')
check(stopped.gate.state, 'stop_no_checkout', 'twenty mature plus five briefs and zero checkout stops')

const ambiguousOwner = build({
  landingEvents: [landing('la', 'shared')],
  sessionEvents: [landing('la', 'shared'), owner('oa', 'a', 'shared'), owner('ob', 'b', 'shared')],
  profiles: [profile('a'), profile('b')],
})
check(ambiguousOwner.funnel.externalAttributedPeople, 0, 'multi-owner browser session never becomes person')
check(ambiguousOwner.quality.ownerStateCounts.owner_conflict, 1, 'owner conflict remains visible')
check(ambiguousOwner.gate.state, 'blocked_quality', 'owner conflict blocks decision')
check(clean.note.includes('CSV GET or download is never a person'), true, 'download is explicitly outside denominator')

const wrongBrief = build({
  landingEvents: [landing('lw', 'sw')],
  sessionEvents: [
    landing('lw', 'sw'), owner('ow', 'wrong_brief', 'sw'),
    event('bw', 'client_short_brief_generated', null, 'sw', T.brief, { version: 'legacy', surface: 'other' }),
  ],
  profiles: [profile('wrong_brief')],
})
check(wrongBrief.funnel.briefGeneratedPeople, 0, 'wrong brief contract cannot unlock chain')
check(wrongBrief.quality.invalidBriefContractRows, 1, 'wrong brief contract is visible')
check(wrongBrief.gate.state, 'blocked_quality', 'wrong brief contract blocks decision')

const nullLanding = build({
  landingEvents: [landing('ln', 'sn', null)],
  sessionEvents: [],
  profiles: [],
})
check(nullLanding.quality.undatableExactLandingRows, 1, 'exact landing without clock is visible')
check(nullLanding.gate.state, 'blocked_quality', 'exact landing without clock blocks decision')

const nullOwner = build({
  landingEvents: [landing('lo', 'so')],
  sessionEvents: [landing('lo', 'so'), { ...owner('oo', 'owner_null', 'so'), created_at: null }],
  profiles: [profile('owner_null')],
})
check(nullOwner.quality.ownerStateCounts.owner_clock_unknown, 1, 'owner evidence without clock is visible')
check(nullOwner.gate.state, 'blocked_quality', 'owner clock gap blocks decision')

const missingSession = build({
  landingEvents: [{ ...landing('lms', 'unused'), session_id: null }],
  sessionEvents: [owner('oms', 'false_owner', null)],
  profiles: [profile('false_owner')],
})
check(missingSession.funnel.externalAttributedPeople, 0, 'sessionless landing cannot collect unrelated sessionless owner')
check(missingSession.quality.ownerStateCounts.missing_session_id, 1, 'missing landing session is visible')
check(missingSession.gate.state, 'blocked_quality', 'missing landing session blocks decision')

const nullBrief = build({
  landingEvents: [landing('lnb', 'snb')],
  sessionEvents: [
    landing('lnb', 'snb'), owner('onb', 'null_brief', 'snb'),
    { ...brief('bnb', 'snb'), created_at: null },
  ],
  profiles: [profile('null_brief')],
})
check(nullBrief.quality.undatableValidBriefRows, 1, 'canonical brief without clock is visible')
check(nullBrief.gate.state, 'blocked_quality', 'canonical brief without clock blocks decision')

const malformedStart = build({
  landingEvents: [landing('lm', 'sm')],
  sessionEvents: [landing('lm', 'sm'), brief('bm', 'sm'), owner('om', 'malformed', 'sm')],
  profiles: [profile('malformed')], videos: [video('malformed')],
  financialEvents: [{ ...start('cm', 'malformed', 'cs_m'), metadata: { stripe_session_id: 'cs_m', tier: 'unknown', billing: 'monthly' } }],
})
check(malformedStart.quality.invalidRecurringStartPeople, 1, 'malformed recurring start is visible')
check(malformedStart.gate.state, 'blocked_quality', 'malformed recurring start blocks decision')

const nullFinancial = build({
  landingEvents: [landing('lf', 'sf')],
  sessionEvents: [landing('lf', 'sf'), brief('bf', 'sf'), owner('of', 'null_financial', 'sf')],
  profiles: [profile('null_financial')], videos: [video('null_financial')],
  financialEvents: [{ ...paid('pf', 'null_financial', 'cs_missing'), created_at: null }],
})
check(nullFinancial.quality.undatableFinancialPeople, 1, 'financial evidence without clock is visible')
check(nullFinancial.gate.state, 'blocked_quality', 'financial clock gap blocks decision')

const seededNullFinancial = build({
  landingEvents: [landing('lsf', 'ssf')],
  sessionEvents: [landing('lsf', 'ssf'), brief('bsf', 'ssf'), owner('osf', 'seeded_null', 'ssf')],
  profiles: [profile('seeded_null')], videos: [video('seeded_null')],
  financialEvents: [
    start('csf', 'seeded_null', 'cs_seeded_null'),
    { ...paid('psf', null, 'cs_seeded_null'), created_at: null },
  ],
})
check(seededNullFinancial.quality.undatableSeededFinancialRows, 1, 'session-seeded anonymous finance without clock is visible')
check(seededNullFinancial.gate.state, 'blocked_quality', 'session-seeded anonymous clock gap blocks decision')

const otherOwnerNullFinancial = build({
  landingEvents: [landing('lof', 'sof')],
  sessionEvents: [landing('lof', 'sof'), brief('bof', 'sof'), owner('oof', 'seeded_owner', 'sof')],
  profiles: [profile('seeded_owner'), profile('other_finance', { signup_utm_campaign: 'other' })],
  videos: [video('seeded_owner')],
  financialEvents: [
    start('cof', 'seeded_owner', 'cs_owner_null'),
    { ...paid('pof', 'other_finance', 'cs_owner_null'), created_at: null },
  ],
})
check(otherOwnerNullFinancial.quality.undatableSeededFinancialRows, 1, 'other-owner finance without clock in seeded Session is visible')
check(otherOwnerNullFinancial.gate.state, 'blocked_quality', 'other-owner seeded clock gap blocks decision')

function query(data, options = {}) {
  const chain = {
    select: () => chain, eq: () => chain, gte: () => chain, lte: () => chain,
    in: () => chain, is: () => query([], options), order: () => chain,
    range: async (from, to) => {
      options.ranges?.push([from, to])
      if (options.failAt === from && data.length > from) {
        return { data: null, error: { code: 'PAGE_FAILED', message: 'forced second-page failure' } }
      }
      return { data: data.slice(from, to + 1), error: null }
    },
  }
  return chain
}
const collected = await collectVendorEvaluationSubscription({
  generatedAt: T.generated,
  db: {
    from(table) {
      if (table === 'profiles') return query([profile('loader')])
      if (table === 'videos') return query([])
      if (table === 'events') return query([])
      throw new Error('unexpected table')
    },
  },
})
check(collected.funnel.externalAttributedPeople, 0, 'profile alone does not invent an attributed landing')
check(Object.hasOwn(collected, 'people'), false, 'collector output contains no identities')

const ranges = []
const manyProfiles = Array.from({ length: 1001 }, (_, index) =>
  profile('page_' + index, { signup_utm_campaign: 'other' }))
const paged = await collectVendorEvaluationSubscription({
  generatedAt: T.generated,
  db: {
    from(table) {
      if (table === 'profiles') return query(manyProfiles, { ranges })
      return query([], { ranges })
    },
  },
})
check(paged.funnel.externalAttributedPeople, 0, 'second profile page cannot invent cohort')
check(ranges.some(([from]) => from === 1000), true, 'collector reads a second page')

await assert.rejects(
  () => collectVendorEvaluationSubscription({
    generatedAt: T.generated,
    db: {
      from(table) {
        if (table === 'profiles') return query(manyProfiles, { failAt: 1000 })
        return query([])
      },
    },
  }),
  /PAGE_FAILED forced second-page failure/,
)
checks += 1

console.log('vendor evaluation subscription: ' + checks + '/' + checks)
