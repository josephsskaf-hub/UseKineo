#!/usr/bin/env node
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'

const source = fs.readFileSync('lib/affiliateLedger.ts', 'utf8')
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2020,
    esModuleInterop: true,
  },
}).outputText
const moduleBox = { exports: {} }
vm.runInNewContext(compiled, {
  module: moduleBox,
  exports: moduleBox.exports,
  require(id) { throw new Error(`unexpected import ${id}`) },
  Error,
  Number,
  String,
  RegExp,
  Math,
  Promise,
})

const ledger = moduleBox.exports
const webhookSource = fs.readFileSync('app/api/stripe/webhook/route.ts', 'utf8')
const adminUpdateSource = fs.readFileSync('app/api/admin/affiliates/[id]/route.ts', 'utf8')
let checks = 0
const equal = (actual, expected, message) => { assert.equal(actual, expected, message); checks++ }
const ok = (value, message) => { assert.ok(value, message); checks++ }
const rejects = async (fn, pattern, message) => {
  await assert.rejects(fn, pattern, message)
  checks++
}
const throws = (fn, pattern, message) => {
  assert.throws(fn, pattern, message)
  checks++
}

equal(ledger.normalizeAffiliateCurrency(' USD '), 'usd', 'currency normalizes')
equal(ledger.normalizeAffiliateCurrency('brl'), 'brl', 'BRL remains separate')
for (const bad of ['', 'us', 'USDD', '$$$', 'u1d']) {
  throws(() => ledger.normalizeAffiliateCurrency(bad), /Invalid affiliate commission currency/, `reject currency ${bad || '(empty)'}`)
}

equal(ledger.calculateAffiliateCommission(1500, 0.4), 600, '40% of 1500 cents')
equal(ledger.calculateAffiliateCommission(1190, 0.4), 476, 'commission uses integer cents')
equal(ledger.calculateAffiliateCommission(1, 0.5), 1, 'half cent rounds deterministically')
for (const [gross, rate] of [[0, 0.4], [-1, 0.4], [1.2, 0.4], [100, 0], [100, -1], [100, 1.01]]) {
  throws(() => ledger.calculateAffiliateCommission(gross, rate), /Invalid affiliate commission/, `reject gross/rate ${gross}/${rate}`)
}

equal(ledger.normalizeAffiliateAdminUpdate({ commission_rate: 0.4 }).commission_rate, 0.4, 'valid rate accepted')
equal(ledger.normalizeAffiliateAdminUpdate({ coupon_code: ' kineoabc1 ' }).coupon_code, 'KINEOABC1', 'coupon uppercases')
equal(ledger.normalizeAffiliateAdminUpdate({ coupon_code: '   ' }).coupon_code, null, 'blank coupon clears')
for (const rate of [0, -0.1, 1.1, Number.NaN, Number.POSITIVE_INFINITY, '0.4']) {
  throws(() => ledger.normalizeAffiliateAdminUpdate({ commission_rate: rate }), /Commission rate/, `reject admin rate ${String(rate)}`)
}
for (const coupon of ['ABC', 'A_BC', 'A BC', 'A'.repeat(25), 1234]) {
  throws(() => ledger.normalizeAffiliateAdminUpdate({ coupon_code: coupon }), /Coupon code/, `reject admin coupon ${String(coupon)}`)
}

const row = {
  affiliate_id: 'aff-1',
  referral_id: 'ref-1',
  provider: 'stripe',
  external_id: 'cs_1',
  type: 'initial',
  amount_gross: 1500,
  currency: 'usd',
  commission_amount: 600,
  status: 'pending',
  period: '2026-08-27',
}
const existing = {
  affiliate_id: row.affiliate_id,
  referral_id: row.referral_id,
  provider: row.provider,
  external_id: row.external_id,
  type: row.type,
  amount_gross: row.amount_gross,
  currency: row.currency,
  commission_amount: row.commission_amount,
}

function store(overrides = {}) {
  const calls = []
  const state = {
    current: null,
    insertOutcome: 'inserted',
    markFails: false,
    async find() { calls.push('find'); return this.current },
    async insert(value) {
      calls.push('insert')
      if (this.insertOutcome === 'duplicate') return 'duplicate'
      this.current = { ...value }
      return 'inserted'
    },
    async markReferralPaid() {
      calls.push('mark')
      if (this.markFails) throw new Error('mark unavailable')
    },
    ...overrides,
  }
  return { state, calls }
}

{
  const { state, calls } = store()
  const outcome = await ledger.commitAffiliateCommission(state, row, '2026-08-27T20:00:00Z')
  equal(outcome, 'inserted', 'new commission reports inserted')
  equal(calls.join(','), 'find,insert,mark', 'commission exists before referral becomes paid')
}

{
  const { state, calls } = store({ current: existing })
  const outcome = await ledger.commitAffiliateCommission(state, row, '2026-08-27T20:00:00Z')
  equal(outcome, 'duplicate', 'retry reconciles existing commission')
  equal(calls.join(','), 'find,mark', 'retry does not insert another debt and repairs referral')
}

