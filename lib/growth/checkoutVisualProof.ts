import { BRAND_URL } from '@/lib/brandIdentity'

export const CHECKOUT_VISUAL_PROOF_VERSION = 'checkout_visual_proof_v1' as const

/**
 * A public, brand-owned image that Stripe can fetch for the hosted Checkout.
 * It is intentionally generic: never send a customer's render, prompt or
 * signed asset URL to Stripe merely to decorate a payment page.
 */
export const CHECKOUT_VISUAL_PROOF = {
  imageUrl: `${BRAND_URL}/og-image.png`,
  version: CHECKOUT_VISUAL_PROOF_VERSION,
} as const
