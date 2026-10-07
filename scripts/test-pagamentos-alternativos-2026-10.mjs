// Offline contract guardian: executes the real routes and fulfillment journal.
// All credentials are synthetic; no .env reads, provider network or production DB.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve, dirname, relative, sep } from 'node:path'
import { createRequire } from 'node:module'
import vm from 'node:vm'
import crypto from 'node:crypto'

const repoRoot = process.cwd()
const ts = createRequire(resolve(repoRoot, 'package.json'))('typescript')
const USER = '11111111-1111-4111-8111-111111111111'
const EMAIL = 'outside@example.invalid'
const env = {
  NEXT_PUBLIC_SUPABASE_URL: 'https://database.example.invalid',
  SUPABASE_SERVICE_ROLE_KEY: 'synthetic-offline-key',
  PAYPAL_CLIENT_ID: 'synthetic-client', PAYPAL_CLIENT_SECRET: 'synthetic-secret',
  PAYPAL_WEBHOOK_ID: 'WH-offline', MP_WEBHOOK_SECRET: 'synthetic-mp-secret',
  MP_ACCESS_TOKEN: 'synthetic-mp-token', HOTMART_HOTTOK: 'synthetic-hottok',
}
let checks = 0
const eq = (actual, expected, message) => { assert.deepEqual(actual, expected, message); checks++ }
const ok = (actual, message) => { assert.ok(actual, message); checks++ }
const clone = value => value == null ? value : JSON.parse(JSON.stringify(value))
class Reply extends Response {
  static json(body, options = {}) { return new Reply(JSON.stringify(body), { status: 200, ...options }) }
  static redirect(url, options = {}) { return new Reply(null, { status: 307, ...options, headers: { location: String(url) } }) }
}

// No alias resolver: only explicit relative imports and an allowlist of modules.
function loader({ modules = {}, replacements = {}, environment = env, fetcher, logs = [] } = {}) {
  const cache = new Map()
  const builtins = { 'next/server': { NextResponse: Reply }, 'node:crypto': crypto, crypto, ...modules }
  function load(file) {
    const absolute = resolve(repoRoot, file)
    const key = relative(repoRoot, absolute).split(sep).join('/')
    if (Object.hasOwn(modules, key)) return modules[key]
    if (cache.has(absolute)) return cache.get(absolute).exports
    assert.ok(!key.startsWith('..') && !key.includes('.env'), 'sandbox refuses external/environment source')
    let source = readFileSync(absolute, 'utf8')
    if (replacements[key]) source = replacements[key](source)
    const code = ts.transpileModule(source, {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
      fileName: absolute,
    }).outputText
    const module = { exports: {} }
    cache.set(absolute, module)
    vm.runInNewContext(code, {
      module, exports: module.exports,
      require(id) {
        if (Object.hasOwn(builtins, id)) return builtins[id]
        if (id.startsWith('.')) return load(resolve(dirname(absolute), /\.[cm]?[jt]sx?$/.test(id) ? id : id + '.ts'))
        throw new Error('Unapproved import: ' + id)
      },
      process: { env: { ...environment } }, Buffer, URL, URLSearchParams, Headers, Request, Response,
      Date, Error, Set, Map, Promise, JSON, setTimeout, clearTimeout,
      fetch: fetcher ?? (() => { throw new Error('Network is forbidden in this guardian') }),
      console: { log(...args) { logs.push(args) }, error(...args) { logs.push(args) }, warn(...args) { logs.push(args) } },
    }, { filename: absolute, timeout: 5000 })
    return module.exports
  }
  return load
}

function fakeDatabase() {
  const tables = {
    profiles: [{ id: USER, email: EMAIL, video_credits: 7, updated_at: '2026-10-06T00:00:00Z', plan: 'free' }],
    events: [], mp_payments: [], hotmart_payments: [], paypal_events: [], paypal_config: [],
  }
  const state = { accesses: 0, writes: [], failures: [], tables }
  let profileUpdateSequence = 0
  const primaryKey = table => ({ mp_payments: 'payment_id', hotmart_payments: 'transaction', paypal_config: 'key' })[table] ?? 'id'
  const property = (row, key) => key === 'metadata->>state' ? row.metadata?.state : row[key]
  const db = { from(table) {
    state.accesses++
    assert.ok(Object.hasOwn(tables, table), 'unexpected table ' + table)
    let operation = 'select', payload, options = {}, single = false
    const filters = []
    const query = {
      select(_columns, nextOptions = {}) { options = nextOptions; return query },
      insert(row) { operation = 'insert'; payload = row; return query },
      update(row) { operation = 'update'; payload = row; return query },
      delete() { operation = 'delete'; return query },
      eq(key, value) { filters.push(row => property(row, key) === value); return query },
      is(key, value) { filters.push(row => (property(row, key) ?? null) === value); return query },
      like(key, value) { const regex = new RegExp('^' + value.split('%').join('.*') + '$'); filters.push(row => regex.test(String(property(row, key)))); return query },
      in(key, values) { filters.push(row => values.includes(property(row, key))); return query },
      maybeSingle() { single = true; return execute() },
      single() { single = true; return execute() },
      then(onDone, onError) { return execute().then(onDone, onError) },
    }
    async function execute() {
      const context = { table, operation, payload, filters }
      const failureIndex = state.failures.findIndex(failure => failure.when(context))
      if (failureIndex >= 0) {
        const failure = state.failures.splice(failureIndex, 1)[0]
        if (failure.throw) throw failure.throw
        return { data: null, error: { code: '08006', message: 'synthetic failure', ...failure.error }, count: null }
      }
      let rows = tables[table].filter(row => filters.every(filter => filter(row)))
      if (operation === 'insert') {
        const row = clone(payload), key = primaryKey(table)
        if (row[key] != null && tables[table].some(existing => existing[key] === row[key])) return { data: null, error: { code: '23505' } }
        row[key] ??= `synthetic-${table}-${tables[table].length}`
        tables[table].push(row); rows = [row]
      } else if (operation === 'update') {
        for (const row of rows) {
          Object.assign(row, clone(payload))
          // Model the profile updated_at trigger: even a same-balance UPDATE
          // changes the version used by the production optimistic lock.
          if (table === 'profiles') row.updated_at = new Date(Date.UTC(2026, 9, 7) + ++profileUpdateSequence).toISOString()
        }
      } else if (operation === 'delete') {
        tables[table] = tables[table].filter(row => !rows.includes(row))
      }
      if (operation !== 'select') state.writes.push({ table, operation, payload: clone(payload) })
      return { data: options.head ? null : single ? clone(rows[0] ?? null) : clone(rows), error: null, count: rows.length }
    }
    return query
  }, rpc() { throw new Error('Unexpected RPC: no production or non-idempotent credit fallback allowed') } }
  return { db, state }
}

