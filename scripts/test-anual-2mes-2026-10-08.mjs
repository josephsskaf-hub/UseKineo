#!/usr/bin/env node
// ═══ KINEO-ANUAL-2o-MES-2026-10-08 — guardião: o anual oferecido no 2º mês (30%), autoatendimento + e-mail ══════════
// Executa o CÓDIGO REAL (readFileSync + ts.transpileModule; o alias @/ é resolvido AQUI; sem rede, sem banco, sem .env,
// sem chave da Stripe): a rota de autoatendimento (GET estado / POST ensaio e troca), o cron do e-mail, o núcleo único da
// troca, a rota do admin (para provar que as duas falam do mesmo razão), as regras puras e a peça React (renderizada com
// o tradutor real das 16 línguas), contra uma Stripe FALSA (assinatura, faturas pagas, prévia, troca com idempotência,
// recusa de cartão), um banco FALSO em memória e um Resend FALSO. Prova:
//   R1 · regra 0,7 ao dólar mais próximo: 9,90→83 · 12,90→108 · 15,92→134 · 19,90→167 · 29→244 · 29,90→251 · 54,90→461,
//        e em todos esses pares a recarga anual dá os MESMOS créditos que a renovação mensal (a troca não é bloqueada);
//        a regra de 40% do admin continua a mesma (9,90→71);
//   R2 · renovações pagas: o 1º mês (subscription_create) não conta, a conversão do teste não conta, troca de plano não
//        conta — só o 2º mês em diante é elegível;
//   R3 · elegibilidade: mensal ativa em USD com 1 renovação paga = elegível; sem renovação, conversão do teste, em teste,
//        cancelamento agendado, cupom, conta interna, BRL, já anual, PayPal, outra pessoa na assinatura, faturas
//        ilegíveis e créditos que mudariam = 409 com o motivo e NADA gravado (perfil já responde sem chamar a Stripe);
//   R4 · ensaio sem escrita: a prévia (anual, crédito dos dias não usados, cobrado agora, créditos antes/depois, reembolso
//        em 14 dias) sai de invoices.createPreview — nenhum update, nenhuma linha no banco, nada interno vaza;
//   R5 · troca uma vez: o SEND passa pelo núcleo (price_data anual no Product da casa, always_invoice, âncora now,
//        error_if_incomplete, idempotência), grava o razão com offer/source/surface e concede a cota do mês; 2º SEND,
//        clique duplo, rota do admin depois = nenhuma segunda cobrança; valor diferente da prévia = 409, sem cobrar;
//        cartão recusado = 402, nada gravado; só a PRÓPRIA assinatura (o corpo nunca escolhe o perfil);
//   R6 · interruptor desligado (o estado do arquivo): a tela não pinta nem chama a rota, o GET não lê nada, o POST
//        responde 404, o cron só faz ensaio e o SEND é recusado sem enviar nem gravar;
//   R7 · e-mail 1× por assinatura: só a 1ª renovação paga nos últimos 7 dias, com opt-out, supressão de 24 h e o mesmo
//        juízo da tela; reserva antes do envio, falha do Resend libera para a próxima corrida, 2ª corrida não reenvia;
//   R8 · textos nas 16 línguas (mesmos marcadores e números), a peça renderiza em en/pt/ar sem marcador sobrando;
//   R9 · estrutura: um só update da Stripe (no núcleo), nenhum componente de cliente importa o núcleo, o carimbo do e-mail
//        está na lista canônica da supressão e é só-servidor, o cron não está no vercel.json, doc no lugar.
// Depois, MUTANTES em memória: cada regra é quebrada por troca de texto com PROVA DE APLICAÇÃO (âncora única, texto novo
// presente, âncora ausente, arquivo carregado) e a prova correspondente TEM de ficar vermelha.
//
// Rodar: node scripts/test-anual-2mes-2026-10-08.mjs [--verbose]
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join, posix } from 'node:path'
import { fileURLToPath } from 'node:url'
import * as nodeCrypto from 'node:crypto'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const nodeRequire = createRequire(join(root, 'package.json'))
const ts = nodeRequire('typescript')
const React = nodeRequire('react')
const { renderToStaticMarkup } = nodeRequire('react-dom/server')
const CR = String.fromCharCode(13)
const disk = new Map()
function read(rel) {
  if (!disk.has(rel)) disk.set(rel, readFileSync(join(root, rel), 'utf8').split(CR).join(''))
  return disk.get(rel)
}

let passed = 0
const failed = []
const VERBOSE = process.argv.includes('--verbose')
function check(cond, label) {
  if (cond) passed++
  else failed.push(label)
  if (VERBOSE) console.log(`  ${cond ? 'ok  ' : 'FAIL'} ${label}`)
  return Boolean(cond)
}

const OFFER = 'lib/billing/month2AnnualOffer.ts'
const LIB = 'lib/billing/annualSwitch.ts'
const CORE = 'lib/billing/annualSwitchCore.ts'
const EMAIL = 'lib/billing/month2AnnualEmail.ts'
const SELF = 'app/api/stripe/switch-to-annual/route.ts'
const ADMIN_ROUTE = 'app/api/admin/switch-to-annual/route.ts'
const CRON = 'app/api/cron/send-month2-annual-offer/route.ts'
const UI = 'components/billing/Month2AnnualOffer.tsx'
const ACCOUNT = 'app/(dashboard)/account/AccountClient.tsx'
const STUDIO = 'app/(dashboard)/studio/StudioClient.tsx'
const COPYFILE = 'lib/ui/refinementCopy.json'
const EMAIL_EVENTS = 'lib/lifecycle/emailEvents.ts'
const SINK = 'app/api/events/route.ts'
const VERCEL = 'vercel.json'
const DOC = 'docs/ANUAL-NO-2o-MES-2026-10-08.md'
const SHARED_DB = 'app/api/admin/_shared/db.ts'
const BALANCE = 'lib/credits/renewalBalance.ts'

// ─── mini sistema de módulos: TS real, imports resolvidos por nós, stubs só para I/O ───────────────────────────────────
function fileFor(rel) {
  for (const c of [rel, `${rel}.ts`, `${rel}.tsx`, `${rel}/index.ts`]) {
    const abs = join(root, c)
    if (existsSync(abs) && statSync(abs).isFile()) return c
  }
  return null
}

/** Troca de texto com prova de aplicação: a âncora existe UMA vez, o texto novo aparece e a âncora some. */
function replaceOnce(from, to, label) {
  return {
    label,
    apply(src) {
      const count = src.split(from).length - 1
      if (count !== 1) throw new Error(`troca "${label}" sem âncora única (${count})`)
      const out = src.split(from).join(to)
      if (to && !out.includes(to)) throw new Error(`troca "${label}" não aplicou`)
      if (!to.includes(from) && out.includes(from)) throw new Error(`troca "${label}": a âncora continua no fonte`)
      return out
    },
  }
}
/**
 * O estado em que o interruptor SAI no arquivo. Hoje false (decisão de 08/10: só liga com o "liga" do fundador). No commit
 * do "liga", esta constante vira true junto com MONTH2_ANNUAL_OFFER_LIVE — e só ela: os cenários abaixo forçam o estado
 * que testam (ligado ou desligado) em memória, então continuam valendo nos dois estados do arquivo.
 */
const EXPECTED_SHIPPED_LIVE = false
/** Força o interruptor em memória (o arquivo fica intacto). Já no estado pedido = nada a trocar. */
function forceLive(on) {
  const want = `export const MONTH2_ANNUAL_OFFER_LIVE = ${on}`
  const other = `export const MONTH2_ANNUAL_OFFER_LIVE = ${!on}`
  const src = read(OFFER)
  if (src.includes(want) && !src.includes(other)) return {}
  return { [OFFER]: [replaceOnce(other, want, on ? 'liga a oferta (cenário)' : 'desliga a oferta (cenário)')] }
}
function mergeTransforms(...maps) {
  const out = {}
  for (const m of maps) for (const [k, v] of Object.entries(m ?? {})) out[k] = [...(out[k] ?? []), ...v]
  return out
}

const transpiled = new Map()
function transpile(rel, src, jsx = 'react-jsx') {
  const key = `${rel}\u0000${jsx}\u0000${nodeCrypto.createHash('sha1').update(src).digest('hex')}`
  if (!transpiled.has(key)) {
    transpiled.set(key, ts.transpileModule(src, {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        esModuleInterop: true,
        jsx: jsx === 'classic' ? ts.JsxEmit.React : ts.JsxEmit.ReactJSX,
        resolveJsonModule: true,
      },
      fileName: rel,
    }).outputText)
  }
  return transpiled.get(key)
}

function makeWorld({ stubs, transforms = {}, globals, jsx = 'react-jsx', rewrite = {} }) {
  const cache = new Map()
  const applied = []
  function load(rel) {
    const hit = cache.get(rel)
    if (hit) return hit.exports
    if (rel.endsWith('.json')) {
      const mod = { exports: JSON.parse(read(rel)) }
      for (const t of transforms[rel] ?? []) { mod.exports = JSON.parse(t.apply(read(rel))); applied.push(`${rel} :: ${t.label}`) }
      cache.set(rel, mod)
      return mod.exports
    }
    let src = read(rel)
    for (const t of transforms[rel] ?? []) {
      const before = src
      src = t.apply(src)
      if (src === before) throw new Error(`troca sem efeito em ${rel}: ${t.label}`)
      applied.push(`${rel} :: ${t.label}`)
    }
    if (rewrite[rel]) src = rewrite[rel](src)
    const mod = { exports: {} }
    cache.set(rel, mod)
    const req = (spec) => {
      if (Object.prototype.hasOwnProperty.call(stubs, spec)) return stubs[spec]
      if (spec.startsWith('node:')) return nodeRequire(spec)
      let target = null
      if (spec.startsWith('@/')) target = spec.slice(2)
      else if (spec.startsWith('./') || spec.startsWith('../')) target = posix.normalize(posix.join(posix.dirname(rel), spec))
      if (target) {
        const f = target.endsWith('.json') ? target : fileFor(target)
        if (!f) throw new Error(`módulo não encontrado: ${spec} (importado por ${rel})`)
        return load(f)
      }
      throw new Error(`import inesperado em ${rel}: ${spec}`)
    }
    const names = Object.keys(globals)
    new Function('require', 'module', 'exports', ...names, transpile(rel, src, jsx))(req, mod, mod.exports, ...names.map((k) => globals[k]))
    return mod.exports
  }
  return { load, applied }
}

// ─── relógio: hoje é 08/10/2026 13:00 UTC; a pessoa assinou em 03/09 e renovou em 03/10 ──────────────────────────────
const RealDate = Date
const T0 = RealDate.parse('2026-10-08T13:00:00.000Z')
const DAY = 24 * 60 * 60 * 1000
const clock = { now: T0 }
class FakeDate extends RealDate {
  constructor(...args) {
    if (args.length === 0) super(clock.now)
    else super(...args)
  }
  static now() { return clock.now }
}
const sec = (iso) => Math.floor(RealDate.parse(iso) / 1000)
const clone = (v) => (v === undefined || v === null ? v : JSON.parse(JSON.stringify(v)))
const nowIso = () => new RealDate(clock.now).toISOString()
function addMonthsMs(ms, months) {
  const d = new RealDate(ms)
  const day = d.getUTCDate()
  const t = new RealDate(RealDate.UTC(d.getUTCFullYear(), d.getUTCMonth() + months, 1, d.getUTCHours(), d.getUTCMinutes(), d.getUTCSeconds()))
  const last = new RealDate(RealDate.UTC(t.getUTCFullYear(), t.getUTCMonth() + 1, 0)).getUTCDate()
  t.setUTCDate(Math.min(day, last))
  return t.getTime()
}

