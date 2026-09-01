#!/usr/bin/env node
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const requireFromRepo = createRequire(join(root, 'package.json'))
const ts = requireFromRepo('typescript')

function source(rel) {
  return readFileSync(join(root, rel), 'utf8')
}

function loadTs(rel) {
  const filename = join(root, rel)
  const output = ts.transpileModule(source(rel), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
    fileName: filename,
  }).outputText
  const module = { exports: {} }
  new Function('require', 'module', 'exports', output)(
    (id) => { throw new Error(`${rel} imported unexpected module: ${id}`) },
    module,
    module.exports,
  )
  return module.exports
}

const policy = loadTs('lib/growth/autopilotBreakEven.ts')
let checks = 0
const equal = (actual, expected, message) => { assert.deepEqual(actual, expected, message); checks++ }
const ok = (value, message) => { assert.ok(value, message); checks++ }

equal(policy.AUTOPILOT_BREAK_EVEN_VERSION, 'autopilot_break_even_v1', 'experiment version is stable')

equal(policy.calculateAutopilotBreakEven({
  grossProfitMinor: 15_000,
  pilotPriceMinor: 9_900,
  monthlyPriceMinor: 29_900,
}), {
  grossProfitMinor: 15_000,
  pilotCustomers: 1,
  monthlyCustomers: 2,
}, '$150 gross profit gives one pilot customer and two monthly customers')

equal(policy.calculateAutopilotBreakEven({
  grossProfitMinor: 5_000,
  pilotPriceMinor: 9_900,
  monthlyPriceMinor: 29_900,
}), {
  grossProfitMinor: 5_000,
  pilotCustomers: 2,
  monthlyCustomers: 6,
}, 'break-even always rounds up to a whole customer')

equal(policy.calculateAutopilotBreakEven({ grossProfitMinor: 0, pilotPriceMinor: 9_900, monthlyPriceMinor: 29_900 }), null, 'zero profit fails closed')
equal(policy.calculateAutopilotBreakEven({ grossProfitMinor: -1, pilotPriceMinor: 9_900, monthlyPriceMinor: 29_900 }), null, 'negative profit fails closed')
equal(policy.calculateAutopilotBreakEven({ grossProfitMinor: Number.NaN, pilotPriceMinor: 9_900, monthlyPriceMinor: 29_900 }), null, 'NaN fails closed')
equal(policy.calculateAutopilotBreakEven({ grossProfitMinor: 15_000, pilotPriceMinor: 0, monthlyPriceMinor: 29_900 }), null, 'invalid pilot price cannot invent a result')
equal(policy.calculateAutopilotBreakEven({ grossProfitMinor: 15_000, pilotPriceMinor: 9_900, monthlyPriceMinor: 0 }), null, 'invalid monthly price cannot invent a result')
equal(policy.calculateAutopilotBreakEven({ grossProfitMinor: 100_000_001, pilotPriceMinor: 9_900, monthlyPriceMinor: 29_900 }), null, 'unbounded input fails closed')

for (const [minor, expected] of [
  [1, 'under_50'],
  [4_999, 'under_50'],
  [5_000, '50_149'],
  [14_999, '50_149'],
  [15_000, '150_499'],
  [49_999, '150_499'],
  [50_000, '500_999'],
  [99_999, '500_999'],
  [100_000, '1000_plus'],
]) equal(policy.autopilotProfitBand(minor), expected, `profit ${minor} maps to ${expected}`)

for (const [count, expected] of [
  [1, 'one'],
  [2, 'two'],
  [3, 'three_to_five'],
  [5, 'three_to_five'],
  [6, 'six_to_ten'],
  [10, 'six_to_ten'],
  [11, 'eleven_plus'],
]) equal(policy.autopilotCustomerCountBucket(count), expected, `count ${count} maps to ${expected}`)

const pricing = source('app/pricing/PricingClient.tsx')
const component = source('app/pricing/AutopilotBreakEvenCalculator.tsx')
const checkout = source('lib/checkoutPricing.ts')

ok(pricing.includes("import AutopilotBreakEvenCalculator from './AutopilotBreakEvenCalculator'"), 'pricing imports the real calculator')
ok(pricing.includes('<AutopilotBreakEvenCalculator'), 'Autopilot card calls the calculator')
ok(pricing.includes("onStartMonthly={() => handleBuy('autopilot')}"), 'monthly result reuses canonical checkout launcher')
ok(pricing.includes('onStartPilot={handleBuyAutopilotPilot}'), 'pilot result reuses canonical one-time launcher')
ok(component.includes('AUTOPILOT_PILOT_PRICES[currency]'), 'pilot arithmetic uses canonical checkout price')
ok(component.includes('AUTOPILOT_PRICES[currency]'), 'monthly arithmetic uses canonical checkout price')
ok(component.includes("trackEvent('autopilot_break_even_viewed'"), 'exposure has a named event')
ok(component.includes("trackEvent('autopilot_break_even_calculated'"), 'calculation has a named event')
ok(component.includes("trackEvent('autopilot_break_even_checkout_clicked'"), 'calculator checkout intent has a named event')
ok(component.includes('profit_band:'), 'telemetry sends a bounded profit band')
ok(!component.includes('gross_profit_minor:'), 'telemetry does not send the exact profit value')
ok(component.includes('This is arithmetic, not a forecast'), 'calculator refuses a revenue promise')
ok(component.includes('Count only a customer you can actually attribute'), 'calculator states the attribution boundary')
ok(checkout.includes('usd: 29900'), 'monthly source remains the canonical $299 price')
ok(checkout.includes('usd: 9900'), 'pilot source remains the canonical $99 price')

console.log(`autopilot break-even: ${checks}/${checks} checks passed`)
