import {
  ANNUAL_PRICES,
  PACK_CREDITS,
  PACK_PRICE_MINOR,
  TIER_CREDITS,
  TIER_PRICES,
} from '@/lib/checkoutPricing'

export type PayPalTier = 'starter' | 'basic' | 'pro'
export type PayPalBilling = 'monthly' | 'annual'

function usdValue(minor: number): string {
  return (minor / 100).toFixed(2)
}

export const PAYPAL_TIER_USD: Record<PayPalTier, { monthly: string; annual: string; name: string }> = {
  starter: {
    monthly: usdValue(TIER_PRICES.starter.usd),
    annual: usdValue(ANNUAL_PRICES.starter.usd),
    name: 'Kineo — Starter',
  },
  basic: {
    monthly: usdValue(TIER_PRICES.basic.usd),
    annual: usdValue(ANNUAL_PRICES.basic.usd),
    name: 'Kineo — Creator',
  },
  pro: {
    monthly: usdValue(TIER_PRICES.pro.usd),
    annual: usdValue(ANNUAL_PRICES.pro.usd),
    name: 'Kineo — Studio',
  },
}

export const PAYPAL_PLAN_CREDITS: Record<PayPalTier, number> = {
  starter: TIER_CREDITS.starter,
  basic: TIER_CREDITS.basic,
  pro: TIER_CREDITS.pro,
}

export const PAYPAL_PACK = {
  credits: PACK_CREDITS.starter,
  usd: usdValue(PACK_PRICE_MINOR.usd),
  name: `Kineo — First Pack (${PACK_CREDITS.starter} credits)`,
} as const

/**
 * PayPal plans are immutable commercial objects. A canonical price or grant
 * change must create a new plan instead of silently reusing the old ID stored
 * in paypal_config. The key is also what tierFromPlanId uses to map webhooks.
 */
export function paypalPlanConfigKey(tier: PayPalTier, billing: PayPalBilling): string {
  const priceMinor = billing === 'annual'
    ? ANNUAL_PRICES[tier].usd
    : TIER_PRICES[tier].usd
  return `plan_${tier}_${billing}_usd${priceMinor}_c${PAYPAL_PLAN_CREDITS[tier]}_v2`
}

export function paypalPlanRequestId(tier: PayPalTier, billing: PayPalBilling): string {
  return `kineo-${paypalPlanConfigKey(tier, billing).replace(/_/g, '-')}`
}