// ─── falsos: resposta do Next, banco (PostgREST), Stripe, Resend ──────────────────────────────────────────────────────
class FakeResponse {
  constructor(body, init = {}) {
    this.status = init.status ?? 200
    this.body = body
    this.jsonBody = undefined
    this.headerMap = new Map(Object.entries(init.headers ?? {}).map(([k, v]) => [k.toLowerCase(), String(v)]))
    this.cookies = { set() {} }
    this.headers = { get: (k) => this.headerMap.get(String(k).toLowerCase()) ?? null, set: (k, v) => this.headerMap.set(String(k).toLowerCase(), String(v)) }
  }
  static json(body, init = {}) {
    const r = new FakeResponse(null, init)
    r.jsonBody = clone(body)
    return r
  }
  async json() { return this.jsonBody }
}

function makeDb() {
  const tables = {}
  const ops = []
  const T = (name) => (tables[name] ??= [])
  const UNIQUE = { events: ['id'], profiles: ['id'], email_send_log: ['id'] }
  const getPath = (row, col) => {
    const parts = String(col).split('->>')
    let v = row[parts[0]]
    if (parts.length > 1) v = v && typeof v === 'object' ? v[parts[1]] : undefined
    return v === undefined ? null : v
  }
  const failures = []
  class Query {
    constructor(table) { this.table = table; this.op = 'select'; this.filters = []; this.wantRows = false; this.mode = null; this.lim = null; this.head = false }
    select(_cols, opts) { if (this.op === 'select') { if (opts?.head) this.head = true } else this.wantRows = true; return this }
    insert(p) { this.op = 'insert'; this.payload = Array.isArray(p) ? p : [p]; return this }
    update(p) { this.op = 'update'; this.payload = p; return this }
    delete() { this.op = 'delete'; return this }
    eq(c, v) { this.filters.push((r) => getPath(r, c) === v); return this }
    neq(c, v) { this.filters.push((r) => getPath(r, c) !== v); return this }
    in(c, vs) { this.filters.push((r) => vs.includes(getPath(r, c))); return this }
    is(c, v) { this.filters.push((r) => getPath(r, c) === v); return this }
    gte(c, v) { this.filters.push((r) => String(getPath(r, c) ?? '') >= String(v)); return this }
    lte(c, v) { this.filters.push((r) => String(getPath(r, c) ?? '') <= String(v)); return this }
    gt(c, v) { this.filters.push((r) => String(getPath(r, c) ?? '') > String(v)); return this }
    lt(c, v) { this.filters.push((r) => String(getPath(r, c) ?? '') < String(v)); return this }
    order() { return this }
    range() { return this }
    limit(n) { this.lim = n; return this }
    single() { this.mode = 'single'; return this }
    maybeSingle() { this.mode = 'maybe'; return this }
    then(resolve, reject) { return Promise.resolve().then(() => this.run()).then(resolve, reject) }
    shape(list) {
      const data = list.map(clone)
      if (this.mode === 'single') return data.length === 1 ? { data: data[0], error: null } : { data: null, error: { code: 'PGRST116', message: 'JSON object requested, multiple (or no) rows returned' } }
      if (this.mode === 'maybe') return data.length <= 1 ? { data: data[0] ?? null, error: null } : { data: null, error: { code: 'PGRST116', message: 'multiple rows' } }
      return { data, error: null }
    }
    run() {
      ops.push(`${this.table}.${this.op}`)
      const fi = failures.findIndex((f) => f.table === this.table && f.op === this.op)
      if (fi >= 0) return { data: null, error: failures.splice(fi, 1)[0].error, count: null }
      const rows = T(this.table)
      if (this.op === 'insert') {
        const keys = UNIQUE[this.table] ?? []
        for (const r of this.payload) {
          if (keys.length && rows.some((x) => keys.every((k) => x[k] !== undefined && x[k] !== null && x[k] === r[k]))) {
            return { data: null, error: { code: '23505', message: `duplicate key value violates unique constraint (${this.table})` } }
          }
        }
        const inserted = this.payload.map((r) => ({ ...(!r.id ? { id: nodeCrypto.randomUUID() } : {}), created_at: r.created_at ?? nowIso(), ...clone(r) }))
        rows.push(...inserted)
        return this.wantRows ? this.shape(inserted) : { data: null, error: null }
      }
      let hit = rows.filter((r) => this.filters.every((fn) => fn(r)))
      if (this.op === 'update') {
        for (const r of hit) Object.assign(r, clone(this.payload))
        return this.wantRows ? this.shape(hit) : { data: null, error: null }
      }
      if (this.op === 'delete') {
        tables[this.table] = rows.filter((r) => !hit.includes(r))
        return { data: null, error: null }
      }
      if (this.head) return { data: null, error: null, count: hit.length }
      if (this.lim !== null) hit = hit.slice(0, this.lim)
      return this.shape(hit)
    }
  }
  return {
    tables,
    ops,
    T,
    failOnce(table, op) { failures.push({ table, op, error: { code: '08006', message: 'connection failure (injetada pelo guardião)' } }) },
    from: (t) => new Query(t),
    profile(id) { return T('profiles').find((p) => p.id === id) ?? null },
    events(name) { return T('events').filter((e) => e.name === name) },
  }
}

function makeStripe() {
  const subs = new Map()
  const invoices = new Map()
  const paid = new Map()
  const products = new Map()
  const calls = []
  const idem = new Map()
  const state = { cardDeclined: false, failList: false }
  let seq = 0
  const nextId = (p) => `${p}M2${(++seq).toString(36).padStart(4, '0')}`
  const stripeError = (type, code, message, statusCode, extra = {}) => Object.assign(new Error(message), { type, code, statusCode, raw: { message }, ...extra })
  const missing = (what, id) => stripeError('StripeInvalidRequestError', 'resource_missing', `No such ${what}: '${id}'`, 404)
  function unusedCredit(sub) {
    const item = sub.items.data[0]
    const nowSec = Math.floor(clock.now / 1000)
    const total = Math.max(1, sub.current_period_end - sub.current_period_start)
    const remaining = Math.max(0, sub.current_period_end - nowSec)
    return Math.round(item.price.unit_amount * (item.quantity ?? 1) * remaining / total)
  }
  function switchInvoice(sub, details, persist) {
    const it = details.items[0]
    const pd = it.price_data
    const credit = details.proration_behavior === 'none' ? 0 : unusedCredit(sub)
    const unit = pd.unit_amount * (it.quantity ?? 1)
    const total = unit - credit
    return {
      id: persist ? nextId('in_') : null, object: 'invoice', subscription: sub.id, customer: sub.customer,
      billing_reason: 'subscription_update', currency: pd.currency, amount_due: Math.max(0, total), amount_paid: 0, total,
      starting_balance: 0, status: 'draft',
      lines: { object: 'list', has_more: false, data: [
        { amount: -credit, proration: true, description: `Unused time on ${sub.items.data[0].price.product}` },
        { amount: unit, proration: false, description: `1 × ${pd.product} (at $${(unit / 100).toFixed(2)} / ${pd.recurring.interval})` },
      ] },
    }
  }
  const expandSub = (s, params) => {
    const out = clone(s)
    if ((params?.expand ?? []).includes('latest_invoice') && out.latest_invoice && invoices.has(out.latest_invoice)) out.latest_invoice = clone(invoices.get(out.latest_invoice))
    return out
  }
  function applyUpdate(id, params) {
    const s = subs.get(id)
    if (!s) throw missing('subscription', id)
    const meta = { ...s.metadata, ...(params.metadata ?? {}) }
    const inv = switchInvoice(s, { items: params.items, proration_behavior: params.proration_behavior ?? 'create_prorations' }, true)
    const behavior = params.payment_behavior ?? 'allow_incomplete'
    const declined = state.cardDeclined && inv.amount_due > 0
    if (declined && behavior === 'error_if_incomplete') throw stripeError('StripeCardError', 'card_declined', 'Your card was declined.', 402, { decline_code: 'generic_decline' })
    const it = params.items[0]
    const pd = it.price_data
    s.items.data[0] = { ...s.items.data[0], quantity: it.quantity ?? 1, price: { id: nextId('price_'), object: 'price', unit_amount: pd.unit_amount, currency: pd.currency, product: pd.product, recurring: { interval: pd.recurring.interval, interval_count: 1 } } }
    s.metadata = meta
    s.current_period_start = Math.floor(clock.now / 1000)
    s.current_period_end = Math.floor(addMonthsMs(clock.now, pd.recurring.interval === 'year' ? 12 : 1) / 1000)
    if (declined) { inv.status = 'open'; s.status = 'past_due' } else { inv.status = 'paid'; inv.amount_paid = inv.amount_due }
    invoices.set(inv.id, inv)
    s.latest_invoice = inv.id
    return expandSub(s, params)
  }
  return {
    subs, invoiceMap: invoices, paid, productMap: products, calls, state,
    ops: (op) => calls.filter((c) => c.op === op),
    subscriptions: {
      async retrieve(id) {
        calls.push({ op: 'subscriptions.retrieve', id })
        const s = subs.get(id)
        if (!s) throw missing('subscription', id)
        return clone(s)
      },
      async update(id, params, opts) {
        const key = opts?.idempotencyKey ?? null
        calls.push({ op: 'subscriptions.update', id, params: clone(params), idempotencyKey: key })
        const paramsJson = JSON.stringify(params)
        if (key && idem.has(key)) {
          const prev = idem.get(key)
          if (prev.paramsJson !== paramsJson) throw stripeError('StripeIdempotencyError', 'idempotency_key_in_use', 'Keys for idempotent requests can only be used with the same parameters.', 400)
          if (prev.error) throw prev.error
          return clone(prev.result)
        }
        let result
        let error = null
        try { result = applyUpdate(id, params) } catch (e) { error = e }
        if (key) idem.set(key, { paramsJson, result: clone(result), error })
        if (error) throw error
        return clone(result)
      },
    },
    invoices: {
      async createPreview(params) {
        calls.push({ op: 'invoices.createPreview', params: clone(params) })
        const s = subs.get(params.subscription)
        if (!s) throw missing('subscription', params.subscription)
        return clone(switchInvoice(s, params.subscription_details, false))
      },
      async retrieve(id) {
        calls.push({ op: 'invoices.retrieve', id })
        if (!invoices.has(id)) throw missing('invoice', id)
        return clone(invoices.get(id))
      },
      async list(params = {}) {
        calls.push({ op: 'invoices.list', params: clone(params) })
        if (state.failList) throw stripeError('StripeAPIError', 'api_error', 'An error occurred with our connection to Stripe.', 500)
        const rows = (paid.get(params.subscription) ?? []).filter((i) => !params.status || i.status === params.status)
        return { object: 'list', has_more: false, data: rows.map(clone) }
      },
    },
    products: {
      async retrieve(id) {
        calls.push({ op: 'products.retrieve', id })
        if (!products.has(id)) throw missing('product', id)
        return clone(products.get(id))
      },
      async create(params, opts) {
        calls.push({ op: 'products.create', params: clone(params), idempotencyKey: opts?.idempotencyKey ?? null })
        const id = params.id ?? nextId('prod_')
        if (products.has(id)) throw stripeError('StripeInvalidRequestError', 'resource_already_exists', `Product already exists: '${id}'`, 400)
        const created = { id, object: 'product', active: true, name: params.name, metadata: clone(params.metadata ?? {}) }
        products.set(id, created)
        return clone(created)
      },
    },
  }
}

const ENV = {
  NEXT_PUBLIC_SUPABASE_URL: 'https://fake.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY: 'service-role-placeholder',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon-placeholder',
  STRIPE_SECRET_KEY: 'sk_test_placeholder',
  CRON_SECRET: 'cron-placeholder',
  RESEND_API_KEY: 're_placeholder',
}

/** O mutante da rodada (null = código como está) e a lista do que cada mundo transformou de fato. */
let activeMutant = null
const appliedLists = []

