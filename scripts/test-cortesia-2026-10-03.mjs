// KINEO-CORTESIA-2026-10-03 — guardião da CONTA CORTESIA, executando o código real:
//   (1) a regra pura (lib/courtesy.ts): só creator_trial/studio_trial, só conta sem plano, motivo obrigatório, tetos;
//   (2) as escritas (lib/courtesyStore.ts) num banco em memória: concede (plano anterior + fim + evento), recusa o
//       segundo clique, e o vencimento (dry-run não escreve; APPLY volta o plano anterior; quem assinou no meio fica);
//   (3) o PREDICADO DA ROTA DO MOTOR (isPaidUser de app/api/generate-video-cinematic/route.ts, extraído do fonte e
//       executado): cortesia ativa passa no Seedance; vencida é recusada (a rota recusa `!isPaidUser && !trialActive`);
//   (4) MRR/pagantes: com o plano mascarado, a conta não é pagante, não é trial de $1 e não soma MRR (mrr.ts real);
//   (5) cada tela que conta pagante/MRR mascara a cortesia; o cron é dry-run por padrão, force-no-store e fora do
//       vercel.json; a migration nova tem o nível travado no banco.
// Mutantes no fim: cada um precisa derrubar o guardião.
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(import.meta.url)
const ts = require(path.join(ROOT, 'node_modules', 'typescript'))
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n')
let pass = 0
let fail = 0
const ok = (c, m) => { if (c) { pass++; console.log('  ok  ' + m) } else { fail++; console.log('  FAIL ' + m) } }

function compile(source, imports = {}) {
  const box = { exports: {} }
  const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText
  vm.runInNewContext(js, {
    module: box, exports: box.exports, Date, Map, Set, Number, String, Math, JSON, Object, Array, Promise, Error, console,
    require: (id) => { if (Object.hasOwn(imports, id)) return imports[id]; throw Error('import sem dublê: ' + id) },
  })
  return box.exports
}

// ── banco em memória com o contrato do supabase-js que a store usa ──
class Q {
  constructor(db, t) { this.db = db; this.t = t; this.f = []; this.op = 'select'; this.cols = '*'; this.wantRows = false; this.sorters = [] }
  select(c = '*') { this.cols = c; this.wantRows = true; return this }
  eq(k, v) { this.f.push((r) => r[k] === v); return this }
  is(k, v) { this.f.push((r) => (r[k] ?? null) === v); return this }
  lte(k, v) { this.f.push((r) => String(r[k]) <= v); return this }
  order(k, { ascending = true } = {}) { this.sorters.push([k, ascending]); return this }
  range(from, to) { this.bounds = [from, to]; (this.db.ranges ??= []).push([from, to]); return this }
  limit(n) { this.max = n; return this }
  insert(v) { this.op = 'insert'; this.v = v; return this }
  update(v) { this.op = 'update'; this.v = v; return this }
  async run() {
    const list = this.db.t[this.t]
    if (!list) throw Error('tabela inesperada ' + this.t)
    if (this.op === 'insert') {
      if (this.t === 'courtesy_grants' && this.v.status === 'active' && list.some((r) => r.user_id === this.v.user_id && r.status === 'active')) return { data: null, error: { code: '23505' } }
      const row = { id: `${this.t}-${list.length + 1}`, ...this.v }
      list.push(row)
      return { data: [row], error: null }
    }
    let rows = list.filter((r) => this.f.every((fn) => fn(r)))
    if (this.db.failFrom != null && this.bounds?.[0] === this.db.failFrom) return { data: null, error: { message: 'página indisponível' } }
    rows.sort((a, b) => { for (const [k, asc] of this.sorters) { const n = a[k] < b[k] ? -1 : a[k] > b[k] ? 1 : 0; if (n) return asc ? n : -n } return 0 })
    if (this.op === 'update') rows.forEach((r) => Object.assign(r, this.v))
    if (this.max) rows = rows.slice(0, this.max)
    if (this.op === 'select') rows = rows.slice(this.bounds?.[0] ?? 0, this.bounds ? this.bounds[1] + 1 : 1000)
    return { data: rows.map((r) => ({ ...r })), error: null }
  }
  async maybeSingle() { const r = await this.run(); return { ...r, data: r.data?.[0] ?? null } }
  then(a, b) { return this.run().then(a, b) }
}
const newDb = (profiles) => ({ t: { profiles, courtesy_grants: [], events: [] }, from(t) { return new Q(this, t) } })

