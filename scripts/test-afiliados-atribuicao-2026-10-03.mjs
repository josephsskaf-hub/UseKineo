// KINEO-AFILIADOS-ATRIBUICAO-2026-10-03 — guardião da atribuição de afiliado DE PONTA A PONTA, executando o código real:
//   clique em /a/CODE (rota real) → cookies sf_aff + sf_aff_click → cadastro (finalizador real, pelas DUAS portas:
//   /auth/callback = OAuth/link mágico e /api/auth/activation-completed = e-mail e senha) → checkout (bloco real de
//   metadata da rota app/api/stripe/checkout) → webhook (recordAffiliateCommission REAL da rota, alimentada pelos
//   argumentos que a PRÓPRIA rota monta a partir de um evento simulado da Stripe) → linha em affiliate_commissions.
// Nada chama a Stripe, a rede ou o banco: o Supabase é um dublê em memória; o evento é um objeto literal.
// Os argumentos do webhook NÃO são reescritos aqui: o guardião localiza cada chamada `recordAffiliateCommission(...)`
// no fonte da rota (AST) e avalia o objeto que a rota passa, com `session`/`invoice`/`subscription` do evento simulado.
// Mexeu no mapeamento evento → comissão na rota? Este guardião vê.
// Também prova o conserto do dia: robô que se declara (ClaudeBot, Bytespider, SemrushBot…) não vira clique nem cookie.
// Mutantes no fim: cada um precisa derrubar o guardião.
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

const CODE = 'ABCD2345'
const NOW = Date.parse('2026-10-03T12:00:00Z')
let now = NOW
class Clock extends Date { constructor(...a) { super(...(a.length ? a : [now])) } static now() { return now } }

function compile(source, imports = {}, globals = {}) {
  const box = { exports: {} }
  const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText
  vm.runInNewContext(js, {
    module: box, exports: box.exports, Date: Clock, URL, URLSearchParams, Set, Map, Error, Number, String, Math, JSON, Object, Array, Promise,
    process: { env: { NEXT_PUBLIC_SUPABASE_URL: 'https://offline.invalid', SUPABASE_SERVICE_ROLE_KEY: 'synthetic-only' } },
    console: { log() {}, warn() {}, error() {} },
    require: (id) => { if (Object.hasOwn(imports, id)) return imports[id]; throw Error(`import sem dublê: ${id}`) },
    ...globals,
  })
  return box.exports
}
function declaration(source, name) {
  const ast = ts.createSourceFile('x.ts', source, ts.ScriptTarget.Latest, true)
  const node = ast.statements.find((n) => (ts.isFunctionDeclaration(n) || ts.isClassDeclaration(n)) && n.name?.text === name)
  if (!node) throw Error(`declaração ${name} sumiu`)
  return node.getText(ast)
}
// Todas as chamadas recordAffiliateCommission(supabase, { ... }) da rota, com o texto do objeto de argumentos.
function commissionCallSites(source) {
  const ast = ts.createSourceFile('w.ts', source, ts.ScriptTarget.Latest, true)
  const out = []
  const walk = (n) => {
    if (ts.isCallExpression(n) && ts.isIdentifier(n.expression) && n.expression.text === 'recordAffiliateCommission' && n.arguments.length === 2) {
      out.push(n.arguments[1].getText(ast))
    }
    ts.forEachChild(n, walk)
  }
  walk(ast)
  return out
}

// ── Dublê do Supabase em memória (mesmo contrato que o supabase-js usa nas rotas) ──
class Query {
  constructor(db, table) { this.db = db; this.table = table; this.filters = []; this.op = 'select'; this.columns = '*' }
  select(c = '*') { this.columns = c; return this }
  eq(k, v) { this.filters.push((r) => r[k] === v); return this }
  limit(n) { this.max = n; return this }
  update(v) { this.op = 'update'; this.value = v; return this }
  insert(v) { this.op = 'insert'; this.value = v; return this }
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
      if (this.table === 'affiliate_clicks') row.created_at = new Clock().toISOString()
      list.push(row); rows = [row]
    } else if (this.op === 'update') rows.forEach((r) => Object.assign(r, this.value))
    if (this.max) rows = rows.slice(0, this.max)
    const data = rows.map((r) => this.columns === '*' ? { ...r } : Object.fromEntries(this.columns.split(',').map((c) => [c.trim(), r[c.trim()]])))
    return { data, error: null }
  }
  async maybeSingle() { const r = await this.run(); return { ...r, data: r.data?.[0] ?? null } }
  async single() { return this.maybeSingle() }
  then(res, rej) { return this.run().then(res, rej) }
}
function newDb() {
  return {
    tables: {
      profiles: [{ id: 'buyer', affiliate_id: null }],
      affiliates: [{ id: 'aff-1', code: CODE, user_id: 'owner', status: 'active', commission_rate: 0.3 }],
      affiliate_clicks: [], affiliate_referrals: [], affiliate_commissions: [],
    },
    from(t) { return new Query(this, t) },
  }
}

