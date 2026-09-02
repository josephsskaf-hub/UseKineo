#!/usr/bin/env node
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  B2B_ATTRIBUTABLE_PATHS,
  buildB2bSubscriptionTruthReport,
} from './b2b-subscription-truth-report.mjs'
import { buildB2bFitReviewSubscriptionReport } from './b2b-fit-review-subscription-report.mjs'
import { AGENCY_PRODUCTION_SCOPE_MEASUREMENT_CONTRACT } from './agency-production-scope-contract.mjs'
import { collectAgencyScopeFitReview } from './measure-agency-scope-fit-review.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const requireFromRepo = createRequire(join(root, 'package.json'))
const ts = requireFromRepo('typescript')
const read = (path) => readFileSync(join(root, path), 'utf8')
let checks = 0
const ok = (value, label) => { assert.ok(value, label); checks += 1 }
const equal = (actual, expected, label) => { assert.equal(actual, expected, label); checks += 1 }

function loadTs(path, mocks = {}) {
  const output = ts.transpileModule(read(path), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    fileName: path,
  }).outputText
  const module = { exports: {} }
  new Function('require', 'module', 'exports', output)((id) => {
    if (Object.prototype.hasOwnProperty.call(mocks, id)) return mocks[id]
    throw new Error(`${path}: unexpected import ${id}`)
  }, module, module.exports)
  return module.exports
}

const scopeContract = loadTs('lib/growth/agencyProductionScope.ts')
const distribution = loadTs('lib/agencyDistribution.ts')
const b2bLead = loadTs('lib/growth/b2bLead.ts', {
  '@/lib/growth/agencyProductionScope': scopeContract,
})
const offer = {
  url: 'https://www.usekineo.com/ai-shorts-for-agencies',
  namedVideoCountEngine: 'Kineo 1',
  packs: [
    { videos: 10, priceUsd: '$99.00', pricePerFastVideoUsd: '$9.90' },
    { videos: 50, priceUsd: '$379.00', pricePerFastVideoUsd: '$7.58' },
  ],
  boundaries: [
    'The named video count covers Kineo 1 videos; premium engines spend more credits and reduce the output count.',
    'Self-service for one Kineo account; no team seats, client approval routing or white-label portal.',
    'Finished MP4s may be delivered commercially, but access to Kineo itself may not be resold.',
  ],
}
const scope = scopeContract.buildAgencyProductionScope('https://www.usekineo.com', offer)
const text = scopeContract.renderAgencyProductionScopeTxt(scope)

equal(scope.version, 'agency_production_scope_v1', 'scope has a stable version')
equal(scope.effectiveDate, '2026-09-02', 'scope carries a dated effective boundary')
ok(scope.disclaimer.includes('not a contract'), 'scope cannot present itself as a contract')
ok(scope.disclaimer.includes('Terms of Service prevail'), 'terms remain authoritative')
equal(scope.packReferences.length, offer.packs.length, 'every pack reference is derived from the canonical offer')
equal(scope.purchasePaths.length, 3, 'pack, recurring and Autopilot are distinct')
equal(new Set(scope.purchasePaths.map((path) => path.id)).size, 3, 'purchase path ids are unique')

const fixed = new URL(scope.purchasePaths.find((path) => path.id === 'fixed_batch').url)
equal(fixed.pathname, '/ai-shorts-for-agencies', 'fixed path uses the existing pack page')
equal(fixed.searchParams.get('entry'), 'scope_brief', 'fixed path has a narrow internal entry')
equal(fixed.hash, '#agency-pack-heading', 'fixed path lands on the pack shelf')
ok(!fixed.search.includes('utm_'), 'fixed path preserves external acquisition attribution')

