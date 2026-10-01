import { creditCostForDuration } from '@/lib/credits/engineCost'
import { TIER_CREDITS, getTierPrice, type CheckoutTier } from '@/lib/checkoutPricing'

export { MRR_SHOWCASE_ENABLED, MRR_SHOWCASE_VERSION } from './mrrShowcaseConfig'

export function showcasePlanValue(tier: CheckoutTier, seconds: 15 | 35 | 60) {
  const cost = creditCostForDuration('cinematic_ai', true, seconds)
  const credits = TIER_CREDITS[tier]
  return {
    cost, credits, monthlyPriceMinor: getTierPrice(tier, 'usd'),
    films: Number.isFinite(cost) && cost > 0 ? Math.floor(credits / cost) : 0,
  }
}
