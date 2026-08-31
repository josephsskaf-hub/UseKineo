// Affiliate deep links are deliberately an allowlist, not a `redirect=` URL.
// The `/a/[code]` route owns the redirect and may only send traffic to these
// first-party acquisition surfaces. This keeps old `/a/CODE` links working
// while giving partners a useful destination instead of the generic homepage.

export const AFFILIATE_DESTINATIONS = [
  {
    key: 'script',
    label: 'Free script generator',
    audience: 'People who have a topic but not a script',
    path: '/free-script-generator',
    campaign: 'affiliate_script',
    description: 'Best for people who already have a topic and want a hook-to-payoff draft.',
    sharePitch: 'Try this free AI script generator for Shorts — it can turn one topic into a hook, facts and payoff, no signup:',
    spokenPitch: 'If you have a Shorts idea but no script, Kineo turns one topic into a hook, facts and payoff before you even create an account.',
    emailSubject: 'Free AI script generator for Shorts',
  },
  {
    key: 'video',
    label: 'Free AI Shorts generator',
    audience: 'People ready to test the full video workflow',
    path: '/free-ai-shorts-generator',
    campaign: 'affiliate_video',
    description: 'Best for people who want to see the topic-to-video workflow and start a free Fast test.',
    sharePitch: 'Turn one idea into a scripted, voiced and captioned AI Short with Kineo — the Fast test needs no card:',
    spokenPitch: 'Kineo turns one idea into a scripted, voiced and captioned vertical video. The Fast test needs no card, so you can judge the result yourself.',
    emailSubject: 'Try Kineo’s free AI Shorts workflow',
  },
  {
    key: 'faceless',
    label: 'Faceless video workflow',
    audience: 'Faceless YouTube, TikTok and Reels creators',
    path: '/faceless-video-generator',
    campaign: 'affiliate_faceless',
    description: 'Best for creators who want narration, changing visuals and captions without filming themselves.',
    sharePitch: 'Want to make faceless Shorts without filming? Kineo combines a hook-driven script, AI voice, changing visuals and captions:',
    spokenPitch: 'For faceless Shorts, Kineo combines a hook-driven script, AI voice, changing visuals and captions without asking you to film yourself.',
    emailSubject: 'Faceless Shorts without filming',
  },
  {
    key: 'business',
    label: 'Business content planner',
    audience: 'Companies and freelancers planning weekly business content',
    path: '/business-video-content-plan',
    campaign: 'affiliate_business_plan',
    description: 'Best for businesses that need a useful weekly plan before choosing production.',
    sharePitch: 'Build a free weekly Short-form video plan for your business — offer, audience and goal in; concrete angles and evidence boundaries out:',
    spokenPitch: 'Kineo has a free business video planner that turns an offer, audience and goal into a week of Short ideas with evidence boundaries before anyone signs up.',
    emailSubject: 'Free weekly video plan for your business',
  },
] as const

export type AffiliateDestination = (typeof AFFILIATE_DESTINATIONS)[number]
export type AffiliateDestinationKey = AffiliateDestination['key']
export type AffiliateDestinationBucket = AffiliateDestinationKey | 'legacy'

// Legacy partner links (`/a/CODE`, with no `to`) predate the audience-specific
// destinations above. Keep this switch in one place so the additional choice
// step can be removed without touching attribution, cookies or modern links.
export const AFFILIATE_LEGACY_ROUTER_ENABLED = true
export const AFFILIATE_LEGACY_ROUTER_VERSION = 'affiliate_legacy_router_v1'
export const AFFILIATE_LEGACY_ROUTER_PATH = '/affiliate-start'
export const AFFILIATE_LEGACY_ROUTER_SURFACE = 'affiliate_legacy_router'

export const AFFILIATE_LEGACY_INTENTS = ['creator', 'business'] as const
export type AffiliateLegacyIntent = (typeof AFFILIATE_LEGACY_INTENTS)[number]
export type AffiliateLegacyNextStep = 'tool' | 'planner' | 'packs'

const DESTINATION_BY_KEY = new Map<AffiliateDestinationKey, AffiliateDestination>(
  AFFILIATE_DESTINATIONS.map((destination) => [destination.key, destination]),
)

export const RECOMMENDED_AFFILIATE_DESTINATION: AffiliateDestinationKey = 'script'

const LEGACY_INTENT_PRIMARY_DESTINATION: Record<AffiliateLegacyIntent, AffiliateDestinationKey> = {
  creator: RECOMMENDED_AFFILIATE_DESTINATION,
  business: 'business',
}

const LEGACY_INTENT_SECONDARY_DESTINATION: Partial<Record<AffiliateLegacyIntent, string>> = {
  business: '/ai-shorts-for-agencies',
}

export function getAffiliateLegacyIntent(value: string | null | undefined): AffiliateLegacyIntent | null {
  const normalized = (value ?? '').trim().toLowerCase()
  return AFFILIATE_LEGACY_INTENTS.find((intent) => intent === normalized) ?? null
}

export function buildAffiliateLegacyRouterUrl(origin: string): URL {
  return new URL(AFFILIATE_LEGACY_ROUTER_PATH, origin)
}

export function affiliateLegacyIntentHref(
  intentValue: string | null | undefined,
  kind: 'primary' | 'secondary' = 'primary',
): string {
  const intent = getAffiliateLegacyIntent(intentValue)
  if (!intent) return '/'
  if (kind === 'secondary') return LEGACY_INTENT_SECONDARY_DESTINATION[intent] ?? '/'
  return DESTINATION_BY_KEY.get(LEGACY_INTENT_PRIMARY_DESTINATION[intent])?.path ?? '/'
}

export function affiliateLegacyEventMetadata(
  intentValue?: string | null,
  nextStep?: AffiliateLegacyNextStep,
): {
  version: typeof AFFILIATE_LEGACY_ROUTER_VERSION
  surface: typeof AFFILIATE_LEGACY_ROUTER_SURFACE
  intent?: AffiliateLegacyIntent
  next_step?: AffiliateLegacyNextStep
} {
  const intent = getAffiliateLegacyIntent(intentValue)
  return {
    version: AFFILIATE_LEGACY_ROUTER_VERSION,
    surface: AFFILIATE_LEGACY_ROUTER_SURFACE,
    ...(intent ? { intent } : {}),
    ...(intent && nextStep ? { next_step: nextStep } : {}),
  }
}

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

export function affiliateDestinationBucket(
  landingPath: string | null | undefined,
): AffiliateDestinationBucket {
  if (!landingPath) return 'legacy'
  try {
    const url = new URL(landingPath, 'https://www.usekineo.com')
    const destination = getAffiliateDestination(url.searchParams.get('to'))
    return destination?.key ?? 'legacy'
  } catch {
    return 'legacy'
  }
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
