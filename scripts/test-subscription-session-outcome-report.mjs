#!/usr/bin/env node
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  SUBSCRIPTION_SESSION_OUTCOME_VERSION,
  buildSubscriptionSessionOutcomeReport,
} from './subscription-session-outcome-report.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const root = join(here, '..')
let checks = 0
function equal(actual, expected, message) { checks += 1; assert.deepEqual(actual, expected, message) }
function check(actual, message) { checks += 1; assert.ok(actual, message) }

const base = Date.parse('2026-09-01T00:00:00.000Z')
const at = (hour) => new Date(base + hour * 3_600_000).toISOString()
const profile = (id, email) => ({ id, email })
const row = (id, name, user, hour, metadata = {}, session = null) => ({ id, name, user_id: user, session_id: session, created_at: at(hour), metadata })
const start = (id, user, hour, stripe, extra = {}) => row(id, 'checkout_started', user, hour, {
  tier: 'basic', billing: 'monthly', stripe_session_id: stripe,
  checkout_session_window_hours: 24, checkout_origin: 'pricing_page', ...extra,
}, `browser_${user}`)
const paid = (id, user, hour, stripe, extra = {}) => row(id, 'payment_success', user, hour, {
  checkout_mode: 'subscription', stripe_session_id: stripe, amount_total: 1500, currency: 'usd', ...extra,
})
const expired = (id, user, hour, stripe, status = 'unpaid', extra = {}) => row(id, 'checkout_session_expired', user, hour, {
  stripe_session_id: stripe, checkout_mode: 'subscription', tier: 'basic', billing: 'monthly', payment_status: status, ...extra,
})

const profiles = [
  profile('paid', 'paid@example.com'),
  profile('expired', 'expired@example.com'),
  profile('open', 'open@example.com'),
  profile('missing', 'missing@example.com'),
  profile('unknown', 'unknown@example.com'),
  profile('other', 'other@example.com'),
  profile('internal', 'josephsskaf@gmail.com'),
]

const events = [
  start('s1', 'paid', 1, 'cs_paid'),
  paid('p1', 'paid', 2, 'cs_paid'),
  start('s2', 'expired', 3, 'cs_expired'),
  expired('e1', null, 28, 'cs_expired'),
  start('s3', 'open', 30, 'cs_open'),
  start('s4', 'missing', 0, 'cs_missing'),
  start('s5', 'unknown', 4, 'cs_unknown', { checkout_session_window_hours: null }),
  row('f1', 'checkout_payment_failed', 'expired', 5, { error_code: 'card_declined' }, 'pi_hash'),
  row('f2', 'checkout_payment_failure_enriched', 'expired', 6, { decline_code: 'generic_decline' }, 'pi_hash'),
  row('c1', 'checkout_cancelled', 'missing', 7, { tier: 'basic' }, 'browser_missing'),
  row('r1', 'checkout_resume_banner_clicked', 'missing', 8, { tier: 'basic' }, 'browser_missing'),
  row('r2', 'checkout_resume_choice_viewed', null, 9, { version: 'checkout_resume_human_view_v1' }, 'anon_resume'),
  start('internal-start', 'internal', 1, 'cs_internal'),
  expired('internal-expired', 'internal', 28, 'cs_internal'),
  row('internal-failure', 'checkout_payment_failed', 'internal', 5, {}, 'pi_internal'),
  row('pack', 'checkout_started', 'other', 2, { sku: 'bulk10', stripe_session_id: 'cs_pack' }),
]

const report = buildSubscriptionSessionOutcomeReport({ generatedAt: at(32), windowStart: at(0), events, profiles })
equal(report.schemaVersion, SUBSCRIPTION_SESSION_OUTCOME_VERSION, 'stable schema')
equal(report.totals.identifiedExternalPeople, 5, 'five external subscription people')
equal(report.totals.stripeSessions, 5, 'five exact external subscription Sessions')
equal(report.totals.paidPeople, 1, 'one paid person')
equal(report.totals.expiredPeople, 1, 'one expired person')
equal(report.totals.byOutcome, {
  expired_unpaid: 1,
  missing_terminal_signal: 1,
  open_before_deadline: 1,
  paid: 1,
  unknown_maturity: 1,
}, 'terminal states remain distinct')
equal(report.unlinkedAssists.paymentFailed.identifiedExternalPeople, 1, 'payment failure is a person assist')
equal(report.unlinkedAssists.paymentFailureEnriched.identifiedExternalPeople, 1, 'enrichment remains separate')
equal(report.unlinkedAssists.checkoutCancelled.identifiedExternalPeople, 1, 'cancel return is a person assist')
equal(report.unlinkedAssists.resumeClicked.identifiedExternalPeople, 1, 'resume click is a person assist')
equal(report.unlinkedAssists.resumeChoiceViewed.anonymousSessions, 1, 'anonymous resume stays a session')
equal(report.unlinkedAssists.paymentFailed.internalEventRows, 1, 'internal failure is disclosed, not a customer')
check(!JSON.stringify(report).includes('paid@example.com'), 'report never emits email')
check(!JSON.stringify(report).includes('cs_paid'), 'raw Stripe Session id is not emitted')
equal(report.sessions.find((item) => item.userId === 'open').outcome, 'open_before_deadline', 'open Session is not called abandonment')
equal(report.sessions.find((item) => item.userId === 'missing').outcome, 'missing_terminal_signal', 'missing webhook is an instrumentation gap')

