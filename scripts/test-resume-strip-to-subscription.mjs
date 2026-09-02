#!/usr/bin/env node
import assert from 'node:assert/strict'
import {
  RESUME_STRIP_CONTRACT_BOUNDARY,
  RESUME_STRIP_REPORT_VERSION,
  buildResumeStripToSubscriptionReport,
} from './resume-strip-to-subscription-report.mjs'
import { collectResumeStripToSubscription, mergeResumeStripRowsById, unwrapResumeStripResult } from './measure-resume-strip-to-subscription.mjs'

let passed = 0
function ok(value, message) { assert.ok(value, message); passed += 1 }
function equal(actual, expected, message) { assert.deepEqual(actual, expected, message); passed += 1 }

const DAY = 86_400_000
const at = (day, minute = 0) => new Date(Date.parse('2026-09-01T12:05:00.000Z') + day * DAY + minute * 60_000).toISOString()
const profile = (id, email = `${id}@example.com`, created_at = at(-10)) => ({ id, email, created_at })
const video = (id, user_id, day, extra = {}) => ({ id, user_id, status: 'completed', video_url: `https://cdn/${id}.mp4`, created_at: at(day), ...extra })
const event = (id, name, user_id, session_id, day, minute, metadata = {}, path = '/') => ({ id, name, user_id, session_id, created_at: at(day, minute), metadata, path })
const seen = (id, user, session, day = 0, minute = 0, metadata = {}) => event(id, 'resume_strip_seen', user, session, day, minute, { episode: 2, video_id: `v-${user}`, ...metadata }, '/')
const click = (id, user, session, day = 0, minute = 1, metadata = {}) => event(id, 'resume_strip_clicked', user, session, day, minute, { episode: 2, video_id: `v-${user}`, ...metadata }, '/')
const land = (id, user, session, day = 0, minute = 2, metadata = {}, path = '/studio/create') => event(id, 'series_continuation_landed', user, session, day, minute, { source: 'landing_resume_strip', prompt_length: 211, ...metadata }, path)
const checkout = (id, user, stripe, day = 1, minute = 0, tier = 'basic', billing = 'monthly') => event(id, 'checkout_started', user, `browser-${user}`, day, minute, { stripe_session_id: stripe, tier, billing }, '/pricing')
const rawCheckout = (id, user, stripe, metadata = {}, day = 1, minute = 0) => event(id, 'checkout_started', user, `browser-${user}`, day, minute, { stripe_session_id: stripe, ...metadata }, '/pricing')
const payment = (id, user, stripe, day = 1, minute = 1, amount = 1500, currency = 'usd') => event(id, 'payment_success', user, null, day, minute, { stripe_session_id: stripe, checkout_mode: 'subscription', amount_total: amount, currency }, '/success')

function build({ people = ['a'], profiles = null, videos = null, events = null, generatedAt = at(10), windowStart = at(-20) } = {}) {
  const ps = profiles ?? people.map((id) => profile(id))
  const vs = videos ?? people.flatMap((id) => [video(`v-${id}`, id, -1), video(`v2-${id}`, id, 0, { created_at: at(0, 3) })])
  const es = events ?? people.flatMap((id) => [
    seen(`seen-${id}`, id, `s-${id}`), click(`click-${id}`, id, `s-${id}`), land(`land-${id}`, id, `s-${id}`),
    checkout(`co-${id}`, id, `cs_${id}`), payment(`pay-${id}`, id, `cs_${id}`),
  ])
  return buildResumeStripToSubscriptionReport({ generatedAt, windowStart, profiles: ps, videos: vs, events: es })
}

equal(RESUME_STRIP_REPORT_VERSION, 'resume_strip_to_subscription_v1', 'version is stable')
equal(RESUME_STRIP_CONTRACT_BOUNDARY, '2026-09-01T12:05:00.000Z', 'boundary is conservative production evidence')

