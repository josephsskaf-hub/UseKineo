#!/usr/bin/env node
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  B2B_ASSIST_SURFACES,
  B2B_ATTRIBUTABLE_PATHS,
  B2B_AGENCY_HEADER_MEASUREMENT_START,
  B2B_ANSWER_ROUTER_MEASUREMENT_START,
  B2B_ANSWER_ROUTER_MIN_OBSERVATION_DAYS,
  B2B_ANSWER_ROUTER_MIN_VIEWED_PEOPLE,
  B2B_PILOT_REVIEW_MEASUREMENT_START,
  B2B_PROPOSAL_ASSIST_LOOKBACK_DAYS,
  B2B_SUBSCRIPTION_EVENT_NAMES,
  B2B_SUBSCRIPTION_TRUTH_REPORT_VERSION,
  buildB2bSubscriptionTruthReport,
} from './b2b-subscription-truth-report.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const root = join(here, '..')
const agencyProposalSource = readFileSync(join(root, 'lib/growth/agencyProposal.ts'), 'utf8')
const agencyHeaderSource = readFileSync(join(root, 'lib/growth/agencyHeaderJourney.ts'), 'utf8')
const agencyHeaderCallerSource = readFileSync(join(root, 'app/ai-shorts-for-agencies/AgencyHeaderCta.tsx'), 'utf8')
const canonicalProposalVersion = agencyProposalSource.match(
  /AGENCY_MARGIN_PROPOSAL_VARIANT\s*=\s*'([^']+)'/,
)?.[1]
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
const agencyHeaderClick = (id, user, browser, minute, extra = {}) => event(
  id,
  'agency_header_studio_clicked',
  user,
  browser,
  minute,
  {
    version: 'agency_header_studio_v1',
    intent_campaign: 'agency_header_studio_v1',
    surface: 'ai_shorts_for_agencies',
    placement: 'header',
    destination: 'studio',
    auth_state: 'signed_in',
    ...extra,
  },
)

const profiles = [
  profile('business', 'business@example.com'),
  profile('brief', 'brief@example.com'),
  profile('case', 'case@example.com'),
  profile('pack', 'pack@example.com'),
  profile('other', 'other@example.com'),
  profile('product', 'product@example.com'),
  profile('real_estate', 'agent@example.com'),
  profile('agency_buyer', 'agency-buyer@example.com'),
  profile('monthly_operator', 'monthly-operator@example.com'),
  profile('agency_header_buyer', 'agency-header-buyer@example.com'),
  profile('internal', 'josephsskaf@gmail.com'),
  profile('unknown', null),
]
const business = B2B_ATTRIBUTABLE_PATHS.business_plan
const brief = B2B_ATTRIBUTABLE_PATHS.client_brief
const caseStudy = B2B_ATTRIBUTABLE_PATHS.autopilot_case_study
const localPath = B2B_ATTRIBUTABLE_PATHS.local_business_brief
const productPath = B2B_ATTRIBUTABLE_PATHS.product_to_short
const realEstatePath = B2B_ATTRIBUTABLE_PATHS.real_estate_video
const answerRouterRecurringPath = B2B_ATTRIBUTABLE_PATHS.business_answer_router_recurring
const pilotReviewPath = B2B_ATTRIBUTABLE_PATHS.business_pilot_review_recurring
const agencyHeaderPath = B2B_ATTRIBUTABLE_PATHS.agency_header_recurring
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
  event('23', agency.events.viewed, 'business', 'agency_browser', 38, { version: agency.eventVersions.viewed }),
  event('24', agency.events.proposalCopied, 'business', 'agency_browser', 39, { version: canonicalProposalVersion }),
  event('25', autopilot.events.viewed, 'brief', 'auto_browser', 40, { version: autopilot.eventVersion }),
  event('26', 'autopilot_break_even_human_viewed', 'brief', 'auto_browser', 41, { version: 'autopilot_decision_funnel_v1' }),
  event('27', autopilot.events.calculated, 'brief', 'auto_browser', 42, { version: autopilot.eventVersion }),
  event('28', autopilot.events.checkoutChoice, 'brief', 'auto_browser', 43, { version: autopilot.eventVersion, choice: 'monthly' }),
  event('29', autopilot.events.checkoutChoice, 'brief', 'auto_browser', 44, { version: autopilot.eventVersion, choice: 'pilot' }),
  start('30', 'other', 'local_buyer_browser', 45, localPath.intentCampaign, 'cs_local'),
  paid('31', 'other', 46, 'cs_local', 900, 'usd'),
  event('32', productPath.events.generated, 'product', 'product_browser', 47, { intent_campaign: productPath.intentCampaign }),
  start('33', 'product', 'product_browser', 48, productPath.intentCampaign, 'cs_product'),
  paid('34', 'product', 49, 'cs_product', 1500, 'usd'),
  start('35', 'real_estate', 'real_estate_browser', 50, realEstatePath.intentCampaign, 'cs_real_estate'),
  event('36', realEstatePath.events.generated, 'real_estate', 'real_estate_browser', 51, { intent_campaign: realEstatePath.intentCampaign }),
  event('37', productPath.events.generated, 'other', 'wrong_campaign_browser', 52, { intent_campaign: 'unrelated_campaign' }),
  event('38', agency.events.proposalCopied, 'agency_buyer', 'agency_buyer_browser', 53, { version: canonicalProposalVersion }),
  start('39', 'agency_buyer', 'agency_buyer_browser', 54, 'standard_pricing', 'cs_agency_assist'),
  paid('40', 'agency_buyer', 55, 'cs_agency_assist', 1500, 'usd'),
  event('41', agency.events.proposalCopied, 'agency_buyer', 'agency_buyer_browser', 56, { version: agency.eventVersions.viewed }),
  event('42', answerRouterRecurringPath.events.viewed, 'monthly_operator', 'monthly_operator_browser', 3000, { source: answerRouterRecurringPath.intentCampaign }),
  event('43', answerRouterRecurringPath.events.viewed, 'other', 'wrong_monthly_operator_browser', 3001, { source: 'ordinary_pricing' }),
  start('44', 'monthly_operator', 'monthly_operator_browser', 3002, answerRouterRecurringPath.intentCampaign, 'cs_monthly_operator', 'starter', 'monthly'),
  paid('45', 'monthly_operator', 3003, 'cs_monthly_operator', 700, 'usd'),
  event('46', agencyHeaderPath.events.viewed, 'agency_header_buyer', 'agency_header_browser', 3298, {
    version: agencyHeaderPath.eventVersion,
    intent_campaign: agencyHeaderPath.intentCampaign,
    surface: 'ai_shorts_for_agencies',
    placement: 'header',
    destination: 'studio',
    auth_state: 'signed_in',
  }),
  event('46b', agencyHeaderPath.diagnosticEvents.signIn, null, 'agency_header_browser', 3297, {
    version: agencyHeaderPath.eventVersion,
    intent_campaign: agencyHeaderPath.intentCampaign,
    surface: 'ai_shorts_for_agencies',
    placement: 'header',
    destination: 'login',
    auth_state: 'signed_out',
  }),
  event('46c', agencyHeaderPath.events.generated, 'agency_header_buyer', 'agency_header_browser', 3298.5, {
    intent_campaign: agencyHeaderPath.intentCampaign,
  }),
  start('47', 'agency_header_buyer', 'agency_header_browser', 3299, agencyHeaderPath.intentCampaign, 'cs_agency_header', 'starter', 'monthly'),
  paid('48', 'agency_header_buyer', 3300, 'cs_agency_header', 700, 'usd'),
]

