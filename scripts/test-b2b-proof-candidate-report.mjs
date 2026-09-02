#!/usr/bin/env node
import assert from 'node:assert/strict'
import { buildB2bProofCandidateReport } from './b2b-proof-candidate-report.mjs'

const generatedAt = '2026-09-02T18:00:00.000Z'
const windowStart = '2026-06-04T18:00:00.000Z'
const profiles = [
  { id: 'external-a', email: 'owner@agency.example' },
  { id: 'external-b', email: 'maker@example.com' },
  { id: 'external-c', email: 'pilot@company.example' },
  { id: 'internal', email: 'josephsskaf@gmail.com' },
  { id: 'unknown', email: null },
]
let id = 0
const event = (name, userId, createdAt, metadata = {}) => ({
  id: `e-${++id}`, name, user_id: userId, session_id: `browser-${id}`, created_at: createdAt, metadata,
})
const checkout = (userId, at, session, extra = {}) => event('checkout_started', userId, at, {
  stripe_session_id: session, tier: 'starter', billing: 'monthly', ...extra,
})
const subscriptionPayment = (userId, at, session, extra = {}) => event('payment_success', userId, at, {
  stripe_session_id: session, checkout_mode: 'subscription', amount_total: 1000, currency: 'USD', ...extra,
})
const bulkPayment = (userId, at, session, extra = {}) => event('bulk_purchase_completed', userId, at, {
  stripe_session_id: session, sku: 'bulk10', amount_total: 9900, currency: 'USD', ...extra,
})
const bulkPaymentSuccess = (userId, at, session, extra = {}) => event('payment_success', userId, at, {
  stripe_session_id: session, checkout_mode: 'payment', pack: 'bulk10', amount_total: 9900, currency: 'USD', ...extra,
})
const pilotPayment = (userId, at, session, extra = {}) => event('payment_success', userId, at, {
  stripe_session_id: session, checkout_mode: 'payment', pack: 'autopilot_pilot', amount_total: 9900, currency: 'USD', ...extra,
})
const video = (videoId, userId, at, status = 'completed') => ({ id: videoId, user_id: userId, created_at: at, status })

function report(events, videos, profileRows = profiles) {
  return buildB2bProofCandidateReport({ generatedAt, windowStart, events, profiles: profileRows, videos })
}

let checks = 0
function equal(actual, expected, message) {
  assert.equal(actual, expected, message)
  checks += 1
}

const subscriptionEvents = [
  checkout('external-a', '2026-09-01T10:00:00.000Z', 'cs-sub', { intent_campaign: 'client_short_brief_v1' }),
  subscriptionPayment('external-a', '2026-09-01T10:01:00.000Z', 'cs-sub'),
]
let result = report(subscriptionEvents, [video('v-sub', 'external-a', '2026-09-01T10:02:00.000Z')])
equal(result.paid.externalPaidPeople, 1, 'counts one exact external subscription payer')
equal(result.paid.exactPaidStripeSessions, 1, 'counts one exact paid Stripe Session')
equal(result.postPaymentUse.externalPaidPeopleWithPostPaymentCompletedVideo, 1, 'requires completed use after payment')
equal(result.b2bIntentSignals[0].signal, 'b2b_campaign_subscription', 'keeps B2B campaign as a signal')
equal(result.consentGate.businessUseConfirmed, 'unknown', 'does not infer business use')
equal(result.consentGate.consentRecorded, 'unknown', 'does not infer consent')
equal(result.consentGate.state, 'manual_confirmation_required', 'opens only a manual confirmation gate')

result = report(subscriptionEvents, [
  video('v-before', 'external-a', '2026-09-01T09:59:00.000Z'),
  video('v-equal', 'external-a', '2026-09-01T10:01:00.000Z'),
  video('v-failed', 'external-a', '2026-09-01T10:02:00.000Z', 'failed'),
])
equal(result.postPaymentUse.externalPaidPeopleWithPostPaymentCompletedVideo, 0, 'before, equal-time and failed videos do not qualify')
equal(result.consentGate.state, 'no_candidate', 'no qualifying use closes the line')

const oneTimeEvents = [
  bulkPaymentSuccess('external-b', '2026-09-01T11:00:00.000Z', 'cs-bulk'),
  bulkPayment('external-b', '2026-09-01T11:00:00.000Z', 'cs-bulk'),
  bulkPayment('external-b', '2026-09-01T11:00:01.000Z', 'cs-bulk'),
  pilotPayment('external-c', '2026-09-01T12:00:00.000Z', 'cs-pilot'),
]
result = report(oneTimeEvents, [
  video('v-bulk', 'external-b', '2026-09-01T11:01:00.000Z'),
  video('v-pilot', 'external-c', '2026-09-01T12:01:00.000Z'),
])
equal(result.paid.externalPaidPeople, 2, 'counts distinct one-time payers')
equal(result.paid.exactPaidStripeSessions, 2, 'deduplicates identical rows by Stripe Session')
equal(result.paid.peopleByProduct.bulk_pack, 1, 'classifies bulk pack')
equal(result.paid.peopleByProduct.autopilot_pilot, 1, 'classifies Autopilot pilot')
equal(result.postPaymentUse.externalPaidPeopleWithPostPaymentCompletedVideo, 2, 'qualifies post-payment use for both products')
equal(result.quality.oneTime.duplicateRows, 1, 'reports the duplicate row')
equal(result.paid.revenueMinorByCurrency.usd, 19800, 'counts revenue once per exact Session')

