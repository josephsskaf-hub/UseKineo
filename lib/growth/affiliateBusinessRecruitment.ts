export const AFFILIATE_BUSINESS_RECRUITMENT_VERSION =
  'affiliate_business_recruitment_v1' as const

export const AFFILIATE_BUSINESS_RECRUITMENT_SURFACE = 'partners' as const
export const AFFILIATE_BUSINESS_RECRUITMENT_PLACEMENT = 'business_campaign' as const
export const AFFILIATE_BUSINESS_RECRUITMENT_AUDIENCE = 'business' as const
export const AFFILIATE_BUSINESS_RECRUITMENT_DESTINATION = 'affiliate_apply' as const
export const AFFILIATE_BUSINESS_RECRUITMENT_VISIBLE_RATIO = 0.6
export const AFFILIATE_BUSINESS_RECRUITMENT_HOST = 'www.usekineo.com' as const

export const AFFILIATE_BUSINESS_RECRUITMENT_VIEW_MARKER =
  'kineo:affiliate-business-recruitment:viewed:v1' as const

export const AFFILIATE_BUSINESS_RECRUITMENT_CLICK_MARKER =
  'kineo:affiliate-business-recruitment:clicked:v1' as const

export function affiliateBusinessRecruitmentMetadata() {
  return {
    version: AFFILIATE_BUSINESS_RECRUITMENT_VERSION,
    surface: AFFILIATE_BUSINESS_RECRUITMENT_SURFACE,
    placement: AFFILIATE_BUSINESS_RECRUITMENT_PLACEMENT,
    audience: AFFILIATE_BUSINESS_RECRUITMENT_AUDIENCE,
    destination: AFFILIATE_BUSINESS_RECRUITMENT_DESTINATION,
  } as const
}

export function isAffiliateBusinessRecruitmentMeasurementHost(hostname: unknown): boolean {
  return typeof hostname === 'string'
    && hostname.trim().toLowerCase() === AFFILIATE_BUSINESS_RECRUITMENT_HOST
}
