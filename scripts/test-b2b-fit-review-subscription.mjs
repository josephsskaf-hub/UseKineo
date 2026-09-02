#!/usr/bin/env node
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import ts from 'typescript'
import {
  B2B_FIT_REVIEW_ALLOWED_VOLUMES,
  B2B_FIT_REVIEW_CONTRACT,
  B2B_FIT_REVIEW_MIN_RESOLVED_PEOPLE,
  B2B_FIT_REVIEW_SUBSCRIPTION_VERSION,
  buildB2bFitReviewSubscriptionReport,
} from './b2b-fit-review-subscription-report.mjs'
import { collectB2bFitReviewSubscription } from './measure-b2b-fit-review-subscription.mjs'

let checks = 0
const equal = (actual, expected, label) => { assert.deepEqual(actual, expected, label); checks += 1 }
const check = (value, label) => { assert.ok(value, label); checks += 1 }
const base = Date.parse('2026-09-01T00:00:00.000Z')
const at = (hours) => new Date(base + hours * 3_600_000).toISOString()
const generatedAt = at(19 * 24)
const windowStart = at(-11 * 24)
const profile = (id, email = `${id}@example.com`, created_at = at(-30)) => ({ id, email, created_at })
const event = (id, name, user, session, hour, metadata = {}) => ({
  id, name, user_id: user, session_id: session, created_at: at(hour), metadata,
})
const attribution = {
  version: 'b2b_brief_v1_2026_08_28',
  surface: 'ai_shorts_for_agencies',
  entry_campaign: 'b2b_volume_fit_review_v1',
  entry_source: 'kineo_facts',
  entry_medium: 'answer_engine',
}
const view = (id, user, session, hour, extra = {}) => event(id, 'b2b_brief_viewed', user, session, hour, { ...attribution, ...extra })
const submit = (id, user, session, hour, volume = '20_49', extra = {}) => event(id, 'b2b_brief_submitted', user, session, hour, { ...attribution, monthly_volume: volume, ...extra })
const start = (id, user, session, hour, stripe, extra = {}) => event(id, 'checkout_started', user, session, hour, {
  stripe_session_id: stripe, tier: 'starter', billing: 'monthly', ...extra,
})
const payment = (id, user, hour, stripe, amount = 700, currency = 'usd', extra = {}) => event(id, 'payment_success', user, null, hour, {
  stripe_session_id: stripe, checkout_mode: 'subscription', amount_total: amount, currency, ...extra,
})

function report({ evidenceEvents = [], sessionEvents = evidenceEvents, financialEvents = [], profiles = [profile('u1')] } = {}) {
  return buildB2bFitReviewSubscriptionReport({ generatedAt, windowStart, evidenceEvents, sessionEvents, financialEvents, profiles })
}

const happyEvidence = [view('v1', 'u1', 'b1', 1), submit('q1', 'u1', 'b1', 2)]
let result = report({ evidenceEvents: happyEvidence, financialEvents: [start('s1', 'u1', 'b2', 3, 'cs1'), payment('p1', 'u1', 4, 'cs1')] })
equal(result.schemaVersion, B2B_FIT_REVIEW_SUBSCRIPTION_VERSION, 'schema is stable')
equal(result.attributionLabel, 'temporal_assist_not_causal_attribution', 'association is never called causal attribution')
equal(result.funnel.exactViewBrowserSessions, 1, 'exact view session is counted')
equal(result.funnel.exactSubmitBrowserSessions, 1, 'exact submit session is counted')
equal(result.funnel.resolvedExternalSubmitPeople, 1, 'one external submitter is one person')
equal(result.funnel.recurringCheckoutPeople, 1, 'same person later opens a recurring checkout')
equal(result.funnel.recurringCheckoutStripeSessions, 1, 'first exact recurring Session is the unit')
equal(result.funnel.exactPaidPeople, 1, 'same person and Session payment counts once')
equal(result.funnel.exactPaidStripeSessions, 1, 'paid Session count is exact')
equal(result.funnel.exactRevenueMinorByCurrency, { usd: 700 }, 'revenue stays in minor units by currency')
equal(result.funnel.byMonthlyVolume['20_49'].paidPeople, 1, 'volume segment preserves the paid person')
// Contract correction: the report already declared that the first exact Stripe
// Session opens reconciliation, but the old assertion only tested the sample
// threshold. The state now follows the declared early-diagnosis rule.
equal(result.gate.firstExactStripeSessionObserved, true, 'first exact Stripe Session is computed')
equal(result.gate.state, 'ready_for_assist_review', 'first exact Stripe Session opens early reconciliation')
equal(result.gate.neverAuthorizesProductChange, true, 'measurement never authorizes product changes')

