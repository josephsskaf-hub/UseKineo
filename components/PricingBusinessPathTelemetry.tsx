'use client'

import { useEffect } from 'react'
import { trackEvent } from '@/lib/analytics'
import {
  PRICING_BUSINESS_PATH_CLICK_MARKER,
  PRICING_BUSINESS_PATH_TARGET_ID,
  PRICING_BUSINESS_PATH_VIEW_MARKER,
  isPricingBusinessPathDestination,
  pricingBusinessPathMetadata,
} from '@/lib/growth/pricingBusinessPath'

const VIEW_THRESHOLD = 0.5
const inFlight = new Set<string>()
const recorded = new Set<string>()

function wasRecorded(marker: string): boolean {
  if (recorded.has(marker)) return true
  try {
    if (window.sessionStorage.getItem(marker) === '1') {
      recorded.add(marker)
      return true
    }
  } catch {
    // Privacy modes may deny sessionStorage. The in-memory latch still works.
  }
  return false
}

async function recordOnce(marker: string, eventName: string): Promise<boolean> {
  if (wasRecorded(marker) || inFlight.has(marker)) return false
  inFlight.add(marker)
  const stored = await trackEvent(eventName, pricingBusinessPathMetadata())
  inFlight.delete(marker)
  if (!stored) return false
  recorded.add(marker)
  try {
    window.sessionStorage.setItem(marker, '1')
  } catch {
    // A successful event remains latched in memory for this page lifetime.
  }
  return true
}

export default function PricingBusinessPathTelemetry() {
  useEffect(() => {
    const target = document.getElementById(PRICING_BUSINESS_PATH_TARGET_ID)
    if (!target) return

    const handleClick = (event: Event) => {
      const element = event.target instanceof Element ? event.target : null
      const anchor = element?.closest('a[href]')
      if (!anchor || !target.contains(anchor)) return
      if (!isPricingBusinessPathDestination(anchor.getAttribute('href'))) return
      void recordOnce(PRICING_BUSINESS_PATH_CLICK_MARKER, 'pricing_business_path_clicked')
    }
    target.addEventListener('click', handleClick)

    if (typeof IntersectionObserver === 'undefined' || wasRecorded(PRICING_BUSINESS_PATH_VIEW_MARKER)) {
      return () => target.removeEventListener('click', handleClick)
    }

    const observer = new IntersectionObserver((entries) => {
      const entry = entries[0]
      if (!entry?.isIntersecting || entry.intersectionRatio < VIEW_THRESHOLD) return
      void recordOnce(PRICING_BUSINESS_PATH_VIEW_MARKER, 'pricing_business_path_viewed')
        .then((stored) => {
          if (stored || wasRecorded(PRICING_BUSINESS_PATH_VIEW_MARKER)) observer.disconnect()
        })
    }, { threshold: [VIEW_THRESHOLD] })

    observer.observe(target)
    return () => {
      observer.disconnect()
      target.removeEventListener('click', handleClick)
    }
  }, [])

  return null
}
