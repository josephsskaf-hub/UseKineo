export const AGENCY_CHECKOUT_RETURN_VARIANT = 'agency_checkout_return_v1' as const

const AGENCY_PACK_PATTERN = /^bulk(?:10|20|30|50)$/

export interface AgencyCheckoutReturn {
  state: 'cancelled'
  packId: string
}

export function isAgencyCheckoutPackId(value: string | null | undefined): boolean {
  return AGENCY_PACK_PATTERN.test((value ?? '').trim())
}

/** Build the Stripe cancel URL from a server-owned origin and allowlisted SKU. */
export function buildAgencyCheckoutCancelUrl(origin: string, packId: string): string {
  if (!isAgencyCheckoutPackId(packId)) throw new Error('invalid_agency_checkout_pack')
  const url = new URL('/ai-shorts-for-agencies', origin)
  url.searchParams.set('checkout', 'cancelled')
  url.searchParams.set('pack', packId)
  url.hash = 'agency-pack-heading'
  return url.toString()
}

/** Read only the two public query values this recovery surface owns. */
export function readAgencyCheckoutReturn(search: string): AgencyCheckoutReturn | null {
  const params = new URLSearchParams(search)
  if (params.get('checkout') !== 'cancelled') return null
  const packId = params.get('pack')
  if (!isAgencyCheckoutPackId(packId)) return null
  return { state: 'cancelled', packId: packId! }
}

export function agencyCheckoutResumeHref(packId: string): string {
  if (!isAgencyCheckoutPackId(packId)) return '/ai-shorts-for-agencies#agency-pack-heading'
  return `/api/stripe/checkout?pack=${packId}`
}
