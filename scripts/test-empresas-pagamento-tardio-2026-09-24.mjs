// COWORK-RELATORIO-2026-09-24 (achado 2) — o endpoint de produção da Stripe (we_1TTmlFIah5dxzSBfJYlFuEOe) escuta 8 eventos e
// NÃO escuta checkout.session.async_payment_succeeded/failed. O Cowork pediu duas provas antes de o fundador ligar os 2 eventos:
//  (a) checkout.session.completed com payment_status != 'paid' NÃO grava dfy_order_paid nem dá crédito;
//  (b) o código já trata async_payment_succeeded/failed, então adicionar os eventos no endpoint não gera 2xx vazio nem 500.
// As duas já eram verdade no código (desde 5123e3f3, 01/09); este guardião as prende, amarradas à variável que decide
// (checkoutSettled), não à contagem de texto. Medido no banco em 24/09: 0 checkout_payment_pending e 0
// checkout_async_payment_failed na história, contra 24 payment_success — ninguém caiu no caminho lento até hoje.
// Estilo da casa: readFileSync + regex para a rota; módulo puro por transpile + vm. `ok(cond, nome)`.
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import vm from 'node:vm'
import ts from 'typescript'

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..')
const rd = (p) => readFileSync(join(RAIZ, p), 'utf8').replace(/\r\n/g, '\n')
let passou = 0
const falhas = []
const ok = (cond, nome) => { if (cond) passou++; else falhas.push(nome) }

// ── 1. o predicado de "pagamento liquidado" (módulo puro) ─────────────────────────────────────────────
const js = ts.transpileModule(rd('lib/stripeCheckoutAsyncSettlement.ts'), { compilerOptions: { module: 1, target: 9 } }).outputText
const mod = { exports: {} }
vm.runInNewContext(js, { exports: mod.exports, module: mod, require: (s) => { if (s === 'node:crypto' || s === 'crypto') return { createHash }; throw new Error('import inesperado: ' + s) }, Number, String, RegExp, Object, Array, Math, JSON, Set, Map, Error })
const settled = mod.exports.checkoutPaymentIsSettled
ok(typeof settled === 'function', '1a. checkoutPaymentIsSettled existe em lib/stripeCheckoutAsyncSettlement.ts')
ok(settled('paid') === true && settled('no_payment_required') === true, '1b. paid e no_payment_required contam como liquidado')
ok(['unpaid', '', null, undefined, 'processing', 'PAID'].every((s) => settled(s) === false), '1c. unpaid, vazio, nulo e qualquer outro status NÃO contam como liquidado (Boleto/SEPA chegam unpaid)')

// ── 2. o bloco de completed + async_payment_succeeded na rota ──────────────────────────────────────────
const wh = rd('app/api/stripe/webhook/route.ts')
const iSwitch = wh.indexOf('    switch (event.type) {')
const iCase = wh.indexOf("      case 'checkout.session.completed':\n      case 'checkout.session.async_payment_succeeded': {", iSwitch)
ok(iSwitch > 0 && iCase > iSwitch, '2a. async_payment_succeeded cai no MESMO bloco de completed (sucesso tardio entrega pelo mesmo caminho)')
const iFimCase = wh.indexOf("      case 'checkout.session.async_payment_failed': {", iCase)
const bloco = iCase > 0 && iFimCase > iCase ? wh.slice(iCase, iFimCase) : ''
ok(bloco.length > 0, '2b. o bloco termina onde começa async_payment_failed')
const gate = bloco.match(/const checkoutSettled = checkoutPaymentIsSettled\(session\.payment_status\)\n\s*if \(!checkoutSettled\) \{\n([\s\S]*?)\n\s{8}\}\n/)
const ramoPendente = gate ? gate[1] : ''
ok(Boolean(gate), '2c. o portão lê session.payment_status e o ramo de não-liquidado existe')
ok(/await recordAsyncCheckoutState\(session, 'pending'\)/.test(ramoPendente) && /^\s*break$/m.test(ramoPendente), "2d. não-liquidado grava checkout_payment_pending e SAI do bloco (break) antes de qualquer entrega")
ok(!/recordDfyOrderPaid|recordPaymentSuccess|grant|credits/.test(ramoPendente), '2e. o ramo de não-liquidado não grava pedido, venda nem crédito')
const iGate = gate ? bloco.indexOf(gate[0]) : -1
const iFimGate = iGate >= 0 ? iGate + gate[0].length : -1
const iDfy = bloco.indexOf('await recordDfyOrderPaid(supabase, event.id, session)')
const iVenda = bloco.indexOf('await recordPaymentSuccess(supabase, event.id, session)')
ok(iGate >= 0 && iDfy > iFimGate && iVenda > iFimGate, `2f. pedido Empresas (dfy_order_paid) e payment_success só depois do portão (portão ${iGate}, venda ${iVenda}, pedido ${iDfy})`)
const chamadasDfy = wh.split('await recordDfyOrderPaid(').length - 1
ok(chamadasDfy === 1, `2g. recordDfyOrderPaid tem UM chamador em toda a rota (${chamadasDfy}) — nenhum caminho grava pedido sem passar pelo portão`)
const corpoDfy = wh.slice(wh.indexOf('async function recordPaymentSuccess('), wh.indexOf('async function recordPaymentSuccess(') + 400)
ok(/if \(session\.payment_status !== 'paid'\) return/.test(corpoDfy), '2h. payment_success tem a própria trava de paid (cinto e suspensório)')