const anonEvidence = [view('v2', null, 'anon1', 1), submit('q2', null, 'anon1', 2, '10_19')]
result = report({
  evidenceEvents: anonEvidence,
  sessionEvents: [...anonEvidence, event('login', 'signed_in', 'u1', 'anon1', 1.5)],
})
equal(result.funnel.resolvedExternalSubmitPeople, 1, 'anonymous submit resolves through one external session owner')
equal(result.exclusionsAndDiagnostics.submitBrowserSessionsByOwnerState, { external: 1 }, 'resolved owner state is explicit')

result = report({ evidenceEvents: anonEvidence })
equal(result.funnel.resolvedExternalSubmitPeople, 0, 'ownerless anonymous submit never becomes a person')
equal(result.exclusionsAndDiagnostics.submitBrowserSessionsByOwnerState, { anonymous_unresolved: 1 }, 'anonymous unresolved state remains visible')

result = report({
  evidenceEvents: anonEvidence,
  sessionEvents: [...anonEvidence, event('a', 'x', 'u1', 'anon1', 2.1), event('b', 'x', 'u2', 'anon1', 2.2)],
  profiles: [profile('u1'), profile('u2')],
})
equal(result.funnel.resolvedExternalSubmitPeople, 0, 'shared browser with two owners fails closed')
equal(result.exclusionsAndDiagnostics.submitBrowserSessionsByOwnerState, { identity_conflict: 1 }, 'shared browser conflict is diagnosed')

result = report({ evidenceEvents: happyEvidence, profiles: [profile('u1', 'joseph+testcase@gmail.com')] })
equal(result.funnel.resolvedExternalSubmitPeople, 0, 'internal account is excluded')
equal(result.exclusionsAndDiagnostics.submitBrowserSessionsByOwnerState, { internal: 1 }, 'internal exclusion is visible')

result = report({ evidenceEvents: happyEvidence, profiles: [] })
equal(result.funnel.resolvedExternalSubmitPeople, 0, 'unknown profile never becomes external')

result = report({
  evidenceEvents: happyEvidence,
  sessionEvents: [event('foreign-owner', 'signed_in', 'u2', 'b1', 1.5)],
  profiles: [profile('u1'), profile('u2')],
})
equal(result.funnel.resolvedExternalSubmitPeople, 0, 'explicit submit owner mismatch fails closed')
equal(result.exclusionsAndDiagnostics.submitBrowserSessionsByOwnerState, { submit_owner_conflict: 1 }, 'owner diagnostics are mutually exclusive')

result = report({ evidenceEvents: [submit('q3', 'u1', 'b1', 2)] })
equal(result.funnel.resolvedExternalSubmitPeople, 0, 'submit without prior view is not anchored')
equal(result.exclusionsAndDiagnostics.submitBrowserSessionsByOwnerState, { missing_prior_view: 1 }, 'missing view is named')

