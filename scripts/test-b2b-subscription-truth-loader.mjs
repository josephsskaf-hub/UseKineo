#!/usr/bin/env node
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  businessAnswerRouterCandidateSessions,
  exactPricingCandidateSessions,
  loadB2bSubscriptionTruthInputs,
} from './b2b-subscription-truth-loader.mjs'
import {
  B2B_ATTRIBUTABLE_PATHS,
  buildB2bSubscriptionTruthReport,
} from './b2b-subscription-truth-report.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
let checks = 0
const equal = (actual, expected, label) => { assert.deepEqual(actual, expected, label); checks += 1 }
const check = (value, label) => { assert.ok(value, label); checks += 1 }
const path = B2B_ATTRIBUTABLE_PATHS.business_answer_router_recurring
const scopePath = B2B_ATTRIBUTABLE_PATHS.agency_scope_recurring
const scopeAutopilotPath = B2B_ATTRIBUTABLE_PATHS.agency_scope_autopilot
const at = (minute) => new Date(Date.parse('2026-09-03T00:00:00.000Z') + minute * 60_000).toISOString()
const row = (id, name, userId, sessionId, minute, metadata = {}) => ({
  id, name, user_id: userId, session_id: sessionId, created_at: at(minute), metadata,
})

const primary = [
  row('v1', path.events.viewed, null, 'router_session_01', 1, { source: path.intentCampaign }),
  row('c1', 'checkout_started', 'buyer', 'router_session_01', 3, {
    intent_campaign: path.intentCampaign,
    stripe_session_id: 'cs_router_loader',
    tier: 'starter',
    billing: 'monthly',
  }),
  row('p1', 'payment_success', 'buyer', null, 4, {
    checkout_mode: 'subscription',
    stripe_session_id: 'cs_router_loader',
    amount_total: 700,
    currency: 'usd',
  }),
]
const hiddenIdentityConflict = row(
  'h1',
  'landing_session_started',
  'other_owner',
  'router_session_01',
  2,
  { source: 'direct' },
)
const sessionCalls = []
const loaded = await loadB2bSubscriptionTruthInputs({
  fetchPrimaryEvents: async () => primary,
  fetchProfiles: async () => [
    { id: 'buyer', email: 'buyer@example.com' },
    { id: 'other_owner', email: 'other@example.com' },
  ],
  fetchSessionEvents: async (sessionIds) => {
    sessionCalls.push(sessionIds)
    return [primary[0], primary[1], hiddenIdentityConflict]
  },
})

equal(businessAnswerRouterCandidateSessions(primary), ['router_session_01'], 'exact view and Checkout resolve one candidate session')
const scopePrimary = [
  row('scope_v1', scopePath.events.viewed, null, 'scope_session_01', 5, { source: scopePath.intentCampaign }),
  row('scope_c1', 'checkout_started', 'buyer', 'scope_session_01', 6, {
    intent_campaign: scopePath.intentCampaign,
    stripe_session_id: 'cs_scope_loader',
    tier: 'basic',
    billing: 'monthly',
  }),
]
const scopeAutopilotPrimary = [
  row('scope_auto_v1', scopeAutopilotPath.events.viewed, null, 'scope_auto_session_01', 7, { source: scopeAutopilotPath.intentCampaign }),
  row('scope_auto_c1', 'checkout_started', 'buyer', 'scope_auto_session_01', 8, {
    intent_campaign: scopeAutopilotPath.intentCampaign,
    stripe_session_id: 'cs_scope_auto_loader',
    tier: 'autopilot',
    billing: 'monthly',
  }),
]
equal(
  exactPricingCandidateSessions([...primary, ...scopePrimary, ...scopeAutopilotPrimary]),
  ['router_session_01', 'scope_auto_session_01', 'scope_session_01'],
  'identity audit includes every exact-pricing path instead of only the answer router',
)
equal(
  businessAnswerRouterCandidateSessions([...primary, ...scopePrimary]),
  ['router_session_01'],
  'legacy router helper remains narrowly scoped while the production loader audits all exact-pricing paths',
)
equal(sessionCalls, [['router_session_01']], 'loader calls the session-identity reader for the candidate')
equal(loaded.events.length, 4, 'loader merges duplicate primary rows and keeps hidden identity event')
equal(loaded.identityAudit, { candidateBrowserSessions: 1, fetchedSessionChunks: 1, additionalEventRows: 1 }, 'loader reports its identity audit')

const report = buildB2bSubscriptionTruthReport({
  generatedAt: at(10),
  windowStart: at(0),
  events: loaded.events,
  profiles: loaded.profiles,
})
equal(report.paths.business_answer_router_recurring.subscription.stripeSessions, 0, 'runner-loaded unrelated owner invalidates router attribution')
equal(report.quality.subscriptionStartsWithConflictingEntryViewIdentity, 1, 'runner-loaded conflict is disclosed')

let emptySessionCalls = 0
const empty = await loadB2bSubscriptionTruthInputs({
  fetchPrimaryEvents: async () => [row('x1', 'pricing_view', null, 'ordinary_session_01', 1, { source: 'ordinary_pricing' })],
  fetchProfiles: async () => [],
  fetchSessionEvents: async () => { emptySessionCalls += 1; return [] },
})
equal(emptySessionCalls, 0, 'no candidate campaign means no secondary read')
equal(empty.identityAudit.fetchedSessionChunks, 0, 'empty audit reports zero chunks')

const runner = readFileSync(join(root, 'scripts/measure-b2b-subscription-truth.mjs'), 'utf8')
check(runner.includes('loadB2bSubscriptionTruthInputs({'), 'production runner executes the identity-aware loader')
check(runner.includes(".in('session_id', sessionIds)"), 'production runner queries all names by candidate session ids')
check(runner.includes("paged('events-session-identity'"), 'secondary query remains paginated')
check(!runner.slice(runner.indexOf("paged('events-session-identity'"), runner.indexOf('const report')).includes(".in('name'"), 'secondary query is not restricted to the event allowlist')

console.log(`b2b subscription truth loader: ${checks}/${checks}`)
