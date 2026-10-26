// KINEO-PAYPAL-IDEMPOTENCIA-2026-09-07 — offline regression of the real grants,
// shared journal and BOTH delivery routes. A rejected write may retry; an
// unknown outcome must retain its claim so redelivery cannot duplicate money.
// The former paypal_events claim/release helpers were replaced by this journal.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve, dirname, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import crypto from 'node:crypto'
import vm from 'node:vm'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const ts = createRequire(resolve(root, 'package.json'))('typescript')
const USER = '11111111-1111-4111-8111-111111111111'
const OTHER = '22222222-2222-4222-8222-222222222222'
const clone = value => value == null ? value : JSON.parse(JSON.stringify(value))
let checks = 0
const eq = (actual, expected, name) => { assert.equal(actual, expected, name); checks++ }
const ok = (actual, name) => { assert.ok(actual, name); checks++ }
const rejects = async (promise, pattern, name) => { await assert.rejects(promise, pattern, name); checks++ }
class Reply extends Response {
  static json(body, options = {}) { return new Reply(JSON.stringify(body), { status: 200, ...options }) }
  static redirect(url) { return new Reply(null, { status: 307, headers: { location: String(url) } }) }
}

function fixture(replacements = {}) {
  const tables = {
    profiles: [{ id: USER, email: 'outside@example.invalid', video_credits: 7,
      updated_at: '2026-10-06T00:00:00Z', plan: 'free' }],
    events: [], paypal_events: [],
  }
  const state = { tables, failures: [], operations: [], attempts: 0, signature: true, gate: null }
  let version = 0
  const property = (row, key) => key === 'metadata->>state' ? row.metadata?.state : row[key]
  const db = { from(table) {
    assert.ok(Object.hasOwn(tables, table), 'unapproved table ' + table)
    let operation = 'select', payload, single = false
    const filters = []
    const query = {
      select() { return query },
      insert(value) { operation = 'insert'; payload = value; return query },
      update(value) { operation = 'update'; payload = value; return query },
      eq(key, value) { filters.push(row => property(row, key) === value); return query },
      is(key, value) { filters.push(row => (property(row, key) ?? null) === value); return query },
      maybeSingle() { single = true; return execute() },
      then(onDone, onError) { return execute().then(onDone, onError) },
    }
    async function execute() {
      const context = { table, operation, payload, filters }
      state.operations.push({ table, operation, payload: clone(payload) })
      const failureIndex = state.failures.findIndex(failure => failure.when(context))
      const failure = failureIndex < 0 ? null : state.failures.splice(failureIndex, 1)[0]
      const fail = () => {
        if (failure.throw) throw failure.throw
        return { data: null, error: { code: '08006', ...failure.error } }
      }
      if (failure && !failure.afterCommit) return fail()
      let rows = tables[table].filter(row => filters.every(filter => filter(row)))
      if (operation === 'insert') {
        const row = clone(payload)
        if (row.id != null && tables[table].some(existing => existing.id === row.id)) return { data: null, error: { code: '23505' } }
        row.id ??= `synthetic-${table}-${tables[table].length}`
        tables[table].push(row); rows = [row]
      } else if (operation === 'update') {
        for (const row of rows) {
          Object.assign(row, clone(payload))
          if (table === 'profiles') row.updated_at = new Date(Date.UTC(2026, 9, 7) + ++version).toISOString()
        }
      }
      if (failure) return fail()
      return { data: clone(single ? rows[0] ?? null : rows), error: null }
    }
    return query
  } }
  const modules = { '@supabase/supabase-js': { createClient() { throw new Error('Real database clients are forbidden') } } }
  const cache = new Map(), logs = []
  function load(file) {
    const absolute = resolve(root, file)
    const key = relative(root, absolute).split(sep).join('/')
    if (Object.hasOwn(modules, key)) return modules[key]
    if (cache.has(key)) return cache.get(key).exports
    assert.ok(!key.startsWith('..') && !key.split('/').some(part => /^\.env(?:\.|$)/i.test(part)), 'only repository source may load')
    let source = readFileSync(absolute, 'utf8')
    if (replacements[key]) source = replacements[key](source)
    const code = ts.transpileModule(source, { fileName: absolute, compilerOptions: {
      module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true,
    } }).outputText
    const module = { exports: {} }
    cache.set(key, module)
    vm.runInNewContext(code, {
      module, exports: module.exports,
      require(id) {
        if (Object.hasOwn(modules, id)) return modules[id]
        if (id === 'next/server') return { NextResponse: Reply }
        if (id === 'node:crypto') return crypto
        if (id.startsWith('@/lib/')) return load(id.slice(2) + '.ts')
        if (id.startsWith('.')) return load(resolve(dirname(absolute), id + '.ts'))
        throw new Error('Unapproved import ' + id)
      },
      process: { env: {} }, Buffer, URL, Headers, Request, Response, Date, Error, Promise,
      fetch() { throw new Error('Provider network is forbidden') },
      console: { log(...args) { logs.push(args) }, error(...args) { logs.push(args) }, warn(...args) { logs.push(args) } },
    }, { filename: absolute, timeout: 5000 })
    return module.exports
  }
  const shared = load('lib/payments/alternative.ts')
  const paypal = load('lib/paypal.ts')
  const grant = async fn => {
    state.attempts++
    if (state.gate) { state.gate.entered(); await state.gate.wait }
    return fn()
  }
  // Only transport boundaries are mocked. Grant arithmetic, profile CAS,
  // journal transitions, provider fulfillment and route handlers remain real.
  modules['lib/paypal.ts'] = {
    ...paypal,
    paypalAdminClient: () => db,
    verifyPaypalWebhook: async () => state.signature,
    tierFromPlanId: async () => ({ tier: 'basic', billing: 'monthly' }),
    grantPackCredits: (...args) => grant(() => paypal.grantPackCredits(...args)),
    activateSubscription: (...args) => grant(() => paypal.activateSubscription(...args)),
    paypalFetch: async path => {
      if (path.includes('/payments/captures/')) return { id: 'CAP-1', status: 'COMPLETED', custom_id: USER,
        amount: { currency_code: 'USD', value: paypal.PAYPAL_PACK.usd },
        supplementary_data: { related_ids: { order_id: 'ORDER-1' } } }
      if (path.includes('/checkout/orders/')) return { id: 'ORDER-1', status: 'COMPLETED',
        purchase_units: [{ payments: { captures: [{ id: 'CAP-1' }] } }] }
      if (path.includes('/payments/sale/')) return { id: path.split('/').at(-1), state: 'completed',
        billing_agreement_id: 'SUB-1', amount: { total: paypal.PAYPAL_TIER_USD.basic.monthly, currency: 'USD' } }
      if (path.includes('/subscriptions/')) return { id: 'SUB-1', custom_id: USER, status: 'ACTIVE', plan_id: 'PLAN-1' }
      throw new Error('Unexpected offline provider path ' + path)
    },
  }
  const webhook = load('app/api/paypal/webhook/route.ts')
  const returned = load('app/api/paypal/return/route.ts')
  function post(type = 'PAYMENT.CAPTURE.COMPLETED', eventId = 'EVT-1', resource = { id: 'CAP-1' }) {
    return webhook.POST(new Request('https://example.invalid/api/paypal/webhook', { method: 'POST',
      body: JSON.stringify({ id: eventId, event_type: type, resource }) }))
  }
  const get = (flow = 'pack') => returned.GET({ nextUrl: new URL('https://example.invalid/api/paypal/return?' +
    (flow === 'pack' ? 'flow=pack&token=ORDER-1' : 'flow=sub&subscription_id=SUB-1')) })
  const journal = () => tables.events.find(row => row.name === 'alternative_payment_grant')
  const named = name => tables.events.filter(row => row.name === name)
  return { db, state, shared, paypal, post, get, journal, named, logs,
    balance: () => tables.profiles[0]?.video_credits,
    grantWrites: () => state.operations.filter(row => row.table === 'profiles' && row.operation === 'update').length }
}

