// KINEO-MENSAL-3H-0911 [fundador 09/11: "vai para 30% nas 3 primeiras horas. É isso daí."] — a regra pura do 1º mês com 30% no plano MENSAL.
//
// O QUE É: 30% de desconto na PRIMEIRA fatura do Starter, do Creator ou do Studio mensal (`starter`, `basic`, `pro`), para a conta nova que nunca pagou,
// nas 3 primeiras horas depois de a conta nascer. Da 2ª fatura em diante, preço cheio. Uma vez por conta. Inverte, de propósito e SÓ dentro desta janela,
// a decisão de 04/11 "mensal não tem desconto": fora das 3 h o mensal segue sem desconto nenhum.
//
// O RELÓGIO NÃO É NOVO: é o MESMO da oferta do anual (lib/billing/annualWelcomeOffer.ts) — auth.users.created_at + 3 h, lido no servidor (getUser).
// Nada vem do navegador: não reinicia, não renasce em outra aba, conta que já pagou (has_paid) não entra.
// NÃO EMPILHA: o desconto de parceiro (50% do 1º mês no Creator/Studio mensal) vence; qualquer outro desconto já posto na sessão vence também
// (o servidor só aplica estes 30% quando a sessão ainda não tem `discounts`). Anual, Business, Autopilot e avulsos ficam de fora.
// O CRÉDITO NÃO DEPENDE DO VALOR DA 1ª FATURA: o 1º mês é concedido no checkout.session.completed pelo TIER_CREDITS do plano (o mesmo caminho do
// desconto de parceiro); a renovação paga o preço cheio e renewalCreditsFor dá o grant vigente. Por isso esta oferta NUNCA grava `intro`/`intro_credits`.
// É CUPOM (duration 'once'), não preço inline: o preço da assinatura continua sendo o de lista, então a 2ª fatura sai cheia sem ninguém mexer.
//
// Interruptor único: MONTHLY_FIRST_MONTH_3H_LIVE. false = a oferta some do /pricing, da caixa de presente e do checkout de uma vez.
// Guardião: scripts/test-mensal-3h-0911.mjs.
import { annualWelcomeEndsAtMs, annualWelcomeOpen } from '@/lib/billing/annualWelcomeOffer'

/** O interruptor. false desliga a oferta em todas as telas e no checkout. */
export const MONTHLY_FIRST_MONTH_3H_LIVE = true as boolean
export const MONTHLY_FIRST_MONTH_PERCENT_OFF = 30
/** O cupom na Stripe: id fixo, criado pelo próprio checkout no 1º uso (lib/billing/monthlyFirstMonthCoupon.ts). */
export const MONTHLY_FIRST_MONTH_COUPON_ID = 'KINEO_MONTHLY_3H_30'
export const MONTHLY_FIRST_MONTH_COUPON_NAME = '30% off first month (first 3 hours)'
/** Carimbo na sessão e na assinatura: é por ele que a mesma conta não usa a oferta duas vezes. */
export const MONTHLY_FIRST_MONTH_MARKER = 'monthly_first_month_3h'
export const MONTHLY_FIRST_MONTH_ENDS_AT_KEY = 'monthly_first_month_3h_ends_at'
/** O que /api/offers/annual-welcome devolve em `monthlyOffer` quando a janela desta conta está aberta. */
export const MONTHLY_FIRST_MONTH_OFFER_KIND = 'first_month_3h' as const

const TIERS_DO_MENSAL: readonly string[] = ['starter', 'basic', 'pro']
/** Starter, Creator e Studio. Business, Autopilot e Autopilot Lite não. */
export function monthlyFirstMonthCoversTier(tier: string): boolean { return TIERS_DO_MENSAL.includes(tier) }

export type MonthlyFirstMonthReason =
  | 'applied'
  | 'switch_off'
  | 'plan_shape'
  | 'signed_out'
  | 'already_paid'
  | 'window_closed'
  | 'card_trial'
  | 'private_promo'
  | 'affiliate_offer'
  | 'other_discount'
  | 'used_before'
  | 'coupon_unavailable'

export type MonthlyFirstMonthDecision = { apply: boolean; reason: MonthlyFirstMonthReason; endsAtMs: number | null }

/**
 * A decisão do checkout, com a conta já lida no servidor. A ordem dos motivos é a ordem da verificação (o 1º que falha é o que vai para o evento).
 * `affiliateOfferWins`: o desconto de parceiro vale nesta compra (Creator/Studio mensal com link de parceiro) — ele vence.
 * `otherDiscount`: a sessão já tem outro desconto (código pedido, oferta privada…) — nunca empilha.
 * `usedBefore`: esta conta já tem uma assinatura com o carimbo MONTHLY_FIRST_MONTH_MARKER.
 */