// ── 3. async_payment_failed: registra e não entrega ────────────────────────────────────────────────────
const falhou = wh.slice(iFimCase, wh.indexOf("      case 'checkout.session.expired': {", iFimCase))
ok(/await recordAsyncCheckoutState\(session, 'failed'\)/.test(falhou) && /break/.test(falhou), '3a. async_payment_failed grava checkout_async_payment_failed e para')
ok(!/recordDfyOrderPaid|recordPaymentSuccess|grant|credits/.test(falhou), '3b. async_payment_failed não grava pedido, venda nem crédito')

// ── 4. reentrega da Stripe: o pedido Empresas retoma, não sai como duplicate:true ───────────────────────
const dedupe = wh.slice(wh.indexOf("if (dedupeErr.code === '23505') {"), iSwitch)
ok(/event\.type === 'checkout\.session\.async_payment_succeeded'/.test(dedupe) && /!isDfyOrderSession\(duplicateSession\)/.test(dedupe),
  '4a. um async_payment_succeeded reentregue de pedido Empresas retoma o registro (idempotente) em vez de sair como duplicado')

// ── 5. comportamento: as funções REAIS da rota contra um banco falso ────────────────────────────────────
// Auditoria de 24/09 (workflow de 13 agentes, cada achado verificado por cético): (F1) recordDfyOrderPaid engolia o
// erro de insert e o webhook devolvia 200 — soluço do banco = pedido pago das Empresas perdido sem reenvio da Stripe;
// (F2) recordAsyncCheckoutState com dono apagado (uuid válido, FK 23503) devolvia 500 em laço por dias.
// As funções saem do texto da rota (declaração de topo até o "}" da coluna 0) e rodam por transpile + vm.
function extrai(nome) {
  const m = wh.match(new RegExp('\\n((?:async )?(?:function|class) ' + nome + '\\b[\\s\\S]*?\\n\\}\\n)'))
  if (!m) throw new Error('não achei ' + nome + ' na rota')
  return m[1]
}
const constUuid = (wh.match(/\nconst SESSION_OWNER_UUID = [^\n]+\n/) || [''])[0]
const fontes = [constUuid, ...['RetryableCheckoutAnalyticsError', 'sessionPaymentLinkId', 'dfySessionTier', 'sessionOwnerUuid', 'isOwnerRejection', 'recordDfyOrderPaid', 'recordAsyncCheckoutState'].map(extrai)].join('\n')
const jsRota = ts.transpileModule(fontes + '\nmodule.exports = { RetryableCheckoutAnalyticsError, recordDfyOrderPaid, recordAsyncCheckoutState }\n', { compilerOptions: { module: 1, target: 9 } }).outputText
const escritas = []
let respostasEscrita = []
const ctx = {
  module: { exports: {} }, createHash, console: { log() {}, error() {}, warn() {} }, Error, Promise, JSON, Object, Array, String, RegExp, Number,
  dfyTierForLink: () => null,
  writeServerEvent: async (input) => { escritas.push(input); return respostasEscrita.length ? respostasEscrita.shift() : true },
  stripeCheckoutSessionReference: mod.exports.stripeCheckoutSessionReference,
  buildStripeAsyncCheckoutMetadata: mod.exports.buildStripeAsyncCheckoutMetadata,
}
vm.runInNewContext(jsRota, ctx)
const { RetryableCheckoutAnalyticsError: Retry, recordDfyOrderPaid, recordAsyncCheckoutState } = ctx.module.exports
const DONO = '11111111-2222-4333-8444-555555555555'
const sessao = { id: 'cs_test_tardio', mode: 'payment', payment_status: 'paid', client_reference_id: DONO, metadata: {}, payment_link: 'plink_x', amount_total: 3500, currency: 'usd', customer_details: { email: 'a@b.c', name: 'Padaria' }, custom_fields: [] }
function bancoFalso(existente, respostasInsert) {
  const inserts = []
  const consulta = { select: () => consulta, eq: () => consulta, contains: () => consulta, limit: async () => ({ data: existente ? [{ id: 'x' }] : [], error: null }) }
  return { inserts, from: () => ({ ...consulta, insert: async (row) => { inserts.push(row); return { error: respostasInsert.shift() ?? null } } }) }
}
async function resultado(fn) { try { await fn(); return 'ok' } catch (e) { return e instanceof Retry ? 'retry' : 'outro:' + (e && e.message) } }

