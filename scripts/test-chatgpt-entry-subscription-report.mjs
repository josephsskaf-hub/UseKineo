#!/usr/bin/env node
import assert from 'node:assert/strict'
import { buildChatgptEntrySubscriptionReport } from './chatgpt-entry-subscription-report.mjs'

let checks = 0
const equal = (actual, expected, message) => { assert.deepEqual(actual, expected, message); checks += 1 }
const ok = (value, message) => { assert.ok(value, message); checks += 1 }
const when = (day, minute = 0) => `2026-09-${String(day).padStart(2, '0')}T10:${String(minute).padStart(2, '0')}:00.000Z`
const event = (id, name, user, session, day, minute, metadata = {}, path = '/') => ({
  id, name, user_id: user, session_id: session, created_at: when(day, minute), metadata, path,
})
const landing = (id, session, day, path, metadata = { referrer_host: 'chatgpt.com' }) =>
  event(id, 'landing_session_started', null, session, day, 0, metadata, path)
const link = (id, user, session, day, minute = 1) => event(id, 'generate_arrived_server', user, session, day, minute)
const start = (id, user, session, stripe, day, minute = 2, extra = {}) =>
  event(id, 'checkout_started', user, session, day, minute, {
    stripe_session_id: stripe, tier: 'basic', billing: 'monthly', ...extra,
  })
const paid = (id, user, session, stripe, day, minute = 3, extra = {}) =>
  event(id, 'payment_success', user, session, day, minute, {
    stripe_session_id: stripe, checkout_mode: 'subscription', amount_total: 1500, currency: 'usd', ...extra,
  })
const video = (id, user, day, minute = 1) => ({ id, user_id: user, status: 'completed', created_at: when(day, minute) })
const profiles = [
  { id: 'u1', email: 'one@example.com' },
  { id: 'u2', email: 'two@example.com' },
  { id: 'u3', email: 'three@example.com' },
  { id: 'u4', email: 'four@example.com' },
  { id: 'internal', email: 'josephsskaf@gmail.com' },
  { id: 'unknown', email: null },
]
const build = (events, videos = []) => buildChatgptEntrySubscriptionReport({
  generatedAt: when(30, 59),
  windowStart: when(1),
  events,
  profiles,
  videos,
})

let report = build([
  landing('l1', 'browser-1', 2, '/ai-video-generator/seedance?utm_source=chatgpt'),
  link('x1', 'u1', 'browser-1', 2),
  start('s1', 'u1', 'browser-1', 'cs_1', 2),
  paid('p1', 'u1', 'browser-1', 'cs_1', 2),
], [video('v1', 'u1', 2)])
equal(report.acquisitionTruth.linkedExternalPeople, 1, 'one external person is linked')
equal(report.postVideoSubscriptionTruth.startedPeople, 1, 'one post-video subscription starter is counted')
equal(report.postVideoSubscriptionTruth.paidPeople, 1, 'one post-video payer is counted')
equal(report.postVideoSubscriptionTruth.paidStripeSessions, 1, 'one post-video paid Stripe Session is counted')
equal(report.postVideoSubscriptionTruth.revenueMinorByCurrency, { usd: 1500 }, 'post-video revenue is counted once')
equal(report.paths[0].landingPath, '/ai-video-generator/seedance', 'query strings do not split a path')
equal(report.paths[0].completedVideoPeople, 1, 'completed video after touch is counted')

report = build([
  landing('l1', 'browser-multi', 2, '/'),
  link('x1', 'u1', 'browser-multi', 2),
  link('x2', 'u2', 'browser-multi', 2, 2),
  landing('l2', 'browser-anon', 2, '/free-ai-shorts-generator'),
])
equal(report.acquisitionTruth.ambiguousIdentitySessions, 1, 'multi-user browser session remains ambiguous')
equal(report.acquisitionTruth.unattributedSessions, 1, 'anonymous landing remains a session')
equal(report.acquisitionTruth.linkedExternalPeople, 0, 'ambiguous and anonymous sessions invent no people')

