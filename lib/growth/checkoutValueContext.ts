import type { CheckoutPlanTier } from '@/lib/checkoutPricing'
import {
  TRIAL_BALANCE_BRIDGE_COST,
  TRIAL_BALANCE_BRIDGE_DURATION,
  TRIAL_BALANCE_BRIDGE_VERSION,
} from '@/lib/growth/trialBalanceBridge'

export const CHECKOUT_VALUE_CONTEXT_VERSION = 'checkout_value_context_v1' as const

export type CheckoutValueContextInput = {
  billing: 'monthly' | 'annual'
  credits: number
  intentCampaign: string | undefined
  tier: CheckoutPlanTier
}

export type CheckoutValueContext = {
  lineItemDescription: string | null
  outputCount: number | null
  submitMessage: string
  variant: 'standard' | 'trial_balance_seedance'
  version: typeof CHECKOUT_VALUE_CONTEXT_VERSION
}

/**
 * Turns an abstract recurring-credit purchase into the exact output the buyer
 * has already shown intent to make. It never changes price, grant or access.
 */
export function buildCheckoutValueContext(input: CheckoutValueContextInput): CheckoutValueContext {
  const renewal = input.billing === 'annual' ? 'yearly' : 'monthly'
  const submitMessage =
    `Credits are added after payment succeeds. Renews ${renewal} at the price shown. ` +
    'Cancel anytime from Account. 7-day money-back guarantee.'

  const bridgeEligibleTier = input.tier === 'basic' || input.tier === 'pro'
  const bridgeContext =
    input.intentCampaign === TRIAL_BALANCE_BRIDGE_VERSION &&
    input.billing === 'monthly' &&
    bridgeEligibleTier

  if (!bridgeContext) {
    return {
      lineItemDescription: null,
      outputCount: null,
      submitMessage,
      variant: 'standard',
      version: CHECKOUT_VALUE_CONTEXT_VERSION,
    }
  }

  const outputCount = Math.floor(input.credits / TRIAL_BALANCE_BRIDGE_COST)
  return {
    lineItemDescription:
      `${input.credits} credits / month — up to ${outputCount} Seedance ${TRIAL_BALANCE_BRIDGE_DURATION}s films ` +
      `(${TRIAL_BALANCE_BRIDGE_COST} credits each), watermark-free`,
    outputCount,
    submitMessage,
    variant: 'trial_balance_seedance',
    version: CHECKOUT_VALUE_CONTEXT_VERSION,
  }
}
