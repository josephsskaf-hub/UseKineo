// KINEO-MOEDA-LOCAL-2026-09-09 — DÓLAR NA VITRINE, MOEDA DO PAÍS NO CAIXA.
//
// O que aconteceu em 09/09: o fundador testou o funil de afiliados com o próprio
// cartão e o pagamento morreu na Stripe com "Moeda não aceita" (evento
// checkout_payment_failed: card_country BR, reason_category unsupported,
// network_status not_sent_to_network). Causa: a conta Stripe é BRASILEIRA, e
// cartão emitido no Brasil só pode ser cobrado em reais. Desde 19/08 a casa cobra
// USD no mundo todo — logo NENHUM brasileiro conseguia pagar, em nenhum plano.
//
// Decisão do fundador (09/09, noite): preço em dólar em todo card do site;
// ao clicar, o checkout abre na moeda do país; só os meios de pagamento da
// região aparecem (Pix nunca para americano) — e isso a Stripe faz sozinha
// quando a sessão nasce em BRL. Tabela FIXA em reais (aprovada: R$ 49,90 ·
// 99,90 · 199,90; anual 10×), não câmbio do dia — e revista uma vez por mês.
//
// Este módulo NÃO reabre o tipo CheckoutCurrency ('usd'). A moeda de EXIBIÇÃO
// continua uma só; o que nasce aqui é a moeda de LIQUIDAÇÃO, decidida no
// servidor na hora de criar a sessão. As ~15 telas que mostram preço não mudam.
//
// Importa de checkoutPricing; checkoutPricing NÃO importa daqui (sem ciclo, e os
// ~10 guardiões que carregam checkoutPricing com lista fechada de imports não
// mudam). O guardião executa este módulo em sandbox com checkoutPricing stubado.
import {
  AUTOPILOT_PRICES,
  LEGACY_TIER_CREDITS_V6,
  TIER_CREDITS,
  renewalCreditsFor,
  type CheckoutPlanTier,
  type CheckoutTier,
} from './checkoutPricing'

export type SettlementCurrency = 'usd' | 'brl'

export type SettlementReason =
  | 'forced'
  | 'prior_br_card_failure'
  | 'ip_country'
  | 'language'
  | 'default'

export interface SettlementDecision {
  currency: SettlementCurrency
  reason: SettlementReason
}

/** Câmbio da casa, fixo. Revisão mensal (dia 9). Não é o câmbio do dia. */
export const BRL_PER_USD_HOUSE = 5.0
export const BRL_HOUSE_RATE_REVIEWED_AT = '2026-09-09'
export const BRL_HOUSE_RATE_NEXT_REVIEW = '2026-10-09'

/**
 * USD (centavos) → BRL (centavos), terminando em ,90 como toda etiqueta da casa.
 *   990 → 4990 · 1990 → 9990 · 3990 → 19990 · 490 → 2490 · 1990 (top-up) → 9990
 *   (o ANUAL de plano NÃO passa por aqui: 9900 daria 49490; ele vem da tabela, 10× o mensal)
 * Piso R$ 1,90 para nunca gerar zero nem negativo.
 */
export function usdToBrlMinor(usdMinor: number): number {
  const raw = Math.max(0, Math.round(usdMinor)) * BRL_PER_USD_HOUSE
  return Math.max(190, Math.ceil(raw / 100) * 100 - 10)
}

/** A tabela aprovada pelo fundador em 09/09, escrita por extenso para poder ser lida. */
export const BRL_PLAN_PRICES_MINOR: Record<CheckoutTier, { monthly: number; annual: number }> = {
  starter: { monthly: 4990, annual: 49900 },
  basic: { monthly: 9990, annual: 99900 },
  pro: { monthly: 19990, annual: 199900 },
}

export function settlementAmountMinor(usdMinor: number, currency: SettlementCurrency): number {
  return currency === 'brl' ? usdToBrlMinor(usdMinor) : usdMinor
}

function normalizeCountry(value: string | null | undefined): string {
  return typeof value === 'string' ? value.trim().toUpperCase().slice(0, 2) : ''
}

function acceptsBrazilianPortuguese(acceptLanguage: string | null | undefined): boolean {
  if (typeof acceptLanguage !== 'string') return false
  // O primeiro idioma da lista é o do sistema da pessoa. pt-PT não conta.
  const first = acceptLanguage.split(',')[0]?.trim().toLowerCase() ?? ''
  return first === 'pt-br' || first.startsWith('pt-br;')
}

