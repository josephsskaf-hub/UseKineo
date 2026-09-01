export const ENTERPRISE_ALTERNATIVE_BUSINESS_PATH_VERSION =
  'enterprise_alternative_business_path_v1' as const

export const ENTERPRISE_ALTERNATIVE_BUSINESS_PATH_VISIBLE_RATIO = 0.5

export const ENTERPRISE_ALTERNATIVE_COMPETITORS = ['heygen'] as const

export type EnterpriseAlternativeCompetitor =
  (typeof ENTERPRISE_ALTERNATIVE_COMPETITORS)[number]

const COMPETITOR_SET = new Set<string>(ENTERPRISE_ALTERNATIVE_COMPETITORS)

export function isEnterpriseAlternativeCompetitor(
  value: string | null | undefined,
): value is EnterpriseAlternativeCompetitor {
  return typeof value === 'string' && COMPETITOR_SET.has(value)
}

export function enterpriseAlternativeEntry(
  _competitor: EnterpriseAlternativeCompetitor,
): 'heygen_alternative' {
  return 'heygen_alternative'
}

export function enterpriseAlternativeBusinessPathMetadata(
  competitor: EnterpriseAlternativeCompetitor,
) {
  return {
    version: ENTERPRISE_ALTERNATIVE_BUSINESS_PATH_VERSION,
    competitor,
    intent: 'business',
    placement: 'after_fit_decision',
    destination: 'agency_packs',
  } as const
}

export function enterpriseAlternativeBusinessPathMarker(
  action: 'viewed' | 'clicked',
  competitor: EnterpriseAlternativeCompetitor,
): string {
  return `kineo:${ENTERPRISE_ALTERNATIVE_BUSINESS_PATH_VERSION}:${competitor}:${action}`
}

export function enterpriseAlternativeBusinessPathSettlement(
  stored: boolean,
): 'recorded' | 'retryable' {
  return stored ? 'recorded' : 'retryable'
}

export type EnterpriseAlternativeBusinessPathEventName =
  | 'enterprise_alternative_business_path_viewed'
  | 'enterprise_alternative_business_path_clicked'

export function createEnterpriseAlternativeBusinessEventRecorder(deps: {
  read: (marker: string) => string | null
  write: (marker: string, value: string) => void
  send: (
    eventName: EnterpriseAlternativeBusinessPathEventName,
    metadata: ReturnType<typeof enterpriseAlternativeBusinessPathMetadata>,
  ) => Promise<boolean>
}) {
  const inFlight = new Set<string>()
  const recorded = new Set<string>()

  function wasRecorded(marker: string): boolean {
    if (recorded.has(marker)) return true
    try {
      if (deps.read(marker) === '1') {
        recorded.add(marker)
        return true
      }
    } catch {
      // Privacy modes can deny storage. The in-memory latch still works.
    }
    return false
  }

  async function record(
    marker: string,
    eventName: EnterpriseAlternativeBusinessPathEventName,
    competitor: EnterpriseAlternativeCompetitor,
  ): Promise<boolean> {
    if (wasRecorded(marker) || inFlight.has(marker)) return false
    inFlight.add(marker)
    let stored = false
    try {
      stored = await deps.send(
        eventName,
        enterpriseAlternativeBusinessPathMetadata(competitor),
      )
    } catch {
      return false
    } finally {
      inFlight.delete(marker)
    }
    if (enterpriseAlternativeBusinessPathSettlement(stored) === 'retryable') return false

    recorded.add(marker)
    try {
      deps.write(marker, '1')
    } catch {
      // Successful delivery remains latched in memory for this page lifetime.
    }
    return true
  }

  return { record, wasRecorded }
}
