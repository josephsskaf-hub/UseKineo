// KINEO-MRR-PRECO-PAGO-2026-09-28 — guardião: o MRR do admin é o que cada assinante
// PAGA (última fatura), não a tabela de hoje.
//
// O defeito que ele existe para não deixar voltar: em 28/09 a V8-A subiu a tabela
// para 12,90/29,90/54,90 e o painel somou os 11 assinantes antigos no preço novo
// (US$ 276,90 na tela; ~US$ 173 entram). A Stripe ao vivo caía em null e a tela
// voltava à tabela em silêncio. Regras travadas aqui:
//   1. cada assinante vale a ÚLTIMA fatura paga (subscription_invoice_paid) ou o
//      checkout de assinatura — nem $1 do trial, nem pacote, nem Empresas, nem
//      1º mês `intro`, nem rateio de troca de plano;
//   2. BRL ÷ taxa FIXA da casa (lib/settlementCurrency), nunca câmbio do dia; anual ÷ 12;
//   3. tabela só sem valor conhecido (ou valor de outra família de plano) — e CONTADA no rótulo;
//   4. as quatro superfícies (overview página/rota, CEO, paying) usam a régua única de _shared/mrr;
//   5. contas internas (josephskaf% | josephsskaf% | victoriaskaf% | joseph+%) ficam fora.
// Estilo da casa: readFileSync + transpile (o alias @/ não resolve em node puro).
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
const perto = (a, b) => Math.abs(a - b) < 0.005

function carrega(path, reqs) {
  const src = ts.transpileModule(rd(path), { compilerOptions: { module: 1, target: 9 } }).outputText
  const exp = {}
  vm.runInNewContext(src, {
    exports: exp,
    require: (id) => { if (id in reqs) return reqs[id]; throw new Error('dependencia inesperada ' + id) },
    console, Date, Map, Set, Math, Number, Object, Array, String, RegExp,
  })
  return exp
}

function walk(dir, out = []) {
  for (const e of readdirSync(join(RAIZ, dir))) {
    const p = `${dir}/${e}`
    if (statSync(join(RAIZ, p)).isDirectory()) walk(p, out)
    else if (/\.(ts|tsx)$/.test(e)) out.push(p)
  }
  return out
}

const PLANS_V8 = { starter: { price: 12.9 }, basic: { price: 29.9 }, pro: { price: 54.9 }, autopilot: { price: 299 }, autopilot_lite: { price: 59 } }
const M = carrega('app/api/admin/_shared/mrr.ts', {
  '@/lib/pricing': { PLANS: PLANS_V8 },
  '@/lib/stripe': { stripe: {} },
  '@/lib/settlementCurrency': { BRL_PER_USD_HOUSE: 5 },
})

// ── fixtures no formato EXATO que o webhook grava (metadata do evento) ──────────
const ev = (user_id, name, created_at, metadata) => ({ user_id, name, created_at, metadata })
const checkout = (uid, at, extra) => ev(uid, 'payment_success', at, { source: 'stripe_webhook', checkout_mode: 'subscription', billing: 'monthly', pack: null, card_trial: false, intro: false, currency: 'usd', kind: null, ...extra })
const fatura = (uid, at, extra) => ev(uid, 'subscription_invoice_paid', at, { source: 'stripe_webhook', billing_reason: 'subscription_cycle', trial_conversion: false, currency: 'usd', ...extra })