const recurring = new URL(scope.purchasePaths.find((path) => path.id === 'recurring_self_service').url)
equal(recurring.pathname, '/pricing', 'recurring path uses existing pricing')
equal(recurring.searchParams.get('intent_campaign'), 'b2b_agency_scope_recurring_v1', 'recurring path has exact attribution')
equal(recurring.hash, '#plans', 'recurring path lands on plans')

const autopilot = new URL(scope.purchasePaths.find((path) => path.id === 'autopilot').url)
equal(autopilot.pathname, '/pricing', 'Autopilot stays on canonical pricing')
equal(autopilot.searchParams.get('intent_campaign'), 'b2b_agency_scope_autopilot_v1', 'Autopilot has exact attribution')
equal(autopilot.hash, '#autopilot', 'Autopilot remains a separate section')
ok(scope.purchasePaths.find((path) => path.id === 'autopilot').description.includes('not included'), 'Autopilot is not implied by another purchase')

const fitReview = new URL(scope.fitReviewUrl)
equal(fitReview.searchParams.get('entry'), 'scope_brief', 'fit review preserves a first-party entry instead of overwriting UTM')
equal(fitReview.hash, '#agency-brief-heading', 'fit review lands on the existing form')
equal(new URL(scope.termsUrl).pathname, '/terms', 'authority links to current terms')

for (const boundary of offer.boundaries) ok(text.includes(boundary), 'canonical offer boundary is rendered')
for (const label of ['Fixed one-time batch', 'Recurring self-service production', 'Autopilot']) {
  ok(text.includes(label), `${label}: rendered as a separate path`)
}
ok(text.includes('Product scope, not a contract'), 'plain text carries the legal boundary')
ok(text.includes('reviewing each AI-generated output before publishing'), 'operator review responsibility is explicit')
ok(text.includes('10 videos: $99.00 once ($9.90 per video)'), 'plain text renders canonical pack facts')
ok(!read('lib/growth/agencyProductionScope.ts').includes('$99'), 'scope module does not hardcode a public price')
assert.throws(
  () => scopeContract.buildAgencyProductionScope('https://www.usekineo.com', { ...offer, url: 'http://evil.example/packs' }),
  /canonical HTTPS offer URL/,
)
checks += 1

ok(distribution.AGENCY_PACK_ENTRIES.includes('scope_brief'), 'pack page accepts the scope entry without creating a visual bridge')
equal(distribution.readAgencyDistributionEntry('?entry=scope_brief'), 'scope_brief', 'scope entry round-trips')
equal(distribution.readAgencyDistributionEntry('?entry=scope-brief'), null, 'nearby forged entry fails closed')

const scopeAttribution = b2bLead.readB2BFitReviewAttribution('?entry=scope_brief&utm_source=original')
equal(scopeAttribution.entry_campaign, 'b2b_agency_scope_brief_v1', 'fit review records the scope campaign')
equal(scopeAttribution.entry_source, 'agency_scope_brief', 'fit review records a bounded source')
equal(scopeAttribution.entry_medium, 'scope_document', 'fit review records a bounded medium')
equal(b2bLead.B2B_SCOPE_BRIEF_CAMPAIGN, scopeContract.AGENCY_PRODUCTION_SCOPE_FIT_REVIEW_CAMPAIGN, 'fit-review campaign has one canonical source')
equal(b2bLead.readB2BFitReviewAttribution('?entry=scope-brief'), null, 'invalid scope entry is not attributed')
equal(AGENCY_PRODUCTION_SCOPE_MEASUREMENT_CONTRACT.recurringCampaign, scopeContract.AGENCY_PRODUCTION_SCOPE_RECURRING_CAMPAIGN, 'recurring measurement reads its canonical source')
equal(AGENCY_PRODUCTION_SCOPE_MEASUREMENT_CONTRACT.autopilotCampaign, scopeContract.AGENCY_PRODUCTION_SCOPE_AUTOPILOT_CAMPAIGN, 'Autopilot measurement reads its canonical source')
equal(AGENCY_PRODUCTION_SCOPE_MEASUREMENT_CONTRACT.fitReview.entryCampaign, scopeContract.AGENCY_PRODUCTION_SCOPE_FIT_REVIEW_CAMPAIGN, 'fit-review measurement reads its canonical source')

