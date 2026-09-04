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
  const output = ts.transpileModule(source(rel), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
    fileName: join(root, rel),
  }).outputText
  const module = { exports: {} }
  new Function('require', 'module', 'exports', output)(
    (id) => { throw new Error(`${rel} imported unexpected module: ${id}`) },
    module,
    module.exports,
  )
  return module.exports
}

let checks = 0
const equal = (actual, expected, message) => { assert.deepEqual(actual, expected, message); checks++ }
const ok = (value, message) => { assert.ok(value, message); checks++ }

const policy = loadTs('lib/growth/checkoutResumeUnavailable.ts')

equal(policy.CHECKOUT_RESUME_UNAVAILABLE_VERSION, 'checkout_resume_unavailable_v1', 'version is stable')
const destination = policy.checkoutResumeUnavailablePath()
const destinationUrl = new URL(destination, 'https://www.usekineo.com')
equal(destinationUrl.pathname, '/pricing', 'terminal resume returns to pricing')
equal(destinationUrl.searchParams.get('checkout_resume'), 'unavailable', 'terminal state is explicit')
equal(destinationUrl.searchParams.get('intent_campaign'), 'checkout_resume_unavailable_v1', 'existing plan-click attribution carries the terminal state')
ok(policy.isCheckoutResumeUnavailable(destinationUrl.search), 'exact versioned return is accepted')
equal(policy.isCheckoutResumeUnavailable('?checkout_resume=unavailable'), false, 'unversioned input fails closed')
equal(policy.isCheckoutResumeUnavailable('?checkout_resume=other&intent_campaign=checkout_resume_unavailable_v1'), false, 'unknown state fails closed')
equal(policy.isCheckoutResumeUnavailable('?checkout_resume=unavailable&intent_campaign=other'), false, 'unknown version fails closed')
equal(policy.checkoutResumeUnavailableTelemetry(), {
  version: 'checkout_resume_unavailable_v1',
  surface: 'pricing',
}, 'telemetry is bounded and contains no Stripe or user identifier')
ok(!JSON.stringify(policy.checkoutResumeUnavailableTelemetry()).includes('reason'), 'internal failure reason is not exposed to client telemetry')
ok(policy.checkoutResumeUnavailableStorageKey().includes('checkout_resume_unavailable_v1'), 'dedupe key is version scoped')

const route = source('app/api/stripe/checkout/resume/route.ts')
const unavailable = route.slice(route.indexOf('function unavailableResponse'), route.indexOf('function readSessionId'))
ok(unavailable.includes('checkoutResumeUnavailablePath()'), 'all explicit unavailable paths use the named destination')
ok(!unavailable.includes("new URL('/pricing', req.url)"), 'explicit resume no longer fails into silent generic pricing')
ok(unavailable.includes('NextResponse.json({ available: false, reason }'), 'passive probe retains the bounded server reason')

const pricing = source('app/pricing/PricingClient.tsx')
ok(pricing.includes('isCheckoutResumeUnavailable(window.location.search)'), 'pricing accepts only the versioned terminal state')
ok(pricing.includes('CHECKOUT_RESUME_UNAVAILABLE_COPY.title'), 'buyer sees a named explanation')
ok(pricing.includes('CHECKOUT_RESUME_UNAVAILABLE_COPY.body'), 'buyer sees what to do next')
ok(pricing.includes("'checkout_resume_unavailable_viewed'"), 'visible state has a named denominator')
ok(pricing.includes('checkoutResumeUnavailableStorageKey()'), 'view event is navigation-deduped')
ok(pricing.includes('<PricingSavedCheckout />') && pricing.includes('<PricingJourneyProof'), 'terminal explanation stays inside the live pricing decision area')

const eventsRoute = source('app/api/events/route.ts')
ok(!eventsRoute.includes("'checkout_resume_unavailable_viewed'"), 'client view event is not incorrectly blocked as server-only')

console.log(`checkout resume unavailable: ${checks}/${checks} checks passed`)
