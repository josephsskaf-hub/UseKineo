// Executes the real GET handler in a closed VM. No production GET, credentials,
// Stripe, database, network or coupon creation. Guards the 2963b919 repair.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'

const routeSource = fs.readFileSync('app/api/affiliate/me/route.ts', 'utf8')
const settlementSource = fs.readFileSync('lib/settlementCurrency.ts', 'utf8')
function compile(source, imports, globals = {}) {
  const box = { exports: {} }
  const code = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText
  vm.runInNewContext(code, {
    module: box, exports: box.exports,
    require(id) {
      assert.ok(Object.hasOwn(imports, id), `Unexpected import: ${id}`)
      return imports[id]
    },
    ...globals,
  }, { timeout: 1000 })
  return box.exports
}

// Real settlement module; no pricing functions are called by this test.
const settlement = compile(settlementSource, { './checkoutPricing': {} })
const row = (amount, currency, status) => ({
  created_at: '2026-09-09T22:00:00Z', type: 'initial', amount_gross: amount * 10,
  commission_amount: amount, currency, status,
})
async function run(rows, { source = routeSource, user = true, rate = settlement.BRL_PER_USD_HOUSE } = {}) {
  let dbCalls = 0
  let prohibitedCalls = 0
  const prohibit = () => { prohibitedCalls++; throw new Error('External side effect prohibited') }
  const db = {
    from(table) {
      dbCalls++
      const filters = []
      let countOnly = false
      const resolve = () => {
        if (table === 'affiliates') {
          assert.ok(filters.some(([key, value]) => key === 'user_id' && value === 'fixture-owner'))
          return { data: { id: 'fixture-affiliate', code: 'FIXTURE1', status: 'active', commission_rate: 0.3, coupon_code: 'EXISTING' } }
        }
        assert.ok(filters.some(([key, value]) => key === 'affiliate_id' && value === 'fixture-affiliate'), 'Every ledger query is owner-scoped')
        if (table === 'affiliate_commissions') return { data: rows }
        assert.ok(countOnly && ['affiliate_clicks', 'affiliate_referrals'].includes(table))
        return { count: filters.some(([key]) => key === 'status') ? 1 : 2 }
      }
      const query = {
        select(_fields, options) { countOnly = options?.head === true; return query },
        eq(key, value) { filters.push([key, value]); return query },
        order() { return query },
        maybeSingle() { return Promise.resolve(resolve()) },
        then(ok, bad) { return Promise.resolve().then(resolve).then(ok, bad) },
        update: prohibit, insert: prohibit, delete: prohibit,
      }
      return query
    },
  }
  const route = compile(source, {
    'next/server': { NextResponse: { json: (body, opts) => ({ body, status: opts?.status ?? 200 }) } },
    '@/lib/supabase/server': { createClient: () => ({ auth: { getUser: async () => ({ data: { user: user ? { id: 'fixture-owner' } : null } }) } }) },
    '@supabase/supabase-js': { createClient: () => db },
    '@/lib/stripe': { stripe: new Proxy({}, { get: prohibit }) },
    '@/lib/settlementCurrency': { BRL_PER_USD_HOUSE: rate },
  }, {
    // Synthetic markers only. Host process.env is never exposed to the VM.
    process: { env: { NEXT_PUBLIC_SUPABASE_URL: 'https://fixture.invalid', SUPABASE_SERVICE_ROLE_KEY: 'fixture-not-a-key' } },
    console: { log() {}, warn() {}, error() {} }, fetch: prohibit,
  })
  const response = await route.GET()
  assert.equal(prohibitedCalls, 0, 'No network, Stripe or mutation was attempted')
  return { ...JSON.parse(JSON.stringify(response)), dbCalls }
}

let checks = 0
function eq(actual, expected, label) { assert.deepEqual(actual, expected, label); checks++ }
const empty = await run([])
eq(empty.status, 200, 'Real GET returns successfully')
eq(empty.body.earnings, { pending: 0, approved: 0, paid: 0, total: 0 }, 'Empty ledger stays zero')
const unauthorized = await run([], { user: false })
eq(unauthorized.status, 401, 'Signed-out request rejected')
eq(unauthorized.dbCalls, 0, 'No admin query before authentication')

const fixtures = [row(100, 'usd', 'pending'), row(1000, 'brl', 'pending'),
  row(2000, 'BRL', 'approved'), row(700, 'usd', 'paid'),
  row(1497, 'brl', 'void'), row(9999, 'usd', 'clawed_back')]
const mixed = await run(fixtures)
eq(mixed.status, 200, 'Mixed-currency route completes')
eq(mixed.body.earnings.pending, 100 + Math.round(1000 / settlement.BRL_PER_USD_HOUSE), 'BRL pending is converted, not added as USD')
eq(mixed.body.earnings.approved, Math.round(2000 / settlement.BRL_PER_USD_HOUSE), 'Uppercase BRL is normalized')
eq(mixed.body.earnings.paid, 700, 'USD paid unchanged')
eq(mixed.body.earnings.total, mixed.body.earnings.pending + mixed.body.earnings.approved + mixed.body.earnings.paid, 'Voided and clawed-back rows excluded from total')
eq(mixed.body.recent.length, fixtures.length, 'Audit detail preserves void and clawback history')
eq(mixed.body.recent[1].commission_amount, 1000, 'Detail preserves original amount')
eq(mixed.body.recent[1].currency, 'brl', 'Detail preserves original currency')
eq(mixed.body.affiliate.commission_rate, 0.3, 'Commission policy unchanged')
eq(mixed.body.affiliate.coupon_code, 'EXISTING', 'Existing coupon untouched')

const changedRate = await run([row(1000, 'brl', 'pending')], { rate: 10 })
eq(changedRate.body.earnings.pending, 100, 'Handler follows supplied canonical rate, not an inline rate')
const rounding = await run([row(1497, 'brl', 'pending')])
eq(rounding.body.earnings.pending, Math.round(1497 / settlement.BRL_PER_USD_HOUSE), 'Fractional USD cent follows current per-row rounding contract')
eq((await run([row(200, null, 'paid')])).body.earnings.paid, 200, 'Legacy null currency retains USD fallback')

// Red controls execute mutant handlers, rather than checking variable names.
const noFxSource = routeSource.replace('Math.round(amt / BRL_PER_USD_HOUSE)', 'amt')
assert.notEqual(noFxSource, routeSource, 'FX mutation must apply')
assert.notEqual((await run(fixtures, { source: noFxSource })).body.earnings.pending, mixed.body.earnings.pending)
checks++
const countVoidSource = routeSource.replace("c.status === 'void' || ", '')
assert.notEqual(countVoidSource, routeSource, 'Void mutation must apply')
assert.notEqual((await run(fixtures, { source: countVoidSource })).body.earnings.total, mixed.body.earnings.total)
checks++
console.log(`affiliate-me currency contract: ${checks} checks passed; real GET, 2 red controls; no external calls`)
