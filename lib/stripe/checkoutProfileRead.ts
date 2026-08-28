export type CheckoutProfileReadError = {
  code?: string
  message?: string
}

export type CheckoutProfileReadResult<T> = {
  data: T | null
  error: CheckoutProfileReadError | null
}

export type CheckoutProfileReadOutcome<T> = CheckoutProfileReadResult<T> & {
  attempts: number
  recovered: boolean
}

// A successful read returns immediately. These waits only run after the
// authenticated user exists but the profile read failed or has not observed
// the freshly-created row yet. Total added wait on a persistent failure: 2s.
export const CHECKOUT_PROFILE_RETRY_DELAYS_MS = [0, 200, 600, 1200] as const

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function readCheckoutProfileWithRetry<T>(
  read: () => Promise<CheckoutProfileReadResult<T>>,
  wait: (ms: number) => Promise<void> = sleep,
  delays: readonly number[] = CHECKOUT_PROFILE_RETRY_DELAYS_MS,
): Promise<CheckoutProfileReadOutcome<T>> {
  if (delays.length === 0 || delays[0] !== 0) {
    throw new Error('Checkout profile retry schedule must start at 0ms')
  }

  let latest: CheckoutProfileReadResult<T> = {
    data: null,
    error: { code: 'CHECKOUT_PROFILE_READ_NOT_ATTEMPTED' },
  }

  for (let index = 0; index < delays.length; index += 1) {
    const delay = delays[index] ?? 0
    if (delay > 0) await wait(delay)

    try {
      latest = await read()
    } catch {
      // Network/runtime throws are retryable here, but raw messages never
      // leave this boundary or enter checkout metadata.
      latest = {
        data: null,
        error: { code: 'CHECKOUT_PROFILE_READ_THROWN' },
      }
    }

    if (latest.data && !latest.error) {
      return {
        ...latest,
        attempts: index + 1,
        recovered: index > 0,
      }
    }
  }

  return {
    ...latest,
    attempts: delays.length,
    recovered: false,
  }
}