function makeEnv({ live = true } = {}) {
  clock.now = T0
  const transforms = mergeTransforms(forceLive(live), activeMutant ?? {})
  const db = makeDb()
  const stripe = makeStripe()
  const session = { user: null }
  const resend = { calls: [], failNext: 0 }
  const suppressed = new Set()
  const quota = []
  const logs = []
  const quietConsole = {
    log() {}, info() {}, debug() {},
    warn: (...a) => logs.push(['warn', a.map(String).join(' ')]),
    error: (...a) => logs.push(['error', a.map(String).join(' ')]),
  }
  const fakeFetch = async (url, init = {}) => {
    if (String(url) === 'https://api.resend.com/emails') {
      resend.calls.push(JSON.parse(init.body))
      if (resend.failNext > 0) { resend.failNext--; return { ok: false, status: 500, json: async () => ({ message: 'boom' }) } }
      return { ok: true, status: 200, json: async () => ({ id: `re_${resend.calls.length}` }) }
    }
    throw new Error(`sem rede neste guardião: ${url}`)
  }
  const stubs = {
    'next/server': { NextResponse: FakeResponse },
    '@supabase/supabase-js': { createClient: () => db },
    '@/lib/supabase/server': {
      createClient: () => ({
        auth: { getUser: async () => ({ data: { user: session.user ? clone(session.user) : null }, error: session.user ? null : { name: 'AuthSessionMissingError', message: 'Auth session missing!' } }) },
        from: (t) => db.from(t),
      }),
    },
    '@/lib/stripe': { stripe },
    stripe: { __esModule: true, default: function StripeStub() {} },
    '@/lib/lifecycle/freshFetch': { freshFetch: () => { throw new Error('freshFetch não roda no guardião (o banco é falso)') } },
    '@/lib/lifecycle/suppression': {
      loadLifecycleSuppression: async (_admin, ids) => ({ isSuppressed: (id) => suppressed.has(id), suppressedCount: ids.filter((id) => suppressed.has(id)).length, degraded: false }),
    },
    '@/lib/email/quota': {
      recordEmailSend: async (p) => { quota.push({ ...p, admin: undefined }) },
      recordResendResponse: async (p) => { quota.push({ kind: p.kind, priority: p.priority, userId: p.userId, ok: p.res.ok, httpStatus: p.res.status }) },
    },
    '@/lib/emailSuppression': {
      emailFooterHtml: (id) => `<p data-unsub="${id}">unsubscribe</p>`,
      emailFooterText: (id) => `unsubscribe ${id}`,
      unsubscribeHeaders: (id) => ({ 'List-Unsubscribe': `<https://www.usekineo.com/unsubscribe/${id}>` }),
    },
  }
  const world = makeWorld({
    stubs,
    transforms,
    globals: { process: { env: { ...ENV } }, console: quietConsole, fetch: fakeFetch, Date: FakeDate, AbortSignal },
  })
  appliedLists.push(world.applied)
  return {
    db, stripe, session, resend, suppressed, quota, logs, world,
    get self() { return world.load(SELF) },
    get cron() { return world.load(CRON) },
    get adminRoute() { return world.load(ADMIN_ROUTE) },
    get lib() { return world.load(LIB) },
    get core() { return world.load(CORE) },
    get offer() { return world.load(OFFER) },
    get email() { return world.load(EMAIL) },
    get balance() { return world.load(BALANCE) },
    get adminEmail() { return [...world.load(SHARED_DB).ADMIN_EMAILS][0] },
  }
}

// ─── cenário-base: um Starter mensal em dólar que pagou a 1ª renovação em 03/10 ───────────────────────────────────────
const USER = 'b7d1e2f3-4a5b-4c6d-8e9f-0a1b2c3d4e5f'
const OTHER = 'c8e2f3a4-5b6c-4d7e-9f0a-1b2c3d4e5f6a'
const EMAIL_ADDR = 'cliente.mes2@example.com'
const SUB = 'sub_MES2_01'
const ITEM = 'si_MES2_01'
const CUS = 'cus_MES2_01'
const PROD = 'prod_CHECKOUT_MES2'
const HOUSE = 'kineo_plan_starter'
const CREDITS_NOW = 12
const RENEWED_AT = '2026-10-03T13:00:00.000Z'
const PERIOD_START = RealDate.parse(RENEWED_AT)
const OTHER_SUB = 'sub_OUTRA_01'

const CHECKOUT_MONTHLY_METADATA = (tier, planCredits, owner = USER) => ({
  supabase_user_id: owner, tier, price_region: 'standard', plan_credits: String(planCredits), checkout_origin: 'standard',
  affiliate_system: 'custom', intro: '1',
})
/** Faturas pagas: o 1º mês (create) e N renovações (cycle), mês a mês até 03/10. */
function invoicesFor({ monthlyMinor = 990, renewals = 1, trial = false, lastRenewalAt = RENEWED_AT, extra = [] } = {}) {
  const out = []
  const last = RealDate.parse(lastRenewalAt)
  const months = renewals + (trial ? 1 : 0)
  const createdAt = addMonthsMs(last, -months)
  out.push({ id: 'in_CREATE', object: 'invoice', billing_reason: 'subscription_create', status: 'paid', amount_paid: trial ? 100 : monthlyMinor, created: Math.floor(createdAt / 1000), status_transitions: { paid_at: Math.floor(createdAt / 1000) } })
  for (let k = months - 1; k >= 0; k--) {
    const at = Math.floor(addMonthsMs(last, -k) / 1000)
    out.push({ id: `in_CYCLE_${months - k}`, object: 'invoice', billing_reason: 'subscription_cycle', status: 'paid', amount_paid: monthlyMinor, created: at, status_transitions: { paid_at: at } })
  }
  return [...out, ...extra]
}

function seed(env, o = {}) {
  const monthlyMinor = o.monthlyMinor ?? 990
  const tier = o.tier ?? 'starter'
  const userId = o.userId ?? USER
  const sub = o.sub ?? SUB
  env.db.T('profiles').push({
    id: userId, email: o.email ?? EMAIL_ADDR, plan: o.plan ?? tier, is_pro: true, has_paid: true, video_credits: o.credits ?? CREDITS_NOW,
    stripe_customer_id: o.customer ?? CUS, stripe_subscription_id: o.noStripe ? null : sub, paypal_subscription_id: o.paypal ? 'I-PAYPAL01' : null,
    email_opted_out: Boolean(o.optedOut), signup_country: o.country ?? 'US', last_country: null,
  })
  if (o.noStripe) return
  const periodStart = o.periodStart ?? PERIOD_START
  env.stripe.subs.set(sub, {
    id: sub, object: 'subscription', customer: o.customer ?? CUS, status: o.status ?? 'active', collection_method: 'charge_automatically',
    currency: o.currency ?? 'usd', cancel_at_period_end: Boolean(o.cancelAtPeriodEnd), cancel_at: null, schedule: null, pause_collection: null,
    discount: o.discount ?? null, discounts: o.discount ? [o.discount.id] : [], trial_end: o.trialEnd ?? null,
    latest_invoice: 'in_ULTIMA', current_period_start: Math.floor(periodStart / 1000),
    current_period_end: Math.floor(addMonthsMs(periodStart, o.interval === 'year' ? 12 : 1) / 1000),
    items: { object: 'list', data: [{ id: o.item ?? ITEM, object: 'subscription_item', quantity: 1, discounts: [], price: { id: 'price_MENSAL_MES2', object: 'price', unit_amount: monthlyMinor, currency: o.currency ?? 'usd', product: PROD, recurring: { interval: o.interval ?? 'month', interval_count: 1 } } }] },
    metadata: clone(o.metadata ?? CHECKOUT_MONTHLY_METADATA(tier, o.planCredits ?? 60, o.owner ?? userId)),
  })
  env.stripe.paid.set(sub, o.invoices ?? invoicesFor({ monthlyMinor, renewals: o.renewals ?? 1, trial: Boolean(o.trialEnd), lastRenewalAt: o.lastRenewalAt ?? RENEWED_AT }))
  if (!o.noHouse) env.stripe.productMap.set(`kineo_plan_${tier}`, { id: `kineo_plan_${tier}`, object: 'product', active: true, name: 'Kineo', metadata: { kineo_tier: tier } })
  // a linha que o webhook grava por fatura paga (a coorte do cron)
  if (o.invoiceEvent !== false) {
    env.db.T('events').push({
      id: nodeCrypto.randomUUID(), name: 'subscription_invoice_paid', user_id: userId, path: '/api/stripe/webhook',
      created_at: o.invoiceEventAt ?? '2026-10-03T13:01:00.000Z',
      metadata: { source: 'stripe_webhook', billing_reason: o.billingReason ?? 'subscription_cycle', stripe_subscription_id: sub, trial_conversion: Boolean(o.trialConversionEvent), amount_paid: monthlyMinor, currency: o.currency ?? 'usd' },
    })
  }
}