result = report({ evidenceEvents: [submit('q4', 'u1', 'b1', 1), view('v4', 'u1', 'b1', 2)] })
equal(result.funnel.resolvedExternalSubmitPeople, 0, 'view after submit cannot anchor the funnel')
equal(result.exclusionsAndDiagnostics.submitBrowserSessionsByOwnerState, { view_after_submit: 1 }, 'inverted view chronology is named')

result = report({ evidenceEvents: [view('v4t', 'u1', 'b1', 2), submit('q4t', 'u1', 'b1', 2)] })
equal(result.funnel.resolvedExternalSubmitPeople, 0, 'equal view and submit clocks do not prove order')
equal(result.exclusionsAndDiagnostics.submitBrowserSessionsByOwnerState, { view_after_submit: 1 }, 'clock tie is diagnosed as lacking a prior view')

result = report({ evidenceEvents: [view('v5', 'u1', 'b1', 1), submit('q5', 'u1', 'b1', 2, 'fake')] })
equal(result.exclusionsAndDiagnostics.invalidContractSubmitRows, 1, 'unknown volume is rejected')
equal(result.funnel.resolvedExternalSubmitPeople, 0, 'unknown volume never enters cohort')

result = report({ evidenceEvents: [view('v6', 'u1', 'b1', 1, { entry_source: 'wrong' }), submit('q6', 'u1', 'b1', 2)] })
equal(result.exclusionsAndDiagnostics.invalidContractViewRows, 1, 'wrong source is rejected')
equal(result.funnel.resolvedExternalSubmitPeople, 0, 'wrong source cannot anchor a submit')

result = report({ evidenceEvents: [
  view('v7', 'u1', 'b1', 1), submit('q7', 'u1', 'b1', 2),
  view('v8', 'u1', 'b2', 3), submit('q8', 'u1', 'b2', 4, '50_99'),
] })
equal(result.funnel.resolvedExternalSubmitPeople, 1, 'repeat submitter remains one person')
equal(result.funnel.byMonthlyVolume['20_49'].resolvedSubmitPeople, 1, 'first exact volume is the cohort anchor')

result = report({ evidenceEvents: happyEvidence, financialEvents: [start('old-s', 'u1', 'old', -10, 'old-cs'), payment('old-p', 'u1', -9, 'old-cs')] })
equal(result.funnel.resolvedExternalSubmitPeople, 1, 'preexisting subscriber remains a resolved submitter')
equal(result.funnel.eligibleNonSubscriberSubmitPeople, 0, 'preexisting subscriber is excluded from acquisition eligibility')
equal(result.exclusionsAndDiagnostics.preexistingExactSubscriberPeople, 1, 'preexisting subscriber remains diagnosable')

result = report({ evidenceEvents: happyEvidence, financialEvents: [start('cross-s', 'u1', 'old', 1.5, 'cross-cs'), payment('cross-p', 'u1', 3, 'cross-cs')] })
equal(result.funnel.eligibleNonSubscriberSubmitPeople, 0, 'subscription Session started before submit cannot become a new prospect')
equal(result.exclusionsAndDiagnostics.preexistingSubscriptionStartedBeforeSubmitPeople, 1, 'crossing payment chronology is diagnosed')

result = report({ evidenceEvents: happyEvidence, financialEvents: [payment('raw-old', 'u1', -9, 'unlinked')] })
equal(result.funnel.resolvedExternalSubmitPeople, 1, 'unlinked prior payment does not erase the resolved submitter')
equal(result.funnel.eligibleNonSubscriberSubmitPeople, 0, 'unlinked prior payment fails closed for acquisition eligibility')
equal(result.exclusionsAndDiagnostics.preexistingSubscriptionUnknownPeople, 1, 'unlinked prior payment is explicit')
equal(result.gate.state, 'blocked_data_quality', 'uncertain prior subscriber blocks the gate')

result = report({ evidenceEvents: happyEvidence, financialEvents: [start('pack', 'u1', 'b2', 3, 'pack-cs', { sku: 'pack_100' })] })
equal(result.funnel.recurringCheckoutPeople, 0, 'one-time pack is never recurring subscription checkout')

