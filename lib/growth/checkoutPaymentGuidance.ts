export const CHECKOUT_PAYMENT_GUIDANCE_VERSION = 'checkout_payment_guidance_v1' as const

export const CHECKOUT_PAYMENT_GUIDANCE_COMPACT =
  'Card, Apple Pay or Google Pay · Link sign-in is optional'

export const CHECKOUT_PAYMENT_GUIDANCE_STRIPE =
  'Card, Apple Pay or Google Pay. Link is optional — choose Pay without Link to enter your card.'

/**
 * Keeps the payment-choice explanation inside Stripe's always-visible line item.
 * Price, grant, entitlement and available payment methods remain provider-owned.
 */
export function withCheckoutPaymentGuidance(description: string): string {
  const base = description.trim()
  if (!base) return CHECKOUT_PAYMENT_GUIDANCE_STRIPE
  if (base.includes(CHECKOUT_PAYMENT_GUIDANCE_STRIPE)) return base
  return `${base} · ${CHECKOUT_PAYMENT_GUIDANCE_STRIPE}`
}
