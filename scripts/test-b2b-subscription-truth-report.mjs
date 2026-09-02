#!/usr/bin/env node
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  B2B_ASSIST_SURFACES,
  B2B_ATTRIBUTABLE_PATHS,
  B2B_SUBSCRIPTION_TRUTH_REPORT_VERSION,
  buildB2bSubscriptionTruthReport,
} from './b2b-subscription-truth-report.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const root = join(here, '..')
let checks = 0
function equal(actual, expected, message) { checks += 1; assert.deepEqual(actual, expected, message) }
function check(actual, message) { checks += 1; assert.ok(actual, message) }

const at = (minute) => new Date(Date.parse('2026-09-01T00:00:00.000Z') + minute * 60_000).toISOString()
const event = (id, name, user, session, minute, metadata = {}) => ({ id, name, user_id: user, session_id: session, created_at: at(minute), metadata })
const profile = (id, email) => ({ id, email })
const start = (id, user, browser, minute, campaign, stripe, tier = 'basic', billing = 'monthly', extra = {}) => event(id, 'checkout_started', user, browser, minute, {
  tier, billing, intent_campaign: campaign, stripe_session_id: stripe, ...extra,
})
const paid = (id, user, minute, stripe, amount = 1500, currency = 'usd', extra = {}) => event(id, 'payment_success', user, null, minute, {
  checkout_mode: 'subscription', stripe_session_id: stripe, amount_total: amount, currency, ...extra,
})

const profiles = [
  profile('business', 'business@example.com'),
  profile('brief', 'brief@example.com'),
  profile('case', 'case@example.com'),
  profile('pack', 'pack@example.com'),
  profile('other', 'other@example.com'),
  profile('internal', 'josephsskaf@gmail.com'),
  profile('unknown', null),
]
const business = B2B_ATTRIBUTABLE_PATHS.business_plan
const brief = B2B_ATTRIBUTABLE_PATHS.client_brief
const caseStudy = B2B_ATTRIBUTABLE_PATHS.autopilot_case_study
const local = B2B_ASSIST_SURFACES.local_business_brief
const agency = B2B_ASSIST_SURFACES.agency_margin_proposal
const autopilot = B2B_ASSIST_SURFACES.autopilot_break_even

const events = [
  event('1', business.events.viewed, null, 'browser_business', 1, { version: business.eventVersion }),
  event('2', business.events.generated, null, 'browser_business', 2, { version: business.eventVersion }),
  event('3', business.events.activation, null, 'browser_business', 3, { version: business.eventVersion }),
  start('4', 'business', 'browser_business', 4, business.intentCampaign, 'cs_business'),
  paid('5', 'business', 5, 'cs_business', 1500, 'USD'),
  paid('6', 'business', 6, 'cs_business', 1500, 'usd'),
  event('7', brief.events.viewed, 'brief', 'browser_brief', 10, { version: brief.eventVersion }),
  event('8', brief.events.generated, 'brief', 'browser_brief', 11, { version: brief.eventVersion }),
  event('9', brief.events.copied, 'brief', 'browser_brief', 12, { version: brief.eventVersion }),
  start('10', 'brief', 'browser_brief', 13, brief.intentCampaign, 'cs_brief', 'pro', 'annual'),
  start('11', 'case', 'browser_case', 14, caseStudy.intentCampaign, 'cs_case', 'autopilot', 'monthly'),
  paid('12', 'case', 15, 'cs_case', 29900, 'usd'),
  event('13', brief.events.packChoice, 'pack', 'browser_pack', 20, { version: brief.eventVersion }),
  event('14', 'checkout_started', 'pack', 'browser_pack', 21, { sku: 'bulk10', stripe_session_id: 'cs_pack' }),
  event('15', 'payment_success', 'pack', null, 22, { checkout_mode: 'payment', stripe_session_id: 'cs_pack', amount_total: 9900, currency: 'usd' }),
  event('16', business.events.generated, 'internal', 'internal_browser', 30, { version: business.eventVersion }),
  event('17', business.events.generated, 'unknown', 'unknown_browser', 31, { version: business.eventVersion }),
  event('18', business.events.generated, null, 'anonymous_only', 32, { version: business.eventVersion }),
  start('19', 'other', 'other_browser', 33, 'forged_campaign', 'cs_forged'),
  event('20', local.events.viewed, null, 'local_browser', 35, { version: local.eventVersion }),
  event('21', local.events.generated, null, 'local_browser', 36, { version: local.eventVersion, draft_source: 'sample' }),
  event('22', local.events.generated, null, 'local_browser', 37, { version: local.eventVersion, draft_source: 'manual' }),
  event('23', agency.events.viewed, 'business', 'agency_browser', 38, { version: agency.eventVersion }),
  event('24', agency.events.proposalCopied, 'business', 'agency_browser', 39, { version: agency.eventVersion }),
  event('25', autopilot.events.viewed, 'brief', 'auto_browser', 40, { version: autopilot.eventVersion }),
  event('26', 'autopilot_break_even_human_viewed', 'brief', 'auto_browser', 41, { version: 'autopilot_decision_funnel_v1' }),
  event('27', autopilot.events.calculated, 'brief', 'auto_browser', 42, { version: autopilot.eventVersion }),
  event('28', autopilot.events.checkoutChoice, 'brief', 'auto_browser', 43, { version: autopilot.eventVersion, choice: 'monthly' }),
  event('29', autopilot.events.checkoutChoice, 'brief', 'auto_browser', 44, { version: autopilot.eventVersion, choice: 'pilot' }),
]

