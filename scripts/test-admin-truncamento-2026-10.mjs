// Guardião OFFLINE. Nenhuma credencial, rede, envio ou escrita no banco.
// As métricas abaixo são FIXTURES de regressão, não evidência de produção.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import vm from 'node:vm'
import ts from 'typescript'
import { createClient } from '@supabase/supabase-js'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const read = (path) => readFileSync(join(root, path), 'utf8').replace(/\r\n/g, '\n')
const silent = { log() {}, warn() {}, error() {} }
let passed = 0
const failed = []
async function test(name, run) {
  try { await run(); passed++; console.log('OK ' + name) }
  catch (error) { failed.push(name); console.error('FALHOU ' + name + ': ' + error.message) }
}
function load(source, dependencies = {}, globals = {}) {
  const output = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText
  const exports = {}
  vm.runInNewContext(output, {
    exports, console: silent, Date, Map, Set, URL, URLSearchParams,
    require(id) {
      if (Object.hasOwn(dependencies, id)) return dependencies[id]
      throw new Error('Dependência sem stub explícito: ' + id)
    },
    ...globals,
  }, { timeout: 5000 })
  return exports
}
const wrapperSource = read('lib/supabase/readAll.ts')
function wrapper(source = wrapperSource) {
  const warnings = [], events = []
  const api = load(source, { '../serverEvents': { writeServerEvent: async (event) => { events.push(event) } } }, {
    console: { ...silent, warn: (...args) => warnings.push(args) },
  })
  return { ...api, warnings, events }
}
const context = { route: '/admin/fixture', table: 'rows' }
const makeRows = (count) => Array.from({ length: count }, (_, i) => ({ id: String(i).padStart(6, '0'), rank: i % 2 }))

// PostgREST falso: teto silencioso de 1000, filtros reais e ordem física que
// muda a cada consulta. Só ORDER total torna OFFSET estável. A trava de chamadas
// transforma mutante sem range em falha rápida, em vez de um laço infinito.
function database(tables, options = {}) {
  const calls = [], inserts = []
  let executions = 0
  return {
    calls, inserts,
    from(table) {
      let order = [], predicates = [], bounds = null, cap = 1000, insertion = null
      const q = {
        select() { return q },
        eq(key, value) { predicates.push((r) => r[key] === value); return q },
        in(key, values) { predicates.push((r) => values.includes(r[key])); return q },
        order(key, { ascending = true } = {}) { order.push([key, ascending]); return q },
        range(from, to) { bounds = [from, to]; return q },
        limit(n) { cap = Math.min(cap, n); return q },
        insert(row) { insertion = row; return q },
        then(resolve, reject) {
          return Promise.resolve().then(() => {
            if (++executions > (options.maxCalls ?? 100)) throw new Error('Consulta em laço sem progresso')
            if (insertion) { inserts.push({ table, row: insertion }); return { data: null, error: null } }
            calls.push({ table, order: order.map((x) => [...x]), bounds })
            if (options.failTable === table && bounds?.[0] === 1000) return { data: null, error: { message: 'fixture page 2 unavailable' } }
            let rows = [...(tables[table] ?? [])].filter((r) => predicates.every((p) => p(r)))
            const missingOrder = rows.length ? order.find(([key]) => !Object.hasOwn(rows[0], key)) : null
            if (missingOrder) return { data: null, error: { code: '42703', message: `column ${table}.${missingOrder[0]} does not exist` } }
            if (options.shuffle !== false && rows.length) {
              const offset = executions * 347 % rows.length
              rows = rows.slice(offset).concat(rows.slice(0, offset))
            }
            rows.sort((a, b) => {
              for (const [key, ascending] of order) {
                const value = a[key] < b[key] ? -1 : a[key] > b[key] ? 1 : 0
                if (value) return ascending ? value : -value
              }
              return 0
            })
            const from = bounds?.[0] ?? 0
            const length = Math.min(cap, bounds ? bounds[1] - from + 1 : cap)
            return { data: rows.slice(from, from + length), error: null }
          }).then(resolve, reject)
        },
      }
      return q
    },
  }
}

