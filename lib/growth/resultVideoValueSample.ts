export const RESULT_VIDEO_VALUE_SAMPLED_EVENT = 'result_video_value_sampled' as const
export const RESULT_VIDEO_VALUE_SAMPLED_VERSION = 'result_video_value_sampled_v1' as const
export const RESULT_VIDEO_VALUE_THRESHOLD_MS = 5_000
export const RESULT_VIDEO_VALUE_MAX_EMIT_ATTEMPTS = 2
export const RESULT_VIDEO_VALUE_RETRY_MS = 2_000

export type ResultVideoQualityBucket = 'fast' | 'legacy_ai' | 'cinematic' | 'avatar' | 'unknown'
export type ResultVideoDurationBucket = 'under_35s' | '35_59s' | '60_89s' | '90s_plus' | 'unknown'
export type ResultVideoFirstDeliveryStatus = 'confirmed' | 'not_confirmed' | 'unresolved'

export interface ResultVideoValueContext {
  attemptId: string
  quality: unknown
  durationSeconds: unknown
  firstDeliveryStatus: ResultVideoFirstDeliveryStatus
}

export function normalizeResultVideoAttemptId(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const normalized = value.trim()
  return /^[A-Za-z0-9._~-]{1,100}$/.test(normalized) ? normalized : null
}

export function resultVideoQualityBucket(value: unknown): ResultVideoQualityBucket {
  if (value === 'fast') return 'fast'
  if (value === 'basic' || value === 'basic_ai' || value === 'pro') return 'legacy_ai'
  if (value === 'avatar' || value === 'presenter') return 'avatar'
  if (typeof value === 'string' && value.startsWith('cinematic_')) return 'cinematic'
  return 'unknown'
}

export function resultVideoDurationBucket(value: unknown): ResultVideoDurationBucket {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return 'unknown'
  if (value < 35) return 'under_35s'
  if (value < 60) return '35_59s'
  if (value < 90) return '60_89s'
  return '90s_plus'
}

export function resultVideoValueMetadata(context: ResultVideoValueContext): Record<string, unknown> | null {
  const attemptId = normalizeResultVideoAttemptId(context.attemptId)
  if (!attemptId) return null
  return {
    version: RESULT_VIDEO_VALUE_SAMPLED_VERSION,
    attempt_id: attemptId,
    threshold_seconds: RESULT_VIDEO_VALUE_THRESHOLD_MS / 1_000,
    quality_bucket: resultVideoQualityBucket(context.quality),
    duration_bucket: resultVideoDurationBucket(context.durationSeconds),
    first_delivery_status: context.firstDeliveryStatus,
  }
}

export type ResultVideoLockRequest = (
  name: string,
  callback: () => Promise<boolean>,
) => Promise<boolean>
export type ResultVideoEmitOutcome = 'stored' | 'not_stored' | 'ambiguous'

export function createCrossTabResultVideoEmitter(options: {
  attemptId: string
  requestLock?: ResultVideoLockRequest
  readLatch: (key: string) => string | null
  writeLatch: (key: string, value: string) => void
  removeLatch: (key: string) => void
  emit: (metadata: Record<string, unknown>) => Promise<ResultVideoEmitOutcome>
}): (metadata: Record<string, unknown>) => Promise<boolean> {
  const attemptId = normalizeResultVideoAttemptId(options.attemptId)
  if (!attemptId || !options.requestLock) return async () => false
  const latchKey = `kineo:${RESULT_VIDEO_VALUE_SAMPLED_VERSION}:${attemptId}`
  const lockName = `kineo:${RESULT_VIDEO_VALUE_SAMPLED_VERSION}:lock:${attemptId}`
  return (metadata) => options.requestLock!(lockName, async () => {
    try {
      const existing = options.readLatch(latchKey)
      if (existing === 'pending' || existing === 'stored' || existing === '1') return true
      // Claim before POST. If the page crashes after this line, a later tab
      // suppresses the attempt instead of minting a duplicate event.
      options.writeLatch(latchKey, 'pending')
      if (options.readLatch(latchKey) !== 'pending') return false
    } catch {
      return false
    }
    const outcome = await options.emit(metadata).catch((): ResultVideoEmitOutcome => 'ambiguous')
    if (outcome === 'not_stored') {
      try { options.removeLatch(latchKey) } catch { /* pending fails closed */ }
      return false
    }
    if (outcome === 'ambiguous') {
      // The server may have committed before the response disappeared. Keep
      // pending so neither this tab nor another can duplicate the attempt.
      return true
    }
    try {
      options.writeLatch(latchKey, 'stored')
      return true
    } catch {
      // The pre-POST pending claim still suppresses a duplicate.
      return true
    }
  })
}

