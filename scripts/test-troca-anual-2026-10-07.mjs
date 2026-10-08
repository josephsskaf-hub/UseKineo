#!/usr/bin/env node
// ═══ KINEO-TROCA-ANUAL-2026-10-07 — guardião da troca mensal → anual (POST /api/admin/switch-to-annual) ══════════════
// Executa o CÓDIGO REAL (readFileSync + ts.transpileModule; o alias @/ é resolvido AQUI, nunca pelo Node; sem rede, sem
// banco, sem .env, sem chave da Stripe): a rota nova, o webhook da Stripe, o cron da recarga anual e o builder do
// checkout, contra uma Stripe FALSA (assinaturas, prévia de fatura, troca com idempotência, recusa de cartão) e um
// banco FALSO em memória. Prova:
//   R1 · o ENSAIO não chama nenhum update (só lê a assinatura e pede a prévia) e não grava nada;
//   R2 · a regra do valor é a dos e-mails de 05/10 (9,90→71 · 12,90→93 · 15,92→115 · 19,90→143 · 29→209, ao dólar mais
//        próximo) e 1 dólar acima ou abaixo é recusado (422) sem prévia nem troca;
//   R3 · o SEND faz UM update do item com price_data anual (interval 'year'), proration 'always_invoice', âncora 'now'
//        e payment_behavior 'error_if_incomplete', com chave de idempotência; e concede a cota do 1º mês do ano pago
//        pela régua da renovação (saldo = renewalBalance(antes, cota): a cota reinicia, o comprado acima sobrevive);
//   R4 · a metadata fica igual à do checkout anual: as chaves de sistema do checkout logado e os valores do builder
//        (lib/stripe/guestCheckout.ts executado com billing 'annual'), sem perder nada da metadata original — e uma
//        assinatura antiga SEM tier/dono passa a ser reconhecida pelo cron e pelo webhook depois da troca;
//   R5 · a segunda execução não cobra nem concede de novo (nem chama a Stripe); dois cliques simultâneos aplicam UMA
//        troca e UMA cota; razão que não gravou é completado (com a cota, uma vez) sem cobrar; perfil que não gravou
//        deixa a cota pendente e o SEND seguinte a concede só se o saldo ainda é o de antes; marca que não gravou não
//        vira concessão em dobro;
//   R6 · conta não-admin (e anônimo) recebe 403, sem Stripe e sem escrita;
//   R7 · o webhook da fatura da troca (billing_reason 'subscription_update') não concede crédito em dobro; o cron solta
//        os meses 1..11 (+1 a +11 meses), uma vez cada — com a cota da troca, 12 cotas no ano pago — e a renovação
//        anual do ano seguinte concede uma vez;
//   +   · cartão recusado = 402 e nada gravado (nem na Stripe nem no banco); bloqueios (cupom, conta interna, créditos
//        que mudariam, teste, anual do checkout, BRL) recusam o SEND; o nome do evento é só do servidor no sink.
// Depois, MUTANTES em memória: cada regra é quebrada por uma troca de texto com PROVA DE APLICAÇÃO (âncora única, texto
// novo presente, âncora ausente, arquivo carregado) e a prova correspondente TEM de ficar vermelha.
//
// Rodar: node scripts/test-troca-anual-2026-10-07.mjs [--verbose]
import { existsSync, readFileSync, statSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join, posix } from 'node:path'
import { fileURLToPath } from 'node:url'
import * as nodeCrypto from 'node:crypto'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const nodeRequire = createRequire(join(root, 'package.json'))
const ts = nodeRequire('typescript')
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

const ROUTE = 'app/api/admin/switch-to-annual/route.ts'
const LIB = 'lib/billing/annualSwitch.ts'
const WEBHOOK = 'app/api/stripe/webhook/route.ts'
const CRON = 'app/api/cron/annual-credit-refill/route.ts'
const CHECKOUT = 'app/api/stripe/checkout/route.ts'
const GUEST = 'lib/stripe/guestCheckout.ts'
const SINK = 'app/api/events/route.ts'
const SHARED_DB = 'app/api/admin/_shared/db.ts'
const PRICING = 'lib/checkoutPricing.ts'
const BALANCE = 'lib/credits/renewalBalance.ts'
const DOC = 'docs/TROCA-ANUAL-PRIMEIROS-ASSINANTES-2026-10-07.md'
const VERCEL = 'vercel.json'

// ─── mini sistema de módulos: TS real, imports resolvidos por nós, stubs só para I/O ───────────────────────────────────
function fileFor(rel) {
  for (const c of [rel, `${rel}.ts`, `${rel}.tsx`, `${rel}/index.ts`]) {
    const abs = join(root, c)
    if (existsSync(abs) && statSync(abs).isFile()) return c
  }
  return null
}
const transpiled = new Map()
function transpile(rel, src) {
  const key = `${rel}\u0000${nodeCrypto.createHash('sha1').update(src).digest('hex')}`
  if (!transpiled.has(key)) {
    transpiled.set(key, ts.transpileModule(src, {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true, jsx: ts.JsxEmit.ReactJSX },
      fileName: rel,
    }).outputText)
  }
  return transpiled.get(key)
}

/** Troca de texto com prova de aplicação: a âncora existe UMA vez, o texto novo aparece e a âncora some. */
function replaceOnce(from, to, label) {
  return {
    label,
    apply(src) {
      const count = src.split(from).length - 1
      if (count !== 1) throw new Error(`mutante "${label}" sem âncora única (${count})`)
      const out = src.split(from).join(to)
      if (to && !out.includes(to)) throw new Error(`mutante "${label}" não aplicou`)
      if (!to.includes(from) && out.includes(from)) throw new Error(`mutante "${label}": a âncora continua no fonte`)
      return out
    },
  }
}

function makeWorld({ stubs, transforms = {}, globals }) {
  const cache = new Map()
  const applied = []
  function load(rel) {
    const hit = cache.get(rel)
    if (hit) return hit.exports
    let src = read(rel)
    for (const t of transforms[rel] ?? []) {
      const before = src
      src = t.apply(src)
      if (src === before) throw new Error(`mutante sem efeito em ${rel}: ${t.label}`)
      applied.push(`${rel} :: ${t.label}`)
    }
    const mod = { exports: {} }
    cache.set(rel, mod)
    const req = (spec) => {
      if (Object.prototype.hasOwnProperty.call(stubs, spec)) return stubs[spec]
      if (spec.startsWith('node:')) return nodeRequire(spec)
      let target = null
      if (spec.startsWith('@/')) target = spec.slice(2)
      else if (spec.startsWith('./') || spec.startsWith('../')) target = posix.normalize(posix.join(posix.dirname(rel), spec))
      if (target) {
        const f = fileFor(target)
        if (!f) throw new Error(`módulo não encontrado: ${spec} (importado por ${rel})`)
        return load(f)
      }
      throw new Error(`import inesperado em ${rel}: ${spec}`)
    }
    const names = Object.keys(globals)
    new Function('require', 'module', 'exports', ...names, transpile(rel, src))(req, mod, mod.exports, ...names.map((k) => globals[k]))
    return mod.exports
  }
  return { load, applied }
}

// ─── relógio: a troca acontece em 08/10/2026 13:00 UTC; o mês da pessoa começou em 02/10 ─────────────────────────────
const RealDate = Date
const T0 = RealDate.parse('2026-10-08T13:00:00.000Z')
const PERIOD_START = RealDate.parse('2026-10-02T13:00:00.000Z')
const DAY = 24 * 60 * 60 * 1000
const clock = { now: T0 }
class FakeDate extends RealDate {
  constructor(...args) {
    if (args.length === 0) super(clock.now)
    else super(...args)
  }
  static now() { return clock.now }
}
/** A mesma aritmética de lib/billing/annualRefill.ts (addUtcMonths), escrita aqui para não depender do código testado. */
function addMonthsMs(ms, months) {
  const d = new RealDate(ms)
  const day = d.getUTCDate()
  const t = new RealDate(RealDate.UTC(d.getUTCFullYear(), d.getUTCMonth() + months, 1, d.getUTCHours(), d.getUTCMinutes(), d.getUTCSeconds()))
  const last = new RealDate(RealDate.UTC(t.getUTCFullYear(), t.getUTCMonth() + 1, 0)).getUTCDate()
  t.setUTCDate(Math.min(day, last))
  return t.getTime()
}
const clone = (v) => (v === undefined || v === null ? v : JSON.parse(JSON.stringify(v)))
const nowIso = () => new RealDate(clock.now).toISOString()

// ─── falsos: resposta do Next, banco (PostgREST), Stripe ───────────────────────────────────────────────────────────────
class FakeResponse {
  constructor(body, init = {}) {
    this.status = init.status ?? 200
    this.body = body
    this.jsonBody = undefined
    this.headerMap = new Map(Object.entries(init.headers ?? {}).map(([k, v]) => [k.toLowerCase(), String(v)]))
    this.cookies = { set() {} }
    this.headers = { get: (k) => this.headerMap.get(String(k).toLowerCase()) ?? null, set: (k, v) => this.headerMap.set(String(k).toLowerCase(), String(v)) }
  }
  static redirect(url, status = 307) {
    const r = new FakeResponse(null, { status: typeof status === 'number' ? status : 307 })
    r.headerMap.set('location', String(url))
    return r
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
  const T = (name) => (tables[name] ??= [])
  const UNIQUE = { events: ['id'], stripe_events: ['id'], profiles: ['id'], affiliate_referrals: ['referred_user_id'], affiliate_commissions: ['provider', 'external_id'] }
  const getPath = (row, col) => {
    const parts = String(col).split('->>')
    let v = row[parts[0]]
    if (parts.length > 1) v = v && typeof v === 'object' ? v[parts[1]] : undefined
    return v === undefined ? null : v
  }
  /** Falha injetada: a próxima operação `op` em `table` devolve erro (o banco caiu naquele instante). */
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
        const inserted = this.payload.map((r) => ({
          ...(this.table !== 'stripe_events' && !r.id ? { id: nodeCrypto.randomUUID() } : {}),
          created_at: r.created_at ?? nowIso(),
          ...clone(r),
        }))
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
    T,
    failOnce(table, op) { failures.push({ table, op, error: { code: '08006', message: 'connection failure (injetada pelo guardião)' } }) },
    from: (t) => new Query(t),
    profile(id) { return T('profiles').find((p) => p.id === id) ?? null },
    events(name) { return T('events').filter((e) => e.name === name) },
  }
}