const conflictEvents = [
  bulkPaymentSuccess('external-b', '2026-09-01T11:00:00.000Z', 'cs-conflict'),
  bulkPayment('external-b', '2026-09-01T11:00:01.000Z', 'cs-conflict', { amount_total: 10000 }),
]
result = report(conflictEvents, [video('v-conflict', 'external-b', '2026-09-01T11:02:00.000Z')])
equal(result.paid.externalPaidPeople, 0, 'conflicting payment semantics fail closed')
equal(result.quality.oneTime.conflictStripeSessions, 1, 'surfaces a one-time conflict')

result = report([
  bulkPaymentSuccess('external-b', '2026-09-01T11:00:00.000Z', 'cs-sku-conflict', { pack: 'bulk10' }),
  bulkPayment('external-b', '2026-09-01T11:00:01.000Z', 'cs-sku-conflict', { sku: 'bulk50' }),
], [video('v-sku-conflict', 'external-b', '2026-09-01T11:02:00.000Z')])
equal(result.paid.externalPaidPeople, 0, 'mismatched bulk pack and sku fail closed')
equal(result.quality.oneTime.conflictStripeSessions, 1, 'reports bulk sku conflict')

result = report([
  checkout('internal', '2026-09-01T10:00:00.000Z', 'cs-internal'),
  subscriptionPayment('internal', '2026-09-01T10:01:00.000Z', 'cs-internal'),
  checkout('unknown', '2026-09-01T10:00:00.000Z', 'cs-unknown'),
  subscriptionPayment('unknown', '2026-09-01T10:01:00.000Z', 'cs-unknown'),
  event('payment_success', 'external-a', '2026-09-01T13:00:00.000Z', {
    stripe_session_id: 'cs-normal-pack', checkout_mode: 'payment', pack: 'starter', amount_total: 1900, currency: 'USD',
  }),
], [video('v-noise', 'external-a', '2026-09-01T14:00:00.000Z')])
equal(result.paid.externalPaidPeople, 0, 'excludes internal, unknown and normal one-time packs')

result = report([
  checkout('external-a', '2026-09-01T10:00:00.000Z', 'cs-multi', { intent_campaign: 'client_short_brief_v1' }),
  subscriptionPayment('external-a', '2026-09-01T10:01:00.000Z', 'cs-multi'),
  bulkPaymentSuccess('external-a', '2026-09-01T11:00:00.000Z', 'cs-multi-bulk'),
  bulkPayment('external-a', '2026-09-01T11:00:00.000Z', 'cs-multi-bulk'),
], [video('v-multi', 'external-a', '2026-09-01T12:00:00.000Z')])
equal(result.paid.externalPaidPeople, 1, 'does not add the same person across products')
equal(result.paid.exactPaidStripeSessions, 2, 'still counts both exact paid Sessions')
equal(result.paid.peopleByProduct.subscription, 1, 'retains subscription product count')
equal(result.paid.peopleByProduct.bulk_pack, 1, 'retains overlapping bulk product count')
equal(result.postPaymentUse.completedVideosAfterPayment, 1, 'does not duplicate one video across payments')

result = report([
  bulkPaymentSuccess('external-b', '2026-09-01T11:00:00.000Z', 'cs-eur', { amount_total: 5000, currency: 'EUR' }),
  bulkPayment('external-b', '2026-09-01T11:00:00.000Z', 'cs-eur', { amount_total: 5000, currency: 'EUR' }),
  bulkPaymentSuccess('external-c', '2026-09-01T12:00:00.000Z', 'cs-usd', { amount_total: 7000 }),
  bulkPayment('external-c', '2026-09-01T12:00:00.000Z', 'cs-usd', { amount_total: 7000 }),
], [])
equal(result.paid.revenueMinorByCurrency.eur, 5000, 'groups revenue by currency')
equal(result.paid.revenueMinorByCurrency.usd, 7000, 'does not merge currencies')

result = report([
  bulkPaymentSuccess('external-b', '2026-05-01T11:00:00.000Z', 'cs-old'),
  bulkPayment('external-b', '2026-05-01T11:00:00.000Z', 'cs-old'),
], [
  video('v-old', 'external-b', '2026-09-01T11:01:00.000Z'),
])
equal(result.paid.externalPaidPeople, 0, 'excludes payments outside the window')