async function tripwireContract(api) {
  for (const size of [999, 1001]) {
    const result = { data: makeRows(size), error: null }
    assert.equal(await api.readUnpaginated(Promise.resolve(result), context), result)
  }
  assert.equal(api.warnings.length, 0)
  assert.equal(api.events.length, 0)
  await api.readUnpaginated(Promise.resolve({ data: makeRows(1000), error: null }), context)
  assert.equal(api.warnings.length, 1)
  assert.equal(api.events.length, 1)
  assert.equal(api.events[0].name, 'admin_read_truncated')
  assert.equal(api.events[0].path, context.route)
  assert.equal(api.events[0].metadata.route, context.route)
  assert.equal(api.events[0].metadata.table, context.table)
  assert.equal(api.events[0].metadata.rows, 1000)
  assert.deepEqual(Object.keys(api.events[0].metadata).sort(), ['route', 'rows', 'table'])
}
async function paginationContract(api, count = 2500) {
  const db = database({ rows: makeRows(count) }, { maxCalls: 6 })
  const { data, error } = await api.readAll(() => db.from('rows').select('*').order('rank', { ascending: false }), context)
  assert.equal(error, null)
  assert.equal(data.length, count)
  assert.equal(new Set(data.map((r) => r.id)).size, count)
  assert.equal(db.calls.length, Math.floor(count / 1000) + 1)
  assert.deepEqual(db.calls.map((c) => c.bounds), [[0, 999], [1000, 1999], [2000, 2999]])
  assert.ok(db.calls.every((c) => JSON.stringify(c.order) === JSON.stringify([['rank', false], ['id', true]])))
  assert.equal(data[0].rank, 1)
  assert.equal(api.events.length, 0, 'página cheia normal não é leitura truncada')
  assert.equal(api.warnings.length, 0)
}
await test('tripwire: 1000 exato, rota/tabela, sem PII; 999 e 1001 não disparam', () => tripwireContract(wrapper()))
await test('2500 linhas embaralhadas, empate na ordem de negócio e id como desempate', () => paginationContract(wrapper()))
await test('2000 linhas exigem terceira página vazia para provar completude', () => paginationContract(wrapper(), 2000))
await test('erro na segunda página rejeita sem devolver resultado parcial', async () => {
  const db = database({ rows: makeRows(2500) }, { failTable: 'rows' })
  await assert.rejects(wrapper().readAll(() => db.from('rows').select('*'), context), /page 1000.*fixture page 2 unavailable/)
})
await test('chave composta funciona em tabela sem id', async () => {
  const rows = makeRows(2500).map(({ id }) => ({ user_id: id.slice(0, -1), email_kind: id.slice(-1) }))
  const db = database({ rows })
  const result = await wrapper().readAll(() => db.from('rows').select('*'), { ...context, key: ['user_id', 'email_kind'] })
  assert.equal(new Set(result.data.map((r) => r.user_id + ':' + r.email_kind)).size, 2500)
  assert.ok(db.calls.every((c) => c.order.map(([k]) => k).join(',') === 'user_id,email_kind'))
})
async function keylessContract(api) {
  for (const table of ['credit_debits', 'render_jobs', 'trial_debit_ledger', 'avatar_jobs']) {
    const key = table === 'avatar_jobs' ? 'request_id' : 'render_id'
    const rows = makeRows(2500).map(({ id }) => ({ [key]: id }))
    const db = database({ [table]: rows })
    const result = await api.readAll(() => db.from(table).select('*'), { route: '/admin/fixture', table })
    assert.equal(new Set(result.data.map((r) => r[key])).size, 2500)
    assert.ok(db.calls.every((c) => c.order.map(([k]) => k).join(',') === key))
  }
}
await test('PK real das tabelas sem id; ORDER em coluna ausente falha no mock', () => keylessContract(wrapper()))
await test('SDK Supabase real: range inclusivo, filtros, ordem original e PK chegam à URL', async () => {
  const calls = []
  const tables = {
    events: makeRows(2500).map((r) => ({ ...r, name: 'fixture', created_at: '2026-10-06T00:00:00Z' })),
    credit_debits: makeRows(1001).map(({ id }) => ({ render_id: id, refunded_at: '2026-10-06T00:00:00Z' })),
  }
  const client = createClient('https://fixture.invalid', 'OFFLINE_FIXTURE', {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: async (input, init) => {
      const url = new URL(typeof input === 'string' ? input : input.url ?? String(input))
      assert.equal(url.hostname, 'fixture.invalid')
      assert.equal(init.method, 'GET')
      const table = url.pathname.split('/').pop()
      assert.ok(Object.hasOwn(tables, table), 'nenhum endpoint fora da fixture')
      const from = Number(url.searchParams.get('offset'))
      const limit = Number(url.searchParams.get('limit'))
      assert.equal(limit, 1000, 'range inclusivo 0..999 corresponde a 1000 linhas')
      const expectedOrder = table === 'events' ? 'created_at.desc,id.asc' : 'refunded_at.desc,render_id.asc'
      assert.equal(url.searchParams.get('order'), expectedOrder)
      if (table === 'events') assert.equal(url.searchParams.get('name'), 'eq.fixture')
      calls.push({ table, from })
      return new Response(JSON.stringify(tables[table].slice(from, from + limit)), { status: 200, headers: { 'Content-Type': 'application/json' } })
    } },
  })
  const api = wrapper()
  const events = await api.readAll(() => client.from('events').select('id, created_at').eq('name', 'fixture').order('created_at', { ascending: false }), { route: '/admin/fixture', table: 'events' })
  assert.equal(events.data.length, 2500)
  const debits = await api.readAll(() => client.from('credit_debits').select('render_id, refunded_at').order('refunded_at', { ascending: false }), { route: '/admin/fixture', table: 'credit_debits' })
  assert.equal(debits.data.length, 1001)
  assert.deepEqual(calls, [{ table: 'events', from: 0 }, { table: 'events', from: 1000 }, { table: 'events', from: 2000 }, { table: 'credit_debits', from: 0 }, { table: 'credit_debits', from: 1000 }])
})

