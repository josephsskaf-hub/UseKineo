export const EXIT_INTENT_VARIANT_PROBE_VERSION = 'exit_intent_variant_collision_probe_v1'

export const EXIT_INTENT_SESSION_VARIANT_KEY = 'kineo_exit_offer_shown_variant'

export type ExitIntentVariant = 'free' | 'deal'
export type PriorExitIntentVariant = ExitIntentVariant | 'unknown'

export function normalizePriorExitIntentVariant(value: unknown): PriorExitIntentVariant {
  return value === 'free' || value === 'deal' ? value : 'unknown'
}

export function exitIntentVariantMetadata(variant: ExitIntentVariant) {
  return {
    version: EXIT_INTENT_VARIANT_PROBE_VERSION,
    variant,
  } as const
}

export function exitIntentSuppressionMetadata(
  requestedVariant: ExitIntentVariant,
  priorVariant: PriorExitIntentVariant,
) {
  return {
    version: EXIT_INTENT_VARIANT_PROBE_VERSION,
    requested_variant: requestedVariant,
    prior_variant: priorVariant,
    reason: 'session_key_seen',
  } as const
}

export function exitIntentSuppressionMarker(requestedVariant: ExitIntentVariant): string {
  return `kineo:${EXIT_INTENT_VARIANT_PROBE_VERSION}:suppressed:${requestedVariant}`
}

export function exitIntentProbeSettlement(stored: boolean): 'recorded' | 'retryable' {
  return stored ? 'recorded' : 'retryable'
}

export type ExitIntentProbeStorage = {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

export type ExitIntentSuppressionRecorderArgs = {
  requestedVariant: ExitIntentVariant
  priorVariant: unknown
  storage: ExitIntentProbeStorage
  inFlight: Set<string>
  recorded: Set<string>
  track: (
    name: 'exit_intent_suppressed',
    metadata: ReturnType<typeof exitIntentSuppressionMetadata>,
  ) => Promise<boolean>
}

export async function recordExitIntentSuppressionOnce({
  requestedVariant,
  priorVariant,
  storage,
  inFlight,
  recorded,
  track,
}: ExitIntentSuppressionRecorderArgs): Promise<'duplicate' | 'recorded' | 'retryable'> {
  const marker = exitIntentSuppressionMarker(requestedVariant)
  if (recorded.has(marker) || inFlight.has(marker)) return 'duplicate'

  try {
    if (storage.getItem(marker) === '1') {
      recorded.add(marker)
      return 'duplicate'
    }
  } catch {
    // A denied storage read must not break the page. Memory guards still apply.
  }

  inFlight.add(marker)
  try {
    const stored = await track(
      'exit_intent_suppressed',
      exitIntentSuppressionMetadata(
        requestedVariant,
        normalizePriorExitIntentVariant(priorVariant),
      ),
    )
    if (exitIntentProbeSettlement(stored) === 'retryable') return 'retryable'

    recorded.add(marker)
    try {
      storage.setItem(marker, '1')
    } catch {
      // A stored event remains latched in memory for this page lifetime.
    }
    return 'recorded'
  } catch {
    return 'retryable'
  } finally {
    inFlight.delete(marker)
  }
}
