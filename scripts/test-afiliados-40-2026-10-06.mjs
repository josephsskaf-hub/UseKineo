// KINEO-AFILIADOS-40-2026-10-06 — guardião da comissão de afiliado RECORRENTE (nasceu em 06/10 com 40%, fundador "2 sim").
// KINEO-AFILIADO-30-NOVOS-2026-10-13 — reancorado com motivo: o fundador (13/10, "vai pra 30% de comissao pra 20 novos
// convites") baixou a taxa do afiliado NOVO para 30% recorrente; quem entrou ANTES do corte (AFFILIATE_30_CUTOVER_ISO,
// 14/10 00:00 BRT) segue com 40% — o piso de cada linha sai de affiliates.created_at (data ausente/ilegível = veterano).
// O nome do arquivo ficou (o CI e outros guardiões apontam para ele).
// Prova, EXECUTANDO o código real (readFileSync + ts.transpileModule, sem alias @/ — cada import vira dublê explícito):
//   (1) fonte única: lib/affiliateCommission.ts é pura, AFFILIATE_COMMISSION_RATE = 0.3, PCT = "30%",
//       LEGACY = 0.4, corte em 2026-10-14T03:00:00Z, e effectiveAffiliateCommissionRate(gravada, created_at) usa o piso
//       da linha nos DOIS regimes: sem data/antes do corte 0.3 → 0.4, depois do corte 0.3 → 0.3; acordo 0.5 → 0.5; lixo → piso;
//   (2) a atribuição registra o referral de ponta a ponta: ?ref=CODE (middleware real) → /a/CODE (rota real) → cookies
//       sf_aff + sf_aff_click → finalizador real do cadastro → affiliate_referrals (status 'signup') + profiles.affiliate_id;
//   (3) o webhook real (recordAffiliateCommission) paga 40% sobre a linha ANTIGA gravada com 0.3 (sem created_at e com
//       created_at antes do corte) — na 1ª cobrança, na renovação e numa renovação 400 dias depois (a duração não mudou:
//       enquanto o indicado assinar) — e marca o referral como 'paid'; o afiliado NOVO (created_at depois do corte) recebe
//       30%; um acordo especial acima do piso (0.5) continua valendo;
//   (4) as telas dizem o mesmo número: /partners (título, h1, FAQ avaliadas com as constantes reais), painel /affiliate,
//       /api/affiliate/me, /admin/affiliates, rodapé + 15 dicionários, menu lateral, cartão de momentum, tabela
//       comparativa, llms.txt, kit (docs/KIT-AFILIADOS-*.md, com o exemplo em US$ recalculado da escada TIER_PRICES) e o
//       convite Kineo Partners;
//   (5) /partners não promete campo de PayPal que o painel não tem;
//   (6) mutantes: cada regra quebrada fica vermelha (e a âncora de cada mutante precisa existir).
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import * as crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(import.meta.url)
const ts = require(path.join(ROOT, 'node_modules', 'typescript'))
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n')
let pass = 0
let fail = 0
const ok = (c, m) => { if (c) { pass++; console.log('  ok  ' + m) } else { fail++; console.log('  FAIL ' + m) } }

const F = {
  commission: 'lib/affiliateCommission.ts',
  ledger: 'lib/affiliateLedger.ts',
  code: 'lib/affiliateCode.ts',
  attribution: 'lib/affiliateAttribution.ts',
  finalizer: 'lib/affiliateSignupFinalization.ts',
  destinations: 'lib/affiliateDestinations.ts',
  linkRoute: 'app/a/[code]/route.ts',
  middleware: 'middleware.ts',
  webhook: 'app/api/stripe/webhook/route.ts',
  me: 'app/api/affiliate/me/route.ts',
  apply: 'app/api/affiliate/apply/route.ts',
  partners: 'app/partners/page.tsx',
  panel: 'app/(dashboard)/affiliate/page.tsx',
  admin: 'app/(dashboard)/admin/affiliates/page.tsx',
  footer: 'components/Footer.tsx',
  sidebar: 'components/Sidebar.tsx',
  mobileNav: 'components/MobileNav.tsx',
  momentum: 'components/AffiliateMomentumCard.tsx',
  comparison: 'lib/growth/affiliateProgramComparison.ts',
  llms: 'app/llms.txt/route.ts',
  pricing: 'lib/checkoutPricing.ts',
  kit: 'docs/KIT-AFILIADOS-2026-09-08.md',
  invite: 'docs/CONVITE-KINEO-PARTNERS-2026-10-03.md',
}
const DICTS = [
  ...fs.readdirSync(path.join(ROOT, 'lib/ui/interface')).filter((f) => f.endsWith('.ts')).sort().map((f) => `lib/ui/interface/${f}`),
  'lib/ui/interfaceHindi.ts',
  'lib/ui/interfaceLabels.ts',
]
const CODE = 'ABCD2345'
const HUMAN_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1'
const DAY = 86400000
// KINEO-AFILIADO-30-NOVOS-2026-10-13 — uma data de cada lado do corte (2026-10-14T03:00:00Z).
const VET_AT = '2026-10-06T12:00:00Z'
const NEW_AT = '2026-10-20T00:00:00Z'

// Relógio só do webhook: deixa a renovação "400 dias depois" acontecer de verdade dentro da função.
let offsetMs = 0
class Clock extends Date {
  constructor(...a) { super(...(a.length ? a : [Date.now() + offsetMs])) }
  static now() { return Date.now() + offsetMs }
}

