// KINEO-PACOTE-3-FILMES-1610 — guardião do pacote "3 filmes feitos por nós" (US$ 19, pagamento único).
// OFFLINE: lê o código com readFileSync (sem alias @/, sem rede, sem .env). Onde dá, EXECUTA o código real:
//   · lib/dfyFilms3.ts inteiro (transpilado; ./ui/interfaceLanguage real; ./checkoutPricing com o prazo lido do arquivo);
//   · recordDfyFilms3OrderPaid extraído do webhook, contra um banco FALSO em memória.
// Provas:
//   P1  preço 19 de UMA constante (DFY_FILMS3_PRICE_USD_MINOR = 1900); checkout, página e copy leem dela, nenhum 1900/19
//       digitado nas superfícies do pacote;
//   P2  pagamento único: Checkout Session mode 'payment', price_data inline, sem recurring/subscription, nenhum
//       produto/preço criado na Stripe;
//   P3  webhook idempotente: reentrega não regrava o pedido, não duplica o evento, não rebaixa um pedido entregue; falha
//       do banco lança o erro que devolve 500 (a Stripe reenvia); o ramo vem ANTES do fallback por valor (1900 = legado
//       "$19 → 25 créditos") e a retomada do evento duplicado está liberada;
//   P4  pedido gravado: pending_payment → paid com a sessão; pedido sumido é gravado pela cópia da metadata;
//   P5  e-mail ao fundador: "Pedido novo de 3 filmes — <tema>", chamado no ramo do webhook DEPOIS de gravar;
//   P6  e-mail de entrega SEM link nenhum (texto e html), sem rodapé com link, e só na transição para 'delivered';
//   P7  página exige login (sem sessão → /signup?redirect=/done-for-you ANTES de renderizar); rota do pedido e checkout
//       também recusam anônimo;
//   P8  nenhuma promessa falsa: nada de "unlimited", nenhum prazo menor que 48 h, garantia sem "monthly"/"annual";
//   M   mutantes: cada regra quebrada fica vermelha, e cada mutante prova que aplicou.
import fs from 'node:fs'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(path.join(ROOT, 'package.json'))
const ts = require('typescript')
const lf = (s) => String(s).replace(/\r\n/g, '\n')
const rd = (rel) => lf(fs.readFileSync(path.join(ROOT, rel), 'utf8'))
/** Código sem comentários de linha (o porquê nos comentários cita números que o código não usa, ex.: "1900 = bulk10"). */
const code = (s) => String(s).replace(/(^|[ \t])\/\/.*$/gm, '$1')

const FILES = {
  lib: 'lib/dfyFilms3.ts',
  iface: 'lib/ui/interfaceLanguage.ts',
  pricing: 'lib/checkoutPricing.ts',
  checkout: 'app/api/stripe/checkout/route.ts',
  webhook: 'app/api/stripe/webhook/route.ts',
  alert: 'lib/founderAlert.ts',
  page: 'app/done-for-you/page.tsx',
  form: 'app/done-for-you/DoneForYouForm.tsx',
  order: 'app/api/dfy-films/order/route.ts',
  adminApi: 'app/api/admin/dfy-films/route.ts',
  adminPage: 'app/admin/pedidos/page.tsx',
  pricingPage: 'app/pricing/PricingClient.tsx',
  modal: 'components/offers/ConversionUpgrade.tsx',
  recovery: 'app/api/admin/send-checkout-recovery/route.ts',
  migration: 'supabase/migrations/20261016120000_done_for_you_orders.sql',
}
const ORIGINAL = Object.fromEntries(Object.entries(FILES).map(([k, f]) => [k, rd(f)]))