const report = buildB2bSubscriptionTruthReport({ generatedAt: at(4740), windowStart: at(0), events, profiles })
equal(report.schemaVersion, B2B_SUBSCRIPTION_TRUTH_REPORT_VERSION, 'stable schema')
equal(report.paths.business_plan.stages.viewed.anonymousSessions, 1, 'anonymous view stays a session')
equal(report.paths.business_plan.stages.generated.anonymousSessions, 2, 'anonymous generation never becomes a person')
equal(report.paths.business_plan.stages.generated.internalEventRows, 1, 'internal stage rows are disclosed')
equal(report.paths.business_plan.stages.generated.unknownIdentifiedEventRows, 1, 'unknown profiles are disclosed')
equal(report.paths.client_brief.stages.generated.identifiedExternalPeople, 1, 'external generated person is counted')
equal(report.paths.client_brief.stages.oneTimePackChoice.identifiedExternalPeople, 1, 'pack choice remains separate')
equal(report.totals.identifiedExternalSubscriptionPeople, 8, 'eight external recurring buyers started')
equal(report.totals.subscriptionStripeSessions, 8, 'eight exact recurring Sessions')
equal(report.totals.byBilling, { annual: 1, monthly: 7 }, 'annual and monthly stay separate')
equal(report.totals.exactPaidPeople, 6, 'six exact paid people')
equal(report.totals.exactPaidStripeSessions, 6, 'duplicate webhook row counts once')
equal(report.totals.exactRevenueMinorByCurrency, { usd: 35200 }, 'exact revenue is currency-grouped')
equal(report.paths.agency_header_recurring.stages.viewed.identifiedExternalPeople, 1, 'agency header click is a human entry witness')
equal(report.paths.agency_header_recurring.stages.viewed.eventRows, 1, 'only the exact Studio click enters the path gate')
equal(report.paths.agency_header_recurring.stages.signInDiagnostic.anonymousSessions, 1, 'sign-in click remains an anonymous diagnostic session')
equal(report.paths.agency_header_recurring.subscription.identifiedExternalPeople, 1, 'agency header path counts one exact recurring buyer')
equal(report.paths.agency_header_recurring.subscription.exactPaidPeople, 1, 'agency header payment resolves through the canonical ledger')
equal(report.journeys.find((journey) => journey.stripeSessionId === 'cs_agency_header')?.entryViewWitness, 'prior_exact_path_click_same_external_person_and_browser_session', 'agency header journey declares person and browser continuity')
equal(report.paths.agency_header_recurring.subscription.postVideo.stripeSessions, 1, 'completed video witnesses the header path before Checkout')
equal(report.paths.agency_header_recurring.subscription.preVideoDiagnostic.stripeSessions, 0, 'completed-video buyer never falls into the pre-video bucket')
equal(report.paths.agency_header_recurring.gate.entryStage, 'cta_clicked', 'header gate names clickers, not viewers')
equal(report.paths.agency_header_recurring.gate.minimumClickedExternalPeople, 10, 'header gate publishes its clicker threshold')
equal('minimumViewedExternalPeople' in report.paths.agency_header_recurring.gate, false, 'header gate never labels clicks as views')
equal(report.paths.business_answer_router_recurring.stages.viewed.identifiedExternalPeople, 1, 'pricing view requires exact answer-router source')
equal(report.paths.business_answer_router_recurring.subscription.identifiedExternalPeople, 1, 'recurring answer-router path counts one exact buyer')
equal(report.paths.business_answer_router_recurring.subscription.exactPaidPeople, 1, 'recurring answer-router payment resolves through the canonical ledger')
equal(report.journeys.find((journey) => journey.stripeSessionId === 'cs_monthly_operator')?.entryViewWitness, 'prior_exact_pricing_view_same_external_person', 'recurring journey declares its exact prior-view witness')
equal(report.paths.business_answer_router_recurring.gate.state, 'ready_for_path_diagnosis', 'first exact recurring Session overrides sample and time gates')
equal(report.paths.business_plan.subscription.withArtifactWitness, 1, 'same browser generation witnesses business path')
equal(report.paths.client_brief.subscription.withArtifactWitness, 1, 'same person generation witnesses brief path')
equal(report.paths.autopilot_case_study.subscription.campaignOnlyWithoutArtifactWitness, 1, 'case study campaign is explicit without inventing an artifact')
equal(report.paths.local_business_brief.subscription.campaignOnlyWithoutArtifactWitness, 1, 'local campaign can be attributed without inventing an artifact witness')
equal(report.paths.product_to_short.stages.generated.identifiedExternalPeople, 1, 'product generation requires the exact vertical campaign')
check(B2B_SUBSCRIPTION_EVENT_NAMES.includes('generate_completed'), 'runner fetches the generic completion witness')
check(B2B_SUBSCRIPTION_EVENT_NAMES.includes('agency_header_studio_clicked'), 'runner fetches the exact Studio click')
check(B2B_SUBSCRIPTION_EVENT_NAMES.includes('agency_header_signin_clicked'), 'runner fetches the separate sign-in diagnostic')
equal(report.paths.product_to_short.subscription.postVideo.stripeSessions, 1, 'product Checkout after completion is post-video')
equal(report.paths.product_to_short.subscription.postVideo.exactPaidPeople, 1, 'product payment stays in the post-video cohort')
equal(report.paths.real_estate_video.subscription.preVideoDiagnostic.stripeSessions, 1, 'real-estate Checkout before completion stays diagnostic')
equal(report.paths.real_estate_video.subscription.postVideo.stripeSessions, 0, 'later completion cannot rewrite Checkout chronology')
equal(report.quality.packSessionsExcludedFromSubscribers, 1, 'pack Session never becomes a subscriber')
check(!report.journeys.some((journey) => journey.stripeSessionId === 'cs_pack'), 'pack absent from journeys')
check(!report.journeys.some((journey) => journey.stripeSessionId === 'cs_forged'), 'arbitrary campaign rejected')
check(!JSON.stringify(report).includes('business@example.com'), 'report never emits email')
equal(report.assistSurfaces.local_business_brief.manualGenerated.anonymousSessions, 1, 'manual local brief separated')
equal(report.assistSurfaces.local_business_brief.sampleGenerated.anonymousSessions, 1, 'sample local brief separated')
equal(report.assistSurfaces.local_business_brief.attributionState, 'exact_intent_campaign_available_after_deploy_boundary', 'local attribution capability is explicit')
equal(canonicalProposalVersion, 'agency_margin_proposal_v1', 'test reads the product emitter contract instead of repeating the report constant')
equal(agency.eventVersions.proposalCopied, canonicalProposalVersion, 'report proposal version matches the real emitter')
equal(report.assistSurfaces.agency_margin_proposal.proposalCopied.identifiedExternalPeople, 2, 'canonical proposal copies are counted as assists')
equal(report.assistSurfaces.agency_margin_proposal.invalidProposalVersion.identifiedExternalPeople, 1, 'wrong proposal version is disclosed and excluded')
equal(report.assistSurfaces.agency_margin_proposal.assistedRecurringSubscription.label, 'temporal_assist_not_attribution', 'association is never called attribution')
equal(report.assistSurfaces.agency_margin_proposal.assistedRecurringSubscription.lookbackDays, B2B_PROPOSAL_ASSIST_LOOKBACK_DAYS, 'assist lookback is explicit')
equal(report.assistSurfaces.agency_margin_proposal.assistedRecurringSubscription.identifiedExternalPeople, 1, 'same-person proposal to later recurring checkout is linked')
equal(report.assistSurfaces.agency_margin_proposal.assistedRecurringSubscription.stripeSessions, 1, 'exact recurring Stripe Session is the unit')
equal(report.assistSurfaces.agency_margin_proposal.assistedRecurringSubscription.byMatchingBasis, { same_external_person: 1 }, 'matching basis is disclosed')
equal(report.assistSurfaces.agency_margin_proposal.assistedRecurringSubscription.exactPaidPeople, 1, 'paid assist counts one external person')
equal(report.assistSurfaces.agency_margin_proposal.assistedRecurringSubscription.exactPaidStripeSessions, 1, 'paid assist counts one exact Stripe Session')
equal(report.assistSurfaces.agency_margin_proposal.assistedRecurringSubscription.exactRevenueMinorByCurrency, { usd: 1500 }, 'assist revenue comes from the canonical ledger')
equal(report.assistSurfaces.agency_margin_proposal.gate.state, 'ready_for_assist_review', 'first exact recurring Session opens review gate')
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