const happy = build()
equal(happy.primaryFunnel.matureExternalFirstVideoExposedPeople, 1, 'one external mature person')
equal(happy.primaryFunnel.resumeStripClickedPeople, 1, 'click counted per person')
equal(happy.primaryFunnel.exactContinuationLandedPeople, 1, 'exact /studio/create landing counted')
equal(happy.primaryFunnel.secondPersistedCompletedVideoAfterLandingPeople, 1, 'second persisted video counted')
equal(happy.primaryFunnel.firstExactRecurringSessionAfterSecondVideo.people, 1, 'one checkout person')
equal(happy.primaryFunnel.firstExactRecurringSessionAfterSecondVideo.stripeSessions, 1, 'one exact Stripe Session')
equal(happy.primaryFunnel.firstExactRecurringSessionAfterSecondVideo.paidPeople, 1, 'paid person counted')
equal(happy.primaryFunnel.firstExactRecurringSessionAfterSecondVideo.revenueMinorByCurrency, { usd: 1500 }, 'minor revenue separated by currency')
equal(happy.gate.state, 'ready_for_reconciliation', 'payment opens reconciliation only')
equal(happy.gate.uiChangeAuthorized, false, 'report never authorizes UI')
ok(!JSON.stringify(happy).includes('a@example.com'), 'output contains no email')
ok(!JSON.stringify(happy).includes('cs_a'), 'output contains no Stripe Session id')
ok(!JSON.stringify(happy).includes('v-a'), 'output contains no video id')

const wrongLandingPath = build({ events: [seen('s','a','x'), click('c','a','x'), land('l','a','x',0,2,{},'/generate')] })
equal(wrongLandingPath.primaryFunnel.exactContinuationLandedPeople, 0, '/generate is not the production landing path')
equal(wrongLandingPath.exclusionsAndQuality.unresolvedJourneyPeople, 1, 'wrong landing path fails closed')

const stringEpisode = build({ events: [seen('s','a','x',0,0,{ episode: '2' })] })
equal(stringEpisode.primaryFunnel.matureExternalFirstVideoExposedPeople, 0, 'string episode is rejected')
equal(stringEpisode.exclusionsAndQuality.unresolvedExposurePeople, 1, 'literal numeric episode required')

const spacedVideo = build({ events: [seen('s','a','x',0,0,{ video_id: ' v-a ' })] })
equal(spacedVideo.primaryFunnel.matureExternalFirstVideoExposedPeople, 0, 'video id is literal')

const wrongSource = build({ events: [seen('s','a','x'), click('c','a','x'), land('l','a','x',0,2,{ source: 'Landing_resume_strip' })] })
equal(wrongSource.primaryFunnel.exactContinuationLandedPeople, 0, 'landing source is exact')

const stringPrompt = build({ events: [seen('s','a','x'), click('c','a','x'), land('l','a','x',0,2,{ prompt_length: '211' })] })
equal(stringPrompt.primaryFunnel.exactContinuationLandedPeople, 0, 'prompt length must be numeric')
equal(stringPrompt.exclusionsAndQuality.unresolvedJourneyPeople, 1, 'invalid prompt clock contract is explicit')

const otherSession = build({ events: [seen('s','a','x'), click('c','a','y'), land('l','a','y')] })
equal(otherSession.primaryFunnel.resumeStripClickedPeople, 0, 'click must share browser session')

const clickTie = build({ events: [seen('s','a','x'), click('c','a','x',0,0)] })
equal(clickTie.primaryFunnel.resumeStripClickedPeople, 0, 'seen/click tie is not strict chronology')
equal(clickTie.exclusionsAndQuality.unresolvedJourneyPeople, 1, 'seen/click tie blocks that journey')

const landingTie = build({ events: [seen('s','a','x'), click('c','a','x'), land('l','a','x',0,1)] })
equal(landingTie.primaryFunnel.exactContinuationLandedPeople, 0, 'click/landing tie is rejected')

const contradictoryLandingTie = build({ events: [
  seen('s','a','x'), click('c','a','x'),
  land('a-valid','a','x'), land('z-invalid','a','x',0,2,{ prompt_length: '211' }),
] })
equal(contradictoryLandingTie.primaryFunnel.exactContinuationLandedPeople, 0, 'conflicting first landing semantics fail closed regardless of id order')
equal(contradictoryLandingTie.exclusionsAndQuality.unresolvedJourneyPeople, 1, 'conflicting first landing semantics remain unresolved')

const noClickLanding = build({ events: [seen('s','a','x'), land('l','a','x')] })
equal(noClickLanding.chronology.exactLandingWithoutRecordedClickPeople, 1, 'landing without recorded click is diagnostic')
equal(noClickLanding.primaryFunnel.exactContinuationLandedPeople, 0, 'landing does not fabricate full chain')

const secondBeforeLanding = build({ events: [seen('s','a','x'), click('c','a','x'), land('l','a','x',0,4)], videos: [video('v-a','a',-1), video('v2-a','a',0,{created_at:at(0,3)})] })
equal(secondBeforeLanding.primaryFunnel.secondPersistedCompletedVideoAfterLandingPeople, 0, 'second video before landing is not attributed')

