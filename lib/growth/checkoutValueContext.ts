import type { CheckoutPlanTier } from '@/lib/checkoutPricing'
import { creditCostForDuration } from '@/lib/credits/engineCost'
import {
  TRIAL_BALANCE_BRIDGE_COST,
  TRIAL_BALANCE_BRIDGE_DURATION,
  TRIAL_BALANCE_BRIDGE_VERSION,
} from '@/lib/growth/trialBalanceBridge'

export const CHECKOUT_VALUE_CONTEXT_VERSION = 'checkout_value_context_v2' as const

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
  variant: 'standard_result_count' | 'trial_balance_seedance'
  version: typeof CHECKOUT_VALUE_CONTEXT_VERSION
}

function resultCountDescription(input: CheckoutValueContextInput): {
  lineItemDescription: string | null
  outputCount: number | null
} {
  if (input.billing !== 'monthly') return { lineItemDescription: null, outputCount: null }

  if (input.tier === 'starter') {
    const fastCost = creditCostForDuration('fast', true, 60)
    const outputCount = Math.floor(input.credits / fastCost)
    return {
      lineItemDescription:
        `${input.credits} credits / month — up to ${outputCount} ready-to-post Fast Shorts ` +
        'with AI voiceover, captions and no watermark',
      outputCount,
    }
  }

  if (input.tier === 'basic') {
    const seedanceCost = creditCostForDuration('cinematic_ai', true, 60)
    const outputCount = Math.floor(input.credits / seedanceCost)
    return {
      lineItemDescription:
        `${input.credits} credits / month — up to ${outputCount} Seedance 60s AI films ` +
        'with voiceover, captions and no watermark',
      outputCount,
    }
  }

  if (input.tier === 'pro') {
    const klingCost = creditCostForDuration('cinematic_hollywood', true, 60)
    const fastCost = creditCostForDuration('fast', true, 60)
    const klingFilms = Math.floor(input.credits / klingCost)
    const fastRemainder = Math.floor((input.credits - klingFilms * klingCost) / fastCost)
    return {
      lineItemDescription:
        `${input.credits} credits / month — ${klingFilms} Kling 3 60s film` +
        `${klingFilms === 1 ? '' : 's'} plus up to ${fastRemainder} Fast Shorts, priority queue`,
      outputCount: klingFilms,
    }
  }

  return { lineItemDescription: null, outputCount: null }
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
    const standard = resultCountDescription(input)
    return {
      lineItemDescription: standard.lineItemDescription,
      outputCount: standard.outputCount,
      submitMessage,
      variant: 'standard_result_count',
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