const assistBoundaries = buildB2bSubscriptionTruthReport({
  generatedAt: at(20),
  windowStart: at(0),
  profiles: [
    ...profiles,
    profile('session_buyer', 'session-buyer@example.com'),
    profile('old_buyer', 'old-buyer@example.com'),
    profile('late_buyer', 'late-buyer@example.com'),
    profile('shared_buyer_one', 'shared-one@example.com'),
    profile('shared_buyer_two', 'shared-two@example.com'),
    profile('conflict_buyer', 'conflict@example.com'),
    profile('invalid_buyer', 'invalid@example.com'),
  ],
  events: [
    event('a1', agency.events.proposalCopied, null, 'shared_browser', 1, { version: canonicalProposalVersion }),
    start('a2', 'session_buyer', 'shared_browser', 2, 'ordinary_pricing', 'cs_session_assist'),
    paid('a3', 'session_buyer', 3, 'cs_session_assist', 700, 'usd'),
    event('a4', agency.events.proposalCopied, 'old_buyer', 'old_browser', -10082, { version: canonicalProposalVersion }),
    start('a5', 'old_buyer', 'old_browser', 1, 'ordinary_pricing', 'cs_too_old'),
    paid('a6', 'old_buyer', 2, 'cs_too_old', 700, 'usd'),
    start('a7', 'late_buyer', 'late_browser', 5, 'ordinary_pricing', 'cs_copy_late'),
    event('a8', agency.events.proposalCopied, 'late_buyer', 'late_browser', 6, { version: canonicalProposalVersion }),
    paid('a9', 'late_buyer', 7, 'cs_copy_late', 700, 'usd'),
    event('a10', agency.events.proposalCopied, 'internal', 'internal_browser', 1, { version: canonicalProposalVersion }),
    start('a11', 'internal', 'internal_browser', 2, 'ordinary_pricing', 'cs_internal'),
    paid('a12', 'internal', 3, 'cs_internal', 700, 'usd'),
    event('a13', agency.events.proposalCopied, 'business', 'pack_browser', 1, { version: canonicalProposalVersion }),
    start('a14', 'business', 'pack_browser', 2, 'ordinary_pricing', 'cs_pack_assist', 'basic', 'monthly', { sku: 'bulk10' }),
    event('a15', 'payment_success', 'business', null, 3, { checkout_mode: 'payment', stripe_session_id: 'cs_pack_assist', amount_total: 9900, currency: 'usd' }),
    event('a16', agency.events.proposalCopied, null, 'ambiguous_browser', 8, { version: canonicalProposalVersion }),
    start('a17', 'shared_buyer_one', 'ambiguous_browser', 9, 'ordinary_pricing', 'cs_shared_one'),
    start('a18', 'shared_buyer_two', 'ambiguous_browser', 10, 'ordinary_pricing', 'cs_shared_two'),
    paid('a19', 'shared_buyer_one', 11, 'cs_shared_one', 700, 'usd'),
    paid('a20', 'shared_buyer_two', 12, 'cs_shared_two', 700, 'usd'),
    event('a21', agency.events.proposalCopied, 'conflict_buyer', 'conflict_browser', 13, { version: canonicalProposalVersion }),
    start('a22', 'conflict_buyer', 'conflict_browser', 14, 'ordinary_pricing', 'cs_conflict_assist'),
    paid('a23', 'other', 15, 'cs_conflict_assist', 700, 'usd'),
    event('a24', agency.events.proposalCopied, 'invalid_buyer', 'invalid_browser', 13, { version: canonicalProposalVersion }),
    start('a25', 'invalid_buyer', 'invalid_browser', 14, 'ordinary_pricing', 'cs_invalid_assist'),
    paid('a26', 'invalid_buyer', 15, 'cs_invalid_assist', 0, 'usd'),
    event('a27', agency.events.viewed, 'shared_buyer_one', 'reused_browser', 16, { version: agency.eventVersions.viewed }),
    event('a28', agency.events.proposalCopied, null, 'reused_browser', 17, { version: canonicalProposalVersion }),
    start('a29', 'shared_buyer_two', 'reused_browser', 18, 'ordinary_pricing', 'cs_reused_browser'),
    paid('a30', 'shared_buyer_two', 19, 'cs_reused_browser', 1500, 'usd'),
  ],
})
equal(assistBoundaries.assistSurfaces.agency_margin_proposal.assistedRecurringSubscription.identifiedExternalPeople, 0, 'anonymous proposal copy never becomes an identified buyer')
equal(assistBoundaries.assistSurfaces.agency_margin_proposal.assistedRecurringSubscription.byMatchingBasis, {}, 'browser session alone is never a matching basis')
equal(assistBoundaries.assistSurfaces.agency_margin_proposal.assistedRecurringSubscription.exactRevenueMinorByCurrency, {}, 'anonymous, old, late, internal, pack, conflict and invalid rows add no assist revenue')
equal(assistBoundaries.assistSurfaces.agency_margin_proposal.assistedRecurringSubscription.exactPaidStripeSessions, 0, 'only the same identified external person may form a paid assist')

const anonymousGate = buildB2bSubscriptionTruthReport({
  generatedAt: at(20),
  windowStart: at(0),
  profiles,
  events: Array.from({ length: 5 }, (_, index) =>
    event('g' + index, agency.events.proposalCopied, null, 'anonymous_' + index, index + 1, { version: canonicalProposalVersion }),
  ),
})
equal(anonymousGate.assistSurfaces.agency_margin_proposal.proposalCopied.anonymousSessions, 5, 'anonymous sessions stay visible')
equal(anonymousGate.assistSurfaces.agency_margin_proposal.gate.state, 'collecting', 'anonymous sessions never masquerade as five people')
equal(anonymousGate.assistSurfaces.agency_margin_proposal.gate.anonymousSessionsNeverSatisfyPeopleGate, true, 'people gate declares the anonymous boundary')

const future = buildB2bSubscriptionTruthReport({
  generatedAt: at(5), windowStart: at(0), profiles,
  events: [event('f1', brief.events.generated, 'brief', 'b', 10, { version: brief.eventVersion })],
})
equal(future.paths.client_brief.stages.generated.eventRows, 0, 'future rows excluded')
equal(future.gate.state, 'collecting', 'no sample stays collecting')

const routerWithoutView = buildB2bSubscriptionTruthReport({
  generatedAt: at(10), windowStart: at(0), profiles,
  events: [
    start('rv1', 'monthly_operator', 'monthly_operator_browser', 2, answerRouterRecurringPath.intentCampaign, 'cs_router_no_view'),
    paid('rv2', 'monthly_operator', 3, 'cs_router_no_view', 700, 'usd'),
  ],
})
equal(routerWithoutView.paths.business_answer_router_recurring.subscription.stripeSessions, 0, 'router Checkout without prior exact view receives no path attribution')
equal(routerWithoutView.paths.business_answer_router_recurring.subscription.exactPaidPeople, 0, 'real payment without prior exact view is not attributed to router')
equal(routerWithoutView.quality.subscriptionStartsWithoutRequiredEntryView, 1, 'missing required entry view is disclosed')

const agencyHeaderWithoutClick = buildB2bSubscriptionTruthReport({
  generatedAt: at(4740), windowStart: at(0), profiles,
  events: [
    start('ah1', 'agency_header_buyer', 'agency_header_browser', 3301, agencyHeaderPath.intentCampaign, 'cs_agency_header_no_click'),
    paid('ah2', 'agency_header_buyer', 3302, 'cs_agency_header_no_click', 700, 'usd'),
  ],
})
equal(agencyHeaderWithoutClick.paths.agency_header_recurring.subscription.stripeSessions, 0, 'agency campaign without prior exact click is not attributed')
equal(agencyHeaderWithoutClick.quality.subscriptionStartsWithoutRequiredEntryView, 1, 'missing agency header click is disclosed')

