export const WELCOME_OFFER_FREQUENCY_VERSION = 'welcome_offer_frequency_truth_v1'
export const WELCOME_OFFER_SEEN_KEY = 'kineo_welcome20_seen'
export const WELCOME_OFFER_RESHOW_MS = 72 * 60 * 60 * 1000
export const WELCOME_OFFER_MEASUREMENT_HOST = 'www.usekineo.com'

export type WelcomeOfferSurface = 'home' | 'pricing' | 'dashboard'
export type WelcomeOfferTier = 'basic' | 'pro'

export function parseWelcomeOfferSeenAt(raw: string | null, now: number): number | null {
  if (!raw) return null
  const timestamp = Number(raw)
  if (!Number.isFinite(timestamp) || timestamp <= 0) return null
  // A small future skew still means "already shown". A far-future value is
  // malformed and must not suppress the offer forever.
  if (timestamp > now + 5 * 60 * 1000) return null
  return timestamp
}

export function shouldShowWelcomeOffer(seenAt: number | null, now: number): boolean {
  if (seenAt === null) return true
  return now - seenAt >= WELCOME_OFFER_RESHOW_MS
}

export function isWelcomeOfferMeasurementHost(hostname: unknown): boolean {
  return typeof hostname === 'string'
    && hostname.trim().toLowerCase() === WELCOME_OFFER_MEASUREMENT_HOST
}

export function welcomeOfferFrequencyMetadata(
  surface: WelcomeOfferSurface,
  tier?: WelcomeOfferTier,
): Record<string, unknown> {
  return {
    version: WELCOME_OFFER_FREQUENCY_VERSION,
    surface,
    offer: 'welcome20',
    frequency_window: '72h',
    ...(tier ? { tier } : {}),
  }
}
