// ═══ KINEO-SALVA-CANCELAMENTO-3110 — a tela ANTES do cancelamento (pedido de 31/10: proteger o MRR) ═══════════════
// De 15 que assinam, ~10 cancelam. O único caminho de saída era o botão "Manage billing" → portal da Stripe → Cancel,
// sem uma pergunta no meio. Esta regra decide o que a tela "Before you go" mostra para cada motivo, usando SÓ o que
// a casa já sabe executar — nenhum desconto novo, nenhum preço novo:
//   · too_expensive  → trocar para o plano mais barato (Starter) pela rota que já existe (/api/stripe/change-plan);
//   · unused_credits → o saldo real + a data da renovação, dizendo a verdade: a COTA do plano zera na renovação (sem
//                      rollover — lib/credits/renewalBalance.ts); só o que passa de uma cota (comprado/dado) sobrevive;
//   · quality        → e-mail do suporte + o último filme da pessoa;
//   · just_testing / other → segue para o cancelamento.
// Em TODO passo existe "Continue to cancel" (sem padrão escuro): leva ao portal da Stripe já na tela de cancelar.
//
// O tempo da troca segue a regra que a rota change-plan JÁ tem (não foi mudada aqui):
//   · Creator/Studio mensal ATIVO → Starter: a troca vale AGORA; a parte não usada do mês volta como crédito na próxima
//     fatura (proration da Stripe); nenhum crédito do saldo é retirado; a cota menor vale a partir da renovação.
//   · em teste (trialing): troca sem cobrança; os créditos do teste ficam; a 1ª cobrança já sai no preço do Starter.
//   · Business → Starter: agendada para o FIM do período pago (Subscription Schedule da própria rota).
//   · anual: a rota recusa (409 annual_needs_support) → a tela oferece o suporte, não um botão que falha.
// Sem rede, sem banco: a rota GET /api/stripe/cancel-save e o componente CancelSaveFlow leem daqui.
import { renewalBalance } from '@/lib/credits/renewalBalance'

export const SALVA_CANCELAMENTO_TAG = 'KINEO-SALVA-CANCELAMENTO-3110'
export const SALVA_CANCELAMENTO_VERSION = 'salva_cancelamento_v1_20261031'

export const CANCEL_REASONS = ['too_expensive', 'unused_credits', 'quality', 'just_testing', 'other'] as const
export type CancelReason = (typeof CANCEL_REASONS)[number]

export const CANCEL_REASON_LABELS: Record<CancelReason, string> = {
  too_expensive: "It's too expensive",
  unused_credits: "I didn't use my credits",
  quality: "The videos weren't good enough",
  just_testing: 'I was just testing',
  other: 'Something else',
}

/** Os quatro eventos do funil de saída (todos do navegador; o fato da troca é o `plan_changed` que a rota grava). */
export const CANCEL_EVENTS = {
  opened: 'cancel_flow_opened',
  reasonSelected: 'cancel_reason_selected',
  savedDowngrade: 'cancel_saved_downgrade',
  continued: 'cancel_continued',
} as const

export const CANCEL_SUPPORT_EMAIL = 'support@usekineo.com'
/** O plano mais barato que a troca sem cancelar alcança (change-plan: starter | basic | pro). */
export const CHEAPEST_TIER = 'starter' as const

export function isCancelReason(v: unknown): v is CancelReason {
  return typeof v === 'string' && (CANCEL_REASONS as readonly string[]).includes(v)
}

/** Que oferta (uma só, honesta) cada motivo recebe. */
export type CancelOfferKind = 'downgrade' | 'credits' | 'support' | 'none'
export function offerForReason(reason: CancelReason): CancelOfferKind {
  if (reason === 'too_expensive') return 'downgrade'
  if (reason === 'unused_credits') return 'credits'
  if (reason === 'quality') return 'support'
  return 'none'
}

export type SaveTier = 'starter' | 'basic' | 'pro' | 'business'

/** Plano do perfil → o tier que a troca entende. `_trial` vira o tier com teste; o resto (free, autopilot…) é null. */
export function saveTierOfPlan(plan: unknown): { tier: SaveTier | null; inTrial: boolean } {
  const raw = String(plan ?? '').toLowerCase()
  const inTrial = raw.endsWith('_trial')
  const base = raw.replace(/_trial$/, '')
  const tier: SaveTier | null =
    base === 'starter' ? 'starter'
      : base === 'basic' || base === 'creator' ? 'basic'
        : base === 'pro' || base === 'studio' ? 'pro'
          : base === 'business' && !inTrial ? 'business'
            : null
  return { tier, inTrial }
}

export type DowngradeTiming = 'now_prorated' | 'trial' | 'period_end'
export type DowngradeBlock =
  | 'no_subscription'
  | 'already_cheapest'
  | 'annual'
  | 'not_active'
  | 'canceling'
  | 'unknown_plan'

export interface DowngradeInput {
  tier: SaveTier | null
  inTrial: boolean
  hasStripeSubscription: boolean
  /** 'month' | 'year' | null — null quando a Stripe não respondeu (a troca não é oferecida às cegas). */
  interval: string | null
  /** status vivo da assinatura na Stripe (null = não leu). */
  status: string | null
  cancelAtPeriodEnd: boolean
}

export type DowngradeDecision =
  | { possible: true; to: typeof CHEAPEST_TIER; timing: DowngradeTiming }
  | { possible: false; block: DowngradeBlock }

