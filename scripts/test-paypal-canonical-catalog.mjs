#!/usr/bin/env node
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const requireFromRepo = createRequire(join(root, 'package.json'))
const ts = requireFromRepo('typescript')
const source = (rel) => readFileSync(join(root, rel), 'utf8')

function loadTs(rel, mocks = {}) {
  const filename = join(root, rel)
  const output = ts.transpileModule(source(rel), {
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

equal(catalog.PAYPAL_TIER_USD.starter.monthly, '7.00', 'Starter recovery link charges current $7 monthly price')
equal(catalog.PAYPAL_TIER_USD.basic.monthly, '15.00', 'Creator recovery link charges current $15 monthly price')
equal(catalog.PAYPAL_TIER_USD.pro.monthly, '29.00', 'Studio recovery link charges current $29 monthly price')
equal(catalog.PAYPAL_PLAN_CREDITS, { starter: 40, basic: 90, pro: 180 }, 'PayPal grants current 40/90/180 ladder')
equal(catalog.PAYPAL_PACK.usd, (checkout.PACK_PRICE_MINOR.usd / 100).toFixed(2), 'PayPal First Pack price is canonical')
equal(catalog.PAYPAL_PACK.credits, checkout.PACK_CREDITS.starter, 'PayPal First Pack grant is canonical')

const paypalSource = source('lib/paypal.ts')
const recoverySource = source('app/api/cron/send-recovery/route.ts')
const pricingSource = source('app/pricing/PricingClient.tsx')

ok(paypalSource.includes("from '@/lib/paypalCatalog'"), 'PayPal provider layer imports the canonical adapter')
ok(paypalSource.includes('paypalPlanConfigKey(tier, billing)'), 'provider cache uses versioned commercial identity')
ok(paypalSource.includes('paypalPlanRequestId(tier, billing)'), 'provider idempotency uses versioned commercial identity')
ok(!paypalSource.includes("monthly: '9.90'"), 'retired Starter price is absent from PayPal provider source')
ok(!paypalSource.includes('starter: 25'), 'retired Starter grant is absent from PayPal provider source')
ok(recoverySource.includes('/api/paypal/checkout?tier=${tier}'), 'abandoned-checkout email still uses the corrected PayPal route')
ok(pricingSource.includes('const PAYPAL_ENABLED = false'), 'public PayPal buttons remain disabled pending a real paid canary')

const paypal = loadTs('lib/paypal.ts', {
  '@/lib/paypalCatalog': catalog,
  '@supabase/supabase-js': { createClient: () => ({}) },
})

const storedConfig = new Map([
  ['product_basic', 'PRODUCT-EXISTING'],
  ['plan_basic_monthly', 'PLAN-LEGACY-WRONG-OFFER'],
])
const planPosts = []
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
    return new Response(JSON.stringify({ id: 'PLAN-CANONICAL-CREATOR' }), { status: 200 })
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
  equal(planPosts[0].billing_cycles[0].pricing_scheme.fixed_price.value, '15.00', 'provider request charges canonical Creator amount')
  equal(planPosts[0].billing_cycles[0].frequency.interval_unit, 'MONTH', 'monthly cadence is preserved')
  equal(storedConfig.get('plan_basic_monthly_usd1500_c90_v2'), 'PLAN-CANONICAL-CREATOR', 'canonical plan id is cached under fingerprinted key')

  const cachedPlanId = await paypal.ensurePlan(fakeAdmin, 'basic', 'monthly')
  equal(cachedPlanId, 'PLAN-CANONICAL-CREATOR', 'second request reuses the canonical cached plan')
  equal(planPosts.length, 1, 'canonical plan is never duplicated after caching')

  equal(await paypal.tierFromPlanId(fakeAdmin, 'PLAN-CANONICAL-CREATOR'), { tier: 'basic', billing: 'monthly' }, 'webhook maps the fingerprinted plan id')
  equal(await paypal.tierFromPlanId(fakeAdmin, 'PLAN-LEGACY-WRONG-OFFER'), { tier: 'basic', billing: 'monthly' }, 'webhook still recognizes an already-issued legacy plan')
} finally {
  globalThis.fetch = previousFetch
  if (previousClientId === undefined) delete process.env.PAYPAL_CLIENT_ID
  else process.env.PAYPAL_CLIENT_ID = previousClientId
  if (previousClientSecret === undefined) delete process.env.PAYPAL_CLIENT_SECRET
  else process.env.PAYPAL_CLIENT_SECRET = previousClientSecret
}

console.log(`\n${checks}/${checks} canonical PayPal catalog checks passed`)