const invalidAgencyHeaderMetadata = [
  ['wrong version', { version: 'forged' }],
  ['wrong campaign', { intent_campaign: 'forged' }],
  ['wrong surface', { surface: 'other' }],
  ['wrong placement', { placement: 'footer' }],
  ['wrong destination', { destination: 'login' }],
  ['wrong auth state', { auth_state: 'signed_out' }],
]
for (const [label, override] of invalidAgencyHeaderMetadata) {
  const invalidHeader = buildB2bSubscriptionTruthReport({
    generatedAt: at(3310), windowStart: at(0), profiles,
    events: [
      agencyHeaderClick(`invalid-${label}`, 'agency_header_buyer', 'invalid_header_browser', 3300, override),
      start(`start-${label}`, 'agency_header_buyer', 'invalid_header_browser', 3301, agencyHeaderPath.intentCampaign, `cs-${label}`),
    ],
  })
  equal(invalidHeader.paths.agency_header_recurring.stages.viewed.eventRows, 0, `${label}: invalid click cannot enter denominator`)
  equal(invalidHeader.paths.agency_header_recurring.subscription.stripeSessions, 0, `${label}: invalid click cannot attribute Session`)
}

const staleHeaderClick = buildB2bSubscriptionTruthReport({
  generatedAt: at(4743), windowStart: at(0), profiles,
  events: [
    agencyHeaderClick('stale-click', 'agency_header_buyer', 'stale_browser', 3300),
    start('stale-start', 'agency_header_buyer', 'stale_browser', 4741, agencyHeaderPath.intentCampaign, 'cs_stale'),
  ],
})
equal(staleHeaderClick.paths.agency_header_recurring.subscription.stripeSessions, 0, 'click older than 24h cannot attribute Session')

const duplicateHeaderClicks = buildB2bSubscriptionTruthReport({
  generatedAt: at(4741), windowStart: at(0), profiles,
  events: [
    agencyHeaderClick('dup-click-1', 'agency_header_buyer', 'dup_browser', 3300),
    agencyHeaderClick('dup-click-2', 'agency_header_buyer', 'dup_browser', 3301),
    start('dup-start', 'agency_header_buyer', 'dup_browser', 3302, agencyHeaderPath.intentCampaign, 'cs_dup_click'),
  ],
})
equal(duplicateHeaderClicks.paths.agency_header_recurring.subscription.stripeSessions, 1, 'the nearest valid click attributes one Session without inventing ambiguity')
equal(duplicateHeaderClicks.quality.subscriptionStartsWithAmbiguousEntryClick, 0, 'repeated exact clicks are not treated as conflicting origins')

const reusedHeaderClick = buildB2bSubscriptionTruthReport({
  generatedAt: at(4740), windowStart: at(0), profiles,
  events: [
    agencyHeaderClick('reused-click', 'agency_header_buyer', 'reused_header_browser', 3300),
    start('reused-start-1', 'agency_header_buyer', 'reused_header_browser', 3301, agencyHeaderPath.intentCampaign, 'cs_reused_1'),
    start('reused-start-2', 'agency_header_buyer', 'reused_header_browser', 3302, agencyHeaderPath.intentCampaign, 'cs_reused_2'),
    paid('reused-paid', 'agency_header_buyer', 3303, 'cs_reused_2', 700, 'usd'),
  ],
})
equal(reusedHeaderClick.paths.agency_header_recurring.subscription.stripeSessions, 2, 'one valid click may lead to multiple real Checkout attempts')
equal(reusedHeaderClick.paths.agency_header_recurring.subscription.identifiedExternalPeople, 1, 'Checkout retries still count one external person')
equal(reusedHeaderClick.paths.agency_header_recurring.subscription.exactPaidStripeSessions, 1, 'only the paid retry enters paid Session totals')
equal(reusedHeaderClick.paths.agency_header_recurring.subscription.exactPaidPeople, 1, 'the buyer is counted once after a paid retry')
equal(reusedHeaderClick.paths.agency_header_recurring.subscription.exactRevenueMinorByCurrency, { usd: 700 }, 'paid retry revenue is counted exactly once')
equal(reusedHeaderClick.quality.subscriptionStartsWithAmbiguousEntryClick, 0, 'Checkout retries do not erase a valid origin')

const crossBrowserHeader = buildB2bSubscriptionTruthReport({
  generatedAt: at(3310), windowStart: at(0), profiles,
  events: [
    agencyHeaderClick('cross-browser-click', 'agency_header_buyer', 'browser_one', 3300),
    start('cross-browser-start', 'agency_header_buyer', 'browser_two', 3301, agencyHeaderPath.intentCampaign, 'cs_cross_browser'),
  ],
})
equal(crossBrowserHeader.paths.agency_header_recurring.subscription.stripeSessions, 0, 'same person in another browser is not enough')

const exactBoundaryHeader = buildB2bSubscriptionTruthReport({
  generatedAt: at(4741), windowStart: at(0), profiles,
  events: [
    agencyHeaderClick('boundary-click', 'agency_header_buyer', 'boundary_browser', 3300),
    start('boundary-start', 'agency_header_buyer', 'boundary_browser', 4740, agencyHeaderPath.intentCampaign, 'cs_boundary'),
  ],
})
equal(exactBoundaryHeader.paths.agency_header_recurring.subscription.stripeSessions, 1, 'exactly 24h remains inside the declared window')

const immatureHeader = buildB2bSubscriptionTruthReport({
  generatedAt: at(3302), windowStart: at(0), profiles,
  events: [
    agencyHeaderClick('immature-click', 'agency_header_buyer', 'immature_browser', 3300),
    start('immature-start', 'agency_header_buyer', 'immature_browser', 3301, agencyHeaderPath.intentCampaign, 'cs_immature'),
  ],
})
equal(immatureHeader.paths.agency_header_recurring.subscription.stripeSessions, 0, 'Session remains provisional until the click window closes')
equal(immatureHeader.quality.subscriptionStartsWithImmatureEntryClick, 1, 'provisional Session is disclosed as immature')

const maturedHeader = buildB2bSubscriptionTruthReport({
  generatedAt: at(4740), windowStart: at(0), profiles,
  events: [
    agencyHeaderClick('matured-click', 'agency_header_buyer', 'matured_browser', 3300),
    start('matured-start', 'agency_header_buyer', 'matured_browser', 3301, agencyHeaderPath.intentCampaign, 'cs_matured'),
  ],
})
equal(maturedHeader.paths.agency_header_recurring.subscription.stripeSessions, 1, 'same Session becomes attributable only after 24h closes')

const conflictingHeaderOwner = buildB2bSubscriptionTruthReport({
  generatedAt: at(4740), windowStart: at(0), profiles,
  events: [
    agencyHeaderClick('owner-click', 'agency_header_buyer', 'shared_header_browser', 3300),
    event('other-owner', 'landing_session_started', 'other', 'shared_header_browser', 3300.5),
    start('owner-start', 'agency_header_buyer', 'shared_header_browser', 3301, agencyHeaderPath.intentCampaign, 'cs_owner_conflict'),
  ],
})
equal(conflictingHeaderOwner.paths.agency_header_recurring.subscription.stripeSessions, 0, 'browser session shared by two owners fails closed')
equal(conflictingHeaderOwner.quality.subscriptionStartsWithConflictingEntryViewIdentity, 1, 'shared-owner conflict is disclosed')

const laterHeaderOwner = buildB2bSubscriptionTruthReport({
  generatedAt: at(4740), windowStart: at(0), profiles,
  events: [
    agencyHeaderClick('later-owner-click', 'agency_header_buyer', 'later_owner_browser', 3300),
    start('later-owner-start', 'agency_header_buyer', 'later_owner_browser', 3301, agencyHeaderPath.intentCampaign, 'cs_later_owner'),
    event('later-owner', 'landing_session_started', 'other', 'later_owner_browser', 3302),
  ],
})
equal(laterHeaderOwner.paths.agency_header_recurring.subscription.stripeSessions, 1, 'a different owner after Checkout cannot revoke a matured attribution')

