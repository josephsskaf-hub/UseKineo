// KINEO-ADMIN-FONTE-UNICA-2026-09-08 — guardião: nenhuma tela ou campanha do admin
// define plano pago à mão; a classificação é executada; trial nunca é pagante.
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import vm from 'node:vm'
import ts from 'typescript'

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..')
const rd = (p) => readFileSync(join(RAIZ, p), 'utf8').replace(/\r\n/g, '\n')
let ok = 0
const falhas = []
const checa = (n, c) => { if (c) ok++; else falhas.push(n) }

function walk(dir, out = []) {
  for (const e of readdirSync(join(RAIZ, dir))) {
    const p = `${dir}/${e}`
    if (statSync(join(RAIZ, p)).isDirectory()) walk(p, out)
    else if (/\.(ts|tsx)$/.test(e)) out.push(p)
  }
  return out
}

console.log('== 1. só a fonte única define plano pago ==')
const arquivos = [...walk('app/admin'), ...walk('app/api/admin')].filter((p) => !p.endsWith('_shared/mrr.ts'))
const infratores = []
for (const p of arquivos) {
  const s = rd(p).replace(/\/\/[^\n]*/g, '')
  if (/new Set\(\[[^\]]*'(starter|basic|pro)'/.test(s) || /const PLAN_PRICE_USD\s*[:=]/.test(s)) infratores.push(p)
}
checa(`zero arquivos com tabela própria de plano pago (achados: ${infratores.join(', ') || 'nenhum'})`, infratores.length === 0)
checa('pelo menos 40 arquivos varridos', arquivos.length >= 40)

console.log('== 2. a classificação executada ==')
const src = ts.transpileModule(rd('app/api/admin/_shared/mrr.ts'), { compilerOptions: { module: 1, target: 9 } }).outputText
const exp = {}
vm.runInNewContext(src, {
  exports: exp,
  require: (id) => {
    if (id === '@/lib/pricing') return { PLANS: { starter: { price: 9 }, basic: { price: 19 }, pro: { price: 29 }, autopilot: { price: 299 } } }
    if (id === '@/lib/stripe') return { stripe: {} }
    throw new Error('dependencia inesperada ' + id)
  },
  console, Date, Map,
})
const M = exp
const interno = (e) => /josephsskaf|usekineo|kineo\.local/.test(e)
checa('basic paga agora', M.isPayingPlan('basic') && M.isPaidPlan('basic'))
checa('basic_trial tem relação paga mas NÃO paga agora', M.isPaidPlan('basic_trial') && !M.isPayingPlan('basic_trial') && M.isTrialPlan('basic_trial'))
checa('creator/studio (aliases) são pagantes', M.isPayingPlan('creator') && M.isPayingPlan('studio'))
checa('autopilot é pagante; pilot é relação paga com MRR 0', M.isPayingPlan('autopilot') && M.isPaidPlan('autopilot_pilot') && M.mrrForPlan('autopilot_pilot') === 0)
checa('free/null/desconhecido não são nada', !M.isPaidPlan('free') && !M.isPaidPlan(null) && !M.isPaidPlan('gold'))
checa('MRR de trial é o que VIRA no dia 8, e mrrForPlan devolve o preço novo', M.mrrForPlan('basic_trial') === 19 && M.mrrForPlan('starter') === 9)
checa("classify: interno vence tudo", M.classifyAccount({ email: 'josephsskaf@gmail.com', plan: 'pro' }, interno) === 'internal')
checa("classify: pagante", M.classifyAccount({ email: 'a@b.com', plan: 'starter' }, interno) === 'paying')
checa("classify: trial de $1", M.classifyAccount({ email: 'a@b.com', plan: 'basic_trial' }, interno) === 'trial_1usd')
checa("classify: card_required (versão B, ainda não pagou)", M.classifyAccount({ email: 'a@b.com', plan: 'free', trial_status: 'card_required' }, interno) === 'card_required')
checa("classify: free", M.classifyAccount({ email: 'a@b.com', plan: 'free', trial_status: 'active' }, interno) === 'free')
checa('assinante novo: checkout de assinatura sem $1', M.isNewSubscriberEvent('payment_success', { checkout_mode: 'subscription', card_trial: false }))
checa('NÃO assinante novo: o $1 do trial', !M.isNewSubscriberEvent('payment_success', { checkout_mode: 'subscription', card_trial: true }) && M.isTrialEntryEvent('payment_success', { card_trial: true }))
checa('NÃO assinante novo: pacote avulso', !M.isNewSubscriberEvent('payment_success', { checkout_mode: 'payment', pack: 'starter' }))
checa('assinante novo: fatura do dia 8 (trial_conversion)', M.isNewSubscriberEvent('subscription_invoice_paid', { trial_conversion: true }))
checa('NÃO assinante novo: renovação de quem já pagava', !M.isNewSubscriberEvent('subscription_invoice_paid', { trial_conversion: false, billing_reason: 'subscription_cycle' }))
checa('stripeMrrUsd tem cache de 5 min', /STRIPE_MRR_TTL_MS = 5 \* 60 \* 1000/.test(rd('app/api/admin/_shared/mrr.ts')))

console.log('== 3. as telas obedecem ==')
const page = rd('app/admin/overview/page.tsx'), route = rd('app/api/admin/overview/route.ts')
checa('overview (página) importa da fonte única e usa isTrialPlan', /from '@\/app\/api\/admin\/_shared\/mrr'/.test(page) && /if \(isTrialPlan\(plan\)\) \{/.test(page))
checa('overview (rota) idem', /from '@\/app\/api\/admin\/_shared\/mrr'/.test(route) && /if \(isTrialPlan\(plan\)\) \{ trialsActive \+= 1/.test(route))
checa('people conta pagante com isPayingPlan', /isPayingPlan\(/.test(rd('app/api/admin/people/route.ts')))
checa('funil: o $1 não vira "pagou"', /if \(metadata\.card_trial === true \|\| metadata\.card_trial === 'true'\) continue/.test(rd('app/api/admin/funnel/route.ts')))
checa('CEO: MRR só de quem paga agora', /if \(!isPayingPlan\(p\.plan\)\) continue/.test(rd('app/api/admin/ceo/compute.ts')))
checa('trial-roi: has_paid do $1 não é "pagou"', /isPayingPlan\(prof\.plan\) \|\| \(prof\.has_paid === true && !isTrialPlan\(prof\.plan\)\)/.test(rd('app/admin/trial-roi/page.tsx')))
checa('live carrega is_trial', /is_trial: isTrialPlan\(/.test(rd('app/api/admin/live/route.ts')))
const senders = ['send-abandon-recovery', 'send-comeback50', 'send-dfy-offer', 'send-free-upsell', 'send-hotlead-blast', 'send-pack-offer', 'send-second-try-1usd', 'send-winback-25', 'send-stalled-rescue', 'send-day19-creator20', 'send-made-video-today', 'send-next-episode-wall', 'send-season-letter']
checa('as 13 campanhas excluem "relação paga" pela fonte única', senders.every((d) => /import \{ PAID_PLANS \} from '\.\.\/_shared\/mrr'/.test(rd(`app/api/admin/${d}/route.ts`))))

console.log(`\n  verificacoes: ${ok + falhas.length} · falhas: ${falhas.length}`)
if (falhas.length) { for (const f of falhas) console.log('  ✗ ' + f); process.exit(1) }
console.log('OK — o admin conta cliente e dinheiro por UMA régua')
