import {
  RECOMMENDED_AFFILIATE_DESTINATION,
  buildAffiliateShareLink,
  getAffiliateDestination,
  type AffiliateDestinationKey,
} from '@/lib/affiliateDestinations'

export const AFFILIATE_FIRST_CLICK_NUDGE_VERSION = 'affiliate_first_click_reach_v2' as const
export const AFFILIATE_FIRST_CLICK_VIEW_SESSION_KEY =
  'kineo_affiliate_first_click_nudge_viewed_v2' as const

export const AFFILIATE_FIRST_CLICK_SURFACES = [
  '/studio',
  '/studio/create',
  '/generate',
  '/history',
] as const

const AFFILIATE_FIRST_CLICK_SURFACE_SET = new Set<string>(AFFILIATE_FIRST_CLICK_SURFACES)

export function isAffiliateFirstClickSurface(pathname: string): boolean {
  return AFFILIATE_FIRST_CLICK_SURFACE_SET.has(pathname)
}

export interface AffiliateFirstClickPayload {
  isAffiliate?: boolean
  affiliate?: {
    status?: string
    coupon_code?: string | null
  }
  link?: string
  stats?: {
    clicks?: number
  }
}

export interface AffiliateFirstClickOffer {
  caption: string
  destination: AffiliateDestinationKey
}

export function buildAffiliateFirstClickOffer(
  payload: AffiliateFirstClickPayload | null,
): AffiliateFirstClickOffer | null {
  if (!payload?.isAffiliate || payload.affiliate?.status?.toLowerCase() !== 'active') return null
  if (payload.stats?.clicks !== 0) return null

  const destination = getAffiliateDestination(RECOMMENDED_AFFILIATE_DESTINATION)
  const link = buildAffiliateShareLink(payload.link ?? '', RECOMMENDED_AFFILIATE_DESTINATION)
  if (!destination || !link) return null

  const couponLine = payload.affiliate.coupon_code
    ? ` Use code ${payload.affiliate.coupon_code} for 20% off the first month.`
    : ''

  return {
    caption: `${destination.sharePitch} ${link}${couponLine}`.trim(),
    destination: RECOMMENDED_AFFILIATE_DESTINATION,
  }
}
