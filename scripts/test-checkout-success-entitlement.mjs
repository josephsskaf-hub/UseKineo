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

const policy = loadTs('lib/growth/checkoutSuccessEntitlement.ts')
equal(
  policy.SELF_SERVE_CHECKOUT_SUCCESS_VERSION,
  'self_serve_checkout_success_entitlement_v1',
  'self-serve entitlement contract is versioned',
)

for (const input of [
  { entitlementsResolved: false, hasPaid: true, plan: 'basic' },
  { entitlementsResolved: null, hasPaid: true, plan: 'basic' },
  { entitlementsResolved: undefined, hasPaid: true, plan: 'basic' },
]) {
  equal(policy.selfServeEntitlementState(input), 'unresolved', 'unresolved entitlement never becomes active')
}

for (const hasPaid of [false, null, undefined]) {
  equal(
    policy.selfServeEntitlementState({ entitlementsResolved: true, hasPaid, plan: 'basic' }),
    'payment_pending',
    'credits or plan cannot replace the paid flag',
  )
}

for (const plan of [null, '', 'free', 'autopilot', 'unknown']) {
  equal(
    policy.selfServeEntitlementState({ entitlementsResolved: true, hasPaid: true, plan }),
    'plan_pending',
    `non-self-serve plan is not ready: ${String(plan)}`,
  )
}

for (const plan of [
  'starter', 'starter_trial',
  'basic', 'basic_trial', 'creator', 'creator_trial',
  'pro', 'pro_trial', 'studio', 'studio_trial',
]) {
  const input = { entitlementsResolved: true, hasPaid: true, plan }
  equal(policy.selfServeEntitlementState(input), 'ready', `paid plan is recognized: ${plan}`)
  equal(policy.isSelfServeEntitlementReady(input), true, `ready helper agrees: ${plan}`)
}

const page = read('app/checkout/success/page.tsx')
ok(page.includes('entitlementsResolved?: unknown'), 'poll reads authoritative entitlement resolution')
ok(page.includes('hasPaid?: unknown'), 'poll reads authoritative payment state')
ok(page.includes('isSelfServeEntitlementReady({'), 'poll uses the executable self-serve policy')
ok(page.includes("selfServeReady && topics.length > 0"), 'topic deck waits for paid entitlement')
ok(page.includes("'Your plan is active.'"), 'active copy remains')
ok(page.indexOf("'Your plan is active.'") > page.indexOf('selfServeReady'), 'active copy is below the paid entitlement gate')
ok(page.includes("'Your checkout is complete. We are confirming secure access.'"), 'pending copy confirms checkout without claiming active access')
ok(page.includes('You do not need to pay again.'), 'delay state prevents a duplicate-payment instruction')
ok(page.includes("'checkout_success_entitlement_ready'"), 'ready state is measurable')
ok(page.includes("'checkout_success_entitlement_delayed'"), 'delayed state is measurable')
ok(page.includes('checkoutReady\n        ? readyCheckoutSuccessDestination'), 'redirect is gated by paid entitlement')
ok(page.includes('selfServeReady ? ('), 'primary Studio link is gated')
ok(page.includes('Open Account status'), 'delayed buyer has a manual status path')
ok(page.includes("countdown > 0 ? 'Confirming access…' : 'Check access again'"), 'delayed buyer can retry after the bounded wait')
equal((page.match(/trackEvent\('checkout_success_viewed'/g) ?? []).length, 1, 'canonical success view remains exactly once')
equal((page.match(/gtag\('event', 'conversion'/g) ?? []).length, 1, 'Google purchase pixel remains exactly once')
equal((page.match(/ttq\.track\('Purchase'/g) ?? []).length, 1, 'TikTok purchase pixel remains exactly once')

for (const eventName of ['checkout_success_entitlement_ready', 'checkout_success_entitlement_delayed']) {
  const start = page.indexOf(`'${eventName}'`)
  const block = page.slice(start, start + 260)
  for (const forbidden of ['session_id', 'stripe_session_id', 'email', 'url', 'price', 'amount', 'credits']) {
    ok(!block.includes(forbidden), `${eventName} excludes ${forbidden}`)
  }
}

const creditsRoute = read('app/api/credits/route.ts')
ok(creditsRoute.includes('hasPaid,'), 'existing account API already returns hasPaid')
ok(creditsRoute.includes('entitlementsResolved,'), 'existing account API already returns entitlement resolution')
ok(creditsRoute.includes('plan: planVal'), 'existing account API already returns the resolved plan')

console.log(`Checkout success entitlement: ${checks}/${checks} checks passed`)
