#!/usr/bin/env node
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import ts from 'typescript'

const root = process.cwd()
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8')
let checks = 0
const check = (value, label) => { assert.ok(value, label); checks += 1 }
const equal = (actual, expected, label) => { assert.deepEqual(actual, expected, label); checks += 1 }

function executeTs(file, mocks = {}) {
  const output = ts.transpileModule(read(file), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText
  const moduleBox = { exports: {} }
  vm.runInNewContext(output, {
    module: moduleBox,
    exports: moduleBox.exports,
    require: (id) => {
      if (Object.hasOwn(mocks, id)) return mocks[id]
      throw new Error(`unmocked import: ${id}`)
    },
    Date,
    Map,
    Number,
    URL,
    URLSearchParams,
  }, { filename: file })
  return moduleBox.exports
}

const engineCost = executeTs('lib/credits/engineCost.ts')
const policy = executeTs('lib/growth/trialBalanceBridge.ts', {
  '@/lib/credits/engineCost': engineCost,
})
const onboardingGoals = executeTs('lib/growth/onboardingGoals.ts')

equal(policy.TRIAL_BALANCE_BRIDGE_COST, 15, '35s Seedance costs 15 canonical credits')
equal(policy.FULL_SEEDANCE_COST, 25, '60s Seedance costs 25 canonical credits')
equal(policy.TRIAL_FIRST_DELIVERY_DURATION, 60, 'first delivery uses the full 60s premium experience')
equal(policy.TRIAL_BALANCE_BRIDGE_DURATION, 35, 'bridge duration is explicit and visible in the public selector')
equal(policy.TRIAL_BALANCE_BRIDGE_ENGINE, 'cinematic_ai', 'bridge engine is Seedance quality')
check(read('lib/expandPolicy.ts').includes('SUPPORTED_DURATIONS = [35, 60, 90]'), '35s is supported by the shared client/server duration contract')

for (const [input, eligible, reason] of [
  [{ trialPhase: 'active', credits: 25, creditsUsed: 0 }, true, 'eligible'],
  [{ trialPhase: 'active', credits: 25, creditsUsed: 4 }, false, 'already_used'],
  [{ trialPhase: 'active', credits: 24, creditsUsed: 0 }, false, 'insufficient_balance'],
  [{ trialPhase: 'active', credits: null, creditsUsed: 0 }, false, 'unknown_balance'],
  [{ trialPhase: 'active', credits: 25, creditsUsed: null }, false, 'unknown_usage'],
  [{ trialPhase: 'ending', credits: 25, creditsUsed: 0 }, false, 'not_active'],
]) {
  const result = policy.decideTrialFirstDelivery(input)
  equal(result.eligible, eligible, 'first-delivery eligibility names ' + reason)
  equal(result.reason, reason, 'first-delivery decision returns ' + reason)
}
equal(
  policy.decideTrialFirstDelivery({ trialPhase: 'active', credits: 25, creditsUsed: 0 }).creditsAfterSuccess,
  0,
  'full premium first delivery intentionally reaches the day-one credit wall',
)

for (const credits of [15, 20, 21, 22, 23, 24]) {
  const result = policy.decideTrialBalanceBridge({ trialPhase: 'active', credits, deliveredQuality: 'fast' })
  equal(result.eligible, true, `${credits} residual credits are eligible`)
  equal(result.creditsAfterSuccess, credits - 15, `${credits} exposes exact post-success balance`)
}

for (const credits of [15, 20, 21, 22, 23, 24]) {
  const result = policy.decideTrialReturnLadder({ trialPhase: 'active', credits })
  equal(result.eligible, true, `${credits} credits are recoverable after returning to the app`)
  equal(result.creditsAfterSuccess, credits - 15, `${credits} keeps exact return-ladder math`)
}

for (const [input, reason] of [
  [{ trialPhase: null, credits: 20 }, 'not_active'],
  [{ trialPhase: 'ending', credits: 20 }, 'not_active'],
  [{ trialPhase: 'active', credits: null }, 'unknown_balance'],
  [{ trialPhase: 'active', credits: 14 }, 'too_few_credits'],
  [{ trialPhase: 'active', credits: 25 }, 'full_seedance_already_fits'],
]) {
  const result = policy.decideTrialReturnLadder(input)
  equal(result.eligible, false, `return ladder rejects ${reason}`)
  equal(result.reason, reason, `return ladder names ${reason}`)
}

for (const [input, reason] of [
  [{ trialPhase: null, credits: 20, deliveredQuality: 'fast' }, 'not_active'],
  [{ trialPhase: 'ending', credits: 20, deliveredQuality: 'fast' }, 'not_active'],
  [{ trialPhase: 'active', credits: 20, deliveredQuality: 'cinematic_ai' }, 'not_fast'],
  [{ trialPhase: 'active', credits: null, deliveredQuality: 'fast' }, 'unknown_balance'],
  [{ trialPhase: 'active', credits: 14, deliveredQuality: 'fast' }, 'too_few_credits'],
  [{ trialPhase: 'active', credits: 25, deliveredQuality: 'fast' }, 'full_seedance_already_fits'],
]) {
  const result = policy.decideTrialBalanceBridge(input)
  equal(result.eligible, false, `${reason} is ineligible`)
  equal(result.reason, reason, `${reason} is named`)
}

const policySource = read('lib/growth/trialBalanceBridge.ts')
check(!policySource.includes('/api/'), 'policy performs no API call')
check(!policySource.includes('video_credits'), 'policy cannot mutate a credit balance')
check(policySource.includes("creditCostForDuration('cinematic_ai', true, 60)"), 'upper boundary comes from canonical cost')

const funnel = executeTs('lib/admin/trialBalanceBridgeFunnel.ts', {
  '@/lib/growth/trialBalanceBridge': policy,
})
const base = Date.parse('2026-08-29T12:00:00Z')
const event = (name, minute, user, metadata = null, session = null) => ({
  name,
  user_id: user,
  session_id: session,
  created_at: new Date(base + minute * 60_000).toISOString(),
  metadata,
})
const campaign = { intent_campaign: policy.TRIAL_BALANCE_BRIDGE_VERSION }
const rows = [
  event('trial_balance_bridge_viewed', 0, 'paid'),
  event('trial_balance_bridge_viewed', 1, 'paid'),
  event('trial_balance_bridge_clicked', 2, 'paid'),
  event('video_generation_completed', 3, 'paid', { ...campaign, quality: 'fast' }),
  event('video_generation_completed', 4, 'paid', { ...campaign, quality: 'cinematic_ai' }),
  event('checkout_started', 5, 'paid', campaign),
  event('payment_success', 6, 'paid'),
  event('trial_balance_bridge_viewed', 0, 'complete-only'),
  event('trial_balance_bridge_clicked', 1, 'complete-only'),
  event('video_generation_completed', 2, 'complete-only', { ...campaign, quality: 'cinematic_ai' }),
  event('trial_balance_bridge_viewed', 0, 'click-only'),
  event('trial_balance_bridge_clicked', 1, 'click-only'),
  event('trial_balance_bridge_viewed', 0, null, null, 'anon-session'),
  event('video_generation_completed', 2, null, { ...campaign, quality: 'cinematic_ai' }, 'anon-session'),
]
const summary = funnel.buildTrialBalanceBridgeFunnel(rows)
equal(summary.viewers, 4, 'duplicate views count as four people, not five events')
equal(summary.clickers, 3, 'only ordered clickers count')
equal(summary.premiumCompleters, 2, 'only attributed Seedance completions count')
equal(summary.checkoutStarters, 1, 'checkout requires an attributed completion')
equal(summary.subscribers, 1, 'payment requires the full ordered journey')
equal(summary.viewToClickRate, '75.0%', 'view-to-click rate is person-level')
equal(summary.clickToPremiumRate, '66.7%', 'click-to-premium rate is person-level')
equal(summary.premiumToCheckoutRate, '50.0%', 'premium-to-checkout rate is person-level')
equal(summary.checkoutToPaidRate, '100.0%', 'checkout-to-paid rate is person-level')

// Worktrees on Windows can materialize tracked text as CRLF. Normalize only
// the test input so structural assertions do not depend on checkout settings.
const client = read('app/(dashboard)/generate/GenerateClient.tsx').replace(/\r\n/g, '\n')
check(client.includes("import {\n  decideTrialBalanceBridge"), 'production client imports executable policy')
check(client.includes("trackEvent('trial_balance_bridge_viewed'"), 'real impression emits bridge event')
check(client.includes("trackEvent('trial_balance_bridge_clicked'"), 'real CTA emits bridge click')
check(client.includes('intent_campaign: intentCampaign || null'), 'completion preserves bridge campaign')
check(client.includes('showTrialPostVideoOffer && trialBalanceBridge.eligible'), 'bridge renders only inside the proven trial slot')
check(client.includes('showTrialPostVideoOffer && !trialBalanceBridge.eligible'), 'subscription offer and bridge are mutually exclusive')
const bridgeDecisionIndex = client.indexOf('const trialBalanceBridge = decideTrialBalanceBridge({')
const planFitCandidateIndex = client.indexOf('const planFitOfferCandidate =')
check(bridgeDecisionIndex >= 0 && bridgeDecisionIndex < planFitCandidateIndex, 'bridge eligibility is resolved before Plan Fit reserves the slot')
check(client.includes('planFitSellableCohort !== null &&\n    !trialBalanceBridge.eligible'), 'Plan Fit defers to an already-funded bridge')
check(client.includes('data-trial-balance-bridge={trialBalanceBridge.version}'), 'rendered surface names its version')
check(client.includes('Nothing starts until you enter the next idea and press Generate.'), 'copy denies automatic spending')
check(client.includes('setAiEngine(\'seedance\')'), 'CTA selects Seedance')
check(client.includes('setDuration(trialBalanceBridge.duration)'), 'CTA selects the canonical supported duration')
check(client.includes("`/studio/create?engine=seedance&duration=${trialBalanceBridge.duration}&intent_campaign=${TRIAL_BALANCE_BRIDGE_VERSION}`"), 'CTA lands on canonical creation route with attribution')
const handler = client.slice(client.indexOf('const handleTrialBalanceBridge'), client.indexOf('// FRASE DE PRAZO'))
check(!handler.includes('fetch('), 'CTA makes no network mutation')
check(!handler.includes('handleGenerate'), 'CTA cannot start a render')
check(!handler.includes('handleAnalyze'), 'CTA cannot spend analysis work')
check(!handler.includes('studio=1'), 'CTA cannot arm Studio auto-fire')

const banner = read('components/TrialActiveBanner.tsx').replace(/\r\n/g, '\n')
check(banner.includes('decideTrialReturnLadder'), 'persistent trial banner executes return-ladder policy')
check(banner.includes('decideTrialFirstDelivery'), 'persistent trial banner executes activation-before-checkout policy')
check(banner.includes("trackEvent('trial_first_delivery_clicked'"), 'first-delivery CTA emits a distinct causal event')
check(banner.includes('data-trial-first-delivery={firstDelivery.version}'), 'first-delivery surface names its contract version')
check(banner.includes('Use the premium trial before choosing a plan.'), 'zero-use copy sequences value before purchase')
check(banner.includes('No card required. Nothing starts until you review the setup.'), 'copy states both payment and render boundaries')
check(banner.includes("{!firstDelivery.eligible && <button"), 'checkout CTA is absent only while the untouched premium delivery fits')
check(banner.includes('buildOnboardingGoalStudioHref(DEFAULT_ONBOARDING_GOAL'), 'first-delivery CTA reuses the canonical editable starter brief')
const firstDeliveryHref = onboardingGoals.buildOnboardingGoalStudioHref(
  onboardingGoals.DEFAULT_ONBOARDING_GOAL,
  { duration: policy.TRIAL_FIRST_DELIVERY_DURATION, intentCampaign: policy.TRIAL_FIRST_DELIVERY_VERSION },
)
const firstDeliveryUrl = new URL(firstDeliveryHref, 'https://www.usekineo.com')
equal(firstDeliveryUrl.pathname, '/studio', 'first-delivery CTA opens the visible Studio cockpit')
equal(firstDeliveryUrl.searchParams.get('engine'), 'seedance', 'first-delivery CTA selects Seedance')
equal(firstDeliveryUrl.searchParams.get('duration'), '60', 'first-delivery CTA carries the supported duration')
equal(firstDeliveryUrl.searchParams.get('prompt'), onboardingGoals.DEFAULT_ONBOARDING_GOAL.topic, 'first-delivery CTA carries the canonical editable idea')
equal(firstDeliveryUrl.searchParams.get('intent_campaign'), policy.TRIAL_FIRST_DELIVERY_VERSION, 'first-delivery CTA preserves isolated attribution')
check(!firstDeliveryUrl.searchParams.has('autoanalyze'), 'first-delivery CTA cannot start analysis')
check(!firstDeliveryUrl.searchParams.has('create_intent'), 'first-delivery CTA cannot start a render')
const firstHandlerStart = banner.indexOf('const startFirstPremiumDelivery')
const firstHandlerEnd = banner.indexOf('\n  const continueTrialWithSeedance', firstHandlerStart)
check(firstHandlerStart >= 0 && firstHandlerEnd > firstHandlerStart, 'first-delivery handler boundaries are found')
const firstHandler = banner.slice(firstHandlerStart, firstHandlerEnd)
check(!firstHandler.includes('fetch('), 'first-delivery CTA cannot call a provider or mutate credits')
check(!firstHandler.includes('checkout.launch'), 'first-delivery CTA cannot open Stripe')
check(banner.includes("trackEvent('trial_balance_bridge_viewed'"), 'persistent surface joins the existing measured bridge funnel')
check(banner.includes("trackEvent('trial_balance_bridge_clicked'"), 'persistent CTA emits the existing causal click')
check(banner.includes("surface: 'persistent_trial_banner'"), 'persistent surface is distinguishable in telemetry')
check(banner.includes('data-trial-return-ladder={returnLadder.version}'), 'persistent UI names its contract version')
check(banner.includes('entry.intersectionRatio >= 0.5'), 'persistent view counts only after 50% visibility')
check(banner.includes('You review the setup before anything starts.'), 'copy denies automatic credit spend')
check(banner.includes("`/studio/create?engine=seedance&duration=${returnLadder.duration}&intent_campaign=${TRIAL_BALANCE_BRIDGE_VERSION}`"), 'return CTA lands on the attributed Seedance setup')
const returnHandlerStart = banner.indexOf('const continueTrialWithSeedance')
const returnHandlerEnd = banner.indexOf('\n\n  return (', returnHandlerStart)
check(returnHandlerStart >= 0 && returnHandlerEnd > returnHandlerStart, 'return CTA handler boundaries are found in product code')
const returnHandler = banner.slice(returnHandlerStart, returnHandlerEnd)
check(!returnHandler.includes('fetch('), 'return CTA cannot call a provider or mutate credits')
check(!returnHandler.includes('handleGenerate'), 'return CTA cannot start a render')

const route = read('app/api/admin/funnel/route.ts')
check(route.includes("'trial_balance_bridge_viewed', 'trial_balance_bridge_clicked'"), 'admin fetches bridge stages')
check(route.includes("'video_generation_completed'"), 'admin fetches attributed completion')
check(route.includes('buildTrialBalanceBridgeFunnel(postVideoEventRows)'), 'admin executes the causal builder')
check(route.includes('trialPostVideoOffer, trialBalanceBridge, planFitOffer'), 'API returns bridge without replacing existing funnel')

const admin = read('app/(dashboard)/admin/funnel/FunnelClient.tsx')
for (const label of ['Bridge viewers', 'Premium completers', 'Checkout after premium', 'Subscribers']) {
  check(admin.includes(label), `admin displays ${label}`)
}

check(admin.includes('Fast trial users with 15–24cr left'), 'admin shows the actual eligibility band')
check(admin.includes('35s Seedance completed after click'), 'admin shows the actual supported bridge duration')

const previewPath = 'docs/previews/TRIAL-BALANCE-BRIDGE-2026-08-29.html'
check(fs.existsSync(path.join(root, previewPath)), 'before/after preview exists')
const preview = read(previewPath)
for (const marker of ['BEFORE · DESKTOP', 'AFTER · DESKTOP', 'AFTER · MOBILE', 'ADMIN MEASUREMENT']) {
  check(preview.includes(marker), `preview contains ${marker}`)
}
check(!/https?:\/\//i.test(preview), 'preview has no external dependency')

const returnPreviewPath = 'docs/previews/TRIAL-RETURN-LADDER-2026-08-29.html'
check(fs.existsSync(path.join(root, returnPreviewPath)), 'persistent return-ladder preview exists')
const returnPreview = read(returnPreviewPath)
for (const marker of ['BEFORE · DESKTOP', 'AFTER · DESKTOP', 'BEFORE · MOBILE', 'AFTER · MOBILE']) {
  check(returnPreview.includes(marker), `persistent preview contains ${marker}`)
}
check(!/https?:\/\//i.test(returnPreview), 'persistent preview has no external dependency')

const firstPreviewPath = 'docs/previews/TRIAL-ACTIVATION-BEFORE-CHECKOUT-2026-08-29.html'
check(fs.existsSync(path.join(root, firstPreviewPath)), 'activation-before-checkout preview exists')
const firstPreview = read(firstPreviewPath)
for (const marker of ['BEFORE · DESKTOP', 'AFTER · DESKTOP', 'BEFORE · MOBILE', 'AFTER · MOBILE']) {
  check(firstPreview.includes(marker), 'activation preview contains ' + marker)
}
check(firstPreview.includes('8 zero-use clicks → 0 paid'), 'preview states the measured reason for the change')
check(!/https?:\/\//i.test(firstPreview), 'activation preview has no external dependency')

const precedencePreviewPath = 'docs/previews/TRIAL-BRIDGE-FIRST-SLOT-2026-08-30.html'
check(fs.existsSync(path.join(root, precedencePreviewPath)), 'bridge-precedence comparison exists')
const precedencePreview = read(precedencePreviewPath)
for (const marker of ['Before · Plan Fit reserves the slot', 'After · Already-funded bridge comes first', 'After · Mobile 390px']) {
  check(precedencePreview.includes(marker), `bridge-precedence preview contains ${marker}`)
}
check(!/https?:\/\//i.test(precedencePreview), 'bridge-precedence preview has no external dependency')

console.log(`PASS — ${checks}/${checks} trial balance bridge checks`)
