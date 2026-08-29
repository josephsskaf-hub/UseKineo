export const TRIAL_FIRST_DELIVERY_PENDING_REASON = 'trial_first_delivery_pending' as const

export type CheckoutCancelledPrimaryAction = 'checking' | 'first_delivery' | 'checkout'

export type CheckoutCancelledRecoveryInput = {
  resolved: boolean
  resumeReason: string | null
}

/**
 * Keeps an untouched trial out of the checkout retry loop after cancellation.
 *
 * The passive resume endpoint owns eligibility. This client policy only maps
 * its explicit reason to a primary surface. Unknown, failed and unauthenticated
 * probes fail open to the existing checkout recovery so a buyer is never
 * blocked by a best-effort Growth request.
 */
export function decideCheckoutCancelledPrimary(
  input: CheckoutCancelledRecoveryInput,
): CheckoutCancelledPrimaryAction {
  if (!input.resolved) return 'checking'
  if (input.resumeReason === TRIAL_FIRST_DELIVERY_PENDING_REASON) return 'first_delivery'
  return 'checkout'
}