const ownerConflict = buildSubscriptionSessionOutcomeReport({
  generatedAt: at(32), windowStart: at(0), profiles,
  events: [start('o1', 'expired', 1, 'cs_owner_conflict'), expired('o2', 'other', 26, 'cs_owner_conflict')],
})
equal(ownerConflict.totals.byOutcome, { conflict: 1 }, 'foreign expiration owner fails closed')

const paidAndExpired = buildSubscriptionSessionOutcomeReport({
  generatedAt: at(32), windowStart: at(0), profiles,
  events: [start('b1', 'paid', 1, 'cs_both'), paid('b2', 'paid', 2, 'cs_both'), expired('b3', 'paid', 26, 'cs_both')],
})
equal(paidAndExpired.totals.byOutcome, { conflict: 1 }, 'same Session cannot be both paid and expired')

const mixedStart = buildSubscriptionSessionOutcomeReport({
  generatedAt: at(32), windowStart: at(0), profiles,
  events: [start('m1', 'paid', 1, 'cs_mixed'), start('m2', 'internal', 2, 'cs_mixed')],
})
equal(mixedStart.quality.subscriptionStartStripeSessionConflicts, 1, 'mixed internal/external start ownership is detected')
equal(mixedStart.totals.stripeSessions, 0, 'mixed-owner Session is excluded')

const duplicateExpiration = buildSubscriptionSessionOutcomeReport({
  generatedAt: at(32), windowStart: at(0), profiles,
  events: [start('d1', 'expired', 1, 'cs_dup_exp'), expired('d2', null, 26, 'cs_dup_exp'), expired('d3', null, 27, 'cs_dup_exp')],
})
equal(duplicateExpiration.totals.byOutcome, { expired_unpaid: 1 }, 'coherent duplicate expiration counts once')
equal(duplicateExpiration.quality.duplicateExpirationRows, 1, 'duplicate expiration remains visible')

const unknownPaymentStatus = buildSubscriptionSessionOutcomeReport({
  generatedAt: at(32), windowStart: at(0), profiles,
  events: [start('u1', 'expired', 1, 'cs_unknown_status'), expired('u2', null, 26, 'cs_unknown_status', 'mystery')],
})
equal(unknownPaymentStatus.totals.byOutcome, { expired_unknown_payment_status: 1 }, 'unknown Stripe status is not coerced')

const future = buildSubscriptionSessionOutcomeReport({
  generatedAt: at(10), windowStart: at(0), profiles,
  events: [start('future', 'paid', 20, 'cs_future')],
})
equal(future.totals.stripeSessions, 0, 'future rows excluded')

const checkoutSource = readFileSync(join(root, 'app/api/stripe/checkout/route.ts'), 'utf8')
const webhookSource = readFileSync(join(root, 'app/api/stripe/webhook/route.ts'), 'utf8')
const windowSource = readFileSync(join(root, 'lib/growth/checkoutSessionWindow.ts'), 'utf8')
check(checkoutSource.includes("'checkout_started'"), 'live checkout emits start')
check(checkoutSource.includes('stripe_session_id: session.id'), 'start persists exact Stripe Session')
check(checkoutSource.includes('checkout_session_window_hours: RECURRING_CHECKOUT_WINDOW_HOURS'), 'start persists assigned maturity window')
check(webhookSource.includes("name: 'checkout_session_expired'"), 'webhook emits exact expiration')
check(webhookSource.includes('stripe_session_id: expiredSession.id'), 'expiration persists exact Stripe Session')
check(webhookSource.includes("name: 'checkout_payment_failed'"), 'webhook emits payment failure assist')
check(webhookSource.includes('stripeFailureReference(failedIntent.id)'), 'payment failure uses PaymentIntent reference, not a Checkout Session link')
check(windowSource.includes('RECURRING_CHECKOUT_WINDOW_HOURS = 24'), 'current checkout window remains 24h')

console.log(`subscription session outcome: ${checks}/${checks}`)
