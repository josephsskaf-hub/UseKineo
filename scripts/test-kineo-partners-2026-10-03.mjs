// KINEO-PARTNERS-PACOTE-2026-10-03 — guardião do kit "Kineo Partners", executando o código real:
//   (1) regra pura (lib/partnerPack.ts): 25 + 25 créditos, creator_trial, 30 dias, interruptor DESLIGADO, 1 pacote por
//       afiliado, conta que paga fica fora, link de post só https público e fora da nossa casa;
//   (2) escritas (lib/partnerPackStore.ts + lib/courtesyStore.ts reais) num banco em memória: etapa 1 via cortesia,
//       post registrado, aprovação de 1 clique = etapa 2 (+25) uma vez só, recusa, etapa 2 depois da cortesia vencida;
//   (3) a inscrição só entrega a etapa 1 atrás de PARTNER_PACK_LIVE; a taxa é a da fonte (AFFILIATE_COMMISSION_RATE, 40% desde 06/10);
//   (4) a lista do admin conta indicados, pagantes e créditos usados desde a etapa 1;
//   (5) o painel do parceiro mostra cliques/cadastros/pagantes/comissão pendente e paga; o convite existe em en/pt/es
//       sem promessa de ganho.
// Mutantes no fim.
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
    module: box, exports: box.exports, Date, Map, Set, Number, String, Math, JSON, Object, Array, Promise, Error, URL, console,
    require: (id) => { if (Object.hasOwn(imports, id)) return imports[id]; throw Error('import sem dublê: ' + id) },
  })
  return box.exports
}

class Q {
  constructor(db, t) { this.db = db; this.t = t; this.f = []; this.op = 'select'; this.sorters = [] }
  select() { return this }
  eq(k, v) { this.f.push((r) => r[k] === v); return this }
  is(k, v) { this.f.push((r) => (r[k] ?? null) === v); return this }
  lte(k, v) { this.f.push((r) => String(r[k]) <= v); return this }
  order(k, { ascending = true } = {}) { this.sorters.push([k, ascending]); return this }
  range(from, to) { this.bounds = [from, to]; return this }
  limit(n) { this.max = n; return this }
  insert(v) { this.op = 'insert'; this.v = v; return this }
  update(v) { this.op = 'update'; this.v = v; return this }
  delete() { this.op = 'delete'; return this }
  async run() {
    const list = this.db.t[this.t]
    if (!list) throw Error('tabela inesperada ' + this.t)
    if (this.op === 'insert') {
      if (this.t === 'courtesy_grants' && this.v.status === 'active' && list.some((r) => r.user_id === this.v.user_id && r.status === 'active')) return { data: null, error: { code: '23505' } }
      if (this.t === 'partner_packs' && list.some((r) => r.affiliate_id === this.v.affiliate_id)) return { data: null, error: { code: '23505' } }
      const row = { id: `${this.t}-${++this.db.seq}`, stage1_at: null, stage2_at: null, courtesy_grant_id: null, post_url: null, ...this.v }
      list.push(row)
      return { data: [row], error: null }
    }
    let rows = list.filter((r) => this.f.every((fn) => fn(r)))
    rows.sort((a, b) => { for (const [k, asc] of this.sorters) { const n = a[k] < b[k] ? -1 : a[k] > b[k] ? 1 : 0; if (n) return asc ? n : -n } return 0 })
    if (this.op === 'update') rows.forEach((r) => Object.assign(r, this.v))
    if (this.op === 'delete') { this.db.t[this.t] = list.filter((r) => !rows.includes(r)); return { data: null, error: null } }
    if (this.max) rows = rows.slice(0, this.max)
    if (this.op === 'select') rows = rows.slice(this.bounds?.[0] ?? 0, this.bounds ? this.bounds[1] + 1 : 1000)
    return { data: rows.map((r) => ({ ...r })), error: null }
  }
  async maybeSingle() { const r = await this.run(); return { ...r, data: r.data?.[0] ?? null } }
  then(a, b) { return this.run().then(a, b) }
}
function newDb() {
  return {
    seq: 0,
    t: {
      affiliates: [
        { id: 'a-free', user_id: 'u-free', status: 'active' },
        { id: 'a-paying', user_id: 'u-paying', status: 'active' },
        { id: 'a-two', user_id: 'u-two', status: 'active' },
        { id: 'a-off', user_id: 'u-off', status: 'suspended' },
      ],
      profiles: [
        { id: 'u-free', plan: 'free', video_credits: 4, has_paid: false },
        { id: 'u-paying', plan: 'basic', video_credits: 120, has_paid: true },
        { id: 'u-two', plan: null, video_credits: 0, has_paid: false },
        { id: 'u-off', plan: 'free', video_credits: 0, has_paid: false },
      ],
      partner_packs: [], courtesy_grants: [], events: [],
    },
    from(t) { return new Q(this, t) },
  }
}

