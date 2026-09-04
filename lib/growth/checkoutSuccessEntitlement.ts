export const SELF_SERVE_CHECKOUT_SUCCESS_VERSION =
  'self_serve_checkout_success_entitlement_v1' as const

export type SelfServeEntitlementState =
  | 'ready'
  | 'unresolved'
  | 'payment_pending'
  | 'plan_pending'

const SELF_SERVE_PAID_PLANS = new Set([
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
])

/**
 * A balance is not proof of a subscription: free accounts and one-time packs
 * can both have credits. Self-serve checkout is ready only after the account
 * API has resolved entitlements, confirmed payment and returned a paid plan.
 */
export function selfServeEntitlementState(input: {
  entitlementsResolved: unknown
  hasPaid: unknown
  plan: unknown
}): SelfServeEntitlementState {
  if (input.entitlementsResolved !== true) return 'unresolved'
  if (input.hasPaid !== true) return 'payment_pending'
  if (typeof input.plan !== 'string' || !SELF_SERVE_PAID_PLANS.has(input.plan)) {
    return 'plan_pending'
  }
  return 'ready'
}

export function isSelfServeEntitlementReady(input: {
  entitlementsResolved: unknown
  hasPaid: unknown
  plan: unknown
}): boolean {
  return selfServeEntitlementState(input) === 'ready'
}
