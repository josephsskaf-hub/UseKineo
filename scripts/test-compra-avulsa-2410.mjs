// KINEO-COMPRA-AVULSA-2410 — execute real checkout/fulfillment modules offline; never loads env files, SDKs or a network.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'

const CHECKOUT = 'lib/stripe/oneTimeItemCheckout.ts', FULFILL = 'lib/stripe/oneTimeItemFulfillment.ts'
const UID = '00000000-0000-4000-8000-000000000001', ORDER = '00000000-0000-4000-8000-000000000002'
const source = file => readFileSync(file, 'utf8').replace(/\r\n/g, '\n')
const plain = value => JSON.parse(JSON.stringify(value))
async function checkout(query = '', options = {}, overrides = {}) {
  const calls = [], events = [], keys = []
  const profile = { email: 'offline@example.invalid', stripe_customer_id: 'cus_offline' }
  const queryDb = table => ({
    select() { return this }, eq() { return this },
    single: async () => ({ data: options.noProfile ? null : profile, error: options.profileError ? { message: 'offline' } : null }),
    maybeSingle: async () => ({ data: options.foreignOrder ? null : { id: ORDER, tier: 'commercial', seconds: 15 }, error: null }),
    limit: async () => ({ data: [], error: options.noMigration ? { message: 'missing receipt' } : null }),
  })
  const mocks = {
    'next/server': { NextResponse: { redirect: url => ({ location: String(url) }) } },
    stripe: { __esModule: true, default: class {} },
    '@/lib/stripe': { stripe: { checkout: { sessions: { create: async (params, opts) => {
      calls.push(plain(params)); keys.push(opts.idempotencyKey)
      if (options.stripeError || (options.currencyRetry && calls.length === 1)) throw new Error(options.currencyRetry ? 'Cannot combine currencies on a single customer' : 'private provider detail')
      return { id: 'cs_offline', url: options.noUrl ? null : 'https://checkout.stripe.invalid/session' }
    } } } } },
    '@/lib/supabase/server': { createClient: () => ({ auth: { getUser: async () => ({ data: { user: options.anon ? null : { id: UID, email: 'auth@example.invalid' } }, error: null }) }, from: queryDb }) },
    '@supabase/supabase-js': { createClient: () => ({ from: queryDb }) },
  }
  const load = createOfflineLoader({ mocks, env: { STRIPE_SECRET_KEY: 'offline-placeholder', NEXT_PUBLIC_SUPABASE_URL: 'https://offline.invalid', SUPABASE_SERVICE_ROLE_KEY: 'offline-placeholder' }, source: (file, text) => overrides[file] ?? text, globals: { Error } })
  const url = new URL(`https://www.usekineo.com/api/stripe/checkout?${query}`)
  const req = { url: String(url), nextUrl: url, headers: new Headers({ 'x-vercel-ip-country': options.country ?? 'US', 'accept-language': options.language ?? 'en-US' }) }
  const result = await load(CHECKOUT).buildOneTimeItemAndRedirect(req, { browserSessionIdFrom: () => 'browser-offline', recordCheckoutEvent: async (...args) => events.push(plain(args)), oneTimeIdempotencyKey: value => { const key = JSON.stringify(value); return key }, checkoutFailureReason: () => 'offline' })
  return { result, calls, events, keys, load }
}
const paidSession = (sku = 'one_time_ad', currency = 'usd') => ({
  id: 'cs_offline', mode: 'payment', payment_status: 'paid', client_reference_id: UID, currency,
  amount_total: currency === 'usd' ? sku === 'one_time_ad' ? 900 : 500 : sku === 'one_time_ad' ? 4490 : 2490,
  metadata: { pack: sku, pack_credits: sku === 'one_time_ad' ? '41' : '21', supabase_user_id: UID, one_time_item_version: 'one_time_item_v1', surface: 'pricing', browser_session_id: 'browser-offline' },
})
async function proofs(overrides = {}) {
  let cases = 0
  for (const sku of ['one_time_ad', 'one_time_film35']) for (const country of ['US', 'BR']) {
    const run = await checkout(`pack=${sku}&price=1&credits=999999&amount=1&currency=${country === 'BR' ? 'brl' : 'usd'}`, { country }, overrides)
    const expected = paidSession(sku, country === 'BR' ? 'brl' : 'usd')
    assert.equal(run.result.location, 'https://checkout.stripe.invalid/session')
    assert.equal(run.calls.length, 1)
    const params = run.calls[0], price = params.line_items[0].price_data
    assert.equal(params.mode, 'payment'); assert.equal(params.line_items[0].quantity, 1)
    assert.equal(price.currency, expected.currency); assert.equal(price.unit_amount, expected.amount_total)
    assert.equal(params.metadata.pack_credits, expected.metadata.pack_credits)
    assert.equal(params.metadata.pack, sku); assert.equal(params.metadata.supabase_user_id, UID)
    assert.equal(params.metadata.browser_session_id, 'browser-offline')
    assert.ok(!('recurring' in price)); assert.ok(!('subscription_data' in params)); assert.ok(!('payment_method_types' in params))
    assert.match(params.success_url, /\/checkout\/item\?session_id=/)
    assert.ok(params.success_url.includes('{CHECKOUT_SESSION_ID}'))
    assert.ok(run.events.some(([name,,meta]) => name === 'checkout_started' && meta.sku === sku && meta.stripe_session_id === 'cs_offline'))
    const again = await checkout(`pack=${sku}&price=1&credits=999999&amount=1&currency=${country === 'BR' ? 'brl' : 'usd'}`, { country }, overrides)
    assert.equal(run.keys[0], again.keys[0], 'identical request has same idempotency signature')
    cases++
  }
  for (const [query, opts, reason] of [
    ['pack=one_time_unknown', {}, 'invalid_one_time_item'],
    ['pack=one_time_ad', { noMigration: true }, 'grant_unavailable'],
    ['pack=one_time_ad', { noProfile: true }, 'profile_unavailable'],
    ['pack=one_time_ad', { profileError: true }, 'profile_unavailable'],
    [`pack=one_time_ad&order=${ORDER}`, { foreignOrder: true }, 'order_unavailable'],
    ['pack=one_time_ad&order=invalid', {}, 'invalid_order'],
    [`pack=one_time_film35&order=${ORDER}`, {}, 'invalid_order'],
  ]) {
    const run = await checkout(query, opts, overrides)
    assert.equal(run.calls.length, 0, 'blocked before Stripe: ' + reason)
    assert.ok(run.events.some(([name,,meta]) => name === 'checkout_failed' && meta.reason === reason), reason)
    cases++
  }
  const anon = await checkout('pack=one_time_ad&surface=ads_choice', { anon: true }, overrides)
  assert.equal(anon.calls.length, 0); assert.match(anon.result.location, /\/login\?/)
  assert.match(decodeURIComponent(anon.result.location), /pack=one_time_ad.*surface=ads_choice.*resumed=1/)
  const loop = await checkout('pack=one_time_ad&resumed=1', { anon: true }, overrides)
  assert.match(loop.result.location, /checkout_error=/)
  const owned = await checkout(`pack=one_time_ad&surface=ads_choice&order=${ORDER}`, {}, overrides)
  assert.match(owned.calls[0].success_url, /\/checkout\/item/); assert.equal(owned.calls[0].metadata.order_id, ORDER)
  const retry = await checkout('pack=one_time_ad', { currencyRetry: true }, overrides)
  assert.equal(retry.calls.length, 2); assert.equal(retry.calls[1].customer_email, 'auth@example.invalid')
  assert.equal(retry.keys[1], retry.keys[0] + ':email'); assert.ok(!('customer' in retry.calls[1]))
  const err = await checkout('pack=one_time_ad', { stripeError: true }, overrides)
  assert.ok(!JSON.stringify(err).includes('private provider detail'))
  const pt = await checkout('pack=one_time_ad', { country: 'US', language: 'pt-BR' }, overrides)
  assert.equal(pt.calls[0].line_items[0].price_data.currency, 'brl')
  const off = await checkout('pack=one_time_ad', {}, { ...overrides, 'lib/oneTimeItem.ts': source('lib/oneTimeItem.ts').replace('ONE_TIME_ITEMS_LIVE = true', 'ONE_TIME_ITEMS_LIVE = false') })
  assert.equal(off.calls.length, 0)
  const adsOff = await checkout('pack=one_time_ad', {}, { ...overrides, 'lib/ads/offer.ts': source('lib/ads/offer.ts').replace('ADS_PASS_LIVE_IN_CODE = true', 'ADS_PASS_LIVE_IN_CODE = false') })
  assert.equal(adsOff.calls.length, 0)
  for (const [file, before, after] of [
    ['lib/checkoutPricing.ts', 'ONE_TIME_ITEM_USD_MINOR = { one_time_ad: 900', 'ONE_TIME_ITEM_USD_MINOR = { one_time_ad: 901'],
    ['lib/settlementCurrency.ts', 'BRL_PER_USD_HOUSE = 5.0', 'BRL_PER_USD_HOUSE = 6.0'],
  ]) {
    const changed = { ...overrides, [file]: source(file).replace(before, after) }
    const current = await checkout('pack=one_time_ad', {}, changed)
    assert.equal(current.calls.length, 0, 'new sale closes on contract drift')
    let grant = false
    assert.equal(await current.load(FULFILL).fulfillOneTimeItem({ rpc: async () => { grant = true; return { data: true } } }, paidSession()), true)
    assert.ok(grant, 'old paid V1 remains fulfillable after price/currency repricing')
  }
  const load = createOfflineLoader({ source: (file, text) => overrides[file] ?? text })
  const M = load(FULFILL), rpcCalls = []
  const admin = { rpc: async (name, args) => { rpcCalls.push(plain({ name, args })); return { data: true, error: null } } }
  for (const sku of ['one_time_ad', 'one_time_film35']) for (const currency of ['usd', 'brl']) {
    assert.equal(await M.fulfillOneTimeItem(admin, paidSession(sku, currency)), true)
    assert.equal(rpcCalls.at(-1).name, 'fulfill_one_time_item')
    assert.equal(rpcCalls.at(-1).args.p_credits, sku === 'one_time_ad' ? 41 : 21)
    cases++
  }
  const dup = { rpc: async () => ({ data: false, error: null }) }
  assert.equal(await M.fulfillOneTimeItem(dup, paidSession()), false)
  for (const mutation of [
    s => { s.payment_status = 'unpaid' }, s => { s.payment_status = 'no_payment_required' }, s => { s.mode = 'subscription' },
    s => { s.amount_total = 1 }, s => { s.currency = 'eur' }, s => { s.metadata.pack_credits = '999999' },
    s => { s.metadata.one_time_item_version = 'invalid' }, s => { s.metadata.pack = 'one_time_unknown' },
    s => { delete s.metadata.supabase_user_id }, s => { s.client_reference_id = 'other-user' }, s => { s.metadata.order_id = 'bad' },
  ]) {
    const s = paidSession(); mutation(s); const before = rpcCalls.length
    await assert.rejects(() => M.fulfillOneTimeItem(admin, s)); assert.equal(rpcCalls.length, before, 'invalid contract never reaches grant')
    cases++
  }
  for (const result of [{ data: true, error: { code: 'offline' } }, { data: null, error: null }]) await assert.rejects(() => M.fulfillOneTimeItem({ rpc: async () => result }, paidSession()))
  assert.equal(M.isOneTimeItemSession(paidSession()), true)
  assert.equal(M.isOneTimeItemSession({ metadata: { pack: 'one_time_unknown' } }), true)
  assert.equal(M.isOneTimeItemSession({ metadata: { pack: 'kit_bf' } }), false)
  return cases + 9
}
const total = await proofs()
console.log(`PASS compra avulsa: ${total} executable checkout/fulfillment contracts`)
if (process.argv.includes('--mutants')) {
  const mutants = [
    [CHECKOUT, "mode: 'payment',\n    line_items", "mode: 'subscription',\n    line_items"],
    [CHECKOUT, 'unit_amount: amount, product_data', 'unit_amount: 1, product_data'],
    [CHECKOUT, 'if (probes.some(probe => probe.error))', 'if (false && probes.some(probe => probe.error))'],
    [CHECKOUT, 'quantity: 1 }]', 'quantity: 2 }]'],
    [CHECKOUT, "await deps.recordCheckoutEvent('checkout_started'", "await deps.recordCheckoutEvent('checkout_attempted'"],
    [FULFILL, "session.payment_status !== 'paid'", 'false'],
    [FULFILL, "session.metadata?.pack_credits !== String(credits)", 'false'],
    [FULFILL, 'session.amount_total !== oneTimeItemV1Amount(sku, currency)', 'false'],
    [FULFILL, "p_credits: credits", 'p_credits: credits + 1'],
    [FULFILL, 'if (result.error || typeof result.data', 'if (false || typeof result.data'],
  ]
  for (const [file, before, after] of mutants) {
    assert.ok(source(file).includes(before), 'mutation anchor: ' + before)
    await assert.rejects(() => proofs({ [file]: source(file).replace(before, after) }), 'must kill ' + before)
    console.log('KILLED', before)
  }
}