function mutate(source, before, after) {
  assert.ok(source.includes(before), 'ponto de mutação não encontrado: ' + before)
  const changed = source.replace(before, after)
  assert.notEqual(changed, source)
  return changed
}
async function kill(name, source, contract) {
  await test('mutante morto: ' + name, async () => {
    const api = wrapper(source) // erro de compilação NÃO conta como matar mutante
    let rejected = false
    try { await contract(api) } catch { rejected = true }
    assert.equal(rejected, true, 'mutante sobreviveu')
  })
}
await kill('tripwire só acima de 1000', mutate(wrapperSource, 'result.data?.length === POSTGREST_PAGE_SIZE', 'result.data?.length > POSTGREST_PAGE_SIZE'), tripwireContract)
await kill('primeira página tratada como lista completa', mutate(wrapperSource, 'data.length < POSTGREST_PAGE_SIZE', 'data.length <= POSTGREST_PAGE_SIZE'), paginationContract)
await kill('range removido', mutate(wrapperSource, 'await query.range(from, from + POSTGREST_PAGE_SIZE - 1)', 'await query'), paginationContract)
await kill('ORDER de desempate removido', mutate(wrapperSource, 'for (const key of keys) query = query.order(key, { ascending: true })', 'for (const key of []) query = query.order(key, { ascending: true })'), paginationContract)
await kill('credit_debits ordenada pela coluna id inexistente', mutate(wrapperSource, "credit_debits: ['render_id']", "credit_debits: ['id']"), keylessContract)

