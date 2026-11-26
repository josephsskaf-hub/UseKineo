// KINEO-BF-TODOS-ANUAIS-2611 [dono 26/11: "todos os planos estão com 50% de desconto. No plano anual"] — os CASOS da ordem, executados nas funções
// reais (lib/billing/blackFriday2026.ts, lib/billing/annualWelcomeOffer.ts, lib/checkoutPricing.ts, lib/settlementCurrency.ts), sem Stripe nem rede.
// O preço "cobrado" segue a MESMA ordem da rota /api/stripe/checkout (logado): unitAmount de tabela → portão bf2026CheckoutEligible → resolveAnnualOffer
// (com o portão por plano) → planSettlementAmountMinor em dólar e em reais. Imprime a tabela que vai para docs/billing/BF-TODOS-ANUAIS-2611.md.
// Rodar: npx tsx scripts/test-bf-todos-anuais-2611.mjs
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'

const carrega = createOfflineLoader()
const B = carrega('lib/billing/blackFriday2026.ts')
const O = carrega('lib/billing/annualWelcomeOffer.ts')
const Pr = carrega('lib/checkoutPricing.ts')
const M = carrega('lib/settlementCurrency.ts')

const T = (iso) => Date.parse(iso)
const NA_BF = T('2026-11-27T15:00:00.000Z')
const NOME = { starter: 'Starter', basic: 'Creator', pro: 'Studio', business: 'Business' }
const usd = (c) => Pr.formatCheckoutMoney('usd', c)
const brl = (c) => `R$ ${(c / 100).toFixed(2).replace('.', ',')}` // só para a tabela do relatório (o checkout formata pela Stripe)

/** O que o checkout logado (conta velha, que já pagou: sem as 3 h) cobra, em dólar e em reais. */
function cobra({ tier, isAnnual, nowMs, wantsTrial = false }) {
  const bf = B.bf2026CheckoutEligible({ tier, isAnnual, nowMs, wantsTrial })
  let unit = isAnnual ? Pr.getAnnualPrice(tier, 'usd') : Pr.TIER_PRICES[tier].usd
  if (bf) unit = Pr.ANNUAL_WELCOME_PRICES[tier].usd
  const offer = O.resolveAnnualOffer({ tier, isAnnual, signedIn: true, accountCreatedAt: '2020-01-01T00:00:00Z', hasPaid: true, bfOpen: bf, bfEndsAtMs: T(B.BF2026_ENDS_AT), nowMs })
  if (offer) unit = Pr.ANNUAL_WELCOME_PRICES[tier].usd
  const billing = isAnnual ? 'annual' : 'monthly'
  return {
    bf, offer: offer?.kind ?? null,
    usd: M.planSettlementAmountMinor(tier, billing, 'usd', unit, offer ? 'welcome' : 'regular'),
    brl: M.planSettlementAmountMinor(tier, billing, 'brl', unit, offer ? 'welcome' : 'regular'),
  }
}
const normal = (tier, isAnnual) => isAnnual
  ? { usd: Pr.getAnnualPrice(tier, 'usd'), brl: M.BRL_PLAN_PRICES_MINOR[tier].annual }
  : { usd: Pr.TIER_PRICES[tier].usd, brl: M.BRL_PLAN_PRICES_MINOR[tier].monthly }
const oferta = (tier) => ({ usd: Pr.ANNUAL_WELCOME_PRICES[tier].usd, brl: M.BRL_ANNUAL_WELCOME_MINOR[tier] })

const casos = []
const TRES = ['starter', 'basic', 'pro']
for (const t of TRES) casos.push({ caso: `${NOME[t]} anual, na janela (27/11 15:00Z)`, tier: t, isAnnual: true, nowMs: NA_BF, espera: 'oferta' })
for (const t of TRES) casos.push({ caso: `${NOME[t]} mensal, na janela (27/11 15:00Z)`, tier: t, isAnnual: false, nowMs: NA_BF, espera: 'normal' })
for (const t of TRES) casos.push({ caso: `${NOME[t]} anual, 1 ms antes da janela (24/11 04:59:59.999Z)`, tier: t, isAnnual: true, nowMs: T('2026-11-24T04:59:59.999Z'), espera: 'normal' })
for (const t of TRES) casos.push({ caso: `${NOME[t]} anual, 1ª fração da janela (24/11 05:00Z)`, tier: t, isAnnual: true, nowMs: T('2026-11-24T05:00:00.000Z'), espera: 'oferta' })
for (const t of TRES) casos.push({ caso: `${NOME[t]} anual, no fim exclusivo (02/12 05:00Z)`, tier: t, isAnnual: true, nowMs: T('2026-12-02T05:00:00.000Z'), espera: 'normal' })
for (const t of TRES) casos.push({ caso: `${NOME[t]} anual, depois (03/12 12:00Z)`, tier: t, isAnnual: true, nowMs: T('2026-12-03T12:00:00.000Z'), espera: 'normal' })
for (const t of TRES) casos.push({ caso: `${NOME[t]} anual, teste com cartão, na janela`, tier: t, isAnnual: true, nowMs: NA_BF, wantsTrial: true, espera: 'normal' })

let falhas = 0
const linhas = []
for (const c of casos) {
  const r = cobra(c)
  const e = c.espera === 'oferta' ? oferta(c.tier) : normal(c.tier, c.isAnnual)
  const ok = r.usd === e.usd && r.brl === e.brl && r.bf === (c.espera === 'oferta') && (c.espera === 'oferta' ? r.offer === 'black_friday_2026' : r.offer === null)
  if (!ok) falhas++
  linhas.push(`| ${c.caso} | ${c.espera === 'oferta' ? 'preço da oferta' : 'preço normal'} | ${usd(r.usd)} · ${brl(r.brl)} | ${ok ? 'PASS' : 'FALHA'} |`)
}
// plano que não aceita promoção (Business): o portão fecha mesmo na janela, no anual e no mensal
const biz = [true, false].map((isAnnual) => B.bf2026CheckoutEligible({ tier: 'business', isAnnual, nowMs: NA_BF }))
const bizOk = !Pr.planAcceptsPromotions('business') && biz.every((x) => x === false) && O.resolveAnnualOffer({ tier: 'business', isAnnual: true, signedIn: true, bfOpen: true, bfEndsAtMs: 1, nowMs: NA_BF }) === null
if (!bizOk) falhas++
linhas.push(`| Business (planAcceptsPromotions = false), anual e mensal, na janela | preço normal | portão fechado, sem oferta | ${bizOk ? 'PASS' : 'FALHA'} |`)
// a copy e a lista
const copyOk = JSON.stringify(B.BF2026_TIERS) === '["starter","basic","pro"]' && B.BF2026_PLAN_LABEL === 'Starter, Creator and Studio' && B.BF2026_OFFER_SCOPE === 'every annual plan'
if (!copyOk) falhas++
linhas.push(`| Lista e frase da tela | os 3 anuais | ${B.BF2026_PLAN_LABEL} · "${B.BF2026_OFFER_SCOPE}" | ${copyOk ? 'PASS' : 'FALHA'} |`)

console.log('| Caso | Esperado | Cobrado (US$ · R$) | Resultado |')
console.log('|---|---|---|---|')
for (const l of linhas) console.log(l)
console.log(falhas ? `\n${falhas} falha(s)` : `\nPASS ${linhas.length} casos (KINEO-BF-TODOS-ANUAIS-2611)`)
process.exit(falhas ? 1 : 0)
