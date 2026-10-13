// KINEO-AFILIADO-30-NOVOS-2026-10-13 — a comissão de afiliado NOVO passa a 30% RECORRENTE (o mercado: OpusClip 25%,
// VEED 20% de base); quem JÁ é afiliado segue com 40%. Fundador (13/10): "vai pra 30% de comissao pra 20 novos convites".
// Histórico: 40% até 09/09 → 30% (KINEO-AFILIADO-30-2026-09-09) → 40% de 06/10 (KINEO-AFILIADOS-40-2026-10-06) → 30% para
// quem entra a partir de AFFILIATE_30_CUTOVER_ISO (os 40% de 06/10 foram prometidos por escrito: ninguém perde).
// DURAÇÃO NÃO MUDA: a comissão sai em toda cobrança elegível ENQUANTO o indicado seguir assinando, sem teto
// de meses (o webhook grava type 'recurring' em toda renovação paga). Lib pura (sem imports): entra em copy
// pública, rota de cadastro de afiliado, webhook, painel e cálculo de ilustração.
export const AFFILIATE_COMMISSION_RATE = 0.3
export const AFFILIATE_COMMISSION_PCT = `${Math.round(AFFILIATE_COMMISSION_RATE * 100)}%`

// Os afiliados que entraram ANTES do corte foram convidados com 40% (06/10 a 13/10) — e as linhas antigas nasceram
// com 0.3 gravado, então a linha sozinha NÃO separa o veterano do novo: quem separa é affiliates.created_at.
// O corte fica DEPOIS da publicação (14/10 00:00 BRT): quem se inscreve no intervalo vê 30% e recebe 40% — o erro
// possível é sempre a favor do parceiro, nunca contra.
export const LEGACY_AFFILIATE_COMMISSION_RATE = 0.4
export const AFFILIATE_30_CUTOVER_ISO = '2026-10-14T03:00:00Z'

/** O piso de UMA linha: 40% para quem entrou antes do corte; 30% para quem entrou depois. Data ausente ou ilegível
 *  conta como veterano (40%) — na dúvida, a casa paga a mais, nunca a menos do que prometeu. */
export function affiliateCommissionFloor(createdAt?: unknown): number {
  const t = typeof createdAt === 'string' || createdAt instanceof Date ? new Date(createdAt as string).getTime() : NaN
  if (!Number.isFinite(t)) return LEGACY_AFFILIATE_COMMISSION_RATE
  return t < Date.parse(AFFILIATE_30_CUTOVER_ISO) ? LEGACY_AFFILIATE_COMMISSION_RATE : AFFILIATE_COMMISSION_RATE
}

// A taxa do programa é PISO: a linha paga o maior entre o piso dela (affiliateCommissionFloor) e a taxa gravada.
// Uma taxa MAIOR gravada para uma pessoa (acordo especial em /admin/affiliates) continua valendo; uma menor, nunca.
// Valor inválido (nulo, texto, NaN, ≤ 0 ou > 1) cai no piso. O webhook calcula o dinheiro com esta função e PASSA
// affiliates.created_at; o painel e /api/affiliate/me mostram o mesmo número.
export function effectiveAffiliateCommissionRate(stored: unknown, createdAt?: unknown): number {
  const floor = affiliateCommissionFloor(createdAt)
  const rate = typeof stored === 'number' ? stored : Number(stored)
  return Number.isFinite(rate) && rate > floor && rate <= 1 ? rate : floor
}

// KINEO-BUSINESS-84-2026-10-09 — comissão do plano Business = 20% (fundador 09/10, "sim pra as 4"); os outros planos seguem a régua acima (30% novo, 40% veterano).
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
export function affiliateCommissionRateForPlan(stored: unknown, plan: string | null | undefined, createdAt?: unknown, partnerType?: unknown): number {
  // KINEO-AGENCIAS-2026-10-13 + KINEO-AFILIADO-30-NOVOS-2026-10-13 — Business: agência 30%, resto 20% fixo; fora do Business,
  // a régua por data de entrada (novo 30%, veterano 40%, acordo maior gravado vale).
  if (isBusinessCommissionPlan(plan)) return businessAffiliateCommissionRate(partnerType)
  return effectiveAffiliateCommissionRate(stored, createdAt)
}

// KINEO-AGENCIAS-2026-10-13 — PROGRAMA DE AGÊNCIAS (fundador 13/10, "tudo sim"): a agência de social media / tráfego que
// revende o Business ganha 30% recorrente na cobrança do Business — e SÓ ela. Quem é agência é a coluna
// affiliates.partner_type = 'agency' (migration 20261013120000_agency_program.sql; padrão 'creator'), marcada pelo fundador
// em /admin/affiliates depois de aprovar a inscrição de /agencies. Afiliado comum segue nos 20% fixos do Business; os outros
// planos seguem a régua de sempre (piso 40% / acordo maior) PARA TODO MUNDO, agência inclusive — a exceção é só do Business.
export const AGENCY_PARTNER_TYPE = 'agency' as const
export const CREATOR_PARTNER_TYPE = 'creator' as const
export type AffiliatePartnerType = typeof AGENCY_PARTNER_TYPE | typeof CREATOR_PARTNER_TYPE
export const AGENCY_BUSINESS_COMMISSION_RATE = 0.3
export const AGENCY_BUSINESS_COMMISSION_PCT = `${Math.round(AGENCY_BUSINESS_COMMISSION_RATE * 100)}%`

/** A linha é de agência? Só o texto 'agency' conta; nulo, coluna ausente (antes da migration) ou lixo = criador. */
export function isAgencyPartner(partnerType: unknown): boolean {
  return typeof partnerType === 'string' && partnerType.trim().toLowerCase() === AGENCY_PARTNER_TYPE
}
/** Normaliza o que o admin manda: 'agency' | 'creator', ou null se não for nenhum dos dois. */
export function normalizePartnerType(raw: unknown): AffiliatePartnerType | null {
  if (typeof raw !== 'string') return null
  const v = raw.trim().toLowerCase()
  return v === AGENCY_PARTNER_TYPE ? AGENCY_PARTNER_TYPE : v === CREATOR_PARTNER_TYPE ? CREATOR_PARTNER_TYPE : null
}
/** A taxa da cobrança do Business: agência = 30%; qualquer outro = os 20% fixos de sempre. */
export function businessAffiliateCommissionRate(partnerType: unknown): number {
  return isAgencyPartner(partnerType) ? AGENCY_BUSINESS_COMMISSION_RATE : BUSINESS_AFFILIATE_COMMISSION_RATE
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