// Executa GET verdadeiro com dependências e rede substituídas explicitamente.
// O contato curado só existe após 1000 eventos; outros contatos não têm perfil.
const campaignPath = 'app/api/admin/send-hot-upsell/route.ts'
const campaignSource = read(campaignPath)
const fixtureEmail = campaignSource.match(/\{ email: '([^']+)', segment:/)?.[1]
assert.ok(fixtureEmail, 'fixture precisa de um alvo real do handler, sem duplicar a lista')
async function campaignRun(source, options = {}) {
  const sentRows = makeRows(1500).map((r, i) => ({ ...r, name: 'hot_upsell_sent', metadata: { email: i === 1200 ? fixtureEmail : `sent-${i}@fixture.invalid` } }))
  const db = database({ events: sentRows, profiles: [{ id: 'p1', email: fixtureEmail, has_paid: false, email_opted_out: false, plan: 'free' }] }, { shuffle: false, ...options })
  const sent = []
  const route = load(source, {
    'next/server': { NextResponse: { json: (body, init = {}) => ({ body, status: init.status ?? 200 }) } },
    '@/lib/supabase/readAll': wrapper(),
    '@/lib/supabase/server': { createClient: () => ({ auth: { getUser: async () => ({ data: { user: { email: 'josephsskaf@gmail.com' } } }) } }) },
    '@supabase/supabase-js': { createClient: () => db },
    '@/lib/emailSuppression': { emailFooterHtml: () => '', unsubscribeHeaders: () => ({}) },
    '@/lib/checkoutPricing': { PACK_CREDITS: { starter: 1 }, packPriceLabel: () => 'fixture', TIER_CREDITS: { basic: 1 }, TIER_PRICES: { basic: { usd: 1 } }, formatCheckoutMoney: () => 'fixture' },
    '@/lib/marketingPrice': { CREATOR_AI_FILMS: 1 },
  }, {
    process: { env: { RESEND_API_KEY: 'OFFLINE_FIXTURE', NEXT_PUBLIC_SUPABASE_URL: 'https://fixture.invalid', SUPABASE_SERVICE_ROLE_KEY: 'OFFLINE_FIXTURE' } },
    fetch: async (_url, request) => { sent.push(JSON.parse(request.body)); return { ok: true } },
    setTimeout: (fn) => { fn(); return 0 },
  })
  const response = await route.GET({ nextUrl: new URL('https://fixture.invalid/api/admin/send-hot-upsell?confirm=SEND') })
  return { ...response, sent, db }
}
await test('handler real: já recebeu além de 1000 não reenvia', async () => {
  const result = await campaignRun(campaignSource)
  assert.equal(result.status, 200)
  assert.equal(result.body.sent, 0)
  assert.equal(result.sent.length, 0)
  assert.equal(result.db.inserts.length, 0)
  assert.ok(result.db.calls.some((c) => c.table === 'events' && c.bounds?.[0] === 1000))
})
await test('handler real: erro na página 2 do dedupe aborta e não envia', async () => {
  const result = await campaignRun(campaignSource, { failTable: 'events' })
  assert.equal(result.status, 500)
  assert.equal(result.sent.length, 0)
  assert.equal(result.db.inserts.length, 0)
})
await test('mutante morto: dedupe do handler em consulta única reenvia', async () => {
  const file = ts.createSourceFile(campaignPath, campaignSource, ts.ScriptTarget.Latest, true)
  let query
  function visit(node) {
    if (ts.isCallExpression(node) && node.expression.getText(file) === 'readAll' && node.arguments[0]?.getText(file).includes("from('events')")) query ??= node
    ts.forEachChild(node, visit)
  }
  visit(file)
  assert.ok(query, 'chamada de dedupe readAll ausente')
  const rawQuery = query.arguments[0].body.getText(file)
  const mutant = campaignSource.slice(0, query.getStart(file)) + rawQuery + '.limit(1000)' + campaignSource.slice(query.end)
  const result = await campaignRun(mutant)
  assert.equal(result.status, 200, 'mutação precisa chegar ao envio, não falhar por stub')
  assert.equal(result.sent.length, 1, 'o guardião distingue a regressão que reenviaria')
  assert.equal(result.body.sent, 1)
})

