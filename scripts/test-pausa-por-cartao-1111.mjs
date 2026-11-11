// KINEO-PAUSA-POR-CARTAO-1111 — guardião do lado do código da "pausa por cartão recusado". Prova:
//   A. regras puras (lib/billing/pausaPorCartao.ts): renovação com a assinatura `paused` espera (não descarta), o porquê da
//      pausa, migração das novas só com o interruptor 'on' (nasce 'off') e só se ainda não for flexível;
//   B. webhook (lido): a espera vem ANTES do descarte genérico da renovação e pede reenvio (RetryableEntitlementError com a
//      concessão pendente — o catch solta a trava do evento e a Stripe reenvia); pausa/retomada viram eventos de servidor;
//      a criação só migra pelo interruptor e nunca lança;
//   C. acesso durante a pausa: `paused` continua SEM acesso de plano (regra única), e a volta concede pela renovação de
//      sempre (renewalBalance, guard);
//   D. migração EXECUTADA com fetch falso: endpoint /migrate, Stripe-Version basil, corpo billing_mode[type]=flexible; id
//      estranho não chama a rede; falha de rede não lança;
//   E. o script de migração é ensaio por padrão (só migra com --apply);
//   F. mutantes.
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

const SRC = {
  lib: read('lib/billing/pausaPorCartao.ts'),
  mig: read('lib/stripe/migrarFlexivel.ts'),
  webhook: read('app/api/stripe/webhook/route.ts'),
  access: read('lib/billing/subscriptionAccess.ts'),
  script: read('scripts/stripe-migrar-flexivel-1111.mjs'),
}
function modulo(code, req = {}) {
  const js = ts.transpileModule(code, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText
  const m = { exports: {} }
  vm.runInNewContext(js, { module: m, exports: m.exports, require: (id) => { if (id in req) return req[id]; throw new Error('import inesperado ' + id) }, AbortSignal, JSON, Promise, Error, Object, Array, String, Number })
  return m.exports
}

async function suite(S) {
  const out = []
  const t = (c, m) => out.push([!!c, m])
  const L = modulo(S.lib)
  // A
  t(L.renovacaoPausadaEspera('paused') === true && ['active', 'past_due', 'canceled', 'unpaid', null].every((x) => L.renovacaoPausadaEspera(x) === false), 'A1 só `paused` espera; o resto segue a regra de sempre')
  t(L.motivoDaPausa({ status_details: { paused: { subscription: { type: 'final_payment_failure' } } } }) === 'final_payment_failure' && L.motivoDaPausa({}) === null && L.motivoDaPausa(null) === null, 'A2 o porquê da pausa vem do status_details da Stripe')
  t(/PAUSA_POR_CARTAO_1111_MIGRA_NOVAS: PausaPorCartaoRelease = 'off'/.test(S.lib), "A3 a migração das novas nasce 'off'")
  t(L.migrarNovaParaFlexivel('off', { type: 'classic' }) === false && L.migrarNovaParaFlexivel('on', { type: 'classic' }) === true && L.migrarNovaParaFlexivel('on', undefined) === true && L.migrarNovaParaFlexivel('on', { type: 'flexible' }) === false, "A4 migra só com 'on' e só quem ainda não é flexível")
  t(Array.isArray(L.PAUSA_POR_CARTAO_PASSOS) && /Pause the subscription/.test(L.PAUSA_POR_CARTAO_PASSOS.at(-1)) && /Resume the subscription/.test(L.PAUSA_POR_CARTAO_PASSOS.at(-1)), 'A5 a chave do painel é o ÚLTIMO passo, com os nomes exatos da Stripe')
  // B
  const W = S.webhook
  const iRenew = W.indexOf("case 'invoice.payment_succeeded': {")
  const iPend = W.indexOf('entitlementPending = true', W.indexOf('const subscriptionId = typeof invoice.subscription', iRenew))
  const iWait = W.indexOf('if (renovacaoPausadaEspera(subscription.status)) {', iRenew)
  const iThrow = W.indexOf('throw new RetryableEntitlementError(`Renewal invoice paid while subscription is paused', iWait)
  const iIgnore = W.indexOf('if (!stripeSubscriptionKeepsAccess(subscription.status)) {', iRenew)
  t(iRenew > 0 && iPend > iRenew && iWait > iPend && iThrow > iWait && iIgnore > iThrow, 'B1 renovação com assinatura pausada: pede reenvio ANTES do descarte genérico, com a concessão pendente')
  t(/if \(shouldRetryWebhook && dedupeRowAcquired && checkoutGuardReleased\)/.test(W) && /\.eq\('id', event\.id\)/.test(W), 'B2 no reenvio, a trava do evento é solta (a Stripe reentrega e a renovação roda)')
  const iP = W.indexOf("case 'customer.subscription.paused':")
  const iC = W.indexOf("case 'customer.subscription.created': {")
  const iD = W.indexOf('      default:', iC)
  const bloco = W.slice(iP, iD)
  t(iP > 0 && /case 'customer\.subscription\.resumed':/.test(bloco) && /PAUSA_POR_CARTAO_EVENTS\.paused : PAUSA_POR_CARTAO_EVENTS\.resumed/.test(bloco), 'B3 pausa e retomada viram eventos de servidor')
  const criado = W.slice(iC, iD)
  t(/if \(!migrarNovaParaFlexivel\(PAUSA_POR_CARTAO_1111_MIGRA_NOVAS, sub\.billing_mode\)\) break/.test(criado) && !/throw /.test(criado), 'B4 criação: migra só pelo interruptor e nunca derruba o webhook')
  // C
  t(/'paused',\n\] as const/.test(S.access) || /STRIPE_REVOKE_STATUSES = \[[^\]]*'paused'/.test(S.access), 'C1 `paused` continua sem acesso de plano (regra única de acesso)')
  t(/const renovacao = renewalBalance\(renewalProfile\.video_credits, renewalCredits\)/.test(W) && /plan: renewalTier,/.test(W), 'C2 a volta concede pela renovação de sempre (plano + renewalBalance)')
  // D
  const calls = []
  const fakeFetch = async (url, init) => { calls.push({ url, init }); return { ok: true, status: 200, json: async () => ({}) } }
  const M = modulo(S.mig, { '@/lib/billing/pausaPorCartao': L })
  const r1 = await M.migrarAssinaturaParaFlexivel('sub_ABC123', 'sk_test_x', fakeFetch)
  const c = calls[0]
  t(r1.ok === true && c?.url === 'https://api.stripe.com/v1/subscriptions/sub_ABC123/migrate' && c?.init?.method === 'POST' && c?.init?.headers?.['Stripe-Version'] === '2025-06-30.basil' && c?.init?.body === 'billing_mode[type]=flexible', 'D1 migração: /migrate, versão basil, billing_mode[type]=flexible')
  const n0 = calls.length
  const r2 = await M.migrarAssinaturaParaFlexivel('sub_../../x', 'sk_test_x', fakeFetch)
  const r3 = await M.migrarAssinaturaParaFlexivel('sub_ABC', undefined, fakeFetch)
  t(r2.ok === false && r3.ok === false && calls.length === n0, 'D2 id estranho ou sem chave: nenhuma chamada')
  const r4 = await M.migrarAssinaturaParaFlexivel('sub_ABC', 'sk_test_x', async () => { throw new Error('down') })
  t(r4.ok === false && r4.code === 'network', 'D3 rede fora: devolve falha, não lança')
  // E
  t(/const APPLY = process\.argv\.includes\('--apply'\)/.test(S.script) && S.script.indexOf("if (!APPLY) {") < S.script.indexOf("'POST', `/v1/subscriptions/${s.id}/migrate`"), 'E1 script: ensaio por padrão; só migra com --apply')
  return out
}

