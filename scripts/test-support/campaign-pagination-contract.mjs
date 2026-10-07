// Contratos offline compartilhados pelos três guardiões de campanhas.
// Executa o GET e readAll reais, transpila em memória e permite apenas imports
// explicitamente fornecidos. Nenhuma credencial, alias de runtime ou rede real.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import vm from 'node:vm'
import ts from 'typescript'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')
const read = (file) => readFileSync(join(root, file), 'utf8').replace(/\r\n/g, '\n')
const wrapperSource = read('lib/supabase/readAll.ts')
const NOW = Date.parse('2026-10-07T12:00:00Z')
const recent = new Date(NOW - 36 * 3600_000).toISOString()
const fresh = new Date(NOW - 3600_000).toISOString()
class FixedDate extends Date {
  constructor(...args) { super(...(args.length ? args : [NOW])) }
  static now() { return NOW }
}
const quiet = { log() {}, warn() {}, error() {} }

function load(source, dependencies = {}, globals = {}) {
  const result = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    reportDiagnostics: true,
  })
  assert.equal(result.diagnostics?.filter((d) => d.category === ts.DiagnosticCategory.Error).length, 0,
    'o módulo/mutante deve compilar; erro de sintaxe não mata mutante')
  const exports = {}
  vm.runInNewContext(result.outputText, {
    exports, console: quiet, Date: FixedDate, Map, Set, URL, URLSearchParams, Error,
    require(id) {
      if (Object.hasOwn(dependencies, id)) return dependencies[id]
      throw new Error(`Import sem stub explícito: ${id}`)
    },
    ...globals,
  }, { timeout: 5000 })
  return exports
}

function wrapper(source = wrapperSource) {
  return load(source, { '../serverEvents': { writeServerEvent: async () => {} } })
}

// O servidor falso aplica filtros e teto silencioso de 1000. Empates mudam de
// ordem física entre chamadas; id é o desempate que torna OFFSET verificável.
function database(tables, { failTable, failEventName, shuffle = false } = {}) {
  const calls = [], writes = []
  let executions = 0
  return {
    calls, writes,
    from(table) {
      const predicates = [], order = []
      let bounds = null, cap = 1000, head = false, mutation = null, orderAtRange = []
      const field = (row, key) => {
        const [column, jsonKey] = key.split('->>')
        return jsonKey ? String(row[column]?.[jsonKey]) : row[column]
      }
      const q = {
        select(_columns, options = {}) { head = options.head === true; return q },
        eq(key, value) { predicates.push((r) => field(r, key) === value); return q },
        in(key, values) { predicates.push((r) => values.includes(field(r, key))); return q },
        gte(key, value) { predicates.push((r) => field(r, key) >= value); return q },
        not(key, operator, value) {
          assert.equal(operator, 'is'); assert.equal(value, null)
          predicates.push((r) => field(r, key) != null); return q
        },
        order(key, { ascending = true } = {}) { order.push([key, ascending]); return q },
        range(from, to) { bounds = [from, to]; orderAtRange = order.map((x) => [...x]); return q },
        limit(n) { cap = Math.min(cap, n); return q },
        insert(row) { mutation = { kind: 'insert', row }; return q },
        update(row) { mutation = { kind: 'update', row }; return q },
        then(resolve, reject) {
          return Promise.resolve().then(() => {
            assert.ok(++executions <= 150, 'paginação em laço sem progresso')
            let rows = [...(tables[table] ?? [])].filter((r) => predicates.every((p) => p(r)))
            if (mutation) {
              writes.push({ table, ...mutation })
              if (mutation.kind === 'update') rows.forEach((r) => Object.assign(r, mutation.row))
              return { data: null, error: null }
            }
            const call = { table, bounds, orderAtRange, order: order.map((x) => [...x]), ids: [] }
            calls.push(call)
            if (table === failTable && bounds?.[0] === 1000 &&
                (!failEventName || rows.some((r) => r.name === failEventName))) {
              call.failed = true
              return { data: null, error: { message: 'fixture: segunda página indisponível' } }
            }
            if (shuffle && rows.length) {
              const offset = executions * 347 % rows.length
              rows = rows.slice(offset).concat(rows.slice(0, offset))
            }
            rows.sort((a, b) => {
              for (const [key, ascending] of order) {
                const comparison = a[key] < b[key] ? -1 : a[key] > b[key] ? 1 : 0
                if (comparison) return ascending ? comparison : -comparison
              }
              return 0
            })
            const from = bounds?.[0] ?? 0
            const data = rows.slice(from, from + Math.min(cap, bounds ? bounds[1] - from + 1 : cap))
            call.ids = data.map((r) => r.id)
            return { data: head ? null : data, error: null, count: rows.length }
          }).then(resolve, reject)
        },
      }
      return q
    },
  }
}

