#!/usr/bin/env node

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const read = (path) => readFileSync(join(root, path), 'utf8').replace(/\r\n/g, '\n')
const requireFromRepo = createRequire(join(root, 'package.json'))
const ts = requireFromRepo('typescript')

let checks = 0
const ok = (value, label) => { assert.ok(value, label); checks += 1 }
const equal = (actual, expected, label) => { assert.deepEqual(actual, expected, label); checks += 1 }

const policySource = read('lib/growth/checkoutSuccessFlow.ts')
const compiled = ts.transpileModule(policySource, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText
const moduleBox = { exports: {} }
new Function('module', 'exports', compiled)(moduleBox, moduleBox.exports)
const policy = moduleBox.exports

const params = (query) => new URLSearchParams(query)

equal(
  policy.AUTOPILOT_CHECKOUT_SUCCESS_VERSION,
  'autopilot_checkout_success_v1',
  'journey version is stable',
)

for (const query of ['', 'tier=starter', 'tier=basic', 'tier=pro', 'tier=AUTOPILOT', 'tier=autopilot_pilot']) {
  equal(
    policy.readCheckoutSuccessFlow(params(query)),
    { kind: 'self_serve', destination: '/generate' },
    `${query || 'empty query'} preserves the self-serve flow`,
  )
}

equal(
  policy.readCheckoutSuccessFlow(params('tier=autopilot&session_id=cs_live_abc123')),
  {
    kind: 'autopilot',
    destination: '/autopilot?success=true&tier=autopilot&session_id=cs_live_abc123',
  },
  'exact Autopilot intent preserves a bounded Stripe Session id',
)

for (const unsafeSession of [
  'not_a_session',
  'cs_live_x%26admin%3D1',
  'cs_live_x&admin=1',
  'cs_live_x/y',
  `cs_live_${'a'.repeat(256)}`,
]) {
  equal(
    policy.readCheckoutSuccessFlow(params(`tier=autopilot&session_id=${encodeURIComponent(unsafeSession)}`)),
    {
      kind: 'autopilot',
      destination: '/autopilot?success=true&tier=autopilot',
    },
    `unsafe Session id is omitted: ${unsafeSession.slice(0, 30)}`,
  )
}

const appUrl = 'https://www.usekineo.com'
equal(
  policy.buildSubscriptionCheckoutSuccessUrl({ appUrl, tier: 'autopilot', currency: 'usd', amount: 29900 }),
  `${appUrl}/checkout/success?success=true&currency=usd&amount=29900&tier=autopilot&session_id={CHECKOUT_SESSION_ID}`,
  'monthly Autopilot carries an explicit bounded intent to the shared success page',
)
for (const [tier, amount] of [['starter', 700], ['basic', 1500], ['pro', 2900], ['unknown', 1500]]) {
  equal(
    policy.buildSubscriptionCheckoutSuccessUrl({ appUrl, tier, currency: 'usd', amount }),
    `${appUrl}/checkout/success?success=true&currency=usd&amount=${amount}&session_id={CHECKOUT_SESSION_ID}`,
    `${tier} keeps the previous self-serve success URL byte-for-byte`,
  )
}

const selfServe = policy.readCheckoutSuccessFlow(params('tier=starter'))
for (const plan of [null, 'free', 'starter', 'basic', 'pro', 'autopilot']) {
  equal(
    policy.readyCheckoutSuccessDestination(selfServe, plan),
    '/generate',
    `self-serve redirect is independent of plan: ${String(plan)}`,
  )
}

const autopilot = policy.readCheckoutSuccessFlow(params('tier=autopilot&session_id=cs_test_ready123'))
for (const plan of [null, '', 'free', 'basic', 'pro', 'autopilot_trial', 'autopilot_pilot', 'AUTOPILOT']) {
  equal(
    policy.readyCheckoutSuccessDestination(autopilot, plan),
    null,
    `editable query cannot authorize Autopilot for plan ${String(plan)}`,
  )
}
equal(
  policy.readyCheckoutSuccessDestination(autopilot, 'autopilot'),
  '/autopilot?success=true&tier=autopilot&session_id=cs_test_ready123',
  'server-confirmed monthly plan unlocks the exact setup destination',
)

const route = read('app/api/stripe/checkout/route.ts')
ok(route.includes("import { buildSubscriptionCheckoutSuccessUrl } from '@/lib/growth/checkoutSuccessFlow'"), 'real checkout imports the policy')
ok(route.includes('success_url: buildSubscriptionCheckoutSuccessUrl({'), 'real subscription Session uses the policy')
ok(route.includes('tier,\n      currency,\n      amount: unitAmount,'), 'real caller passes authoritative tier, currency and amount')
ok(route.includes("if (tier === 'autopilot')"), 'checkout still clamps Autopilot to monthly before Session creation')

const page = read('app/checkout/success/page.tsx')
ok(page.includes('readyCheckoutSuccessDestination(flow, accountPlan)'), 'real page gates navigation on the policy')
ok(!page.includes("router.push('/generate')"), 'page has no unconditional legacy redirect')
ok(page.includes('const [countdown, setCountdown] = useState(15)'), 'existing 15-second decision window remains')
ok(page.includes('if (countdown <= 0) {'), 'navigation is considered only after the same countdown')
ok(page.includes('router.push(destination)'), 'only a policy-approved destination can navigate')
ok(!page.includes('readyToContinue'), 'countdown itself never waits on network or entitlement')
ok(page.includes("const isSelfServe = flow?.kind === 'self_serve'"), 'self-serve presentation has an explicit branch')
ok(page.includes("isSelfServe && topics.length > 0"), 'trending topics render only for self-serve')
ok(page.includes("if (resolved.kind === 'self_serve')"), 'Autopilot never computes the topic deck')
ok(page.includes("plan?: unknown"), 'poll reads the server-side plan')
ok(page.includes("isAutopilotEntitlementReady(data.plan)"), 'poll cannot promote access from the query string')
ok(page.includes("'Your Autopilot plan is active.'"), 'active copy exists')
ok(page.indexOf("'Your Autopilot plan is active.'") > page.indexOf('autopilotReady'), 'active copy is below the server-derived readiness gate')
ok(page.includes("'autopilot_checkout_handoff_pending'"), 'expired countdown has a named non-payment state')
ok(page.includes("'autopilot_checkout_handoff_ready'"), 'server-confirmed handoff has a named state')
ok(page.includes("'autopilot_checkout_handoff_clicked'"), 'manual continuation is measurable')
ok(page.includes('disabled={countdown > 0}'), 'refresh cannot restart the confirmation loop before the initial gate expires')
ok(page.includes("countdown > 0 ? 'Confirming access…' : 'Check access again'"), 'pending CTA names its current action')
ok(page.includes("'checkout_success_viewed'"), 'existing success view remains')
equal((page.match(/gtag\('event', 'conversion'/g) ?? []).length, 1, 'Google purchase pixel remains exactly once')
equal((page.match(/ttq\.track\('Purchase'/g) ?? []).length, 1, 'TikTok purchase pixel remains exactly once')
equal((page.match(/armFirstWinHandshake\(\)/g) ?? []).length, 2, 'existing click and middle-click handshakes remain exactly once each')

for (const eventName of [
  'autopilot_checkout_handoff_pending',
  'autopilot_checkout_handoff_ready',
  'autopilot_checkout_handoff_clicked',
]) {
  const start = page.indexOf(`'${eventName}'`)
  const block = page.slice(start, start + 300)
  for (const forbidden of ['session_id', 'stripe_session_id', 'email', 'url', 'price', 'amount']) {
    ok(!block.includes(forbidden), `${eventName} excludes ${forbidden}`)
  }
}

const preview = read('docs/previews/AUTOPILOT-CHECKOUT-SUCCESS-V1-2026-09-01.html')
for (const label of ['BEFORE · DESKTOP', 'AFTER · DESKTOP', 'BEFORE · MOBILE', 'AFTER · MOBILE']) {
  ok(preview.includes(label), `visual comparison includes ${label}`)
}
ok(preview.includes('Generic topics after a $299 Autopilot checkout'), 'preview names the old contradiction')
ok(preview.includes('Open Autopilot setup'), 'preview shows the corrected terminal CTA')
ok(preview.includes('Confirming access…'), 'mobile preview shows the non-restartable pending state')

console.log(`PASS — ${checks}/${checks} Autopilot checkout-success checks`)
