#!/usr/bin/env node
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  DAILY_SHORT_IDEAS_CAMPAIGN,
  DAILY_SHORT_IDEAS_MIN_EXTERNAL_PEOPLE,
  DAILY_SHORT_IDEAS_MIN_TERMINAL_CHECKOUT_PEOPLE,
  DAILY_SHORT_IDEAS_OBSERVATION_DAYS,
  DAILY_SHORT_IDEAS_SOURCE,
  buildDailyShortIdeasSubscriptionReport,
} from './daily-shorts-ideas-subscription-report.mjs'
import { collectDailyShortIdeasSubscription } from './measure-daily-shorts-ideas-subscription.mjs'

const GENERATED_AT = '2026-09-20T12:00:00.000Z'
const WINDOW_START = '2026-08-21T12:00:00.000Z'
const MATURE_LANDING = '2026-09-10T12:00:00.000Z'
const IMMATURE_LANDING = '2026-09-18T12:00:00.000Z'
let checks = 0
const equal = (actual, expected, label) => { assert.deepEqual(actual, expected, label); checks += 1 }
const ok = (value, label) => { assert.ok(value, label); checks += 1 }

function profile(id, email = `${id}@example.com`) {
  return {
    id,
    email,
    created_at: '2026-09-10T12:00:01.000Z',
    signup_utm_source: DAILY_SHORT_IDEAS_SOURCE,
    signup_utm_medium: 'rss',
    signup_utm_campaign: DAILY_SHORT_IDEAS_CAMPAIGN,
    has_paid: false,
    is_pro: false,
    plan: 'free',
    stripe_subscription_id: null,
    paypal_subscription_id: null,
    paddle_subscription_id: null,
  }
}

function landing(id, sessionId, createdAt = MATURE_LANDING, overrides = {}) {
  return {
    id,
    name: 'landing_session_started',
    user_id: null,
    session_id: sessionId,
    path: '/free-script-generator',
    created_at: createdAt,
    metadata: {
      utm_source: DAILY_SHORT_IDEAS_SOURCE,
      utm_medium: 'rss',
      utm_campaign: DAILY_SHORT_IDEAS_CAMPAIGN,
      utm_content: createdAt.slice(0, 10),
    },
    ...overrides,
  }
}

function ownerEvent(id, userId, sessionId, createdAt = MATURE_LANDING) {
  return { id, name: 'signup_completed', user_id: userId, session_id: sessionId, created_at: createdAt, metadata: {} }
}

function start(id, userId, stripeSessionId, createdAt = '2026-09-11T12:00:00.000Z', overrides = {}) {
  return {
    id,
    name: 'checkout_started',
    user_id: userId,
    session_id: `browser-${userId}`,
    created_at: createdAt,
    metadata: {
      stripe_session_id: stripeSessionId,
      tier: 'starter',
      billing: 'monthly',
      checkout_session_window_hours: 24,
      checkout_session_window_version: 'recurring_checkout_24h_v1',
    },
    ...overrides,
  }
}

function payment(id, userId, stripeSessionId, createdAt = '2026-09-11T12:01:00.000Z', overrides = {}) {
  return {
    id,
    name: 'payment_success',
    user_id: userId,
    session_id: `browser-${userId}`,
    created_at: createdAt,
    metadata: { stripe_session_id: stripeSessionId, checkout_mode: 'subscription', amount_total: 990, currency: 'usd' },
    ...overrides,
  }
}

function expiry(id, userId, stripeSessionId, createdAt = '2026-09-11T13:00:00.000Z', overrides = {}) {
  return {
    id,
    name: 'checkout_session_expired',
    user_id: userId,
    session_id: `browser-${userId}`,
    created_at: createdAt,
    metadata: {
      stripe_session_id: stripeSessionId,
      checkout_mode: 'subscription',
      tier: 'starter',
      billing: 'monthly',
      payment_status: 'unpaid',
      checkout_session_window_hours: 24,
      checkout_session_window_version: 'recurring_checkout_24h_v1',
    },
    ...overrides,
  }
}

function report({ landingEvents = [], sessionEvents = [], financialEvents = [], profiles = [] } = {}) {
  return buildDailyShortIdeasSubscriptionReport({
    generatedAt: GENERATED_AT,
    windowStart: WINDOW_START,
    landingEvents,
    sessionEvents,
    financialEvents,
    profiles,
  })
}

