#!/usr/bin/env node
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'

const read = (file) => fs.readFileSync(file, 'utf8')
let checks = 0
const equal = (actual, expected, label) => { assert.deepEqual(actual, expected, label); checks += 1 }
const check = (value, label) => { assert.ok(value, label); checks += 1 }

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
    Math,
    Number,
  }, { filename: file })
  return moduleBox.exports
}

const costs = executeTs('lib/credits/engineCost.ts')
const policy = executeTs('lib/growth/trialRepeatBeforeCheckout.ts', {
  '@/lib/credits/engineCost': costs,
  '@/lib/expandPolicy': { SUPPORTED_DURATIONS: [35, 60, 90] },
})

const decide = (overrides = {}) => policy.decideTrialRepeatBeforeCheckout({
  trialPhase: 'active',
  credits: 20,
  bridgeEligible: false,
  preferredDuration: 60,
  ...overrides,
})

equal(costs.creditCostForDuration('fast', true, 35), 3, '35s Fast uses canonical trial/paid cost')
equal(costs.creditCostForDuration('fast', true, 60), 5, '60s Fast uses canonical trial/paid cost')
equal(costs.creditCostForDuration('fast', true, 90), 8, '90s Fast uses canonical trial/paid cost')

let result = decide()
equal(result.action, 'episode', 'active balance funds another episode before checkout')
equal(result.duration, 60, 'preferred 60s duration is retained when affordable')
equal(result.cost, 5, 'decision exposes exact canonical cost')
equal(result.creditsAfterSuccess, 15, 'decision exposes honest remaining balance')

result = decide({ credits: 5 })
equal(result.action, 'episode', 'exact 60s boundary remains eligible')
equal(result.duration, 60, 'exact boundary keeps 60s')
equal(result.creditsAfterSuccess, 0, 'exact boundary may finish the trial honestly')

result = decide({ credits: 4 })
equal(result.action, 'episode', 'lower balance steps down instead of selling early')
equal(result.duration, 35, 'largest affordable supported duration is selected')
equal(result.cost, 3, 'stepped-down duration uses canonical cost')

result = decide({ credits: 2 })
equal(result.action, 'subscription', 'no affordable supported Fast duration opens subscription')
equal(result.reason, 'insufficient_balance', 'insufficient balance is named')

equal(decide({ preferredDuration: 35 }).duration, 35, 'policy never lengthens the reviewed duration')
equal(decide({ preferredDuration: 45 }).duration, 35, 'unsupported 45s safely resolves to a real selector duration')
equal(decide({ bridgeEligible: true }).action, 'bridge', 'premium Seedance bridge keeps priority')
equal(decide({ trialPhase: 'ending' }).action, 'subscription', 'ended trial does not promise funded repeat')
equal(decide({ trialPhase: null }).action, 'subscription', 'non-trial result stays on existing offer path')
equal(decide({ credits: null }).reason, 'unknown_balance', 'unknown balance fails closed')
equal(decide({ credits: Number.NaN }).reason, 'unknown_balance', 'NaN balance fails closed')
equal(decide({ credits: -1 }).reason, 'unknown_balance', 'negative balance fails closed')

// Windows worktrees may materialize tracked TSX as CRLF. The contract is the
// executable import and call, not the checkout-specific line-ending setting.
const client = read('app/(dashboard)/generate/GenerateClient.tsx').replace(/\r\n/g, '\n')
check(client.includes("import {\n  decideTrialRepeatBeforeCheckout,"), 'real Generate client imports executable policy')
check(client.includes('const trialRepeatDecision = decideTrialRepeatBeforeCheckout({'), 'real Generate client executes policy')
check(client.includes("trialRepeatDecision.action !== 'episode'"), 'funded repeat takes the recurring slot before Plan Fit')
check(client.includes("trackEvent('trial_repeat_episode_viewed'"), 'funded repeat has a real viewport impression')
check(client.includes("trackEvent('trial_repeat_episode_clicked'"), 'funded repeat has a click outcome')
check(client.includes("trackEvent('trial_repeat_subscription_clicked'"), 'secondary subscription intent is measurable')
check(client.includes("setMode('fast')"), 'funded CTA selects the promised Fast engine')
check(client.includes('setDuration(trialRepeatDecision.duration)'), 'funded CTA selects the policy duration')
check(client.includes('Nothing is spent until you review it and press Generate.'), 'copy states the non-spending handoff')
check(client.includes("router.push('/pricing?intent_campaign=trial_repeat_secondary_v1#plans')"), 'secondary plans link is attributed without creating checkout')
const policySource = read('lib/growth/trialRepeatBeforeCheckout.ts')
// The design comment names /api/compose as the authoritative biller. Absence
// of the string would test prose, not behavior; executable network primitives
// and database imports are the actual side-effect boundary.
check(!policySource.includes('fetch(') && !policySource.includes('axios'), 'pure policy has no network primitive')
check(!policySource.toLowerCase().includes('supabase'), 'pure policy has no database dependency')

const start = client.indexOf('function startNextEpisode(options?: { trialRepeat?: boolean })')
const end = client.indexOf('// KINEO-REGIONAL-PRICING', start)
const handoff = client.slice(start, end)
check(start >= 0 && end > start, 'real episode handoff is found')
check(!handoff.includes('/api/compose'), 'episode handoff never submits a render')
check(!handoff.includes('/api/generate-video'), 'episode handoff never calls a provider')
check(!handoff.includes('debit'), 'episode handoff never debits')

const visualPath = 'docs/previews/TRIAL-REPEAT-BEFORE-CHECKOUT-2026-08-30.html'
check(fs.existsSync(visualPath), 'self-contained before/after comparison exists')
const visual = read(visualPath)
for (const label of ['BEFORE', 'AFTER', 'DESKTOP', 'MOBILE', 'EPISODE 2', '25 CREDITS']) {
  check(visual.includes(label), `visual includes ${label.toLowerCase()}`)
}
check(!/https?:\/\//i.test(visual), 'visual has no external dependency')

console.log(`PASS — ${checks}/${checks} trial repeat before checkout checks`)