// A página já usava paginação no baseline. Antes/depois deve manter métricas
// iguais; chamar 1000 -> 2500 de ganho atual seria falso. O terceiro cenário é
// explicitamente um mutante que recria o defeito antigo para provar sensibilidade.
const baseline = load(read('scripts/fixtures/admin-truncamento-db-7b4417ce.ts.txt'), {
  '@supabase/supabase-js': { createClient: () => { throw new Error('somente fixture') } },
})
const actualWrapper = wrapper()
const newDb = load(read('app/api/admin/_shared/db.ts'), {
  '@supabase/supabase-js': { createClient: () => { throw new Error('somente fixture') } },
  '@/lib/supabase/readAll': actualWrapper,
  '../../../../lib/supabase/readAll': actualWrapper,
})
const internal = load(read('lib/internalAccounts.ts'))
const mrr = load(read('app/api/admin/_shared/mrr.ts'), {
  '@/lib/pricing': { PLANS: { starter: { price: 10 }, basic: { price: 20 }, pro: { price: 30 }, autopilot: { price: 40 }, autopilot_lite: { price: 50 }, business: { price: 60 } } }, // KINEO-BUSINESS-84-2026-10-09 — re-ancorado: o stub de lib/pricing ganha PLANS.business (mrr.ts lê PLANS.business.price, plano novo decidido pelo fundador 09/10)
  '@/lib/stripe': { stripe: {} },
  '@/lib/settlementCurrency': { BRL_PER_USD_HOUSE: 5 },
})
const funnel = load(read('lib/admin/versaoBFunnel.ts'))
const courtesy = load(read('lib/courtesy.ts'))
const overviewSource = read('app/admin/overview/page.tsx').split('// ── UI atoms')[0] + '\nexport { loadMetrics }\n'
const fixtureNow = new Date('2026-10-06T15:00:00Z').getTime()
function metricTables() {
  const profiles = makeRows(2500).map((r, i) => ({ ...r, email: `external-${i}@fixture.invalid`, plan: i % 250 === 0 ? 'starter' : 'free', created_at: '2026-10-05T00:00:00Z', utm_source: null, video_credits: 0 }))
  profiles[0].email = 'josephsskaf@gmail.com'
  const videos = profiles.map((p) => ({ id: p.id, user_id: p.id, status: 'completed', created_at: '2026-10-05T01:00:00Z', credits_used: 1 }))
  const events = profiles.filter((p) => p.plan === 'starter').map((p) => ({ id: p.id, user_id: p.id, name: 'subscription_invoice_paid', created_at: '2026-10-05T00:00:00Z', metadata: { amount_paid: 1000, currency: 'usd', tier: 'starter', billing_reason: 'subscription_cycle', stripe_subscription_id: 'sub_' + p.id } }))
  return { profiles, videos, events }
}
async function overview(fetchAllRows, options = {}) {
  const tables = options.tables ?? metricTables()
  const db = database(tables, { shuffle: false, ...options })
  const now = options.measuredAt ? new Date(options.measuredAt).getTime() : fixtureNow
  assert.ok(Number.isFinite(now), 'measuredAt precisa de data válida')
  class SnapshotDate extends Date { constructor(...args) { super(...(args.length ? args : [now])) } static now() { return now } }
  const module = load(overviewSource, {
    '@/lib/entryPolicy': { CARD_ENTRY_TRIAL_CREDITS: 1 },
    '@/app/api/admin/_shared/db': { fetchAllRows },
    '@/lib/supabase/server': {},
    '@supabase/supabase-js': { createClient: () => db },
    '@/lib/internalAccounts': internal,
    '@/app/api/admin/_shared/mrr': { ...mrr, stripeMrrUsd: async () => null },
    '@/app/api/admin/_shared/revenue': { stripeNetRevenue: async () => null },
    '@/lib/courtesy': courtesy,
    '@/lib/courtesyStore': { loadActiveCourtesyGrants: async () => (tables.courtesy_grants ?? []).filter((r) => r.status === 'active') },
    '@/lib/admin/versaoBFunnel': funnel,
  }, { process: { env: { NEXT_PUBLIC_SUPABASE_URL: 'https://fixture.invalid', SUPABASE_SERVICE_ROLE_KEY: 'OFFLINE_FIXTURE' } }, Date: SnapshotDate })
  return module.loadMetrics()
}
await test('overview real: 3 métricas antes/depois e contraste de truncamento', async () => {
  const before = await overview(baseline.fetchAllRows)
  const after = await overview(newDb.fetchAllRows)
  const unpaged = await overview(async (db, table, columns, filter) => {
    const q = db.from(table).select(columns)
    return (await (filter ? q.in(filter.column, filter.values) : q)).data
  })
  const projection = ({ externalUsers, activatedAll, mrrPaidUsd }) => ({ externalUsers, activatedAll, mrrPaidUsd })
  assert.deepEqual(projection(before), { externalUsers: 2499, activatedAll: 2499, mrrPaidUsd: 90 })
  assert.deepEqual(projection(after), projection(before))
  assert.deepEqual(projection(unpaged), { externalUsers: 999, activatedAll: 999, mrrPaidUsd: 30 })
  console.log('FIXTURE 2026-10-06; baseline 7b4417ce / novo / mutante sem paginação: ' + JSON.stringify({ before: projection(before), after: projection(after), unpagedMutant: projection(unpaged) }))
})
await test('overview real: helper antigo deixa parcial; novo rejeita falha na página 2', async () => {
  const before = await overview(baseline.fetchAllRows, { failTable: 'profiles' })
  assert.equal(before.externalUsers, 999)
  await assert.rejects(overview(newDb.fetchAllRows, { failTable: 'profiles' }), /page 1000/)
})

