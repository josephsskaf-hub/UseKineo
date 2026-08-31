export const BULK_CHECKOUT_TRUTH_VERSION = 'bulk_checkout_entitlement_truth_v1' as const

export interface BulkCheckoutEntitlement {
  videos: number
  credits: number
}

/**
 * Stripe is the last product surface before payment. Describe the entitlement
 * the webhook actually grants (universal credits), while keeping the business
 * outcome the buyer selected (a Fast Short volume) in the same sentence.
 */
export function bulkCheckoutDescription(pack: BulkCheckoutEntitlement): string {
  if (!Number.isSafeInteger(pack.videos) || pack.videos <= 0) {
    throw new Error('bulk videos must be a positive safe integer')
  }
  if (!Number.isSafeInteger(pack.credits) || pack.credits < pack.videos) {
    throw new Error('bulk credits must be a safe integer that covers the selected Fast volume')
  }

  return (
    `One-time purchase: ${pack.credits} universal credits, sized for ${pack.videos} Kineo 1 Fast Shorts ` +
    `you create and download in Kineo. No subscription. Credits never expire.`
  )
}

export function readBulkCheckoutTruthVersion(
  value: unknown,
): typeof BULK_CHECKOUT_TRUTH_VERSION | null {
  return value === BULK_CHECKOUT_TRUTH_VERSION ? BULK_CHECKOUT_TRUTH_VERSION : null
}
