#!/usr/bin/env node
import assert from 'node:assert/strict'
import {
  AEO_HOOK_CAMPAIGN,
  AEO_HOOK_LANDING_PATH,
  AEO_HOOK_MEDIUM,
  AEO_HOOK_SOURCE,
  buildAnswerEngineHookSubscriptionReport,
} from './answer-engine-hook-subscription-report.mjs'
import { collectAnswerEngineHookSubscription } from './measure-answer-engine-hook-subscription.mjs'

let checks = 0
const check = (actual, expected, label) => { assert.deepEqual(actual, expected, label); checks += 1 }
const T = {
  landing: '2026-09-01T00:00:00.000Z', result: '2026-09-01T00:01:00.000Z',
  profile: '2026-09-01T00:02:00.000Z', video: '2026-09-01T00:03:00.000Z',
  start: '2026-09-01T00:04:00.000Z', paid: '2026-09-01T00:05:00.000Z',
  generated: '2026-09-10T00:00:00.000Z', window: '2026-08-11T00:00:00.000Z',
}
const event = (id, name, userId, sessionId, createdAt, metadata = {}, path = null) =>
  ({ id, name, user_id: userId, session_id: sessionId, created_at: createdAt, metadata, path })
const landing = (id, sessionId, createdAt = T.landing, overrides = {}) => event(
  id, 'landing_session_started', null, sessionId, createdAt,
  { utm_source: AEO_HOOK_SOURCE, utm_medium: AEO_HOOK_MEDIUM, utm_campaign: AEO_HOOK_CAMPAIGN, ...overrides },
  '/free-hook-generator',
)
const result = (id, sessionId, createdAt = T.result, overrides = {}, path = AEO_HOOK_LANDING_PATH) => event(
  id, 'free_hook_result_generated', null, sessionId, createdAt,
  { version: AEO_HOOK_CAMPAIGN, entry: 'answer_engine', hook_count: 5, ...overrides },
  path,
)
const owner = (id, userId, sessionId, createdAt = T.profile) =>
  event(id, 'organic_signup_completed', userId, sessionId, createdAt)
const profile = (id, overrides = {}) => ({
  id, email: `${id}@creator.example`, created_at: T.profile,
  signup_utm_source: AEO_HOOK_SOURCE, signup_utm_medium: AEO_HOOK_MEDIUM,
  signup_utm_campaign: AEO_HOOK_CAMPAIGN, signup_referrer: 'https://chatgpt.com/',
  plan: 'free', is_pro: false, ...overrides,
})
const video = (userId, createdAt = T.video) =>
  ({ id: `v_${userId}`, user_id: userId, status: 'completed', created_at: createdAt })
const start = (id, userId, stripeSession, createdAt = T.start, overrides = {}) => event(
  id, 'checkout_started', userId, 'browser', createdAt,
  { stripe_session_id: stripeSession, tier: 'starter', billing: 'monthly', ...overrides },
)
const paid = (id, userId, stripeSession, createdAt = T.paid, overrides = {}) => event(
  id, 'payment_success', userId, null, createdAt,
  { stripe_session_id: stripeSession, checkout_mode: 'subscription', amount_total: 1500, currency: 'usd', ...overrides },
)
const build = (overrides = {}) => buildAnswerEngineHookSubscriptionReport({
  generatedAt: T.generated, windowStart: T.window,
  landingEvents: [], sessionEvents: [], financialEvents: [], profiles: [], videos: [], ...overrides,
})

const clean = build({
  landingEvents: [landing('l1', 's1')],
  sessionEvents: [landing('l1', 's1'), result('r1', 's1'), owner('o1', 'buyer', 's1')],
  financialEvents: [start('c1', 'buyer', 'cs_1'), paid('p1', 'buyer', 'cs_1')],
  profiles: [profile('buyer', { is_pro: true, stripe_subscription_id: 'sub_1' })],
  videos: [video('buyer')],
})
check(clean.funnel.externalAttributedPeople, 1, 'one exact external person')
check(clean.funnel.resultGeneratedPeople, 1, 'result belongs to the same browser session')
check(clean.funnel.firstVideoPeople, 1, 'video follows result and signup')
check(clean.funnel.recurringCheckoutPeople, 1, 'recurring checkout follows video')
check(clean.funnel.exactActiveSubscriberPeople, 1, 'same-Session payment plus active profile')
check(clean.funnel.exactPaidStripeSessions, 1, 'one exact paid Stripe Session')
check(clean.funnel.exactRevenueMinorByCurrency, { usd: 1500 }, 'ledger revenue is canonical')
check(clean.funnel.signupReferrerHostCounts, { 'chatgpt.com': 1 }, 'actual referrer host remains separate')
check(clean.gate.state, 'channel_proven_not_causal', 'payment proves revenue, not causal platform attribution')
check(clean.quality.qualityMet, true, 'clean chain passes quality')
check(Object.hasOwn(clean, 'people'), false, 'aggregate output contains no identities')

