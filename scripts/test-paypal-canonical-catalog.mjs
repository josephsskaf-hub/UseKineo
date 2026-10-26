#!/usr/bin/env node
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { execFileSync } from 'node:child_process'
import * as crypto from 'node:crypto'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const requireFromRepo = createRequire(join(root, 'package.json'))
const ts = requireFromRepo('typescript')
const source = (rel) => readFileSync(join(root, rel), 'utf8')

function loadTs(rel, mocks = {}, raw = source(rel)) {
  const filename = join(root, rel)
  const output = ts.transpileModule(raw, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
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

const engine = loadTs('lib/credits/engineCost.ts')
const autopilot = loadTs('lib/autopilot/config.ts', { '@/lib/credits/engineCost': engine })
const checkout = loadTs('lib/checkoutPricing.ts', {
  '@/lib/credits/engineCost': engine,
  '@/lib/autopilot/config': autopilot,
})
const catalog = loadTs('lib/paypalCatalog.ts', { '@/lib/checkoutPricing': checkout })
const checkoutIntent = loadTs('lib/paypalCheckoutIntent.ts', { '@/lib/paypalCatalog': catalog })
const mainPricing = loadTs('lib/checkoutPricing.ts', {
  '@/lib/credits/engineCost': engine,
  '@/lib/autopilot/config': autopilot,
}, execFileSync('git', ['show', '3ec6c9d9b:lib/checkoutPricing.ts'], { encoding: 'utf8', maxBuffer: 8 << 20, stdio: ['ignore', 'pipe', 'ignore'] }))

let checks = 0
const equal = (actual, expected, message) => { assert.deepEqual(actual, expected, message); checks++ }
const ok = (value, message) => { assert.ok(value, message); checks++ }

const tiers = ['starter', 'basic', 'pro']
for (const tier of tiers) {
  equal(catalog.PAYPAL_TIER_USD[tier].monthly, (checkout.TIER_PRICES[tier].usd / 100).toFixed(2), `${tier} monthly PayPal price is canonical`)
  equal(catalog.PAYPAL_TIER_USD[tier].annual, (checkout.ANNUAL_PRICES[tier].usd / 100).toFixed(2), `${tier} annual PayPal price is canonical`)
  equal(catalog.PAYPAL_PLAN_CREDITS[tier], checkout.TIER_CREDITS[tier], `${tier} PayPal grant is canonical`)

  for (const billing of ['monthly', 'annual']) {
    const key = catalog.paypalPlanConfigKey(tier, billing)
    ok(key.startsWith(`plan_${tier}_${billing}_usd`), `${tier}/${billing} config key keeps webhook tier and billing positions`)
    ok(key.includes(`_c${checkout.TIER_CREDITS[tier]}_v2`), `${tier}/${billing} key fingerprints the canonical grant`)
    ok(!['plan_starter_monthly','plan_basic_monthly','plan_pro_monthly'].includes(key), `${tier}/${billing} never reuses an unversioned legacy plan`)
    equal(catalog.paypalPlanRequestId(tier, billing), `kineo-${key.replace(/_/g, '-')}`, `${tier}/${billing} provider idempotency follows the same commercial fingerprint`)
  }
}

for (const tier of tiers) equal(catalog.PAYPAL_TIER_USD[tier].monthly, (mainPricing.TIER_PRICES[tier].usd / 100).toFixed(2), `${tier} keeps the immutable approved main price`)
equal(catalog.PAYPAL_PLAN_CREDITS, Object.fromEntries(tiers.map(tier => [tier, mainPricing.TIER_CREDITS[tier]])), 'PayPal keeps the immutable approved main credit grants')
equal(catalog.PAYPAL_PACK.usd, (checkout.PACK_PRICE_MINOR.usd / 100).toFixed(2), 'PayPal First Pack price is canonical')
equal(catalog.PAYPAL_PACK.credits, checkout.PACK_CREDITS.starter, 'PayPal First Pack grant is canonical')

const paypalSource = source('lib/paypal.ts')
const paypalCheckoutSource = source('app/api/paypal/checkout/route.ts')
const recoverySource = source('app/api/cron/send-recovery/route.ts')
const pricingSource = source('app/pricing/PricingClient.tsx')

ok(paypalSource.includes("from '@/lib/paypalCatalog'"), 'PayPal provider layer imports the canonical adapter')
ok(paypalSource.includes('paypalPlanConfigKey(tier, billing)'), 'provider cache uses versioned commercial identity')
ok(paypalSource.includes('paypalPlanRequestId(tier, billing)'), 'provider idempotency uses versioned commercial identity')
ok(!paypalSource.includes("monthly: '9.90'"), 'retired Starter price is absent from PayPal provider source')
ok(!paypalSource.includes('starter: 25'), 'retired Starter grant is absent from PayPal provider source')
ok(recoverySource.includes('/api/paypal/checkout?tier=${tier}'), 'abandoned-checkout email still uses the corrected PayPal route')
ok(pricingSource.includes('const PAYPAL_ENABLED = false'), 'public PayPal buttons remain disabled pending a real paid canary')

const monthlyIntent = checkoutIntent.resolvePaypalCheckoutIntent(new URLSearchParams('tier=basic&utm_source=attacker'))
equal(monthlyIntent, {
  kind: 'subscription',
  tier: 'basic',
  billing: 'monthly',
  resumed: false,
  resumePath: '/api/paypal/checkout?tier=basic&billing=monthly&resumed=1',
}, 'Creator recovery preserves the plan, defaults monthly, and drops arbitrary query fields')
equal(
  checkoutIntent.paypalCheckoutLoginPath(monthlyIntent),
  '/login?reason=checkout&redirect=%2Fapi%2Fpaypal%2Fcheckout%3Ftier%3Dbasic%26billing%3Dmonthly%26resumed%3D1',
  'logged-out Creator buyer enters the proven checkout login handoff',
)

const annualIntent = checkoutIntent.resolvePaypalCheckoutIntent(new URLSearchParams('tier=pro&billing=annual'))
equal(annualIntent.billing, 'annual', 'annual Studio cadence survives the auth hop')
equal(annualIntent.resumePath, '/api/paypal/checkout?tier=pro&billing=annual&resumed=1', 'annual Studio return path is exact')

const packIntent = checkoutIntent.resolvePaypalCheckoutIntent(new URLSearchParams('pack=starter&billing=annual&extra=1'))
equal(packIntent, {
  kind: 'pack',
  pack: 'starter',
  resumed: false,
  resumePath: '/api/paypal/checkout?pack=starter&resumed=1',
}, 'First Pack survives auth without unrelated subscription fields')
equal(
  checkoutIntent.resolvePaypalCheckoutIntent(new URLSearchParams('tier=enterprise')),
  null,
  'unknown tier never reaches auth or PayPal',
)
equal(
  checkoutIntent.resolvePaypalCheckoutIntent(new URLSearchParams('tier=starter&resumed=1')).resumed,
  true,
  'resume guard is recognized deterministically',
)

ok(paypalCheckoutSource.includes('resolvePaypalCheckoutIntent(req.nextUrl.searchParams)'), 'live route executes the allow-listed intent resolver')
ok(paypalCheckoutSource.includes('paypalCheckoutLoginPath(intent)'), 'live route executes the login handoff builder')
ok(paypalCheckoutSource.includes('if (intent.resumed)'), 'live route terminates a stale-session loop')
ok(!paypalCheckoutSource.includes("/signup?redirect=${encodeURIComponent('/pricing')}"), 'live route no longer drops a buyer at signup/pricing')
ok(recoverySource.includes('/login?reason=checkout'), 'recovery source documents the executable login contract')

let providerCallsFromAnonymousRoute = 0
const checkoutRoute = loadTs('app/api/paypal/checkout/route.ts', {
  'next/server': {
    NextResponse: {
      redirect: (location) => ({ location: String(location) }),
    },
  },
  '@/lib/supabase/server': {
    createClient: () => ({
      auth: {
        getUser: async () => ({ data: { user: null }, error: null }),
      },
    }),
  },
  '@/lib/paypal': {
    paypalAdminClient: () => { providerCallsFromAnonymousRoute++; throw new Error('provider must not be reached') },
    paypalFetch: async () => { providerCallsFromAnonymousRoute++; throw new Error('provider must not be reached') },
    ensurePlan: async () => { providerCallsFromAnonymousRoute++; throw new Error('provider must not be reached') },
    PAYPAL_PACK: catalog.PAYPAL_PACK,
  },
  '@/lib/paypalCheckoutIntent': checkoutIntent,
})

const routeClientId = process.env.PAYPAL_CLIENT_ID
const routeClientSecret = process.env.PAYPAL_CLIENT_SECRET
process.env.PAYPAL_CLIENT_ID = 'route-test-client'
process.env.PAYPAL_CLIENT_SECRET = 'route-test-secret'
try {
  const loggedOutRecovery = await checkoutRoute.GET({
    nextUrl: { searchParams: new URLSearchParams('tier=basic') },
  })
  equal(
    loggedOutRecovery.location,
    'https://www.usekineo.com/login?reason=checkout&redirect=%2Fapi%2Fpaypal%2Fcheckout%3Ftier%3Dbasic%26billing%3Dmonthly%26resumed%3D1',
    'executed route sends a logged-out recovery buyer to login with the exact Creator checkout',
  )

  const staleResume = await checkoutRoute.GET({
    nextUrl: { searchParams: new URLSearchParams('tier=basic&billing=monthly&resumed=1') },
  })
  ok(staleResume.location.startsWith('https://www.usekineo.com/pricing?checkout_error='), 'executed route stops a stale-session auth loop at pricing')

  const invalidPlan = await checkoutRoute.GET({
    nextUrl: { searchParams: new URLSearchParams('tier=enterprise') },
  })
  ok(invalidPlan.location.includes('checkout_error=Invalid%20plan.'), 'executed route rejects an unknown tier before auth/provider')
  equal(providerCallsFromAnonymousRoute, 0, 'anonymous, stale, and invalid requests create zero provider objects')
} finally {
  if (routeClientId === undefined) delete process.env.PAYPAL_CLIENT_ID
  else process.env.PAYPAL_CLIENT_ID = routeClientId
  if (routeClientSecret === undefined) delete process.env.PAYPAL_CLIENT_SECRET
  else process.env.PAYPAL_CLIENT_SECRET = routeClientSecret
}

const renewal = loadTs('lib/credits/renewalBalance.ts')
const alternative = loadTs('lib/payments/alternative.ts', { 'node:crypto': crypto })
const paypal = loadTs('lib/paypal.ts', {
  '@/lib/paypalCatalog': catalog,
  '@supabase/supabase-js': { createClient: () => ({}) },
  './credits/renewalBalance': renewal,
  './payments/alternative': alternative,
})

const storedConfig = new Map([
  ['product_basic_v5', 'PRODUCT-EXISTING'],
  ['plan_basic_monthly', 'PLAN-LEGACY-WRONG-OFFER'],
  ['plan_basic_monthly_v5', 'PLAN-V5-WRONG-OFFER'],
])
const planPosts = []
const planRequestIds = []
const previousFetch = globalThis.fetch
const previousClientId = process.env.PAYPAL_CLIENT_ID
const previousClientSecret = process.env.PAYPAL_CLIENT_SECRET
process.env.PAYPAL_CLIENT_ID = 'test-client'
process.env.PAYPAL_CLIENT_SECRET = 'test-secret'
globalThis.fetch = async (url, init = {}) => {
  const href = String(url)
  if (href.endsWith('/v1/oauth2/token')) {
    return new Response(JSON.stringify({ access_token: 'test-token', expires_in: 3600 }), { status: 200 })
  }
  if (href.endsWith('/v1/billing/plans')) {
    planPosts.push(JSON.parse(String(init.body)))
    planRequestIds.push(init.headers['PayPal-Request-Id'])
    return new Response(JSON.stringify({ id: planPosts.length === 1 ? 'PLAN-CANONICAL-CREATOR' : `PLAN-CHANGED-${planPosts.length}` }), { status: 200 })
  }
  throw new Error(`unexpected PayPal fetch: ${href}`)
}

function configQuery() {
  let exactKey = null
  let prefix = null
  return {
    select() { return this },
    eq(_column, value) { exactKey = value; return this },
    like(_column, value) { prefix = String(value).replace(/%$/, ''); return this },
    async maybeSingle() {
      return { data: storedConfig.has(exactKey) ? { value: storedConfig.get(exactKey) } : null }
    },
    async upsert(row) { storedConfig.set(row.key, row.value); return { error: null } },
    then(resolve) {
      const rows = [...storedConfig.entries()]
        .filter(([key]) => !prefix || key.startsWith(prefix))
        .map(([key, value]) => ({ key, value }))
      return Promise.resolve({ data: rows }).then(resolve)
    },
  }
}

const fakeAdmin = { from: (table) => {
  assert.equal(table, 'paypal_config')
  return configQuery()
} }

try {
  const canonicalPlanId = await paypal.ensurePlan(fakeAdmin, 'basic', 'monthly')
  equal(canonicalPlanId, 'PLAN-CANONICAL-CREATOR', 'legacy cached Creator plan is not reused')
  equal(planPosts.length, 1, 'one canonical provider plan is created')
  equal(planPosts[0].billing_cycles[0].pricing_scheme.fixed_price.value, catalog.PAYPAL_TIER_USD.basic.monthly, 'provider request charges canonical Creator amount')
  equal(planPosts[0].billing_cycles[0].frequency.interval_unit, 'MONTH', 'monthly cadence is preserved')
  equal(planRequestIds[0], catalog.paypalPlanRequestId('basic', 'monthly'), 'actual provider idempotency fingerprints the same canonical terms')
  equal(storedConfig.get(catalog.paypalPlanConfigKey('basic', 'monthly')), 'PLAN-CANONICAL-CREATOR', 'canonical plan id is cached under fingerprinted key')

  const cachedPlanId = await paypal.ensurePlan(fakeAdmin, 'basic', 'monthly')
  equal(cachedPlanId, 'PLAN-CANONICAL-CREATOR', 'second request reuses the canonical cached plan')
  equal(planPosts.length, 1, 'canonical plan is never duplicated after caching')

  equal(await paypal.tierFromPlanId(fakeAdmin, 'PLAN-CANONICAL-CREATOR'), { tier: 'basic', billing: 'monthly' }, 'webhook maps the fingerprinted plan id')
  equal(await paypal.tierFromPlanId(fakeAdmin, 'PLAN-LEGACY-WRONG-OFFER'), { tier: 'basic', billing: 'monthly' }, 'webhook still recognizes an already-issued legacy plan')
  equal(await paypal.tierFromPlanId(fakeAdmin, 'PLAN-V5-WRONG-OFFER'), { tier: 'basic', billing: 'monthly' }, 'webhook still recognizes already-issued versioned plans')

  // Independent future catalog worlds: a change to either amount or credit grant
  // must create a different commercial identity; same terms must reuse its cache.
  for (const [label, priceDelta, creditsDelta] of [['price', 100, 0], ['credits', 0, 1]]) {
    const nextCheckout = {
      ...checkout,
      TIER_PRICES: { ...checkout.TIER_PRICES, basic: { ...checkout.TIER_PRICES.basic, usd: checkout.TIER_PRICES.basic.usd + priceDelta } },
      TIER_CREDITS: { ...checkout.TIER_CREDITS, basic: checkout.TIER_CREDITS.basic + creditsDelta },
    }
    const nextCatalog = loadTs('lib/paypalCatalog.ts', { '@/lib/checkoutPricing': nextCheckout })
    const nextPaypal = loadTs('lib/paypal.ts', {
      '@/lib/paypalCatalog': nextCatalog,
      '@supabase/supabase-js': { createClient: () => { throw new Error('live database forbidden') } },
      './credits/renewalBalance': renewal,
      './payments/alternative': alternative,
    })
    const beforePosts = planPosts.length
    const id = await nextPaypal.ensurePlan(fakeAdmin, 'basic', 'monthly')
    ok(id !== canonicalPlanId, `${label} change never reuses the prior commercial plan`)
    equal(planPosts.length, beforePosts + 1, `${label} change creates exactly one new provider plan`)
    equal(planPosts.at(-1).billing_cycles[0].pricing_scheme.fixed_price.value, nextCatalog.PAYPAL_TIER_USD.basic.monthly, `${label} payload uses that world's canonical price`)
    equal(planRequestIds.at(-1), nextCatalog.paypalPlanRequestId('basic', 'monthly'), `${label} provider idempotency follows new terms`)
    equal(storedConfig.get(nextCatalog.paypalPlanConfigKey('basic', 'monthly')), id, `${label} cache fingerprints the canonical price and grant`)
    equal(await nextPaypal.ensurePlan(fakeAdmin, 'basic', 'monthly'), id, `${label} unchanged terms reuse the new cached plan`)
    equal(planPosts.length, beforePosts + 1, `${label} cache reuse creates no duplicate provider plan`)
  }
} finally {
  globalThis.fetch = previousFetch
  if (previousClientId === undefined) delete process.env.PAYPAL_CLIENT_ID
  else process.env.PAYPAL_CLIENT_ID = previousClientId
  if (previousClientSecret === undefined) delete process.env.PAYPAL_CLIENT_SECRET
  else process.env.PAYPAL_CLIENT_SECRET = previousClientSecret
}

console.log(`\n${checks}/${checks} canonical PayPal catalog checks passed`)
