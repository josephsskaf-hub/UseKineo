import type { CheckoutResumeOffer } from '@/lib/checkoutResumeSurface'

export const CHECKOUT_RESUME_HUMAN_VIEW_VERSION =
  'checkout_resume_human_view_v1' as const
export const CHECKOUT_RESUME_CHOICE_VERSION =
  'resume_own_film_v2' as const
export const CHECKOUT_RESUME_VISIBLE_RATIO = 0.5 as const
export const CHECKOUT_RESUME_DWELL_MS = 1000 as const
export const CHECKOUT_RESUME_RETRY_DELAY_MS = 1500 as const

export type CheckoutResumePersistence = 'stored' | 'not_stored' | 'ambiguous'
export type CheckoutResumeRecordResult =
  | CheckoutResumePersistence
  | 'duplicate'
  | 'unavailable'

type MarkerStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>
type ExclusiveClaim = <T>(claimName: string, task: () => Promise<T>) => Promise<T>

export function checkoutResumeHumanViewMetadata(offer: CheckoutResumeOffer) {
  return {
    version: CHECKOUT_RESUME_HUMAN_VIEW_VERSION,
    surface: 'checkout_resume_banner',
    placement: 'global_fixed_bottom',
    actor_unit: 'authenticated_user',
    event_unit: 'resume_choice_human_view',
    resume_choice_version: CHECKOUT_RESUME_CHOICE_VERSION,
    dedupe_scope: 'browser_tab',
    tier: offer.tier,
    billing: offer.billing,
    currency: offer.currency.toLowerCase(),
    destination_kind: offer.destinationKind,
    checkout_origin: offer.planFit ? 'plan_fit_first_delivery' : 'standard',
    plan_fit_engine: offer.planFit?.engine ?? null,
    plan_fit_monthly_videos: offer.planFit?.monthlyVideos ?? null,
    plan_fit_seconds: offer.planFit?.seconds ?? null,
    plan_fit_selected_tier_matches: offer.planFit?.selectedTierMatches ?? null,
    visible_ratio: CHECKOUT_RESUME_VISIBLE_RATIO,
    continuous_visible_ms: CHECKOUT_RESUME_DWELL_MS,
    document_visible_required: true,
    two_choices_visible_required: true,
  } as const
}

export function checkoutResumeHumanViewOfferKey(
  offer: CheckoutResumeOffer,
  choiceVersion: string = CHECKOUT_RESUME_CHOICE_VERSION,
): string {
  return [
    choiceVersion,
    offer.tier,
    offer.billing,
    offer.currency.toLowerCase(),
    offer.destinationKind,
    offer.planFit?.engine ?? 'standard',
    offer.planFit?.monthlyVideos ?? '',
    offer.planFit?.seconds ?? '',
    offer.planFit?.selectedTierMatches ?? '',
  ].join(':')
}

export function checkoutResumeHumanViewMarker(
  offer: CheckoutResumeOffer,
  choiceVersion: string = CHECKOUT_RESUME_CHOICE_VERSION,
): string {
  return 'kineo:' + CHECKOUT_RESUME_HUMAN_VIEW_VERSION + ':viewed:' + checkoutResumeHumanViewOfferKey(offer, choiceVersion)
}

export function shouldDwellOnCheckoutResume(input: {
  rendered: boolean
  stalled: boolean
  checkoutPending: boolean
  isIntersecting: boolean
  intersectionRatio: number
  documentVisible: boolean
}): boolean {
  return input.rendered
    && !input.stalled
    && !input.checkoutPending
    && input.documentVisible
    && input.isIntersecting
    && input.intersectionRatio >= CHECKOUT_RESUME_VISIBLE_RATIO
}

export function shouldRecordCheckoutResumeAfterDwell(input: {
  expectedOfferKey: string
  currentOfferKey: string | null
  expectedPathname: string
  currentPathname: string
  currentPathHidden: boolean
  targetConnected: boolean
  targetStillCurrent: boolean
  stalled: boolean
  checkoutPending: boolean
  isIntersecting: boolean
  intersectionRatio: number
  documentVisible: boolean
}): boolean {
  return input.currentOfferKey === input.expectedOfferKey
    && input.currentPathname === input.expectedPathname
    && !input.currentPathHidden
    && input.targetConnected
    && input.targetStillCurrent
    && shouldDwellOnCheckoutResume({
      rendered: true,
      stalled: input.stalled,
      checkoutPending: input.checkoutPending,
      isIntersecting: input.isIntersecting,
      intersectionRatio: input.intersectionRatio,
      documentVisible: input.documentVisible,
    })
}

type DwellState = Parameters<typeof shouldDwellOnCheckoutResume>[0]

export function createCheckoutResumeDwellController(options: {
  onDwell: () => void
  setTimer: (callback: () => void, delayMs: number) => number
  clearTimer: (timerId: number) => void
  dwellMs?: number
}) {
  let state: DwellState = {
    rendered: false,
    stalled: false,
    checkoutPending: false,
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
  const qualifies = () => !stopped && shouldDwellOnCheckoutResume(state)
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
    }, options.dwellMs ?? CHECKOUT_RESUME_DWELL_MS)
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

export function createCheckoutResumeRecorder(options: {
  offer: CheckoutResumeOffer
  storage?: MarkerStorage | null
  withExclusiveClaim?: ExclusiveClaim | null
  transport: (
    eventName: 'checkout_resume_choice_viewed',
    metadata: ReturnType<typeof checkoutResumeHumanViewMetadata>,
  ) => Promise<CheckoutResumePersistence>
}) {
  const marker = checkoutResumeHumanViewMarker(options.offer)
  let inFlight = false
  let terminal = false

  const wasSettled = (): boolean => {
    if (terminal || inFlight) return true
    try {
      const state = options.storage?.getItem(marker)
      if (state !== 'stored' && state !== 'ambiguous') return false
      terminal = true
      return true
    } catch {
      return false
    }
  }

  const recordOnce = async (): Promise<CheckoutResumeRecordResult> => {
    if (wasSettled()) return 'duplicate'
    if (!options.storage || !options.withExclusiveClaim) return 'unavailable'

    const recordInsideClaim = async (): Promise<CheckoutResumeRecordResult> => {
      try {
        const state = options.storage?.getItem(marker)
        if (state === 'stored' || state === 'ambiguous') {
          terminal = true
          return 'duplicate'
        }
        options.storage?.setItem(marker, 'pending')
        if (options.storage?.getItem(marker) !== 'pending') return 'unavailable'
      } catch {
        return 'unavailable'
      }

      let outcome: CheckoutResumePersistence
      try {
        outcome = await options.transport(
          'checkout_resume_choice_viewed',
          checkoutResumeHumanViewMetadata(options.offer),
        )
      } catch {
        outcome = 'ambiguous'
      }

      if (outcome === 'not_stored') {
        try {
          if (options.storage?.getItem(marker) === 'pending') options.storage.removeItem(marker)
        } catch {
          // One bounded in-memory retry remains available to the caller.
        }
        return outcome
      }

      terminal = true
      try {
        options.storage?.setItem(marker, outcome)
      } catch {
        // In-memory terminal state protects this uninterrupted mount.
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