console.log('== 1. a última fatura paga, por pessoa ==')
{
  const eventos = [
    // gapozweb: 1º mês intro $4,90 (17/08) → renovação $9,90 (17/09). O intro NÃO é mensalidade.
    checkout('gapoz', '2026-08-17T16:29:57Z', { tier: 'starter', amount_total: 490, intro: true, stripe_subscription_id: 'sub_A' }),
    fatura('gapoz', '2026-09-17T17:30:48Z', { tier: 'starter', amount_paid: 990, stripe_subscription_id: 'sub_A' }),
    // emilio: só o intro de $4,90 (01/08) — nenhum valor recorrente conhecido
    checkout('emilio', '2026-08-01T21:18:36Z', { tier: 'starter', amount_total: 490, intro: true, stripe_subscription_id: 'sub_B' }),
    // cintia: V6 $7,00 (02/09)
    checkout('cintia', '2026-09-02T20:22:43Z', { tier: 'starter', amount_total: 700, stripe_subscription_id: 'sub_C' }),
    // ytmeander: cupom, $15,92 (28/09) — valor como STRING, como o ->> do Postgres devolve
    checkout('yt', '2026-09-28T18:09:58Z', { tier: 'basic', amount_total: '1592', stripe_subscription_id: 'sub_D' }),
    // fatura em reais: R$ 49,90 ÷ 5 = US$ 9,98 — taxa da casa, não câmbio do dia
    checkout('brl', '2026-09-10T00:34:04Z', { tier: 'starter', amount_total: 4990, currency: 'brl', stripe_subscription_id: 'sub_E' }),
    // anual: US$ 129 ÷ 12 = 10,75; a fatura da MESMA assinatura herda o anual
    checkout('anual', '2026-09-01T00:00:00Z', { tier: 'starter', amount_total: 12900, billing: 'annual', stripe_subscription_id: 'sub_F' }),
    fatura('anual', '2026-09-20T00:00:00Z', { tier: 'starter', amount_paid: 12900, stripe_subscription_id: 'sub_F' }),
    // fatura sem id de assinatura: herda o anual da PESSOA
    checkout('anual2', '2026-09-01T00:00:00Z', { tier: 'basic', amount_total: 29900, billing: 'annual', stripe_subscription_id: 'sub_G' }),
    fatura('anual2', '2026-09-21T00:00:00Z', { tier: 'basic', amount_paid: 29900, stripe_subscription_id: null }),
    // fatura sem checkout anterior (assinante de antes do evento existir): mensal
    fatura('sofatura', '2026-09-18T23:24:55Z', { tier: 'basic', amount_paid: 1990, stripe_subscription_id: 'sub_H' }),
    // trial de $1 NÃO é mensalidade; a fatura do dia 8 (trial_conversion) É
    checkout('trial', '2026-09-01T00:00:00Z', { tier: 'basic', amount_total: 100, card_trial: true, stripe_subscription_id: 'sub_I' }),
    fatura('trial', '2026-09-08T00:00:00Z', { tier: 'basic', amount_paid: 1990, trial_conversion: true, billing_reason: 'subscription_cycle', stripe_subscription_id: 'sub_I' }),
    // godofloki: assinatura $29 (31/08) e DOIS pacotes depois — pacote não sobrescreve a mensalidade
    checkout('loki', '2026-08-31T20:58:09Z', { tier: 'pro', amount_total: 2900, stripe_subscription_id: 'sub_J' }),
    ev('loki', 'payment_success', '2026-09-13T21:20:23Z', { checkout_mode: 'payment', tier: null, pack: 'topup120', card_trial: false, amount_total: 1290, currency: 'usd' }),
    ev('loki', 'payment_success', '2026-09-23T21:21:10Z', { checkout_mode: 'payment', tier: null, pack: 'topup40', card_trial: false, amount_total: 590, currency: 'usd' }),
    // pedido Kineo Empresas (kind=dfy) é dinheiro, não assinatura
    ev('dfy', 'payment_success', '2026-09-24T00:00:00Z', { checkout_mode: 'payment', tier: 'pro', kind: 'dfy', amount_total: 49900, currency: 'usd' }),
    // rateio de troca de plano não é mensalidade
    checkout('troca', '2026-09-01T00:00:00Z', { tier: 'basic', amount_total: 1990, stripe_subscription_id: 'sub_K' }),
    fatura('troca', '2026-09-10T00:00:00Z', { tier: 'pro', amount_paid: 500, billing_reason: 'subscription_update', stripe_subscription_id: 'sub_K' }),
    // evento sem pessoa e evento sem valor: ignorados
    ev(null, 'payment_success', '2026-09-01T00:00:00Z', { checkout_mode: 'subscription', tier: 'pro', amount_total: 5490 }),
    checkout('semvalor', '2026-09-01T00:00:00Z', { tier: 'pro', amount_total: 0 }),
    // assinante antigo do fundador (07/2026): payment_success sem metadata nenhuma
    ev('velho', 'payment_success', '2026-07-05T18:49:16Z', null),
  ]
  const P = M.paidMonthlyUsdByUser(eventos)
  const g = (k) => P.get(k)
  checa('renovação vence o checkout: gapoz = 9,90 por fatura (o intro de 4,90 ficou para trás)', g('gapoz') && perto(g('gapoz').usd, 9.9) && g('gapoz').source === 'invoice' && g('gapoz').tier === 'starter')
  checa('só o 1º mês intro NÃO é valor recorrente conhecido (emilio sem entrada)', g('emilio') === undefined)
  checa('V6 $7,00 vale 7,00 por checkout', g('cintia') && perto(g('cintia').usd, 7) && g('cintia').source === 'checkout')
  checa('cupom 15,92 vale 15,92 (valor como string também conta)', g('yt') && perto(g('yt').usd, 15.92))
  checa('BRL: R$ 49,90 ÷ taxa da casa 5 = US$ 9,98', g('brl') && perto(g('brl').usd, 9.98) && g('brl').currency === 'brl' && g('brl').amountMinor === 4990)
  checa('anual ÷ 12: 12900 → 10,75; a fatura da mesma assinatura herda o anual', g('anual') && perto(g('anual').usd, 10.75) && g('anual').source === 'invoice' && g('anual').billing === 'annual')
  checa('fatura sem id de assinatura herda o anual da pessoa', g('anual2') && perto(g('anual2').usd, 24.92) && g('anual2').billing === 'annual')
  checa('fatura sem checkout anterior é mensal: 19,90', g('sofatura') && perto(g('sofatura').usd, 19.9) && g('sofatura').billing === 'monthly')
  checa('o $1 do trial não é mensalidade; a fatura do dia 8 é (19,90)', g('trial') && perto(g('trial').usd, 19.9) && g('trial').source === 'invoice')
  checa('pacote avulso depois da assinatura não sobrescreve a mensalidade (loki = 29,00)', g('loki') && perto(g('loki').usd, 29) && g('loki').at === '2026-08-31T20:58:09Z')
  checa('pedido Empresas (kind=dfy) não vira mensalidade', g('dfy') === undefined)
  checa('rateio de troca de plano (subscription_update) não sobrescreve (troca = 19,90)', g('troca') && perto(g('troca').usd, 19.9))
  checa('sem pessoa / sem valor / sem metadata: ignorados', !P.has('semvalor') && !P.has('velho') && [...P.keys()].every((k) => typeof k === 'string'))
  const Prev = M.paidMonthlyUsdByUser([...eventos].reverse())
  checa('a ordem de chegada não importa (cronologia pelo created_at)', [...P.keys()].every((k) => perto(Prev.get(k).usd, P.get(k).usd) && Prev.get(k).source === P.get(k).source))
  checa('isRecurringCheckoutEvent: assinatura cheia sim; intro/trial/pacote/dfy não', M.isRecurringCheckoutEvent('payment_success', { checkout_mode: 'subscription', amount_total: 990 }) && !M.isRecurringCheckoutEvent('payment_success', { checkout_mode: 'subscription', amount_total: 490, intro: true }) && !M.isRecurringCheckoutEvent('payment_success', { checkout_mode: 'subscription', amount_total: 100, card_trial: true }) && !M.isRecurringCheckoutEvent('payment_success', { checkout_mode: 'payment', pack: 'topup40', amount_total: 590 }) && !M.isRecurringCheckoutEvent('payment_success', { checkout_mode: 'payment', tier: 'pro', kind: 'dfy', amount_total: 49900 }))
  checa('isPaidInvoiceEvent: fatura com valor sim; rateio e zero não', M.isPaidInvoiceEvent('subscription_invoice_paid', { amount_paid: 990 }) && !M.isPaidInvoiceEvent('subscription_invoice_paid', { amount_paid: 500, billing_reason: 'subscription_update' }) && !M.isPaidInvoiceEvent('subscription_invoice_paid', { amount_paid: 0 }) && !M.isPaidInvoiceEvent('payment_success', { amount_paid: 990 }))
  checa('paidMinorToMonthlyUsd: usd 990 → 9,90 · brl 4990 → 9,98 · anual usd 12900 → 10,75', perto(M.paidMinorToMonthlyUsd(990, 'usd', 'monthly'), 9.9) && perto(M.paidMinorToMonthlyUsd(4990, 'brl', 'monthly'), 9.98) && perto(M.paidMinorToMonthlyUsd(12900, 'USD', 'annual'), 10.75))
}

