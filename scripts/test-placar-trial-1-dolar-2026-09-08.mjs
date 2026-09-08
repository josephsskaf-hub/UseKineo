// KINEO-PLACAR-TRIAL-2026-09-08 — guardião: o $1 e o dia 8 existem no placar e no admin,
// e o trial nunca é contado como pagante/MRR antes de virar.
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..')
const rd = (p) => readFileSync(join(RAIZ, p), 'utf8').replace(/\r\n/g, '\n')
let ok = 0
const falhas = []
const checa = (n, c) => { if (c) ok++; else falhas.push(n) }

const wh = rd('app/api/stripe/webhook/route.ts')
const page = rd('app/admin/overview/page.tsx')
const route = rd('app/api/admin/overview/route.ts')

console.log('== o dinheiro ==')
checa('payment_success carrega card_trial (o $1 fica distinguível)', /card_trial: session\.metadata\?\.card_trial === '1',/.test(wh))
checa('fatura paga vira evento subscription_invoice_paid', /name: 'subscription_invoice_paid',/.test(wh))
checa('o evento diz se foi conversão de trial (plano anterior *_trial)', /trial_conversion: previousPlanNormalized\.endsWith\('_trial'\),/.test(wh))
checa('o evento carrega valor, moeda e créditos concedidos', /amount_paid: invoice\.amount_paid \?\? 0,/.test(wh) && /credits_granted: renewalCredits,/.test(wh))
checa('o plano anterior é lido do perfil (select com plan)', /\.select\('id, stripe_customer_id, stripe_subscription_id, plan'\)/.test(wh))
const iUpdate = wh.indexOf("            plan: renewalTier,")
const iEvent = wh.indexOf("name: 'subscription_invoice_paid'")
checa('o evento sai DEPOIS do perfil atualizado (nunca antes do dinheiro virar acesso)', iUpdate > 0 && iEvent > iUpdate)

console.log('== o admin ==')
checa('página: trial NÃO conta como pagante', /if (isTrialPlan(plan)) {[sS]{0,400}trialsActive += 1[sS]{0,200}continue/.test(page))
checa('página: MRR real vem da Stripe, tabela é fallback', /const stripeMrr = await stripeMrrUsd\(payingSubscriptionIds\)/.test(page) && /value=\{fmtMoney\(m\.mrrStripeUsd \?\? m\.mrrUsd\)\}/.test(page))
checa('página: KPI "Trials $1" separado', /label="Trials \$1"/.test(page))
checa('página: perfis trazem stripe_subscription_id', /'id, email, plan, created_at, utm_source, stripe_subscription_id'/.test(page))
checa('rota JSON: trial separado do pagante', /if (isTrialPlan(plan)) { trialsActive += 1; trialPotentialMrrUsd += PLAN_PRICE_USD[plan] ?? 0; continue }/.test(route))
checa('rota JSON: devolve trialsActive', /trialsActive,/.test(route))

console.log(`\n  verificacoes: ${ok + falhas.length} · falhas: ${falhas.length}`)
if (falhas.length) { for (const f of falhas) console.log('  ✗ ' + f); process.exit(1) }
console.log('OK — o $1 e o dia 8 existem no placar; trial nunca é pagante antes de virar')
