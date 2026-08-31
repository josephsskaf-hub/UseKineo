export const PRICING_BUSINESS_PATH_VERSION = 'pricing_business_path_visibility_v1'
export const PRICING_BUSINESS_PATH_TARGET_ID = 'pricing-business-path'
export const PRICING_BUSINESS_PATH_DESTINATION = '/ai-shorts-for-agencies?entry=pricing#agency-pack-heading'

export const PRICING_BUSINESS_PATH_VIEW_MARKER =
  `kineo:pricing-business-path:viewed:${PRICING_BUSINESS_PATH_VERSION}`
export const PRICING_BUSINESS_PATH_CLICK_MARKER =
  `kineo:pricing-business-path:clicked:${PRICING_BUSINESS_PATH_VERSION}`

export function pricingBusinessPathMetadata() {
  return {
    version: PRICING_BUSINESS_PATH_VERSION,
    surface: 'pricing',
    entry: 'pricing',
    destination: 'agency_packs',
    actor_unit: 'authenticated_user',
  } as const
}

export function isPricingBusinessPathDestination(href: string | null | undefined): boolean {
  return href === PRICING_BUSINESS_PATH_DESTINATION
}
