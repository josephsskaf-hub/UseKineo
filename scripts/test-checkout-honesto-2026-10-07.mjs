#!/usr/bin/env node
// ═══ KINEO-CHECKOUT-HONESTO-2026-10-07 — guardião do "Checkouts 24h" em três linhas ═══════════════════════════════════
// O fundador viu "9 checkouts" no /admin e 1–2 na Stripe (07/10). Este arquivo prova, executando o CÓDIGO REAL
// (readFileSync + ts.transpileModule; o alias @/ é resolvido AQUI, nunca pelo Node; sem rede, sem banco, sem .env):
//
//   A. app/api/stripe/checkout/route.ts — DIFERENCIAL contra a base. A base é a própria rota SEM o carimbo (o bloco
//      KINEO-CHECKOUT-HONESTO-2026-10-07 tirado por âncoras; em 07/10 esse texto é o fed18d87 byte a byte, e o arquivo
//      confere). Os mesmos pedidos nas duas — convidado, logado, robô, sem user-agent, pacote sem login e
//      pré-carregamento —, cada um COM e SEM o cookie kineo_event_session_id: resposta (status, Location, corpo,
//      cookies) e chamadas à Stripe (parâmetros + chave de idempotência) iguais byte a byte; eventos iguais tirando as
//      três chaves novas; e as chaves novas certas — ip_hash = hashIp(clientIp()) do sink (lib/requestIdentity),
//      ua_class browser/bot/unknown, prefetch, session_id do cookie (inclusive quando quem chama não passa) — e IP cru
//      em lugar nenhum.
//   B. lib/admin/checkoutHonesto.ts — a regra das três linhas: o retrato de 07/10 (4 pessoas · 3 robô/rajada · 0
//      pagou · 1 da casa); a rajada de 3 convidados no mesmo segundo vai para "robô" — atravessando a virada do
//      segundo — e a tela diz "estimativa"; rajada por ip_hash / sessão em até 5 s; UA robô; prefetch; a conta da casa
//      sai da conta (lib/internalAccounts.ts: conta, sessão do navegador e IP); "pagou" só conta payment_success.
//   C. carregarCheckoutHonesto() lendo um banco falso em memória pelo readAll REAL (24 h no card, 7 dias de ligação).
//   D. a tela: /api/admin/live entrega checkout_honesto e o LiveNowPanel desenha as três linhas (React renderizado).
// Depois, MUTANTES em memória: cada regra é quebrada por uma troca de texto com prova de aplicação (âncora única,
// texto novo presente, âncora ausente) e a prova correspondente TEM de ficar vermelha (sem quebrar a execução).
//
// Rodar: node scripts/test-checkout-honesto-2026-10-07.mjs
import { existsSync, readFileSync, statSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join, posix } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'
import * as nodeCrypto from 'node:crypto'
import { AsyncLocalStorage } from 'node:async_hooks'

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
const notes = []
const VERBOSE = process.argv.includes('--verbose')
function check(cond, label) {
  if (cond) passed++
  else failed.push(label)
  if (VERBOSE && cond) console.log(`  ✓ ${label}`)
  return Boolean(cond)
}

const TAG = 'KINEO-CHECKOUT-HONESTO-2026-10-07'
const BASE_SHA = 'fed18d878c4c8bc0163eecff357b38284ef4d17d'
const ROUTE = 'app/api/stripe/checkout/route.ts'
const LIB = 'lib/admin/checkoutHonesto.ts'
const LIVE = 'app/api/admin/live/route.ts'
const PANEL = 'components/LiveNowPanel.tsx'
const IDENT = 'lib/requestIdentity.ts'
const GUEST_PURE = 'lib/growth/guestCheckout.ts'
const GUEST_SERVER = 'lib/stripe/guestCheckout.ts'
const READ_ALL = 'lib/supabase/readAll.ts'
const ORIGIN = 'https://www.usekineo.com'

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

/** Troca de texto com prova: a âncora existe UMA vez, o texto novo aparece e a âncora some (remoção: `to` vazio). */
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
/** Interruptor da compra sem login forçado para o cenário (vale com o valor do dia em true ou false). */
const guestLive = {
  label: 'GUEST_CHECKOUT_LIVE=true',
  allowNoop: true,
  apply(src) {
    const re = /export const GUEST_CHECKOUT_LIVE = (?:true|false)\b/g
    const hits = src.match(re) ?? []
    if (hits.length !== 1) throw new Error(`interruptor GUEST_CHECKOUT_LIVE não encontrado exatamente 1 vez (${hits.length})`)
    return src.replace(re, 'export const GUEST_CHECKOUT_LIVE = true')
  },
}