const report = buildB2bSubscriptionTruthReport({ generatedAt: at(60), windowStart: at(0), events, profiles })
equal(report.schemaVersion, B2B_SUBSCRIPTION_TRUTH_REPORT_VERSION, 'stable schema')
equal(report.paths.business_plan.stages.viewed.anonymousSessions, 1, 'anonymous view stays a session')
equal(report.paths.business_plan.stages.generated.anonymousSessions, 2, 'anonymous generation never becomes a person')
equal(report.paths.business_plan.stages.generated.internalEventRows, 1, 'internal stage rows are disclosed')
equal(report.paths.business_plan.stages.generated.unknownIdentifiedEventRows, 1, 'unknown profiles are disclosed')
equal(report.paths.client_brief.stages.generated.identifiedExternalPeople, 1, 'external generated person is counted')
equal(report.paths.client_brief.stages.oneTimePackChoice.identifiedExternalPeople, 1, 'pack choice remains separate')
equal(report.totals.identifiedExternalSubscriptionPeople, 3, 'three external recurring buyers started')
equal(report.totals.subscriptionStripeSessions, 3, 'three exact recurring Sessions')
equal(report.totals.byBilling, { annual: 1, monthly: 2 }, 'annual and monthly stay separate')
equal(report.totals.exactPaidPeople, 2, 'two exact paid people')
equal(report.totals.exactPaidStripeSessions, 2, 'duplicate webhook row counts once')
equal(report.totals.exactRevenueMinorByCurrency, { usd: 31400 }, 'exact revenue is currency-grouped')
equal(report.paths.business_plan.subscription.withArtifactWitness, 1, 'same browser generation witnesses business path')
equal(report.paths.client_brief.subscription.withArtifactWitness, 1, 'same person generation witnesses brief path')
equal(report.paths.autopilot_case_study.subscription.campaignOnlyWithoutArtifactWitness, 1, 'case study campaign is explicit without inventing an artifact')
equal(report.quality.packSessionsExcludedFromSubscribers, 1, 'pack Session never becomes a subscriber')
check(!report.journeys.some((journey) => journey.stripeSessionId === 'cs_pack'), 'pack absent from journeys')
check(!report.journeys.some((journey) => journey.stripeSessionId === 'cs_forged'), 'arbitrary campaign rejected')
check(!JSON.stringify(report).includes('business@example.com'), 'report never emits email')
equal(report.assistSurfaces.local_business_brief.manualGenerated.anonymousSessions, 1, 'manual local brief separated')
equal(report.assistSurfaces.local_business_brief.sampleGenerated.anonymousSessions, 1, 'sample local brief separated')
equal(report.assistSurfaces.local_business_brief.attributionState, 'campaign_lost_inside_explicit_signup_redirect', 'known local attribution gap explicit')
equal(report.assistSurfaces.agency_margin_proposal.proposalCopied.identifiedExternalPeople, 1, 'proposal is an assist')
equal(report.assistSurfaces.autopilot_break_even.humanViewed.identifiedExternalPeople, 1, 'human view separate from render')
equal(report.assistSurfaces.autopilot_break_even.monthlyChoice.identifiedExternalPeople, 1, 'monthly choice separated')
equal(report.assistSurfaces.autopilot_break_even.pilotChoiceExcludedFromSubscriptions.identifiedExternalPeople, 1, 'pilot excluded')

const conflict = buildB2bSubscriptionTruthReport({
  generatedAt: at(60), windowStart: at(0), profiles,
  events: [start('c1', 'business', 'b', 1, business.intentCampaign, 'cs_conflict'), paid('c2', 'other', 2, 'cs_conflict')],
})
equal(conflict.totals.exactPaidStripeSessions, 0, 'different payment owner yields zero revenue')

const timeline = buildB2bSubscriptionTruthReport({
  generatedAt: at(60), windowStart: at(0), profiles,
  events: [paid('t1', 'business', 1, 'cs_early'), start('t2', 'business', 'b', 2, business.intentCampaign, 'cs_early')],
})
equal(timeline.totals.exactPaidStripeSessions, 0, 'payment before start never converts')

