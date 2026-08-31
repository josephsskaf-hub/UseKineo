export const PRICING_TIER_HANDOFF_VERSION = 'pricing_tier_handoff_v1' as const

export const PRICING_TIER_HANDOFF_TIERS = ['starter', 'basic', 'pro'] as const

export type PricingTierHandoffTier = (typeof PRICING_TIER_HANDOFF_TIERS)[number]

export type PricingTierHandoffAttribution = {
  version: typeof PRICING_TIER_HANDOFF_VERSION
  requested_tier: PricingTierHandoffTier
  intent_campaign?: string
}

const INTENT_CAMPAIGN_PATTERN = /^[A-Za-z0-9._~-]{1,100}$/

export function sanitizePricingTierHandoff(value: unknown): PricingTierHandoffTier | null {
  if (typeof value !== 'string') return null
  return (PRICING_TIER_HANDOFF_TIERS as readonly string[]).includes(value)
    ? value as PricingTierHandoffTier
    : null
}

export function sanitizePricingTierIntentCampaign(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const campaign = value.trim()
  return INTENT_CAMPAIGN_PATTERN.test(campaign) ? campaign : null
}

export function pricingTierCardId(tier: PricingTierHandoffTier): string {
  return `pricing-plan-${tier}`
}

export function buildPricingTierHandoffAttribution(input: {
  requestedTier: unknown
  intentCampaign: unknown
}): PricingTierHandoffAttribution | null {
  const requestedTier = sanitizePricingTierHandoff(input.requestedTier)
  if (!requestedTier) return null

  const intentCampaign = sanitizePricingTierIntentCampaign(input.intentCampaign)
  return {
    version: PRICING_TIER_HANDOFF_VERSION,
    requested_tier: requestedTier,
    ...(intentCampaign ? { intent_campaign: intentCampaign } : {}),
  }
}

export function pricingTierHandoffStorageKey(input: PricingTierHandoffAttribution): string {
  return [
    'kineo',
    input.version,
    input.requested_tier,
    input.intent_campaign ?? 'direct',
  ].join(':')
}
