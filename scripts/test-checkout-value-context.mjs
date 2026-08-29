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
    Math,
  }, { filename: file })
  return moduleBox.exports
}

const engineCost = executeTs('lib/credits/engineCost.ts')
const bridge = executeTs('lib/growth/trialBalanceBridge.ts', {
  '@/lib/credits/engineCost': engineCost,
})
const policy = executeTs('lib/growth/checkoutValueContext.ts', {
  '@/lib/growth/trialBalanceBridge': bridge,
  '@/lib/credits/engineCost': engineCost,
})

equal(policy.CHECKOUT_VALUE_CONTEXT_VERSION, 'checkout_value_context_v2', 'experiment has a stable version')

const creatorBridge = policy.buildCheckoutValueContext({
  billing: 'monthly',
  credits: 90,
  intentCampaign: bridge.TRIAL_BALANCE_BRIDGE_VERSION,
  tier: 'basic',
})
equal(creatorBridge.variant, 'trial_balance_seedance', 'Creator bridge is personalized')
equal(creatorBridge.outputCount, 6, 'Creator translates 90 credits into six canonical 15-credit films')
check(creatorBridge.lineItemDescription.includes('up to 6 Seedance 35s films'), 'Creator names the tangible output')
check(creatorBridge.lineItemDescription.includes('(15 credits each)'), 'Creator exposes the per-film cost')
check(creatorBridge.lineItemDescription.includes('watermark-free'), 'paid ownership benefit remains visible')

const studioBridge = policy.buildCheckoutValueContext({
  billing: 'monthly',
  credits: 180,
  intentCampaign: bridge.TRIAL_BALANCE_BRIDGE_VERSION,
  tier: 'pro',
})
equal(studioBridge.outputCount, 12, 'Studio translates its canonical grant into twelve films')
check(studioBridge.lineItemDescription.includes('180 credits / month'), 'Studio uses the runtime grant')

for (const [input, label] of [
  [{ billing: 'monthly', credits: 400, intentCampaign: bridge.TRIAL_BALANCE_BRIDGE_VERSION, tier: 'autopilot' }, 'Autopilot keeps its done-for-you description'],
  [{ billing: 'annual', credits: 90, intentCampaign: bridge.TRIAL_BALANCE_BRIDGE_VERSION, tier: 'basic' }, 'annual checkout does not imply a monthly annual grant'],
]) {
  const result = policy.buildCheckoutValueContext(input)
  equal(result.variant, 'standard_result_count', label)
  equal(result.lineItemDescription, null, `${label}: line-item copy is untouched`)
  equal(result.outputCount, null, `${label}: no invented output count`)
}

const starter = policy.buildCheckoutValueContext({ billing: 'monthly', credits: 40, intentCampaign: undefined, tier: 'starter' })
equal(starter.variant, 'standard_result_count', 'ordinary Starter receives result-count copy')
equal(starter.outputCount, 8, 'Starter derives eight Fast Shorts from canonical 5-credit cost')
check(starter.lineItemDescription.includes('up to 8 ready-to-post Fast Shorts'), 'Starter names the output')
check(starter.lineItemDescription.includes('AI voiceover, captions and no watermark'), 'Starter names the finished-video benefits')

const creator = policy.buildCheckoutValueContext({ billing: 'monthly', credits: 90, intentCampaign: 'unrelated', tier: 'basic' })
equal(creator.variant, 'standard_result_count', 'ordinary Creator receives result-count copy')
equal(creator.outputCount, 3, 'Creator derives three Seedance films from canonical 25-credit cost')
check(creator.lineItemDescription.includes('up to 3 Seedance 60s AI films'), 'Creator names engine, count and duration')

const studio = policy.buildCheckoutValueContext({ billing: 'monthly', credits: 180, intentCampaign: undefined, tier: 'pro' })
equal(studio.outputCount, 1, 'Studio derives one Kling 3 film from canonical 150-credit cost')
check(studio.lineItemDescription.includes('1 Kling 3 60s film plus up to 6 Fast Shorts'), 'Studio translates its remainder into usable outputs')