const secondTie = build({ events: [seen('s','a','x'), click('c','a','x'), land('l','a','x')], videos: [video('v-a','a',-1), video('v2-a','a',0,{created_at:at(0,3)}), video('v3-a','a',0,{created_at:at(0,3)})] })
equal(secondTie.primaryFunnel.secondPersistedCompletedVideoAfterLandingPeople, 0, 'ambiguous second persisted video fails closed')

const twoBeforeSeen = build({ events: [seen('s','a','x')], videos: [video('v-a','a',-2), video('old2','a',-1)] })
equal(twoBeforeSeen.primaryFunnel.matureExternalFirstVideoExposedPeople, 0, 'episode two exposure requires exactly one prior completed video')

const firstTie = build({ events: [seen('s','a','x')], videos: [video('v-a','a',-1), video('other','a',-1)] })
equal(firstTie.exclusionsAndQuality.unresolvedExposurePeople, 1, 'first-video timestamp tie fails closed')

const missingUrl = build({ events: [seen('s','a','x')], videos: [video('v-a','a',-1,{video_url:null})] })
equal(missingUrl.primaryFunnel.matureExternalFirstVideoExposedPeople, 0, 'first video needs URL')

const nullVideoClock = build({ events: [seen('s','a','x')], videos: [video('v-a','a',-1,{created_at:null})] })
equal(nullVideoClock.exclusionsAndQuality.unresolvedExposurePeople, 1, 'null video clock fails closed')

const ownerless = build({ events: [], people: [], profiles: [], videos: [video('orphan',null,0)] })
equal(ownerless.exclusionsAndQuality.ownerlessEligibleCompletedVideoRows, 1, 'eligible ownerless video is visible')
equal(ownerless.gate.state, 'blocked_data_quality', 'eligible ownerless video blocks quality')

const unknownProfile = build({ events: [seen('s','a','x')], profiles: [profile('a','')] })
equal(unknownProfile.primaryFunnel.matureExternalFirstVideoExposedPeople, 0, 'blank profile is excluded')

const conflictingProfile = build({ events: [seen('s','a','x')], profiles: [profile('a','one@example.com'),profile('a','two@example.com')] })
equal(conflictingProfile.exclusionsAndQuality.unresolvedExposurePeople, 1, 'conflicting identity fails closed')

const nullProfileClock = build({ events: [seen('s','a','x')], profiles: [profile('a','a@example.com',null)] })
equal(nullProfileClock.primaryFunnel.matureExternalFirstVideoExposedPeople, 0, 'null profile clock is excluded')

const internal = build({ events: [seen('s','a','x')], profiles: [profile('a','josephsskaf@gmail.com')] })
equal(internal.primaryFunnel.matureExternalFirstVideoExposedPeople, 0, 'internal account excluded')
equal(internal.exclusionsAndQuality.internalSeenRows, 1, 'internal signal remains diagnostic only')

const immature = build({ events: [seen('s','a','x',5)], generatedAt: at(10) })
equal(immature.exclusionsAndQuality.immatureFirstExposurePeople, 1, 'individual seven-day maturity enforced')

const beforeBoundary = build({ events: [seen('s','a','x',-1)] })
equal(beforeBoundary.primaryFunnel.matureExternalFirstVideoExposedPeople, 0, 'pre-boundary exposure excluded')

const preexistingCheckout = build({ events: [checkout('old','a','old',-2), seen('s','a','x')] })
equal(preexistingCheckout.exclusionsAndQuality.preexistingRecurringCheckoutPeople, 1, 'preexisting recurring Session excluded')

const preexistingPaid = build({ events: [checkout('old','a','old',-2), payment('oldp','a','old',-2,1), seen('s','a','x')] })
equal(preexistingPaid.exclusionsAndQuality.preexistingSubscriberPeople, 1, 'preexisting subscriber excluded')

const paymentAtExposure = build({ events: [
  seen('same-time-seen','a','x'), payment('same-time-payment','a','unlinked',0,0),
  click('same-time-click','a','x'), land('same-time-land','a','x'),
  checkout('later-clean-start','a','later-clean',2), payment('later-clean-paid','a','later-clean',2,1),
] })
equal(paymentAtExposure.primaryFunnel.matureExternalFirstVideoExposedPeople, 0, 'subscription payment tied with exposure excludes the acquisition cohort')
equal(paymentAtExposure.exclusionsAndQuality.preexistingSubscriptionUnknownPeople, 1, 'subscription payment tied with exposure is explicit unknown history')
equal(paymentAtExposure.primaryFunnel.firstExactRecurringSessionAfterSecondVideo.stripeSessions, 0, 'later paid Session cannot replace ambiguous payment at exposure')

