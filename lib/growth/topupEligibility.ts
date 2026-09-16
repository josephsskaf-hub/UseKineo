export const TOPUP_ELIGIBILITY_HANDOFF_VERSION = 'topup_eligibility_handoff_v1'
export const TOPUP_ELIGIBILITY_MEASUREMENT_HOST = 'www.usekineo.com'
export const TOPUP_ELIGIBILITY_VISIBLE_RATIO = 0.6

// KINEO-MRR-2-TOPUP-2026-09-16 (fundador: "top-up em 1 clique para quem já paga — vai"): o Starter é 5 dos 10
// pagantes e era o único assinante barrado na recarga (403 no checkout e mandado para /pricing). Entra com os
// MESMOS SKUs e preços (topup40/120/100/300). Free e trial continuam fora: recarga é de quem já paga.
const TOPUP_ELIGIBLE_PLANS = new Set([
  'starter',
  'starter_trial',
  'basic',
  'basic_trial',
  'pro',
  'pro_trial',
])

export type TopupEligibilityState = 'eligible' | 'ineligible'
export type TopupEligibilitySurface = 'sidebar_chip' | 'account_panel'

export function normalizeTopupPlan(plan: unknown): string {
  return typeof plan === 'string' ? plan.trim().toLowerCase() : ''
}

export function canPurchaseCreditTopup(plan: unknown): boolean {
  return TOPUP_ELIGIBLE_PLANS.has(normalizeTopupPlan(plan))
}

export function topupEligibilityState(plan: unknown): TopupEligibilityState {
  return canPurchaseCreditTopup(plan) ? 'eligible' : 'ineligible'
}

export function isTopupEligibilityMeasurementHost(hostname: unknown): boolean {
  return typeof hostname === 'string'
    && hostname.trim().toLowerCase() === TOPUP_ELIGIBILITY_MEASUREMENT_HOST
}

export function topupEligibilityMetadata(surface: TopupEligibilitySurface) {
  return {
    version: TOPUP_ELIGIBILITY_HANDOFF_VERSION,
    surface,
    eligibility_state: 'ineligible' as const,
    destination: 'pricing' as const,
  }
}
