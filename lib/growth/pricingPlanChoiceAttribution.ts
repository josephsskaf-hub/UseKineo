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

/** Presentation only. Coupon validity and eligibility remain server-owned. */
export function pricingBillingHandoff(input: { billing?: unknown; promo?: unknown }): {
  initialBilling: PricingPlanChoiceBilling
  key: string
} {
  const requestedBilling = input.billing === 'monthly' || input.billing === 'annual'
    ? input.billing : null
  const promo = typeof input.promo === 'string' ? input.promo.trim().toUpperCase() : ''
  // Existing email links omit billing, but these two offers promise monthly plans.
  const monthlyPromo = promo === 'FIRST50' || promo === 'COMEBACK50' ? promo : ''
  return {
    initialBilling: monthlyPromo ? 'monthly' : requestedBilling ?? 'annual',
    // A different billing handoff resets the page; unrelated query changes do not
    // overwrite a buyer's subsequent manual choice.
    key: `${requestedBilling ?? 'default'}:${monthlyPromo}`,
  }
}

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