const route = loadTs('app/agency-production-scope.txt/route.ts', {
  '@/lib/kineoFacts': { PRODUCT: { url: 'https://www.usekineo.com' }, BUSINESS_OFFER_FACT: offer },
  '@/lib/growth/agencyProductionScope': scopeContract,
})
const response = route.GET()
equal(response.status, 200, 'public scope route returns 200')
equal(response.headers.get('content-type'), 'text/plain; charset=utf-8', 'public scope route is plain text')
equal(response.headers.get('x-robots-tag'), 'all', 'public scope route is discoverable')
equal(await response.text(), text, 'route executes the production builder')
ok(!read('app/agency-production-scope.txt/route.ts').includes('trackEvent'), 'crawler GET never counts as a human event')
ok(read('app/sitemap.ts').includes("{ path: '/agency-production-scope.txt'"), 'sitemap discovers the scope passively')

const path = B2B_ATTRIBUTABLE_PATHS.agency_scope_recurring
const autopilotPath = B2B_ATTRIBUTABLE_PATHS.agency_scope_autopilot
equal(path.intentCampaign, 'b2b_agency_scope_recurring_v1', 'subscription report owns the recurring scope campaign')
equal(path.intentCampaign, scopeContract.AGENCY_PRODUCTION_SCOPE_RECURRING_CAMPAIGN, 'document and report share the recurring campaign')
equal(autopilotPath.intentCampaign, scopeContract.AGENCY_PRODUCTION_SCOPE_AUTOPILOT_CAMPAIGN, 'document and report share the Autopilot campaign')
const generatedAt = '2026-09-03T02:00:00.000Z'
const report = buildB2bSubscriptionTruthReport({
  generatedAt,
  windowStart: '2026-09-03T00:00:00.000Z',
  profiles: [
    { id: 'buyer', email: 'buyer@business.example' },
    { id: 'autopilot-buyer', email: 'autopilot@business.example' },
  ],
  events: [
    { id: 'view', name: 'pricing_view', user_id: 'buyer', session_id: 'scope_browser', created_at: '2026-09-03T00:01:00.000Z', metadata: { source: path.intentCampaign } },
    { id: 'start', name: 'checkout_started', user_id: 'buyer', session_id: 'scope_browser', created_at: '2026-09-03T00:02:00.000Z', metadata: { intent_campaign: path.intentCampaign, stripe_session_id: 'cs_scope_1', tier: 'basic', billing: 'monthly' } },
    { id: 'paid', name: 'payment_success', user_id: 'buyer', session_id: null, created_at: '2026-09-03T00:03:00.000Z', metadata: { checkout_mode: 'subscription', stripe_session_id: 'cs_scope_1', amount_total: 1500, currency: 'usd' } },
    { id: 'auto-view', name: 'pricing_view', user_id: 'autopilot-buyer', session_id: 'auto_browser', created_at: '2026-09-03T00:04:00.000Z', metadata: { source: autopilotPath.intentCampaign } },
    { id: 'auto-start', name: 'checkout_started', user_id: 'autopilot-buyer', session_id: 'auto_browser', created_at: '2026-09-03T00:05:00.000Z', metadata: { intent_campaign: autopilotPath.intentCampaign, stripe_session_id: 'cs_scope_auto', tier: 'autopilot', billing: 'monthly' } },
    { id: 'auto-paid', name: 'payment_success', user_id: 'autopilot-buyer', session_id: null, created_at: '2026-09-03T00:06:00.000Z', metadata: { checkout_mode: 'subscription', stripe_session_id: 'cs_scope_auto', amount_total: 29900, currency: 'usd' } },
  ],
})
equal(report.paths.agency_scope_recurring.subscription.identifiedExternalPeople, 1, 'scope path counts one external buyer')
equal(report.paths.agency_scope_recurring.subscription.exactPaidPeople, 1, 'scope path counts same-Session payment')
equal(report.paths.agency_scope_recurring.subscription.exactRevenueMinorByCurrency.usd, 1500, 'scope path keeps exact USD minor revenue')
equal(report.paths.agency_scope_recurring.gate.state, 'ready_for_path_diagnosis', 'first exact Session opens reconciliation only')
equal(report.paths.agency_scope_recurring.subscription.byTier.basic, 1, 'recurring scope path exposes the purchased tier')
equal(report.paths.agency_scope_autopilot.subscription.identifiedExternalPeople, 1, 'scope Autopilot path counts one external buyer')
equal(report.paths.agency_scope_autopilot.subscription.exactPaidPeople, 1, 'scope Autopilot path counts same-Session payment')
equal(report.paths.agency_scope_autopilot.subscription.exactRevenueMinorByCurrency.usd, 29900, 'scope Autopilot path keeps exact USD minor revenue')
equal(report.paths.agency_scope_autopilot.subscription.byTier.autopilot, 1, 'Autopilot scope path exposes only the Autopilot tier')