const REAL = {
  courtesy: read('lib/courtesy.ts'),
  store: read('lib/courtesyStore.ts'),
  cinematic: read('app/api/generate-video-cinematic/route.ts'),
  mrr: read('app/api/admin/_shared/mrr.ts'),
  cron: read('app/api/cron/courtesy-expire/route.ts'),
  adminRoute: read('app/api/admin/courtesy/route.ts'),
  overviewRoute: read('app/api/admin/overview/route.ts'),
  overviewPage: read('app/admin/overview/page.tsx'),
  payingPage: read('app/admin/paying/page.tsx'),
  ceo: read('app/api/admin/ceo/compute.ts'),
  users: read('app/api/admin/users/route.ts'),
  vercel: read('vercel.json'),
}
const MIGRATIONS = fs.readdirSync(path.join(ROOT, 'supabase/migrations')).filter((f) => /courtesy_grants/.test(f))

// O predicado isPaidUser EXATO da rota do motor, extraído do fonte (sem cópia).
function routePredicate(src) {
  const plans = src.match(/const PAID_PLANS = new Set\(\[[\s\S]*?\]\)/)
  const planVal = src.match(/const planVal = \(profile\?\.plan \?\? 'free'\) as string/)
  const paid = src.match(/const isPaidUser = [^\n]+/)
  if (!plans || !planVal || !paid) return null
  const body = ts.transpileModule(`${planVal[0]}\n${plans[0]}\n${paid[0]}\nreturn isPaidUser`, { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText
  return new Function('profile', body)
}

const DAY = 86400000
const NOW = Date.parse('2026-10-03T12:00:00Z')

async function problems(S) {
  const p = []
  let C, store, M
  try {
    C = compile(S.courtesy)
    const reads = compile(read('lib/supabase/readAll.ts'), { '../serverEvents': { writeServerEvent: async () => true } })
    store = compile(S.store, { '@/lib/courtesy': C, './supabase/readAll': reads })
    M = compile(S.mrr, {
      '@/lib/pricing': { PLANS: { starter: { price: 12.9 }, basic: { price: 29.9 }, pro: { price: 54.9 }, autopilot: { price: 299 }, autopilot_lite: { price: 59 } } },
      '@/lib/stripe': { stripe: {} },
      '@/lib/settlementCurrency': { BRL_PER_USD_HOUSE: 5 },
    })
  } catch (e) { return ['módulos não compilam: ' + e.message] }

  // (1) regra pura
  const free = { id: 'u1', plan: 'free', video_credits: 10, has_paid: false }
  const base = { level: 'creator_trial', credits: 25, days: 30, reason: 'parceiro de conteúdo' }
  if (!C.validateCourtesyRequest(base, free, false).ok) p.push('pedido válido recusado')
  for (const lvl of ['creator', 'studio', 'pro', 'basic', 'starter']) if (C.validateCourtesyRequest({ ...base, level: lvl }, free, false).ok) p.push(`plano cheio "${lvl}" aceito como cortesia`)
  for (const plan of ['creator', 'basic', 'pro', 'starter', 'studio', 'basic_trial', 'autopilot']) if (C.validateCourtesyRequest(base, { ...free, plan }, false).ok) p.push(`cortesia por cima de plano "${plan}"`)
  if (C.validateCourtesyRequest({ ...base, reason: '  ' }, free, false).ok) p.push('cortesia sem motivo')
  if (C.validateCourtesyRequest({ ...base, credits: C.COURTESY_MAX_CREDITS + 1 }, free, false).ok) p.push('teto de créditos furado')
  if (C.validateCourtesyRequest({ ...base, days: C.COURTESY_MAX_DAYS + 1 }, free, false).ok) p.push('teto de dias furado')
  if (C.validateCourtesyRequest(base, free, true).ok) p.push('segunda cortesia ativa aceita')
  if (!C.validateCourtesyRequest(base, { ...free, plan: null }, false).ok) p.push('conta com plano nulo recusada')

  // (2) escritas — concede
  const db = newDb([{ id: 'u1', plan: 'free', video_credits: 10, has_paid: false }, { id: 'u2', plan: 'creator', video_credits: 80, has_paid: true }])
  const g = await store.grantCourtesy(db, { userId: 'u1', ...base, grantedBy: 'admin@test', source: 'admin', nowMs: NOW })
  const prof = db.t.profiles[0]
  const row = db.t.courtesy_grants[0]
  if (!g.ok) p.push('concessão falhou: ' + g.error)
  if (prof.plan !== 'creator_trial' || prof.video_credits !== 35) p.push(`perfil depois da cortesia errado (${prof.plan}/${prof.video_credits})`)
  if (!row || row.previous_plan !== 'free' || row.credits_before !== 10 || row.ends_at !== new Date(NOW + 30 * DAY).toISOString() || row.status !== 'active') p.push('linha da cortesia sem plano anterior/fim/estado')
  const ev = db.t.events.find((e) => e.name === 'admin_courtesy_granted')
  if (!ev || ev.metadata.reason !== base.reason || ev.metadata.level !== 'creator_trial' || ev.metadata.ends_at !== row?.ends_at) p.push('evento admin_courtesy_granted ausente ou incompleto')
  const again = await store.grantCourtesy(db, { userId: 'u1', ...base, grantedBy: 'admin@test', source: 'admin', nowMs: NOW })
  if (again.ok || db.t.courtesy_grants.length !== 1 || prof.video_credits !== 35) p.push('segundo clique deu outra cortesia')
  const paying = await store.grantCourtesy(db, { userId: 'u2', ...base, grantedBy: 'admin@test', source: 'admin', nowMs: NOW })
  if (paying.ok || db.t.profiles[1].plan !== 'creator') p.push('cortesia rebaixou um assinante')

  // (3) predicado da rota do motor
  const isPaidUser = routePredicate(S.cinematic)
  if (!isPaidUser) return [...p, 'isPaidUser/PAID_PLANS da rota do motor não encontrados']
  if (!/if \(!isPaidUser && !trialActive\) \{/.test(S.cinematic)) p.push('rota do motor perdeu a recusa de conta sem plano')
  if (!isPaidUser({ ...prof })) p.push('cortesia ativa NÃO passa no Seedance (isPaidUser falso)')
  if (isPaidUser({ id: 'x', plan: 'free', has_paid: false })) p.push('conta free passa no motor (predicado mudou)')

  // vencimento: antes do prazo nada; dry-run não escreve; APPLY volta o plano
  const early = await store.expireCourtesies(db, { apply: true, limit: 50, nowMs: NOW + 29 * DAY })
  if (early.rows.length || prof.plan !== 'creator_trial') p.push('cortesia venceu antes do prazo')
  prof.video_credits = 20 // gastou 15
  const dry = await store.expireCourtesies(db, { apply: false, limit: 50, nowMs: NOW + 31 * DAY })
  if (dry.rows.length !== 1 || dry.rows[0].applied || prof.plan !== 'creator_trial') p.push('dry-run escreveu ou não listou')
  const applied = await store.expireCourtesies(db, { apply: true, limit: 50, nowMs: NOW + 31 * DAY, rule: 'keep' })
  if (applied.rows[0]?.applied !== true || prof.plan !== 'free' || prof.video_credits !== 20) p.push(`vencimento (regra keep) errado: ${prof.plan}/${prof.video_credits}`)
  if (row.status !== 'expired' || !db.t.events.some((e) => e.name === 'admin_courtesy_expired')) p.push('cortesia vencida sem estado/evento')
  if (isPaidUser({ ...prof })) p.push('cortesia VENCIDA ainda passa no motor')

  // regra recomendada: tira só a sobra DA cortesia; quem já tinha saldo não perde o dele
  const grant = { id: 'g', user_id: 'u', level: 'creator_trial', previous_plan: null, credits_granted: 25, credits_before: 10, had_paid_before: false, ends_at: new Date(NOW).toISOString(), status: 'active' }
  const r1 = C.planCourtesyExpiry(grant, { id: 'u', plan: 'creator_trial', video_credits: 20, has_paid: false }, NOW + 1, 'remove_courtesy_leftover')
  if (r1.action !== 'revert' || r1.creditsRemoved !== 10 || r1.balanceAfter !== 10 || r1.plan !== 'free') p.push('regra "sobra da cortesia" errada (20 de saldo, 10 eram dele → tira 10)')
  const r2 = C.planCourtesyExpiry(grant, { id: 'u', plan: 'creator_trial', video_credits: 5, has_paid: false }, NOW + 1, 'remove_courtesy_leftover')
  if (r2.creditsRemoved !== 0) p.push('regra tirou crédito que era da pessoa')
  const r3 = C.planCourtesyExpiry(grant, { id: 'u', plan: 'creator_trial', video_credits: 40, has_paid: true }, NOW + 1, 'remove_courtesy_leftover')
  if (r3.creditsRemoved !== 0) p.push('quem comprou no meio perdeu crédito')
  const r4 = C.planCourtesyExpiry(grant, { id: 'u', plan: 'basic', video_credits: 150, has_paid: true }, NOW + 1, 'remove_courtesy_leftover')
  if (r4.action !== 'supersede') p.push('quem assinou no meio foi rebaixado')
  if (C.COURTESY_LEFTOVER_RULE !== 'remove_courtesy_leftover') p.push('regra do saldo diverge da decisão do fundador de 05/10 (esperado remove_courtesy_leftover)')

  // (4) MRR / pagantes / trial de $1
  const live = { id: 'c1', plan: 'creator_trial', email: 'c@x.test' }
  const masked = C.maskCourtesyPlans([live, { id: 'p1', plan: 'basic' }], [{ user_id: 'c1', level: 'creator_trial', previous_plan: null }])
  if (masked[0].plan !== 'free' || masked[1].plan !== 'basic') p.push('máscara do placar errada')
  if (M.isPaidPlan(masked[0].plan) || M.isTrialPlan(masked[0].plan)) p.push('cortesia conta como pagante/trial de $1 no placar')
  const mrr = M.paidMrrForProfiles(masked, new Map())
  if (mrr.counted !== 1 || Math.abs(mrr.mrrUsd - 29.9) > 0.001) p.push(`MRR com cortesia errado (${mrr.counted} pagantes, $${mrr.mrrUsd})`)
  if (M.isPayingPlan('creator_trial') || M.isPayingPlan('studio_trial')) p.push('nível de cortesia virou pagante em mrr.ts')
  // quem assinou durante a cortesia CONTA (plano dele é verdade)
  if (C.maskCourtesyPlans([{ id: 'c1', plan: 'basic' }], [{ user_id: 'c1', level: 'creator_trial', previous_plan: null }])[0].plan !== 'basic') p.push('máscara escondeu quem virou assinante')

  // (5) fiação
  const large = newDb([])
  large.t.courtesy_grants = Array.from({ length: 1201 }, (_, i) => ({ id: String(i).padStart(5, '0'), user_id: 'u' + i, level: 'creator_trial', previous_plan: 'free', status: 'active' }))
  const grants = await store.loadActiveCourtesyGrants(large)
  if (grants.length !== 1201 || new Set(grants.map((g) => g.user_id)).size !== 1201 || JSON.stringify(large.ranges) !== '[[0,999],[1000,1999]]') p.push('cortesias truncadas: readAll real precisa ler duas páginas')
  large.failFrom = 1000
  let rejected = false
  try { await store.loadActiveCourtesyGrants(large) } catch { rejected = true }
  if (!rejected) p.push('falha na segunda página das cortesias devolveu resultado parcial')
  const surfaces = { overviewRoute: 'app/api/admin/overview/route.ts', overviewPage: 'app/admin/overview/page.tsx', payingPage: 'app/admin/paying/page.tsx', ceo: 'app/api/admin/ceo/compute.ts', users: 'app/api/admin/users/route.ts' }
  for (const [k, f] of Object.entries(surfaces)) {
    if (!/maskCourtesyPlans\(/.test(S[k]) || !/loadActiveCourtesyGrants\(admin(?:,\s*'[^']+')?\)/.test(S[k])) p.push(`${f} conta pagante/MRR sem mascarar a cortesia`)
  }
  if (!/searchParams\.get\('confirm'\) === 'APPLY'/.test(S.cron) || !/expireCourtesies\(admin, \{ apply,/.test(S.cron)) p.push('cron sem trava ?confirm=APPLY')
  if (!/export const fetchCache = 'force-no-store'/.test(S.cron)) p.push('cron sem force-no-store')
  if (!S.vercel.includes('/api/cron/courtesy-expire?confirm=APPLY')) p.push('cron de validade da cortesia fora do vercel.json (decisão I do fundador, 05/10: a cortesia vence)')
  if (!/grantCourtesy\(admin,/.test(S.adminRoute) || !/isAdminEmail\(user\.email\)/.test(S.adminRoute)) p.push('rota do admin sem trava de admin ou sem a store')
  if (!/update\(\{ plan: v\.value\.level/.test(S.store)) p.push('store não grava o nível validado no plano')
  const mig = MIGRATIONS.map((f) => [f, read('supabase/migrations/' + f)])
  if (!mig.length) p.push('migration courtesy_grants ausente')
  for (const [f, sql] of mig) {
    if (f.slice(0, 14) < '20261003120000') p.push('migration com timestamp antigo: ' + f)
    if (!/check \(level in \('creator_trial', 'studio_trial'\)\)/.test(sql)) p.push('banco não trava o nível em *_trial')
    if (!/where status = 'active'/.test(sql)) p.push('banco sem "uma ativa por pessoa"')
  }
  return p
}

const real = await problems(REAL)
ok(real.length === 0, 'cortesia real: regra, escritas, motor, MRR, telas e cron' + (real.length ? ' — ' + real.join(' | ') : ''))

const mutants = [
  ['aceita plano cheio', { courtesy: REAL.courtesy.replace("if (!isCourtesyLevel(input.level)) return", "if (false) return") }],
  ['aceita conta com plano', { courtesy: REAL.courtesy.replace("const p = norm(plan)\n  return p === '' || p === 'free'", "return true") }],
  ['vencimento devolve o nível em vez do plano anterior', { courtesy: REAL.courtesy.replace("plan: isPlanlessAccount(previous) ? 'free' : previous,", "plan: grant.level,") }],
  ['máscara do placar desligada', { courtesy: REAL.courtesy.replace("if (!activeGrants.length) return profiles", "return profiles") }],
  ['tela /admin/paying sem máscara', { payingPage: REAL.payingPage.replace('maskCourtesyPlans(profilesRaw, courtesy)', 'profilesRaw') }],
  ['cron aplica sem confirm', { cron: REAL.cron.replace("searchParams.get('confirm') === 'APPLY'", "searchParams.get('confirm') !== 'NOPE'") }],
  ['store grava plano cheio', { store: REAL.store.replace('update({ plan: v.value.level, video_credits: after })', "update({ plan: 'creator', video_credits: after })") }],
  ['sobra tira tudo', { courtesy: REAL.courtesy.replace('creditsRemoved = Math.max(0, Math.min(grant.credits_granted ?? 0, leftover))', 'creditsRemoved = balance') }],
  ['dry-run escreve', { store: REAL.store.replace('    if (!opts.apply) {\n      rows.push', '    if (false) {\n      rows.push') }],
  ['motor deixa de aceitar *_trial', { cinematic: REAL.cinematic.replace("'pro', 'pro_trial', 'creator', 'creator_trial', 'studio', 'studio_trial',", "'pro', 'creator', 'studio',") }],
]
for (const [name, patch] of mutants) {
  const k = Object.keys(patch)[0]
  if (patch[k] === REAL[k]) { ok(false, `mutante "${name}" não alterou o fonte (âncora sumiu)`); continue }
  let caught = false
  try { caught = (await problems({ ...REAL, ...patch })).length > 0 } catch { caught = true }
  ok(caught, 'mutante derrubado: ' + name)
}
console.log(`\n${pass} ok · ${fail} falhas`)
process.exit(fail ? 1 : 0)