const nullPaymentOwner = build()
equal(nullPaymentOwner.primaryFunnel.firstExactRecurringSessionAfterSecondVideo.paidPeople, 1, 'null payment user links only through exact Session start')

const invalidPayment = build({ events: [seen('s','a','x'),click('c','a','x'),land('l','a','x'),checkout('co','a','bad'),payment('p','a','bad',1,1,0,'usd')] })
equal(invalidPayment.chronology.totalPostExposureExactRecurring.people, 1, 'invalid payment preserves checkout')
equal(invalidPayment.primaryFunnel.firstExactRecurringSessionAfterSecondVideo.paidPeople, 0, 'invalid payment yields no paid person')
equal(invalidPayment.exclusionsAndQuality.invalidRecurringPaymentPeople, 1, 'invalid payment blocks quality')
equal(invalidPayment.gate.state, 'blocked_data_quality', 'invalid payment is fail closed')

const firstUnpaidLaterPaid = build({ events: [seen('s','a','x'),click('c','a','x'),land('l','a','x'),checkout('co1','a','one'),checkout('co2','a','two',2),payment('p2','a','two',2,1)] })
equal(firstUnpaidLaterPaid.primaryFunnel.firstExactRecurringSessionAfterSecondVideo.paidPeople, 0, 'later paid Session never cleans first unpaid')
equal(firstUnpaidLaterPaid.chronology.laterExactRecurringNotUsedAsPersonAnchor.paidPeople, 1, 'later paid Session remains financial diagnostic')

const sessionTie = build({ events: [seen('s','a','x'),click('c','a','x'),land('l','a','x'),checkout('co1','a','one'),checkout('co2','a','two')] })
equal(sessionTie.chronology.totalPostExposureExactRecurring.stripeSessions, 2, 'tied Sessions stay in total')
equal(sessionTie.primaryFunnel.firstExactRecurringSessionAfterSecondVideo.stripeSessions, 0, 'tied first Sessions produce no primary')
equal(sessionTie.exclusionsAndQuality.ambiguousFirstSessionPeople, 1, 'first Session tie blocks quality')

const checkoutBeforeClick = build({ events: [seen('s','a','x'),checkout('co','a','one',0,0.5),click('c','a','x'),land('l','a','x')] })
equal(checkoutBeforeClick.chronology.firstSessionBeforeClick.people, 1, 'Session before click stays before-click')
equal(checkoutBeforeClick.primaryFunnel.firstExactRecurringSessionAfterSecondVideo.people, 0, 'later stages do not move earlier Session')

const checkoutAtSecond = build({ events: [seen('s','a','x'),click('c','a','x'),land('l','a','x'),checkout('co','a','one',0,3)], videos: [video('v-a','a',-1),video('v2-a','a',0,{created_at:at(0,3)})] })
equal(checkoutAtSecond.chronology.firstSessionAtStageTimestamp.people, 1, 'Session tied to second video is not strict order')

const nullFinanceClock = build({ events: [seen('s','a','x'),click('c','a','x'),land('l','a','x'),checkout('co','a','one'),{...payment('p',null,'one'),created_at:null}] })
equal(nullFinanceClock.exclusionsAndQuality.undatableFinancialClockPeople, 1, 'null financial clock links by exact Session')
equal(nullFinanceClock.gate.state, 'blocked_data_quality', 'null financial clock blocks quality')

for (const [tier, billing] of [['creator','monthly'], ['banana','weekly'], ['autopilot','annual']]) {
  const invalidStart = build({ events: [seen(`s-${tier}-${billing}`,'a','x'),click(`c-${tier}-${billing}`,'a','x'),land(`l-${tier}-${billing}`,'a','x'),checkout(`co-${tier}-${billing}`,'a',`bad-${tier}-${billing}`,1,0,tier,billing),payment(`p-${tier}-${billing}`,'a',`bad-${tier}-${billing}`)] })
  equal(invalidStart.primaryFunnel.firstExactRecurringSessionAfterSecondVideo.stripeSessions, 0, `${tier}/${billing} is not an exact recurring Session`)
  equal(invalidStart.exclusionsAndQuality.invalidRecurringStartPeople, 1, `${tier}/${billing} blocks clean diagnosis`)
  equal(invalidStart.gate.state, 'blocked_data_quality', `${tier}/${billing} fails closed`)
}

