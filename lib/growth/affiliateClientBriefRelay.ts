import { buildAffiliateRouteShareLink } from '@/lib/affiliateDestinations'

export const AFFILIATE_CLIENT_BRIEF_RELAY_VERSION = 'affiliate_client_brief_relay_v1' as const

export interface AffiliateClientBriefRelayPayload {
  eligible?: unknown
  affiliate?: { status?: unknown }
  link?: unknown
}

export type AffiliateClientBriefRelayLoader =
  () => Promise<AffiliateClientBriefRelayPayload | null>

export function affiliateClientBriefRelayHref(
  payload: AffiliateClientBriefRelayPayload | null,
): string | null {
  if (payload?.eligible !== true) return null
  if (String(payload.affiliate?.status ?? '').toLowerCase() !== 'active') return null
  if (typeof payload.link !== 'string') return null
  return buildAffiliateRouteShareLink(payload.link, 'client_brief') || null
}

export function createAffiliateClientBriefRelayResolver(
  load: AffiliateClientBriefRelayLoader,
) {
  let pending: Promise<string | null> | null = null
  let resolvedHref: string | null = null
  return {
    preload(): Promise<string | null> {
      if (!pending) {
        pending = Promise.resolve()
          .then(load)
          .then(affiliateClientBriefRelayHref)
          .then((href) => {
            resolvedHref = href
            return href
          })
          .catch(() => null)
      }
      return pending
    },
    current(): string | null {
      return resolvedHref
    },
  }
}

export function affiliateClientBriefRelayCopiedMetadata() {
  return {
    version: AFFILIATE_CLIENT_BRIEF_RELAY_VERSION,
    surface: 'client_video_brief_generator',
    distribution_mode: 'affiliate_attributed',
  } as const
}
