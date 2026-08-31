import { AUTOPILOT_PILOT_DAYS } from '@/lib/autopilot/config'

export const AUTOPILOT_CHECKOUT_GUIDANCE_ENABLED = true as const
export const AUTOPILOT_CHECKOUT_GUIDANCE_VERSION = 'autopilot_checkout_guidance_v1' as const

export type AutopilotCheckoutOfferKind = 'monthly' | 'pilot'

export type AutopilotCheckoutGuidance = {
  offerKind: AutopilotCheckoutOfferKind
  submitMessage: string
  version: typeof AUTOPILOT_CHECKOUT_GUIDANCE_VERSION
}

/**
 * Explains the immediate setup handoff inside hosted Checkout without changing
 * price, SKU, entitlement or fulfillment. One constant rolls the experiment
 * back to the pre-existing Checkout copy for both Autopilot offers.
 */
export function buildAutopilotCheckoutGuidance(
  offerKind: AutopilotCheckoutOfferKind | null,
): AutopilotCheckoutGuidance | null {
  if (
    !AUTOPILOT_CHECKOUT_GUIDANCE_ENABLED ||
    (offerKind !== 'monthly' && offerKind !== 'pilot')
  ) return null

  const setup =
    'After payment, connect your YouTube channel and choose its topic and posting time in Autopilot. ' +
    'Publishing starts only after setup.'

  return {
    offerKind,
    submitMessage: offerKind === 'monthly'
      ? `${setup} Renews monthly at the price shown; cancel from Account.`
      : `${setup} One-time payment; no renewal. Pilot ends after ${AUTOPILOT_PILOT_DAYS} days.`,
    version: AUTOPILOT_CHECKOUT_GUIDANCE_VERSION,
  }
}