console.log('== 2. a mensalidade de UM assinante (tabela só sem valor conhecido) ==')
{
  const pago = (usd, tier, source = 'invoice') => ({ usd, source, tier, billing: 'monthly', amountMinor: Math.round(usd * 100), currency: 'usd', at: '2026-09-17T00:00:00Z' })
  const s1 = M.subscriberMrr('starter', pago(9.9, 'starter'))
  checa('starter com fatura de 9,90 vale 9,90 (fonte fatura, tabela 12,90 ao lado)', perto(s1.usd, 9.9) && s1.source === 'invoice' && perto(s1.tableUsd, 12.9))
  const s2 = M.subscriberMrr('starter', undefined)
  checa('starter sem valor conhecido cai na tabela 12,90 e DIZ que é tabela', perto(s2.usd, 12.9) && s2.source === 'table')
  const s3 = M.subscriberMrr('pro', pago(19.9, 'basic', 'checkout'))
  checa('valor de OUTRA família (pagou Creator, hoje é Studio) não serve: tabela 54,90 até a fatura nova', perto(s3.usd, 54.9) && s3.source === 'table')
  const s4 = M.subscriberMrr('creator', pago(15.92, 'basic', 'checkout'))
  checa('aliases da mesma família (creator ↔ basic) casam: 15,92', perto(s4.usd, 15.92) && s4.source === 'checkout')
  checa('trial de $1 vale 0 (não é MRR, mesmo com valor)', M.subscriberMrr('basic_trial', pago(19.9, 'basic')).usd === 0)
  checa('piloto de $99 vale 0 (avulso), free vale 0', M.subscriberMrr('autopilot_pilot', pago(99, 'autopilot')).usd === 0 && M.subscriberMrr('free', undefined).usd === 0 && M.subscriberMrr(null, undefined).usd === 0)
  checa('autopilot_lite (mesma família Autopilot) aceita o valor pago 59', perto(M.subscriberMrr('autopilot_lite', pago(59, 'autopilot_lite', 'checkout')).usd, 59))
}