const snapshotArg = process.argv.indexOf('--snapshot')
if (snapshotArg !== -1) {
  await test('snapshot de produção: mesmos dados e relógio, código antigo x novo', async () => {
    assert.ok(process.argv[snapshotArg + 1], '--snapshot precisa do caminho JSON')
    const snapshot = JSON.parse(readFileSync(process.argv[snapshotArg + 1], 'utf8'))
    assert.ok(snapshot.measuredAt, 'snapshot exige measuredAt explícito')
    const tables = snapshot.tables ?? snapshot
    for (const table of ['profiles', 'videos', 'credit_debits', 'checkout_abandoned', 'click_events', 'events', 'courtesy_grants']) {
      assert.ok(Array.isArray(tables[table]), 'snapshot incompleto: ' + table)
    }
    const options = { tables, measuredAt: snapshot.measuredAt }
    const project = ({ externalUsers, activatedAll, videos7d }) => ({ externalUsers, activatedAll, videos7d })
    const metricsBefore = await overview(baseline.fetchAllRows, options)
    const metricsAfter = await overview(newDb.fetchAllRows, options)
    const before = project(metricsBefore)
    const after = project(metricsAfter)
    assert.deepEqual(after, before)
    // Só agregados: nunca imprimir e-mails, IDs ou metadata do snapshot.
    console.log('EVIDÊNCIA DE PRODUÇÃO — replay offline loadMetrics; baseline 7b4417ce: ' + JSON.stringify({ measuredAt: snapshot.measuredAt, before, after }))
    console.log('EVIDÊNCIA DE PRODUÇÃO — leitura de credit_debits por PK real: ' + JSON.stringify({ measuredAt: snapshot.measuredAt, refunds7dBefore: metricsBefore.refunds7d, refunds7dAfter: metricsAfter.refunds7d }))
  })
}

console.log(`\n[admin-truncamento] ${passed} passaram; ${failed.length} falharam. Execução offline, sem rede ou envio.`)
if (failed.length) process.exitCode = 1
