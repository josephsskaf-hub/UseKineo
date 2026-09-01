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
const handoff = loadTs('lib/growth/checkoutOAuthFailureHandoff.ts', {
  '@/lib/growth/checkoutPasswordRecovery': passwordRecovery,
})

equal(
  handoff.CHECKOUT_OAUTH_FAILURE_HANDOFF_VERSION,
  'checkout_oauth_failure_handoff_v1',
  'experiment version is stable',
)

const exactDestination = '/api/stripe/checkout?tier=pro&billing=annual&promo=PRIVATE50&intent_campaign=chatgpt_checkout'
const stripe = handoff.buildCheckoutOAuthFailureHandoff(exactDestination)
const stripeLogin = new URL(stripe.loginPath, 'https://www.usekineo.com')
equal(stripeLogin.pathname, '/login', 'checkout failure returns to login')
equal(stripeLogin.searchParams.get('error'), 'oauth_failed', 'existing OAuth error marker survives')
equal(stripeLogin.searchParams.get('reason'), 'checkout', 'login receives checkout context')
equal(stripeLogin.searchParams.get('redirect'), exactDestination, 'exact checkout destination survives')
equal(stripe.telemetry, {
  version: 'checkout_oauth_failure_handoff_v1',
  is_checkout_destination: true,
  checkout_provider: 'stripe',
  tier: 'pro',
  billing: 'annual',
  intent_campaign: 'chatgpt_checkout',
}, 'telemetry contains only bounded checkout categories')
ok(!JSON.stringify(stripe.telemetry).includes('PRIVATE50'), 'promo never enters telemetry')
// `is_checkout_destination` is an intentional boolean category, not a raw
// destination. Exclude that exact key before looking for unsafe free-form data.
ok(
  !Object.keys(stripe.telemetry)
    .filter((key) => key !== 'is_checkout_destination')
    .some((key) => /redirect|destination|url|code|error|token/i.test(key)),
  'telemetry has no raw navigation or credential field',
)

for (const [provider, destination] of [
  ['stripe', '/api/stripe/checkout?tier=starter&billing=monthly'],
  ['paypal', '/api/paypal/checkout?tier=basic&billing=annual'],
  ['mercadopago', '/api/mercadopago/checkout?tier=creator&billing=monthly'],
]) {
  const result = handoff.buildCheckoutOAuthFailureHandoff(destination)
  equal(result.telemetry.checkout_provider, provider, `${provider} is classified`)
  equal(result.telemetry.is_checkout_destination, true, `${provider} resumes checkout`)
  equal(new URL(result.loginPath, 'https://www.usekineo.com').searchParams.get('redirect'), destination, `${provider} keeps the exact destination`)
}

for (const invalid of [
  null,
  '',
  '/',
  '/pricing?tier=pro',
  '/api/stripe/checkout/extra?tier=pro',
  'https://evil.example/api/stripe/checkout?tier=pro',
  '//evil.example/api/stripe/checkout?tier=pro',
  '/\\evil.example/api/stripe/checkout?tier=pro',
  'javascript:alert(1)',
]) {
  const result = handoff.buildCheckoutOAuthFailureHandoff(invalid)
  equal(result.loginPath, '/login?error=oauth_failed', `legacy fallback remains for ${String(invalid)}`)
  equal(result.telemetry.is_checkout_destination, false, `invalid destination is not checkout: ${String(invalid)}`)
  equal(result.telemetry.checkout_provider, null, `invalid destination exposes no provider: ${String(invalid)}`)
}

const invalidCategories = handoff.buildCheckoutOAuthFailureHandoff(
  '/api/stripe/checkout?tier=enterprise&billing=weekly&intent_campaign=<free form>',
)
equal(invalidCategories.telemetry.is_checkout_destination, true, 'valid checkout path still resumes')
equal(invalidCategories.telemetry.tier, null, 'unknown tier fails closed in telemetry')
equal(invalidCategories.telemetry.billing, null, 'unknown billing fails closed in telemetry')
equal(invalidCategories.telemetry.intent_campaign, null, 'free-form campaign fails closed in telemetry')

const route = source('app/auth/callback/route.ts')
const buildIndex = route.indexOf('buildCheckoutOAuthFailureHandoff(rawNext)')
const exchangeIndex = route.indexOf('exchangeCodeForSession(code)')
const failureEventIndex = route.indexOf("name: 'auth_callback_failed'")
const failureRedirectIndex = route.indexOf('NextResponse.redirect(new URL(failureHandoff.loginPath, origin))')
ok(buildIndex > 0 && buildIndex < exchangeIndex, 'failure handoff is resolved before the provider exchange')
ok(exchangeIndex < failureEventIndex, 'successful callback returns before failure telemetry')
ok(failureEventIndex < failureRedirectIndex, 'failure is recorded before redirecting')
ok(route.includes('...failureHandoff.telemetry'), 'route writes the bounded telemetry object')
ok(route.includes('had_code: Boolean(code)'), 'existing diagnostic signal remains')
ok(!route.includes("provider: failureHandoff"), 'checkout provider cannot overwrite OAuth provider semantics')
ok(!route.includes("return NextResponse.redirect(`${origin}/login?error=oauth_failed`)"), 'legacy hardcoded redirect is no longer the terminal path')
ok(!route.includes("searchParams.get('error')"), 'provider error detail is never read into application telemetry')

console.log(`checkout OAuth failure handoff: ${checks}/${checks} checks passed`)
