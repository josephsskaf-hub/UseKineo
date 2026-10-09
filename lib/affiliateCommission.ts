// KINEO-AFILIADOS-40-2026-10-06 — a comissão de afiliado tem UMA fonte, e ela volta a 40% RECORRENTE.
// Fundador (06/10, sprint "MRR hoje", "2 sim"): recrutar 30 criadores de países ricos com 40% recorrente.
// A sessão CEO escolheu 40 e não 50 por margem (no Starter o pior motor já deixa margem fina).
// Histórico: 40% até 09/09 → 30% (KINEO-AFILIADO-30-2026-09-09, margem do Studio V7 de $59 no pior motor)
// → 40% a partir de 06/10, com a escada atual 12,90/29,90/54,90.
// DURAÇÃO NÃO MUDA: a comissão sai em toda cobrança elegível ENQUANTO o indicado seguir assinando, sem teto
// de meses (o webhook grava type 'recurring' em toda renovação paga). Lib pura (sem imports): entra em copy
// pública, rota de cadastro de afiliado, webhook, painel e cálculo de ilustração.
export const AFFILIATE_COMMISSION_RATE = 0.4
export const AFFILIATE_COMMISSION_PCT = `${Math.round(AFFILIATE_COMMISSION_RATE * 100)}%`

// A taxa do programa é PISO para quem já é afiliado: as 25 linhas de `affiliates` nasceram com 0.3 gravado e
// passam a ganhar 40% sem nenhuma escrita no banco (mais generoso, sem risco). Uma taxa MAIOR gravada para uma
// pessoa (acordo especial em /admin/affiliates) continua valendo; uma menor, nunca. Valor inválido (nulo, texto,
// NaN, ≤ 0 ou > 1) cai no piso. O webhook calcula o dinheiro com esta função; o painel mostra o mesmo número.
export function effectiveAffiliateCommissionRate(stored: unknown): number {
  const rate = typeof stored === 'number' ? stored : Number(stored)
  return Number.isFinite(rate) && rate > AFFILIATE_COMMISSION_RATE && rate <= 1 ? rate : AFFILIATE_COMMISSION_RATE
}

// KINEO-BUSINESS-84-2026-10-09 — comissão do plano Business = 20% (fundador 09/10, "sim pra as 4"); os outros planos seguem nos 40% acima.
// O Business já sai 15% abaixo do mercado (US$ 84) e é vendido a empresa, não a criador: 40% em cima deixaria a margem
// do pior motor no vermelho. É taxa FIXA do plano: não vale o piso de 40% nem um acordo maior gravado na linha do
// afiliado (o acordo especial foi negociado sobre os planos de criador). O webhook da Stripe passa o tier da fatura.
export const BUSINESS_AFFILIATE_COMMISSION_RATE = 0.2
export const BUSINESS_AFFILIATE_COMMISSION_PCT = `${Math.round(BUSINESS_AFFILIATE_COMMISSION_RATE * 100)}%`

/** A taxa que o webhook aplica a UMA cobrança: Business = 20% fixo; qualquer outro plano (ou pagamento sem plano) = a
 *  régua de sempre (effectiveAffiliateCommissionRate). */
export function isBusinessCommissionPlan(plan: string | null | undefined): boolean {
  return typeof plan === 'string' && plan.trim().toLowerCase() === 'business'
}
export function affiliateCommissionRateForPlan(stored: unknown, plan: string | null | undefined): number {
  if (isBusinessCommissionPlan(plan)) return BUSINESS_AFFILIATE_COMMISSION_RATE
  return effectiveAffiliateCommissionRate(stored)
}

/** A frase pública da exceção (partners, painel do afiliado). */
export const AFFILIATE_BUSINESS_TERMS =
  `Business plan payments (product ads for companies) earn ${BUSINESS_AFFILIATE_COMMISSION_PCT} recurring; every other plan earns ${AFFILIATE_COMMISSION_PCT}.`

// KINEO-AFILIADO-TERMOS-2026-09-09 — termos de repasse e bônus DECIDIDOS pelo
// fundador em 09/09 ("mínimo US$20, repasse mensal até dia 15, carência de 30
// dias; bônus US$3 uma vez por afiliado, teto 20 afiliados/US$60, pago junto da
// primeira comissão"). Uma fonte: /partners, painel do afiliado, kit e admin
// leem daqui. Pagamento é MANUAL (PayPal, fundador) — nada aqui move dinheiro.
export const AFFILIATE_PAYOUT_MIN_USD = 20
export const AFFILIATE_PAYOUT_DAY_OF_MONTH = 15
export const AFFILIATE_HOLD_DAYS = 30
export const AFFILIATE_ACTIVATION_BONUS_USD = 3
export const AFFILIATE_ACTIVATION_BONUS_CAP = 20
export const AFFILIATE_PAYOUT_TERMS =
  `Commissions are released ${AFFILIATE_HOLD_DAYS} days after the customer's payment (refund window), ` +
  `paid via PayPal once a month by the ${AFFILIATE_PAYOUT_DAY_OF_MONTH}th, with a $${AFFILIATE_PAYOUT_MIN_USD} minimum balance. ` +
  `Balances below the minimum roll over to the next month.`
export const AFFILIATE_BONUS_TERMS =
  `Activation bonus: a one-time $${AFFILIATE_ACTIVATION_BONUS_USD} after your first referred customer's first approved monthly payment, ` +
  `for the first ${AFFILIATE_ACTIVATION_BONUS_CAP} affiliates to get there. It is added to your balance and paid together with your first commission, never as a separate payout.`