result = report({ evidenceEvents: happyEvidence, financialEvents: [start('early', 'u1', 'b2', 1.5, 'early-cs')] })
equal(result.funnel.recurringCheckoutPeople, 0, 'checkout before submit is excluded')

result = report({ evidenceEvents: happyEvidence, financialEvents: [start('late', 'u1', 'b2', 2 + 7 * 24 + 1, 'late-cs')] })
equal(result.funnel.recurringCheckoutPeople, 0, 'checkout after fixed observation window is excluded')

result = report({ evidenceEvents: happyEvidence, financialEvents: [
  start('tie1', 'u1', 'b2', 3, 'tie-a'), start('tie2', 'u1', 'b2', 3, 'tie-b'),
] })
equal(result.funnel.recurringCheckoutPeople, 0, 'two first Sessions at same clock fail closed')
equal(result.exclusionsAndDiagnostics.ambiguousFirstCheckoutPeople, 1, 'first Session tie is diagnosed')
equal(result.gate.state, 'blocked_data_quality', 'ambiguous first Session blocks gate')

result = report({ evidenceEvents: happyEvidence, financialEvents: [start('bad-s', 'u1', 'b2', 3, 'bad-cs'), payment('bad-p', 'u2', 4, 'bad-cs')], profiles: [profile('u1'), profile('u2')] })
equal(result.funnel.exactPaidPeople, 0, 'different payment owner yields zero paid people')
equal(result.exclusionsAndDiagnostics.unresolvedCheckoutPeople, 1, 'ledger conflict is scoped and diagnosed')
equal(result.funnel.recurringCheckoutPeople, 0, 'conflicting Stripe Session is not published as an exact checkout')
equal(result.funnel.recurringCheckoutStripeSessions, 0, 'conflicting Stripe Session contributes zero exact Sessions')

result = report({ evidenceEvents: happyEvidence, financialEvents: [start('later-s', 'u1', 'b2', 3, 'later-cs'), payment('later-p', 'u1', 2 + 8 * 24, 'later-cs')] })
equal(result.funnel.recurringCheckoutPeople, 1, 'checkout stays in denominator when payment is later')
equal(result.funnel.exactPaidPeople, 0, 'payment after fixed observation window is not attributed')
equal(result.gate.state, 'ready_for_assist_review', 'exact Checkout still opens reconciliation when payment is post-cutoff')

const people = Array.from({ length: B2B_FIT_REVIEW_MIN_RESOLVED_PEOPLE }, (_, index) => `g${index}`)
const gateEvidence = people.flatMap((user, index) => [
  view(`gv${index}`, user, `gb${index}`, index + 1),
  submit(`gq${index}`, user, `gb${index}`, index + 1.5, B2B_FIT_REVIEW_ALLOWED_VOLUMES[index % 4]),
])
result = report({ evidenceEvents: gateEvidence, profiles: people.map((user) => profile(user)) })
equal(result.funnel.resolvedExternalSubmitPeople, 5, 'five external submitters meet people denominator')
equal(result.gate.hasAtLeastOneCompleteObservationWindow, true, 'oldest submit has seven complete days')
equal(result.gate.state, 'ready_for_assist_review', 'clean five-person sample opens review gate')

const fresh = buildB2bFitReviewSubscriptionReport({
  generatedAt: at(24), windowStart, evidenceEvents: gateEvidence, sessionEvents: gateEvidence,
  financialEvents: [], profiles: people.map((user) => profile(user)),
})
equal(fresh.gate.hasAtLeastOneCompleteObservationWindow, false, 'fresh cohort has no complete observation window')
equal(fresh.gate.state, 'collecting', 'five fresh people do not open gate')

