// KINEO-TROCA-DE-PLANO-2026-09-09 — o lado do cliente da troca de plano.
// Usado pelo /pricing (PricingClient) e pelos cards do app (PricingCards):
// quem já assina não vai ao checkout (que recusa uma segunda assinatura);
// vê "Current plan" no seu e "Switch to X" nos outros, e a troca acontece
// por /api/stripe/change-plan.
export type SwitchableTier = 'starter' | 'basic' | 'pro'
// KINEO-TROCA-BUSINESS-2026-10-10 — o Business (US$ 84) também troca sem cancelar, com regra própria de dinheiro
// (rota /api/stripe/change-plan + lib/billing/trocaBusiness.ts): subir cobra a diferença AGORA e os créditos chegam
// quando a Stripe confirma o pagamento; descer vale na renovação. SwitchableTier continua sendo a escada dos 3 cartões
// (mapas Record<SwitchableTier, …> dependem disso); PlanSwitchTier é o que a troca aceita.
export type PlanSwitchTier = SwitchableTier | 'business'

export type PlanSwitchState = {
  subscribed: boolean
  tier: PlanSwitchTier | null
  status: 'trialing' | 'active' | null
}

export const PLAN_SWITCH_EMPTY: PlanSwitchState = { subscribed: false, tier: null, status: null }

export async function fetchPlanSwitchState(): Promise<PlanSwitchState> {
  try {
    const res = await fetch('/api/stripe/change-plan', { cache: 'no-store' })
    if (!res.ok) return PLAN_SWITCH_EMPTY
    const data = (await res.json()) as Partial<PlanSwitchState>
    if (!data.subscribed || !data.tier) return PLAN_SWITCH_EMPTY
    return { subscribed: true, tier: data.tier, status: data.status === 'trialing' ? 'trialing' : 'active' }
  } catch {
    return PLAN_SWITCH_EMPTY
  }
}

export function planSwitchLabel(state: PlanSwitchState, tier: PlanSwitchTier, planName: string): string | null {
  if (!state.subscribed) return null
  if (state.tier === tier) return 'Current plan'
  return `Switch to ${planName}`
}

export function planSwitchConfirmText(state: PlanSwitchState, planName: string, monthlyUsd: string): string {
  const when = state.status === 'trialing'
    ? `Your $1 trial continues; from day 8 you pay ${monthlyUsd}/month for ${planName}.`
    : `Takes effect now. The price difference is prorated on your next invoice; if you upgrade, the extra credits are added right away.`
  return `Switch to ${planName} (${monthlyUsd}/month)? ${when}`
}

export async function switchPlan(tier: SwitchableTier): Promise<{ ok: true; tier: SwitchableTier; credits: number } | { ok: false; error: string }> {
  try {
    const res = await fetch('/api/stripe/change-plan', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ tier }),
    })
    const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string; tier?: SwitchableTier; credits?: number }
    if (res.ok && data.ok && data.tier) return { ok: true, tier: data.tier, credits: Number(data.credits ?? 0) }
    return { ok: false, error: data.error ?? `http_${res.status}` }
  } catch {
    return { ok: false, error: 'network' }
  }
}

export function planSwitchErrorText(error: string): string {
  switch (error) {
    case 'annual_needs_support': return 'Annual plans are switched by support — email us and we do it the same day.'
    case 'paypal_subscription': return 'Your subscription is on PayPal — email us to switch plans.'
    case 'same_plan': return 'That is already your plan.'
    case 'no_subscription': return 'No active subscription found on this account.'
    // KINEO-TROCA-BUSINESS-2026-10-10 — os motivos da troca do Business (o anual continua pelo suporte, com o motivo certo)
    case 'business_annual_needs_support': return 'Business is billed monthly only. Your plan is annual, so support moves it for you — email support@usekineo.com, no need to cancel.'
    case 'business_after_trial': return 'Business starts after your trial: switch once your first monthly payment goes through.'
    case 'payment_failed': return 'Your bank did not approve the charge, so nothing was changed. Update your card in Manage billing and try again in a couple of minutes.'
    case 'subscription_canceling': return 'Your plan is set to cancel at the end of this period. Resume it in Manage billing before switching.'
    case 'payment_needs_support':
    case 'currency_needs_support':
    case 'schedule_needs_support': return 'This subscription needs a hand from support to switch — email support@usekineo.com and we do it the same day.'
    default: return 'Could not switch the plan right now. Nothing was changed — please try again.'
  }
}

// ═══ KINEO-TROCA-BUSINESS-2026-10-10 — a troca de/para o Business, com a prévia do que muda no dinheiro ══════════════