function as(env, who) {
  env.session.user = who === 'customer' ? { id: USER, email: EMAIL_ADDR }
    : who === 'other' ? { id: OTHER, email: 'outra.pessoa@example.com' }
      : who === 'admin' ? { id: '00000000-0000-4000-8000-00000000ad01', email: env.adminEmail }
        : null
}
async function getStatus(env, who = 'customer') {
  as(env, who)
  const res = await env.self.GET()
  return { status: res.status, body: res.jsonBody ?? null }
}
async function post(env, body, who = 'customer') {
  as(env, who)
  const res = await env.self.POST({ json: async () => clone(body) })
  return { status: res.status, body: res.jsonBody ?? null }
}
async function runCron(env, query = '', auth = 'cron') {
  const url = new URL(`https://www.usekineo.com/api/cron/send-month2-annual-offer${query}`)
  if (auth === 'admin') as(env, 'admin')
  else env.session.user = null
  const res = await env.cron.GET({ url: url.toString(), nextUrl: url, headers: { get: (k) => (String(k).toLowerCase() === 'authorization' && auth === 'cron' ? `Bearer ${ENV.CRON_SECRET}` : null) } })
  return { status: res.status, body: res.jsonBody ?? null }
}
const snapshot = (env) => JSON.stringify({
  tables: Object.entries(env.db.tables).filter(([, rows]) => rows.length > 0).sort(([a], [b]) => (a < b ? -1 : 1)),
  subs: [...env.stripe.subs.entries()],
  invoices: [...env.stripe.invoiceMap.entries()],
})
const idFor = (key) => {
  const h = nodeCrypto.createHash('sha256').update(key).digest('hex').slice(0, 32)
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`
}
const expectedCredit = (monthlyMinor) => {
  const start = Math.floor(PERIOD_START / 1000)
  const end = Math.floor(addMonthsMs(PERIOD_START, 1) / 1000)
  return Math.round(monthlyMinor * (end - Math.floor(T0 / 1000)) / (end - start))
}
const stripeOps = (env) => env.stripe.calls.map((c) => c.op)

// ═══ cenários (cada um devolve a lista de problemas; vazio = verde) ═════════════════════════════════════════════════════
// [mensal em centavos, plano, anual a 30%] — os valores que o fundador mandou conferir.
const MONTH2_CASES = [
  [990, 'starter', 83],
  [1290, 'starter', 108],
  [1592, 'basic', 134],
  [1990, 'basic', 167],
  [2900, 'pro', 244],
  [2990, 'basic', 251],
  [5490, 'pro', 461],
]

/** R1: a regra 0,7 e os créditos iguais; a regra de 40% intacta. */
async function sRegra() {
  const p = []
  const env = makeEnv()
  const L = env.lib
  const O = env.offer
  if (O.MONTH2_ANNUAL_PERCENT_OFF !== 30) p.push(`desconto da oferta = ${O.MONTH2_ANNUAL_PERCENT_OFF}%, a decisão do fundador é 30%`)
  if (O.MONTH2_ANNUAL_OFFER !== 'month2_annual_30_2026_10_08') p.push(`id da oferta mudou: ${O.MONTH2_ANNUAL_OFFER}`)
  for (const [m, tier, want] of MONTH2_CASES) {
    const got = L.month2OfferAnnualUsd(m)
    if (got !== want) p.push(`regra: ${m}¢/mês → ${got}, esperava ${want}`)
    if (L.annualUsdForOffer(L.MONTH2_ANNUAL_OFFER, m) !== want) p.push(`registro da oferta: ${m}¢ → ${L.annualUsdForOffer(L.MONTH2_ANNUAL_OFFER, m)}`)
    if (!L.checkAnnualAmountForOffer(L.MONTH2_ANNUAL_OFFER, m, want).ok) p.push(`regra: ${want} recusado para ${m}¢`)
    if (L.checkAnnualAmountForOffer(L.MONTH2_ANNUAL_OFFER, m, want + 1).ok || L.checkAnnualAmountForOffer(L.MONTH2_ANNUAL_OFFER, m, want - 1).ok) p.push(`regra: ±1 dólar aceito para ${m}¢`)
    const c = L.annualSwitchCredits(tier, m, want * 100, 'usd')
    if (!c.same) p.push(`créditos mudariam em ${m}¢ (${tier}): hoje ${c.perMonthToday}, anual ${c.perMonthAfter} — a troca seria bloqueada`)
  }
  if (L.offerAnnualUsd(990) !== 71 || L.checkAnnualAmount(990, 71).ok !== true || L.checkAnnualAmount(990, 83).ok !== false) p.push('a regra de 40% do admin mudou (9,90 → 71)')
  if (L.ANNUAL_SWITCH_OFFER_RULES[L.MONTH2_ANNUAL_OFFER]?.percentOff !== 30 || !/x 0\.7\)/.test(L.ANNUAL_SWITCH_OFFER_RULES[L.MONTH2_ANNUAL_OFFER]?.rule ?? '')) p.push(`frase da regra: ${L.ANNUAL_SWITCH_OFFER_RULES[L.MONTH2_ANNUAL_OFFER]?.rule}`)
  if (L.month2OfferAnnualUsd(0) !== null || L.month2OfferAnnualUsd(-990) !== null || L.month2OfferAnnualUsd(9.9) !== null) p.push('regra aceita mensal inválido')
  const meta = L.annualSwitchMetadata({ existing: { a: '1' }, userId: USER, tier: 'starter', planCredits: 60, monthlyMinor: 990, annualMinor: 8300, offer: L.MONTH2_ANNUAL_OFFER })
  if (meta.annual_switch_offer !== 'month2_annual_30_2026_10_08' || meta.a !== '1') p.push(`selo da oferta na metadata: ${JSON.stringify(meta)}`)
  if (L.annualSwitchMetadata({ existing: {}, userId: USER, tier: 'starter', planCredits: 60, monthlyMinor: 990, annualMinor: 7100 }).annual_switch_offer !== L.ANNUAL_SWITCH_OFFER) p.push('sem oferta, o selo devia ser o de 05/10 (admin)')
  return p
}

/** R2: renovações pagas, puras. */
async function sRenovacoes() {
  const p = []
  const L = makeEnv().lib
  const inv = (reason, paidAt, extra = {}) => ({ billing_reason: reason, status: 'paid', amount_paid: 990, created: sec(paidAt), status_transitions: { paid_at: sec(paidAt) }, ...extra })
  const only1st = L.paidRenewals([inv('subscription_create', '2026-09-03T13:00:00Z')], null)
  if (only1st.count !== 0) p.push(`só o 1º mês pago contou ${only1st.count} renovação(ões)`)
  const one = L.paidRenewals([inv('subscription_create', '2026-09-03T13:00:00Z'), inv('subscription_cycle', RENEWED_AT)], null)
  if (one.count !== 1 || one.firstPaidAtMs !== RealDate.parse(RENEWED_AT)) p.push(`1 renovação: ${JSON.stringify(one)}`)
  const trialConv = L.paidRenewals([inv('subscription_create', '2026-09-26T13:00:00Z', { amount_paid: 100 }), inv('subscription_cycle', RENEWED_AT)], sec('2026-10-03T13:00:00Z'))
  if (trialConv.count !== 0 || trialConv.trialConversion !== true) p.push(`a conversão do teste contou como renovação: ${JSON.stringify(trialConv)}`)
  const trialPlus = L.paidRenewals([inv('subscription_cycle', '2026-11-03T13:00:00Z'), inv('subscription_cycle', RENEWED_AT)], sec('2026-10-03T13:00:00Z'))
  if (trialPlus.count !== 1 || trialPlus.firstPaidAtMs !== RealDate.parse('2026-11-03T13:00:00Z')) p.push(`teste + 2 ciclos: ${JSON.stringify(trialPlus)}`)
  const noise = L.paidRenewals([
    inv('subscription_update', RENEWED_AT), inv('subscription_cycle', RENEWED_AT, { status: 'open' }), inv('subscription_cycle', RENEWED_AT, { amount_paid: 0 }),
  ], null)
  if (noise.count !== 0) p.push(`troca de plano / fatura aberta / fatura zerada contaram: ${noise.count}`)
  const b = (renewals, status = 'active', trialEndSec = null) => L.month2SwitchBlockers({ status, trialEndSec, nowMs: T0, renewals }).map((x) => x.code).join(',')
  if (b(one) !== '') p.push(`2º mês bloqueado: ${b(one)}`)
  if (b(only1st) !== 'no_renewal_yet') p.push(`1º mês: ${b(only1st)}`)
  if (b(null) !== 'renewals_unknown') p.push(`faturas ilegíveis: ${b(null)}`)
  if (!b(one, 'trialing', sec('2026-10-10T00:00:00Z')).split(',').includes('in_trial')) p.push('assinatura em teste passou')
  return p
}

/** R3 (base): GET elegível com os números, lendo só assinatura + faturas; nada gravado. */
async function sStatusElegivel() {
  const p = []
  const env = makeEnv()
  seed(env)
  const before = snapshot(env)
  const r = await getStatus(env)
  const b = r.body ?? {}
  if (r.status !== 200 || b.live !== true || b.eligible !== true) return [`GET elegível: ${r.status} ${JSON.stringify(b)}`]
  if (b.offer?.id !== 'month2_annual_30_2026_10_08' || b.offer?.percentOff !== 30) p.push(`oferta no GET: ${JSON.stringify(b.offer)}`)
  if (b.monthlyMinor !== 990 || b.annualMinor !== 8300 || b.twelveMonthsMinor !== 11880 || b.creditsPerMonth !== 60 || b.refundDays !== 14) p.push(`números do GET: ${JSON.stringify(b)}`)
  if (stripeOps(env).join(',') !== 'subscriptions.retrieve,invoices.list') p.push(`GET chamou a Stripe além de assinatura + faturas: ${stripeOps(env).join(',')}`)
  if (env.stripe.ops('invoices.list')[0]?.params?.subscription !== SUB || env.stripe.ops('invoices.list')[0]?.params?.status !== 'paid') p.push('GET não leu as faturas PAGAS da assinatura da pessoa')
  if (snapshot(env) !== before) p.push('GET gravou algo')
  return p
}

const ELIGIBILITY_CASES = [
  // [rótulo, opções do seed, código esperado, a Stripe pode ser chamada?]
  ['1º mês (sem renovação paga)', { renewals: 0 }, 'no_renewal_yet', true],
  ['conversão do teste (1º ciclo pago depois do teste)', { renewals: 0, trialEnd: sec('2026-10-03T13:00:00Z') }, 'no_renewal_yet', true],
  ['em teste (perfil *_trial)', { plan: 'starter_trial', status: 'trialing', trialEnd: sec('2026-10-10T13:00:00Z') }, 'in_trial', false],
  ['em teste (Stripe trialing)', { status: 'trialing', trialEnd: sec('2026-10-10T13:00:00Z') }, 'in_trial', true],
  ['cancelamento agendado', { cancelAtPeriodEnd: true }, 'cancel_scheduled', true],
  ['cupom na assinatura', { discount: { id: 'di_MES2', object: 'discount', coupon: { id: 'KINEO_20', percent_off: 20 } } }, 'subscription_has_discount', true],
  ['conta interna', { email: 'test.mes2@example.com' }, 'internal_account', false],
  ['assinatura em reais', { currency: 'brl' }, 'currency_not_usd', true],
  ['já anual pelo checkout', { interval: 'year' }, 'already_annual', true],
  ['PayPal', { noStripe: true, paypal: true }, 'paypal_subscription', false],
  ['outra pessoa na metadata da assinatura', { owner: OTHER }, 'not_owner', true],
  ['Studio a 39,90 (créditos cairiam de 300 para 180)', { monthlyMinor: 3990, tier: 'pro', planCredits: 300 }, 'credits_would_change', true],
]

/** R3: cada bloqueio = GET não elegível e POST (ensaio e SEND) 409 com o motivo, nada gravado. */
async function sElegibilidade() {
  const p = []
  for (const [label, o, code, stripeAllowed] of ELIGIBILITY_CASES) {
    const env = makeEnv()
    seed(env, o)
    const before = snapshot(env)
    const g = await getStatus(env)
    if (g.status !== 200 || g.body?.eligible !== false || !(g.body?.reasons ?? []).includes(code)) p.push(`${label}: GET ${g.status} ${JSON.stringify(g.body)} (esperava ${code})`)
    for (const body of [{}, { confirm: 'SEND', annualAmountUsd: 83 }]) {
      const r = await post(env, body)
      if (r.status !== 409 || r.body?.error !== 'not_eligible' || !(r.body?.reasons ?? []).includes(code) || r.body?.nothing_written !== true) p.push(`${label}: POST ${body.confirm ?? 'ensaio'} ${r.status} ${JSON.stringify(r.body)}`)
    }
    if (!stripeAllowed && env.stripe.calls.length) p.push(`${label}: o perfil já respondia e a Stripe foi chamada (${stripeOps(env).join(',')})`)
    if (env.stripe.ops('subscriptions.update').length || env.stripe.ops('invoices.createPreview').length) p.push(`${label}: houve prévia ou update`)
    if (snapshot(env) !== before) p.push(`${label}: algo foi gravado`)
  }
  // faturas ilegíveis = falha fechada
  const env = makeEnv()
  seed(env)
  env.stripe.state.failList = true
  const g = await getStatus(env)
  if (g.body?.eligible !== false || !(g.body?.reasons ?? []).includes('renewals_unknown')) p.push(`faturas ilegíveis: ${JSON.stringify(g.body)}`)
  const r = await post(env, {})
  if (r.status !== 409 || !(r.body?.reasons ?? []).includes('renewals_unknown')) p.push(`faturas ilegíveis no ensaio: ${r.status} ${JSON.stringify(r.body)}`)
  return p
}

/** R4: o ensaio mostra a prévia e não grava nada. */
async function sEnsaio() {
  const p = []
  const env = makeEnv()
  seed(env)
  const before = snapshot(env)
  const r = await post(env, { surface: 'account_billing' })
  const b = r.body ?? {}
  if (r.status !== 200 || b.eligible !== true || !b.preview) return [`ensaio: ${r.status} ${JSON.stringify(b)}`]
  const pv = b.preview
  const credit = expectedCredit(990)
  if (pv.annualUsd !== 83 || pv.annualMinor !== 8300 || pv.monthlyMinor !== 990) p.push(`prévia sem o anual/mensal: ${JSON.stringify(pv)}`)
  if (pv.prorationCreditMinor !== credit || pv.chargedNowMinor !== 8300 - credit) p.push(`prévia: crédito ${pv.prorationCreditMinor} (esperava ${credit}), cobrado ${pv.chargedNowMinor} (esperava ${8300 - credit})`)
  const want = env.balance.renewalBalance(CREDITS_NOW, 60).balance
  if (pv.creditsBefore !== CREDITS_NOW || pv.creditsAfter !== want || pv.creditsPerMonth !== 60) p.push(`prévia sem os créditos antes/depois: ${JSON.stringify(pv)}`)
  if (pv.refundUntil !== new RealDate(T0 + 14 * DAY).toISOString()) p.push(`prévia sem o reembolso de 14 dias: ${pv.refundUntil}`)
  if (JSON.stringify(b.confirm_with) !== JSON.stringify({ confirm: 'SEND', annualAmountUsd: 83 })) p.push(`confirm_with: ${JSON.stringify(b.confirm_with)}`)
  if ('metadata_to_write' in b || 'send_with' in b || JSON.stringify(b).includes(USER) || JSON.stringify(b).includes(CUS)) p.push('o ensaio da pessoa vazou o corpo interno do admin (metadata, ids)')
  if (stripeOps(env).join(',') !== 'subscriptions.retrieve,invoices.list,products.retrieve,invoices.createPreview') p.push(`ensaio fez chamadas inesperadas à Stripe: ${stripeOps(env).join(',')}`)
  const det = env.stripe.ops('invoices.createPreview')[0]?.params?.subscription_details
  const it = det?.items?.[0]
  if (it?.id !== ITEM || it?.price_data?.unit_amount !== 8300 || it?.price_data?.recurring?.interval !== 'year' || it?.price_data?.product !== HOUSE) p.push(`prévia com price_data errado: ${JSON.stringify(it)}`)
  if (det?.proration_behavior !== 'always_invoice' || det?.billing_cycle_anchor !== 'now') p.push(`prévia sem always_invoice/âncora now: ${JSON.stringify(det)}`)
  if (snapshot(env) !== before) p.push('o ensaio gravou algo (banco ou Stripe)')
  return p
}

/** R5: a troca acontece uma vez, pelo núcleo, só na assinatura da própria pessoa. */
async function sTroca() {
  const p = []
  const env = makeEnv()
  seed(env)
  const r = await post(env, { confirm: 'SEND', annualAmountUsd: 83, surface: 'studio' })
  const b = r.body ?? {}
  if (r.status !== 200 || b.switched !== true) return [`SEND: ${r.status} ${JSON.stringify(b)}`]
  const credit = expectedCredit(990)
  const want = env.balance.renewalBalance(CREDITS_NOW, 60).balance
  if (b.result?.chargedNowMinor !== 8300 - credit || b.result?.creditsAfter !== want || b.result?.creditsGranted !== true || b.result?.refundUntil !== new RealDate(T0 + 14 * DAY).toISOString()) p.push(`resultado: ${JSON.stringify(b.result)}`)
  const ups = env.stripe.ops('subscriptions.update')
  if (ups.length !== 1) p.push(`${ups.length} updates na Stripe`)
  const u = ups[0] ?? {}
  const it = u.params?.items?.[0] ?? {}
  if (u.id !== SUB || it.id !== ITEM || it.price_data?.unit_amount !== 8300 || it.price_data?.recurring?.interval !== 'year' || it.price_data?.product !== HOUSE || it.price_data?.currency !== 'usd') p.push(`update errado: ${JSON.stringify(u.params?.items)}`)
  if (u.params?.proration_behavior !== 'always_invoice' || u.params?.billing_cycle_anchor !== 'now' || u.params?.payment_behavior !== 'error_if_incomplete') p.push(`update sem always_invoice/âncora/error_if_incomplete: ${JSON.stringify([u.params?.proration_behavior, u.params?.billing_cycle_anchor, u.params?.payment_behavior])}`)
  if (!String(u.idempotencyKey ?? '').startsWith(`kineo-annual-switch-v1:${SUB}:${ITEM}:8300:`)) p.push(`update sem a chave de idempotência do núcleo: ${u.idempotencyKey}`)
  if (u.params?.metadata?.annual_switch_offer !== 'month2_annual_30_2026_10_08' || u.params?.metadata?.supabase_user_id !== USER || u.params?.metadata?.affiliate_system !== 'custom') p.push(`metadata gravada: ${JSON.stringify(u.params?.metadata)}`)
  const ev = env.db.events('plan_switched_to_annual')
  const m = ev[0]?.metadata ?? {}
  if (ev.length !== 1 || ev[0].id !== idFor(`plan_switched_to_annual:${SUB}`) || ev[0].user_id !== USER || ev[0].path !== '/api/stripe/switch-to-annual') p.push(`razão: ${JSON.stringify(ev.map((e) => [e.id, e.user_id, e.path]))}`)
  if (m.offer !== 'month2_annual_30_2026_10_08' || m.source !== 'self_service_switch_to_annual' || m.switched_by !== 'self' || m.surface !== 'studio') p.push(`razão sem offer/source/surface: ${JSON.stringify({ offer: m.offer, source: m.source, by: m.switched_by, surface: m.surface })}`)
  if (m.annual_minor !== 8300 || m.monthly_minor !== 990 || m.amount_charged_minor !== 8300 - credit || m.credits_granted !== true || m.paid_renewals?.count !== 1) p.push(`razão com valores errados: ${JSON.stringify(m)}`)
  if (env.db.profile(USER).video_credits !== want || env.db.profile(USER).plan !== 'starter') p.push(`perfil depois da troca: ${JSON.stringify(env.db.profile(USER))}`)
  // 2º SEND, GET depois, rota do admin depois: ninguém cobra de novo
  const updates = env.stripe.ops('subscriptions.update').length
  const snap = snapshot(env)
  const again = await post(env, { confirm: 'SEND', annualAmountUsd: 83 })
  if (again.status !== 409 || again.body?.error !== 'already_switched') p.push(`2º SEND: ${again.status} ${JSON.stringify(again.body)}`)
  const g = await getStatus(env)
  if (g.body?.eligible !== false || !(g.body?.reasons ?? []).includes('already_switched')) p.push(`GET depois da troca: ${JSON.stringify(g.body)}`)
  as(env, 'admin')
  const adm = await env.adminRoute.POST({ json: async () => ({ userId: USER, annualAmountUsd: 71, confirm: 'SEND' }) })
  if (adm.status !== 200 || adm.jsonBody?.already_switched !== true || adm.jsonBody?.source !== 'ledger') p.push(`rota do admin depois da troca do 2º mês: ${adm.status} ${JSON.stringify(adm.jsonBody)}`)
  if (env.stripe.ops('subscriptions.update').length !== updates || snapshot(env) !== snap) p.push('2º SEND / GET / admin cobraram ou gravaram de novo')
  return p
}

/** R5: clique duplo = uma troca; valor diferente da prévia = 409 sem cobrar; sem valor = 400; cartão recusado = 402. */
async function sTrocaBordas() {
  const p = []
  {
    const env = makeEnv()
    seed(env)
    const [a, b] = await Promise.all([post(env, { confirm: 'SEND', annualAmountUsd: 83 }), post(env, { confirm: 'SEND', annualAmountUsd: 83 })])
    const applied = [...env.stripe.invoiceMap.values()].filter((i) => i.billing_reason === 'subscription_update')
    if (applied.length !== 1) p.push(`clique duplo aplicou ${applied.length} trocas`)
    if (env.db.events('plan_switched_to_annual').length !== 1) p.push('clique duplo gravou mais de um razão')
    if (env.db.profile(USER).video_credits !== 60) p.push(`clique duplo: saldo ${env.db.profile(USER).video_credits}`)
    if (![a.status, b.status].includes(200)) p.push(`clique duplo: nenhum 200 (${a.status}/${b.status})`)
  }
  {
    const env = makeEnv()
    seed(env)
    const before = snapshot(env)
    const r = await post(env, { confirm: 'SEND', annualAmountUsd: 84 })
    if (r.status !== 409 || r.body?.error !== 'price_changed' || r.body?.expected_annual_usd !== 83) p.push(`valor diferente da prévia: ${r.status} ${JSON.stringify(r.body)}`)
    if (env.stripe.ops('subscriptions.update').length || snapshot(env) !== before) p.push('valor diferente da prévia cobrou ou gravou')
  }
  {
    const env = makeEnv()
    seed(env)
    const r = await post(env, { confirm: 'SEND' })
    if (r.status !== 400 || r.body?.error !== 'annual_amount_required' || env.stripe.calls.length) p.push(`SEND sem valor: ${r.status} ${JSON.stringify(r.body)} (${stripeOps(env).join(',')})`)
  }
  {
    const env = makeEnv()
    seed(env)
    env.stripe.state.cardDeclined = true
    const before = snapshot(env)
    const r = await post(env, { confirm: 'SEND', annualAmountUsd: 83 })
    if (r.status !== 402 || r.body?.error !== 'card_declined' || r.body?.nothing_written !== true) p.push(`cartão recusado: ${r.status} ${JSON.stringify(r.body)}`)
    if (snapshot(env) !== before) p.push('cartão recusado gravou algo')
  }
  return p
}

/** R5: só a própria assinatura — o corpo nunca escolhe o perfil; anônimo não lê nada. */
async function sPropria() {
  const p = []
  const env = makeEnv()
  seed(env)
  seed(env, { userId: OTHER, sub: OTHER_SUB, customer: 'cus_OUTRA_01', item: 'si_OUTRA_01', email: 'outra.pessoa@example.com', invoiceEvent: false })
  const before = snapshot(env)
  const anonGet = await getStatus(env, 'anon')
  if (anonGet.status !== 200 || anonGet.body?.eligible !== false || !(anonGet.body?.reasons ?? []).includes('not_signed_in')) p.push(`GET anônimo: ${JSON.stringify(anonGet.body)}`)
  const anonPost = await post(env, { confirm: 'SEND', annualAmountUsd: 83 }, 'anon')
  if (anonPost.status !== 401) p.push(`POST anônimo: ${anonPost.status}`)
  if (env.stripe.calls.length || env.db.ops.length) p.push(`anônimo leu banco/Stripe: ${env.db.ops.join(',')} ${stripeOps(env).join(',')}`)
  // a pessoa manda o id da OUTRA no corpo: a rota ignora e age sobre a própria assinatura
  const r = await post(env, { userId: OTHER, subscriptionId: OTHER_SUB, surface: 'studio' })
  if (r.status !== 200 || r.body?.preview?.monthlyMinor !== 990) p.push(`ensaio com userId alheio no corpo: ${r.status} ${JSON.stringify(r.body)}`)
  if (env.stripe.ops('subscriptions.retrieve').some((c) => c.id !== SUB)) p.push(`o corpo escolheu a assinatura: ${env.stripe.ops('subscriptions.retrieve').map((c) => c.id).join(',')}`)
  if (snapshot(env) !== before) p.push('o ensaio com corpo alheio gravou algo')
  // superfície fora da lista não entra no razão
  const s = await post(env, { confirm: 'SEND', annualAmountUsd: 83, surface: '<script>' })
  if (s.status !== 200 || env.db.events('plan_switched_to_annual')[0]?.metadata?.surface !== null) p.push(`superfície fora da lista no razão: ${JSON.stringify(env.db.events('plan_switched_to_annual')[0]?.metadata?.surface)}`)
  if (env.stripe.subs.get(OTHER_SUB).items.data[0].price.recurring.interval !== 'month') p.push('a assinatura da OUTRA pessoa foi trocada')
  return p
}

/** R6: o arquivo sai DESLIGADO — nada aparece, nada é lido, nada é cobrado, nada é enviado. */
async function sDesligado() {
  const p = []
  const env = makeEnv({ live: false })
  seed(env)
  const before = snapshot(env)
  const g = await getStatus(env)
  if (g.status !== 200 || g.body?.live !== false || g.body?.eligible !== false || JSON.stringify(g.body?.reasons) !== '["offer_not_live"]') p.push(`GET desligado: ${JSON.stringify(g.body)}`)
  for (const body of [{}, { confirm: 'SEND', annualAmountUsd: 83 }]) {
    const r = await post(env, body)
    if (r.status !== 404 || r.body?.error !== 'offer_not_live') p.push(`POST desligado (${body.confirm ?? 'ensaio'}): ${r.status} ${JSON.stringify(r.body)}`)
  }
  if (env.stripe.calls.length || env.db.ops.length) p.push(`desligado leu banco/Stripe: ${env.db.ops.join(',')} ${stripeOps(env).join(',')}`)
  const send = await runCron(env, '?confirm=SEND')
  if (send.status !== 409 || send.body?.error !== 'offer_not_live' || env.resend.calls.length) p.push(`cron SEND desligado: ${send.status} ${JSON.stringify(send.body)} (${env.resend.calls.length} e-mails)`)
  if (snapshot(env) !== before) p.push('desligado gravou algo')
  const dry = await runCron(env, '')
  if (dry.status !== 200 || dry.body?.mode !== 'DRY_RUN' || dry.body?.live !== false || dry.body?.no_proximo_lote !== 1 || env.resend.calls.length) p.push(`cron ensaio desligado (mostra a coorte, não envia): ${dry.status} ${JSON.stringify(dry.body)}`)
  if (snapshot(env) !== before) p.push('o ensaio do cron gravou algo')
  const O = env.offer
  const status = { live: true, eligible: true, reasons: [], offer: { id: O.MONTH2_ANNUAL_OFFER, percentOff: 30 }, monthlyMinor: 990, annualMinor: 8300, twelveMonthsMinor: 11880, creditsPerMonth: 60, refundDays: 14 }
  if (O.MONTH2_ANNUAL_OFFER_LIVE !== false || O.month2OfferVisible({ live: O.MONTH2_ANNUAL_OFFER_LIVE, status, variant: 'card', dismissed: false }) !== false) p.push('desligado, a regra da tela ainda pintaria')
  const html = renderUi({ live: false, state: { status } })
  if (html !== '') p.push(`a peça renderizou desligada: ${html.slice(0, 120)}`)
  return p
}

/** R7: o e-mail sai 1× por assinatura, para quem acabou de entrar no 2º mês. */
async function sEmail() {
  const p = []
  const env = makeEnv()
  seed(env)
  // coorte de ruído: 3º mês, renovação antiga com evento atrasado, opt-out, suprimido, já anual, conversão do teste, troca de plano
  seed(env, { userId: 'd1000000-0000-4000-8000-000000000001', sub: 'sub_MES3', email: 'mes3@example.com', renewals: 2 })
  seed(env, { userId: 'd1000000-0000-4000-8000-000000000002', sub: 'sub_VELHA', email: 'velha@example.com', lastRenewalAt: '2026-09-27T13:00:00.000Z', periodStart: RealDate.parse('2026-09-27T13:00:00.000Z'), invoiceEventAt: '2026-10-02T13:00:00.000Z' })
  seed(env, { userId: 'd1000000-0000-4000-8000-000000000003', sub: 'sub_OPTOUT', email: 'optout@example.com', optedOut: true })
  seed(env, { userId: 'd1000000-0000-4000-8000-000000000004', sub: 'sub_SUPRIMIDO', email: 'suprimido@example.com' })
  seed(env, { userId: 'd1000000-0000-4000-8000-000000000005', sub: 'sub_TESTE', email: 'teste1@example.com', renewals: 0, trialEnd: sec(RENEWED_AT), trialConversionEvent: true })
  seed(env, { userId: 'd1000000-0000-4000-8000-000000000006', sub: 'sub_UPDATE', email: 'update@example.com', billingReason: 'subscription_update' })
  env.suppressed.add('d1000000-0000-4000-8000-000000000004')
  const before = snapshot(env)
  const forbidden = await runCron(env, '?confirm=SEND', 'none')
  if (forbidden.status !== 403 || env.db.ops.length || env.resend.calls.length) p.push(`cron sem segredo e sem admin: ${forbidden.status} (${env.db.ops.join(',')})`)
  const dry = await runCron(env, '')
  const d = dry.body ?? {}
  if (dry.status !== 200 || d.mode !== 'DRY_RUN' || d.no_proximo_lote !== 1 || !String(d.lista?.[0] ?? '').includes(EMAIL_ADDR) || !String(d.lista?.[0] ?? '').includes('$83/ano')) p.push(`ensaio do cron: ${dry.status} ${JSON.stringify(d)}`)
  if (d.excluidos?.nao_e_a_1a_renovacao !== 1 || d.excluidos?.renovacao_fora_da_janela !== 1 || d.excluidos?.optout !== 1 || d.suprimidos_24h !== 1) p.push(`ensaio do cron: filtros ${JSON.stringify({ ex: d.excluidos, sup: d.suprimidos_24h })}`)
  if (d.coorte_bruta !== 5) p.push(`coorte bruta ${d.coorte_bruta}: conversão do teste e troca de plano não são renovação (esperava 5)`)
  if (env.resend.calls.length || snapshot(env) !== before) p.push('o ensaio do cron enviou ou gravou')
  // SEND
  const s1 = await runCron(env, '?confirm=SEND&limit=10', 'admin')
  if (s1.status !== 200 || s1.body?.enviados !== 1 || env.resend.calls.length !== 1) return [...p, `1º SEND: ${s1.status} ${JSON.stringify(s1.body)} (${env.resend.calls.length} e-mails)`]
  const mail = env.resend.calls[0]
  if (JSON.stringify(mail.to) !== JSON.stringify([EMAIL_ADDR]) || !String(mail.from).includes('Kineo') || !mail.reply_to || !mail.headers?.['List-Unsubscribe']) p.push(`e-mail: destinatário/remetente/descadastro ${JSON.stringify({ to: mail.to, from: mail.from, h: mail.headers })}`)
  if (!/30%/.test(mail.subject) || !mail.text.includes('$83/year instead of $9.90 × 12') || !mail.text.includes('60 credits') || !mail.text.includes('14 days')) p.push(`e-mail sem a oferta da pessoa: ${mail.subject} | ${mail.text.slice(0, 300)}`)
  const link = `https://www.usekineo.com/login?redirect=${encodeURIComponent('/account?tab=billing&offer=annual&utm_source=lifecycle&utm_medium=email&utm_campaign=month2_annual_30')}`
  if (!mail.text.includes(link) || !mail.html.includes(link.split('&').join('&amp;'))) p.push('e-mail sem o link de login com destino na conta (aba de cobrança, oferta aberta)')
  if (!mail.html.includes(`data-unsub="${USER}"`) || !mail.text.includes(`unsubscribe ${USER}`)) p.push('e-mail sem o rodapé de descadastro')
  const marker = env.db.T('events').find((e) => e.id === idFor(`month2_annual_offer_sent:${SUB}`))
  if (!marker || marker.name !== 'month2_annual_offer_sent' || marker.user_id !== USER || marker.metadata?.status !== 'sent' || marker.metadata?.resend_id !== 're_1' || marker.metadata?.annual_minor !== 8300) p.push(`carimbo do e-mail: ${JSON.stringify(marker)}`)
  if (!env.quota.some((q) => q.kind === 'month2_annual_offer' && q.priority === 'revenue' && q.userId === USER && q.ok === true)) p.push(`ledger de envio: ${JSON.stringify(env.quota)}`)
  const run = env.db.events('campaign_run_v1')
  if (run.length !== 1 || run[0].metadata?.campanha !== 'month2_annual_30' || run[0].metadata?.enviados !== 1) p.push(`linha da corrida: ${JSON.stringify(run.map((x) => x.metadata))}`)
  // 2ª corrida no mesmo dia e no dia seguinte: nada sai de novo
  const s2 = await runCron(env, '?confirm=SEND')
  clock.now = T0 + DAY
  const s3 = await runCron(env, '?confirm=SEND')
  clock.now = T0
  if (env.resend.calls.length !== 1 || s2.body?.enviados !== 0 || s3.body?.enviados !== 0 || s3.body?.excluidos?.ja_recebeu !== 1) p.push(`reenvio: ${env.resend.calls.length} e-mails (${JSON.stringify([s2.body?.excluidos, s3.body?.excluidos])})`)
  if (env.db.events('month2_annual_offer_sent').length !== 1) p.push(`${env.db.events('month2_annual_offer_sent').length} carimbos`)
  // quem já trocou para o anual não recebe
  {
    const e2 = makeEnv()
    seed(e2)
    await post(e2, { confirm: 'SEND', annualAmountUsd: 83 })
    const x = await runCron(e2, '?confirm=SEND')
    if (e2.resend.calls.length || x.body?.excluidos?.ja_anual !== 1) p.push(`já anual recebeu o e-mail: ${JSON.stringify(x.body)}`)
  }
  return p
}

