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
  event('cta1', 'checkout_cta_clicked', 'u1', 'browser-early-checkout', 2, 1, { surface: 'trial_active_banner' }),
  start('s1', 'u1', 'browser-early-checkout', 'cs_early', 2, 2),
  paid('p1', 'u1', 'browser-early-checkout', 'cs_early', 2, 3),
], [video('v1', 'u1', 2, 4)])
equal(report.postVideoSubscriptionTruth.startedPeople, 0, 'checkout before completed video cannot enter post-video funnel')
equal(report.postVideoSubscriptionTruth.paidPeople, 0, 'payment before completed video cannot enter post-video funnel')
equal(report.preVideoCheckoutDiagnostic.startedPeople, 1, 'pre-video checkout remains visible as a separate diagnostic')
equal(report.preVideoCheckoutDiagnostic.paidPeople, 1, 'pre-video payment remains visible without corrupting the main funnel')
equal(report.paths[0].preVideoSubscriptionStartedStripeSessions, 1, 'path exposes the pre-video Stripe Session exactly once')
equal(report.paths[0].postVideoSubscriptionStartedStripeSessions, 0, 'path main funnel remains chronological')
equal(report.preVideoCheckoutDiagnostic.byOrigin, [{
  origin: 'trial_active_banner',
  startedPeople: 1,
  startedStripeSessions: 1,
  paidPeople: 1,
  paidStripeSessions: 1,
  revenueMinorByCurrency: { usd: 1500 },
}], 'pre-video origin is tied to one canonical allowlisted action in the same browser session')

report = build([
  landing('l1', 'browser-no-video', 2, '/free-ai-shorts-generator'),
  link('x1', 'u1', 'browser-no-video', 2),
  start('s1', 'u1', 'browser-no-video', 'cs_no_video', 2, 2),
])
equal(report.postVideoSubscriptionTruth.startedPeople, 0, 'person without a completed video cannot enter post-video funnel')
equal(report.preVideoCheckoutDiagnostic.startedPeople, 1, 'checkout without a completed video is retained in the diagnostic')
equal(report.preVideoCheckoutDiagnostic.byOrigin[0].origin, 'unattributed', 'missing action evidence is never invented')
equal(report.preVideoCheckoutDiagnostic.byOrigin[0].startedPeople, 1, 'unattributed origin still counts the external person')
ok(report.limitations.some((line) => line.includes('not proof')), 'causality limitation is explicit')
ok(report.limitations.some((line) => line.includes('packs')), 'financial limitation is explicit')
ok(report.limitations.some((line) => line.includes('chronological')), 'chronological contract is explicit')
ok(report.limitations.some((line) => line.includes('same person and browser session within five minutes')), 'origin attribution window is explicit')

report = build([
  landing('l1', 'browser-pricing', 2, '/free-ai-shorts-generator'),
  link('x1', 'u1', 'browser-pricing', 2),
  event('cta1', 'checkout_cta_clicked', 'u1', 'browser-pricing', 2, 1, { surface: 'pricing_page' }),
  start('s1', 'u1', 'browser-pricing', 'cs_pricing', 2, 2),
  landing('l2', 'browser-resume', 3, '/free-ai-shorts-generator'),
  link('x2', 'u2', 'browser-resume', 3),
  event('cta2', 'pricing_saved_checkout_clicked', 'u2', 'browser-resume', 3, 1),
  start('s2', 'u2', 'browser-resume', 'cs_resume', 3, 2),
])
equal(report.preVideoCheckoutDiagnostic.byOrigin.map((row) => row.origin), ['checkout_resume', 'pricing_page'], 'stable origins sort deterministically on equal counts')
equal(report.preVideoCheckoutDiagnostic.byOrigin.reduce((sum, row) => sum + row.startedPeople, 0), 2, 'disjoint-person fixture preserves the people total')
equal(report.preVideoCheckoutDiagnostic.byOrigin.reduce((sum, row) => sum + row.startedStripeSessions, 0), 2, 'origin buckets preserve the Stripe Session total')

report = build([
  landing('l1', 'browser-one', 2, '/free-ai-shorts-generator'),
  link('x1', 'u1', 'browser-one', 2),
  event('cta-wrong-session', 'checkout_cta_clicked', 'u1', 'browser-two', 2, 1, { surface: 'trial_active_banner' }),
  start('s1', 'u1', 'browser-one', 'cs_one', 2, 2),
])
equal(report.preVideoCheckoutDiagnostic.byOrigin[0].origin, 'unattributed', 'an action from another browser session cannot claim Checkout origin')