function routeHarness(provider, { replacements = {}, grantFailure, signature = true } = {}) {
  const { db, state } = fakeDatabase()
  const logs = [], modules = {}
  let grants = 0, grantAttempts = 0, apiCalls = 0, clients = 0, paymentStatus = 'approved', subscriptionStatus = 'ACTIVE'
  let invalidAmount = false, providerFailure = false
  const load = loader({ modules, replacements, logs })
  const shared = load('lib/payments/alternative.ts')
  async function fakeGrant() {
    grantAttempts++
    if (grantFailure === 'known') throw new shared.GrantNotAppliedError('synthetic_grant_rejected')
    if (grantFailure === 'unknown') throw new Error('synthetic_grant_outcome_unknown')
    grants++
    state.writes.push({ table: 'FAKE_GRANT', operation: 'grant' })
  }
  modules['lib/checkoutPricing.ts'] = { PACK_PRICE_MINOR: { usd: 499 } }
  modules['lib/payments/alternative.ts'] = { ...shared, grantAlternativePack: fakeGrant }
  modules['@supabase/supabase-js'] = { createClient() { clients++; return db } }
  // loader snapshots builtin modules on creation, so create it again below.
  modules['lib/paypal.ts'] = {
    paypalAdminClient() { clients++; return db },
    verifyPaypalWebhook: async () => signature,
    paypalFetch: async path => {
      apiCalls++
      if (providerFailure) throw new Error('synthetic_provider_outage')
      if (path.includes('/payments/sale/')) return { id: path.split('/').at(-1), state: paymentStatus === 'approved' ? 'completed' : 'refunded', billing_agreement_id: 'SUB-1', amount: { total: '15.00', currency: 'USD' } }
      if (path.includes('/subscriptions/')) return { id: 'SUB-1', custom_id: USER, status: subscriptionStatus, plan_id: 'PLAN-1', billing_info: { cycle_executions: [{ tenure_type: 'REGULAR', cycles_completed: 1 }] } }
      if (path.includes('/captures/')) return { id: 'CAP-1', status: paymentStatus === 'approved' ? 'COMPLETED' : 'REFUNDED', custom_id: USER, amount: { value: invalidAmount ? '0.01' : '4.99', currency_code: 'USD' }, supplementary_data: { related_ids: { order_id: 'ORDER-1' } } }
      return { id: 'ORDER-1', status: 'COMPLETED', purchase_units: [{ custom_id: USER, payments: { captures: [{ id: 'CAP-1', status: 'COMPLETED', amount: { value: '4.99', currency_code: 'USD' } }] } }] }
    },
    tierFromPlanId: async () => ({ tier: 'basic', billing: 'monthly' }),
    grantPackCredits: fakeGrant, activateSubscription: async () => { await fakeGrant(); state.tables.profiles[0].paypal_subscription_id = 'SUB-1' }, renewSubscriptionCredits: fakeGrant,
    PAYPAL_PACK: { credits: 19, usd: '4.99' }, PAYPAL_PLAN_CREDITS: { basic: 90 },
    PAYPAL_TIER_USD: { basic: { monthly: '15.00', annual: '108.00' } },
  }
  modules['lib/mercadopago.ts'] = {
    verifyMpWebhook: () => signature,
    getMpPayment: async () => { apiCalls++; if (providerFailure) throw new Error('synthetic_provider_outage'); return { id: 'MP-1', status: paymentStatus, externalReference: USER + ':br50', amount: invalidAmount ? 0.01 : 50, currency: 'BRL', currencyId: 'BRL' } },
    MP_PACKS: { br50: { credits: 90, brl: 50, title: 'synthetic pack' } },
  }
  modules['lib/hotmart.ts'] = {
    verifyHottok: () => signature, creditsForBRL: value => value > 0 ? 90 : 0,
    HOTMART_APPROVED_EVENTS: new Set(['PURCHASE_APPROVED', 'PURCHASE_COMPLETE']),
    HOTMART_REVERSED_EVENTS: new Set(['PURCHASE_REFUNDED', 'PURCHASE_CHARGEBACK', 'PURCHASE_CANCELED']),
  }
  const finalLoad = loader({ modules, replacements, logs })
  const mod = finalLoad(`app/api/${provider}/webhook/route.ts`)
  const orderTable = { paypal: 'paypal_events', mercadopago: 'mp_payments', hotmart: 'hotmart_payments' }[provider]
  function request(kind = 'paid', eventId = 'EVT-1') {
    const reversed = kind === 'refund'
    const body = provider === 'paypal' ? {
      id: eventId, event_type: reversed ? 'PAYMENT.CAPTURE.REFUNDED' : 'PAYMENT.CAPTURE.COMPLETED',
      resource: { id: reversed ? 'REFUND-1' : 'CAP-1', custom_id: USER, status: reversed ? 'REFUNDED' : 'COMPLETED',
        amount: { value: '4.99', currency_code: 'USD' }, supplementary_data: { related_ids: { order_id: 'ORDER-1', capture_id: 'CAP-1' } },
        links: [{ rel: 'up', href: 'https://api-m.paypal.com/v2/payments/captures/CAP-1' }] },
    } : provider === 'mercadopago' ? {
      id: eventId, type: 'payment', action: 'payment.updated', data: { id: 'MP-1' },
    } : {
      id: eventId, event: reversed ? 'PURCHASE_REFUNDED' : 'PURCHASE_APPROVED',
      data: { buyer: { email: EMAIL }, purchase: { transaction: 'TX-1', status: reversed ? 'REFUNDED' : 'APPROVED', price: { value: 50, currency_value: 'BRL' } } },
    }
    const url = new URL(`https://example.invalid/api/${provider}/webhook`)
    if (provider === 'mercadopago') { url.searchParams.set('data.id', 'MP-1'); url.searchParams.set('type', 'payment') }
    const req = new Request(url, { method: 'POST', body: JSON.stringify(body), headers: { 'content-type': 'application/json', 'x-hotmart-hottok': env.HOTMART_HOTTOK, 'x-request-id': eventId } })
    req.nextUrl = url
    return req
  }
  return {
    mod, shared, state, logs, orderTable, request,
    get grants() { return grants }, get grantAttempts() { return grantAttempts },
    get apiCalls() { return apiCalls }, get clients() { return clients },
    set grantFailure(value) { grantFailure = value },
    set paymentStatus(value) { paymentStatus = value }, set subscriptionStatus(value) { subscriptionStatus = value },
    set invalidAmount(value) { invalidAmount = value }, set providerFailure(value) { providerFailure = value },
    successes: () => state.tables.events.filter(row => row.name === 'payment_success'),
    processed: () => state.tables.events.filter(row => row.name === 'alternative_payment_processed'),
    failures: () => state.tables.events.filter(row => row.name === 'payment_webhook_failed'),
    orders: () => state.tables[orderTable],
    post: (kind, id) => mod.POST(request(kind, id)),
    returnRoute: () => finalLoad('app/api/paypal/return/route.ts'),
  }
}