const profile = (id) => ({
  id, email: `${id}@external.invalid`, has_paid: false, is_pro: false, plan: 'free',
  email_opted_out: false, stalled_rescue_emailed: false, video_credits: 100,
  stripe_subscription_id: null,
})
const id = (i) => String(i).padStart(6, '0')
const rows = (build) => Array.from({ length: 2500 }, (_, i) => ({ id: id(i), ...build(i) }))

const routes = {
  card: 'app/api/admin/send-card-declined/route.ts',
  momentum: 'app/api/cron/send-momentum-nudge/route.ts',
  stalled: 'app/api/admin/send-stalled-rescue/route.ts',
}

function fixture(kind, marker = 'card_declined_emailed_v1') {
  if (kind === 'card') return {
    profiles: [profile('already'), profile('target')],
    events: [
      ...['already', 'target'].map((user_id) => ({
        id: `initial-${user_id}`, user_id, name: 'checkout_payment_failed', created_at: recent,
        metadata: { stage: 'initial', identity_source: 'intent_metadata', reason_category: 'card_restricted' },
      })),
      ...rows((i) => ({ name: marker, user_id: i === 1200 ? 'target' : 'already', created_at: recent })),
    ],
  }
  if (kind === 'momentum') return {
    profiles: [profile('target')], events: [],
    // Primeira página: um vídeo. Conjunto completo: quatro, fora da campanha.
    // Ignorar a página 2 torna a mesma pessoa indevidamente elegível.
    videos: rows((i) => ({
      user_id: [0, 1200, 1201, 1202].includes(i) ? 'target' : null,
      status: 'completed', quality_mode: 'cinematic_ai', credits_used: 5,
      created_at: recent, topic: 'Why the moon looks different tonight.\n\nThe rest of the film.',
    })),
  }
  return {
    profiles: [profile('target')], checkout_abandoned: [],
    events: [
      ...rows((i) => ({
        id: `start-${id(i)}`, user_id: i === 0 ? 'target' : `starter-${i}`,
        name: 'generate_started', created_at: fresh,
      })),
      ...rows((i) => ({
        id: `done-${id(i)}`, user_id: i === 1200 ? 'target' : 'already',
        name: 'generate_completed', created_at: fresh,
      })),
    ],
  }
}