/** Espelho das recusas da rota change-plan: só oferece o botão quando a rota vai aceitar. */
export function downgradeDecision(input: DowngradeInput): DowngradeDecision {
  if (!input.hasStripeSubscription) return { possible: false, block: 'no_subscription' }
  if (!input.tier) return { possible: false, block: 'unknown_plan' }
  if (input.tier === CHEAPEST_TIER) return { possible: false, block: 'already_cheapest' }
  if (input.status !== 'active' && input.status !== 'trialing') return { possible: false, block: 'not_active' }
  if (input.interval !== 'month') return { possible: false, block: 'annual' }
  if (input.cancelAtPeriodEnd) return { possible: false, block: 'canceling' }
  if (input.tier === 'business') {
    // Business não tem teste; a descida da rota é agendada para o fim do período pago.
    if (input.inTrial || input.status === 'trialing') return { possible: false, block: 'not_active' }
    return { possible: true, to: CHEAPEST_TIER, timing: 'period_end' }
  }
  return { possible: true, to: CHEAPEST_TIER, timing: input.status === 'trialing' || input.inTrial ? 'trial' : 'now_prorated' }
}

export interface CreditsStory {
  balance: number
  /** cota mensal do plano atual (0 quando desconhecida) */
  planQuota: number
  /** a parte do saldo que zera na renovação (a sobra da cota do mês — sem rollover) */
  resetsAtRenewal: number
  /** a parte que sobrevive à renovação (crédito comprado/dado acima de uma cota) */
  keptAfterRenewal: number
}

/** A verdade do saldo pela MESMA régua do webhook (renewalBalance): só o que passa de uma cota sobrevive. */
export function creditsStory(balance: unknown, planQuota: number): CreditsStory {
  const b = Number.isFinite(Number(balance)) ? Math.max(0, Math.floor(Number(balance))) : 0
  const quota = Number.isFinite(planQuota) ? Math.max(0, Math.floor(planQuota)) : 0
  const kept = renewalBalance(b, quota).carried
  return { balance: b, planQuota: quota, resetsAtRenewal: b - kept, keptAfterRenewal: kept }
}

/** Data curta em inglês (a tela é em inglês). null → null: a tela não inventa data. */
export function formatSaveDate(iso: string | null | undefined): string | null {
  if (!iso) return null
  const t = Date.parse(iso)
  if (!Number.isFinite(t)) return null
  return new Date(t).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' })
}

/** O texto honesto do QUANDO da troca para o Starter. */
export function downgradeTimingCopy(timing: DowngradeTiming, periodEndLabel: string | null): string {
  if (timing === 'trial') {
    return 'Your trial continues with the credits you have. Your first charge will be the Starter price instead of your current plan.'
  }
  if (timing === 'period_end') {
    return periodEndLabel
      ? `Your current plan stays until ${periodEndLabel}. Starter starts at your next renewal — nothing is charged today.`
      : 'Your current plan stays until the end of this billing period. Starter starts at your next renewal — nothing is charged today.'
  }
  return 'Your plan switches to Starter now. You keep every credit you have today, and the unused part of this month comes back as a credit on your next bill.'
}

/** O texto honesto do saldo para quem diz que não usou os créditos. */
export function creditsCopy(story: CreditsStory, renewalLabel: string | null, inTrial: boolean): string {
  const when = renewalLabel ? `on ${renewalLabel}` : 'at your next renewal'
  if (inTrial) {
    return `You have ${story.balance} trial credits left. Your trial ends ${when}.`
  }
  if (story.keptAfterRenewal > 0) {
    return `You have ${story.balance} credits. ${story.resetsAtRenewal} of them are this month's plan credits — use them before ${renewalLabel ?? 'your next renewal'}; at renewal the plan's monthly credits reset (they don't roll over). The other ${story.keptAfterRenewal} you bought or received stay in your balance.`
  }
  return `You have ${story.balance} credits left. They're yours to use until ${renewalLabel ?? 'your next renewal'}; at renewal your plan's monthly credits reset to ${story.planQuota} — unused plan credits don't roll over.`
}

/** Link do último filme. /v/<id> só existe para filme PUBLICADO (consentimento), então o link é o próprio MP4 (https,
 *  do bucket da pessoa) ou, sem ele, a biblioteca. */
export function lastFilmHref(film: { videoUrl?: unknown } | null | undefined): string {
  const url = typeof film?.videoUrl === 'string' ? film.videoUrl : ''
  return /^https:\/\/[^\s"'<>]+$/i.test(url) ? url : '/library'
}

/** Título curto do filme a partir do tema (1ª linha, sem marcador tipo "HOOK:", até 60 caracteres). */
export function lastFilmTitle(topic: unknown): string {
  const first = String(topic ?? '').split(/\r?\n/).map((l) => l.trim()).find(Boolean) ?? ''
  const clean = first.replace(/^\[?[A-Z ]{3,20}\]?\s*[:—-]\s*/, '').trim()
  if (!clean) return 'Your last film'
  return clean.length > 60 ? `${clean.slice(0, 57).trimEnd()}…` : clean
}

export function supportMailto(filmId: string | null): string {
  const subject = filmId ? `Video quality — film ${filmId}` : 'Video quality'
  return `mailto:${CANCEL_SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}`
}
