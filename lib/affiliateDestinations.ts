// Affiliate deep links are deliberately an allowlist, not a `redirect=` URL.
// The `/a/[code]` route owns the redirect and may only send traffic to these
// first-party acquisition surfaces. This keeps old `/a/CODE` links working
// while giving partners a useful destination instead of the generic homepage.

export const AFFILIATE_DESTINATIONS = [
  {
    key: 'script',
    label: 'Free script generator',
    path: '/free-script-generator',
    campaign: 'affiliate_script',
    description: 'Best for people who already have a topic and want a hook-to-payoff draft.',
    sharePitch: 'Try this free AI script generator for Shorts — it can turn one topic into a hook, facts and payoff, no signup:',
    emailSubject: 'Free AI script generator for Shorts',
  },
] as const

export type AffiliateDestination = (typeof AFFILIATE_DESTINATIONS)[number]
export type AffiliateDestinationKey = AffiliateDestination['key']

const DESTINATION_BY_KEY = new Map<AffiliateDestinationKey, AffiliateDestination>(
  AFFILIATE_DESTINATIONS.map((destination) => [destination.key, destination]),
)

export const RECOMMENDED_AFFILIATE_DESTINATION: AffiliateDestinationKey = 'script'

export function getAffiliateDestination(value: string | null | undefined): AffiliateDestination | null {
  const key = (value ?? '').trim().toLowerCase() as AffiliateDestinationKey
  return DESTINATION_BY_KEY.get(key) ?? null
}

export function buildAffiliateDestinationUrl(origin: string, key: AffiliateDestinationKey): URL {
  const destination = DESTINATION_BY_KEY.get(key)
  if (!destination) return new URL('/', origin)
  const url = new URL(destination.path, origin)
  url.searchParams.set('utm_source', 'affiliate')
  url.searchParams.set('utm_medium', 'partner')
  url.searchParams.set('utm_campaign', destination.campaign)
  return url
}

export function buildAffiliateShareLink(baseLink: string, key: AffiliateDestinationKey): string {
  if (!baseLink) return ''
  try {
    const destination = getAffiliateDestination(key)
    const source = new URL(baseLink)
    const match = /^\/a\/([A-HJ-NP-Z2-9]{8})\/?$/i.exec(source.pathname)
    if (!match) return ''
    // Partner links are public acquisition assets, so always copy the
    // production canonical host even when the dashboard is opened via a
    // preview/legacy host. This also prevents compromised API data from
    // turning the Copy button into an arbitrary-link distributor.
    const url = new URL(`/a/${match[1].toUpperCase()}`, 'https://www.usekineo.com')
    if (destination) url.searchParams.set('to', destination.key)
    return url.toString()
  } catch {
    return ''
  }
}

export function affiliateClickLandingPath(code: string, destination: AffiliateDestination | null): string {
  return destination ? `/a/${code}?to=${destination.key}` : `/a/${code}`
}

// Social unfurlers request partner links to build a preview, but no human has
// visited and their cookie jar will never reach signup. Excluding these known
// agents keeps the dashboard's raw “link visits” count from being inflated and
// avoids minting unusable financial proof rows. Unknown agents remain visible;
// this is a conservative allowlist of well-known preview/crawler signatures.
export function isAffiliatePreviewBot(userAgent: string | null | undefined): boolean {
  return /(facebookexternalhit|facebot|twitterbot|linkedinbot|slackbot|discordbot|whatsapp|telegrambot|googlebot|bingbot)/i
    .test(userAgent ?? '')
}
