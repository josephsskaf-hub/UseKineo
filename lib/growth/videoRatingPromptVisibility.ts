export const VIDEO_RATING_PROMPT_VISIBILITY_VERSION =
  'video_rating_prompt_visibility_v1' as const
export const VIDEO_RATING_PROMPT_VISIBLE_RATIO = 0.5 as const
export const VIDEO_RATING_PROMPT_DWELL_MS = 1000 as const

export type VideoRatingPromptRenderBucket = 'first' | 'repeat'
export type ClosedEventPersistence = 'stored' | 'not_stored' | 'ambiguous'
export type VideoRatingPromptRecordResult =
  | ClosedEventPersistence
  | 'duplicate'
  | 'unavailable'

type MarkerStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

type RecorderOptions = {
  storage?: MarkerStorage | null
  transport: (
    eventName: 'video_rating_prompt_viewed',
    metadata: Record<string, unknown>,
  ) => Promise<ClosedEventPersistence>
}

export function videoRatingPromptRenderBucket(
  renderCount: number,
): VideoRatingPromptRenderBucket {
  return renderCount <= 1 ? 'first' : 'repeat'
}

export function videoRatingPromptMetadata(
  renderCountBucket: VideoRatingPromptRenderBucket,
): Record<string, unknown> {
  return {
    version: VIDEO_RATING_PROMPT_VISIBILITY_VERSION,
    surface: 'post_download_rating',
    render_count_bucket: renderCountBucket,
  }
}

export function videoRatingPromptMarker(): string {
  return `kineo:${VIDEO_RATING_PROMPT_VISIBILITY_VERSION}:viewed`
}

export function shouldDwellOnVideoRatingPrompt(input: {
  downloaded: boolean
  answered: boolean
  isIntersecting: boolean
  intersectionRatio: number
  documentVisible: boolean
}): boolean {
  return input.downloaded
    && !input.answered
    && input.documentVisible
    && input.isIntersecting
    && input.intersectionRatio >= VIDEO_RATING_PROMPT_VISIBLE_RATIO
}

type VideoRatingPromptDwellState = {
  downloaded: boolean
  answered: boolean
  isIntersecting: boolean
  intersectionRatio: number
  documentVisible: boolean
}

type DwellControllerOptions = {
  onDwell: () => void
  setTimer: (callback: () => void, delayMs: number) => number
  clearTimer: (timerId: number) => void
  dwellMs?: number
}

export function createVideoRatingPromptDwellController({
  onDwell,
  setTimer,
  clearTimer,
  dwellMs = VIDEO_RATING_PROMPT_DWELL_MS,
}: DwellControllerOptions) {
  let state: VideoRatingPromptDwellState = {
    downloaded: false,
    answered: false,
    isIntersecting: false,
    intersectionRatio: 0,
    documentVisible: false,
  }
  let timerId: number | null = null
  let fired = false
  let stopped = false

  const clear = () => {
    if (timerId !== null) clearTimer(timerId)
    timerId = null
  }
  const qualifies = () => !stopped && shouldDwellOnVideoRatingPrompt(state)
  const reconcile = () => {
    if (!qualifies()) {
      clear()
      return
    }
    if (fired || timerId !== null) return
    timerId = setTimer(() => {
      timerId = null
      if (!qualifies() || fired) return
      fired = true
      onDwell()
    }, dwellMs)
  }

  return {
    update(next: Partial<VideoRatingPromptDwellState>) {
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

export function createVideoRatingPromptLifecycle() {
  let stopped = false

  return {
    stop() {
      stopped = true
    },
    canContinue() {
      return !stopped
    },
    shouldRetry(outcome: VideoRatingPromptRecordResult, retryUsed: boolean) {
      return !stopped && !retryUsed && outcome === 'not_stored'
    },
  }
}

export function createVideoRatingPromptRecorder({ storage, transport }: RecorderOptions) {
  const inFlight = new Set<string>()
  const terminal = new Set<string>()

  const wasSettled = (): boolean => {
    const marker = videoRatingPromptMarker()
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
    renderCountBucket: VideoRatingPromptRenderBucket,
  ): Promise<VideoRatingPromptRecordResult> => {
    const marker = videoRatingPromptMarker()
    if (wasSettled()) return 'duplicate'
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
      outcome = await transport(
        'video_rating_prompt_viewed',
        videoRatingPromptMetadata(renderCountBucket),
      )
    } catch {
      outcome = 'ambiguous'
    } finally {
      inFlight.delete(marker)
    }

    if (outcome === 'not_stored') {
      try {
        if (storage.getItem(marker) === 'pending') storage.removeItem(marker)
      } catch {
        // The caller may use its single in-memory retry if the claim vanished.
      }
      return outcome
    }

    terminal.add(marker)
    try {
      storage.setItem(marker, outcome === 'stored' ? 'stored' : 'pending')
    } catch {
      // The in-memory terminal state still protects this mounted page.
    }
    return outcome
  }

  return { recordOnce, wasSettled }
}
