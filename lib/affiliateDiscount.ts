import { planAcceptsPromotions } from '@/lib/checkoutPricing'

export const AFFILIATE_LINK_PROMO_SOURCE = 'affiliate_link_50'

// Stripe cannot restrict a code by billing interval. Inline products also
// prevent product scoping, so hosted manual entry follows the same safe scope.
export function subscriptionAcceptsManualPromotions(tier: string, isAnnual: boolean): boolean {
  return planAcceptsPromotions(tier) && !isAnnual && (tier === 'basic' || tier === 'pro')
}

// Creator = basic, Studio = pro. The annual price already includes its offer.
export function affiliateDiscountEligible(input: {
  tier: string
  isAnnual: boolean
  affiliatePresent: boolean
  discountApplied: boolean
  wantsTrial?: boolean
  intro?: boolean
  checkoutRecovery?: boolean
  promoRequested?: boolean
}): boolean {
  return input.affiliatePresent &&
    (input.tier === 'basic' || input.tier === 'pro') &&
    planAcceptsPromotions(input.tier) &&
    !input.isAnnual && !input.discountApplied && !input.wantsTrial &&
    !input.checkoutRecovery && !input.promoRequested
}
