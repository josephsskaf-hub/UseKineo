// KINEO-TROCA-DE-PLANO-2026-09-09 — o lado do cliente da troca de plano.
// Usado pelo /pricing (PricingClient) e pelos cards do app (PricingCards):
// quem já assina não vai ao checkout (que recusa uma segunda assinatura);
// vê "Current plan" no seu e "Switch to X" nos outros, e a troca acontece
// por /api/stripe/change-plan.
export type SwitchableTier = 'starter' | 'basic' | 'pro'

export type PlanSwitchState = {
  subscribed: boolean
  tier: SwitchableTier | null
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

export function planSwitchLabel(state: PlanSwitchState, tier: SwitchableTier, planName: string): string | null {
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
    default: return 'Could not switch the plan right now. Nothing was changed — please try again.'
  }
}