result = report([
  checkout('external-a', '2026-09-01T10:00:00.000Z', 'cs-no-b2b'),
  subscriptionPayment('external-a', '2026-09-01T10:01:00.000Z', 'cs-no-b2b'),
], [video('v-no-b2b', 'external-a', '2026-09-01T10:02:00.000Z')])
equal(result.paid.externalPaidPeople, 0, 'subscription without an exact B2B campaign fails closed')
equal(result.quality.excludedSubscriptionWithoutB2bCampaignPeople, 1, 'reports excluded generic subscription people')

result = report([
  checkout('external-a', '2026-09-01T10:00:00.000Z', 'cs-two-campaigns', { intent_campaign: 'client_short_brief_v1' }),
  checkout('external-a', '2026-09-01T10:00:01.000Z', 'cs-two-campaigns', { intent_campaign: 'weekly_business_video_plan' }),
  subscriptionPayment('external-a', '2026-09-01T10:01:00.000Z', 'cs-two-campaigns'),
], [video('v-two-campaigns', 'external-a', '2026-09-01T10:02:00.000Z')])
equal(result.paid.externalPaidPeople, 0, 'two B2B campaigns on one Session fail closed')
equal(result.quality.excludedSubscriptionCampaignConflictSessions, 1, 'reports campaign conflict')

result = report([
  checkout('external-a', '2026-09-01T10:00:00.000Z', 'cs-mixed-campaigns', { intent_campaign: 'client_short_brief_v1' }),
  checkout('external-a', '2026-09-01T10:00:01.000Z', 'cs-mixed-campaigns', { intent_campaign: 'unrecognized_campaign' }),
  subscriptionPayment('external-a', '2026-09-01T10:01:00.000Z', 'cs-mixed-campaigns'),
], [video('v-mixed-campaigns', 'external-a', '2026-09-01T10:02:00.000Z')])
equal(result.paid.externalPaidPeople, 0, 'recognized plus unrecognized campaign is still a conflict')
equal(result.quality.excludedSubscriptionCampaignConflictSessions, 1, 'does not hide the unrecognized campaign')

result = report([
  bulkPaymentSuccess('external-b', '2026-09-01T11:00:00.000Z', 'cs-incomplete-bulk'),
], [video('v-incomplete-bulk', 'external-b', '2026-09-01T11:02:00.000Z')])
equal(result.paid.externalPaidPeople, 0, 'bulk requires payment and fulfillment events')
equal(result.quality.oneTime.incompleteBulkStripeSessions, 1, 'reports incomplete bulk reconciliation')

result = report([
  checkout('external-a', '2026-09-01T10:00:00.000Z', 'cs-cross', { intent_campaign: 'client_short_brief_v1' }),
  subscriptionPayment('external-a', '2026-09-01T10:01:00.000Z', 'cs-cross'),
  bulkPayment('external-a', '2026-09-01T10:01:01.000Z', 'cs-cross'),
], [video('v-cross', 'external-a', '2026-09-01T10:02:00.000Z')])
equal(result.paid.externalPaidPeople, 0, 'cross-product Stripe Session fails closed')
equal(result.quality.crossProductConflictStripeSessions, 1, 'reports cross-product Session conflict')

result = report([
  checkout('external-c', '2026-09-01T10:00:00.000Z', 'cs-start-payment-cross', { intent_campaign: 'client_short_brief_v1' }),
  pilotPayment('external-c', '2026-09-01T10:01:00.000Z', 'cs-start-payment-cross'),
], [video('v-start-payment-cross', 'external-c', '2026-09-01T10:02:00.000Z')])
equal(result.paid.externalPaidPeople, 0, 'recurring checkout plus one-time payment fails closed')
equal(result.quality.crossProductConflictStripeSessions, 1, 'reports start-versus-payment product conflict')

result = report([
  bulkPaymentSuccess('unknown', '2026-09-01T11:00:00.000Z', 'cs-unknown-bulk'),
  bulkPayment('unknown', '2026-09-01T11:00:01.000Z', 'cs-unknown-bulk'),
], [])
equal(result.paid.externalPaidPeople, 0, 'unknown one-time owner cannot become a candidate')
equal(result.quality.oneTime.unknownOwnerPaidSessions, 1, 'reports unknown one-time paid Session')

const serialized = JSON.stringify(report([...subscriptionEvents, ...oneTimeEvents], [
  video('v-private', 'external-a', '2026-09-01T13:00:00.000Z'),
]))
for (const secret of ['external-a', 'external-b', 'external-c', 'owner@agency.example', 'cs-sub', 'cs-bulk']) {
  equal(serialized.includes(secret), false, `does not expose ${secret}`)
}

assert.throws(() => buildB2bProofCandidateReport({
  generatedAt: 'invalid', windowStart, events: [], profiles: [], videos: [],
}), /valid ordered timestamps/)
checks += 1
assert.throws(() => buildB2bProofCandidateReport({
  generatedAt: windowStart, windowStart: generatedAt, events: [], profiles: [], videos: [],
}), /valid ordered timestamps/)
checks += 1

console.log(`b2b-proof-candidate-report: ${checks}/${checks}`)
