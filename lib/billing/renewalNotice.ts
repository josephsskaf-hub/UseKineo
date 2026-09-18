// ═══ KINEO-AVISO-RENOVACAO-RECUSADA-2026-09-18 — a pessoa fica sabendo DENTRO do produto ═══
//
// MEDIDO (18/09): duas assinaturas em `past_due` (recusas 03/07/16/09 e
// 04/11/17/09, as duas "insufficient_funds"). O produto não dizia NADA a essas
// pessoas: o plano continua (graça de lib/billing/subscriptionAccess.ts), o
// crédito novo não chega (só entra com fatura paga) e a única voz era o e-mail
// da Stripe — se estiver ligado. Fundador (18/09): "pode ir… no aviso da tela".
//
// A decisão é pura e mora aqui; o banner (components/RenewalDeclinedBanner.tsx)
// só a executa. A fonte do status é a Stripe viva, via /api/me/subscription —
// nunca o perfil, que não guarda status de cobrança. `unpaid` entra junto de
// `past_due`: é o que a Stripe grava quando desiste de tentar sem cancelar.

export const RENEWAL_NOTICE_VERSION = 'renewal_declined_banner_v1'
export const RENEWAL_NOTICE_STATUSES = new Set(['past_due', 'unpaid'])

export interface RenewalNoticeInput {
  /** O perfil tem `stripe_subscription_id`. Sem ele não se consulta a Stripe. */
  hasStripeSubscription: boolean
  /** `status` devolvido por /api/me/subscription (Stripe viva), ou null. */
  status: string | null
}

export type RenewalNoticeReason = 'no_subscription' | 'status_unknown' | 'in_good_standing' | 'ok'

export function decideRenewalNotice(input: RenewalNoticeInput): { visible: boolean; reason: RenewalNoticeReason; version: typeof RENEWAL_NOTICE_VERSION } {
  const version = RENEWAL_NOTICE_VERSION
  if (!input.hasStripeSubscription) return { visible: false, reason: 'no_subscription', version }
  if (!input.status) return { visible: false, reason: 'status_unknown', version }
  if (!RENEWAL_NOTICE_STATUSES.has(input.status)) return { visible: false, reason: 'in_good_standing', version }
  return { visible: true, reason: 'ok', version }
}

/** Nome público do plano a partir do `profiles.plan` (starter/basic/pro e variantes). */
export function renewalNoticePlanLabel(plan: string | null | undefined): string {
  const p = (plan ?? '').toLowerCase().replace(/_trial$/, '')
  if (p === 'starter') return 'Starter'
  if (p === 'basic' || p === 'creator') return 'Creator'
  if (p === 'pro' || p === 'studio') return 'Studio'
  if (p === 'autopilot' || p === 'autopilot_lite') return 'Autopilot'
  return 'Kineo'
}

export function renewalNoticeCopy(planLabel: string): { title: string; body: string; cta: string } {
  return {
    title: `Your ${planLabel} renewal didn't go through`,
    body: 'Your plan is still on, but new credits only arrive once the payment clears. Update your card — it takes a minute, and Stripe retries right away.',
    cta: 'Update card →',
  }
}
