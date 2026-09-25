// KINEO-RENOVACAO-PRESERVA-CREDITO-COMPRADO-2026-09-25 — guardião (fundador: "conserta a renovação").
// Prova: (1) a regra pura: cota do plano zera, o que passa de uma cota sobrevive; ninguém perde crédito comprado;
// (2) os TRÊS pontos de renovação (webhook Stripe, recarga mensal do anual, PayPal) leem o saldo atual e gravam o saldo
// da regra, não a cota crua; (3) o evento da renovação registra quanto sobreviveu; (4) mutantes.
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(import.meta.url)
const ts = require(join(root, 'node_modules', 'typescript'))
const rd = (p) => readFileSync(join(root, p), 'utf8').replace(/\r\n/g, '\n')
let ok = 0; const falhas = []
const checa = (nome, cond) => { if (cond) { ok += 1; return } falhas.push(nome); console.error('  ✗ ' + nome) }
function roda(src) {
  const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText
  const m = { exports: {} }; new Function('module', 'exports', 'require', js)(m, m.exports, (n) => { throw new Error('import inesperado ' + n) }); return m.exports
}
const SRC = rd('lib/credits/renewalBalance.ts')
function provas(L) {
  const r = (cur, grant) => L.renewalBalance(cur, grant)
  return [
    ['só plano, nada gasto: 150 de 150 → 150 (sem rollover)', r(150, 150).balance === 150 && r(150, 150).carried === 0],
    ['só plano, sobrou 40 → 150 (a sobra da cota zera)', r(40, 150).balance === 150],
    ['zerado → 150', r(0, 150).balance === 150],
    ['comprou 1.000 na barra e não gastou (1.150) → 1.150: nada se perde', r(1150, 150).balance === 1150 && r(1150, 150).carried === 1000],
    ['comprou 1.000, gastou 100 (1.050) → 1.050: o comprado sobrevive', r(1050, 150).balance === 1050],
    ['comprou 2.000 (2.150) → 2.150', r(2150, 150).balance === 2150],
    ['Studio 300: sobrou 320 (20 dados pela casa) → 320', r(320, 300).balance === 320 && r(320, 300).carried === 20],
    ['nunca abaixo da cota', [0, 1, 149, 150, 151, 999].every((c) => r(c, 150).balance >= 150)],
    ['nunca perde acima da cota', [151, 300, 1150].every((c) => r(c, 150).balance === c)],
    ['saldo sujo (null/texto/negativo) vira cota', r(null, 150).balance === 150 && r('abc', 150).balance === 150 && r(-30, 150).balance === 150],
    ['cota 0 (plano sem crédito) mantém tudo', r(80, 0).balance === 80],
    ['devolve a cota usada', r(500, 60).grant === 60],
  ]
}
for (const [n, c] of provas(roda(SRC))) checa(n, c)

// (2) os três pontos de renovação
const WH = rd('app/api/stripe/webhook/route.ts')
checa('webhook: lê o saldo atual do perfil na renovação', WH.includes(".select('id, stripe_customer_id, stripe_subscription_id, plan, video_credits')"))
checa('webhook: calcula pela regra e grava o saldo da regra, não a cota crua', WH.includes('const renovacao = renewalBalance(renewalProfile.video_credits, renewalCredits)') && WH.includes('video_credits: renovacao.balance,') && !/video_credits: renewalCredits,/.test(WH))
checa('webhook: o evento subscription_invoice_paid registra o que sobreviveu', WH.includes('credits_carried: renovacao.carried,') && WH.includes('balance_after: renovacao.balance,') && WH.includes('carry_version: RENEWAL_CARRY_VERSION,'))
const CRON = rd('app/api/cron/annual-credit-refill/route.ts')
checa('recarga anual: lê o saldo e grava pela regra', CRON.includes(".select('id, email, plan, stripe_subscription_id, video_credits')") && CRON.includes('const renovacao = renewalBalance(profile.video_credits, credits)') && CRON.includes('.update({ video_credits: renovacao.balance, is_pro: true, plan: tier') && !/update\(\{ video_credits: credits, is_pro: true/.test(CRON))
const PP = rd('lib/paypal.ts')
checa('PayPal: renovação lê o saldo e grava pela regra', PP.includes("const { data: atual } = await admin.from('profiles').select('video_credits').eq('id', userId).maybeSingle()") && PP.includes('.update({ video_credits: renovacao.balance, cinematic_tokens:') && !/update\(\{ video_credits: credits, cinematic_tokens: tier === 'pro' \? 1 : 0, is_pro: true, plan: tier \}\)/.test(PP))
checa('os três importam a mesma fonte', [WH, CRON, PP].every((s) => s.includes("from '@/lib/credits/renewalBalance'")))
// primeira cobrança / mudança de plano continuam somando (não passam pela regra): nada a provar aqui além de não terem sido tocadas
checa('a primeira compra continua sendo SOMA (grant.ts intacto)', rd('lib/payments/grant.ts').includes('.update({ video_credits: after, has_paid: true })'))

// (4) mutantes
function mutante(nome, de, para) {
  if (SRC.split(de).length !== 2) { checa(`mutante "${nome}" aplicou`, false); return }
  const m = SRC.replace(de, para); checa(`mutante "${nome}" aplicou`, m.includes(para))
  let cai = false; try { cai = provas(roda(m)).some(([, c]) => !c) } catch { cai = true }
  checa(`mutante "${nome}" é pego`, cai)
}
mutante('volta ao SET (apaga o comprado)', 'const carried = Math.max(0, atual - cota)', 'const carried = 0')
mutante('vira rollover total (soma tudo)', 'return { balance: cota + carried, carried, grant: cota }', 'return { balance: cota + atual, carried: atual, grant: cota }')
mutante('carrega negativo', 'const carried = Math.max(0, atual - cota)', 'const carried = atual - cota')

console.log(`test-renovacao-preserva-comprado-2026-09-25: ${ok} ok, ${falhas.length} falha(s)`)
if (falhas.length) process.exit(1)
