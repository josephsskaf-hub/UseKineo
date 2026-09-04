#!/usr/bin/env node
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const read = (rel) => readFileSync(join(root, rel), 'utf8').replace(/\r\n/g, '\n')
const requireFromRepo = createRequire(join(root, 'package.json'))
const ts = requireFromRepo('typescript')

function loadTs(rel) {
  const output = ts.transpileModule(read(rel), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    fileName: join(root, rel),
  }).outputText
  const module = { exports: {} }
  new Function('require', 'module', 'exports', output)(
    (id) => { throw new Error(`unexpected import: ${id}`) },
    module,
    module.exports,
  )
  return module.exports
}

let checks = 0
const equal = (actual, expected, message) => {
  assert.deepEqual(actual, expected, message)
  checks++
}
const ok = (value, message) => {
  assert.ok(value, message)
  checks++
}

const policy = loadTs('lib/growth/lowBalancePricingBridge.ts')
equal(policy.LOW_BALANCE_PRICING_BRIDGE_VERSION, 'low_balance_pricing_bridge_v1', 'contract is versioned')

for (const credits of [1, 2, 3, 4, 5]) {
  equal(
    policy.lowBalancePricingBridgeState({ credits, entitlementsResolved: true, plan: 'free', trialActive: false }),
    'eligible',
    `${credits} credits opens the non-subscriber bridge`,
  )
}

for (const credits of [null, undefined, Number.NaN, -1, 0, 6, 25]) {
  equal(
    policy.lowBalancePricingBridgeState({ credits, entitlementsResolved: true, plan: 'free', trialActive: false }),
    'outside_balance_window',
    `${String(credits)} does not enter the one-to-five bridge`,
  )
}

for (const resolved of [false, null, undefined]) {
  equal(
    policy.lowBalancePricingBridgeState({ credits: 3, entitlementsResolved: resolved, plan: 'free', trialActive: false }),
    'unresolved',
    'unknown entitlement state fails closed',
  )
}

equal(
  policy.lowBalancePricingBridgeState({ credits: 3, entitlementsResolved: true, plan: 'free', trialActive: true }),
  'trial_active',
  'active trial keeps its existing trial CTA',
)

for (const plan of [
  'starter', 'starter_trial',
  'basic', 'basic_trial', 'creator', 'creator_trial',
  'pro', 'pro_trial', 'studio', 'studio_trial',
  'autopilot', 'autopilot_trial', 'autopilot_pilot',
]) {
  equal(
    policy.lowBalancePricingBridgeState({ credits: 3, entitlementsResolved: true, plan, trialActive: false }),
    'subscriber',
    `subscriber is never sent to buy a duplicate plan: ${plan}`,
  )
}

equal(
  policy.lowBalancePricingBridgeState({ credits: 3, entitlementsResolved: true, plan: ' FREE ', trialActive: false }),
  'eligible',
  'plan normalization preserves free and pack buyers',
)

equal(
  policy.lowBalancePricingBridgeMetadata('topbar_credit_chip'),
  {
    version: 'low_balance_pricing_bridge_v1',
    surface: 'topbar_credit_chip',
    balance_bucket: 'one_to_five',
    destination: 'pricing',
  },
  'telemetry is closed and contains no exact balance',
)

const topbar = read('components/TopBar.tsx')
ok(topbar.includes('setEntitlementsResolved(data.entitlementsResolved === true)'), 'TopBar reads resolved entitlement truth')
ok(topbar.includes('setTrialActive(data.trialActive === true)'), 'TopBar reads active-trial truth')
ok(topbar.includes("setPlan(typeof data.plan === 'string' ? data.plan : null)"), 'TopBar reads current plan')
ok(topbar.includes("const opensPricing = isZero || lowBalanceBridgeEligible"), 'zero path stays and low bridge joins it')
ok(topbar.includes("'low_balance_pricing_bridge_viewed'"), 'human view event exists')
ok(topbar.includes("'low_balance_pricing_bridge_clicked'"), 'click event exists')
ok(topbar.includes('entry.intersectionRatio < 0.6'), 'view requires 60 percent visibility')
ok(topbar.includes('document.visibilityState !== \'visible\''), 'background tabs do not count')
ok(topbar.includes('}, 1_000)'), 'view requires one second dwell')
ok(topbar.includes('minWidth: 44'), 'tap target remains at least 44px')
ok(topbar.includes("href=\"/pricing\""), 'destination remains the existing pricing page')

for (const eventName of ['low_balance_pricing_bridge_viewed', 'low_balance_pricing_bridge_clicked']) {
  const start = topbar.indexOf(`'${eventName}'`)
  const block = topbar.slice(start, start + 260)
  for (const forbidden of ['email', 'user_id', 'credits:', 'exact_balance', 'url', 'price', 'amount']) {
    ok(!block.includes(forbidden), `${eventName} excludes ${forbidden}`)
  }
}

console.log(`Low-balance pricing bridge: ${checks}/${checks} checks passed`)
