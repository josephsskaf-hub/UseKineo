// Execute actual upgrade and debit-confirmation code with only database/start boundaries in memory.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { pathToFileURL } from 'node:url'
import ts from 'typescript'
import { createOfflineLoader } from './offline-ts-loader.mjs'
import { createEscolhaWorld, escolhaFixture } from '../test-ads-escolha-2310.mjs'

const FILE = 'lib/ads/cena/escolhaSampleUpgrade.ts', USER = { id: '10000000-0000-4000-8000-000000000001', email: 'external@example.org' }
const GEN = '10000000-0000-4000-8000-000000000077', clone = x => JSON.parse(JSON.stringify(x))
const reply = (body, status = 200) => ({ status, ok: status >= 200 && status < 300, json: async () => clone(body) })
function actualBilling() {
  const text = fs.readFileSync('lib/ads/v2Billing.ts', 'utf8'), ast = ts.createSourceFile('billing.ts', text, ts.ScriptTarget.Latest, true)
  const code = ast.statements.filter(n => ts.isFunctionDeclaration(n) && ['adsV2BillingRef', 'confirmAdsV2Debit'].includes(n.name?.text)).map(n => n.getText(ast)).join('\n')
  const module = { exports: {} }
  new Function('exports', 'ADS_V2_BILLING_PREFIX', 'UUID_RE', ts.transpileModule(code, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText)(module.exports, 'adsv2-', /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
  return module.exports
}
let immutableFixture
async function fixture() {
  if (immutableFixture) return clone(immutableFixture)
  const server = `export async function escolhaSampleAccountOk(){return true} export async function reserveEscolhaSample(){return {ok:true}} export async function hasEscolhaSampleReservation(){return true} export async function markEscolhaSampleUpsell(){return true}`
  const w = createEscolhaWorld({ 'lib/ads/cena/escolhaSampleServer.ts': server }, { current: true, user: USER, ownerId: USER.id, reason: 'none', plan: 'free', balance: 41 })
  const p = await w.post({ ...escolhaFixture(), sample: true }, false)
  assert.equal(p.status, 201)
  let previews
  for (let n = 0; n < 5; n++) { previews = await w.post({ stage: 'stills', order_id: p.body.order_id }, false); if (previews.body.stage === 'choose') break }
  assert.equal(previews.body.stills.length, 2)
  assert.equal((await w.post({ stage: 'render', order_id: p.body.order_id, still_id: previews.body.stills[1].id }, false)).status, 202)
  const order = w.tables.ads_v2_orders[0]
  order.status = 'delivered'
  immutableFixture = clone(order)
  return clone(order)
}
async function world(over = {}, options = {}) {
  const original = await fixture(), billing = actualBilling(), starts = [], inserts = [], reads = []
  const tables = { ads_v2_orders: [], profiles: [{ id: USER.id, video_credits: options.balance ?? 41 }], credit_debits: [] }
  const admin = { from(table) {
    const filters = []; let insert
    const q = { select() { return q }, eq(k, value) { filters.push(row => row[k] === value); return q }, insert(row) { insert = clone(row); return q }, async maybeSingle() {
      if (insert) {
        if (tables[table].some(row => row.id === insert.id)) return { data: null, error: { code: '23505' } }
        tables[table].push(insert); inserts.push(clone(insert)); return { data: { id: insert.id }, error: null }
      }
      reads.push(table)
      if (table === 'credit_debits' && options.ledgerError) return { data: null, error: { code: 'offline_unavailable' } }
      return { data: clone(tables[table].find(row => filters.every(f => f(row))) ?? null), error: null }
    } }; return q
  } }
  const load = createOfflineLoader({
    mocks: { '../v2Billing': billing, './escolhaSampleServer': { hasEscolhaSampleReservation: async () => true, markEscolhaSampleUpsell: async () => true }, 'next/server': { NextResponse: { json: (b, init = {}) => reply(b, init.status ?? 200) } } },
    source: (p, text) => over[p] ?? text,
  })
  const upgrade = load(FILE), full = load('lib/ads/cena/escolhaPlan.ts').fullEscolhaPlan
  function fail(id, opts = {}) {
    const row = tables.ads_v2_orders.find(r => r.id === id) ?? { id, user_id: USER.id, plan: { ...clone(original.plan), cena: { ...clone(original.plan.cena), plan: full(original.plan.cena.plan) }, escolhaSampleSource: original.id } }
    Object.assign(row, { status: opts.status ?? 'failed', generation_id: GEN, billing_ref: billing.adsV2BillingRef(id, GEN), credits_charged: 41, video_id: null, assembly_lease_at: '2026-10-24T12:00:00Z' })
    if (!tables.ads_v2_orders.includes(row)) tables.ads_v2_orders.push(row)
    const debit = { render_id: row.billing_ref, user_id: opts.foreign ? 'someone-else' : USER.id, amount: opts.amount ?? 41, refunded_at: opts.refunded === false ? null : '2026-10-24T12:01:00Z' }
    tables.credit_debits = tables.credit_debits.filter(d => d.render_id !== row.billing_ref)
    if (!opts.missing) tables.credit_debits.push(debit)
    return row
  }
  const first = fail(upgrade.escolhaUpgradeId(original.id), options)
  const deps = { admin, json() { assert.fail('retry cannot ask for another GPT plan') }, escolhaEffects() { assert.fail('retry cannot generate additional photos') }, async start(id) {
    starts.push(id)
    const row = tables.ads_v2_orders.find(row => row.id === id)
    assert.ok(row, 'start targets a persisted order')
    if (!['draft', 'planned'].includes(row.status)) return reply({ error: 'not_startable', status: row.status }, 409)
    assert.ok(tables.profiles[0].video_credits >= 41, 'the existing start/debit boundary still requires sufficient balance')
    row.status = 'generating'; row.generation_id = GEN; row.billing_ref = billing.adsV2BillingRef(id, GEN); row.credits_charged = 41
    tables.profiles[0].video_credits -= 41
    tables.credit_debits.push({ render_id: row.billing_ref, user_id: USER.id, amount: 41, refunded_at: null })
    return reply({ order_id: id, status: 'generating' }, 202)
  } }
  return { run: () => upgrade.upgradeEscolhaSample(USER, original, original.plan, deps), upgrade, tables, starts, inserts, reads, original, first, fail }
}

export async function runAdsSampleUpgradeRetry2410(over = {}) {
  const w = await world(over), immutable = clone(w.first)
  const responses = await Promise.all([w.run(), w.run()]), bodies = await Promise.all(responses.map(r => r.json()))
  assert.ok(responses.every(r => r.status === 202), 'both concurrent retry clicks resolve to the existing atomic start winner')
  assert.equal(bodies[0].order_id, bodies[1].order_id, 'concurrent callers derive the same successor')
  const nextId = bodies[0].order_id, next = w.tables.ads_v2_orders.find(row => row.id === nextId)
  assert.notEqual(nextId, w.first.id, 'refunded failure gets a new order ID and billing key')
  assert.deepEqual(clone(w.first), immutable, 'failed order, lease, generation and billing key remain immutable')
  assert.equal(w.inserts.length, 1); assert.equal(w.tables.credit_debits.filter(d => !d.refunded_at).length, 1, 'one new debit exists despite concurrent clicks')
  assert.equal(next.plan.cena.keyframe, w.original.plan.cena.keyframe)
  assert.deepEqual(next.plan.cena.keyframes, [w.original.plan.cena.keyframe, w.original.plan.cena.keyframe])
  assert.equal(next.plan.cena.plan.input.foto, w.original.plan.cena.plan.input.foto)
  assert.equal(next.plan.cena.plan.escolha.presenterId, w.original.plan.cena.plan.escolha.presenterId)
  assert.equal(next.plan.cena.plan.escolha.scenarioId, w.original.plan.cena.plan.escolha.scenarioId)
  assert.equal(next.plan.cena.plan.escolha.sample, undefined)
  assert.equal(next.seconds, 15); assert.equal(next.credits_charged, 41)
  const before = w.starts.length
  assert.equal((await (await w.run()).json()).order_id, nextId)
  next.status = 'delivered'
  assert.equal((await (await w.run()).json()).order_id, nextId)
  assert.equal(w.starts.length, before, 'active and delivered successor replays do not restart or debit')
  for (const options of [{ refunded: false }, { amount: 40 }, { foreign: true }, { missing: true }, { ledgerError: true }]) {
    const bad = await world(over, options)
    assert.equal((await bad.run()).status, 503, 'unconfirmed, missing, foreign or non-exact refund fails closed')
    assert.equal(bad.inserts.length, 0); assert.equal(bad.starts.length, 0)
  }
  for (const mutation of [{ video_id: 'existing-video' }, { generation_id: null }, { billing_ref: 'unrelated-debit' }, { credits_charged: 40 }, { plan: { escolhaSampleSource: 'foreign-sample' } }]) {
    const corrupt = await world(over); Object.assign(corrupt.first, mutation)
    assert.equal((await corrupt.run()).status, 503, 'inconsistent predecessor metadata cannot authorize a new charge')
    assert.equal(corrupt.inserts.length, 0); assert.equal(corrupt.starts.length, 0)
  }
  const short = await world(over, { balance: 40 })
  assert.equal((await short.run()).status, 402, 'confirmed refund does not waive the 41-credit balance requirement')
  assert.equal(short.inserts.length, 0)
  const cancelled = await world(over, { status: 'cancelled' })
  assert.equal((await cancelled.run()).status, 202, 'a cancelled generation is retryable only after its exact debit was refunded')
  const chain = await world(over)
  let cursor = chain.first
  for (let n = 0; n < 9; n++) {
    const next = chain.upgrade.escolhaUpgradeId(`retry:${cursor.id}:${cursor.generation_id}:${cursor.billing_ref}`)
    cursor = chain.fail(next)
  }
  assert.equal((await chain.run()).status, 503, 'long histories stop at the bounded read limit')
  assert.equal(chain.inserts.length, 0); assert.equal(chain.starts.length, 0)
  return true
}

export async function runAdsSampleUpgradeRetryMutants2410() {
  const source = fs.readFileSync(FILE, 'utf8').replace(/\r\n/g, '\n'), cases = [
    ['unrefunded debit accepted', '!debit.ok || !debit.refunded', 'false'],
    ['original failed ID reused', 'id = escolhaUpgradeId(`retry:${previous.id}:${previous.generation_id}:${previous.billing_ref}`)', 'id = escolhaUpgradeId(order.id)'],
    ['retry identity differs per click', 'id = escolhaUpgradeId(`retry:${previous.id}:${previous.generation_id}:${previous.billing_ref}`)', 'id = escolhaUpgradeId(`retry:${previous.id}:${Math.random()}`)'],
    ['history bound removed', 'depth >= 8', 'depth >= 80'],
    ['race winner not returned', 'if (response.status === 409)', 'if (false)'],
    ['balance guard removed', 'balance < needed', 'balance < 0'],
    ['selected reference changed', 'paid.cena.keyframe = chosen.url;', "paid.cena.keyframe = 'https://offline.invalid/another-photo.jpg';"],
  ]
  const killed = []
  for (const [label, from, to] of cases) {
    assert.equal(source.split(from).length, 2, 'unique retry mutant target: ' + label)
    let failure
    try { await runAdsSampleUpgradeRetry2410({ [FILE]: source.replace(from, to) }) } catch (error) { failure = error }
    assert.equal(failure?.code, 'ERR_ASSERTION', 'mutant must fail an assertion, not setup/import/syntax: ' + label + ': ' + failure?.stack)
    killed.push(label)
  }
  return killed
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await runAdsSampleUpgradeRetry2410()
  const killed = await runAdsSampleUpgradeRetryMutants2410()
  console.log(`PASS paid sample retry: immutable refunded predecessor, same reference, concurrent/replay, closed ledger and bounded chain; ${killed.length} assertion-killed mutants`)
}