const crossedProducts = buildB2bSubscriptionTruthReport({
  generatedAt,
  windowStart: '2026-09-03T00:00:00.000Z',
  profiles: [
    { id: 'wrong-auto', email: 'wrong-auto@business.example' },
    { id: 'wrong-recurring', email: 'wrong-recurring@business.example' },
  ],
  events: [
    { id: 'wrong-auto-view', name: 'pricing_view', user_id: 'wrong-auto', session_id: 'wrong_auto_browser', created_at: '2026-09-03T00:01:00.000Z', metadata: { source: autopilotPath.intentCampaign } },
    { id: 'wrong-auto-start', name: 'checkout_started', user_id: 'wrong-auto', session_id: 'wrong_auto_browser', created_at: '2026-09-03T00:02:00.000Z', metadata: { intent_campaign: autopilotPath.intentCampaign, stripe_session_id: 'cs_wrong_auto', tier: 'starter', billing: 'monthly' } },
    { id: 'wrong-recurring-view', name: 'pricing_view', user_id: 'wrong-recurring', session_id: 'wrong_recurring_browser', created_at: '2026-09-03T00:03:00.000Z', metadata: { source: path.intentCampaign } },
    { id: 'wrong-recurring-start', name: 'checkout_started', user_id: 'wrong-recurring', session_id: 'wrong_recurring_browser', created_at: '2026-09-03T00:04:00.000Z', metadata: { intent_campaign: path.intentCampaign, stripe_session_id: 'cs_wrong_recurring', tier: 'autopilot', billing: 'monthly' } },
  ],
})
equal(crossedProducts.paths.agency_scope_autopilot.subscription.stripeSessions, 0, 'Starter purchase cannot enter the Autopilot path')
equal(crossedProducts.paths.agency_scope_recurring.subscription.stripeSessions, 0, 'Autopilot purchase cannot enter recurring self-service')
equal(crossedProducts.quality.invalidRecurringRowsOnB2bCampaigns, 2, 'crossed products are diagnosed instead of silently relabelled')

