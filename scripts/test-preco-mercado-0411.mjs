// KINEO-PRECO-MERCADO-0411 [fundador 04/11: "9. 19. 59", mensal sem desconto, anual 50%, sem avulso, sem top-up] — guardião sem rede: preço, grant e, acima de tudo, quem já assina.
import fs from 'node:fs'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'
let ok = 0, falhas = 0
const checa = (n, c) => { if (c) { ok++; console.log('  ok  ' + n) } else { falhas++; console.log('  FALHA ' + n) } }
const carrega = createOfflineLoader({})
const P = carrega('lib/checkoutPricing.ts'), S = carrega('lib/settlementCurrency.ts'), A = carrega('lib/billing/annualRefill.ts'), T = carrega('lib/growth/topupEligibility.ts')
const lf = (f) => fs.readFileSync(f, 'utf8').replace(/\r\n/g, '\n')
checa('mensal 9 / 19 / 59', P.TIER_PRICES.starter.usd === 900 && P.TIER_PRICES.basic.usd === 1900 && P.TIER_PRICES.pro.usd === 5900)
// KINEO-OFERTA-3H-0411 — o anual normal virou 30%; os 50% viraram o anual de boas-vindas (guardião próprio: test-oferta-3h-0411.mjs).
checa('anual normal 30%: 76 / 160 / 496', P.ANNUAL_PRICES.starter.usd === 7600 && P.ANNUAL_PRICES.basic.usd === 16000 && P.ANNUAL_PRICES.pro.usd === 49600 && P.ANNUAL_DISCOUNT_PERCENT === 30)
checa('anual de boas-vindas 50%: 54 / 114 / 354', P.ANNUAL_WELCOME_PRICES.starter.usd === 5400 && P.ANNUAL_WELCOME_PRICES.basic.usd === 11400 && P.ANNUAL_WELCOME_PRICES.pro.usd === 35400 && P.ANNUAL_WELCOME_DISCOUNT_PERCENT === 50)
checa('créditos 40 / 150 / 470', P.TIER_CREDITS.starter === 40 && P.TIER_CREDITS.basic === 150 && P.TIER_CREDITS.pro === 470) // reancorado KINEO-CREDITOS-B-0511 (fundador 05/11): 40 / 150 / 470
const porCredito = (t) => P.TIER_PRICES[t].usd / P.TIER_CREDITS[t]
checa('o crédito fica mais barato a cada degrau', porCredito('starter') > porCredito('basic') && porCredito('basic') > porCredito('pro'))
checa('sem 1º mês com desconto', P.INTRO_PRICES.starter.usd === 900 && P.INTRO_PRICES.basic.usd === 1900)
checa('invariantes dos preços', P.checkPricingInvariants().length === 0)
// quem já assina
const r = P.renewalCreditsFor
checa('Starter a 9,90 / 12,90 mantém 60', r('starter', 990) === 60 && r('starter', 1290) === 60)
checa('Creator a 19,90 / 29,90 / 15,92 mantém 150', r('basic', 1990) === 150 && r('basic', 2990) === 150 && r('basic', 1592) === 150)
checa('Studio a 54,90 / 39,90 mantém 300; a 29 mantém 180', r('pro', 5490) === 300 && r('pro', 3990) === 300 && r('pro', 2900) === 180)
checa('preço novo recebe o grant novo, mensal e anual', r('starter', 900) === 40 && r('basic', 1900) === 150 && r('pro', 5900) === 470 && r('basic', 16000) === 150 && r('basic', 11400) === 150)
const b = S.renewalCreditsForInvoice
checa('em reais: legado mantém, novo recebe o novo', b('basic', 9990, 'brl') === 150 && b('starter', 4990, 'brl') === 60 && b('pro', 27490, 'brl') === 300 && b('basic', 9490, 'brl') === 150 && b('pro', 29490, 'brl') === 470 && b('starter', 37790, 'brl') === 40 && b('starter', 26990, 'brl') === 40)
const a = A.annualRefillCredits
checa('recarga anual: legado em dólar mantém', a('starter', 8300, 'usd') === 60 && a('basic', 16700, 'usd') === 150 && a('pro', 46000, 'usd') === 300)
checa('recarga anual: novo em dólar recebe o novo', a('starter', 7600, 'usd') === 40 && a('basic', 16000, 'usd') === 150 && a('pro', 49600, 'usd') === 470 && a('starter', 5400, 'usd') === 40 && a('basic', 11400, 'usd') === 150 && a('pro', 35400, 'usd') === 470)
checa('recarga anual: legado em reais mantém, novo recebe o novo', a('basic', 83990, 'brl') === 150 && a('pro', 230990, 'brl') === 300 && a('basic', 79790, 'brl') === 150 && a('basic', 56990, 'brl') === 150)
for (const t of ['starter', 'basic', 'pro']) checa('anual em reais tem espelho certo: ' + t, P.ANNUAL_BRL_CURRENT_MINOR[t] === S.BRL_PLAN_PRICES_MINOR[t].annual)
// loja
checa('top-up fora nos dois lugares', P.TOPUPS_LIVE === false && T.TOPUP_SALES_OPEN === false && T.canPurchaseCreditTopup('pro') === false)
checa('avulso fora', /FILM_PASS_LIVE = false/.test(lf('lib/offers/avulsoUnico3110.ts')) && /ONE_TIME_ITEMS_LIVE = false/.test(lf('lib/oneTimeItem.ts')))
const rota = lf('app/api/stripe/checkout/route.ts')
checa('link velho de avulso e top-up cai nos planos, antes de cobrar', rota.indexOf("/pricing?from=no_one_time") > 0 && rota.indexOf("/pricing?from=no_one_time") < rota.indexOf('return await buildTopupAndRedirect(req, packParam, true)'))
checa('mensal sem desconto automático fora da janela de 3 h (WELCOME20 desligado)', /WELCOME20_SITE_OFFER_LIVE = false/.test(lf('lib/growth/publicPromoTruth.ts')))
// KINEO-MENSAL-3H-0911 [fundador 09/11: "vai para 30% nas 3 primeiras horas"] — o único desconto do mensal: 30% no 1º mês, só nas 3 h da conta nova que nunca pagou.
{
  const M = carrega('lib/billing/monthlyFirstMonthOffer.ts')
  const conta = { live: true, tier: 'basic', isAnnual: false, signedIn: true, accountCreatedAt: '2026-11-09T00:00:00.000Z', hasPaid: false }
  checa('mensal: 30% no 1º mês dentro das 3 h', M.monthlyFirstMonthDecision({ ...conta, nowMs: Date.parse('2026-11-09T02:59:59.000Z') }).apply === true && M.MONTHLY_FIRST_MONTH_PERCENT_OFF === 30)
  checa('mensal: sem desconto a partir de 3:00:00', M.monthlyFirstMonthDecision({ ...conta, nowMs: Date.parse('2026-11-09T03:00:00.000Z') }).apply === false)
  checa('mensal: sem desconto para quem já pagou', M.monthlyFirstMonthDecision({ ...conta, hasPaid: true, nowMs: Date.parse('2026-11-09T01:00:00.000Z') }).apply === false)
}
const clip = lf('lib/clips/clipPricing.ts')
checa('o preço dos clipes em créditos não mudou', clip.includes('export const STUDIO_PLAN_USD_CENTS = 5490') && clip.includes('export const STUDIO_PLAN_CREDITS = 300'))
// furos que os guardiões velhos acharam
const C = carrega('lib/clips/clipPricing.ts')
checa('o piso dos clipes não acompanha o crédito novo (Seedance 2.5 de 5 s segue 14 cr)', Math.abs(C.CLIP_FLOOR_USD_PER_CREDIT - 19.9 / 150) < 1e-12 && C.clipMarketDecision('s25', 5).credits === 14)
checa('fallback e starter290 da rota não vendem com o passe fora', rota.includes("if (!FILM_PASS_LIVE) return NextResponse.redirect(new URL('/pricing?from=no_one_time', req.url), 303)\n      return await buildPackAndRedirect(req, true)") && /if \(!FILM_PASS_LIVE\) return NextResponse\.redirect[^\n]*\n\s+return await buildStarter290AndRedirect/.test(rota))
checa('PayPal e Dodo não vendem o passe', /intent\.kind === 'pack' && !FILM_PASS_LIVE/.test(lf('app/api/paypal/checkout/route.ts')) && /sku === 'first_pack' && !FILM_PASS_LIVE/.test(lf('app/api/dodo/checkout/route.ts')))
checa('/pricing não anuncia crédito avulso', lf('app/pricing/PricingClient.tsx').includes('{TOPUPS_LIVE ? <PricingCreditsBlock /> : null}'))
checa('parede e faixa regional sem o passe', lf('components/offers/ConversionUpgrade.tsx').includes('return FILM_PASS_LIVE ? <ConversionPassCardVenda {...props} /> : null') && /!mostrar \|\| !FILM_PASS_LIVE/.test(lf('components/RegionalFirstPack.tsx')) && /export const REGION_PASS_OFFER_LIVE = false/.test(lf('lib/freeFilmPolicy.ts')))
checa('carta do cartão recusado sem a opção do passe', lf('app/api/admin/send-card-declined/route.ts').includes("${FILM_PASS_LIVE ? 'Two things actually work when that happens.' : 'One thing actually works when that happens.'}"))
const O = carrega('lib/billing/month2AnnualOffer.ts')
checa('a oferta do 2º mês diz o desconto real (30% no preço de hoje e no legado)', O.month2SavedPercent(900, 7600) === 30 && O.month2SavedPercent(1592, 13400) === 30)
const llms = lf('app/llms.txt/route.ts')
checa('llms.txt: história não acompanha o preço de hoje, e nada de crédito avulso', llms.includes('- 2026-10-09: Starter and Creator went back to $9.90 / $19.90 per month') && llms.includes('the annual discount became 30% off 12 monthly payments') && !llms.includes('one-time top-up credit packs are'))
console.log('\n' + ok + ' ok, ' + falhas + ' falha(s)')
process.exit(falhas ? 1 : 0)