for (const [c, m] of await suite(SRC)) ok(c, m)

const MUTANTS = [
  ['pausada volta a ser descartada', 'webhook', 'if (renovacaoPausadaEspera(subscription.status)) { // KINEO-PAUSA-POR-CARTAO-1111', 'if (false) { // KINEO-PAUSA-POR-CARTAO-1111'],
  ['espera concede direto', 'lib', "  return status === 'paused'", "  return false"],
  ['migração nasce ligada', 'lib', "PAUSA_POR_CARTAO_1111_MIGRA_NOVAS: PausaPorCartaoRelease = 'off'", "PAUSA_POR_CARTAO_1111_MIGRA_NOVAS: PausaPorCartaoRelease = 'on'"],
  ['migra quem já é flexível', 'lib', "  return type !== 'flexible'", '  return true'],
  ['versão da API errada', 'lib', "export const PAUSA_STRIPE_API_VERSION = '2025-06-30.basil' as const", "export const PAUSA_STRIPE_API_VERSION = '2024-06-20' as const"],
  ['id sem validação', 'mig', "if (!secretKey || !/^sub_[A-Za-z0-9]+$/.test(subscriptionId))", 'if (!secretKey)'],
  ['script aplica sem --apply', 'script', "const APPLY = process.argv.includes('--apply')", 'const APPLY = true'],
  ['criação lança', 'webhook', "        const migracao = await migrarAssinaturaParaFlexivel(sub.id, process.env.STRIPE_SECRET_KEY)\n", "        const migracao = await migrarAssinaturaParaFlexivel(sub.id, process.env.STRIPE_SECRET_KEY)\n        if (!migracao.ok) throw new Error('x')\n"],
]
for (const [name, key, from, to] of MUTANTS) {
  if (!SRC[key].includes(from)) { ok(false, `mutante "${name}": trecho não encontrado`); continue }
  let caught = false
  try { caught = (await suite({ ...SRC, [key]: SRC[key].replace(from, to) })).some(([c]) => !c) } catch { caught = true }
  ok(caught, `mutante "${name}" é pego`)
}
console.log(`\n${pass} ok · ${fail} falha(s)`)
process.exit(fail ? 1 : 0)