/** R7: o Resend falhou → a reserva some e a próxima corrida envia UMA vez. */
async function sEmailFalha() {
  const p = []
  const env = makeEnv()
  seed(env)
  env.resend.failNext = 1
  const s1 = await runCron(env, '?confirm=SEND')
  if (s1.body?.falhas !== 1 || s1.body?.enviados !== 0) p.push(`falha do Resend: ${JSON.stringify(s1.body)}`)
  if (env.db.events('month2_annual_offer_sent').length !== 0) p.push('a reserva ficou depois da falha (a pessoa nunca receberia)')
  if (!env.quota.some((q) => q.kind === 'month2_annual_offer' && q.ok === false)) p.push('a falha não foi para o ledger de envio')
  const s2 = await runCron(env, '?confirm=SEND')
  if (s2.body?.enviados !== 1 || env.resend.calls.length !== 2 || env.db.events('month2_annual_offer_sent').length !== 1) p.push(`depois da falha: ${JSON.stringify(s2.body)} (${env.resend.calls.length} chamadas)`)
  const s3 = await runCron(env, '?confirm=SEND')
  if (env.resend.calls.length !== 2 || s3.body?.enviados !== 0) p.push('depois do envio bom, saiu de novo')
  return p
}

/** R8: as frases nas 16 línguas, com os mesmos marcadores e números. */
async function sIdiomas() {
  const p = []
  const env = makeEnv()
  const C = env.offer.MONTH2_ANNUAL_COPY
  let copy
  try { copy = JSON.parse(read(COPYFILE)) } catch (e) { return [`refinementCopy.json não é JSON: ${e.message}`] }
  const langs = Object.keys(copy)
  if (langs.length !== 16 || !langs.includes('en')) p.push(`refinementCopy com ${langs.length} línguas`)
  const marks = (s) => (String(s).match(/\{[a-z]+\}/g) || []).sort().join(',')
  const nums = (s) => (String(s).match(/\d+/g) || []).sort().join(',')
  if (Object.keys(C).length !== 27) p.push(`esperava 27 frases na peça, achei ${Object.keys(C).length}`)
  for (const en of Object.values(C)) {
    for (const lang of langs) {
      const v = copy[lang]?.[en]
      if (typeof v !== 'string' || !v.trim()) { p.push(`sem tradução em ${lang}: "${en}"`); continue }
      if (lang === 'en' && v !== en) p.push(`en não é identidade: "${en}"`)
      if (marks(v) !== marks(en)) p.push(`${lang}: marcadores de "${en}" viraram ${marks(v)}`)
      if (nums(v) !== nums(en)) p.push(`${lang}: números de "${en}" viraram ${nums(v)}`)
    }
  }
  // todo erro da rota tem frase; desconhecido nunca diz "nada foi cobrado"
  const k = env.offer.month2ErrorCopyKey
  if (k('card_declined') !== 'errCard' || k('not_eligible') !== 'errNotEligible' || k('price_changed') !== 'errPriceChanged' || k('already_switched') !== 'errAlready' || k('network') !== 'errUnknown' || k(undefined) !== 'errUnknown') p.push('mapa de erros da tela mudou')
  if (/[Nn]othing was charged/.test(C.errUnknown)) p.push('o erro desconhecido afirma que nada foi cobrado')
  return p
}

