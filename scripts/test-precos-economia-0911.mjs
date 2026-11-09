// KINEO-PRECOS-ECONOMIA-0911 [fundador 09/11: "Sim para as 5" — decisão 1: manter 30% e mudar só o texto]
// Guardião: no /pricing anual, cada plano (Starter, Creator, Studio) diz a economia EM DINHEIRO, por mês e por ano, e o número
// é a conta das tabelas reais (12 × mensal − anual) — em dólar, em reais, e com a oferta de 3 h (50%, só Starter e Creator).
// EXECUTA o código real (loader offline) e lê a fiação do cartão; mutantes no fim — cada um tem de ficar vermelho.
import { offlineModules, source } from './gpt24h-offline-support.mjs'

const PRICING = 'app/pricing/PricingClient.tsx'
const COPY = 'lib/annualSavingCopy.ts'

function problems(replacements = {}) {
  const p = []
  const load = offlineModules({ replacements })
  const prices = load('lib/checkoutPricing.ts')
  const settle = load('lib/settlementCurrency.ts')
  const offer = load('lib/billing/annualWelcomeOffer.ts')
  const copy = load(COPY)
  const src = replacements[PRICING] ?? source(PRICING)

  // 1) A frase em dólar, por plano, com e sem a oferta de 3 h — o número sai das tabelas, a frase sai do módulo de copy.
  for (const tier of ['starter', 'basic', 'pro']) {
    const monthly = prices.getTierPrice(tier, 'usd')
    for (const welcome of [false, true]) {
      const annual = welcome && offer.annualOfferCoversTier(tier) ? prices.ANNUAL_WELCOME_PRICES[tier].usd : prices.getAnnualPrice(tier, 'usd')
      const s = copy.annualSavingMinor(monthly, annual)
      if (s.perYearMinor !== prices.TIER_PRICES[tier].usd * 12 - annual) p.push(`${tier}${welcome ? ' (3 h)' : ''}: economia/ano ≠ 12 × mensal − anual`)
      if (Math.abs(s.perMonthMinor * 12 - s.perYearMinor) > 1e-9) p.push(`${tier}: economia/mês ≠ economia/ano ÷ 12`)
      if (s.perYearMinor <= 0) p.push(`${tier}: anual não economiza nada (a linha some)`)
      const texto = copy.annualSavingText('en', prices.formatCheckoutMoney('usd', s.perMonthMinor), prices.formatCheckoutMoney('usd', s.perYearMinor))
      if (!/^Save \$\d+(\.\d\d)?\/month · \$\d+(\.\d\d)?\/year vs monthly$/.test(texto)) p.push(`${tier}: frase fora do formato: "${texto}"`)
    }
    // 2) Em reais: a tabela BRL (anual normal e anual da oferta) — nunca a conversão do dólar.
    const brlMonthly = settle.planSettlementAmountMinor(tier, 'monthly', 'brl', prices.getTierPrice(tier, 'usd'))
    const brlAnnual = settle.planSettlementAmountMinor(tier, 'annual', 'brl', prices.getAnnualPrice(tier, 'usd'))
    const b = copy.annualSavingMinor(brlMonthly, brlAnnual)
    if (b.perYearMinor !== settle.BRL_PLAN_PRICES_MINOR[tier].monthly * 12 - settle.BRL_PLAN_PRICES_MINOR[tier].annual) p.push(`${tier}: economia em reais ≠ tabela BRL`)
    if (b.perYearMinor <= 0) p.push(`${tier}: anual em reais não economiza`)
  }
  // 3) Nenhum preço mudou (decisão 1: só o texto). Âncoras de hoje.
  const ancoras = { starter: [900, 7600, 5400], basic: [1900, 16000, 11400], pro: [5900, 49600, 35400] }
  for (const [tier, [m, a, w]] of Object.entries(ancoras)) {
    if (prices.TIER_PRICES[tier].usd !== m || prices.ANNUAL_PRICES[tier].usd !== a || prices.ANNUAL_WELCOME_PRICES[tier].usd !== w) p.push(`preço do ${tier} mudou — esta entrega só muda texto`)
  }
  if (prices.ANNUAL_DISCOUNT_PERCENT !== 30 || prices.ANNUAL_WELCOME_DISCOUNT_PERCENT !== 50) p.push('percentual do anual mudou')
  // 4) As cinco línguas do site têm a frase; língua sem tradução revisada cai em inglês.
  for (const l of ['en', 'pt', 'es', 'fr', 'de']) if (!copy.ANNUAL_SAVING_COPY[l]) p.push(`sem frase de economia em ${l}`)
  if (copy.annualSavingWords('pt-BR').save !== 'Economize') p.push('pt-BR não cai no português')
  if (copy.annualSavingWords('it').save !== 'Save') p.push('língua sem tradução não cai em inglês')
  // 5) Fiação do cartão: mesma conta que o cartão cobra (annualMinorFor = oferta de 3 h quando vale), por mês E por ano, e em reais.
  if (!src.includes('const annualSaving = annualSavingMinor(getTierPrice(tier, resolvedCurrency, resolvedRegion), annualMinorFor(tier))')) p.push('/pricing: a economia do cartão não usa o anual que o cartão cobra')
  if (!src.includes('{savingWords.save} <b>{formatCheckoutMoney(resolvedCurrency, annualSaving.perMonthMinor)}{savingWords.month}</b> · <b>{formatCheckoutMoney(resolvedCurrency, annualSaving.perYearMinor)}{savingWords.year}</b> {savingWords.vs}')) p.push('/pricing: o cartão perdeu a economia por mês e por ano')
  if (!src.includes("planSettlementAmountMinor(tier, 'annual', 'brl', annualMinorFor(tier), ofertaNoPlano(tier) ? 'welcome' : 'regular')") || !src.includes("formatSettlementMoney('brl', brlSaving.perYearMinor)")) p.push('/pricing: a linha em reais perdeu a economia')
  // 6) O seletor diz o desconto lido da constante, nunca digitado.
  if (!src.includes('<>Save {ANNUAL_DISCOUNT_PERCENT}%</>') || !src.includes('<>Up to {ANNUAL_WELCOME_DISCOUNT_PERCENT}%</>')) p.push('seletor mensal/anual perdeu o "Save N%" calculado')
  // 7) Regras da casa que este cartão não pode quebrar.
  if (/unlimited|priority queue/i.test(source(COPY))) p.push('copy da economia promete o que não existe')
  return p
}

