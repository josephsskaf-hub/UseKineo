'use client'

import { useEffect } from 'react'
import { trackClosedEvent } from '@/lib/analytics'
import {
  CLIPPING_EARN_ANGLE_CLICK_MARKER,
  CLIPPING_EARN_ANGLE_TARGET_ID,
  CLIPPING_EARN_ANGLE_VIEW_MARKER,
  CLIPPING_EARN_ANGLE_VISIBLE_RATIO,
  createClippingEarnAngleRecorder,
  isClippingEarnAngleDestination,
  shouldSampleClippingEarnAngleView,
} from '@/lib/growth/clippingEarnAngleCta'

const RETRY_DELAY_MS = 1500

export default function ClippingEarnAngleTelemetry() {
  useEffect(() => {
    const target = document.getElementById(CLIPPING_EARN_ANGLE_TARGET_ID)
    if (!target) return

    let storage: Storage | null = null
    try {
      storage = window.sessionStorage
    } catch {
      // Without a reliable session unit, fail closed instead of storing noise.
    }
    if (!storage) return

    const recorder = createClippingEarnAngleRecorder({
      storage,
      transport: (eventName, metadata) => trackClosedEvent(eventName, metadata),
    })

    let observer: IntersectionObserver | null = null
    let retryTimer: number | null = null
    let retryScheduled = false
    let visible = false

    const clearRetry = () => {
      if (retryTimer !== null) window.clearTimeout(retryTimer)
      retryTimer = null
    }

    const attemptView = () => {
      if (!visible || document.visibilityState === 'hidden') return
      void recorder
        .recordOnce(CLIPPING_EARN_ANGLE_VIEW_MARKER, 'clipping_earn_angle_cta_viewed')
        .then((result) => {
          if (result !== 'not_stored') {
            clearRetry()
            observer?.disconnect()
            return
          }
          if (retryScheduled) return
          retryScheduled = true
          retryTimer = window.setTimeout(() => {
            retryTimer = null
            attemptView()
          }, RETRY_DELAY_MS)
        })
    }

    const handleClick = (event: Event) => {
      const element = event.target instanceof Element ? event.target : null
      const anchor = element?.closest('a[href]')
      if (!anchor || !target.contains(anchor)) return
      if (!isClippingEarnAngleDestination(anchor.getAttribute('href'))) return
      void recorder.recordOnce(
        CLIPPING_EARN_ANGLE_CLICK_MARKER,
        'clipping_earn_angle_cta_clicked',
      )
    }

    target.addEventListener('click', handleClick)

    if (
      typeof IntersectionObserver !== 'undefined'
      && !recorder.wasSettled(CLIPPING_EARN_ANGLE_VIEW_MARKER)
    ) {
      observer = new IntersectionObserver((entries) => {
        const entry = entries[0]
        visible = shouldSampleClippingEarnAngleView({
          isIntersecting: Boolean(entry?.isIntersecting),
          intersectionRatio: entry?.intersectionRatio ?? 0,
          documentVisible: document.visibilityState !== 'hidden',
        })
        if (!visible) {
          clearRetry()
          return
        }
        attemptView()
      }, { threshold: [CLIPPING_EARN_ANGLE_VISIBLE_RATIO] })
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
      clearRetry()
      observer?.disconnect()
      target.removeEventListener('click', handleClick)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [])

  return null
}
