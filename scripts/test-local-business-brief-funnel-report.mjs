#!/usr/bin/env node
import assert from 'node:assert/strict'
import fs from 'node:fs'
import {
  buildLocalBusinessBriefFunnelReport,
  LOCAL_BUSINESS_BRIEF_CAMPAIGN,
  LOCAL_BUSINESS_BRIEF_GATE_SESSIONS,
  LOCAL_BUSINESS_BRIEF_SURFACE,
  LOCAL_BUSINESS_BRIEF_VERSION,
} from './local-business-brief-funnel-report.mjs'

let checks = 0
const equal = (actual, expected, message) => { assert.deepEqual(actual, expected, message); checks += 1 }
const ok = (value, message) => { assert.ok(value, message); checks += 1 }

const at = (minute) => `2026-09-01T23:${String(minute).padStart(2, '0')}:00.000Z`
const local = (name, session_id, user_id, minute, metadata = {}) => ({
  name,
  session_id,
  user_id,
  created_at: at(minute),
  metadata: {
    version: 'local_business_brief_observability_v1',
    campaign: LOCAL_BUSINESS_BRIEF_CAMPAIGN,
    surface: LOCAL_BUSINESS_BRIEF_SURFACE,
    ...metadata,
  },
})
const event = (name, user_id, minute, metadata = {}) => ({
  name,
  user_id,
  session_id: null,
  created_at: at(minute),
  metadata,
})

const profiles = [
  { id: 'internal', email: 'josephsskaf@gmail.com', created_at: at(1), signup_utm_campaign: LOCAL_BUSINESS_BRIEF_CAMPAIGN },
  { id: 'u1', email: 'buyer@agency.com', created_at: at(8), signup_utm_campaign: LOCAL_BUSINESS_BRIEF_CAMPAIGN },
  { id: 'u2', email: 'visitor@example.com', created_at: at(8), signup_utm_campaign: null },
  { id: 'unknown-email', email: '', created_at: at(8), signup_utm_campaign: LOCAL_BUSINESS_BRIEF_CAMPAIGN },
]
const events = [
  local('local_business_brief_viewed', 's1', null, 1),
  local('local_business_brief_generated', 's1', null, 2, { draft_source: 'manual' }),
  local('local_business_brief_activation_clicked', 's1', null, 3, { draft_source: 'manual' }),

  local('local_business_brief_viewed', 's2', null, 4),
  local('local_business_brief_sample_loaded', 's2', null, 5, { draft_source: 'sample' }),
  local('local_business_brief_generated', 's2', null, 5, { draft_source: 'sample' }),
  local('local_business_brief_generated', 's2', null, 6, { draft_source: 'manual' }),

  local('local_business_brief_viewed', 's3', 'u1', 9),
  local('local_business_brief_viewed', 's3', 'u1', 9),
  local('local_business_brief_generated', 's3', 'u1', 10, { draft_source: 'manual' }),
  local('local_business_brief_activation_clicked', 's3', 'u1', 11, { draft_source: 'manual' }),

  local('local_business_brief_viewed', 'internal-session', 'internal', 1),
  local('local_business_brief_generated', 'internal-session', 'internal', 2, { draft_source: 'manual' }),
  local('local_business_brief_viewed', 'unknown-session', 'unknown-email', 1),
  local('local_business_brief_viewed', null, null, 7),
  local('local_business_brief_generated', 'orphan-generated', null, 7, { draft_source: 'manual' }),
  local('local_business_brief_activation_clicked', 'orphan-activation', null, 7, { draft_source: 'manual' }),
  {
    ...local('local_business_brief_viewed', 'wrong-version', null, 7),
    metadata: { version: 'legacy' },
  },
  event('checkout_started', 'u1', 12, { stripe_session_id: 'cs_match' }),
  event('payment_success', 'u1', 13, { stripe_session_id: 'cs_match' }),
]

const report = buildLocalBusinessBriefFunnelReport({
  generatedAt: at(20),
  instrumentedAt: '2026-09-01T22:32:56.000Z',
  events,
  profiles,
})

