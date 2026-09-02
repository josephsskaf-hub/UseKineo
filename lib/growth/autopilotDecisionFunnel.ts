export const AUTOPILOT_DECISION_FUNNEL_VERSION = 'autopilot_decision_funnel_v1' as const
export const AUTOPILOT_DECISION_VISIBLE_RATIO = 0.5 as const
export const AUTOPILOT_DECISION_DWELL_MS = 1_000 as const
export const AUTOPILOT_DECISION_RETRY_MS = 650 as const

export type AutopilotDecisionStage = 'rendered' | 'human_viewed' | 'started'
export type AutopilotDecisionEventName =
  | 'autopilot_break_even_viewed'
  | 'autopilot_break_even_human_viewed'
  | 'autopilot_break_even_started'
export type AutopilotDecisionPersistence = 'stored' | 'not_stored' | 'ambiguous'
export type AutopilotDecisionRecordResult =
  | AutopilotDecisionPersistence
  | 'duplicate'
  | 'unavailable'

type MarkerStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

type RecorderOptions = {
  transport: (
    eventName: AutopilotDecisionEventName,
    metadata: Record<string, unknown>,
  ) => Promise<AutopilotDecisionPersistence>
}

export type AutopilotDecisionSchedule = (
  callback: () => void,
  delayMs: number,
) => () => void

type StageLifecycleOptions = {
  stage: AutopilotDecisionStage
  record: (stage: AutopilotDecisionStage) => Promise<AutopilotDecisionRecordResult>
  isActive: () => boolean
  schedule: AutopilotDecisionSchedule
  retryDelayMs?: number
  maxAttempts?: number
}

const EVENT_BY_STAGE: Record<AutopilotDecisionStage, AutopilotDecisionEventName> = {
  rendered: 'autopilot_break_even_viewed',
  human_viewed: 'autopilot_break_even_human_viewed',
  started: 'autopilot_break_even_started',
}

export function autopilotDecisionMetadata(stage: AutopilotDecisionStage) {
  const common = {
    version: AUTOPILOT_DECISION_FUNNEL_VERSION,
    surface: 'pricing_autopilot',
    event_unit: 'autopilot_break_even_calculator',
  } as const

  if (stage === 'rendered') {
    return {
      ...common,
      measurement_unit: 'calculator_mount',
      surface_state: 'rendered_not_viewed',
      human_exposure_claimed: false,
    } as const
  }
  if (stage === 'human_viewed') {
    return {
      ...common,
      measurement_unit: 'calculator_human_view',
      surface_state: 'human_viewed',
      human_exposure_claimed: true,
      visible_ratio: AUTOPILOT_DECISION_VISIBLE_RATIO,
      dwell_ms: AUTOPILOT_DECISION_DWELL_MS,
    } as const
  }
  return {
    ...common,
    measurement_unit: 'gross_profit_input_started',
    surface_state: 'non_empty_input',
    human_exposure_claimed: true,
    interaction: 'gross_profit_non_empty_input',
  } as const
}

export function autopilotDecisionMarker(stage: AutopilotDecisionStage): string {
  return `kineo:${AUTOPILOT_DECISION_FUNNEL_VERSION}:${stage}`
}

export function shouldSampleAutopilotDecision(input: {
  isIntersecting: boolean
  intersectionRatio: number
  documentVisible: boolean
  targetConnected: boolean
}): boolean {
  return input.documentVisible
    && input.targetConnected
    && input.isIntersecting
    && input.intersectionRatio >= AUTOPILOT_DECISION_VISIBLE_RATIO
}

export function createAutopilotDecisionStageLifecycle({
  stage,
  record,
  isActive,
  schedule,
  retryDelayMs = AUTOPILOT_DECISION_RETRY_MS,
  maxAttempts = 2,
}: StageLifecycleOptions) {
  const attemptLimit = Math.max(1, Math.min(2, Math.trunc(maxAttempts)))
  let attempts = 0
  let stopped = false
  let running = false
  let terminal = false
  let retryAvailable = true
  let cancelRetry: (() => void) | null = null

  const clearRetry = () => {
    cancelRetry?.()
    cancelRetry = null
  }

  const run = async () => {
    if (stopped || terminal || running || attempts >= attemptLimit || !isActive()) return
    clearRetry()
    running = true
    attempts += 1
    const outcome = await record(stage).catch(() => 'ambiguous' as const)
    running = false
    if (stopped) return

    if (outcome !== 'not_stored') {
      terminal = true
      retryAvailable = false
      return
    }

    retryAvailable = attempts < attemptLimit
    if (!retryAvailable || !isActive()) return
    cancelRetry = schedule(() => {
      cancelRetry = null
      void run()
    }, retryDelayMs)
  }

  return {
    start() {
      if (!retryAvailable || terminal || stopped) return
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

export function createAutopilotDecisionDwellController(options: {
  record: (stage: AutopilotDecisionStage) => Promise<AutopilotDecisionRecordResult>
  schedule: AutopilotDecisionSchedule
  dwellMs?: number
  retryDelayMs?: number
}) {
  let stopped = false
  let eligible = false
  let dwellSatisfied = false
  let cancelDwell: (() => void) | null = null
  const stageLifecycle = createAutopilotDecisionStageLifecycle({
    stage: 'human_viewed',
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
    update(sample: Parameters<typeof shouldSampleAutopilotDecision>[0]) {
      if (stopped) return
      eligible = shouldSampleAutopilotDecision(sample)
      if (!eligible) {
        clearDwell()
        stageLifecycle.pause()
        return
      }
      if (dwellSatisfied) {
        stageLifecycle.start()
        return
      }
      if (cancelDwell) return
      cancelDwell = options.schedule(() => {
        cancelDwell = null
        if (stopped || !eligible) return
        dwellSatisfied = true
        stageLifecycle.start()
      }, options.dwellMs ?? AUTOPILOT_DECISION_DWELL_MS)
    },
    stop() {
      stopped = true
      eligible = false
      clearDwell()
      stageLifecycle.stop()
    },
  }
}

export function createAutopilotDecisionRecorder({ transport }: RecorderOptions) {
  const inFlight = new Map<string, Promise<AutopilotDecisionRecordResult>>()
  const terminal = new Set<string>()

  const recordOnce = async (
    stage: AutopilotDecisionStage,
    storage?: MarkerStorage | null,
  ): Promise<AutopilotDecisionRecordResult> => {
    const marker = autopilotDecisionMarker(stage)
    if (terminal.has(marker)) return 'duplicate'
    const active = inFlight.get(marker)
    if (active) return active
    if (!storage) return 'unavailable'

    try {
      const existing = storage.getItem(marker)
      if (existing === 'pending' || existing === 'stored') {
        terminal.add(marker)
        return 'duplicate'
      }
      storage.setItem(marker, 'pending')
      if (storage.getItem(marker) !== 'pending') return 'unavailable'
    } catch {
      return 'unavailable'
    }

    const job = (async (): Promise<AutopilotDecisionRecordResult> => {
      let outcome: AutopilotDecisionPersistence
      try {
        outcome = await transport(EVENT_BY_STAGE[stage], autopilotDecisionMetadata(stage))
      } catch {
        outcome = 'ambiguous'
      }

      if (outcome === 'not_stored') {
        try {
          if (storage.getItem(marker) === 'pending') storage.removeItem(marker)
        } catch {
          // The active lifecycle may make one later bounded attempt.
        }
        return outcome
      }

      terminal.add(marker)
      try {
        storage.setItem(marker, outcome === 'stored' ? 'stored' : 'pending')
      } catch {
        // The in-memory terminal state still prevents a duplicate in this mount.
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
