// KINEO-PACOTE2-PRECOS-2026-10-05 — guardião do "Pacote 2" de preços (decisões do fundador 04-05/10/2026):
//   1. Seedance 1.5 = 35 créditos por filme de 60 s (era 25); régua derivada 15/35/60/90 = 9/21/35/53; o 15 s (9 cr)
//      cabe no trial de 10 créditos e na cota semanal grátis.
//   2. Passe avulso: pack:starter = US$ 4,99 por 35 créditos = exatamente 1 filme Seedance 1.5 de 60 s; o starter290
//      (dormente) anuncia 35 s; ads_pass segue 60 s; o passe aparece na parede de crédito do Studio para quem não assina.
//   3. Anual = 12 × mensal × 0,60 (40% off), créditos mês a mês, reembolso integral em 14 dias e depois nenhum.
//      KINEO-ANUAL-30-2026-10-08 — re-ancorado: o fundador baixou o anual para 30% off (12 × mensal × 0,70 →
//      10800/25000/46000; BRL 54590/125990/230990). Quem pagou o anual de 40% (9290/21500/39500) segue com 60/150/300
//      pelo degrau legado; a ferramenta de troca (oferta de 40% por e-mail) não muda. Crédito, reembolso e recarga iguais.
//
// Como prova (readFileSync + transpileModule, sem alias @/ resolvido por bundler, sem rede, sem banco): EXECUTA
// lib/credits/engineCost.ts, lib/checkoutPricing.ts, lib/settlementCurrency.ts, lib/freeWeeklyFilm.ts,
// lib/growth/checkoutValueContext.ts e lib/growth/pricingPlanChoiceAttribution.ts; lê as superfícies que espelham
// (checkout, webhook, PayPal, pricing, termos, parede do Studio) para provar que leem a fonte; e roda MUTANTES em
// memória para provar que o guardião acusa quando um número volta.
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import vm from 'node:vm'
import ts from 'typescript'

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..')
const rd = (p) => readFileSync(join(RAIZ, p), 'utf8').replace(/\r\n/g, '\n')
let ok = 0
const falhas = []
const checa = (nome, cond) => { if (cond) { ok++; console.log('  ✓ ' + nome) } else { falhas.push(nome); console.log('  ✗ ' + nome) } }

// ── carregador: transpila .ts → CJS; '@/lib/x' e './x' resolvem para lib/x.ts com as fontes dadas (pristinas ou mutadas)
function carregador(over = {}) {
  const cache = new Map()
  const load = (file) => {
    if (cache.has(file)) return cache.get(file)
    const code = over[file] ?? rd(file)
    const js = ts.transpileModule(code, { compilerOptions: { module: 1, target: 9 } }).outputText
    const exp = {}
    cache.set(file, exp)
    const base = dirname(file)
    const req = (id) => {
      if (id.startsWith('@/lib/')) return load('lib/' + id.slice(6) + '.ts')
      if (id.startsWith('./')) return load(join(base, id.slice(2)).replace(/\\/g, '/') + '.ts')
      throw new Error('import inesperado: ' + id + ' em ' + file)
    }
    vm.runInNewContext(js, { exports: exp, require: req, process: { env: {} }, console: { warn: () => {}, log: () => {}, error: () => {} }, Math, Date, Number, String, Array, Object, Set, Map, Intl, JSON }, { filename: file })
    return exp
  }
  return load
}