const serialized = JSON.stringify(report({ evidenceEvents: happyEvidence, financialEvents: [start('s-private', 'u1', 'b2', 3, 'cs-private'), payment('p-private', 'u1', 4, 'cs-private')] }))
check(!serialized.includes('u1') && !serialized.includes('cs-private') && !serialized.includes('example.com'), 'report emits no raw user, Stripe Session or email')

const nullRow = { ...submit('null', 'u1', 'b1', 2), created_at: null }
result = report({ evidenceEvents: [...happyEvidence, nullRow] })
equal(result.exclusionsAndDiagnostics.undatableEvidenceRows, 1, 'undatable evidence is disclosed')

assert.throws(() => buildB2bFitReviewSubscriptionReport({ generatedAt: 'bad', windowStart, evidenceEvents: [], sessionEvents: [], financialEvents: [], profiles: [] }), /valid ordered timestamps/)
checks += 1

function queryFor({ table, calls, rowsByTable, filters }) {
  const query = {
    select(...args) { calls.push([table, 'select', ...args]); return query },
    gte(...args) { filters.push(['gte', ...args]); calls.push([table, 'gte', ...args]); return query },
    lte(...args) { filters.push(['lte', ...args]); calls.push([table, 'lte', ...args]); return query },
    is(...args) { filters.push(['is', ...args]); calls.push([table, 'is', ...args]); return query },
    in(...args) { filters.push(['in', ...args]); calls.push([table, 'in', ...args]); return query },
    order(...args) { calls.push([table, 'order', ...args]); return query },
    range(from, to) {
      calls.push([table, 'range', from, to, structuredClone(filters)])
      let rows = rowsByTable[table] ?? []
      for (const [kind, field, value] of filters) {
        if (kind === 'in') rows = rows.filter((row) => value.includes(row?.[field]))
        if (kind === 'is' && value === null) rows = rows.filter((row) => row?.[field] == null)
        if (kind === 'gte') rows = rows.filter((row) => row?.[field] != null && row[field] >= value)
        if (kind === 'lte') rows = rows.filter((row) => row?.[field] != null && row[field] <= value)
      }
      return Promise.resolve({ data: rows.slice(from, to + 1), error: null })
    },
  }
  return query
}

const collectorCalls = []
const collectorRows = {
  profiles: [profile('u1')],
  events: [...happyEvidence, event('login-row', 'signed_in', 'u1', 'b1', 1.5), start('collector-s', 'u1', 'b2', 3, 'collector-cs'), payment('collector-p', 'u1', 4, 'collector-cs')],
}
const collected = await collectB2bFitReviewSubscription({
  db: { from(table) { collectorCalls.push([table, 'from']); return queryFor({ table, calls: collectorCalls, rowsByTable: collectorRows, filters: [] }) } },
  generatedAt: new Date(generatedAt),
})
equal(collected.funnel.resolvedExternalSubmitPeople, 1, 'collector executes end to end')
equal(collected.funnel.exactPaidPeople, 1, 'collector joins exact payment')
const sessionRange = collectorCalls.find((call) => call[1] === 'range' && call[4].some((filter) => filter[0] === 'in' && filter[1] === 'session_id'))
check(Boolean(sessionRange), 'collector performs a second complete session inventory read')
check(sessionRange[4].every((filter) => filter[0] === 'in' && filter[1] === 'session_id'), 'session inventory has no time bound')

const pagingCalls = []
const pageRows = Array.from({ length: 1001 }, (_, index) => profile(`page-${index}`))
await collectB2bFitReviewSubscription({
  db: { from(table) { pagingCalls.push([table, 'from']); return queryFor({ table, calls: pagingCalls, rowsByTable: { profiles: pageRows, events: [] }, filters: [] }) } },
  generatedAt: new Date(generatedAt),
})
check(pagingCalls.some((call) => call[0] === 'profiles' && call[1] === 'range' && call[2] === 1000 && call[3] === 1999), 'profiles are paginated beyond 1000 rows')