console.log('== 3. o placar com os 11 assinantes reais (formato de 28/09) ==')
{
  // As 11 pessoas externas de 28/09, anonimizadas: plano no profile + o que os eventos dizem.
  const perfis = [
    { id: 'u1', plan: 'starter' }, // gapoz: intro 490 → fatura 990
    { id: 'u2', plan: 'starter' }, // emilio: só intro 490 → TABELA
    { id: 'u3', plan: 'basic' },   // den: 1990 → fatura 1990
    { id: 'u4', plan: 'pro' },     // salswina: 2900 (V6)
    { id: 'u5', plan: 'pro' },     // loki: 2900 (V6) + pacotes
    { id: 'u6', plan: 'starter' }, // cintia: 700 (V6)
    { id: 'u7', plan: 'starter' }, // sassy: 990
    { id: 'u8', plan: 'basic' },   // axel: 1990
    { id: 'u9', plan: 'starter' }, // flori: 990
    { id: 'u10', plan: 'starter' }, // acevedo: 990
    { id: 'u11', plan: 'basic' },  // ytmeander: 1592 (cupom)
    { id: 't1', plan: 'basic_trial' }, // trial: não é pagante
    { id: 'p1', plan: 'autopilot_pilot' }, // piloto: MRR 0, fora do rótulo
    { id: 'f1', plan: 'free' },
  ]
  const eventos = [
    checkout('u1', '2026-08-17T16:29:57Z', { tier: 'starter', amount_total: 490, intro: true, stripe_subscription_id: 'sub_1' }),
    fatura('u1', '2026-09-17T17:30:48Z', { tier: 'starter', amount_paid: 990, stripe_subscription_id: 'sub_1' }),
    checkout('u2', '2026-08-01T21:18:36Z', { tier: 'starter', amount_total: 490, intro: true, stripe_subscription_id: 'sub_2' }),
    checkout('u3', '2026-08-18T22:34:26Z', { tier: 'basic', amount_total: 1990, stripe_subscription_id: 'sub_3' }),
    fatura('u3', '2026-09-18T23:24:55Z', { tier: 'basic', amount_paid: 1990, stripe_subscription_id: 'sub_3' }),
    checkout('u4', '2026-08-23T19:56:29Z', { tier: 'pro', amount_total: 2900, stripe_subscription_id: 'sub_4' }),
    checkout('u5', '2026-08-31T20:58:09Z', { tier: 'pro', amount_total: 2900, stripe_subscription_id: 'sub_5' }),
    ev('u5', 'payment_success', '2026-09-13T21:20:23Z', { checkout_mode: 'payment', tier: null, pack: 'topup120', amount_total: 1290, currency: 'usd' }),
    checkout('u6', '2026-09-02T20:22:43Z', { tier: 'starter', amount_total: 700, stripe_subscription_id: 'sub_6' }),
    checkout('u7', '2026-09-16T22:16:34Z', { tier: 'starter', amount_total: 990, stripe_subscription_id: 'sub_7' }),
    checkout('u8', '2026-09-19T02:04:28Z', { tier: 'basic', amount_total: 1990, stripe_subscription_id: 'sub_8' }),
    checkout('u9', '2026-09-21T15:14:55Z', { tier: 'starter', amount_total: 990, stripe_subscription_id: 'sub_9' }),
    checkout('u10', '2026-09-21T16:50:09Z', { tier: 'starter', amount_total: 990, stripe_subscription_id: 'sub_10' }),
    checkout('u11', '2026-09-28T18:09:58Z', { tier: 'basic', amount_total: 1592, stripe_subscription_id: 'sub_11' }),
    checkout('t1', '2026-09-27T00:00:00Z', { tier: 'basic', amount_total: 100, card_trial: true }),
  ]
  const R = M.paidMrrForProfiles(perfis, M.paidMonthlyUsdByUser(eventos))
  // 9,90 + 12,90 (tabela) + 19,90 + 29 + 29 + 7 + 9,90 + 19,90 + 9,90 + 9,90 + 15,92
  checa('MRR pago = 173,22 (não os 276,90 da tabela V8)', perto(R.mrrUsd, 173.22))
  checa('a tabela nova do mesmo grupo = 276,90 (6×12,90 + 3×29,90 + 2×54,90)', perto(R.tableUsd, 276.9))
  checa('11 pagantes: 2 por fatura, 8 por checkout, 1 pela tabela', R.counted === 11 && R.fromInvoice === 2 && R.fromCheckout === 8 && R.fromTable === 1)
  checa('rótulo honesto', M.paidMrrSourceLabel(R) === '11 pagantes · 2 por fatura · 8 por checkout · 1 pela tabela (sem valor pago conhecido)')
  checa('trial e piloto não entram no rótulo; free nem no mapa', !R.perUser.has('t1') && !R.perUser.has('f1') && R.perUser.get('p1').usd === 0)
  checa('quem caiu na tabela é exatamente quem só tem o intro (u2 = 12,90 · table)', R.perUser.get('u2').source === 'table' && perto(R.perUser.get('u2').usd, 12.9))
  checa('rótulo sem ninguém na tabela diz isso', M.paidMrrSourceLabel({ counted: 2, fromInvoice: 1, fromCheckout: 1, fromTable: 0 }) === '2 pagantes · 1 por fatura · 1 por checkout · ninguém pela tabela')
  checa('MRR_PAID_EVENT_NAMES = os eventos com valor de assinatura (checkout, fatura e a troca para o anual)', JSON.stringify(M.MRR_PAID_EVENT_NAMES) === JSON.stringify(['payment_success', 'subscription_invoice_paid', 'plan_switched_to_annual']))
}