equal(
  creatorBridge.submitMessage,
  'Credits are added after payment succeeds. Renews monthly at the price shown. Cancel anytime from Account. 7-day money-back guarantee.',
  'monthly settlement, renewal, cancellation and guarantee are explicit',
)
const annual = policy.buildCheckoutValueContext({ billing: 'annual', credits: 90, intentCampaign: undefined, tier: 'basic' })
check(annual.submitMessage.includes('Renews yearly at the price shown.'), 'annual checkout says yearly, not monthly')
check(!creatorBridge.submitMessage.includes('one click'), 'checkout does not make an unverified click-count promise')
check(creatorBridge.submitMessage.length <= 500, 'Stripe custom text stays under its documented limit')
check(creatorBridge.lineItemDescription.length <= 500, 'Stripe product description stays under its documented limit')

const policySource = read('lib/growth/checkoutValueContext.ts')
check(!policySource.includes('/api/'), 'policy cannot create a checkout or mutate data')
check(!/\$\d/.test(policySource), 'policy contains no copied commercial price')
check(policySource.includes('TRIAL_BALANCE_BRIDGE_COST'), 'output math imports the canonical per-film cost')
check(policySource.includes('TRIAL_BALANCE_BRIDGE_DURATION'), 'output label imports the canonical duration')
check(policySource.includes("creditCostForDuration('fast', true, 60)"), 'standard Fast count uses the canonical engine-cost function')
check(policySource.includes("creditCostForDuration('cinematic_ai', true, 60)"), 'standard Seedance count uses the canonical engine-cost function')
check(policySource.includes("creditCostForDuration('cinematic_hollywood', true, 60)"), 'standard Kling count uses the canonical engine-cost function')

const route = read('app/api/stripe/checkout/route.ts')
check(route.includes("import { buildCheckoutValueContext } from '@/lib/growth/checkoutValueContext'"), 'live route imports the executable policy')
check(route.includes('const checkoutValueContext = buildCheckoutValueContext({'), 'live route executes the policy')
check(route.includes(': checkoutValueContext.lineItemDescription ?? plan.description'), 'campaign description reaches the Stripe line item')
check(route.includes('message: checkoutValueContext.submitMessage'), 'settlement copy reaches Stripe custom text')
check((route.match(/checkout_value_context: checkoutValueContext\.version/g) ?? []).length >= 3, 'version reaches event, Session and Subscription metadata')
check(route.includes('checkout_value_variant: checkoutValueContext.variant'), 'variant is attributable')
check(route.includes('line_items: sessionParams.line_items'), 'idempotency signature covers displayed product copy')
check(route.includes('custom_text: sessionParams.custom_text'), 'idempotency signature covers submit copy')
check(route.includes('version: 6'), 'subscription idempotency payload is versioned after parameter change')
check(route.includes('kineo-sub-v5:'), 'subscription idempotency namespace is advanced')
const executableRoute = route.replace(/\/\/.*$/gm, '')
check(!/\bpayment_method_types\s*:/.test(executableRoute), 'dynamic payment methods stay enabled')

const webhook = read('app/api/stripe/webhook/route.ts')
for (const field of ['intent_campaign', 'checkout_value_context', 'checkout_value_variant', 'checkout_value_output_count']) {
  check(webhook.includes(`${field}: session.metadata?.${field} ?? null`), `payment_success copies ${field}`)
}

const previewPath = 'docs/previews/CHECKOUT-VALUE-CONTEXT-2026-08-29.html'
check(fs.existsSync(path.join(root, previewPath)), 'before/after preview exists')
const preview = read(previewPath)
for (const marker of ['BEFORE · DESKTOP', 'AFTER · DESKTOP', 'BEFORE · MOBILE', 'AFTER · MOBILE', 'MEASUREMENT']) {
  check(preview.includes(marker), `preview contains ${marker}`)
}
check(!/https?:\/\//i.test(preview), 'preview has no external dependency')

console.log(`PASS — ${checks}/${checks} checkout value-context checks`)
