export const CLIPPING_EARN_ANGLE_VERSION = 'clipping_earn_angle_cta_v1' as const
export const CLIPPING_EARN_ANGLE_TARGET_ID = 'clipping-earn-angle-cta-card' as const
export const CLIPPING_EARN_ANGLE_VISIBLE_RATIO = 0.6 as const
export const CLIPPING_EARN_ANGLE_DESTINATION =
  '/free-ai-shorts-generator?utm_source=clipping-page&utm_medium=seo&utm_campaign=earn-angle' as const
export const CLIPPING_EARN_ANGLE_VIEW_MARKER =
  `kineo:${CLIPPING_EARN_ANGLE_VERSION}:view` as const
export const CLIPPING_EARN_ANGLE_CLICK_MARKER =
  `kineo:${CLIPPING_EARN_ANGLE_VERSION}:click` as const

export type ClippingEarnAngleEventName =
  | 'clipping_earn_angle_cta_viewed'
  | 'clipping_earn_angle_cta_clicked'

export type ClosedEventPersistence = 'stored' | 'not_stored' | 'ambiguous'
export type ClippingEarnAngleRecordResult =
  | ClosedEventPersistence
  | 'duplicate'
  | 'unavailable'

type MarkerStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

type RecorderOptions = {
  storage?: MarkerStorage | null
  transport: (
    eventName: ClippingEarnAngleEventName,
    metadata: Record<string, unknown>,
  ) => Promise<ClosedEventPersistence>
}

export function clippingEarnAngleMetadata(): Record<string, string> {
  return {
    version: CLIPPING_EARN_ANGLE_VERSION,
    surface: 'make_money_clipping_with_ai',
    placement: 'daily_volume_cta',
    destination: 'free_ai_shorts_generator',
    intent: 'earn_angle',
  }
}

export function isClippingEarnAngleDestination(href: string | null): boolean {
  if (!href) return false
  try {
    const url = new URL(href, 'https://www.usekineo.com')
    if (url.origin !== 'https://www.usekineo.com') return false
    if (url.pathname !== '/free-ai-shorts-generator') return false
    if (url.searchParams.size !== 3) return false
    return url.searchParams.get('utm_source') === 'clipping-page'
      && url.searchParams.get('utm_medium') === 'seo'
      && url.searchParams.get('utm_campaign') === 'earn-angle'
  } catch {
    return false
  }
}

export function shouldSampleClippingEarnAngleView(input: {
  isIntersecting: boolean
  intersectionRatio: number
  documentVisible: boolean
}): boolean {
  return input.documentVisible
    && input.isIntersecting
    && input.intersectionRatio >= CLIPPING_EARN_ANGLE_VISIBLE_RATIO
}

export function createClippingEarnAngleRecorder({ storage, transport }: RecorderOptions) {
  const inFlight = new Set<string>()
  const terminal = new Set<string>()

  const wasSettled = (marker: string): boolean => {
    if (terminal.has(marker) || inFlight.has(marker)) return true
    try {
      const state = storage?.getItem(marker)
      if (state !== 'pending' && state !== 'stored') return false
      terminal.add(marker)
      return true
    } catch {
      return false
    }
  }

  const recordOnce = async (
    marker: string,
    eventName: ClippingEarnAngleEventName,
  ): Promise<ClippingEarnAngleRecordResult> => {
    if (wasSettled(marker)) return 'duplicate'

    // This experiment is measured by external session. Without a durable
    // sessionStorage claim the analytics helper cannot guarantee session_id,
    // and a remount could duplicate an anonymous row. Prefer no row to noise.
    if (!storage) return 'unavailable'

    inFlight.add(marker)
    try {
      storage.setItem(marker, 'pending')
      if (storage.getItem(marker) !== 'pending') {
        inFlight.delete(marker)
        return 'unavailable'
      }
    } catch {
      inFlight.delete(marker)
      return 'unavailable'
    }

    let outcome: ClosedEventPersistence
    try {
      outcome = await transport(eventName, clippingEarnAngleMetadata())
    } catch {
      outcome = 'ambiguous'
    } finally {
      inFlight.delete(marker)
    }

    if (outcome === 'not_stored') {
      try {
        if (storage.getItem(marker) === 'pending') storage.removeItem(marker)
      } catch {
        // No persisted claim exists when storage is unavailable.
      }
      return outcome
    }

    terminal.add(marker)
    try {
      storage.setItem(marker, outcome === 'stored' ? 'stored' : 'pending')
    } catch {
      // The in-memory terminal state remains authoritative for this page lifetime.
    }
    return outcome
  }

  return { recordOnce, wasSettled }
}