const preClickVideo = buildB2bSubscriptionTruthReport({
  generatedAt: at(4740), windowStart: at(0), profiles,
  events: [
    event('old-video', agencyHeaderPath.events.generated, 'agency_header_buyer', 'preclick_browser', 3299, {
      intent_campaign: agencyHeaderPath.intentCampaign,
    }),
    agencyHeaderClick('preclick-click', 'agency_header_buyer', 'preclick_browser', 3300),
    start('preclick-start', 'agency_header_buyer', 'preclick_browser', 3301, agencyHeaderPath.intentCampaign, 'cs_preclick'),
  ],
})
equal(preClickVideo.paths.agency_header_recurring.subscription.postVideo.stripeSessions, 0, 'video completed before the click cannot witness post-video')
equal(preClickVideo.paths.agency_header_recurring.subscription.preVideoDiagnostic.stripeSessions, 1, 'pre-click video leaves the journey in pre-video diagnostic')

for (const [label, videoMinute] of [['click', 3300], ['checkout', 3301]]) {
  const tiedVideo = buildB2bSubscriptionTruthReport({
    generatedAt: at(4740), windowStart: at(0), profiles,
    events: [
      agencyHeaderClick(`tied-${label}-click`, 'agency_header_buyer', `tied_${label}_browser`, 3300),
      event(`tied-${label}-video`, agencyHeaderPath.events.generated, 'agency_header_buyer', `tied_${label}_browser`, videoMinute, {
        intent_campaign: agencyHeaderPath.intentCampaign,
      }),
      start(`tied-${label}-start`, 'agency_header_buyer', `tied_${label}_browser`, 3301, agencyHeaderPath.intentCampaign, `cs_tied_${label}`),
    ],
  })
  equal(tiedVideo.paths.agency_header_recurring.subscription.postVideo.stripeSessions, 0, `video tied with ${label} has unknown order and cannot witness post-video`)
  equal(tiedVideo.paths.agency_header_recurring.subscription.preVideoDiagnostic.stripeSessions, 1, `video tied with ${label} remains pre-video diagnostic`)
}

const otherBrowserVideo = buildB2bSubscriptionTruthReport({
  generatedAt: at(4740), windowStart: at(0), profiles,
  events: [
    agencyHeaderClick('other-browser-click', 'agency_header_buyer', 'journey_browser', 3300),
    event('other-browser-video', agencyHeaderPath.events.generated, 'agency_header_buyer', 'other_video_browser', 3300.5, {
      intent_campaign: agencyHeaderPath.intentCampaign,
    }),
    start('other-browser-start', 'agency_header_buyer', 'journey_browser', 3301, agencyHeaderPath.intentCampaign, 'cs_other_browser_video'),
  ],
})
equal(otherBrowserVideo.paths.agency_header_recurring.subscription.postVideo.stripeSessions, 0, 'video in another browser cannot witness the header journey')
equal(otherBrowserVideo.paths.agency_header_recurring.subscription.preVideoDiagnostic.stripeSessions, 1, 'cross-browser completion remains pre-video diagnostic')

const routerWrongViews = buildB2bSubscriptionTruthReport({
  generatedAt: at(12), windowStart: at(0), profiles,
  events: [
    event('rw1', answerRouterRecurringPath.events.viewed, 'monthly_operator', 'monthly_operator_browser', 1, { source: 'ordinary_pricing' }),
    start('rw2', 'monthly_operator', 'monthly_operator_browser', 2, answerRouterRecurringPath.intentCampaign, 'cs_router_wrong_source'),
    event('rw3', answerRouterRecurringPath.events.viewed, 'monthly_operator', 'monthly_operator_browser', 4, { source: answerRouterRecurringPath.intentCampaign }),
    paid('rw4', 'monthly_operator', 5, 'cs_router_wrong_source', 700, 'usd'),
    event('rw5', answerRouterRecurringPath.events.viewed, 'other', 'other_browser', 6, { source: answerRouterRecurringPath.intentCampaign }),
    // Use another buyer here. Reusing monthly_operator would make rw3 a valid
    // prior same-person view for this second Checkout and would test the
    // opposite of the intended different-person boundary.
    start('rw6', 'brief', 'brief_browser', 7, answerRouterRecurringPath.intentCampaign, 'cs_router_other_person'),
    paid('rw7', 'brief', 8, 'cs_router_other_person', 700, 'usd'),
  ],
})
equal(routerWrongViews.paths.business_answer_router_recurring.subscription.stripeSessions, 0, 'wrong-source, later and different-person views all fail closed')
equal(routerWrongViews.quality.subscriptionStartsWithoutRequiredEntryView, 2, 'every rejected router start is disclosed once')

const routerAnonymousResume = buildB2bSubscriptionTruthReport({
  generatedAt: at(3010), windowStart: at(0), profiles,
  events: [
    event('ra1', answerRouterRecurringPath.events.viewed, null, 'resume_browser', 3000, { source: answerRouterRecurringPath.intentCampaign }),
    start('ra2', 'monthly_operator', 'resume_browser', 3001, answerRouterRecurringPath.intentCampaign, 'cs_router_resume'),
    paid('ra3', 'monthly_operator', 3002, 'cs_router_resume', 700, 'usd'),
  ],
})
equal(routerAnonymousResume.paths.business_answer_router_recurring.stages.viewed.anonymousSessions, 1, 'anonymous landing remains a session, not a person')
equal(routerAnonymousResume.paths.business_answer_router_recurring.subscription.identifiedExternalPeople, 1, 'same browser can connect anonymous landing to identified Checkout owner')
equal(routerAnonymousResume.journeys[0]?.entryViewWitness, 'prior_exact_pricing_view_same_browser_session', 'resumed signup declares browser-session continuity')

const routerSessionConflict = buildB2bSubscriptionTruthReport({
  generatedAt: at(3010), windowStart: at(0), profiles,
  events: [
    event('rc1', answerRouterRecurringPath.events.viewed, null, 'conflict_browser', 3000, { source: answerRouterRecurringPath.intentCampaign }),
    // The other owner is deliberately on an unrelated event. Identity
    // uniqueness must inspect the whole browser session, not only the subset
    // of pricing_view rows used as the entry witness.
    event('rc2', 'landing_session_started', 'other', 'conflict_browser', 3001, { source: 'direct' }),
    event('rc2b', answerRouterRecurringPath.events.viewed, 'monthly_operator', 'other_valid_browser', 3001, { source: answerRouterRecurringPath.intentCampaign }),
    start('rc3', 'monthly_operator', 'conflict_browser', 3002, answerRouterRecurringPath.intentCampaign, 'cs_router_session_conflict'),
    paid('rc4', 'monthly_operator', 3003, 'cs_router_session_conflict', 700, 'usd'),
  ],
})
equal(routerSessionConflict.paths.business_answer_router_recurring.subscription.stripeSessions, 0, 'browser session with another identified owner fails closed')
equal(routerSessionConflict.quality.subscriptionStartsWithConflictingEntryViewIdentity, 1, 'entry identity conflict is disclosed')

const gateProfiles = Array.from({ length: B2B_ANSWER_ROUTER_MIN_VIEWED_PEOPLE }, (_, index) =>
  profile(`router_gate_${index}`, `router-gate-${index}@example.com`),
)
const gateViews = gateProfiles.map((row, index) => ({
  id: `router_gate_view_${index}`,
  name: answerRouterRecurringPath.events.viewed,
  user_id: row.id,
  session_id: `router_gate_browser_${index}`,
  created_at: new Date(Date.parse(B2B_ANSWER_ROUTER_MEASUREMENT_START) + (index + 1) * 60_000).toISOString(),
  metadata: { source: answerRouterRecurringPath.intentCampaign },
}))
const gateTooEarly = buildB2bSubscriptionTruthReport({
  generatedAt: new Date(Date.parse(B2B_ANSWER_ROUTER_MEASUREMENT_START) + 6 * 86_400_000).toISOString(),
  windowStart: B2B_ANSWER_ROUTER_MEASUREMENT_START,
  profiles: gateProfiles,
  events: gateViews,
})
equal(gateTooEarly.paths.business_answer_router_recurring.stages.viewed.identifiedExternalPeople, B2B_ANSWER_ROUTER_MIN_VIEWED_PEOPLE, 'router gate counts exact external viewers')
equal(gateTooEarly.paths.business_answer_router_recurring.gate.state, 'collecting', 'ten viewers cannot open the gate before seven full days')

