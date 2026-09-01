'use client'

import { useEffect } from 'react'
import { trackClosedEvent } from '@/lib/analytics'
import {
  CHECKOUT_CANCEL_OBJECTION_TARGET_ID,
  CHECKOUT_CANCEL_OBJECTION_VISIBLE_RATIO,
  checkoutCancelObjectionMarker,
  createCheckoutCancelObjectionLifecycle,
  createCheckoutCancelObjectionRecorder,
  shouldSampleCheckoutCancelObjection,
  type CheckoutCancelObjectionContext,
} from '@/lib/growth/checkoutCancelObjectionVisibility'

const RETRY_DELAY_MS = 1500

type Props = CheckoutCancelObjectionContext & {
  active: boolean
}

export default function CheckoutCancelObjectionTelemetry({
  active,
  tier,
  billing,
  checkoutProduct,
  downshiftAvailable,
}: Props) {
  useEffect(() => {
    if (!active) return

    const target = document.getElementById(CHECKOUT_CANCEL_OBJECTION_TARGET_ID)
    if (!target) return

    let storage: Storage | null = null
    try {
      storage = window.sessionStorage
    } catch {
      // The experiment is session-based, so missing storage fails closed.
    }
    if (!storage) return

    const context: CheckoutCancelObjectionContext = {
      tier,
      billing,
      checkoutProduct,
      downshiftAvailable,
    }
    const marker = checkoutCancelObjectionMarker(context)
    const lifecycle = createCheckoutCancelObjectionLifecycle()
    const recorder = createCheckoutCancelObjectionRecorder({
      storage,
      transport: (eventName, metadata) => trackClosedEvent(eventName, metadata),
    })

    let observer: IntersectionObserver | null = null
    let retryTimer: number | null = null
    let retryScheduled = false
    let intersectingAtThreshold = false
    let reasonChosen = false

    const clearRetry = () => {
      if (retryTimer !== null) window.clearTimeout(retryTimer)
      retryTimer = null
    }

    const stopAfterChoice = () => {
      lifecycle.stop()
      reasonChosen = true
      intersectingAtThreshold = false
      clearRetry()
      observer?.disconnect()
    }

    const attemptView = () => {
      if (!lifecycle.canContinue() || !shouldSampleCheckoutCancelObjection({
        active,
        reasonChosen,
        isIntersecting: intersectingAtThreshold,
        intersectionRatio: intersectingAtThreshold
          ? CHECKOUT_CANCEL_OBJECTION_VISIBLE_RATIO
          : 0,
        documentVisible: document.visibilityState !== 'hidden',
      })) return

      void recorder.recordOnce(context).then((result) => {
        if (!lifecycle.canContinue()) return
        if (result !== 'not_stored') {
          clearRetry()
          observer?.disconnect()
          return
        }
        if (retryScheduled || reasonChosen || !lifecycle.shouldRetry(result)) return
        retryScheduled = true
        retryTimer = window.setTimeout(() => {
          retryTimer = null
          attemptView()
        }, RETRY_DELAY_MS)
      })
    }

    const handleReasonChoice = (event: Event) => {
      const element = event.target instanceof Element ? event.target : null
      const button = element?.closest('button[data-checkout-cancel-reason]')
      if (!button || !target.contains(button)) return
      stopAfterChoice()
    }

    target.addEventListener('click', handleReasonChoice, true)

    if (
      typeof IntersectionObserver !== 'undefined'
      && !recorder.wasSettled(marker)
    ) {
      observer = new IntersectionObserver((entries) => {
        const entry = entries[0]
        intersectingAtThreshold = Boolean(entry?.isIntersecting)
          && (entry?.intersectionRatio ?? 0) >= CHECKOUT_CANCEL_OBJECTION_VISIBLE_RATIO
        if (!intersectingAtThreshold) {
          clearRetry()
          return
        }
        attemptView()
      }, { threshold: [CHECKOUT_CANCEL_OBJECTION_VISIBLE_RATIO] })
      observer.observe(target)
    }

    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') {
        clearRetry()
        return
      }
      attemptView()
    }
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      lifecycle.stop()
      intersectingAtThreshold = false
      clearRetry()
      observer?.disconnect()
      target.removeEventListener('click', handleReasonChoice, true)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [active, tier, billing, checkoutProduct, downshiftAvailable])

  return null
}
