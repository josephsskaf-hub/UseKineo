import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import ts from 'typescript'

const root = process.cwd()
const sourcePath = join(root, 'lib/growth/checkoutResumeDeliveryGuard.ts')
const source = readFileSync(sourcePath, 'utf8')
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 },
}).outputText
const moduleUrl = `data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`
const policy = await import(moduleUrl)
const banner = readFileSync(join(root, 'components/CheckoutResumeBanner.tsx'), 'utf8')

let passed = 0
function check(condition, message) {
  assert.ok(condition, message)
  passed += 1
}
function equal(actual, expected, message) {
  assert.equal(actual, expected, message)
  passed += 1
}

equal(policy.readCheckoutResumeDeliveryProbe(null).state, 'clear', 'null fails open')
equal(policy.readCheckoutResumeDeliveryProbe({ state: 'none' }).state, 'clear', 'none is clear')
equal(policy.readCheckoutResumeDeliveryProbe({ state: 'completed' }).state, 'clear', 'completed is clear')
equal(policy.readCheckoutResumeDeliveryProbe({ state: 'failed' }).state, 'clear', 'failed is clear')
equal(policy.readCheckoutResumeDeliveryProbe({ state: 'rendering' }).state, 'rendering', 'rendering suppresses')
equal(policy.readCheckoutResumeDeliveryProbe({ state: 'rendering', resumable: true, render_id: null }).resumable, false, 'missing render id is not resumable')
equal(policy.readCheckoutResumeDeliveryProbe({ state: 'rendering', resumable: true, render_id: 'rid' }).resumable, true, 'real resumable render is classified')
equal(policy.nextCheckoutResumeDeliveryDelay({ state: 'rendering', idleChecks: 9, wasRendering: true }), 15_000, 'rendering keeps polling')
equal(policy.nextCheckoutResumeDeliveryDelay({ state: 'clear', idleChecks: 1, wasRendering: false }), 15_000, 'first idle response is rechecked')
equal(policy.nextCheckoutResumeDeliveryDelay({ state: 'clear', idleChecks: 2, wasRendering: false }), null, 'idle polling is bounded')
equal(policy.nextCheckoutResumeDeliveryDelay({ state: 'clear', idleChecks: 1, wasRendering: true }), null, 'terminal render releases banner without extra polling')
check(banner.includes("fetch('/api/compose/active'"), 'live banner calls the owner-scoped active-render probe')
check(banner.includes("trackEvent('checkout_resume_suppressed_active_render'"), 'suppression has a person-level measurement')
check(banner.includes('deliverySuppressedKey.current = null'), 'a later render can earn a new suppression measurement')
check(banner.includes("deliveryState !== 'clear'"), 'banner and human denominator both fail closed while delivery is active')
check(banner.includes("credentials: 'same-origin'"), 'active probe keeps owner authentication')
check(!banner.includes('render_id: result'), 'telemetry never emits the provider or render identifier')

console.log(`PASS — ${passed}/${passed} checkout-resume delivery-guard checks`)