for (const reversePersistenceOrder of [false, true]) {
  const canonicalMinute = reversePersistenceOrder ? 2 : 1
  const legacyMinute = reversePersistenceOrder ? 1 : 2
  const canonical = event('resume-canonical', 'checkout_cta_clicked', 'u1', 'browser-resume-pair', 4, canonicalMinute, {
    surface: 'pricing_saved_checkout',
  })
  const legacy = event('resume-legacy', 'pricing_saved_checkout_clicked', 'u1', 'browser-resume-pair', 4, legacyMinute, {
    surface: 'pricing',
  })
  report = build([
    landing('resume-landing', 'browser-resume-pair', 4, '/free-ai-shorts-generator'),
    link('resume-link', 'u1', 'browser-resume-pair', 4),
    ...(reversePersistenceOrder ? [legacy, canonical] : [canonical, legacy]),
    start('resume-start', 'u1', 'browser-resume-pair', 'cs_resume_pair', 4, 3),
  ])
  equal(
    report.preVideoCheckoutDiagnostic.byOrigin[0].origin,
    'checkout_resume',
    `saved Checkout pair remains checkout_resume when persistence order is ${reversePersistenceOrder ? 'reversed' : 'forward'}`,
  )
}

for (const reversePersistenceOrder of [false, true]) {
  const canonicalMinute = reversePersistenceOrder ? 2 : 1
  const legacyMinute = reversePersistenceOrder ? 1 : 2
  const canonical = event('pricing-canonical', 'checkout_cta_clicked', 'u1', 'browser-pricing-pair', 5, canonicalMinute, {
    surface: 'pricing_page',
  })
  const legacy = event('pricing-legacy', 'basic_checkout_clicked', 'u1', 'browser-pricing-pair', 5, legacyMinute)
  report = build([
    landing('pricing-landing', 'browser-pricing-pair', 5, '/free-ai-shorts-generator'),
    link('pricing-link', 'u1', 'browser-pricing-pair', 5),
    ...(reversePersistenceOrder ? [legacy, canonical] : [canonical, legacy]),
    start('pricing-start', 'u1', 'browser-pricing-pair', 'cs_pricing_pair', 5, 3),
  ])
  equal(
    report.preVideoCheckoutDiagnostic.byOrigin[0].origin,
    'pricing_page',
    `pricing pair remains pricing_page when persistence order is ${reversePersistenceOrder ? 'reversed' : 'forward'}`,
  )
}

report = build([
  landing('multi-origin-landing', 'browser-multi-origin', 6, '/free-ai-shorts-generator'),
  link('multi-origin-link', 'u1', 'browser-multi-origin', 6),
  event('multi-pricing', 'checkout_cta_clicked', 'u1', 'browser-multi-origin', 6, 1, { surface: 'pricing_page' }),
  start('multi-start-1', 'u1', 'browser-multi-origin', 'cs_multi_1', 6, 2),
  event('multi-resume', 'checkout_cta_clicked', 'u1', 'browser-multi-origin', 6, 3, { surface: 'pricing_saved_checkout' }),
  start('multi-start-2', 'u1', 'browser-multi-origin', 'cs_multi_2', 6, 4),
])
equal(report.preVideoCheckoutDiagnostic.startedPeople, 1, 'one person remains one person in the diagnostic total')
equal(report.preVideoCheckoutDiagnostic.startedStripeSessions, 2, 'two Stripe Sessions remain two sessions')
equal(report.preVideoCheckoutDiagnostic.byOrigin.reduce((sum, row) => sum + row.startedPeople, 0), 2, 'the same person may appear once in each origin bucket')
ok(report.limitations.some((line) => line.includes('not additive')), 'by-origin people non-additivity is explicit')

report = build([
  landing('race-landing', 'browser-race', 7, '/free-ai-shorts-generator'),
  link('race-link', 'u1', 'browser-race', 7),
  start('race-start', 'u1', 'browser-race', 'cs_race', 7, 2),
  event('race-late-action', 'checkout_cta_clicked', 'u1', 'browser-race', 7, 3, { surface: 'pricing_page' }),
])
equal(report.preVideoCheckoutDiagnostic.byOrigin[0].origin, 'unattributed', 'a post-start analytics race cannot claim an exact origin')

report = build([
  landing('conflict-landing', 'browser-conflict', 8, '/free-ai-shorts-generator'),
  link('conflict-link', 'u1', 'browser-conflict', 8),
  event('conflict-pricing', 'checkout_cta_clicked', 'u1', 'browser-conflict', 8, 1, { surface: 'pricing_page' }),
  event('conflict-resume', 'checkout_cta_clicked', 'u1', 'browser-conflict', 8, 1, { surface: 'pricing_saved_checkout' }),
  start('conflict-start', 'u1', 'browser-conflict', 'cs_conflict', 8, 2),
])
equal(report.preVideoCheckoutDiagnostic.byOrigin[0].origin, 'unattributed', 'conflicting canonical origins fail closed')

console.log(`chatgpt-entry-subscription-report: ${checks}/${checks} checks passed`)
