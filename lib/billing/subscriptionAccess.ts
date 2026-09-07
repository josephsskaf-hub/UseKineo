// Fonte ÚNICA da pergunta "esta assinatura da Stripe ainda dá acesso?".
//
// Por que este arquivo existe (medido em 07/09/2026):
// A casa escrevia `status === 'active' || status === 'trialing'` à mão em cada
// lugar que precisava decidir. Dois desses lugares REVOGAM acesso — o
// `invoice.payment_failed` e o `customer.subscription.updated` do webhook. Como
// `past_due` não estava na lista, a primeira fatura de renovação que recusava
// derrubava o cliente para `plan='free'` (e zerava `cinematic_tokens`) no MESMO
// instante — enquanto a Stripe ainda ia tentar o cartão de novo por dias.
//
// A contradição que provou o defeito: `app/api/admin/_shared/mrr.ts:120` conta
// `past_due` como receita VIVA. O painel dizia "é cliente pagante" e o produto
// dizia "é free". Os dois não podiam estar certos.
//
// As duas vítimas reais, ambas com `has_paid=true`, `plan='free'`, ZERO eventos
// depois da recusa e nenhum e-mail: uma renovação de US$ 24,90 (AU) em 04/09 e
// uma de US$ 9,90 (NG) em 03/09, as duas `insufficient_funds` — exatamente o
// caso que a repetição da Stripe existe para recuperar.
//
// A regra, então:
//  · `active` / `trialing` — acesso, sem discussão.
//  · `past_due`            — acesso MANTIDO. A Stripe ainda está cobrando. Este
//                            estado só é alcançado por quem JÁ pagou pelo menos
//                            um ciclo; não é um jeito de entrar de graça.
//  · `incomplete`          — SEM acesso. É a primeira fatura que nunca foi paga:
//                            nunca houve dinheiro, então não há o que preservar.
//  · `unpaid` / `canceled` / `incomplete_expired` / `paused` — SEM acesso. A
//                            Stripe desistiu (ou o cliente saiu). Aqui revoga.

/** Estados em que a Stripe considera a assinatura corrente e paga. */
export const STRIPE_ACCESS_STATUSES = ['active', 'trialing'] as const

/**
 * Estados em que a Stripe AINDA está tentando cobrar uma assinatura que já foi
 * paga alguma vez. Enquanto durar, o cliente continua cliente.
 */
export const STRIPE_DUNNING_STATUSES = ['past_due'] as const

/**
 * Estados terminais: a cobrança acabou sem dinheiro, ou a assinatura morreu.
 * Só aqui o acesso é retirado.
 */
export const STRIPE_REVOKE_STATUSES = [
  'incomplete',
  'incomplete_expired',
  'unpaid',
  'canceled',
  'paused',
] as const

export type StripeSubscriptionStatus =
  | (typeof STRIPE_ACCESS_STATUSES)[number]
  | (typeof STRIPE_DUNNING_STATUSES)[number]
  | (typeof STRIPE_REVOKE_STATUSES)[number]

const asStatus = (status: unknown): string =>
  typeof status === 'string' ? status : ''

/** A assinatura está corrente e paga agora. */
export function stripeSubscriptionIsCurrent(status: unknown): boolean {
  return (STRIPE_ACCESS_STATUSES as readonly string[]).includes(asStatus(status))
}

/** A Stripe ainda está tentando cobrar (janela de repetição). */
export function stripeSubscriptionIsDunning(status: unknown): boolean {
  return (STRIPE_DUNNING_STATUSES as readonly string[]).includes(asStatus(status))
}

/**
 * A pergunta que os dois pontos de REVOGAÇÃO do webhook fazem.
 * `false` aqui significa: pode tirar o plano.
 */
export function stripeSubscriptionKeepsAccess(status: unknown): boolean {
  return stripeSubscriptionIsCurrent(status) || stripeSubscriptionIsDunning(status)
}