function fakeDatabase({ landingRows = [], profileRows = [], financialRows = [], browserSessionRows = [], failTable = null }) {
  const calls = []
  return {
    calls,
    from(table) {
      const filters = []
      const query = {
        select(columns) { filters.push(['select', columns]); return query },
        eq(column, value) { filters.push(['eq', column, value]); return query },
        gte(column, value) { filters.push(['gte', column, value]); return query },
        lte(column, value) { filters.push(['lte', column, value]); return query },
        is(column, value) { filters.push(['is', column, value]); return query },
        in(column, value) { filters.push(['in', column, value]); return query },
        order(column, options) { filters.push(['order', column, options]); return query },
        range(from, to) {
          calls.push({ table, filters: structuredClone(filters), from, to })
          if (table === failTable) return Promise.resolve({ data: null, error: { code: 'FAKE', message: 'fixture failure' } })
          let rows
          if (table === 'profiles') rows = profileRows
          else if (filters.some(([kind, column, value]) => kind === 'eq' && column === 'name' && value === 'landing_session_started')) rows = landingRows
          else if (filters.some(([kind, column]) => kind === 'in' && column === 'session_id')) rows = browserSessionRows
          else rows = financialRows
          const wantsNullClock = filters.some(([kind, column]) => kind === 'is' && column === 'created_at')
          rows = rows.filter((row) => wantsNullClock ? row.created_at === null : row.created_at !== null)
          const lowerClock = filters.find(([kind, column]) => kind === 'gte' && column === 'created_at')?.[2]
          const upperClock = filters.find(([kind, column]) => kind === 'lte' && column === 'created_at')?.[2]
          if (lowerClock) rows = rows.filter((row) => row.created_at >= lowerClock)
          if (upperClock) rows = rows.filter((row) => row.created_at <= upperClock)
          const sessionFilter = filters.find(([kind, column]) => kind === 'in' && column === 'session_id')
          if (sessionFilter) rows = rows.filter((row) => sessionFilter[2].includes(row.session_id))
          return Promise.resolve({ data: rows.slice(from, to + 1), error: null })
        },
      }
      return query
    },
  }
}

equal(DAILY_SHORT_IDEAS_OBSERVATION_DAYS, 7, 'each person receives seven observation days')
equal(DAILY_SHORT_IDEAS_MIN_EXTERNAL_PEOPLE, 20, 'commercial gate requires twenty external people')
equal(DAILY_SHORT_IDEAS_MIN_TERMINAL_CHECKOUT_PEOPLE, 5, 'commercial gate requires five terminal checkout people')
assert.throws(() => buildDailyShortIdeasSubscriptionReport({ generatedAt: 'bad', windowStart: WINDOW_START, landingEvents: [], sessionEvents: [], financialEvents: [], profiles: [] }), /valid ordered/); checks += 1
assert.throws(() => buildDailyShortIdeasSubscriptionReport({ generatedAt: GENERATED_AT, windowStart: WINDOW_START, landingEvents: null, sessionEvents: [], financialEvents: [], profiles: [] }), /must be arrays/); checks += 1

const paid = report({
  landingEvents: [landing('l1', 'feed-1')],
  sessionEvents: [ownerEvent('o1', 'person-1', 'feed-1')],
  financialEvents: [start('s1', 'person-1', 'cs_1'), payment('p1', 'person-1', 'cs_1')],
  profiles: [{ ...profile('person-1'), has_paid: true, plan: 'starter', stripe_subscription_id: 'sub_after_feed' }],
})
equal(paid.discovery.exactLandingSessions, 1, 'one exact feed session is diagnostic')
equal(paid.cohort.resolvedExternalPeople, 1, 'anonymous landing resolves to one external person')
equal(paid.cohort.matureExternalPeople, 1, 'old landing is individually mature')
equal(paid.cohort.checkoutPeople, 1, 'person with recurring start is counted once')
equal(paid.cohort.checkoutStripeSessions, 1, 'checkout Session is a separate unit')
equal(paid.cohort.terminalCheckoutPeople, 1, 'paid checkout is terminal')
equal(paid.cohort.paidPeople, 1, 'same-Session payment counts one buyer')
equal(paid.cohort.paidStripeSessions, 1, 'same-Session payment counts one paid Session')
equal(paid.cohort.revenueMinorByCurrency, { usd: 990 }, 'revenue is exact minor units by currency')
equal(paid.gate.state, 'collecting', 'one buyer never satisfies the sample gate')
ok(paid.note.includes('do not prove causal lift'), 'report forbids causal claims')
const paidJson = JSON.stringify(paid)
ok(!paidJson.includes('person-1') && !paidJson.includes('feed-1') && !paidJson.includes('cs_1'), 'aggregate output leaks no person, browser or Stripe identifiers')