equal(report.schemaVersion, 'local_business_brief_funnel_report_v1', 'report schema is explicit')
equal(LOCAL_BUSINESS_BRIEF_VERSION, 'local_business_brief_observability_v1', 'event version comes from canonical code')
equal(LOCAL_BUSINESS_BRIEF_CAMPAIGN, 'growth_local_business_brief_20260828', 'campaign comes from canonical code')
equal(LOCAL_BUSINESS_BRIEF_GATE_SESSIONS, 10, 'view gate comes from canonical code')
equal(report.identityTruth.internalEventRowsExcluded, 2, 'internal event rows are excluded')
equal(report.identityTruth.unknownIdentifiedEventRows, 1, 'identified profile without email stays unknown')
equal(report.identityTruth.rowsWithoutAnyActor, 1, 'row without user or session remains visible')
equal(report.identityTruth.eligibleRowsWithoutSession, 1, 'eligible row without session never becomes a session')
equal(report.funnelBySession.viewedSessions, 3, 'views count distinct eligible sessions')
equal(report.funnelBySession.generatedSessions, 3, 'generated counts only sessions sequenced after a view')
equal(report.funnelBySession.manualGeneratedSessions, 3, 'manual generation remains separate')
equal(report.funnelBySession.sampleGeneratedSessions, 1, 'sample generation remains separate')
equal(report.funnelBySession.sampleLoadedSessions, 1, 'sample loader is visible')
equal(report.funnelBySession.activationClickedSessions, 2, 'activation requires prior generation in the same session')
equal(report.funnelBySession.manualActivationClickedSessions, 2, 'manual activation remains separate')
equal(report.funnelBySession.sampleActivationClickedSessions, 0, 'sample activation remains separate')
equal(report.funnelBySession.generatedWithoutViewSessions, 1, 'orphan generation is diagnostic, not funnel progress')
equal(report.funnelBySession.activationWithoutGeneratedSessions, 1, 'orphan activation is diagnostic, not funnel progress')
equal(report.externalPeopleDiagnostics.local_business_brief_viewed, 1, 'identified people are separate from sessions')
equal(report.externalPeopleDiagnostics.local_business_brief_generated, 1, 'identified generation people are deduped')
equal(report.attributedSignupJourney.signupPeople, 1, 'exact campaign attributes one external signup')
equal(report.attributedSignupJourney.checkoutStartedPeople, 1, 'checkout is sequenced after attributed signup')
equal(report.attributedSignupJourney.paymentSucceededPeople, 1, 'payment is the revenue evidence')
equal(report.gate.viewedSessionsMet, false, 'three viewed sessions cannot open the ten-session gate')
equal(report.gate.manualGeneratedSessionsMet, true, 'three manual generations open only the usage half')
equal(report.gate.state, 'collecting', 'both halves are required')
ok(report.note.includes('same Stripe Session'), 'revenue requires checkout and payment correlation')

const reordered = buildLocalBusinessBriefFunnelReport({
  generatedAt: at(20),
  instrumentedAt: '2026-09-01T22:32:56.000Z',
  profiles: [],
  events: [
    local('local_business_brief_generated', 'reordered', null, 1, { draft_source: 'manual' }),
    local('local_business_brief_activation_clicked', 'reordered', null, 2, { draft_source: 'manual' }),
    local('local_business_brief_viewed', 'reordered', null, 3),
    local('local_business_brief_generated', 'reordered', null, 4, { draft_source: 'manual' }),
    local('local_business_brief_activation_clicked', 'reordered', null, 5, { draft_source: 'manual' }),
  ],
})
equal(reordered.funnelBySession.generatedSessions, 1, 'a later valid generation is found after an earlier orphan')
equal(reordered.funnelBySession.activationClickedSessions, 1, 'a later valid activation is found after an earlier orphan')
equal(reordered.funnelBySession.generatedBeforeViewSessions, 1, 'generation before the first view remains diagnostic')

const unknownActivationSource = buildLocalBusinessBriefFunnelReport({
  generatedAt: at(20),
  instrumentedAt: '2026-09-01T22:32:56.000Z',
  profiles: [],
  events: [
    local('local_business_brief_viewed', 'unknown-source', null, 1),
    local('local_business_brief_generated', 'unknown-source', null, 2, { draft_source: 'manual' }),
    local('local_business_brief_activation_clicked', 'unknown-source', null, 3, { draft_source: 'invalid' }),
  ],
})
equal(unknownActivationSource.funnelBySession.activationClickedSessions, 0, 'invalid activation source never enters the funnel')
equal(unknownActivationSource.funnelBySession.unknownSourceActivationSessions, 1, 'invalid activation source remains diagnostic')