let b = bancoFalso(false, [{ code: '57014', message: 'statement timeout' }])
ok((await resultado(() => recordDfyOrderPaid(b, 'evt_1', sessao))) === 'retry' && b.inserts.length === 1, '5a. F1: insert do pedido Empresas falha (timeout) → erro de reenvio (500 → a Stripe tenta de novo), não 200 mudo')
b = bancoFalso(false, [{ code: '23503', message: 'fk' }, { code: '08006', message: 'conexão caiu' }])
ok((await resultado(() => recordDfyOrderPaid(b, 'evt_2', sessao))) === 'retry' && b.inserts.length === 2 && b.inserts[1].user_id === null, '5b. F1: dono apagado e a regravação sem dono também falha → reenvio')
b = bancoFalso(false, [{ code: '23503', message: 'fk' }, null])
ok((await resultado(() => recordDfyOrderPaid(b, 'evt_3', sessao))) === 'ok' && b.inserts.length === 2 && b.inserts[1].user_id === null, '5c. dono apagado com regravação sem dono gravada → 200 (sem reenvio à toa)')
b = bancoFalso(false, [{ code: '23505', message: 'dup' }])
ok((await resultado(() => recordDfyOrderPaid(b, 'evt_4', sessao))) === 'ok', '5d. pedido já gravado (23505) → 200')
b = bancoFalso(true, [])
ok((await resultado(() => recordDfyOrderPaid(b, 'evt_5', sessao))) === 'ok' && b.inserts.length === 0, '5e. reentrega com o pedido já no banco → nada a gravar, 200')
b = bancoFalso(false, [null])
ok((await resultado(() => recordDfyOrderPaid(b, 'evt_6', sessao))) === 'ok' && b.inserts.length === 1 && b.inserts[0].user_id === DONO && b.inserts[0].metadata.stripe_session_id === sessao.id, '5f. caminho feliz: 1 linha dfy_order_paid com o dono e a sessão')

const pendente = { ...sessao, payment_status: 'unpaid' }
escritas.length = 0; respostasEscrita = [false, true]
ok((await resultado(() => recordAsyncCheckoutState(pendente, 'pending'))) === 'ok' && escritas.length === 2 && escritas[0].userId === DONO && escritas[1].userId === null && escritas[1].name === 'checkout_payment_pending',
  '5g. F2: dono apagado (1ª escrita falha) → a pendência é gravada sem dono, sem 500 em laço')
escritas.length = 0; respostasEscrita = [false, false]
ok((await resultado(() => recordAsyncCheckoutState(pendente, 'failed'))) === 'retry' && escritas.length === 2, '5h. F2: banco fora (as duas escritas falham) → reenvio da Stripe')
escritas.length = 0; respostasEscrita = [false]
ok((await resultado(() => recordAsyncCheckoutState({ ...pendente, client_reference_id: null }, 'pending'))) === 'retry' && escritas.length === 1, '5i. sem dono e a escrita falha → reenvio, sem segunda tentativa inútil')
escritas.length = 0; respostasEscrita = [true]
ok((await resultado(() => recordAsyncCheckoutState(pendente, 'pending'))) === 'ok' && escritas.length === 1, '5j. caminho feliz: uma escrita só')

console.log(`test-empresas-pagamento-tardio-2026-09-24: ${passou} ok · ${falhas.length} falhas`)
for (const f of falhas) console.log('  FAIL ' + f)
process.exit(falhas.length ? 1 : 0)
