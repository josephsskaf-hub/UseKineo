import { normalizeInternalRedirect } from '@/lib/authRedirect'
import {
  BULK_PACKS,
  formatCheckoutMoney,
  isBulkPackId,
  type BulkPackId,
} from '@/lib/checkoutPricing'

export const BULK_CHECKOUT_AUTH_CONTEXT_VERSION = 'bulk_checkout_auth_context_v1'

export interface BulkCheckoutAuthContext {
  version: typeof BULK_CHECKOUT_AUTH_CONTEXT_VERSION
  offerKind: 'bulk_pack'
  packId: BulkPackId
  videos: number
  priceLabel: string
}

/**
 * Recover only a canonical B2B pack from a same-origin checkout destination.
 * Invalid, foreign or non-bulk destinations deliberately fall back to the
 * existing generic checkout copy instead of inventing commercial context.
 */
export function readBulkCheckoutAuthContext(
  destination: string | null | undefined
): BulkCheckoutAuthContext | null {
  const internal = normalizeInternalRedirect(destination)
  if (!internal) return null

  const parsed = new URL(internal, 'https://kineo.local')
  if (parsed.pathname !== '/api/stripe/checkout') return null

  const packId = parsed.searchParams.get('pack')
  if (!isBulkPackId(packId)) return null

  const pack = BULK_PACKS[packId]
  return {
    version: BULK_CHECKOUT_AUTH_CONTEXT_VERSION,
    offerKind: 'bulk_pack',
    packId,
    videos: pack.videos,
    priceLabel: formatCheckoutMoney('usd', pack.usdMinor),
  }
}
