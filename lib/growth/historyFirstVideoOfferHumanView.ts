export const HISTORY_FIRST_VIDEO_OFFER_HUMAN_VIEW_VERSION =
  'history_first_video_human_view_v2' as const
export const HISTORY_FIRST_VIDEO_OFFER_VISIBLE_RATIO = 0.5 as const
export const HISTORY_FIRST_VIDEO_OFFER_DWELL_MS = 1000 as const
export const HISTORY_FIRST_VIDEO_OFFER_RETRY_DELAY_MS = 1500 as const

export type HistoryFirstVideoOfferPersistence =
  | 'stored'
  | 'not_stored'
  | 'ambiguous'
export type HistoryFirstVideoOfferRecordResult =
  | HistoryFirstVideoOfferPersistence
  | 'duplicate'
  | 'unavailable'

type MarkerStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>
type ExclusiveClaim = <T>(claimName: string, task: () => Promise<T>) => Promise<T>

export function historyFirstVideoOfferHumanViewMetadata() {
  return {
    version: HISTORY_FIRST_VIDEO_OFFER_HUMAN_VIEW_VERSION,
    surface: 'history_milestone',
    placement: 'secondary',
    actor_unit: 'authenticated_user',
    event_unit: 'first_completed_video_offer_human_view',
    completed_video_count: 1,
    visible_ratio: HISTORY_FIRST_VIDEO_OFFER_VISIBLE_RATIO,
    continuous_visible_ms: HISTORY_FIRST_VIDEO_OFFER_DWELL_MS,
    document_visible_required: true,
    cta_actionable_required: true,
  } as const
}

export function historyFirstVideoOfferHumanViewMarker(videoKey: string): string {
  return `kineo:${HISTORY_FIRST_VIDEO_OFFER_HUMAN_VIEW_VERSION}:viewed:${videoKey.trim()}`
}

export function shouldDwellOnHistoryFirstVideoOffer(input: {
  eligible: boolean
  ctaActionable: boolean
  isIntersecting: boolean
  intersectionRatio: number
  documentVisible: boolean
}): boolean {
  return input.eligible
    && input.ctaActionable
    && input.documentVisible
    && input.isIntersecting
    && input.intersectionRatio >= HISTORY_FIRST_VIDEO_OFFER_VISIBLE_RATIO
}

type DwellState = Parameters<typeof shouldDwellOnHistoryFirstVideoOffer>[0]

export function createHistoryFirstVideoOfferDwellController(options: {
  onDwell: () => void
  setTimer: (callback: () => void, delayMs: number) => number
  clearTimer: (timerId: number) => void
  dwellMs?: number
}) {
  let state: DwellState = {
    eligible: false,
    ctaActionable: false,
    isIntersecting: false,
    intersectionRatio: 0,
    documentVisible: false,
  }
  let timerId: number | null = null
  let fired = false
  let stopped = false

  const clear = () => {
    if (timerId !== null) options.clearTimer(timerId)
    timerId = null
  }
  const qualifies = () => !stopped && shouldDwellOnHistoryFirstVideoOffer(state)
  const reconcile = () => {
    if (!qualifies()) {
      clear()
      return
    }
    if (fired || timerId !== null) return
    timerId = options.setTimer(() => {
      timerId = null
      if (!qualifies() || fired) return
      fired = true
      options.onDwell()
    }, options.dwellMs ?? HISTORY_FIRST_VIDEO_OFFER_DWELL_MS)
  }

  return {
    update(next: Partial<DwellState>) {
      state = { ...state, ...next }
      reconcile()
    },
    rearm() {
      if (stopped) return
      fired = false
      reconcile()
    },
    stop() {
      stopped = true
      clear()
    },
    canContinue() {
      return !stopped
    },
  }
}

export function createHistoryFirstVideoOfferRecorder(options: {
  videoKey: string
  storage?: MarkerStorage | null
  withExclusiveClaim?: ExclusiveClaim | null
  transport: (
    eventName: 'history_first_video_offer_viewed',
    metadata: ReturnType<typeof historyFirstVideoOfferHumanViewMetadata>,
  ) => Promise<HistoryFirstVideoOfferPersistence>
}) {
  const marker = historyFirstVideoOfferHumanViewMarker(options.videoKey)
  let inFlight = false
  let terminal = false

  const wasSettled = (): boolean => {
    if (terminal || inFlight) return true
    try {
      const state = options.storage?.getItem(marker)
      // Pending is deliberately NOT terminal outside the Web Lock. A prior
      // mount may still receive not_stored and remove it. The next recorder
      // waits for the same lock, then re-checks the authoritative outcome.
      if (state !== 'stored' && state !== 'ambiguous') return false
      terminal = true
      return true
    } catch {
      return false
    }
  }

  const recordOnce = async (): Promise<HistoryFirstVideoOfferRecordResult> => {
    if (wasSettled()) return 'duplicate'
    if (!options.storage || !options.withExclusiveClaim) return 'unavailable'

    const recordInsideClaim = async (): Promise<HistoryFirstVideoOfferRecordResult> => {
      try {
        const state = options.storage?.getItem(marker)
        if (state === 'stored' || state === 'ambiguous') {
          terminal = true
          return 'duplicate'
        }
        // Owning the lock proves no live writer still owns a pending claim.
        // A leftover pending value came from a stopped/crashed prior mount and
        // is safe to replace with this bounded attempt.
        options.storage?.setItem(marker, 'pending')
        if (options.storage?.getItem(marker) !== 'pending') return 'unavailable'
      } catch {
        return 'unavailable'
      }

      let outcome: HistoryFirstVideoOfferPersistence
      try {
        outcome = await options.transport(
          'history_first_video_offer_viewed',
          historyFirstVideoOfferHumanViewMetadata(),
        )
      } catch {
        outcome = 'ambiguous'
      }

      if (outcome === 'not_stored') {
        try {
          if (options.storage?.getItem(marker) === 'pending') options.storage.removeItem(marker)
        } catch {
          // One in-memory retry remains available to the caller.
        }
        return outcome
      }

      terminal = true
      try {
        options.storage?.setItem(marker, outcome)
      } catch {
        // In-memory terminal state still protects this uninterrupted mount.
      }
      return outcome
    }

    inFlight = true
    try {
      return await options.withExclusiveClaim(marker, recordInsideClaim)
    } catch {
      return 'unavailable'
    } finally {
      inFlight = false
    }
  }

  return { recordOnce, wasSettled }
}