const anonymous = report({ landingEvents: [landing('la', 'anon')], sessionEvents: [], profiles: [] })
equal(anonymous.cohort.resolvedExternalPeople, 0, 'anonymous session is never a person')
equal(anonymous.quality.anonymousLandingSessions, 1, 'anonymous session remains a quality diagnostic')
equal(anonymous.quality.attributionQualityMet, true, 'anonymous demand does not poison identified outcomes')

const futureProfile = report({
  landingEvents: [landing('lfp', 'future-profile-session')],
  sessionEvents: [ownerEvent('ofp', 'future-profile-person', 'future-profile-session')],
  profiles: [{ ...profile('future-profile-person'), created_at: '2026-09-21T12:00:00.000Z' }],
})
equal(futureProfile.cohort.resolvedExternalPeople, 0, 'profile created after generatedAt cannot rewrite a historical acquisition cohort')
equal(futureProfile.quality.profileFuturePeople, 1, 'future profile is disclosed as a data-quality conflict')
equal(futureProfile.gate.state, 'blocked_data_quality', 'future profile fails the historical report closed')

const internal = report({
  landingEvents: [landing('li', 'internal-session')],
  sessionEvents: [ownerEvent('oi', 'internal-person', 'internal-session')],
  profiles: [profile('internal-person', 'josephsskaf@gmail.com')],
})
equal(internal.cohort.resolvedExternalPeople, 0, 'canonical internal account is excluded')
equal(internal.quality.internalLandingSessions, 1, 'internal landing is disclosed separately')

const wrongSource = landing('lw', 'wrong-source')
wrongSource.metadata.utm_source = 'newsletter'
const wrongCampaign = landing('lwc', 'wrong-campaign')
wrongCampaign.metadata.utm_campaign = 'daily_shorts_ideas_v0'
const wrongPath = landing('lwp', 'wrong-path', MATURE_LANDING, { path: '/pricing' })
const ignored = report({
  landingEvents: [wrongSource, wrongCampaign, wrongPath],
  sessionEvents: [ownerEvent('ow', 'person-w', 'wrong-source')],
  profiles: [profile('person-w')],
})
equal(ignored.discovery.exactLandingRows, 0, 'source, campaign and path must all match')

const googleProfile = {
  ...profile('person-google'),
  created_at: '2026-08-01T00:00:00.000Z',
  signup_utm_source: 'google',
  signup_utm_medium: 'organic',
  signup_utm_campaign: 'seo',
}
const returningGoogle = report({
  landingEvents: [landing('lg', 'feed-google')],
  sessionEvents: [ownerEvent('og', 'person-google', 'feed-google')],
  profiles: [googleProfile],
})
equal(returningGoogle.discovery.resolvedExternalVisitorPeople, 1, 'known returning visitor remains visible')
equal(returningGoogle.discovery.returningOrOtherSourcePeople, 1, 'other first-touch source is a separate diagnostic')
equal(returningGoogle.cohort.resolvedExternalPeople, 0, 'returning Google account is never relabeled as feed acquisition')

const sourceTimelineProfile = { ...profile('person-source-old'), created_at: '2026-08-01T00:00:00.000Z' }
const sourceTimeline = report({
  landingEvents: [landing('lst', 'feed-source-old')],
  sessionEvents: [ownerEvent('ost', 'person-source-old', 'feed-source-old')],
  profiles: [sourceTimelineProfile],
})
equal(sourceTimeline.cohort.resolvedExternalPeople, 0, 'profile created before the feed landing cannot be a new feed acquisition')
equal(sourceTimeline.discovery.returningSameSourcePeople, 1, 'same-source return is disclosed separately')
equal(sourceTimeline.quality.attributionQualityMet, true, 'legitimate same-source return does not poison data quality')
equal(sourceTimeline.gate.state, 'collecting', 'same-source return stays outside the new-acquisition gate')

const paidWithoutLedgerProfile = {
  ...profile('person-paid-state'),
  has_paid: true,
  plan: 'pro',
  stripe_subscription_id: 'sub_existing',
}
const paidWithoutLedger = report({
  landingEvents: [landing('l-paid-state', 'feed-paid-state')],
  sessionEvents: [ownerEvent('o-paid-state', 'person-paid-state', 'feed-paid-state')],
  profiles: [paidWithoutLedgerProfile],
})
equal(paidWithoutLedger.cohort.resolvedExternalPeople, 0, 'paid profile without exact Session never enters acquisition cohort')
equal(paidWithoutLedger.quality.paidProfileWithoutExactSessionPeople, 1, 'unreconciled paid profile is disclosed')
equal(paidWithoutLedger.gate.state, 'blocked_data_quality', 'unreconciled paid state blocks diagnosis')

