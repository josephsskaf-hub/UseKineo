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
  }, { filename: file })
  return moduleBox.exports
}

const engineCost = executeTs('lib/credits/engineCost.ts')
const policy = executeTs('lib/growth/trialBalanceBridge.ts', {
  '@/lib/credits/engineCost': engineCost,
})

equal(policy.TRIAL_BALANCE_BRIDGE_COST, 15, '35s Seedance costs 15 canonical credits')
equal(policy.FULL_SEEDANCE_COST, 25, '60s Seedance costs 25 canonical credits')
equal(policy.TRIAL_BALANCE_BRIDGE_DURATION, 35, 'bridge duration is explicit and visible in the public selector')
equal(policy.TRIAL_BALANCE_BRIDGE_ENGINE, 'cinematic_ai', 'bridge engine is Seedance quality')
check(read('lib/expandPolicy.ts').includes('SUPPORTED_DURATIONS = [35, 60, 90]'), '35s is supported by the shared client/server duration contract')

for (const credits of [15, 20, 21, 22, 23, 24]) {
  const result = policy.decideTrialBalanceBridge({ trialPhase: 'active', credits, deliveredQuality: 'fast' })
  equal(result.eligible, true, `${credits} residual credits are eligible`)
  equal(result.creditsAfterSuccess, credits - 15, `${credits} exposes exact post-success balance`)
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

console.log(`PASS — ${checks}/${checks} trial balance bridge checks`)