async function scenario(provider, rule, replacements = {}) {
  const h = routeHarness(provider, { replacements, ...(rule === 'invalid-origin' ? { signature: false } : {}) })
  if (rule === 'invalid-origin') {
    eq((await h.post()).status, 401, provider + ': invalid origin rejected')
    eq(h.state.accesses, 0, provider + ': invalid origin never touches DB')
    eq(h.clients, 0, provider + ': invalid origin never opens privileged client')
    eq(h.grants, 0, provider + ': invalid origin never grants')
  } else if (rule === 'new-payment') {
    eq((await h.post()).status, 200, provider + ': new payment accepted')
    eq(h.grants, 1, provider + ': new payment grants exactly once')
    eq(h.successes().length, 1, provider + ': one server payment_success')
    eq(h.successes()[0].user_id, USER, provider + ': success attributed to customer')
    eq(h.processed().length, 1, provider + ': event processed after fulfillment')
    const grantAt = h.state.writes.findIndex(row => row.table === 'FAKE_GRANT')
    const orderAt = h.state.writes.findIndex(row => row.table === h.orderTable)
    ok(grantAt >= 0 && orderAt > grantAt, provider + ': grant precedes order marker')
  } else if (rule === 'duplicate') {
    eq((await h.post()).status, 200, provider + ': initial delivery')
    eq((await h.post()).status, 200, provider + ': same-event redelivery returns 200')
    eq(h.grants, 1, provider + ': redelivery does not grant again')
    eq((await h.post('paid', 'EVT-2')).status, 200, provider + ': second notification for same purchase')
    eq(h.grants, 1, provider + ': purchase dedupe also survives distinct event IDs')
    eq(h.successes().length, 1, provider + ': duplicate success event suppressed')
  } else if (rule === 'grant-failure') {
    h.grantFailure = 'known'
    eq((await h.post()).status, 500, provider + ': grant failure asks for retry')
    eq(h.orders().length, 0, provider + ': failed grant does not record processed order')
    eq(h.processed().length, 0, provider + ': failed grant does not mark event processed')
    eq(h.successes().length, 0, provider + ': failed grant has no false success')
    ok(h.failures().some(row => row.metadata.reason), provider + ': grant failure has server reason')
    h.grantFailure = null
    eq((await h.post()).status, 200, provider + ': safe failed grant retries')
    eq(h.grants, 1, provider + ': retry fulfills once')
  } else if (rule === 'reversal') {
    h.paymentStatus = 'refunded'
    eq((await h.post('refund', 'REFUND-EVT')).status, 200, provider + ': refund accepted first')
    h.paymentStatus = 'approved'
    eq((await h.post('paid', 'PAID-EVT')).status, 200, provider + ': delayed payment acknowledged')
    eq(h.grants, 0, provider + ': delayed approval never revives refunded payment')
    eq(h.successes().length, 0, provider + ': refund-before-payment has no false revenue')
  }
}