for (const [label, badMetadata] of [
  ['missing product fields', {}],
  ['contradictory pack and recurring fields', { sku: 'pack', tier: 'basic', billing: 'monthly' }],
]) {
  const invalidFirstThenPaid = build({ events: [
    seen(`s-${label}`,'a','x'), click(`c-${label}`,'a','x'), land(`l-${label}`,'a','x'),
    rawCheckout(`bad-${label}`,'a',`bad-${label}`,badMetadata),
    checkout(`later-${label}`,'a',`later-${label}`,2), payment(`paid-${label}`,'a',`later-${label}`,2,1),
  ] })
  equal(invalidFirstThenPaid.primaryFunnel.firstExactRecurringSessionAfterSecondVideo.stripeSessions, 0, `${label}: later paid Session never replaces invalid first start`)
  equal(invalidFirstThenPaid.chronology.laterExactRecurringNotUsedAsPersonAnchor.paidPeople, 1, `${label}: later paid Session remains diagnostic`)
  equal(invalidFirstThenPaid.exclusionsAndQuality.invalidRecurringStartPeople, 1, `${label}: invalid first start is explicit`)
  equal(invalidFirstThenPaid.gate.state, 'blocked_data_quality', `${label}: invalid first start fails closed`)

  const invalidBeforeExposure = build({ events: [
    rawCheckout(`prior-${label}`,'a',`prior-${label}`,badMetadata,-2), seen(`seen-${label}`,'a','x'),
  ] })
  equal(invalidBeforeExposure.primaryFunnel.matureExternalFirstVideoExposedPeople, 0, `${label}: prior unknown checkout excludes cohort`)
  equal(invalidBeforeExposure.exclusionsAndQuality.preexistingSubscriptionUnknownPeople, 1, `${label}: prior unknown checkout is explicit`)
}

const unambiguousPackThenPaid = build({ events: [
  seen('pack-s','a','x'), click('pack-c','a','x'), land('pack-l','a','x'),
  rawCheckout('pack-start','a','pack-session',{ sku: 'pack' }),
  checkout('pack-later','a','subscription-session',2), payment('pack-paid','a','subscription-session',2,1),
] })
equal(unambiguousPackThenPaid.primaryFunnel.firstExactRecurringSessionAfterSecondVideo.paidPeople, 1, 'unambiguous pack is ignored before later recurring payment')
equal(unambiguousPackThenPaid.exclusionsAndQuality.invalidRecurringStartPeople, 0, 'unambiguous pack does not block quality')
equal(unambiguousPackThenPaid.exclusionsAndQuality.qualityBlocked, false, 'unambiguous pack preserves a clean cohort')

const packSubscriptionConflictThenPaid = build({ events: [
  seen('pack-conflict-s','a','x'), click('pack-conflict-c','a','x'), land('pack-conflict-l','a','x'),
  rawCheckout('pack-conflict-start','a','pack-conflict-session',{ sku: 'pack' }),
  payment('pack-conflict-payment',null,'pack-conflict-session'),
  checkout('pack-conflict-later','a','pack-conflict-later-session',2),
  payment('pack-conflict-later-paid','a','pack-conflict-later-session',2,1),
] })
equal(packSubscriptionConflictThenPaid.primaryFunnel.firstExactRecurringSessionAfterSecondVideo.stripeSessions, 0, 'pack versus subscription conflict blocks later Session from primary')
equal(packSubscriptionConflictThenPaid.chronology.laterExactRecurringNotUsedAsPersonAnchor.paidPeople, 1, 'later paid Session remains diagnostic after pack conflict')
equal(packSubscriptionConflictThenPaid.exclusionsAndQuality.cohortLedgerConflictStripeSessions, 1, 'pack versus subscription conflict is explicit')
equal(packSubscriptionConflictThenPaid.gate.state, 'blocked_data_quality', 'pack versus subscription conflict fails closed')

const undatablePackPaymentThenPaid = build({ events: [
  seen('undatable-pack-s','a','x'), click('undatable-pack-c','a','x'), land('undatable-pack-l','a','x'),
  rawCheckout('undatable-pack-start','a','undatable-pack-session',{ sku: 'pack' }),
  { ...payment('undatable-pack-payment',null,'undatable-pack-session'), created_at: null },
  checkout('undatable-pack-later','a','undatable-pack-later-session',2),
  payment('undatable-pack-later-paid','a','undatable-pack-later-session',2,1),
] })
equal(undatablePackPaymentThenPaid.primaryFunnel.firstExactRecurringSessionAfterSecondVideo.stripeSessions, 0, 'undatable payment tied to owned pack blocks later Session from primary')
equal(undatablePackPaymentThenPaid.chronology.laterExactRecurringNotUsedAsPersonAnchor.paidPeople, 1, 'later paid remains diagnostic after undatable pack payment')
equal(undatablePackPaymentThenPaid.exclusionsAndQuality.undatableFinancialClockPeople, 1, 'undatable payment tied to owned pack is explicit')
equal(undatablePackPaymentThenPaid.gate.state, 'blocked_data_quality', 'undatable payment tied to owned pack fails closed')

