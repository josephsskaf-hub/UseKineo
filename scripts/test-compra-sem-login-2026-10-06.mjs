#!/usr/bin/env node
// ═══ KINEO-COMPRA-SEM-LOGIN-2026-10-06 — guardião da compra sem login ═════════════════════════════════════════════════
// Executa o CÓDIGO REAL (readFileSync + ts.transpileModule, sem alias @/ resolvido pelo Node, sem rede, sem banco):
//   · lib/growth/guestCheckout.ts (puro) e lib/stripe/guestCheckout.ts (servidor);
//   · app/api/stripe/checkout/route.ts — GET anônimo com o interruptor DESLIGADO (o caminho de hoje, byte a byte) e
//     LIGADO (sessão de convidado), os desvios para o cadastro, e a paridade de preço/moeda/oferta com o caminho
//     LOGADO executado na mesma caixa (USD, BRL por IP e por idioma, Índia em USD, anual, Autopilot);
//   · app/api/stripe/webhook/route.ts — conta nova, reenvio, sessão não paga, conta existente, conflito com plano
//     ativo, afiliado na metadata, falha que pede reenvio, e o MESMO grant do caminho logado;
//   · app/api/stripe/checkout/guest-access/route.ts e app/auth/guest-link/route.ts — login de uso único (1×, só no
//     navegador da compra, só na janela), link velho, link usado 2×, corrida de dois cliques, e-mail de entrada.
// Banco, Stripe, Auth e Resend são falsos em memória. Depois, MUTANTES em memória: cada regra é quebrada por uma troca
// de texto cuja aplicação é provada (âncora única, texto novo presente) e o cenário que a guarda tem de ficar vermelho.
// Funciona com o interruptor em false (commit 1) e em true (commit 2): os cenários forçam o valor que precisam.
//
// Rodar: node scripts/test-compra-sem-login-2026-10-06.mjs
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join, posix } from 'node:path'
import { fileURLToPath } from 'node:url'
import * as nodeCrypto from 'node:crypto'
import { AsyncLocalStorage } from 'node:async_hooks'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const nodeRequire = createRequire(join(root, 'package.json'))
const ts = nodeRequire('typescript')
const CR = String.fromCharCode(13)
const sources = new Map()
function read(rel) {
  if (!sources.has(rel)) sources.set(rel, readFileSync(join(root, rel), 'utf8').split(CR).join(''))
  return sources.get(rel)
}

let passed = 0
const failed = []
function check(cond, label) {
  if (cond) passed++
  else failed.push(label)
  return Boolean(cond)
}

const PURE = 'lib/growth/guestCheckout.ts'
const SERVER = 'lib/stripe/guestCheckout.ts'
const CHECKOUT = 'app/api/stripe/checkout/route.ts'
const WEBHOOK = 'app/api/stripe/webhook/route.ts'
const ACCESS = 'app/api/stripe/checkout/guest-access/route.ts'
const LINK = 'app/auth/guest-link/route.ts'
const SINK = 'app/api/events/route.ts'
const PAGE = 'app/checkout/guest/page.tsx'
const ORIGIN = 'https://www.usekineo.com'
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15'

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
  const key = `${rel}\u0000${src.length}\u0000${nodeCrypto.createHash('sha1').update(src).digest('hex')}`
  if (!transpiled.has(key)) {
    transpiled.set(key, ts.transpileModule(src, {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true, jsx: ts.JsxEmit.ReactJSX },
      fileName: rel,
    }).outputText)
  }
  return transpiled.get(key)
}