export type BusinessSwitchPreview = {
  direction: 'upgrade' | 'downgrade'
  currency: string
  /** O que a Stripe cobra AGORA (a diferença do período; 0 na descida). */
  chargedNowMinor: number
  /** O preço mensal do plano de destino. */
  monthlyMinor: number
  /** Subida: créditos que entram quando o pagamento confirma. Descida: 0. */
  creditsAfterPayment: number
  /** Descida: a cota mensal do plano novo, a partir da renovação. */
  creditsPerMonth: number
  /** Descida: quando o plano novo começa (fim do período pago). */
  effectiveAt: string | null
}

/** "$37.42" · "R$ 199,90" — sem depender de lib de preço (este módulo roda cru no guardião). */
export function switchMoneyLabel(currency: string, minor: number): string {
  const value = (Math.max(0, Math.round(minor)) / 100).toFixed(2)
  return String(currency).toLowerCase() === 'brl' ? `R$ ${value.replace('.', ',')}` : `$${value}`
}

function switchDateLabel(iso: string | null): string {
  const t = iso ? Date.parse(iso) : NaN
  if (!Number.isFinite(t)) return 'the end of your current billing period'
  return new Date(t).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
}

/** POST { tier, preview: true }: o que a troca faria (só a do Business), sem trocar nada. */
export async function previewBusinessSwitch(tier: PlanSwitchTier): Promise<{ ok: true; preview: BusinessSwitchPreview } | { ok: false; error: string }> {
  try {
    const res = await fetch('/api/stripe/change-plan', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ tier, preview: true }),
    })
    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>
    if (!res.ok || data.ok !== true || (data.direction !== 'upgrade' && data.direction !== 'downgrade')) {
      return { ok: false, error: typeof data.error === 'string' ? data.error : `http_${res.status}` }
    }
    return {
      ok: true,
      preview: {
        direction: data.direction,
        currency: typeof data.currency === 'string' ? data.currency : 'usd',
        chargedNowMinor: Number(data.charged_now_minor ?? 0),
        monthlyMinor: Number(data.monthly_minor ?? 0),
        creditsAfterPayment: Number(data.credits_after_payment ?? 0),
        creditsPerMonth: Number(data.credits_per_month ?? 0),
        effectiveAt: typeof data.effective_at === 'string' ? data.effective_at : null,
      },
    }
  } catch {
    return { ok: false, error: 'network' }
  }
}

/** A confirmação mostra a diferença de preço e os créditos — e QUANDO cada coisa acontece. */
export function businessSwitchConfirmText(preview: BusinessSwitchPreview, planName: string): string {
  const monthly = switchMoneyLabel(preview.currency, preview.monthlyMinor)
  if (preview.direction === 'upgrade') {
    return `Switch to ${planName} (${monthly}/month)? You pay ${switchMoneyLabel(preview.currency, preview.chargedNowMinor)} now — the price difference for the rest of this billing period — and +${preview.creditsAfterPayment} credits are added as soon as the payment goes through. Then ${monthly}/month.`
  }
  return `Switch to ${planName} (${monthly}/month)? Nothing is charged today. You keep Business and your credits until ${switchDateLabel(preview.effectiveAt)}; from then on you pay ${monthly}/month and get ${preview.creditsPerMonth} credits a month.`
}

export function businessSwitchDoneText(preview: BusinessSwitchPreview, planName: string): string {
  if (preview.direction === 'upgrade') return `Done — you are now on ${planName}. +${preview.creditsAfterPayment} credits arrive as soon as the payment confirms (usually a few seconds).`
  return `Done — you move to ${planName} on ${switchDateLabel(preview.effectiveAt)}. Until then you keep Business.`
}

/** A troca do Business inteira para a tela: prévia → confirmação com os números → troca. */
export async function confirmAndSwitchBusiness(input: {
  tier: PlanSwitchTier
  planName: string
  confirm: (text: string) => boolean
}): Promise<{ status: 'cancelled' } | { status: 'done'; tier: PlanSwitchTier; notice: string } | { status: 'error'; notice: string }> {
  const pv = await previewBusinessSwitch(input.tier)
  if (!pv.ok) return { status: 'error', notice: planSwitchErrorText(pv.error) }
  if (!input.confirm(businessSwitchConfirmText(pv.preview, input.planName))) return { status: 'cancelled' }
  try {
    const res = await fetch('/api/stripe/change-plan', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ tier: input.tier }),
    })
    const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string; tier?: PlanSwitchTier }
    if (res.ok && data.ok && data.tier) return { status: 'done', tier: data.tier, notice: businessSwitchDoneText(pv.preview, input.planName) }
    return { status: 'error', notice: planSwitchErrorText(data.error ?? `http_${res.status}`) }
  } catch {
    return { status: 'error', notice: planSwitchErrorText('network') }
  }
}
