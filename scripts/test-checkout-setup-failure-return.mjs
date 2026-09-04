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

function loadTs(rel, mocks = {}) {
  const output = ts.transpileModule(source(rel), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
    fileName: join(root, rel),
  }).outputText
  const module = { exports: {} }
  const localRequire = (id) => {
    if (Object.prototype.hasOwnProperty.call(mocks, id)) return mocks[id]
    throw new Error(`${rel} imported unexpected module: ${id}`)
  }
  new Function('require', 'module', 'exports', output)(localRequire, module, module.exports)
  return module.exports
}

let checks = 0
const equal = (actual, expected, message) => { assert.deepEqual(actual, expected, message); checks++ }
const ok = (value, message) => { assert.ok(value, message); checks++ }

const authRedirect = loadTs('lib/authRedirect.ts')
const passwordRecovery = loadTs('lib/growth/checkoutPasswordRecovery.ts', {
  '@/lib/authRedirect': authRedirect,
})
const setupFailure = loadTs('lib/growth/checkoutSetupFailureReturn.ts', {
  '@/lib/growth/checkoutPasswordRecovery': passwordRecovery,
})

equal(
  setupFailure.CHECKOUT_SETUP_FAILURE_RETURN_VERSION,
  'checkout_setup_failure_return_v1',
  'experiment version is stable',
)

const exactTier = '/api/stripe/checkout?tier=pro&billing=annual&promo=PRIVATE50&intro=1&intent_campaign=chatgpt_checkout&pf_engine=seedance&pf_seconds=60'
const tierContext = setupFailure.readCheckoutSetupFailureContext(exactTier)
equal(tierContext, {
  version: 'checkout_setup_failure_return_v1',
  destination: exactTier,
  product_kind: 'subscription',
  selection: 'pro',
  billing: 'annual',
  intent_campaign: 'chatgpt_checkout',
}, 'exact subscription checkout survives with bounded classification')

const returnHref = setupFailure.buildCheckoutSetupFailureReturnHref(exactTier)
const returnUrl = new URL(returnHref, 'https://www.usekineo.com')
equal(returnUrl.pathname, '/pricing', 'failure returns to pricing')
equal(returnUrl.searchParams.get('checkout_retry'), exactTier, 'exact checkout destination survives one encoding layer')
equal(
  returnUrl.searchParams.get('checkout_error'),
  'We could not open secure checkout. Your selection is saved.',
  'return uses one stable, non-provider error message',
)
equal(
  setupFailure.readCheckoutSetupFailureFromSearch(returnUrl.search),
  tierContext,
  'pricing reconstructs the same safe retry context',
)

for (const [destination, selection, kind, billing] of [
  ['/api/stripe/checkout?tier=starter', 'starter', 'subscription', 'monthly'],
  ['/api/stripe/checkout?tier=basic&billing=annual', 'basic', 'subscription', 'annual'],
  ['/api/stripe/checkout?tier=autopilot&billing=annual', 'autopilot', 'subscription', 'monthly'],
  ['/api/stripe/checkout?tier=unknown&billing=weekly', 'basic', 'subscription', 'monthly'],
  ['/api/stripe/checkout?pack=starter', 'starter', 'one_time', null],
  ['/api/stripe/checkout?pack=topup40', 'topup40', 'one_time', null],
  ['/api/stripe/checkout?pack=topup100', 'topup100', 'one_time', null],
  ['/api/stripe/checkout?pack=topup120', 'topup120', 'one_time', null],
  ['/api/stripe/checkout?pack=topup300', 'topup300', 'one_time', null],
  ['/api/stripe/checkout?pack=bulk10', 'bulk10', 'one_time', null],
  ['/api/stripe/checkout?pack=bulk20', 'bulk20', 'one_time', null],
  ['/api/stripe/checkout?pack=bulk30', 'bulk30', 'one_time', null],
  ['/api/stripe/checkout?pack=bulk50', 'bulk50', 'one_time', null],
  ['/api/stripe/checkout?pack=autopilot_pilot', 'autopilot_pilot', 'one_time', null],
  ['/api/stripe/checkout?pack=starter290', 'starter290', 'one_time', null],
  ['/api/stripe/checkout?pack=made_up', 'starter', 'one_time', null],
]) {
  const context = setupFailure.readCheckoutSetupFailureContext(destination)
  equal(context?.selection, selection, `${destination} maps to the product the route sells`)
  equal(context?.product_kind, kind, `${destination} has a bounded product kind`)
  equal(context?.billing, billing, `${destination} has truthful billing`)
  equal(context?.destination, destination, `${destination} keeps exact retry parameters`)
}

for (const invalid of [
  null,
  '',
  'https://evil.example/api/stripe/checkout?tier=pro',
  '//evil.example/api/stripe/checkout?tier=pro',
  '/\\evil.example/api/stripe/checkout?tier=pro',
  '/api/stripe/checkout/extra?tier=pro',
  '/api/paypal/checkout?tier=pro',
  '/api/mercadopago/checkout?tier=pro',
  '/pricing?tier=pro',
]) {
  equal(setupFailure.readCheckoutSetupFailureContext(invalid), null, `fails closed: ${String(invalid)}`)
}