interface ResultVideoValueSamplerOptions {
  attemptId: string
  initialVisible: boolean
  context: () => ResultVideoValueContext
  emit: (metadata: Record<string, unknown>) => boolean | Promise<boolean>
  now?: () => number
  schedule?: (callback: () => void, delayMs: number) => unknown
  cancel?: (handle: unknown) => void
}

export interface ResultVideoValueSampler {
  playing(mediaSeconds: number): void
  progress(mediaSeconds: number): void
  pause(): void
  waiting(): void
  ended(): void
  visibility(visible: boolean, mediaSeconds: number): void
  destroy(): void
  sampledMilliseconds(): number
}

/**
 * Counts decoded media progress, capped by visible wall time. A seek jump can
 * never manufacture watched seconds, and a suspended JS thread with no media
 * progress contributes zero.
 */
export function createResultVideoValueSampler(options: ResultVideoValueSamplerOptions): ResultVideoValueSampler {
  const attemptId = normalizeResultVideoAttemptId(options.attemptId)
  const now = options.now ?? (() => Date.now())
  const schedule = options.schedule ?? ((callback, delayMs) => setTimeout(callback, delayMs))
  const cancel = options.cancel ?? ((handle) => clearTimeout(handle as ReturnType<typeof setTimeout>))
  let visible = options.initialVisible
  let mediaPlaying = false
  let previousMediaSeconds: number | null = null
  let previousWallMs: number | null = null
  let accumulatedMs = 0
  let retryTimer: unknown = null
  let destroyed = false
  let sampled = !attemptId
  let emissionInFlight = false
  let emissionAttempts = 0

  const clearRetry = () => {
    if (retryTimer === null) return
    cancel(retryTimer)
    retryTimer = null
  }
  const resetBaseline = () => {
    previousMediaSeconds = null
    previousWallMs = null
  }
  const finishEmission = (stored: boolean) => {
    emissionInFlight = false
    if (stored) {
      sampled = true
      clearRetry()
      return
    }
    if (
      !destroyed && visible && mediaPlaying &&
      emissionAttempts < RESULT_VIDEO_VALUE_MAX_EMIT_ATTEMPTS && retryTimer === null
    ) {
      retryTimer = schedule(() => {
        retryTimer = null
        emitOnce()
      }, RESULT_VIDEO_VALUE_RETRY_MS)
    }
  }
  const emitOnce = () => {
    if (
      destroyed || sampled || emissionInFlight || !attemptId ||
      accumulatedMs < RESULT_VIDEO_VALUE_THRESHOLD_MS ||
      emissionAttempts >= RESULT_VIDEO_VALUE_MAX_EMIT_ATTEMPTS
    ) return
    const metadata = resultVideoValueMetadata({ ...options.context(), attemptId })
    if (!metadata) return
    emissionInFlight = true
    emissionAttempts += 1
    try {
      const result = options.emit(metadata)
      if (result && typeof (result as Promise<boolean>).then === 'function') {
        void Promise.resolve(result).then(
          (stored) => finishEmission(stored === true),
          () => finishEmission(false),
        )
      } else finishEmission(result === true)
    } catch {
      finishEmission(false)
    }
  }
  const setBaseline = (mediaSeconds: number) => {
    previousMediaSeconds = Number.isFinite(mediaSeconds) ? mediaSeconds : null
    previousWallMs = now()
  }
  const stopPlayback = () => {
    mediaPlaying = false
    resetBaseline()
  }

  return {
    playing(mediaSeconds) {
      if (destroyed || sampled) return
      mediaPlaying = true
      if (visible) setBaseline(mediaSeconds)
    },
    progress(mediaSeconds) {
      if (destroyed || sampled || !visible || !mediaPlaying || !Number.isFinite(mediaSeconds)) return
      const wallNow = now()
      if (previousMediaSeconds === null || previousWallMs === null) {
        setBaseline(mediaSeconds)
        return
      }
      const mediaDeltaMs = (mediaSeconds - previousMediaSeconds) * 1_000
      const wallDeltaMs = Math.max(0, wallNow - previousWallMs)
      previousMediaSeconds = mediaSeconds
      previousWallMs = wallNow
      if (mediaDeltaMs <= 0 || wallDeltaMs <= 0) return
      accumulatedMs += Math.min(mediaDeltaMs, wallDeltaMs)
      emitOnce()
    },
    pause: stopPlayback,
    waiting: stopPlayback,
    ended: stopPlayback,
    visibility(nextVisible, mediaSeconds) {
      if (visible === nextVisible) return
      visible = nextVisible
      resetBaseline()
      if (visible && mediaPlaying) setBaseline(mediaSeconds)
    },
    destroy() {
      destroyed = true
      mediaPlaying = false
      resetBaseline()
      clearRetry()
    },
    sampledMilliseconds() { return accumulatedMs },
  }
}
