import type { PayPalBilling, PayPalTier } from '@/lib/paypalCatalog'

export type PayPalCheckoutIntent =
  | {
      kind: 'pack'
      pack: 'starter'
      resumed: boolean
      resumePath: string
    }
  | {
      kind: 'subscription'
      tier: PayPalTier
      billing: PayPalBilling
      resumed: boolean
      resumePath: string
    }

const PAYPAL_TIERS = new Set<PayPalTier>(['starter', 'basic', 'pro'])

/**
 * Keep only the commercial fields the PayPal route actually understands.
 * The returned path is safe to pass through the existing same-origin auth
 * redirect contract; arbitrary query parameters never cross the login hop.
 */
export function resolvePaypalCheckoutIntent(
  params: Pick<URLSearchParams, 'get'>
): PayPalCheckoutIntent | null {
  const resumed = params.get('resumed') === '1'

  if (params.get('pack') === 'starter') {
    return {
      kind: 'pack',
      pack: 'starter',
      resumed,
      resumePath: '/api/paypal/checkout?pack=starter&resumed=1',
    }
  }

  const rawTier = params.get('tier')
  if (!PAYPAL_TIERS.has(rawTier as PayPalTier)) return null

  const tier = rawTier as PayPalTier
  const billing: PayPalBilling = params.get('billing') === 'annual' ? 'annual' : 'monthly'
  return {
    kind: 'subscription',
    tier,
    billing,
    resumed,
    resumePath: `/api/paypal/checkout?tier=${tier}&billing=${billing}&resumed=1`,
  }
}

export function paypalCheckoutLoginPath(intent: PayPalCheckoutIntent): string {
  const params = new URLSearchParams({
    reason: 'checkout',
    redirect: intent.resumePath,
  })
  return `/login?${params.toString()}`
}