const packBuyerProfile = { ...profile('person-pack-buyer'), has_paid: true, plan: 'free' }
const packBuyer = report({
  landingEvents: [landing('l-pack-buyer', 'feed-pack-buyer')],
  sessionEvents: [ownerEvent('o-pack-buyer', 'person-pack-buyer', 'feed-pack-buyer')],
  profiles: [packBuyerProfile],
})
equal(packBuyer.cohort.resolvedExternalPeople, 1, 'has_paid alone does not pretend a pack buyer is a subscriber')
equal(packBuyer.cohort.paidOnlyProfilePeople, 1, 'pack-or-paid-history profile remains a separate diagnostic')
equal(packBuyer.quality.attributionQualityMet, true, 'one-time paid history does not block subscription diagnosis')

const repeated = report({
  landingEvents: [landing('lr1', 'repeat-1'), landing('lr2', 'repeat-2', '2026-09-12T12:00:00.000Z')],
  sessionEvents: [ownerEvent('or1', 'person-r', 'repeat-1'), ownerEvent('or2', 'person-r', 'repeat-2')],
  profiles: [profile('person-r')],
})
equal(repeated.discovery.exactLandingSessions, 2, 'two feed sessions remain visible')
equal(repeated.cohort.resolvedExternalPeople, 1, 'returning person is deduplicated')

const tied = report({
  landingEvents: [landing('lt1', 'tie-1'), landing('lt2', 'tie-2')],
  sessionEvents: [ownerEvent('ot1', 'person-t', 'tie-1'), ownerEvent('ot2', 'person-t', 'tie-2')],
  profiles: [profile('person-t')],
})
equal(tied.cohort.resolvedExternalPeople, 0, 'simultaneous first sessions are not selected arbitrarily')
equal(tied.quality.ambiguousFirstLandingPeople, 1, 'simultaneous first sessions are disclosed')
equal(tied.gate.state, 'blocked_data_quality', 'ambiguous first attribution blocks diagnosis')

const packStart = start('sp', 'person-pack', 'cs_pack', undefined, { metadata: { stripe_session_id: 'cs_pack', sku: 'starter_pack' } })
const pack = report({
  landingEvents: [landing('lp', 'feed-pack')],
  sessionEvents: [ownerEvent('op', 'person-pack', 'feed-pack')],
  financialEvents: [packStart],
  profiles: [profile('person-pack')],
})
equal(pack.cohort.checkoutPeople, 0, 'one-time pack never becomes subscription checkout')

const open = report({
  landingEvents: [landing('lo', 'feed-open')],
  sessionEvents: [ownerEvent('oo', 'person-open', 'feed-open')],
  financialEvents: [start('so', 'person-open', 'cs_open', '2026-09-17T06:00:00.000Z')],
  profiles: [profile('person-open')],
})
equal(open.cohort.checkoutPeople, 1, 'open recurring checkout is counted')
equal(open.cohort.terminalCheckoutPeople, 0, 'open Session is not terminal')
equal(open.cohort.openStripeSessions, 1, 'open Session remains explicit')

const expired = report({
  landingEvents: [landing('le', 'feed-expired')],
  sessionEvents: [ownerEvent('oe', 'person-expired', 'feed-expired')],
  financialEvents: [start('se', 'person-expired', 'cs_expired'), expiry('ee', 'person-expired', 'cs_expired')],
  profiles: [profile('person-expired')],
})
equal(expired.cohort.expiredUnpaidPeople, 1, 'same-Session expiry counts one unpaid person')
equal(expired.cohort.expiredUnpaidStripeSessions, 1, 'same-Session expiry counts one Session')
equal(expired.cohort.terminalCheckoutPeople, 1, 'expiry is a terminal checkout outcome')

const noPaymentRequiredExpiry = expiry('enpr', 'person-npr', 'cs_npr', undefined, {
  metadata: {
    stripe_session_id: 'cs_npr', checkout_mode: 'subscription', tier: 'starter', billing: 'monthly',
    payment_status: 'no_payment_required', checkout_session_window_hours: 24,
    checkout_session_window_version: 'recurring_checkout_24h_v1',
  },
})
const noPaymentRequired = report({
  landingEvents: [landing('lnpr', 'feed-npr')],
  sessionEvents: [ownerEvent('onpr', 'person-npr', 'feed-npr')],
  financialEvents: [start('snpr', 'person-npr', 'cs_npr'), noPaymentRequiredExpiry],
  profiles: [profile('person-npr')],
})
equal(noPaymentRequired.cohort.terminalCheckoutPeople, 0, 'no-payment-required expiry is never abandonment')
equal(noPaymentRequired.quality.financialConflictPeople, 1, 'non-unpaid expiry fails closed for this contract')

