import {
  AFFILIATE_DESTINATIONS,
  type AffiliateDestinationKey,
} from '@/lib/affiliateDestinations'

export const AFFILIATE_LANDING_CONTEXT_VARIANT = 'affiliate_landing_context_v1'

export type PublicSearchParams = Record<string, string | string[] | undefined>

export interface AffiliateLandingContextCopy {
  destination: AffiliateDestinationKey
  eyebrow: string
  heading: string
  body: string
  action: string
}

const COPY: Record<AffiliateDestinationKey, Omit<AffiliateLandingContextCopy, 'destination'>> = {
  script: {
    eyebrow: 'Recommended by a Kineo partner',
    heading: 'Start with the script — free, before signup.',
    body: 'Your partner sent you to the fastest way to test the idea: enter one topic and get a hook-to-payoff Short script without creating an account.',
    action: 'Try the free script tool',
  },
  video: {
    eyebrow: 'Recommended by a Kineo partner',
    heading: 'Test the complete Short workflow before you decide.',
    body: 'Your partner sent you straight to the Fast test: start with one idea and judge the scripted, voiced, captioned video yourself.',
    action: 'Try the free video workflow',
  },
  faceless: {
    eyebrow: 'Recommended by a Kineo partner',
    heading: 'See the faceless workflow your partner recommended.',
    body: 'Start with one topic. Kineo builds the script, AI voice, changing visuals and captions without asking you to film yourself.',
    action: 'Try the faceless workflow',
  },
}

function first(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? '') : (value ?? '')
}

export function affiliateLandingContext(
  searchParams: PublicSearchParams | undefined,
  destination: AffiliateDestinationKey,
): AffiliateLandingContextCopy | null {
  const canonical = AFFILIATE_DESTINATIONS.find((item) => item.key === destination)
  if (!canonical) return null

  const source = first(searchParams?.utm_source).trim().toLowerCase()
  const medium = first(searchParams?.utm_medium).trim().toLowerCase()
  const campaign = first(searchParams?.utm_campaign).trim().toLowerCase()

  if (source !== 'affiliate' || medium !== 'partner' || campaign !== canonical.campaign) {
    return null
  }

  return { destination, ...COPY[destination] }
}
