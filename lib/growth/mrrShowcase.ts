import type { WallVideo } from '@/lib/engineWall'
import { creditCostForDuration } from '@/lib/credits/engineCost'
import { TIER_CREDITS, getTierPrice, type CheckoutTier } from '@/lib/checkoutPricing'

export const MRR_SHOWCASE_ENABLED = true
export const MRR_SHOWCASE_VERSION = 'mrr_showcase_20261001_v1' as const

/** Keep the original engine/format. Never fill a prompt or start a render. */
export function mrrShowcaseVideo(video: WallVideo): WallVideo {
  if (!video.href?.startsWith('/studio?')) return video
  const url = new URL(video.href, 'https://www.usekineo.com')
  url.searchParams.set('utm_source', 'showcase')
  url.searchParams.set('utm_medium', 'product_proof')
  url.searchParams.set('utm_campaign', MRR_SHOWCASE_VERSION)
  url.searchParams.set('intent_campaign', MRR_SHOWCASE_VERSION)
  return { ...video, href: url.pathname + url.search }
}

export function showcasePlanValue(tier: CheckoutTier, seconds: 15 | 35 | 60) {
  const cost = creditCostForDuration('cinematic_ai', true, seconds)
  const credits = TIER_CREDITS[tier]
  return {
    cost, credits, monthlyPriceMinor: getTierPrice(tier, 'usd'),
    films: Number.isFinite(cost) && cost > 0 ? Math.floor(credits / cost) : 0,
  }
}