const lateExpiry = report({
  landingEvents: [landing('llate-expiry', 'feed-late-expiry')],
  sessionEvents: [ownerEvent('olate-expiry', 'person-late-expiry', 'feed-late-expiry')],
  financialEvents: [
    start('slate-expiry', 'person-late-expiry', 'cs_late_expiry', '2026-09-17T06:00:00.000Z'),
    expiry('elate-expiry', 'person-late-expiry', 'cs_late_expiry', '2026-09-19T12:00:00.000Z'),
  ],
  profiles: [profile('person-late-expiry')],
})
equal(lateExpiry.cohort.terminalCheckoutPeople, 0, 'expiry after seven days cannot open the terminal gate')
equal(lateExpiry.cohort.expiredUnpaidAfterObservationStripeSessions, 1, 'late expiry remains a separate diagnostic')

const mismatchedExpiry = expiry('emismatch', 'person-expiry-mismatch', 'cs_expiry_mismatch', undefined, {
  metadata: {
    stripe_session_id: 'cs_expiry_mismatch', checkout_mode: 'subscription', tier: 'pro', billing: 'monthly',
    payment_status: 'unpaid', checkout_session_window_hours: 24,
    checkout_session_window_version: 'recurring_checkout_24h_v1',
  },
})
const expiryContractMismatch = report({
  landingEvents: [landing('lemismatch', 'feed-expiry-mismatch')],
  sessionEvents: [ownerEvent('oemismatch', 'person-expiry-mismatch', 'feed-expiry-mismatch')],
  financialEvents: [start('semismatch', 'person-expiry-mismatch', 'cs_expiry_mismatch'), mismatchedExpiry],
  profiles: [profile('person-expiry-mismatch')],
})
equal(expiryContractMismatch.cohort.terminalCheckoutPeople, 0, 'mismatched expiry never becomes a terminal outcome')
equal(expiryContractMismatch.gate.state, 'blocked_data_quality', 'mismatched expiry contract blocks diagnosis')

const wrongPaymentSession = report({
  landingEvents: [landing('lps', 'feed-payment-wrong')],
  sessionEvents: [ownerEvent('ops', 'person-payment-wrong', 'feed-payment-wrong')],
  financialEvents: [start('sps', 'person-payment-wrong', 'cs_expected'), payment('pps', 'person-payment-wrong', 'cs_other')],
  profiles: [profile('person-payment-wrong')],
})
equal(wrongPaymentSession.cohort.paidPeople, 0, 'payment for another Stripe Session is never attributed')
equal(wrongPaymentSession.cohort.openStripeSessions, 0, 'missing terminal webhook is not mislabeled as an open Session')
equal(wrongPaymentSession.cohort.revenueMinorByCurrency, {}, 'wrong-Session payment contributes zero revenue')
equal(wrongPaymentSession.gate.state, 'blocked_data_quality', 'missing terminal signal fails closed')

const beforeFeedStart = start('s-before-feed', 'person-before-feed', 'cs_before_feed', '2026-09-09T12:00:00.000Z')
const retryAfterFeed = start('s-retry-after-feed', 'person-before-feed', 'cs_before_feed', '2026-09-11T12:00:00.000Z')
const preexistingCheckout = report({
  landingEvents: [landing('l-before-feed', 'feed-before-checkout')],
  sessionEvents: [ownerEvent('o-before-feed', 'person-before-feed', 'feed-before-checkout')],
  financialEvents: [beforeFeedStart, retryAfterFeed],
  profiles: [profile('person-before-feed')],
})
equal(preexistingCheckout.cohort.checkoutPeople, 0, 'retry cannot attribute a Stripe Session first opened before the feed landing')
equal(preexistingCheckout.cohort.checkoutStripeSessions, 0, 'preexisting Stripe Session is excluded as a session too')

const latePayment = report({
  landingEvents: [landing('l-late', 'feed-late')],
  sessionEvents: [ownerEvent('o-late', 'person-late', 'feed-late')],
  financialEvents: [
    start('s-late', 'person-late', 'cs_late', '2026-09-17T06:00:00.000Z'),
    payment('p-late', 'person-late', 'cs_late', '2026-09-19T12:01:00.000Z'),
  ],
  profiles: [profile('person-late')],
})
equal(latePayment.cohort.checkoutPeople, 1, 'checkout inside observation remains attributed')
equal(latePayment.cohort.paidPeople, 0, 'payment after seven days is not attributed to the observation window')
equal(latePayment.cohort.paidAfterObservationStripeSessions, 1, 'late payment remains a separate diagnostic')
equal(latePayment.quality.attributionQualityMet, true, 'late payment is an outcome, not corrupt data')