const providers = ['paypal', 'mercadopago', 'hotmart']
const rules = ['new-payment', 'duplicate', 'grant-failure', 'reversal', 'invalid-origin']
for (const provider of providers) {
  for (const rule of rules) await scenario(provider, rule)
  console.log(`PASS ${provider}: novo, reenvio, falha no grant, reembolso antes do pagamento, origem invalida`)
}

// Recovery windows: every failure gets a 500, and durable grant confirmation
// allows replay of order / success / processed writes without another grant.
for (const provider of providers) {
  for (const stage of ['read', 'order', 'success', 'processed']) {
    const h = routeHarness(provider)
    h.state.failures.push({ when: ({ table, operation, payload }) =>
      stage === 'read' ? table === 'events' && operation === 'select' :
      stage === 'order' ? table === h.orderTable && operation === 'insert' :
      table === 'events' && operation === 'insert' && payload.name === (stage === 'success' ? 'payment_success' : 'alternative_payment_processed') })
    eq((await h.post()).status, 500, `${provider}: ${stage} failure cannot be acknowledged`)
    eq(h.processed().length, 0, `${provider}: ${stage} failure has no processed event`)
    ok(h.failures().length > 0, `${provider}: ${stage} failure is observable`)
    eq((await h.post()).status, 200, `${provider}: ${stage} failure recovers on redelivery`)
    eq(h.grants, 1, `${provider}: ${stage} recovery never double grants`)
    eq(h.successes().length, 1, `${provider}: ${stage} recovery yields one success`)
  }
  const uncertain = routeHarness(provider, { grantFailure: 'unknown' })
  eq((await uncertain.post()).status, 500, provider + ': unknown grant outcome asks for reconciliation')
  uncertain.grantFailure = null
  eq((await uncertain.post()).status, 500, provider + ': ambiguous outcome remains unacknowledged')
  eq(uncertain.grantAttempts, 1, provider + ': ambiguous outcome is never blindly granted again')
  eq(uncertain.orders().length, 0, provider + ': ambiguous outcome has no processed order')

  const confirmation = routeHarness(provider)
  confirmation.state.failures.push({ when: ({ table, operation, payload }) => table === 'events' && operation === 'update' && payload.metadata?.state === 'granted' })
  eq((await confirmation.post()).status, 500, provider + ': failed grant confirmation is surfaced')
  eq((await confirmation.post()).status, 500, provider + ': confirmation ambiguity is retained')
  eq(confirmation.grants, 1, provider + ': confirmation ambiguity cannot double grant')
  eq(confirmation.orders().length, 0, provider + ': no processed order before durable confirmation')

  const concurrent = routeHarness(provider)
  const responses = await Promise.all([concurrent.post(), concurrent.post()])
  ok(responses.some(response => response.status === 200), provider + ': one concurrent request finishes')
  ok(responses.every(response => [200, 500].includes(response.status)), provider + ': concurrent loser is safe retry')
  eq(concurrent.grants, 1, provider + ': concurrent deliveries grant once')
  eq((await concurrent.post()).status, 200, provider + ': concurrent retry becomes duplicate')
  eq(concurrent.grants, 1, provider + ': concurrency recovery still grants once')
}

// The production pack helper is also executed against the fake profile store.
{
  const { db, state } = fakeDatabase()
  const shared = loader()('lib/payments/alternative.ts')
  await shared.grantAlternativePack(db, USER, 11)
  eq(state.tables.profiles[0].video_credits, 18, 'real pack helper adds to the existing balance')
  eq(state.tables.profiles[0].has_paid, true, 'real pack helper marks paying customer')
  state.failures.push({ when: ({ table, operation }) => table === 'profiles' && operation === 'update', error: { code: '23514' } })
  await assert.rejects(shared.grantAlternativePack(db, USER, 11), shared.GrantNotAppliedError)
  checks++
  eq(state.tables.profiles[0].video_credits, 18, 'rejected real profile write changes no balance')
  state.failures.push({ when: ({ table, operation }) => table === 'profiles' && operation === 'update' })
  await assert.rejects(shared.grantAlternativePack(db, USER, 11), error => !(error instanceof shared.GrantNotAppliedError))
  checks++
}