export function monthlyFirstMonthDecision(input: {
  live: boolean
  tier: string
  isAnnual: boolean
  signedIn: boolean
  accountCreatedAt: unknown
  hasPaid: boolean | null | undefined
  nowMs: number
  wantsTrial?: boolean
  privatePromo?: boolean
  affiliateOfferWins?: boolean
  otherDiscount?: boolean
  usedBefore?: boolean
}): MonthlyFirstMonthDecision {
  const endsAtMs = annualWelcomeEndsAtMs(input.accountCreatedAt)
  const nao = (reason: MonthlyFirstMonthReason): MonthlyFirstMonthDecision => ({ apply: false, reason, endsAtMs })
  if (input.live !== true) return nao('switch_off')
  if (input.isAnnual !== false || !monthlyFirstMonthCoversTier(input.tier)) return nao('plan_shape')
  if (input.signedIn !== true) return nao('signed_out')
  if (input.hasPaid === true) return nao('already_paid')
  if (!annualWelcomeOpen({ accountCreatedAt: input.accountCreatedAt, hasPaid: input.hasPaid, nowMs: input.nowMs })) return nao('window_closed')
  if (input.wantsTrial === true) return nao('card_trial')
  if (input.privatePromo === true) return nao('private_promo')
  if (input.affiliateOfferWins === true) return nao('affiliate_offer')
  if (input.otherDiscount === true) return nao('other_discount')
  if (input.usedBefore === true) return nao('used_before')
  return { apply: true, reason: 'applied', endsAtMs }
}

/**
 * Para as telas (/pricing e caixa de presente): a janela desta conta está aberta? Mesma régua do checkout, sem o que só a compra sabe
 * (parceiro, cupom, assinatura anterior — esses o checkout confere e, se for o caso, cobra cheio). null = nada na tela.
 */
export function monthlyFirstMonthWindow(input: {
  live: boolean
  signedIn: boolean
  accountCreatedAt: unknown
  hasPaid: boolean | null | undefined
  nowMs: number
}): { endsAtMs: number } | null {
  const d = monthlyFirstMonthDecision({ ...input, tier: 'basic', isAnnual: false })
  return d.apply && d.endsAtMs !== null ? { endsAtMs: d.endsAtMs } : null
}

/** O 1º mês na moeda dada: o preço menos 30% arredondado ao centavo, como a Stripe calcula um cupom percent_off. 900 → 630 · 4490 → 3143. */
export function monthlyFirstMonthMinor(fullMinor: number): number {
  const cheio = Math.max(0, Math.round(fullMinor))
  return cheio - Math.round((cheio * MONTHLY_FIRST_MONTH_PERCENT_OFF) / 100)
}

/** O cupom que serve: válido, 30%, só a 1ª fatura, sem valor fixo e sem restrição de produto. Qualquer outra coisa com este id não é usada. */
export function monthlyFirstMonthCouponAccepts(coupon: {
  deleted?: boolean | void
  valid?: boolean
  percent_off?: number | null
  amount_off?: number | null
  duration?: string
  applies_to?: { products?: string[] } | null
} | null | undefined): boolean {
  return Boolean(coupon) && coupon!.deleted !== true && coupon!.valid === true && coupon!.percent_off === MONTHLY_FIRST_MONTH_PERCENT_OFF &&
    coupon!.duration === 'once' && !coupon!.amount_off && !coupon!.applies_to?.products?.length
}

/** Carimbo na sessão E na assinatura (a assinatura é o que impede um 2º uso). Nada de `intro`: o grant do 1º mês é o do plano. */
export function monthlyFirstMonthStamp(endsAtMs: number): Record<string, string> {
  return { [MONTHLY_FIRST_MONTH_MARKER]: '1', [MONTHLY_FIRST_MONTH_ENDS_AT_KEY]: new Date(endsAtMs).toISOString() }
}

/** Uma assinatura desta conta já usou a oferta? */
export function monthlyFirstMonthUsedBy(subscriptions: ReadonlyArray<{ metadata?: Record<string, string> | null }>): boolean {
  return subscriptions.some((s) => s.metadata?.[MONTHLY_FIRST_MONTH_MARKER] === '1')
}

/**
 * A página da Stripe com os 30% não passa do fim da janela: expira no fim das 3 h, nunca antes de 40 min da abertura do balde de 5 min
 * (a Stripe exige ≥ 30 min da criação; o balde abre até 5 min antes e sobra folga para a latência) e nunca depois do prazo normal. Determinístico no balde, como o prazo normal (a chave de idempotência inclui o prazo).
 */
export function monthlyFirstMonthSessionExpiresAt(input: { defaultExpiresAtSec: number; endsAtMs: number; bucketStartSec: number }): number {
  const piso = input.bucketStartSec + 40 * 60
  const fimDaJanela = Math.ceil(input.endsAtMs / 1000)
  return Math.min(input.defaultExpiresAtSec, Math.max(fimDaJanela, piso))
}

/** A frase do 1º mês na página da Stripe: o desconto e o preço depois dele. */
export function monthlyFirstMonthSubmitLine(thenPriceLabel: string): string {
  return `${MONTHLY_FIRST_MONTH_PERCENT_OFF}% off your first month, then ${thenPriceLabel}/month.`
}

/** A janela acabou há pouco (até 1 h: quem abriu o /pricing no fim da janela e clicou depois) e a pessoa escolheu um mensal: a página da Stripe diz que este é o preço normal. */
export const MONTHLY_FIRST_MONTH_ENDED_NOTICE_MS = 60 * 60 * 1000
export const MONTHLY_FIRST_MONTH_ENDED_NOTICE = `Your 3-hour offer of ${MONTHLY_FIRST_MONTH_PERCENT_OFF}% off the first month has ended — this is the regular price.`
export function monthlyFirstMonthJustEnded(d: MonthlyFirstMonthDecision, nowMs: number): boolean {
  return d.reason === 'window_closed' && d.endsAtMs !== null && nowMs >= d.endsAtMs && nowMs - d.endsAtMs < MONTHLY_FIRST_MONTH_ENDED_NOTICE_MS
}
