import { readCheckoutPasswordRecoveryContext } from '@/lib/growth/checkoutPasswordRecovery'

export const CHECKOUT_OAUTH_FAILURE_HANDOFF_VERSION = 'checkout_oauth_failure_handoff_v1' as const

export type CheckoutOAuthFailureTelemetry = {
  version: typeof CHECKOUT_OAUTH_FAILURE_HANDOFF_VERSION
  is_checkout_destination: boolean
  checkout_provider: 'stripe' | 'paypal' | 'mercadopago' | null
  tier: 'starter' | 'basic' | 'creator' | 'studio' | 'pro' | null
  billing: 'monthly' | 'annual' | null
  intent_campaign: string | null
}

export type CheckoutOAuthFailureHandoff = {
  loginPath: string
  telemetry: CheckoutOAuthFailureTelemetry
}

/**
 * Preserve a buyer's exact, same-origin checkout after an OAuth callback fails.
 * Any non-checkout, malformed or external destination keeps the legacy login
 * fallback. The raw destination is used only for navigation and never enters
 * telemetry.
 */
export function buildCheckoutOAuthFailureHandoff(
  rawNext: string | null | undefined,
): CheckoutOAuthFailureHandoff {
  const context = readCheckoutPasswordRecoveryContext(rawNext)
  const telemetry: CheckoutOAuthFailureTelemetry = {
    version: CHECKOUT_OAUTH_FAILURE_HANDOFF_VERSION,
    is_checkout_destination: Boolean(context),
    checkout_provider: context?.provider ?? null,
    tier: context?.tier ?? null,
    billing: context?.billing ?? null,
    intent_campaign: context?.campaign ?? null,
  }

  if (!context) {
    return {
      loginPath: '/login?error=oauth_failed',
      telemetry,
    }
  }

  const params = new URLSearchParams({
    error: 'oauth_failed',
    reason: 'checkout',
    redirect: context.destination,
  })

  return {
    loginPath: `/login?${params.toString()}`,
    telemetry,
  }
}