const duplicatePayment = report({
  landingEvents: [landing('ldp', 'feed-duplicate-payment')],
  sessionEvents: [ownerEvent('odp', 'person-dp', 'feed-duplicate-payment')],
  financialEvents: [
    start('sdp', 'person-dp', 'cs_dp'),
    payment('pdp1', 'person-dp', 'cs_dp'),
    payment('pdp2', 'person-dp', 'cs_dp', '2026-09-11T12:02:00.000Z'),
  ],
  profiles: [profile('person-dp')],
})
equal(duplicatePayment.cohort.paidStripeSessions, 1, 'duplicate webhook row never duplicates paid Session')
equal(duplicatePayment.cohort.revenueMinorByCurrency, { usd: 990 }, 'duplicate webhook row never duplicates revenue')

const conflictingPayment = payment('pc2', 'person-conflict', 'cs_conflict', '2026-09-11T12:02:00.000Z', {
  metadata: { stripe_session_id: 'cs_conflict', checkout_mode: 'subscription', amount_total: 1290, currency: 'usd' },
})
const conflict = report({
  landingEvents: [landing('lc', 'feed-conflict')],
  sessionEvents: [ownerEvent('oc', 'person-conflict', 'feed-conflict')],
  financialEvents: [start('sc', 'person-conflict', 'cs_conflict'), payment('pc1', 'person-conflict', 'cs_conflict'), conflictingPayment],
  profiles: [profile('person-conflict')],
})
equal(conflict.cohort.resolvedExternalPeople, 0, 'financial conflict is excluded from the valid cohort')
equal(conflict.quality.financialConflictPeople, 1, 'financial conflict is disclosed by person')
equal(conflict.gate.state, 'blocked_data_quality', 'financial conflict blocks diagnosis')
equal(conflict.cohort.revenueMinorByCurrency, {}, 'conflicting amount contributes zero revenue')

const ownerConflict = report({
  landingEvents: [landing('loc', 'feed-owner-conflict')],
  sessionEvents: [ownerEvent('ooc1', 'person-owner-a', 'feed-owner-conflict'), ownerEvent('ooc2', 'person-owner-b', 'feed-owner-conflict')],
  profiles: [profile('person-owner-a'), profile('person-owner-b')],
})
equal(ownerConflict.cohort.resolvedExternalPeople, 0, 'multi-owner browser session is excluded')
equal(ownerConflict.quality.conflictingIdentityLandingSessions, 1, 'multi-owner session is disclosed')
equal(ownerConflict.gate.state, 'blocked_data_quality', 'identity collision blocks diagnosis')

const noClockOwner = report({
  landingEvents: [landing('l-owner-clock', 'feed-owner-clock')],
  sessionEvents: [ownerEvent('o-owner-clock', 'person-owner-clock', 'feed-owner-clock', null)],
  profiles: [profile('person-owner-clock')],
})
equal(noClockOwner.cohort.resolvedExternalPeople, 0, 'owner evidence without clock never resolves a person')
equal(noClockOwner.quality.ownerClockUnknownLandingSessions, 1, 'owner evidence without clock is disclosed')
equal(noClockOwner.gate.state, 'blocked_data_quality', 'owner evidence without clock blocks diagnosis')

const futureOwner = report({
  landingEvents: [landing('l-owner-future', 'feed-owner-future')],
  sessionEvents: [ownerEvent('o-owner-future', 'person-owner-future', 'feed-owner-future', '2026-09-21T00:00:00.000Z')],
  profiles: [profile('person-owner-future')],
})
equal(futureOwner.cohort.resolvedExternalPeople, 0, 'future owner evidence cannot rewrite a historical report')
equal(futureOwner.quality.anonymousLandingSessions, 1, 'future-only owner remains unresolved at cutoff')

const missingStripe = start('sms', 'person-ms', 'ignored', undefined, { metadata: { tier: 'starter', billing: 'monthly' } })
const missingSession = report({
  landingEvents: [landing('lms', 'feed-ms')],
  sessionEvents: [ownerEvent('oms', 'person-ms', 'feed-ms')],
  financialEvents: [missingStripe],
  profiles: [profile('person-ms')],
})
equal(missingSession.quality.financialRowsWithoutStripeSessionPeople, 1, 'subscription start without Stripe id is disclosed')
equal(missingSession.gate.state, 'blocked_data_quality', 'missing financial key blocks diagnosis')

