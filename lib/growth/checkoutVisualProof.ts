import { BRAND_URL } from '@/lib/brandIdentity'

export const CHECKOUT_VISUAL_PROOF_VERSION = 'checkout_visual_proof_v2' as const

/**
 * A public, brand-owned image that Stripe can fetch for the hosted Checkout.
 * It is intentionally generic: never send a customer's render, prompt or
 * signed asset URL to Stripe merely to decorate a payment page.
 */
export const CHECKOUT_VISUAL_PROOF = {
  // Stripe renders this as a small square beside the line item. The previous
  // 1200x630 OG card became an unreadable dark sliver at that size; the
  // canonical 512px app icon remains recognizable without relying on text.
  imageUrl: `${BRAND_URL}/icon-512.png`,
  version: CHECKOUT_VISUAL_PROOF_VERSION,
} as const
