export const MOBILE_STICKY_BILLING_TRUTH_VERSION = 'pricing_mobile_sticky_billing_truth_v1' as const

export type MobileStickyBilling = 'monthly' | 'annual'
export type MobileStickyTier = 'starter' | 'basic' | 'pro'

const PLAN_NAMES: Record<MobileStickyTier, string> = {
  starter: 'Starter',
  basic: 'Creator',
  pro: 'Studio',
}

export function mobileStickyPlanLabel(input: {
  tier: MobileStickyTier
  billing: MobileStickyBilling
  monthlyLabel: string
  annualTotalLabel: string
}): string {
  const amount = input.billing === 'annual'
    ? `${input.annualTotalLabel}/yr`
    : input.monthlyLabel
  const emphasis = input.tier === 'basic' ? ' 🔥' : ''
  return `${PLAN_NAMES[input.tier]} ${amount}${emphasis}`
}

export function mobileStickyExposureKey(billing: MobileStickyBilling): string {
  return `kineo:${MOBILE_STICKY_BILLING_TRUTH_VERSION}:viewed:${billing}`
}

export function mobileStickyTelemetry(input: {
  billing: MobileStickyBilling
  tier?: MobileStickyTier
}) {
  return {
    version: MOBILE_STICKY_BILLING_TRUTH_VERSION,
    placement: 'mobile_sticky' as const,
    billing: input.billing,
    ...(input.tier ? { tier: input.tier } : {}),
  }
}
