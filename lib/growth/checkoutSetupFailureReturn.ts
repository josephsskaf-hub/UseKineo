import { readCheckoutPasswordRecoveryContext } from '@/lib/growth/checkoutPasswordRecovery'

export const CHECKOUT_SETUP_FAILURE_RETURN_VERSION = 'checkout_setup_failure_return_v1' as const
export const CHECKOUT_SETUP_FAILURE_MESSAGE = 'We could not open secure checkout. Your selection is saved.' as const

const TOPUP_IDS = new Set(['topup40', 'topup100', 'topup120', 'topup300'])
const BULK_IDS = new Set(['bulk10', 'bulk20', 'bulk30', 'bulk50'])

export type CheckoutSetupFailureReturnContext = {
  version: typeof CHECKOUT_SETUP_FAILURE_RETURN_VERSION
  destination: string
  product_kind: 'subscription' | 'one_time'
  selection: string
  billing: 'monthly' | 'annual' | null
  intent_campaign: string | null
}

function normalizePack(rawPack: string): string {
  if (TOPUP_IDS.has(rawPack) || BULK_IDS.has(rawPack)) return rawPack
  if (rawPack === 'autopilot_pilot' || rawPack === 'starter290') return rawPack
  // The Stripe route intentionally treats every other non-empty pack value as
  // the ordinary Starter Pack. Reflect what the server will sell, not the raw
  // untrusted query value.
  return 'starter'
}

function normalizeTier(rawTier: string | null): string {
  if (rawTier === 'pro' || rawTier === 'starter' || rawTier === 'autopilot') return rawTier
  return 'basic'
}

/**
 * Recover only the exact Stripe checkout path already accepted by the auth
 * handoff. The raw destination is navigation state only and never telemetry.
 */
export function readCheckoutSetupFailureContext(
  rawDestination: string | null | undefined,
): CheckoutSetupFailureReturnContext | null {
  const checkout = readCheckoutPasswordRecoveryContext(rawDestination)
  if (!checkout || checkout.provider !== 'stripe') return null

  const parsed = new URL(checkout.destination, 'https://kineo.local')
  const rawPack = parsed.searchParams.get('pack')
  if (rawPack) {
    return {
      version: CHECKOUT_SETUP_FAILURE_RETURN_VERSION,
      destination: checkout.destination,
      product_kind: 'one_time',
      selection: normalizePack(rawPack),
      billing: null,
      intent_campaign: checkout.campaign,
    }
  }

  const selection = normalizeTier(parsed.searchParams.get('tier'))
  return {
    version: CHECKOUT_SETUP_FAILURE_RETURN_VERSION,
    destination: checkout.destination,
    product_kind: 'subscription',
    selection,
    billing: selection === 'autopilot'
      ? 'monthly'
      : parsed.searchParams.get('billing') === 'annual' ? 'annual' : 'monthly',
    intent_campaign: checkout.campaign,
  }
}

export function buildCheckoutSetupFailureReturnHref(
  rawDestination: string | null | undefined,
): string {
  const context = readCheckoutSetupFailureContext(rawDestination)
  const params = new URLSearchParams({ checkout_error: CHECKOUT_SETUP_FAILURE_MESSAGE })
  if (context) {
    params.set('checkout_setup_failure_version', context.version)
    params.set('checkout_retry', context.destination)
  }
  return `/pricing?${params.toString()}`
}

export function readCheckoutSetupFailureFromSearch(
  rawSearch: string | null | undefined,
): CheckoutSetupFailureReturnContext | null {
  const params = new URLSearchParams(rawSearch ?? '')
  if (params.get('checkout_setup_failure_version') !== CHECKOUT_SETUP_FAILURE_RETURN_VERSION) return null
  return readCheckoutSetupFailureContext(params.get('checkout_retry'))
}

export function checkoutSetupFailureTelemetry(
  context: CheckoutSetupFailureReturnContext,
): Record<string, string | null> {
  return {
    version: context.version,
    product_kind: context.product_kind,
    selection: context.selection,
    billing: context.billing,
    intent_campaign: context.intent_campaign,
  }
}

export function checkoutSetupFailureStorageKey(
  context: CheckoutSetupFailureReturnContext,
): string {
  return [
    'kineo',
    context.version,
    context.product_kind,
    context.selection,
    context.billing ?? 'one_time',
    context.intent_campaign ?? 'direct',
  ].join(':')
}
