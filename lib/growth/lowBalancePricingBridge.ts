export const LOW_BALANCE_PRICING_BRIDGE_VERSION = 'low_balance_pricing_bridge_v1' as const

export type LowBalancePricingBridgeState =
  | 'eligible'
  | 'unresolved'
  | 'outside_balance_window'
  | 'trial_active'
  | 'subscriber'

const SUBSCRIPTION_PLANS = new Set([
  'starter',
  'starter_trial',
  'basic',
  'basic_trial',
  'creator',
  'creator_trial',
  'pro',
  'pro_trial',
  'studio',
  'studio_trial',
  'autopilot',
  'autopilot_trial',
  'autopilot_pilot',
])

export function lowBalancePricingBridgeState(input: {
  credits: unknown
  entitlementsResolved: unknown
  plan: unknown
  trialActive: unknown
}): LowBalancePricingBridgeState {
  if (input.entitlementsResolved !== true) return 'unresolved'
  if (typeof input.credits !== 'number' || !Number.isFinite(input.credits)) {
    return 'outside_balance_window'
  }
  if (input.credits < 1 || input.credits > 5) return 'outside_balance_window'
  if (input.trialActive === true) return 'trial_active'
  const plan = typeof input.plan === 'string' ? input.plan.trim().toLowerCase() : ''
  if (SUBSCRIPTION_PLANS.has(plan)) return 'subscriber'
  return 'eligible'
}

export function lowBalancePricingBridgeMetadata(surface: 'topbar_credit_chip') {
  return {
    version: LOW_BALANCE_PRICING_BRIDGE_VERSION,
    surface,
    balance_bucket: 'one_to_five' as const,
    destination: 'pricing' as const,
  }
}