// ── a bateria executada: devolve as falhas para um conjunto de fontes ─────────────────────────────────────────────
function bateria(over = {}) {
  const f = []
  let n = 0
  const t = (nome, c) => { n++; if (!c) f.push(nome) }
  const load = carregador(over)
  const E = load('lib/credits/engineCost.ts')
  const CP = load('lib/checkoutPricing.ts')
  const SC = load('lib/settlementCurrency.ts')
  const FW = load('lib/freeWeeklyFilm.ts')
  const AR = load('lib/billing/annualRefill.ts')
  const trialCap = Number(/export const TRIAL_CREDIT_CAP = (\d+)/.exec(over['lib/reverseTrial.ts'] ?? rd('lib/reverseTrial.ts'))?.[1])

  // 1. Seedance
  const s = (sec) => E.creditCostForDuration('cinematic_ai', true, sec)
  t('Seedance 60 s = 35 (creditCostFor e creditCostForDuration)', E.creditCostFor('cinematic_ai', true) === 35 && s(60) === 35)
  t('régua derivada 15/35/60/90 = 9/21/35/53', s(15) === 9 && s(35) === 21 && s(60) === 35 && s(90) === 53)
  t(`o 15 s (9 cr) cabe no trial de ${trialCap} créditos e o 35 s não`, trialCap === 10 && s(15) <= trialCap && s(35) > trialCap)
  t('cota semanal grátis = o 15 s pela mesma função (9)', FW.FREE_WEEKLY_FILM_CREDITS === s(15) && FW.FREE_WEEKLY_FILM_SECONDS === 15)
  const clip = rd('lib/clips/clipPricing.ts')
  t('clipPricing: seedance filmCredits 35 (espelho)', /seedance: \{[^}]*filmCredits: 35,/.test(clip))

  // 2. Passe avulso
  t('pack:starter = US$ 4,99 / 35 créditos', CP.PACK_PRICE_MINOR.usd === 499 && CP.PACK_CREDITS.starter === 35 && CP.packPriceLabel() === '$4.99')
  t('pack:starter cobre EXATAMENTE um Seedance de 60 s', CP.PACK_CREDITS.starter >= s(CP.PACK_ADVERTISED_SECONDS.starter) && CP.PACK_ADVERTISED_SECONDS.starter === 60 && CP.PACK_CREDITS.starter < 2 * s(60))
  t('starter290 anuncia 35 s e cobre o 35 s (não o de 60 s)', CP.PACK_ADVERTISED_SECONDS.starter290 === 35 && CP.PACK_CREDITS.starter290 >= s(35) && CP.PACK_CREDITS.starter290 < s(60) && CP.PACK290_PRICE_MINOR.usd === 290)
  t('ads_pass segue anunciando 60 s', CP.PACK_ADVERTISED_SECONDS.ads_pass === 60)
  const net = CP.netAfterStripeUsd(CP.PACK_PRICE_MINOR.usd / 100)
  t(`pior caso do passe positivo (líquido ${net.toFixed(2)} vs COGS ${CP.worstCaseCogsUsd(CP.PACK_CREDITS.starter).toFixed(2)})`, net - CP.worstCaseCogsUsd(CP.PACK_CREDITS.starter) > 0)
  t('passe em BRL = R$ 24,90 pela fórmula da casa', SC.settlementAmountMinor(CP.PACK_PRICE_MINOR.usd, 'brl') === 2490)

  // 3. Anual — KINEO-ANUAL-30-2026-10-08: 30% off (era 40% de 05/10 a 08/10)
  const M = { starter: 1290, basic: 2990, pro: 5490 }
  const A = { starter: 10800, basic: 25000, pro: 46000 }
  const A40 = { starter: 9290, basic: 21500, pro: 39500 } // o anual de 40% off já vendido: degrau legado, mesmo grant
  const B = { starter: 54590, basic: 125990, pro: 230990 }
  for (const tier of ['starter', 'basic', 'pro']) {
    const exato = (1 - CP.ANNUAL_PRICES[tier].usd / (CP.TIER_PRICES[tier].usd * 12)) * 100
    t(`anual ${tier} = ${A[tier]} (12 × ${M[tier]} × 0,70 arredondado; desconto real ${exato.toFixed(2)}%)`, CP.TIER_PRICES[tier].usd === M[tier] && CP.ANNUAL_PRICES[tier].usd === A[tier] && Math.abs(exato - 30) <= 0.5 && CP.annualSavingsPercent(tier) === 30)
    t(`anual BRL ${tier} = ${B[tier]} = 12 × mensal BRL × 0,70 até ,90`, SC.BRL_PLAN_PRICES_MINOR[tier].annual === B[tier] && SC.BRL_PLAN_PRICES_MINOR[tier].annual === SC.brlAnnualFromMonthly(SC.BRL_PLAN_PRICES_MINOR[tier].monthly) && SC.BRL_PLAN_PRICES_MINOR[tier].annual < SC.BRL_PLAN_PRICES_MINOR[tier].monthly * 12 * 0.71)
    t(`anual de 40% off já pago (${A40[tier]}) fica abaixo do vigente e mantém o grant de ${CP.TIER_CREDITS[tier]} (degrau legado)`, CP.LEGACY_ANNUAL_40OFF_PRICES_USD[tier] === A40[tier] && A40[tier] < A[tier] && AR.annualRefillCredits(tier, A40[tier], 'usd') === CP.TIER_CREDITS[tier])
  }
  t('ANNUAL_DISCOUNT_PERCENT = 30, fração BRL = 0,70 e ANNUAL_REFUND_DAYS = 14', CP.ANNUAL_DISCOUNT_PERCENT === 30 && SC.BRL_ANNUAL_PAID_FRACTION === 0.7 && CP.ANNUAL_REFUND_DAYS === 14)
  t('política do anual: integral em 14 dias, depois nada', CP.ANNUAL_REFUND_POLICY === 'Annual plans are refundable in full within 14 days of purchase; after that, no refund.')
  t('"≈ $X/mo" do anual: 9.00 / 20.83 / 38.33', CP.annualPerMonthLabel('starter') === '$9.00' && CP.annualPerMonthLabel('basic') === '$20.83' && CP.annualPerMonthLabel('pro') === '$38.33')
  t('anual comprado hoje recebe o grant vigente mês a mês (recarga do cron: 60/150/300)', AR.annualRefillCredits('starter', 10800, 'usd') === 60 && AR.annualRefillCredits('basic', 25000, 'usd') === 150 && AR.annualRefillCredits('pro', 46000, 'usd') === 300 && AR.ANNUAL_REFILL_MAX_MONTH === 11)

  // invariantes
  const inv = CP.checkPricingInvariants()
  t('checkPricingInvariants() vazio (' + inv.join(' | ') + ')', inv.length === 0)
  const invBrl = SC.checkSettlementInvariants({ starter: CP.TIER_PRICES.starter.usd, basic: CP.TIER_PRICES.basic.usd, pro: CP.TIER_PRICES.pro.usd })
  t('checkSettlementInvariants() vazio (' + invBrl.join(' | ') + ')', invBrl.length === 0)

  // checkout do anual diz a política do anual (literal espelhado, conferido aqui)
  const CV = load('lib/growth/checkoutValueContext.ts')
  t('checkoutValueContext: frase do anual === ANNUAL_REFUND_POLICY', CV.CHECKOUT_ANNUAL_REFUND_SENTENCE === CP.ANNUAL_REFUND_POLICY)
  const anual = CV.buildCheckoutValueContext({ billing: 'annual', credits: 150, intentCampaign: undefined, tier: 'basic' })
  const mensal = CV.buildCheckoutValueContext({ billing: 'monthly', credits: 150, intentCampaign: undefined, tier: 'basic' })
  t('checkout anual fala em 14 dias e mês a mês; o mensal segue com os 7 dias', anual.submitMessage.includes(CP.ANNUAL_REFUND_POLICY) && /month by month/.test(anual.submitMessage) && !/7-day/.test(anual.submitMessage) && /7-day money-back/.test(mensal.submitMessage) && anual.submitMessage.length <= 500)

  // /pricing abre no anual; promos mensais seguem no mensal
  const PA = load('lib/growth/pricingPlanChoiceAttribution.ts')
  t('/pricing abre no ANUAL por padrão', PA.pricingBillingHandoff({}).initialBilling === 'annual')
  t('?billing=monthly e promos mensais (FIRST50/COMEBACK50) abrem no mensal', PA.pricingBillingHandoff({ billing: 'monthly' }).initialBilling === 'monthly' && PA.pricingBillingHandoff({ promo: 'first50' }).initialBilling === 'monthly' && PA.pricingBillingHandoff({ promo: 'COMEBACK50' }).initialBilling === 'monthly')
  f.total = n
  return f
}

