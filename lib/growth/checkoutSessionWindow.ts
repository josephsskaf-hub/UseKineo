export const CHECKOUT_IDEMPOTENCY_BUCKET_SECONDS = 5 * 60
export const RECURRING_CHECKOUT_WINDOW_HOURS = 24
export const RECURRING_CHECKOUT_WINDOW_SECONDS =
  RECURRING_CHECKOUT_WINDOW_HOURS * 60 * 60
export const RECURRING_CHECKOUT_WINDOW_VERSION =
  'recurring_checkout_24h_v1' as const

/**
 * Keeps the Stripe session alive for almost a full day while preserving the
 * route's deterministic five-minute idempotency bucket. Stripe allows at most
 * 24 hours, so anchoring at the bucket start yields 23h55m–24h from the click.
 */
export function recurringCheckoutExpiresAt(checkoutWindow: number): number {
  if (!Number.isSafeInteger(checkoutWindow) || checkoutWindow < 0) {
    throw new Error('checkoutWindow must be a non-negative safe integer')
  }
  return (
    checkoutWindow * CHECKOUT_IDEMPOTENCY_BUCKET_SECONDS +
    RECURRING_CHECKOUT_WINDOW_SECONDS
  )
}
