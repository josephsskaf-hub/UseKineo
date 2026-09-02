#!/usr/bin/env node
import assert from 'node:assert/strict'
import { buildSubscriptionRevenueLedger } from './subscription-revenue-ledger.mjs'

let checks = 0
const equal = (actual, expected, message) => { assert.deepEqual(actual, expected, message); checks += 1 }
const ok = (value, message) => { assert.ok(value, message); checks += 1 }
const at = (minute) => `2026-09-02T10:${String(minute).padStart(2, '0')}:00.000Z`
const event = (name, user_id, minute, stripeSessionId, metadata = {}, session_id = `browser-${user_id ?? 'anon'}`) => ({
  id: `${name}-${user_id ?? 'anon'}-${minute}-${stripeSessionId ?? 'none'}`,
  name,
  user_id,
  session_id,
  created_at: at(minute),
  metadata: { ...(stripeSessionId ? { stripe_session_id: stripeSessionId } : {}), ...metadata },
})
const start = (user, minute, session, extra = {}, browser) => event('checkout_started', user, minute, session, { tier: 'basic', billing: 'monthly', ...extra }, browser)
const paid = (user, minute, session, amount = 1500, currency = 'usd', extra = {}) => event('payment_success', user, minute, session, { checkout_mode: 'subscription', amount_total: amount, currency, ...extra })
const profiles = [
  { id: 'external', email: 'buyer@example.com' },
  { id: 'external2', email: 'buyer2@example.com' },
  { id: 'internal', email: 'josephsskaf@gmail.com' },
]
const report = (events) => buildSubscriptionRevenueLedger({
  generatedAt: at(59),
  windowStart: at(10),
  events,
  profiles,
})

let result = report([start('external', 11, 'cs_exact'), paid('external', 12, 'cs_exact')])
equal(result.summary.exactExternalPaidPeople, 1, 'one exact external payer')
equal(result.summary.exactExternalPaidStripeSessions, 1, 'one exact paid Session')
equal(result.summary.externalRevenueMinorByCurrency, { usd: 1500 }, 'exact external revenue is counted')

result = report([
  start('external', 11, 'cs_dup'),
  paid('external', 12, 'cs_dup'),
  paid('external', 13, 'cs_dup'),
])
equal(result.summary.exactExternalPaidStripeSessions, 1, 'coherent duplicate webhook rows count once')
equal(result.summary.duplicatePaymentRows, 1, 'coherent duplicate is diagnosed')

result = report([start('external', 11, 'cs_two_users'), paid('external2', 12, 'cs_two_users')])
equal(result.summary.exactExternalPaidStripeSessions, 0, 'two users on one Session yield zero revenue')
equal(result.records[0].reason, 'identity_conflict', 'identity conflict is named')

result = report([start('external', 11, 'cs_external_internal'), paid('internal', 12, 'cs_external_internal')])
equal(result.summary.exactExternalPaidStripeSessions, 0, 'external plus internal never counts externally')
equal(result.summary.conflictStripeSessions, 1, 'external/internal collision is a conflict')

result = report([start('external', 11, 'cs_anonymous_payment'), paid(null, 12, 'cs_anonymous_payment')])
equal(result.summary.exactExternalPaidStripeSessions, 0, 'payment without user is never external')

result = report([
  start('external', 11, 'cs_money'),
  paid('external', 12, 'cs_money', 1500, 'usd'),
  paid('external', 13, 'cs_money', 1600, 'usd'),
])
equal(result.summary.exactExternalPaidStripeSessions, 0, 'divergent amounts invalidate revenue')
equal(result.records[0].reason, 'payment_semantic_conflict', 'money conflict is named')

result = report([
  start('external', 11, 'cs_currency'),
  paid('external', 12, 'cs_currency', 1500, 'usd'),
  paid('external', 13, 'cs_currency', 1500, 'brl'),
])
equal(result.summary.exactExternalPaidStripeSessions, 0, 'divergent currencies invalidate revenue')

result = report([
  start('external', 11, 'cs_mix'),
  event('checkout_started', 'external', 12, 'cs_mix', { sku: 'pack_100' }),
  paid('external', 13, 'cs_mix'),
])
equal(result.summary.exactExternalPaidStripeSessions, 0, 'subscription mixed with pack invalidates Session')
equal(result.records[0].reason, 'subscription_pack_conflict', 'product conflict is named')

result = report([
  event('checkout_started', 'external', 11, 'cs_pack', { sku: 'pack_100' }),
  event('payment_success', 'external', 12, 'cs_pack', { checkout_mode: 'payment', amount_total: 900, currency: 'usd' }),
])
equal(result.summary.exactExternalPaidStripeSessions, 0, 'pack after trial is never a subscription')
equal(result.summary.packSessions, 1, 'pack is reported separately')

result = report([start('external', 12, 'cs_before'), paid('external', 11, 'cs_before')])
equal(result.summary.exactExternalPaidStripeSessions, 0, 'payment before checkout is not linked')
equal(result.records[0].reason, 'payment_before_start', 'timeline failure is named')

const preWindowStart = {
  ...start('external', 1, 'cs_lookback'),
  created_at: '2026-09-02T09:59:00.000Z',
}
result = report([preWindowStart, paid('external', 12, 'cs_lookback')])
equal(result.summary.exactExternalPaidStripeSessions, 1, 'pre-window checkout links to in-window payment')
equal(result.summary.externalRevenueMinorByCurrency, { usd: 1500 }, 'lookback revenue is counted once')

result = report([paid('external', 12, 'cs_unlinked')])
equal(result.summary.unlinkedSubscriptionPaymentSessions, 1, 'payment without start remains explicit')
equal(result.summary.exactExternalPaidStripeSessions, 0, 'unlinked payment is not attributed')

result = report([
  start('external', 11, 'cs_one'), paid('external', 12, 'cs_one'),
  start('external', 13, 'cs_two'), paid('external', 14, 'cs_two'),
])
equal(result.summary.exactExternalPaidPeople, 1, 'one person may pay two Sessions')
equal(result.summary.exactExternalPaidStripeSessions, 2, 'two paid Sessions remain two revenue events')
equal(result.summary.externalRevenueMinorByCurrency, { usd: 3000 }, 'both exact Sessions contribute revenue')

result = report([start('external', 11, 'cs_resume', {}, 'browser-a'), start('external', 12, 'cs_resume', {}, 'browser-b'), paid('external', 13, 'cs_resume')])
equal(result.summary.exactExternalPaidStripeSessions, 1, 'same owner can resume the same Session in another browser')
equal(result.records[0].browserSessionCount, 2, 'cross-browser resume remains diagnosable')

result = report([])
equal(result.summary.exactExternalPaidPeople, 0, 'empty input invents no payer')
equal(result.summary.exactExternalPaidStripeSessions, 0, 'empty input invents no Session')
ok(result.note.includes('Packs never count'), 'contract states pack exclusion')

console.log(`subscription-revenue-ledger: ${checks}/${checks} checks passed`)