/** A Stripe que importa aqui: ler/atualizar assinatura, prévia de fatura, idempotência, recusa de cartão, lista. */
function makeStripe() {
  const subs = new Map()
  const invoices = new Map()
  const products = new Map()
  const calls = []
  const idem = new Map()
  const state = { cardDeclined: false }
  let seq = 0
  const nextId = (p) => `${p}T${(++seq).toString(36).padStart(4, '0')}`
  const stripeError = (type, code, message, statusCode, extra = {}) => Object.assign(new Error(message), { type, code, statusCode, raw: { message }, ...extra })
  const missing = (what, id) => stripeError('StripeInvalidRequestError', 'resource_missing', `No such ${what}: '${id}'`, 404)

  /** O crédito do tempo não usado do item atual (o rateio da Stripe por segundos do período). */
  function unusedCredit(sub) {
    const item = sub.items.data[0]
    const nowSec = Math.floor(clock.now / 1000)
    const total = Math.max(1, sub.current_period_end - sub.current_period_start)
    const remaining = Math.max(0, sub.current_period_end - nowSec)
    return Math.round(item.price.unit_amount * (item.quantity ?? 1) * remaining / total)
  }
  /** A fatura imediata de uma troca de item com âncora 'now' (prévia ou real). */
  function switchInvoice(sub, details, persist) {
    const it = details.items[0]
    const pd = it.price_data
    const credit = details.proration_behavior === 'none' ? 0 : unusedCredit(sub)
    const unit = pd.unit_amount * (it.quantity ?? 1)
    const total = unit - credit
    return {
      id: persist ? nextId('in_') : null,
      object: 'invoice',
      subscription: sub.id,
      customer: sub.customer,
      billing_reason: 'subscription_update',
      currency: pd.currency,
      amount_due: Math.max(0, total),
      amount_paid: 0,
      total,
      starting_balance: 0,
      status: 'draft',
      lines: {
        object: 'list',
        has_more: false,
        data: [
          { amount: -credit, proration: true, description: `Unused time on ${sub.items.data[0].price.product}` },
          { amount: unit, proration: false, description: `1 × ${pd.product} (at $${(unit / 100).toFixed(2)} / ${pd.recurring.interval})` },
        ],
      },
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
    if (!params.items) { s.metadata = meta; return expandSub(s, params) }
    const inv = switchInvoice(s, { items: params.items, proration_behavior: params.proration_behavior ?? 'create_prorations' }, true)
    const behavior = params.payment_behavior ?? 'allow_incomplete'
    const declined = state.cardDeclined && inv.amount_due > 0
    if (declined && behavior === 'error_if_incomplete') {
      // A Stripe tenta cobrar, a cobrança falha e a troca NÃO é aplicada (402).
      throw stripeError('StripeCardError', 'card_declined', 'Your card has insufficient funds.', 402, { decline_code: 'insufficient_funds' })
    }
    const it = params.items[0]
    const pd = it.price_data
    s.items.data[0] = {
      ...s.items.data[0],
      quantity: it.quantity ?? 1,
      price: { id: nextId('price_'), object: 'price', unit_amount: pd.unit_amount, currency: pd.currency, product: pd.product, recurring: { interval: pd.recurring.interval, interval_count: pd.recurring.interval_count ?? 1 } },
    }
    s.metadata = meta
    s.current_period_start = Math.floor(clock.now / 1000)
    s.current_period_end = Math.floor(addMonthsMs(clock.now, pd.recurring.interval === 'year' ? 12 : 1) / 1000)
    if (declined) { inv.status = 'open'; s.status = 'past_due' } else { inv.status = 'paid'; inv.amount_paid = inv.amount_due }
    invoices.set(inv.id, inv)
    s.latest_invoice = inv.id
    return expandSub(s, params)
  }
  return {
    subs,
    invoiceMap: invoices,
    productMap: products,
    calls,
    state,
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
          if (prev.paramsJson !== paramsJson) throw stripeError('StripeIdempotencyError', 'idempotency_key_in_use', 'Keys for idempotent requests can only be used with the same parameters they were first used with.', 400)
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
      list(params = {}) {
        calls.push({ op: 'subscriptions.list', params: clone(params) })
        const data = [...subs.values()].filter((s) => !params.status || s.status === params.status).filter((s) => !params.customer || s.customer === params.customer).map(clone)
        return { data, has_more: false, async *[Symbol.asyncIterator]() { for (const s of data) yield s } }
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
    },
    products: {
      async search(params) { calls.push({ op: 'products.search', params: clone(params) }); return { data: [] } },
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
    customers: {
      async retrieve(id) { calls.push({ op: 'customers.retrieve', id }); return { id, object: 'customer', email: null, metadata: {} } },
      async update(id, params) { calls.push({ op: 'customers.update', id, params: clone(params) }); return { id, object: 'customer', metadata: params.metadata ?? {} } },
    },
    webhooks: {
      constructEvent(body, sig, secret) {
        if (!sig || !secret) throw new Error('No signatures found matching the expected signature for payload')
        return JSON.parse(body)
      },
    },
  }
}

const ENV = {
  NEXT_PUBLIC_SUPABASE_URL: 'https://fake.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY: 'service-role-placeholder',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon-placeholder',
  STRIPE_SECRET_KEY: 'sk_test_placeholder',
  STRIPE_WEBHOOK_SECRET: 'whsec_placeholder',
  CRON_SECRET: 'cron-placeholder',
  RESEND_API_KEY: 're_placeholder',
}

/** O mutante da rodada (null = código como está) e a lista do que cada mundo transformou de fato. */
let activeTransforms = null
const appliedLists = []

function makeEnv() {
  clock.now = T0
  const transforms = activeTransforms ?? {}
  const db = makeDb()
  const stripe = makeStripe()
  const session = { user: null }
  const logs = []
  const quietConsole = {
    log() {}, info() {}, debug() {},
    warn: (...a) => logs.push(['warn', a.map(String).join(' ')]),
    error: (...a) => logs.push(['error', a.map(String).join(' ')]),
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
    '@/lib/paypal': { paypalFetch: async () => { throw new Error('PayPal fora do escopo deste guardião') } },
    '@/lib/offers/studio50': { STUDIO50_CODE: 'STUDIO50', STUDIO50_COUPON_ID: 'KINEO_STUDIO50', STUDIO50_DURATION: 'once', STUDIO50_PERCENT: 50, STUDIO50_REPEATING_MONTHS: 1, STUDIO50_TIER: 'pro' },
    '@/lib/founderAlert': {
      alertFounderAdsPass: async () => 'sent',
      alertFounderDfyOrder: async () => 'sent',
      alertFounderOnce: async () => 'sent',
      paidAmountLabel: (amount, currency) => `${(Number(amount) / 100).toFixed(2)} ${String(currency).toUpperCase()}`,
    },
    '@/lib/reverseTrial': { REVERSE_TRIAL_ENABLED: true, TRIAL_GRANT_CREDITS: 25, maybeActivateReverseTrial: async () => ({ activated: false }) },
    '@/lib/email/quota': { recordEmailSend: async () => {}, recordResendResponse: async () => {} },
    'next/headers': { cookies: () => ({ get: () => undefined, getAll: () => [] }), headers: () => ({ get: () => null }) },
    crypto: nodeRequire('node:crypto'),
    '@/lib/affiliateSignupFinalization': {
      AFFILIATE_ATTRIBUTION_COOKIE_NAMES: ['sf_aff', 'sf_aff_click'],
      finalizeAffiliateSignupAttribution: async () => ({ attempted: false, clearCookies: false, outcome: 'no_code' }),
    },
  }
  const world = makeWorld({
    stubs,
    transforms,
    globals: { process: { env: { ...ENV } }, console: quietConsole, fetch: async () => { throw new Error('sem rede neste guardião') }, Date: FakeDate },
  })
  appliedLists.push(world.applied)
  return {
    db, stripe, session, logs, world,
    get route() { return world.load(ROUTE) },
    get lib() { return world.load(LIB) },
    get webhook() { return world.load(WEBHOOK) },
    get cron() { return world.load(CRON) },
    get guest() { return world.load(GUEST) },
    get pricing() { return world.load(PRICING) },
    get balance() { return world.load(BALANCE) },
    get adminEmail() { return [...world.load(SHARED_DB).ADMIN_EMAILS][0] },
  }
}

// ─── cenário-base: um assinante mensal de verdade, no formato do checkout da casa ───────────────────────────────────────
const USER = '3f6c2a1e-9b4d-4c7a-8e21-5a0b7c9d1e2f'
const CUSTOMER_EMAIL = 'cliente.anual@example.com'
const SUB = 'sub_TROCA01'
const ITEM = 'si_TROCA01'
const CUS = 'cus_TROCA01'
const PROD = 'prod_TROCA01'
// O Product do item mensal (PROD) nasce arquivado no checkout real; o anual vai para o Product da casa (id fixo).
const HOUSE = 'kineo_plan_starter'
/** O saldo do fixture no dia da troca (o 1º SIM tinha 2). A troca concede a cota do Starter (60) pela régua da renovação. */
const CREDITS_NOW = 2
/** A metadata que o checkout mensal da casa grava (subscription_data.metadata), com afiliado e marcador de intro. */
const CHECKOUT_MONTHLY_METADATA = (tier, planCredits) => ({
  supabase_user_id: USER,
  tier,
  price_region: 'standard',
  plan_credits: String(planCredits),
  checkout_origin: 'standard',
  checkout_recovery: '0',
  checkout_value_context: 'checkout_value_context_v1',
  checkout_value_variant: 'default',
  checkout_payment_guidance: 'payment_guidance_v1',
  checkout_visual_proof: 'visual_proof_v1',
  affiliate_system: 'custom',
  checkout_session_window_hours: '24',
  checkout_session_window_version: 'window_v1',
  intro: '1',
})

function seed(env, o = {}) {
  const monthlyMinor = o.monthlyMinor ?? 990
  const tier = o.tier ?? 'starter'
  const currency = o.currency ?? 'usd'
  env.db.T('profiles').push({
    id: USER, email: o.email ?? CUSTOMER_EMAIL, plan: o.plan ?? tier, is_pro: true, has_paid: true, video_credits: o.credits ?? CREDITS_NOW,
    stripe_customer_id: CUS, stripe_subscription_id: SUB, paypal_subscription_id: null, cinematic_tokens: tier === 'pro' ? 1 : 0,
    affiliate_id: null, trial_status: null,
  })
  env.stripe.subs.set(SUB, {
    id: SUB, object: 'subscription', customer: CUS, status: o.status ?? 'active', collection_method: 'charge_automatically', currency,
    cancel_at_period_end: Boolean(o.cancelAtPeriodEnd), cancel_at: null, schedule: null, pause_collection: null,
    discount: o.discount ?? null, discounts: o.discount ? [o.discount.id] : [],
    latest_invoice: 'in_MES_ANTERIOR',
    current_period_start: Math.floor(PERIOD_START / 1000),
    current_period_end: Math.floor(addMonthsMs(PERIOD_START, o.interval === 'year' ? 12 : 1) / 1000),
    items: {
      object: 'list',
      data: [{
        id: ITEM, object: 'subscription_item', quantity: 1, discounts: [],
        price: { id: 'price_MENSAL01', object: 'price', unit_amount: monthlyMinor, currency, product: PROD, recurring: { interval: o.interval ?? 'month', interval_count: 1 } },
      }],
    },
    metadata: clone(o.metadata ?? CHECKOUT_MONTHLY_METADATA(tier, o.planCredits ?? 60)),
  })
}

async function callRoute(env, body, who = 'admin') {
  env.session.user = who === 'admin'
    ? { id: '00000000-0000-4000-8000-00000000ad01', email: env.adminEmail }
    : who === 'customer' ? { id: USER, email: CUSTOMER_EMAIL } : null
  const res = await env.route.POST({ json: async () => clone(body) })
  return { status: res.status, body: res.jsonBody ?? null }
}
const DRY71 = { userId: USER, annualAmountUsd: 71 }
const SEND71 = { userId: USER, annualAmountUsd: 71, confirm: 'SEND' }

let evtSeq = 0
async function deliver(env, type, object) {
  const body = JSON.stringify({ id: `evt_troca_${++evtSeq}`, object: 'event', type, data: { object } })
  const res = await env.webhook.POST({ text: async () => body, headers: { get: (k) => (String(k).toLowerCase() === 'stripe-signature' ? 't=1,v1=fake' : null) } })
  return { status: res.status, body: res.jsonBody ?? null }
}
async function runCron(env) {
  const url = new URL('https://www.usekineo.com/api/cron/annual-credit-refill?confirm=SEND')
  const res = await env.cron.GET({ url: url.toString(), nextUrl: url, headers: { get: (k) => (String(k).toLowerCase() === 'authorization' ? `Bearer ${ENV.CRON_SECRET}` : null) } })
  return { status: res.status, body: res.jsonBody ?? null }
}
/** Tudo o que conta como "gravado": banco + estado da Stripe (o registro de chamadas fica de fora). */
const snapshot = (env) => JSON.stringify({
  // tabela vazia nasce na 1ª LEITURA do banco falso; só linhas contam como escrita
  tables: Object.entries(env.db.tables).filter(([, rows]) => rows.length > 0).sort(([a], [b]) => (a < b ? -1 : 1)),
  subs: [...env.stripe.subs.entries()],
  invoices: [...env.stripe.invoiceMap.entries()],
})
const ledgerIdFor = (subscriptionId) => {
  const h = nodeCrypto.createHash('sha256').update(`plan_switched_to_annual:${subscriptionId}`).digest('hex').slice(0, 32)
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`
}
/** O crédito do mês que a Stripe falsa calcula para a troca em T0 (25 de 31 dias restantes). */
const expectedCredit = (monthlyMinor) => {
  const start = Math.floor(PERIOD_START / 1000)
  const end = Math.floor(addMonthsMs(PERIOD_START, 1) / 1000)
  return Math.round(monthlyMinor * (end - Math.floor(T0 / 1000)) / (end - start))
}

// ═══ cenários (cada um devolve a lista de problemas; vazio = verde) ═════════════════════════════════════════════════════
const OFFER_CASES = [
  // [mensal em centavos, plano na Stripe, anual prometido em 05/10]
  [990, 'starter', 71],
  [1290, 'starter', 93],
  [1592, 'basic', 115],
  [1990, 'basic', 143],
  [2900, 'pro', 209],
]

/** R2 (regra pura): os cinco valores dos e-mails e o dólar a mais/a menos. */
async function sRegraPura(env) {
  const p = []
  const L = env.lib
  for (const [m, , want] of OFFER_CASES) {
    if (L.offerAnnualUsd(m) !== want) p.push(`regra: ${m}¢/mês → ${L.offerAnnualUsd(m)}, o e-mail prometeu ${want}`)
    if (!L.checkAnnualAmount(m, want).ok) p.push(`regra: ${want} recusado para ${m}¢`)
    if (L.checkAnnualAmount(m, want + 1).ok) p.push(`regra: ${want + 1} (1 acima) aceito para ${m}¢`)
    if (L.checkAnnualAmount(m, want - 1).ok) p.push(`regra: ${want - 1} (1 abaixo) aceito para ${m}¢`)
  }
  if (L.checkAnnualAmount(990, 71.5).ok) p.push('regra: valor quebrado (71.5) aceito')
  if (L.checkAnnualAmount(990, 0).ok || L.checkAnnualAmount(990, -71).ok) p.push('regra: zero/negativo aceito')
  if (L.checkAnnualAmount(null, 71).ok) p.push('regra: sem mensal conhecido, aceitou')
  if (!L.checkAnnualAmount(990, '71').ok) p.push('regra: "71" em texto recusado (o console manda número ou texto)')
  return p
}

/** R2 (pela rota): cada um dos cinco mensais — o valor do e-mail passa no ensaio; 1 dólar acima/abaixo = 422, sem prévia, sem troca, sem escrita. */
async function sRegraRota() {
  const p = []
  for (const [m, tier, want] of OFFER_CASES) {
    const env = makeEnv()
    seed(env, { monthlyMinor: m, tier })
    const ok = await callRoute(env, { userId: USER, annualAmountUsd: want })
    if (ok.status !== 200 || ok.body?.ready_to_send !== true) p.push(`rota ${m}¢: ensaio com ${want} não ficou pronto (${ok.status} ${JSON.stringify(ok.body?.blockers ?? ok.body?.error)})`)
    if (ok.body?.offer?.expected_annual_usd !== want) p.push(`rota ${m}¢: expected_annual_usd ${ok.body?.offer?.expected_annual_usd} ≠ ${want}`)
    const before = snapshot(env)
    const callsBefore = env.stripe.calls.length
    for (const [wrong, confirm] of [[want + 1, undefined], [want - 1, undefined], [want + 1, 'SEND'], [want - 1, 'SEND']]) {
      const r = await callRoute(env, { userId: USER, annualAmountUsd: wrong, confirm })
      if (r.status !== 422 || r.body?.error !== 'annual_amount_mismatch') p.push(`rota ${m}¢: ${wrong} (${confirm ?? 'ensaio'}) não foi recusado com 422 (${r.status})`)
      else if (r.body?.expected_annual_usd !== want) p.push(`rota ${m}¢: a recusa de ${wrong} não diz o valor certo (${r.body?.expected_annual_usd})`)
    }
    const extra = env.stripe.calls.slice(callsBefore).filter((c) => c.op !== 'subscriptions.retrieve')
    if (extra.length) p.push(`rota ${m}¢: valor fora da regra chamou ${extra.map((c) => c.op).join(', ')}`)
    if (snapshot(env) !== before) p.push(`rota ${m}¢: valor fora da regra gravou algo`)
  }
  return p
}

/** R6: não-admin e anônimo = 403, sem Stripe e sem escrita (ensaio e SEND). */
async function sNaoAdmin() {
  const p = []
  const env = makeEnv()
  seed(env)
  const before = snapshot(env)
  for (const who of ['customer', 'anon']) {
    for (const body of [DRY71, SEND71]) {
      const r = await callRoute(env, body, who)
      if (r.status !== 403) p.push(`${who} ${body.confirm ?? 'ensaio'}: status ${r.status}, esperava 403`)
    }
  }
  if (env.stripe.calls.length) p.push(`sem admin a Stripe foi chamada: ${env.stripe.calls.map((c) => c.op).join(', ')}`)
  if (snapshot(env) !== before) p.push('sem admin algo foi gravado')
  return p
}

/** R1: o ensaio lê, pede a prévia e devolve o relatório — nenhum update, nenhuma escrita. */
async function sEnsaio() {
  const p = []
  const env = makeEnv()
  seed(env)
  const before = snapshot(env)
  const r = await callRoute(env, DRY71)
  const b = r.body ?? {}
  if (r.status !== 200 || b.mode !== 'dry_run' || b.ready_to_send !== true) p.push(`ensaio: ${r.status} ${b.mode} ready=${b.ready_to_send} ${JSON.stringify(b.blockers ?? b.error)}`)
  const ops = env.stripe.calls.map((c) => c.op)
  if (env.stripe.ops('subscriptions.update').length) p.push('ensaio chamou subscriptions.update')
  const pcs = env.stripe.ops('products.create')
  if (pcs.length !== 1 || pcs[0].params?.id !== HOUSE || pcs[0].params?.metadata?.kineo_tier !== 'starter' || !String(pcs[0].idempotencyKey ?? '').includes(HOUSE)) p.push(`ensaio não criou (uma vez, id fixo, idempotência) o Product da casa: ${JSON.stringify(pcs.map((c) => [c.params?.id, c.idempotencyKey]))}`)
  if (ops.join(',') !== 'subscriptions.retrieve,products.retrieve,products.create,invoices.createPreview') p.push(`ensaio fez chamadas inesperadas à Stripe: ${ops.join(', ')}`)
  if (snapshot(env) !== before) p.push('ensaio gravou algo (banco ou Stripe)')
  const pv = env.stripe.ops('invoices.createPreview')[0]?.params
  const det = pv?.subscription_details
  const it = det?.items?.[0]
  if (pv?.subscription !== SUB || it?.id !== ITEM) p.push('prévia não é da assinatura/item da pessoa')
  if (it?.price_data?.recurring?.interval !== 'year' || it?.price_data?.unit_amount !== 7100 || it?.price_data?.currency !== 'usd' || it?.price_data?.product !== HOUSE) p.push(`prévia com price_data errado: ${JSON.stringify(it?.price_data)}`)
  if (det?.proration_behavior !== 'always_invoice' || det?.billing_cycle_anchor !== 'now') p.push(`prévia sem always_invoice/âncora now: ${det?.proration_behavior}/${det?.billing_cycle_anchor}`)
  const credit = expectedCredit(990)
  if (b.preview?.prorationCreditMinor !== credit) p.push(`crédito do mês ${b.preview?.prorationCreditMinor} ≠ ${credit}`)
  if (b.preview?.amountDueMinor !== 7100 - credit) p.push(`cobrado agora ${b.preview?.amountDueMinor} ≠ ${7100 - credit}`)
  if (b.subscription?.monthly_minor !== 990 || b.subscription?.interval !== 'month' || b.subscription?.tier !== 'starter') p.push(`relatório sem plano/mensal/intervalo: ${JSON.stringify(b.subscription)}`)
  if (b.offer?.requested_annual_usd !== 71 || b.offer?.expected_annual_usd !== 71) p.push(`relatório sem o anual pedido/esperado: ${JSON.stringify(b.offer)}`)
  if (b.credits?.perMonthToday !== 60 || b.credits?.perMonthAfter !== 60) p.push(`relatório de créditos errado: ${JSON.stringify(b.credits)}`)
  if (b.credits?.balanceBefore !== CREDITS_NOW || b.credits?.balanceAfter !== 60 || b.credits?.balanceCarried !== 0) p.push(`ensaio não mostra o saldo antes/depois da troca: ${JSON.stringify(b.credits)}`)
  const meta = b.metadata_to_write ?? {}
  if (meta.tier !== 'starter' || meta.supabase_user_id !== USER || meta.plan_credits !== '60' || meta.annual_switch_annual_minor !== '7100') p.push(`metadata do ensaio errada: ${JSON.stringify(meta)}`)
  if (JSON.stringify(b.send_with) !== JSON.stringify({ userId: USER, annualAmountUsd: 71, confirm: 'SEND' })) p.push(`send_with errado: ${JSON.stringify(b.send_with)}`)
  return p
}

/** R3: o SEND troca o item para o anual, cobra agora com o mês creditado, não mexe nos créditos e grava o razão. */
async function sSend() {
  const p = []
  const env = makeEnv()
  seed(env)
  const dry = await callRoute(env, DRY71)
  const r = await callRoute(env, SEND71)
  const b = r.body ?? {}
  if (r.status !== 200 || b.switched !== true) return [`SEND: ${r.status} ${JSON.stringify(b.error ?? b.blockers ?? b)}`]
  const ups = env.stripe.ops('subscriptions.update')
  if (ups.length !== 1) p.push(`SEND fez ${ups.length} updates`)
  const u = ups[0] ?? {}
  const it = u.params?.items?.[0] ?? {}
  if (u.id !== SUB || it.id !== ITEM || it.quantity !== 1) p.push('update não é do item da pessoa (ou quantidade ≠ 1)')
  if (it.price_data?.recurring?.interval !== 'year') p.push(`update com intervalo ${it.price_data?.recurring?.interval}, esperava year`)
  if (it.price_data?.unit_amount !== 7100 || it.price_data?.currency !== 'usd' || it.price_data?.product !== HOUSE) p.push(`update com price_data errado: ${JSON.stringify(it.price_data)}`)
  if (it.price !== undefined) p.push('update usou Price de painel em vez de price_data')
  if (env.stripe.ops('products.create').length !== 1) p.push(`ensaio + SEND criaram ${env.stripe.ops('products.create').length} Products (esperava 1, reaproveitado)`)
  if (u.params?.proration_behavior !== 'always_invoice') p.push(`update com proration ${u.params?.proration_behavior}, esperava always_invoice`)
  if (u.params?.billing_cycle_anchor !== 'now') p.push('update sem billing_cycle_anchor now (não cobraria agora)')
  if (u.params?.payment_behavior !== 'error_if_incomplete') p.push(`update com payment_behavior ${u.params?.payment_behavior}`)
  if (!String(u.idempotencyKey ?? '').startsWith(`kineo-annual-switch-v1:${SUB}:${ITEM}:7100:`)) p.push(`update sem chave de idempotência certa (${u.idempotencyKey})`)
  if (JSON.stringify(u.params?.metadata) !== JSON.stringify(dry.body?.metadata_to_write)) p.push('a metadata gravada não é a que o ensaio mostrou')
  const sub = env.stripe.subs.get(SUB)
  if (sub.items.data[0].price.recurring.interval !== 'year' || sub.items.data[0].price.unit_amount !== 7100) p.push('a assinatura na Stripe não ficou anual de 7100')
  const prof = env.db.profile(USER)
  const want = env.balance.renewalBalance(CREDITS_NOW, 60).balance
  if (want !== 60) p.push(`a régua da renovação mudou: renewalBalance(${CREDITS_NOW}, 60) = ${want}`)
  if (prof.video_credits !== want) p.push(`a troca não concedeu a cota do mês pela régua da renovação: ${CREDITS_NOW} → ${prof.video_credits} (esperava ${want})`)
  if (prof.plan !== 'starter' || prof.is_pro !== true || prof.has_paid !== true || prof.stripe_subscription_id !== SUB || prof.stripe_customer_id !== CUS) p.push(`perfil errado depois da troca: ${JSON.stringify(prof)}`)
  const ev = env.db.events('plan_switched_to_annual')
  if (ev.length !== 1) p.push(`${ev.length} eventos plan_switched_to_annual`)
  const e = ev[0] ?? {}
  const m = e.metadata ?? {}
  const credit = expectedCredit(990)
  const invoiceId = sub.latest_invoice
  if (e.id !== ledgerIdFor(SUB) || e.user_id !== USER) p.push('razão sem o id determinístico da assinatura ou sem o dono')
  if (m.annual_minor !== 7100 || m.monthly_minor !== 990 || m.proration_credit_minor !== credit || m.amount_charged_minor !== 7100 - credit) p.push(`razão com valores errados: ${JSON.stringify(m)}`)
  if (!invoiceId || m.stripe_invoice_id !== invoiceId || m.invoice_billing_reason !== 'subscription_update') p.push(`razão sem a fatura da troca (${m.stripe_invoice_id} / ${invoiceId})`)
  if (m.refund_until !== new RealDate(T0 + 14 * DAY).toISOString()) p.push(`prazo do reembolso errado: ${m.refund_until}`)
  if (m.credits_before !== CREDITS_NOW || m.credits_after !== 60 || m.credits_carried !== 0 || m.credits_quota !== 60 || m.credits_granted !== true) p.push(`razão sem os números da concessão: ${JSON.stringify({ antes: m.credits_before, depois: m.credits_after, sobra: m.credits_carried, cota: m.credits_quota, concedido: m.credits_granted })}`)
  if (b.credits_before !== CREDITS_NOW || b.credits_after !== 60 || b.credits_carried !== 0 || b.credits_granted !== true) p.push(`resposta sem os números da concessão: ${JSON.stringify({ antes: b.credits_before, depois: b.credits_after, concedido: b.credits_granted })}`)
  if (b.charged_now?.minor !== 7100 - credit || b.invoice?.prorationCreditMinor !== credit) p.push(`resposta sem o cobrado/crédito: ${JSON.stringify(b.charged_now)} ${b.invoice?.prorationCreditMinor}`)
  const reply = String(b.customer_reply_en ?? '')
  if (!reply.includes(`$${((7100 - credit) / 100).toFixed(2)}`) || !/annual plan/.test(reply) || !/credited what you already paid/.test(reply) || !/full refund within 14 days/.test(reply)) p.push(`resposta ao cliente incompleta: ${reply}`)
  // o comprado acima de uma cota sobrevive (régua da renovação): 150 com cota 60 = 60 + 90
  const env2 = makeEnv()
  seed(env2, { credits: 150 })
  const r2 = await callRoute(env2, SEND71)
  const e2 = env2.db.events('plan_switched_to_annual')[0]?.metadata ?? {}
  if (r2.status !== 200 || env2.db.profile(USER).video_credits !== 150 || e2.credits_carried !== 90 || e2.credits_after !== 150) p.push(`comprado acima da cota não sobreviveu: ${env2.db.profile(USER).video_credits} ${JSON.stringify({ sobra: e2.credits_carried, depois: e2.credits_after })}`)
  return p
}

/** R4: metadata igual à do checkout anual; uma assinatura antiga sem tier/dono passa a ser reconhecida por cron e webhook. */
async function sMetadata() {
  const p = []
  const env = makeEnv()
  // assinatura antiga: sem supabase_user_id, sem tier, sem price_region, com o plan_credits de outra era; preço vigente (12,90)
  const legacy = { ...CHECKOUT_MONTHLY_METADATA('starter', 140) }
  delete legacy.supabase_user_id
  delete legacy.tier
  delete legacy.price_region
  seed(env, { monthlyMinor: 1290, tier: 'starter', metadata: legacy })
  const r = await callRoute(env, { userId: USER, annualAmountUsd: 93, confirm: 'SEND' })
  if (r.status !== 200 || r.body?.switched !== true) return [`SEND da assinatura antiga: ${r.status} ${JSON.stringify(r.body?.blockers ?? r.body?.error)}`]
  const meta = env.stripe.subs.get(SUB).metadata
  const L = env.lib
  // (a) o checkout LOGADO grava estas chaves em subscription_data.metadata
  const ck = read(CHECKOUT)
  const sd = ck.indexOf('\n    subscription_data: {\n')
  const mStart = sd >= 0 ? ck.indexOf('\n      metadata: {\n', sd) : -1
  const mEnd = mStart >= 0 ? ck.indexOf('\n      },\n', mStart) : -1
  const block = mStart >= 0 && mEnd > mStart ? ck.slice(mStart, mEnd) : ''
  const checkoutKeys = new Set([...block.matchAll(/^\s{8}([a-z_]+)(?::|,)/gm)].map((x) => x[1]))
  if (!block) p.push('não achei subscription_data.metadata no checkout logado')
  for (const k of L.ANNUAL_SUBSCRIPTION_SYSTEM_KEYS) {
    if (!checkoutKeys.has(k)) p.push(`a chave ${k} não está mais no subscription_data.metadata do checkout (a lista de sistema envelheceu)`)
    if (typeof meta[k] !== 'string' || !meta[k]) p.push(`a troca não gravou a chave de sistema ${k}`)
  }
  // (b) o builder do checkout EXECUTADO para a anual do mesmo plano: os mesmos valores
  const P = env.pricing
  const { params } = env.guest.buildGuestSubscriptionSessionParams({
    appUrl: 'https://www.usekineo.com', tier: 'starter', billing: 'annual', interval: 'year', unitAmount: P.ANNUAL_PRICES.starter.usd,
    listCurrency: 'usd', region: 'standard', chargeCurrency: 'usd', chargeAmount: P.ANNUAL_PRICES.starter.usd, settlementReason: 'default',
    ipCountry: 'US', planName: 'Kineo — Starter', lineItemDescription: 'Starter', imageUrl: 'https://www.usekineo.com/x.png',
    planCredits: P.TIER_CREDITS.starter, introRequested: false, intentCampaign: null,
    valueContext: { version: 'v', variant: 'default', outputCount: null, submitMessage: 'ok' },
    paymentGuidanceVersion: 'pg', visualProofVersion: 'vp', windowHours: 24, windowVersion: 'w', expiresAt: 0, nonceHash: 'h',
    affiliateCode: null, affiliateClickId: null, rewardfulReferral: null, autopilotPriceId: null,
  })
  const built = params.subscription_data?.metadata ?? {}
  if (params.line_items?.[0]?.price_data?.recurring?.interval !== 'year') p.push('o builder do checkout não montou a anual (âncora da comparação quebrada)')
  for (const k of ['tier', 'plan_credits', 'price_region']) {
    if (meta[k] !== built[k]) p.push(`metadata.${k} = ${meta[k]} ≠ ${built[k]} do checkout anual`)
  }
  if (meta.supabase_user_id !== USER) p.push(`metadata.supabase_user_id = ${meta.supabase_user_id}`)
  // (c) nada do checkout mensal original se perde (afiliado, intro, origem…) — nem no estado da Stripe, nem no que a rota
  //     ENVIA (a metadata gravada é a completa, igual à que o ensaio mostra; não depende do merge de chaves da Stripe)
  const sent = env.stripe.ops('subscriptions.update')[0]?.params?.metadata ?? {}
  for (const [k, v] of Object.entries(legacy)) {
    if (k === 'plan_credits') continue
    if (meta[k] !== v) p.push(`a troca perdeu/alterou metadata.${k} (${v} → ${meta[k]})`)
    if (sent[k] !== v) p.push(`a metadata enviada à Stripe não traz metadata.${k} do checkout original`)
  }
  if (meta.plan_credits !== '60' || sent.plan_credits !== '60') p.push(`plan_credits não virou o grant de hoje (${meta.plan_credits}/${sent.plan_credits})`)
  for (const k of L.ANNUAL_SWITCH_STAMP_KEYS) if (!meta[k]) p.push(`sem o selo ${k}`)
  // (d) o sistema reconhece: webhook (dono na metadata) e cron (tier + dono + intervalo year)
  const upd = await deliver(env, 'customer.subscription.updated', env.stripe.subs.get(SUB))
  if (upd.status !== 200 || env.db.profile(USER).is_pro !== true || env.db.profile(USER).plan !== 'starter') p.push(`webhook subscription.updated depois da troca: ${upd.status} ${JSON.stringify(env.db.profile(USER))}`)
  clock.now = addMonthsMs(T0, 1) + 60 * 60 * 1000
  const c = await runCron(env)
  const g = (c.body?.granted ?? []).filter((x) => x.subscription === SUB)
  if (c.status !== 200 || g.length !== 1 || g[0].credits !== 60 || g[0].tier !== 'starter' || g[0].user !== USER) p.push(`cron não reconheceu a assinatura trocada: ${JSON.stringify(c.body)}`)
  clock.now = T0
  return p
}

/** R5: a 2ª execução não cobra, não chama a Stripe e não concede de novo (mesmo com o saldo gasto no meio); o ensaio diz "já trocada". */
async function sDuasVezes() {
  const p = []
  const env = makeEnv()
  seed(env)
  const first = await callRoute(env, SEND71)
  if (first.status !== 200 || first.body?.switched !== true) return [`1º SEND: ${first.status}`]
  if (env.db.profile(USER).video_credits !== 60) p.push(`1º SEND não concedeu a cota: ${env.db.profile(USER).video_credits}`)
  env.db.profile(USER).video_credits = 45 // a pessoa usou 15 créditos depois da troca
  const callsAfter = env.stripe.calls.length
  const snap = snapshot(env)
  const second = await callRoute(env, SEND71)
  if (second.status !== 200 || second.body?.already_switched !== true || second.body?.source !== 'ledger') p.push(`2º SEND: ${second.status} ${JSON.stringify(second.body)}`)
  if (env.stripe.calls.length !== callsAfter) p.push(`2º SEND chamou a Stripe: ${env.stripe.calls.slice(callsAfter).map((c) => c.op).join(', ')}`)
  if (snapshot(env) !== snap) p.push('2º SEND gravou algo')
  if (env.db.profile(USER).video_credits !== 45) p.push(`2º SEND concedeu de novo: 45 → ${env.db.profile(USER).video_credits}`)
  const dry = await callRoute(env, DRY71)
  if (dry.status !== 200 || dry.body?.already_switched !== true) p.push(`ensaio depois da troca não diz "já trocada": ${dry.status}`)
  return p
}

/** R5: o RAZÃO não grava depois da cobrança — nada é concedido; o SEND seguinte completa razão e cota UMA vez, sem cobrar. */
async function sRazaoNaoGravou() {
  const p = []
  const env = makeEnv()
  seed(env)
  env.db.failOnce('events', 'insert')
  const first = await callRoute(env, SEND71)
  if (first.status !== 200 || first.body?.switched !== true || first.body?.ledger_written !== false || first.body?.credits_granted !== false || !(first.body?.warnings ?? []).length) p.push(`razão caído: a resposta não avisou (${first.status} ${JSON.stringify({ razao: first.body?.ledger_written, concedido: first.body?.credits_granted })})`)
  if (env.db.profile(USER).video_credits !== CREDITS_NOW) p.push(`sem razão gravado houve concessão: ${CREDITS_NOW} → ${env.db.profile(USER).video_credits}`)
  if (env.db.events('plan_switched_to_annual').length) p.push('razão apareceu apesar da falha injetada')
  const updates = env.stripe.ops('subscriptions.update').length
  const invoices = env.stripe.invoiceMap.size
  const second = await callRoute(env, SEND71)
  if (second.status !== 200 || second.body?.already_switched !== true || second.body?.source !== 'stripe' || second.body?.completed_record !== true || second.body?.credits_granted !== true) p.push(`2º SEND não completou: ${second.status} ${JSON.stringify(second.body)}`)
  if (env.stripe.ops('subscriptions.update').length !== updates || env.stripe.invoiceMap.size !== invoices) p.push('2º SEND trocou/cobrou de novo')
  if (env.db.profile(USER).video_credits !== 60) p.push(`2º SEND não concedeu a cota uma vez: ${env.db.profile(USER).video_credits}`)
  const ev = env.db.events('plan_switched_to_annual')
  if (ev.length !== 1 || ev[0].id !== ledgerIdFor(SUB) || ev[0].metadata?.completed_after_partial_failure !== true || ev[0].metadata?.amount_charged_minor !== 7100 - expectedCredit(990) || ev[0].metadata?.credits_granted !== true || ev[0].metadata?.credits_before !== CREDITS_NOW) p.push(`razão completado errado: ${JSON.stringify(ev.map((e) => e.metadata))}`)
  env.db.profile(USER).video_credits = 30
  const third = await callRoute(env, SEND71)
  if (third.status !== 200 || third.body?.source !== 'ledger' || env.db.profile(USER).video_credits !== 30) p.push(`3º SEND concedeu de novo: ${env.db.profile(USER).video_credits}`)
  return p
}

/** R5: o PERFIL não grava depois da cobrança — a cota fica pendente no razão; o SEND seguinte concede UMA vez (saldo ainda é o de antes). */
async function sBancoCaiDepois() {
  const p = []
  const env = makeEnv()
  seed(env, { plan: 'creator', tier: 'basic', monthlyMinor: 1990 })
  env.db.failOnce('profiles', 'update')
  const first = await callRoute(env, { userId: USER, annualAmountUsd: 143, confirm: 'SEND' })
  if (first.status !== 200 || first.body?.switched !== true || first.body?.profile_updated !== false || first.body?.ledger_written !== true || first.body?.credits_granted !== false || !(first.body?.warnings ?? []).length) p.push(`perfil caído: a resposta não avisou (${first.status} ${JSON.stringify({ perfil: first.body?.profile_updated, razao: first.body?.ledger_written, concedido: first.body?.credits_granted })})`)
  const ev1 = env.db.events('plan_switched_to_annual')
  if (ev1.length !== 1 || ev1[0].metadata?.credits_granted !== false || ev1[0].metadata?.credits_before !== CREDITS_NOW || ev1[0].metadata?.credits_after !== 150) p.push(`a cota não ficou pendente no razão: ${JSON.stringify(ev1.map((e) => e.metadata))}`)
  if (env.db.profile(USER).plan !== 'creator' || env.db.profile(USER).video_credits !== CREDITS_NOW) p.push('o perfil mudou apesar da falha injetada')
  const updates = env.stripe.ops('subscriptions.update').length
  const second = await callRoute(env, { userId: USER, annualAmountUsd: 143, confirm: 'SEND' })
  if (second.status !== 200 || second.body?.already_switched !== true || second.body?.source !== 'ledger' || second.body?.credits_granted !== true || second.body?.credits_grant_pending !== false) p.push(`2º SEND não terminou a cota pendente: ${second.status} ${JSON.stringify(second.body)}`)
  if (env.stripe.ops('subscriptions.update').length !== updates) p.push('2º SEND chamou a troca de novo')
  const prof = env.db.profile(USER)
  if (prof.plan !== 'basic' || prof.video_credits !== 150) p.push(`perfil depois de terminar: ${JSON.stringify(prof)}`)
  const ev = env.db.events('plan_switched_to_annual')
  if (ev.length !== 1 || ev[0].metadata?.credits_granted !== true || ev[0].metadata?.annual_minor !== 14300 || ev[0].metadata?.monthly_minor !== 1990) p.push(`razão terminado errado: ${JSON.stringify(ev.map((e) => e.metadata))}`)
  prof.video_credits = 70
  const third = await callRoute(env, { userId: USER, annualAmountUsd: 143, confirm: 'SEND' })
  if (third.status !== 200 || env.db.profile(USER).video_credits !== 70) p.push(`3º SEND concedeu de novo: ${env.db.profile(USER).video_credits}`)
  return p
}

/** R5: a cota foi concedida mas a MARCA do razão não gravou — o SEND seguinte confere pelo saldo e não concede de novo. */
async function sMarcaCaiDepois() {
  const p = []
  // (a) a pessoa usou créditos depois da troca: saldo ≠ antes e ≠ depois → ambíguo → nada concedido, aviso
  const env = makeEnv()
  seed(env)
  env.db.failOnce('events', 'update')
  const first = await callRoute(env, SEND71)
  if (first.status !== 200 || first.body?.credits_granted !== true || !(first.body?.warnings ?? []).length) p.push(`marca caída: ${first.status} ${JSON.stringify({ concedido: first.body?.credits_granted, avisos: first.body?.warnings })}`)
  if (env.db.profile(USER).video_credits !== 60) p.push(`a cota não foi concedida: ${env.db.profile(USER).video_credits}`)
  if (env.db.events('plan_switched_to_annual')[0]?.metadata?.credits_granted !== false) p.push('a marca deveria ter ficado pendente (falha injetada)')
  env.db.profile(USER).video_credits = 45
  const second = await callRoute(env, SEND71)
  if (second.status !== 200 || second.body?.credits_granted !== false || !(second.body?.warnings ?? []).length) p.push(`2º SEND com saldo gasto: ${second.status} ${JSON.stringify({ concedido: second.body?.credits_granted })}`)
  if (env.db.profile(USER).video_credits !== 45) p.push(`2º SEND concedeu em dobro: 45 → ${env.db.profile(USER).video_credits}`)
  // (b) a pessoa não usou nada: saldo = o de depois → só completa a marca, sem conceder
  const envB = makeEnv()
  seed(envB)
  envB.db.failOnce('events', 'update')
  await callRoute(envB, SEND71)
  const secondB = await callRoute(envB, SEND71)
  if (secondB.status !== 200 || secondB.body?.credits_granted !== true || envB.db.profile(USER).video_credits !== 60) p.push(`2º SEND com saldo intacto: ${secondB.status} ${envB.db.profile(USER).video_credits}`)
  if (envB.db.events('plan_switched_to_annual')[0]?.metadata?.credits_granted !== true) p.push('a marca não foi completada')
  return p
}

/** R5: dois cliques simultâneos (mesma janela) = UMA troca aplicada na Stripe e um razão. */
async function sSimultaneos() {
  const p = []
  const env = makeEnv()
  seed(env)
  const [a, b] = await Promise.all([callRoute(env, SEND71), callRoute(env, SEND71)])
  if (a.status !== 200 || b.status !== 200) p.push(`cliques simultâneos: ${a.status}/${b.status}`)
  const applied = [...env.stripe.invoiceMap.values()].filter((i) => i.billing_reason === 'subscription_update')
  if (applied.length !== 1) p.push(`dois cliques aplicaram ${applied.length} trocas na Stripe`)
  const ups = env.stripe.ops('subscriptions.update')
  if (!ups.length || !ups.every((u) => typeof u.idempotencyKey === 'string' && u.idempotencyKey === ups[0].idempotencyKey)) p.push('os updates dos dois cliques não levam a MESMA chave de idempotência')
  if (env.db.events('plan_switched_to_annual').length !== 1) p.push(`dois cliques: ${env.db.events('plan_switched_to_annual').length} razões`)
  if (env.db.profile(USER).video_credits !== 60) p.push(`dois cliques: saldo ${env.db.profile(USER).video_credits}, esperava a cota uma vez (60)`)
  return p
}

/** R7: o webhook da fatura da troca não concede crédito; o cron solta os mesmos créditos de hoje 1× por mês; a renovação anual concede 1×. */
async function sWebhookERecarga() {
  const p = []
  const env = makeEnv()
  seed(env)
  const r = await callRoute(env, SEND71)
  if (r.status !== 200) return [`SEND: ${r.status}`]
  const sub = env.stripe.subs.get(SUB)
  const inv = env.stripe.invoiceMap.get(sub.latest_invoice)
  if (env.db.profile(USER).video_credits !== 60) p.push(`a troca não concedeu a cota do mês: ${env.db.profile(USER).video_credits}`)
  env.db.profile(USER).video_credits = 41 // a pessoa usou 19 depois da troca: uma 2ª concessão apareceria no saldo
  for (const label of ['fatura da troca', 'reentrega da fatura da troca']) {
    const w = await deliver(env, 'invoice.payment_succeeded', inv)
    if (w.status !== 200) p.push(`${label}: webhook ${w.status}`)
  }
  const s = await deliver(env, 'customer.subscription.updated', env.stripe.subs.get(SUB))
  if (s.status !== 200) p.push(`subscription.updated: webhook ${s.status}`)
  const prof = env.db.profile(USER)
  if (prof.video_credits !== 41) p.push(`webhook da fatura da troca concedeu crédito em dobro: 41 → ${prof.video_credits}`)
  if (prof.plan !== 'starter' || prof.is_pro !== true) p.push(`webhook mudou o plano: ${prof.plan}/${prof.is_pro}`)
  if (env.db.events('subscription_invoice_paid').length) p.push('a fatura da troca virou subscription_invoice_paid (renovação)')
  if (env.db.events('subscription_update_invoice_paid').length !== 2) p.push(`subscription_update_invoice_paid = ${env.db.events('subscription_update_invoice_paid').length}, esperava 2 (uma por entrega)`)
  if (env.db.T('stripe_events').some((x) => String(x.id).startsWith('renewal_granted:'))) p.push('a fatura da troca ganhou marcador de renovação concedida')
  // recarga anual: nada antes de 1 mês; no mês 1, os 60 de hoje (SET pela régua da renovação), uma vez
  clock.now = T0 + 20 * DAY
  const early = await runCron(env)
  if ((early.body?.granted ?? []).length || env.db.profile(USER).video_credits !== 41) p.push(`recarga antes de 1 mês: ${JSON.stringify(early.body?.granted)}`)
  clock.now = addMonthsMs(T0, 1) + 60 * 60 * 1000
  const m1 = await runCron(env)
  const g1 = m1.body?.granted ?? []
  const want = env.balance.renewalBalance(41, 60).balance
  if (g1.length !== 1 || g1[0].month !== 1 || g1[0].credits !== 60) p.push(`recarga do mês 1: ${JSON.stringify(g1)}`)
  if (env.db.profile(USER).video_credits !== want) p.push(`saldo depois da recarga do mês 1: ${env.db.profile(USER).video_credits}, esperava ${want}`)
  const again = await runCron(env)
  if ((again.body?.granted ?? []).length) p.push('a recarga do mês 1 saiu duas vezes')
  // 12 cotas por ano pago: a da troca (mês 0) + o cron nos meses 1..11 (+1 a +11 meses); o mês 12 já é a próxima fatura
  const months = [1]
  for (let k = 2; k <= 11; k++) {
    clock.now = addMonthsMs(T0, k) + 60 * 60 * 1000
    const run = await runCron(env)
    for (const g of run.body?.granted ?? []) if (g.subscription === SUB) months.push(g.month)
  }
  clock.now = addMonthsMs(T0, 12) - 60 * 60 * 1000
  const last = await runCron(env)
  for (const g of last.body?.granted ?? []) if (g.subscription === SUB) months.push(g.month)
  if (months.join(',') !== '1,2,3,4,5,6,7,8,9,10,11') p.push(`o cron não soltou os meses 1..11 uma vez cada dentro do ano pago: ${months.join(',')}`)
  if (1 + months.length !== 12) p.push(`cotas no ano pago: ${1 + months.length}, esperava 12 (a da troca + 11 do cron)`)
  // renovação anual do ano seguinte (subscription_cycle de 7100): concede o plano uma vez
  clock.now = addMonthsMs(T0, 12) + 60 * 60 * 1000
  sub.current_period_start = Math.floor(addMonthsMs(T0, 12) / 1000)
  sub.current_period_end = Math.floor(addMonthsMs(T0, 24) / 1000)
  env.db.profile(USER).video_credits = 12
  const renewal = { id: 'in_RENOVA_2027', object: 'invoice', subscription: SUB, customer: CUS, billing_reason: 'subscription_cycle', amount_paid: 7100, amount_due: 7100, total: 7100, currency: 'usd', status: 'paid', lines: { data: [] } }
  const w1 = await deliver(env, 'invoice.payment_succeeded', renewal)
  const afterRenewal = env.db.profile(USER).video_credits
  if (w1.status !== 200 || afterRenewal !== env.balance.renewalBalance(12, 60).balance) p.push(`renovação anual: ${w1.status}, saldo ${afterRenewal}`)
  env.db.profile(USER).video_credits = 20
  const w2 = await deliver(env, 'invoice.payment_succeeded', renewal)
  if (w2.status !== 200 || env.db.profile(USER).video_credits !== 20) p.push(`renovação anual concedeu duas vezes (saldo ${env.db.profile(USER).video_credits})`)
  clock.now = T0
  return p
}

/** Cartão recusado: 402, nada gravado (banco e Stripe intactos); com o cartão bom, numa janela nova, a troca sai. */
async function sCartaoRecusado() {
  const p = []
  const env = makeEnv()
  seed(env)
  env.stripe.state.cardDeclined = true
  const before = snapshot(env)
  const r = await callRoute(env, SEND71)
  if (r.status !== 402 || r.body?.error !== 'stripe_update_failed' || r.body?.stripe?.decline_code !== 'insufficient_funds' || r.body?.nothing_written !== true) p.push(`cartão recusado: ${r.status} ${JSON.stringify(r.body)}`)
  if (snapshot(env) !== before) p.push('cartão recusado deixou algo gravado (banco ou Stripe)')
  if (env.db.events('plan_switched_to_annual').length) p.push('cartão recusado gravou o razão')
  env.stripe.state.cardDeclined = false
  clock.now = T0 + 11 * 60 * 1000
  const ok = await callRoute(env, SEND71)
  if (ok.status !== 200 || ok.body?.switched !== true) p.push(`depois do cartão bom a troca não saiu: ${ok.status} ${JSON.stringify(ok.body?.stripe ?? ok.body?.error)}`)
  clock.now = T0
  return p
}

/** Bloqueios: o SEND recusa (409) e não troca; o ensaio mostra o motivo. */
async function sBloqueios() {
  const p = []
  const cases = [
    ['cupom na assinatura', { discount: { id: 'di_TROCA', object: 'discount', coupon: { id: 'KINEO_20', percent_off: 20, duration: 'forever' } } }, 'subscription_has_discount', 71],
    ['conta interna', { email: 'test.anual@example.com' }, 'internal_account', 71],
    ['Studio a 39,90 (300 hoje, 180 pela escada do anual)', { monthlyMinor: 3990, tier: 'pro' }, 'credits_would_change', 287],
    ['assinatura em teste', { status: 'trialing' }, 'subscription_not_active', 71],
    ['já anual pelo checkout', { interval: 'year' }, 'already_annual', 71],
    ['assinatura em reais', { currency: 'brl' }, 'currency_not_usd', 71],
    ['cancelamento agendado', { cancelAtPeriodEnd: true }, 'cancel_scheduled', 71],
  ]
  for (const [label, o, code, amount] of cases) {
    const env = makeEnv()
    seed(env, o)
    const before = snapshot(env)
    const send = await callRoute(env, { userId: USER, annualAmountUsd: amount, confirm: 'SEND' })
    const codes = (send.body?.blockers ?? []).map((x) => x.code)
    if (send.status !== 409 || !codes.includes(code)) p.push(`${label}: SEND ${send.status} ${JSON.stringify(codes)} (esperava 409 com ${code})`)
    const dry = await callRoute(env, { userId: USER, annualAmountUsd: amount })
    if (dry.status !== 200 || dry.body?.ready_to_send !== false || !(dry.body?.blockers ?? []).some((x) => x.code === code)) p.push(`${label}: ensaio não mostrou ${code}`)
    if (env.stripe.ops('subscriptions.update').length) p.push(`${label}: houve update`)
    if (snapshot(env) !== before) p.push(`${label}: algo foi gravado`)
    if (code === 'already_annual' && (dry.body?.subscription?.monthly_minor !== null || dry.body?.subscription?.price_minor !== 990)) p.push(`${label}: o relatório chamou o preço anual de mensal (${dry.body?.subscription?.monthly_minor})`)
  }
  return p
}

/** O que se lê no texto: nome do evento só do servidor, rota sem cron e sem GET, sem e-mail de cliente nos arquivos da entrega. */
function sEstatico() {
  const p = []
  const sink = read(SINK)
  const setStart = sink.indexOf('const SERVER_ONLY_EVENTS = new Set([')
  const setEnd = setStart >= 0 ? sink.indexOf('\n])', setStart) : -1
  const live = setStart >= 0 && setEnd > setStart ? sink.slice(setStart, setEnd).split('\n').map((l) => l.replace(/\/\/.*$/, '')).join('\n') : ''
  const names = new Set([...live.matchAll(/'([^']+)'/g)].map((m) => m[1]))
  if (!names.has('plan_switched_to_annual')) p.push('plan_switched_to_annual não é só do servidor no sink /api/events (o navegador poderia forjar a troca)')
  const route = read(ROUTE)
  if (!/^export const dynamic = 'force-dynamic'$/m.test(route) || !/^export const fetchCache = 'force-no-store'$/m.test(route) || !/^export const runtime = 'nodejs'$/m.test(route)) p.push('rota sem dynamic/fetchCache/runtime')
  if (!/^export async function POST\(/m.test(route) || /^export (async )?function (GET|PUT|DELETE|PATCH)\b/m.test(route)) p.push('rota precisa ser só POST')
  if (read(VERCEL).includes('switch-to-annual')) p.push('a troca virou cron no vercel.json (cada execução cobra um cliente: só com o "vai")')
  const email = /[a-z0-9._%+-]+@[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}/i
  for (const f of [ROUTE, LIB, DOC]) if (email.test(read(f))) p.push(`e-mail literal em ${f} (sem PII: o userId vem na chamada)`)
  const doc = read(DOC)
  for (const [needle, why] of [
    ["confirm: 'SEND'", 'o SEND'], ['annualAmountUsd', 'o corpo'], ['Reembolsar', 'o estorno'], ['14 dias', 'o prazo'],
    ["Done — you're now on the annual plan", 'a resposta ao cliente'], ['US$ 209', 'a tabela dos valores'],
    ['12 cotas no ano pago', 'a conta das cotas (troca + 11 do cron)'], ['credits.balanceAfter', 'o saldo depois da troca no ensaio'],
  ]) if (!doc.includes(needle)) p.push(`doc sem ${why} (${needle})`)
  return p
}

// ═══ execução: base verde ═══════════════════════════════════════════════════════════════════════════════════════════
/** R8 (08/10, 1ª troca real): o Product do item mensal nasce arquivado no checkout e a Stripe recusa price_data nele.
 *  O anual usa o Product da casa (id fixo kineo_plan_<tier>): reaproveita se ativo, cria uma vez se faltar, recusa se arquivado. */
async function sProdutoDaCasa() {
  const p = []
  {
    const env = makeEnv()
    seed(env)
    env.stripe.productMap.set(HOUSE, { id: HOUSE, object: 'product', active: true, name: 'Kineo Starter', metadata: { kineo_tier: 'starter' } })
    const r = await callRoute(env, DRY71)
    if (r.status !== 200 || r.body?.ready_to_send !== true) p.push(`casa ativa: ensaio ${r.status} ${JSON.stringify(r.body?.error ?? r.body?.blockers)}`)
    if (env.stripe.ops('products.create').length) p.push('casa ativa: criou outro Product')
    const it = env.stripe.ops('invoices.createPreview')[0]?.params?.subscription_details?.items?.[0]
    if (it?.price_data?.product !== HOUSE) p.push(`casa ativa: prévia no Product ${it?.price_data?.product}, esperava ${HOUSE}`)
    if (r.body?.product?.id !== HOUSE || r.body?.product?.created_now !== false || r.body?.product?.monthly_item_product !== PROD) p.push(`casa ativa: ensaio não mostra o Product: ${JSON.stringify(r.body?.product)}`)
  }
  {
    const env = makeEnv()
    seed(env)
    env.stripe.productMap.set(HOUSE, { id: HOUSE, object: 'product', active: false, name: 'Kineo Starter', metadata: { kineo_tier: 'starter' } })
    const before = snapshot(env)
    const r = await callRoute(env, SEND71)
    if (r.status !== 409 || r.body?.error !== 'house_product_inactive') p.push(`casa arquivada: ${r.status} ${r.body?.error}, esperava 409 house_product_inactive`)
    if (env.stripe.ops('subscriptions.update').length || env.stripe.ops('invoices.createPreview').length || env.stripe.ops('products.create').length) p.push('casa arquivada: chamou prévia, update ou create')
    if (snapshot(env) !== before) p.push('casa arquivada: gravou algo')
  }
  {
    const env = makeEnv()
    seed(env)
    const r = await callRoute(env, SEND71)
    if (r.status !== 200 || r.body?.switched !== true) p.push(`SEND sem ensaio: ${r.status} ${JSON.stringify(r.body?.error ?? r.body?.blockers)}`)
    const pcs = env.stripe.ops('products.create')
    if (pcs.length !== 1 || pcs[0].params?.id !== HOUSE) p.push(`SEND sem ensaio: ${pcs.length} creates (${pcs.map((c) => c.params?.id).join(',')})`)
    const it = env.stripe.ops('subscriptions.update')[0]?.params?.items?.[0]
    if (it?.price_data?.product !== HOUSE) p.push(`SEND sem ensaio: update no Product ${it?.price_data?.product}`)
  }
  return p
}

const SCENARIOS = {
  regraPura: () => sRegraPura(makeEnv()),
  regraRota: () => sRegraRota(),
  naoAdmin: () => sNaoAdmin(),
  ensaio: () => sEnsaio(),
  send: () => sSend(),
  metadata: () => sMetadata(),
  duasVezes: () => sDuasVezes(),
  razaoNaoGravou: () => sRazaoNaoGravou(),
  bancoCaiDepois: () => sBancoCaiDepois(),
  marcaCaiDepois: () => sMarcaCaiDepois(),
  simultaneos: () => sSimultaneos(),
  webhookERecarga: () => sWebhookERecarga(),
  cartaoRecusado: () => sCartaoRecusado(),
  bloqueios: () => sBloqueios(),
  produtoDaCasa: () => sProdutoDaCasa(),
}
/** Roda um cenário com (ou sem) mutante; exceção conta como problema, nunca derruba o guardião. */
async function run(name, transforms = null) {
  activeTransforms = transforms
  appliedLists.length = 0
  try {
    return await SCENARIOS[name]()
  } catch (e) {
    return [`exceção: ${e?.stack?.split('\n').slice(0, 3).join(' | ') ?? e}`]
  } finally {
    activeTransforms = null
    clock.now = T0
  }
}

for (const [name] of Object.entries(SCENARIOS)) {
  const problems = await run(name)
  check(problems.length === 0, `cenário ${name}${problems.length ? ': ' + problems.slice(0, 4).join(' · ') : ''}`)
}
for (const prob of sEstatico()) check(false, `estático: ${prob}`)
check(sEstatico().length === 0, 'estático: sink, rota, vercel.json, sem e-mail literal, doc')

// ═══ mutantes: cada regra quebrada TEM de derrubar a sua prova ════════════════════════════════════════════════════════
const MUTANTS = [
  ['R1 ensaio vira SEND', { [ROUTE]: [replaceOnce("const send = body.confirm === 'SEND'", 'const send = true', 'ensaio = SEND')] }, 'ensaio'],
  ['R2 regra arredonda para baixo', { [LIB]: [replaceOnce('return Math.floor((monthlyMinor * 72 + 500) / 1000)', 'return Math.floor((monthlyMinor * 72) / 1000)', 'piso em vez de mais próximo')] }, 'regraPura'],
  ['R2 rota não recusa valor fora da regra', { [ROUTE]: [replaceOnce('  if (!rule.ok) {\n', '  if (false) {\n', 'sem a recusa 422')] }, 'regraRota'],
  ['R3 update mensal em vez de anual', { [ROUTE]: [replaceOnce("recurring: { interval: 'year' as const }", "recurring: { interval: 'month' as const }", 'intervalo month')] }, 'send'],
  ['R3 sem always_invoice', { [ROUTE]: [replaceOnce("const PRORATION = 'always_invoice' as const", "const PRORATION = 'create_prorations' as const", 'create_prorations')] }, 'send'],
  ['R3 sem âncora now', { [ROUTE]: [replaceOnce("      billing_cycle_anchor: 'now',\n      payment_behavior:", '      payment_behavior:', 'sem billing_cycle_anchor no update')] }, 'send'],
  ['R4 metadata perde o checkout original', { [LIB]: [replaceOnce('    ...existing,\n', '', 'sem o spread da metadata original')] }, 'metadata'],
  ['R4 metadata sem tier', { [LIB]: [replaceOnce('    tier: input.tier,\n', '', 'sem o carimbo de tier')] }, 'metadata'],
  ['R4 metadata sem dono', { [LIB]: [replaceOnce('    supabase_user_id: input.userId,\n', '', 'sem o carimbo do dono')] }, 'metadata'],
  ['R5 sem o razão (2ª execução relê a Stripe)', { [ROUTE]: [replaceOnce('  if (ledger) {\n', '  if (false) {\n', 'sem a checagem do razão')] }, 'duasVezes'],
  ['R5 sem o selo (razão perdido não é completado)', { [ROUTE]: [replaceOnce("  if (interval === 'year' && hasAnnualSwitchStamp(metadata)) {\n", '  if (false) {\n', 'sem o caminho de completar')] }, 'razaoNaoGravou'],
  ['R5 concede sem razão gravado', { [ROUTE]: [replaceOnce('sem cobrar outra vez.`)\n    return { ledger_written: false, profile_updated: false, credits_granted: false, ...none, warnings }\n  }\n  const patch = profilePatchFor(input)\n', 'sem cobrar outra vez.`)\n  }\n  const patch = profilePatchFor(input)\n', 'segue para a concessão sem razão')] }, 'razaoNaoGravou'],
  ['R5 retomada concede em dobro (sem compare-and-set)', { [ROUTE]: [replaceOnce(".update(patch).eq('id', input.userId).eq('video_credits', before).select('id')", ".update(patch).eq('id', input.userId).select('id')", 'retomada sem CAS')] }, 'marcaCaiDepois'],
  ['R5 perfil caído vira concessão perdida', { [ROUTE]: [replaceOnce('  const pending = record.credits_granted === false\n', '  const pending = false\n', 'sem retomar a cota pendente')] }, 'bancoCaiDepois'],
  ['R5 sem chave de idempotência', { [ROUTE]: [replaceOnce('    }, { idempotencyKey: annualSwitchIdempotencyKey(subscriptionId, item!.id, annualMinor, nowMs) })\n', '    })\n', 'update sem idempotencyKey')] }, 'simultaneos'],
  ['R6 não-admin passa', { [ROUTE]: [replaceOnce('  if (!user || !isAdminEmail(user.email)) return', '  if (!user) return', 'portão só de login')] }, 'naoAdmin'],
  ['R7 webhook trata a troca como renovação', { [WEBHOOK]: [replaceOnce("        if (billingReason === 'subscription_update') {\n", "        if (billingReason === 'subscription_update' && false) {\n", 'sem a saída de subscription_update')] }, 'webhookERecarga'],
  ['cartão recusado troca mesmo assim', { [ROUTE]: [replaceOnce("      payment_behavior: 'error_if_incomplete',\n", "      payment_behavior: 'allow_incomplete',\n", 'allow_incomplete')] }, 'cartaoRecusado'],
  ['a troca esquece de conceder a cota do mês', { [ROUTE]: [replaceOnce('  if (grant) patch.video_credits = grant.balance\n', '', 'perfil sem a cota')] }, 'send'],
  ['a troca concede somando em vez da régua da renovação', { [ROUTE]: [replaceOnce('  if (grant) patch.video_credits = grant.balance\n', '  if (grant) patch.video_credits = before + (input.quota ?? 0)\n', 'cota somada')] }, 'send'],
  ['créditos que mudariam passam', { [LIB]: [replaceOnce('  if (f.credits && !f.credits.same) {\n', '  if (false) {\n', 'sem o bloqueio de créditos')] }, 'bloqueios'],
  ['cupom passa', { [LIB]: [replaceOnce('  if (f.discountCount > 0) add(', '  if (false) add(', 'sem o bloqueio de cupom')] }, 'bloqueios'],
  ['R8 anual no Product do item mensal (arquivado na Stripe real)', { [ROUTE]: [replaceOnce("product: houseProduct.id, unit_amount: annualMinor", "product: productId!, unit_amount: annualMinor", 'Product do item')] }, 'ensaio'],
  ['R8 Product da casa sem id fixo', { [ROUTE]: [replaceOnce('    { id, name: HOUSE_PRODUCT_NAMES', '    { name: HOUSE_PRODUCT_NAMES', 'create sem id')] }, 'ensaio'],
  ['R8 Product da casa arquivado passa', { [ROUTE]: [replaceOnce('    if (found.active) return { id, created: false }\n    return { inactive: true, id }\n', '    return { id, created: false }\n', 'arquivado aceito')] }, 'produtoDaCasa'],
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
// o mutante do sink é de texto (a lista é lida, não executada aqui)
{
  const sink = read(SINK)
  const mutated = replaceOnce("  'plan_switched_to_annual',\n", '', 'nome fora do sink').apply(sink)
  disk.set(SINK, mutated)
  const red = sEstatico().some((x) => x.includes('plan_switched_to_annual'))
  disk.set(SINK, sink)
  if (red) killed++
  check(red, 'mutante "evento fora da lista só-servidor": derrubou a verificação do sink')
}

const total = passed + failed.length
console.log(`\n  verificações: ${total} · falhas: ${failed.length} · mutantes derrubados: ${killed}/${MUTANTS.length + 1}`)
if (failed.length) {
  for (const f of failed) console.log('  ✗ ' + f)
  process.exit(1)
}
console.log('OK — troca para o anual: ensaio sem escrita, regra dos e-mails, SEND anual com always_invoice, metadata do checkout, idempotência, 403, webhook sem crédito em dobro')
