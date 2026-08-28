import {
  RECOMMENDED_AFFILIATE_DESTINATION,
  buildAffiliateShareLink,
  getAffiliateDestination,
  type AffiliateDestinationKey,
} from '@/lib/affiliateDestinations'

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
