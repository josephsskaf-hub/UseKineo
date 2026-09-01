import { normalizeInternalRedirect } from '@/lib/authRedirect'

export const CHECKOUT_PASSWORD_RECOVERY_VERSION = 'checkout_password_recovery_handoff_v1' as const

const CHECKOUT_PATH = /^\/api\/(stripe|paypal|mercadopago)\/checkout$/

export type CheckoutPasswordRecoveryContext = {
  version: typeof CHECKOUT_PASSWORD_RECOVERY_VERSION
  destination: string
  provider: 'stripe' | 'paypal' | 'mercadopago'
  tier: 'starter' | 'basic' | 'creator' | 'studio' | 'pro' | null
  billing: 'monthly' | 'annual' | null
  campaign: string | null
}

function boundedCategory(value: string | null): string | null {
  const clean = (value ?? '').trim()
  return /^[A-Za-z0-9._~-]{1,100}$/.test(clean) ? clean : null
}

/**
 * Accept only the checkout destinations already accepted by authRedirect.
 * A generic same-origin page is deliberately not enough: this handoff exists
 * only for a buyer who was interrupted while attempting a purchase.
 */
export function readCheckoutPasswordRecoveryContext(
  rawDestination: string | null | undefined,
): CheckoutPasswordRecoveryContext | null {
  const destination = normalizeInternalRedirect(rawDestination)
  if (!destination) return null

  const parsed = new URL(destination, 'https://kineo.local')
  const match = parsed.pathname.match(CHECKOUT_PATH)
  if (!match) return null

  const tierValue = parsed.searchParams.get('tier')
  const billingValue = parsed.searchParams.get('billing')

  return {
    version: CHECKOUT_PASSWORD_RECOVERY_VERSION,
    destination,
    provider: match[1] as CheckoutPasswordRecoveryContext['provider'],
    tier: tierValue && /^(?:starter|basic|creator|studio|pro)$/.test(tierValue)
      ? tierValue as CheckoutPasswordRecoveryContext['tier']
      : null,
    billing: billingValue === 'monthly' || billingValue === 'annual' ? billingValue : null,
    campaign: boundedCategory(parsed.searchParams.get('intent_campaign')),
  }
}

export function readCheckoutPasswordRecoveryFromSearch(
  rawSearch: string | null | undefined,
): CheckoutPasswordRecoveryContext | null {
  const params = new URLSearchParams(rawSearch ?? '')
  if (params.get('reason') !== 'checkout') return null
  return readCheckoutPasswordRecoveryContext(params.get('redirect'))
}

/** Build an app-relative handoff without ever serializing an external URL. */
export function buildCheckoutPasswordRecoveryHref(
  pathname: '/forgot-password' | '/reset-password' | '/login',
  context: CheckoutPasswordRecoveryContext | null,
): string {
  if (!context) return pathname
  const params = new URLSearchParams({
    reason: 'checkout',
    redirect: context.destination,
  })
  return `${pathname}?${params.toString()}`
}

export function checkoutPasswordRecoveryTelemetry(
  context: CheckoutPasswordRecoveryContext,
): Record<string, string | null> {
  return {
    version: context.version,
    provider: context.provider,
    tier: context.tier,
    billing: context.billing,
    intent_campaign: context.campaign,
  }
}