for (const [label, packDay] of [['historical',-2], ['tied',0]]) {
  const undatableOwnedPackThenPaid = build({ events: [
    rawCheckout(`${label}-pack-start`,'a',`${label}-pack-session`,{ sku: 'pack' },packDay),
    { ...payment(`${label}-pack-payment`,null,`${label}-pack-session`), created_at: null },
    seen(`${label}-pack-s`,'a','x'), click(`${label}-pack-c`,'a','x'), land(`${label}-pack-l`,'a','x'),
    checkout(`${label}-pack-later`,'a',`${label}-pack-later-session`,2),
    payment(`${label}-pack-later-paid`,'a',`${label}-pack-later-session`,2,1),
  ] })
  equal(undatableOwnedPackThenPaid.primaryFunnel.firstExactRecurringSessionAfterSecondVideo.stripeSessions, 0, `${label} owned pack with undatable payment blocks later primary`)
  equal(undatableOwnedPackThenPaid.exclusionsAndQuality.undatableFinancialClockPeople, 1, `${label} owned pack links undatable financial evidence`)
  equal(undatableOwnedPackThenPaid.gate.state, 'blocked_data_quality', `${label} owned pack with undatable payment fails closed`)
}

const futureOwnerStart = build({ events: [seen('future-s','a','x'),click('future-c','a','x'),land('future-l','a','x'),payment('future-null-pay',null,'future-session',1),checkout('future-start','a','future-session',8)] })
equal(futureOwnerStart.exclusionsAndQuality.unlinkedRecurringPaymentPeople, 0, 'future checkout cannot retroactively own a null-user payment inside cutoff')
equal(futureOwnerStart.exclusionsAndQuality.qualityBlocked, false, 'future owner evidence does not contaminate fixed cutoff')
equal(futureOwnerStart.primaryFunnel.firstExactRecurringSessionAfterSecondVideo.stripeSessions, 0, 'future checkout stays outside the observation window')

const twoCurrencies = build({ people:['a','b'] })
equal(twoCurrencies.primaryFunnel.firstExactRecurringSessionAfterSecondVideo.revenueMinorByCurrency, { usd: 3000 }, 'same currency sums minor units')

const separatedCurrencies = build({
  people: ['a','b'],
  events: ['a','b'].flatMap((user) => [
    seen(`multi-s-${user}`,user,`multi-${user}`), click(`multi-c-${user}`,user,`multi-${user}`),
    land(`multi-l-${user}`,user,`multi-${user}`), checkout(`multi-co-${user}`,user,`multi-session-${user}`),
    payment(`multi-pay-${user}`,user,`multi-session-${user}`,1,1,user === 'a' ? 1500 : 1200,user === 'a' ? 'usd' : 'eur'),
  ]),
})
equal(separatedCurrencies.primaryFunnel.firstExactRecurringSessionAfterSecondVideo.revenueMinorByCurrency, { eur: 1200, usd: 1500 }, 'different currencies remain separate and sorted')

const enoughNoPayment = build({ people: Array.from({length:20},(_,i)=>`u${i}`), events: Array.from({length:20},(_,i)=>{
  const u=`u${i}`; return [seen(`s${i}`,u,`x${i}`),click(`c${i}`,u,`x${i}`),land(`l${i}`,u,`x${i}`)]
}).flat() })
equal(enoughNoPayment.gate.state, 'ready_for_diagnosis', '20 mature clean exposures open diagnosis')
equal(enoughNoPayment.gate.uiChangeAuthorized, false, 'diagnosis still does not authorize product change')

const invalidLandingThenValid = build({ events: [seen('s','a','x'), click('c','a','x'), land('bad','a','x',0,2,{prompt_length:'211'}), land('good','a','x',0,3)] })
equal(invalidLandingThenValid.primaryFunnel.exactContinuationLandedPeople, 0, 'first invalid landing is never cleaned by a later valid landing')
equal(invalidLandingThenValid.exclusionsAndQuality.unresolvedJourneyPeople, 1, 'first invalid landing remains unresolved')
const preClickLandingThenValid = build({ events: [seen('s','a','x'), land('early','a','x',0,0.5), click('c','a','x'), land('later','a','x',0,2)] })
equal(preClickLandingThenValid.primaryFunnel.exactContinuationLandedPeople, 0, 'pre-click landing is never cleaned by a later valid landing')
equal(preClickLandingThenValid.exclusionsAndQuality.unresolvedJourneyPeople, 1, 'pre-click landing remains unresolved')