const invalidStart = start('sinvalid', 'person-invalid', 'cs_invalid', undefined, {
  metadata: { stripe_session_id: 'cs_invalid', tier: 'starter' },
})
const invalidRecurring = report({
  landingEvents: [landing('linvalid', 'feed-invalid')],
  sessionEvents: [ownerEvent('oinvalid', 'person-invalid', 'feed-invalid')],
  financialEvents: [invalidStart],
  profiles: [profile('person-invalid')],
})
equal(invalidRecurring.quality.invalidRecurringStartPeople, 1, 'malformed recurring start is disclosed')
equal(invalidRecurring.gate.state, 'blocked_data_quality', 'malformed recurring start blocks diagnosis')

const sameClock = report({
  landingEvents: [landing('lsame', 'feed-same')],
  sessionEvents: [ownerEvent('osame', 'person-same', 'feed-same')],
  financialEvents: [start('ssame', 'person-same', 'cs_same', MATURE_LANDING)],
  profiles: [profile('person-same')],
})
equal(sameClock.quality.nonOrderedFinancialPeople, 1, 'same-clock landing and checkout are not ordered')
equal(sameClock.gate.state, 'blocked_data_quality', 'same-clock attribution blocks diagnosis')

const noClockFinancial = report({
  landingEvents: [landing('lnoclock', 'feed-noclock')],
  sessionEvents: [ownerEvent('onoclock', 'person-noclock', 'feed-noclock')],
  financialEvents: [start('snoclock', 'person-noclock', 'cs_noclock', undefined, { created_at: null })],
  profiles: [profile('person-noclock')],
})
equal(noClockFinancial.quality.undatableFinancialPeople, 1, 'cohort financial row without clock is disclosed')
equal(noClockFinancial.gate.state, 'blocked_data_quality', 'undatable cohort financial row blocks diagnosis')

const priorStart = start('sprior', 'person-prior', 'cs_prior', '2026-09-01T12:00:00.000Z')
const priorPayment = payment('pprior', 'person-prior', 'cs_prior', '2026-09-01T12:01:00.000Z')
const preexisting = report({
  landingEvents: [landing('lprior', 'feed-prior')],
  sessionEvents: [ownerEvent('oprior', 'person-prior', 'feed-prior')],
  financialEvents: [priorStart, priorPayment],
  profiles: [profile('person-prior')],
})
equal(preexisting.cohort.preexistingSubscribersExcluded, 1, 'existing subscriber is excluded from acquisition cohort')
equal(preexisting.cohort.resolvedExternalPeople, 0, 'existing subscriber never inflates acquisition people')

const undatableLanding = landing('lbadclock', 'feed-bad-clock', undefined, { created_at: null })
const undatable = report({ landingEvents: [undatableLanding] })
equal(undatable.quality.undatableExactLandingRows, 1, 'exact landing without clock is disclosed')
equal(undatable.gate.state, 'blocked_data_quality', 'undatable exact attribution blocks diagnosis')

const matureLandingEvents = []
const matureSessionEvents = []
const matureFinancialEvents = []
const matureProfiles = []
for (let index = 0; index < 20; index += 1) {
  const userId = `gate-person-${index}`
  const browserId = `gate-feed-${index}`
  matureLandingEvents.push(landing(`gl-${index}`, browserId))
  matureSessionEvents.push(ownerEvent(`go-${index}`, userId, browserId))
  matureProfiles.push(profile(userId))
  if (index < 5) {
    const stripeId = `cs_gate_${index}`
    matureFinancialEvents.push(start(`gs-${index}`, userId, stripeId))
    matureFinancialEvents.push(expiry(`ge-${index}`, userId, stripeId))
  }
}
const ready = report({ landingEvents: matureLandingEvents, sessionEvents: matureSessionEvents, financialEvents: matureFinancialEvents, profiles: matureProfiles })
equal(ready.cohort.matureExternalPeople, 20, 'twenty mature external people satisfy sample')
equal(ready.cohort.matureTerminalCheckoutPeople, 5, 'five mature terminal checkout people satisfy terminal gate')
equal(ready.gate.sampleMet, true, 'sample gate is explicit')
equal(ready.gate.terminalMet, true, 'terminal gate is explicit')
equal(ready.gate.state, 'ready_for_subscription_diagnosis', 'only complete clean sample opens diagnosis')