/** Troca de texto com prova de aplicação: a âncora existe UMA vez e o texto novo aparece no fonte transformado. */
function replaceOnce(from, to, label) {
  return {
    label,
    apply(src) {
      const count = src.split(from).length - 1
      if (count !== 1) throw new Error(`mutante "${label}" sem âncora única (${count})`)
      const out = src.split(from).join(to)
      if (to && !out.includes(to)) throw new Error(`mutante "${label}" não aplicou`)
      return out
    },
  }
}
function switchTo(value) {
  return {
    label: `GUEST_CHECKOUT_LIVE=${value}`,
    allowNoop: true,
    apply(src) {
      const re = /export const GUEST_CHECKOUT_LIVE = (?:true|false)\b/g
      const hits = src.match(re) ?? []
      if (hits.length !== 1) throw new Error(`interruptor não encontrado exatamente 1 vez (${hits.length})`)
      return src.replace(re, `export const GUEST_CHECKOUT_LIVE = ${value}`)
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
      if (src === before && !t.allowNoop) throw new Error(`transformação sem efeito em ${rel}: ${t.label}`)
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

// ─── falsos: Next, banco (PostgREST + Auth), Stripe ────────────────────────────────────────────────────────────────────
const clone = (v) => (v === undefined || v === null ? v : JSON.parse(JSON.stringify(v)))
const nowIso = () => new Date().toISOString()

class FakeResponse {
  constructor(body, init = {}) {
    this.status = init.status ?? 200
    this.body = body
    this.jsonBody = undefined
    this.headerMap = new Map(Object.entries(init.headers ?? {}).map(([k, v]) => [k.toLowerCase(), String(v)]))
    this.cookieJar = []
    this.cookies = {
      set: (...args) => {
        const c = typeof args[0] === 'object' ? { ...args[0] } : { name: args[0], value: args[1], ...(args[2] ?? {}) }
        this.cookieJar.push(c)
      },
    }
    this.headers = { get: (k) => this.headerMap.get(String(k).toLowerCase()) ?? null }
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
  const UNIQUE = {
    events: ['id'],
    stripe_events: ['id'],
    profiles: ['id'],
    affiliate_referrals: ['referred_user_id'],
    affiliate_commissions: ['provider', 'external_id'],
    checkout_abandoned: ['stripe_session_id'],
  }
  const failures = []
  const takeFailure = (table, op) => {
    const i = failures.findIndex((f) => f.table === table && f.op === op && f.remaining > 0)
    if (i < 0) return null
    failures[i].remaining--
    return failures[i].error
  }
  const getPath = (row, col) => {
    const parts = String(col).split('->>')
    let v = row[parts[0]]
    if (parts.length > 1) v = v && typeof v === 'object' ? v[parts[1]] : undefined
    return v === undefined ? null : v
  }
  const containsJson = (v, o) => !!v && typeof v === 'object' && Object.entries(o).every(([k, val]) => (
    val && typeof val === 'object' ? containsJson(v[k], val) : v[k] === val
  ))
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
    contains(c, o) { this.filters.push((r) => containsJson(r[c], o)); return this }
    gte(c, v) { this.filters.push((r) => String(getPath(r, c) ?? '') >= String(v)); return this }
    lte(c, v) { this.filters.push((r) => String(getPath(r, c) ?? '') <= String(v)); return this }
    order() { return this }
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
      const injected = takeFailure(this.table, this.op)
      if (injected) return { data: null, error: injected, count: null }
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
  const authUsers = []
  const tokens = new Map()
  const profileDefaults = (id, email) => ({
    id, email, video_credits: 0, free_ai_generate_used: false, plan: 'free', is_pro: false, has_paid: false,
    stripe_customer_id: null, stripe_subscription_id: null, paypal_subscription_id: null, affiliate_id: null,
    trial_status: null, trial_credits_granted: 0, trial_credits_used: 0, cinematic_tokens: 0, offer290_used: false,
  })
  const db = {
    tables,
    T,
    failures,
    fail(table, op, error, times = 1) { failures.push({ table, op, error, remaining: times }) },
    from: (t) => new Query(t),
    rows: (t) => T(t),
    auth: {
      users: authUsers,
      tokens,
      admin: {
        async createUser(attrs) {
          const injected = takeFailure('auth', 'createUser')
          if (injected) return { data: { user: null }, error: injected }
          const email = String(attrs.email).trim().toLowerCase()
          if (authUsers.some((u) => u.email === email)) {
            return { data: { user: null }, error: { name: 'AuthApiError', status: 422, code: 'email_exists', message: 'A user with this email address has already been registered' } }
          }
          const user = {
            id: nodeCrypto.randomUUID(), email, created_at: nowIso(),
            email_confirmed_at: attrs.email_confirm ? nowIso() : null,
            app_metadata: { provider: 'email', providers: ['email'], ...(attrs.app_metadata ?? {}) },
            user_metadata: { ...(attrs.user_metadata ?? {}) },
          }
          authUsers.push(user)
          T('profiles').push(profileDefaults(user.id, email)) // gatilho on_auth_user_created (handle_new_user)
          return { data: { user: clone(user) }, error: null }
        },
        async getUserById(id) {
          const u = authUsers.find((x) => x.id === id)
          return u ? { data: { user: clone(u) }, error: null } : { data: { user: null }, error: { message: 'User not found', status: 404 } }
        },
        async listUsers({ page = 1, perPage = 50 } = {}) {
          const start = (page - 1) * perPage
          return { data: { users: authUsers.slice(start, start + perPage).map(clone) }, error: null }
        },
        async generateLink({ type, email }) {
          const u = authUsers.find((x) => x.email === String(email).trim().toLowerCase())
          if (!u || type !== 'magiclink') return { data: { properties: null, user: null }, error: { message: 'User not found' } }
          if (!db.auth.keepOldTokens) for (const [k, v] of tokens) if (v.userId === u.id) tokens.delete(k) // o Auth invalida o link pendente
          const token = nodeCrypto.randomBytes(28).toString('hex')
          tokens.set(token, { userId: u.id, used: false })
          return { data: { properties: { hashed_token: token }, user: clone(u) }, error: null }
        },
      },
    },
    seedUser({ email, createdAt = nowIso(), appMetadata = {}, profile = {} }) {
      const user = { id: nodeCrypto.randomUUID(), email, created_at: createdAt, email_confirmed_at: createdAt, app_metadata: { provider: 'email', providers: ['email'], ...appMetadata }, user_metadata: {} }
      authUsers.push(user)
      T('profiles').push({ ...profileDefaults(user.id, email), ...profile })
      return user
    },
    profile(id) { return T('profiles').find((p) => p.id === id) ?? null },
    events(name) { return T('events').filter((e) => e.name === name) },
    marker(id) { return T('stripe_events').some((r) => r.id === id) },
  }
  return db
}

function ssrClientFor(db, browser) {
  return {
    from: (t) => db.from(t),
    auth: {
      async getUser() {
        const u = browser.userId ? db.auth.users.find((x) => x.id === browser.userId) : null
        return u ? { data: { user: clone(u) }, error: null } : { data: { user: null }, error: { name: 'AuthSessionMissingError', message: 'Auth session missing!' } }
      },
      async verifyOtp({ token_hash, type }) {
        const t = db.auth.tokens.get(token_hash)
        if (!t || t.used || type !== 'magiclink') return { data: { user: null, session: null }, error: { message: 'Email link is invalid or has expired' } }
        t.used = true
        const u = db.auth.users.find((x) => x.id === t.userId)
        browser.userId = u.id
        browser.minted = (browser.minted ?? 0) + 1
        return { data: { user: clone(u), session: { access_token: 'fake-access', user: clone(u) } }, error: null }
      },
      async signOut() { browser.userId = null; return { error: null } },
    },
  }
}

function makeStripe() {
  let seq = 0
  const nextId = (prefix) => `${prefix}${String(++seq).padStart(6, '0')}${nodeCrypto.randomBytes(6).toString('hex')}`
  const sessions = new Map()
  const customers = new Map()
  const subscriptions = new Map()
  const idem = new Map()
  const calls = []
  const missing = (what) => Object.assign(new Error(`No such ${what}`), { code: 'resource_missing', statusCode: 404, type: 'StripeInvalidRequestError' })
  const strip = (s) => { const out = clone(s); delete out._params; return out }
  return {
    calls,
    sessionStore: sessions,
    customerStore: customers,
    subscriptionStore: subscriptions,
    checkout: {
      sessions: {
        async create(params, opts = {}) {
          calls.push({ op: 'checkout.sessions.create', params: clone(params), idempotencyKey: opts.idempotencyKey ?? null })
          if (opts.idempotencyKey && idem.has(opts.idempotencyKey)) {
            const prev = idem.get(opts.idempotencyKey)
            if (JSON.stringify(prev.params) !== JSON.stringify(params)) {
              throw Object.assign(new Error('Keys for idempotent requests can only be used with the same parameters they were first used with.'), { type: 'StripeIdempotencyError' })
            }
            return strip(sessions.get(prev.id))
          }
          const id = `cs_test_${nextId('')}`
          const items = params.line_items ?? []
          const amount = items.reduce((sum, li) => sum + (li.price_data?.unit_amount ?? 0) * (li.quantity ?? 1), 0)
          const session = {
            id, object: 'checkout.session', livemode: false, url: `https://checkout.stripe.com/c/pay/${id}`,
            mode: params.mode, status: 'open', payment_status: 'unpaid', customer: params.customer ?? null,
            customer_email: params.customer_email ?? null, customer_details: null, subscription: null,
            amount_total: amount, currency: items[0]?.price_data?.currency ?? 'usd',
            client_reference_id: params.client_reference_id ?? null, metadata: { ...(params.metadata ?? {}) },
            total_details: { amount_discount: 0 }, payment_link: null, after_expiration: null, _params: clone(params),
          }
          sessions.set(id, session)
          if (opts.idempotencyKey) idem.set(opts.idempotencyKey, { id, params: clone(params) })
          return strip(session)
        },
        async retrieve(id, params = {}) {
          calls.push({ op: 'checkout.sessions.retrieve', id })
          const s = sessions.get(id)
          if (!s) throw missing('checkout.session')
          const out = strip(s)
          if (Array.isArray(params?.expand) && params.expand.includes('customer') && typeof s.customer === 'string') {
            out.customer = clone(customers.get(s.customer)) ?? s.customer
          }
          return out
        },
        async update(id, params) {
          calls.push({ op: 'checkout.sessions.update', id, params: clone(params) })
          const s = sessions.get(id)
          if (!s) throw missing('checkout.session')
          Object.assign(s.metadata, params.metadata ?? {})
          return strip(s)
        },
      },
    },
    customers: {
      async create(params, opts = {}) {
        calls.push({ op: 'customers.create', params: clone(params) })
        if (opts.idempotencyKey && idem.has(opts.idempotencyKey)) return clone(customers.get(idem.get(opts.idempotencyKey).id))
        const id = nextId('cus_')
        customers.set(id, { id, object: 'customer', email: params.email ?? null, metadata: { ...(params.metadata ?? {}) } })
        if (opts.idempotencyKey) idem.set(opts.idempotencyKey, { id, params: clone(params) })
        return clone(customers.get(id))
      },
      async retrieve(id) {
        calls.push({ op: 'customers.retrieve', id })
        const c = customers.get(id)
        if (!c) throw missing('customer')
        return clone(c)
      },
      async update(id, params) {
        calls.push({ op: 'customers.update', id, params: clone(params) })
        const c = customers.get(id)
        if (!c) throw missing('customer')
        Object.assign(c.metadata, params.metadata ?? {})
        return clone(c)
      },
    },
    subscriptions: {
      async retrieve(id) {
        calls.push({ op: 'subscriptions.retrieve', id })
        const s = subscriptions.get(id)
        if (!s) throw missing('subscription')
        return clone(s)
      },
      async update(id, params) {
        calls.push({ op: 'subscriptions.update', id, params: clone(params) })
        const s = subscriptions.get(id)
        if (!s) throw missing('subscription')
        Object.assign(s.metadata, params.metadata ?? {})
        return clone(s)
      },
      async list({ customer }) { return { data: [...subscriptions.values()].filter((s) => s.customer === customer).map(clone) } },
    },
    promotionCodes: { async list() { return { data: [] } }, async create() { return {} } },
    coupons: { async retrieve() { throw missing('coupon') }, async create(p) { return p } },
    webhooks: {
      constructEvent(body, sig, secret) {
        if (!sig || !secret) throw new Error('No signatures found matching the expected signature for payload')
        return JSON.parse(body)
      },
    },
    /** A página de pagamento da Stripe: nasce o Customer (sem dono) e a Assinatura com a metadata de subscription_data. */
    pay(id, { email, paymentStatus = 'paid' } = {}) {
      const s = sessions.get(id)
      let customerId = s.customer
      if (!customerId) {
        customerId = nextId('cus_')
        customers.set(customerId, { id: customerId, object: 'customer', email, metadata: {} })
      }
      let subscriptionId = null
      if (s.mode === 'subscription') {
        subscriptionId = nextId('sub_')
        subscriptions.set(subscriptionId, {
          id: subscriptionId, object: 'subscription', customer: customerId,
          status: paymentStatus === 'paid' ? 'active' : 'incomplete',
          metadata: { ...(s._params.subscription_data?.metadata ?? {}) },
        })
      }
      Object.assign(s, { status: 'complete', payment_status: paymentStatus, customer: customerId, subscription: subscriptionId, customer_details: { email, name: null, address: null } })
      return strip(s)
    },
    settle(id) {
      const s = sessions.get(id)
      s.payment_status = 'paid'
      const sub = subscriptions.get(s.subscription)
      if (sub) sub.status = 'active'
      return strip(s)
    },
  }
}

const ENV = {
  NEXT_PUBLIC_SUPABASE_URL: 'https://fake.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY: 'service-role-placeholder',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon-placeholder',
  STRIPE_SECRET_KEY: 'sk_test_placeholder',
  STRIPE_WEBHOOK_SECRET: 'whsec_placeholder',
  RESEND_API_KEY: 're_placeholder',
}

function newBrowser(cookies = {}) { return { cookies: { ...cookies }, userId: null } }
// O cookies() do Next é por requisição; aqui também: cada pedido carrega o SEU navegador (vale para pedidos simultâneos).
const requestBrowser = new AsyncLocalStorage()

function makeEnv({ live = true, transforms = {} } = {}) {
  const db = makeDb()
  const stripe = makeStripe()
  const state = { browser: newBrowser() }
  const fetchCalls = []
  const founderAlerts = []
  const logs = []
  const quietConsole = {
    log() {}, info() {}, debug() {},
    warn: (...a) => logs.push(['warn', a.map(String).join(' ')]),
    error: (...a) => logs.push(['error', a.map(String).join(' ')]),
  }
  const fakeFetch = async (url, init = {}) => {
    fetchCalls.push({ url: String(url), body: init.body ? JSON.parse(init.body) : null })
    return { ok: true, status: 200, json: async () => ({ id: `re_${fetchCalls.length}` }) }
  }
  const stubs = {
    'next/server': { NextResponse: FakeResponse },
    '@supabase/supabase-js': { createClient: () => db },
    '@/lib/supabase/server': { createClient: () => ssrClientFor(db, requestBrowser.getStore() ?? state.browser) },
    '@/lib/stripe': { stripe },
    stripe: { __esModule: true, default: function StripeStub() {} },
    '@/lib/paypal': { paypalFetch: async () => { throw new Error('PayPal fora do escopo deste guardião') } },
    '@/lib/offers/studio50': { STUDIO50_CODE: 'STUDIO50', STUDIO50_COUPON_ID: 'KINEO_STUDIO50', STUDIO50_DURATION: 'once', STUDIO50_PERCENT: 50, STUDIO50_REPEATING_MONTHS: 1, STUDIO50_TIER: 'pro' },
    '@/lib/founderAlert': {
      alertFounderAdsPass: async () => 'sent',
      alertFounderDfyOrder: async () => 'sent',
      alertFounderOnce: async (input) => {
        const dup = founderAlerts.some((a) => a.kind === input.kind && a.stripeSessionId === input.stripeSessionId)
        founderAlerts.push({ ...input, outcome: dup ? 'duplicate' : 'sent' })
        return dup ? 'duplicate' : 'sent'
      },
      paidAmountLabel: (amount, currency) => `${(Number(amount) / 100).toFixed(2)} ${String(currency).toUpperCase()}`,
    },
    '@/lib/reverseTrial': { REVERSE_TRIAL_ENABLED: true, TRIAL_GRANT_CREDITS: 25 },
    '@/lib/email/quota': { recordEmailSend: async () => {}, recordResendResponse: async () => {} },
  }
  const all = { ...transforms, [PURE]: [switchTo(live), ...(transforms[PURE] ?? [])] }
  const world = makeWorld({ stubs, transforms: all, globals: { process: { env: { ...ENV } }, console: quietConsole, fetch: fakeFetch } })
  return {
    db, stripe, state, world, fetchCalls, founderAlerts, logs,
    get pure() { return world.load(PURE) },
    get server() { return world.load(SERVER) },
    get checkout() { return world.load(CHECKOUT) },
    get webhook() { return world.load(WEBHOOK) },
    get access() { return world.load(ACCESS) },
    get link() { return world.load(LINK) },
    get pricing() { return world.load('lib/checkoutPricing.ts') },
    get settlement() { return world.load('lib/settlementCurrency.ts') },
    get successFlow() { return world.load('lib/growth/checkoutSuccessFlow.ts') },
    get ledger() { return world.load('lib/affiliateLedger.ts') },
    get commission() { return world.load('lib/affiliateCommission.ts') },
  }
}

// ─── pedidos ───────────────────────────────────────────────────────────────────────────────────────────────────────────
function fakeReq(url, { cookies = {}, headers = {}, body } = {}) {
  const u = new URL(url)
  const h = new Map(Object.entries(headers).filter(([, v]) => v !== null && v !== undefined).map(([k, v]) => [k.toLowerCase(), String(v)]))
  return {
    url,
    nextUrl: u,
    headers: { get: (k) => h.get(String(k).toLowerCase()) ?? null },
    cookies: { get: (k) => (Object.prototype.hasOwnProperty.call(cookies, k) ? { name: k, value: cookies[k] } : undefined) },
    json: async () => clone(body),
    text: async () => (typeof body === 'string' ? body : JSON.stringify(body)),
  }
}
function absorb(browser, res) {
  for (const c of res.cookieJar ?? []) {
    if (c.maxAge === 0 || c.value === '') delete browser.cookies[c.name]
    else browser.cookies[c.name] = c.value
  }
}
async function checkoutGet(env, browser, query, { country = 'US', lang = 'en-US,en;q=0.9', ua = UA, referer = `${ORIGIN}/pricing` } = {}) {
  env.state.browser = browser
  const res = await requestBrowser.run(browser, () => env.checkout.GET(fakeReq(`${ORIGIN}/api/stripe/checkout?${query}`, {
    cookies: browser.cookies,
    headers: { 'x-vercel-ip-country': country, 'accept-language': lang, 'user-agent': ua, referer },
  })))
  absorb(browser, res)
  return res
}
let eventSeq = 0
async function deliver(env, type, object, eventId = `evt_${++eventSeq}_${nodeCrypto.randomBytes(4).toString('hex')}`) {
  const body = JSON.stringify({ id: eventId, object: 'event', type, data: { object } })
  const res = await env.webhook.POST({ text: async () => body, headers: { get: (k) => (String(k).toLowerCase() === 'stripe-signature' ? 't=1,v1=fake' : null) } })
  return { res, eventId }
}
async function access(env, browser, sessionId, action = 'status', origin = ORIGIN) {
  env.state.browser = browser
  const res = await requestBrowser.run(browser, () => env.access.POST(fakeReq(`${ORIGIN}/api/stripe/checkout/guest-access`, {
    cookies: browser.cookies, headers: { origin, 'content-type': 'application/json' }, body: { session_id: sessionId, action },
  })))
  absorb(browser, res)
  return { res, body: (await res.json()) ?? {} }
}
async function followLink(env, browser, url) {
  env.state.browser = browser
  const res = await requestBrowser.run(browser, () => env.link.GET({ url }))
  return res
}
const location = (res) => res.headers.get('location') ?? ''
const sessionIdFromLocation = (res) => (location(res).match(/cs_test_[A-Za-z0-9]+/) ?? [null])[0]

/** Compra completa de convidado: GET anônimo → pagamento na Stripe → webhook. Devolve tudo o que os cenários leem. */
async function guestPurchase(env, { browser = newBrowser({ kineo_event_session_id: `sess_${nodeCrypto.randomBytes(5).toString('hex')}` }), query = 'tier=basic&billing=monthly&intro=1', email, country = 'US', lang, paymentStatus = 'paid', deliverWebhook = true } = {}) {
  const res = await checkoutGet(env, browser, query, { country, lang })
  const sessionId = sessionIdFromLocation(res)
  if (!sessionId) return { res, browser, sessionId: null }
  const snapshot = env.stripe.pay(sessionId, { email, paymentStatus })
  const delivered = deliverWebhook ? await deliver(env, 'checkout.session.completed', snapshot) : null
  return { res, browser, sessionId, snapshot, delivered }
}
async function loggedPurchase(env, { email, query = 'tier=basic&billing=monthly&intro=1', country = 'US', lang, profile = {} } = {}) {
  const user = env.db.seedUser({ email, profile })
  const browser = newBrowser({ kineo_event_session_id: `sess_${nodeCrypto.randomBytes(5).toString('hex')}` })
  browser.userId = user.id
  const res = await checkoutGet(env, browser, query, { country, lang })
  const sessionId = sessionIdFromLocation(res)
  return { user, browser, res, sessionId }
}
const lastCreate = (env) => [...env.stripe.calls].reverse().find((c) => c.op === 'checkout.sessions.create') ?? null
const creates = (env) => env.stripe.calls.filter((c) => c.op === 'checkout.sessions.create')
const OWNER_KEYS = ['supabase_user_id']
const GUEST_KEYS = ['kineo_guest', 'guest_checkout_version', 'kineo_guest_nonce_sha256', 'aff_code', 'aff_click']
const omit = (o, keys) => Object.fromEntries(Object.entries(o ?? {}).filter(([k]) => !keys.includes(k)))

// ═══ CENÁRIOS (cada um devolve a lista de problemas; vazio = verde) ═══════════════════════════════════════════════════

/** Interruptor DESLIGADO: o GET anônimo é exatamente o de hoje. */
async function sSwitchOff(env) {
  const p = []
  const browser = newBrowser({ kineo_event_session_id: 'sess_offline01' })
  const res = await checkoutGet(env, browser, 'tier=basic&billing=monthly&intro=1')
  const resume = '/api/stripe/checkout?tier=basic&billing=monthly&intro=1&resumed=1'
  if (res.status !== 307) p.push(`desligado: status ${res.status}, esperava 307`)
  if (location(res) !== `${ORIGIN}/signup?reason=checkout&redirect=${encodeURIComponent(resume)}`) p.push(`desligado: redirect mudou (${location(res)})`)
  if (creates(env).length !== 0) p.push('desligado: criou sessão na Stripe')
  if (Object.keys(browser.cookies).some((k) => k !== 'kineo_event_session_id')) p.push('desligado: gravou cookie novo')
  const names = env.db.rows('events').map((e) => e.name)
  if (JSON.stringify(names) !== JSON.stringify(['checkout_attempted', 'checkout_auth_required'])) p.push(`desligado: eventos ${JSON.stringify(names)}`)
  const [attempted, required] = env.db.rows('events')
  if (JSON.stringify(attempted?.metadata) !== JSON.stringify(required?.metadata)) p.push('desligado: checkout_auth_required não leva a MESMA metadata de antes')
  if (required && 'guest_fallback' in (required.metadata ?? {})) p.push('desligado: metadata ganhou guest_fallback')
  if (required?.user_id !== null || required?.session_id !== 'sess_offline01') p.push('desligado: dono/sessão do evento mudou')
  return p
}

/** Interruptor LIGADO, EUA: a sessão nasce sem conta, com o segredo do navegador, e o funil conta uma vez. */
async function sGuestSession(env) {
  const p = []
  const browser = newBrowser({ kineo_event_session_id: 'sess_guestus01' })
  const res = await checkoutGet(env, browser, 'tier=basic&billing=monthly&intro=1&intent_campaign=ads_door')
  const sid = sessionIdFromLocation(res)
  if (res.status !== 307 || !sid || !location(res).startsWith('https://checkout.stripe.com/')) p.push(`ligado: não foi à Stripe (${res.status} ${location(res)})`)
  const call = lastCreate(env)
  const params = call?.params ?? {}
  if ('customer' in params || 'customer_email' in params) p.push('ligado: sessão de convidado com customer/customer_email')
  if (params.metadata?.supabase_user_id || params.subscription_data?.metadata?.supabase_user_id) p.push('ligado: dono inventado na metadata')
  if (params.metadata?.kineo_guest !== '1' || params.subscription_data?.metadata?.kineo_guest !== '1') p.push('ligado: sem kineo_guest=1 na sessão e na assinatura')
  if (params.metadata?.intent_campaign !== 'ads_door') p.push('ligado: campanha não viajou na metadata')
  const li = params.line_items?.[0]?.price_data
  const usd = env.pricing.monthlyPriceMinor('basic', 'usd', 'standard')
  if (li?.currency !== 'usd' || li?.unit_amount !== usd || li?.recurring?.interval !== 'month') p.push(`ligado: preço/moeda errados (${JSON.stringify(li)})`)
  if (params.success_url !== `${ORIGIN}/checkout/guest?currency=usd&amount=${usd}&session_id={CHECKOUT_SESSION_ID}`) p.push(`ligado: success_url ${params.success_url}`)
  if (!String(params.custom_text?.after_submit?.message ?? '').includes('tied to this email')) p.push('ligado: a Stripe não avisa que a conta é o e-mail')
  const cookie = res.cookieJar.find((c) => c.name === 'kineo_guest_checkout')
  if (!cookie || cookie.httpOnly !== true || cookie.secure !== true || cookie.sameSite !== 'lax' || cookie.maxAge !== 172800) p.push(`ligado: cookie do navegador ausente ou frouxo (${JSON.stringify(cookie)})`)
  if (cookie && params.metadata?.kineo_guest_nonce_sha256 !== env.server.guestNonceHash(cookie.value)) p.push('ligado: o hash na Stripe não é o do cookie')
  const names = env.db.rows('events').map((e) => e.name)
  if (JSON.stringify(names) !== JSON.stringify(['checkout_attempted', 'checkout_started', 'checkout_guest_started'])) p.push(`ligado: eventos ${JSON.stringify(names)}`)
  const started = env.db.events('checkout_started')[0]
  if (started?.user_id !== null || started?.metadata?.guest_checkout !== true || started?.metadata?.stripe_session_id !== sid || started?.session_id !== 'sess_guestus01') p.push('ligado: checkout_started sem a forma do convidado')
  // 2º clique no mesmo navegador: MESMA sessão Stripe, nenhum evento a mais.
  const again = await checkoutGet(env, browser, 'tier=basic&billing=monthly&intro=1&intent_campaign=ads_door')
  if (sessionIdFromLocation(again) !== sid) p.push('ligado: 2º clique do mesmo navegador abriu outra sessão')
  if (env.db.events('checkout_started').length !== 1 || env.db.events('checkout_guest_started').length !== 1) p.push('ligado: 2º clique contou outra compra aberta')
  // Outro navegador: outra sessão (outro segredo).
  const other = await checkoutGet(env, newBrowser(), 'tier=basic&billing=monthly&intro=1&intent_campaign=ads_door')
  if (!sessionIdFromLocation(other) || sessionIdFromLocation(other) === sid) p.push('ligado: dois navegadores dividiram a mesma sessão')
  return p
}

/** Moeda e preço: convidado = caminho logado, executado na mesma caixa, para cada país/plano. */
async function sCurrencyParity(env) {
  const p = []
  const fixtures = [
    { name: 'EUA Creator mensal', country: 'US', lang: 'en-US', query: 'tier=basic&billing=monthly&intro=1', currency: 'usd' },
    { name: 'Brasil por IP', country: 'BR', lang: 'en-US', query: 'tier=basic&billing=monthly&intro=1', currency: 'brl' },
    { name: 'Brasil por idioma', country: 'PT', lang: 'pt-BR,pt;q=0.9', query: 'tier=starter&billing=monthly&intro=1', currency: 'brl' },
    { name: 'Índia (INR na vitrine nunca; USD no caixa)', country: 'IN', lang: 'en-IN', query: 'tier=pro&billing=monthly', currency: 'usd' },
    { name: 'Brasil anual', country: 'BR', lang: 'pt-BR', query: 'tier=starter&billing=annual', currency: 'brl' },
    { name: 'Autopilot EUA', country: 'US', lang: 'en-US', query: 'tier=autopilot', currency: 'usd' },
    { name: 'Autopilot Brasil', country: 'BR', lang: 'pt-BR', query: 'tier=autopilot', currency: 'brl' },
  ]
  for (const f of fixtures) {
    const guestBrowser = newBrowser()
    await checkoutGet(env, guestBrowser, f.query, { country: f.country, lang: f.lang })
    const guest = lastCreate(env)?.params
    const logged = await loggedPurchase(env, { email: `paridade-${nodeCrypto.randomBytes(3).toString('hex')}@exemplo.com`, query: f.query, country: f.country, lang: f.lang })
    const mine = lastCreate(env)?.params
    if (!guest || !mine || !logged.sessionId) { p.push(`${f.name}: faltou uma das sessões`); continue }
    const gli = guest.line_items?.[0]?.price_data
    if (gli?.currency !== f.currency) p.push(`${f.name}: moeda do convidado ${gli?.currency}, esperava ${f.currency}`)
    const tier = new URLSearchParams(f.query).get('tier')
    const annual = new URLSearchParams(f.query).get('billing') === 'annual'
    const list = annual ? env.pricing.getAnnualPrice(tier, 'usd', 'standard') : env.pricing.monthlyPriceMinor(tier, 'usd', 'standard')
    const expected = tier === 'autopilot'
      ? env.settlement.settlementAmountMinor(list, f.currency)
      : env.settlement.planSettlementAmountMinor(tier, annual ? 'annual' : 'monthly', f.currency, list)
    if (gli?.unit_amount !== expected) p.push(`${f.name}: convidado cobra ${gli?.unit_amount}, a tabela da casa manda ${expected}`)
    if (JSON.stringify(guest.line_items) !== JSON.stringify(mine.line_items)) p.push(`${f.name}: linha de cobrança difere do caminho logado`)
    if (JSON.stringify(omit(guest.metadata, GUEST_KEYS)) !== JSON.stringify(omit(mine.metadata, OWNER_KEYS)) &&
        JSON.stringify(Object.entries(omit(guest.metadata, GUEST_KEYS)).sort()) !== JSON.stringify(Object.entries(omit(mine.metadata, OWNER_KEYS)).sort())) {
      p.push(`${f.name}: metadata da sessão difere do logado (${JSON.stringify(omit(guest.metadata, GUEST_KEYS))} vs ${JSON.stringify(omit(mine.metadata, OWNER_KEYS))})`)
    }
    const gSub = Object.entries(omit(guest.subscription_data?.metadata, GUEST_KEYS)).sort()
    const lSub = Object.entries(omit(mine.subscription_data?.metadata, OWNER_KEYS)).sort()
    if (JSON.stringify(gSub) !== JSON.stringify(lSub)) p.push(`${f.name}: metadata da assinatura difere do logado`)
    for (const k of ['mode', 'cancel_url', 'allow_promotion_codes', 'after_expiration']) {
      if (JSON.stringify(guest[k]) !== JSON.stringify(mine[k])) p.push(`${f.name}: ${k} difere do logado (${JSON.stringify(guest[k])} vs ${JSON.stringify(mine[k])})`)
    }
    if (JSON.stringify(guest.custom_text?.submit) !== JSON.stringify(mine.custom_text?.submit)) p.push(`${f.name}: texto do botão de pagar difere do logado`)
    if (Math.abs((guest.expires_at ?? 0) - (mine.expires_at ?? 0)) > 300) p.push(`${f.name}: janela de 24 h difere do logado`)
    const fakeId = 'cs_test_abcdefghij0123456789'
    const guestBack = env.pure.guestSuccessDestination(new URL(guest.success_url.replace('{CHECKOUT_SESSION_ID}', fakeId)).searchParams)
    const loggedBack = mine.success_url.replace('{CHECKOUT_SESSION_ID}', fakeId).replace(ORIGIN, '')
    if (guestBack !== loggedBack) p.push(`${f.name}: depois do login o convidado não cai no MESMO /checkout/success (${guestBack} vs ${loggedBack})`)
  }
  return p
}

/** Tudo o que depende de saber QUEM compra volta ao cadastro — e o evento diz por quê. */
async function sFallbacks(env) {
  const p = []
  const cases = [
    { query: 'tier=basic&billing=monthly&promo=FIRST50', reason: 'promo' },
    { query: 'tier=basic&billing=monthly', reason: 'bot_suspected', ua: 'curl/8.4.0' },
    { query: 'tier=basic&billing=monthly', reason: 'bot_suspected', ua: '' },
    { query: 'tier=starter&billing=monthly&intro=1&return=wm', reason: 'watermark_return' },
    { query: 'tier=basic&billing=monthly&recovery=1', reason: 'checkout_recovery' },
  ]
  for (const c of cases) {
    const before = creates(env).length
    const eventsBefore = env.db.rows('events').length
    const res = await checkoutGet(env, newBrowser(), c.query, { ua: c.ua ?? UA })
    if (creates(env).length !== before) p.push(`${c.reason}: abriu sessão de convidado`)
    if (!location(res).startsWith(`${ORIGIN}/signup?reason=checkout&redirect=`)) p.push(`${c.reason}: não voltou ao cadastro (${location(res)})`)
    const required = env.db.rows('events').slice(eventsBefore).find((e) => e.name === 'checkout_auth_required')
    if (required?.metadata?.guest_fallback !== c.reason) p.push(`${c.reason}: evento sem o motivo (${required?.metadata?.guest_fallback})`)
  }
  const resumed = await checkoutGet(env, newBrowser(), 'tier=basic&billing=monthly&resumed=1')
  if (!location(resumed).startsWith(`${ORIGIN}/pricing?checkout_error=`)) p.push('resumed=1 sem sessão deixou de mostrar o erro de antes')
  return p
}

/** Conta nova: webhook cria, carimba e concede; reenvio não duplica; login de uso único funciona 1× e só aqui. */
async function sNewAccount(env) {
  const p = []
  const buy = await guestPurchase(env, { email: '  Nova.Compradora@Exemplo.com ' })
  if (!buy.sessionId) return ['conta nova: GET não abriu sessão']
  if (buy.delivered.res.status !== 200) return [`conta nova: webhook ${buy.delivered.res.status} (${JSON.stringify(buy.delivered.res.jsonBody)}) ${JSON.stringify(env.logs.slice(-3))}`]
  const user = env.db.auth.users.find((u) => u.email === 'nova.compradora@exemplo.com')
  if (!user) return ['conta nova: Auth não ganhou a conta (e-mail normalizado)']
  if (user.app_metadata?.kineo_guest_checkout_session !== buy.sessionId) p.push('conta nova: sem carimbo da sessão em app_metadata')
  if (!user.email_confirmed_at) p.push('conta nova: e-mail não nasceu confirmado')
  const prof = env.db.profile(user.id)
  const credits = env.pricing.TIER_CREDITS.basic
  if (prof?.plan !== 'basic' || prof?.is_pro !== true || prof?.has_paid !== true || prof?.video_credits !== credits) p.push(`conta nova: grant errado ${JSON.stringify({ plan: prof?.plan, is_pro: prof?.is_pro, has_paid: prof?.has_paid, credits: prof?.video_credits })}`)
  if (prof?.stripe_customer_id !== buy.snapshot.customer || prof?.stripe_subscription_id !== buy.snapshot.subscription) p.push('conta nova: ids da Stripe não ligados ao perfil')
  if (env.stripe.customerStore.get(buy.snapshot.customer)?.metadata?.supabase_user_id !== user.id) p.push('conta nova: Customer sem dono')
  if (env.stripe.subscriptionStore.get(buy.snapshot.subscription)?.metadata?.supabase_user_id !== user.id) p.push('conta nova: Assinatura sem dono (renovação não acharia ninguém)')
  if (env.stripe.sessionStore.get(buy.sessionId)?.metadata?.supabase_user_id !== user.id) p.push('conta nova: sessão sem dono (pixel de compra não reconheceria)')
  const created = env.db.events('guest_account_created')
  if (created.length !== 1 || created[0].user_id !== user.id || created[0].metadata?.stripe_session_id !== buy.sessionId) p.push('conta nova: guest_account_created ausente/sem dono')
  const paid = env.db.events('payment_success')
  if (paid.length !== 1 || paid[0].user_id !== user.id || paid[0].metadata?.guest_checkout !== true) p.push('conta nova: payment_success sem o user_id da conta nova')
  if (paid[0]?.session_id !== buy.browser.cookies.kineo_event_session_id) p.push('conta nova: payment_success perdeu a sessão de navegador do checkout')
  if (!env.db.marker(`checkout_fulfilled:${buy.sessionId}`)) p.push('conta nova: marcador de entrega ausente')
  // Reenvio do MESMO evento e de um evento NOVO para a mesma sessão: nada duplica.
  const usersBefore = env.db.auth.users.length
  const again = await deliver(env, 'checkout.session.completed', buy.snapshot, buy.delivered.eventId)
  const third = await deliver(env, 'checkout.session.completed', buy.snapshot)
  if (again.res.status !== 200 || third.res.status !== 200) p.push(`reenvio: webhook ${again.res.status}/${third.res.status}`)
  if (env.db.auth.users.length !== usersBefore) p.push('reenvio: criou outra conta')
  if (env.db.profile(user.id)?.video_credits !== credits) p.push('reenvio: créditos dobraram')
  if (env.db.events('guest_account_created').length !== 1 || env.db.events('payment_success').length !== 1) p.push('reenvio: eventos duplicados')
  // Login de uso único, no navegador da compra.
  const jarBefore = { ...buy.browser.cookies }
  const first = await access(env, buy.browser, buy.sessionId)
  if (first.body.state !== 'signed_in' || buy.browser.userId !== user.id) p.push(`login: esperava signed_in no navegador da compra (${JSON.stringify(first.body)})`)
  if ('kineo_guest_checkout' in buy.browser.cookies) p.push('login: o segredo do navegador não foi apagado depois do uso')
  if (env.db.events('guest_login_link_used').length !== 1 || env.db.events('guest_login_link_used')[0].user_id !== user.id || env.db.events('guest_login_link_used')[0].metadata?.method !== 'auto') p.push('login: guest_login_link_used ausente/sem dono')
  const stillIn = await access(env, buy.browser, buy.sessionId)
  if (stillIn.body.state !== 'signed_in' || env.db.events('guest_login_link_used').length !== 1) p.push('login: recarregar a página gastou outro login')
  // O mesmo segredo (cópia do cookie de antes), já usado: nunca loga de novo.
  const replay = newBrowser(jarBefore)
  const second = await access(env, replay, buy.sessionId)
  if (second.body.state !== 'check_email' || second.body.reason !== 'already_used' || replay.userId) p.push(`login: link usado 2× (${JSON.stringify(second.body)})`)
  return p
}

/** Dois cliques simultâneos com o mesmo segredo: exatamente um login. */
async function sConcurrentClaim(env) {
  const p = []
  const buy = await guestPurchase(env, { email: 'corrida@exemplo.com' })
  if (buy.delivered?.res.status !== 200) return ['corrida: compra não foi entregue']
  // O Auth de verdade invalida o link anterior a cada generateLink — uma 2ª trava. Aqui ela é desligada para provar
  // que a reserva guest_login_used:<sessão> segura a corrida SOZINHA.
  env.db.auth.keepOldTokens = true
  const a = newBrowser(buy.browser.cookies)
  const b = newBrowser(buy.browser.cookies)
  const results = await Promise.all([access(env, a, buy.sessionId), access(env, b, buy.sessionId)])
  const states = results.map((r) => r.body.state)
  const minted = [a, b].filter((x) => x.userId).length
  if (minted !== 1 || states.filter((s) => s === 'signed_in').length !== 1) p.push(`corrida: ${minted} logins para ${JSON.stringify(states)}`)
  if (env.db.events('guest_login_link_used').length !== 1) p.push('corrida: dois guest_login_link_used')
  return p
}

/** Outro navegador: não loga; o link vai por e-mail (até o teto) e entra 1×, em qualquer aparelho. */
async function sOtherBrowserEmail(env) {
  const p = []
  const buy = await guestPurchase(env, { email: 'outro@exemplo.com' })
  if (buy.delivered?.res.status !== 200) return ['outro navegador: compra não foi entregue']
  const user = env.db.auth.users.find((u) => u.email === 'outro@exemplo.com')
  const stranger = newBrowser()
  const look = await access(env, stranger, buy.sessionId)
  if (look.body.state !== 'check_email' || look.body.reason !== 'other_browser' || stranger.userId) p.push(`outro navegador: ${JSON.stringify(look.body)}`)
  if (look.body.email_hint) p.push('outro navegador: mostrou o e-mail a quem não provou ser o navegador da compra')
  if (env.fetchCalls.length !== 0) p.push('outro navegador: mandou e-mail sem a pessoa pedir')
  const asked = await access(env, stranger, buy.sessionId, 'email')
  if (asked.body.email_sent !== true || env.fetchCalls.length !== 1) p.push(`e-mail: não saiu (${JSON.stringify(asked.body)})`)
  const mail = env.fetchCalls[0]?.body
  if (mail?.to?.[0] !== 'outro@exemplo.com') p.push('e-mail: foi para outro endereço')
  const link = String(mail?.text ?? '').match(/https:\/\/www\.usekineo\.com\/auth\/guest-link\?token_hash=[^\s]+/)?.[0]
  if (!link) return [...p, 'e-mail: sem o link de entrada']
  if (env.db.events('guest_signin_email_sent').length !== 1) p.push('e-mail: guest_signin_email_sent ausente')
  const phone = newBrowser()
  const enter = await followLink(env, phone, link)
  if (enter.status !== 307 || location(enter) !== `${ORIGIN}/studio` || phone.userId !== user?.id) p.push(`link: não entrou no Studio (${enter.status} ${location(enter)})`)
  const used = env.db.events('guest_login_link_used').filter((e) => e.metadata?.method === 'email_link')
  if (used.length !== 1 || used[0].user_id !== user?.id) p.push('link: guest_login_link_used (email_link) ausente')
  const again = newBrowser()
  const reuse = await followLink(env, again, link)
  if (again.userId || !location(reuse).startsWith(`${ORIGIN}/login?redirect=`)) p.push('link: entrou 2× com o mesmo link')
  // Teto de e-mails por sessão.
  for (let i = 0; i < 4; i++) await access(env, stranger, buy.sessionId, 'email')
  if (env.fetchCalls.length !== 3) p.push(`e-mail: teto por sessão não segurou (${env.fetchCalls.length} envios)`)
  return p
}

/** Link velho: fora da janela de poucos minutos, nada de login automático. */
async function sExpired(env) {
  const buy = await guestPurchase(env, { email: 'velho@exemplo.com' })
  if (buy.delivered?.res.status !== 200) return ['link velho: compra não foi entregue']
  const user = env.db.auth.users.find((u) => u.email === 'velho@exemplo.com')
  user.created_at = new Date(Date.now() - 20 * 60 * 1000).toISOString()
  const r = await access(env, buy.browser, buy.sessionId)
  return r.body.state === 'check_email' && r.body.reason === 'expired' && !buy.browser.userId ? [] : [`link velho: ${JSON.stringify(r.body)}`]
}

/** E-mail que JÁ tinha conta: o plano entra nela, NUNCA loga, o link vai para a caixa dela (1×). */
async function sExistingAccount(env) {
  const p = []
  // Conta RECENTE (2 min): a janela de minutos não a protegeria; só a regra 'conta que já existia nunca loga' protege.
  const old = env.db.seedUser({ email: 'antiga@exemplo.com', createdAt: new Date(Date.now() - 2 * 60 * 1000).toISOString(), profile: { video_credits: 7 } })
  const buy = await guestPurchase(env, { email: 'antiga@exemplo.com', query: 'tier=starter&billing=monthly&intro=1' })
  if (buy.delivered?.res.status !== 200) return [`conta existente: webhook ${buy.delivered?.res.status}`]
  if (env.db.auth.users.length !== 1) p.push('conta existente: criou conta duplicada')
  const prof = env.db.profile(old.id)
  if (prof?.plan !== 'starter' || prof?.video_credits !== 7 + env.pricing.TIER_CREDITS.starter || prof?.has_paid !== true) p.push(`conta existente: grant errado ${JSON.stringify(prof)}`)
  if (env.db.events('guest_account_matched').length !== 1 || env.db.events('guest_account_created').length !== 0) p.push('conta existente: evento errado')
  if (env.db.events('payment_success')[0]?.user_id !== old.id) p.push('conta existente: payment_success sem o dono')
  const r = await access(env, buy.browser, buy.sessionId)
  if (r.body.state !== 'check_email' || r.body.reason !== 'existing_account' || buy.browser.userId) p.push(`conta existente: logou ou não avisou (${JSON.stringify(r.body)})`)
  if (r.body.email_sent !== true || env.fetchCalls.length !== 1 || env.fetchCalls[0].body?.to?.[0] !== 'antiga@exemplo.com') p.push('conta existente: link não foi para a caixa da dona')
  const again = await access(env, buy.browser, buy.sessionId)
  if (again.body.email_sent !== true || env.fetchCalls.length !== 1) p.push('conta existente: recarregar mandou outro e-mail')
  return p
}

/** E-mail com plano ativo de OUTRA assinatura: nada concedido nem sobrescrito; conflito registrado e avisado. */
async function sConflict(env) {
  const p = []
  const subscriber = env.db.seedUser({ email: 'assinante@exemplo.com', profile: { is_pro: true, plan: 'pro', has_paid: true, video_credits: 120, stripe_subscription_id: 'sub_antiga', stripe_customer_id: 'cus_antigo' } })
  const buy = await guestPurchase(env, { email: 'assinante@exemplo.com' })
  if (buy.delivered?.res.status !== 200) return [`conflito: webhook ${buy.delivered?.res.status}`]
  const prof = env.db.profile(subscriber.id)
  if (prof?.plan !== 'pro' || prof?.video_credits !== 120 || prof?.stripe_subscription_id !== 'sub_antiga' || prof?.stripe_customer_id !== 'cus_antigo') p.push(`conflito: o perfil foi mexido ${JSON.stringify(prof)}`)
  if (!env.db.marker(`guest_checkout_conflict:${buy.sessionId}`) || env.db.marker(`checkout_fulfilled:${buy.sessionId}`)) p.push('conflito: marcadores errados')
  const ev = env.db.events('guest_checkout_conflict')
  if (ev.length !== 1 || ev[0].user_id !== subscriber.id || ev[0].metadata?.conflict !== 'active_stripe_plan') p.push('conflito: evento ausente/sem dono')
  if (env.founderAlerts.filter((a) => a.kind === 'guest_conflict' && a.outcome === 'sent').length !== 1) p.push('conflito: fundador não foi avisado')
  if (env.db.events('payment_success')[0]?.user_id !== subscriber.id) p.push('conflito: payment_success sem dono')
  await deliver(env, 'checkout.session.completed', buy.snapshot, buy.delivered.eventId)
  if (env.db.events('guest_checkout_conflict').length !== 1 || env.founderAlerts.filter((a) => a.outcome === 'sent').length !== 1) p.push('conflito: reenvio duplicou evento/aviso')
  const r = await access(env, buy.browser, buy.sessionId)
  if (r.body.state !== 'conflict' || buy.browser.userId) p.push(`conflito: a página não disse a verdade (${JSON.stringify(r.body)})`)
  return p
}

/** Sessão não paga (meio lento): nada de conta; a página espera; o pagamento confirmado depois entrega. */
async function sUnpaid(env) {
  const p = []
  const buy = await guestPurchase(env, { email: 'boleto@exemplo.com', paymentStatus: 'unpaid' })
  if (buy.delivered?.res.status !== 200) p.push(`não paga: webhook ${buy.delivered?.res.status}`)
  if (env.db.auth.users.length !== 0) p.push('não paga: criou conta antes do dinheiro')
  if (env.db.events('checkout_payment_pending').length !== 1) p.push('não paga: sem checkout_payment_pending')
  const r = await access(env, buy.browser, buy.sessionId)
  if (r.body.state !== 'pending' || buy.browser.userId) p.push(`não paga: página não esperou (${JSON.stringify(r.body)})`)
  const settled = env.stripe.settle(buy.sessionId)
  const late = await deliver(env, 'checkout.session.async_payment_succeeded', settled)
  const user = env.db.auth.users.find((u) => u.email === 'boleto@exemplo.com')
  if (late.res.status !== 200 || !user || env.db.profile(user.id)?.plan !== 'basic') p.push('não paga: o pagamento confirmado depois não entregou')
  return p
}

/** Afiliado: o cookie viaja na sessão e a comissão nasce no webhook, para a conta nova. */
async function sAffiliate(env) {
  const p = []
  const affiliateId = nodeCrypto.randomUUID()
  const clickId = nodeCrypto.randomUUID()
  const owner = env.db.seedUser({ email: 'criador@exemplo.com' })
  env.db.rows('affiliates').push({ id: affiliateId, code: 'ABCDEFGH', user_id: owner.id, status: 'active', commission_rate: 0.4, coupon_code: null })
  env.db.rows('affiliate_clicks').push({ id: clickId, affiliate_id: affiliateId, created_at: new Date(Date.now() - 3600000).toISOString() })
  const browser = newBrowser({ sf_aff: 'ABCDEFGH', sf_aff_click: clickId, kineo_event_session_id: 'sess_affiliate1' })
  const buy = await guestPurchase(env, { browser, email: 'indicada@exemplo.com' })
  const params = env.stripe.sessionStore.get(buy.sessionId)?._params
  if (params?.metadata?.aff_code !== 'ABCDEFGH' || params?.metadata?.aff_click !== clickId) p.push('afiliado: código/clique não viajaram na sessão')
  if (params?.metadata?.affiliate_system !== 'custom' || params?.subscription_data?.metadata?.affiliate_system !== 'custom') p.push('afiliado: sistema de comissão não é o nosso')
  if (buy.delivered?.res.status !== 200) return [...p, `afiliado: webhook ${buy.delivered?.res.status}`]
  const user = env.db.auth.users.find((u) => u.email === 'indicada@exemplo.com')
  if (env.db.profile(user?.id)?.affiliate_id !== affiliateId) p.push('afiliado: perfil novo sem o afiliado')
  const ref = env.db.rows('affiliate_referrals').find((r) => r.referred_user_id === user?.id)
  if (!ref || ref.affiliate_id !== affiliateId) p.push('afiliado: indicação canônica ausente')
  const commission = env.db.rows('affiliate_commissions').find((c) => c.external_id === buy.sessionId)
  const rate = env.commission.effectiveAffiliateCommissionRate(0.4)
  const amount = buy.snapshot.amount_total
  if (!commission || commission.amount_gross !== amount || commission.type !== 'initial' || commission.commission_amount !== env.ledger.calculateAffiliateCommission(amount, rate)) p.push(`afiliado: comissão errada ${JSON.stringify(commission)}`)
  return p
}

/** Banco caiu ao criar a conta: 500 (a Stripe reenvia), nada concedido; o reenvio entrega. */
async function sRetry(env) {
  const p = []
  env.db.fail('auth', 'createUser', { code: 'unexpected_failure', message: 'Database error creating new user' })
  const buy = await guestPurchase(env, { email: 'soluco@exemplo.com' })
  if (buy.delivered?.res.status !== 500) p.push(`falha: webhook respondeu ${buy.delivered?.res.status}, esperava 500 para a Stripe reenviar`)
  if (env.db.auth.users.length !== 0) p.push('falha: conta criada mesmo assim')
  if (env.db.marker(buy.delivered.eventId)) p.push('falha: dedupe do evento não foi solto (o reenvio seria engolido)')
  const retry = await deliver(env, 'checkout.session.completed', buy.snapshot, buy.delivered.eventId)
  const user = env.db.auth.users.find((u) => u.email === 'soluco@exemplo.com')
  if (retry.res.status !== 200 || env.db.profile(user?.id)?.plan !== 'basic') p.push('falha: reenvio não entregou')
  return p
}

/** O grant do convidado é o do caminho logado, campo por campo. */
async function sSameGrant(env) {
  const p = []
  const logged = await loggedPurchase(env, { email: 'logada@exemplo.com' })
  const snap = env.stripe.pay(logged.sessionId, { email: 'logada@exemplo.com' })
  const lres = await deliver(env, 'checkout.session.completed', snap)
  const buy = await guestPurchase(env, { email: 'convidada@exemplo.com' })
  if (lres.res.status !== 200 || buy.delivered?.res.status !== 200) return ['mesmo grant: um dos webhooks falhou']
  const a = env.db.profile(logged.user.id)
  const b = env.db.profile(env.db.auth.users.find((u) => u.email === 'convidada@exemplo.com').id)
  for (const k of ['plan', 'is_pro', 'has_paid', 'video_credits', 'cinematic_tokens', 'trial_status']) {
    if (JSON.stringify(a[k]) !== JSON.stringify(b[k])) p.push(`mesmo grant: ${k} logado=${a[k]} convidado=${b[k]}`)
  }
  const [pa, pb] = [logged.sessionId, buy.sessionId].map((id) => env.db.events('payment_success').find((e) => e.metadata?.stripe_session_id === id))
  if (pa?.metadata?.credits_granted !== pb?.metadata?.credits_granted) p.push('mesmo grant: credits_granted difere')
  return p
}

/** POST de outra origem não recebe nada. */
async function sCrossOrigin(env) {
  const buy = await guestPurchase(env, { email: 'origem@exemplo.com' })
  const r = await access(env, buy.browser, buy.sessionId, 'status', 'https://evil.example')
  return r.res.status === 403 && !buy.browser.userId ? [] : [`origem: ${r.res.status} ${JSON.stringify(r.body)}`]
}

/** O caminho LOGADO não muda com o interruptor (mesma sessão, mesmos parâmetros). */
async function sLoggedUnchanged() {
  const shots = []
  for (const live of [false, true]) {
    const env = makeEnv({ live })
    const logged = await loggedPurchase(env, { email: 'igual@exemplo.com' })
    const params = clone(lastCreate(env)?.params ?? null)
    shots.push({
      status: logged.res.status,
      // Ids aleatórios (conta, Customer) e o relógio ficam de fora; todo o resto tem de ser igual.
      params: params && { ...params, customer: 'cus_x', metadata: omit(params.metadata, OWNER_KEYS), subscription_data: { ...params.subscription_data, metadata: omit(params.subscription_data?.metadata, OWNER_KEYS) }, expires_at: 0 },
      events: env.db.rows('events').map((e) => e.name),
      cookies: Object.keys(logged.browser.cookies).sort(),
    })
  }
  return JSON.stringify(shots[0]) === JSON.stringify(shots[1]) ? [] : ['logado: o interruptor mudou o caminho de quem já tem conta']
}

// ═══ EXECUÇÃO ═════════════════════════════════════════════════════════════════════════════════════════════════════════
async function run(name, scenario, opts) {
  try {
    const env = makeEnv(opts)
    return await scenario(env)
  } catch (error) {
    return [`${name}: lançou ${error instanceof Error ? error.stack?.split('\n').slice(0, 3).join(' | ') : String(error)}`]
  }
}

// ── 0. Fronteiras estáticas ───────────────────────────────────────────────────────────────────────────────────────────
{
  const pure = read(PURE)
  check(!/^\s*import\b/m.test(pure), 'lib/growth/guestCheckout.ts continua PURO (sem import): cliente e guardião o executam cru')
  check((pure.match(/^export const GUEST_CHECKOUT_LIVE = (?:true|false)$/gm) ?? []).length === 1, 'interruptor único: GUEST_CHECKOUT_LIVE é um booleano literal, declarado uma vez')
  const walk = (dir, out = []) => {
    for (const name of readdirSync(join(root, dir))) {
      if (name === 'node_modules' || name.startsWith('.')) continue
      const rel = `${dir}/${name}`
      const st = statSync(join(root, rel))
      if (st.isDirectory()) walk(rel, out)
      else if (/\.(ts|tsx)$/.test(name)) out.push(rel)
    }
    return out
  }
  const files = ['app', 'lib', 'components'].flatMap((d) => walk(d))
  check(files.length > 500, `varredura com denominador real (${files.length} arquivos)`)
  const declares = files.filter((f) => /export const GUEST_CHECKOUT_LIVE\b/.test(read(f)))
  check(declares.length === 1 && declares[0] === PURE, `o interruptor mora num lugar só (${declares.join(', ')})`)
  const consumers = files.filter((f) => f !== PURE && /\bGUEST_CHECKOUT_LIVE\b/.test(read(f)))
  for (const f of consumers) check(/import \{[^}]*\bGUEST_CHECKOUT_LIVE\b[^}]*\} from '@\/lib\/growth\/guestCheckout'/.test(read(f)), `${f} lê o interruptor da fonte única`)
  for (const f of [CHECKOUT, 'app/pricing/PricingClient.tsx', 'app/KineoLanding.tsx', 'app/ads/page.tsx', 'app/ads/AdsPaywall.tsx']) check(consumers.includes(f), `${f} obedece ao interruptor`)
  const clientFiles = files.filter((f) => /^\s*['"]use client['"]/.test(read(f)))
  check(clientFiles.length > 50, `varredura de 'use client' com denominador real (${clientFiles.length})`)
  check(clientFiles.every((f) => !read(f).includes("'@/lib/stripe/guestCheckout'")), 'nenhum componente de cliente importa o lado servidor (node:crypto quebraria o build)')
  check(clientFiles.includes(PAGE) && !read(PAGE).includes('@/lib/stripe/guestCheckout'), '/checkout/guest é cliente e só lê o módulo puro')
  const webhook = read(WEBHOOK)
  check((webhook.match(/`checkout_fulfilled:\$\{session\.id\}`/g) ?? []).length === 2, 'o webhook ainda escreve checkout_fulfilled:${session.id} (o marcador que a página de acesso lê)')
  const sink = read(SINK)
  const sinkStart = sink.indexOf('const SERVER_ONLY_EVENTS = new Set([')
  const serverOnly = sinkStart >= 0 ? sink.slice(sinkStart, sink.indexOf('\n])', sinkStart)) : ''
  check(serverOnly.length > 1000, 'recorte de SERVER_ONLY_EVENTS não vazio')
  const env0 = makeEnv({ live: false })
  for (const name of Object.values(env0.pure.GUEST_CHECKOUT_EVENTS)) check(serverOnly.includes(`'${name}',`), `${name} é SERVER_ONLY no sink do navegador`)
  check(read('app/pricing/PricingClient.tsx').includes("signedIn === false && !guestCheckoutCoversPlanClick({ live: GUEST_CHECKOUT_LIVE, promoRequested: arrivedWithPromo,"), 'pricing: "Sign up & continue" só some quando o servidor abre a Stripe sem conta')
  const squash = (s) => s.replace(/\s+/g, ' ')
  check(squash(read('app/ads/page.tsx')).includes(squash(`{GUEST_CHECKOUT_LIVE && !viewer.signedIn ? (
    <p className="gnote">{GUEST_CHECKOUT_ANON_NOTE}</p>
  ) : (
    <p className="gnote">{viewer.signedIn ? 'Secure Stripe checkout.' : 'Secure Stripe checkout. You sign in (or create your account) first.'}</p>
  )}`)), '/ads: a nota do anônimo segue o interruptor (desligado = a linha de sempre, intacta)')
  check(/function pricingCheckoutHref[\s\S]{0,200}if \(isSignedIn\) return checkoutPath\n[\s\S]{0,400}if \(GUEST_CHECKOUT_LIVE\) return checkoutPath/.test(read('app/KineoLanding.tsx')), 'home: os cards vão direto ao checkout só com o interruptor ligado')
  check(squash(read('app/ads/AdsPaywall.tsx')).includes(squash(`{GUEST_CHECKOUT_LIVE && !signedIn ? (
    <p className="gnote">{ui(COPY.note)}</p>
  ) : (
    <p className="gnote">{ui(signedIn ? COPY.note : COPY.noteAnon)}</p>
  )}`)), 'parede do /ads: "você cria a conta antes" segue o interruptor (desligado = a linha de sempre, intacta)')
  check(!/sign in first|create your account\) first|sign up first/i.test(env0.pure.GUEST_CHECKOUT_ANON_NOTE + env0.pure.GUEST_CHECKOUT_STRIPE_NOTE), 'a copy do convidado não promete cadastro antes')
  // A página /checkout/guest renderiza no servidor sem tocar em window (window só nos efeitos) e nasce esperando.
  try {
    const React = nodeRequire('react')
    const { renderToStaticMarkup } = nodeRequire('react-dom/server')
    const pageWorld = makeWorld({
      stubs: {
        react: React,
        'react/jsx-runtime': nodeRequire('react/jsx-runtime'),
        'next/link': { __esModule: true, default: ({ href, children, ...rest }) => React.createElement('a', { href, ...rest }, children) },
      },
      transforms: {},
      globals: {},
    })
    const html = renderToStaticMarkup(React.createElement(pageWorld.load(PAGE).default))
    check(html.includes('data-kineo="guest-checkout"') && html.includes('data-state="checking"') && html.includes('Payment received.'), '/checkout/guest renderiza no servidor e nasce em "checking"')
  } catch (error) {
    check(false, `/checkout/guest não renderiza: ${error instanceof Error ? error.message : String(error)}`)
  }
}

// ── 1. Decisões puras ─────────────────────────────────────────────────────────────────────────────────────────────────
{
  const env = makeEnv({ live: true })
  const P = env.pure
  const base = { live: true, isGet: true, resumed: false, wantsTrial: false, planFit: false, returnToWatermark: false, checkoutRecovery: false, promoRequested: false, introDiscount: false, botSuspected: false }
  check(P.guestCheckoutFallbackReason(base) === null, 'compra simples vira convidado')
  check(P.guestCheckoutFallbackReason({ ...base, live: false, promoRequested: true }) === 'switch_off', 'interruptor desligado vence qualquer outro motivo')
  for (const [k, reason] of [['isGet', 'not_navigation'], ['resumed', 'resumed_after_signup'], ['wantsTrial', 'card_trial'], ['planFit', 'plan_fit'], ['returnToWatermark', 'watermark_return'], ['checkoutRecovery', 'checkout_recovery'], ['promoRequested', 'promo'], ['introDiscount', 'intro_discount'], ['botSuspected', 'bot_suspected']]) {
    check(P.guestCheckoutFallbackReason({ ...base, [k]: k === 'isGet' ? false : true }) === reason, `motivo ${reason}`)
  }
  check(P.guestCheckoutCoversPlanClick({ live: true, promoRequested: false, introDiscount: false }) === true && P.guestCheckoutCoversPlanClick({ live: false, promoRequested: false, introDiscount: false }) === false && P.guestCheckoutCoversPlanClick({ live: true, promoRequested: true, introDiscount: false }) === false && P.guestCheckoutCoversPlanClick({ live: true, promoRequested: false, introDiscount: true }) === false, 'rótulo do botão = régua do servidor')
  check(P.isGuestCheckoutSession({ mode: 'subscription', metadata: { kineo_guest: '1' } }) && !P.isGuestCheckoutSession({ mode: 'payment', metadata: { kineo_guest: '1' } }) && !P.isGuestCheckoutSession({ mode: 'subscription', metadata: {} }) && !P.isGuestCheckoutSession({ mode: 'subscription', metadata: null }), 'só assinatura com kineo_guest=1 é de convidado')
  check(P.normalizeGuestEmail('  Ana.Silva@Gmail.COM ') === 'ana.silva@gmail.com' && P.normalizeGuestEmail('sem-arroba') === null && P.normalizeGuestEmail('') === null, 'e-mail normalizado como o Auth guarda')
  check(P.maskGuestEmail('ana.silva@gmail.com') === 'an•••@gmail.com' && P.maskGuestEmail('a@b.co') === 'a•••@b.co', 'e-mail mascarado')
  check(P.guestPurchaseConflict({ is_pro: true, stripe_subscription_id: 'sub_a' }, 'sub_b') === 'active_stripe_plan', 'plano Stripe ativo = conflito')
  check(P.guestPurchaseConflict({ is_pro: true, stripe_subscription_id: 'sub_a' }, 'sub_a') === null, 'mesma assinatura = retomada, não conflito')
  check(P.guestPurchaseConflict({ is_pro: true, paypal_subscription_id: 'I-1' }, 'sub_b') === 'active_paypal_plan', 'PayPal ativo = conflito')
  check(P.guestPurchaseConflict({ is_pro: true }, 'sub_b') === 'manual_paid_access', 'acesso pago manual = conflito')
  check(P.guestPurchaseConflict({ is_pro: false, stripe_subscription_id: 'sub_velha' }, 'sub_b') === null, 'plano encerrado não bloqueia')
  const now = Date.now()
  const ok = { session: { isGuest: true, status: 'complete', paymentStatus: 'paid' }, ownerUserId: 'u1', fulfilled: true, conflict: false, owner: { bornFromThisSession: true, createdAtMs: now - 60000 }, browserProof: true, loginAlreadyUsed: false, signedInUserId: null, nowMs: now }
  const d = (o) => P.decideGuestAccess({ ...ok, ...o })
  check(d({}).state === 'sign_in', 'conta nova + navegador + janela + 1ª vez = login')
  check(d({ session: null }).state === 'unavailable' && d({ session: { ...ok.session, isGuest: false } }).state === 'unavailable' && d({ session: { ...ok.session, status: 'expired' } }).state === 'unavailable', 'sessão que não é de convidado = nada')
  check(d({ session: { ...ok.session, paymentStatus: 'unpaid' } }).state === 'pending' && d({ session: { ...ok.session, status: 'open' } }).state === 'pending', 'não paga = espera')
  check(d({ fulfilled: false }).state === 'pending' && d({ ownerUserId: null }).state === 'pending' && d({ owner: null }).state === 'pending', 'webhook não terminou = espera')
  check(d({ conflict: true }).state === 'conflict', 'conflito vence')
  check(d({ signedInUserId: 'u1' }).state === 'signed_in', 'já logado como dono = segue')
  check(d({ signedInUserId: 'u2' }).reason === 'other_account_signed_in', 'outra conta logada nunca é trocada')
  check(d({ owner: { bornFromThisSession: false, createdAtMs: now } }).reason === 'existing_account', 'conta que já existia NUNCA loga sozinha')
  check(d({ browserProof: false }).reason === 'other_browser', 'sem o segredo do navegador = e-mail')
  check(d({ loginAlreadyUsed: true }).reason === 'already_used', 'login já usado = e-mail')
  check(d({ owner: { bornFromThisSession: true, createdAtMs: now - 16 * 60000 } }).reason === 'expired', 'fora da janela = e-mail')
  check(d({ owner: { bornFromThisSession: true, createdAtMs: now + 5 * 60000 } }).reason === 'expired', 'conta "do futuro" além da folga = e-mail')
  check(d({ owner: { bornFromThisSession: true, createdAtMs: null } }).reason === 'expired', 'sem data de nascimento = e-mail')
  check(P.GUEST_LOGIN_WINDOW_MINUTES > 0 && P.GUEST_LOGIN_WINDOW_MINUTES <= 30, `janela de "poucos minutos" (${P.GUEST_LOGIN_WINDOW_MINUTES})`)
  const flow = env.successFlow
  for (const [tier, currency, amount] of [['basic', 'usd', 2990], ['autopilot', 'brl', 149500]]) {
    const fake = 'cs_test_abcdefghij0123456789'
    const back = P.guestSuccessDestination(new URL(P.buildGuestCheckoutSuccessUrl({ appUrl: ORIGIN, tier, currency, amount }).replace('{CHECKOUT_SESSION_ID}', fake)).searchParams)
    check(back === flow.buildSubscriptionCheckoutSuccessUrl({ appUrl: ORIGIN, tier, currency, amount }).replace('{CHECKOUT_SESSION_ID}', fake).replace(ORIGIN, ''), `depois do login, o mesmo /checkout/success do logado (${tier})`)
  }
  check(P.guestSuccessDestination(new URLSearchParams('session_id=../../x')) === null, 'destino recusa id de sessão forjado')
  check(P.checkoutFulfilledMarkerId('cs_x') === 'checkout_fulfilled:cs_x', 'marcador de entrega = o do webhook')
}

// ── 2. Lado servidor ─────────────────────────────────────────────────────────────────────────────────────────────────
{
  const env = makeEnv({ live: true })
  const S = env.server
  const nonce = S.mintGuestNonce()
  check(/^[A-Za-z0-9_-]{43}$/.test(nonce) && nonce !== S.mintGuestNonce(), 'segredo do navegador: 32 bytes aleatórios')
  check(S.guestNonceMatches(nonce, S.guestNonceHash(nonce)) && !S.guestNonceMatches(S.mintGuestNonce(), S.guestNonceHash(nonce)) && !S.guestNonceMatches(nonce, 'xyz') && !S.guestNonceMatches('curto', S.guestNonceHash(nonce)) && !S.guestNonceMatches(undefined, S.guestNonceHash(nonce)), 'prova do navegador: só o cookie certo')
  check(/^[0-9a-f-]{36}$/.test(S.deterministicEventUuid('a', 'b')) && S.deterministicEventUuid('a', 'b') === S.deterministicEventUuid('a', 'b') && S.deterministicEventUuid('a', 'b') !== S.deterministicEventUuid('a', 'c'), 'id determinístico de evento')
  const base = {
    appUrl: ORIGIN, tier: 'basic', billing: 'monthly', interval: 'month', unitAmount: 2990, listCurrency: 'usd', region: 'standard', chargeCurrency: 'usd', chargeAmount: 2990,
    settlementReason: 'default', ipCountry: 'US', planName: 'Kineo — Creator', lineItemDescription: 'x', imageUrl: 'https://x/i.png', planCredits: 150, introRequested: false,
    intentCampaign: null, valueContext: { version: 'v', variant: 'standard_result_count', outputCount: 3, submitMessage: 'm' }, paymentGuidanceVersion: 'g', visualProofVersion: 'p',
    windowHours: 24, windowVersion: 'w', expiresAt: 1, nonceHash: 'a'.repeat(64), affiliateCode: null, affiliateClickId: null, rewardfulReferral: null, autopilotPriceId: null,
  }
  const b = (o) => S.buildGuestSubscriptionSessionParams({ ...base, ...o })
  check(b({ affiliateCode: 'ABCDEFGH', affiliateClickId: 'c', rewardfulReferral: 'r' }).affiliateSystem === 'custom', 'afiliado próprio vence a Rewardful (mesma precedência do logado)')
  check(b({ affiliateCode: 'ABCDEFGH', rewardfulReferral: 'r' }).affiliateSystem === 'rewardful' && b({ affiliateCode: 'ABCDEFGH', rewardfulReferral: 'r' }).params.client_reference_id === 'r', 'sem prova de clique, a Rewardful fica com a referência')
  check(b({}).affiliateSystem === 'none' && !('client_reference_id' in b({}).params), 'sem afiliado, nenhum dono de comissão')
  check(b({ autopilotPriceId: 'price_123' }).params.line_items[0].price === 'price_123', 'Price do Autopilot (escape hatch) respeitado')
  check(b({ billing: 'annual', interval: 'year' }).params.line_items[0].price_data.product_data.name === 'Kineo — Creator (Annual)', 'anual com o mesmo nome do logado')
  const p1 = b({}).params
  const key = (o = {}) => S.guestCheckoutIdempotencyKey(p1, { nonceHash: 'a'.repeat(64), window: 7, unitAmount: 2990, listCurrency: 'usd', introRequested: false, ...o })
  check(key() === key() && key() !== key({ nonceHash: 'b'.repeat(64) }) && key() !== key({ window: 8 }), 'idempotência: mesmo navegador + mesma janela = mesma sessão')
  // Resolver com dependências falsas: os caminhos que o webhook não exercita com facilidade.
  const deps = (over = {}) => ({
    findProfilesByEmail: async () => ({ rows: [], error: null }),
    readProfile: async (id) => ({ profile: { id, email: 'x@y.co', is_pro: false }, error: null }),
    getAuthUser: async (id) => ({ user: { id, email: 'x@y.co', created_at: nowIso(), app_metadata: {} }, error: null }),
    createAuthUser: async () => ({ user: { id: 'novo', email: 'x@y.co', created_at: nowIso(), app_metadata: { kineo_guest_checkout_session: 'cs_test_s' } }, error: null }),
    findAuthUserByEmail: async () => ({ user: null, error: null }),
    retrieveCustomer: async () => ({ email: 'x@y.co', metadata: {}, deleted: false }),
    updateCustomerMetadata: async () => {},
    retrieveSubscriptionMetadata: async () => ({}),
    updateSubscriptionMetadata: async () => {},
    updateCheckoutSessionMetadata: async () => {},
    attributeAffiliate: async () => ({ ok: false, reason: 'invalid_code' }),
    insertEventOnce: async () => 'inserted',
    warn: () => {},
    ...over,
  })
  const session = { id: 'cs_test_s', customer: 'cus_1', subscription: 'sub_1', customer_email: null, customer_details: { email: 'X@y.co' }, metadata: { kineo_guest: '1' } }
  const code = async (fn) => { try { await fn(); return 'ok' } catch (e) { return e?.code ?? 'threw' } }
  let customerReads = 0
  const viaCustomer = await S.resolveGuestCheckoutOwner(deps({ retrieveCustomer: async () => { customerReads++; return { email: 'X@y.co', metadata: {}, deleted: false } } }), { ...session, customer_details: { email: null } })
  check(viaCustomer.email === 'x@y.co' && customerReads >= 1, 'sem e-mail na sessão, o e-mail digitado vem do Customer da Stripe')
  check(await code(() => S.resolveGuestCheckoutOwner(deps({ retrieveCustomer: async () => ({ email: null, metadata: {}, deleted: false }) }), { ...session, customer_details: { email: null } })) === 'email_missing', 'sem e-mail em lugar nenhum = reenvio (nunca conta sem dono)')
  check(await code(() => S.resolveGuestCheckoutOwner(deps({ findProfilesByEmail: async () => ({ rows: [{ id: 'a' }, { id: 'b' }], error: null }) }), session)) === 'email_ambiguous', 'dois perfis com o mesmo e-mail = reenvio, nunca sorteio')
  check(await code(() => S.resolveGuestCheckoutOwner(deps({ findProfilesByEmail: async () => ({ rows: [], error: 'down' }) }), session)) === 'profile_lookup_failed', 'banco fora = reenvio')
  let lookups = 0
  const race = await S.resolveGuestCheckoutOwner(deps({
    findProfilesByEmail: async () => (++lookups === 1 ? { rows: [], error: null } : { rows: [{ id: 'vencedor', email: 'x@y.co', is_pro: false }], error: null }),
    createAuthUser: async () => ({ user: null, error: { code: 'email_exists', message: 'A user with this email address has already been registered' } }),
    getAuthUser: async (id) => ({ user: { id, email: 'x@y.co', created_at: nowIso(), app_metadata: { kineo_guest_checkout_session: 'cs_test_s' } }, error: null }),
  }), session)
  check(race.userId === 'vencedor' && race.created === true && race.createdNow === false, 'corrida de duas entregas: a segunda adota a conta que a primeira criou')
  check(await code(() => S.resolveGuestCheckoutOwner(deps({ retrieveCustomer: async () => ({ email: 'x@y.co', metadata: { supabase_user_id: 'outro' }, deleted: false }) }), session)) === 'customer_owner_mismatch', 'Customer de outra conta = nunca adota')
  check(await code(() => S.resolveGuestCheckoutOwner(deps({ retrieveSubscriptionMetadata: async () => ({ supabase_user_id: 'outro' }) }), session)) === 'subscription_owner_mismatch', 'Assinatura de outra conta = nunca adota')
  let warned = 0
  const soft = await S.resolveGuestCheckoutOwner(deps({ updateCheckoutSessionMetadata: async () => { throw new Error('stripe 500') }, warn: () => { warned++ } }), session)
  check(soft.userId === 'novo' && warned === 1, 'carimbo da sessão (pixel) é opcional: falha só avisa')
  check(await code(() => S.resolveGuestCheckoutOwner(deps({ insertEventOnce: async () => { throw Object.assign(new Error('x'), { code: 'event_insert_failed' }) } }), session)) === 'event_insert_failed', 'evento da conta que não grava = reenvio (nada de 200 mudo)')
  let created = null
  await S.resolveGuestCheckoutOwner(deps({ createAuthUser: async (input) => { created = input; return { user: { id: 'novo', email: input.email, created_at: nowIso(), app_metadata: input.appMetadata }, error: null } } }), session)
  check(created?.email === 'x@y.co' && created?.appMetadata?.kineo_guest_checkout_session === 'cs_test_s', 'conta nasce com o e-mail normalizado e o carimbo da sessão')
}

// ── 3-5. Cenários executados ──────────────────────────────────────────────────────────────────────────────────────────
const SCENARIOS = [
  ['interruptor desligado = caminho de hoje', sSwitchOff, { live: false }],
  ['sessão de convidado (EUA)', sGuestSession, { live: true }],
  ['moeda e preço = caminho logado', sCurrencyParity, { live: true }],
  ['desvios para o cadastro', sFallbacks, { live: true }],
  ['conta nova + reenvio + login 1×', sNewAccount, { live: true }],
  ['corrida de dois cliques', sConcurrentClaim, { live: true }],
  ['outro navegador + e-mail + link', sOtherBrowserEmail, { live: true }],
  ['link velho', sExpired, { live: true }],
  ['conta existente', sExistingAccount, { live: true }],
  ['conflito com plano ativo', sConflict, { live: true }],
  ['sessão não paga', sUnpaid, { live: true }],
  ['afiliado na metadata', sAffiliate, { live: true }],
  ['falha pede reenvio', sRetry, { live: true }],
  ['mesmo grant do logado', sSameGrant, { live: true }],
  ['outra origem', sCrossOrigin, { live: true }],
]
for (const [name, scenario, opts] of SCENARIOS) {
  const problems = await run(name, scenario, opts)
  if (problems.length === 0) check(true, name)
  else for (const problem of problems) check(false, `${name} — ${problem}`)
}
{
  const problems = await sLoggedUnchanged().catch((e) => [`logado: lançou ${e?.message}`])
  if (problems.length === 0) check(true, 'caminho logado idêntico com o interruptor ligado e desligado')
  else for (const problem of problems) check(false, problem)
}

// ── 6. Mutantes em memória: cada regra quebrada tem de deixar o seu cenário vermelho ─────────────────────────────────
const MUTANTS = [
  ['puro: interruptor ignorado', { [PURE]: [replaceOnce("  if (input.live !== true) return 'switch_off'\n", '', 'sem gate do interruptor')] }, sSwitchOff, false],
  ['puro: cupom vira convidado', { [PURE]: [replaceOnce("  if (input.promoRequested) return 'promo'\n", '', 'sem desvio de cupom')] }, sFallbacks, true],
  ['puro: robô vira convidado', { [PURE]: [replaceOnce("  if (input.botSuspected) return 'bot_suspected'\n", '', 'sem desvio de robô')] }, sFallbacks, true],
  ['puro: conta existente loga sozinha', { [PURE]: [replaceOnce("  if (input.owner.bornFromThisSession !== true) return { state: 'check_email', reason: 'existing_account' }\n", '', 'sem trava de conta existente')] }, sExistingAccount, true],
  ['puro: sem prova do navegador', { [PURE]: [replaceOnce("  if (input.browserProof !== true) return { state: 'check_email', reason: 'other_browser' }\n", '', 'sem prova do navegador')] }, sOtherBrowserEmail, true],
  ['puro: sem janela', { [PURE]: [replaceOnce('    input.nowMs - createdAtMs > windowMs ||\n', '', 'sem janela de minutos')] }, sExpired, true],
  ['rota de acesso: vaga ignorada (corrida)', { [ACCESS]: [replaceOnce('    const claim = await claimMarker(admin, claimId)\n', "    const claim = 'claimed' as 'claimed' | 'taken' | 'error'\n", 'sem reserva do login')] }, sConcurrentClaim, true],
  ['rota de acesso: sem trava de origem', { [ACCESS]: [replaceOnce("  if (origin && origin !== req.nextUrl.origin) return reply({ state: 'unavailable' }, 403)\n", '', 'sem trava de origem')] }, sCrossOrigin, true],
  ['rota de acesso: conta existente sem e-mail', { [ACCESS]: [replaceOnce("      : reason === 'existing_account' && browserProof ? 'auto' : null", '      : null', 'sem e-mail automático')] }, sExistingAccount, true],
  ['link do e-mail: token inválido entra', { [LINK]: [replaceOnce('  if (error || !data?.user || !data.session) return failure\n', '  if (!data?.user) return NextResponse.redirect(new URL(next, origin))\n', 'sem checagem do verifyOtp')] }, sOtherBrowserEmail, true],
  ['servidor: conta sem carimbo da sessão', { [SERVER]: [replaceOnce('        [GUEST_ACCOUNT_SESSION_APP_METADATA_KEY]: sessionId,\n', '', 'sem carimbo em app_metadata')] }, sNewAccount, true],
  ['servidor: assinatura sem dono', { [SERVER]: [replaceOnce('    await deps.updateSubscriptionMetadata(subscriptionId, { supabase_user_id: userId })\n', '', 'sem carimbo na assinatura')] }, sNewAccount, true],
  ['servidor: BRL ignorado', { [SERVER]: [replaceOnce("    : planSettlementAmountMinor(input.tier, input.isAnnual ? 'annual' : 'monthly', chargeCurrency, input.unitAmount)", '    : input.unitAmount', 'sem tabela em reais')] }, sCurrencyParity, true],
  ['servidor: afiliado fora da sessão', { [SERVER]: [replaceOnce('      ...(input.affiliateCode ? { [GUEST_CHECKOUT_AFFILIATE_CODE_KEY]: input.affiliateCode } : {}),\n', '', 'sem aff_code')] }, sAffiliate, true],
  ['servidor: conflito ignorado', { [SERVER]: [replaceOnce('  const conflict = bornFromThisSession ? null : guestPurchaseConflict(profile, subscriptionId)', '  const conflict = null as null', 'sem conflito')] }, sConflict, true],
  ['webhook: Path B sem o dono do convidado', { [WEBHOOK]: [replaceOnce('          session.metadata = { ...(session.metadata ?? {}), supabase_user_id: guestOwner.userId }\n', '', 'sem o carimbo do dono na entrega')] }, sNewAccount, true],
  ['webhook: payment_success sem dono (trava de cima)', { [WEBHOOK]: [replaceOnce('  if (isGuestCheckoutSession(session) && !session.metadata?.supabase_user_id) return\n', '', 'payment_success gravado antes do dono')] }, sNewAccount, true],
  ['webhook: payment_success do convidado nunca gravado', { [WEBHOOK]: [replaceOnce("          try {\n            await recordPaymentSuccess(supabase, event.id, session)\n          } catch (trackingError) {\n            console.error('[stripe webhook] guest payment_success tracking threw:', trackingError)\n          }\n", '', 'sem o payment_success do convidado')] }, sNewAccount, true],
  ['webhook: conflito concede', { [WEBHOOK]: [replaceOnce('          if (guestOwner.conflict) {', '          if (false) {', 'sem ramo de conflito')] }, sConflict, true],
  ['webhook: convidado ignorado', { [WEBHOOK]: [replaceOnce('        if (isGuestCheckoutSession(session)) {\n          entitlementPending = true', '        if (false) {\n          entitlementPending = true', 'sem resolver')] }, sNewAccount, true],
  ['checkout: cupom não desvia', { [CHECKOUT]: [replaceOnce('      promoRequested: rawPromo.length > 0,', '      promoRequested: false,', 'cupom fora da régua')] }, sFallbacks, true],
  ['checkout: interruptor forçado', { [CHECKOUT]: [replaceOnce('      live: GUEST_CHECKOUT_LIVE,\n      isGet,', '      live: true,\n      isGet,', 'interruptor forçado na rota')] }, sSwitchOff, false],
  ['checkout: cookie do navegador some', { [CHECKOUT]: [replaceOnce('    name: GUEST_CHECKOUT_NONCE_COOKIE,\n    value: nonce,', "    name: 'outro_cookie',\n    value: nonce,", 'cookie com outro nome')] }, sNewAccount, true],
]
for (const [name, transforms, scenario, live] of MUTANTS) {
  let problems
  let applied = []
  try {
    const env = makeEnv({ live, transforms })
    // Força a carga do módulo mutado ANTES do cenário, para a prova de aplicação existir mesmo se o cenário morrer cedo.
    for (const rel of Object.keys(transforms)) env.world.load(rel)
    applied = env.world.applied.filter((a) => !a.includes('GUEST_CHECKOUT_LIVE='))
    problems = await scenario(env)
  } catch (error) {
    problems = [`lançou: ${error instanceof Error ? error.message : String(error)}`]
  }
  const expected = Object.values(transforms).reduce((n, list) => n + list.length, 0)
  check(applied.length === expected, `mutante "${name}": aplicação provada (${applied.length}/${expected})`)
  check(problems.length > 0, `mutante "${name}": o cenário ficou vermelho`)
  // GUARD_DEBUG=1 mostra POR QUE cada mutante ficou vermelho (para conferir que é a regra, não um tropeço do teste).
  if (process.env.GUARD_DEBUG) console.log(`  [mutante] ${name} → ${problems[0] ?? '(verde!)'}`)
}

// ─── rodapé ──────────────────────────────────────────────────────────────────────────────────────────────────────────
if (failed.length) {
  console.error(`\n${failed.length} FALHA(S):`)
  for (const f of failed) console.error(`  ✗ ${f}`)
}
console.log(`\n${passed} verificações ok, ${failed.length} falhas — compra sem login (KINEO-COMPRA-SEM-LOGIN-2026-10-06)`)
process.exit(failed.length ? 1 : 0)