function prepare(kind, { routeSource = read(routes[kind]), readSource = wrapperSource, marker, failTable, tables } = {}) {
  const db = database(tables ?? fixture(kind, marker), {
    failTable, failEventName: kind === 'stalled' ? 'generate_completed' : undefined,
  })
  const sends = []
  const suppression = { loadLifecycleSuppression: async () => ({ isSuppressed: () => false, suppressedCount: 0, degraded: false }) }
  const dependencies = {
    'next/server': { NextResponse: { json: (body, options) => ({ body, status: options?.status ?? 200 }) } },
    '@/lib/supabase/readAll': wrapper(readSource),
    '@/lib/supabase/server': { createClient: () => ({ auth: { getUser: async () => ({ data: { user: null } }) } }) },
    '@supabase/supabase-js': { createClient: () => db },
    '@/lib/emailSuppression': { emailFooterHtml: () => '', emailFooterText: () => '', unsubscribeHeaders: () => ({}) },
    '@/lib/lifecycle/suppression': suppression,
    '@/lib/checkoutPricing': { PACK_CREDITS: { starter: 35 }, packPriceLabel: () => 'fixture' },
    '@/lib/internalAccounts': { isInternalEmail: () => false },
    '@/lib/reverseTrial': { TRIAL_CREDIT_CAP: 40 },
    '../_shared/mrr': { PAID_PLANS: new Set(['pro']) },
  }
  if (kind === 'momentum') Object.assign(dependencies, {
    '@/lib/momentumLadder': load(read('lib/momentumLadder.ts')),
    '@/lib/momentumTopic': load(read('lib/momentumTopic.ts'), {
      './resumeStrip': load(read('lib/resumeStrip.ts')),
      './nextEpisodeMarkers': load(read('lib/nextEpisodeMarkers.ts')),
    }),
    '@/lib/seriesContinuation': load(read('lib/seriesContinuation.ts')),
    '@/lib/freeFastQuota': load(read('lib/freeFastQuota.ts')),
    '@/lib/freeTierOffer': { getFreeTierOffer: () => ({ limit: 1, windowMs: 30 * 86400_000 }) },
    '@/lib/credits/engineCost': { creditCostFor: () => 5, creditCostForDuration: () => 5 },
    '@/lib/composeClaim': { COMPOSE_CLAIM_EVENT: 'compose_claim', COMPOSE_CLAIM_PATH: '/api/compose' },
  })
  const api = load(routeSource, dependencies, {
    process: { env: { CRON_SECRET: 'offline-fixture', RESEND_API_KEY: 'offline-fixture', SUPABASE_SERVICE_ROLE_KEY: 'offline-fixture', NEXT_PUBLIC_SUPABASE_URL: 'https://database.invalid' } },
    fetch: async (url, options) => {
      assert.equal(url, 'https://api.resend.com/emails')
      sends.push(JSON.parse(options.body))
      return { ok: true, status: 200, text: async () => '', json: async () => ({ id: 'offline' }) }
    },
    setTimeout: (callback) => { callback(); return 0 },
  })
  return {
    db, sends,
    run: (query = '?confirm=SEND') => api.GET({
      nextUrl: new URL(`https://app.invalid/${kind}${query}`),
      headers: { get: (name) => name === 'authorization' ? 'Bearer offline-fixture' : null },
    }),
  }
}

function replace(source, before, after) {
  assert.ok(source.includes(before), `alvo do mutante ausente: ${before}`)
  const mutated = source.replace(before, after)
  assert.notEqual(mutated, source)
  return mutated
}

// Mutação estrutural: elimina o wrapper da consulta real, conservando os seus
// filtros. Não substitui o handler por uma implementação falsa da campanha.
function removePagination(source, kind) {
  const ast = ts.createSourceFile('route.ts', source, ts.ScriptTarget.Latest, true)
  const edits = []
  function visit(node) {
    if (ts.isCallExpression(node) && node.expression.getText(ast) === 'readAll') {
      const build = node.arguments[0]
      const query = build?.body?.getText(ast) ?? ''
      const match = kind === 'card' ? query.includes(".select('user_id')")
        : kind === 'momentum' ? query.includes(".select('user_id, created_at, topic, quality_mode')")
          : query.includes(".select('user_id, created_at')")
      if (match) edits.push({ start: node.getStart(ast), end: node.end, text: `${query}.limit(1000)` })
    }
    ts.forEachChild(node, visit)
  }
  visit(ast)
  assert.equal(edits.length, kind === 'card' ? 3 : 1, 'todas as consultas esperadas devem ser mutadas')
  for (const edit of edits.reverse()) source = source.slice(0, edit.start) + edit.text + source.slice(edit.end)
  return source
}

function successfulSuppression(harness, response) {
  assert.equal(response.status, 200, 'conjunto completo deve concluir sem abortar em 1000')
  assert.equal(harness.sends.length, 0, 'a pessoa da segunda página não pode receber')
  assert.equal(harness.db.writes.length, 0, 'nenhum carimbo sem envio')
}
function failedClosed(harness, response) {
  assert.ok(harness.db.calls.some((c) => c.failed), 'fixture precisa atingir a falha da página 2')
  assert.equal(response.status, 500, 'GET real deve responder HTTP 500')
  assert.equal(harness.sends.length, 0, 'erro parcial não pode enviar')
  assert.equal(harness.db.writes.length, 0, 'erro parcial não pode carimbar')
}
function killed(assertion) {
  assert.throws(assertion, (error) => error?.code === 'ERR_ASSERTION', 'o contrato deve ficar vermelho por uma asserção')
}