const invalid = buildB2bSubscriptionTruthReport({
  generatedAt: at(60), windowStart: at(0), profiles,
  events: [
    start('i1', 'business', 'b', 1, business.intentCampaign, 'cs_pilot', 'autopilot', 'monthly', { sku: 'autopilot_pilot' }),
    start('i2', 'business', 'b', 2, business.intentCampaign, 'cs_bad_annual', 'autopilot', 'annual'),
    start('i3', 'business', 'b', 3, business.intentCampaign, 'cs_bad_tier', 'enterprise', 'monthly'),
  ],
})
equal(invalid.quality.invalidRecurringRowsOnB2bCampaigns, 3, 'pilot, impossible Autopilot annual and unknown tier are invalid')
equal(invalid.totals.subscriptionStripeSessions, 0, 'invalid products never enter journeys')

const oldStart = buildB2bSubscriptionTruthReport({
  generatedAt: at(60), windowStart: at(0), profiles,
  events: [start('o1', 'business', 'old', -10, business.intentCampaign, 'cs_old'), paid('o2', 'business', 2, 'cs_old')],
})
equal(oldStart.totals.exactPaidStripeSessions, 1, 'payment in window keeps its earlier exact start')

const collision = buildB2bSubscriptionTruthReport({
  generatedAt: at(60), windowStart: at(0), profiles,
  events: [
    start('d1', 'business', 'one', 1, business.intentCampaign, 'cs_duplicate'),
    start('d2', 'business', 'one', 2, brief.intentCampaign, 'cs_duplicate'),
  ],
})
equal(collision.quality.subscriptionStartStripeSessionConflicts, 1, 'one Session with two campaigns fails closed')
equal(collision.totals.subscriptionStripeSessions, 0, 'conflicting Session is unattributed')

const internalCollision = buildB2bSubscriptionTruthReport({
  generatedAt: at(60), windowStart: at(0), profiles,
  events: [
    start('m1', 'business', 'external_browser', 1, business.intentCampaign, 'cs_mixed_owner'),
    start('m2', 'internal', 'internal_browser', 2, business.intentCampaign, 'cs_mixed_owner'),
  ],
})
equal(internalCollision.quality.subscriptionStartStripeSessionConflicts, 1, 'mixed internal and external ownership fails closed')
equal(internalCollision.totals.subscriptionStripeSessions, 0, 'mixed-owner Session never counts as external')

const future = buildB2bSubscriptionTruthReport({
  generatedAt: at(5), windowStart: at(0), profiles,
  events: [event('f1', brief.events.generated, 'brief', 'b', 10, { version: brief.eventVersion })],
})
equal(future.paths.client_brief.stages.generated.eventRows, 0, 'future rows excluded')
equal(future.gate.state, 'collecting', 'no sample stays collecting')

const businessSource = readFileSync(join(root, 'lib/growth/businessContentPlan.ts'), 'utf8')
const briefSource = readFileSync(join(root, 'lib/growth/clientShortBrief.ts'), 'utf8')
const checkoutSource = readFileSync(join(root, 'app/api/stripe/checkout/route.ts'), 'utf8')
const generateSource = readFileSync(join(root, 'app/(dashboard)/generate/GenerateClient.tsx'), 'utf8')
const localSource = readFileSync(join(root, 'lib/toolActivationHref.ts'), 'utf8')
const signupSource = readFileSync(join(root, 'app/(auth)/signup/page.tsx'), 'utf8')
const autopilotSource = readFileSync(join(root, 'app/pricing/AutopilotBreakEvenCalculator.tsx'), 'utf8')
check(businessSource.includes(`BUSINESS_PLAN_CAMPAIGN = '${business.intentCampaign}'`), 'business campaign matches code')
check(businessSource.includes(`BUSINESS_PLAN_SHARE_CAMPAIGN = '${business.eventVersion}'`), 'business event version matches code')
check(briefSource.includes(`CLIENT_SHORT_BRIEF_CAMPAIGN = '${brief.intentCampaign}'`), 'brief campaign matches code')
check(checkoutSource.includes('intent_campaign: intentCampaign ?? null'), 'server checkout persists intent campaign')
check(generateSource.includes('intent_campaign=${encodeURIComponent(intentCampaign)}'), 'generate checkout URLs preserve intent campaign')
check(!localSource.slice(localSource.indexOf('export function toolActivationHref')).includes("generate.set('intent_campaign'"), 'local explicit redirect omits campaign')
check(signupSource.includes('if (explicitRedirect) return explicitRedirect'), 'signup returns explicit redirect before outer attribution forwarding')
check(autopilotSource.includes("choice: 'pilot' | 'monthly'"), 'Autopilot calculator distinguishes pilot and monthly')

console.log(`b2b subscription truth: ${checks}/${checks}`)