function makeWorld({ stubs = {}, sources = {}, transforms = {}, globals = {} }) {
  const cache = new Map()
  function load(rel) {
    const hit = cache.get(rel)
    if (hit) return hit.exports
    let src = Object.prototype.hasOwnProperty.call(sources, rel) ? sources[rel] : read(rel)
    for (const t of transforms[rel] ?? []) {
      const before = src
      src = t.apply(src)
      if (src === before && !t.allowNoop) throw new Error(`troca sem efeito em ${rel}: ${t.label}`)
    }
    const mod = { exports: {} }
    cache.set(rel, mod)
    const req = (spec) => {
      if (Object.prototype.hasOwnProperty.call(stubs, spec)) return stubs[spec]
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
  return { load }
}

// ─── determinismo: relógio, acaso e ids iguais nas duas rodadas (base e carimbo) ───────────────────────────────────────
const clone = (v) => (v === undefined || v === null ? v : JSON.parse(JSON.stringify(v)))
const FIXED_MS = Date.parse('2026-10-07T13:27:35.539Z')
function fixedDate(ms) {
  return class FixedDate extends Date {
    constructor(...args) {
      if (args.length === 0) super(ms)
      else super(...args)
    }
    static now() { return ms }
  }
}
function fakeCrypto() {
  let n = 0
  const bytes = (size) => {
    const chunks = []
    let have = 0
    while (have < size) {
      const d = nodeCrypto.createHash('sha256').update(`semente-do-guardiao:${++n}`).digest()
      chunks.push(d)
      have += d.length
    }
    return Buffer.concat(chunks).subarray(0, size)
  }
  const randomUUID = () => {
    const h = bytes(16).toString('hex')
    return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`
  }
  return { ...nodeCrypto, randomBytes: (size) => bytes(size), randomUUID }
}

// ─── falsos: resposta do Next, banco (PostgREST), Stripe ───────────────────────────────────────────────────────────────
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
}

function makeDb(seed = {}) {
  const tables = {}
  const T = (name) => (tables[name] ??= [])
  for (const [t, rows] of Object.entries(seed)) T(t).push(...rows.map(clone))
  const UNIQUE = { events: ['id'], profiles: ['id'] }
  const log = []
  let seq = 0
  const getPath = (row, col) => {
    const parts = String(col).split('->>')
    let v = row[parts[0].trim()]
    if (parts.length > 1) v = v && typeof v === 'object' ? v[parts[1].trim()] : undefined
    return v === undefined ? null : v
  }
  const project = (row, cols) => {
    const list = String(cols ?? '*').split(',').map((s) => s.trim()).filter(Boolean)
    if (!list.length || list.includes('*')) return clone(row)
    const out = {}
    for (const item of list) {
      const i = item.indexOf(':')
      const alias = i > 0 ? item.slice(0, i).trim() : item.split('->>').pop().trim()
      const path = i > 0 ? item.slice(i + 1).trim() : item
      out[alias] = clone(getPath(row, path))
    }
    return out
  }
  const containsJson = (v, o) => !!v && typeof v === 'object' && Object.entries(o).every(([k, val]) => (
    val && typeof val === 'object' ? containsJson(v[k], val) : v[k] === val
  ))
  class Query {
    constructor(table) { Object.assign(this, { table, op: 'select', filters: [], desc: [], cols: '*', wantRows: false, mode: null, lim: null, head: false, rng: null, orders: [] }) }
    select(cols, opts) { if (this.op === 'select') { this.cols = cols ?? '*'; if (opts?.head) this.head = true } else this.wantRows = true; return this }
    insert(p) { this.op = 'insert'; this.payload = Array.isArray(p) ? p : [p]; return this }
    update(p) { this.op = 'update'; this.payload = p; return this }
    upsert(p) { this.op = 'insert'; this.payload = Array.isArray(p) ? p : [p]; return this }
    delete() { this.op = 'delete'; return this }
    eq(c, v) { this.desc.push(['eq', c, v]); this.filters.push((r) => getPath(r, c) === v); return this }
    neq(c, v) { this.desc.push(['neq', c, v]); this.filters.push((r) => getPath(r, c) !== v); return this }
    in(c, vs) { this.desc.push(['in', c, [...vs]]); this.filters.push((r) => vs.includes(getPath(r, c))); return this }
    is(c, v) { this.desc.push(['is', c, v]); this.filters.push((r) => getPath(r, c) === v); return this }
    not(c, op, v) {
      this.desc.push(['not', c, op, v])
      if (op !== 'is' || v !== null) throw new Error(`not(${c}, ${op}) fora do falso`)
      this.filters.push((r) => getPath(r, c) !== null)
      return this
    }
    contains(c, o) { this.desc.push(['contains', c, o]); this.filters.push((r) => containsJson(r[c], o)); return this }
    gte(c, v) { this.desc.push(['gte', c, v]); this.filters.push((r) => String(getPath(r, c) ?? '') >= String(v)); return this }
    gt(c, v) { this.desc.push(['gt', c, v]); this.filters.push((r) => String(getPath(r, c) ?? '') > String(v)); return this }
    lte(c, v) { this.desc.push(['lte', c, v]); this.filters.push((r) => String(getPath(r, c) ?? '') <= String(v)); return this }
    lt(c, v) { this.desc.push(['lt', c, v]); this.filters.push((r) => String(getPath(r, c) ?? '') < String(v)); return this }
    order(c, o) { this.orders.push([c, o?.ascending !== false]); return this }
    limit(n) { this.lim = n; return this }
    range(a, b) { this.rng = [a, b]; return this }
    single() { this.mode = 'single'; return this }
    maybeSingle() { this.mode = 'maybe'; return this }
    then(resolve, reject) { return Promise.resolve().then(() => this.run()).then(resolve, reject) }
    shape(list) {
      const data = list.map((r) => project(r, this.cols))
      if (this.mode === 'single') return data.length === 1 ? { data: data[0], error: null } : { data: null, error: { code: 'PGRST116', message: 'JSON object requested, multiple (or no) rows returned' } }
      if (this.mode === 'maybe') return data.length <= 1 ? { data: data[0] ?? null, error: null } : { data: null, error: { code: 'PGRST116', message: 'multiple rows' } }
      return { data, error: null }
    }
    run() {
      log.push({ table: this.table, op: this.op, cols: this.cols, desc: clone(this.desc) })
      const rows = T(this.table)
      if (this.op === 'insert') {
        const keys = UNIQUE[this.table] ?? []
        for (const r of this.payload) {
          if (keys.length && rows.some((x) => keys.every((k) => x[k] !== undefined && x[k] !== null && x[k] === r[k]))) {
            return { data: null, error: { code: '23505', message: `duplicate key value violates unique constraint (${this.table})` } }
          }
        }
        const inserted = this.payload.map((r) => ({ id: `row-${++seq}`, created_at: r.created_at ?? '2026-10-07T13:27:35.539Z', ...clone(r) }))
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
      for (const [c, asc] of [...this.orders].reverse()) {
        hit = [...hit].sort((a, b) => {
          const x = String(getPath(a, c) ?? ''), y = String(getPath(b, c) ?? '')
          return (x < y ? -1 : x > y ? 1 : 0) * (asc ? 1 : -1)
        })
      }
      if (this.rng) hit = hit.slice(this.rng[0], this.rng[1] + 1)
      if (this.lim !== null) hit = hit.slice(0, this.lim)
      return this.shape(hit)
    }
  }
  return { tables, log, rows: (t) => T(t), from: (t) => new Query(t) }
}

function makeStripe() {
  let seq = 0
  const nextId = (prefix) => `${prefix}${String(++seq).padStart(6, '0')}`
  const sessions = new Map()
  const customers = new Map()
  const idem = new Map()
  const calls = []
  const missing = (what) => Object.assign(new Error(`No such ${what}`), { code: 'resource_missing', statusCode: 404, type: 'StripeInvalidRequestError' })
  return {
    calls,
    checkout: {
      sessions: {
        async create(params, opts = {}) {
          calls.push({ op: 'checkout.sessions.create', params: clone(params), idempotencyKey: opts.idempotencyKey ?? null })
          if (opts.idempotencyKey && idem.has(opts.idempotencyKey)) return clone(sessions.get(idem.get(opts.idempotencyKey)))
          const id = `cs_test_${nextId('')}`
          const items = params.line_items ?? []
          const session = {
            id, object: 'checkout.session', url: `https://checkout.stripe.com/c/pay/${id}`, mode: params.mode, status: 'open',
            payment_status: 'unpaid', customer: params.customer ?? null, metadata: { ...(params.metadata ?? {}) },
            amount_total: items.reduce((s, li) => s + (li.price_data?.unit_amount ?? 0) * (li.quantity ?? 1), 0),
            currency: items[0]?.price_data?.currency ?? 'usd', total_details: { amount_discount: 0 },
          }
          sessions.set(id, session)
          if (opts.idempotencyKey) idem.set(opts.idempotencyKey, id)
          return clone(session)
        },
        async retrieve(id) {
          calls.push({ op: 'checkout.sessions.retrieve', id })
          if (!sessions.has(id)) throw missing('checkout.session')
          return clone(sessions.get(id))
        },
      },
    },
    customers: {
      async create(params, opts = {}) {
        calls.push({ op: 'customers.create', params: clone(params), idempotencyKey: opts.idempotencyKey ?? null })
        if (opts.idempotencyKey && idem.has(opts.idempotencyKey)) return clone(customers.get(idem.get(opts.idempotencyKey)))
        const id = nextId('cus_')
        customers.set(id, { id, object: 'customer', email: params.email ?? null, metadata: { ...(params.metadata ?? {}) } })
        if (opts.idempotencyKey) idem.set(opts.idempotencyKey, id)
        return clone(customers.get(id))
      },
      async retrieve(id) {
        calls.push({ op: 'customers.retrieve', id })
        if (!customers.has(id)) throw missing('customer')
        return clone(customers.get(id))
      },
      async update(id, params) {
        calls.push({ op: 'customers.update', id, params: clone(params) })
        if (!customers.has(id)) throw missing('customer')
        Object.assign(customers.get(id).metadata, params.metadata ?? {})
        return clone(customers.get(id))
      },
    },
    subscriptions: {
      async retrieve(id) { calls.push({ op: 'subscriptions.retrieve', id }); throw missing('subscription') },
      async list(params) { calls.push({ op: 'subscriptions.list', params: clone(params) }); return { data: [] } },
    },
    promotionCodes: {
      async list(params) { calls.push({ op: 'promotionCodes.list', params: clone(params) }); return { data: [] } },
      async create(params) { calls.push({ op: 'promotionCodes.create', params: clone(params) }); return { id: nextId('promo_'), ...clone(params) } },
    },
    coupons: {
      async retrieve(id) { calls.push({ op: 'coupons.retrieve', id }); throw missing('coupon') },
      async create(params) { calls.push({ op: 'coupons.create', params: clone(params) }); return { id: params.id ?? nextId('coupon_'), valid: true, ...clone(params) } },
    },
  }
}

// ─── o pedido: cookies e cabeçalhos por requisição (o cookies()/headers() do Next também são por pedido) ──────────────
const pedido = new AsyncLocalStorage()
function headerBag(headers) {
  const h = new Map(Object.entries(headers).filter(([, v]) => v !== null && v !== undefined).map(([k, v]) => [k.toLowerCase(), String(v)]))
  return { get: (k) => h.get(String(k).toLowerCase()) ?? null }
}
function cookieBag(cookies) {
  return { get: (k) => (Object.prototype.hasOwnProperty.call(cookies, k) ? { name: k, value: cookies[k] } : undefined) }
}
function fakeReq(url, { cookies = {}, headers = {} } = {}) {
  return { url, nextUrl: new URL(url), headers: headerBag(headers), cookies: cookieBag(cookies) }
}

const ENV = {
  NEXT_PUBLIC_SUPABASE_URL: 'https://fake.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY: 'service-role-placeholder',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon-placeholder',
  STRIPE_SECRET_KEY: 'sk_test_placeholder',
  KINEO_TRIAL_FINGERPRINT_SALT: 'sal-do-guardiao-0710',
}
const quiet = { log() {}, info() {}, debug() {}, warn() {}, error() {} }
const SESSAO = 'sess_honesto_0710'
const IP_XFF = '203.0.113.9'
const IP_REAL = '198.51.100.7'
const UA_SAFARI = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15'
const UA_ROBO = 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)'
const CLIENTE = { id: '0b6f3a52-4c1e-4c43-9a51-7d1a2f0c0710', email: 'cliente@example.com', created_at: '2026-10-01T10:00:00.000Z' }
const hashEsperado = (ip) => (ip ? nodeCrypto.createHash('sha256').update(`${ENV.KINEO_TRIAL_FINGERPRINT_SALT}|${ip}`).digest('hex') : null)