function paypalRequest(eventType, resource, id) {
  const request = new Request('https://example.invalid/api/paypal/webhook', { method: 'POST', body: JSON.stringify({ id, event_type: eventType, resource }) })
  request.nextUrl = new URL(request.url)
  return request
}
function paypalReturnRequest(flow = 'pack') {
  return { nextUrl: new URL(`https://example.invalid/api/paypal/return?flow=${flow}&token=ORDER-1&subscription_id=SUB-1&tier=pro`) }
}
for (const returnFirst of [true, false]) {
  const h = routeHarness('paypal'), ret = h.returnRoute()
  if (returnFirst) {
    eq((await ret.GET(paypalReturnRequest())).status, 307, 'PayPal: return delivers and redirects')
    eq((await h.post()).status, 200, 'PayPal: webhook backs up return')
  } else {
    eq((await h.post()).status, 200, 'PayPal: webhook delivers before return')
    eq((await ret.GET(paypalReturnRequest())).status, 307, 'PayPal: later return redirects')
  }
  eq(h.grants, 1, 'PayPal: return and webhook share capture idempotency')
  eq(h.successes().length, 1, 'PayPal: return and webhook record one success')
}
{
  const h = routeHarness('paypal', { grantFailure: 'known' })
  eq((await h.returnRoute().GET(paypalReturnRequest())).status, 500, 'PayPal: return grant failure is explicit')
  eq(h.orders().length, 0, 'PayPal: failed return does not poison webhook backup')
  h.grantFailure = null
  eq((await h.post()).status, 200, 'PayPal: webhook repairs known return failure')
  eq(h.grants, 1, 'PayPal: backup delivery grants once')
}
{
  const h = routeHarness('paypal')
  const activation = paypalRequest('BILLING.SUBSCRIPTION.ACTIVATED', { id: 'SUB-1', custom_id: USER, plan_id: 'PLAN-1' }, 'ACT-1')
  eq((await h.mod.POST(activation)).status, 200, 'PayPal: activation event accepted')
  eq(h.grants, 0, 'PayPal: activation alone is not settled money')
  eq((await h.returnRoute().GET(paypalReturnRequest('sub'))).status, 307, 'PayPal: subscription return waits for payment')
  eq(h.grants, 0, 'PayPal: URL tier cannot grant a subscription')
  for (const id of ['SALE-1', 'SALE-1', 'SALE-2']) {
    eq((await h.mod.POST(paypalRequest('PAYMENT.SALE.COMPLETED', { id }, 'EVENT-' + id))).status, 200, 'PayPal: paid sale handled')
  }
  eq(h.grants, 2, 'PayPal: first paid sale and one renewal deliver once each')
  eq(h.successes().length, 2, 'PayPal: two distinct settled sales have two success events')
}
{
  const h = routeHarness('paypal')
  h.subscriptionStatus = 'CANCELLED'
  eq((await h.mod.POST(paypalRequest('BILLING.SUBSCRIPTION.CANCELLED', { id: 'SUB-1' }, 'CANCEL-1'))).status, 200, 'PayPal: cancellation recorded before first sale')
  eq((await h.mod.POST(paypalRequest('PAYMENT.SALE.COMPLETED', { id: 'SALE-1' }, 'SALE-EVENT-1'))).status, 200, 'PayPal: delayed sale acknowledged after cancellation')
  eq(h.grants, 0, 'PayPal: cancellation cannot be undone by delayed sale')
}