const sourcePath = join(process.cwd(), 'lib/growth/b2bLead.ts')
const sourceText = readFileSync(sourcePath, 'utf8')
const sourceFile = ts.createSourceFile(sourcePath, sourceText, ts.ScriptTarget.Latest, true)
function initializer(name) {
  for (const statement of sourceFile.statements) {
    if (!ts.isVariableStatement(statement)) continue
    for (const declaration of statement.declarationList.declarations) {
      if (ts.isIdentifier(declaration.name) && declaration.name.text === name) return declaration.initializer
    }
  }
  return null
}
function unwrap(node) {
  let current = node
  while (current && (ts.isAsExpression(current) || ts.isParenthesizedExpression(current))) current = current.expression
  return current
}
function stringConstant(name) {
  const node = unwrap(initializer(name))
  assert.ok(node && ts.isStringLiteralLike(node), `${name} must remain a literal`)
  return node.text
}
equal(stringConstant('B2B_FIT_REVIEW_CAMPAIGN'), attribution.entry_campaign, 'report campaign matches product source')
equal(stringConstant('B2B_FIT_REVIEW_UTM_SOURCE'), attribution.entry_source, 'report source matches product source')
equal(stringConstant('B2B_FIT_REVIEW_UTM_MEDIUM'), attribution.entry_medium, 'report medium matches product source')
equal(stringConstant('B2B_BRIEF_EVENT_VERSION'), B2B_FIT_REVIEW_CONTRACT.version, 'report version matches product source')
equal(stringConstant('B2B_BRIEF_SURFACE'), B2B_FIT_REVIEW_CONTRACT.surface, 'report surface matches product source')
const volumeNode = unwrap(initializer('B2B_VOLUME_OPTIONS'))
assert.ok(volumeNode && ts.isArrayLiteralExpression(volumeNode), 'volume options must remain an array literal')
const sourceVolumes = volumeNode.elements.map((element) => {
  const object = unwrap(element)
  assert.ok(ts.isObjectLiteralExpression(object), 'volume option must remain an object literal')
  const id = object.properties.find((property) => ts.isPropertyAssignment(property) && property.name.getText(sourceFile) === 'id')
  const value = id && unwrap(id.initializer)
  assert.ok(value && ts.isStringLiteralLike(value), 'volume id must remain a string literal')
  return value.text
})
equal(sourceVolumes, [...B2B_FIT_REVIEW_ALLOWED_VOLUMES], 'report volume allowlist matches product source')

const emitterPath = join(process.cwd(), 'app/ai-shorts-for-agencies/AgencyBriefClient.tsx')
const emitterText = readFileSync(emitterPath, 'utf8')
const emitter = ts.createSourceFile(emitterPath, emitterText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
const trackedContracts = new Map()
function visit(node) {
  if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'trackEvent') {
    const [nameNode, metadataNode] = node.arguments
    if (nameNode && ts.isStringLiteralLike(nameNode) && metadataNode && ts.isObjectLiteralExpression(metadataNode)) {
      const values = {}
      for (const property of metadataNode.properties) {
        if (!ts.isPropertyAssignment(property)) continue
        const key = property.name.getText(emitter).replaceAll("'", '').replaceAll('"', '')
        if (ts.isIdentifier(property.initializer)) values[key] = property.initializer.text
      }
      trackedContracts.set(nameNode.text, values)
    }
  }
  ts.forEachChild(node, visit)
}
visit(emitter)
for (const eventName of ['b2b_brief_viewed', 'b2b_brief_submitted']) {
  equal(trackedContracts.get(eventName)?.version, 'B2B_BRIEF_EVENT_VERSION', `${eventName} reads canonical version`)
  equal(trackedContracts.get(eventName)?.surface, 'B2B_BRIEF_SURFACE', `${eventName} reads canonical surface`)
}

console.log(`b2b fit-review subscription: ${checks}/${checks} checks passed`)
