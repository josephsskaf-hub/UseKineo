export const INLINE_PRICING_DECISION_VERSION = 'inline_pricing_decision_v1' as const
export const INLINE_PRICING_VISIBLE_RATIO = 0.5 as const
export const INLINE_PRICING_DWELL_MS = 1_000 as const
export const INLINE_PRICING_RETRY_MS = 650 as const

export type InlinePricingPersistence = 'stored' | 'not_stored' | 'ambiguous'
export type InlinePricingRecordResult =
  | InlinePricingPersistence
  | 'duplicate'
  | 'unavailable'

type MarkerStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

export type InlinePricingSchedule = (
  callback: () => void,
  delayMs: number,
) => () => void

export function inlinePricingDecisionMetadata() {
  return {
    version: INLINE_PRICING_DECISION_VERSION,
    surface: 'generate_step_1',
    actor_unit: 'authenticated_user',
    event_unit: 'value_anchor_human_view',
    dedupe_scope: 'browser_tab',
    human_exposure_claimed: true,
    visible_ratio: INLINE_PRICING_VISIBLE_RATIO,
    dwell_ms: INLINE_PRICING_DWELL_MS,
  } as const
}

export function inlinePricingDecisionMarker(): string {
  return `kineo:${INLINE_PRICING_DECISION_VERSION}:value_anchor_viewed`
}

export function shouldSampleInlinePricingValueAnchor(input: {
  isIntersecting: boolean
  intersectionRatio: number
  documentVisible: boolean
  targetConnected: boolean
}): boolean {
  return input.documentVisible
    && input.targetConnected
    && input.isIntersecting
    && input.intersectionRatio >= INLINE_PRICING_VISIBLE_RATIO
}

export function createInlinePricingLifecycle(options: {
  record: () => Promise<InlinePricingRecordResult>
  isActive: () => boolean
  schedule: InlinePricingSchedule
  retryDelayMs?: number
  maxAttempts?: number
}) {
  const attemptLimit = Math.max(1, Math.min(2, Math.trunc(options.maxAttempts ?? 2)))
  let attempts = 0
  let stopped = false
  let running = false
  let terminal = false
  let cancelRetry: (() => void) | null = null

  const clearRetry = () => {
    cancelRetry?.()
    cancelRetry = null
  }

  const run = async () => {
    if (stopped || terminal || running || attempts >= attemptLimit || !options.isActive()) return
    clearRetry()
    running = true
    attempts += 1
    const outcome = await options.record().catch(() => 'ambiguous' as const)
    running = false
    if (stopped) return
    if (outcome !== 'not_stored') {
      terminal = true
      return
    }
    if (attempts >= attemptLimit || !options.isActive()) return
    cancelRetry = options.schedule(() => {
      cancelRetry = null
      void run()
    }, options.retryDelayMs ?? INLINE_PRICING_RETRY_MS)
  }

  return {
    start() {
      if (stopped || terminal) return
      void run()
    },
    pause() {
      clearRetry()
    },
    stop() {
      stopped = true
      clearRetry()
    },
    attempts() {
      return attempts
    },
  }
}

export function createInlinePricingDwellController(options: {
  record: () => Promise<InlinePricingRecordResult>
  schedule: InlinePricingSchedule
  dwellMs?: number
  retryDelayMs?: number
}) {
  let stopped = false
  let eligible = false
  let dwellSatisfied = false
  let cancelDwell: (() => void) | null = null
  const lifecycle = createInlinePricingLifecycle({
    record: options.record,
    isActive: () => !stopped && eligible,
    schedule: options.schedule,
    retryDelayMs: options.retryDelayMs,
  })

  const clearDwell = () => {
    cancelDwell?.()
    cancelDwell = null
  }

  return {
    update(sample: Parameters<typeof shouldSampleInlinePricingValueAnchor>[0]) {
      if (stopped) return
      eligible = shouldSampleInlinePricingValueAnchor(sample)
      if (!eligible) {
        clearDwell()
        lifecycle.pause()
        return
      }
      if (dwellSatisfied) {
        lifecycle.start()
        return
      }
      if (cancelDwell) return
      cancelDwell = options.schedule(() => {
        cancelDwell = null
        if (stopped || !eligible) return
        dwellSatisfied = true
        lifecycle.start()
      }, options.dwellMs ?? INLINE_PRICING_DWELL_MS)
    },
    stop() {
      stopped = true
      eligible = false
      clearDwell()
      lifecycle.stop()
    },
  }
}

export function createInlinePricingDecisionRecorder(options: {
  transport: (
    eventName: 'inline_pricing_value_anchor_viewed',
    metadata: ReturnType<typeof inlinePricingDecisionMetadata>,
  ) => Promise<InlinePricingPersistence>
}) {
  const inFlight = new Map<string, Promise<InlinePricingRecordResult>>()
  const terminal = new Set<string>()

  const recordOnce = async (
    storage?: MarkerStorage | null,
  ): Promise<InlinePricingRecordResult> => {
    const marker = inlinePricingDecisionMarker()
    if (terminal.has(marker)) return 'duplicate'
    const active = inFlight.get(marker)
    if (active) return active
    if (!storage) return 'unavailable'

    try {
      const existing = storage.getItem(marker)
      if (existing === 'pending' || existing === 'stored' || existing === 'ambiguous') {
        terminal.add(marker)
        return 'duplicate'
      }
      storage.setItem(marker, 'pending')
      if (storage.getItem(marker) !== 'pending') return 'unavailable'
    } catch {
      return 'unavailable'
    }

    const job = (async (): Promise<InlinePricingRecordResult> => {
      let outcome: InlinePricingPersistence
      try {
        outcome = await options.transport(
          'inline_pricing_value_anchor_viewed',
          inlinePricingDecisionMetadata(),
        )
      } catch {
        outcome = 'ambiguous'
      }

      if (outcome === 'not_stored') {
        try {
          if (storage.getItem(marker) === 'pending') storage.removeItem(marker)
        } catch {
          // The active lifecycle owns at most one later bounded attempt.
        }
        return outcome
      }

      terminal.add(marker)
      try {
        storage.setItem(marker, outcome)
      } catch {
        // The in-memory terminal state still protects this mounted module.
      }
      return outcome
    })()
    inFlight.set(marker, job)
    try {
      return await job
    } finally {
      if (inFlight.get(marker) === job) inFlight.delete(marker)
    }
  }

  return { recordOnce }
}