async function ordering(source = wrapperSource) {
  const db = database({ events: rows(() => ({ created_at: fresh })) }, { shuffle: true })
  const result = await wrapper(source).readAll(() => db.from('events').select('id').order('created_at', { ascending: true }),
    { route: '/offline/campaign', table: 'events' })
  return { db, result }
}
function completeAndOrdered({ db, result }) {
  assert.equal(result.error, null)
  assert.deepEqual(Array.from(result.data, (r) => r.id), Array.from({ length: 2500 }, (_, i) => id(i)))
  assert.deepEqual(db.calls.map((c) => c.bounds), [[0, 999], [1000, 1999], [2000, 2999]])
  assert.ok(db.calls.every((c) => JSON.stringify(c.orderAtRange) === JSON.stringify([['created_at', true], ['id', true]])),
    'ORDER BY de negócio + chave única precisam existir antes de range')
}

/** Devolve resultados para que o guardião mantenha o seu próprio exit code. */
export async function verifyCampaignPagination(kind) {
  assert.ok(Object.hasOwn(routes, kind))
  const results = []
  const test = async (name, execute) => {
    try { await execute(); results.push({ name, ok: true, detail: '' }) }
    catch (error) { results.push({ name, ok: false, detail: error.stack ?? String(error) }) }
  }
  const markers = kind === 'card'
    ? ['payment_success', 'checkout_recovery_emailed_v1', 'card_declined_emailed_v1'] : [undefined]
  const readSourcePartial = replace(wrapperSource,
    "throw new Error(`[readAll] ${context.route} ${context.table} page ${from}: ${error?.message ?? 'missing data'}`)",
    'return { data: rows, error: null }')
  const routeSourceTruncated = removePagination(read(routes[kind]), kind)
  for (const marker of markers) {
    const label = marker ?? kind
    await test(`${label}: GET real lê 2500 linhas e não envia indevidamente`, async () => {
      const harness = prepare(kind, { marker })
      successfulSuppression(harness, await harness.run())
      assert.ok(harness.db.calls.some((c) => c.bounds?.[0] === 2000 && c.ids.length === 500))
      assert.ok(harness.db.calls.filter((c) => c.bounds).every((c) => c.orderAtRange.some(([key]) => key === 'id')))
    })
    await test(`${label}: falha da segunda página responde 500 e zero envio/carimbo`, async () => {
      const harness = prepare(kind, { marker, failTable: kind === 'momentum' ? 'videos' : 'events' })
      failedClosed(harness, await harness.run())
    })
    await test(`${label}: mutante vivo sem readAll envia uma carta indevida e é morto`, async () => {
      const harness = prepare(kind, { marker, routeSource: routeSourceTruncated })
      const response = await harness.run()
      assert.equal(response.status, 200, 'mutante precisa executar a rota, não morrer em import/mock')
      assert.equal(harness.sends.length, 1, 'mutante precisa provar o envio indevido')
      killed(() => successfulSuppression(harness, response))
    })
    await test(`${label}: mutante vivo que aceita página parcial viola o HTTP 500`, async () => {
      const harness = prepare(kind, { marker, readSource: readSourcePartial, failTable: kind === 'momentum' ? 'videos' : 'events' })
      const response = await harness.run()
      assert.equal(response.status, 200, 'mutante parcial deve prosseguir indevidamente')
      assert.equal(harness.sends.length, 1, 'aceitar página parcial deve reproduzir o envio indevido')
      killed(() => failedClosed(harness, response))
    })
  }
  await test('readAll real: 2500 ids exatos e ORDER estável antes de todos os range', async () => {
    completeAndOrdered(await ordering())
  })
  await test('mutante vivo sem desempate por id perde linhas com empates e é morto', async () => {
    const mutated = replace(wrapperSource, 'for (const key of keys)', 'for (const key of [])')
    const actual = await ordering(mutated)
    assert.equal(actual.result.data.length, 2500, 'mutante deve terminar normalmente')
    assert.ok(new Set(actual.result.data.map((r) => r.id)).size < 2500, 'perda real, não só texto/regex')
    killed(() => completeAndOrdered(actual))
  })
  if (kind === 'stalled') await test('frescor e coorte completos: 2500 inícios, conclusão além de 1000 e alvo excluído', async () => {
    const harness = prepare(kind)
    const response = await harness.run('?fresh_hours=48')
    assert.equal(response.status, 200)
    assert.equal(response.body.started_total, 2500)
    assert.equal(response.body.completed_total, 2)
    assert.equal(response.body.started_never_completed_all, 2499)
    assert.equal(response.body.started_never_completed, 2499)
    assert.equal(response.body.remaining_unemailed, 0)
  })
  return results
}
