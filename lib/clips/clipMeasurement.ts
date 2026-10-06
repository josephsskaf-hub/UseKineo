// One cohort marker for catalog exposure, effect pages and accepted effect generations.
// Distinct people are counted by authenticated user_id in the report, never by event count.
export const CLIP_MEASUREMENT_ENABLED = true
export const CLIP_MEASUREMENT_VERSION = 'clips_journey_20261006_v1'
export const CLIP_CATALOG_VERSION = 'clips_guest_20261006_v1'
export const CLIP_MEASUREMENT_EVENTS = {
  impression: 'clip_surface_impression',
  gesture: 'clip_surface_first_gesture',
} as const
export type ClipOrigin = 'home' | 'effect_page' | 'clips' | 'unknown'
export type ClipOriginEvidence = 'url_marker' | 'same_site_navigation' | 'same_site_referrer' | 'current_surface' | 'unknown'
export type ClipOriginInfo = { origin: ClipOrigin; evidence: ClipOriginEvidence }
const unknownOrigin = (): ClipOriginInfo => ({ origin: 'unknown', evidence: 'unknown' })

export function clipMeasurementVersion(): Record<string, string> {
  return CLIP_MEASUREMENT_ENABLED ? { clip_measurement_version: CLIP_MEASUREMENT_VERSION } : {}
}
/** Only bounded labels travel to analytics; URLs, referrer queries, photos and prompts never do. */
export function clipOriginMetadata(raw: unknown): Record<string, string> {
  if (!CLIP_MEASUREMENT_ENABLED) return {}
  let info = unknownOrigin()
  if (raw && typeof raw === 'object') {
    const { origin, evidence } = raw as Record<string, unknown>
    if (typeof origin === 'string' && typeof evidence === 'string' && ['home', 'effect_page', 'clips'].includes(origin)
      && ['url_marker', 'same_site_navigation', 'same_site_referrer', 'current_surface'].includes(evidence)
      && !(origin === 'home' && evidence === 'current_surface')) {
      info = { origin: origin as ClipOrigin, evidence: evidence as ClipOriginEvidence }
    }
  }
  return { clip_origin: info.origin, clip_origin_evidence: info.evidence }
}

/** Last observed entry surface, not marketing acquisition and not the home experiment cookie. */
export function clipOriginForEntry(href: string, referrer = '', previousUrls: readonly string[] = []): ClipOriginInfo {
  try {
    const current = new URL(href)
    const marked = current.searchParams.get('clip_origin')
    if (marked === 'home' || marked === 'effect_page' || marked === 'clips') return { origin: marked, evidence: 'url_marker' }
    const classify = (raw: string, evidence: ClipOriginEvidence): ClipOriginInfo => {
      try {
        const prior = new URL(raw, current)
        if (prior.origin !== current.origin) return unknownOrigin()
        if (prior.pathname === '/') return { origin: 'home', evidence }
        if (/^\/effects\/[a-z0-9-]+(?:\/[a-z]{2})?\/?$/.test(prior.pathname)) return { origin: 'effect_page', evidence }
        if (prior.pathname === '/clips' && !current.searchParams.has('effect')) return { origin: 'clips', evidence: 'current_surface' }
      } catch { /* malformed navigation is unknown */ }
      return unknownOrigin()
    }
    // A known previous entry takes precedence over a stale document.referrer in an SPA.
    if (previousUrls.length) {
      for (const raw of previousUrls.slice(0, 4)) {
        const prior = new URL(raw, current)
        if (prior.origin !== current.origin) return unknownOrigin()
        if (prior.pathname === '/signup' || prior.pathname === '/login') {
          const redirect = new URL(prior.searchParams.get('redirect') || '/', current)
          if (redirect.origin === current.origin && redirect.pathname === '/clips'
            && redirect.searchParams.get('effect') === current.searchParams.get('effect')) continue
        }
        return classify(raw, 'same_site_navigation')
      }
      return unknownOrigin()
    }
    const referred = classify(referrer, 'same_site_referrer')
    if (referred.origin !== 'unknown') return referred
    // A preset without evidence is not presumed to come from home.
    return current.searchParams.has('effect') ? unknownOrigin() : { origin: 'clips', evidence: 'current_surface' }
  } catch { return unknownOrigin() }
}

type OptionalStorage = Pick<Storage, 'getItem' | 'setItem'> | null
/** Dedupe closes only on confirmed storage. Reports still dedupe across devices by user_id. */
export function createClipMeasurementGate() {
  const pending = new Set<string>(), stored = new Set<string>()
  return async (key: string, storage: OptionalStorage, send: () => Promise<string>): Promise<boolean> => {
    try { if (storage?.getItem(key) === 'stored') return false } catch { /* storage blocked */ }
    if (pending.has(key) || stored.has(key)) return false
    pending.add(key)
    try {
      if (await send() !== 'stored') return false
      stored.add(key)
      try { storage?.setItem(key, 'stored') } catch { /* memory dedupe remains */ }
      return true
    } catch { return false } finally { pending.delete(key) }
  }
}