report = build([
  landing('l1', 'browser-internal', 2, '/'),
  link('x1', 'internal', 'browser-internal', 2),
  landing('l2', 'browser-unknown', 2, '/'),
  link('x2', 'unknown', 'browser-unknown', 2),
])
equal(report.acquisitionTruth.internalOnlySessions, 1, 'internal account is excluded')
equal(report.acquisitionTruth.unknownOnlySessions, 1, 'profile without email is not called external')
equal(report.acquisitionTruth.linkedExternalPeople, 0, 'excluded identities invent no people')

report = build([
  landing('later', 'browser-later', 5, '/later'),
  link('later-link', 'u1', 'browser-later', 5),
  landing('first', 'browser-first', 3, '/first'),
  link('first-link', 'u1', 'browser-first', 3),
])
equal(report.paths.length, 1, 'one person is not counted twice')
equal(report.paths[0].landingPath, '/first', 'earliest ChatGPT touch owns first-touch attribution')

report = build([
  landing('l1', 'browser-pack', 2, '/'),
  link('x1', 'u1', 'browser-pack', 2),
  event('s1', 'checkout_started', 'u1', 'browser-pack', 2, 2, { stripe_session_id: 'cs_pack', sku: 'pack_100' }),
  event('p1', 'payment_success', 'u1', 'browser-pack', 2, 3, {
    stripe_session_id: 'cs_pack', checkout_mode: 'payment', amount_total: 9900, currency: 'usd',
  }),
])
equal(report.postVideoSubscriptionTruth.paidPeople, 0, 'pack never becomes a subscriber')
equal(report.postVideoSubscriptionTruth.revenueMinorByCurrency, {}, 'pack contributes zero subscription revenue')

report = build([
  landing('other', 'browser-other', 2, '/', { referrer_host: 'google.com' }),
  link('x1', 'u1', 'browser-other', 2),
])
equal(report.acquisitionTruth.chatgptLandingSessions, 0, 'non-ChatGPT traffic is excluded')
equal(report.paths.length, 0, 'non-ChatGPT traffic invents no path')

report = build([
  landing('l1', 'browser-1', 3, '/'),
  link('x1', 'u1', 'browser-1', 3),
], [video('old', 'u1', 2), video('new', 'u1', 4)])
equal(report.paths[0].completedVideoPeople, 1, 'only delivery after the attributed touch qualifies')
equal(report.postVideoSubscriptionTruth.startedPeople, 0, 'no checkout means no post-video subscription start')

report = build([
  landing('l1', 'browser-early-checkout', 2, '/state-of-ai-shorts-2026'),
  link('x1', 'u1', 'browser-early-checkout', 2),
  start('s1', 'u1', 'browser-early-checkout', 'cs_early', 2, 2),
  paid('p1', 'u1', 'browser-early-checkout', 'cs_early', 2, 3),
], [video('v1', 'u1', 2, 4)])
equal(report.postVideoSubscriptionTruth.startedPeople, 0, 'checkout before completed video cannot enter post-video funnel')
equal(report.postVideoSubscriptionTruth.paidPeople, 0, 'payment before completed video cannot enter post-video funnel')
equal(report.preVideoCheckoutDiagnostic.startedPeople, 1, 'pre-video checkout remains visible as a separate diagnostic')
equal(report.preVideoCheckoutDiagnostic.paidPeople, 1, 'pre-video payment remains visible without corrupting the main funnel')
equal(report.paths[0].preVideoSubscriptionStartedStripeSessions, 1, 'path exposes the pre-video Stripe Session exactly once')
equal(report.paths[0].postVideoSubscriptionStartedStripeSessions, 0, 'path main funnel remains chronological')

report = build([
  landing('l1', 'browser-no-video', 2, '/free-ai-shorts-generator'),
  link('x1', 'u1', 'browser-no-video', 2),
  start('s1', 'u1', 'browser-no-video', 'cs_no_video', 2, 2),
])
equal(report.postVideoSubscriptionTruth.startedPeople, 0, 'person without a completed video cannot enter post-video funnel')
equal(report.preVideoCheckoutDiagnostic.startedPeople, 1, 'checkout without a completed video is retained in the diagnostic')
ok(report.limitations.some((line) => line.includes('not proof')), 'causality limitation is explicit')
ok(report.limitations.some((line) => line.includes('packs')), 'financial limitation is explicit')
ok(report.limitations.some((line) => line.includes('chronological')), 'chronological contract is explicit')

console.log(`chatgpt-entry-subscription-report: ${checks}/${checks} checks passed`)
