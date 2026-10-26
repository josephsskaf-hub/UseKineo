#!/usr/bin/env node
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'

const moduleBox = { exports: {} }
vm.runInNewContext(ts.transpileModule(fs.readFileSync('lib/affiliateCoupon.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText, {
  module: moduleBox, exports: moduleBox.exports,
  require(id) { if (id === '@/lib/stripe') return { stripe: {} }; throw new Error(`Unexpected import ${id}`) },
  process: { env: {} }, console: { warn() {} },
})
const { ensureAffiliateBaseCoupon, mintCouponIfMissing, AFFILIATE_COUPON_ID: id, LEGACY_AFFILIATE_COUPON_ID: oldId } = moduleBox.exports
const clone = value => JSON.parse(JSON.stringify(value))
const missing = () => Object.assign(new Error('missing'), { code: 'resource_missing' })
const coupon = (couponId, percent = 50, other = {}) => ({ id: couponId, valid: true, percent_off: percent, duration: 'once', name: 'Partner 50% first month', ...other })
const legacy = (n, other = {}) => ({ id: `old_${n}`, code: `KINEOPARTNER${n}`, active: true, coupon: coupon(oldId, 20), customer: null, expires_at: null, max_redemptions: null, times_redeemed: 0, metadata: { affiliate_id: `affiliate_${n}` }, restrictions: { first_time_transaction: false, minimum_amount: null, minimum_amount_currency: null }, ...other })

function mock({ coupons = [], codes = [], pageSize = 100 } = {}) {
  const state = { coupons: new Map(coupons.map(c => [c.id, clone(c)])), codes: clone(codes), calls: [], failures: {}, next: 0 }
  const client = {
    coupons: {
      async retrieve(key) { state.calls.push(['coupon.retrieve', key]); if (!state.coupons.has(key)) throw missing(); return clone(state.coupons.get(key)) },
      async create(value) {
        state.calls.push(['coupon.create', clone(value)])
        if (state.failures.couponRace) { state.failures.couponRace = false; state.coupons.set(value.id, coupon(value.id)); throw new Error('race') }
        if (state.coupons.has(value.id)) throw new Error('duplicate')
        const created = { valid: true, ...clone(value) }; state.coupons.set(value.id, created); return clone(created)
      },
      async update(key, value) { Object.assign(state.coupons.get(key), clone(value)); return clone(state.coupons.get(key)) },
    },
    promotionCodes: {
      async list(filter) {
        state.calls.push(['promo.list', clone(filter)])
        const filtered = state.codes.filter(c => (!filter.coupon || c.coupon.id === filter.coupon) && (!filter.code || c.code.toUpperCase() === filter.code.toUpperCase()) && (filter.active == null || c.active === filter.active))
        const start = filter.starting_after ? filtered.findIndex(c => c.id === filter.starting_after) + 1 : 0
        const data = filtered.slice(start, start + Math.min(pageSize, filter.limit)); return { data: clone(data), has_more: start + data.length < filtered.length }
      },
      async create(value) {
        state.calls.push(['promo.create', clone(value)])
        if (state.failures.create) { state.failures.create = false; throw new Error('create failure') }
        if (state.codes.some(c => c.active && c.code === value.code && c.customer === (value.customer ?? null))) throw new Error('duplicate code')
        const created = { ...clone(value), id: `new_${++state.next}`, active: true, coupon: clone(state.coupons.get(value.coupon)), customer: value.customer ?? null, times_redeemed: 0 }
        state.codes.push(created)
        if (state.failures.lostCreate) { state.failures.lostCreate = false; throw new Error('response lost') }
        return clone(created)
      },
      async update(key, value) {
        state.calls.push(['promo.update', key, clone(value)])
        if (value.active && state.failures.rollback) throw new Error('rollback failed')
        const found = state.codes.find(c => c.id === key); found.active = value.active
        if (value.metadata) for (const [k, v] of Object.entries(value.metadata)) { if (v === '') delete found.metadata[k]; else found.metadata[k] = v }
        if (!value.active && state.failures.lostDeactivate) { state.failures.lostDeactivate = false; throw new Error('deactivate response lost') }
        return clone(found)
      },
    },
  }
  return { client, state }
}

let checks = 0
function equal(actual, expected, label) { assert.equal(actual, expected, label); checks++ }
function deep(actual, expected, label) { assert.deepEqual(clone(actual), expected, label); checks++ }

{
  const { client, state } = mock()
  equal(await ensureAffiliateBaseCoupon(client), id, 'creates missing base')
  deep(state.coupons.get(id), coupon(id), 'exact 50 once contract and short name')
  const calls = state.calls.length
  equal(await ensureAffiliateBaseCoupon(client), id, 'completed migration caches')
  equal(state.calls.length, calls, 'successful repeat performs no external work')
}
{
  const { client, state } = mock({ coupons: [coupon('old_override', 20)] })
  equal(await ensureAffiliateBaseCoupon(client, 'old_override'), id, '20% override cannot retain old offer')
  equal(state.coupons.get('old_override').percent_off, 20, 'immutable legacy coupon untouched')
}
for (const invalid of [{ duration: 'forever' }, { percent_off: 20 }, { valid: false }, { applies_to: { products: ['prod_other'] } }]) {
  const { client } = mock({ coupons: [coupon(id, 50, invalid)] })
  equal(await ensureAffiliateBaseCoupon(client), null, 'invalid base fails closed')
}
{
  const { client, state } = mock({ codes: [legacy(1), legacy(2), legacy(3), legacy(4, { active: false })], pageSize: 2 })
  equal(await ensureAffiliateBaseCoupon(client), id, 'legacy pagination migrates every active code')
  equal(state.codes.filter(c => c.active && c.coupon.id === id).length, 3, 'three migrated codes')
  equal(state.codes.find(c => c.id === 'old_4').active, false, 'historical inactive code not resurrected')
  deep(state.codes.filter(c => c.active).map(c => c.code), ['KINEOPARTNER1', 'KINEOPARTNER2', 'KINEOPARTNER3'], 'customer facing strings unchanged')
}
{
  const source = legacy(1, { customer: { id: 'cus_1' }, expires_at: 1999999999, max_redemptions: 10, times_redeemed: 3, metadata: { affiliate_id: 'a1', custom: 'keep' }, restrictions: { first_time_transaction: true, minimum_amount: 100, minimum_amount_currency: 'usd', currency_options: { brl: { minimum_amount: 500 } } } })
  const { client, state } = mock({ codes: [source] })
  await ensureAffiliateBaseCoupon(client)
  const created = state.codes.find(c => c.coupon.id === id)
  equal(created.code, source.code, 'restricted code text preserved')
  equal(created.customer, 'cus_1', 'customer preserved')
  equal(created.expires_at, source.expires_at, 'expiration preserved')
  equal(created.max_redemptions, 7, 'redemption limit subtracts historical redemptions')
  deep(created.metadata, source.metadata, 'metadata preserved without migration marker')
  deep(created.restrictions, source.restrictions, 'all restrictions preserved')
}
{
  const { client, state } = mock({ codes: [legacy(1)] }); state.failures.create = true
  equal(await ensureAffiliateBaseCoupon(client), null, 'failed replacement never caches success')
  equal(state.codes[0].active, true, 'failed replacement rolls old code back')
  equal(await ensureAffiliateBaseCoupon(client), id, 'retry migrates after transient failure')
}
{
  const { client, state } = mock({ codes: [legacy(1)] }); state.failures.lostCreate = true
  equal(await ensureAffiliateBaseCoupon(client), id, 'lost creation response reconciles replacement')
  equal(state.codes.filter(c => c.active).length, 1, 'race does not reactivate old code or duplicate')
}
{
  const { client, state } = mock({ codes: [legacy(1)] }); state.failures.lostDeactivate = true; state.failures.rollback = true
  equal(await ensureAffiliateBaseCoupon(client), null, 'archive interruption remains incomplete')
  equal(state.codes[0].active, false, 'simulate process interrupted after archive')
  state.failures.rollback = false
  equal(await ensureAffiliateBaseCoupon(client), id, 'pending inactive migration resumes safely')
  equal(state.codes.filter(c => c.active && c.coupon.id === id).length, 1, 'interrupted code restored with 50%')
}
{
  const { client, state } = mock(); state.failures.couponRace = true
  deep(await Promise.all([ensureAffiliateBaseCoupon(client), ensureAffiliateBaseCoupon(client)]), [id, id], 'concurrent requests and coupon create race reconcile')
  equal(state.calls.filter(c => c[0] === 'coupon.create').length, 1, 'single flight for same client')
}
{
  const { client } = mock({ codes: [legacy(1)] }); const updates = []
  const admin = { from() { return { update(value) { updates.push(value); return { async eq() { return { error: null } } } } } } }
  equal(await mintCouponIfMissing(admin, { id: 'affiliate_1', code: 'partner1', status: 'active', coupon_code: 'KINEOPARTNER1' }, client), 'KINEOPARTNER1', 'existing affiliate code reconciles before return')
  equal(updates.length, 0, 'unchanged DB string needs no rewrite')
  equal(await mintCouponIfMissing(admin, { id: 'a2', code: 'partner2', status: 'active', coupon_code: null }, client), 'KINEOPARTNER2', 'new partner code minted')
  deep(updates, [{ coupon_code: 'KINEOPARTNER2' }], 'new code committed to ledger owner')
  equal(await mintCouponIfMissing(admin, { id: 'a3', code: 'partner3', status: 'inactive', coupon_code: 'KINEOPARTNER3' }, client), null, 'inactive affiliate cannot mint')
}
{
  const { client } = mock()
  const admin = { from() { return { update() { return { async eq() { return { error: { message: 'failed' } } } } } } } }
  equal(await mintCouponIfMissing(admin, { id: 'a1', code: 'partner1', status: 'active', coupon_code: null }, client), null, 'DB owner failure never exposes coupon')
}
console.log(`affiliate coupon 50: ${checks} checks passed (mock Stripe only)`)