function compile(source, imports = {}, globals = {}) {
  const box = { exports: {} }
  const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText
  vm.runInNewContext(js, {
    module: box, exports: box.exports, URL, URLSearchParams,
    console: { log() {}, warn() {}, error() {} },
    // Marcadores sintéticos: o process.env da máquina nunca entra na VM.
    process: { env: { NEXT_PUBLIC_SUPABASE_URL: 'https://offline.invalid', SUPABASE_SERVICE_ROLE_KEY: 'synthetic-only' } },
    require: (id) => { if (Object.hasOwn(imports, id)) return imports[id]; throw Error(`import sem dublê: ${id}`) },
    ...globals,
  })
  return box.exports
}
/** Lib que precisa continuar pura: qualquer import é defeito (é carregada em copy pública, cliente e webhook). */
function pure(source, rel) {
  if (/^\s*import\s/m.test(source)) throw Error(`${rel} deixou de ser pura (ganhou import)`)
  return compile(source)
}
function declaration(source, name) {
  const ast = ts.createSourceFile('x.ts', source, ts.ScriptTarget.Latest, true)
  const node = ast.statements.find((n) => (ts.isFunctionDeclaration(n) || ts.isClassDeclaration(n)) && n.name?.text === name)
  if (!node) throw Error(`declaração ${name} sumiu`)
  return node.getText(ast)
}
const semComentarios = (src) => ts.transpileModule(src, {
  fileName: 'x.tsx',
  compilerOptions: { removeComments: true, jsx: ts.JsxEmit.Preserve, target: ts.ScriptTarget.ES2020 },
}).outputText

// Supabase em memória: só o que a cadeia usa (select/eq/insert/update/single/maybeSingle/then) + únicos do banco.
class Query {
  constructor(db, table) { this.db = db; this.table = table; this.filters = []; this.op = 'select'; this.columns = '*' }
  select(columns = '*') { this.columns = columns; return this }
  eq(key, value) { this.filters.push((row) => row[key] === value); return this }
  is(key, value) { this.filters.push((row) => (row[key] ?? null) === value); return this }
  limit(n) { this.max = n; return this }
  order() { return this }
  update(value) { this.op = 'update'; this.value = value; return this }
  insert(value) { this.op = 'insert'; this.value = value; return this }
  async run() {
    const list = this.db.tables[this.table]
    if (!list) throw Error(`tabela inesperada ${this.table}`)
    let rows = list.filter((r) => this.filters.every((f) => f(r)))
    if (this.op === 'insert') {
      const dup = this.table === 'affiliate_referrals'
        ? list.some((r) => r.referred_user_id === this.value.referred_user_id)
        : this.table === 'affiliate_commissions' && list.some((r) => r.provider === this.value.provider && r.external_id === this.value.external_id)
      if (dup) return { data: null, error: { code: '23505' } }
      const row = { id: this.table === 'affiliate_clicks' ? crypto.randomUUID() : `${this.table}-${list.length}`, ...this.value }
      if (this.table === 'affiliate_clicks') row.created_at = new Date().toISOString()
      list.push(row)
      rows = [row]
    } else if (this.op === 'update') {
      rows.forEach((r) => Object.assign(r, this.value))
    }
    if (this.max) rows = rows.slice(0, this.max)
    const data = rows.map((r) => (this.columns === '*' ? { ...r } : Object.fromEntries(this.columns.split(',').map((c) => [c.trim(), r[c.trim()]]))))
    return { data, error: null }
  }
  async maybeSingle() { const r = await this.run(); return { ...r, data: r.data?.[0] ?? null } }
  async single() { return this.maybeSingle() }
  then(resolve, reject) { return this.run().then(resolve, reject) }
}
function newDb() {
  const db = {
    tables: {
      profiles: [
        { id: 'buyer', affiliate_id: null }, { id: 'buyer-vip', affiliate_id: 'aff-vip' },
        { id: 'buyer-vet', affiliate_id: 'aff-vet' }, { id: 'buyer-new', affiliate_id: 'aff-new' },
      ],
      // As 25 linhas reais nasceram com 0.3; a do acordo especial mostra que taxa MAIOR por pessoa continua valendo.
      // KINEO-AFILIADO-30-NOVOS-2026-10-13 — aff-1 fica SEM created_at (linha legada: piso 40%); aff-vet entrou antes do
      // corte (40%); aff-new entrou depois do corte, também com 0.3 gravado (30%).
      affiliates: [
        { id: 'aff-1', code: CODE, user_id: 'owner', status: 'active', commission_rate: 0.3 },
        { id: 'aff-vip', code: 'WXYZ2345', user_id: 'owner-vip', status: 'active', commission_rate: 0.5 },
        { id: 'aff-vet', code: 'STUV2345', user_id: 'owner-vet', status: 'active', commission_rate: 0.3, created_at: VET_AT },
        { id: 'aff-new', code: 'NPQR2345', user_id: 'owner-new', status: 'active', commission_rate: 0.3, created_at: NEW_AT },
      ],
      affiliate_clicks: [],
      affiliate_referrals: [
        { id: 'ref-vip', affiliate_id: 'aff-vip', referred_user_id: 'buyer-vip', status: 'signup' },
        { id: 'ref-vet', affiliate_id: 'aff-vet', referred_user_id: 'buyer-vet', status: 'signup' },
        { id: 'ref-new', affiliate_id: 'aff-new', referred_user_id: 'buyer-new', status: 'signup' },
      ],
      affiliate_commissions: [],
    },
    from(table) { return new Query(db, table) },
  }
  return db
}
const mkRedirect = (url, status) => {
  const r = { location: String(url), status: status ?? 307, writes: [] }
  r.cookies = { set: (name, value, options) => r.writes.push({ name, value, options }) }
  return r
}
const mwReq = (href) => {
  const u = new URL(href)
  const nextUrl = Object.assign(new URL(href), { clone: () => new URL(u.href) })
  return { method: 'GET', nextUrl, headers: { get: (k) => (k === 'host' ? u.host : null) }, cookies: { get: () => undefined, set() {} } }
}