const firstConflictLaterPaid = build({
  profiles: [profile('a'), profile('b')],
  events: [seen('s','a','x'), click('c','a','x'), land('l','a','x'), checkout('bad-start','a','cs_bad'), payment('bad-pay','b','cs_bad'), checkout('later-start','a','cs_later',2), payment('later-pay','a','cs_later',2,1)],
})
equal(firstConflictLaterPaid.primaryFunnel.firstExactRecurringSessionAfterSecondVideo.stripeSessions, 0, 'first post-seen conflict produces no primary')
equal(firstConflictLaterPaid.chronology.laterExactRecurringNotUsedAsPersonAnchor.paidPeople, 1, 'later paid remains diagnostic after conflict')
equal(firstConflictLaterPaid.exclusionsAndQuality.cohortLedgerConflictStripeSessions, 1, 'post-seen conflict blocks quality')
const priorOne = checkout('prior-one','a','prior-conflict',-2)
const priorTwoTemplate = checkout('prior-two','a','prior-conflict',-2,1)
const priorTwo = { ...priorTwoTemplate, metadata: { ...priorTwoTemplate.metadata, tier: 'starter' } }
const priorConflict = build({ events: [priorOne, priorTwo, seen('s','a','x')] })
equal(priorConflict.primaryFunnel.matureExternalFirstVideoExposedPeople, 0, 'prior conflict start excludes cohort')
equal(priorConflict.exclusionsAndQuality.preexistingRecurringCheckoutPeople, 1, 'prior conflict start is preexisting checkout')

const paidWithinLaterConflict = build({ profiles:[profile('a'),profile('b')], events:[seen('s','a','x'),click('c','a','x'),land('l','a','x'),checkout('co','a','within'),payment('paid','a','within'),payment('late','b','within',8)] })
equal(paidWithinLaterConflict.primaryFunnel.firstExactRecurringSessionAfterSecondVideo.paidPeople, 1, 'within-cutoff payment remains paid')
equal(paidWithinLaterConflict.exclusionsAndQuality.cohortLedgerConflictStripeSessions, 0, 'after-cutoff conflict does not contaminate')
const unlinkedPayment = build({ events:[seen('s','a','x'),click('c','a','x'),land('l','a','x'),payment('unlinked','a','missing')] })
equal(unlinkedPayment.exclusionsAndQuality.unlinkedRecurringPaymentPeople, 1, 'unlinked external payment is explicit')
equal(unlinkedPayment.gate.state, 'blocked_data_quality', 'unlinked external payment blocks quality')

const orphanBefore = build({ videos:[video('v-a','a',-1),video('v2-a','a',0,{created_at:at(0,3)}),video('orphan',null,-1)] })
equal(orphanBefore.exclusionsAndQuality.ownerlessEligibleCompletedVideoRows, 0, 'ownerless before boundary does not block')
equal(orphanBefore.gate.state, 'ready_for_reconciliation', 'pre-boundary ownerless preserves outcome')
const orphanImmature = build({ videos:[video('v-a','a',-1),video('v2-a','a',0,{created_at:at(0,3)}),video('orphan',null,5)] })
equal(orphanImmature.exclusionsAndQuality.ownerlessEligibleCompletedVideoRows, 0, 'ownerless immature does not block')
equal(orphanImmature.gate.state, 'ready_for_reconciliation', 'immature ownerless preserves outcome')
const orphanMature = build({ videos:[video('v-a','a',-1),video('v2-a','a',0,{created_at:at(0,3)}),video('orphan',null,1)] })
equal(orphanMature.exclusionsAndQuality.ownerlessEligibleCompletedVideoRows, 1, 'ownerless mature in-window is explicit')
equal(orphanMature.gate.state, 'blocked_data_quality', 'ownerless mature in-window blocks')