const HUMAN_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140 Safari/537.36'
// UAs reais que entraram em affiliate_clicks nos últimos 30 dias (medido 03/10) — e dois humanos que não podem cair.
const BOT_UAS = [
  'Mozilla/5.0 (Linux; Android 5.0) AppleWebKit/537.36 (KHTML, like Gecko) Mobile Safari/537.36 (compatible; Bytespider; spider-feedback@bytedance.com)',
  'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; ShapBot/0.1.0',
  'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; ClaudeBot/1.0; +claudebot@anthropic.com)',
  'Mozilla/5.0 (compatible; ExaSearchBot/1.0; +https://crawler.exa.ai/)',
  'Mozilla/5.0 (compatible; SemrushBot/7~bl; +http://www.semrush.com/bot.html)',
  'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; KeenableBot/1.0; +https://keenable.ai/)',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; trendictionbot0.5.0; trendiction search; http://www.trendiction.de/bot)',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_5) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.1.1 Safari/605.1.15 (Applebot/0.1)',
  'Twitterbot/1.0', 'facebookexternalhit/1.1', 'WhatsApp/2.0', 'Slackbot-LinkExpanding 1.0', 'Googlebot',
]
const HUMAN_UAS = [
  HUMAN_UA,
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
  'Mozilla/5.0 (Linux; Android 10; Cubot X30 Build/QP1A.190711.020) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Mobile Safari/537.36',
  'Mozilla/5.0 (Linux; Android 11; CUBOT_P40 Build/RP1A) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Mobile Safari/537.36',
  'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140 Mobile Safari/537.36 Instagram 350.0',
]

// Fontes reais (os mutantes trocam uma delas).
const REAL = {
  destinations: read('lib/affiliateDestinations.ts'),
  code: read('lib/affiliateCode.ts'),
  attribution: read('lib/affiliateAttribution.ts'),
  finalizer: read('lib/affiliateSignupFinalization.ts'),
  ledger: read('lib/affiliateLedger.ts'),
  // Reancorado 06/10 (KINEO-AFILIADOS-40-2026-10-06): o webhook paga effectiveAffiliateCommissionRate (lib pura).
  commission: read('lib/affiliateCommission.ts'),
  linkRoute: read('app/a/[code]/route.ts'),
  checkout: read('app/api/stripe/checkout/route.ts'),
  webhook: read('app/api/stripe/webhook/route.ts'),
  callback: read('app/auth/callback/route.ts'),
  activation: read('app/api/auth/activation-completed/route.ts'),
}