// ─── utilidades ──────────────────────────────────────────────────────────────────────────────────────────────────
function transpile(code) {
  return ts.transpileModule(code, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText
}
function evalModule(code, requireMap) {
  const module = { exports: {} }
  new Function('exports', 'require', 'module', transpile(code))(module.exports, (id) => {
    if (!(id in requireMap)) throw new Error('import inesperado: ' + id)
    return requireMap[id]
  }, module)
  return module.exports
}
/** Corpo de uma função de topo (do `async function nome(` até a `}` na coluna 0). */
function extractFn(src, name) {
  const start = src.indexOf(`async function ${name}(`)
  if (start < 0) return null
  const end = src.indexOf('\n}\n', start)
  return end < 0 ? null : src.slice(start, end + 2)
}
function loadLib(S) {
  const days = Number((S.pricing.match(/export const MONTHLY_REFUND_DAYS = (\d+)/) || [])[1])
  const iface = evalModule(S.iface, {})
  return evalModule(S.lib, { './ui/interfaceLanguage': iface, './checkoutPricing': { MONTHLY_REFUND_DAYS: days } })
}

// ─── banco falso (o mínimo do supabase-js que o webhook usa) ─────────────────────────────────────────────────────
function makeDb(seed = {}, { failUpdate = false } = {}) {
  const tables = { done_for_you_orders: [...(seed.done_for_you_orders ?? [])].map((r) => ({ ...r })), events: [] }
  let seq = 0
  class Q {
    constructor(t) { this.t = t; this.op = 'select'; this.filters = []; this.orFilters = null }
    select() { return this }
    update(p) { this.op = 'update'; this.patch = p; return this }
    insert(r) { this.op = 'insert'; this.row = r; return this }
    eq(c, v) { this.filters.push((r) => r[c] === v); return this }
    or(str) { this.orFilters = str.split(',').map((part) => { const [c, , ...v] = part.split('.'); const val = v.join('.'); return (r) => r[c] === val }); return this }
    limit() { return this }
    order() { return this }
    match(r) { return this.filters.every((f) => f(r)) && (!this.orFilters || this.orFilters.some((f) => f(r))) }
    then(res, rej) { return Promise.resolve().then(() => this.exec()).then(res, rej) }
    exec() {
      const rows = tables[this.t]
      if (this.op === 'insert') {
        const row = { ...this.row }
        if (!row.id) row.id = `gen-${++seq}`
        if (rows.some((r) => r.id === row.id)) return { data: null, error: { code: '23505', message: 'dup id' } }
        if (this.t === 'done_for_you_orders' && row.stripe_session_id && rows.some((r) => r.stripe_session_id === row.stripe_session_id)) return { data: null, error: { code: '23505', message: 'dup session' } }
        rows.push(row)
        return { data: [{ ...row }], error: null }
      }
      if (this.op === 'update') {
        if (failUpdate) return { data: null, error: { code: 'XX000', message: 'banco caiu' } }
        const hit = rows.filter((r) => this.match(r))
        hit.forEach((r) => Object.assign(r, this.patch))
        return { data: hit.map((r) => ({ ...r })), error: null }
      }
      return { data: rows.filter((r) => this.match(r)).map((r) => ({ ...r })), error: null }
    }
  }
  return { tables, from: (t) => new Q(t) }
}

function loadRecord(S, lib) {
  const fnSrc = extractFn(S.webhook, 'recordDfyFilms3OrderPaid')
  if (!fnSrc) return null
  class RetryableCheckoutAnalyticsError extends Error {}
  const js = transpile(fnSrc)
  const factory = new Function('createHash', 'sessionOwnerUuid', 'isOwnerRejection', 'RetryableCheckoutAnalyticsError', 'DFY_FILMS3_EVENTS', 'DFY_FILMS3_PACK_ID', 'DFY_FILMS3_PRICE_USD_MINOR', `${js}\nreturn recordDfyFilms3OrderPaid`)
  const fn = factory(createHash, (s) => s.metadata?.supabase_user_id ?? null, (c) => c === '23503' || c === '22P02', RetryableCheckoutAnalyticsError, lib.DFY_FILMS3_EVENTS, lib.DFY_FILMS3_PACK_ID, lib.DFY_FILMS3_PRICE_USD_MINOR)
  return { fn, RetryableCheckoutAnalyticsError }
}

// ─── as provas (cada uma recebe as fontes e devolve a lista de falhas) ───────────────────────────────────────────
const ORDER_ID = '11111111-2222-4333-8444-555555555555'
const USER = '99999999-8888-4777-8666-555555555555'
function session(over = {}) {
  return {
    id: 'cs_test_dfy3_1', mode: 'payment', payment_status: 'paid', amount_total: 1900, currency: 'usd',
    customer_details: { email: 'buyer@example.com' }, client_reference_id: USER,
    metadata: { supabase_user_id: USER, pack: 'dfy_films3', dfy_order_id: ORDER_ID, dfy_topic: 'Deep ocean facts', dfy_language: 'pt', dfy_version: 'v1' },
    ...over,
  }
}

async function checks(S) {
  const f = []
  const need = (c, m) => { if (!c) f.push(m) }
  let lib
  try { lib = loadLib(S) } catch (e) { return ['lib/dfyFilms3.ts não executa: ' + e.message] }

  // P1 — preço de uma constante
  need(lib.DFY_FILMS3_PRICE_USD_MINOR === 1900, 'P1 DFY_FILMS3_PRICE_USD_MINOR !== 1900')
  need(lib.dfyFilms3PriceLabel() === 'US$19', 'P1 rótulo do preço não é US$19: ' + lib.dfyFilms3PriceLabel())
  const ck = extractFn(S.checkout, 'buildDfyFilms3AndRedirect') ?? ''
  need(ck.length > 0, 'P1 buildDfyFilms3AndRedirect ausente no checkout')
  need(/const unitAmount = DFY_FILMS3_PRICE_USD_MINOR\b/.test(ck) && /settlementAmountMinor\(unitAmount, chargeCurrency\)/.test(ck), 'P1 checkout não cobra a constante (via moeda de liquidação)')
  need(/unit_amount: chargeAmount/.test(ck), 'P1 unit_amount não é o valor derivado da constante')
  const priceSurfaces = { checkoutFn: code(ck), page: code(S.page), form: code(S.form), order: code(S.order), alert: code(extractFn(S.alert, 'alertFounderDfyFilms3Order') ?? '') }
  for (const [k, src] of Object.entries(priceSurfaces)) need(!/\b1900\b|\$\s?19\b|US\$\s?19\b|\b19\.00\b/.test(src), `P1 preço digitado à mão em ${k}`)
  need(/packParam === DFY_FILMS3_PACK_ID\)\s*\{\s*return await buildDfyFilms3AndRedirect\(req\)/.test(S.checkout), 'P1 o GET do checkout não roteia ?pack=dfy_films3')
  need(S.checkout.indexOf('packParam === DFY_FILMS3_PACK_ID') < S.checkout.indexOf('return await buildPackAndRedirect(req, true)'), 'P1 o ramo do pacote vem depois do fallback do Starter Pack')

  // P2 — pagamento único
  need(/mode: 'payment'/.test(ck), "P2 sessão não é mode 'payment'")
  need(!/subscription|recurring/.test(ck.replace(/no subscription/gi, '')), 'P2 sessão do pacote menciona recurring/subscription')
  need(/price_data:\s*\{/.test(ck), 'P2 sem price_data inline')
  need(!/stripe\.(prices|products)\.create/.test(ck), 'P2 cria produto/preço na Stripe')
  need(/pack: DFY_FILMS3_PACK_ID/.test(ck) && /dfy_order_id: orderId/.test(ck), 'P2 metadata.pack / dfy_order_id ausentes')
  need(!/kind:\s*'dfy'/.test(ck), "P2 metadata.kind='dfy' faria o webhook tratar como pedido Empresas")
  need(/oneTimeIdempotencyKey\(\{[\s\S]*order_id: orderId/.test(ck), 'P2 chave de idempotência da sessão sem o pedido')
  need(/order\.user_id !== user\.id/.test(ck) && /order\.status !== 'pending_payment'/.test(ck), 'P2 checkout não confere dono e status do pedido')

  // P3/P4 — webhook executado
  const rec = loadRecord(S, lib)
  need(!!rec, 'P3 recordDfyFilms3OrderPaid ausente no webhook')
  if (rec) {
    // A: pedido pendente → pago, uma vez só
    const dbA = makeDb({ done_for_you_orders: [{ id: ORDER_ID, user_id: USER, topic: 'Deep ocean facts', language: 'pt', style: null, status: 'pending_payment' }] })
    try {
      const r1 = await rec.fn(dbA, 'evt_1', session())
      const r2 = await rec.fn(dbA, 'evt_2', session())
      const o = dbA.tables.done_for_you_orders
      need(o.length === 1 && o[0].status === 'paid' && o[0].stripe_session_id === 'cs_test_dfy3_1' && o[0].paid_at, 'P4 pedido pendente não virou pago com a sessão')
      need(r1.fresh === true && r2.fresh === false, 'P3 a reentrega foi tratada como pedido novo')
      need(dbA.tables.events.filter((e) => e.name === 'dfy_films3_order_paid').length === 1, 'P3 evento dfy_films3_order_paid duplicado (ou ausente) na reentrega')
      need(r1.topic === 'Deep ocean facts' && r1.language === 'pt', 'P5 tema/língua não voltam para o aviso')
    } catch (e) { f.push('P3 cenário A lançou: ' + e.message) }
    // B: pedido sumido → gravado pela metadata, uma vez
    const dbB = makeDb()
    try {
      await rec.fn(dbB, 'evt_1', session())
      await rec.fn(dbB, 'evt_1', session())
      const o = dbB.tables.done_for_you_orders
      need(o.length === 1 && o[0].status === 'paid' && o[0].topic === 'Deep ocean facts' && o[0].id === ORDER_ID, 'P4 pedido sem linha não foi gravado pela metadata (ou duplicou)')
    } catch (e) { f.push('P4 cenário B lançou: ' + e.message) }
    // C: já entregue + reentrega → continua entregue
    const dbC = makeDb({ done_for_you_orders: [{ id: ORDER_ID, user_id: USER, topic: 'x', language: 'en', status: 'delivered', stripe_session_id: 'cs_test_dfy3_1' }] })
    try {
      await rec.fn(dbC, 'evt_9', session())
      need(dbC.tables.done_for_you_orders[0].status === 'delivered', 'P3 reentrega rebaixou um pedido entregue para pago')
    } catch (e) { f.push('P3 cenário C lançou: ' + e.message) }
    // D: banco caiu → lança o erro que devolve 500
    const dbD = makeDb({ done_for_you_orders: [{ id: ORDER_ID, status: 'pending_payment', topic: 'x', language: 'en' }] }, { failUpdate: true })
    let threw = null
    try { await rec.fn(dbD, 'evt_1', session()) } catch (e) { threw = e }
    need(threw instanceof rec.RetryableCheckoutAnalyticsError, 'P3 falha do banco não lança RetryableCheckoutAnalyticsError (a Stripe não reenviaria)')
  }
  const branchIdx = S.webhook.indexOf('if (isDfyFilms3Session(session)) {')
  need(branchIdx > 0, 'P3 ramo isDfyFilms3Session ausente no Path A')
  need(branchIdx < S.webhook.indexOf('const metaCredits = Number(session.metadata?.pack_credits'), 'P3 ramo do pacote vem DEPOIS da conta de crédito (1900 = 25 créditos do legado)')
  const branch = S.webhook.slice(branchIdx, branchIdx + 600)
  need(/recordDfyFilms3OrderPaid\(supabase, event\.id, session\)[\s\S]*alertFounderDfyFilms3Order\([\s\S]*break/.test(branch), 'P5 o ramo não grava e DEPOIS avisa o fundador (e sai)')
  need(/!isDfyOrderSession\(duplicateSession\) && !isDfyFilms3Session\(duplicateSession\)/.test(S.webhook), 'P3 a retomada do evento duplicado não inclui o pacote')
  need(lib.isDfyFilms3Session(session()) && !lib.isDfyFilms3Session(session({ metadata: { pack: 'bulk10' } })) && !lib.isDfyFilms3Session(session({ mode: 'subscription' })), 'P3 reconhecimento da sessão não é pela metadata.pack exata')
  need(/stripe_session_id\s+text unique/.test(S.migration) && /'pending_payment', 'paid', 'in_production', 'delivered'/.test(S.migration), 'P4 migration sem stripe_session_id único ou sem os 4 status')

  // P5 — aviso ao fundador
  need(lib.founderOrderSubject('Deep ocean facts') === 'Pedido novo de 3 filmes — Deep ocean facts', 'P5 assunto do aviso ao fundador errado: ' + lib.founderOrderSubject('Deep ocean facts'))
  const al = extractFn(S.alert, 'alertFounderDfyFilms3Order') ?? ''
  need(/founderOrderSubject\(input\.topic\)/.test(al) && /alertFounderOnce\(\{ kind: 'dfy_films3_order'/.test(al), 'P5 alertFounderDfyFilms3Order não usa o assunto único / a reserva 1×/sessão')

  // P6 — e-mail de entrega sem link
  const mail = lib.deliveryEmail('3 strange facts about the deep ocean at https://evil.example')
  const noLink = (s) => !/https?:\/\/|www\.|<a\b|href=|\.com\b|usekineo/i.test(s.replace('https://evil.example', ''))
  need(noLink(mail.text) && noLink(mail.html) && noLink(mail.subject), 'P6 e-mail de entrega tem link')
  need(/Library/.test(mail.subject) && /Library/.test(mail.text), 'P6 e-mail de entrega não diz "Library"')
  need(/deliveryEmail\(/.test(S.adminApi) && !/emailFooter|unsubscribeHeaders|https?:\/\//.test(S.adminApi.replace("'https://api.resend.com/emails'", '')), 'P6 rota de entrega acrescenta link/rodapé ao e-mail')
  need(/\.eq\('status', from\)/.test(S.adminApi) && /if \(to !== 'delivered'\) return/.test(S.adminApi), 'P6 e-mail não depende da transição guardada para delivered')
  need(lib.dfyFilms3NextStatusAllowed('paid', 'in_production') && lib.dfyFilms3NextStatusAllowed('in_production', 'delivered') && !lib.dfyFilms3NextStatusAllowed('delivered', 'in_production') && !lib.dfyFilms3NextStatusAllowed('pending_payment', 'delivered'), 'P6 transições de status erradas')
  need(/isAdminEmail\(/.test(S.adminApi) && /isAdminEmail\(/.test(S.adminPage), 'P6 /admin do pacote sem portão de admin')

  // P7 — login exigido
  const gate = S.page.indexOf("if (!user) redirect(`/signup?redirect=${encodeURIComponent('/done-for-you')}`)")
  need(gate > 0 && gate < S.page.indexOf('return ('), 'P7 página não exige login antes de renderizar')
  need(/if \(!user\) return NextResponse\.json\(\{ error: 'Please sign in first\.'/.test(S.order), 'P7 rota do pedido aceita anônimo')
  need(/if \(authError \|\| !user\) \{[\s\S]{0,300}\/signup\?redirect=/.test(ck), 'P7 checkout aceita anônimo')
  need(lib.dfyFilms3Eligible({ plan: 'free' }) && !lib.dfyFilms3Eligible({ plan: 'pro' }) && !lib.dfyFilms3Eligible({ plan: 'basic' }), 'P7 assinante pode comprar o pacote (é para quem NÃO assina)')
  const okBrief = lib.parseDfyFilms3Brief({ topic: 'Deep ocean facts', language: 'pt', style: '' })
  need(okBrief.ok && okBrief.brief.style === null && !lib.parseDfyFilms3Brief({ topic: 'Deep ocean facts', language: 'xx' }).ok && !lib.parseDfyFilms3Brief({ topic: 'a', language: 'en' }).ok, 'P7 validação do briefing errada')
  need(lib.DFY_FILMS3_LANGUAGES.length === 16, 'P7 formulário não oferece as 16 línguas')

  // P8 — nada de promessa falsa
  const promiseSurfaces = { lib: S.lib, page: S.page, form: S.form, checkoutFn: ck, alert: al, adminApi: S.adminApi }
  for (const [k, src] of Object.entries(promiseSurfaces)) {
    need(!/unlimited/i.test(src), `P8 "unlimited" em ${k}`)
    for (const m of src.matchAll(/\b(\d{1,3})\s*(?:-|\s)?(?:h|hrs?|hours?)\b/gi)) {
      if (Number(m[1]) < 48) f.push(`P8 prazo de ${m[1]} h em ${k}`)
    }
    need(!/same[- ]day|within (a|one) day|\btoday\b|in minutes/i.test(src.replace(/today/gi, (x, i) => (/\/\//.test(src.slice(Math.max(0, i - 200), i).split('\n').pop()) ? '' : x))), `P8 promessa de entrega imediata em ${k}`)
  }
  need(lib.DFY_FILMS3_DELIVERY_HOURS >= 48, 'P8 prazo menor que 48 h')
  need(!/monthly|annual/i.test(lib.DFY_FILMS3_GUARANTEE) && /refund/i.test(lib.DFY_FILMS3_GUARANTEE), 'P8 garantia do pacote fala de assinatura (ou não fala de reembolso)')
  need(/DFY_FILMS3_GUARANTEE/.test(S.page) && /Not included:<\/strong> a subscription/.test(S.page), 'P8 página sem a garantia ou sem "não inclui assinatura"')

  // portas de entrada (sem mexer na home)
  need(/dfyFilms3EntryHref\('pricing'\)/.test(S.pricingPage) && /dfyFilms3EntryHref\('upgrade_modal'\)/.test(S.modal) && /dfyFilms3EntryHref\('checkout_recovery_email'\)/.test(S.recovery), 'entrada: falta o link em preços, modal ou e-mail de checkout expirado')
  need(lib.dfyFilms3EntryCopy() === 'Prefer we make it for you? 3 films for US$19', 'entrada: frase do link mudou: ' + lib.dfyFilms3EntryCopy())
  return f
}

// ─── execução: o código real verde, cada mutante vermelho ────────────────────────────────────────────────────────
// Os logs do webhook executado não poluem a saída do guardião.
const realLog = console.log
const quiet = { log: () => {}, error: () => {}, warn: () => {} }
const say = (m) => realLog(m)
const runChecks = async (S) => { const o = { log: console.log, error: console.error, warn: console.warn }; Object.assign(console, quiet); try { return await checks(S) } finally { Object.assign(console, o) } }
let failures = 0
const base = await runChecks(ORIGINAL)
if (base.length) { failures++; console.log('FAIL código real:\n  ' + base.join('\n  ')) } else console.log('  ok  código real: P1–P8 verdes')

const MUTANTS = [
  ['preço 1900 → 1500', 'lib', 'export const DFY_FILMS3_PRICE_USD_MINOR = 1900', 'export const DFY_FILMS3_PRICE_USD_MINOR = 1500'],
  ['checkout cobra literal', 'checkout', 'const unitAmount = DFY_FILMS3_PRICE_USD_MINOR', 'const unitAmount = 1900'],
  ['checkout vira assinatura', 'checkout', "    mode: 'payment',\n    line_items: [\n      {\n        price_data: {\n          currency: chargeCurrency,\n          product_data: {\n            name: `Kineo — ${DFY_FILMS3_FILMS} films", "    mode: 'subscription',\n    line_items: [\n      {\n        price_data: {\n          currency: chargeCurrency,\n          product_data: {\n            name: `Kineo — ${DFY_FILMS3_FILMS} films"],
  ['checkout cria preço na Stripe', 'checkout', '  const dfyIdempotencyKey = oneTimeIdempotencyKey({', '  await stripe.prices.create({} as never)\n  const dfyIdempotencyKey = oneTimeIdempotencyKey({'],
  ['update sem guarda de status', 'webhook', "      .eq('id', orderId)\n      .eq('status', 'pending_payment')\n      .select('id, topic, language, style')", "      .eq('id', orderId)\n      .select('id, topic, language, style')"],
  ['evento com id aleatório', 'webhook', 'update(`${DFY_FILMS3_EVENTS.orderPaid}:${session.id}`)', 'update(`${DFY_FILMS3_EVENTS.orderPaid}:${session.id}:${Math.random()}`)'],
  ['erro do banco engolido', 'webhook', "      throw new RetryableCheckoutAnalyticsError(`dfy_films3 order not recorded (${updErr.code ?? 'unknown'})`)\n    }\n    if (updated", "      return { orderId, topic, language, style, fresh: false }\n    }\n    if (updated"],
  ['sem aviso ao fundador', 'webhook', '            await alertFounderDfyFilms3Order({ session, orderId: films3.orderId, topic: films3.topic, language: films3.language, style: films3.style })\n', ''],
  ['ramo do webhook removido', 'webhook', 'if (isDfyFilms3Session(session)) {', 'if (false) {'],
  ['retomada sem o pacote', 'webhook', ' && !isDfyFilms3Session(duplicateSession)', ''],
  ['e-mail de entrega com link', 'lib', "'To watch and download them: open Kineo, sign in with this email, open Library in the menu, and pick the Videos tab.',", "'Watch them here: https://www.usekineo.com/library',"],
  ['página sem login', 'page', "  if (!user) redirect(`/signup?redirect=${encodeURIComponent('/done-for-you')}`)\n", ''],
  ['promessa unlimited', 'page', 'Not included:</strong> a subscription.', 'Not included:</strong> a subscription. Unlimited revisions.'],
  ['prazo 48 → 24', 'lib', 'export const DFY_FILMS3_DELIVERY_HOURS = 48', 'export const DFY_FILMS3_DELIVERY_HOURS = 24'],
  ['assinante pode comprar', 'lib', "new Set(['starter', 'basic', 'pro', 'business', 'autopilot', 'autopilot_lite'])", "new Set([])"],
  ['assunto do fundador trocado', 'lib', 'return `Pedido novo de 3 filmes — ${shortTopic(topic)}`', 'return `Pedido — ${shortTopic(topic)}`'],
  ['e-mail sem guarda de transição', 'adminApi', ".eq('id', orderId).eq('status', from).select('id')", ".eq('id', orderId).select('id')"],
  ['link fora do modal', 'modal', "dfyFilms3EntryHref('upgrade_modal')", "'/pricing'"],
]
for (const [name, key, from, to] of MUTANTS) {
  const src = ORIGINAL[key]
  if (!src.includes(from)) { failures++; console.log(`FAIL mutante "${name}" não aplicou (trecho não encontrado em ${FILES[key]})`); continue }
  const mutated = { ...ORIGINAL, [key]: src.split(from).join(to) }
  if (mutated[key] === src) { failures++; console.log(`FAIL mutante "${name}" não mudou nada`); continue }
  const r = await runChecks(mutated)
  if (r.length === 0) { failures++; console.log(`FAIL mutante "${name}" passou verde`) } else console.log(`  ok  mutante "${name}" vermelho (${r[0]})`)
}

if (failures) { console.log(`\n${failures} falha(s)`); process.exit(1) }
say(`\nOK — pacote 3 filmes: P1–P8 verdes e ${MUTANTS.length} mutantes vermelhos`)