const legacy = build({
  landingEvents: [landing('ll', 'sl', T.landing, { utm_source: 'seo', utm_campaign: 'push22_hook_generator' })],
  sessionEvents: [owner('ol', 'legacy', 'sl')], profiles: [profile('legacy')],
})
check(legacy.funnel.externalAttributedPeople, 0, 'legacy SEO cohort is not relabelled')

const noResult = build({
  landingEvents: [landing('lnr', 'snr')],
  sessionEvents: [landing('lnr', 'snr'), owner('onr', 'no_result', 'snr')],
  profiles: [profile('no_result')], videos: [video('no_result')],
  financialEvents: [start('cnr', 'no_result', 'cs_nr'), paid('pnr', 'no_result', 'cs_nr')],
})
check(noResult.funnel.resultGeneratedPeople, 0, 'landing without useful result stays pre-activation')
check(noResult.funnel.firstVideoPeople, 0, 'video without result is outside strict chain')
check(noResult.funnel.exactActiveSubscriberPeople, 0, 'payment without result cannot prove this channel')

const anonymousAbandon = build({
  landingEvents: [landing('laa', 'saa')],
  sessionEvents: [landing('laa', 'saa'), result('raa', 'saa')],
})
check(anonymousAbandon.funnel.externalAttributedPeople, 0, 'anonymous abandonment is not a person')
check(anonymousAbandon.quality.ownerStateCounts.owner_unknown, 1, 'anonymous abandonment remains diagnostic')
check(anonymousAbandon.quality.qualityMet, true, 'normal anonymous abandonment does not poison quality')

const defaultRevisit = build({
  landingEvents: [landing('ldr2', 'sdr2')],
  sessionEvents: [
    landing('ldr2', 'sdr2'), result('rdr2', 'sdr2'), owner('odr2', 'default_revisit', 'sdr2'),
    result('rdefault', 'sdr2', '2026-09-01T00:02:01.000Z', { entry: 'default' }),
  ],
  profiles: [profile('default_revisit')], videos: [video('default_revisit')],
})
check(defaultRevisit.quality.invalidResultContractRows, 0, 'legitimate default revisit does not invalidate AEO result')
check(defaultRevisit.funnel.firstVideoPeople, 1, 'exact AEO result remains usable beside default revisit')

const badResult = build({
  landingEvents: [landing('lbr', 'sbr')],
  sessionEvents: [landing('lbr', 'sbr'), result('rbr', 'sbr', T.result, { hook_count: 0 }), owner('obr', 'bad_result', 'sbr')],
  profiles: [profile('bad_result')],
})
check(badResult.quality.invalidResultContractRows, 1, 'invalid result contract is visible')
check(badResult.gate.state, 'blocked_quality', 'invalid result contract blocks decision')

const ambiguousOwner = build({
  landingEvents: [landing('la', 'shared')],
  sessionEvents: [landing('la', 'shared'), result('ra', 'shared'), owner('oa', 'a', 'shared'), owner('ob', 'b', 'shared')],
  profiles: [profile('a'), profile('b')],
})
check(ambiguousOwner.funnel.externalAttributedPeople, 0, 'multi-owner session never becomes a person')
check(ambiguousOwner.quality.ownerStateCounts.owner_conflict, 1, 'owner conflict stays visible')
check(ambiguousOwner.gate.state, 'blocked_quality', 'owner conflict blocks decision')

const missingSession = build({
  landingEvents: [{ ...landing('lms', 'unused'), session_id: null }],
  sessionEvents: [owner('oms', 'false_owner', null)], profiles: [profile('false_owner')],
})
check(missingSession.funnel.externalAttributedPeople, 0, 'sessionless landing cannot acquire an owner')
check(missingSession.quality.ownerStateCounts.missing_session_id, 1, 'missing session is visible')
check(missingSession.gate.state, 'blocked_quality', 'missing session blocks decision')