console.log('== 3b. a troca do mensal para o anual (KINEO-MRR-TROCA-ANUAL-2026-10-08) ==')
{
  // O Rick, 08/10: checkout mensal de 9,90 em 01/08; troca para o anual de 71 em 08/10 (razão plan_switched_to_annual).
  const troca = (uid, at, extra) => ev(uid, 'plan_switched_to_annual', at, { source: 'admin_switch_to_annual', tier: 'starter', currency: 'usd', monthly_minor: 990, annual_minor: 7100, amount_charged_minor: 6785, stripe_subscription_id: 'sub_rick', ...extra })
  const evs = [
    checkout('rick', '2026-08-01T16:29:51Z', { tier: 'starter', amount_total: 990, stripe_subscription_id: 'sub_rick' }),
    troca('rick', '2026-10-08T03:44:56Z'),
  ]
  const comTroca = (eventos) => M.paidMonthlyUsdByUser(eventos).get('rick')
  const p = comTroca(evs)
  checa('depois da troca a pessoa vale o anual ÷ 12 (71 / 12 = 5,92), não o mensal antigo de 9,90', p && perto(p.usd, 5.92) && p.billing === 'annual' && p.amountMinor === 7100 && p.source === 'invoice')
  checa('antes da troca valia o mensal (9,90)', perto(comTroca([evs[0]]).usd, 9.9))
  const renovacao = fatura('rick', '2027-10-08T03:44:56Z', { amount_paid: 7100, stripe_subscription_id: 'sub_rick' })
  checa('a renovação anual da MESMA assinatura herda o anual (7100 → 5,92/mês, não 71/mês)', perto(comTroca([...evs, renovacao]).usd, 5.92))
  checa('troca sem valor anual no razão não muda nada (continua o checkout)', perto(comTroca([evs[0], troca('rick', '2026-10-08T03:44:56Z', { annual_minor: 0 })]).usd, 9.9))
  const R = M.paidMrrForProfiles([{ id: 'rick', plan: 'starter' }], M.paidMonthlyUsdByUser(evs))
  checa('o MRR do grupo soma 5,92 por fatura (a troca conta como fatura, ninguém pela tabela)', perto(R.mrrUsd, 5.92) && R.fromInvoice === 1 && R.fromTable === 0)
  // mutante: sem o ramo da troca, o Rick volta a valer 9,90 — a prova acima tem de cair
  const fonte = rd('app/api/admin/_shared/mrr.ts')
  const ancora = '    } else if (isAnnualSwitchEvent(e.name, m)) {\n'
  checa('mutante: a âncora do ramo da troca é única', fonte.split(ancora).length === 2)
  const mut = fonte.split(ancora).join('    } else if (false) {\n')
  const jsMut = ts.transpileModule(mut, { compilerOptions: { module: 1, target: 9 } }).outputText
  const MM = {}
  vm.runInNewContext(jsMut, {
    exports: MM,
    require: (id) => ({ '@/lib/pricing': { PLANS: PLANS_V8 }, '@/lib/stripe': { stripe: {} }, '@/lib/settlementCurrency': { BRL_PER_USD_HOUSE: 5 } })[id] ?? (() => { throw new Error('dependencia inesperada ' + id) })(),
    console, Date, Map, Set, Math, Number, Object, Array, String, RegExp,
  })
  const pm = MM.paidMonthlyUsdByUser(evs).get('rick')
  checa('mutante "sem o ramo da troca" é pego (o Rick voltaria a 9,90)', pm && perto(pm.usd, 9.9))
}