async function scenario(rule, replacements = {}) {
  const h = fixture(replacements), packBalance = 7 + h.paypal.PAYPAL_PACK.credits
  if (rule === 'delivery') {
    eq((await h.get()).status, 307, 'return delivers a settled capture')
    eq(h.balance(), packBalance, 'return grants the actual canonical pack')
    eq((await h.post()).status, 200, 'webhook recovers the same purchase after return')
    eq((await h.post()).status, 200, 'same webhook event is acknowledged')
    eq((await h.post('PAYMENT.CAPTURE.COMPLETED', 'EVT-2')).status, 200, 'new notification of same purchase is acknowledged')
    eq(h.state.attempts, 1, 'one purchase grants exactly once across both routes and event IDs')
    eq(h.balance(), packBalance, 'redelivery preserves the delivered balance')
    eq(h.named('payment_success').length, 1, 'purchase has one attributed success')
    eq(h.named('payment_success')[0].user_id, USER, 'success belongs to the paying account')
    eq(h.state.tables.paypal_events.length, 1, 'duplicate order uses unique purchase identity')
    eq(h.journal().metadata.state, 'granted', 'successful claim is confirmed after the grant')
    eq(h.named('alternative_payment_processed').length, 2, 'each completed notification may be marked after delivery')
  } else if (rule === 'safe-retry') {
    h.state.failures.push({ when: c => c.table === 'profiles' && c.operation === 'update', error: { code: '23514' } })
    eq((await h.post()).status, 500, 'a rejected grant requests webhook redelivery')
    eq(h.balance(), 7, 'SQL rejection leaves the previous balance intact')
    eq(h.journal().metadata.state, 'pending', 'known unapplied grant releases its claim for retry')
    eq(h.named('alternative_payment_processed').length, 0, 'failed event is never marked processed')
    eq(h.state.tables.paypal_events.length, 0, 'failed grant is never marked as fulfilled order')
    ok(h.logs.some(args => args.join(' ').includes('payment_webhook_failed')), 'failed delivery remains observable')
    eq((await h.get()).status, 307, 'return can recover a grant rejected in the webhook')
    eq(h.balance(), packBalance, 'safe recovery delivers once')
    eq((await h.post()).status, 200, 'original notification can finish after return recovery')
    eq(h.balance(), packBalance, 'finishing notification cannot grant twice')
  } else if (rule === 'unknown-outcome') {
    h.state.failures.push({ when: c => c.table === 'profiles' && c.operation === 'update', afterCommit: true })
    eq((await h.post()).status, 500, 'unknown outcome is never silently acknowledged')
    eq(h.balance(), packBalance, 'fixture models a committed grant with a lost response')
    eq(h.journal().metadata.state, 'applying', 'unknown outcome retains the claim')
    eq((await h.get()).status, 500, 'return cannot repeat an uncertain webhook grant')
    eq((await h.post()).status, 500, 'webhook cannot repeat its own uncertain grant')
    eq(h.state.attempts, 1, 'unknown outcome does not make another grant attempt')
    eq(h.balance(), packBalance, 'unknown-outcome redelivery cannot duplicate credits')
    eq(h.named('alternative_payment_processed').length, 0, 'uncertain event still requests reconciliation')
  } else if (rule === 'confirmation') {
    h.state.failures.push({ when: c => c.table === 'events' && c.operation === 'update' && c.payload.metadata.state === 'granted' })
    eq((await h.post()).status, 500, 'failure confirming the grant requests reconciliation')
    eq(h.balance(), packBalance, 'grant already happened before confirmation failure')
    eq(h.journal().metadata.state, 'applying', 'failed post-grant confirmation retains claim')
    eq((await h.get()).status, 500, 'other route cannot regrant after failed confirmation')
    eq(h.state.attempts, 1, 'failed confirmation never causes a second grant')
  } else if (rule === 'order-retry') {
    h.state.failures.push({ when: c => c.table === 'paypal_events' && c.operation === 'insert' })
    eq((await h.post()).status, 500, 'failed order write requests redelivery')
    eq(h.journal().metadata.state, 'granted', 'successful grant remains confirmed when order write fails')
    eq(h.named('payment_success').length, 0, 'success waits until order persistence succeeds')
    eq((await h.get()).status, 307, 'return can complete the failed order write')
    eq(h.state.attempts, 1, 'order recovery never repeats the grant')
    eq(h.balance(), packBalance, 'order recovery preserves credits')
    eq(h.state.tables.paypal_events.length, 1, 'order recovery writes the missing purchase')
  } else if (rule === 'concurrency') {
    let enter, release
    const entered = new Promise(done => { enter = done })
    h.state.gate = { entered: enter, wait: new Promise(done => { release = done }) }
    const pending = h.post()
    await entered
    eq(h.journal().metadata.state, 'applying', 'first delivery acquires before granting')
    eq((await h.get()).status, 500, 'concurrent return cannot acquire webhook claim')
    release()
    eq((await pending).status, 200, 'claim owner completes normally')
    h.state.gate = null
    eq((await h.get()).status, 307, 'losing route may safely retry after owner finishes')
    eq(h.state.attempts, 1, 'concurrent routes execute exactly one grant')
    eq(h.balance(), packBalance, 'concurrent routes deliver one pack')
  } else throw new Error('Unknown test scenario ' + rule)
  return h
}

