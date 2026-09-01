export const TOPUP_ELIGIBILITY_HANDOFF_VERSION = 'topup_eligibility_handoff_v1'
export const TOPUP_ELIGIBILITY_MEASUREMENT_HOST = 'www.usekineo.com'
export const TOPUP_ELIGIBILITY_VISIBLE_RATIO = 0.6

const TOPUP_ELIGIBLE_PLANS = new Set([
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