const freshLandingEvents = matureLandingEvents.map((row, index) => ({ ...row, id: `fresh-${index}`, created_at: IMMATURE_LANDING, metadata: { ...row.metadata, utm_content: '2026-09-18' } }))
const freshProfiles = matureProfiles.map((row) => ({ ...row, created_at: '2026-09-18T12:00:01.000Z' }))
const fresh = report({ landingEvents: freshLandingEvents, sessionEvents: matureSessionEvents, financialEvents: matureFinancialEvents, profiles: freshProfiles })
equal(fresh.cohort.resolvedExternalPeople, 20, 'fresh people are still visible')
equal(fresh.cohort.matureExternalPeople, 0, 'fresh people do not satisfy observation time')
equal(fresh.gate.state, 'collecting', 'volume without observation time cannot open diagnosis')

const collectorSource = readFileSync(new URL('./measure-daily-shorts-ideas-subscription.mjs', import.meta.url), 'utf8')
ok(collectorSource.includes(".eq('name', 'landing_session_started')"), 'collector fetches the exact landing event family')
ok(collectorSource.includes("'checkout_started', 'payment_success', 'checkout_session_expired'"), 'collector fetches starts, payments and terminal expiry')
ok(collectorSource.includes('signup_utm_source,signup_utm_medium,signup_utm_campaign'), 'collector loads canonical first-touch fields')
ok(collectorSource.includes('has_paid,is_pro,plan,stripe_subscription_id,paypal_subscription_id,paddle_subscription_id'), 'collector loads canonical paid-state fields')
ok(collectorSource.includes(".in('session_id', group)"), 'collector resolves complete browser sessions')
ok(collectorSource.includes('fetchAllPages'), 'every table scan is paginated')
ok(!collectorSource.includes('.env.local'), 'collector never reads a secret file')

const irrelevantLandings = Array.from({ length: 1001 }, (_, index) => {
  const row = landing(`irrelevant-${index}`, `irrelevant-session-${index}`)
  row.metadata = { ...row.metadata, utm_source: 'somewhere_else' }
  return row
})
const collectorLanding = landing('collector-landing', 'collector-feed')
const collectorProfile = profile('collector-person')
const collectorDb = fakeDatabase({
  landingRows: [...irrelevantLandings, collectorLanding],
  profileRows: [collectorProfile],
  browserSessionRows: [ownerEvent('collector-owner', 'collector-person', 'collector-feed')],
  financialRows: [
    start('collector-start', 'collector-person', 'cs_collector'),
    payment('collector-payment', 'collector-person', 'cs_collector'),
  ],
})
const collected = await collectDailyShortIdeasSubscription({ db: collectorDb, generatedAt: new Date(GENERATED_AT) })
equal(collected.cohort.paidPeople, 1, 'executed collector reaches exact same-Session payment')
ok(collectorDb.calls.filter((call) => call.table === 'events' && call.filters.some(([kind, column, value]) => kind === 'eq' && column === 'name' && value === 'landing_session_started')).length >= 3, 'executed collector paginates a landing inventory larger than one page')
const sessionInventoryCall = collectorDb.calls.find((call) => call.filters.some(([kind, column]) => kind === 'in' && column === 'session_id'))
equal(sessionInventoryCall.filters.find(([kind, column]) => kind === 'in' && column === 'session_id')[2], ['collector-feed'], 'session inventory queries only exact feed sessions')
ok(collectorDb.calls.some((call) => call.filters.some(([kind, column]) => kind === 'in' && column === 'session_id') && call.filters.some(([kind, column]) => kind === 'lte' && column === 'created_at')), 'executed session inventory is bounded by generatedAt')
ok(collectorDb.calls.some((call) => call.filters.some(([kind, column]) => kind === 'in' && column === 'session_id') && call.filters.some(([kind, column]) => kind === 'is' && column === 'created_at')), 'executed collector separately inventories owner evidence without a clock')
ok(collectorDb.calls.some((call) => call.table === 'profiles' && call.filters.some(([kind, column, value]) => kind === 'lte' && column === 'created_at' && value === GENERATED_AT)), 'executed profile inventory is bounded by generatedAt')
ok(collectorDb.calls.every((call) => Number.isInteger(call.from) && Number.isInteger(call.to)), 'every executed query uses a bounded range')

const failingDb = fakeDatabase({ failTable: 'profiles' })
await assert.rejects(
  () => collectDailyShortIdeasSubscription({ db: failingDb, generatedAt: new Date(GENERATED_AT) }),
  /profiles.*FAKE fixture failure/,
)
checks += 1

console.log(`daily shorts ideas subscription report: ${checks}/${checks}`)