equal(unwrapResumeStripResult({data:[{id:'ok'}],error:null},'probe'), [{id:'ok'}], 'unwrap accepts array')
assert.throws(() => unwrapResumeStripResult({data:null,error:{code:'PGRST',message:'boom'}},'probe'), /probe: PGRST boom/); passed += 1
assert.throws(() => unwrapResumeStripResult({data:null,error:null},'probe'), /expected an array result/); passed += 1
const merged = mergeResumeStripRowsById([{id:'same',value:'first'},{id:'one'}],[{id:'same',value:'second'},{id:'two'}])
equal(merged.length, 3, 'merge deduplicates by id')
equal(merged.find((row)=>row.id==='same')?.value, 'first', 'merge keeps first duplicate')
assert.throws(() => mergeResumeStripRowsById([{id:''}]), /must have an id/); passed += 1

function mockResumeDb({ rows={}, failKind=null, nonArrayKind=null }={}) {
  const calls=[]
  function from(table) {
    const call={table,select:null,operations:[],kind:null,from:null,to:null}
    const query={
      select(value){call.select=value;return query}, lte(column,value){call.operations.push(['lte',column,value]);return query},
      gte(column,value){call.operations.push(['gte',column,value]);return query}, eq(column,value){call.operations.push(['eq',column,value]);return query},
      is(column,value){call.operations.push(['is',column,value]);return query}, in(column,value){call.operations.push(['in',column,value]);return query},
      order(column,value){call.operations.push(['order',column,value]);return query},
      async range(fromIndex,toIndex){
        call.from=fromIndex;call.to=toIndex
        const nullClock=call.operations.some(([op,column,value])=>op==='is'&&column==='created_at'&&value===null)
        if(table==='profiles') call.kind=nullClock?'profiles_null':'profiles'
        else if(table==='videos') call.kind=nullClock?'videos_null':'videos'
        else { const names=call.operations.find(([op,column])=>op==='in'&&column==='name')?.[2]??[]; const financial=names.includes('checkout_started')||names.includes('payment_success'); call.kind=financial?(nullClock?'financial_null':'financial'):(nullClock?'evidence_null':'evidence') }
        calls.push({...call,operations:call.operations.map((operation)=>[...operation])})
        if(call.kind===failKind) return {data:null,error:{code:'MOCK',message:`${call.kind} failed`}}
        if(call.kind===nonArrayKind) return {data:{not:'array'},error:null}
        return {data:(rows[call.kind]??[]).slice(fromIndex,toIndex+1),error:null}
      },
    }
    return query
  }
  return {db:{from},calls}
}

const loaderMock=mockResumeDb({rows:{profiles:Array.from({length:1001},(_,index)=>profile(`loader-${index}`))}})
const loaderReport=await collectResumeStripToSubscription({db:loaderMock.db,generatedAt:new Date(at(10))})
equal(loaderReport.schemaVersion, RESUME_STRIP_REPORT_VERSION, 'collector returns report')
equal(new Set(loaderMock.calls.map((call)=>call.kind)),new Set(['profiles','profiles_null','videos','videos_null','evidence','evidence_null','financial','financial_null']),'collector executes all eight queries')
equal(loaderMock.calls.filter((call)=>call.kind==='profiles').map((call)=>[call.from,call.to]),[[0,999],[1000,1999]],'collector paginates beyond 1000')
ok(loaderMock.calls.filter((call)=>call.kind.startsWith('videos')).every((call)=>call.select.includes('video_url')),'video selects include video_url')
ok(loaderMock.calls.filter((call)=>call.kind.includes('evidence')||call.kind.includes('financial')).every((call)=>call.select.includes('path')),'event selects include path')
const financialCall=loaderMock.calls.find((call)=>call.kind==='financial')
ok(financialCall.operations.some(([op,column])=>op==='lte'&&column==='created_at'),'financial history has upper bound')
ok(!financialCall.operations.some(([op])=>op==='gte'),'financial history has no gte')
for(const kind of ['profiles_null','videos_null','evidence_null','financial_null']) { const call=loaderMock.calls.find((candidate)=>candidate.kind===kind); ok(call.operations.some(([op,column,value])=>op==='is'&&column==='created_at'&&value===null),`${kind} null-clock branch`) }
const errorMock=mockResumeDb({failKind:'evidence'})
await assert.rejects(collectResumeStripToSubscription({db:errorMock.db,generatedAt:new Date(at(10))}),/bounded resume evidence\[0:999\]: MOCK evidence failed/); passed += 1
const nonArrayMock=mockResumeDb({nonArrayKind:'financial'})
await assert.rejects(collectResumeStripToSubscription({db:nonArrayMock.db,generatedAt:new Date(at(10))}),/all-history financial evidence\[0:999\]: expected an array result/); passed += 1

console.log(`resume-strip-to-subscription: ${passed}/${passed} passed`)
