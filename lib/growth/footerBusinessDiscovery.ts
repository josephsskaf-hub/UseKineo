export const FOOTER_BUSINESS_DISCOVERY_VERSION = 'footer_business_discovery_v1'
export const FOOTER_BUSINESS_VISIBLE_RATIO = 0.6

export const FOOTER_BUSINESS_DESTINATIONS = {
  '/youtube-automation-case-study': 'autopilot_proof',
  '/ai-shorts-for-agencies': 'agency_packs',
  '/business-video-content-plan': 'business_plan',
  '/client-video-brief-generator': 'client_brief',
} as const

export type FooterBusinessDestination =
  (typeof FOOTER_BUSINESS_DESTINATIONS)[keyof typeof FOOTER_BUSINESS_DESTINATIONS]

export type FooterBusinessEventName =
  | 'footer_business_path_viewed'
  | 'footer_business_path_clicked'

export function footerBusinessDestinationForHref(
  href: string | null | undefined,
): FooterBusinessDestination | null {
  if (!href) return null
  return FOOTER_BUSINESS_DESTINATIONS[
    href as keyof typeof FOOTER_BUSINESS_DESTINATIONS
  ] ?? null
}

export function footerBusinessDiscoveryMetadata(destination: FooterBusinessDestination) {
  return {
    version: FOOTER_BUSINESS_DISCOVERY_VERSION,
    surface: 'global_footer',
    destination,
    measurement_unit: 'event_session_destination',
  } as const
}

export function footerBusinessEventMarker(
  eventName: FooterBusinessEventName,
  destination: FooterBusinessDestination,
): string {
  return `kineo:footer-business:${FOOTER_BUSINESS_DISCOVERY_VERSION}:${eventName}:${destination}`
}

type RecorderOptions = {
  readMarker: (marker: string) => boolean
  writeMarker: (marker: string) => void
  send: (
    eventName: FooterBusinessEventName,
    metadata: ReturnType<typeof footerBusinessDiscoveryMetadata>,
  ) => Promise<boolean>
}

export function createFooterBusinessEventRecorder(options: RecorderOptions) {
  const inFlight = new Set<string>()
  const recorded = new Set<string>()

  function wasRecorded(
    eventName: FooterBusinessEventName,
    destination: FooterBusinessDestination,
  ): boolean {
    const marker = footerBusinessEventMarker(eventName, destination)
    if (recorded.has(marker)) return true
    try {
      if (!options.readMarker(marker)) return false
      recorded.add(marker)
      return true
    } catch {
      return false
    }
  }

  async function record(
    eventName: FooterBusinessEventName,
    destination: FooterBusinessDestination,
  ): Promise<boolean> {
    const marker = footerBusinessEventMarker(eventName, destination)
    if (wasRecorded(eventName, destination) || inFlight.has(marker)) return false

    inFlight.add(marker)
    let stored = false
    try {
      stored = await options.send(
        eventName,
        footerBusinessDiscoveryMetadata(destination),
      )
    } catch {
      // Analytics is failure-isolated: a tracking outage never affects the link.
      stored = false
    } finally {
      inFlight.delete(marker)
    }

    if (!stored) return false
    recorded.add(marker)
    try {
      options.writeMarker(marker)
    } catch {
      // A successful event remains latched in memory for this page lifetime.
    }
    return true
  }

  return { record, wasRecorded }
}