async function problems(over = {}) {
  const p = []
  const src = (rel) => over[rel] ?? read(rel)
  const S = (k) => src(F[k])

  // ── (1) fonte única ──────────────────────────────────────────────────────────────────────────────────────────────
  let C
  try { C = pure(S('commission'), F.commission) } catch (e) { return ['fonte: ' + e.message] }
  if (C.AFFILIATE_COMMISSION_RATE !== 0.3) p.push(`taxa do programa = ${C.AFFILIATE_COMMISSION_RATE}, a decisão do fundador (13/10) é 0.3 para afiliado novo`)
  if (C.AFFILIATE_COMMISSION_PCT !== '30%') p.push(`AFFILIATE_COMMISSION_PCT = ${C.AFFILIATE_COMMISSION_PCT}, esperado "30%"`)
  if (C.LEGACY_AFFILIATE_COMMISSION_RATE !== 0.4) p.push(`LEGACY_AFFILIATE_COMMISSION_RATE = ${C.LEGACY_AFFILIATE_COMMISSION_RATE}, o veterano tem 0.4 prometido`)
  if (C.AFFILIATE_30_CUTOVER_ISO !== '2026-10-14T03:00:00Z') p.push(`corte = ${C.AFFILIATE_30_CUTOVER_ISO}, a decisão é 2026-10-14T03:00:00Z (14/10 00:00 BRT)`)
  const eff = C.effectiveAffiliateCommissionRate
  if (typeof eff !== 'function') return [...p, 'effectiveAffiliateCommissionRate sumiu da fonte']
  // KINEO-AFILIADO-30-NOVOS-2026-10-13 — os dois regimes. [gravada, created_at (SEM = chamada de 1 argumento), esperado, rótulo]
  const SEM = Symbol('sem created_at')
  const casos = [
    // legado: sem created_at → piso 40% (na dúvida, a casa paga a mais)
    [0.3, SEM, 0.4, 'linha antiga gravada com 0.3'], [null, SEM, 0.4, 'nulo'], [undefined, SEM, 0.4, 'ausente'], ['0.3', SEM, 0.4, 'texto "0.3"'],
    [0.5, SEM, 0.5, 'acordo especial 0.5'], ['0.45', SEM, 0.45, 'texto "0.45"'], [1, SEM, 1, 'teto 1'], [1.5, SEM, 0.4, 'acima de 1'],
    [0, SEM, 0.4, 'zero'], [-1, SEM, 0.4, 'negativo'], [NaN, SEM, 0.4, 'NaN'], ['abc', SEM, 0.4, 'lixo'],
    [0.3, null, 0.4, 'created_at nulo'], [0.3, 'não-é-data', 0.4, 'created_at ilegível'],
    // veterano: entrou antes do corte → 40%
    [0.3, VET_AT, 0.4, 'veterano (06/10) com 0.3'], [null, VET_AT, 0.4, 'veterano (06/10) nulo'], [0.5, VET_AT, 0.5, 'veterano (06/10) acordo 0.5'],
    [0.3, '2026-10-14T02:59:59.999Z', 0.4, 'veterano 1 ms antes do corte'], [0.3, new Date(VET_AT), 0.4, 'veterano (Date)'],
    // novo: entrou no corte ou depois → 30%
    [0.3, NEW_AT, 0.3, 'novo (20/10) com 0.3'], [null, NEW_AT, 0.3, 'novo (20/10) nulo'], [0.5, NEW_AT, 0.5, 'novo (20/10) acordo 0.5'],
    [0, NEW_AT, 0.3, 'novo (20/10) zero'], [1.5, NEW_AT, 0.3, 'novo (20/10) acima de 1'], [0.35, NEW_AT, 0.35, 'novo (20/10) acordo 0.35'],
    ['abc', NEW_AT, 0.3, 'novo (20/10) lixo'], [0.3, '2026-10-14T03:00:00Z', 0.3, 'novo exatamente no corte'],
  ]
  for (const [v, at, want, label] of casos) {
    const got = at === SEM ? eff(v) : eff(v, at)
    if (got !== want) p.push(`piso errado para ${label}: ${got} (esperado ${want})`)
  }
  if (typeof C.affiliateCommissionRateForPlan !== 'function') p.push('affiliateCommissionRateForPlan sumiu da fonte')
  else {
    if (C.affiliateCommissionRateForPlan(0.3, 'basic', NEW_AT) !== 0.3) p.push('affiliateCommissionRateForPlan ignora o created_at do afiliado novo')
    if (C.affiliateCommissionRateForPlan(0.3, 'basic', VET_AT) !== 0.4 || C.affiliateCommissionRateForPlan(0.3, 'basic') !== 0.4) p.push('affiliateCommissionRateForPlan tira os 40% do veterano')
    if (C.affiliateCommissionRateForPlan(0.5, 'business', VET_AT) !== 0.2) p.push('Business deixou de ser 20% fixo')
  }
  const PCT = C.AFFILIATE_COMMISSION_PCT

  // ── (2) atribuição de ponta a ponta ──────────────────────────────────────────────────────────────────────────────
  const db = newDb()
  const events = []
  let linkRoute, finalizer, mw, payment
  try {
    const destinations = pure(S('destinations'), F.destinations)
    const attribution = compile(S('attribution'), { '@supabase/supabase-js': { createClient: () => db }, '@/lib/affiliateCode': pure(S('code'), F.code) })
    finalizer = compile(S('finalizer'), {
      'server-only': {}, '@/lib/affiliateAttribution': attribution,
      '@/lib/serverEvents': { writeServerEvent: async (e) => { events.push(e); return true } },
    })
    linkRoute = compile(S('linkRoute'), {
      'next/server': { NextResponse: { redirect: mkRedirect } }, crypto,
      '@supabase/supabase-js': { createClient: () => db },
      '@/lib/affiliateDestinations': destinations, '@/lib/affiliateAttribution': attribution,
      // a branch codex/nuvem-b2b-seo-lacos-0210 acrescenta o desvio de código de INDICAÇÃO; aqui o código é de afiliado.
      '@/lib/referralLanding': { findReferrerIdByCode: async () => null, recordReferralLanding: async () => null, normalizeReferralCode: () => null, REFERRAL_COOKIE: 'sf_ref', REFERRAL_COOKIE_MAX_AGE: 1 },
    })
    mw = compile(S('middleware'), {
      'next/server': { NextResponse: { redirect: mkRedirect } },
      '@/lib/supabase/middleware': { updateSession: async () => ({ passthrough: true, cookies: { set() {} } }) },
      '@/lib/growth/homeClipsFirst': { HOME_VISITOR_COOKIE: 'kineo_vid', HOME_VISITOR_COOKIE_MAX_AGE_SECONDS: 1, shouldMintHomeVisitorCookie: () => false },
    })
    const ledger = pure(S('ledger'), F.ledger)
    payment = compile(
      declaration(S('webhook'), 'RetryableAffiliateLedgerError') + '\n' + declaration(S('webhook'), 'recordAffiliateCommission') + '\nexport { recordAffiliateCommission };',
      {}, { ...ledger, ...C, Date: Clock, resolveAffiliateByCoupon: async () => null },
    )
  } catch (e) { return [...p, 'montagem da cadeia quebrou: ' + e.message] }

  // ?ref=CODE (o formato dos rascunhos antigos e de muito criador) vira /a/CODE; ?ref=producthunt passa intacto.
  const viaRef = await mw.middleware(mwReq(`https://www.usekineo.com/?ref=${CODE}&utm_source=yt`))
  if (!viaRef || viaRef.passthrough || new URL(viaRef.location).pathname !== `/a/${CODE}`) p.push('?ref=CODE não leva a /a/CODE')
  const ph = await mw.middleware(mwReq('https://www.usekineo.com/?ref=producthunt'))
  if (!ph?.passthrough) p.push('?ref=producthunt foi tratado como código de afiliado')

  const target = viaRef?.location && !viaRef.passthrough ? new URL(viaRef.location) : new URL(`https://www.usekineo.com/a/${CODE}`)
  const res = await linkRoute.GET(
    { nextUrl: target, cookies: { get: () => undefined }, headers: { get: (k) => (k === 'user-agent' ? HUMAN_UA : '') } },
    { params: { code: CODE } },
  )
  const jar = Object.fromEntries((res?.writes ?? []).map((c) => [c.name, c.value]))
  if (db.tables.affiliate_clicks.length !== 1) p.push(`clique humano gravou ${db.tables.affiliate_clicks.length} linhas em affiliate_clicks (esperado 1)`)
  if (jar.sf_aff !== CODE || !jar.sf_aff_click) p.push('clique não entregou os cookies sf_aff + sf_aff_click')

  const clickAt = Date.parse(db.tables.affiliate_clicks[0]?.created_at ?? '') || Date.now()
  const user = { id: 'buyer', email: 'buyer@example.test', createdAt: new Date(clickAt + 60000).toISOString() }
  const fin = await finalizer.finalizeAffiliateSignupAttribution({ rawCode: jar.sf_aff, rawClickId: jar.sf_aff_click, user, source: 'auth_callback' })
  const ref = db.tables.affiliate_referrals.find((r) => r.referred_user_id === 'buyer')
  if (fin?.outcome !== 'attributed') p.push('cadastro depois do clique não atribuiu: ' + fin?.outcome)
  if (!ref || ref.affiliate_id !== 'aff-1' || ref.status !== 'signup') p.push('o cadastro não registrou o referral (affiliate_referrals) do dono do link')
  if (db.tables.profiles[0].affiliate_id !== 'aff-1') p.push('perfil do indicado não carimbado com o afiliado')
  if (!events.some((e) => e.name === 'affiliate_signup_attribution_result' && e.metadata?.outcome === 'attributed')) p.push('cadastro sem o evento affiliate_signup_attribution_result')

  // ── (3) webhook: 40% sobre a linha antiga/veterana, 30% para o novo, recorrente, sem teto de meses ──────────────
  const pay = (a) => payment.recordAffiliateCommission(db, { userId: 'buyer', currency: 'usd', paymentKind: 'subscription', attributionSystem: 'custom', ...a })
  try {
    await pay({ externalId: 'cs_starter', amountGross: 1290, type: 'initial' })
    await pay({ externalId: 'in_month_2', amountGross: 1290, type: 'recurring' })
    offsetMs = 400 * DAY
    await pay({ externalId: 'in_day_400', amountGross: 1290, type: 'recurring' })
  } catch (e) { p.push('webhook lançou: ' + e.message) } finally { offsetMs = 0 }
  const byId = Object.fromEntries(db.tables.affiliate_commissions.map((c) => [c.external_id, c]))
  if (byId.cs_starter?.commission_amount !== 516 || byId.cs_starter?.affiliate_id !== 'aff-1') p.push(`1ª cobrança do Starter (US$12,90) gerou ${byId.cs_starter?.commission_amount} centavos; esperado 516 (40% sobre a linha gravada com 0.3)`)
  if (byId.in_month_2?.commission_amount !== 516 || byId.in_month_2?.type !== 'recurring') p.push('renovação não pagou 40% recorrente')
  if (byId.in_day_400?.commission_amount !== 516) p.push('renovação 400 dias depois sem comissão: a duração mudou (era enquanto o indicado assinar)')
  if (ref && ref.status !== 'paid') p.push('referral não virou "paid" com a cobrança da assinatura')
  try {
    await payment.recordAffiliateCommission(db, { userId: 'buyer-vip', externalId: 'cs_vip', amountGross: 1290, currency: 'usd', type: 'initial', paymentKind: 'subscription', attributionSystem: 'custom' })
  } catch (e) { p.push('webhook (acordo especial) lançou: ' + e.message) }
  if (db.tables.affiliate_commissions.find((c) => c.external_id === 'cs_vip')?.commission_amount !== 645) p.push('acordo especial de 50% não foi honrado (esperado 645 centavos)')
  // KINEO-AFILIADO-30-NOVOS-2026-10-13 — o veterano com data antes do corte segue em 40%; o novo (depois do corte) recebe 30%.
  try {
    for (const [userId, externalId, type] of [['buyer-vet', 'cs_vet', 'initial'], ['buyer-new', 'cs_new', 'initial'], ['buyer-new', 'in_new_2', 'recurring']]) {
      await payment.recordAffiliateCommission(db, { userId, externalId, amountGross: 1290, currency: 'usd', type, paymentKind: 'subscription', attributionSystem: 'custom' })
    }
  } catch (e) { p.push('webhook (veterano/novo) lançou: ' + e.message) }
  const amt = (id) => db.tables.affiliate_commissions.find((c) => c.external_id === id)
  if (amt('cs_vet')?.commission_amount !== 516 || amt('cs_vet')?.affiliate_id !== 'aff-vet') p.push(`veterano (entrou 06/10) recebeu ${amt('cs_vet')?.commission_amount} centavos; esperado 516 (40% prometido)`)
  if (amt('cs_new')?.commission_amount !== 387 || amt('cs_new')?.affiliate_id !== 'aff-new') p.push(`afiliado novo (entrou 20/10) recebeu ${amt('cs_new')?.commission_amount} centavos; esperado 387 (30%)`)
  if (amt('in_new_2')?.commission_amount !== 387 || amt('in_new_2')?.type !== 'recurring') p.push('afiliado novo sem os 30% recorrentes na renovação')
  const webhook = S('webhook')
  if (!/^import \{ effectiveAffiliateCommissionRate \} from '@\/lib\/affiliateCommission'/m.test(webhook)) p.push('webhook sem o import da fonte única')

  // ── (4) telas e materiais dizem o mesmo número ────────────────────────────────────────────────────────────────────
  const scope = { ...C, ...pure(S('comparison'), F.comparison) }
  const evalTpl = (tpl) => new Function(...Object.keys(scope), `return ${tpl}`)(...Object.values(scope))
  const partners = S('partners')
  const faqA = (q) => {
    const line = partners.split('\n').find((l) => l.includes(`q: '${q}'`))
    const m = line?.match(/a: (`[\s\S]*`) \},\s*$/)
    try { return m ? evalTpl(m[1]) : null } catch { return null }
  }
  if (/\b[34]0 ?%/.test(semComentarios(partners))) p.push('/partners digita 30% ou 40% em vez de usar AFFILIATE_COMMISSION_PCT')
  const title = partners.match(/^\s*title: (`[^`]*`),/m)
  let titleText = null
  try { titleText = title ? evalTpl(title[1]) : null } catch { titleText = null }
  if (titleText !== `AI Video Affiliate Program — ${PCT} Recurring, Compared | Kineo`) p.push('título da /partners não vem da fonte: ' + titleText)
  for (const anchor of [
    'Earn {AFFILIATE_COMMISSION_PCT} Recurring</h1>',
    '{AFFILIATE_COMMISSION_PCT} of eligible payments</b> while referred customers stay subscribed',
    'What {AFFILIATE_COMMISSION_PCT} recurring looks like</h2>',
    'Illustration based on {AFFILIATE_COMMISSION_PCT} of current USD list prices',
    'You get {AFFILIATE_COMMISSION_PCT} recurring, instant self-serve activation',
    'Activate my {AFFILIATE_COMMISSION_PCT} recurring link',
    'Start earning {AFFILIATE_COMMISSION_PCT} recurring</h2>',
    'const COMMISSION_RATE = AFFILIATE_COMMISSION_RATE',
  ]) if (!partners.includes(anchor)) p.push('/partners sem: ' + anchor)
  const earn = faqA('How much do I earn?')
  if (!earn || !earn.includes(`earn ${PCT} of each eligible payment`) || !/while the customer remains subscribed/.test(earn)) p.push(`FAQ "How much do I earn?" não diz ${PCT} recorrente enquanto assinar`)
  const compare = faqA('How does Kineo compare with other AI video affiliate programs?')
  if (!compare || !compare.includes(`Kineo publishes ${PCT} recurring`)) p.push('FAQ comparativa não diz a taxa da fonte')

  // (5) PayPal: o painel não tem campo; a FAQ não pode mandar a pessoa preencher um.
  const panel = S('panel')
  const paid = faqA('When do I get paid?')
  if (!paid) p.push('FAQ "When do I get paid?" sumiu ou não avalia')
  else {
    const promisesField = /add your paypal|paypal e-?mail in the (affiliate )?dashboard|in the dashboard so the payout/i.test(paid)
    const panelHasField = /paypal/i.test(semComentarios(panel)) && /<input/.test(semComentarios(panel))
    if (promisesField && !panelHasField) p.push('FAQ promete campo de PayPal que o painel não tem')
    if (!/confirm the PayPal account/.test(paid)) p.push('FAQ não diz como o PayPal do repasse é combinado')
    if (!paid.includes(C.AFFILIATE_PAYOUT_TERMS)) p.push('FAQ de pagamento não usa AFFILIATE_PAYOUT_TERMS')
  }

  if (!panel.includes('earn {AFFILIATE_COMMISSION_PCT} recurring') || !panel.includes('and earn {AFFILIATE_COMMISSION_PCT} recurring on eligible subscription')) p.push('painel (quem ainda não é afiliado) não deriva a taxa')
  if (/\b[34]0 ?%/.test(semComentarios(panel))) p.push('painel digita 30%/40%')
  if (!panel.includes('const ratePct = `${Math.round((a.commission_rate ?? 0) * 100)}%`')) p.push('painel ativo deixou de mostrar a taxa devolvida pela API')
  // KINEO-AFILIADO-30-NOVOS-2026-10-13 — reancorado: a taxa mostrada passa o created_at (o mesmo piso que o webhook paga).
  if (!S('me').includes('commission_rate: effectiveAffiliateCommissionRate(affiliate.commission_rate, affiliate.created_at),')) p.push('/api/affiliate/me devolve uma taxa diferente da que o webhook paga (sem o created_at)')
  if (!S('me').includes(".select('id, code, status, commission_rate, coupon_code, created_at')")) p.push('/api/affiliate/me não lê affiliates.created_at (o novo veria 40%)')
  if (!S('admin').includes('paga {Math.round(effectiveAffiliateCommissionRate(a.commission_rate, a.created_at) * 100)}%')) p.push('/admin/affiliates não mostra a taxa paga (piso por created_at)')
  if (!S('apply').includes('commission_rate: AFFILIATE_COMMISSION_RATE,')) p.push('inscrição não grava a fonte')
  if (!S('llms').includes('${AFFILIATE_COMMISSION_PCT} commission on every eligible payment')) p.push('llms.txt não deriva a taxa')

  const footerLabel = `Affiliate program - ${PCT} recurring`
  if (!semComentarios(S('footer')).includes(`label: '${footerLabel}'`)) p.push('rodapé não diz ' + footerLabel)
  for (const d of DICTS) {
    const s = src(d)
    const line = s.split('\n').find((l) => l.includes(`'${footerLabel}':`))
    if (!line) p.push(`${d}: sem a tradução de "${footerLabel}"`)
    else if (!line.split(`'${footerLabel}':`)[1].includes(PCT.replace('%', ''))) p.push(`${d}: tradução sem o número ${PCT}`)
    if (s.includes("'Affiliate program - 40% recurring':")) p.push(`${d}: chave velha de 40% ainda presente`)
  }
  // KINEO-MENU-ENXUTO-2026-10-09 — re-ancorado: o item do menu lateral virou "Earn 40%" (fundador, "1 sim").
  // KINEO-AFILIADO-30-NOVOS-2026-10-13 — agora "Earn 30%" (a taxa de quem entra); o par do celular diz o mesmo.
  if (!S('sidebar').includes(`label="Earn ${PCT}"`)) p.push('menu lateral diz outra taxa')
  if (!S('mobileNav').includes(`label: 'Earn ${PCT}'`)) p.push('menu do celular diz outra taxa')
  if (!S('momentum').includes(`earn ${PCT} on eligible subscription payments`)) p.push('cartão de momentum diz outra taxa')
  const row = pure(S('comparison'), F.comparison).kineoAffiliateComparisonRow()
  if (row.commission !== `${PCT} recurring`) p.push('tabela comparativa: Kineo diz ' + row.commission)
  if (!/stays subscribed/.test(row.recurrence)) p.push('tabela comparativa perdeu a duração (enquanto assinar)')

  const kit = S('kit')
  if (!kit.split('\n')[0].includes(`${PCT} recurring`)) p.push('título do kit não diz ' + PCT)
  if (!kit.includes(`Earn **${PCT} on every eligible purchase`)) p.push('oferta do kit não diz ' + PCT)
  if (/Earn \*\*40%|40% is US\$|40% on every eligible|40% recurring commissions/.test(kit)) p.push('kit ainda oferece 40% a parceiro novo')
  if (!kit.includes('KINEO-AFILIADO-30-NOVOS-2026-10-13') || !/quem entrou antes do corte segue com 40%/.test(kit)) p.push('kit sem a nota de 13/10 (veterano segue 40%)')
  const pr = S('pricing')
  const block = pr.slice(pr.indexOf('export const TIER_PRICES'), pr.indexOf('\n}', pr.indexOf('export const TIER_PRICES')))
  const cents = (tier) => Number((block.match(new RegExp(`\\b${tier}: \\{ usd: (\\d+) \\}`)) ?? [])[1])
  const usd = (c) => (Math.round(c * C.AFFILIATE_COMMISSION_RATE) / 100).toFixed(2)
  const sentence = `${PCT} is US$${usd(cents('starter'))} on Starter, US$${usd(cents('basic'))} on Creator, and US$${usd(cents('pro'))} on Studio`
  if (![cents('starter'), cents('basic'), cents('pro')].every((n) => Number.isFinite(n) && n > 0)) p.push('TIER_PRICES não encontrado em lib/checkoutPricing.ts')
  else if (!kit.includes(sentence)) p.push(`exemplo do kit não bate com taxa × escada: esperado "${sentence}"`)
  if (!kit.includes(`| Creator | US$${(cents('basic') / 100).toFixed(2)} |`)) p.push('tabela de planos do kit diverge de TIER_PRICES')

  const inv = S('invite')
  for (const w of [`earn ${PCT} from the people you bring`, `**${PCT} of every payment`, `receba ${PCT} de quem`, `**${PCT} de tudo`, `el ${PCT} de quien`, `**el ${PCT} de todo`]) if (!inv.includes(w)) p.push('convite sem: ' + w)
  if (/40% of every payment|40% de tudo|el 40% de|earn 40% from|receba 40% de/.test(inv)) p.push('convite ainda promete 40% a parceiro novo')
  if (!inv.includes('KINEO-AFILIADO-30-NOVOS-2026-10-13') || !/quem entrou antes do corte segue com 40%/.test(inv)) p.push('convite sem a nota de 13/10 (veterano segue 40%)')
  return p
}

console.log('TESTE afiliados: novo 30% recorrente, veterano (antes de 14/10) segue 40% — 06/10 + 13/10')
const real = await problems()
ok(real.length === 0, '(1–5) fonte 30% com piso 40% para veterano (created_at), ?ref → /a → cadastro → referral, webhook 40% legado / 30% novo recorrente sem teto, telas/kit/convite no mesmo número, sem PayPal inventado' + (real.length ? ' → ' + real.join(' | ') : ''))

// ── (6) mutantes: cada regra quebrada precisa ficar vermelha ─────────────────────────────────────────────────────────
const mutants = [
  // KINEO-AFILIADO-30-NOVOS-2026-10-13 — mutantes reancorados para a regra nova (novo 30%, veterano 40%).
  ['M1 taxa do novo volta a 40%', F.commission, 'export const AFFILIATE_COMMISSION_RATE = 0.3', 'export const AFFILIATE_COMMISSION_RATE = 0.4'],
  ['M2 piso some (linha antiga volta a pagar 30%)', F.commission, 'rate > floor && rate <= 1 ? rate : floor', 'rate > 0 && rate <= 1 ? rate : floor'],
  ['M3 webhook paga a taxa crua da linha', F.webhook, 'const rate = effectiveAffiliateCommissionRate(aff.commission_rate, aff.created_at)', 'const rate = Number(aff.commission_rate ?? 0)'],
  ['M4 renovação deixa de pagar', F.webhook, '    if (!affiliateId) return\n    // Só AGORA o valor importa', "    if (!affiliateId) return\n    if (args.type === 'recurring') return\n    // Só AGORA o valor importa"],
  ['M5 teto de 12 meses na renovação', F.webhook, '    if (!affiliateId) return\n    // Só AGORA o valor importa', "    if (!affiliateId) return\n    if (args.type === 'recurring' && Date.now() - Date.parse('2026-10-01T00:00:00Z') > 365 * 86400000) return\n    // Só AGORA o valor importa"],
  ['M6 h1 da /partners digita 40%', F.partners, 'Earn {AFFILIATE_COMMISSION_PCT} Recurring</h1>', 'Earn 40% Recurring</h1>'],
  ['M7 FAQ de ganho digita 40%', F.partners, 'a: `Affiliates earn ${AFFILIATE_COMMISSION_PCT} of each eligible payment', 'a: `Affiliates earn 40% of each eligible payment'],
  ['M8 FAQ volta a prometer campo de PayPal', F.partners, 'Before your first payout we e-mail you to confirm the PayPal account to pay — there is nothing to set up in the dashboard.', 'Add your PayPal e-mail in the affiliate dashboard so the payout can go out.'],
  ['M9 painel diz 40% a quem não é afiliado', F.panel, 'earn {AFFILIATE_COMMISSION_PCT} recurring\n            </span>', 'earn 40% recurring\n            </span>'],
  ['M10 /api/affiliate/me devolve a taxa crua', F.me, 'commission_rate: effectiveAffiliateCommissionRate(affiliate.commission_rate, affiliate.created_at),', 'commission_rate: affiliate.commission_rate,'],
  ['M11 rodapé volta a 40%', F.footer, "label: 'Affiliate program - 30% recurring'", "label: 'Affiliate program - 40% recurring'"],
  ['M12 dicionário pt com a chave velha', 'lib/ui/interface/pt.ts', "'Affiliate program - 30% recurring': 'Programa de afiliados - 30% recorrente'", "'Affiliate program - 40% recurring': 'Programa de afiliados - 40% recorrente'"],
  ['M13 tabela comparativa volta a 40%', F.comparison, "commission: '30% recurring'", "commission: '40% recurring'"],
  ['M14 kit volta a oferecer 40% ao novo', F.kit, 'Earn **30% on every eligible purchase', 'Earn **40% on every eligible purchase'],
  ['M15 exemplo do kit com o número velho (40% do Creator)', F.kit, 'US$5.97 on Creator', 'US$7.96 on Creator'], // KINEO-AFILIADO-30-NOVOS-2026-10-13 — 30% do Creator de $19,90
  ['M16 convite volta a 40%', F.invite, 'you receive **30% of every payment', 'you receive **40% of every payment'],
  ['M17 ?ref=CODE deixa de levar ao /a/', F.middleware, "dest.pathname = '/a/' + ref", "dest.pathname = '/'"],
  ['M18 rota /a/ sem cookie de prova do clique', F.linkRoute, 'res.cookies.set(CLICK_COOKIE, clickProofId', 'void (CLICK_COOKIE, clickProofId'],
  ['M19 cadastro não grava o referral', F.attribution, "if (!click?.id) return { ok: false, reason: 'invalid_click_proof' }", "if (click?.id) return { ok: false, reason: 'invalid_click_proof' }"],
  ['M20 menu lateral com outra taxa', F.sidebar, 'label="Earn 30%"', 'label="Earn 40%"'],
  ['M21 admin esconde a taxa paga', F.admin, 'paga {Math.round(effectiveAffiliateCommissionRate(a.commission_rate, a.created_at) * 100)}%', 'paga {Math.round((a.commission_rate ?? 0) * 100)}%'],
  ['M22 webhook perde o import da fonte', F.webhook, "import { effectiveAffiliateCommissionRate } from '@/lib/affiliateCommission'", "import { AFFILIATE_COMMISSION_RATE as effectiveAffiliateCommissionRateX } from '@/lib/affiliateCommission'"],
  // KINEO-AFILIADO-30-NOVOS-2026-10-13 — mutantes da regra nova.
  ['M23 webhook perde o created_at (novo recebe 40%)', F.webhook, 'const rate = effectiveAffiliateCommissionRate(aff.commission_rate, aff.created_at)', 'const rate = effectiveAffiliateCommissionRate(aff.commission_rate)'],
  ['M24 webhook não lê created_at do banco (novo recebe 40%)', F.webhook, ".select('id, commission_rate, status, created_at')", ".select('id, commission_rate, status')"],
  ['M25 corte perdido: sem data vira 30% (veterano legado cai)', F.commission, '  if (!Number.isFinite(t)) return LEGACY_AFFILIATE_COMMISSION_RATE', '  if (!Number.isFinite(t)) return AFFILIATE_COMMISSION_RATE'],
  ['M26 corte movido para 01/01 (veterano de 06/10 cai a 30%)', F.commission, "export const AFFILIATE_30_CUTOVER_ISO = '2026-10-14T03:00:00Z'", "export const AFFILIATE_30_CUTOVER_ISO = '2026-01-01T00:00:00Z'"],
  ['M27 piso único de 30% para todo mundo', F.commission, '  return t < Date.parse(AFFILIATE_30_CUTOVER_ISO) ? LEGACY_AFFILIATE_COMMISSION_RATE : AFFILIATE_COMMISSION_RATE', '  return AFFILIATE_COMMISSION_RATE'],
  ['M28 /api/affiliate/me não lê created_at', F.me, ".select('id, code, status, commission_rate, coupon_code, created_at')", ".select('id, code, status, commission_rate, coupon_code')"],
  ['M29 menu do celular com outra taxa', F.mobileNav, "label: 'Earn 30%'", "label: 'Earn 40%'"],
  ['M30 kit perde a nota do veterano', F.kit, 'quem entrou antes do corte segue com 40%', 'todos passam a 30%'],
]
for (const [label, file, from, to] of mutants) {
  const base = read(file)
  if (!base.includes(from)) { ok(false, `(${label}) âncora do mutante não encontrada — reancore`); continue }
  let bitten = false
  try {
    const probs = await problems({ [file]: base.replace(from, to) })
    bitten = probs.length > 0
    // AF40_DEBUG=1 mostra POR QUE cada mutante ficou vermelho (prova de que mordeu na regra certa).
    if (process.env.AF40_DEBUG) console.log('      ↳ ' + probs.slice(0, 2).join(' | '))
  } catch (err) {
    console.log(`    (mutante lançou: ${err instanceof Error ? err.message : String(err)})`)
    bitten = true
  }
  ok(bitten, `(${label}) → vermelho`)
}

console.log(`\n  RESULTADO: ${pass} ok · ${fail} falha(s)`)
process.exit(fail ? 1 : 0)
