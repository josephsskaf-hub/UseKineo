import { TRIAL_DOWNGRADE_PLAN_CHOICE_VERSION } from '@/lib/growth/trialDowngradePlanChoice'

export const TRIAL_DOWNGRADE_HUMAN_VIEW_VERSION =
  'trial_downgrade_offer_view_v1' as const
export const TRIAL_DOWNGRADE_HUMAN_VIEW_RATIO = 0.6 as const
export const TRIAL_DOWNGRADE_HUMAN_VIEW_DWELL_MS = 1000 as const
export const TRIAL_DOWNGRADE_HUMAN_VIEW_RETRY_DELAY_MS = 1500 as const

export type TrialDowngradeHumanViewPersistence =
  | 'stored'
  | 'not_stored'
  | 'ambiguous'
export type TrialDowngradeHumanViewRecordResult =
  | TrialDowngradeHumanViewPersistence
  | 'duplicate'
  | 'unavailable'

type MarkerStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>
type ExclusiveClaim = <T>(claimName: string, task: () => Promise<T>) => Promise<T>

export function trialDowngradeHumanViewMetadata() {
  return {
    version: TRIAL_DOWNGRADE_HUMAN_VIEW_VERSION,
    offer_version: TRIAL_DOWNGRADE_PLAN_CHOICE_VERSION,
    surface: 'trial_downgrade_modal',
    actor_unit: 'authenticated_user',
    event_unit: 'account_primary_offer_human_view',
    measurement_unit: 'authenticated_user_trial_downgrade_primary_cta_human_view',
    visible_ratio: TRIAL_DOWNGRADE_HUMAN_VIEW_RATIO,
    continuous_visible_ms: TRIAL_DOWNGRADE_HUMAN_VIEW_DWELL_MS,
    document_visible_required: true,
    decision_ready: true,
    currency_resolved: true,
    display_currency: 'usd',
    human_exposure_claimed: true,
  } as const
}

export function trialDowngradeHumanViewMarker(userKey: string): string {
  return `kineo:${TRIAL_DOWNGRADE_HUMAN_VIEW_VERSION}:viewed:${userKey}`
}

export function shouldDwellOnTrialDowngradeHumanView(input: {
  open: boolean
  decisionReady: boolean
  ctaActionable: boolean
  isIntersecting: boolean
  intersectionRatio: number
  documentVisible: boolean
}): boolean {
  return input.open
    && input.decisionReady
    && input.ctaActionable
    && input.documentVisible
    && input.isIntersecting
    && input.intersectionRatio >= TRIAL_DOWNGRADE_HUMAN_VIEW_RATIO
}

type DwellState = Parameters<typeof shouldDwellOnTrialDowngradeHumanView>[0]

export function createTrialDowngradeHumanViewDwellController(options: {
  onDwell: () => void
  setTimer: (callback: () => void, delayMs: number) => number
  clearTimer: (timerId: number) => void
  dwellMs?: number
}) {
  let state: DwellState = {
    open: false,
    decisionReady: false,
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
  const qualifies = () => !stopped && shouldDwellOnTrialDowngradeHumanView(state)
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
    }, options.dwellMs ?? TRIAL_DOWNGRADE_HUMAN_VIEW_DWELL_MS)
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

export function createTrialDowngradeHumanViewRetryController(options: {
  qualifies: () => boolean
  onRetry: () => void
  setTimer: (callback: () => void, delayMs: number) => number
  clearTimer: (timerId: number) => void
  retryDelayMs?: number
}) {
  let retryUsed = false
  let retryPending = false
  let timerId: number | null = null
  let stopped = false

  const clear = () => {
    if (timerId !== null) options.clearTimer(timerId)
    timerId = null
  }
  const reconcile = () => {
    if (stopped || !retryPending) {
      clear()
      return
    }
    if (!options.qualifies()) {
      clear()
      return
    }
    if (timerId !== null) return
    timerId = options.setTimer(() => {
      timerId = null
      if (stopped || !retryPending || !options.qualifies()) return
      retryPending = false
      options.onRetry()
    }, options.retryDelayMs ?? TRIAL_DOWNGRADE_HUMAN_VIEW_RETRY_DELAY_MS)
  }

  return {
    request(): boolean {
      if (stopped || retryUsed) return false
      retryUsed = true
      retryPending = true
      reconcile()
      return true
    },
    update() {
      reconcile()
    },
    stop() {
      stopped = true
      retryPending = false
      clear()
    },
    isPending() {
      return retryPending
    },
  }
}

export function createTrialDowngradeHumanViewRecorder(options: {
  userKey: string
  storage?: MarkerStorage | null
  withExclusiveClaim?: ExclusiveClaim | null
  transport: (
    eventName: 'trial_downgrade_offer_viewed',
    metadata: ReturnType<typeof trialDowngradeHumanViewMetadata>,
  ) => Promise<TrialDowngradeHumanViewPersistence>
}) {
  const marker = trialDowngradeHumanViewMarker(options.userKey)
  let inFlight = false
  let terminal = false

  const wasSettled = (): boolean => {
    if (terminal || inFlight) return true
    try {
      const stored = options.storage?.getItem(marker)
      // A cross-tab 'pending' claim is not terminal outside the Web Lock.
      // Its owner may still receive not_stored and remove it; wait for the lock.
      if (stored !== 'stored') return false
      terminal = true
      return true
    } catch {
      return false
    }
  }

  const recordInsideClaim = async (): Promise<TrialDowngradeHumanViewRecordResult> => {
    try {
      const stored = options.storage?.getItem(marker)
      if (stored === 'stored' || stored === 'pending') {
        terminal = true
        return 'duplicate'
      }
      options.storage?.setItem(marker, 'pending')
      if (options.storage?.getItem(marker) !== 'pending') return 'unavailable'
    } catch {
      return 'unavailable'
    }

    let outcome: TrialDowngradeHumanViewPersistence
    try {
      outcome = await options.transport(
        'trial_downgrade_offer_viewed',
        trialDowngradeHumanViewMetadata(),
      )
    } catch {
      outcome = 'ambiguous'
    }

    if (outcome === 'not_stored') {
      try {
        if (options.storage?.getItem(marker) === 'pending') {
          options.storage.removeItem(marker)
        }
      } catch {
        // The caller may use its one in-memory retry if the claim disappeared.
      }
      return outcome
    }

    terminal = true
    try {
      options.storage?.setItem(marker, outcome === 'stored' ? 'stored' : 'pending')
    } catch {
      // In-memory terminal state still prevents a duplicate in this mount.
    }
    return outcome
  }

  const recordOnce = async (): Promise<TrialDowngradeHumanViewRecordResult> => {
    if (wasSettled()) return 'duplicate'
    if (!options.storage || !options.withExclusiveClaim) return 'unavailable'

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