// ─── a peça React, renderizada de verdade (estado injetado como no preview da casa; efeitos não rodam) ────────────────
function renderUi({ lang = 'en', live = true, state = {}, props = { variant: 'card', surface: 'account_billing' } } = {}) {
  const transforms = mergeTransforms(forceLive(live), activeMutant ?? {})
  const names = []
  const rewrite = {
    [UI]: (src) => {
      const sf = ts.createSourceFile(UI, src, ts.ScriptTarget.ES2022, true, ts.ScriptKind.TSX)
      const edits = []
      const component = sf.statements.find((n) => ts.isFunctionDeclaration(n) && n.modifiers?.some((m) => m.kind === ts.SyntaxKind.DefaultKeyword))
      const walk = (n) => {
        if (ts.isVariableDeclaration(n) && ts.isArrayBindingPattern(n.name) && n.initializer && ts.isCallExpression(n.initializer) && n.initializer.expression.getText(sf) === 'useState') {
          const name = n.name.elements[0].getText(sf)
          names.push(name)
          edits.push([n.initializer.getStart(sf), n.initializer.end, `__previewState(${JSON.stringify(name)}, ${n.initializer.arguments[0]?.getText(sf) ?? 'undefined'})`])
        }
        ts.forEachChild(n, walk)
      }
      if (component) walk(component)
      let out = src
      for (const [s, e, t] of edits.sort((a, b) => b[0] - a[0])) out = out.slice(0, s) + t + out.slice(e)
      return out
    },
  }
  const dictFor = (l) => (['en', 'es', 'hi'].includes(l) ? null : world.load(`lib/ui/interface/${l}.ts`).DICT)
  const patchedReact = { ...React, useEffect: () => {}, useCallback: (fn) => fn, useMemo: (fn) => fn(), useRef: (current) => ({ current }), useContext: () => ({ language: lang, dict: dictFor(lang), choose: () => {} }) }
  const previewState = (name, value) => {
    if (!names.includes(name)) throw new Error(`estado fora do mapa: ${name}`)
    return [Object.prototype.hasOwnProperty.call(state, name) ? state[name] : typeof value === 'function' ? value() : value, () => { throw new Error('mutação de estado no render') }]
  }
  const world = makeWorld({
    stubs: {
      react: patchedReact,
      'react-dom': { createPortal: (el) => el },
      '@/lib/analytics': { trackEvent: () => { throw new Error('telemetria no render') } },
    },
    transforms,
    globals: { React: patchedReact, __previewState: previewState, process: { env: {} }, console, fetch: () => { throw new Error('rede no render') }, Date: FakeDate, window: undefined, document: undefined, localStorage: undefined },
    jsx: 'classic',
    rewrite,
  })
  appliedLists.push(world.applied)
  const Component = world.load(UI).default
  return renderToStaticMarkup(React.createElement(Component, props))
}
const unescapeHtml = (s) => s.replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')