const gateOneShort = buildB2bSubscriptionTruthReport({
  generatedAt: new Date(Date.parse(B2B_ANSWER_ROUTER_MEASUREMENT_START) + B2B_ANSWER_ROUTER_MIN_OBSERVATION_DAYS * 86_400_000).toISOString(),
  windowStart: B2B_ANSWER_ROUTER_MEASUREMENT_START,
  profiles: gateProfiles,
  events: gateViews.slice(0, B2B_ANSWER_ROUTER_MIN_VIEWED_PEOPLE - 1),
})
equal(gateOneShort.paths.business_answer_router_recurring.gate.observedFullDays, B2B_ANSWER_ROUTER_MIN_OBSERVATION_DAYS, 'router gate reports full observation days')
equal(gateOneShort.paths.business_answer_router_recurring.gate.state, 'collecting', 'seven days cannot open the gate with only nine people')

const gateReady = buildB2bSubscriptionTruthReport({
  generatedAt: new Date(Date.parse(B2B_ANSWER_ROUTER_MEASUREMENT_START) + B2B_ANSWER_ROUTER_MIN_OBSERVATION_DAYS * 86_400_000).toISOString(),
  windowStart: B2B_ANSWER_ROUTER_MEASUREMENT_START,
  profiles: gateProfiles,
  events: gateViews,
})
equal(gateReady.paths.business_answer_router_recurring.gate.state, 'ready_for_path_diagnosis', 'ten exact people and seven full days open the router gate')

