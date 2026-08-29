export const PRODUCT_SURFACES = ['images', 'audio', 'fast', 'seedance', 'h3'] as const

export type ProductSurface = (typeof PRODUCT_SURFACES)[number]

export const PRODUCT_SURFACE_DESTINATIONS: Record<ProductSurface, string> = {
  images: '/images',
  audio: '/audio',
  fast: '/studio?engine=fast',
  seedance: '/studio?engine=seedance',
  h3: '/studio?engine=h3',
}

function boundedToken(value: string, fallback: string): string {
  const clean = value.trim()
  return /^[A-Za-z0-9._~-]{1,100}$/.test(clean) ? clean : fallback
}

/**
 * Preserve a public product promise through signup without auto-submitting
 * work. The destination is a closed map; arbitrary redirect URLs never enter
 * the auth flow.
 */
export function buildProductSurfaceSignupHref(input: {
  surface: ProductSurface
  campaign: string
  utmSource: string
}): string {
  const campaign = boundedToken(input.campaign, 'organic_product_surface')
  const destination = new URL(PRODUCT_SURFACE_DESTINATIONS[input.surface], 'https://kineo.local')
  destination.searchParams.set('intent_campaign', campaign)

  const signup = new URLSearchParams({
    utm_source: boundedToken(input.utmSource, 'seo'),
    utm_medium: 'organic',
    utm_campaign: campaign,
    intent_campaign: campaign,
    redirect: `${destination.pathname}${destination.search}`,
  })
  return `/signup?${signup.toString()}`
}