/**
 * Decide UMA vez, no servidor, em que moeda a sessão nasce. Ordem:
 *   1. `forced` ('usd'|'brl') — só links da própria casa (recuperação, cancelamento).
 *   2. Recusa anterior de cartão brasileiro em sessão USD — reabre em BRL sozinho.
 *   3. País do IP = BR.
 *   4. Navegador em pt-BR (brasileiro em viagem, cartão brasileiro).
 *   5. USD.
 * Índia e o resto do mundo seguem em USD nesta versão (o trilho da Índia é o Dodo).
 */
export function resolveSettlementCurrency(input: {
  ipCountry?: string | null
  acceptLanguage?: string | null
  forced?: string | null
  priorBrazilianCardFailure?: boolean
}): SettlementDecision {
  const forced = typeof input.forced === 'string' ? input.forced.trim().toLowerCase() : ''
  if (forced === 'usd' || forced === 'brl') return { currency: forced, reason: 'forced' }
  if (input.priorBrazilianCardFailure === true) return { currency: 'brl', reason: 'prior_br_card_failure' }
  if (normalizeCountry(input.ipCountry) === 'BR') return { currency: 'brl', reason: 'ip_country' }
  if (acceptsBrazilianPortuguese(input.acceptLanguage)) return { currency: 'brl', reason: 'language' }
  return { currency: 'usd', reason: 'default' }
}

export function formatSettlementMoney(currency: SettlementCurrency, amountMinor: number): string {
  const locale = currency === 'brl' ? 'pt-BR' : 'en-US'
  const code = currency === 'brl' ? 'BRL' : 'USD'
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: code,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amountMinor / 100).replace(/ /g, ' ')
}

/** A linha honesta embaixo do preço em dólar, só para quem vai pagar em reais. */
export function settlementNote(brlMinor: number, currency: SettlementCurrency, per: 'mo' | 'yr' | 'once'): string | null {
  if (currency !== 'brl') return null
  const label = formatSettlementMoney('brl', brlMinor)
  return per === 'once' ? `Charged in BRL: ${label}` : `Charged in BRL: ${label}/${per}`
}

/** Preço de plano na moeda de liquidação: em BRL vem da TABELA (anual = 10× mensal, não a fórmula sobre o anual em USD). */
export function planSettlementAmountMinor(
  tier: CheckoutTier,
  billing: 'monthly' | 'annual',
  currency: SettlementCurrency,
  usdMinor: number,
): number {
  if (currency !== 'brl') return usdMinor
  return BRL_PLAN_PRICES_MINOR[tier][billing]
}

/** Invariantes: mensal em BRL é exatamente o que a fórmula dá; anual é 10× o mensal. */
export function checkSettlementInvariants(usdMonthlyPrices: Record<CheckoutTier, number>): string[] {
  const problems: string[] = []
  for (const tier of Object.keys(BRL_PLAN_PRICES_MINOR) as CheckoutTier[]) {
    const expectMonthly = usdToBrlMinor(usdMonthlyPrices[tier])
    if (BRL_PLAN_PRICES_MINOR[tier].monthly !== expectMonthly) {
      problems.push(tier + ': BRL mensal ' + BRL_PLAN_PRICES_MINOR[tier].monthly + ' != formula ' + expectMonthly)
    }
    if (BRL_PLAN_PRICES_MINOR[tier].annual !== BRL_PLAN_PRICES_MINOR[tier].monthly * 10) {
      problems.push(tier + ': BRL anual nao e 10x o mensal')
    }
  }
  return problems
}

// ═══ A RÉGUA DA RENOVAÇÃO CONHECE A MOEDA DA FATURA ═══════════════════════
// renewalCreditsFor (checkoutPricing) compara o valor pago com o preço vigente
// EM DÓLAR. Uma fatura em reais (4990 = R$ 49,90) contra 990 leria como "pagou
// mais que o vigente" — certo por sorte, errado no dia em que o real mudar de
// escala, e cego para um assinante legado em BRL. Aqui a comparação é na
// mesma moeda: fatura BRL × tabela BRL do plano.
export function renewalCreditsForInvoice(
  tier: CheckoutPlanTier,
  amountPaidMinor: number | null | undefined,
  invoiceCurrency: string | null | undefined,
): number {
  const cur = typeof invoiceCurrency === 'string' ? invoiceCurrency.trim().toLowerCase() : 'usd'
  if (cur !== 'brl') return renewalCreditsFor(tier, amountPaidMinor)
  const currentBrl = tier === 'autopilot' ? usdToBrlMinor(AUTOPILOT_PRICES.usd) : BRL_PLAN_PRICES_MINOR[tier].monthly
  if (typeof amountPaidMinor === 'number' && amountPaidMinor > 0 && amountPaidMinor < currentBrl) {
    return LEGACY_TIER_CREDITS_V6[tier]
  }
  return TIER_CREDITS[tier]
}