const businessSource = readFileSync(join(root, 'lib/growth/businessContentPlan.ts'), 'utf8')
const briefSource = readFileSync(join(root, 'lib/growth/clientShortBrief.ts'), 'utf8')
const productSource = readFileSync(join(root, 'lib/growth/productToVideo.ts'), 'utf8')
const realEstateSource = readFileSync(join(root, 'lib/growth/realEstateShorts.ts'), 'utf8')
const checkoutSource = readFileSync(join(root, 'app/api/stripe/checkout/route.ts'), 'utf8')
const generateSource = readFileSync(join(root, 'app/(dashboard)/generate/GenerateClient.tsx'), 'utf8')
const localSource = readFileSync(join(root, 'lib/toolActivationHref.ts'), 'utf8')
const localCallerSource = readFileSync(join(root, 'app/free-ai-shorts/[niche]/LocalBusinessAdBrief.tsx'), 'utf8')
const signupSource = readFileSync(join(root, 'app/(auth)/signup/page.tsx'), 'utf8')
const autopilotSource = readFileSync(join(root, 'app/pricing/AutopilotBreakEvenCalculator.tsx'), 'utf8')
const agencyCalculatorSource = readFileSync(join(root, 'app/ai-shorts-for-agencies/AgencyMarginCalculator.tsx'), 'utf8')
const answerRouterSource = readFileSync(join(root, 'lib/growth/businessAnswerEngineRouter.ts'), 'utf8')
const llmsSource = readFileSync(join(root, 'app/llms.txt/route.ts'), 'utf8')
check(businessSource.includes(`BUSINESS_PLAN_CAMPAIGN = '${business.intentCampaign}'`), 'business campaign matches code')
check(businessSource.includes(`BUSINESS_PLAN_SHARE_CAMPAIGN = '${business.eventVersion}'`), 'business event version matches code')
check(briefSource.includes(`CLIENT_SHORT_BRIEF_CAMPAIGN = '${brief.intentCampaign}'`), 'brief campaign matches code')
check(productSource.includes(`PRODUCT_TO_VIDEO_CAMPAIGN = '${productPath.intentCampaign}'`), 'product campaign matches code')
check(realEstateSource.includes(`REAL_ESTATE_VIDEO_CAMPAIGN = '${realEstatePath.intentCampaign}'`), 'real-estate campaign matches code')
check(checkoutSource.includes('intent_campaign: intentCampaign ?? null'), 'server checkout persists intent campaign')
check(generateSource.includes('intent_campaign=${encodeURIComponent(intentCampaign)}'), 'generate checkout URLs preserve intent campaign')
check(generateSource.includes("trackEvent('generate_completed', completionMetadata)"), 'live generator records completed-video witness')
check(generateSource.includes('intent_campaign: intentCampaign || null'), 'completed-video witness preserves exact campaign')
check(localSource.slice(localSource.indexOf('export function toolActivationHref')).includes("generate.set('intent_campaign'"), 'helper can preserve a validated campaign inside explicit redirect')
check(localCallerSource.includes('intentCampaign: LOCAL_BUSINESS_BRIEF_CAMPAIGN'), 'local caller explicitly opts into exact campaign attribution')
check(signupSource.includes('if (explicitRedirect) return explicitRedirect'), 'signup returns explicit redirect before outer attribution forwarding')
check(autopilotSource.includes("choice: 'pilot' | 'monthly'"), 'Autopilot calculator distinguishes pilot and monthly')
check(agencyCalculatorSource.includes('version: AGENCY_MARGIN_PROPOSAL_VARIANT'), 'real proposal copy emitter uses the canonical proposal constant')
check(agencyHeaderSource.includes(`AGENCY_HEADER_STUDIO_VERSION = '${agencyHeaderPath.intentCampaign}'`), 'agency header campaign matches the canonical helper')
check(agencyHeaderSource.includes("AGENCY_HEADER_STUDIO_EVENT = 'agency_header_studio_clicked'"), 'agency header Studio event name is closed in one helper')
check(agencyHeaderSource.includes("AGENCY_HEADER_SIGNIN_EVENT = 'agency_header_signin_clicked'"), 'agency header sign-in event stays diagnostic')
check(agencyHeaderCallerSource.includes('trackClosedEvent('), 'agency header uses bounded event metadata')
check(agencyHeaderCallerSource.includes('AGENCY_HEADER_STUDIO_HREF'), 'signed-in header preserves intent into Studio')
check(agencyHeaderCallerSource.includes('AGENCY_HEADER_LOGIN_HREF'), 'signed-out header preserves the canonical login return')
check(agencyHeaderSource.includes('encodeURIComponent(AGENCY_HEADER_RETURN_HREF)'), 'login redirect encodes the internal agency-page return')
equal(B2B_AGENCY_HEADER_MEASUREMENT_START, '2026-09-03T05:00:00.000Z', 'agency header measurement starts after the planned production deploy')
check(answerRouterSource.includes(`'${answerRouterRecurringPath.intentCampaign}'`), 'recurring campaign comes from the canonical business answer router')
check(llmsSource.includes('BUSINESS_ANSWER_ENGINE_ROUTER.choices.map'), 'llms text executes every canonical business destination')
check(llmsSource.includes('BUSINESS_ANSWER_ENGINE_ROUTER.boundaries.map'), 'llms text publishes the no-enterprise boundaries from the canonical router')
const pilotBase = Date.parse(B2B_PILOT_REVIEW_MEASUREMENT_START)
const pilotAt = (minute) => new Date(pilotBase + minute * 60_000).toISOString()
const pilotProfiles = [
  profile('pilot_buyer', 'pilot-buyer@example.com'),
  profile('pilot_other', 'pilot-other@example.com'),
  profile('internal', 'josephsskaf@gmail.com'),
]
const pilotEvents = [
  {
    id: 'pilot-page',
    name: pilotReviewPath.diagnosticEvents.pageView,
    user_id: 'pilot_buyer',
    session_id: 'pilot_browser',
    created_at: pilotAt(0.5),
    metadata: { source: pilotReviewPath.intentCampaign, variant: 'business_pilot_review_v1', use_case: 'client_work', cadence: 'weekly', reviewer: 'client_approver', entry: 'review' },
  },
  {
    id: 'pilot-share',
    name: pilotReviewPath.events.copied,
    user_id: 'pilot_buyer',
    session_id: 'pilot_browser',
    created_at: pilotAt(1),
    metadata: { source: pilotReviewPath.intentCampaign, variant: 'business_pilot_review_v1', use_case: 'client_work', cadence: 'weekly', reviewer: 'client_approver', method: 'clipboard' },
  },
  {
    id: 'pilot-received',
    name: pilotReviewPath.events.viewed,
    user_id: 'pilot_buyer',
    session_id: 'pilot_browser',
    created_at: pilotAt(2),
    metadata: { source: pilotReviewPath.intentCampaign, variant: 'business_pilot_review_v1', use_case: 'client_work', cadence: 'weekly', reviewer: 'client_approver', entry: 'review' },
  },
  {
    id: 'pilot-decision',
    name: pilotReviewPath.events.decision,
    user_id: 'pilot_buyer',
    session_id: 'pilot_browser',
    created_at: pilotAt(3),
    metadata: { source: pilotReviewPath.intentCampaign, variant: 'business_pilot_review_v1', use_case: 'client_work', cadence: 'weekly', reviewer: 'client_approver', decision: 'approve_limited_evaluation' },
  },
  {
    id: 'pilot-response',
    name: pilotReviewPath.events.response,
    user_id: 'pilot_buyer',
    session_id: 'pilot_browser',
    created_at: pilotAt(4),
    metadata: { source: pilotReviewPath.intentCampaign, variant: 'business_pilot_review_v1', use_case: 'client_work', cadence: 'weekly', reviewer: 'client_approver', decision: 'approve_limited_evaluation', method: 'native' },
  },
  {
    id: 'pilot-click',
    name: pilotReviewPath.events.activation,
    user_id: 'pilot_buyer',
    session_id: 'pilot_browser',
    created_at: pilotAt(5),
    metadata: { source: pilotReviewPath.intentCampaign, variant: 'business_pilot_review_v1', use_case: 'client_work', cadence: 'weekly', reviewer: 'client_approver', destination: 'pricing', entry: 'review', decision: 'approve_limited_evaluation', arrival_persistence: 'stored', decision_persistence: 'stored' },
  },
  {
    id: 'pilot-pricing-view',
    name: pilotReviewPath.events.pricingView,
    user_id: 'pilot_buyer',
    session_id: 'pilot_browser',
    created_at: pilotAt(6),
    metadata: { source: pilotReviewPath.intentCampaign },
  },
  {
    id: 'pilot-start',
    name: 'checkout_started',
    user_id: 'pilot_buyer',
    session_id: 'pilot_browser',
    created_at: pilotAt(7),
    metadata: { tier: 'starter', billing: 'monthly', intent_campaign: pilotReviewPath.intentCampaign, stripe_session_id: 'cs_pilot_review' },
  },
  {
    id: 'pilot-paid',
    name: 'payment_success',
    user_id: 'pilot_buyer',
    session_id: null,
    created_at: pilotAt(8),
    metadata: { checkout_mode: 'subscription', stripe_session_id: 'cs_pilot_review', amount_total: 700, currency: 'usd' },
  },
  {
    id: 'pilot-internal',
    name: pilotReviewPath.events.viewed,
    user_id: 'internal',
    session_id: 'internal_browser',
    created_at: pilotAt(9),
    metadata: { source: pilotReviewPath.intentCampaign, variant: 'business_pilot_review_v1', use_case: 'client_work', cadence: 'weekly', reviewer: 'client_approver', entry: 'review' },
  },
]
const pilotReport = buildB2bSubscriptionTruthReport({
  generatedAt: pilotAt(8 * 24 * 60),
  windowStart: B2B_PILOT_REVIEW_MEASUREMENT_START,
  events: pilotEvents,
  profiles: pilotProfiles,
})
equal(pilotReport.paths.business_pilot_review_recurring.stages.copied.identifiedExternalPeople, 1, 'pilot note counts one external prepared handoff')
equal(pilotReport.paths.business_pilot_review_recurring.stages.pageViewed.identifiedExternalPeople, 1, 'pilot path exposes a separate page-view diagnostic')
equal(pilotReport.paths.business_pilot_review_recurring.stages.activationChoice.identifiedExternalPeople, 1, 'pilot note counts one external pricing clicker')
equal(pilotReport.paths.business_pilot_review_recurring.stages.viewed.identifiedExternalPeople, 1, 'pilot gate counts the exact recipient, not a pricing view')
equal(pilotReport.paths.business_pilot_review_recurring.stages.viewed.internalEventRows, 1, 'pilot path discloses and excludes internal views')
equal(pilotReport.paths.business_pilot_review_recurring.stages.decisionRecorded.identifiedExternalPeople, 1, 'pilot path counts one closed reviewer decision')
equal(pilotReport.paths.business_pilot_review_recurring.stages.responsePrepared.identifiedExternalPeople, 1, 'pilot path counts a prepared response without claiming delivery')
equal(pilotReport.paths.business_pilot_review_recurring.stages.pricingViewed.identifiedExternalPeople, 1, 'pilot path keeps the exact pricing view as a later stage')
equal(pilotReport.paths.business_pilot_review_recurring.subscription.identifiedExternalPeople, 1, 'pilot path counts one exact recurring buyer')
equal(pilotReport.paths.business_pilot_review_recurring.subscription.exactPaidPeople, 1, 'pilot payment matches the same Stripe Session')
equal(pilotReport.journeys[0]?.entryViewWitness, 'prior_exact_pilot_received_then_click_then_pricing_view_same_browser_session', 'pilot journey requires ordered recipient arrival, click and pricing view in the checkout browser')

const responseReturnEvents = [
  {
    id: 'response-arrival',
    name: pilotReviewPath.events.responseReceived,
    user_id: 'pilot_buyer',
    session_id: 'response_browser',
    created_at: pilotAt(20),
    metadata: { source: pilotReviewPath.intentCampaign, variant: 'business_pilot_review_v1', use_case: 'client_work', cadence: 'weekly', reviewer: 'client_approver', entry: 'response', decision: 'approve_limited_evaluation' },
  },
  {
    id: 'response-click',
    name: pilotReviewPath.events.activation,
    user_id: 'pilot_buyer',
    session_id: 'response_browser',
    created_at: pilotAt(21),
    metadata: { source: pilotReviewPath.intentCampaign, variant: 'business_pilot_review_v1', use_case: 'client_work', cadence: 'weekly', reviewer: 'client_approver', destination: 'pricing', entry: 'response', decision: 'approve_limited_evaluation', arrival_persistence: 'stored', decision_persistence: 'not_applicable' },
  },
  {
    id: 'response-pricing',
    name: pilotReviewPath.events.pricingView,
    user_id: 'pilot_buyer',
    session_id: 'response_browser',
    created_at: pilotAt(22),
    metadata: { source: pilotReviewPath.intentCampaign },
  },
  {
    id: 'response-start',
    name: 'checkout_started',
    user_id: 'pilot_buyer',
    session_id: 'response_browser',
    created_at: pilotAt(23),
    metadata: { tier: 'starter', billing: 'monthly', intent_campaign: pilotReviewPath.intentCampaign, stripe_session_id: 'cs_response_return' },
  },
  {
    id: 'response-paid',
    name: 'payment_success',
    user_id: 'pilot_buyer',
    session_id: null,
    created_at: pilotAt(24),
    metadata: { checkout_mode: 'subscription', stripe_session_id: 'cs_response_return', amount_total: 700, currency: 'usd' },
  },
]
const responseReturnReport = buildB2bSubscriptionTruthReport({
  generatedAt: pilotAt(8 * 24 * 60),
  windowStart: B2B_PILOT_REVIEW_MEASUREMENT_START,
  events: responseReturnEvents,
  profiles: pilotProfiles,
})
equal(responseReturnReport.paths.business_pilot_review_recurring.subscription.exactPaidPeople, 1, 'approved returned response can reach an exact paid subscription')
equal(responseReturnReport.journeys[0]?.entryViewWitness, 'prior_exact_response_received_then_click_then_pricing_view_same_browser_session', 'returned approval has its own exact entry witness')

