// KINEO-CORTESIA-METRICA-1410 — guardião: CORTESIA NÃO É "TRIAL CONVERTIDO" (fundador 14/10, "6 sim").
// O defeito (medido 14/10): grantCourtesy trocava plano/saldo e deixava o teste reverso 'active'. O cron trial-downgrade
// via o plano creator_trial como pagante (isPayingProfile) e carimbava 'converted' em quem nunca pagou (alanhlm90 08/10,
// robertoberto2343 14/10); e os débitos da cortesia seguiam somando no teto do teste e disparavam trial_expired credit_cap.
// Prova EXECUTANDO o código real (lib/courtesyStore.ts, lib/courtesy.ts, lib/reverseTrial.ts) num banco em memória,
// lado a lado com a versão do PAI do primeiro commit marcado (a "base"):
//   (1) conceder cortesia FECHA o teste aberto ('active'/'expired' → 'courtesy'), créditos = antes + concedidos (igual à
//       base), e não mexe em nenhum outro status (null/downgraded/converted/region_paid_only/card_required/courtesy);
//   (2) o cron NÃO conta cortesia como convertido: conta creator_trial sem has_paid com cortesia ativa vira 'courtesy',
//       saldo e trial_credits_used intactos; a base carimbava 'converted' (o defeito reproduzido);
//   (3) TRIAL DE VERDADE IDÊNTICO: 11 cenários do cron (não-pagante relógio/teto, has_paid, plano pago sem has_paid,
//       trial de cartão, cortesia vencida, ainda correndo, terminais, região, saldo nulo) — desfecho, linha final, escritas
//       e eventos iguais à base; a tabela courtesy_grants só é consultada no caso ambíguo (parece pagante sem has_paid);
//   (4) depois da cortesia, débito não soma no teto nem dispara trial_expired (a base disparava credit_cap);
//   (5) 'courtesy' é terminal para o cron (fora da coorte, motivo 'terminal').
// Mutantes no fim: cada um precisa derrubar o guardião.
import fs from 'node:fs'
import path from 'node:path'
import { execSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
process.chdir(ROOT)
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n')
const MARK = 'KINEO-CORTESIA-METRICA-1410'
const FILES = { courtesy: 'lib/courtesy.ts', store: 'lib/courtesyStore.ts', rt: 'lib/reverseTrial.ts' }

// Base = pai do PRIMEIRO commit marcado (antes do commit existir: HEAD).
function baseRef() {
  try {
    const shas = execSync(`git log --format=%H --grep=${MARK} --reverse`, { encoding: 'utf8' }).trim().split('\n').filter(Boolean)
    return shas.length ? `${shas[0]}^` : 'HEAD'
  } catch { return 'HEAD' }
}
const BASE = baseRef()
const showBase = (rel) => execSync(`git show ${BASE}:${rel}`, { encoding: 'utf8', maxBuffer: 64 << 20 }).replace(/\r\n/g, '\n')
const BASE_SRC = Object.fromEntries(Object.entries(FILES).map(([k, rel]) => [rel, showBase(rel)]))

const NOW = Date.parse('2026-10-14T18:00:00Z')
class DataFixa extends Date {
  constructor(...a) { super(...(a.length ? a : [NOW])) }
  static now() { return NOW }
}
const DAY = 86400000
const iso = (ms) => new Date(ms).toISOString()

// ── banco em memória com o contrato do supabase-js usado pelos três arquivos ──
class Q {
  constructor(db, t) { this.db = db; this.t = t; this.f = []; this.desc = []; this.op = 'select'; this.max = 0 }
  select() { return this }
  eq(k, v) { this.f.push((r) => r[k] === v); this.desc.push(`${k}=${v}`); return this }
  is(k, v) { this.f.push((r) => (r[k] ?? null) === v); this.desc.push(`${k} is ${v}`); return this }
  in(k, vs) { this.f.push((r) => vs.includes(r[k])); this.desc.push(`${k} in ${vs}`); return this }
  lte(k, v) { this.f.push((r) => String(r[k]) <= v); return this }
  order() { return this }
  limit(n) { this.max = n; return this }
  insert(v) { this.op = 'insert'; this.v = v; return this }
  update(v) { this.op = 'update'; this.v = v; return this }
  async run() {
    const list = this.db.t[this.t]
    if (!list) throw Error('tabela inesperada ' + this.t)
    this.db.log.push({ t: this.t, op: this.op, where: this.desc.join('&'), v: this.v ? JSON.stringify(this.v) : undefined })
    if (this.op === 'select' && this.db.failRead?.[this.t]) return { data: null, error: { message: 'leitura falhou' } }
    if (this.op === 'insert') {
      if (this.t === 'courtesy_grants' && this.v.status === 'active' && list.some((r) => r.user_id === this.v.user_id && r.status === 'active')) return { data: null, error: { code: '23505' } }
      const row = { id: `${this.t}-${list.length + 1}`, ...this.v }
      list.push(row)
      return { data: [{ ...row }], error: null }
    }
    if (this.op === 'update' && this.t === 'profiles' && this.db.beforeProfileUpdate) { const h = this.db.beforeProfileUpdate; this.db.beforeProfileUpdate = null; h(this.db) }
    let rows = list.filter((r) => this.f.every((fn) => fn(r)))
    if (this.op === 'update') rows.forEach((r) => Object.assign(r, this.v))
    if (this.max) rows = rows.slice(0, this.max)
    return { data: rows.map((r) => ({ ...r })), error: null }
  }
  async maybeSingle() { const r = await this.run(); return { ...r, data: r.data?.[0] ?? null } }
  then(a, b) { return this.run().then(a, b) }
}
const newDb = (profiles, grants = []) => ({
  t: { profiles: profiles.map((p) => ({ ...p })), courtesy_grants: grants.map((g) => ({ ...g })), events: [] },
  log: [],
  from(t) { return new Q(this, t) },
})

// ── carregadores: atual (disco) e base (pai do commit), com dublês de banco e de evento ──
function loaderFor(which, over, db, events) {
  const srv = { writeServerEvent: async (e) => { events.push(e); return true } }
  return createOfflineLoader({
    env: { KINEO_REVERSE_TRIAL_ENABLED: 'true', NEXT_PUBLIC_SUPABASE_URL: 'https://x.invalid', SUPABASE_SERVICE_ROLE_KEY: 'k' },
    globals: { Date: DataFixa },
    mocks: { '@supabase/supabase-js': { createClient: () => db }, '@/lib/serverEvents': srv, '../serverEvents': srv, './serverEvents': srv },
    source: (rel, text) => {
      if (which === 'base') return BASE_SRC[rel] ?? text // a base nunca recebe mutante
      if (over?.[rel] != null) return over[rel]
      return text
    },
  })
}
function mods(which, over, db, events) {
  const L = loaderFor(which, over, db, events)
  return { RT: L(FILES.rt), S: L(FILES.store), C: L(FILES.courtesy) }
}

const UID = 'u-1'
const baseProfile = (o = {}) => ({
  id: UID, email: 'pessoa@example.com', plan: 'free', has_paid: false, video_credits: 7,
  trial_status: 'active', trial_ends_at: iso(NOW + 2 * DAY), trial_credits_used: 3, trial_credits_granted: 10, trial_variant: '3d',
  stripe_subscription_id: null, trial_downgraded_at: null, ...o,
})
const activeGrant = (o = {}) => ({ id: 'g-1', user_id: UID, level: 'creator_trial', previous_plan: 'free', credits_granted: 25, credits_before: 7, had_paid_before: false, ends_at: iso(NOW + 30 * DAY), status: 'active', ...o })
const GRANT_INPUT = { userId: UID, level: 'creator_trial', credits: 25, days: 30, reason: 'parceiro de conteúdo', grantedBy: 'ceo', source: 'admin', nowMs: NOW }

async function runGrant(which, over, profile) {
  const db = newDb([profile]); const events = []
  const { S } = mods(which, over, db, events)
  const r = await S.grantCourtesy(db, GRANT_INPUT)
  return { r, db, row: db.t.profiles[0], ev: db.t.events }
}
async function runCron(which, over, profile, grants = [], opts = {}) {
  const db = newDb([profile], grants); const events = []
  if (opts.failGrantsRead) db.failRead = { courtesy_grants: true }
  const { RT } = mods(which, over, db, events)
  const out = await RT.downgradeExpiredTrial(db, UID, NOW)
  return { out, db, row: db.t.profiles[0], events, writes: db.log.filter((l) => l.op !== 'select'), grantReads: db.log.filter((l) => l.t === 'courtesy_grants').length }
}
const J = (x) => JSON.stringify(x)

async function problems(over = {}) {
  const p = []
  try { mods('cur', over, newDb([]), []) } catch (e) { return ['módulos não carregam: ' + e.message] }

  // ── (1) conceder cortesia fecha o teste aberto ──
  for (const st of ['active', 'expired']) {
    const cur = await runGrant('cur', over, baseProfile({ trial_status: st }))
    const base = await runGrant('base', over, baseProfile({ trial_status: st }))
    if (!cur.r.ok) { p.push(`(1) concessão recusada com teste '${st}': ${cur.r.error}`); continue }
    if (cur.row.trial_status !== 'courtesy') p.push(`(1) teste '${st}' não fechou na concessão (ficou '${cur.row.trial_status}')`)
    if (cur.row.video_credits !== 7 + 25 || cur.row.video_credits !== base.row.video_credits) p.push(`(1) créditos mexidos ao fechar o teste '${st}' (${cur.row.video_credits}, base ${base.row.video_credits})`)
    if (cur.row.plan !== 'creator_trial' || cur.row.plan !== base.row.plan) p.push(`(1) plano diferente da base com teste '${st}'`)
    for (const k of ['trial_credits_used', 'trial_credits_granted', 'trial_ends_at', 'trial_downgraded_at']) if (cur.row[k] !== base.row[k]) p.push(`(1) concessão mexeu em ${k}`)
    const ev = cur.ev.find((e) => e.name === 'admin_courtesy_granted')
    if (ev?.metadata?.trial_closed_from !== st) p.push(`(1) evento admin_courtesy_granted sem trial_closed_from='${st}'`)
    if (base.row.trial_status !== st) p.push(`(1) a base já fechava o teste? (${base.row.trial_status}) — o guardião não mede o defeito`)
  }
  // status que NÃO é teste aberto: tudo igual à base, byte a byte (linha, evento, escritas)
  for (const st of [null, 'downgraded', 'converted', 'region_paid_only', 'card_required', 'courtesy']) {
    const cur = await runGrant('cur', over, baseProfile({ trial_status: st }))
    const base = await runGrant('base', over, baseProfile({ trial_status: st }))
    if (J(cur.row) !== J(base.row)) p.push(`(1) status '${st}': perfil final difere da base`)
    if (J(cur.ev) !== J(base.ev)) p.push(`(1) status '${st}': evento difere da base`)
    const w = (x) => J(x.db.log.filter((l) => l.op !== 'select'))
    if (w(cur) !== w(base)) p.push(`(1) status '${st}': escritas diferem da base`)
  }
  // corrida: o status do teste muda entre a leitura e a escrita → nada é dado (CAS no status)
  {
    const db = newDb([baseProfile({ trial_status: 'active' })]); const events = []
    db.beforeProfileUpdate = (d) => { d.t.profiles[0].trial_status = 'converted' }
    const { S } = mods('cur', over, db, events)
    const r = await S.grantCourtesy(db, GRANT_INPUT)
    if (r.ok || db.t.profiles[0].trial_status !== 'converted' || db.t.profiles[0].video_credits !== 7) p.push('(1) corrida: a concessão escreveu por cima de um status de teste que mudou')
  }

  // ── (2) cron: cortesia não é conversão ──
  const cortesiaVencida = baseProfile({ plan: 'creator_trial', video_credits: 60, trial_status: 'active', trial_ends_at: iso(NOW - DAY), trial_credits_used: 9 })
  const cortesiaTeto = baseProfile({ plan: 'creator_trial', video_credits: 74, trial_status: 'expired', trial_credits_used: 35 })
  for (const [label, prof] of [['relógio (sp1962054)', cortesiaVencida], ['teto (robertoberto2343)', cortesiaTeto]]) {
    const cur = await runCron('cur', over, prof, [activeGrant()])
    const base = await runCron('base', over, prof, [activeGrant()])
    if (base.out.action !== 'converted') p.push(`(2) ${label}: a base não reproduz o defeito (${base.out.action})`)
    if (cur.out.action === 'converted' || cur.row.trial_status === 'converted') p.push(`(2) ${label}: cortesia contada como trial convertido`)
    if (cur.out.action !== 'courtesy' || cur.row.trial_status !== 'courtesy') p.push(`(2) ${label}: desfecho não é 'courtesy' (${cur.out.action}/${cur.row.trial_status})`)
    if (cur.row.video_credits !== prof.video_credits || cur.out.creditsRevoked !== 0) p.push(`(2) ${label}: o cron mexeu no saldo da cortesia`)
    if (cur.row.trial_credits_used !== prof.trial_credits_used || cur.row.plan !== prof.plan) p.push(`(2) ${label}: o cron mexeu em plano/consumo`)
    const ev = cur.events.find((e) => e.name === 'trial_downgraded')
    if (ev?.metadata?.outcome !== 'courtesy' || ev?.metadata?.credits_revoked !== 0) p.push(`(2) ${label}: evento trial_downgraded sem outcome 'courtesy'`)
  }
  // leitura da cortesia falhou: adia, não carimba terminal no escuro
  {
    const cur = await runCron('cur', over, cortesiaVencida, [activeGrant()], { failGrantsRead: true })
    if (cur.out.action !== 'skipped' || cur.row.trial_status !== 'active' || cur.writes.length) p.push('(2) leitura de courtesy_grants falhou e o cron escreveu mesmo assim')
  }
  // pedro (cortesia por SQL 14/10, teste já 'downgraded' 16 min antes): o cron não toca
  {
    const pedro = baseProfile({ plan: 'creator_trial', video_credits: 104, trial_status: 'downgraded', trial_ends_at: iso(NOW - DAY), trial_credits_used: 10 })
    const cur = await runCron('cur', over, pedro, [activeGrant()])
    if (cur.out.action !== 'skipped' || cur.writes.length || cur.row.trial_status !== 'downgraded') p.push('(2) cortesia por SQL com teste já downgraded foi reprocessada')
  }

  // ── (3) trial de verdade: idêntico à base ──
  const REAIS = [
    ['não-pagante, relógio', baseProfile({ trial_ends_at: iso(NOW - DAY) }), [], false],
    ['não-pagante, teto', baseProfile({ trial_status: 'expired', trial_credits_used: 10, video_credits: 0 }), [], false],
    ['não-pagante, teto com saldo', baseProfile({ trial_status: 'expired', trial_credits_used: 10, video_credits: 5, trial_credits_granted: 10 }), [], false],
    ['has_paid true (comprou)', baseProfile({ has_paid: true, plan: 'starter', trial_ends_at: iso(NOW - DAY) }), [], false],
    ['has_paid true + cortesia ativa (pagou antes)', baseProfile({ has_paid: true, plan: 'creator_trial', trial_ends_at: iso(NOW - DAY) }), [activeGrant()], false],
    ['plano pago sem has_paid, sem cortesia', baseProfile({ plan: 'pro', trial_ends_at: iso(NOW - DAY) }), [], true],
    ['trial de cartão (creator_trial + assinatura), sem cortesia', baseProfile({ plan: 'creator_trial', stripe_subscription_id: 'sub_1', trial_ends_at: iso(NOW - DAY) }), [], true],
    ['creator_trial com cortesia VENCIDA', baseProfile({ plan: 'creator_trial', trial_ends_at: iso(NOW - DAY) }), [activeGrant({ status: 'expired' })], true],
    ['cortesia de OUTRA pessoa', baseProfile({ plan: 'creator_trial', trial_ends_at: iso(NOW - DAY) }), [activeGrant({ user_id: 'u-2' })], true],
    ['ainda correndo', baseProfile(), [], false],
    ['saldo nulo', baseProfile({ trial_ends_at: iso(NOW - DAY), video_credits: null }), [], false],
  ]
  for (const st of ['downgraded', 'converted', 'region_paid_only', 'card_required', null]) REAIS.push([`status ${st}`, baseProfile({ trial_status: st, trial_ends_at: iso(NOW - DAY) }), [], false])
  for (const [label, prof, grants, ambiguous] of REAIS) {
    const cur = await runCron('cur', over, prof, grants)
    const base = await runCron('base', over, prof, grants)
    if (J(cur.out) !== J(base.out)) p.push(`(3) ${label}: desfecho ${J(cur.out)} ≠ base ${J(base.out)}`)
    if (J(cur.row) !== J(base.row)) p.push(`(3) ${label}: linha final difere da base`)
    if (J(cur.writes) !== J(base.writes)) p.push(`(3) ${label}: escritas diferem da base`)
    if (J(cur.events) !== J(base.events)) p.push(`(3) ${label}: eventos diferem da base`)
    if (!ambiguous && cur.grantReads !== 0) p.push(`(3) ${label}: consultou courtesy_grants sem precisar (${cur.grantReads})`)
    if (ambiguous && cur.grantReads !== 1) p.push(`(3) ${label}: caso ambíguo sem a consulta única à cortesia (${cur.grantReads})`)
  }
  // predicados puros do cron iguais à base para todo status de teste real
  {
    const c = mods('cur', over, newDb([]), []).RT, b = mods('base', over, newDb([]), []).RT
    for (const st of ['active', 'expired', 'downgraded', 'converted', 'region_paid_only', 'card_required', null]) {
      for (const ends of [NOW - DAY, NOW + DAY]) {
        const row = baseProfile({ trial_status: st, trial_ends_at: iso(ends) })
        if (c.trialNeedsDowngrade(row, NOW) !== b.trialNeedsDowngrade(row, NOW)) p.push(`(3) trialNeedsDowngrade mudou para '${st}'`)
        if (c.trialDowngradeSkipReason(row, NOW) !== b.trialDowngradeSkipReason(row, NOW)) p.push(`(3) motivo de descarte mudou para '${st}'`)
        if (J(c.trialUiState(row, NOW)) !== J(b.trialUiState(row, NOW))) p.push(`(3) trialUiState mudou para '${st}'`)
      }
    }
    if (c.isPayingProfile({ plan: 'creator_trial', has_paid: false }) !== true) p.push('(3) isPayingProfile mudou (não era para mexer)')
    // ── (5) 'courtesy' é terminal para o cron ──
    if (c.trialDowngradeSkipReason(baseProfile({ trial_status: 'courtesy', trial_ends_at: iso(NOW - DAY) }), NOW) !== 'terminal') p.push("(5) 'courtesy' não é terminal para o cron")
    if (![...c.TRIAL_TERMINAL_STATUSES].includes('courtesy') || !['downgraded', 'converted'].every((s) => c.TRIAL_TERMINAL_STATUSES.includes(s))) p.push('(5) TRIAL_TERMINAL_STATUSES sem courtesy (ou perdeu um terminal antigo)')
    if (J([...c.TRIAL_OPEN_STATUSES]) !== J([...b.TRIAL_OPEN_STATUSES])) p.push('(5) TRIAL_OPEN_STATUSES mudou')
    const C = mods('cur', over, newDb([]), []).C
    if (J([...C.COURTESY_CLOSES_TRIAL_FROM]) !== J([...c.TRIAL_OPEN_STATUSES])) p.push('(1) a cortesia fecha uma lista diferente dos status abertos do teste')
    if (C.COURTESY_TRIAL_STATUS !== c.TRIAL_COURTESY_STATUS) p.push('(1) status de cortesia diferente entre courtesy.ts e reverseTrial.ts')
  }
  const rota = (over['app/api/cron/trial-downgrade/route.ts'] ?? read('app/api/cron/trial-downgrade/route.ts'))
  if (!/const terminalFilter = `\(\$\{TRIAL_TERMINAL_STATUSES\.join\(','\)\}\)`/.test(rota)) p.push('(5) a coorte do cron não lê mais TRIAL_TERMINAL_STATUSES')

  // ── (4) depois da cortesia, débito não conta no teto nem dispara trial_expired ──
  for (const which of ['cur', 'base']) {
    const db = newDb([baseProfile({ trial_status: 'active', trial_credits_used: 9 })]); const events = []
    const { S, RT } = mods(which, over, db, events)
    const g = await S.grantCourtesy(db, GRANT_INPUT)
    if (!g.ok) { p.push(`(4) ${which}: concessão falhou`); continue }
    await RT.recordReverseTrialDebit(UID, 5)
    const expired = events.filter((e) => e.name === 'trial_expired')
    if (which === 'cur') {
      if (expired.length) p.push(`(4) débito da cortesia disparou trial_expired ${expired[0].metadata?.reason}`)
      if (db.t.profiles[0].trial_credits_used !== 9) p.push('(4) débito da cortesia somou no teto do teste')
      if (db.t.profiles[0].video_credits !== 7 + 25) p.push('(4) saldo mexido pela contabilidade do teste')
    } else if (!expired.some((e) => e.metadata?.reason === 'credit_cap')) p.push('(4) a base não reproduz o trial_expired credit_cap da cortesia')
  }
  return p
}

let fail = 0
const real = await problems()
if (real.length) { fail++; console.log('FAIL no código real:'); for (const x of real) console.log('  ✗ ' + x) } else console.log(`ok código real (base = ${BASE})`)

const trocar = (rel, de, para) => {
  const src = read(rel)
  if (src.split(de).length !== 2) throw new Error(`âncora do mutante ausente/ambígua em ${rel}: ${de.slice(0, 80)}`)
  return { [rel]: src.replace(de, () => para) }
}
const MUTANTES = [
  ['concessão não fecha o teste', () => trocar(FILES.store, '  if (trialClose) patch.trial_status = trialClose\n', '')],
  ['cron ignora a cortesia (volta a carimbar converted)', () => trocar(FILES.rt, '        courtesy = Array.isArray(grants) && grants.length > 0\n', '        courtesy = false\n')],
  ['concessão fecha QUALQUER status', () => trocar(FILES.courtesy, "return typeof current === 'string' && (COURTESY_CLOSES_TRIAL_FROM as readonly string[]).includes(current) ? COURTESY_TRIAL_STATUS : null", 'return COURTESY_TRIAL_STATUS')],
  ['cron consulta cortesia até de quem tem has_paid', () => trocar(FILES.rt, '      if (paying && row.has_paid !== true) {\n', '      if (paying) {\n')],
  ["'courtesy' fora dos terminais", () => trocar(FILES.rt, "export const TRIAL_TERMINAL_STATUSES = ['downgraded', 'converted', TRIAL_COURTESY_STATUS] as const", "export const TRIAL_TERMINAL_STATUSES = ['downgraded', 'converted'] as const")],
  ['concessão sem CAS no status do teste', () => trocar(FILES.store, '  if (trialClose) upd = upd.eq(\'trial_status\', prof.trial_status as string)\n', '')],
  ['cron com cortesia revoga o saldo', () => trocar(FILES.rt, "      const revoke = paying || balance === null ? 0", "      const revoke = (paying && !courtesy) || balance === null ? 0")],
  ['leitura falha vira converted', () => trocar(FILES.rt, "          return { action: 'skipped', reason: 'courtesy_read_error', creditsRevoked: 0 }\n", '')],
]
for (const [nome, make] of MUTANTES) {
  let over
  try { over = make() } catch (e) { fail++; console.log(`FAIL mutante "${nome}": ${e.message}`); continue }
  let ps
  try { ps = await problems(over) } catch (e) { ps = ['lançou: ' + (e instanceof Error ? e.message : String(e))] }
  if (ps.length === 0) { fail++; console.log(`FAIL mutante "${nome}" passou verde`) } else console.log(`ok mutante "${nome}" → vermelho (${ps[0]})`)
}
console.log(fail ? `\n${fail} FALHA(S)` : '\nPASS test-cortesia-metrica-1410')
process.exit(fail ? 1 : 0)