for (const rule of ['delivery', 'safe-retry', 'unknown-outcome', 'confirmation', 'order-retry', 'concurrency']) {
  await scenario(rule)
  console.log('OK — ' + rule)
}

// Failure of the claim store cannot become permission to grant. Both a read
// failure and a rejected INSERT must fail closed, including missing tables.
for (const operation of ['select', 'insert']) {
  const h = fixture()
  h.state.failures.push({ when: c => c.table === 'events' && c.operation === operation, error: { code: '42P01' } })
  eq((await h.post()).status, 500, 'missing journal table fails closed on ' + operation)
  eq(h.state.attempts, 0, 'journal ' + operation + ' failure permits no grant')
  eq(h.balance(), 7, 'journal ' + operation + ' failure preserves balance')
  eq(h.named('alternative_payment_processed').length, 0, 'journal failure is not processed')
}

{
  const h = fixture()
  h.state.failures.push({ when: c => c.table === 'profiles' && c.operation === 'update', error: { code: '23514' } })
  eq((await h.get()).status, 500, 'return also surfaces a rejected grant')
  eq(h.journal().metadata.state, 'pending', 'return safely releases an unapplied grant')
  eq((await h.post()).status, 200, 'webhook can recover the failed return grant')
  eq(h.balance(), 7 + h.paypal.PAYPAL_PACK.credits, 'webhook backup delivers the missing pack once')
}
{
  const h = fixture()
  h.state.failures.push({ when: c => c.table === 'events' && c.operation === 'insert' && c.payload.name === 'alternative_payment_processed' })
  eq((await h.post()).status, 500, 'failed notification mark asks for redelivery')
  eq(h.journal().metadata.state, 'granted', 'notification-mark failure does not forget the grant')
  eq((await h.post()).status, 200, 'notification mark can recover')
  eq(h.state.attempts, 1, 'notification-mark recovery does not grant again')
  eq(h.named('alternative_payment_processed').length, 1, 'recovered event is marked once')
}
{
  const h = fixture()
  let enter, release, attempts = 0
  const entered = new Promise(done => { enter = done })
  const wait = new Promise(done => { release = done })
  const deliver = eventId => h.shared.fulfillAlternativePayment({ db: h.db, provider: 'paypal',
    userId: USER, paymentId: 'capture:SIMULTANEOUS', eventId, metadata: {},
    grant: async () => { attempts++; enter(); await wait; await h.paypal.grantPackCredits(h.db, USER, 10) },
    recordOrder: () => h.shared.recordAlternativeOrder(h.db, 'paypal_events', { id: 'capture:SIMULTANEOUS' }),
  })
  // Start both before any claim exists: exercise unique INSERT and the atomic
  // pending->applying comparison, not only the already-applying early exit.
  const resultsPromise = Promise.allSettled([deliver('RACE-1'), deliver('RACE-2')])
  await entered
  release()
  const results = await resultsPromise
  eq(results.filter(result => result.status === 'fulfilled').length, 1, 'simultaneous new claims have one winner')
  eq(results.filter(result => result.status === 'rejected').length, 1, 'simultaneous claim loser requests retry')
  eq(attempts, 1, 'claim CAS allows only one grant callback')
  eq(h.balance(), 17, 'simultaneous claim delivers one allowance')
  eq(h.named('alternative_payment_grant').length, 1, 'unique journal identity survives simultaneous insertion')
}

