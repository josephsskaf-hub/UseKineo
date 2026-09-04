export const TRIAL_ACTIVE_SUBSCRIPTION_CTA_VERSION =
  'trial_active_subscription_cta_fresh_state_v2' as const

export const TRIAL_ACTIVE_SUBSCRIPTION_CTA_VIEW_EVENT =
  'trial_active_subscription_cta_viewed' as const

export const TRIAL_ACTIVE_SUBSCRIPTION_CTA_MODE =
  'trial_active_subscription' as const

export const TRIAL_ACTIVE_SUBSCRIPTION_CTA_VIEW_RATIO = 0.5
export const TRIAL_ACTIVE_SUBSCRIPTION_CTA_DWELL_MS = 1_000

export type TrialActiveSubscriptionPersistence = 'stored' | 'not_stored' | 'ambiguous'
export type TrialActiveSubscriptionRecordOutcome = TrialActiveSubscriptionPersistence | 'duplicate' | 'unavailable'

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>
type TimerHandle = ReturnType<typeof setTimeout>

export function trialActiveSubscriptionCtaMarker(userKey: string): string {
  return `kineo:${TRIAL_ACTIVE_SUBSCRIPTION_CTA_VERSION}:viewed:${userKey}`
}

export function shouldCountTrialActiveSubscriptionCtaView(input: {
  open: boolean
  subscriptionCtaEligible: boolean
  completedVideoConfirmed: boolean
  isIntersecting: boolean
  intersectionRatio: number
  documentVisible: boolean
}): boolean {
  return input.open
    && input.subscriptionCtaEligible
    && input.completedVideoConfirmed
    && input.isIntersecting
    && input.intersectionRatio >= TRIAL_ACTIVE_SUBSCRIPTION_CTA_VIEW_RATIO
    && input.documentVisible
}

export function trialActiveSubscriptionCtaViewMetadata(input: { returnLadderRendered: boolean }) {
  return {
    version: TRIAL_ACTIVE_SUBSCRIPTION_CTA_VERSION,
    offer_version: TRIAL_ACTIVE_SUBSCRIPTION_CTA_VERSION,
    offer_mode: TRIAL_ACTIVE_SUBSCRIPTION_CTA_MODE,
    surface: 'trial_active_banner',
    tier: 'basic',
    actor_unit: 'authenticated_user',
    event_unit: 'subscription_cta_human_view',
    measurement_unit: 'authenticated_user_trial_active_subscription_cta_human_view',
    human_exposure_claimed: true,
    delivery_evidence: 'api_videos_completed_count_gte_1',
    return_ladder_rendered: input.returnLadderRendered,
    visible_ratio: TRIAL_ACTIVE_SUBSCRIPTION_CTA_VIEW_RATIO,
    continuous_visible_ms: TRIAL_ACTIVE_SUBSCRIPTION_CTA_DWELL_MS,
    document_visible_required: true,
  } as const
}

export function trialActiveSubscriptionCtaClickMetadata(input: { returnLadderRendered: boolean }) {
  return {
    version: TRIAL_ACTIVE_SUBSCRIPTION_CTA_VERSION,
    offer_version: TRIAL_ACTIVE_SUBSCRIPTION_CTA_VERSION,
    offer_mode: TRIAL_ACTIVE_SUBSCRIPTION_CTA_MODE,
    surface: 'trial_active_banner',
    tier: 'basic',
    actor_unit: 'authenticated_user',
    event_unit: 'subscription_cta_click',
    measurement_unit: 'authenticated_user_trial_active_subscription_cta_click',
    return_ladder_rendered: input.returnLadderRendered,
  } as const
}

export function createTrialActiveSubscriptionCtaViewRecorder(input: {
  userKey: string
  storage: StorageLike | null
  transport: (
    eventName: typeof TRIAL_ACTIVE_SUBSCRIPTION_CTA_VIEW_EVENT,
    metadata: ReturnType<typeof trialActiveSubscriptionCtaViewMetadata>,
  ) => Promise<TrialActiveSubscriptionPersistence>
  metadata: ReturnType<typeof trialActiveSubscriptionCtaViewMetadata>
}) {
  const marker = trialActiveSubscriptionCtaMarker(input.userKey)
  let inFlight = false

  const wasSettled = () => {
    if (!input.storage) return false
    try {
      return input.storage.getItem(marker) !== null
    } catch {
      return false
    }
  }

  return {
    wasSettled,
    async recordOnce(): Promise<TrialActiveSubscriptionRecordOutcome> {
      if (!input.storage) return 'unavailable'
      if (inFlight || wasSettled()) return 'duplicate'
      inFlight = true
      try {
        input.storage.setItem(marker, 'pending')
      } catch {
        inFlight = false
        return 'unavailable'
      }

      let outcome: TrialActiveSubscriptionPersistence = 'ambiguous'
      try {
        outcome = await input.transport(TRIAL_ACTIVE_SUBSCRIPTION_CTA_VIEW_EVENT, input.metadata)
      } catch {
        outcome = 'ambiguous'
      }
      inFlight = false

      if (outcome === 'not_stored') {
        try {
          input.storage.removeItem(marker)
        } catch {
          // A marker that cannot be reopened stays fail-closed.
        }
        return outcome
      }
      try {
        input.storage.setItem(marker, outcome)
      } catch {
        // The pending marker is already terminal for this browser.
      }
      return outcome
    },
  }
}

export function createTrialActiveSubscriptionCtaDwellController(input: {
  qualifies: () => boolean
  onDwell: () => void
  setTimer?: (callback: () => void, delayMs: number) => TimerHandle
  clearTimer?: (timer: TimerHandle) => void
}) {
  const setTimer = input.setTimer ?? ((callback, delayMs) => setTimeout(callback, delayMs))
  const clearTimer = input.clearTimer ?? ((timer) => clearTimeout(timer))
  let timer: TimerHandle | null = null
  let complete = false
  let stopped = false

  const clear = () => {
    if (timer === null) return
    clearTimer(timer)
    timer = null
  }

  return {
    update() {
      clear()
      if (stopped || complete || !input.qualifies()) return
      timer = setTimer(() => {
        timer = null
        if (stopped || complete || !input.qualifies()) return
        complete = true
        input.onDwell()
      }, TRIAL_ACTIVE_SUBSCRIPTION_CTA_DWELL_MS)
    },
    reopen() {
      if (!stopped) complete = false
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
