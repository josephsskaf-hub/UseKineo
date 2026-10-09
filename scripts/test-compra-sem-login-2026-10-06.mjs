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
// Leva 2 (mesmo dia, antes de publicar):
//   · NUNCA PIOR QUE HOJE — Stripe falsa jogando erro (4xx, rede, sessão sem URL, exceção no meio): o visitante cai no
//     MESMO redirect de hoje, com o MESMO checkout_auth_required, mais guest_checkout_fallback com o motivo;
//   · TOMADA DE CONTA — a 1ª entrada que prova o e-mail (link por e-mail, Google pela /auth/callback, recuperação de
//     senha pela /api/auth/guest-sessions) derruba as OUTRAS sessões uma vez (guest_sessions_revoked); senha não
//     prova; o login de uso único não dispara e não reabre depois; leva 3: na mesma hora a senha vira uma aleatória
//     forte (admin + religar a sessão da prova; na recuperação, pela própria sessão), e falha da troca não desfaz nada;
//   · E-MAIL "SUA CONTA ESTÁ PRONTA" — 1 por sessão Stripe, só conta nova, sem preço, link de uso único e com validade.
// Leva 4 (07/10, KINEO-CUPOM-CONVIDADO-2026-10-07 — "vai para cupom"): a OFERTA DE BOAS-VINDAS (modal da home,
// ?promo=WELCOME20) compra sem conta, com o interruptor GUEST_WELCOME_PROMO_LIVE:
//   · o visitante com WELCOME20 vai à Stripe com o MESMO desconto do caminho logado (executado na mesma caixa e
//     comparado campo a campo), e o recorte Creator/Studio mensal concorda com o logado em todos os planos × períodos;
//   · qualquer outro cupom, recuperação e robô continuam no cadastro;
//   · a Stripe sem o código, com o cupom diferente do prometido, fora do ar ou recusando a sessão = a resposta de hoje
//     + guest_checkout_fallback com o motivo (nunca uma compra a preço cheio no lugar da prometida);
//   · o webhook concede o MESMO grant do logado com o desconto e registra a oferta no evento; desconto numa conta que
//     JÁ pagou grava guest_welcome_promo_reused (1×, sem falso reuso na reentrega) e avisa o fundador (1×);
//   · interruptor desligado = hoje byte a byte (as respostas exatas de hoje e o diferencial contra a régua de hoje).
// Banco, Stripe, Auth e Resend são falsos em memória. Depois, MUTANTES em memória: cada regra é quebrada por uma troca
// de texto cuja aplicação é provada (âncora única, texto novo presente, âncora ausente depois) e o cenário que a guarda
// tem de ficar vermelho.
// Funciona com o interruptor em false (commit 1) e em true (commit 2): os cenários forçam o valor que precisam (vale
// para os dois interruptores, GUEST_CHECKOUT_LIVE e GUEST_WELCOME_PROMO_LIVE).
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
const squashWs = (s) => s.replace(/\s+/g, ' ')
function read(rel) {
  if (!sources.has(rel)) sources.set(rel, readFileSync(join(root, rel), 'utf8').split(CR).join(''))
  return sources.get(rel)
}
// KINEO-BUSINESS-84-2026-10-09 — re-ancorado: KINEO-AUTOPILOT-FORA-2026-10-09 (fundador 09/10, Autopilot fora da vitrine)
// fecha compra NOVA de autopilot/autopilot_lite no checkout (410 plan_unavailable). Este guardião prova a PARIDADE
// convidado × logado para todo tier que o checkout sabe vender — inclusive a família Autopilot, que volta no dia em que
// o interruptor ligar. Por isso ele roda com o interruptor LIGADO; a recusa com ele desligado é provada em
// scripts/test-business-84-2026-10-09.mjs.
{
  const apRel = 'lib/autopilotPublic.ts'
  const apSrc = read(apRel)
  if (!apSrc.includes('export const AUTOPILOT_PUBLIC = false')) throw new Error('interruptor do Autopilot não encontrado')
  sources.set(apRel, apSrc.split('export const AUTOPILOT_PUBLIC = false').join('export const AUTOPILOT_PUBLIC = true'))
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
const PAID_CLICK = 'lib/growth/paidClickAttribution.ts' // KINEO-MSCLKID-2026-10-08 — alvo do mutante do msclkid
const ACCESS = 'app/api/stripe/checkout/guest-access/route.ts'
const LINK = 'app/auth/guest-link/route.ts'
const SINK = 'app/api/events/route.ts'
const PAGE = 'app/checkout/guest/page.tsx'
const GUARD = 'lib/auth/guestAccess.ts'
const RECOVERY = 'app/api/auth/guest-sessions/route.ts'
const CALLBACK = 'app/auth/callback/route.ts'
const RESET_PAGE = 'app/(auth)/reset-password/page.tsx'
const READY_SUBJECT = 'Your Kineo account is ready'
const SIGNIN_SUBJECT = 'Your Kineo sign-in link'
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

/**
 * Troca de texto com prova de aplicação: a âncora existe UMA vez, o texto novo aparece no fonte transformado e a âncora
 * deixou de existir (leva 4: uma remoção, com `to` vazio, também prova que removeu).
 */
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
/** KINEO-CUPOM-CONVIDADO-2026-10-07 — o interruptor da oferta de boas-vindas sem conta (o cenário força o valor). */
function welcomeSwitchTo(value) {
  return {
    label: `GUEST_WELCOME_PROMO_LIVE=${value}`,
    allowNoop: true,
    apply(src) {
      const re = /export const GUEST_WELCOME_PROMO_LIVE = (?:true|false)\b/g
      const hits = src.match(re) ?? []
      if (hits.length !== 1) throw new Error(`interruptor da oferta de boas-vindas não encontrado exatamente 1 vez (${hits.length})`)
      return src.replace(re, `export const GUEST_WELCOME_PROMO_LIVE = ${value}`)
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
  // Leva 4: `match` (opcional) escolhe QUAL escrita falha — ex.: só o insert de um evento com aquele nome.
  const takeFailure = (table, op, payload) => {
    const i = failures.findIndex((f) => f.table === table && f.op === op && f.remaining > 0 && (!f.match || f.match(payload)))
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
      const injected = takeFailure(this.table, this.op, this.payload)
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
  // Sessões do Auth: cada entrada vira um session_id; o token de acesso é um JWT de mentira com sub e session_id
  // (o formato que lib/auth/guestAccess.ts lê). signOut('others') derruba todas as outras do mesmo usuário.
  const sessions = new Map()
  const oauthCodes = new Map()
  const signOutCalls = []
  const profileDefaults = (id, email) => ({
    id, email, video_credits: 0, free_ai_generate_used: false, plan: 'free', is_pro: false, has_paid: false,
    stripe_customer_id: null, stripe_subscription_id: null, paypal_subscription_id: null, affiliate_id: null,
    trial_status: null, trial_credits_granted: 0, trial_credits_used: 0, cinematic_tokens: 0, offer290_used: false,
  })
  const db = {
    tables,
    T,
    failures,
    takeFailure,
    fail(table, op, error, times = 1, match = null) { failures.push({ table, op, error, remaining: times, match }) },
    from: (t) => new Query(t),
    rows: (t) => T(t),
    auth: {
      users: authUsers,
      tokens,
      sessions,
      oauthCodes,
      signOutCalls,
      /** Sessão nova do Auth: method vira o claim amr (oauth, otp, recovery, password — os que o projeto grava). */
      openSession(userId, method = 'otp') {
        const sid = nodeCrypto.randomUUID()
        sessions.set(sid, { userId, method, revoked: false })
        const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url')
        const claims = { sub: userId, session_id: sid, amr: [{ method, timestamp: Math.floor(Date.now() / 1000) }] }
        return { sid, accessToken: `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64(claims)}.fake` }
      },
      alive(sid) { return Boolean(sid && sessions.get(sid) && !sessions.get(sid).revoked) },
      /** Toda escrita de senha (admin ou pela própria sessão), para provar "uma vez" e "nunca na conta comum". */
      passwordWrites: [],
      /** Projeto com "exigir a senha atual" ligado: só sessão de recuperação troca senha sem a atual. */
      requireCurrentPassword: false,
      /** Entrar com e-mail e senha (o que quem pôs uma senha pela API faria depois). */
      signInWithPassword(browser, email, password) {
        const u = authUsers.find((x) => x.email === String(email).trim().toLowerCase())
        if (!u || !u.passwordSecret || u.passwordSecret !== password) return false
        db.auth.enter(browser, u.id, 'password')
        return true
      },
      /** Coloca uma sessão num navegador (o que os cookies do @supabase/ssr fazem). */
      enter(browser, userId, method) {
        const s = db.auth.openSession(userId, method)
        browser.userId = userId
        browser.sid = s.sid
        browser.accessToken = s.accessToken
        return s
      },
      admin: {
        async updateUserById(id, attrs) {
          const injected = takeFailure('auth', attrs.password ? 'updateUserById:password' : 'updateUserById')
          if (injected) return { data: { user: null }, error: injected }
          const u = authUsers.find((x) => x.id === id)
          if (!u) return { data: { user: null }, error: { message: 'User not found' } }
          if (attrs.app_metadata) u.app_metadata = { ...u.app_metadata, ...clone(attrs.app_metadata) }
          if (attrs.password) {
            // supabase/auth: admin → UpdatePassword(tx, nil) → Logout de TODAS as sessões + ClearAllOneTimeTokensForUser.
            db.auth.passwordWrites.push({ userId: id, via: 'admin' })
            u.passwordSecret = attrs.password
            for (const s of sessions.values()) if (s.userId === id) s.revoked = true
            for (const [k, v] of tokens) if (v.userId === id) tokens.delete(k)
          }
          return { data: { user: clone(u) }, error: null }
        },
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
          const injectedLink = takeFailure('auth', 'generateLink')
          if (injectedLink) return { data: { properties: null, user: null }, error: injectedLink }
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
  // Navegador com sessão derrubada = deslogado (o Auth recusa o refresh/getUser de sessão apagada).
  const current = () => {
    if (!browser.userId) return null
    if (browser.sid && !db.auth.alive(browser.sid)) return null
    return db.auth.users.find((x) => x.id === browser.userId) ?? null
  }
  const missing = { name: 'AuthSessionMissingError', message: 'Auth session missing!' }
  return {
    from: (t) => db.from(t),
    auth: {
      async getUser() {
        const u = current()
        return u ? { data: { user: clone(u) }, error: null } : { data: { user: null }, error: missing }
      },
      async getSession() {
        const u = current()
        return { data: { session: u ? { access_token: browser.accessToken ?? null, user: clone(u) } : null }, error: null }
      },
      async verifyOtp({ token_hash, type }) {
        const t = db.auth.tokens.get(token_hash)
        if (!t || t.used || type !== 'magiclink') return { data: { user: null, session: null }, error: { message: 'Email link is invalid or has expired' } }
        t.used = true
        const u = db.auth.users.find((x) => x.id === t.userId)
        // POST /verify (token_hash) grava amr 'otp' — medido em auth.mfa_amr_claims.
        const s = db.auth.enter(browser, u.id, 'otp')
        browser.minted = (browser.minted ?? 0) + 1
        return { data: { user: clone(u), session: { access_token: s.accessToken, user: clone(u) } }, error: null }
      },
      async exchangeCodeForSession(code) {
        const c = db.auth.oauthCodes.get(code)
        if (!c || c.used) return { data: { user: null, session: null }, error: { name: 'AuthApiError', message: 'invalid flow state, no valid flow state found' } }
        c.used = true
        const u = db.auth.users.find((x) => x.id === c.userId)
        const s = db.auth.enter(browser, u.id, c.method)
        return { data: { user: clone(u), session: { access_token: s.accessToken, user: clone(u) } }, error: null }
      },
      async updateUser(attributes = {}) {
        const u = current()
        if (!u) return { data: { user: null }, error: missing }
        if (typeof attributes.password === 'string') {
          const injected = db.takeFailure('auth', 'updateUser:password')
          if (injected) return { data: { user: null }, error: injected }
          const method = db.auth.sessions.get(browser.sid)?.method ?? null
          if (db.auth.requireCurrentPassword && method !== 'recovery' && !attributes.current_password) {
            return { data: { user: null }, error: { name: 'AuthApiError', status: 400, code: 'current_password_required', message: 'Current password required' } }
          }
          // supabase/auth: usuário → UpdatePassword(tx, &session.ID) → LogoutAllExceptMe + ClearAllOneTimeTokensForUser.
          db.auth.passwordWrites.push({ userId: u.id, via: 'own_session' })
          u.passwordSecret = attributes.password
          for (const [sid, s] of db.auth.sessions) if (s.userId === u.id && sid !== browser.sid) s.revoked = true
          for (const [k, v] of db.auth.tokens) if (v.userId === u.id) db.auth.tokens.delete(k)
        }
        return { data: { user: clone(u) }, error: null }
      },
      async signOut(options = {}) {
        const scope = options.scope ?? 'global'
        db.auth.signOutCalls.push({ scope, userId: browser.userId ?? null, sid: browser.sid ?? null })
        const mine = browser.sid ?? null
        for (const [sid, s] of db.auth.sessions) {
          if (s.userId !== browser.userId) continue
          if (scope === 'others' && sid === mine) continue
          if (scope === 'local' && sid !== mine) continue
          s.revoked = true
        }
        if (scope !== 'others') { browser.userId = null; browser.sid = null; browser.accessToken = null }
        return { error: null }
      },
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
  // Falhas injetadas no próximo checkout.sessions.create: { kind: 'throw', error } | { kind: 'no_url' } | { kind: 'url_getter_throws' }.
  const createFailures = []
  // Leva 4 (KINEO-CUPOM-CONVIDADO-2026-10-07): cupons e códigos promocionais de verdade no falso. O código guarda o id do
  // cupom; a listagem devolve o cupom expandido (como a API 2024-06-20). Falhas injetadas na próxima listagem: Error.
  const coupons = new Map()
  const promos = []
  const promoListFailures = []
  const missing = (what) => Object.assign(new Error(`No such ${what}`), { code: 'resource_missing', statusCode: 404, type: 'StripeInvalidRequestError' })
  const strip = (s) => { const out = clone(s); delete out._params; return out }
  const expandPromo = (p) => clone({ ...p, coupon: coupons.has(p.coupon) ? coupons.get(p.coupon) : p.coupon })
  /** O que a Stripe faz com `discounts` ao criar a sessão: recusa o par com o campo manual, código ausente/inativo ou de outro cliente. */
  const discountFor = (params, amount) => {
    const list = params.discounts ?? []
    if (!list.length) return 0
    if (params.allow_promotion_codes) {
      throw Object.assign(new Error('You may only specify one of these parameters: allow_promotion_codes, discounts.'), { type: 'StripeInvalidRequestError', code: 'parameters_exclusive', statusCode: 400 })
    }
    if (list.length > 1) throw Object.assign(new Error('Checkout Sessions support up to one coupon or promotion code.'), { type: 'StripeInvalidRequestError', code: 'parameter_invalid', statusCode: 400 })
    const d = list[0]
    let coupon = null
    if (d.promotion_code) {
      const promo = promos.find((p) => p.id === d.promotion_code)
      if (!promo) throw missing('promotion_code')
      if (!promo.active) throw Object.assign(new Error('This promotion code is not active.'), { type: 'StripeInvalidRequestError', code: 'promotion_code_invalid', statusCode: 400 })
      if (promo.customer && promo.customer !== params.customer) throw Object.assign(new Error('This promotion code cannot be redeemed by this customer.'), { type: 'StripeInvalidRequestError', code: 'promotion_code_customer_not_eligible', statusCode: 400 })
      coupon = coupons.get(promo.coupon) ?? null
    } else if (d.coupon) {
      coupon = coupons.get(d.coupon) ?? null
    }
    if (!coupon || coupon.valid === false) throw missing('coupon')
    if (typeof coupon.percent_off === 'number') return Math.round(amount * coupon.percent_off / 100)
    return Math.min(amount, coupon.amount_off ?? 0)
  }
  return {
    calls,
    createFailures,
    sessionStore: sessions,
    customerStore: customers,
    subscriptionStore: subscriptions,
    couponStore: coupons,
    promoStore: promos,
    promoListFailures,
    checkout: {
      sessions: {
        async create(params, opts = {}) {
          calls.push({ op: 'checkout.sessions.create', params: clone(params), idempotencyKey: opts.idempotencyKey ?? null })
          const injected = createFailures.shift()
          if (injected?.kind === 'throw') throw injected.error
          if (injected?.kind === 'no_url') return { id: `cs_test_${nextId('')}`, object: 'checkout.session', url: null, status: 'open' }
          if (injected?.kind === 'url_getter_throws') {
            return Object.defineProperty({ id: `cs_test_${nextId('')}`, object: 'checkout.session' }, 'url', { get() { throw new TypeError('url getter exploded') } })
          }
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
          const amountDiscount = discountFor(params, amount)
          const session = {
            id, object: 'checkout.session', livemode: false, url: `https://checkout.stripe.com/c/pay/${id}`,
            mode: params.mode, status: 'open', payment_status: 'unpaid', customer: params.customer ?? null,
            customer_email: params.customer_email ?? null, customer_details: null, subscription: null,
            amount_total: amount - amountDiscount, currency: items[0]?.price_data?.currency ?? 'usd',
            client_reference_id: params.client_reference_id ?? null, metadata: { ...(params.metadata ?? {}) },
            total_details: { amount_discount: amountDiscount }, payment_link: null, after_expiration: null, _params: clone(params),
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
    promotionCodes: {
      async list(params = {}) {
        calls.push({ op: 'promotionCodes.list', params: clone(params) })
        const injected = promoListFailures.shift()
        if (injected) throw injected
        const code = String(params.code ?? '').toUpperCase()
        const hits = promos.filter((p) => (!params.code || p.code.toUpperCase() === code) && (params.active === undefined || p.active === params.active))
        return { data: hits.slice(0, params.limit ?? 10).map(expandPromo) }
      },
      async create(params) {
        calls.push({ op: 'promotionCodes.create', params: clone(params) })
        if (promos.some((p) => p.active && !p.customer && p.code.toUpperCase() === String(params.code).toUpperCase())) {
          throw Object.assign(new Error('An active promotion code with this code already exists.'), { type: 'StripeInvalidRequestError', statusCode: 400 })
        }
        const promo = { id: nextId('promo_'), object: 'promotion_code', code: params.code, coupon: params.coupon, active: true, customer: params.customer ?? null, expires_at: null, max_redemptions: null, times_redeemed: 0, restrictions: { first_time_transaction: false, minimum_amount: null, minimum_amount_currency: null, currency_options: {} } }
        promos.push(promo)
        return expandPromo(promo)
      },
    },
    coupons: {
      async retrieve(id) {
        calls.push({ op: 'coupons.retrieve', id })
        if (!coupons.has(id)) throw missing('coupon')
        return clone(coupons.get(id))
      },
      async create(params) {
        calls.push({ op: 'coupons.create', params: clone(params) })
        const coupon = { id: params.id ?? nextId('coupon_'), object: 'coupon', valid: true, percent_off: params.percent_off ?? null, amount_off: params.amount_off ?? null, currency: params.currency ?? null, duration: params.duration ?? 'once', redeem_by: null, applies_to: null, currency_options: null, name: params.name ?? null }
        coupons.set(coupon.id, coupon)
        return clone(coupon)
      },
    },
    /** A oferta de boas-vindas como existe em produção desde 25/08 (cupom KINEO_WELCOME20 + código WELCOME20, sem restrição). */
    seedWelcome({ coupon: couponOver = {}, promo: promoOver = {} } = {}) {
      const coupon = { id: 'KINEO_WELCOME20', object: 'coupon', valid: true, percent_off: 20, amount_off: null, currency: null, duration: 'once', redeem_by: null, applies_to: null, currency_options: null, name: '20% off first month (welcome)', ...couponOver }
      coupons.set(coupon.id, coupon)
      const promo = { id: nextId('promo_'), object: 'promotion_code', code: 'WELCOME20', coupon: coupon.id, active: true, customer: null, expires_at: null, max_redemptions: null, times_redeemed: 0, restrictions: { first_time_transaction: false, minimum_amount: null, minimum_amount_currency: null, currency_options: {} }, ...promoOver }
      promos.push(promo)
      return promo
    },
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

function makeEnv({ live = true, welcomeLive = false, transforms = {} } = {}) {
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
  // Falhas injetadas no Resend: { subject, status } responde !ok; { subject, throws: true } lança (rede).
  const fetchFailures = []
  const fakeFetch = async (url, init = {}) => {
    const body = init.body ? JSON.parse(init.body) : null
    const i = fetchFailures.findIndex((f) => !f.subject || f.subject === body?.subject)
    const failure = i >= 0 ? fetchFailures.splice(i, 1)[0] : null
    fetchCalls.push({ url: String(url), body, ok: !failure })
    if (failure?.throws) throw new Error('fetch failed: ECONNRESET')
    if (failure) return { ok: false, status: failure.status ?? 500, json: async () => ({ message: 'injected failure' }) }
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
    '@/lib/reverseTrial': { REVERSE_TRIAL_ENABLED: true, TRIAL_GRANT_CREDITS: 25, maybeActivateReverseTrial: async () => ({ activated: false }) },
    '@/lib/email/quota': { recordEmailSend: async () => {}, recordResendResponse: async () => {} },
    // Só a /auth/callback usa estes (cookies do pedido, impressão digital do trial, afiliado do cadastro).
    'next/headers': {
      cookies: () => {
        const b = requestBrowser.getStore() ?? state.browser
        return { get: (k) => (Object.prototype.hasOwnProperty.call(b.cookies, k) ? { name: k, value: b.cookies[k] } : undefined) }
      },
    },
    crypto: nodeRequire('node:crypto'),
    '@/lib/affiliateSignupFinalization': {
      AFFILIATE_ATTRIBUTION_COOKIE_NAMES: ['sf_aff', 'sf_aff_click'],
      finalizeAffiliateSignupAttribution: async () => ({ attempted: false, clearCookies: false, outcome: 'no_code' }),
    },
  }
  const all = { ...transforms, [PURE]: [switchTo(live), welcomeSwitchTo(welcomeLive), ...(transforms[PURE] ?? [])] }
  const world = makeWorld({ stubs, transforms: all, globals: { process: { env: { ...ENV } }, console: quietConsole, fetch: fakeFetch } })
  return {
    db, stripe, state, world, fetchCalls, fetchFailures, founderAlerts, logs,
    get pure() { return world.load(PURE) },
    get server() { return world.load(SERVER) },
    get guard() { return world.load(GUARD) },
    get checkout() { return world.load(CHECKOUT) },
    get webhook() { return world.load(WEBHOOK) },
    get access() { return world.load(ACCESS) },
    get link() { return world.load(LINK) },
    get recovery() { return world.load(RECOVERY) },
    get callback() { return world.load(CALLBACK) },
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
/** A página /reset-password, com a sessão da recuperação pronta, chama POST /api/auth/guest-sessions. */
async function recoveryPost(env, browser, origin = ORIGIN) {
  env.state.browser = browser
  const res = await requestBrowser.run(browser, () => env.recovery.POST(fakeReq(`${ORIGIN}/api/auth/guest-sessions`, {
    cookies: browser.cookies, headers: { origin },
  })))
  return { res, body: (await res.json()) ?? {} }
}
/** Volta do Google (ou de outro link PKCE): /auth/callback?code=… troca o código por sessão neste navegador. */
async function callbackGet(env, browser, userId, method = 'oauth', next = '/studio') {
  const code = nodeCrypto.randomUUID()
  env.db.auth.oauthCodes.set(code, { userId, method, used: false })
  env.state.browser = browser
  const res = await requestBrowser.run(browser, () => env.callback.GET({
    url: `${ORIGIN}/auth/callback?code=${code}&next=${encodeURIComponent(next)}`,
    headers: { get: () => null },
  }))
  return res
}
const mailsWith = (env, subject) => env.fetchCalls.filter((c) => c.ok && c.body?.subject === subject)
const readyMails = (env) => mailsWith(env, READY_SUBJECT)
const signinMails = (env) => mailsWith(env, SIGNIN_SUBJECT)
const readyLinkOf = (mail) => String(mail?.body?.text ?? '').match(/https:\/\/www\.usekineo\.com\/auth\/guest-link\?ready=[^\s]+/)?.[0] ?? null
/** Preço literal em qualquer moeda/forma (regra da casa: moeda não localiza no e-mail). */
const PRICE_LITERAL = /(?:US\$|R\$|\$|€|£|₹)\s?\d|\d+[.,]\d{2}\b|\b(?:USD|BRL|INR|EUR)\b|\/\s?(?:mo|month|year|yr)\b/i
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
    const fresh = env.db.rows('events').slice(eventsBefore)
    const attempted = fresh.find((e) => e.name === 'checkout_attempted')
    const required = fresh.find((e) => e.name === 'checkout_auth_required')
    const fallback = fresh.find((e) => e.name === 'guest_checkout_fallback')
    if (fallback?.metadata?.guest_fallback !== c.reason) p.push(`${c.reason}: guest_checkout_fallback sem o motivo (${fallback?.metadata?.guest_fallback})`)
    if (!required || JSON.stringify(required.metadata) !== JSON.stringify(attempted?.metadata)) p.push(`${c.reason}: checkout_auth_required mudou de forma (o motivo mora no evento próprio)`)
  }
  const resumed = await checkoutGet(env, newBrowser(), 'tier=basic&billing=monthly&resumed=1')
  if (!location(resumed).startsWith(`${ORIGIN}/pricing?checkout_error=`)) p.push('resumed=1 sem sessão deixou de mostrar o erro de antes')
  return p
}

/** NUNCA PIOR QUE HOJE: a Stripe falha ao abrir a sessão de convidado → o visitante recebe EXATAMENTE a resposta de hoje. */
const STRIPE_FAILURES = [
  {
    name: '4xx da Stripe',
    inject: { kind: 'throw', error: Object.assign(new Error('Invalid integer: comprador@exemplo.com'), { type: 'StripeInvalidRequestError', code: 'parameter_invalid_integer', statusCode: 400 }) },
    reason: 'stripe_session_failed',
    detail: { stripe_error_type: 'StripeInvalidRequestError', stripe_error_code: 'parameter_invalid_integer', stripe_status: 400 },
  },
  {
    name: '429 da Stripe',
    inject: { kind: 'throw', error: Object.assign(new Error('Too many requests'), { type: 'StripeRateLimitError', code: 'rate_limit', statusCode: 429 }) },
    reason: 'stripe_session_failed',
    detail: { stripe_error_type: 'StripeRateLimitError', stripe_status: 429 },
  },
  {
    name: 'rede caiu',
    inject: { kind: 'throw', error: new Error('socket hang up (comprador@exemplo.com)') },
    reason: 'stripe_session_failed',
    detail: { stripe_error_type: 'Error', stripe_error_code: null, stripe_status: null },
  },
  { name: 'sessão sem URL', inject: { kind: 'no_url' }, reason: 'stripe_session_without_url' },
  { name: 'exceção depois da Stripe', inject: { kind: 'url_getter_throws' }, reason: 'guest_session_threw', detail: { stripe_error_type: 'TypeError' } },
]
async function sStripeFailure(env) {
  const p = []
  const query = 'tier=basic&billing=monthly&intro=1&intent_campaign=ads_door'
  // A resposta de HOJE para o mesmo pedido: interruptor desligado, mesmo navegador (mesma sessão de evento).
  const today = makeEnv({ live: false })
  const todayRes = await checkoutGet(today, newBrowser({ kineo_event_session_id: 'sess_failcase01' }), query)
  const todayRequired = today.db.events('checkout_auth_required')[0]
  if (!todayRequired) return ['falha da Stripe: o caminho de hoje não gravou checkout_auth_required (referência quebrada)']
  for (const c of STRIPE_FAILURES) {
    const browser = newBrowser({ kineo_event_session_id: 'sess_failcase01' })
    const before = env.db.rows('events').length
    const createsBefore = creates(env).length
    env.stripe.createFailures.push(c.inject)
    const res = await checkoutGet(env, browser, query)
    if (creates(env).length !== createsBefore + 1) p.push(`${c.name}: a sessão de convidado nem foi tentada`)
    env.stripe.createFailures.length = 0
    if (res.status !== todayRes.status || location(res) !== location(todayRes)) p.push(`${c.name}: resposta difere de hoje (${res.status} ${location(res)} vs ${todayRes.status} ${location(todayRes)})`)
    if (Object.keys(browser.cookies).some((k) => k !== 'kineo_event_session_id')) p.push(`${c.name}: gravou cookie sem sessão aberta`)
    const fresh = env.db.rows('events').slice(before)
    const names = fresh.map((e) => e.name)
    if (JSON.stringify(names) !== JSON.stringify(['checkout_attempted', 'guest_checkout_fallback', 'checkout_auth_required'])) p.push(`${c.name}: eventos ${JSON.stringify(names)}`)
    const required = fresh.find((e) => e.name === 'checkout_auth_required')
    if (JSON.stringify(required?.metadata) !== JSON.stringify(todayRequired.metadata) || required?.user_id !== null || required?.session_id !== todayRequired.session_id) p.push(`${c.name}: checkout_auth_required não é o de hoje`)
    const fb = fresh.find((e) => e.name === 'guest_checkout_fallback')
    if (fb?.metadata?.guest_fallback !== c.reason) p.push(`${c.name}: motivo ${fb?.metadata?.guest_fallback}, esperava ${c.reason}`)
    for (const [k, v] of Object.entries(c.detail ?? {})) if (fb?.metadata?.[k] !== v) p.push(`${c.name}: ${k}=${JSON.stringify(fb?.metadata?.[k])}, esperava ${JSON.stringify(v)}`)
    if (JSON.stringify(fb ?? {}).includes('comprador@exemplo.com')) p.push(`${c.name}: a mensagem crua da Stripe (com e-mail) vazou para o evento`)
    if (fb && (fb.session_id !== 'sess_failcase01' || fb.user_id !== null || fb.metadata?.tier !== 'basic' || fb.metadata?.intent_campaign !== 'ads_door')) p.push(`${c.name}: fallback sem a intenção de compra/sessão do navegador`)
  }
  // Depois da falha, o próximo clique (Stripe de pé) volta a abrir a sessão de convidado normalmente.
  const ok = await checkoutGet(env, newBrowser(), query)
  if (!sessionIdFromLocation(ok)) p.push('falha da Stripe: o clique seguinte não abriu a sessão de convidado')
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
  if (readyMails(env).length !== 1) p.push(`reenvio: e-mail "sua conta está pronta" saiu ${readyMails(env).length}×`)
  // Login de uso único, no navegador da compra.
  const jarBefore = { ...buy.browser.cookies }
  const first = await access(env, buy.browser, buy.sessionId)
  if (first.body.state !== 'signed_in' || buy.browser.userId !== user.id) p.push(`login: esperava signed_in no navegador da compra (${JSON.stringify(first.body)})`)
  const stampedUser = env.db.auth.users.find((u) => u.id === user.id)
  if (!buy.browser.sid || stampedUser?.app_metadata?.kineo_guest_auto_session_id !== buy.browser.sid) p.push('login: o id da sessão sem prova não ficou em app_metadata (a derrubada não saberia quem poupar/derrubar)')
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
  if (signinMails(env).length !== 0) p.push('outro navegador: mandou e-mail sem a pessoa pedir')
  const asked = await access(env, stranger, buy.sessionId, 'email')
  if (asked.body.email_sent !== true || signinMails(env).length !== 1) p.push(`e-mail: não saiu (${JSON.stringify(asked.body)})`)
  const mail = signinMails(env)[0]?.body
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
  if (signinMails(env).length !== 3) p.push(`e-mail: teto por sessão não segurou (${signinMails(env).length} envios)`)
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
  if (readyMails(env).length !== 0) p.push('conta existente: recebeu "sua conta está pronta" (só conta nova recebe)')
  const r = await access(env, buy.browser, buy.sessionId)
  if (r.body.state !== 'check_email' || r.body.reason !== 'existing_account' || buy.browser.userId) p.push(`conta existente: logou ou não avisou (${JSON.stringify(r.body)})`)
  if (r.body.email_sent !== true || signinMails(env).length !== 1 || signinMails(env)[0].body?.to?.[0] !== 'antiga@exemplo.com') p.push('conta existente: link não foi para a caixa da dona')
  const again = await access(env, buy.browser, buy.sessionId)
  if (again.body.email_sent !== true || signinMails(env).length !== 1) p.push('conta existente: recarregar mandou outro e-mail')
  if (env.fetchCalls.length !== 1) p.push(`conta existente: ${env.fetchCalls.length} e-mails no total (esperava só o link)`)
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
  if (readyMails(env).length !== 0) p.push('conflito: mandou "sua conta está pronta" para quem já assinava')
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
  if (env.fetchCalls.length !== 0) p.push('não paga: mandou e-mail antes do dinheiro')
  const settled = env.stripe.settle(buy.sessionId)
  const late = await deliver(env, 'checkout.session.async_payment_succeeded', settled)
  const user = env.db.auth.users.find((u) => u.email === 'boleto@exemplo.com')
  if (late.res.status !== 200 || !user || env.db.profile(user.id)?.plan !== 'basic') p.push('não paga: o pagamento confirmado depois não entregou')
  if (readyMails(env).length !== 1 || readyMails(env)[0].body?.to?.[0] !== 'boleto@exemplo.com') p.push('não paga: o pagamento confirmado depois não mandou "sua conta está pronta"')
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

/** Conta nova: UM e-mail "sua conta está pronta" — sem preço, link de uso único e com validade; reenvio não repete. */
async function sReadyEmail(env) {
  const p = []
  const buy = await guestPurchase(env, { email: 'Pronta@Exemplo.com', query: 'tier=pro&billing=monthly', country: 'BR', lang: 'pt-BR' })
  if (buy.delivered?.res.status !== 200) return [`pronta: webhook ${buy.delivered?.res.status}`]
  const user = env.db.auth.users.find((u) => u.email === 'pronta@exemplo.com')
  const mails = readyMails(env)
  if (mails.length !== 1) return [`pronta: ${mails.length} e-mails "sua conta está pronta"`]
  const mail = mails[0].body
  if (mail.to?.[0] !== 'pronta@exemplo.com' || mails[0].url !== 'https://api.resend.com/emails') p.push('pronta: destinatário/fornecedor errado')
  const link = readyLinkOf(mails[0])
  if (!link || !String(mail.html).includes(`href="${link}"`)) return [...p, 'pronta: sem o link de entrada no texto e no botão']
  const words = `${mail.subject}\n${mail.text}\n${String(mail.html).replace(/<[^>]+>/g, ' ')}`
  if (PRICE_LITERAL.test(words)) p.push(`pronta: preço/moeda literal no e-mail (${words.match(PRICE_LITERAL)?.[0]})`)
  const amount = buy.snapshot.amount_total
  if ([String(amount), (amount / 100).toFixed(2), (amount / 100).toFixed(2).replace('.', ',')].some((s) => words.includes(s))) p.push('pronta: o valor pago aparece no e-mail')
  const sent = env.db.events('guest_account_ready_email_sent')
  if (sent.length !== 1 || sent[0].user_id !== user?.id || sent[0].metadata?.stripe_session_id !== buy.sessionId) p.push('pronta: guest_account_ready_email_sent ausente/sem dono')
  // Reenvio do mesmo evento e evento novo da mesma sessão: nenhum 2º e-mail.
  await deliver(env, 'checkout.session.completed', buy.snapshot, buy.delivered.eventId)
  await deliver(env, 'checkout.session.completed', buy.snapshot)
  if (readyMails(env).length !== 1 || env.db.events('guest_account_ready_email_sent').length !== 1) p.push(`pronta: reenvio do webhook mandou outro e-mail (${readyMails(env).length})`)
  if (!env.db.marker(`guest_ready_email:${buy.sessionId}`)) p.push('pronta: sem a reserva 1×/sessão')
  // O login de uso único gera outro link do Auth logo depois — o link do e-mail (token nosso) continua valendo.
  await access(env, buy.browser, buy.sessionId)
  const token = new URL(link).searchParams.get('ready') ?? ''
  const [v, uid, sid, exp] = token.split('.')
  const G = env.guard
  const nowS = Math.floor(Date.now() / 1000)
  const attempts = [
    ['assinatura forjada', `${v}.${uid}.${sid}.${exp}.${nodeCrypto.randomBytes(32).toString('base64url')}`],
    ['outro segredo', G.signGuestReadyToken({ userId: uid, stripeSessionId: sid, expiresAtSeconds: nowS + 3600, secret: 'outro-segredo' })],
    ['vencido', G.signGuestReadyToken({ userId: uid, stripeSessionId: sid, expiresAtSeconds: nowS - 60, secret: ENV.SUPABASE_SERVICE_ROLE_KEY })],
    ['validade esticada', `${v}.${uid}.${sid}.${Number(exp) + 86400 * 30}.${token.split('.')[4]}`],
  ]
  for (const [name, bad] of attempts) {
    const intruder = newBrowser()
    const r = await followLink(env, intruder, `${ORIGIN}/auth/guest-link?ready=${encodeURIComponent(bad)}`)
    if (intruder.userId || !location(r).startsWith(`${ORIGIN}/login?redirect=`)) p.push(`pronta: link ${name} entrou`)
  }
  const phone = newBrowser()
  const enter = await followLink(env, phone, link)
  if (enter.status !== 307 || location(enter) !== `${ORIGIN}/studio` || phone.userId !== user?.id) p.push(`pronta: o link do e-mail não entrou no Studio (${enter.status} ${location(enter)})`)
  const used = env.db.events('guest_login_link_used').filter((e) => e.metadata?.method === 'ready_email_link')
  if (used.length !== 1 || used[0].user_id !== user?.id) p.push('pronta: guest_login_link_used (ready_email_link) ausente')
  const again = newBrowser()
  const reuse = await followLink(env, again, link)
  if (again.userId || !location(reuse).startsWith(`${ORIGIN}/login?redirect=`)) p.push('pronta: o link do e-mail entrou 2×')
  return p
}

/** Resend fora no momento da entrega: o pagamento segue entregue (200), a falha vira evento e a reserva volta. */
async function sReadyEmailRetry(env) {
  const p = []
  env.fetchFailures.push({ subject: READY_SUBJECT, status: 503 })
  const buy = await guestPurchase(env, { email: 'tardia@exemplo.com' })
  if (buy.delivered?.res.status !== 200) p.push(`pronta (Resend fora): webhook ${buy.delivered?.res.status} — e-mail nunca derruba a entrega`)
  const user = env.db.auth.users.find((u) => u.email === 'tardia@exemplo.com')
  if (env.db.profile(user?.id)?.plan !== 'basic') p.push('pronta (Resend fora): o plano não foi concedido')
  if (readyMails(env).length !== 0) p.push('pronta (Resend fora): contou e-mail que não saiu')
  const failed = env.db.events('guest_account_ready_email_failed')
  if (failed.length !== 1 || failed[0].metadata?.reason !== 'resend_rejected' || failed[0].metadata?.http_status !== 503) p.push(`pronta (Resend fora): evento de falha ${JSON.stringify(failed.map((e) => e.metadata))}`)
  if (env.db.marker(`guest_ready_email:${buy.sessionId}`)) p.push('pronta (Resend fora): reserva presa (nenhum reenvio mandaria)')
  // Outro evento da mesma sessão (reentrega da Stripe com id novo): agora sai, uma vez.
  await deliver(env, 'checkout.session.completed', buy.snapshot)
  await deliver(env, 'checkout.session.completed', buy.snapshot)
  if (readyMails(env).length !== 1) p.push(`pronta (Resend fora): depois da falha saíram ${readyMails(env).length} e-mails (esperava 1)`)
  // Rede caiu no envio: o mesmo desfecho, com o motivo certo.
  env.fetchFailures.push({ subject: READY_SUBJECT, throws: true })
  const buy2 = await guestPurchase(env, { email: 'rede@exemplo.com' })
  if (buy2.delivered?.res.status !== 200 || env.db.events('guest_account_ready_email_failed').filter((e) => e.metadata?.reason === 'send_threw').length !== 1) p.push('pronta (rede caiu): webhook ou evento de falha errado')
  return p
}

/** Tomada de conta: quem paga digitou o e-mail de outra pessoa. A 1ª entrada COM prova derruba as outras sessões, 1×. */
async function sTakeoverGuard(env) {
  const p = []
  const buy = await guestPurchase(env, { email: 'vitima@exemplo.com' })
  if (buy.delivered?.res.status !== 200) return [`tomada: webhook ${buy.delivered?.res.status}`]
  const victim = env.db.auth.users.find((u) => u.email === 'vitima@exemplo.com')
  const metaOf = () => env.db.auth.users.find((u) => u.id === victim.id)?.app_metadata ?? {}
  const auto = await access(env, buy.browser, buy.sessionId)
  if (auto.body.state !== 'signed_in' || !env.db.auth.alive(buy.browser.sid)) return [`tomada: o login de uso único não entrou (${JSON.stringify(auto.body)})`]
  // Quem pagou põe uma senha direto na API do Auth (pela sessão sem prova), entra com ela em outro navegador e tenta
  // gastar a derrubada.
  const setByPayer = await ssrClientFor(env.db, buy.browser).auth.updateUser({ password: 'senha-de-quem-pagou-123' })
  if (setByPayer.error) return [`tomada: a sessão sem prova não conseguiu pôr senha no falso (${JSON.stringify(setByPayer.error)})`]
  const pwd = newBrowser()
  if (!env.db.auth.signInWithPassword(pwd, 'vitima@exemplo.com', 'senha-de-quem-pagou-123')) return ['tomada: a senha de quem pagou não entrou (falso quebrado)']
  const viaPassword = await recoveryPost(env, pwd)
  const viaAuto = await recoveryPost(env, buy.browser)
  if (viaPassword.body.revoked !== false || viaAuto.body.revoked !== false) p.push('tomada: sessão de senha/da compra gastou a derrubada (senha não prova o e-mail)')
  if (env.db.events('guest_sessions_revoked').length !== 0 || metaOf().kineo_guest_sessions_revoked_at) p.push('tomada: derrubada carimbada sem prova de e-mail')
  if (!env.db.auth.alive(buy.browser.sid) || !env.db.auth.alive(pwd.sid)) p.push('tomada: sessão caiu sem entrada com prova')
  // A dona do e-mail abre "sua conta está pronta" no celular: entrada COM prova.
  const link = readyLinkOf(readyMails(env)[0])
  if (!link) return [...p, 'tomada: a dona do e-mail não recebeu "sua conta está pronta"']
  const phone = newBrowser()
  const enter = await followLink(env, phone, link)
  if (location(enter) !== `${ORIGIN}/studio` || phone.userId !== victim.id) p.push(`tomada: a dona não entrou pelo link (${location(enter)})`)
  if (env.db.auth.alive(buy.browser.sid) || env.db.auth.alive(pwd.sid)) p.push('tomada: as outras sessões (compra e senha) continuaram vivas depois da entrada com prova')
  if (!env.db.auth.alive(phone.sid)) p.push('tomada: a derrubada derrubou a própria entrada')
  const payerView = await access(env, buy.browser, buy.sessionId)
  if (payerView.body.state === 'signed_in') p.push('tomada: o navegador de quem pagou continuou dentro')
  const revoked = env.db.events('guest_sessions_revoked')
  if (revoked.length !== 1 || revoked[0].user_id !== victim.id || revoked[0].metadata?.method !== 'ready_email_link') p.push(`tomada: guest_sessions_revoked ${JSON.stringify(revoked.map((e) => e.metadata))}`)
  if (!metaOf().kineo_guest_sessions_revoked_at || metaOf().kineo_guest_sessions_revoked_via !== 'ready_email_link') p.push('tomada: sem o carimbo "uma vez por conta" em app_metadata')
  // A senha que quem pagou pôs deixou de valer: virou uma aleatória forte que ninguém conhece (pelo admin, uma vez).
  if (env.db.auth.signInWithPassword(newBrowser(), 'vitima@exemplo.com', 'senha-de-quem-pagou-123')) p.push('tomada: a senha de quem pagou continuou entrando depois da prova da dona')
  if (revoked[0]?.metadata?.password_scrambled !== true || revoked[0]?.metadata?.session_reentered !== true) p.push(`tomada: guest_sessions_revoked sem password_scrambled/session_reentered (${JSON.stringify(revoked[0]?.metadata)})`)
  if (!metaOf().kineo_guest_password_scrambled_at) p.push('tomada: sem o carimbo da senha trocada em app_metadata')
  const secret = env.db.auth.users.find((u) => u.id === victim.id)?.passwordSecret ?? ''
  if (secret.length < 40 || !/[a-z]/.test(secret) || !/[A-Z]/.test(secret) || !/[0-9]/.test(secret) || !/[^A-Za-z0-9]/.test(secret)) p.push('tomada: a senha nova não é aleatória forte (tamanho/classes)')
  if (secret && [JSON.stringify(env.db.tables), JSON.stringify(env.logs), JSON.stringify(env.fetchCalls)].some((s) => s.includes(secret))) p.push('tomada: a senha nova vazou para evento/log/e-mail')
  const adminWrites = env.db.auth.passwordWrites.filter((w) => w.userId === victim.id && w.via === 'admin')
  if (adminWrites.length !== 1) p.push(`tomada: ${adminWrites.length} trocas de senha pelo admin (esperava 1)`)
  // 2ª entrada com prova (Google, outro aparelho): nada cai de novo e a senha não muda de novo.
  const laptop = newBrowser()
  const google = await callbackGet(env, laptop, victim.id, 'oauth')
  if (google.status !== 307 || laptop.userId !== victim.id) p.push(`tomada: o Google não entrou (${google.status} ${location(google)})`)
  if (!env.db.auth.alive(phone.sid) || !env.db.auth.alive(laptop.sid)) p.push('tomada: a 2ª entrada com prova derrubou de novo (era uma vez por conta)')
  if (env.db.events('guest_sessions_revoked').length !== 1 || env.db.auth.signOutCalls.filter((c) => c.scope === 'others').length !== 1) p.push('tomada: derrubada repetida')
  if (env.db.auth.passwordWrites.filter((w) => w.userId === victim.id && w.via === 'admin').length !== 1 || (env.db.auth.users.find((u) => u.id === victim.id)?.passwordSecret ?? '') !== secret) p.push('tomada: a 2ª entrada com prova trocou a senha de novo')
  return p
}

/** A dona entra com prova ANTES do login de uso único: depois disso o login sem prova não abre mais. */
async function sProofBeforeAutoLogin(env) {
  const p = []
  const buy = await guestPurchase(env, { email: 'primeiro@exemplo.com' })
  if (buy.delivered?.res.status !== 200) return [`ordem: webhook ${buy.delivered?.res.status}`]
  const owner = env.db.auth.users.find((u) => u.email === 'primeiro@exemplo.com')
  const phone = newBrowser()
  await followLink(env, phone, readyLinkOf(readyMails(env)[0]) ?? `${ORIGIN}/auth/guest-link`)
  if (phone.userId !== owner?.id) return ['ordem: a dona não entrou pelo link do e-mail']
  if (!env.db.auth.users.find((u) => u.id === owner.id)?.app_metadata?.kineo_guest_sessions_revoked_at) p.push('ordem: a 1ª entrada com prova não carimbou a conta')
  const late = await access(env, buy.browser, buy.sessionId)
  if (late.body.state !== 'check_email' || buy.browser.userId) p.push(`ordem: o login sem prova abriu DEPOIS da prova (${JSON.stringify(late.body)})`)
  if (env.db.events('guest_login_link_used').some((e) => e.metadata?.method === 'auto')) p.push('ordem: contou login automático')
  return p
}

/** Recuperação de senha (troca do código no navegador): a página chama a rota; só sessão de RECUPERAÇÃO conta. */
async function sRecoveryRevokes(env) {
  const p = []
  const buy = await guestPurchase(env, { email: 'recupera@exemplo.com' })
  if (buy.delivered?.res.status !== 200) return [`recuperação: webhook ${buy.delivered?.res.status}`]
  const owner = env.db.auth.users.find((u) => u.email === 'recupera@exemplo.com')
  // Projeto com "exigir a senha atual" ligado: só uma sessão de RECUPERAÇÃO troca senha sem a atual — a troca
  // aleatória tem de sair pela própria sessão de recuperação, que precisa sobreviver para a pessoa gravar a escolhida.
  env.db.auth.requireCurrentPassword = true
  await access(env, buy.browser, buy.sessionId)
  if (!env.db.auth.alive(buy.browser.sid)) return ['recuperação: o login de uso único não entrou']
  // Sessão que não é de recuperação chamando a rota da página de senha: nada (a porta é só da recuperação).
  const other = newBrowser()
  env.db.auth.enter(other, owner.id, 'oauth')
  const notRecovery = await recoveryPost(env, other)
  if (notRecovery.body.revoked !== false || !env.db.auth.alive(buy.browser.sid)) p.push('recuperação: a rota agiu com sessão que não é de recuperação')
  const reset = newBrowser()
  env.db.auth.enter(reset, owner.id, 'recovery')
  const cross = await recoveryPost(env, reset, 'https://evil.example')
  if (cross.res.status !== 403 || !env.db.auth.alive(buy.browser.sid)) p.push('recuperação: aceitou chamada de outra origem')
  const ok = await recoveryPost(env, reset)
  if (ok.res.status !== 200 || ok.body.revoked !== true) p.push(`recuperação: não derrubou (${ok.res.status} ${JSON.stringify(ok.body)})`)
  if (env.db.auth.alive(buy.browser.sid) || env.db.auth.alive(other.sid) || !env.db.auth.alive(reset.sid)) p.push('recuperação: sessões erradas caíram/ficaram')
  const ev = env.db.events('guest_sessions_revoked')
  if (ev.length !== 1 || ev[0].metadata?.method !== 'password_recovery' || ev[0].user_id !== owner.id) p.push('recuperação: guest_sessions_revoked ausente/errado')
  if (ev[0]?.metadata?.password_scrambled !== true) p.push(`recuperação: a senha não virou aleatória (${JSON.stringify(ev[0]?.metadata)})`)
  const ownWrites = env.db.auth.passwordWrites.filter((w) => w.userId === owner.id)
  if (ownWrites.length !== 1 || ownWrites[0].via !== 'own_session') p.push(`recuperação: troca de senha pelo caminho errado ${JSON.stringify(ownWrites)} (pelo admin, a sessão da recuperação morreria)`)
  // A página grava a senha escolhida DEPOIS (espera a rota): com a sessão da recuperação viva, a escolha vale.
  const chosen = await ssrClientFor(env.db, reset).auth.updateUser({ password: 'minha-senha-nova-456' })
  if (chosen.error || !env.db.auth.signInWithPassword(newBrowser(), 'recupera@exemplo.com', 'minha-senha-nova-456')) p.push(`recuperação: a senha escolhida não ficou (${JSON.stringify(chosen.error)})`)
  const anon = await recoveryPost(env, newBrowser())
  if (anon.res.status !== 401) p.push(`recuperação: sem sessão respondeu ${anon.res.status}`)
  // Conta comum (não nasceu de compra sem login): a recuperação nunca derruba nada.
  const plain = env.db.seedUser({ email: 'comum@exemplo.com' })
  const plainOld = newBrowser()
  env.db.auth.enter(plainOld, plain.id, 'password')
  const plainReset = newBrowser()
  env.db.auth.enter(plainReset, plain.id, 'recovery')
  const plainRes = await recoveryPost(env, plainReset)
  if (plainRes.body.revoked !== false || !env.db.auth.alive(plainOld.sid)) p.push('recuperação: derrubou sessões de conta comum')
  if (env.db.auth.passwordWrites.some((w) => w.userId === plain.id)) p.push('recuperação: trocou a senha de uma conta comum')
  return p
}

/** Google pela /auth/callback: conta de convidado derruba as outras 1×; conta comum nunca. */
async function sCallbackRevokes(env) {
  const p = []
  const buy = await guestPurchase(env, { email: 'google@exemplo.com' })
  if (buy.delivered?.res.status !== 200) return [`callback: webhook ${buy.delivered?.res.status}`]
  const owner = env.db.auth.users.find((u) => u.email === 'google@exemplo.com')
  await access(env, buy.browser, buy.sessionId)
  const laptop = newBrowser()
  const res = await callbackGet(env, laptop, owner.id, 'oauth')
  if (res.status !== 307 || location(res) !== `${ORIGIN}/studio` || laptop.userId !== owner.id) p.push(`callback: o Google não entrou (${res.status} ${location(res)})`)
  if (!env.db.auth.alive(laptop.sid)) p.push('callback: quem entrou pelo Google ficou sem sessão (a troca da senha derrubou e ninguém religou)')
  if (env.db.auth.alive(buy.browser.sid)) p.push('callback: a sessão de quem pagou sobreviveu à entrada pelo Google')
  const ev = env.db.events('guest_sessions_revoked')
  if (ev.length !== 1 || ev[0].metadata?.method !== 'auth_callback' || ev[0].path !== '/auth/callback') p.push('callback: guest_sessions_revoked ausente/errado')
  if (ev[0]?.metadata?.password_scrambled !== true || ev[0]?.metadata?.session_reentered !== true) p.push(`callback: senha não trocada/sessão do Google não religada (${JSON.stringify(ev[0]?.metadata)})`)
  if (env.db.events('auth_callback_completed').length !== 1) p.push('callback: o resto da callback deixou de rodar')
  // Conta comum entrando pelo Google com outra sessão aberta: nada cai, nenhum evento, a senha fica.
  const plain = env.db.seedUser({ email: 'comum.google@exemplo.com' })
  plain.passwordSecret = 'senha-da-conta-comum-1'
  const plainOld = newBrowser()
  env.db.auth.enter(plainOld, plain.id, 'password')
  const before = env.db.auth.signOutCalls.length
  const plainRes = await callbackGet(env, newBrowser(), plain.id, 'oauth')
  if (plainRes.status !== 307 || !env.db.auth.alive(plainOld.sid) || env.db.auth.signOutCalls.length !== before || env.db.events('guest_sessions_revoked').length !== 1) p.push('callback: mexeu nas sessões de uma conta comum')
  if (env.db.auth.passwordWrites.some((w) => w.userId === plain.id) || !env.db.auth.signInWithPassword(newBrowser(), 'comum.google@exemplo.com', 'senha-da-conta-comum-1')) p.push('callback: trocou a senha de uma conta comum')
  return p
}

/** A troca da senha falha: a derrubada segue e o motivo vai no evento; religar a sessão falha: o evento diz. */
async function sScrambleFails(env) {
  const p = []
  // (a) Admin recusa a senha nova (link do e-mail): as outras caem, a entrada fica, o motivo vai no evento, uma vez.
  const buy = await guestPurchase(env, { email: 'falha.senha@exemplo.com' })
  if (buy.delivered?.res.status !== 200) return [`senha falha: webhook ${buy.delivered?.res.status}`]
  const owner = env.db.auth.users.find((u) => u.email === 'falha.senha@exemplo.com')
  await access(env, buy.browser, buy.sessionId)
  env.db.fail('auth', 'updateUserById:password', { name: 'AuthApiError', status: 422, code: 'weak_password', message: 'Password should contain at least one character of each' })
  const phone = newBrowser()
  const enter = await followLink(env, phone, readyLinkOf(readyMails(env)[0]) ?? `${ORIGIN}/auth/guest-link`)
  if (location(enter) !== `${ORIGIN}/studio` || !env.db.auth.alive(phone.sid)) p.push(`senha falha: a dona não ficou dentro (${location(enter)})`)
  if (env.db.auth.alive(buy.browser.sid)) p.push('senha falha: a derrubada não seguiu')
  const ev = env.db.events('guest_sessions_revoked').filter((e) => e.user_id === owner.id)
  if (ev.length !== 1 || ev[0].metadata?.password_scrambled !== false || ev[0].metadata?.password_scramble_error !== 'weak_password') p.push(`senha falha: evento sem o motivo (${JSON.stringify(ev.map((e) => e.metadata))})`)
  const meta = env.db.auth.users.find((u) => u.id === owner.id)?.app_metadata ?? {}
  if (!meta.kineo_guest_sessions_revoked_at || meta.kineo_guest_password_scrambled_at) p.push('senha falha: carimbos errados (derrubada sim, senha não)')
  // (b) Senha trocada, mas o Auth não devolve o token para religar a sessão do Google: o evento diz session_reentered=false.
  const buy2 = await guestPurchase(env, { email: 'religa@exemplo.com' })
  const owner2 = env.db.auth.users.find((u) => u.email === 'religa@exemplo.com')
  await access(env, buy2.browser, buy2.sessionId)
  env.db.fail('auth', 'generateLink', { name: 'AuthApiError', status: 500, code: 'unexpected_failure', message: 'down' })
  const laptop = newBrowser()
  await callbackGet(env, laptop, owner2.id, 'oauth')
  const ev2 = env.db.events('guest_sessions_revoked').filter((e) => e.user_id === owner2.id)
  if (ev2.length !== 1 || ev2[0].metadata?.password_scrambled !== true || ev2[0].metadata?.session_reentered !== false) p.push(`religar falha: evento ${JSON.stringify(ev2.map((e) => e.metadata))}`)
  if (env.db.auth.alive(buy2.browser.sid)) p.push('religar falha: a sessão de quem pagou sobreviveu')
  // (c) Recuperação: a própria sessão não consegue trocar a senha — a derrubada segue, motivo no evento.
  const buy3 = await guestPurchase(env, { email: 'recupera.falha@exemplo.com' })
  const owner3 = env.db.auth.users.find((u) => u.email === 'recupera.falha@exemplo.com')
  await access(env, buy3.browser, buy3.sessionId)
  const reset = newBrowser()
  env.db.auth.enter(reset, owner3.id, 'recovery')
  env.db.fail('auth', 'updateUser:password', { name: 'AuthApiError', status: 429, code: 'over_request_rate_limit', message: 'slow down' })
  const r = await recoveryPost(env, reset)
  const ev3 = env.db.events('guest_sessions_revoked').filter((e) => e.user_id === owner3.id)
  if (r.body.revoked !== true || env.db.auth.alive(buy3.browser.sid) || !env.db.auth.alive(reset.sid)) p.push('recuperação falha: a derrubada não seguiu')
  if (ev3.length !== 1 || ev3[0].metadata?.password_scrambled !== false || ev3[0].metadata?.password_scramble_error !== 'over_request_rate_limit') p.push(`recuperação falha: evento ${JSON.stringify(ev3.map((e) => e.metadata))}`)
  return p
}

/** As regras puras da derrubada, uma a uma (os mutantes do módulo puro têm de ficar vermelhos aqui). */
async function sPureRevocationRules(env) {
  const P = env.pure
  const p = []
  const autoSid = 'aaaaaaaa-0000-4000-8000-000000000001'
  const fresh = 'bbbbbbbb-0000-4000-8000-000000000002'
  const guest = { kineo_guest_checkout_session: 'cs_test_abcdefghij0123456789', kineo_guest_auto_session_id: autoSid }
  const r = (meta, sid, methods, accepted) => P.guestSessionRevocation({ appMetadata: meta, currentSessionId: sid, authMethods: methods, acceptedMethods: accepted })
  if (r(guest, fresh, ['oauth']) !== 'revoke') p.push('pura: Google numa conta de convidado não derruba')
  if (r(guest, fresh, ['otp']) !== 'revoke') p.push('pura: link por e-mail não derruba')
  if (r(guest, fresh, ['recovery'], ['recovery']) !== 'revoke') p.push('pura: recuperação não derruba')
  if (r({}, fresh, ['oauth']) !== 'not_guest_account' || r(null, fresh, ['oauth']) !== 'not_guest_account') p.push('pura: conta comum derrubaria')
  if (r({ ...guest, kineo_guest_sessions_revoked_at: '2026-10-06T00:00:00.000Z' }, fresh, ['oauth']) !== 'already_revoked') p.push('pura: derrubaria 2×')
  if (r(guest, autoSid, ['otp']) !== 'auto_login_session') p.push('pura: a sessão sem prova dispararia a derrubada')
  if (r(guest, fresh, ['password']) !== 'not_proven' || r(guest, fresh, []) !== 'not_proven') p.push('pura: senha (ou nada) contaria como prova')
  if (r(guest, fresh, ['oauth'], ['recovery']) !== 'not_proven') p.push('pura: a porta da recuperação aceitaria outro método')
  if (r(guest, null, ['oauth']) !== 'no_session') p.push('pura: decidiria sem sessão')
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

// ═══ LEVA 4 — KINEO-CUPOM-CONVIDADO-2026-10-07: a oferta de boas-vindas sem conta ═════════════════════════════════════
/** O link EXATO dos cartões do modal "Your first month is 20% off" (components/WelcomeOfferModal.tsx). */
const welcomeQuery = (tier, billing = 'monthly') => `tier=${tier}&billing=${billing}&promo=WELCOME20&checkout_origin=welcome20_modal`
const WELCOME_KIND = 'welcome_first_month_20'
const mark = (env) => ({ events: env.db.rows('events').length, calls: env.stripe.calls.length })
/** Escritas de cupom/código na Stripe: o convidado só LÊ (o caminho logado é quem auto-provisiona). */
const promoWrites = (env, from = 0) => env.stripe.calls.slice(from).filter((c) => c.op === 'coupons.create' || c.op === 'promotionCodes.create')
/** Tudo o que o visitante e o funil veem de um pedido: resposta, cookies, eventos (sem id/hora do banco falso) e chamadas à Stripe. */
function transcript(env, res, browser, from) {
  return JSON.stringify({
    status: res.status,
    location: location(res),
    body: res.jsonBody ?? null,
    setCookies: res.cookieJar ?? [],
    browserCookies: Object.keys(browser.cookies).sort(),
    events: env.db.rows('events').slice(from.events).map(({ name, user_id, session_id, path, metadata }) => ({ name, user_id, session_id, path, metadata })),
    stripe: env.stripe.calls.slice(from.calls),
  })
}

/** Interruptor DESLIGADO: o link do modal é exatamente o de hoje — cadastro, nenhuma chamada à Stripe, os mesmos eventos. */
async function sWelcomeSwitchOff(env) {
  const p = []
  env.stripe.seedWelcome() // o código existe na Stripe: o único motivo do cadastro tem de ser o interruptor
  // A régua de HOJE (antes desta leva: todo cupom vai ao cadastro) no mesmo fonte — o diferencial byte a byte.
  const today = makeEnv({
    live: true,
    welcomeLive: false,
    transforms: { [PURE]: [replaceOnce("  if (input.promoRequested && !guestWelcomePromoReleased(input)) return 'promo'\n", "  if (input.promoRequested) return 'promo'\n", 'régua de hoje')] },
  })
  today.stripe.seedWelcome()
  for (const tier of ['basic', 'pro']) {
    const query = welcomeQuery(tier)
    const browser = newBrowser({ kineo_event_session_id: `sess_welcome_off_${tier}` })
    const before = mark(env)
    const res = await checkoutGet(env, browser, query, { referer: `${ORIGIN}/` })
    const resume = `/api/stripe/checkout?${query}&resumed=1`
    if (res.status !== 307 || location(res) !== `${ORIGIN}/signup?reason=checkout&redirect=${encodeURIComponent(resume)}`) p.push(`${tier}: redirect mudou (${res.status} ${location(res)})`)
    if (env.stripe.calls.length !== before.calls) p.push(`${tier}: chamou a Stripe (${JSON.stringify(env.stripe.calls.slice(before.calls).map((c) => c.op))})`)
    if (Object.keys(browser.cookies).some((k) => k !== 'kineo_event_session_id') || (res.cookieJar ?? []).length) p.push(`${tier}: gravou cookie`)
    const fresh = env.db.rows('events').slice(before.events)
    const names = fresh.map((e) => e.name)
    if (JSON.stringify(names) !== JSON.stringify(['checkout_attempted', 'guest_checkout_fallback', 'checkout_auth_required'])) p.push(`${tier}: eventos ${JSON.stringify(names)}`)
    const [attempted, fallback, required] = fresh
    if (JSON.stringify(required?.metadata) !== JSON.stringify(attempted?.metadata)) p.push(`${tier}: checkout_auth_required não leva a MESMA metadata`)
    if (JSON.stringify(fallback?.metadata) !== JSON.stringify({ ...attempted?.metadata, guest_fallback: 'promo' })) p.push(`${tier}: guest_checkout_fallback não é o de hoje (${JSON.stringify(fallback?.metadata)})`)
    if (attempted?.metadata?.public_promo_kind !== WELCOME_KIND || attempted?.metadata?.public_promo_state !== 'requested') p.push(`${tier}: a promessa saiu do checkout_attempted`)
    if (fresh.some((e) => e.user_id !== null || e.session_id !== `sess_welcome_off_${tier}`)) p.push(`${tier}: dono/sessão dos eventos mudou`)
    const tb = newBrowser({ kineo_event_session_id: `sess_welcome_off_${tier}` })
    const tbefore = mark(today)
    const tres = await checkoutGet(today, tb, query, { referer: `${ORIGIN}/` })
    const mine = transcript(env, res, browser, before)
    const ref = transcript(today, tres, tb, tbefore)
    if (mine !== ref) p.push(`${tier}: difere da régua de hoje byte a byte\n      agora: ${mine}\n      hoje:  ${ref}`)
  }
  return p
}

/** Visitante com WELCOME20: Stripe direto, com o MESMO desconto do caminho logado (executado na mesma caixa). */
async function sWelcomeGuest(env) {
  const p = []
  const promo = env.stripe.seedWelcome()
  for (const tier of ['basic', 'pro']) {
    const browser = newBrowser({ kineo_event_session_id: `sess_welcome_${tier}` })
    const before = mark(env)
    const res = await checkoutGet(env, browser, welcomeQuery(tier), { referer: `${ORIGIN}/` })
    const sid = sessionIdFromLocation(res)
    if (res.status !== 307 || !sid || !location(res).startsWith('https://checkout.stripe.com/')) {
      p.push(`${tier}: não foi à Stripe (${res.status} ${location(res)} ${JSON.stringify(env.db.events('guest_checkout_fallback').slice(-1).map((e) => e.metadata?.guest_fallback))})`)
      continue
    }
    const params = lastCreate(env)?.params ?? {}
    const list = env.pricing.monthlyPriceMinor(tier, 'usd', 'standard')
    const firstMonth = Math.round(list * 0.8)
    if (JSON.stringify(params.discounts) !== JSON.stringify([{ promotion_code: promo.id }])) p.push(`${tier}: sessão sem o desconto de boas-vindas (${JSON.stringify(params.discounts)})`)
    if ('allow_promotion_codes' in params) p.push(`${tier}: campo manual de cupom junto com o desconto`)
    if (JSON.stringify(params.after_expiration) !== JSON.stringify({ recovery: { enabled: true, allow_promotion_codes: false } })) p.push(`${tier}: a sessão recuperada aceitaria outro cupom (${JSON.stringify(params.after_expiration)})`)
    if ('customer' in params || 'customer_email' in params || params.metadata?.supabase_user_id || params.subscription_data?.metadata?.supabase_user_id) p.push(`${tier}: convidado com dono inventado`)
    for (const [where, meta] of [['sessão', params.metadata], ['assinatura', params.subscription_data?.metadata]]) {
      if (meta?.kineo_guest !== '1') p.push(`${tier}: ${where} sem kineo_guest=1`)
      if (meta?.public_promo_kind !== WELCOME_KIND || meta?.public_promo_state !== 'applied' || meta?.public_promo_truth_version !== 'public_promo_truth_v1' || meta?.public_promo_first_charge_minor !== String(firstMonth)) p.push(`${tier}: ${where} sem o carimbo da oferta (${JSON.stringify(meta)})`)
    }
    const li = params.line_items?.[0]?.price_data
    if (li?.unit_amount !== list || li?.currency !== 'usd') p.push(`${tier}: o preço da linha mudou (o desconto é da Stripe, não da linha): ${JSON.stringify(li)}`)
    if (params.success_url !== `${ORIGIN}/checkout/guest?currency=usd&amount=${firstMonth}&session_id={CHECKOUT_SESSION_ID}`) p.push(`${tier}: success_url ${params.success_url}`)
    if (!String(params.cancel_url).includes('&promo=WELCOME20')) p.push(`${tier}: cancel_url sem o cupom (${params.cancel_url})`)
    const stored = env.stripe.sessionStore.get(sid)
    if (stored?.total_details?.amount_discount !== list - firstMonth || stored?.amount_total !== firstMonth) p.push(`${tier}: a Stripe não cobraria os 20% (${stored?.amount_total}/${stored?.total_details?.amount_discount})`)
    const fresh = env.db.rows('events').slice(before.events)
    const names = fresh.map((e) => e.name)
    if (JSON.stringify(names) !== JSON.stringify(['checkout_attempted', 'checkout_started', 'checkout_guest_started'])) p.push(`${tier}: eventos ${JSON.stringify(names)}`)
    for (const e of fresh.filter((x) => x.name !== 'checkout_attempted')) {
      const m = e.metadata ?? {}
      if (m.public_promo_applied !== true || m.public_promo_state !== 'applied' || m.public_promo_kind !== WELCOME_KIND || m.public_promo_first_charge_minor !== firstMonth || m.guest_checkout !== true || m.stripe_session_id !== sid) p.push(`${tier}: ${e.name} sem a oferta aplicada (${JSON.stringify(m)})`)
    }
    if (!(res.cookieJar ?? []).some((c) => c.name === 'kineo_guest_checkout')) p.push(`${tier}: sem o segredo do navegador`)
    if (promoWrites(env, before.calls).length) p.push(`${tier}: o convidado criou cupom/código na Stripe (deve só ler)`)
    // 2º clique do mesmo navegador: a mesma sessão, nenhuma compra a mais no funil.
    const again = await checkoutGet(env, browser, welcomeQuery(tier), { referer: `${ORIGIN}/` })
    if (sessionIdFromLocation(again) !== sid || env.db.events('checkout_guest_started').filter((e) => e.metadata?.stripe_session_id === sid).length !== 1) p.push(`${tier}: 2º clique abriu outra sessão/contou outra compra`)
    // Paridade com o caminho LOGADO no mesmo link (mesma Stripe falsa, mesmo código).
    const logged = await loggedPurchase(env, { email: `logado-${tier}@exemplo.com`, query: welcomeQuery(tier) })
    const mine = lastCreate(env)?.params
    if (!logged.sessionId || !mine) { p.push(`${tier}: o caminho logado não abriu a sessão de referência (${location(logged.res)})`); continue }
    for (const k of ['line_items', 'discounts', 'cancel_url', 'allow_promotion_codes', 'after_expiration', 'mode']) {
      if (JSON.stringify(params[k]) !== JSON.stringify(mine[k])) p.push(`${tier}: ${k} difere do logado (${JSON.stringify(params[k])} vs ${JSON.stringify(mine[k])})`)
    }
    if (JSON.stringify(params.custom_text?.submit) !== JSON.stringify(mine.custom_text?.submit)) p.push(`${tier}: texto do botão de pagar difere do logado`)
    const sorted = (o, keys) => JSON.stringify(Object.entries(omit(o, keys)).sort())
    if (sorted(params.metadata, GUEST_KEYS) !== sorted(mine.metadata, OWNER_KEYS)) p.push(`${tier}: metadata da sessão difere do logado (${sorted(params.metadata, GUEST_KEYS)} vs ${sorted(mine.metadata, OWNER_KEYS)})`)
    if (sorted(params.subscription_data?.metadata, GUEST_KEYS) !== sorted(mine.subscription_data?.metadata, OWNER_KEYS)) p.push(`${tier}: metadata da assinatura difere do logado`)
    const fakeId = 'cs_test_abcdefghij0123456789'
    const guestBack = env.pure.guestSuccessDestination(new URL(params.success_url.replace('{CHECKOUT_SESSION_ID}', fakeId)).searchParams)
    const loggedBack = mine.success_url.replace('{CHECKOUT_SESSION_ID}', fakeId).replace(ORIGIN, '')
    if (guestBack !== loggedBack) p.push(`${tier}: depois do login, outro /checkout/success (${guestBack} vs ${loggedBack})`)
  }
  return p
}

/** O recorte da oferta (Creator/Studio, mensal) é o MESMO nos dois caminhos: todos os planos × períodos. */
async function sWelcomeShapeParity(env) {
  const p = []
  const promo = env.stripe.seedWelcome()
  const withWelcome = (params) => JSON.stringify(params?.discounts) === JSON.stringify([{ promotion_code: promo.id }])
  let n = 0
  for (const tier of ['starter', 'basic', 'pro', 'autopilot', 'autopilot_lite']) {
    for (const billing of ['monthly', 'annual']) {
      const query = welcomeQuery(tier, billing)
      const before = mark(env)
      const guestRes = await checkoutGet(env, newBrowser(), query)
      const guestOpened = location(guestRes).startsWith('https://checkout.stripe.com/')
      const guestDiscount = guestOpened && withWelcome(lastCreate(env)?.params)
      const fb = env.db.rows('events').slice(before.events).find((e) => e.name === 'guest_checkout_fallback')
      const logged = await loggedPurchase(env, { email: `recorte-${++n}@exemplo.com`, query })
      const loggedDiscount = Boolean(logged.sessionId) && withWelcome(lastCreate(env)?.params)
      if (guestDiscount !== loggedDiscount) p.push(`${tier}/${billing}: convidado ${guestDiscount ? 'com' : 'sem'} o desconto, logado ${loggedDiscount ? 'com' : 'sem'}`)
      if (guestOpened && !guestDiscount) p.push(`${tier}/${billing}: convidado foi à Stripe SEM o desconto prometido`)
      if (!loggedDiscount && (guestOpened || fb?.metadata?.guest_fallback !== 'welcome_promo_unavailable' || fb?.metadata?.public_promo_failure_reason !== 'invalid_checkout_shape')) p.push(`${tier}/${billing}: fora do recorte sem o desvio certo (${location(guestRes)} ${fb?.metadata?.guest_fallback}/${fb?.metadata?.public_promo_failure_reason})`)
    }
  }
  return p
}

/** Outros cupons, recuperação, marca d'água e robô continuam no cadastro, com o motivo; nenhuma sessão, nenhuma escrita na Stripe. */
async function sWelcomeOtherPromos(env) {
  const p = []
  env.stripe.seedWelcome()
  const cases = [
    { query: 'tier=basic&billing=monthly&promo=FIRST50', reason: 'promo' },
    { query: 'tier=pro&billing=monthly&promo=STUDIO50', reason: 'promo' },
    { query: 'tier=basic&billing=monthly&promo=CREATOR20', reason: 'promo' },
    { query: 'tier=basic&billing=monthly&promo=KINEO5-ABCDEFGH', reason: 'promo' },
    { query: 'tier=basic&billing=monthly&promo=WELCOME20X', reason: 'promo' },
    { query: 'tier=basic&billing=monthly&promo=WELCOME%2020', reason: 'promo' },
    { query: `${welcomeQuery('basic')}&recovery=1`, reason: 'checkout_recovery' },
    { query: `${welcomeQuery('pro')}&return=wm`, reason: 'watermark_return' },
    { query: welcomeQuery('basic'), reason: 'bot_suspected', ua: 'curl/8.4.0' },
    { query: welcomeQuery('starter'), reason: 'welcome_promo_unavailable', failure: 'invalid_checkout_shape' },
    { query: welcomeQuery('basic', 'annual'), reason: 'welcome_promo_unavailable', failure: 'invalid_checkout_shape' },
  ]
  for (const c of cases) {
    const before = mark(env)
    const res = await checkoutGet(env, newBrowser(), c.query, { ua: c.ua ?? UA })
    const label = `${c.query}${c.ua ? ` (${c.ua})` : ''}`
    if (env.stripe.calls.slice(before.calls).some((x) => x.op === 'checkout.sessions.create')) p.push(`${label}: abriu sessão de convidado`)
    if (promoWrites(env, before.calls).length) p.push(`${label}: escreveu cupom/código na Stripe`)
    if (!location(res).startsWith(`${ORIGIN}/signup?reason=checkout&redirect=`)) p.push(`${label}: não voltou ao cadastro (${location(res)})`)
    const fresh = env.db.rows('events').slice(before.events)
    const attempted = fresh.find((e) => e.name === 'checkout_attempted')
    const required = fresh.find((e) => e.name === 'checkout_auth_required')
    const fallback = fresh.find((e) => e.name === 'guest_checkout_fallback')
    if (fallback?.metadata?.guest_fallback !== c.reason) p.push(`${label}: motivo ${fallback?.metadata?.guest_fallback}, esperava ${c.reason}`)
    if (c.failure && (fallback?.metadata?.public_promo_failure_reason !== c.failure || fallback?.metadata?.public_promo_state !== 'failed')) p.push(`${label}: sem o motivo da oferta (${JSON.stringify(fallback?.metadata)})`)
    if (!required || JSON.stringify(required.metadata) !== JSON.stringify(attempted?.metadata)) p.push(`${label}: checkout_auth_required mudou de forma`)
  }
  return p
}

/** A Stripe não confirma o desconto: a resposta de HOJE (cadastro) + guest_checkout_fallback com o motivo — nunca a preço cheio. */
async function sWelcomeStripeFailure(env) {
  const p = []
  const query = welcomeQuery('basic')
  const today = makeEnv({ live: true, welcomeLive: false })
  today.stripe.seedWelcome()
  const todayRes = await checkoutGet(today, newBrowser({ kineo_event_session_id: 'sess_cupomfail1' }), query)
  const todayRequired = today.db.events('checkout_auth_required')[0]
  if (!todayRequired || !location(todayRes).includes('/signup?')) return ['falha do cupom: a referência de hoje não foi o cadastro (referência quebrada)']
  const restrictions = (o) => ({ first_time_transaction: false, minimum_amount: null, minimum_amount_currency: null, currency_options: {}, ...o })
  const cases = [
    { name: 'código ausente na Stripe', setup: () => {}, failure: 'not_found_or_inactive' },
    { name: 'código arquivado', setup: (s) => s.seedWelcome({ promo: { active: false } }), failure: 'not_found_or_inactive' },
    { name: 'cupom de outro valor', setup: (s) => s.seedWelcome({ coupon: { percent_off: 30 } }), failure: 'percent_mismatch' },
    { name: 'cupom de outra duração', setup: (s) => s.seedWelcome({ coupon: { duration: 'forever' } }), failure: 'duration_mismatch' },
    { name: 'código só para primeira compra', setup: (s) => s.seedWelcome({ promo: { restrictions: restrictions({ first_time_transaction: true }) } }), failure: 'first_transaction_restricted' },
    { name: 'código de um cliente só', setup: (s) => s.seedWelcome({ promo: { customer: 'cus_dono_unico' } }), failure: 'customer_mismatch' },
    { name: 'consulta à Stripe caiu', setup: (s) => { s.seedWelcome(); s.promoListFailures.push(Object.assign(new Error('Stripe API unavailable'), { type: 'StripeConnectionError' })) }, failure: 'verification_failed' },
    {
      name: 'Stripe recusa a sessão com o desconto',
      setup: (s) => { s.seedWelcome(); s.createFailures.push({ kind: 'throw', error: Object.assign(new Error('This promotion code cannot be redeemed.'), { type: 'StripeInvalidRequestError', code: 'promotion_code_invalid', statusCode: 400 }) }) },
      reason: 'stripe_session_failed',
      triedCreate: true,
    },
  ]
  for (const c of cases) {
    env.stripe.promoStore.length = 0
    env.stripe.couponStore.clear()
    env.stripe.promoListFailures.length = 0
    env.stripe.createFailures.length = 0
    c.setup(env.stripe)
    const browser = newBrowser({ kineo_event_session_id: 'sess_cupomfail1' })
    const before = mark(env)
    const res = await checkoutGet(env, browser, query)
    env.stripe.createFailures.length = 0
    env.stripe.promoListFailures.length = 0
    const tried = env.stripe.calls.slice(before.calls).filter((x) => x.op === 'checkout.sessions.create')
    if (tried.length !== (c.triedCreate ? 1 : 0)) p.push(`${c.name}: ${tried.length} sessão(ões) tentada(s)`)
    if (tried.some((x) => !x.params?.discounts)) p.push(`${c.name}: tentou sessão SEM o desconto prometido (preço cheio no lugar da oferta)`)
    if (promoWrites(env, before.calls).length) p.push(`${c.name}: o convidado escreveu cupom/código na Stripe`)
    if (res.status !== todayRes.status || location(res) !== location(todayRes)) p.push(`${c.name}: resposta difere de hoje (${res.status} ${location(res)})`)
    if (Object.keys(browser.cookies).some((k) => k !== 'kineo_event_session_id')) p.push(`${c.name}: gravou cookie sem sessão aberta`)
    const fresh = env.db.rows('events').slice(before.events)
    const names = fresh.map((e) => e.name)
    if (JSON.stringify(names) !== JSON.stringify(['checkout_attempted', 'guest_checkout_fallback', 'checkout_auth_required'])) p.push(`${c.name}: eventos ${JSON.stringify(names)}`)
    const required = fresh.find((e) => e.name === 'checkout_auth_required')
    if (JSON.stringify(required?.metadata) !== JSON.stringify(todayRequired.metadata) || required?.session_id !== todayRequired.session_id || required?.user_id !== null) p.push(`${c.name}: checkout_auth_required não é o de hoje`)
    const fb = fresh.find((e) => e.name === 'guest_checkout_fallback')
    const reason = c.reason ?? 'welcome_promo_unavailable'
    if (fb?.metadata?.guest_fallback !== reason) p.push(`${c.name}: motivo ${fb?.metadata?.guest_fallback}, esperava ${reason}`)
    if (c.failure && (fb?.metadata?.public_promo_failure_reason !== c.failure || fb?.metadata?.public_promo_state !== 'failed' || fb?.metadata?.public_promo_kind !== WELCOME_KIND)) p.push(`${c.name}: sem o motivo exato da oferta (${JSON.stringify(fb?.metadata)})`)
  }
  // Stripe de pé de novo: o clique seguinte vai à Stripe com o desconto.
  env.stripe.promoStore.length = 0
  env.stripe.couponStore.clear()
  const healed = env.stripe.seedWelcome()
  const ok = await checkoutGet(env, newBrowser(), query)
  if (!sessionIdFromLocation(ok) || JSON.stringify(lastCreate(env)?.params?.discounts) !== JSON.stringify([{ promotion_code: healed.id }])) p.push('falha do cupom: com a Stripe de pé, o clique seguinte não abriu a sessão com o desconto')
  return p
}

/** O webhook concede o MESMO grant do caminho logado com o desconto e registra a oferta nos eventos do convidado. */
async function sWelcomeGrant(env) {
  const p = []
  env.stripe.seedWelcome()
  for (const tier of ['basic', 'pro']) {
    const loggedEmail = `logado-grant-${tier}@exemplo.com`
    const logged = await loggedPurchase(env, { email: loggedEmail, query: welcomeQuery(tier) })
    if (!logged.sessionId) { p.push(`${tier}: o caminho logado não abriu a sessão de referência`); continue }
    const lsnap = env.stripe.pay(logged.sessionId, { email: loggedEmail })
    const lres = await deliver(env, 'checkout.session.completed', lsnap)
    const email = `convidado-grant-${tier}@exemplo.com`
    const buy = await guestPurchase(env, { email, query: welcomeQuery(tier) })
    if (lres.res.status !== 200 || buy.delivered?.res.status !== 200) { p.push(`${tier}: webhook ${lres.res.status}/${buy.delivered?.res.status}`); continue }
    if (!(buy.snapshot.total_details?.amount_discount > 0) || lsnap.total_details?.amount_discount !== buy.snapshot.total_details?.amount_discount || lsnap.amount_total !== buy.snapshot.amount_total) p.push(`${tier}: o valor cobrado difere do logado (${lsnap.amount_total} vs ${buy.snapshot.amount_total})`)
    const user = env.db.auth.users.find((u) => u.email === email)
    const a = env.db.profile(logged.user.id)
    const b = env.db.profile(user?.id)
    for (const k of ['plan', 'is_pro', 'has_paid', 'video_credits', 'cinematic_tokens', 'trial_status']) {
      if (JSON.stringify(a?.[k]) !== JSON.stringify(b?.[k])) p.push(`${tier}: ${k} logado=${a?.[k]} convidado=${b?.[k]}`)
    }
    if (b?.plan !== tier || b?.video_credits !== env.pricing.TIER_CREDITS[tier]) p.push(`${tier}: não é o plano cheio (${b?.plan} ${b?.video_credits})`)
    const [pa, pb] = [logged.sessionId, buy.sessionId].map((id) => env.db.events('payment_success').find((e) => e.metadata?.stripe_session_id === id))
    if (pa?.metadata?.credits_granted !== pb?.metadata?.credits_granted || pb?.metadata?.credits_granted !== env.pricing.TIER_CREDITS[tier]) p.push(`${tier}: credits_granted difere (${pa?.metadata?.credits_granted} vs ${pb?.metadata?.credits_granted})`)
    const m = pb?.metadata ?? {}
    const firstMonth = Math.round(env.pricing.monthlyPriceMinor(tier, 'usd', 'standard') * 0.8)
    if (pb?.user_id !== user?.id || m.guest_checkout !== true || m.guest_welcome_promo !== true || m.public_promo_kind !== WELCOME_KIND || m.public_promo_state !== 'applied' || m.public_promo_first_charge_minor !== firstMonth || m.amount_total !== firstMonth) p.push(`${tier}: payment_success do convidado sem a oferta (${JSON.stringify(m)})`)
    if ('guest_welcome_promo' in (pa?.metadata ?? {}) || 'guest_checkout' in (pa?.metadata ?? {})) p.push(`${tier}: o payment_success do LOGADO mudou de forma`)
    const created = env.db.events('guest_account_created').find((e) => e.metadata?.stripe_session_id === buy.sessionId)
    if (created?.metadata?.public_promo_kind !== WELCOME_KIND || created?.metadata?.guest_welcome_promo !== true || created?.metadata?.welcome_promo_reuse !== null) p.push(`${tier}: guest_account_created sem a oferta (${JSON.stringify(created?.metadata)})`)
  }
  if (env.db.events('guest_welcome_promo_reused').length !== 0 || env.founderAlerts.some((x) => x.kind === 'guest_welcome_promo_reused')) p.push('conta nova acusada de reuso')
  return p
}

/** Desconto de boas-vindas numa conta que JÁ pagou: o mesmo grant, guest_welcome_promo_reused 1× e aviso ao fundador 1×. */
async function sWelcomeReuse(env) {
  const p = []
  env.stripe.seedWelcome()
  const reused = () => env.db.events('guest_welcome_promo_reused')
  const sentFor = (sid) => env.founderAlerts.filter((a) => a.kind === 'guest_welcome_promo_reused' && a.stripeSessionId === sid && a.outcome === 'sent')
  // (a) Ex-assinante (pagou antes e cancelou): o plano entra e o reuso vira fato.
  const back = env.db.seedUser({ email: 'voltou@exemplo.com', profile: { has_paid: true, plan: 'free', is_pro: false, stripe_subscription_id: 'sub_cancelada', stripe_customer_id: 'cus_antigo', video_credits: 3 } })
  const buy = await guestPurchase(env, { email: 'voltou@exemplo.com', query: welcomeQuery('basic') })
  if (buy.delivered?.res.status !== 200) return [`reuso: webhook ${buy.delivered?.res.status} ${JSON.stringify(env.logs.slice(-3))}`]
  const prof = env.db.profile(back.id)
  if (prof?.plan !== 'basic' || prof?.video_credits !== 3 + env.pricing.TIER_CREDITS.basic) p.push(`reuso: o grant mudou (${prof?.plan} ${prof?.video_credits}) — a pessoa pagou o que a tela prometeu`)
  const ev = reused()
  if (ev.length !== 1 || ev[0].user_id !== back.id || ev[0].metadata?.reuse_reason !== 'paid_before' || ev[0].metadata?.stripe_session_id !== buy.sessionId || ev[0].metadata?.conflict !== null || ev[0].metadata?.public_promo_kind !== WELCOME_KIND || !(ev[0].metadata?.amount_discount > 0)) p.push(`reuso: evento ${JSON.stringify(ev.map((e) => ({ user: e.user_id, ...e.metadata })))}`)
  if (sentFor(buy.sessionId).length !== 1 || !String(sentFor(buy.sessionId)[0]?.text).includes(back.id)) p.push(`reuso: aviso ao fundador ${JSON.stringify(env.founderAlerts.map((a) => `${a.kind}:${a.outcome}`))}`)
  const matched = env.db.events('guest_account_matched').find((e) => e.metadata?.stripe_session_id === buy.sessionId)
  if (matched?.metadata?.welcome_promo_reuse !== 'paid_before') p.push('reuso: guest_account_matched sem o reuso')
  // Reentrega (o mesmo evento e um evento novo): nada duplica e o crédito não dobra.
  await deliver(env, 'checkout.session.completed', buy.snapshot, buy.delivered.eventId)
  await deliver(env, 'checkout.session.completed', buy.snapshot)
  if (reused().length !== 1 || sentFor(buy.sessionId).length !== 1 || env.founderAlerts.filter((a) => a.kind === 'guest_welcome_promo_reused' && a.stripeSessionId === buy.sessionId && a.outcome !== 'duplicate').length !== 1 || env.db.profile(back.id)?.video_credits !== 3 + env.pricing.TIER_CREDITS.basic) p.push('reuso: reentrega duplicou evento/aviso/crédito')
  // (b) Conta antiga que NUNCA pagou: primeira vez — sem reuso, inclusive na reentrega DEPOIS do grant (has_paid já true).
  const fresh = env.db.seedUser({ email: 'nunca.pagou@exemplo.com', profile: { video_credits: 5 } })
  const first = await guestPurchase(env, { email: 'nunca.pagou@exemplo.com', query: welcomeQuery('pro') })
  if (first.delivered?.res.status !== 200 || env.db.profile(fresh.id)?.plan !== 'pro') p.push('primeira vez: compra não entregue')
  await deliver(env, 'checkout.session.completed', first.snapshot)
  if (reused().some((e) => e.user_id === fresh.id) || sentFor(first.sessionId).length !== 0) p.push('primeira vez: acusada de reuso (a reentrega leu o has_paid DESTA compra)')
  // (c) Conta que já pagou comprando SEM o desconto: não é reuso.
  const plain = env.db.seedUser({ email: 'pagou.sem.cupom@exemplo.com', profile: { has_paid: true, plan: 'free', is_pro: false } })
  const noPromo = await guestPurchase(env, { email: 'pagou.sem.cupom@exemplo.com', query: 'tier=basic&billing=monthly' })
  if (noPromo.delivered?.res.status !== 200 || reused().some((e) => e.user_id === plain.id)) p.push('sem cupom: acusada de reuso')
  // (d) Assinante ATIVO com o desconto: conflito (nada concedido) E reuso, cada um com o seu aviso.
  const active = env.db.seedUser({ email: 'ativo@exemplo.com', profile: { has_paid: true, is_pro: true, plan: 'pro', stripe_subscription_id: 'sub_ativa', stripe_customer_id: 'cus_ativo', video_credits: 50 } })
  const both = await guestPurchase(env, { email: 'ativo@exemplo.com', query: welcomeQuery('basic') })
  if (both.delivered?.res.status !== 200) p.push(`conflito+reuso: webhook ${both.delivered?.res.status}`)
  const bothEv = reused().find((e) => e.user_id === active.id)
  if (!bothEv || bothEv.metadata?.conflict !== 'active_stripe_plan') p.push('conflito+reuso: sem o evento de reuso com o conflito')
  if (env.db.profile(active.id)?.plan !== 'pro' || env.db.profile(active.id)?.video_credits !== 50) p.push('conflito+reuso: o perfil foi mexido')
  if (!env.founderAlerts.some((a) => a.kind === 'guest_conflict' && a.stripeSessionId === both.sessionId) || sentFor(both.sessionId).length !== 1) p.push('conflito+reuso: falta um dos avisos')
  // (e) O banco recusa o evento: 500 (a Stripe reenvia) ANTES do grant; o reenvio grava 1× e avisa 1×.
  const retry = env.db.seedUser({ email: 'banco.caiu@exemplo.com', profile: { has_paid: true, plan: 'free', is_pro: false, video_credits: 0 } })
  env.db.fail('events', 'insert', { code: '08006', message: 'connection failure' }, 1, (rows) => Array.isArray(rows) && rows.some((r) => r.name === 'guest_welcome_promo_reused'))
  const failed = await guestPurchase(env, { email: 'banco.caiu@exemplo.com', query: welcomeQuery('basic') })
  if (failed.delivered?.res.status !== 500) p.push(`banco caiu: webhook ${failed.delivered?.res.status}, esperava 500 (o reuso não pode sumir calado)`)
  if (env.db.profile(retry.id)?.plan !== 'free') p.push('banco caiu: concedeu antes de registrar o reuso')
  const again = await deliver(env, 'checkout.session.completed', failed.snapshot, failed.delivered.eventId)
  if (again.res.status !== 200 || env.db.profile(retry.id)?.plan !== 'basic' || reused().filter((e) => e.user_id === retry.id).length !== 1 || sentFor(failed.sessionId).length !== 1) p.push(`banco caiu: o reenvio não entregou/gravou/avisou 1× (${again.res.status})`)
  return p
}

/** As regras puras da oferta sem conta (os mutantes do módulo puro e do carimbo têm de ficar vermelhos aqui). */
async function sWelcomePureRules(env) {
  const P = env.pure
  const S = env.server
  const p = []
  const base = { live: true, isGet: true, resumed: false, wantsTrial: false, planFit: false, returnToWatermark: false, checkoutRecovery: false, promoRequested: true, welcomePromoLive: true, welcomePromo: true, introDiscount: false, botSuspected: false }
  const r = (o) => P.guestCheckoutFallbackReason({ ...base, ...o })
  if (r({}) !== null) p.push('pura: a oferta de boas-vindas com o interruptor ligado não compra sem conta')
  if (r({ welcomePromoLive: false }) !== 'promo') p.push('pura: interruptor desligado deixou a oferta passar')
  if (r({ welcomePromo: false }) !== 'promo') p.push('pura: outro cupom passou')
  if (r({ live: false }) !== 'switch_off') p.push('pura: a oferta passou com a compra sem login desligada')
  if (r({ isGet: false }) !== 'not_navigation') p.push('pura: POST com a oferta virou convidado')
  for (const [k, reason] of [['checkoutRecovery', 'checkout_recovery'], ['returnToWatermark', 'watermark_return'], ['planFit', 'plan_fit'], ['wantsTrial', 'card_trial'], ['resumed', 'resumed_after_signup'], ['introDiscount', 'intro_discount'], ['botSuspected', 'bot_suspected']]) {
    if (r({ [k]: true }) !== reason) p.push(`pura: a oferta furou o motivo ${reason}`)
  }
  for (const [tier, annual, ok] of [['basic', false, true], ['pro', false, true], ['starter', false, false], ['autopilot', false, false], ['autopilot_lite', false, false], ['basic', true, false], ['pro', true, false]]) {
    if (P.guestWelcomePromoShapeOk({ tier, isAnnual: annual }) !== ok) p.push(`pura: recorte ${tier}/${annual ? 'anual' : 'mensal'} = ${!ok}`)
  }
  const reuse = (o) => P.guestWelcomePromoReuse({ welcomePromoApplied: true, bornFromThisSession: false, profile: { has_paid: true, stripe_subscription_id: 'sub_velha' }, subscriptionId: 'sub_nova', ...o })
  if (reuse({}) !== 'paid_before') p.push('pura: conta que já pagou não é reuso')
  if (reuse({ welcomePromoApplied: false }) !== null) p.push('pura: compra sem o desconto virou reuso')
  if (reuse({ bornFromThisSession: true }) !== null) p.push('pura: conta nascida desta compra virou reuso')
  if (reuse({ profile: { has_paid: false, stripe_subscription_id: null } }) !== null) p.push('pura: conta que nunca pagou virou reuso')
  if (reuse({ profile: { has_paid: true, stripe_subscription_id: 'sub_nova' } }) !== null) p.push('pura: a reentrega depois do grant (has_paid desta compra) virou reuso')
  if (reuse({ profile: null }) !== null) p.push('pura: sem perfil virou reuso')
  // O carimbo inteiro conta, nunca só o nome da oferta.
  const stamp = { public_promo_truth_version: 'public_promo_truth_v1', public_promo_kind: WELCOME_KIND, public_promo_state: 'applied', public_promo_first_charge_minor: '2392' }
  if (!S.guestWelcomePromoApplied(stamp)) p.push('carimbo: a sessão com a oferta aplicada não foi reconhecida')
  for (const [k, v] of [['public_promo_state', 'requested'], ['public_promo_state', 'failed'], ['public_promo_kind', 'outra_oferta'], ['public_promo_truth_version', 'v0']]) {
    if (S.guestWelcomePromoApplied({ ...stamp, [k]: v })) p.push(`carimbo: ${k}=${v} contou como oferta aplicada`)
  }
  if (S.guestWelcomePromoApplied({ public_promo_kind: WELCOME_KIND }) || S.guestWelcomePromoApplied(null)) p.push('carimbo: o nome da oferta sozinho contou como aplicada')
  if (JSON.stringify(S.guestWelcomePromoEventMetadata({ kineo_guest: '1' })) !== '{}') p.push('carimbo: compra sem o desconto ganhou chaves no evento')
  const em = S.guestWelcomePromoEventMetadata(stamp)
  if (em.guest_welcome_promo !== true || em.public_promo_first_charge_minor !== 2392 || em.public_promo_kind !== WELCOME_KIND) p.push(`carimbo: evento sem a oferta (${JSON.stringify(em)})`)
  return p
}

/** O caminho LOGADO com o link do modal não muda com o interruptor da oferta (mesma sessão, mesmos parâmetros). */
async function sWelcomeLoggedUnchanged() {
  const shots = []
  for (const welcomeLive of [false, true]) {
    const env = makeEnv({ live: true, welcomeLive })
    const promo = env.stripe.seedWelcome()
    const logged = await loggedPurchase(env, { email: 'igual.boas.vindas@exemplo.com', query: welcomeQuery('basic') })
    const params = clone(lastCreate(env)?.params ?? null)
    shots.push({
      status: logged.res.status,
      params: params && {
        ...params,
        customer: 'cus_x',
        metadata: omit(params.metadata, OWNER_KEYS),
        subscription_data: { ...params.subscription_data, metadata: omit(params.subscription_data?.metadata, OWNER_KEYS) },
        expires_at: 0,
        discounts: (params.discounts ?? []).map((d) => ({ ...d, promotion_code: d.promotion_code === promo.id ? 'promo_x' : d.promotion_code })),
      },
      events: env.db.rows('events').map((e) => e.name),
      calls: env.stripe.calls.map((c) => c.op),
      cookies: Object.keys(logged.browser.cookies).sort(),
    })
  }
  if (!shots[0].params?.discounts?.length) return ['logado: a referência não aplicou o desconto (cenário quebrado)']
  return JSON.stringify(shots[0]) === JSON.stringify(shots[1]) ? [] : ['logado: o interruptor da oferta mudou o caminho de quem já tem conta']
}

// ═══ KINEO-ANUNCIO-MOTOR-2026-10-07 — o clique pago do anúncio viaja do cookie do pouso até o payment_success ═════════
// Rota e webhook REAIS: o cookie kineo_paid_click (escrito pelo SourceCapture, lib/growth/paidClickAttribution.ts) tem
// de aparecer no checkout_started, no checkout_guest_started e no payment_success — do convidado e do logado —, nunca na
// sessão da Stripe; sem cookie (ou com cookie adulterado) nenhuma chave nova. Guardião próprio do módulo e das âncoras:
// scripts/test-anuncio-motor-rastreio-2026-10-07.mjs. KINEO-MSCLKID-2026-10-08: o clique do Microsoft Ads (msclkid) faz o
// mesmo caminho na compra sem login (bloco 2b) e tem mutante próprio no módulo.
async function sPaidClick(env) {
  const p = []
  const atSec = Math.floor(Date.now() / 1000) - 3600
  const cookie = encodeURIComponent(JSON.stringify({ v: 1, s: 'google', m: 'cpc', c: 'motor-seedance-2-5', t: 'seedance 2.5 app', k: 'gclid', i: 'Cj0KCQjwTESTE_abc-123', a: atSec }))
  const expected = JSON.stringify({
    paid_click_version: 'paid_click_v1', paid_utm_source: 'google', paid_utm_medium: 'cpc', paid_utm_campaign: 'motor-seedance-2-5',
    paid_utm_term: 'seedance 2.5 app', paid_click_id_type: 'gclid', paid_click_id: 'Cj0KCQjwTESTE_abc-123', paid_click_at: new Date(atSec * 1000).toISOString(),
  })
  const paidOf = (m) => JSON.stringify(Object.fromEntries(Object.entries(m ?? {}).filter(([k]) => k.startsWith('paid_'))))
  const ofSession = (name, id) => env.db.events(name).find((e) => e.metadata?.stripe_session_id === id)
  // 1. Convidado que clicou no anúncio.
  const guest = await guestPurchase(env, { browser: newBrowser({ kineo_event_session_id: 'sess_anuncio_g1', kineo_paid_click: cookie }), email: 'anuncio.convidado@exemplo.com' })
  if (!guest.sessionId) return ['anúncio: GET do convidado não abriu sessão']
  if (guest.delivered?.res.status !== 200) return [`anúncio: webhook do convidado ${guest.delivered?.res.status}`]
  if (paidOf(ofSession('checkout_started', guest.sessionId)?.metadata) !== expected) p.push(`anúncio: checkout_started do convidado sem o clique pago (${paidOf(ofSession('checkout_started', guest.sessionId)?.metadata)})`)
  if (paidOf(ofSession('checkout_guest_started', guest.sessionId)?.metadata) !== expected) p.push('anúncio: checkout_guest_started sem o clique pago')
  const guestPaid = ofSession('payment_success', guest.sessionId)
  if (!guestPaid?.user_id) p.push('anúncio: payment_success do convidado ausente/sem dono')
  if (paidOf(guestPaid?.metadata) !== expected) p.push(`anúncio: payment_success do convidado sem o clique pago (${paidOf(guestPaid?.metadata)})`)
  const stripeSide = JSON.stringify([env.stripe.sessionStore.get(guest.sessionId)?.metadata ?? {}, lastCreate(env)?.params ?? {}])
  if (/paid_|gclid|motor-seedance/.test(stripeSide)) p.push('anúncio: o clique pago vazou para a sessão da Stripe')
  // 2. Logado que clicou no anúncio: o mesmo writer de eventos e o mesmo webhook.
  const user = env.db.seedUser({ email: 'anuncio.logado@exemplo.com' })
  const loggedBrowser = newBrowser({ kineo_event_session_id: 'sess_anuncio_l1', kineo_paid_click: cookie })
  loggedBrowser.userId = user.id
  const loggedSession = sessionIdFromLocation(await checkoutGet(env, loggedBrowser, 'tier=basic&billing=monthly&intro=1'))
  if (!loggedSession) {
    p.push('anúncio: GET logado não abriu sessão')
  } else {
    const delivered = await deliver(env, 'checkout.session.completed', env.stripe.pay(loggedSession, { email: 'anuncio.logado@exemplo.com' }))
    if (delivered.res.status !== 200) p.push(`anúncio: webhook do logado ${delivered.res.status}`)
    if (paidOf(ofSession('checkout_started', loggedSession)?.metadata) !== expected) p.push('anúncio: checkout_started do logado sem o clique pago')
    const loggedPaid = ofSession('payment_success', loggedSession)
    if (loggedPaid?.user_id !== user.id || paidOf(loggedPaid?.metadata) !== expected) p.push('anúncio: payment_success do logado sem o clique pago')
  }
  // 2b. KINEO-MSCLKID-2026-10-08 — convidado que clicou no anúncio do Microsoft Ads (Bing): o msclkid faz o MESMO caminho
  //     do gclid (cookie → checkout_started/checkout_guest_started → payment_success) e também nunca entra na Stripe.
  const MSCLKID = '9f86d081884c4d0ea2f1b3c4d5e6f708'
  const bingCookie = encodeURIComponent(JSON.stringify({ v: 1, s: 'bing', m: 'cpc', c: 'motores_0810', t: 'seedance 2.5 app', k: 'msclkid', i: MSCLKID, a: atSec }))
  const bingExpected = JSON.stringify({
    paid_click_version: 'paid_click_v1', paid_utm_source: 'bing', paid_utm_medium: 'cpc', paid_utm_campaign: 'motores_0810',
    paid_utm_term: 'seedance 2.5 app', paid_click_id_type: 'msclkid', paid_click_id: MSCLKID, paid_click_at: new Date(atSec * 1000).toISOString(),
  })
  const bing = await guestPurchase(env, { browser: newBrowser({ kineo_event_session_id: 'sess_anuncio_b1', kineo_paid_click: bingCookie }), email: 'anuncio.bing@exemplo.com' })
  if (!bing.sessionId) {
    p.push('bing: GET do convidado não abriu sessão')
  } else {
    if (bing.delivered?.res.status !== 200) p.push(`bing: webhook do convidado ${bing.delivered?.res.status}`)
    if (paidOf(ofSession('checkout_started', bing.sessionId)?.metadata) !== bingExpected) p.push(`bing: checkout_started do convidado sem o msclkid (${paidOf(ofSession('checkout_started', bing.sessionId)?.metadata)})`)
    if (paidOf(ofSession('checkout_guest_started', bing.sessionId)?.metadata) !== bingExpected) p.push('bing: checkout_guest_started sem o msclkid')
    const bingPaid = ofSession('payment_success', bing.sessionId)
    if (!bingPaid?.user_id) p.push('bing: payment_success do convidado ausente/sem dono')
    if (paidOf(bingPaid?.metadata) !== bingExpected) p.push(`bing: payment_success do convidado sem o msclkid (${paidOf(bingPaid?.metadata)})`)
    const bingStripeSide = JSON.stringify([env.stripe.sessionStore.get(bing.sessionId)?.metadata ?? {}, lastCreate(env)?.params ?? {}])
    if (/paid_|msclkid|motores_0810/.test(bingStripeSide)) p.push('bing: o clique pago vazou para a sessão da Stripe')
  }
  // 3. Sem anúncio e com cookie adulterado: o evento sai como antes, sem chave paid_*.
  for (const [label, jar] of [['sem cookie', {}], ['cookie adulterado', { kineo_paid_click: encodeURIComponent('{"v":1,"k":"gclid","i":"x y","a":1}') }]]) {
    const plain = await guestPurchase(env, { browser: newBrowser({ kineo_event_session_id: `sess_anuncio_${label.length}`, ...jar }), email: `sem.anuncio.${label.length}@exemplo.com` })
    const plainPaid = plain.sessionId ? ofSession('payment_success', plain.sessionId) : null
    if (!plainPaid) p.push(`${label}: payment_success ausente`)
    else if (paidOf(plainPaid.metadata) !== '{}' || paidOf(ofSession('checkout_started', plain.sessionId)?.metadata) !== '{}') p.push(`${label}: ganhou chave paid_*`)
  }
  return p
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
  // Leva 4 — o interruptor da oferta de boas-vindas sem conta: um lugar só, lido só pela rota de checkout (o webhook NÃO
  // olha interruptor de propósito: uma compra feita com ele ligado é entregue e medida mesmo que alguém o desligue).
  check((pure.match(/^export const GUEST_WELCOME_PROMO_LIVE = (?:true|false)$/gm) ?? []).length === 1, 'interruptor único: GUEST_WELCOME_PROMO_LIVE é um booleano literal, declarado uma vez')
  const welcomeDeclares = files.filter((f) => /export const GUEST_WELCOME_PROMO_LIVE\b/.test(read(f)))
  check(welcomeDeclares.length === 1 && welcomeDeclares[0] === PURE, `o interruptor da oferta de boas-vindas mora num lugar só (${welcomeDeclares.join(', ')})`)
  const welcomeConsumers = files.filter((f) => f !== PURE && /\bGUEST_WELCOME_PROMO_LIVE\b/.test(read(f)))
  check(welcomeConsumers.length === 1 && welcomeConsumers[0] === CHECKOUT, `só a rota de checkout lê o interruptor da oferta (${welcomeConsumers.join(', ')})`)
  check(/import \{[^}]*\bGUEST_WELCOME_PROMO_LIVE\b[^}]*\} from '@\/lib\/growth\/guestCheckout'/.test(read(CHECKOUT)), 'a rota de checkout lê o interruptor da oferta da fonte única')
  const clientFiles = files.filter((f) => /^\s*['"]use client['"]/.test(read(f)))
  check(clientFiles.length > 50, `varredura de 'use client' com denominador real (${clientFiles.length})`)
  check(clientFiles.every((f) => !read(f).includes("'@/lib/stripe/guestCheckout'")), 'nenhum componente de cliente importa o lado servidor (node:crypto quebraria o build)')
  check(clientFiles.every((f) => !read(f).includes("'@/lib/auth/guestAccess'")), 'nenhum componente de cliente importa a trava de sessões (node:crypto + chave de serviço)')
  // A recuperação de senha troca o código NO NAVEGADOR: só a página pode avisar o servidor que a sessão nova existe.
  check(clientFiles.includes(RESET_PAGE) && squashWs(read(RESET_PAGE)).includes(squashWs(`useEffect(() => {
    if (!ready) return
    guestGuard.current = Promise.race([
      fetch('/api/auth/guest-sessions', { method: 'POST', credentials: 'same-origin', cache: 'no-store' }).catch(() => null),
      new Promise((resolve) => setTimeout(resolve, 10000)),
    ])
  }, [ready])`)), '/reset-password avisa /api/auth/guest-sessions quando a sessão da recuperação fica pronta (falha de rede não atrapalha; teto de 10 s)')
  {
    const resetSrc = squashWs(read(RESET_PAGE))
    const waitAt = resetSrc.indexOf('if (guestGuard.current) await guestGuard.current')
    const saveAt = resetSrc.indexOf('const { error } = await supabase.auth.updateUser({ password })')
    check(waitAt > 0 && saveAt > waitAt && resetSrc.indexOf('async function handleSubmit') < waitAt, '/reset-password grava a senha escolhida só DEPOIS da troca aleatória da trava (nunca é sobrescrita)')
  }
  // Na /auth/callback a trava é carregada sob demanda: guardiões que fecham a lista de imports da callback não mudam.
  check(read(CALLBACK).includes("const { revokeGuestSessionsOnce } = await import('@/lib/auth/guestAccess')") && !/^import [^\n]*'@\/lib\/auth\/guestAccess'/m.test(read(CALLBACK)), '/auth/callback carrega a trava sob demanda (sem import estático novo)')
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
  check(d({ owner: { bornFromThisSession: true, createdAtMs: now - 60000, emailProven: true } }).reason === 'already_used', 'dona já entrou com prova de e-mail = o login sem prova não abre')
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
  // Leva 4 — a oferta de boas-vindas nos parâmetros: ausente = o objeto de antes; presente = o espelho do logado.
  check(JSON.stringify(b({})) === JSON.stringify(b({ welcomePromo: null })), 'sem a oferta de boas-vindas, os parâmetros são exatamente os de antes (null = ausente)')
  check(p1.allow_promotion_codes === true && p1.after_expiration.recovery.allow_promotion_codes === true && !('discounts' in p1), 'compra sem cupom: campo manual ligado e nenhum desconto (como hoje)')
  {
    const w = b({ welcomePromo: { kind: 'welcome_first_month_20', requestedCode: 'WELCOME20', promotionCodeId: 'promo_x', firstChargeMinor: 2392 } }).params
    check(JSON.stringify(w.discounts) === '[{"promotion_code":"promo_x"}]' && !('allow_promotion_codes' in w) && w.after_expiration.recovery.allow_promotion_codes === false, 'oferta de boas-vindas: o desconto no lugar do campo manual (a Stripe não aceita os dois)')
    check(w.metadata.public_promo_state === 'applied' && w.subscription_data.metadata.public_promo_state === 'applied' && w.metadata.public_promo_first_charge_minor === '2392' && w.subscription_data.metadata.public_promo_first_charge_minor === '2392', 'oferta de boas-vindas: o carimbo na sessão e na assinatura')
    check(w.success_url.includes('amount=2392') && w.cancel_url.includes('&promo=WELCOME20'), 'oferta de boas-vindas: o 1º mês na volta e o cupom na desistência')
    const kw = (params) => S.guestCheckoutIdempotencyKey(params, { nonceHash: 'a'.repeat(64), window: 7, unitAmount: 2990, listCurrency: 'usd', introRequested: false })
    const wNoDiscount = { ...w }
    delete wNoDiscount.discounts
    check(kw(w) !== kw(wNoDiscount), 'idempotência: o desconto entra na chave (sessão com e sem desconto nunca se confundem)')
    const fakeStripe = makeStripe()
    const seeded = fakeStripe.seedWelcome()
    const cand = await S.loadGuestWelcomePromoCandidate(fakeStripe, { kind: 'welcome_first_month_20', code: 'WELCOME20', nowMs: Date.now() })
    check(cand?.promotionCodeId === seeded.id && cand?.couponId === 'KINEO_WELCOME20' && cand?.couponPercentOff === 20 && cand?.couponDuration === 'once' && cand?.currentCustomerId === '' && cand?.restrictedCustomerId === null && cand?.promotionFirstTimeTransaction === false, 'leitura da oferta: o mesmo retrato do logado, sem cliente')
    check(fakeStripe.calls.every((c) => c.op === 'promotionCodes.list' || c.op === 'coupons.retrieve'), 'leitura da oferta: só leitura na Stripe')
    check(await S.loadGuestWelcomePromoCandidate(makeStripe(), { kind: 'welcome_first_month_20', code: 'WELCOME20', nowMs: Date.now() }) === null, 'leitura da oferta: código ausente = null (a verificação recusa)')
  }
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

  // Token do e-mail "sua conta está pronta" e leitura do JWT do Auth (lib/auth/guestAccess.ts).
  const G = env.guard
  const uid = '0f8fad5b-d9cb-469f-a165-70867728950e'
  const sid = 'cs_test_abcdefghij0123456789'
  const nowS = 1_790_000_000
  const tok = G.signGuestReadyToken({ userId: uid, stripeSessionId: sid, expiresAtSeconds: nowS + 3600, secret: 's1' })
  const ver = (t, o = {}) => G.verifyGuestReadyToken(t, { secret: 's1', nowSeconds: nowS, ...o })
  check(ver(tok).ok === true && ver(tok).userId === uid && ver(tok).stripeSessionId === sid, 'token do e-mail: assinado e lido de volta')
  check(ver(tok, { secret: 's2' }).reason === 'bad_signature', 'token do e-mail: outro segredo = recusado')
  check(ver(tok, { nowSeconds: nowS + 3600 }).reason === 'expired', 'token do e-mail: vence na hora marcada')
  const parts = tok.split('.')
  check(ver([...parts.slice(0, 3), String(nowS + 999999), parts[4]].join('.')).reason === 'bad_signature', 'token do e-mail: validade não se estica')
  check(ver([parts[0], '0f8fad5b-d9cb-469f-a165-70867728950f', ...parts.slice(2)].join('.')).reason === 'bad_signature', 'token do e-mail: dono não se troca')
  check(['', 'x', `${parts.slice(0, 4).join('.')}`, [...parts.slice(0, 1), 'nao-e-uuid', ...parts.slice(2)].join('.'), [...parts.slice(0, 2), 'cs_x', ...parts.slice(3)].join('.'), [...parts.slice(0, 3), 'abc', parts[4]].join('.'), null].every((t) => ver(t).reason === 'malformed'), 'token do e-mail: formas quebradas = malformed')
  const ttl = env.pure.GUEST_READY_LINK_TTL_HOURS
  check(ttl >= 24 && ttl <= 24 * 7, `link do e-mail vale dias, não para sempre (${ttl} h)`)
  const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url')
  const jwt = (claims) => `${b64({ alg: 'HS256' })}.${b64(claims)}.sig`
  check(G.sessionIdFromAccessToken(jwt({ session_id: uid })) === uid && G.sessionIdFromAccessToken('a.b') === null && G.sessionIdFromAccessToken(jwt({ session_id: 'x y' })) === null, 'session_id do JWT')
  check(JSON.stringify(G.amrMethodsFromAccessToken(jwt({ amr: [{ method: 'oauth', timestamp: 1 }, { method: 'totp', timestamp: 2 }] }))) === '["oauth","totp"]' && JSON.stringify(G.amrMethodsFromAccessToken(jwt({ amr: ['pwd'] }))) === '["pwd"]' && G.amrMethodsFromAccessToken(jwt({})).length === 0 && G.amrMethodsFromAccessToken(null).length === 0, 'amr do JWT (forma do Supabase e RFC 8176)')
  const msg = S.guestAccountReadyEmailMessage('https://www.usekineo.com/auth/guest-link?ready=abc')
  check(msg.subject === READY_SUBJECT && msg.text.includes('https://www.usekineo.com/auth/guest-link?ready=abc') && msg.html.includes('href="https://www.usekineo.com/auth/guest-link?ready=abc"'), 'e-mail pronto: assunto, link no texto e no botão')
  check(!PRICE_LITERAL.test(`${msg.subject}\n${msg.text}\n${msg.html.replace(/<[^>]+>/g, ' ')}`), 'e-mail pronto: nenhum preço/moeda literal')
}

// ── 3-5. Cenários executados ──────────────────────────────────────────────────────────────────────────────────────────
const SCENARIOS = [
  ['interruptor desligado = caminho de hoje', sSwitchOff, { live: false }],
  ['sessão de convidado (EUA)', sGuestSession, { live: true }],
  ['moeda e preço = caminho logado', sCurrencyParity, { live: true }],
  ['desvios para o cadastro', sFallbacks, { live: true }],
  ['Stripe falha = caminho de hoje + guest_checkout_fallback', sStripeFailure, { live: true }],
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
  ['e-mail "sua conta está pronta" (1×, sem preço, link de uso único)', sReadyEmail, { live: true }],
  ['e-mail "sua conta está pronta" com o Resend fora', sReadyEmailRetry, { live: true }],
  ['tomada de conta: 1ª entrada com prova derruba as outras, 1×', sTakeoverGuard, { live: true }],
  ['tomada de conta: prova antes do login automático fecha o login', sProofBeforeAutoLogin, { live: true }],
  ['tomada de conta: recuperação de senha', sRecoveryRevokes, { live: true }],
  ['tomada de conta: Google pela /auth/callback', sCallbackRevokes, { live: true }],
  ['tomada de conta: regras puras', sPureRevocationRules, { live: true }],
  ['tomada de conta: troca da senha falha, a derrubada segue', sScrambleFails, { live: true }],
  // ── leva 4: a oferta de boas-vindas sem conta (KINEO-CUPOM-CONVIDADO-2026-10-07) ──
  ['oferta de boas-vindas: interruptor desligado = hoje byte a byte', sWelcomeSwitchOff, { live: true, welcomeLive: false }],
  ['oferta de boas-vindas: Stripe direto com o desconto do logado', sWelcomeGuest, { live: true, welcomeLive: true }],
  ['oferta de boas-vindas: o recorte concorda com o logado (planos × períodos)', sWelcomeShapeParity, { live: true, welcomeLive: true }],
  ['oferta de boas-vindas: outros cupons, recuperação e robô continuam no cadastro', sWelcomeOtherPromos, { live: true, welcomeLive: true }],
  ['oferta de boas-vindas: Stripe sem o desconto = hoje + guest_checkout_fallback', sWelcomeStripeFailure, { live: true, welcomeLive: true }],
  ['oferta de boas-vindas: o mesmo grant do logado, oferta registrada no evento', sWelcomeGrant, { live: true, welcomeLive: true }],
  ['oferta de boas-vindas: reuso grava guest_welcome_promo_reused e avisa o fundador', sWelcomeReuse, { live: true, welcomeLive: true }],
  ['oferta de boas-vindas: regras puras e carimbo', sWelcomePureRules, { live: true, welcomeLive: true }],
  // ── KINEO-ANUNCIO-MOTOR-2026-10-07: o clique pago do anúncio chega ao payment_success (convidado e logado) ──
  ['clique pago do anúncio: cookie → eventos de checkout → payment_success, nunca na Stripe', sPaidClick, { live: true }],
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
{
  const problems = await sWelcomeLoggedUnchanged().catch((e) => [`logado (oferta): lançou ${e?.message}`])
  if (problems.length === 0) check(true, 'caminho logado com o link do modal idêntico com o interruptor da oferta ligado e desligado')
  else for (const problem of problems) check(false, problem)
}

// ── 6. Mutantes em memória: cada regra quebrada tem de deixar o seu cenário vermelho ─────────────────────────────────
const MUTANTS = [
  ['puro: interruptor ignorado', { [PURE]: [replaceOnce("  if (input.live !== true) return 'switch_off'\n", '', 'sem gate do interruptor')] }, sSwitchOff, false],
  // Leva 4: a âncora acompanhou a linha (agora com a exceção da oferta de boas-vindas); a intenção é a mesma.
  ['puro: cupom vira convidado', { [PURE]: [replaceOnce("  if (input.promoRequested && !guestWelcomePromoReleased(input)) return 'promo'\n", '', 'sem desvio de cupom')] }, sFallbacks, true],
  ['puro: robô vira convidado', { [PURE]: [replaceOnce("  if (input.botSuspected) return 'bot_suspected'\n", '', 'sem desvio de robô')] }, sFallbacks, true],
  ['puro: conta existente loga sozinha', { [PURE]: [replaceOnce("  if (input.owner.bornFromThisSession !== true) return { state: 'check_email', reason: 'existing_account' }\n", '', 'sem trava de conta existente')] }, sExistingAccount, true],
  ['puro: sem prova do navegador', { [PURE]: [replaceOnce("  if (input.browserProof !== true) return { state: 'check_email', reason: 'other_browser' }\n", '', 'sem prova do navegador')] }, sOtherBrowserEmail, true],
  ['puro: sem janela', { [PURE]: [replaceOnce('    input.nowMs - createdAtMs > windowMs ||\n', '', 'sem janela de minutos')] }, sExpired, true],
  ['rota de acesso: vaga ignorada (corrida)', { [ACCESS]: [replaceOnce('    const claim = await claimMarker(admin, claimId)\n', "    const claim = 'claimed' as 'claimed' | 'taken' | 'error'\n", 'sem reserva do login')] }, sConcurrentClaim, true],
  ['rota de acesso: sem trava de origem', { [ACCESS]: [replaceOnce("  if (origin && origin !== req.nextUrl.origin) return reply({ state: 'unavailable' }, 403)\n", '', 'sem trava de origem')] }, sCrossOrigin, true],
  ['rota de acesso: conta existente sem e-mail', { [ACCESS]: [replaceOnce("      : reason === 'existing_account' && browserProof ? 'auto' : null", '      : null', 'sem e-mail automático')] }, sExistingAccount, true],
  ['link do e-mail: token inválido entra', { [LINK]: [replaceOnce('  if (error || !data?.user || !data.session) {\n', '  if (!data?.user) return NextResponse.redirect(new URL(next, origin))\n  if (false) {\n', 'sem checagem do verifyOtp')] }, sOtherBrowserEmail, true],
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
  // ── leva 2: nunca pior que hoje ──
  ['checkout: falha da Stripe vira tela de erro', { [CHECKOUT]: [replaceOnce('        if (guest.ok) return guest.response\n        guestFailure = guest.failure\n', "        if (guest.ok) return guest.response\n        return redirectError('Payment session failed')\n", 'falha vira erro')] }, sStripeFailure, true],
  ['checkout: exceção no meio escapa', { [CHECKOUT]: [replaceOnce("      } catch (guestError) {\n        guestFailure = { reason: 'guest_session_threw', detail: guestStripeErrorShape(guestError) }\n      }\n", '      } catch (guestError) {\n        throw guestError\n      }\n', 'exceção sem rede de proteção')] }, sStripeFailure, true],
  ['checkout: fallback sem o evento do motivo', { [CHECKOUT]: [replaceOnce('    if (GUEST_CHECKOUT_LIVE) {\n      // O motivo de não ser convidado', '    if (false) {\n      // O motivo de não ser convidado', 'sem guest_checkout_fallback')] }, sStripeFailure, true],
  // ── leva 2: tomada de conta ──
  ['link do e-mail: entrada com prova não derruba as outras', { [LINK]: [replaceOnce("  await revokeGuestSessionsOnce({ supabase, user: data.user, session: data.session, method, path: '/auth/guest-link' })\n", '', 'sem a trava no link')] }, sTakeoverGuard, true],
  ['puro: derruba mais de uma vez', { [PURE]: [replaceOnce("  if (meta[GUEST_SESSIONS_REVOKED_AT_KEY]) return 'already_revoked'\n", '', 'sem uma vez por conta')] }, sTakeoverGuard, true],
  ['puro: conta comum também cai', { [PURE]: [replaceOnce("  if (typeof born !== 'string' || !born) return 'not_guest_account'\n", '', 'sem filtro de conta de convidado')] }, sCallbackRevokes, true],
  ['puro: a sessão sem prova dispara', { [PURE]: [replaceOnce("  if (meta[GUEST_AUTO_LOGIN_SESSION_KEY] === current) return 'auto_login_session'\n", '', 'sem exceção da sessão automática')] }, sPureRevocationRules, true],
  ['puro: senha vale como prova', { [PURE]: [replaceOnce("  if (!input.authMethods.some((method) => accepted.includes(method))) return 'not_proven'\n", '', 'sem checagem de amr')] }, sTakeoverGuard, true],
  ['puro: prova antes reabre o login automático', { [PURE]: [replaceOnce("  if (input.owner.emailProven === true) return { state: 'check_email', reason: 'already_used' }\n", '', 'sem emailProven')] }, sProofBeforeAutoLogin, true],
  // Com a troca da senha (admin), o Auth já derruba tudo; o signOut 'others' é o que derruba quando a troca FALHA.
  ['trava: carimba sem derrubar', { [GUARD]: [replaceOnce("    const { error: signOutError } = await input.supabase.auth.signOut({ scope: 'others' })\n", '    const signOutError = null\n', 'sem signOut others')] }, sScrambleFails, true],
  ['recuperação: porta aceita qualquer método', { [RECOVERY]: [replaceOnce("    acceptedMethods: ['recovery'],\n", '', 'sem amr recovery')] }, sRecoveryRevokes, true],
  ['callback: Google não derruba', { [CALLBACK]: [replaceOnce("          await revokeGuestSessionsOnce({ supabase, user: data.user, session: data.session, method: 'auth_callback', path: '/auth/callback' })\n", '', 'sem a trava na callback')] }, sCallbackRevokes, true],
  ['rota de acesso: sessão sem prova não registrada', { [ACCESS]: [replaceOnce('          ? await admin.auth.admin.updateUserById(ownerUserId, { app_metadata: { ...currentMeta, [GUEST_AUTO_LOGIN_SESSION_KEY]: autoSessionId } })\n', '          ? { error: null }\n', 'sem registro do id da sessão automática')] }, sNewAccount, true],
  ['rota de acesso: ignora a prova já feita', { [ACCESS]: [replaceOnce('        emailProven: Boolean(ownerMeta[GUEST_SESSIONS_REVOKED_AT_KEY]),\n', '        emailProven: false,\n', 'emailProven sempre falso')] }, sProofBeforeAutoLogin, true],
  // ── leva 3: a senha vira aleatória na 1ª prova ──
  ['trava: senha de quem pagou sobrevive', { [GUARD]: [replaceOnce('    const scramble = await scramblePassword({\n', '    const scramble = { password_scrambled: false } as { password_scrambled: boolean; password_scramble_error?: string; session_reentered?: boolean }\n    void ({\n', 'sem troca de senha')] }, sTakeoverGuard, true],
  ['trava: senha fraca/previsível', { [GUARD]: [replaceOnce("  return `${randomBytes(32).toString('base64url')}aZ7!`\n", "  return 'Kineo-2026!'\n", 'senha fixa')] }, sTakeoverGuard, true],
  ['trava: a dona sai junto (sem religar)', { [GUARD]: [replaceOnce('    if (input.email) {\n', '    if (false) {\n', 'sem religar a sessão da prova')] }, sCallbackRevokes, true],
  ['trava: senha que falha desfaz a derrubada', { [GUARD]: [replaceOnce('    if (!scramble.password_scrambled) console.error(', "    if (!scramble.password_scrambled) return { revoked: false, decision: 'error', passwordScrambled: false }\n    if (!scramble.password_scrambled) console.error(", 'falha da senha aborta')] }, sScrambleFails, true],
  ['recuperação: senha trocada pelo admin (mata a sessão da recuperação)', { [RECOVERY]: [replaceOnce("    passwordStrategy: 'own_session',\n", '', 'estratégia padrão (admin) na recuperação')] }, sRecoveryRevokes, true],
  // ── leva 2: e-mail "sua conta está pronta" ──
  ['webhook: conta nova sem o e-mail', { [WEBHOOK]: [replaceOnce('        // que a página /checkout/guest manda).\n        if (sendGuestReadyEmail) await sendGuestReadyEmail()\n', '        // que a página /checkout/guest manda).\n', 'sem envio no fim do Path B')] }, sReadyEmail, true],
  ['webhook: conta existente também recebe', { [WEBHOOK]: [replaceOnce('          if (guestOwner.created) {\n            const readyOwner = guestOwner', '          if (true) {\n            const readyOwner = guestOwner', 'e-mail para qualquer dono')] }, sExistingAccount, true],
  ['servidor: e-mail sem reserva (reenvio repete)', { [SERVER]: [replaceOnce("    const { error: claimError } = await input.admin.from('stripe_events').insert({ id: claimId })\n    if (claimError?.code === '23505') return 'duplicate'\n", '    const claimError = null as { code?: string } | null\n', 'sem reserva 1×/sessão')] }, sReadyEmail, true],
  ['servidor: preço no e-mail', { [SERVER]: [replaceOnce("    'If you did not buy a Kineo plan, reply to this email and we will sort it out.\\n\\n' +\n", "    'If you did not buy a Kineo plan, reply to this email and we will sort it out.\\n\\n' +\n    'Plan: Creator, $29.90/month.\\n\\n' +\n", 'preço literal no texto')] }, sReadyEmail, true],
  ['servidor: falha do Resend prende a reserva', { [SERVER]: [replaceOnce("      await release()\n      await event(GUEST_CHECKOUT_EVENTS.readyEmailFailed, { reason: 'resend_rejected', http_status: res.status })\n", "      await event(GUEST_CHECKOUT_EVENTS.readyEmailFailed, { reason: 'resend_rejected', http_status: res.status })\n", 'sem devolver a reserva')] }, sReadyEmailRetry, true],
  ['link do e-mail pronto: entra 2×', { [LINK]: [replaceOnce("    const { error: claimError } = await admin.from('stripe_events').insert({ id: readyClaim })\n    if (claimError) return failure // 23505 = já usado; outro erro = não arrisca um 2º uso\n", '', 'sem uso único')] }, sReadyEmail, true],
  ['token do e-mail: assinatura ignorada', { [GUARD]: [replaceOnce("  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return { ok: false, reason: 'bad_signature' }\n", '', 'sem assinatura')] }, sReadyEmail, true],
  ['token do e-mail: validade ignorada', { [GUARD]: [replaceOnce("  if (expiresAtSeconds <= input.nowSeconds) return { ok: false, reason: 'expired' }\n", '', 'sem validade')] }, sReadyEmail, true],
  // ── leva 4: a oferta de boas-vindas sem conta (5º campo = GUEST_WELCOME_PROMO_LIVE do cenário) ──
  // interruptor desligado = hoje byte a byte
  ['puro: oferta ignora o interruptor', { [PURE]: [replaceOnce('  return input.welcomePromoLive === true && input.welcomePromo === true\n', '  return input.welcomePromo === true\n', 'sem o interruptor da oferta')] }, sWelcomeSwitchOff, true, false],
  ['checkout: interruptor da oferta forçado na rota', { [CHECKOUT]: [replaceOnce('      welcomePromoLive: GUEST_WELCOME_PROMO_LIVE,\n', '      welcomePromoLive: true,\n', 'interruptor da oferta forçado')] }, sWelcomeSwitchOff, true, false],
  // outro cupom continua no cadastro
  ['checkout: qualquer cupom conta como boas-vindas', { [CHECKOUT]: [replaceOnce("      welcomePromo: promisedPublicPromo === 'welcome_first_month_20',\n", '      welcomePromo: rawPromo.length > 0,\n', 'todo cupom liberado')] }, sWelcomeOtherPromos, true, true],
  ['checkout: recorte Creator/Studio mensal ignorado', { [CHECKOUT]: [replaceOnce('    if (!guestWelcomePromoShapeOk({ tier: ctx.tier, isAnnual: ctx.isAnnual })) {\n', '    if (false) {\n', 'sem o recorte')] }, sWelcomeShapeParity, true, true],
  // falha da Stripe volta ao cadastro (nunca a preço cheio)
  ['checkout: oferta recusada vira compra a preço cheio', { [CHECKOUT]: [replaceOnce("    if (resolution.status === 'rejected') {\n      return { ok: false, failure: { reason: 'welcome_promo_unavailable', detail: publicPromoTruthMetadata(offer.kind, 'failed', resolution.reason) } }\n    }\n    welcome = {\n", "    if (resolution.status === 'rejected') {\n      welcome = null\n    } else welcome = {\n", 'recusa segue sem desconto')] }, sWelcomeStripeFailure, true, true],
  // visitante com WELCOME20 vai à Stripe com o desconto
  ['servidor: sessão sem o desconto', { [SERVER]: [replaceOnce('    ...(welcome ? { discounts: [{ promotion_code: welcome.promotionCodeId }] } : { allow_promotion_codes: true }),\n', '    ...(welcome ? {} : { allow_promotion_codes: true }),\n', 'sem discounts')] }, sWelcomeGuest, true, true],
  ['servidor: desconto junto com o campo manual', { [SERVER]: [replaceOnce('    ...(welcome ? { discounts: [{ promotion_code: welcome.promotionCodeId }] } : { allow_promotion_codes: true }),\n', '    ...(welcome ? { discounts: [{ promotion_code: welcome.promotionCodeId }] } : {}),\n    allow_promotion_codes: true,\n', 'discounts + campo manual')] }, sWelcomeGuest, true, true],
  // o webhook concede o mesmo grant e registra a oferta
  ['servidor: sessão sem o carimbo da oferta', { [SERVER]: [replaceOnce('      ...sharedMetadata,\n      ...welcomeMetadata,\n    },\n', '      ...sharedMetadata,\n    },\n', 'sem carimbo na sessão')] }, sWelcomeGrant, true, true],
  ['servidor: 1º mês com crédito de intro', { [SERVER]: [replaceOnce('        public_promo_first_charge_minor: String(welcome.firstChargeMinor),\n      }\n    : {}\n', "        public_promo_first_charge_minor: String(welcome.firstChargeMinor),\n        intro: '1',\n        intro_credits: '10',\n      }\n    : {}\n", 'grant de intro')] }, sWelcomeGrant, true, true],
  ['webhook: payment_success sem a oferta', { [WEBHOOK]: [replaceOnce('guest_checkout_version: GUEST_CHECKOUT_VERSION, ...guestWelcomePromoEventMetadata(session.metadata) } : {}),', 'guest_checkout_version: GUEST_CHECKOUT_VERSION } : {}),', 'evento sem a oferta')] }, sWelcomeGrant, true, true],
  // reuso grava guest_welcome_promo_reused e dispara o aviso
  ['puro: reuso ignora has_paid', { [PURE]: [replaceOnce("  if (profile.has_paid === true) return 'paid_before'\n", '', 'sem has_paid')] }, sWelcomeReuse, true, true],
  ['puro: reentrega vira falso reuso', { [PURE]: [replaceOnce('  if (profile.stripe_subscription_id && input.subscriptionId && profile.stripe_subscription_id === input.subscriptionId) return null\n', '', 'sem a trava da reentrega')] }, sWelcomeReuse, true, true],
  ['servidor: carimbo parcial conta como oferta', { [SERVER]: [replaceOnce('  return Object.entries(GUEST_WELCOME_APPLIED_STAMP).every(([key, value]) => metadata?.[key] === value)\n', '  return Object.entries(GUEST_WELCOME_APPLIED_STAMP).some(([key, value]) => metadata?.[key] === value)\n', 'carimbo parcial')] }, sWelcomePureRules, true, true],
  ['webhook: reuso sem o evento', { [WEBHOOK]: [replaceOnce("            const { error: reuseEventError } = await supabase.from('events').insert({\n", "            const { error: reuseEventError } = await supabase.from('events_descartado').insert({\n", 'evento em outra tabela')] }, sWelcomeReuse, true, true],
  ['webhook: reuso sem o aviso', { [WEBHOOK]: [replaceOnce("            await alertFounderOnce({\n              kind: 'guest_welcome_promo_reused',\n", "            void ({\n              kind: 'guest_welcome_promo_reused',\n", 'sem aviso')] }, sWelcomeReuse, true, true],
  ['webhook: falha ao gravar o reuso passa calada', { [WEBHOOK]: [replaceOnce('              throw new RetryableCheckoutAnalyticsError(`Guest welcome promo reuse not recorded', '              console.error(`Guest welcome promo reuse not recorded', 'falha engolida')] }, sWelcomeReuse, true, true],
  // KINEO-ANUNCIO-MOTOR-2026-10-07 — sem a cópia em qualquer uma das duas pontas, a compra perde a origem paga.
  ['rota: eventos de checkout sem o clique pago', { [CHECKOUT]: [replaceOnce('      metadata: { ...metadata, ...paidClickMetadataFromRequest() },\n', '      metadata,\n', 'eventRow sem o clique')] }, sPaidClick, true],
  ['webhook: payment_success sem o clique pago', { [WEBHOOK]: [replaceOnce('      ...paidClickMetadata,\n', '', 'payment_success sem o clique')] }, sPaidClick, true],
  // KINEO-MSCLKID-2026-10-08 — o módulo sem o msclkid: o clique do Bing chega ao pagamento sem identificador.
  ['módulo: clique pago sem o msclkid', { [PAID_CLICK]: [replaceOnce("export const PAID_CLICK_ID_TYPES = ['gclid', 'gbraid', 'wbraid', 'msclkid'] as const\n", "export const PAID_CLICK_ID_TYPES = ['gclid', 'gbraid', 'wbraid'] as const\n", 'sem msclkid')] }, sPaidClick, true],
]
for (const [name, transforms, scenario, live, welcomeLive = false] of MUTANTS) {
  let problems
  let applied = []
  try {
    const env = makeEnv({ live, welcomeLive, transforms })
    // Força a carga do módulo mutado ANTES do cenário, para a prova de aplicação existir mesmo se o cenário morrer cedo.
    for (const rel of Object.keys(transforms)) env.world.load(rel)
    applied = env.world.applied.filter((a) => !a.includes('GUEST_CHECKOUT_LIVE=') && !a.includes('GUEST_WELCOME_PROMO_LIVE='))
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