equal(
  setupFailure.readCheckoutSetupFailureFromSearch(`?checkout_retry=${encodeURIComponent(exactTier)}`),
  null,
  'retry without the exact version marker is ignored',
)
equal(
  setupFailure.readCheckoutSetupFailureFromSearch(`?checkout_setup_failure_version=wrong&checkout_retry=${encodeURIComponent(exactTier)}`),
  null,
  'unknown experiment version is ignored',
)

const telemetry = setupFailure.checkoutSetupFailureTelemetry(tierContext)
equal(telemetry, {
  version: 'checkout_setup_failure_return_v1',
  product_kind: 'subscription',
  selection: 'pro',
  billing: 'annual',
  intent_campaign: 'chatgpt_checkout',
}, 'telemetry is categorical')
ok(!('destination' in telemetry), 'telemetry excludes the raw checkout destination')
ok(!JSON.stringify(telemetry).includes('PRIVATE50'), 'telemetry excludes promotion codes')
ok(!JSON.stringify(telemetry).includes('pf_engine'), 'telemetry excludes signed Plan Fit fields')
const storageKey = setupFailure.checkoutSetupFailureStorageKey(tierContext)
ok(!storageKey.includes('PRIVATE50'), 'dedupe key excludes promotion codes')
ok(!storageKey.includes('/api/'), 'dedupe key excludes raw navigation')

const percentParams = new URLSearchParams('?checkout_error=Save%2010%25%20today')
equal(percentParams.get('checkout_error'), 'Save 10% today', 'URLSearchParams performs the single required decode')

const route = source('app/api/stripe/checkout/route.ts')
const outerCatch = route.slice(route.indexOf('// KINEO-CHECKOUT-SETUP-FAILURE-RETURN-V1-2026-09-01'))
ok(outerCatch.includes("stage: 'outer_get'"), 'outer terminal path records its own stage')
ok(outerCatch.includes("reason: 'unexpected_server_error'"), 'outer event uses a bounded reason')
ok(outerCatch.includes('checkoutSetupFailureTelemetry(recovery)'), 'outer event uses bounded helper telemetry')
ok(outerCatch.includes('browserSessionIdFrom(req)'), 'outer event retains browser-session reconciliation')
ok(outerCatch.indexOf("recordCheckoutEvent(") < outerCatch.indexOf('NextResponse.redirect'), 'failure is recorded before returning')
ok(outerCatch.includes('buildCheckoutSetupFailureReturnHref(destination)'), 'server builds the versioned retry return')
ok(!outerCatch.includes('error.message'), 'outer terminal path does not log provider error bodies')
ok(!outerCatch.includes('String(error)'), 'outer terminal path does not stringify provider errors')

// The repository contains both LF and CRLF source files. This assertion guards
// the call order and arguments, not the checkout developer's line-ending
// preference; normalizing here prevents a clean checkout from making the same
// behavior look red on Windows.
const pricing = source('app/pricing/PricingClient.tsx').replace(/\r\n/g, '\n')
ok(!pricing.includes('setCheckoutError(decodeURIComponent(err))'), 'pricing no longer double-decodes checkout errors')
ok(pricing.includes('setCheckoutError(err)'), 'pricing displays the already-decoded error')
ok(pricing.includes('readCheckoutSetupFailureFromSearch(window.location.search)'), 'pricing recognizes only the versioned server return')
ok(pricing.includes("checkout.launch(\n      retryKey,\n      checkoutSetupFailure.destination"), 'retry uses the shared one-click checkout guard')
ok(pricing.includes("'checkout_setup_failure_return_viewed'"), 'visible recovery state has a named denominator')
ok(pricing.includes("'checkout_setup_failure_retry_clicked'"), 'retry click has a named numerator')
ok(pricing.includes('Try secure checkout again'), 'buyer gets a concrete retry action')
ok(pricing.includes('No payment was created.'), 'copy truthfully distinguishes pre-Stripe failure')
ok(pricing.includes('checkoutError && checkoutSetupFailure ?'), 'recovery card only appears for the dedicated terminal state')
ok(pricing.includes(') : checkoutError ? ('), 'legacy provider errors retain their existing text-only state')

const eventsRoute = source('app/api/events/route.ts')
ok(eventsRoute.includes("'checkout_failed'"), 'server failure event remains server-only')
ok(!eventsRoute.includes("'checkout_setup_failure_return_viewed'"), 'client view event is not blocked as server-only')
ok(!eventsRoute.includes("'checkout_setup_failure_retry_clicked'"), 'client click event is not blocked as server-only')

console.log(`checkout setup failure return: ${checks}/${checks} checks passed`)