const nullLanding = build({ landingEvents: [landing('ln', 'sn', null)] })
check(nullLanding.quality.undatableExactLandingRows, 1, 'exact landing without clock is visible')
check(nullLanding.gate.state, 'blocked_quality', 'landing clock gap blocks decision')

const nullResult = build({
  landingEvents: [landing('lnr2', 'snr2')],
  sessionEvents: [landing('lnr2', 'snr2'), result('rnr2', 'snr2', null), owner('onr2', 'null_result', 'snr2')],
  profiles: [profile('null_result')],
})
check(nullResult.quality.undatableExactResultRows, 1, 'exact result without clock is visible')
check(nullResult.gate.state, 'blocked_quality', 'result clock gap blocks decision')

const nullOwner = build({
  landingEvents: [landing('lno', 'sno')],
  sessionEvents: [landing('lno', 'sno'), result('rno', 'sno'), owner('ono', 'null_owner', 'sno', null)],
  profiles: [profile('null_owner')],
})
check(nullOwner.quality.ownerStateCounts.owner_clock_unknown, 1, 'owner clock gap is visible')
check(nullOwner.gate.state, 'blocked_quality', 'owner clock gap blocks decision')

const malformedStart = build({
  landingEvents: [landing('lm', 'sm')],
  sessionEvents: [landing('lm', 'sm'), result('rm', 'sm'), owner('om', 'malformed', 'sm')],
  profiles: [profile('malformed')], videos: [video('malformed')],
  financialEvents: [start('cm', 'malformed', 'cs_m', T.start, { tier: 'unknown' })],
})
check(malformedStart.quality.invalidRecurringStartPeople, 1, 'malformed recurring start is visible')
check(malformedStart.gate.state, 'blocked_quality', 'malformed recurring start blocks decision')

const wrongPayment = build({
  landingEvents: [landing('lwp', 'swp')],
  sessionEvents: [landing('lwp', 'swp'), result('rwp', 'swp'), owner('owp', 'wrong_payment', 'swp')],
  profiles: [profile('wrong_payment', { is_pro: true })], videos: [video('wrong_payment')],
  financialEvents: [start('cwp', 'wrong_payment', 'cs_start'), paid('pwp', 'wrong_payment', 'cs_other')],
})
check(wrongPayment.quality.unlinkedSubscriptionPaymentPeople, 1, 'payment for another Session is visible')
check(wrongPayment.gate.state, 'blocked_quality', 'unlinked payment blocks decision')

const collision = build({
  landingEvents: [landing('lc', 'sc')],
  sessionEvents: [landing('lc', 'sc'), result('rc', 'sc'), owner('oc', 'one', 'sc')],
  profiles: [profile('one', { is_pro: true }), profile('two', { signup_utm_campaign: 'other' })],
  videos: [video('one')],
  financialEvents: [start('cc1', 'one', 'cs_conflict'), start('cc2', 'two', 'cs_conflict'), paid('pc', 'one', 'cs_conflict')],
})
check(collision.quality.financialConflictPeople, 1, 'cross-owner Stripe Session is visible')
check(collision.gate.state, 'blocked_quality', 'Stripe Session collision blocks decision')

const matureProfiles = Array.from({ length: 20 }, (_, index) => profile(`m${index}`))
const matureLandings = matureProfiles.map((row, index) => landing(`ml${index}`, `ms${index}`))
const matureSessions = matureProfiles.flatMap((row, index) => [
  matureLandings[index], result(`mr${index}`, `ms${index}`), owner(`mo${index}`, row.id, `ms${index}`),
])
const stopActivation = build({ landingEvents: matureLandings, sessionEvents: matureSessions, profiles: matureProfiles })
check(stopActivation.funnel.matureExternalPeople, 20, 'gate counts mature people')
check(stopActivation.funnel.matureResultGeneratedPeople, 20, 'gate counts mature useful results')
check(stopActivation.gate.state, 'stop_no_activation', 'twenty mature results and zero videos stop activation path')