// All three real grant functions must surface read/write failures. A failed
// profile read must not become a zero balance and overwrite existing credit.
for (const method of ['grantPackCredits', 'activateSubscription', 'renewSubscriptionCredits']) {
  const invoke = h => method === 'grantPackCredits' ? h.paypal[method](h.db, USER, 10) :
    h.paypal[method](h.db, USER, 'basic', 'SUB-1')
  for (const operation of ['select', 'update']) {
    const h = fixture()
    h.state.failures.push({ when: c => c.table === 'profiles' && c.operation === operation, error: { code: '23514' } })
    await rejects(invoke(h), /payment_profile_unavailable|grant_rejected/, method + ' surfaces ' + operation + ' rejection')
    eq(h.balance(), 7, method + ' failed ' + operation + ' preserves existing balance')
    if (operation === 'select') eq(h.grantWrites(), 0, method + ' does not write after failed read')
  }
  const h = fixture()
  h.state.tables.profiles.length = 0
  await rejects(invoke(h), /payment_profile_unavailable/, method + ' rejects a missing profile')
  eq(h.grantWrites(), 0, method + ' does not invent a profile or fallback grant')
}

{
  const h = fixture()
  const results = await Promise.allSettled([
    h.paypal.grantPackCredits(h.db, USER, 10), h.paypal.grantPackCredits(h.db, USER, 10),
  ])
  eq(results.filter(result => result.status === 'fulfilled').length, 1, 'profile CAS has one winner')
  eq(results.filter(result => result.status === 'rejected').length, 1, 'stale profile CAS must retry')
  eq(h.balance(), 17, 'profile CAS prevents concurrent stale overwrites')
}
{
  const h = fixture()
  await h.shared.reversePayment(h.db, 'paypal', 'capture:CAP-1', 'REFUND-1')
  eq((await h.post('PAYMENT.CAPTURE.COMPLETED', 'LATE-APPROVAL')).status, 200, 'reversed purchase notification is acknowledged')
  eq((await h.get()).status, 500, 'return reports a reversed purchase instead of success')
  eq(h.state.attempts, 0, 'different event ID cannot revive a refunded purchase')
  eq(h.balance(), 7, 'reversal prevents entitlement mutation')
}
{
  const h = fixture()
  h.state.tables.events.push({ id: h.shared.paymentEventId('paypal', 'grant:capture:CAP-1'),
    name: 'alternative_payment_grant', user_id: OTHER, metadata: { state: 'pending' } })
  eq((await h.post()).status, 500, 'purchase claim belonging to another user is rejected')
  eq(h.state.attempts, 0, 'mismatched claim cannot grant to a different account')
}
{
  const h = fixture()
  eq((await h.post('BILLING.SUBSCRIPTION.ACTIVATED', 'ACT-1', { id: 'SUB-1' })).status, 200, 'activation alone is acknowledged')
  eq(h.state.attempts, 0, 'activation notification without a settled sale never grants')
  eq((await h.get('sub')).status, 307, 'subscription return directs buyer to pending success')
  eq(h.state.attempts, 0, 'subscription return does not trust query tier or grant')
  eq((await h.post('PAYMENT.SALE.COMPLETED', 'SALE-EVENT-1', { id: 'SALE-1' })).status, 200, 'settled sale activates subscription')
  eq(h.balance(), 7 + h.paypal.PAYPAL_PLAN_CREDITS.basic, 'subscription grants canonical allowance')
  eq((await h.post('PAYMENT.SALE.COMPLETED', 'SALE-EVENT-2', { id: 'SALE-1' })).status, 200, 'sale duplicate is acknowledged')
  eq(h.state.attempts, 1, 'same settled sale never grants twice')
  eq((await h.post('UNHANDLED.EVENT', 'UNKNOWN-1')).status, 200, 'unhandled valid event stays successful')
  h.state.signature = false
  eq((await h.post()).status, 401, 'invalid signature remains rejected')
}

