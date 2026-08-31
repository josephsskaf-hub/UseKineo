export const PRICING_PLAN_CHOICE_ATTRIBUTION_VERSION =
  'pricing_plan_choice_attribution_v1' as const

export const PRICING_PLAN_CHOICE_TIERS = [
  'starter',
  'basic',
  'pro',
  'autopilot',
] as const

export type PricingPlanChoiceTier = (typeof PRICING_PLAN_CHOICE_TIERS)[number]
export type PricingPlanChoiceBilling = 'monthly' | 'annual'

export type PricingPlanChoiceAttribution = {
  version: typeof PRICING_PLAN_CHOICE_ATTRIBUTION_VERSION
  tier: PricingPlanChoiceTier
  billing: PricingPlanChoiceBilling
  intent_campaign?: string
}

const INTENT_CAMPAIGN_PATTERN = /^[A-Za-z0-9._~-]{1,100}$/

export function sanitizePricingIntentCampaign(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const campaign = value.trim()
  return INTENT_CAMPAIGN_PATTERN.test(campaign) ? campaign : null
}

export function buildPricingPlanChoiceAttribution(input: {
  tier: unknown
  billing: unknown
  intentCampaign: unknown
}): PricingPlanChoiceAttribution | null {
  const tier = typeof input.tier === 'string' &&
    (PRICING_PLAN_CHOICE_TIERS as readonly string[]).includes(input.tier)
    ? input.tier as PricingPlanChoiceTier
    : null
  if (!tier) return null

  const billing = tier === 'autopilot'
    ? 'monthly'
    : input.billing === 'monthly' || input.billing === 'annual'
      ? input.billing
      : null
  if (!billing) return null

  const intentCampaign = sanitizePricingIntentCampaign(input.intentCampaign)
  return {
    version: PRICING_PLAN_CHOICE_ATTRIBUTION_VERSION,
    tier,
    billing,
    ...(intentCampaign ? { intent_campaign: intentCampaign } : {}),
  }
}