for (const rejectedDecision of ['needs_changes', 'not_now']) {
  const rejectedResponse = buildB2bSubscriptionTruthReport({
    generatedAt: pilotAt(8 * 24 * 60),
    windowStart: B2B_PILOT_REVIEW_MEASUREMENT_START,
    profiles: pilotProfiles,
    events: responseReturnEvents.map((row) => {
      if (!['response-arrival', 'response-click'].includes(row.id)) return row
      return { ...row, metadata: { ...row.metadata, decision: rejectedDecision } }
    }),
  })
  equal(rejectedResponse.paths.business_pilot_review_recurring.subscription.stripeSessions, 0, rejectedDecision + ' returned response cannot claim a subscription')
}

const invalidPilotEvents = pilotEvents.filter((row) => !['pilot-click', 'pilot-start', 'pilot-paid'].includes(row.id))
invalidPilotEvents.push({
  id: 'pilot-direct-start',
  name: 'checkout_started',
  user_id: 'pilot_buyer',
  session_id: 'pilot_browser',
  created_at: pilotAt(7),
  metadata: { tier: 'starter', billing: 'monthly', intent_campaign: pilotReviewPath.intentCampaign, stripe_session_id: 'cs_direct_pilot' },
})
const directPilotReport = buildB2bSubscriptionTruthReport({
  generatedAt: pilotAt(8 * 24 * 60),
  windowStart: B2B_PILOT_REVIEW_MEASUREMENT_START,
  events: invalidPilotEvents,
  profiles: pilotProfiles,
})
equal(directPilotReport.paths.business_pilot_review_recurring.subscription.stripeSessions, 0, 'direct marked pricing URL without the exact click cannot claim the decision bridge')

const noArrivalPilotReport = buildB2bSubscriptionTruthReport({
  generatedAt: pilotAt(8 * 24 * 60),
  windowStart: B2B_PILOT_REVIEW_MEASUREMENT_START,
  profiles: pilotProfiles,
  events: pilotEvents.filter((row) => ['pilot-click', 'pilot-pricing-view', 'pilot-start'].includes(row.id)),
})
equal(noArrivalPilotReport.paths.business_pilot_review_recurring.subscription.stripeSessions, 0, 'builder click without a received handoff cannot claim the decision bridge')

const reversedPilotReport = buildB2bSubscriptionTruthReport({
  generatedAt: pilotAt(8 * 24 * 60),
  windowStart: B2B_PILOT_REVIEW_MEASUREMENT_START,
  profiles: pilotProfiles,
  events: pilotEvents
    .filter((row) => ['pilot-received', 'pilot-click', 'pilot-pricing-view', 'pilot-start'].includes(row.id))
    .map((row) => row.id === 'pilot-click' ? { ...row, created_at: pilotAt(6.5) } : row),
})
equal(reversedPilotReport.paths.business_pilot_review_recurring.subscription.stripeSessions, 0, 'pricing view before the decision click fails closed')

const otherSessionPilotReport = buildB2bSubscriptionTruthReport({
  generatedAt: pilotAt(8 * 24 * 60),
  windowStart: B2B_PILOT_REVIEW_MEASUREMENT_START,
  profiles: pilotProfiles,
  events: pilotEvents
    .filter((row) => ['pilot-received', 'pilot-click', 'pilot-pricing-view', 'pilot-start'].includes(row.id))
    .map((row) => row.id === 'pilot-click' ? { ...row, session_id: 'other_browser' } : row),
})
equal(otherSessionPilotReport.paths.business_pilot_review_recurring.subscription.stripeSessions, 0, 'click from another browser session fails closed')

const otherOwnerPilotReport = buildB2bSubscriptionTruthReport({
  generatedAt: pilotAt(8 * 24 * 60),
  windowStart: B2B_PILOT_REVIEW_MEASUREMENT_START,
  profiles: pilotProfiles,
  events: pilotEvents
    .filter((row) => ['pilot-received', 'pilot-click', 'pilot-pricing-view', 'pilot-start'].includes(row.id))
    .map((row) => row.id === 'pilot-click' ? { ...row, user_id: 'pilot_other' } : row),
})
equal(otherOwnerPilotReport.paths.business_pilot_review_recurring.subscription.stripeSessions, 0, 'click from another identified owner fails closed')
equal(otherOwnerPilotReport.quality.subscriptionStartsWithConflictingEntryViewIdentity, 1, 'pilot owner conflict is disclosed')

const invalidPilotStages = buildB2bSubscriptionTruthReport({
  generatedAt: pilotAt(8 * 24 * 60),
  windowStart: B2B_PILOT_REVIEW_MEASUREMENT_START,
  profiles: pilotProfiles,
  events: [
    { ...pilotEvents.find((row) => row.id === 'pilot-share'), id: 'bad-method', metadata: { ...pilotEvents.find((row) => row.id === 'pilot-share').metadata, method: 'imagined' } },
    { ...pilotEvents.find((row) => row.id === 'pilot-received'), id: 'bad-variant', metadata: { ...pilotEvents.find((row) => row.id === 'pilot-received').metadata, variant: 'forged' } },
    { ...pilotEvents.find((row) => row.id === 'pilot-decision'), id: 'bad-decision', metadata: { ...pilotEvents.find((row) => row.id === 'pilot-decision').metadata, decision: 'ship_it' } },
    { ...pilotEvents.find((row) => row.id === 'pilot-click'), id: 'bad-destination', metadata: { ...pilotEvents.find((row) => row.id === 'pilot-click').metadata, destination: 'checkout' } },
  ],
})
equal(invalidPilotStages.paths.business_pilot_review_recurring.stages.copied.eventRows, 0, 'invalid preparation method fails closed')
equal(invalidPilotStages.paths.business_pilot_review_recurring.stages.viewed.eventRows, 0, 'invalid recipient variant fails closed')
equal(invalidPilotStages.paths.business_pilot_review_recurring.stages.decisionRecorded.eventRows, 0, 'invalid decision fails closed')
equal(invalidPilotStages.paths.business_pilot_review_recurring.stages.activationChoice.eventRows, 0, 'invalid pricing destination fails closed')

for (const [field, value, label] of [
  ['decision', 'not_now', 'not-now decision'],
  ['decision', 'needs_changes', 'needs-changes decision'],
  ['decision', null, 'missing decision'],
  ['entry', 'builder', 'builder entry'],
  ['arrival_persistence', 'timeout', 'unconfirmed arrival'],
  ['decision_persistence', 'timeout', 'unconfirmed reviewer decision'],
]) {
  const click = pilotEvents.find((row) => row.id === 'pilot-click')
  const metadata = { ...click.metadata }
  if (value === null) delete metadata[field]
  else metadata[field] = value
  const reportWithInvalidClick = buildB2bSubscriptionTruthReport({
    generatedAt: pilotAt(8 * 24 * 60),
    windowStart: B2B_PILOT_REVIEW_MEASUREMENT_START,
    profiles: pilotProfiles,
    events: pilotEvents.map((row) => row.id === 'pilot-click' ? { ...row, metadata } : row),
  })
  equal(reportWithInvalidClick.paths.business_pilot_review_recurring.subscription.stripeSessions, 0, label + ' cannot claim the bridge')
}

console.log(`b2b subscription truth: ${checks}/${checks}`)