/** R8: a peça pinta só elegível, com números reais e em cada língua; dispensada some; modal, sucesso e erro. */
async function sTela() {
  const p = []
  const status = { live: true, eligible: true, reasons: [], offer: { id: 'month2_annual_30_2026_10_08', percentOff: 30 }, tier: 'starter', monthlyMinor: 990, annualMinor: 8300, twelveMonthsMinor: 11880, creditsPerMonth: 60, refundDays: 14 }
  const en = unescapeHtml(renderUi({ state: { status } }))
  for (const want of ['Switch to annual and save 30%', '$83/year instead of $9.90 × 12. Unused days are credited. Full refund within 14 days.', 'Same plan, same 60 credits every month.', 'Switch to annual →', 'data-kineo="month2-annual-card"']) {
    if (!en.includes(want)) p.push(`cartão (en) sem "${want}"`)
  }
  if (/\{[a-z]+\}/.test(en)) p.push(`marcador sobrando no cartão: ${en.match(/\{[a-z]+\}/)[0]}`)
  const pt = unescapeHtml(renderUi({ lang: 'pt', state: { status } }))
  if (!pt.includes('Mude para o anual e economize 30%') || !pt.includes('$83/ano em vez de $9.90 × 12') || /\{[a-z]+\}/.test(pt)) p.push(`cartão (pt): ${pt.slice(0, 300)}`)
  const ar = unescapeHtml(renderUi({ lang: 'ar', state: { status } }))
  if (!ar.includes('انتقل إلى الخطة السنوية ووفّر 30%') || /\{[a-z]+\}/.test(ar)) p.push(`cartão (ar): ${ar.slice(0, 200)}`)
  if (renderUi({ state: { status: { ...status, eligible: false, reasons: ['no_renewal_yet'] } } }) !== '') p.push('não elegível pintou')
  if (renderUi({ state: { status: null } }) !== '') p.push('sem estado do servidor pintou')
  const notice = unescapeHtml(renderUi({ state: { status }, props: { variant: 'notice', surface: 'studio' } }))
  if (!notice.includes('data-kineo="month2-annual-notice"') || !notice.includes('aria-label="Dismiss"') || !notice.includes('$83/year instead of $9.90 × 12')) p.push(`aviso do /studio: ${notice.slice(0, 300)}`)
  if (renderUi({ state: { status, dismissed: true }, props: { variant: 'notice', surface: 'studio' } }) !== '') p.push('aviso dispensado continuou pintando')
  const credit = expectedCredit(990)
  const preview = { annualUsd: 83, annualMinor: 8300, monthlyMinor: 990, prorationCreditMinor: credit, chargedNowMinor: 8300 - credit, creditsPerMonth: 60, creditsBefore: CREDITS_NOW, creditsAfter: 60, refundUntil: new RealDate(T0 + 14 * DAY).toISOString() }
  const money = (minor) => `$${Math.floor(minor / 100)}.${String(minor % 100).padStart(2, '0')}`
  const modal = unescapeHtml(renderUi({ state: { status, modal: true, phase: 'preview', preview } }))
  for (const want of ['role="dialog"', 'Annual plan', '$83/year', `− ${money(credit)}`, `Due today`, money(8300 - credit), `${CREDITS_NOW} → 60`, '60 credits', 'Full refund until', `Confirm — pay ${money(8300 - credit)} today`, 'Not now']) {
    if (!modal.includes(want)) p.push(`modal da prévia sem "${want}"`)
  }
  const done = unescapeHtml(renderUi({ state: { status, modal: true, phase: 'done', result: { chargedNowMinor: 8300 - credit, creditsAfter: 60, refundUntil: preview.refundUntil } } }))
  if (!done.includes("Done — you're on the annual plan.") || !done.includes(`Charged today: ${money(8300 - credit)}. Balance: 60 credits.`)) p.push(`sucesso: ${done.slice(0, 300)}`)
  const declined = unescapeHtml(renderUi({ state: { status, modal: true, phase: 'error', error: 'card_declined' } }))
  if (!declined.includes('Your card was declined.')) p.push('erro de cartão sem a frase')
  const lost = unescapeHtml(renderUi({ state: { status, modal: true, phase: 'error', error: 'network' } }))
  if (!lost.includes('We could not confirm the switch.') || lost.includes('Nothing was charged')) p.push('resposta perdida afirmou "nada foi cobrado"')
  return p
}