const stopCheckout = build({
  landingEvents: matureLandings,
  sessionEvents: matureSessions,
  profiles: matureProfiles,
  videos: matureProfiles.slice(0, 5).map((row) => video(row.id)),
})
check(stopCheckout.funnel.matureFirstVideoPeople, 5, 'gate counts mature video people')
check(stopCheckout.gate.state, 'stop_no_checkout', 'five videos and zero checkout stop checkout path')
check(clean.note.includes('not which answer engine displayed it'), true, 'report does not overclaim platform attribution')

const delayedResult = build({
  landingEvents: [landing('ldr', 'sdr')],
  sessionEvents: [
    landing('ldr', 'sdr'), owner('odr', 'delayed_result', 'sdr', '2026-09-01T00:02:00.000Z'),
    result('rdr', 'sdr', '2026-09-01T00:02:03.000Z'),
  ],
  profiles: [profile('delayed_result')],
  videos: [video('delayed_result', '2026-09-01T00:03:00.000Z')],
})
check(delayedResult.funnel.resultGeneratedPeople, 1, 'async result saved after profile still belongs to session')
check(delayedResult.funnel.firstVideoPeople, 1, 'video must follow both profile and delayed result')

const tooLateResult = build({
  landingEvents: [landing('ltlr', 'stlr')],
  sessionEvents: [
    landing('ltlr', 'stlr'), owner('otlr', 'too_late_result', 'stlr'),
    result('rtlr', 'stlr', '2026-09-01T00:02:06.000Z'),
  ],
  profiles: [profile('too_late_result')],
  videos: [video('too_late_result', '2026-09-01T00:03:00.000Z')],
})
check(tooLateResult.funnel.resultGeneratedPeople, 0, 'result beyond write tolerance is not attributed to signup')
check(tooLateResult.funnel.firstVideoPeople, 0, 'late result cannot unlock the causal video chain')
check(tooLateResult.quality.lateExactResultRows, 1, 'late exact result remains diagnostic')
check(tooLateResult.quality.qualityMet, true, 'later legitimate reuse does not poison data quality')

const equalLandingProfile = build({
  landingEvents: [landing('lelp', 'selp')],
  sessionEvents: [landing('lelp', 'selp'), owner('oelp', 'equal_lp', 'selp', T.landing)],
  profiles: [profile('equal_lp', { created_at: T.landing })],
})
check(equalLandingProfile.funnel.externalAttributedPeople, 0, 'landing and profile timestamp tie is not causal proof')
check(equalLandingProfile.quality.ownerStateCounts.landing_profile_chronology_invalid, 1, 'landing/profile tie is visible')
check(equalLandingProfile.gate.state, 'blocked_quality', 'landing/profile tie blocks decision')

const equalLandingResult = build({
  landingEvents: [landing('lelr', 'selr')],
  sessionEvents: [landing('lelr', 'selr'), result('relr', 'selr', T.landing), owner('oelr', 'equal_lr', 'selr')],
  profiles: [profile('equal_lr')], videos: [video('equal_lr')],
})
check(equalLandingResult.funnel.resultGeneratedPeople, 0, 'landing and result timestamp tie is not a result after landing')
check(equalLandingResult.funnel.firstVideoPeople, 0, 'video without a strictly later result stays outside chain')

const wrongResultPath = build({
  landingEvents: [landing('lwrp', 'swrp')],
  sessionEvents: [
    landing('lwrp', 'swrp'), result('rwrp', 'swrp', T.result, {}, '/other-tool'),
    owner('owrp', 'wrong_result_path', 'swrp'),
  ],
  profiles: [profile('wrong_result_path')],
})
check(wrongResultPath.quality.invalidResultContractRows, 1, 'result from another path cannot enter exact contract')
check(wrongResultPath.gate.state, 'blocked_quality', 'wrong result path blocks decision')

const missingEmail = build({
  landingEvents: [landing('lme', 'sme')],
  sessionEvents: [landing('lme', 'sme'), owner('ome', 'missing_email', 'sme')],
  profiles: [profile('missing_email', { email: null })],
})
check(missingEmail.quality.missingEmailProfileRows, 1, 'attributed profile without email is visible')
check(missingEmail.quality.ownerStateCounts.owner_identity_unknown, 1, 'missing identity is distinct from internal owner')
check(missingEmail.gate.state, 'blocked_quality', 'unknown external identity blocks decision')

