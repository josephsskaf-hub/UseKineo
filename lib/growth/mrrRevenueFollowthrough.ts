import { creditCostForDuration, type Quality } from '@/lib/credits/engineCost'
import { TIER_CREDITS, getTierPrice, formatCheckoutMoney, type CheckoutTier } from '@/lib/checkoutPricing'

export const MRR_EPISODE_VALUE_ENABLED = true
export const MRR_PRICING_PROOF_ENABLED = true
export const MRR_SHARE_ENABLED = true
export const MRR_EPISODE_VERSION = 'mrr_episode_value_20261001_v1'
export const MRR_PRICING_VERSION = 'mrr_pricing_proof_20261001_v1'
export const MRR_SHARE_VERSION = 'mrr_share_20261001_v1'
export const MRR_TIERS: CheckoutTier[] = ['starter', 'basic', 'pro']

export function mrrFilmCapacity(tier: CheckoutTier, quality: Quality, seconds: number) {
  const cost = creditCostForDuration(quality, true, seconds)
  if (!Number.isFinite(seconds) || seconds <= 0 || !Number.isFinite(cost) || cost <= 0) return null
  return { tier, cost, films: Math.floor(TIER_CREDITS[tier] / cost),
    price: formatCheckoutMoney('usd', getTierPrice(tier, 'usd')) }
}

/** Share is a campaign, not a generation intent. Opening it never spends credits. */
export function mrrShareHref() {
  return `/studio?utm_source=share&utm_medium=video&utm_campaign=${MRR_SHARE_VERSION}`
}