let failed = 0
const base = problems()
console.log(base.length === 0 ? 'PASS economia do anual em dinheiro (US$, R$, oferta de 3 h, 5 línguas)' : 'FAIL\n  ' + base.join('\n  '))
if (base.length) failed++

const pricingSrc = source(PRICING)
const copySrc = source(COPY)
const mutantes = [
  ['economia volta a ser só por ano', { [PRICING]: pricingSrc.replace('{formatCheckoutMoney(resolvedCurrency, annualSaving.perMonthMinor)}{savingWords.month}</b> · <b>', '') }],
  ['economia ignora a oferta de 3 h', { [PRICING]: pricingSrc.replace('annualSavingMinor(getTierPrice(tier, resolvedCurrency, resolvedRegion), annualMinorFor(tier))', 'annualSavingMinor(getTierPrice(tier, resolvedCurrency, resolvedRegion), getAnnualPrice(tier, resolvedCurrency, resolvedRegion))') }],
  ['economia digitada (conta errada)', { [COPY]: copySrc.replace('monthlyMinor * 12 - annualMinor', 'monthlyMinor * 10 - annualMinor') }],
  ['por mês dividido errado', { [COPY]: copySrc.replace('perYearMinor / 12', 'perYearMinor / 10') }],
  ['português some', { [COPY]: copySrc.replace(/\n  pt: \{[^\n]*\n/, '\n') }],
  ['seletor com número digitado', { [PRICING]: pricingSrc.replace('<>Save {ANNUAL_DISCOUNT_PERCENT}%</>', '<>Save 30%</>') }],
  ['reais perdem a economia', { [PRICING]: pricingSrc.replace("formatSettlementMoney('brl', brlSaving.perYearMinor)", "''") }],
]
for (const [nome, rep] of mutantes) {
  const changed = Object.entries(rep).every(([k, v]) => v !== (k === PRICING ? pricingSrc : copySrc))
  const red = changed && problems(rep).length > 0
  console.log(`${red ? 'ok   ' : 'FALHA'} mutante: ${nome}`)
  if (!red) failed++
}
if (failed) { console.error(`${failed} FALHA(S)`); process.exit(1) }
console.log('TUDO OK')