// Actual authentication helpers, with synthetic keys and provider HTTP mocks.
{
  const mp = loader()('lib/mercadopago.ts')
  const timestamp = '1791244800', requestId = 'REQ-OFFLINE', resource = 'AbC123'
  const digest = crypto.createHmac('sha256', env.MP_WEBHOOK_SECRET)
    .update(`id:${resource.toLowerCase()};request-id:${requestId};ts:${timestamp};`).digest('hex')
  const headers = new Headers({ 'x-request-id': requestId, 'x-signature': `ts=${timestamp},v1=${digest}` })
  const params = new URLSearchParams({ 'data.id': resource })
  eq(mp.verifyMpWebhook(headers, params), true, 'MP: actual HMAC accepts the official lowercase manifest')
  eq(mp.verifyMpWebhook(headers, new URLSearchParams({ 'data.id': 'other' })), false, 'MP: changed signed resource rejected')
  eq(mp.verifyMpWebhook(new Headers({ 'x-request-id': 'other', 'x-signature': headers.get('x-signature') }), params), false, 'MP: changed request ID rejected')
  for (const signature of [`ts=${timestamp},v1=00`, `ts=${timestamp},v1=${digest},v1=${digest}`, `ts=bad,v1=${digest}`, '']) {
    eq(mp.verifyMpWebhook(new Headers({ 'x-request-id': requestId, 'x-signature': signature }), params), false, 'MP: malformed signature rejected')
  }
  eq(loader({ environment: {} })('lib/mercadopago.ts').verifyMpWebhook(headers, params), false, 'MP: missing configuration fails closed')
  const hotmart = loader()('lib/hotmart.ts')
  eq(hotmart.verifyHottok(env.HOTMART_HOTTOK), true, 'Hotmart: actual token comparison accepts configured token')
  for (const token of [null, '', 'invalid', 'synthetic-hottok-changed']) eq(hotmart.verifyHottok(token), false, 'Hotmart: missing or wrong token rejected')
  eq(loader({ environment: {} })('lib/hotmart.ts').verifyHottok(env.HOTMART_HOTTOK), false, 'Hotmart: missing configuration fails closed')
}
{
  const requests = []
  let verification = 'SUCCESS', transportFailure = false
  const pricing = {
    TIER_PRICES: { starter: { usd: 700 }, basic: { usd: 1500 }, pro: { usd: 2900 } },
    ANNUAL_PRICES: { starter: { usd: 5040 }, basic: { usd: 10800 }, pro: { usd: 20880 } },
    TIER_CREDITS: { starter: 40, basic: 90, pro: 180 }, PACK_CREDITS: { starter: 19 }, PACK_PRICE_MINOR: { usd: 499 },
  }
  const modules = { 'lib/checkoutPricing.ts': pricing, '@supabase/supabase-js': { createClient() { throw new Error('Signature must never open a DB client') } } }
  const paypal = loader({ modules, fetcher: async (url, options) => {
    requests.push({ url, options })
    if (url.endsWith('/v1/oauth2/token')) return Reply.json({ access_token: 'synthetic-access-token', expires_in: 3600 })
    assert.ok(url.endsWith('/v1/notifications/verify-webhook-signature'), 'only official PayPal verification endpoint')
    if (transportFailure) return new Response('synthetic provider outage', { status: 503 })
    return Reply.json({ verification_status: verification })
  } })('lib/paypal.ts')
  const headers = new Headers({ 'paypal-auth-algo': 'SHA256withRSA', 'paypal-cert-url': 'https://api.paypal.com/synthetic-certificate',
    'paypal-transmission-id': 'T-1', 'paypal-transmission-sig': 'synthetic-signature', 'paypal-transmission-time': '2026-10-06T00:00:00Z' })
  const rawBody = '{"id":"EVT-SIGNATURE","amount":1.00}'
  eq(await paypal.verifyPaypalWebhook(headers, rawBody), true, 'PayPal: official verifier SUCCESS accepted')
  ok(requests.at(-1).options.body.includes('"webhook_event":' + rawBody), 'PayPal: raw event JSON survives verification envelope')
  eq(JSON.parse(requests.at(-1).options.body).webhook_id, env.PAYPAL_WEBHOOK_ID, 'PayPal: verifier uses configured webhook identity')
  verification = 'FAILURE'
  eq(await paypal.verifyPaypalWebhook(headers, rawBody), false, 'PayPal: official verifier FAILURE rejected')
  const count = requests.length
  eq(await paypal.verifyPaypalWebhook(new Headers(), rawBody), false, 'PayPal: missing headers rejected before provider')
  eq(requests.length, count, 'PayPal: missing headers invoke no provider request')
  verification = 'UNKNOWN'
  await assert.rejects(paypal.verifyPaypalWebhook(headers, rawBody), /paypal_verification_invalid_response/); checks++
  transportFailure = true
  await assert.rejects(paypal.verifyPaypalWebhook(headers, rawBody), /paypal_verification_unavailable/); checks++
  const missingConfig = loader({ modules, environment: {} })('lib/paypal.ts')
  await assert.rejects(missingConfig.verifyPaypalWebhook(headers, rawBody), /paypal_webhook_id_missing/); checks++

  const { db, state } = fakeDatabase()
  const activations = await Promise.allSettled([
    paypal.activateSubscription(db, USER, 'basic', 'SUB-1'),
    paypal.activateSubscription(db, USER, 'basic', 'SUB-1'),
  ])
  eq(activations.filter(result => result.status === 'fulfilled').length, 1, 'PayPal: only one competing initial snapshot commits')
  eq(activations.filter(result => result.status === 'rejected').length, 1, 'PayPal: concurrent stale activation retries')
  await paypal.activateSubscription(db, USER, 'basic', 'SUB-1')
  eq(state.tables.profiles[0].video_credits, 97, 'PayPal: real activation retry does not add a second allowance')
  eq(state.tables.profiles[0].plan, 'basic', 'PayPal: real activation sets verified plan')
  const sameBalanceRenewals = await Promise.allSettled([
    paypal.activateSubscription(db, USER, 'basic', 'SUB-1'),
    paypal.activateSubscription(db, USER, 'basic', 'SUB-1'),
  ])
  eq(sameBalanceRenewals.filter(result => result.status === 'fulfilled').length, 1, 'PayPal: updated_at also serializes concurrent unchanged-balance renewals')
  eq(sameBalanceRenewals.filter(result => result.status === 'rejected').length, 1, 'PayPal: unchanged-balance stale version retries')
  eq(state.tables.profiles[0].video_credits, 97, 'PayPal: concurrent unchanged-balance renewals preserve balance')
  state.tables.profiles[0].video_credits = 150
  await paypal.activateSubscription(db, USER, 'basic', 'SUB-1')
  eq(state.tables.profiles[0].video_credits, 150, 'PayPal: real recurring grant preserves purchased excess')
}

{
  const h = routeHarness('hotmart')
  h.state.tables.profiles.length = 0
  eq((await h.post()).status, 500, 'Hotmart: no matching account requests redelivery')
  eq(h.orders().length, 0, 'Hotmart: missing account is never marked fulfilled')
  eq(h.grants, 0, 'Hotmart: missing account grants nothing')
  h.state.tables.profiles.push({ id: USER, email: EMAIL })
  eq((await h.post()).status, 200, 'Hotmart: delivery can recover after account exists')
  eq(h.grants, 1, 'Hotmart: recovered account receives once')
}

