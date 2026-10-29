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

// KINEO-PARCEIRO-50-VENCE-20-2910 — an explicit WELCOME20 (20%) never blocks the partner's 50%: when the visitor came
// through a live partner link and the checkout would otherwise qualify, the welcome request is dropped so the bigger
// first-month offer applies. Any other requested promo (private packs, recovery, codes) keeps today's behaviour.
export function partnerOfferBeatsWelcome(input: {
  tier: string
  isAnnual: boolean
  affiliatePresent: boolean
  welcomeRequested: boolean
  wantsTrial?: boolean
  checkoutRecovery?: boolean
}): boolean {
  return input.welcomeRequested && affiliateDiscountEligible({
    tier: input.tier,
    isAnnual: input.isAnnual,
    affiliatePresent: input.affiliatePresent,
    discountApplied: false,
    wantsTrial: input.wantsTrial,
    checkoutRecovery: input.checkoutRecovery,
    promoRequested: false,
  })
}