console.log('== 1-3. executado (fontes reais) ==')
const base = bateria()
for (const n of base) falhas.push(n)
ok += base.total - base.length
console.log(`  ${base.total - base.length} de ${base.total} verificações executadas verdes`)

console.log('== 4. espelhos e superfícies leem a fonte ==')
const ROTA = rd('app/api/stripe/checkout/route.ts')
const WH = rd('app/api/stripe/webhook/route.ts')
const PP = rd('lib/paypal.ts')
const PPR = rd('app/api/paypal/return/route.ts')
const PRICING = rd('app/pricing/PricingClient.tsx')
const TERMS = rd('app/terms/page.tsx')
const NOTE = rd('components/TopupUnavailableNote.tsx')
const GC = rd('app/(dashboard)/generate/GenerateClient.tsx')
const LLMS = rd('app/llms.txt/route.ts')
const FACTS = rd('lib/kineoFacts.ts')
const OFFER = rd('lib/ads/offer.ts')
const BANNER290 = rd('app/(dashboard)/generate/Offer290Banner.tsx')
checa('checkout: PACK_PRICES lê PACK_PRICE_MINOR (inline price_data, sem Price ID)', /const PACK_PRICES: Record<Currency, number> = \{ usd: PACK_PRICE_MINOR\.usd \}/.test(ROTA) && !/STRIPE_PRICE_(PACK|STARTER|ANNUAL)/.test(ROTA))
checa('checkout: PACK290_PRICES lê PACK290_PRICE_MINOR', /const PACK290_PRICES: Record<Currency, number> = \{ usd: PACK290_PRICE_MINOR\.usd \}/.test(ROTA))
checa('checkout: anual por getAnnualPrice em price_data com recurring.interval', /\? getAnnualPrice\(tier, currency, region\)/.test(ROTA) && /recurring: \{ interval \}/.test(ROTA))
checa('checkout: descrição do passe diz "one 60-second Seedance film" e a do 290, 35 s (derivadas)', ROTA.includes('one ${PACK_ADVERTISED_SECONDS.starter}-second Seedance film. No subscription.') && ROTA.includes('one ${PACK_ADVERTISED_SECONDS.starter290}-second Seedance film.'))
checa('webhook: fallback por valor 499 → PACK_CREDITS.starter e 490 legado → 30', /else if \(amount === PACK_PRICE_MINOR\.usd\) creditsToAdd = PACK_CREDITS\.starter/.test(WH) && /else if \(amount === LEGACY_PACK_STARTER_PRICE_MINOR_490\) creditsToAdd = LEGACY_PACK_STARTER_CREDITS_490/.test(WH))
// KINEO-ANUAL-30-2026-10-08 — re-ancorado: o anual mudou de preço de novo, os planos PayPal sobem para v4 (um v3 anual já
// criado cobraria o de 40% para sempre) e os anuais ocupados do Studio Ads passam a 10800/25000/46000.
checa('PayPal: pack lê PACK_PRICE_MINOR (sem "4.90" digitado), retorno com amount da fonte, planos v4', /usd: usd\(PACK_PRICE_MINOR\.usd\)/.test(PP) && !/usd: '4\.90'/.test(PP) && /const PLAN_VERSION = 'v4'/.test(PP) && /amount=\$\{PACK_PRICE_MINOR\.usd\}/.test(PPR))
checa('Studio Ads: 499 e anuais novos (30% off) ocupados; 12900/54900 e os de 40% (9290/21500/39500) saíram', (() => { const arr = ((OFFER.match(/ONE_TIME_USD_MINOR_OCCUPIED: readonly number\[\] = \[([^\]]*)\]/) || [])[1] || '').split(',').map((x) => Number(x.trim())); return [499, 490, 10800, 25000, 46000].every((n) => arr.includes(n)) && ![12900, 54900, 9290, 21500, 39500].some((n) => arr.includes(n)) })())
checa('pricing: selo "SAVE {ANNUAL_DISCOUNT_PERCENT}%" no lugar de "2 MONTHS FREE"', PRICING.includes('SAVE {ANNUAL_DISCOUNT_PERCENT}%') && !PRICING.includes('2 MONTHS FREE'))
checa('pricing: card anual "≈ $X" + "/mo, billed $Y yearly · save {ANNUAL_DISCOUNT_PERCENT}%" (30% desde 08/10)', PRICING.includes('`≈ ${annualPrices[p.tier as PaidTier].perMonth}`') && PRICING.includes("`/mo, billed ${displayCurrency ? annualPrices[p.tier as PaidTier].total : '—'} yearly · save ${ANNUAL_DISCOUNT_PERCENT}%`"))
checa('pricing: política do anual junto ao seletor, no FAQ e na caixa de garantia (3×)', (PRICING.match(/ANNUAL_REFUND_POLICY/g) || []).length >= 4 && PRICING.includes('data-testid="annual-refund-policy"'))
checa('termos: política do anual da fonte única', TERMS.includes("import { ANNUAL_REFUND_POLICY } from '@/lib/checkoutPricing'") && TERMS.includes('{ANNUAL_REFUND_POLICY}'))
checa('llms.txt / kineoFacts: anual com desconto e política; nada de "2 months free"', LLMS.includes('save ${plan.annualSavingsPercent}%') && LLMS.includes('${PRODUCT.annualRefundPolicy}') && FACTS.includes('annualRefundPolicy: ANNUAL_REFUND_POLICY') && !/2 months free/i.test(LLMS + FACTS))
checa('parede do Studio: passe de um filme com film_pass_offer_shown, preço e créditos da fonte, sem cifrão digitado', NOTE.includes("trackEvent('film_pass_offer_shown'") && NOTE.includes('packPriceLabel()') && NOTE.includes('PACK_CREDITS.starter') && !/\$\d/.test(NOTE))
checa('parede do Studio: só para quem NÃO assina, pelo ?pack=starter devolvido ao Studio', GC.includes('filmPass={onFilmPass && !isSubscriber ? { onBuy: onFilmPass, disabled: loading, reason } : null}') && GC.includes('onFilmPass={isStarter || isCreator || isStudio ? null : () => {') && GC.includes("withStudioReturn(withIntentCampaign('/api/stripe/checkout?pack=starter'))") && GC.includes("'film_pass',"))
checa('Offer290Banner: anuncia o filme de 35 s e o preço riscado vem de packPriceLabel()', BANNER290.includes('PACK_ADVERTISED_SECONDS.starter290') && BANNER290.includes('{packPriceLabel()}') && !BANNER290.includes('>$4.90<'))