const invalidCampaign = buildLocalBusinessBriefFunnelReport({
  generatedAt: at(20),
  instrumentedAt: '2026-09-01T22:32:56.000Z',
  profiles: [],
  events: [
    local('local_business_brief_viewed', 'wrong-campaign', null, 1, { campaign: 'wrong' }),
    local('local_business_brief_viewed', 'missing-campaign', null, 2, { campaign: undefined }),
    local('local_business_brief_viewed', 'wrong-surface', null, 3, { surface: 'wrong' }),
  ],
})
equal(invalidCampaign.funnelBySession.viewedSessions, 0, 'wrong or missing campaign and surface never enter the gate')

const paymentBeforeCheckout = buildLocalBusinessBriefFunnelReport({
  generatedAt: at(20),
  instrumentedAt: '2026-09-01T22:32:56.000Z',
  profiles: [{ id: 'buyer', email: 'buyer@example.com', created_at: at(1), signup_utm_campaign: LOCAL_BUSINESS_BRIEF_CAMPAIGN }],
  events: [
    event('payment_success', 'buyer', 2, { stripe_session_id: 'cs_early' }),
    event('checkout_started', 'buyer', 3, { stripe_session_id: 'cs_early' }),
  ],
})
equal(paymentBeforeCheckout.attributedSignupJourney.paymentSucceededPeople, 0, 'payment before checkout is not attributed')

const mismatchedPayment = buildLocalBusinessBriefFunnelReport({
  generatedAt: at(20),
  instrumentedAt: '2026-09-01T22:32:56.000Z',
  profiles: [{ id: 'buyer', email: 'buyer@example.com', created_at: at(1), signup_utm_campaign: LOCAL_BUSINESS_BRIEF_CAMPAIGN }],
  events: [
    event('checkout_started', 'buyer', 2, { stripe_session_id: 'cs_a' }),
    event('payment_success', 'buyer', 3, { stripe_session_id: 'cs_b' }),
  ],
})
equal(mismatchedPayment.attributedSignupJourney.paymentSucceededPeople, 0, 'payment for another Stripe Session is not attributed')

const readyEvents = [
  ...Array.from({ length: 10 }, (_, index) =>
    local('local_business_brief_viewed', `ready-${index}`, null, index + 1),
  ),
  ...Array.from({ length: 3 }, (_, index) =>
    local('local_business_brief_generated', `ready-${index}`, null, index + 20, { draft_source: 'manual' }),
  ),
]
const ready = buildLocalBusinessBriefFunnelReport({
  generatedAt: '2026-09-02T01:00:00.000Z',
  instrumentedAt: '2026-09-01T22:32:56.000Z',
  events: readyEvents,
  profiles: [],
})
equal(ready.gate.viewedSessionsMet, true, 'ten viewed sessions meet the traffic gate')
equal(ready.gate.manualGeneratedSessionsMet, true, 'three sequenced manual generations meet the usage gate')
equal(ready.gate.state, 'ready_for_decision', '10 viewed and 3 generated sessions open the gate')

const sampleOnly = buildLocalBusinessBriefFunnelReport({
  generatedAt: '2026-09-02T01:00:00.000Z',
  instrumentedAt: '2026-09-01T22:32:56.000Z',
  profiles: [],
  events: [
    ...Array.from({ length: 10 }, (_, index) =>
      local('local_business_brief_viewed', `sample-only-${index}`, null, index + 1),
    ),
    ...Array.from({ length: 3 }, (_, index) =>
      local('local_business_brief_generated', `sample-only-${index}`, null, index + 20, { draft_source: 'sample' }),
    ),
  ],
})
equal(sampleOnly.funnelBySession.generatedSessions, 3, 'sample generation remains visible')
equal(sampleOnly.gate.manualGeneratedSessionsMet, false, 'three sample clicks do not open the business-use gate')
equal(sampleOnly.gate.state, 'collecting', 'sample-only traffic remains collecting')

const caller = fs.readFileSync('scripts/measure-local-business-brief-funnel.mjs', 'utf8')
equal((caller.match(/\.range\(from, to\)/g) ?? []).length, 2, 'events and profiles are explicitly paginated')
ok(caller.includes(".gte('created_at', LOCAL_BUSINESS_BRIEF_INSTRUMENTED_AT)"), 'event query uses fixed boundary')
ok(caller.includes(".in('name', eventNames)"), 'query is bounded to consumed events')
ok(caller.includes(".select('id,email,created_at,signup_utm_campaign')"), 'profiles carry identity and exact attribution')
ok(!caller.includes('count(distinct coalesce'), 'caller never merges people and sessions')

console.log(`local business brief funnel report: ${checks}/${checks} checks passed`)