// Mutations change only in-memory source. Each must fail its intended behavior,
// proving that the fixtures detect loss/duplication rather than import success.
const baselineChecks = checks
const replace = (source, before, after) => {
  assert.equal(source.split(before).length - 1, 1, 'mutation target exists exactly once')
  return source.replace(before, after)
}
const sharedPath = 'lib/payments/alternative.ts'
const mutants = [
  ['concessão omitida', 'delivery', 'return grants the actual canonical pack', sharedPath,
    'await args.grant()', '/* grant omitted */'],
  ['falha conhecida não libera', 'safe-retry', 'known unapplied grant releases its claim', sharedPath,
    'if (error instanceof GrantNotAppliedError)', 'if (false)'],
  ['falha desconhecida libera', 'unknown-outcome', 'unknown outcome retains the claim', sharedPath,
    'if (error instanceof GrantNotAppliedError)', 'if (true)'],
  ['erro do webhook vira 200', 'safe-retry', 'a rejected grant requests webhook redelivery', 'app/api/paypal/webhook/route.ts',
    '{ status: 500 }', '{ status: 200 }'],
  ['erro do retorno vira 200', 'unknown-outcome', 'return cannot repeat an uncertain webhook grant', 'app/api/paypal/return/route.ts',
    '{ status: 500 }', '{ status: 200 }'],
]
for (const [name, rule, reason, file, before, after] of mutants) {
  let rejection
  try { await scenario(rule, { [file]: source => replace(source, before, after) }) } catch (error) { rejection = error }
  assert.equal(rejection?.code, 'ERR_ASSERTION', name + ' must fail behaviorally')
  assert.ok(rejection.message.includes(reason), name + ' must fail the intended assertion: ' + rejection.message)
  console.log('MUTANTE MORTO — ' + name)
}
checks = baselineChecks
console.log(`PayPal idempotência: ${checks} verificações passaram; ${mutants.length} mutantes mortos; sem rede, .env ou banco real.`)