const unrelatedMissingEmail = build({
  landingEvents: [landing('lume', 'sume')],
  sessionEvents: [landing('lume', 'sume'), result('rume', 'sume'), owner('oume', 'clean_owner', 'sume')],
  profiles: [
    profile('clean_owner'),
    profile('unrelated_missing', { email: null, signup_utm_campaign: 'another_campaign' }),
  ],
  videos: [video('clean_owner')],
})
check(unrelatedMissingEmail.quality.missingEmailProfileRows, 0, 'unrelated incomplete profile is outside cohort quality')
check(unrelatedMissingEmail.quality.qualityMet, true, 'unrelated identity cannot freeze campaign gate')

const missingProfile = build({
  landingEvents: [landing('lmp', 'smp')],
  sessionEvents: [landing('lmp', 'smp'), owner('omp', 'missing_profile', 'smp')],
})
check(missingProfile.quality.ownerStateCounts.owner_identity_unknown, 1, 'owner without profile is visible')
check(missingProfile.gate.state, 'blocked_quality', 'owner without profile blocks decision')

const unlinkedAttributedProfile = build({ profiles: [profile('unlinked_attributed')] })
check(unlinkedAttributedProfile.quality.unlinkedAttributedProfilePeople, 1, 'attributed profile without observed landing is visible')
check(unlinkedAttributedProfile.gate.state, 'blocked_quality', 'missing attributed landing blocks decision')

const internalOwner = build({
  landingEvents: [landing('lio', 'sio')],
  sessionEvents: [landing('lio', 'sio'), owner('oio', 'internal_owner', 'sio')],
  profiles: [profile('internal_owner', { email: 'test-hook-workbench@shortsforgeai.com' })],
})
check(internalOwner.funnel.externalAttributedPeople, 0, 'internal owner is excluded')
check(internalOwner.quality.ownerStateCounts.owner_internal, 1, 'internal exclusion is explicit')
check(internalOwner.quality.qualityMet, true, 'known internal owner does not poison quality')

const privateReferrer = build({
  landingEvents: [landing('lpr', 'spr')],
  sessionEvents: [landing('lpr', 'spr'), owner('opr', 'private_referrer', 'spr')],
  profiles: [profile('private_referrer', { signup_referrer: 'https://jose.customer-company.example/path' })],
})
check(privateReferrer.funnel.signupReferrerHostCounts, { other: 1 }, 'arbitrary hostname is never emitted')

const paymentTie = build({
  landingEvents: [landing('lpt', 'spt')],
  sessionEvents: [landing('lpt', 'spt'), result('rpt', 'spt'), owner('opt', 'payment_tie', 'spt')],
  profiles: [profile('payment_tie', { is_pro: true })], videos: [video('payment_tie')],
  financialEvents: [
    start('cpt', 'payment_tie', 'cs_pt', T.start),
    paid('ppt', 'payment_tie', 'cs_pt', T.start),
  ],
})
check(paymentTie.funnel.exactActiveSubscriberPeople, 0, 'payment tied with checkout start is not ordered revenue')
check(paymentTie.quality.invalidPaymentChronologyPeople, 1, 'payment/start tie is visible')
check(paymentTie.gate.state, 'blocked_quality', 'payment/start tie blocks decision')

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

const emptyCollected = await collectAnswerEngineHookSubscription({
  generatedAt: T.generated,
  db: { from: () => query([]) },
})
check(emptyCollected.funnel.externalAttributedPeople, 0, 'empty collector never invents a person')
check(Object.hasOwn(emptyCollected, 'people'), false, 'collector output stays aggregate')

const ranges = []
const manyProfiles = Array.from({ length: 1001 }, (_, index) =>
  profile(`page_${index}`, { signup_utm_campaign: 'other' }))
await collectAnswerEngineHookSubscription({
  generatedAt: T.generated,
  db: { from: (table) => table === 'profiles' ? query(manyProfiles, { ranges }) : query([], { ranges }) },
})
check(ranges.some(([from]) => from === 1000), true, 'collector reads a second page')

await assert.rejects(
  () => collectAnswerEngineHookSubscription({
    generatedAt: T.generated,
    db: { from: (table) => table === 'profiles' ? query(manyProfiles, { failAt: 1000 }) : query([]) },
  }),
  /PAGE_FAILED forced second-page failure/,
)
checks += 1

console.log(`answer-engine-hook-subscription: ${checks}/${checks} checks passed`)