console.log('== 5. mutantes (cada um tem de ficar vermelho) ==')
const CPSRC = rd('lib/checkoutPricing.ts')
const ECSRC = rd('lib/credits/engineCost.ts')
const SCSRC = rd('lib/settlementCurrency.ts')
const CVSRC = rd('lib/growth/checkoutValueContext.ts')
const muta = (file, src, de, para) => { if (src.split(de).length !== 2) throw new Error('mutante sem alvo único: ' + de); return { [file]: src.replace(de, para) } }
const MUTANTES = [
  ['Seedance volta a 25', muta('lib/credits/engineCost.ts', ECSRC, '      return 35\n', '      return 25\n')],
  ['passe volta a US$ 4,90', muta('lib/checkoutPricing.ts', CPSRC, '{ usd: 499 }', '{ usd: 490 }')],
  ['passe volta a 30 créditos', muta('lib/checkoutPricing.ts', CPSRC, '  starter: 35,\n', '  starter: 30,\n')],
  ['starter290 volta a anunciar 60 s', muta('lib/checkoutPricing.ts', CPSRC, '  starter290: 35,\n  ads_pass: 60,', '  starter290: 60,\n  ads_pass: 60,')],
  // KINEO-ANUAL-30-2026-10-08 — os alvos do anual apontam para os números novos; quatro mutantes novos da decisão de 08/10.
  ['anual do Creator volta a 10× (29900)', muta('lib/checkoutPricing.ts', CPSRC, 'basic: { usd: 25000 }', 'basic: { usd: 29900 }')],
  ['anual do Studio volta aos 40% off (39500)', muta('lib/checkoutPricing.ts', CPSRC, 'pro: { usd: 46000 }', 'pro: { usd: 39500 }')],
  ['ANNUAL_DISCOUNT_PERCENT volta a 40', muta('lib/checkoutPricing.ts', CPSRC, 'export const ANNUAL_DISCOUNT_PERCENT = 30', 'export const ANNUAL_DISCOUNT_PERCENT = 40')],
  ['o degrau legado do anual de 40% some (Studio de $395 cairia para 180)', muta('lib/checkoutPricing.ts', CPSRC, 'Math.min(LEGACY_V5_PRICES_USD[tier] * 10, LEGACY_ANNUAL_40OFF_PRICES_USD[tier])', 'LEGACY_V5_PRICES_USD[tier] * 10')],
  ['anual BRL do Starter volta a 10×', muta('lib/settlementCurrency.ts', SCSRC, 'annual: 54590', 'annual: 64900')],
  ['fração BRL do anual volta a 0,6', muta('lib/settlementCurrency.ts', SCSRC, 'export const BRL_ANNUAL_PAID_FRACTION = 0.7', 'export const BRL_ANNUAL_PAID_FRACTION = 0.6')],
  ['reembolso do anual vira 30 dias', muta('lib/checkoutPricing.ts', CPSRC, 'ANNUAL_REFUND_DAYS = 14', 'ANNUAL_REFUND_DAYS = 30')],
  ['checkout anual volta a dizer 7 dias', muta('lib/growth/checkoutValueContext.ts', CVSRC, 'within 14 days of purchase', 'within 7 days of purchase')],
]
for (const [nome, over] of MUTANTES) {
  let acusa
  try { acusa = bateria(over).length } catch { acusa = 1 }
  checa(`mutante "${nome}" fica vermelho (${acusa} acusação(ões))`, acusa >= 1)
}

console.log(`\n  verificações: ${ok + falhas.length} · falhas: ${falhas.length}`)
if (falhas.length) { for (const x of falhas) console.log('  ✗ ' + x); process.exit(1) }
console.log('OK — Pacote 2: Seedance 35 cr · passe US$ 4,99/35 cr (1 filme de 60 s) · anual 30% off (desde 08/10; 40% já vendido mantém o grant) com reembolso em 14 dias')