// ─── a base: a rota sem o carimbo (âncoras), e a conferência contra o fed18d87 ─────────────────────────────────────────
const SIGNATURE_RE = /^function isSpeculativeRequest\(req: \{ headers: \{ get\(name: string\): string \| null \} \}\): boolean \{ \/\/ KINEO-CHECKOUT-HONESTO-2026-10-07[^\n]*$/m
function semCarimbo(src) {
  let out = src
  const imports = out.match(/^import [^\n]*KINEO-CHECKOUT-HONESTO-2026-10-07[^\n]*\n/gm) ?? []
  if (imports.length !== 2) throw new Error(`neutralizador: ${imports.length} imports com a marca (esperado 2)`)
  for (const line of imports) out = out.split(line).join('')
  const ini = out.indexOf('// ═══ KINEO-CHECKOUT-HONESTO-2026-10-07 — QUEM ABRIU O PAGAMENTO')
  const fimMarca = '// ═══ FIM KINEO-CHECKOUT-HONESTO-2026-10-07'
  const fim = out.indexOf(fimMarca)
  if (ini < 0 || fim < ini || out.indexOf('// ═══ KINEO-CHECKOUT-HONESTO-2026-10-07', ini + 1) >= 0) throw new Error('neutralizador: bloco do carimbo não é único')
  const fimLinha = out.indexOf('\n', fim)
  out = out.slice(0, ini) + out.slice(fimLinha + 2) // a linha FIM + a linha em branco que o bloco somou
  const calls = out.match(/^[ \t]*stampCheckoutOrigin\(eventRow\)[^\n]*\n/gm) ?? []
  if (calls.length !== 1) throw new Error(`neutralizador: ${calls.length} chamadas do carimbo (esperado 1)`)
  out = out.split(calls[0]).join('')
  const sig = out.match(new RegExp(SIGNATURE_RE.source, 'gm')) ?? []
  if (sig.length !== 1) throw new Error(`neutralizador: assinatura estrutural achada ${sig.length} vezes`)
  out = out.replace(SIGNATURE_RE, 'function isSpeculativeRequest(req: NextRequest): boolean {')
  if (/KINEO-CHECKOUT-HONESTO|stampCheckoutOrigin|checkoutUaClass|requestHeaders/.test(out)) throw new Error('neutralizador: sobrou pedaço do carimbo')
  return out
}

let BASE_SOURCE = null
try {
  BASE_SOURCE = semCarimbo(read(ROUTE))
  check(true, 'A0. a rota sem o carimbo sai por âncoras únicas (2 imports, 1 bloco, 1 chamada, 1 assinatura)')
} catch (e) {
  check(false, `A0. a rota sem o carimbo não sai por âncoras: ${e.message}`)
}
{
  let gitBase = null
  try {
    gitBase = execFileSync('git', ['-C', root, 'show', `${BASE_SHA}:${ROUTE}`], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'] }).split(CR).join('')
  } catch {
    gitBase = null
  }
  if (gitBase === null) notes.push(`A1 (aviso): o git não devolveu ${BASE_SHA.slice(0, 8)}:${ROUTE}; o diferencial roda contra a rota sem o carimbo`)
  else if (BASE_SOURCE === gitBase) check(true, `A1. a rota sem o carimbo é o ${BASE_SHA.slice(0, 8)} byte a byte (o diferencial roda contra a base de verdade)`)
  else if (BASE_SOURCE !== null) {
    // Outras entregas mexeram na rota depois do fed18d87: só é defeito se a diferença tiver pedaço do carimbo.
    const conta = (txt) => { const m = new Map(); for (const l of txt.split('\n')) m.set(l, (m.get(l) ?? 0) + 1); return m }
    const a = conta(BASE_SOURCE), b = conta(gitBase)
    const so = []
    for (const [l, n] of a) if ((b.get(l) ?? 0) !== n) so.push(l)
    for (const [l, n] of b) if ((a.get(l) ?? 0) !== n) so.push(l)
    const doCarimbo = so.filter((l) => /KINEO-CHECKOUT-HONESTO|stampCheckoutOrigin|checkoutUaClass|requestHeaders/.test(l))
    if (check(doCarimbo.length === 0, `A1. a diferença contra ${BASE_SHA.slice(0, 8)} não tem pedaço do carimbo (${doCarimbo.slice(0, 2).join(' | ')})`)) {
      notes.push(`A1 (aviso): a rota mudou depois de ${BASE_SHA.slice(0, 8)} em ${so.length} linha(s) de outras entregas; o diferencial roda contra a rota atual sem o carimbo`)
    }
  }
}

// ─── A. o diferencial da rota ──────────────────────────────────────────────────────────────────────────────────────────
function routeWorld({ variante, db, stripe, transforms = {} }) {
  const stubs = {
    'next/server': { NextResponse: FakeResponse },
    'next/headers': {
      cookies: () => cookieBag(pedido.getStore()?.cookies ?? {}),
      headers: () => {
        const store = pedido.getStore()
        if (!store) throw new Error('headers() fora do pedido')
        return store.headers
      },
    },
    '@supabase/supabase-js': { createClient: () => db },
    '@/lib/supabase/server': {
      createClient: () => ({
        from: (t) => db.from(t),
        auth: {
          async getUser() {
            const user = pedido.getStore()?.user ?? null
            return user ? { data: { user: clone(user) }, error: null } : { data: { user: null }, error: { name: 'AuthSessionMissingError', message: 'Auth session missing!' } }
          },
        },
      }),
    },
    '@/lib/stripe': { stripe },
    stripe: { __esModule: true, default: function StripeStub() {} },
    '@/lib/paypal': { paypalFetch: async () => { throw new Error('PayPal fora do escopo deste guardião') } },
    '@/lib/email/quota': { recordEmailSend: async () => {}, recordResendResponse: async () => {} },
    'node:crypto': fakeCrypto(),
    crypto: null,
  }
  stubs.crypto = stubs['node:crypto']
  const sources = variante === 'base' ? { [ROUTE]: BASE_SOURCE } : {}
  const all = { ...transforms, [GUEST_PURE]: [guestLive, ...(transforms[GUEST_PURE] ?? [])] }
  return makeWorld({ stubs, sources, transforms: all, globals: { process: { env: { ...ENV } }, console: quiet, fetch: async () => { throw new Error('sem rede') }, Date: fixedDate(FIXED_MS) } })
}

const CENARIOS = [
  {
    nome: 'convidado', query: 'tier=basic&billing=monthly',
    headers: { 'user-agent': UA_SAFARI, 'x-forwarded-for': `${IP_XFF}, 10.0.0.1` }, ip: IP_XFF, ua: 'browser', prefetch: false,
    espera: (r) => r.resposta.status === 307 && /^https:\/\/checkout\.stripe\.com\//.test(r.resposta.location ?? '') && r.nomes.includes('checkout_started') && r.nomes.includes('checkout_guest_started'),
  },
  {
    nome: 'logado', query: 'tier=pro&billing=monthly', user: CLIENTE,
    headers: { 'user-agent': UA_SAFARI, 'x-forwarded-for': IP_XFF }, ip: IP_XFF, ua: 'browser', prefetch: false,
    espera: (r) => r.resposta.status === 307 && /^https:\/\/checkout\.stripe\.com\//.test(r.resposta.location ?? '') && r.eventos.some((e) => e.name === 'checkout_started' && e.user_id === CLIENTE.id),
  },
  {
    nome: 'robô', query: 'tier=starter&billing=monthly',
    headers: { 'user-agent': UA_ROBO, 'x-forwarded-for': IP_XFF }, ip: IP_XFF, ua: 'bot', prefetch: false,
    espera: (r) => (r.resposta.location ?? '').includes('/signup') && r.nomes.includes('checkout_bot_suspected') && r.nomes.includes('checkout_auth_required') && !r.nomes.includes('checkout_started'),
  },
  {
    nome: 'sem user-agent', query: 'tier=basic&billing=monthly',
    headers: {}, ip: null, ua: 'unknown', prefetch: false,
    espera: (r) => (r.resposta.location ?? '').includes('/signup') && r.nomes.includes('checkout_bot_suspected') && !r.nomes.includes('checkout_started'),
  },
  {
    nome: 'pacote sem login', query: 'pack=starter',
    headers: { 'user-agent': UA_SAFARI, 'x-real-ip': IP_REAL }, ip: IP_REAL, ua: 'browser', prefetch: false,
    espera: (r) => r.nomes.includes('checkout_auth_required') && r.stripe.length === 0,
  },
  {
    nome: 'pré-carregamento', query: 'tier=pro&billing=monthly',
    headers: { 'user-agent': UA_SAFARI, 'x-forwarded-for': IP_XFF, 'sec-purpose': 'prefetch;prerender' }, ip: IP_XFF, ua: 'browser', prefetch: true,
    espera: (r) => r.resposta.status === 204 && r.nomes.length === 1 && r.nomes[0] === 'checkout_prefetch_blocked' && r.stripe.length === 0,
  },
]

async function rodaRota({ variante, sc, comCookie, transforms = {} }) {
  const db = makeDb(sc.user ? {
    profiles: [{
      id: sc.user.id, email: sc.user.email, video_credits: 25, plan: 'free', is_pro: false, has_paid: false,
      stripe_customer_id: null, stripe_subscription_id: null, paypal_subscription_id: null, affiliate_id: null,
      trial_credits_granted: 25, trial_credits_used: 0,
    }],
  } : {})
  const stripe = makeStripe()
  const world = routeWorld({ variante, db, stripe, transforms })
  const cookies = comCookie ? { kineo_event_session_id: SESSAO } : {}
  const headers = { 'x-vercel-ip-country': 'US', 'accept-language': 'en-US,en;q=0.9', referer: `${ORIGIN}/pricing`, ...sc.headers }
  const req = fakeReq(`${ORIGIN}/api/stripe/checkout?${sc.query}`, { cookies, headers })
  const res = await pedido.run({ cookies, headers: headerBag(headers), user: sc.user ?? null }, () => world.load(ROUTE).GET(req))
  const eventos = db.rows('events').map(({ name, user_id, session_id, path, metadata }) => ({ name, user_id, session_id, path, metadata }))
  return {
    resposta: { status: res.status, location: res.headers.get('location'), json: res.jsonBody ?? null, body: res.body ?? null, cookies: res.cookieJar },
    stripe: stripe.calls,
    eventos,
    nomes: eventos.map((e) => e.name),
    world,
  }
}

const NOVAS = ['ip_hash', 'ua_class', 'prefetch']
const semNovas = (m) => Object.fromEntries(Object.entries(m ?? {}).filter(([k]) => !NOVAS.includes(k)))

/** A prova da rota: devolve a lista de problemas (vazia = verde). `novo` recebe as trocas (mutantes); a base nunca. */
async function provaRota(novo = {}) {
  const p = []
  for (const sc of CENARIOS) {
    for (const comCookie of [true, false]) {
      const label = `${sc.nome} ${comCookie ? 'com' : 'sem'} cookie`
      const base = await rodaRota({ variante: 'base', sc, comCookie })
      const nov = await rodaRota({ variante: 'novo', sc, comCookie, transforms: novo })
      if (!sc.espera(base)) p.push(`${label}: o cenário não fez o que diz na base (${JSON.stringify(base.resposta).slice(0, 140)} · ${base.nomes.join(',')})`)
      const rb = JSON.stringify(base.resposta), rn = JSON.stringify(nov.resposta)
      if (rb !== rn) p.push(`${label}: a RESPOSTA mudou (${rb.slice(0, 120)} → ${rn.slice(0, 120)})`)
      if (JSON.stringify(base.stripe) !== JSON.stringify(nov.stripe)) p.push(`${label}: a chamada à STRIPE mudou`)
      if (base.eventos.length !== nov.eventos.length || base.nomes.join() !== nov.nomes.join()) {
        p.push(`${label}: outros eventos (${base.nomes.join(',')} → ${nov.nomes.join(',')})`)
        continue
      }
      if (!nov.eventos.length) p.push(`${label}: nenhum evento gravado`)
      nov.eventos.forEach((e, i) => {
        const b = base.eventos[i]
        const tag = `${label} · ${e.name}`
        if (Object.keys(b.metadata ?? {}).some((k) => NOVAS.includes(k))) p.push(`${tag}: a base já tinha chave nova`)
        if (JSON.stringify(semNovas(e.metadata)) !== JSON.stringify(b.metadata)) p.push(`${tag}: a metadata mudou além das 3 chaves novas`)
        if (e.user_id !== b.user_id || e.path !== b.path) p.push(`${tag}: user_id/path mudaram`)
        if (e.session_id !== (comCookie ? SESSAO : null)) p.push(`${tag}: session_id ${e.session_id} (esperado ${comCookie ? SESSAO : null})`)
        const m = e.metadata ?? {}
        if (!('ip_hash' in m) || m.ip_hash !== hashEsperado(sc.ip)) p.push(`${tag}: ip_hash ${m.ip_hash} (esperado ${hashEsperado(sc.ip)})`)
        if (m.ua_class !== sc.ua) p.push(`${tag}: ua_class ${m.ua_class} (esperado ${sc.ua})`)
        if (m.prefetch !== sc.prefetch) p.push(`${tag}: prefetch ${m.prefetch} (esperado ${sc.prefetch})`)
      })
      // o hash é o do sink: a MESMA função de lib/requestIdentity, executada no mesmo mundo
      if (VERBOSE && !Object.keys(novo).length) {
        console.log(`    · ${label}: ${nov.resposta.status} ${String(nov.resposta.location ?? '').slice(0, 60)} | stripe ${nov.stripe.length} | ` +
          nov.eventos.map((e) => `${e.name}[${e.session_id ?? '-'} ${String(e.metadata?.ip_hash ?? '-').slice(0, 6)} ${e.metadata?.ua_class} ${e.metadata?.prefetch}]`).join(' '))
      }
      const ident = nov.world.load(IDENT)
      const doSink = ident.hashIp(ident.clientIp(headerBag(sc.headers)))
      if (doSink !== hashEsperado(sc.ip)) p.push(`${label}: o hash do sink (${doSink}) não é o esperado`)
      const tudo = JSON.stringify({ r: nov.resposta, s: nov.stripe, e: nov.eventos })
      for (const ip of [IP_XFF, IP_REAL]) if (tudo.includes(ip)) p.push(`${label}: IP cru (${ip}) gravado`)
    }
  }
  return p
}

/** Controle positivo do cookie: quem chama sem a sessão recebe a do cookie (e na base, sem o carimbo, não recebe). */
const SEM_SESSAO_NA_CHAMADA = {
  [ROUTE]: [replaceOnce(
    "await recordCheckoutEvent('checkout_started', null, startedMetadata, ctx.browserSessionId ?? undefined)",
    "await recordCheckoutEvent('checkout_started', null, startedMetadata, undefined)",
    'checkout_started do convidado chamado sem a sessão',
  )],
}
async function provaCookie(novo = {}) {
  const p = []
  const sc = CENARIOS[0]
  const comCarimbo = await rodaRota({ variante: 'novo', sc, comCookie: true, transforms: { ...novo, [ROUTE]: [...SEM_SESSAO_NA_CHAMADA[ROUTE], ...(novo[ROUTE] ?? [])] } })
  const started = comCarimbo.eventos.find((e) => e.name === 'checkout_started')
  if (started?.session_id !== SESSAO) p.push(`chamada sem a sessão: o writer não leu o cookie (session_id ${started?.session_id})`)
  const semCookie = await rodaRota({ variante: 'novo', sc, comCookie: false, transforms: { ...novo, [ROUTE]: [...SEM_SESSAO_NA_CHAMADA[ROUTE], ...(novo[ROUTE] ?? [])] } })
  if (semCookie.eventos.find((e) => e.name === 'checkout_started')?.session_id !== null) p.push('sem cookie: a sessão apareceu do nada')
  const base = await rodaRota({ variante: 'base', sc, comCookie: true, transforms: SEM_SESSAO_NA_CHAMADA })
  if (base.eventos.find((e) => e.name === 'checkout_started')?.session_id !== null) p.push('controle: na base a chamada sem sessão já gravava a sessão (o controle não morde)')
  return p
}

// ─── B. a regra das três linhas ────────────────────────────────────────────────────────────────────────────────────────
const IP_CASA = 'c'.repeat(64)
const IP_CLIENTE = 'd'.repeat(64)
const IP_X = 'e'.repeat(64)
const IP_Y = 'f'.repeat(64)
const libWorld = (transforms = {}) => makeWorld({ transforms })

function evento(name, id, at, o = {}) {
  return { id, name, created_at: at, user_id: o.user ?? null, session_id: o.sess ?? null, metadata: { ...(o.cs ? { stripe_session_id: o.cs } : {}), ...(o.meta ?? {}) } }
}
const plus = (iso, ms) => new Date(Date.parse(iso) + ms).toISOString()

/** O retrato de 07/10 (UTC), anonimizado: os 9 checkout_started reais + o gêmeo de cada convidado. */
function retrato0710() {
  const ev = []
  const abre = (id, at, o = {}) => {
    ev.push(evento('checkout_started', `cs-ev-${id}`, at, { ...o, cs: `cs_live_${id}`, meta: { guest_checkout: o.user ? undefined : true, ...(o.meta ?? {}) } }))
    if (!o.user) ev.push(evento('checkout_guest_started', `cg-ev-${id}`, plus(at, 60), { ...o, cs: `cs_live_${id}` }))
  }
  abre('madrugada1', '2026-10-07T01:57:01.136Z')
  abre('madrugada2', '2026-10-07T04:49:52.665Z')
  abre('madrugada3', '2026-10-07T05:07:22.931Z')
  abre('teste-casa', '2026-10-07T12:31:52.258Z', { sess: 'aba-teste-casa' })
  abre('rajada-pro', '2026-10-07T13:27:35.539Z')
  abre('rajada-starter', '2026-10-07T13:27:35.552Z')
  abre('rajada-basic', '2026-10-07T13:27:36.501Z')
  abre('studio-1', '2026-10-07T15:13:33.722Z', { user: 'u-cliente', sess: 'aba-cliente' })
  abre('studio-2', '2026-10-07T15:14:16.951Z', { user: 'u-cliente', sess: 'aba-cliente' })
  return {
    eventos: ev,
    sessoes: [
      { session_id: 'aba-teste-casa', user_id: null, ip_hash: IP_CASA },
      { session_id: 'aba-cliente', user_id: null, ip_hash: IP_CLIENTE },
      { session_id: 'aba-cliente', user_id: 'u-cliente', ip_hash: IP_CLIENTE },
    ],
    ips: [
      { user_id: 'u-fundador', ip_hash: IP_CASA },
      { user_id: 'u-alias', ip_hash: IP_CASA },
      { user_id: 'u-cliente', ip_hash: IP_CLIENTE },
    ],
    perfis: [
      { id: 'u-fundador', email: 'josephsskaf@gmail.com' },
      { id: 'u-alias', email: 'josephsskaf+openai@gmail.com' },
      { id: 'u-cliente', email: 'cliente@example.com' },
    ],
  }
}

function classifica(L, f) {
  return L.classificarCheckouts({ eventos: f.eventos, casa: L.sinaisDaCasa({ perfis: f.perfis, sessoes: f.sessoes, ips: f.ips }), ipsDaSessao: L.ipsPorSessao(f.sessoes) })
}
const igual = (r, esperado) => Object.entries(esperado).filter(([k, v]) => JSON.stringify(r[k]) !== JSON.stringify(v)).map(([k, v]) => `${k}=${JSON.stringify(r[k])} (esperado ${JSON.stringify(v)})`)
const fecha = (r) => r.sessoesAbertas === r.sessoesDePessoas + r.roboOuRajada + r.daCasa

async function provaRegra(transforms = {}) {
  const p = []
  const L = libWorld(transforms).load(LIB)

  // B1. o retrato de 07/10
  const r1 = classifica(L, retrato0710())
  p.push(...igual(r1, { sessoesAbertas: 9, pessoas: 4, sessoesDePessoas: 5, pessoasSemIdentidade: 3, roboOuRajada: 3, roboOuRajadaEstimado: 3, pagou: 0, daCasa: 1 }).map((s) => `B1 retrato 07/10: ${s}`))
  if (!fecha(r1)) p.push('B1: a conta não fecha (abertas ≠ pessoas + robô + casa)')

  // B2. a rajada atravessa a virada do segundo e continua sendo UMA rajada; 1,2 s já não é "mesmo segundo"
  const segundos = ['2026-10-07T13:27:35.539Z', '2026-10-07T13:27:35.552Z', '2026-10-07T13:27:36.501Z'].map((t) => new Date(t).getUTCSeconds())
  if (new Set(segundos).size !== 2) p.push('B2: o retrato não atravessa a virada do segundo (o teste perderia o sentido)')
  const quase = { eventos: [0, 600, 1200].map((ms, i) => evento('checkout_started', `q${i}`, plus('2026-10-07T09:00:00.000Z', ms), { cs: `cs_q${i}` })), sessoes: [], ips: [], perfis: [] }
  const r2 = classifica(L, quase)
  p.push(...igual(r2, { roboOuRajada: 0, pessoas: 3 }).map((s) => `B2 três convidados em 1,2 s: ${s}`))

  // B3. carimbo novo: rajada por ip_hash e por sessão em até 5 s; ua bot; prefetch; ua unknown é gente
  const t0 = '2026-10-08T10:00:00.000Z'
  const novo = (id, ms, o = {}) => evento('checkout_started', id, plus(t0, ms), { cs: `cs_${id}`, sess: o.sess, user: o.user, meta: { ip_hash: o.ip ?? null, ua_class: o.ua ?? 'browser', prefetch: o.prefetch ?? false } })
  const f3 = {
    eventos: [
      novo('x1', 0, { ip: IP_X }), novo('x2', 2000, { ip: IP_X }), novo('x3', 4900, { ip: IP_X }),
      novo('y1', 0, { ip: IP_Y }), novo('y2', 3000, { ip: IP_Y }), novo('y3', 6000, { ip: IP_Y }),
      novo('z1', 0, { ip: 'a1'.repeat(32), sess: 'aba-z' }), novo('z2', 1500, { ip: 'a2'.repeat(32), sess: 'aba-z' }), novo('z3', 4000, { ip: 'a3'.repeat(32), sess: 'aba-z' }),
      novo('b1', 60000, { ip: 'b1'.repeat(32), ua: 'bot' }),
      novo('p1', 70000, { ip: 'b2'.repeat(32), prefetch: true }),
      novo('u1', 80000, { ip: 'b3'.repeat(32), ua: 'unknown' }),
    ],
    sessoes: [], ips: [], perfis: [],
  }
  const r3 = classifica(L, f3)
  p.push(...igual(r3, {
    sessoesAbertas: 12, roboOuRajada: 8, roboOuRajadaEstimado: 0, pessoas: 2, sessoesDePessoas: 4, daCasa: 0,
    motivos: { ua_robo: 1, prefetch: 1, rajada: 6, rajada_pelo_horario: 0 },
  }).map((s) => `B3 carimbo novo: ${s}`))
  if (!fecha(r3)) p.push('B3: a conta não fecha')

  // B4. a casa sai da conta — pela lib/internalAccounts.ts (conta, sessão do navegador, IP próprio, IP da sessão)
  const f4 = {
    eventos: [
      evento('checkout_started', 'h1', '2026-10-08T11:00:00.000Z', { cs: 'cs_h1', user: 'u-alias2', sess: 'aba-alias2' }),
      evento('checkout_started', 'h2', '2026-10-08T11:05:00.000Z', { cs: 'cs_h2', sess: 'aba-mista' }),
      evento('checkout_started', 'h3', '2026-10-08T11:10:00.000Z', { cs: 'cs_h3', meta: { ip_hash: IP_CASA, ua_class: 'browser', prefetch: false } }),
      evento('checkout_started', 'h4', '2026-10-08T11:15:00.000Z', { cs: 'cs_h4', sess: 'aba-teste-casa' }),
      evento('checkout_started', 'g1', '2026-10-08T11:20:00.000Z', { cs: 'cs_g1', user: 'u-gente', sess: 'aba-gente' }),
      evento('checkout_started', 'g2', '2026-10-08T11:25:00.000Z', { cs: 'cs_g2', meta: { ip_hash: IP_CLIENTE, ua_class: 'browser', prefetch: false } }),
    ],
    sessoes: [
      { session_id: 'aba-mista', user_id: 'u-tester', ip_hash: null },
      { session_id: 'aba-teste-casa', user_id: null, ip_hash: IP_CASA },
      { session_id: 'aba-gente', user_id: 'u-gente', ip_hash: IP_CLIENTE },
    ],
    ips: [{ user_id: 'u-fundador', ip_hash: IP_CASA }, { user_id: 'u-gente', ip_hash: IP_CLIENTE }],
    perfis: [
      { id: 'u-alias2', email: 'joseph+teste02@gmail.com' },
      { id: 'u-tester', email: 'victoriaskaf96@gmail.com' },
      { id: 'u-fundador', email: 'josephsskaf@gmail.com' },
      { id: 'u-gente', email: 'pessoa@example.com' },
    ],
  }
  const r4 = classifica(L, f4)
  p.push(...igual(r4, { sessoesAbertas: 6, daCasa: 4, pessoas: 2, sessoesDePessoas: 2, roboOuRajada: 0 }).map((s) => `B4 casa: ${s}`))
  if (!fecha(r4)) p.push('B4: a conta não fecha')

  // B5. "pagou" só conta payment_success — uma vez por evento, sem a casa
  const f5 = {
    eventos: [
      evento('payment_success', 'pay-1', '2026-10-08T12:00:00.000Z', { cs: 'cs_pay1', user: 'u-gente', sess: 'aba-gente' }),
      evento('payment_success', 'pay-1', '2026-10-08T12:00:00.000Z', { cs: 'cs_pay1', user: 'u-gente', sess: 'aba-gente' }),
      evento('payment_success', 'pay-casa', '2026-10-08T12:01:00.000Z', { cs: 'cs_pay2', user: 'u-fundador' }),
      evento('payment_success', 'pay-casa-aba', '2026-10-08T12:02:00.000Z', { cs: 'cs_pay3', user: 'u-novo', sess: 'aba-teste-casa' }),
      evento('subscription_invoice_paid', 'inv-1', '2026-10-08T12:03:00.000Z', { user: 'u-gente' }),
      evento('checkout_session_completed', 'csc-1', '2026-10-08T12:04:00.000Z', { cs: 'cs_pay1', user: 'u-gente' }),
      evento('dodo_checkout_started', 'dodo-1', '2026-10-08T12:05:00.000Z', { user: 'u-gente' }),
      evento('checkout_guest_started', 'cg-1', '2026-10-08T12:06:00.000Z', { cs: 'cs_x' }),
      evento('payment_failed', 'pf-1', '2026-10-08T12:07:00.000Z', { user: 'u-gente' }),
    ],
    sessoes: [{ session_id: 'aba-teste-casa', user_id: 'u-fundador', ip_hash: IP_CASA }],
    ips: [],
    perfis: [{ id: 'u-fundador', email: 'josephsskaf@gmail.com' }, { id: 'u-gente', email: 'pessoa@example.com' }, { id: 'u-novo', email: 'novo@example.com' }],
  }
  const r5 = classifica(L, f5)
  p.push(...igual(r5, { pagou: 1, pagamentosDaCasa: 2, sessoesAbertas: 0 }).map((s) => `B5 pagou: ${s}`))

  // B6. o gêmeo do convidado e a linha repetida da mesma sessão Stripe não contam duas vezes
  const f6 = {
    eventos: [
      evento('checkout_started', 'd1', '2026-10-08T13:00:00.000Z', { cs: 'cs_dup', sess: 'aba-d' }),
      evento('checkout_started', 'd1-velha', '2026-10-08T13:00:00.100Z', { cs: 'cs_dup', sess: 'aba-d' }),
      evento('checkout_guest_started', 'd1-gemeo', '2026-10-08T13:00:00.050Z', { cs: 'cs_dup', sess: 'aba-d' }),
    ],
    sessoes: [], ips: [], perfis: [],
  }
  const r6 = classifica(L, f6)
  p.push(...igual(r6, { sessoesAbertas: 1, pessoas: 1, sessoesDePessoas: 1 }).map((s) => `B6 gêmeo/duplicata: ${s}`))

  // B7. o texto da tela, em português simples
  const c1 = L.cartaoCheckoutHonesto(r1)
  const linha = (c, k) => c.linhas.find((l) => l.chave === k)
  if (c1.linhas.map((l) => l.chave).join() !== 'pessoas,robo,pagou') p.push(`B7: as três linhas fora de ordem (${c1.linhas.map((l) => l.chave).join()})`)
  if (linha(c1, 'pessoas')?.rotulo !== 'chegaram ao pagamento' || linha(c1, 'pessoas')?.valor !== 4 || linha(c1, 'pessoas')?.detalhe !== '5 aberturas') p.push(`B7: linha pessoa ${JSON.stringify(linha(c1, 'pessoas'))}`)
  if (linha(c1, 'robo')?.rotulo !== 'robôs ou cliques repetidos' || linha(c1, 'robo')?.valor !== 3 || linha(c1, 'robo')?.detalhe !== 'estimativa') p.push(`B7: linha robô ${JSON.stringify(linha(c1, 'robo'))}`)
  if (linha(c1, 'pagou')?.rotulo !== 'pagaram' || linha(c1, 'pagou')?.valor !== 0) p.push(`B7: linha pagou ${JSON.stringify(linha(c1, 'pagou'))}`)
  // KINEO-CARTAO-PAGAMENTO-CLARO-2026-10-09 — re-ancorado: o fundador pediu o cartão mais claro ("não sei quais são quais").
  if (c1.conta !== 'Fora da conta: 3 robôs ou cliques repetidos · 1 teste da casa (9 aberturas no total)') p.push(`B7: a conta da tela é "${c1.conta}"`)
  if (!c1.avisos.some((a) => a.startsWith('Estimativa:') && a.includes('mesmo segundo'))) p.push('B7: a tela não diz que a rajada pelo horário é estimativa')
  if (!c1.avisos.some((a) => a.startsWith('3 pagamentos antigos sem conta, sessão nem IP'))) p.push('B7: a tela não avisa das 3 aberturas sem identidade')
  const c3 = L.cartaoCheckoutHonesto(r3)
  if (linha(c3, 'robo')?.detalhe !== null || c3.avisos.some((a) => a.startsWith('Estimativa:'))) p.push('B7: carimbo novo (com IP) não pode virar "estimativa"')
  const c5 = L.cartaoCheckoutHonesto(r5)
  if (!c5.avisos.includes('2 pagamentos da casa ficaram fora de "pagou".')) p.push(`B7: aviso dos pagamentos da casa (${c5.avisos.join(' | ')})`)
  return p
}

// ─── C. o carregador lendo um banco falso pelo readAll real ────────────────────────────────────────────────────────────
const AGORA = Date.parse('2026-10-08T00:48:02.552Z')
function bancoDoRetrato() {
  const f = retrato0710()
  const sink = (name, id, at, o) => evento(name, id, at, { user: o.user, sess: o.sess, meta: { ip_hash: o.ip, is_bot: false } })
  return makeDb({
    events: [
      ...f.eventos,
      // o teste da casa de 06/10 22:46 (fora das 24 h: não pode aparecer nem como "da casa")
      evento('checkout_started', 'cs-ev-0610', '2026-10-06T22:46:28.823Z', { cs: 'cs_live_0610', sess: 'aba-casa-0610', meta: { guest_checkout: true } }),
      sink('pricing_view', 'sk-1', '2026-10-06T22:46:13.387Z', { sess: 'aba-casa-0610', ip: IP_CASA }),
      // o sink das sessões do dia (o ip_hash mora aqui, não no evento antigo)
      sink('pricing_view', 'sk-2', '2026-10-07T12:30:00.000Z', { sess: 'aba-teste-casa', ip: IP_CASA }),
      sink('homepage_view', 'sk-3', '2026-10-07T15:12:01.528Z', { sess: 'aba-cliente', ip: IP_CLIENTE }),
      sink('pricing_view', 'sk-4', '2026-10-07T15:12:30.000Z', { user: 'u-cliente', sess: 'aba-cliente', ip: IP_CLIENTE }),
      // as contas da casa no mesmo IP (o fundador logado e o alias do ChatGPT)
      sink('studio_view', 'sk-5', '2026-10-07T23:59:00.196Z', { user: 'u-fundador', sess: 'aba-fundador', ip: IP_CASA }),
      sink('studio_view', 'sk-6', '2026-10-07T11:18:14.593Z', { user: 'u-alias', sess: 'aba-alias', ip: IP_CASA }),
      // ruído: evento do fundador com IP de 9 dias atrás (fora da ligação de 7 dias)
      sink('studio_view', 'sk-7', '2026-09-29T10:00:00.000Z', { user: 'u-fundador', sess: 'aba-velha', ip: 'f0'.repeat(32) }),
    ],
    profiles: retrato0710().perfis,
  })
}

async function provaCarregador(transforms = {}) {
  const p = []
  const world = makeWorld({ stubs: { '../serverEvents': { writeServerEvent: async () => true } }, transforms })
  const L = world.load(LIB)
  const { readAll } = world.load(READ_ALL)
  const db = bancoDoRetrato()
  const r = await L.carregarCheckoutHonesto(db, readAll, AGORA)
  p.push(...igual(r, { sessoesAbertas: 9, pessoas: 4, sessoesDePessoas: 5, pessoasSemIdentidade: 3, roboOuRajada: 3, roboOuRajadaEstimado: 3, pagou: 0, daCasa: 1 }).map((s) => `C1 carregador: ${s}`))
  if (r.cartao?.linhas?.length !== 3) p.push('C1: o carregador não devolve o texto da tela')
  const lidas = db.log.filter((q) => q.op === 'select')
  const primeira = lidas[0]
  const nomes = primeira?.desc.find((d) => d[0] === 'in' && d[1] === 'name')?.[2] ?? []
  if (primeira?.table !== 'events' || nomes.join() !== 'checkout_started,payment_success') p.push(`C2: a 1ª leitura não é checkout_started + payment_success (${nomes.join()})`)
  const desde = primeira?.desc.find((d) => d[0] === 'gte' && d[1] === 'created_at')?.[2]
  if (desde !== new Date(AGORA - 24 * 3600e3).toISOString()) p.push(`C2: a janela do card não é 24 h (${desde})`)
  const ligacoes = lidas.filter((q) => q.table === 'events').slice(1)
  if (!ligacoes.length || ligacoes.some((q) => q.desc.find((d) => d[0] === 'gte' && d[1] === 'created_at')?.[2] !== new Date(AGORA - 7 * 24 * 3600e3).toISOString())) p.push('C3: as ligações (sessão/IP) não olham 7 dias')
  if (!lidas.some((q) => q.table === 'profiles')) p.push('C3: o carregador não leu o e-mail das contas (casa por lib/internalAccounts)')

  // C4. dia cheio: 120 sessões de navegador distintas — as listas `in (…)` vão em lotes e nenhuma linha se perde
  const muitos = makeDb({
    events: Array.from({ length: 120 }, (_, i) => evento('checkout_started', `m-${i}`, new Date(AGORA - (i + 1) * 60_000).toISOString(), { cs: `cs_m${i}`, sess: `aba-m${i}`, meta: { ip_hash: `${String(i).padStart(4, '0')}${'0'.repeat(60)}`, ua_class: 'browser', prefetch: false } })),
  })
  const rm = await L.carregarCheckoutHonesto(muitos, readAll, AGORA)
  p.push(...igual(rm, { sessoesAbertas: 120, pessoas: 120, roboOuRajada: 0, daCasa: 0 }).map((s) => `C4 120 sessões: ${s}`))
  const ins = muitos.log.filter((q) => q.op === 'select').flatMap((q) => q.desc.filter((d) => d[0] === 'in' && d[1] !== 'name').map((d) => d[2].length))
  if (!ins.length || Math.max(...ins) > L.LOTE_IN) p.push(`C4: lista in (…) maior que o lote (${Math.max(...ins)} > ${L.LOTE_IN})`)
  if (muitos.log.filter((q) => q.op === 'select' && q.desc.some((d) => d[0] === 'in' && d[1] === 'session_id')).length < 3) p.push('C4: as 120 sessões não foram lidas em lotes')
  return p
}

// ─── D. a tela ─────────────────────────────────────────────────────────────────────────────────────────────────────────
async function provaTela(transforms = {}) {
  const p = []
  const react = nodeRequire('react')
  const { renderToStaticMarkup } = nodeRequire('react-dom/server')
  const panel = makeWorld({ stubs: { react, 'react/jsx-runtime': nodeRequire('react/jsx-runtime') }, transforms }).load(PANEL)
  if (typeof panel.CheckoutHonestoCard !== 'function') return ['D1: o LiveNowPanel não exporta CheckoutHonestoCard']
  const L = libWorld().load(LIB)
  const r = classifica(L, retrato0710())
  const value = { ...r, cartao: L.cartaoCheckoutHonesto(r) }
  const html = renderToStaticMarkup(react.createElement(panel.CheckoutHonestoCard, { loaded: true, value, cardStyle: {} }))
  const texto = html.replace(/<[^>]+>/g, ' ').replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/\s+/g, ' ')
  for (const frase of ['Pagamento · 24h', '4 chegaram ao pagamento 5 aberturas', '0 pagaram',
    'Fora da conta: 3 robôs ou cliques repetidos · 1 teste da casa (9 aberturas no total)', 'Estimativa:', '3 pagamentos antigos sem conta, sessão nem IP']) {
    if (!texto.includes(frase)) p.push(`D1: a tela não mostra "${frase}"`)
  }
  if (/Checkouts 24h/.test(texto)) p.push('D1: o número único "Checkouts 24h" voltou ao card')
  const vazio = renderToStaticMarkup(react.createElement(panel.CheckoutHonestoCard, { loaded: true, value: null, cardStyle: {} })).replace(/<[^>]+>/g, ' ')
  if (!vazio.includes('não deu para ler agora')) p.push('D2: leitura que falhou não diz que falhou')
  return p
}

function provaFiacao() {
  const p = []
  const live = read(LIVE)
  const panel = read(PANEL)
  if (!/^import \{ carregarCheckoutHonesto, type CheckoutHonestoComCartao \} from '@\/lib\/admin\/checkoutHonesto'/m.test(live)) p.push('E1: /api/admin/live não importa o carregador')
  if (!/^\s*const checkoutHonestoPromise = carregarCheckoutHonesto\(admin, readAll, now\)\.catch\(/m.test(live)) p.push('E2: /api/admin/live não chama o carregador com o readAll paginado')
  if (!/^\s*checkout_honesto: await checkoutHonestoPromise,/m.test(live)) p.push('E3: a resposta do /api/admin/live não leva checkout_honesto')
  if (!/^\s*checkout_honesto: CheckoutHonestoComCartao \| null$/m.test(live)) p.push('E4: LiveData não declara checkout_honesto')
  if (/\['Checkouts 24h'/.test(panel)) p.push('E5: o número único "Checkouts 24h" continua na grade')
  if (!/<CheckoutHonestoCard loaded=\{data !== null\} value=\{data\?\.checkout_honesto \?\? null\} cardStyle=\{CARD\} \/>/.test(panel)) p.push('E6: o card de três linhas não está na grade')
  if (/from '@\/lib\/admin\/checkoutHonesto'/.test(panel)) p.push('E7: o painel (cliente) importa a regra — a lista de contas da casa iria para o navegador')
  // o carimbo só toca telemetria: nada dele nos parâmetros da Stripe
  const route = read(ROUTE)
  const blocos = []
  for (let at = route.indexOf('const sessionParams: Stripe.Checkout.SessionCreateParams = {'); at >= 0; at = route.indexOf('const sessionParams: Stripe.Checkout.SessionCreateParams = {', at + 1)) {
    const end = route.indexOf('\n  }\n', at)
    blocos.push(end > at ? route.slice(at, end) : '')
  }
  if (blocos.length < 7 || blocos.some((b) => b.length < 200)) p.push(`E8: blocos de parâmetros da Stripe não achados (${blocos.length})`)
  if (blocos.some((b) => /ip_hash|ua_class|stampCheckoutOrigin|requestHeaders|clientIp|hashIp/.test(b))) p.push('E8: o carimbo entrou num parâmetro de sessão da Stripe')
  if (/ip_hash|ua_class|stampCheckoutOrigin|requestHeaders/.test(read(GUEST_SERVER))) p.push('E9: o carimbo entrou na sessão do convidado (lib/stripe/guestCheckout.ts)')
  if (route.split('stampCheckoutOrigin(').length - 1 !== 2) p.push('E10: o carimbo tem de ter um único chamador (o writer)')
  if (!/^\s*metadata: \{ \.\.\.metadata, \.\.\.paidClickMetadataFromRequest\(\) \},\n\s*\}\n\s*stampCheckoutOrigin\(eventRow\)/m.test(route)) p.push('E11: o carimbo não roda logo depois de montar o eventRow do writer')
  return p
}

// ═══ execução ══════════════════════════════════════════════════════════════════════════════════════════════════════════
const PROVAS = [
  ['A2. rota: mesma resposta e mesma Stripe com e sem carimbo, com e sem cookie; eventos ganham session_id, ip_hash, ua_class e prefetch', provaRota],
  ['A3. rota: quem chama sem a sessão recebe a do cookie (controle positivo)', provaCookie],
  ['B. regra das três linhas (retrato 07/10, rajada, casa, pagou, gêmeo, texto)', provaRegra],
  ['C. carregador pelo readAll real (janelas e casa pelo IP)', provaCarregador],
  ['D. tela: o card desenha as três linhas e a falha', provaTela],
]

if (BASE_SOURCE !== null) {
  for (const [label, fn] of PROVAS) {
    let p
    try { p = await fn() } catch (e) { p = [`lançou: ${e?.stack?.split('\n').slice(0, 3).join(' / ') ?? e}`] }
    check(p.length === 0, `${label}${p.length ? ` — ${p.slice(0, 6).join(' | ')}${p.length > 6 ? ` (+${p.length - 6})` : ''}` : ''}`)
  }
}
{
  const p = provaFiacao()
  check(p.length === 0, `E. fiação: admin live → carregador → card; carimbo fora da Stripe${p.length ? ` — ${p.join(' | ')}` : ''}`)
}

// ═══ MUTANTES ══════════════════════════════════════════════════════════════════════════════════════════════════════════
// Cada um quebra UMA regra no fonte (em memória) e a prova correspondente tem de ficar vermelha SEM lançar (uma prova
// que só "fica vermelha" porque o mundo não carrega não está provando a regra).
const R = (from, to, label) => ({ [ROUTE]: [replaceOnce(from, to, label)] })
const LB = (from, to, label) => ({ [LIB]: [replaceOnce(from, to, label)] })
const MUTANTES = [
  ['MA1 o carimbo vaza para a sessão da Stripe', provaRota, R('    intentCampaign: ctx.intentCampaign,\n    valueContext: {', "    intentCampaign: requestHeaders().get('user-agent'),\n    valueContext: {", 'UA na sessão do convidado')],
  ['MA2 a resposta do pré-carregamento muda', provaRota, R('  return new NextResponse(null, { status: 204 })', '  return new NextResponse(null, { status: 200 })', '204 → 200')],
  ['MA3 o evento perde o ip_hash', provaRota, R('      ip_hash: hashIp(clientIp(h)),\n', '', 'sem ip_hash')],
  ['MA4 o IP cru vai para o evento', provaRota, R('      ip_hash: hashIp(clientIp(h)),', '      ip_hash: clientIp(h),', 'IP cru')],
  ['MA5 UA ausente vira robô (ramos somados)', provaRota, R("  if (!trimmed) return 'unknown'\n", '', 'sem o ramo unknown')],
  ['MA6 o prefetch some do carimbo', provaRota, R('      prefetch: isSpeculativeRequest({ headers: h }),', '      prefetch: false,', 'prefetch fixo')],
  ['MA7 o writer não carimba', provaRota, R('    stampCheckoutOrigin(eventRow) //', '    void eventRow //', 'sem a chamada')],
  ['MA8 o writer não lê o cookie quando quem chama não passa a sessão', provaCookie, R('      if (/^[A-Za-z0-9_-]{8,64}$/.test(raw)) eventRow.session_id = raw\n', '', 'sem o cookie')],
  ['MB1 rajada só com 4', provaRegra, LB('export const RAJADA_MIN_SESSOES = 3', 'export const RAJADA_MIN_SESSOES = 4', '3 → 4')],
  ['MB2 "mesmo segundo" estreito (900 ms) perde a rajada que atravessa a virada', provaRegra, LB('export const RAJADA_CARIMBO_JANELA_MS = 1_000', 'export const RAJADA_CARIMBO_JANELA_MS = 900', '1 s → 900 ms')],
  ['MB3 a casa não sai da conta', provaRegra, LB('  const fora = sessoes.filter((s) => !ehDaCasa(s))', '  const fora = sessoes', 'sem tirar a casa')],
  ['MB4 a casa pelo IP da sessão some', provaRegra, LB('    s.ipsLigados.some((ip) => casa.ips.has(ip))', '    false', 'sem o IP da sessão')],
  ['MB5 "pagou" conta qualquer evento que não seja abertura', provaRegra, LB('    if (e.name !== EVENTO_PAGO) continue', '    if (e.name === EVENTO_ABERTO) continue', 'pagou largo')],
  ['MB6 "pagou" conta a casa', provaRegra, LB('    ;(daCasaPago ? pagosDaCasa : pagos).add(chave)', '    pagos.add(chave)', 'pagou com a casa')],
  ['MB7 a sessão Stripe repetida conta duas vezes', provaRegra, LB('    const chave = texto(m.stripe_session_id) ?? ', '    const chave = texto(e.id) ?? texto(m.stripe_session_id) ?? ', 'chave pelo id do evento')],
  ['MB8 a tela perde o "estimativa"', provaRegra, LB('    roboOuRajadaEstimado: motivos.rajada_pelo_horario,', '    roboOuRajadaEstimado: 0,', 'sem estimativa')],
  ['MB9 a janela da rajada por IP/sessão encolhe para 0,5 s', provaRegra, LB('export const RAJADA_JANELA_MS = 5_000', 'export const RAJADA_JANELA_MS = 500', '5 s → 0,5 s')],
  ['MB10 UA robô deixa de ser robô', provaRegra, LB("    if (s.uaClass === 'bot') motivo.set(s.chave, 'ua_robo')", "    if (s.uaClass === 'robot') motivo.set(s.chave, 'ua_robo')", 'bot → robot')],
  ['MB11 a casa por lista digitada (sem lib/internalAccounts)', provaRegra, LB('  for (const p of input.perfis) if (p.id && isInternalEmail(p.email)) contas.add(p.id)', "  for (const p of input.perfis) if (p.id && p.email === 'josephsskaf@gmail.com') contas.add(p.id)", 'lista digitada')],
  ['MC1 a janela do card vira 48 h', provaCarregador, LB('export const JANELA_CARTAO_MS = 24 * 60 * 60 * 1000', 'export const JANELA_CARTAO_MS = 48 * 60 * 60 * 1000', '24 h → 48 h')],
  ['MC2 o IP que mora no sink não entra na busca da casa', provaCarregador, LB('  for (const lote of lotes(unicos([...eventos.map((e) => meta(e).ip_hash), ...sessoes.map((s) => s.ip_hash)]))) {', '  for (const lote of lotes(unicos(eventos.map((e) => meta(e).ip_hash)))) {', 'sem o IP do sink')],
  ['MC3 sem lotes: a lista in (…) vai inteira na URL', provaCarregador, LB('export const LOTE_IN = 50', 'export const LOTE_IN = 500', '50 → 500')],
  ['MD1 a tela esconde os avisos', provaTela, { [PANEL]: [replaceOnce('          {value.cartao.avisos.map((a) => (', '          {[].map((a) => (', 'sem avisos')] }],
  ['MD2 a tela volta ao número único', provaTela, { [PANEL]: [replaceOnce("<div className=\"text-[10px] font-black uppercase tracking-widest\" style={{ color: 'var(--muted2)' }}>Pagamento · 24h</div>", "<div className=\"text-[10px] font-black uppercase tracking-widest\" style={{ color: 'var(--muted2)' }}>Checkouts 24h</div>", 'rótulo antigo')] }],
]

if (BASE_SOURCE !== null) {
  for (const [label, prova, transforms] of MUTANTES) {
    // prova de aplicação ANTES de rodar: a troca tem de casar no fonte de verdade
    let aplicou = true
    for (const [rel, list] of Object.entries(transforms)) {
      let src = read(rel)
      for (const t of list) {
        try { src = t.apply(src) } catch (e) { aplicou = false; check(false, `${label}: o mutante não aplicou (${e.message})`) }
      }
    }
    if (!aplicou) continue
    let p
    try { p = await prova(transforms) } catch (e) { check(false, `${label}: quebrou a execução em vez de reprovar a regra (${e.message})`); continue }
    check(p.length > 0, `${label}: a prova ficou vermelha (${p[0] ?? 'NÃO ficou — o mutante sobreviveu'})`)
  }
}

for (const n of notes) console.log(`  ⚠ ${n}`)
if (failed.length) {
  for (const f of failed) console.log(`  ✗ ${f}`)
  console.log(`\n${passed} ok, ${failed.length} FALHA(S) — test-checkout-honesto-2026-10-07`)
  process.exit(1)
}
console.log(`${passed} verificações ok — test-checkout-honesto-2026-10-07 (diferencial da rota, regra das três linhas, carregador, tela, ${MUTANTES.length} mutantes vermelhos)`)
