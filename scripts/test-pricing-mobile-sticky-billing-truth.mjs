#!/usr/bin/env node
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const requireFromRepo = createRequire(join(root, 'package.json'))
const ts = requireFromRepo('typescript')
const read = (rel) => readFileSync(join(root, rel), 'utf8')

function loadTs(rel) {
  const output = ts.transpileModule(read(rel), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText
  const mod = { exports: {} }
  new Function('require', 'module', 'exports', output)(
    (id) => { throw new Error(`${rel} imported unexpected module: ${id}`) },
    mod,
    mod.exports,
  )
  return mod.exports
}

const policy = loadTs('lib/growth/mobileStickyBillingTruth.ts')
let checks = 0
const equal = (actual, expected, label) => { assert.deepEqual(actual, expected, label); checks += 1 }
const ok = (value, label) => { assert.ok(value, label); checks += 1 }

equal(policy.MOBILE_STICKY_BILLING_TRUTH_VERSION, 'pricing_mobile_sticky_billing_truth_v1', 'version is stable')

const names = { starter: 'Starter', basic: 'Creator', pro: 'Studio' }
const monthly = { starter: '$7', basic: '$15', pro: '$29' }
const annual = { starter: '$70', basic: '$150', pro: '$290' }
for (const tier of ['starter', 'basic', 'pro']) {
  const flame = tier === 'basic' ? ' 🔥' : ''
  equal(policy.mobileStickyPlanLabel({ tier, billing: 'monthly', monthlyLabel: monthly[tier], annualTotalLabel: annual[tier] }), `${names[tier]} ${monthly[tier]}${flame}`, `${tier} monthly label stays unchanged`)
  equal(policy.mobileStickyPlanLabel({ tier, billing: 'annual', monthlyLabel: monthly[tier], annualTotalLabel: annual[tier] }), `${names[tier]} ${annual[tier]}/yr${flame}`, `${tier} annual label shows the billed total`)
}

equal(policy.mobileStickyExposureKey('monthly'), 'kineo:pricing_mobile_sticky_billing_truth_v1:viewed:monthly', 'monthly exposure has its own dedupe key')
equal(policy.mobileStickyExposureKey('annual'), 'kineo:pricing_mobile_sticky_billing_truth_v1:viewed:annual', 'annual exposure has its own dedupe key')
equal(policy.mobileStickyTelemetry({ billing: 'annual' }), { version: 'pricing_mobile_sticky_billing_truth_v1', placement: 'mobile_sticky', billing: 'annual' }, 'view telemetry is categorical')
equal(policy.mobileStickyTelemetry({ billing: 'monthly', tier: 'basic' }), { version: 'pricing_mobile_sticky_billing_truth_v1', placement: 'mobile_sticky', billing: 'monthly', tier: 'basic' }, 'click telemetry adds only the selected tier')

const pricing = read('app/pricing/PricingClient.tsx')
const stickyStart = pricing.indexOf('{showStickyCta && (')
const stickyEnd = pricing.indexOf('{/* ───────── Footer', stickyStart)
const sticky = pricing.slice(stickyStart, stickyEnd)
ok(stickyStart >= 0 && stickyEnd > stickyStart, 'real mobile sticky caller is found')
ok(sticky.includes('ref={mobileStickyRef}'), 'visibility observer is attached to the rendered bar')
ok(sticky.includes("handleBuy('starter', 'mobile_sticky')"), 'Starter click identifies the sticky placement')
ok(sticky.includes("handleBuy('basic', 'mobile_sticky')"), 'Creator click identifies the sticky placement')
ok(sticky.includes("handleBuy('pro', 'mobile_sticky')"), 'Studio click identifies the sticky placement')
for (const tier of ['starter', 'basic', 'pro']) {
  ok(sticky.includes(`annualTotalLabel: annualPrices.${tier}.total`), `${tier} annual label uses the canonical annual total`)
}
ok(pricing.includes("placement: 'card' | 'mobile_sticky' = 'card'"), 'existing card callers keep their default placement')
ok(pricing.includes("trackEvent('pricing_mobile_sticky_billing_viewed'"), 'actual mobile visibility is measured')
ok(pricing.includes("'pricing_mobile_sticky_checkout_clicked'"), 'accepted sticky checkout clicks are measured')
ok(pricing.indexOf("if (!started) return") < pricing.indexOf("'pricing_mobile_sticky_checkout_clicked'"), 'suppressed duplicate launches cannot emit a click')
ok(pricing.includes('entry.intersectionRatio < 0.6'), 'hidden desktop markup cannot count as a mobile exposure')
ok(pricing.includes('sessionStorage.getItem(storageKey)'), 'view telemetry is deduped by session and billing')
const telemetryKeys = Object.keys(policy.mobileStickyTelemetry({ billing: 'annual', tier: 'pro' })).sort()
equal(telemetryKeys, ['billing', 'placement', 'tier', 'version'], 'telemetry emits only categorical, non-identity keys')

const checkoutPricing = read('lib/checkoutPricing.ts')
ok(checkoutPricing.includes("starter: { usd: 7000 }"), 'Starter annual total remains canonical')
ok(checkoutPricing.includes("basic: { usd: 15000 }"), 'Creator annual total remains canonical')
ok(checkoutPricing.includes("pro: { usd: 29000 }"), 'Studio annual total remains canonical')

console.log(`pricing mobile sticky billing truth: ${checks}/${checks} checks passed`)