const REAL = {
  pack: read('lib/partnerPack.ts'),
  packStore: read('lib/partnerPackStore.ts'),
  courtesy: read('lib/courtesy.ts'),
  courtesyStore: read('lib/courtesyStore.ts'),
  commission: read('lib/affiliateCommission.ts'),
  apply: read('app/api/affiliate/apply/route.ts'),
  me: read('app/api/affiliate/me/route.ts'),
  page: read('app/(dashboard)/affiliate/page.tsx'),
  adminRoute: read('app/api/admin/partners/route.ts'),
  invite: fs.existsSync(path.join(ROOT, 'docs/CONVITE-KINEO-PARTNERS-2026-10-03.md')) ? read('docs/CONVITE-KINEO-PARTNERS-2026-10-03.md') : '',
  migration: fs.existsSync(path.join(ROOT, 'supabase/migrations/20261003121000_partner_packs.sql')) ? read('supabase/migrations/20261003121000_partner_packs.sql') : '',
}
const NOW = Date.parse('2026-10-03T12:00:00Z')
const DAY = 86400000

async function problems(S) {
  const p = []
  let P, C, CS, PS, AC
  try {
    P = compile(S.pack)
    C = compile(S.courtesy)
    const reads = compile(read('lib/supabase/readAll.ts'), { '../serverEvents': { writeServerEvent: async () => true } })
    CS = compile(S.courtesyStore, { '@/lib/courtesy': C, './supabase/readAll': reads })
    PS = compile(S.packStore, { '@/lib/courtesyStore': CS, '@/lib/partnerPack': P })
    AC = compile(S.commission)
  } catch (e) { return ['módulos não compilam: ' + e.message] }

  // (1) regra pura
  if (P.PARTNER_PACK_STAGE1_CREDITS !== 25 || P.PARTNER_PACK_STAGE2_CREDITS !== 25 || P.PARTNER_PACK_DAYS !== 30 || P.PARTNER_PACK_LEVEL !== 'creator_trial') p.push('constantes do pacote mudaram (25/25/30/creator_trial)')
  if (P.PARTNER_PACK_LIVE !== false || P.shouldGrantPackOnApply() !== false) p.push('PARTNER_PACK_LIVE ligado sem decisão do fundador')
  if (!C.isCourtesyLevel(P.PARTNER_PACK_LEVEL)) p.push('nível do pacote não é um nível de cortesia')
  if (P.partnerPackEligibility({ affiliateStatus: 'active', plan: 'free', existingPack: true }).ok) p.push('segundo pacote para o mesmo afiliado')
  if (P.partnerPackEligibility({ affiliateStatus: 'active', plan: 'basic', existingPack: false }).ok) p.push('conta que paga recebe pacote')
  if (P.partnerPackEligibility({ affiliateStatus: 'suspended', plan: 'free', existingPack: false }).ok) p.push('afiliado inativo recebe pacote')
  for (const good of ['https://www.tiktok.com/@ana/video/123', 'https://youtube.com/shorts/abc', 'https://www.instagram.com/reel/xyz/']) if (!P.normalizePartnerPostUrl(good)) p.push('link público recusado: ' + good)
  for (const bad of ['http://www.tiktok.com/@a/video/1', 'https://www.usekineo.com/v/abc', 'https://usekineo.com/a/ABCD2345', 'https://127.0.0.1/x', 'https://localhost/x', 'javascript:alert(1)', 'https://user:pw@tiktok.com/x', 'tiktok.com/@a', 'https://[::1]/x', 'https://' + 'a'.repeat(520) + '.com']) if (P.normalizePartnerPostUrl(bad)) p.push('link inválido aceito: ' + bad.slice(0, 40))

  // (2) escritas
  const db = newDb()
  const s1 = await PS.grantPartnerPackStage1(db, { affiliateId: 'a-free', grantedBy: 'admin@test', nowMs: NOW })
  const prof = db.t.profiles[0]
  const pack = db.t.partner_packs[0]
  if (!s1.ok) p.push('etapa 1 falhou: ' + s1.error)
  if (prof.plan !== 'creator_trial' || prof.video_credits !== 29) p.push(`etapa 1 não deu creator_trial + 25 (${prof.plan}/${prof.video_credits})`)
  const g1 = db.t.courtesy_grants[0]
  const activeGrants = await CS.loadActiveCourtesyGrants(db)
  if (activeGrants.length !== 1 || activeGrants[0].user_id !== prof.id) p.push('leitura paginada real perdeu a cortesia do kit')
  if (!g1 || g1.source !== 'partner_pack' || g1.ends_at !== new Date(NOW + 30 * DAY).toISOString() || pack?.courtesy_grant_id !== g1.id || !pack?.stage1_at) p.push('etapa 1 sem cortesia de 30 dias ligada ao pacote')
  const again = await PS.grantPartnerPackStage1(db, { affiliateId: 'a-free', grantedBy: 'admin@test', nowMs: NOW })
  if (again.ok || db.t.partner_packs.length !== 1 || prof.video_credits !== 29) p.push('segundo pacote para o mesmo afiliado')
  const payingTry = await PS.grantPartnerPackStage1(db, { affiliateId: 'a-paying', grantedBy: 'admin@test', nowMs: NOW })
  if (payingTry.ok || db.t.profiles[1].plan !== 'basic' || db.t.partner_packs.some((r) => r.affiliate_id === 'a-paying')) p.push('conta que paga recebeu pacote')
  const offTry = await PS.grantPartnerPackStage1(db, { affiliateId: 'a-off', grantedBy: 'admin@test', nowMs: NOW })
  if (offTry.ok) p.push('afiliado suspenso recebeu pacote')

  // post → aprovação de 1 clique
  if ((await PS.submitPartnerPost(db, { userId: 'u-free', url: 'http://insecure.example/x', nowMs: NOW })).ok) p.push('post http aceito')
  const sub = await PS.submitPartnerPost(db, { userId: 'u-free', url: 'https://www.tiktok.com/@ana/video/1', nowMs: NOW + DAY })
  if (!sub.ok || pack.post_status !== 'pending') p.push('post válido não ficou pendente')
  if (prof.video_credits !== 29) p.push('registrar o post deu crédito sozinho (tem de esperar o admin)')
  const ap = await PS.reviewPartnerPost(db, { packId: pack.id, approve: true, reviewer: 'admin@test', nowMs: NOW + 2 * DAY })
  if (!ap.ok || prof.video_credits !== 54 || pack.post_status !== 'approved' || !pack.stage2_at || P.partnerPackStage(pack) !== 2) p.push(`aprovação não deu a etapa 2 (+25): ${prof.video_credits}`)
  const ap2 = await PS.reviewPartnerPost(db, { packId: pack.id, approve: true, reviewer: 'admin@test', nowMs: NOW + 2 * DAY })
  if (ap2.ok || prof.video_credits !== 54) p.push('segunda aprovação deu crédito de novo')
  if (!db.t.events.some((e) => e.name === 'partner_pack_stage2_granted') || !db.t.events.some((e) => e.name === 'partner_pack_stage1_granted')) p.push('eventos do pacote ausentes')

  // dois cliques SIMULTÂNEOS em "aprovar" (duas abas): só um dá a etapa 2
  {
    const dbr = newDb()
    await PS.grantPartnerPackStage1(dbr, { affiliateId: 'a-free', grantedBy: 'admin@test', nowMs: NOW })
    await PS.submitPartnerPost(dbr, { userId: 'u-free', url: 'https://www.tiktok.com/@ana/video/9', nowMs: NOW })
    const pk = dbr.t.partner_packs[0]
    const both = await Promise.all([
      PS.reviewPartnerPost(dbr, { packId: pk.id, approve: true, reviewer: 'a', nowMs: NOW }),
      PS.reviewPartnerPost(dbr, { packId: pk.id, approve: true, reviewer: 'b', nowMs: NOW }),
    ])
    if (pk.post_status !== 'approved' || !pk.stage2_at) p.push('aprovação simultânea desfez a etapa 2 de quem ganhou')
    if (both.filter((r) => r.ok).length !== 1 || dbr.t.profiles[0].video_credits !== 54) p.push(`aprovação simultânea deu a etapa 2 duas vezes (${dbr.t.profiles[0].video_credits})`)
  }

  // recusa e etapa 2 depois da cortesia vencida
  const s2 = await PS.grantPartnerPackStage1(db, { affiliateId: 'a-two', grantedBy: 'admin@test', nowMs: NOW })
  const pack2 = db.t.partner_packs.find((r) => r.affiliate_id === 'a-two')
  if (!s2.ok || !pack2) p.push('etapa 1 (conta com plano nulo) falhou')
  else {
    await PS.submitPartnerPost(db, { userId: 'u-two', url: 'https://youtube.com/shorts/abc', nowMs: NOW })
    const rj = await PS.reviewPartnerPost(db, { packId: pack2.id, approve: false, reviewer: 'admin@test', nowMs: NOW })
    if (!rj.ok || pack2.post_status !== 'rejected' || db.t.profiles[2].video_credits !== 25) p.push('recusa errada (deu crédito ou não marcou)')
    if (!(await PS.submitPartnerPost(db, { userId: 'u-two', url: 'https://youtube.com/shorts/def', nowMs: NOW })).ok) p.push('recusado não pode mandar outro link')
    await CS.expireCourtesies(db, { apply: true, limit: 10, nowMs: NOW + 31 * DAY, rule: 'keep' })
    const u2 = db.t.profiles[2]
    if (u2.plan !== 'free') p.push('cortesia do pacote não venceu no prazo')
    const late = await PS.reviewPartnerPost(db, { packId: pack2.id, approve: true, reviewer: 'admin@test', nowMs: NOW + 32 * DAY })
    if (!late.ok || u2.plan !== 'creator_trial' || u2.video_credits !== 50) p.push(`etapa 2 depois da cortesia vencida errada (${u2.plan}/${u2.video_credits})`)
  }

  // (3) inscrição + taxa
  // Reancorado 06/10 (KINEO-AFILIADOS-40-2026-10-06): o fundador voltou a comissão para 40% recorrente.
  if (AC.AFFILIATE_COMMISSION_RATE !== 0.4) p.push('taxa de comissão mudou')
  if (!/commission_rate: AFFILIATE_COMMISSION_RATE/.test(S.apply)) p.push('inscrição não grava AFFILIATE_COMMISSION_RATE')
  const calls = S.apply.match(/grantPartnerPackStage1\(/g) ?? []
  if (calls.length !== 1 || !/if \(shouldGrantPackOnApply\(\)\) \{\s*try \{\s*await grantPartnerPackStage1\(/.test(S.apply)) p.push('inscrição entrega o pacote fora do interruptor')

  // (4) lista do admin
  const rows = P.buildPartnerRows({
    affiliates: [{ id: 'a1', code: 'AAAA2222', name: null, email: 'p@x.test', status: 'active', user_id: 'u1', created_at: null }, { id: 'a2', code: 'BBBB2222', name: null, email: 'q@x.test', status: 'active', user_id: 'u2', created_at: null }],
    packs: [{ id: 'k1', affiliate_id: 'a1', user_id: 'u1', courtesy_grant_id: 'g1', stage1_at: '2026-10-01T00:00:00Z', post_url: 'https://t.co/x', post_status: 'pending', post_submitted_at: null, post_reviewed_at: null, stage2_at: null }],
    grants: [{ id: 'g1', starts_at: '2026-10-01T00:00:00Z', ends_at: '2026-10-31T00:00:00Z', status: 'active' }],
    profiles: [{ id: 'u1', plan: 'creator_trial' }, { id: 'u2', plan: 'basic' }],
    referrals: [{ affiliate_id: 'a1', status: 'signup' }, { affiliate_id: 'a1', status: 'paid' }, { affiliate_id: 'a2', status: 'paid' }],
    debits: [{ user_id: 'u1', amount: 10, created_at: '2026-10-02T00:00:00Z', refunded_at: null }, { user_id: 'u1', amount: 7, created_at: '2026-09-01T00:00:00Z', refunded_at: null }, { user_id: 'u1', amount: 5, created_at: '2026-10-02T00:00:00Z', refunded_at: '2026-10-02T01:00:00Z' }],
  })
  const r1 = rows[0], r2 = rows[1]
  if (r1.stage !== 1 || r1.referrals !== 2 || r1.paying_referrals !== 1 || r1.credits_used !== 10 || !r1.can_review_post || r1.can_grant_stage1 || r1.courtesy_ends_at !== '2026-10-31T00:00:00Z') p.push('linha do parceiro com etapa/indicados/créditos errados')
  if (r2.can_grant_stage1 || r2.paying_referrals !== 1) p.push('parceiro que paga aparece como elegível')
  if (!/isAdminEmail\(user\.email\)/.test(S.adminRoute) || !/grantPartnerPackStage1\(admin/.test(S.adminRoute) || !/reviewPartnerPost\(admin/.test(S.adminRoute)) p.push('rota do admin sem trava ou sem as ações')

  // (5) painel + convite + migration
  if (!/partner_pack: partnerPack/.test(S.me)) p.push('/api/affiliate/me não expõe o pacote')
  for (const k of ['Link visits', 'Signups', 'Paid customers', 'Pending $', 'Paid out $']) if (!S.page.includes(`label="${k}"`)) p.push('painel sem o número: ' + k)
  if (!/PartnerPackCard/.test(S.page) || !/\/api\/affiliate\/partner-post/.test(S.page)) p.push('painel sem o cartão do pacote / envio do post')
  if (!S.invite) p.push('convite ausente')
  else {
    for (const h of ['## English', '## Português', '## Español']) if (!S.invite.includes(h)) p.push('convite sem a seção ' + h)
    for (const w of ['25 credits', '25 créditos', '40%', 'every month', 'todo mês', 'cada mes']) if (!S.invite.includes(w)) p.push('convite sem: ' + w)
    if (/(guarante|garant|passive income|renda extra|renda passiva|ingresos pasivos|earn up to|ganhe até|make \$)/i.test(S.invite)) p.push('convite promete ganho')
  }
  if (!/affiliate_id\s+uuid not null unique/.test(S.migration)) p.push('banco não garante 1 pacote por afiliado')
  return p
}

const real = await problems(REAL)
ok(real.length === 0, 'kit Kineo Partners real: regra, etapas, interruptor, lista do admin, painel e convite' + (real.length ? ' — ' + real.join(' | ') : ''))

const mutants = [
  ['interruptor ligado', { pack: REAL.pack.replace('export const PARTNER_PACK_LIVE = false', 'export const PARTNER_PACK_LIVE = true') }],
  ['etapa 1 com 50 créditos', { pack: REAL.pack.replace('export const PARTNER_PACK_STAGE1_CREDITS = 25', 'export const PARTNER_PACK_STAGE1_CREDITS = 50') }],
  ['pacote para conta que paga', { pack: REAL.pack.replace("if (!planless(input.plan)) return { ok: false, reason: 'account_pays' }", '') }],
  ['link da nossa casa aceito', { pack: REAL.pack.replace('|| BLOCKED_HOST.test(host)', '') }],
  ['aprovação sem trava do clique duplo', { packStore: REAL.packStore.replace(".eq('post_status', 'pending')\n    .is('stage2_at', null)", '') }],
  ['post registrado já dá crédito', { packStore: REAL.packStore.replace("await event(admin, input.userId, 'partner_post_submitted'", "await addCourtesyCredits(admin, { grantId: (pack as PartnerPackRow).courtesy_grant_id!, credits: 25, reason: 'x', grantedBy: 'x' }); await event(admin, input.userId, 'partner_post_submitted'") }],
  ['inscrição dá o pacote sem interruptor', { apply: REAL.apply.replace('if (shouldGrantPackOnApply()) {', 'if (true) {') }],
  ['taxa volta a 30%', { commission: REAL.commission.replace('export const AFFILIATE_COMMISSION_RATE = 0.4', 'export const AFFILIATE_COMMISSION_RATE = 0.3') }],
  ['painel perde "Paid out"', { page: REAL.page.replace('label="Paid out $"', 'label="Paid"') }],
  ['convite promete renda', { invite: REAL.invite.replace('## Português', '## Português\n\nRenda passiva garantida.') }],
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
