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
  const localRequire = (id) => {
    if (Object.prototype.hasOwnProperty.call(mocks, id)) return mocks[id]
    throw new Error(`${rel} imported unexpected module: ${id}`)
  }
  new Function('require', 'module', 'exports', output)(localRequire, module, module.exports)
  return module.exports
}

const authRedirect = loadTs('lib/authRedirect.ts')
const engine = loadTs('lib/credits/engineCost.ts')
const autopilot = loadTs('lib/autopilot/config.ts', { '@/lib/credits/engineCost': engine })
const checkout = loadTs('lib/checkoutPricing.ts', {
  '@/lib/credits/engineCost': engine,
  '@/lib/autopilot/config': autopilot,
})
const context = loadTs('lib/growth/bulkCheckoutAuthContext.ts', {
  '@/lib/authRedirect': authRedirect,
  '@/lib/checkoutPricing': checkout,
})

let checks = 0
const equal = (actual, expected, message) => { assert.deepEqual(actual, expected, message); checks++ }
const ok = (value, message) => { assert.ok(value, message); checks++ }

equal(context.BULK_CHECKOUT_AUTH_CONTEXT_VERSION, 'bulk_checkout_auth_context_v1', 'context version is stable')

for (const packId of checkout.BULK_PACK_IDS) {
  const pack = checkout.BULK_PACKS[packId]
  const result = context.readBulkCheckoutAuthContext(`/api/stripe/checkout?pack=${packId}&resumed=1`)
  equal(result, {
    version: 'bulk_checkout_auth_context_v1',
    offerKind: 'bulk_pack',
    packId,
    videos: pack.videos,
    priceLabel: checkout.formatCheckoutMoney('usd', pack.usdMinor),
  }, `${packId} resolves only canonical commercial facts`)
}

for (const destination of [
  null,
  '',
  'https://evil.example/api/stripe/checkout?pack=bulk10',
  '//evil.example/api/stripe/checkout?pack=bulk10',
  '/\\evil.example/api/stripe/checkout?pack=bulk10',
  '/api/stripe/checkout/extra?pack=bulk10',
  '/api/paypal/checkout?pack=bulk10',
  '/api/stripe/checkout?pack=bulk99',
  '/api/stripe/checkout?tier=starter&billing=monthly',
]) {
  equal(context.readBulkCheckoutAuthContext(destination), null, `invalid destination fails generic: ${String(destination)}`)
}

const login = source('app/(auth)/login/page.tsx')
const signup = source('app/(auth)/signup/page.tsx')
const analytics = source('lib/authAnalytics.ts')
const checkoutRoute = source('app/api/stripe/checkout/route.ts')

ok(checkoutRoute.includes('redirect=${encodeURIComponent(resume)}'), 'checkout preserves the exact bulk destination through auth')
ok(login.includes('readBulkCheckoutAuthContext(destination)'), 'login derives pack context from the validated destination')
ok(login.includes('one-time checkout · no subscription'), 'login explains one-time terms without generic subscription ambiguity')
ok(signup.includes('readBulkCheckoutAuthContext(nextDestination)'), 'signup derives pack context from the validated destination')
ok(signup.includes('one time · no subscription'), 'signup explains one-time terms')
ok(signup.includes('Continue to ${bulkCheckoutContext.videos}-video checkout'), 'signup CTA preserves the exact selected volume')
ok(analytics.includes('context_version: bulkContext.version'), 'auth funnel events are versioned for the B2B context')
ok(analytics.includes('offer_kind: bulkContext.offerKind'), 'auth funnel identifies the offer kind')
ok(analytics.includes('sku: bulkContext.packId'), 'auth funnel carries only an allow-listed pack SKU')
ok(analytics.includes('bulk_videos: bulkContext.videos'), 'auth funnel carries canonical volume')
ok(!analytics.includes('redirect:'), 'auth analytics never sends the raw redirect')
ok(!analytics.includes('priceLabel'), 'auth analytics never sends display copy or formatted price')

console.log(`b2b auth context: ${checks}/${checks} checks passed`)