{
  const { state, calls } = store({
    insertOutcome: 'duplicate',
    reads: 0,
    async find() {
      calls.push('find')
      this.reads++
      return this.reads === 1 ? null : existing
    },
  })
  const outcome = await ledger.commitAffiliateCommission(state, row, '2026-08-27T20:00:00Z')
  equal(outcome, 'duplicate', 'concurrent unique winner reconciles')
  equal(calls.join(','), 'find,insert,find,mark', 'race winner verified before referral paid')
}

{
  const { state, calls } = store({ markFails: true })
  await rejects(
    () => ledger.commitAffiliateCommission(state, row, '2026-08-27T20:00:00Z'),
    /mark unavailable/,
    'referral update failure propagates for retry',
  )
  equal(calls.join(','), 'find,insert,mark', 'commission remains first on repairable mark failure')
  state.markFails = false
  calls.length = 0
  const outcome = await ledger.commitAffiliateCommission(state, row, '2026-08-27T20:01:00Z')
  equal(outcome, 'duplicate', 'retry after mark failure sees the existing commission')
  equal(calls.join(','), 'find,mark', 'retry repairs only the referral')
}

for (const [field, value] of [
  ['affiliate_id', 'aff-other'],
  ['referral_id', 'ref-other'],
  ['type', 'recurring'],
  ['amount_gross', 1499],
  ['currency', 'brl'],
  ['commission_amount', 599],
]) {
  const { state, calls } = store({ current: { ...existing, [field]: value } })
  await rejects(
    () => ledger.commitAffiliateCommission(state, row, '2026-08-27T20:00:00Z'),
    /conflicts with Stripe payment/,
    `idempotency conflict rejects changed ${field}`,
  )
  ok(!calls.includes('mark'), `conflict ${field} never marks referral paid`)
}

{
  const { state, calls } = store({
    insertOutcome: 'duplicate',
    async find() { calls.push('find'); return null },
  })
  await rejects(
    () => ledger.commitAffiliateCommission(state, row, '2026-08-27T20:00:00Z'),
    /could not be reconciled/,
    'unverifiable duplicate fails closed',
  )
  ok(!calls.includes('mark'), 'unverifiable duplicate never marks referral paid')
}

{
  const noReferral = { ...row, referral_id: null, external_id: 'in_1', type: 'recurring' }
  const { state, calls } = store()
  await ledger.commitAffiliateCommission(state, noReferral, '2026-08-27T20:00:00Z')
  equal(calls.join(','), 'find,insert', 'commission without referral writes debt but invents no paid referral')
}

const paymentPathStart = webhookSource.indexOf('// ── Path A: Legacy one-time credit-pack purchase')
const subscriptionPathStart = webhookSource.indexOf('// ── Path B: Subscription checkout')
const paymentPath = webhookSource.slice(paymentPathStart, subscriptionPathStart)
ok(paymentPathStart > 0 && subscriptionPathStart > paymentPathStart, 'real payment path located')
const guardIndex = paymentPath.indexOf('.insert({ id: checkoutFulfillmentGuard })')
const commissionIndex = paymentPath.indexOf('await recordAffiliateCommission(supabase')
const balanceReadIndex = paymentPath.indexOf(".select('video_credits')")
const balanceWriteIndex = paymentPath.indexOf('.update(profileUpdate)')
ok(guardIndex >= 0, 'payment path acquires fulfillment guard')
ok(commissionIndex > guardIndex, 'payment path records commission only after guard')
ok(balanceReadIndex > commissionIndex, 'commission precedes additive balance read')
ok(balanceWriteIndex > commissionIndex, 'commission precedes additive balance write')
equal((paymentPath.match(/await recordAffiliateCommission\(supabase/g) ?? []).length, 1, 'payment path has one commission call')
// Retry now also includes the checkout-analytics sink. Assert each cause and
// the composed guard instead of freezing the former two-term source line.
ok(webhookSource.includes('const shouldRetryAffiliateLedger = error instanceof RetryableAffiliateLedgerError'), 'affiliate failures are classified for retry')
ok(webhookSource.includes('const shouldRetryCheckoutAnalytics = error instanceof RetryableCheckoutAnalyticsError'), 'analytics failures are classified for retry')
ok(/shouldRetryEntitlement\s*\|\|\s*shouldRetryAffiliateLedger\s*\|\|\s*shouldRetryCheckoutAnalytics/.test(webhookSource), 'all retry causes enter the shared release path')
ok(webhookSource.includes('if (shouldRetryWebhook && checkoutFulfillmentGuardAcquired'), 'affiliate failure releases pack guard')
ok(webhookSource.includes('if (shouldRetryWebhook && dedupeRowAcquired && checkoutGuardReleased)'), 'affiliate failure releases Stripe event guard')
ok(!webhookSource.includes("if (ref && ref.status !== 'paid')"), 'legacy paid-before-commission branch is gone')
ok(adminUpdateSource.includes('normalizeAffiliateAdminUpdate'), 'admin route uses canonical financial validation')

console.log(`affiliate ledger: ${checks}/${checks} checks passed`)
