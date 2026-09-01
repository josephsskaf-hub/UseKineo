import type { CheckoutPlanTier } from '@/lib/checkoutPricing'

export const CHECKOUT_CANCEL_OBJECTION_VIEW_EVENT = 'checkout_cancel_objection_viewed' as const
export const CHECKOUT_CANCEL_OBJECTION_VERSION = 'checkout_cancel_objection_visibility_v1' as const
export const CHECKOUT_CANCEL_OBJECTION_VISIBLE_RATIO = 0.5

export type CheckoutCancelProduct = 'self_serve' | 'monthly' | 'pilot'
export type CheckoutCancelBilling = 'monthly' | 'annual'
export type CheckoutCancelReason = 'too_expensive' | 'which_plan' | 'had_questions' | 'just_looking'
export type CheckoutCancelledPrimary = 'checking' | 'first_delivery' | 'checkout'

type CheckoutCancelObjectionContext = {
  tier: CheckoutPlanTier
  billing: CheckoutCancelBilling
  checkoutProduct: CheckoutCancelProduct
  hasDownshift: boolean
  hasPlanFitContext: boolean
  returnToWatermark: boolean
}

export function isCheckoutCancelObjectionVisible(
  entry: Pick<IntersectionObserverEntry, 'isIntersecting' | 'intersectionRatio'> | null | undefined,
): boolean {
  return Boolean(
    entry?.isIntersecting
      && entry.intersectionRatio >= CHECKOUT_CANCEL_OBJECTION_VISIBLE_RATIO,
  )
}

export function shouldObserveCheckoutCancelObjection(input: {
  primary: CheckoutCancelledPrimary
  answered: boolean
}): boolean {
  return input.primary === 'checkout' && !input.answered
}

export function shouldRecordCheckoutCancelObjectionView(input: {
  primary: CheckoutCancelledPrimary
  answered: boolean
  entry: Pick<IntersectionObserverEntry, 'isIntersecting' | 'intersectionRatio'> | null | undefined
}): boolean {
  return shouldObserveCheckoutCancelObjection(input)
    && isCheckoutCancelObjectionVisible(input.entry)
}

export function checkoutCancelObjectionStorageKey(
  context: Pick<CheckoutCancelObjectionContext, 'tier' | 'billing' | 'checkoutProduct'>,
): string {
  return [
    'kineo',
    CHECKOUT_CANCEL_OBJECTION_VERSION,
    context.checkoutProduct,
    context.tier,
    context.billing,
  ].join(':')
}

export function buildCheckoutCancelObjectionMetadata(context: CheckoutCancelObjectionContext) {
  return {
    event_unit: 'checkout_cancel_objection_surface',
    identity_resolution: 'user_id_else_session_id',
    version: CHECKOUT_CANCEL_OBJECTION_VERSION,
    visible_ratio: CHECKOUT_CANCEL_OBJECTION_VISIBLE_RATIO,
    tier: context.tier,
    billing: context.billing,
    checkout_product: context.checkoutProduct,
    has_downshift: context.hasDownshift,
    has_plan_fit_context: context.hasPlanFitContext,
    return_to_watermark: context.returnToWatermark,
  } as const
}

export function buildCheckoutCancelReasonMetadata(
  context: CheckoutCancelObjectionContext,
  reason: CheckoutCancelReason,
) {
  return {
    version: CHECKOUT_CANCEL_OBJECTION_VERSION,
    tier: context.tier,
    billing: context.billing,
    checkout_product: context.checkoutProduct,
    reason,
    has_downshift: context.hasDownshift,
    has_plan_fit_context: context.hasPlanFitContext,
    return_to_watermark: context.returnToWatermark,
  } as const
}

type CheckoutCancelObjectionRecorderDependencies = {
  hasStoredView: () => boolean
  markViewStored: () => void
  recordView: () => Promise<boolean>
  recordReason: (reason: CheckoutCancelReason) => Promise<boolean>
}

/**
 * Owns the causal ordering for the checkout-cancel objection denominator.
 * A click is stronger evidence than a viewport impression, so once a reason
 * is selected no later view may start. If a view is already in flight, the
 * reason waits for it to settle before its own event is sent.
 */
export function createCheckoutCancelObjectionRecorder(
  dependencies: CheckoutCancelObjectionRecorderDependencies,
) {
  let viewStored = false
  let viewInFlight: Promise<boolean> | null = null
  let reasonSelected = false

  const hasStoredView = () => {
    if (viewStored) return true
    try {
      viewStored = dependencies.hasStoredView()
    } catch {
      // Storage is only a cross-remount optimization. In-memory state remains.
    }
    return viewStored
  }

  return {
    isViewTerminal(): boolean {
      return reasonSelected || hasStoredView()
    },

    recordView(): Promise<boolean> {
      if (reasonSelected || hasStoredView()) return Promise.resolve(false)
      if (viewInFlight) return viewInFlight

      const current = Promise.resolve()
        .then(dependencies.recordView)
        .catch(() => false)
        .then((stored) => {
          if (!stored) return false
          viewStored = true
          try { dependencies.markViewStored() } catch { /* in-memory latch remains */ }
          return true
        })
        .finally(() => {
          if (viewInFlight === current) viewInFlight = null
        })
      viewInFlight = current
      return current
    },

    async recordReason(reason: CheckoutCancelReason): Promise<boolean> {
      if (reasonSelected) return false
      reasonSelected = true
      if (viewInFlight) await viewInFlight
      try {
        return await dependencies.recordReason(reason)
      } catch {
        return false
      }
    },
  }
}