console.log('== 4. as quatro superfícies obedecem à régua única ==')
{
  const mrr = rd('app/api/admin/_shared/mrr.ts')
  checa('BRL usa a taxa FIXA da casa (lib/settlementCurrency), nunca câmbio do dia', /import \{ BRL_PER_USD_HOUSE \} from '@\/lib\/settlementCurrency'/.test(mrr) && /amountMinor \/ 100 \/ BRL_PER_USD_HOUSE/.test(mrr) && !/exchangerate|fetch\(|frankfurter|openexchange/i.test(mrr))
  checa('o intro está excluído NA FUNÇÃO (não só no comentário)', /if \(metaTrue\(metadata, 'intro'\)\) return false/.test(mrr))
  checa('a fonte da tela: subscriberMrr cai na tabela só sem valor ou fora da família', /const sameFamily = paid != null && \(paid\.tier === null \|\| planBase\(paid\.tier\) === planBase\(plan\)\)/.test(mrr) && /return \{ usd: tableUsd, source: 'table', tableUsd, paid: paid \?\? null \}/.test(mrr))

  const page = rd('app/admin/overview/page.tsx')
  checa('overview (página): o card MRR mostra o valor PAGO, com a tabela nova só no rótulo', /value=\{fmtMoney\(m\.mrrPaidUsd\)\}/.test(page) && /tabela nova \$\{fmtMoney\(m\.mrrTableUsd\)\}/.test(page) && !/value=\{fmtMoney\(m\.mrrStripeUsd \?\? m\.mrrUsd\)\}/.test(page) && !/(?<![.\w])mrrUsd\b/.test(page.replace(/\/\/[^\n]*/g, '')))
  checa('overview (página): calcula pela régua única e o ARPU segue o pago', /const paidByUser = paidMonthlyUsdByUser\(\(eventsQ\.data \?\? \[\]\) as PaidAmountEvent\[\]\)/.test(page) && /const paidMrr = paidMrrForProfiles\(external, paidByUser\)/.test(page) && /const arpuUsd = payingTotal > 0 \? mrrPaidUsd \/ payingTotal : null/.test(page))
  checa('overview (página): o rótulo diz quantos caíram na tabela e se a Stripe respondeu', /mrrPaidLabel = paidMrrSourceLabel\(paidMrr\)/.test(page) && /Stripe indisponível agora/.test(page) && /Stripe ao vivo/.test(page))
  checa('overview (página): payment_success E subscription_invoice_paid continuam na busca de eventos', /'payment_success',/.test(page) && /'subscription_invoice_paid',/.test(page))
  checa('overview (página): a troca para o anual também entra na busca (MRR do Rick = anual ÷ 12)', /'plan_switched_to_annual',/.test(page))

  const ceo = rd('app/api/admin/ceo/compute.ts')
  checa('CEO: busca os eventos com valor e soma por subscriberMrr', /values: \[\.\.\.MRR_PAID_EVENT_NAMES\]/.test(ceo) && /const sub = subscriberMrr\(p\.plan, paidByUser\.get\(p\.id\)\)/.test(ceo) && /const price = sub\.usd/.test(ceo))
  checa('CEO: a Stripe deixou de SUBSTITUIR o número (vira conferência no rótulo)', !/if \(stripeMrr\) mrr = stripeMrr\.mrr/.test(ceo) && /const mrrStripeUsd = stripeMrr \? Math\.round\(stripeMrr\.mrr \* 100\) \/ 100 : null/.test(ceo) && /mrrSourceLabel: paidMrrSourceLabel\(mrrSources\)/.test(ceo))
  checa('CEO: o preço "each" da quebra por plano continua tabela; o MRR da linha é o pago', /priceUsd: mrrForPlan\(p\.plan\),/.test(ceo) && /mrrUsd: price,/.test(ceo))
  const ceoUi = rd('app/(dashboard)/admin/ceo/CeoClient.tsx')
  checa('CEO (tela): mostra origem, tabela nova e Stripe ao vivo/indisponível', /data\.mrrSourceLabel/.test(ceoUi) && /tabela nova \$\{money\(data\.mrrTableUsd\)\}/.test(ceoUi) && /Stripe indisponível agora/.test(ceoUi) && /tabela \$\{money\(p\.priceUsd\)\}\/mo → pago \$\{money\(p\.mrrUsd\)\}/.test(ceoUi))

  const paying = rd('app/admin/paying/page.tsx')
  checa('paying: busca metadata dos dois eventos e cada linha vale subscriberMrr', /'id, user_id, name, created_at, metadata',/.test(paying) && /values: \[\.\.\.MRR_PAID_EVENT_NAMES\]/.test(paying) && /subscriberMrr\(p\.plan, paidByUser\.get\(p\.id\)\)/.test(paying))
  checa('paying: linha na tabela é marcada "tabela"; total com rótulo e tabela nova', /r\.priceSource === 'table' && r\.priceUsd > 0/.test(paying) && /mrrSourceLabel: paidMrrSourceLabel\(mrrSources\)/.test(paying) && /tabela nova \{formatUsd\(data\.mrrTableUsd\)\}/.test(paying))
  checa('paying: "Paid on" continua vindo só do payment_success', /if \(e\.name !== 'payment_success'\) continue/.test(paying))

  const route = rd('app/api/admin/overview/route.ts')
  checa('overview (rota JSON): soma por subscriberMrr e devolve mrrTableUsd + mrrSourceLabel', /const sub = subscriberMrr\(plan, paidByUser\.get\(id\)\)/.test(route) && /mrrTableUsd: Math\.round\(mrrTableUsd \* 100\) \/ 100,/.test(route) && /mrrSourceLabel: paidMrrSourceLabel\(mrrSources\),/.test(route))
  checa('overview (rota JSON): trial continua contando só o potencial (linha intacta do guardião de 08/09)', /if \(isTrialPlan\(plan\)\) \{ trialsActive \+= 1; trialPotentialMrrUsd \+= PLAN_PRICE_USD\[plan\] \?\? 0; continue \}/.test(route))

  const arquivos = [...walk('app/admin'), ...walk('app/api/admin')].filter((p) => !p.endsWith('_shared/mrr.ts'))
  const somamTabela = arquivos.filter((p) => /mrr(Usd)?\s*\+=\s*(PLAN_PRICE_USD\[|mrrForPlan\()/.test(rd(p).replace(/\/\/[^\n]*/g, '')))
  checa(`nenhuma tela do admin soma MRR pela tabela (achados: ${somamTabela.join(', ') || 'nenhum'})`, somamTabela.length === 0)
  checa('pelo menos 40 arquivos varridos', arquivos.length >= 40)
}

console.log('== 5. contas internas fora, pela régua do fundador ==')
{
  const I = carrega('lib/internalAccounts.ts', {})
  const internos = ['josephskaf@hotmail.com', 'josephskaf.qualquer@x.com', 'josephsskaf@gmail.com', 'josephsskaf+testeste1010@gmail.com', 'victoriaskaf96@gmail.com', 'victoriaskaf@outlook.com', 'joseph+shorts3@gmail.com', 'joseph+abc@hotmail.com']
  checa('josephskaf% | josephsskaf% | victoriaskaf% | joseph+% são internas', internos.every((e) => I.isInternalEmail(e)))
  checa('cliente de verdade não é interno', ['gapozweb@gmail.com', 'den.higgins@gmail.com', 'cintia@hello-chat.eu', 'joe@gmail.com'].every((e) => !I.isInternalEmail(e)))
  checa('as superfícies excluem internos ANTES de somar (isInternalEmail)', /const external = profiles\.filter\(\(p\) => !isInternalEmail\(p\.email\)\)/.test(rd('app/admin/overview/page.tsx')) && /const external = profiles\.filter\(\(p\) => !isInternalEmail\(p\.email\)\)/.test(rd('app/api/admin/ceo/compute.ts')) && /if \(r\.internal \|\| !r\.active\) continue/.test(rd('app/admin/paying/page.tsx')))
  checa('o guardião da fonte única continua EXECUTANDO mrr.ts (stub de settlementCurrency)', /'@\/lib\/settlementCurrency'\) return \{ BRL_PER_USD_HOUSE: 5 \}/.test(rd('scripts/test-admin-fonte-unica-2026-09-08.mjs')))
}

console.log(`\n  verificacoes: ${ok + falhas.length} · falhas: ${falhas.length}`)
if (falhas.length) { for (const f of falhas) console.log('  ✗ ' + f); process.exit(1) }
console.log('OK — o MRR do admin é o que cada assinante paga, e a tabela só entra rotulada')