/** R9: estrutura — um só update da Stripe, fronteira servidor/cliente, supressão, sink, vercel.json, doc. */
function sEstrutura() {
  const p = []
  const shipped = /^export const MONTH2_ANNUAL_OFFER_LIVE = (true|false)$/m.exec(read(OFFER))
  if (!shipped || shipped[1] !== String(EXPECTED_SHIPPED_LIVE)) p.push(`o interruptor sai ${shipped?.[1] ?? '?'} no arquivo; o esperado é ${EXPECTED_SHIPPED_LIVE} (ligar = "liga" do fundador, no mesmo commit que muda EXPECTED_SHIPPED_LIVE)`)
  const core = read(CORE)
  const self = read(SELF)
  const admin = read(ADMIN_ROUTE)
  const cron = read(CRON)
  const ui = read(UI)
  if ((core.match(/stripe\.subscriptions\.update\(/g) || []).length !== 1) p.push('o núcleo não tem exatamente UM update da Stripe')
  for (const [f, s] of [[SELF, self], [ADMIN_ROUTE, admin], [CRON, cron]]) if (/subscriptions\.update\(|invoices\.createPreview\(/.test(s)) p.push(`${f} chama a Stripe por conta própria (a troca é só do núcleo)`)
  for (const [f, s] of [[SELF, self], [ADMIN_ROUTE, admin]]) if (!/import \{[^}]*\brunAnnualSwitch\b[^}]*\} from '@\/lib\/billing\/annualSwitchCore'/.test(s)) p.push(`${f} não troca pelo núcleo único`)
  if (/body\.userId|body\.subscriptionId|userId\?: unknown/.test(self)) p.push('o autoatendimento lê o dono do corpo do pedido')
  if ((self.match(/\.eq\('id', user\.id\)/g) || []).length !== 2) p.push('o autoatendimento não lê o perfil pelo id da SESSÃO (GET e POST)')
  const email = /[a-z0-9._%+-]+@[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}/i
  for (const f of [OFFER, LIB, CORE, EMAIL, SELF, CRON, UI, DOC]) if (existsSync(join(root, f)) && email.test(read(f))) p.push(`e-mail literal em ${f}`)
  if (!/^export const fetchCache = 'force-no-store'$/m.test(cron) || !/global: \{ fetch: freshFetch \}/.test(cron)) p.push('cron sem force-no-store + freshFetch (o marcador "já enviado" leria do cache)')
  for (const needle of ['loadLifecycleSuppression(admin', 'registrarCorrida(admin', 'recordResendResponse(', "p.email_opted_out === true"]) if (!cron.includes(needle)) p.push(`cron sem ${needle}`)
  if (!/^export const fetchCache = 'force-no-store'$/m.test(self)) p.push('autoatendimento sem force-no-store')
  // Desligado: o cron NÃO está agendado (o fundador liga depois). Ligado: está, e com o token de escrita (senão dry-run eterno).
  const crons = (JSON.parse(read(VERCEL)).crons ?? []).filter((c) => String(c.path).startsWith('/api/cron/send-month2-annual-offer'))
  if (!EXPECTED_SHIPPED_LIVE && crons.length) p.push('o cron entrou no vercel.json com a oferta desligada (o fundador liga depois)')
  if (EXPECTED_SHIPPED_LIVE && (crons.length !== 1 || !String(crons[0].path).includes('confirm=SEND'))) p.push('oferta ligada sem o cron no vercel.json (com ?confirm=SEND)')
  const events = read(EMAIL_EVENTS)
  if (!/^ {2}'month2_annual_offer_sent',$/m.test(events)) p.push('carimbo fora da lista canônica da supressão (lib/lifecycle/emailEvents.ts)')
  const sink = read(SINK)
  const setStart = sink.indexOf('const SERVER_ONLY_EVENTS = new Set([')
  const setEnd = setStart >= 0 ? sink.indexOf('\n])', setStart) : -1
  const live = setStart >= 0 && setEnd > setStart ? sink.slice(setStart, setEnd).split('\n').map((l) => l.replace(/\/\/.*$/, '')).join('\n') : ''
  const names = new Set([...live.matchAll(/'([^']+)'/g)].map((m) => m[1]))
  if (!names.has('month2_annual_offer_sent') || !names.has('plan_switched_to_annual')) p.push('carimbo do e-mail / razão não são só-servidor no sink /api/events')
  // a peça: o interruptor vem ANTES de qualquer chamada à rota
  const iGate = ui.indexOf('    if (!MONTH2_ANNUAL_OFFER_LIVE) return\n')
  const iFetch = ui.indexOf('void fetch(MONTH2_ANNUAL_API')
  if (iGate <= 0 || iFetch <= 0 || iGate > iFetch) p.push('a peça chama a rota sem olhar o interruptor primeiro')
  if (/\$\s?\d/.test(ui)) p.push('preço digitado na peça')
  // superfícies: uma vez cada, a da conta só para assinante pago
  const acc = read(ACCOUNT)
  if ((acc.match(/<Month2AnnualOffer\b/g) || []).length !== 1 || !acc.includes("{tier !== 'free' && <Month2AnnualOffer variant=\"card\" surface=\"account_billing\" />}")) p.push('conta: o cartão não está (uma vez) só para assinante pago')
  const st = read(STUDIO)
  if ((st.match(/<Month2AnnualOffer\b/g) || []).length !== 1 || !st.includes('<Month2AnnualOffer variant="notice" surface="studio" />')) p.push('/studio: o aviso não está (uma vez)')
  // fronteira servidor/cliente: nenhum 'use client' importa o núcleo (node:crypto + Stripe)
  const clientFiles = []
  const walk = (dir) => {
    for (const name of readdirSync(join(root, dir))) {
      if (name === 'node_modules' || name.startsWith('.')) continue
      const rel = `${dir}/${name}`
      const st2 = statSync(join(root, rel))
      if (st2.isDirectory()) walk(rel)
      else if (/\.(tsx?|jsx?)$/.test(name)) {
        const s = readFileSync(join(root, rel), 'utf8')
        if (/^\s*['"]use client['"]/.test(s)) clientFiles.push([rel, s])
      }
    }
  }
  for (const d of ['app', 'components', 'lib']) walk(d)
  if (clientFiles.length < 50) p.push(`varredura de componentes de cliente achou só ${clientFiles.length} (o regex quebrou?)`)
  for (const [rel, s] of clientFiles) if (/billing\/annualSwitchCore|billing\/annualSwitch'|billing\/month2AnnualEmail/.test(s)) p.push(`${rel} ('use client') importa o núcleo, a regra do servidor ou o e-mail`)
  if (!clientFiles.some(([rel]) => rel === UI)) p.push('a peça não é componente de cliente')
  // doc
  if (!existsSync(join(root, DOC))) p.push('doc ausente')
  else {
    const doc = read(DOC)
    for (const needle of ['MONTH2_ANNUAL_OFFER_LIVE', 'month2_annual_30_2026_10_08', '/api/stripe/switch-to-annual', '/api/cron/send-month2-annual-offer', 'confirm=SEND', 'vercel.json', 'plan_switched_to_annual', 'month2_annual_offer_sent', 'US$ 83', 'US$ 461', 'Como medir', 'Como ligar']) {
      if (!doc.includes(needle)) p.push(`doc sem "${needle}"`)
    }
  }
  return p
}

const SCENARIOS = {
  regra: sRegra,
  renovacoes: sRenovacoes,
  statusElegivel: sStatusElegivel,
  elegibilidade: sElegibilidade,
  ensaio: sEnsaio,
  troca: sTroca,
  trocaBordas: sTrocaBordas,
  propria: sPropria,
  desligado: sDesligado,
  email: sEmail,
  emailFalha: sEmailFalha,
  idiomas: sIdiomas,
  tela: sTela,
  estrutura: async () => sEstrutura(),
}
async function run(name, mutant = null) {
  activeMutant = mutant
  appliedLists.length = 0
  try {
    return await SCENARIOS[name]()
  } catch (e) {
    return [`exceção: ${e?.stack?.split('\n').slice(0, 3).join(' | ') ?? e}`]
  } finally {
    activeMutant = null
    clock.now = T0
  }
}

for (const name of Object.keys(SCENARIOS)) {
  const problems = await run(name)
  check(problems.length === 0, `cenário ${name}${problems.length ? ': ' + problems.slice(0, 4).join(' · ') : ''}`)
}

// ═══ mutantes: cada regra quebrada TEM de derrubar a sua prova ════════════════════════════════════════════════════════
/** Mutante de TEXTO (lido por sEstrutura/sIdiomas/sDesligado): troca o conteúdo do "disco" do guardião. */
function textMutant(file, from, to, label) {
  return { file, t: replaceOnce(from, to, label) }
}
const MUTANTS = [
  ['M1 desconto vira 25%', { [OFFER]: [replaceOnce('export const MONTH2_ANNUAL_PERCENT_OFF = 30', 'export const MONTH2_ANNUAL_PERCENT_OFF = 25', '25%')] }, 'regra'],
  ['M2 regra arredonda para baixo', { [LIB]: [replaceOnce('return Math.floor((monthlyMinor * 12 * (100 - MONTH2_ANNUAL_PERCENT_OFF) + 5000) / 10000)', 'return Math.floor((monthlyMinor * 12 * (100 - MONTH2_ANNUAL_PERCENT_OFF)) / 10000)', 'piso')] }, 'regra'],
  ['M3 conversão do teste vira renovação', { [LIB]: [replaceOnce('  const renewals = trialConversion ? cycles.slice(1) : cycles\n', '  const renewals = cycles\n', 'sem descontar a conversão')] }, 'renovacoes'],
  ['M4 autoatendimento sem exigir a renovação', { [SELF]: [replaceOnce('    requirePaidRenewal: true,\n    source: ', '    requirePaidRenewal: false,\n    source: ', 'sem renovação no POST')] }, 'elegibilidade'],
  ['M5 conta interna vai até a Stripe', { [LIB]: [replaceOnce("  if (isInternalEmail(profile.email)) return 'internal_account'\n", '', 'sem o atalho da conta interna')] }, 'elegibilidade'],
  ['M6 ensaio vira SEND', { [SELF]: [replaceOnce("  const send = body.confirm === 'SEND'\n", '  const send = true\n', 'ensaio = SEND')] }, 'ensaio'],
  ['M7 o corpo escolhe o perfil', { [SELF]: [replaceOnce("  const { data: profile, error } = await admin.from('profiles').select(ANNUAL_SWITCH_PROFILE_COLUMNS).eq('id', user.id).maybeSingle()\n  if (error || !profile) return NextResponse.json({ error: 'unavailable', nothing_written: true }, { status: 503 })", "  const { data: profile, error } = await admin.from('profiles').select(ANNUAL_SWITCH_PROFILE_COLUMNS).eq('id', typeof (body as { userId?: unknown }).userId === 'string' ? String((body as { userId?: unknown }).userId) : user.id).maybeSingle()\n  if (error || !profile) return NextResponse.json({ error: 'unavailable', nothing_written: true }, { status: 503 })", 'perfil do corpo')] }, 'propria'],
  ['M8 SEND cobra sem conferir o valor da prévia', { [CORE]: [replaceOnce('  const requested = input.amountOptionalOnDryRun && !send && (input.requestedAnnualUsd === undefined || input.requestedAnnualUsd === null)\n    ? expectedUsd\n    : input.requestedAnnualUsd\n', '  const requested = expectedUsd\n', 'valor da regra no SEND')] }, 'trocaBordas'],
  ['M9 dono da assinatura não é conferido', { [CORE]: [replaceOnce("  const ownerMatches = (ownerFromMeta === '' || ownerFromMeta === userId) &&\n", "  const ownerMatches = true || (ownerFromMeta === '' || ownerFromMeta === userId) &&\n", 'sem dono')] }, 'elegibilidade'],
  ['M10 troca sem always_invoice (o núcleo é o mesmo do admin)', { [CORE]: [replaceOnce("const PRORATION = 'always_invoice' as const", "const PRORATION = 'create_prorations' as const", 'create_prorations')] }, 'troca'],
  ['M11 e-mail para o 3º mês', { [CRON]: [replaceOnce('if (!ev.renewals || ev.renewals.count !== 1 || ev.renewals.firstPaidAtMs === null)', 'if (!ev.renewals || ev.renewals.firstPaidAtMs === null)', 'qualquer renovação')] }, 'email'],
  ['M12 carimbo por corrida (reenvia no dia seguinte)', { [CRON]: [replaceOnce('const markerOf = (sid: string) => eventIdFor(`${MONTH2_ANNUAL_EMAIL_SENT_EVENT}:${sid}`)', 'const markerOf = (sid: string) => eventIdFor(`${MONTH2_ANNUAL_EMAIL_SENT_EVENT}:${sid}:${readAt}`)', 'carimbo por corrida')] }, 'email'],
  ['M13 cron envia com a oferta desligada', { [CRON]: [replaceOnce('  if (confirm && !MONTH2_ANNUAL_OFFER_LIVE) {\n', '  if (false) {\n', 'sem o interruptor no cron')] }, 'desligado'],
  ['M14 reserva fica depois da falha do Resend', { [CRON]: [replaceOnce("    if (!res.ok) {\n      await admin.from('events').delete().eq('id', markerId)\n", '    if (!res.ok) {\n', 'reserva presa')] }, 'emailFalha'],
  ['M15 supressão de 24 h ignorada', { [CRON]: [replaceOnce('  const alvos = candidatos.filter((c) => !sup.isSuppressed(c.userId))\n', '  const alvos = candidatos\n', 'sem supressão')] }, 'email'],
  ['M16 opt-out ignorado', { [CRON]: [replaceOnce('    if (p.email_opted_out === true) { excluidos.optout++; continue }\n', '', 'sem opt-out')] }, 'email'],
  ['M17 GET lê com a oferta desligada', { [SELF]: [replaceOnce("  if (!MONTH2_ANNUAL_OFFER_LIVE) return NextResponse.json(closedStatus(['offer_not_live'], false))\n", '', 'GET sem interruptor')] }, 'desligado'],
  ['M18 POST cobra com a oferta desligada', { [SELF]: [replaceOnce("  if (!MONTH2_ANNUAL_OFFER_LIVE) return NextResponse.json({ error: 'offer_not_live', nothing_written: true }, { status: 404 })\n", '', 'POST sem interruptor')] }, 'desligado'],
  ['M19 a peça pinta sem a renovação confirmada pelo servidor', { [OFFER]: [replaceOnce('  if (!s || s.live !== true || s.eligible !== true) return false\n', '  if (!s || s.live !== true) return false\n', 'sem eligible')] }, 'tela'],
  ['M20 aviso dispensado volta', { [OFFER]: [replaceOnce("  if (input.variant === 'notice' && input.dismissed) return false\n", '', 'dispensa ignorada')] }, 'tela'],
]
const TEXT_MUTANTS = [
  ['M21 o interruptor sai no estado errado no arquivo', textMutant(OFFER, `export const MONTH2_ANNUAL_OFFER_LIVE = ${EXPECTED_SHIPPED_LIVE}`, `export const MONTH2_ANNUAL_OFFER_LIVE = ${!EXPECTED_SHIPPED_LIVE}`, 'estado trocado no arquivo'), 'estrutura'],
  ['M22 carimbo fora da lista canônica da supressão', textMutant(EMAIL_EVENTS, "  'month2_annual_offer_sent',\n", '', 'fora da lista'), 'estrutura'],
  ['M23 a peça chama a rota sem olhar o interruptor', textMutant(UI, '    if (!MONTH2_ANNUAL_OFFER_LIVE) return\n', '', 'fetch sem interruptor'), 'estrutura'],
  ['M24 tradução some em pt', textMutant(COPYFILE, '    "Switch to annual and save {percent}%": "Mude para o anual e economize {percent}%",\n', '', 'sem pt'), 'idiomas'],
  ['M25 tradução perde o marcador', textMutant(COPYFILE, '"Mude para o anual e economize {percent}%"', '"Mude para o anual e economize 30%"', 'marcador perdido'), 'idiomas'],
  ['M26 o cron entra no vercel.json', textMutant(VERCEL, '"crons": [', '"crons": [{ "path": "/api/cron/send-month2-annual-offer?confirm=SEND", "schedule": "17 14 * * *" }, ', 'cron agendado'), 'estrutura'],
]
let killed = 0
for (const [label, transforms, scenario] of MUTANTS) {
  const problems = await run(scenario, transforms)
  const files = Object.keys(transforms)
  const loaded = files.every((f) => appliedLists.some((list) => list.some((a) => a.startsWith(`${f} :: `))))
  const red = problems.length > 0
  if (red && loaded) killed++
  check(loaded, `mutante "${label}": aplicado e carregado (prova por âncora única)`)
  check(red, `mutante "${label}": derrubou o cenário ${scenario}`)
  if (VERBOSE && red) console.log(`      → ${problems[0]}`)
}
for (const [label, m, scenario] of TEXT_MUTANTS) {
  const original = read(m.file)
  let mutated = null
  try { mutated = m.t.apply(original) } catch (e) { check(false, `mutante "${label}": ${e.message}`); continue }
  disk.set(m.file, mutated)
  const problems = await run(scenario)
  disk.set(m.file, original)
  const red = problems.length > 0
  // replaceOnce já exigiu âncora única, texto novo presente e âncora ausente; aqui só a prova de que o disco mudou.
  const appliedProof = typeof mutated === 'string' && mutated !== original
  if (red && appliedProof) killed++
  check(appliedProof, `mutante "${label}": aplicado (o texto do disco mudou)`)
  check(red, `mutante "${label}": derrubou o cenário ${scenario}`)
  if (VERBOSE && red) console.log(`      → ${problems[0]}`)
}
// a base volta verde depois dos mutantes de texto (o disco foi restaurado)
{
  const again = await run('estrutura')
  check(again.length === 0, `base restaurada depois dos mutantes de texto${again.length ? ': ' + again.join(' · ') : ''}`)
}

const total = passed + failed.length
console.log(`\n  verificações: ${total} · falhas: ${failed.length} · mutantes derrubados: ${killed}/${MUTANTS.length + TEXT_MUTANTS.length}`)
if (failed.length) {
  for (const f of failed) console.log('  ✗ ' + f)
  process.exit(1)
}
console.log('OK — anual no 2º mês: regra 0,7, renovação paga, ensaio sem escrita, troca única pelo núcleo, só a própria assinatura, interruptor desligado, e-mail 1× por assinatura, 16 línguas')