for (const provider of providers) {
  const h = routeHarness(provider)
  const paymentId = { paypal: 'capture:CAP-1', mercadopago: 'mp-1', hotmart: 'TX-1' }[provider]
  const reversalId = h.shared.paymentEventId(provider, `reversal:${paymentId}`)
  let reversalReads = 0
  h.state.failures.push({ when: ({ table, operation, filters }) => {
    if (table !== 'events' || operation !== 'select' || !filters.every(filter => filter({ id: reversalId }))) return false
    return ++reversalReads === 2
  } })
  eq((await h.post()).status, 500, provider + ': second reversal lookup failure is not acknowledged')
  eq(h.grantAttempts, 0, provider + ': second reversal lookup fails before grant')
  eq(h.state.tables.events.find(row => row.name === 'alternative_payment_grant')?.metadata.state, 'pending', provider + ': pregrant read failure releases pending safely')
  eq((await h.post()).status, 200, provider + ': second reversal lookup failure retries safely')
  eq(h.grants, 1, provider + ': pregrant read recovery delivers once')
}
for (const provider of ['paypal', 'mercadopago']) {
  const h = routeHarness(provider)
  h.invalidAmount = true
  eq((await h.post()).status, 500, provider + ': incorrect provider amount rejected')
  eq(h.grants, 0, provider + ': incorrect provider amount grants nothing')
  eq(h.orders().length, 0, provider + ': incorrect amount is not processed')
  h.invalidAmount = false
  h.providerFailure = true
  eq((await h.post()).status, 500, provider + ': provider lookup outage asks for retry')
  eq(h.grants, 0, provider + ': provider outage grants nothing')
  ok(h.logs.some(args => args.join(' ').includes('payment_webhook_failed')), provider + ': pre-DB provider outage has a server failure event')
  h.providerFailure = false
  eq((await h.post()).status, 200, provider + ': provider lookup can recover')
  eq(h.grants, 1, provider + ': provider recovery grants once')
}
{
  const h = routeHarness('hotmart')
  for (const price of [{ value: 0, currency_value: 'BRL' }, { value: 50, currency_value: 'USD' }]) {
    const request = h.request(), body = await request.json()
    body.data.purchase.price = price
    const changed = new Request(request.url, { method: 'POST', headers: request.headers, body: JSON.stringify(body) })
    changed.nextUrl = request.nextUrl
    eq((await h.mod.POST(changed)).status, 500, 'Hotmart: invalid amount or currency rejected')
  }
  eq(h.grants, 0, 'Hotmart: invalid value never grants')
  eq(h.orders().length, 0, 'Hotmart: invalid value never records processed order')
}
{
  const h = routeHarness('mercadopago'), request = h.request(), body = await request.json()
  body.data.id = 'UNSIGNED-ID'
  const changed = new Request(request.url, { method: 'POST', headers: request.headers, body: JSON.stringify(body) })
  changed.nextUrl = request.nextUrl
  eq((await h.mod.POST(changed)).status, 401, 'MP: body resource must match signed URL resource')
  eq(h.state.accesses, 0, 'MP: resource mismatch never touches DB')
  eq(h.apiCalls, 0, 'MP: resource mismatch never queries provider')
}
{
  const h = routeHarness('paypal')
  Object.assign(h.state.tables.profiles[0], { paypal_subscription_id: 'SUB-1', is_pro: true, plan: 'basic' })
  h.subscriptionStatus = 'SUSPENDED'
  eq((await h.mod.POST(paypalRequest('BILLING.SUBSCRIPTION.SUSPENDED', { id: 'SUB-1' }, 'SUSPEND-1'))).status, 200, 'PayPal: verified suspension revokes access')
  eq(h.state.tables.profiles[0].is_pro, false, 'PayPal: suspended profile loses access')
  eq(h.state.tables.profiles[0].paypal_subscription_id, 'SUB-1', 'PayPal: suspension retains identity for renewal on resumption')
  eq(h.state.tables.events.filter(row => row.name === 'alternative_payment_reversed').length, 0, 'PayPal: reversible suspension has no permanent refund tombstone')
  Object.assign(h.state.tables.profiles[0], { is_pro: true, plan: 'basic' })
  h.subscriptionStatus = 'ACTIVE'
  eq((await h.mod.POST(paypalRequest('BILLING.SUBSCRIPTION.SUSPENDED', { id: 'SUB-1' }, 'STALE-SUSPEND'))).status, 200, 'PayPal: stale suspension notification acknowledged')
  eq(h.state.tables.profiles[0].is_pro, true, 'PayPal: stale suspension cannot revoke currently active subscription')
}

