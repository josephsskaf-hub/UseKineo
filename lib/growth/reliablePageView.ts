export interface ReliableViewStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

export interface ReliableViewRecordRequest {
  marker: string
  send: () => Promise<boolean>
  storage?: ReliableViewStorage | null
  signal?: AbortSignal | null
  maxAttempts?: number
}

interface ReliableViewRecorderOptions {
  wait?: (attempt: number) => Promise<void>
}

export interface ReliableViewRecorder {
  wasRecorded(marker: string, storage?: ReliableViewStorage | null): boolean
  record(request: ReliableViewRecordRequest): Promise<boolean>
}

interface PendingRecord {
  promise: Promise<boolean>
  lifetimes: Set<AbortSignal | null>
}

const DEFAULT_MAX_ATTEMPTS = 2

/**
 * Records a denominator only after /api/events confirms `stored:true`.
 * Concurrent mounts share one bounded request pipeline, and privacy modes
 * fall back to an in-memory acknowledgement latch.
 */
export function createReliableViewRecorder(
  options: ReliableViewRecorderOptions = {},
): ReliableViewRecorder {
  const recorded = new Set<string>()
  const pending = new Map<string, PendingRecord>()
  const wait = options.wait ?? ((attempt: number) => new Promise<void>((resolve) => {
    window.setTimeout(resolve, 650 * attempt)
  }))

  function wasRecorded(marker: string, storage?: ReliableViewStorage | null): boolean {
    if (recorded.has(marker)) return true
    try {
      if (storage?.getItem(marker) === '1') {
        recorded.add(marker)
        return true
      }
    } catch {
      // Privacy modes can deny storage. The in-memory latch still works.
    }
    return false
  }

  function addLifetime(lifetimes: Set<AbortSignal | null>, signal?: AbortSignal | null): void {
    if (signal === undefined || signal === null) {
      lifetimes.add(null)
    } else if (!signal.aborted) {
      lifetimes.add(signal)
    }
  }

  function hasActiveLifetime(lifetimes: Set<AbortSignal | null>): boolean {
    return Array.from(lifetimes).some((signal) => signal === null || !signal.aborted)
  }

  async function record({
    marker,
    send,
    storage = null,
    signal = null,
    maxAttempts = DEFAULT_MAX_ATTEMPTS,
  }: ReliableViewRecordRequest): Promise<boolean> {
    if (wasRecorded(marker, storage)) return true

    const active = pending.get(marker)
    if (active) {
      addLifetime(active.lifetimes, signal)
      return active.promise
    }

    const lifetimes = new Set<AbortSignal | null>()
    addLifetime(lifetimes, signal)
    const requestedAttempts = Number.isFinite(maxAttempts) ? Math.trunc(maxAttempts) : DEFAULT_MAX_ATTEMPTS
    const attempts = Math.max(1, Math.min(DEFAULT_MAX_ATTEMPTS, requestedAttempts))
    const job = (async () => {
      for (let attempt = 1; attempt <= attempts; attempt += 1) {
        if (!hasActiveLifetime(lifetimes)) return false

        let stored = false
        try {
          stored = await send()
        } catch {
          stored = false
        }

        if (stored) {
          recorded.add(marker)
          try {
            storage?.setItem(marker, '1')
          } catch {
            // The server acknowledgement remains latched in memory.
          }
          return true
        }

        if (attempt < attempts) {
          if (!hasActiveLifetime(lifetimes)) return false
          await wait(attempt)
        }
      }
      return false
    })()

    const state: PendingRecord = { promise: job, lifetimes }
    pending.set(marker, state)
    try {
      return await job
    } finally {
      if (pending.get(marker) === state) pending.delete(marker)
    }
  }

  return { wasRecorded, record }
}