const fitMetadata = {
  version: AGENCY_PRODUCTION_SCOPE_MEASUREMENT_CONTRACT.fitReview.version,
  surface: AGENCY_PRODUCTION_SCOPE_MEASUREMENT_CONTRACT.fitReview.surface,
  entry_campaign: AGENCY_PRODUCTION_SCOPE_MEASUREMENT_CONTRACT.fitReview.entryCampaign,
  entry_source: AGENCY_PRODUCTION_SCOPE_MEASUREMENT_CONTRACT.fitReview.entrySource,
  entry_medium: AGENCY_PRODUCTION_SCOPE_MEASUREMENT_CONTRACT.fitReview.entryMedium,
}
const fitEvents = [
  { id: 'fit-view', name: 'b2b_brief_viewed', user_id: 'buyer', session_id: 'fit_browser', created_at: '2026-09-03T00:01:00.000Z', metadata: fitMetadata },
  { id: 'fit-submit', name: 'b2b_brief_submitted', user_id: 'buyer', session_id: 'fit_browser', created_at: '2026-09-03T00:02:00.000Z', metadata: { ...fitMetadata, monthly_volume: '20_49' } },
]
const fitReport = buildB2bFitReviewSubscriptionReport({
  generatedAt: '2026-09-11T00:00:00.000Z',
  windowStart: '2026-09-03T00:00:00.000Z',
  evidenceEvents: fitEvents,
  sessionEvents: fitEvents,
  financialEvents: [],
  profiles: [{ id: 'buyer', email: 'buyer@business.example' }],
  contract: AGENCY_PRODUCTION_SCOPE_MEASUREMENT_CONTRACT.fitReview,
})
equal(fitReport.funnel.resolvedExternalSubmitPeople, 1, 'scope fit review counts one resolved external submitter')
equal(fitReport.contract.entryCampaign, scopeContract.AGENCY_PRODUCTION_SCOPE_FIT_REVIEW_CAMPAIGN, 'scope fit report declares the exact campaign it measured')
equal(fitReport.exclusionsAndDiagnostics.invalidContractViewRows, 0, 'scope view satisfies the exact fit-review contract')
equal(fitReport.gate.state, 'collecting', 'one fit submit without financial signal stays below the mature sample gate')
const fitCheckoutReport = buildB2bFitReviewSubscriptionReport({
  generatedAt: '2026-09-11T00:00:00.000Z',
  windowStart: '2026-09-03T00:00:00.000Z',
  evidenceEvents: fitEvents,
  sessionEvents: fitEvents,
  financialEvents: [
    { id: 'fit-start', name: 'checkout_started', user_id: 'buyer', session_id: 'fit_browser', created_at: '2026-09-03T00:03:00.000Z', metadata: { stripe_session_id: 'cs_fit_1', tier: 'basic', billing: 'monthly' } },
  ],
  profiles: [{ id: 'buyer', email: 'buyer@business.example' }],
  contract: AGENCY_PRODUCTION_SCOPE_MEASUREMENT_CONTRACT.fitReview,
})
equal(fitCheckoutReport.gate.firstExactStripeSessionObserved, true, 'first exact fit-review Stripe Session is computed')
equal(fitCheckoutReport.gate.state, 'ready_for_assist_review', 'first exact fit-review Stripe Session opens early reconciliation')

let capturedCollectorInput = null
const collectedScope = await collectAgencyScopeFitReview({
  db: { sentinel: true },
  generatedAt: new Date('2026-09-11T00:00:00.000Z'),
  collector: async (input) => {
    capturedCollectorInput = input
    return { measured: true }
  },
})
equal(collectedScope.measured, true, 'scope-specific production runner executes its collector')
equal(capturedCollectorInput.contract, AGENCY_PRODUCTION_SCOPE_MEASUREMENT_CONTRACT.fitReview, 'runner passes the exact scope fit-review contract')
equal(capturedCollectorInput.db.sentinel, true, 'runner passes the provided database client unchanged')
equal(
  b2bLead.b2bFitReviewViewMarker(scopeAttribution),
  'kineo:b2b-brief:viewed:v1:b2b_agency_scope_brief_v1',
  'scope marker policy executes without colliding with the legacy campaign',
)
ok(read('app/ai-shorts-for-agencies/AgencyBriefClient.tsx').includes('b2bFitReviewViewMarker(attribution)'), 'React caller invokes the executed marker policy')

console.log(`agency production scope: ${checks}/${checks}`)