// Setup is not invoked against PayPal. Its real GET runs with fake config,
// fake plan creation and fake HTTP; no secrets or external writes are used.
{
  const calls = [], configWrites = [], plans = []
  let configReads = 0
  const modules = { 'lib/paypal.ts': {
    paypalAdminClient: () => ({}),
    getPaypalConfig: async () => { configReads++; return null },
    setPaypalConfig: async (_db, key, value) => { configWrites.push({ key, value }) },
    ensurePlan: async (_db, tier, billing) => { plans.push({ tier, billing }); return `PLAN-${tier}-${billing}` },
    paypalFetch: async (path, options) => {
      calls.push({ path, options })
      if (!options?.method) return { id: env.PAYPAL_WEBHOOK_ID, event_types: [{ name: 'LEGACY.MANUAL.EVENT' }, { name: 'PAYMENT.CAPTURE.COMPLETED' }] }
      assert.equal(options.method, 'PATCH', 'configured setup may only PATCH existing webhook')
      return null
    },
  } }
  const setup = loader({ modules, environment: { ...env, CRON_SECRET: 'synthetic-setup-key' } })('app/api/paypal/setup/route.ts')
  for (const key of ['', '?key=wrong-key']) {
    eq((await setup.GET({ nextUrl: new URL('https://example.invalid/api/paypal/setup' + key) })).status, 401, 'PayPal setup: configured webhook requires correct key')
    eq(calls.length, 0, 'PayPal setup: unauthorized request never calls provider')
    eq(plans.length, 0, 'PayPal setup: unauthorized request never creates plans')
    eq(configWrites.length, 0, 'PayPal setup: unauthorized request never changes config')
  }
  eq(configReads, 0, 'PayPal setup: environment webhook is recognized without database fallback')
  const response = await setup.GET({ nextUrl: new URL('https://example.invalid/api/paypal/setup?key=synthetic-setup-key') })
  eq(response.status, 200, 'PayPal setup: authorized request updates fake registration')
  eq(calls.length, 2, 'PayPal setup: existing webhook is read then patched')
  eq(calls[0].path, '/v1/notifications/webhooks/' + env.PAYPAL_WEBHOOK_ID, 'PayPal setup: reads configured webhook')
  eq(calls[1].path, calls[0].path, 'PayPal setup: PATCH targets the same configured webhook')
  eq(calls[1].options.method, 'PATCH', 'PayPal setup: uses documented PATCH method')
  const patch = JSON.parse(calls[1].options.body)
  eq(patch.length, 1, 'PayPal setup: only changes event subscriptions')
  eq(patch[0].op, 'replace', 'PayPal setup: replaces event-types field')
  eq(patch[0].path, '/event_types', 'PayPal setup: uses official event-types path')
  const names = patch[0].value.map(event => event.name)
  ok(names.includes('LEGACY.MANUAL.EVENT'), 'PayPal setup: preserves manual subscriptions')
  for (const name of ['PAYMENT.CAPTURE.COMPLETED', 'PAYMENT.CAPTURE.REFUNDED', 'PAYMENT.CAPTURE.REVERSED',
    'PAYMENT.SALE.COMPLETED', 'PAYMENT.SALE.REFUNDED', 'PAYMENT.SALE.REVERSED',
    'BILLING.SUBSCRIPTION.ACTIVATED', 'BILLING.SUBSCRIPTION.CANCELLED', 'BILLING.SUBSCRIPTION.SUSPENDED', 'BILLING.SUBSCRIPTION.EXPIRED']) {
    ok(names.includes(name), 'PayPal setup: registration includes ' + name)
  }
  eq(new Set(names).size, names.length, 'PayPal setup: union deduplicates existing events')
  eq(configWrites.length, 0, 'PayPal setup: existing configured webhook is not recreated')
  eq(plans.length, 6, 'PayPal setup: existing six plan combinations remain supported')
  eq((await response.json()).webhook_id, env.PAYPAL_WEBHOOK_ID, 'PayPal setup: reports configured webhook identity')
}

function replaceExactly(source, before, after) {
  assert.equal(source.split(before).length - 1, 1, 'mutation target must occur exactly once: ' + before)
  return source.replace(before, after)
}
const sharedPath = 'lib/payments/alternative.ts'
const baselineChecks = checks
let killedMutants = 0
for (const provider of providers) {
  const routePath = `app/api/${provider}/webhook/route.ts`
  const originCondition = provider === 'paypal' ? '!await verifyPaypalWebhook(req.headers, rawBody)' :
    provider === 'mercadopago' ? '!verifyMpWebhook(req.headers, req.nextUrl.searchParams)' : "!verifyHottok(req.headers.get('x-hotmart-hottok'))"
  const mutations = [
    { name: 'sem concessao', rule: 'new-payment', reason: 'new payment grants exactly once', replacements: {
      [sharedPath]: source => replaceExactly(source, 'await args.grant()', '/* mutant: grant omitted */'),
    } },
    { name: 'reenvio concede novamente', rule: 'duplicate', reason: 'redelivery does not grant again', replacements: {
      [sharedPath]: source => replaceExactly(replaceExactly(source,
        'return !!await readEvent(db, provider, `event:${eventId}`)', 'return false'),
        "if (journal.metadata.state === 'pending') {", "if (journal.metadata.state === 'granted') await args.grant()\n  if (journal.metadata.state === 'pending') {"),
    } },
    { name: 'pedido marcado antes do grant', rule: 'grant-failure', reason: 'failed grant does not record processed order', replacements: {
      [sharedPath]: source => replaceExactly(replaceExactly(source, 'await args.recordOrder()', '/* mutant: order moved before grant */'),
        'await args.grant()', 'await args.recordOrder()\n      await args.grant()'),
    } },
    { name: 'falha engolida com 200', rule: 'grant-failure', reason: 'grant failure asks for retry', replacements: {
      [routePath]: source => replaceExactly(source, '{ status: 500 }', '{ status: 200 }'),
    } },
    { name: 'reembolso ignorado', rule: 'reversal', reason: 'delayed approval never revives refunded payment', replacements: {
      [sharedPath]: source => replaceExactly(source, 'return !!await readEvent(db, provider, `reversal:${paymentId}`)', 'return false'),
    } },
    { name: 'origem sem verificacao', rule: 'invalid-origin', reason: 'invalid origin rejected', replacements: {
      [routePath]: source => replaceExactly(source, originCondition, 'false'),
    } },
    { name: 'sucesso sem pessoa', rule: 'new-payment', reason: 'success attributed to customer', replacements: {
      [sharedPath]: source => replaceExactly(source, "'payment_success', userId, {", "'payment_success', null, {"),
    } },
  ]
  for (const mutant of mutations) {
    let rejection
    try { await scenario(provider, mutant.rule, mutant.replacements) } catch (error) { rejection = error }
    assert.equal(rejection?.code, 'ERR_ASSERTION', `${provider}: mutant ${mutant.name} must die by a behavioral assertion, not import/syntax/runtime error`)
    assert.ok(rejection.message.includes(mutant.reason), `${provider}: mutant ${mutant.name} failed the wrong assertion: ${rejection.message}`)
    killedMutants++
    console.log(`MUTANTE MORTO ${provider}: ${mutant.name}`)
  }
}
checks = baselineChecks
console.log(`Pagamentos alternativos: ${checks} verificacoes passaram; ${killedMutants} mutantes mortos; sem rede, .env, banco real ou pagamento real.`)