async function problems(S) {
  const p = []
  let destinations
  try { destinations = compile(S.destinations) } catch (e) { return ['affiliateDestinations não compila: ' + e.message] }
  // (0) filtro de robô
  for (const ua of BOT_UAS) if (!destinations.isAffiliatePreviewBot(ua)) p.push('robô contado como clique: ' + ua.slice(0, 60))
  for (const ua of HUMAN_UAS) if (destinations.isAffiliatePreviewBot(ua)) p.push('humano tratado como robô: ' + ua.slice(0, 60))

  // (1) fiação estática das portas de cadastro e do checkout (o resto é executado abaixo)
  for (const [name, src] of [['/auth/callback', S.callback], ['/api/auth/activation-completed', S.activation]]) {
    if (!/finalizeAffiliateSignupAttribution\(\{[\s\S]{0,200}get\('sf_aff'\)[\s\S]{0,200}get\('sf_aff_click'\)/.test(src)) p.push(`${name} não entrega sf_aff + sf_aff_click ao finalizador`)
  }
  if (!/resolveCustomAffiliateBeforeSubscription\(req, user, profile\)/.test(S.checkout)) p.push('checkout não resolve o dono antes de criar a sessão')

  const db = newDb()
  const events = []
  let attribution, finalizer, ledger, linkRoute, checkout, payment
  try {
    attribution = compile(S.attribution, { '@supabase/supabase-js': { createClient: () => db }, '@/lib/affiliateCode': compile(S.code) })
    finalizer = compile(S.finalizer, { 'server-only': {}, '@/lib/affiliateAttribution': attribution, '@/lib/serverEvents': { writeServerEvent: async (e) => { events.push(e); return true } } })
    ledger = compile(S.ledger)
    const mkRedirect = (url) => { const r = { location: String(url), writes: [] }; r.cookies = { set: (name, value, options) => r.writes.push({ name, value, options }) }; return r }
    linkRoute = compile(S.linkRoute, {
      'next/server': { NextResponse: { redirect: mkRedirect } }, crypto,
      '@supabase/supabase-js': { createClient: () => db },
      '@/lib/affiliateDestinations': destinations, '@/lib/affiliateAttribution': attribution,
      // a branch codex/nuvem-b2b-seo-lacos-0210 acrescenta o desvio de código de INDICAÇÃO; aqui o código é de afiliado.
      '@/lib/referralLanding': { findReferrerIdByCode: async () => null, recordReferralLanding: async () => null, normalizeReferralCode: () => null, REFERRAL_COOKIE: 'sf_ref', REFERRAL_COOKIE_MAX_AGE: 1 },
    })
    const begin = S.checkout.indexOf("const rwReferral = req.cookies.get('rewardful_referral')?.value")
    const end = S.checkout.indexOf('// KINEO-CHECKOUT-IDEMPOTENCY', begin)
    if (!(begin > 0 && end > begin)) return [...p, 'bloco de afiliado do checkout não encontrado']
    checkout = compile(declaration(S.checkout, 'resolveCustomAffiliateBeforeSubscription') +
      `\nexport async function run(req, user, profile) { const sessionParams = {metadata:{}, subscription_data:{metadata:{}}}; ${S.checkout.slice(begin, end)}; return sessionParams; }`, {}, attribution)
    payment = compile(declaration(S.webhook, 'RetryableAffiliateLedgerError') + '\n' + declaration(S.webhook, 'recordAffiliateCommission') + '\nexport { recordAffiliateCommission };', {}, {
      ...ledger, ...compile(S.commission), resolveAffiliateByCoupon: async () => null,
    })
  } catch (e) { return [...p, 'montagem da cadeia quebrou: ' + e.message] }

  const click = async (ua) => {
    now = NOW - 3600000
    try {
      return await linkRoute.GET({ nextUrl: new URL(`https://www.usekineo.com/a/${CODE}`), cookies: { get: () => undefined }, headers: { get: (k) => k === 'user-agent' ? ua : '' } }, { params: { code: CODE } })
    } finally { now = NOW }
  }
  // (2) robô não cunha prova nem cookie
  const botRes = await click(BOT_UAS[2])
  if (db.tables.affiliate_clicks.length !== 0 || botRes.writes.length !== 0) p.push('clique de robô gravou affiliate_clicks/cookie')
  // (3) humano: 1 clique + cookies financeiros
  const res = await click(HUMAN_UA)
  const jar = Object.fromEntries(res.writes.map((c) => [c.name, c.value]))
  if (db.tables.affiliate_clicks.length !== 1) p.push('clique humano não gravou affiliate_clicks')
  if (jar.sf_aff !== CODE || !jar.sf_aff_click) p.push('clique humano não entregou sf_aff + sf_aff_click')

  // (4) cadastro pelo OAuth (/auth/callback) — conta criada 30 min DEPOIS do clique
  const user = { id: 'buyer', email: 'buyer@example.test', createdAt: new Clock(NOW - 1800000).toISOString() }
  const fin = await finalizer.finalizeAffiliateSignupAttribution({ rawCode: jar.sf_aff, rawClickId: jar.sf_aff_click, user, source: 'auth_callback' })
  if (fin.outcome !== 'attributed') p.push('cadastro OAuth não atribuiu: ' + fin.outcome)
  if (db.tables.affiliate_referrals.length !== 1 || db.tables.profiles[0].affiliate_id !== 'aff-1') p.push('indicação/perfil não carimbados no cadastro')
  // a outra porta (e-mail e senha) repete sem duplicar
  const fin2 = await finalizer.finalizeAffiliateSignupAttribution({ rawCode: jar.sf_aff, rawClickId: jar.sf_aff_click, user, source: 'email_activation' })
  if (fin2.outcome !== 'already_attributed' || db.tables.affiliate_referrals.length !== 1) p.push('porta de e-mail duplicou a indicação')

  // (5) checkout grava o dono no metadata da sessão e da assinatura
  const params = await checkout.run({ cookies: { get: (k) => jar[k] ? { value: jar[k] } : undefined } }, { ...user, created_at: user.createdAt }, db.tables.profiles[0])
  if (params.metadata.affiliate_system !== 'custom' || params.subscription_data.metadata.affiliate_system !== 'custom') p.push('checkout não marcou affiliate_system=custom')

  // (6) webhook: eventos simulados → argumentos montados PELA ROTA → comissão real
  const sites = commissionCallSites(S.webhook)
  if (sites.length < 5) p.push(`webhook perdeu chamadas de comissão (${sites.length}, esperado ≥5)`)
  const evalArgs = (text, env) => new Function('session', 'userId', 'invoice', 'subscription', 'renewalUserId', 'subscriptionId', `return (${text})`)(env.session, env.userId, env.invoice, env.subscription, env.renewalUserId, env.subscriptionId)
  const session = {
    id: 'cs_sim_initial', object: 'checkout.session', mode: 'subscription', payment_status: 'paid', amount_total: 2990, currency: 'usd',
    metadata: { supabase_user_id: 'buyer', ...params.metadata }, total_details: { amount_discount: 0 },
  }
  const initialSite = sites.find((t) => /type: 'initial'/.test(t) && /paymentKind: 'subscription'/.test(t))
  const packSite = sites.find((t) => /paymentKind: 'one_time'/.test(t))
  // KINEO-TROCA-BUSINESS-2026-10-10 — re-ancorado: a fatura da subida para o Business (cobrada na hora) também paga comissão
  // 'recurring' e vem ANTES no arquivo; a renovação é a chamada de renewalUserId.
  const renewalSite = sites.find((t) => /type: 'recurring'/.test(t) && /userId: renewalUserId/.test(t))
  if (!initialSite || !packSite || !renewalSite) return [...p, 'webhook sem chamada de comissão inicial/pacote/renovação']
  const initialArgs = evalArgs(initialSite, { session, userId: session.metadata.supabase_user_id })
  try { await payment.recordAffiliateCommission(db, initialArgs); await payment.recordAffiliateCommission(db, initialArgs) } catch (e) { p.push('comissão inicial lançou: ' + e.message) }
  const c0 = db.tables.affiliate_commissions[0]
  if (db.tables.affiliate_commissions.length !== 1) p.push(`checkout.session.completed repetido gerou ${db.tables.affiliate_commissions.length} comissões (esperado 1)`)
  // Reancorado 06/10 (fundador: 30% → 40%): a linha do afiliado segue gravada com 0.3 e o webhook paga o piso, 40% de 2990 = 1196.
  if (!c0 || c0.affiliate_id !== 'aff-1' || c0.external_id !== 'cs_sim_initial' || c0.commission_amount !== 1196 || c0.type !== 'initial' || c0.status !== 'pending') p.push('comissão inicial errada: ' + JSON.stringify(c0))
  if (db.tables.affiliate_referrals[0].status !== 'paid') p.push('indicação não virou "paid" no pagamento da assinatura')
  // renovação: invoice.payment_succeeded (subscription_cycle) com a assinatura que o checkout gravou
  const subscription = { id: 'sub_sim', metadata: { supabase_user_id: 'buyer', ...params.subscription_data.metadata } }
  const invoice = { id: 'in_sim_cycle', billing_reason: 'subscription_cycle', amount_paid: 2990, currency: 'usd', subscription: 'sub_sim' }
  const renewalArgs = evalArgs(renewalSite, { invoice, subscription, renewalUserId: subscription.metadata.supabase_user_id, subscriptionId: 'sub_sim' })
  try { await payment.recordAffiliateCommission(db, renewalArgs) } catch (e) { p.push('comissão de renovação lançou: ' + e.message) }
  const c1 = db.tables.affiliate_commissions[1]
  if (!c1 || c1.type !== 'recurring' || c1.external_id !== 'in_sim_cycle' || c1.commission_amount !== 1196 || c1.affiliate_id !== 'aff-1') p.push('renovação não gerou comissão recorrente de 40%: ' + JSON.stringify(c1))
  // pacote avulso: comissão sim, "pagante" (assinante) não muda por ele
  const packSession = { ...session, id: 'cs_sim_pack', mode: 'payment', amount_total: 990 }
  try { await payment.recordAffiliateCommission(db, evalArgs(packSite, { session: packSession, userId: 'buyer' })) } catch (e) { p.push('comissão de pacote lançou: ' + e.message) }
  const c2 = db.tables.affiliate_commissions[2]
  if (!c2 || c2.commission_amount !== 396 || c2.type !== 'initial') p.push('pacote avulso sem comissão de 40%')
  // Rewardful dono da venda → nada no livro próprio
  const rw = evalArgs(initialSite, { session: { ...session, id: 'cs_sim_rw', metadata: { ...session.metadata, affiliate_system: 'rewardful' } }, userId: 'buyer' })
  await payment.recordAffiliateCommission(db, rw)
  if (db.tables.affiliate_commissions.some((c) => c.external_id === 'cs_sim_rw')) p.push('venda do Rewardful virou dívida no livro próprio')

  // (7) sem prova de clique não nasce dono (e portanto nenhuma comissão)
  const db2 = newDb()
  const attribution2 = compile(S.attribution, { '@supabase/supabase-js': { createClient: () => db2 }, '@/lib/affiliateCode': compile(S.code) })
  const r2 = await attribution2.attributeAffiliateForUser(CODE, user, { allowNewAttribution: true, clickId: null })
  if (r2.ok || db2.tables.affiliate_referrals.length) p.push('código sem clique virou indicação (sem prova)')
  return p
}

const real = await problems(REAL)
ok(real.length === 0, 'cadeia real: clique → cadastro (OAuth e e-mail) → checkout → webhook → comissão 40%' + (real.length ? ' — ' + real.join(' | ') : ''))

// ── Mutantes: cada um tem de derrubar a cadeia ──
const OLD_BOT = '/(facebookexternalhit|facebot|twitterbot|linkedinbot|slackbot|discordbot|whatsapp|telegrambot|googlebot|bingbot)/i'
const mutants = [
  ['filtro de robô de antes (sem crawlers)', { destinations: REAL.destinations.replace(/const AFFILIATE_PREVIEW_BOT =\s*\n\s*\/.*\/i/, `const AFFILIATE_PREVIEW_BOT =\n  ${OLD_BOT}`) }],
  ['filtro de robô que pega "bot" solto (derruba o celular Cubot)', { destinations: REAL.destinations.replace('[a-z]bot[\\/;)\\d]', 'bot') }],
  ['rota /a/ sem cookie de prova', { linkRoute: REAL.linkRoute.replace('res.cookies.set(CLICK_COOKIE, clickProofId', 'void (CLICK_COOKIE, clickProofId') }],
  ['callback deixa de ler sf_aff_click', { callback: REAL.callback.replace("rawClickId: requestCookies.get('sf_aff_click')?.value", 'rawClickId: null') }],
  ['checkout esquece o dono', { checkout: REAL.checkout.replace("const affiliateSystem = customAffiliateId ? 'custom'", "const affiliateSystem = false ? 'custom'") }],
  ['renovação manda o valor errado', { webhook: REAL.webhook.split("amountGross: invoice.amount_paid ?? 0").join('amountGross: 0') }],
  ['renovação marcada como inicial', { webhook: REAL.webhook.split("type: 'recurring', paymentKind: 'subscription'").join("type: 'initial', paymentKind: 'subscription'") }],
  ['comissão ignora o afiliado do perfil', { webhook: REAL.webhook.replace("let affiliateId = (prof?.affiliate_id as string | null | undefined) ?? null", 'let affiliateId = null as string | null') }],
  // Reancorado 06/10: a 40% a taxa fixa de 40% não é mais um defeito visível; o mutante realista é voltar a 30% cravado.
  ['ledger calcula comissão com taxa fixa de 30%', { ledger: REAL.ledger.replace('const amount = Math.round(amountGross * rate)', 'const amount = Math.round(amountGross * 0.3)') }],
  ['webhook volta a pagar a taxa crua gravada na linha (0.3)', { webhook: REAL.webhook.replace('const rate = effectiveAffiliateCommissionRate(aff.commission_rate)', 'const rate = Number(aff.commission_rate ?? 0)') }],
  ['primeiro toque aceita conta sem prova de clique', { attribution: REAL.attribution.replace("if (!clickId) return { ok: false, reason: 'invalid_click_proof' }", "if (!clickId) return { ok: true, affiliateId: affiliate.id, already: false }") }],
]
for (const [name, patch] of mutants) {
  const key = Object.keys(patch)[0]
  if (patch[key] === REAL[key]) { ok(false, `mutante "${name}" não alterou o fonte (âncora sumiu)`); continue }
  let caught = false
  try { caught = (await problems({ ...REAL, ...patch })).length > 0 } catch { caught = true }
  ok(caught, `mutante derrubado: ${name}`)
}

console.log(`\n${pass} ok · ${fail} falhas`)
process.exit(fail ? 1 : 0)
