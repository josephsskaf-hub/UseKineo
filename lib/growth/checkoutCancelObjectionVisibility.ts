export const CHECKOUT_CANCEL_OBJECTION_VERSION =
  'checkout_cancel_objection_visibility_v1' as const
export const CHECKOUT_CANCEL_OBJECTION_TARGET_ID =
  'checkout-cancel-objection-box' as const
export const CHECKOUT_CANCEL_OBJECTION_VISIBLE_RATIO = 0.5 as const

export type CheckoutCancelObjectionTier = 'starter' | 'basic' | 'pro' | 'autopilot'
export type CheckoutCancelObjectionBilling = 'monthly' | 'annual'
export type CheckoutCancelObjectionProduct =
  | 'self_serve'
  | 'autopilot_subscription'
  | 'autopilot_pilot'

export type CheckoutCancelObjectionContext = {
  tier: CheckoutCancelObjectionTier
  billing: CheckoutCancelObjectionBilling
  checkoutProduct: CheckoutCancelObjectionProduct
  downshiftAvailable: boolean
}

export type ClosedEventPersistence = 'stored' | 'not_stored' | 'ambiguous'
export type CheckoutCancelObjectionRecordResult =
  | ClosedEventPersistence
  | 'duplicate'
  | 'unavailable'

type MarkerStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

type RecorderOptions = {
  storage?: MarkerStorage | null
  transport: (
    eventName: 'checkout_cancel_objection_viewed',
    metadata: Record<string, unknown>,
  ) => Promise<ClosedEventPersistence>
}

export function checkoutCancelObjectionMetadata(
  context: CheckoutCancelObjectionContext,
): Record<string, unknown> {
  return {
    version: CHECKOUT_CANCEL_OBJECTION_VERSION,
    surface: 'checkout_cancelled',
    tier: context.tier,
    billing: context.billing,
    checkout_product: context.checkoutProduct,
    downshift_available: context.downshiftAvailable,
  }
}

export function checkoutCancelObjectionMarker(
  context: CheckoutCancelObjectionContext,
): string {
  return [
    'kineo',
    CHECKOUT_CANCEL_OBJECTION_VERSION,
    'view',
    context.tier,
    context.billing,
    context.checkoutProduct,
    context.downshiftAvailable ? 'downshift' : 'no-downshift',
  ].join(':')
}

export function shouldSampleCheckoutCancelObjection(input: {
  active: boolean
  reasonChosen: boolean
  isIntersecting: boolean
  intersectionRatio: number
  documentVisible: boolean
}): boolean {
  return input.active
    && !input.reasonChosen
    && input.documentVisible
    && input.isIntersecting
    && input.intersectionRatio >= CHECKOUT_CANCEL_OBJECTION_VISIBLE_RATIO
}

export function createCheckoutCancelObjectionLifecycle() {
  let stopped = false

  return {
    stop() {
      stopped = true
    },
    canContinue() {
      return !stopped
    },
    shouldRetry(outcome: CheckoutCancelObjectionRecordResult) {
      return !stopped && outcome === 'not_stored'
    },
  }
}

export function createCheckoutCancelObjectionRecorder({ storage, transport }: RecorderOptions) {
  const inFlight = new Set<string>()
  const terminal = new Set<string>()

  const wasSettled = (marker: string): boolean => {
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
    context: CheckoutCancelObjectionContext,
  ): Promise<CheckoutCancelObjectionRecordResult> => {
    const marker = checkoutCancelObjectionMarker(context)
    if (wasSettled(marker)) return 'duplicate'
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
        'checkout_cancel_objection_viewed',
        checkoutCancelObjectionMetadata(context),
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
        // The claim is already unavailable; a caller may retry once in memory.
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
  }

  return { recordOnce, wasSettled }
}
