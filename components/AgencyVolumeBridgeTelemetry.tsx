'use client'

import Link from 'next/link'
import { useEffect } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import type { AgencyDistributionEntry } from '@/lib/agencyDistribution'
import { trackEvent } from '@/lib/analytics'
import {
  HOME_B2B_BRIDGE_VISIBLE_RATIO,
  homeB2bBridgeMetadata,
  homeB2bBridgeViewMarker,
} from '@/lib/growth/homeB2bBridgeVisibility'

type TelemetryProps = {
  entry: AgencyDistributionEntry
  targetId: string
}

const pendingViews = new Set<string>()

export function AgencyVolumeBridgeImpression({ entry, targetId }: TelemetryProps) {
  useEffect(() => {
    const metadata = homeB2bBridgeMetadata(entry)
    const marker = homeB2bBridgeViewMarker(entry)
    const target = document.getElementById(targetId)
    if (!metadata || !marker || !target || typeof IntersectionObserver === 'undefined') return

    try {
      if (sessionStorage.getItem(marker) === '1' || pendingViews.has(marker)) return
    } catch {
      // Privacy mode may disable storage. Measurement must never hide the CTA.
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((item) => item.isIntersecting && item.intersectionRatio >= HOME_B2B_BRIDGE_VISIBLE_RATIO)) return
        observer.disconnect()

        try {
          if (sessionStorage.getItem(marker) === '1' || pendingViews.has(marker)) return
        } catch {
          // Continue failure-isolated: the link and page remain fully usable.
        }

        // The in-memory guard closes the remount race without leaving a stale
        // pending marker in sessionStorage if the browser closes mid-request.
        pendingViews.add(marker)

        void trackEvent('agency_volume_bridge_viewed', metadata).then((stored) => {
          pendingViews.delete(marker)
          try {
            if (stored) sessionStorage.setItem(marker, '1')
          } catch {
            // Analytics storage is optional; navigation is not.
          }
        })
      },
      { threshold: [HOME_B2B_BRIDGE_VISIBLE_RATIO] },
    )

    observer.observe(target)
    return () => observer.disconnect()
  }, [entry, targetId])

  return null
}

type LinkProps = {
  entry: AgencyDistributionEntry
  href: string
  children: ReactNode
  style?: CSSProperties
}

export function AgencyVolumeBridgeLink({ entry, href, children, style }: LinkProps) {
  return (
    <Link
      href={href}
      style={style}
      onClick={() => {
        const metadata = homeB2bBridgeMetadata(entry)
        if (metadata) void trackEvent('agency_volume_bridge_clicked', metadata)
      }}
    >
      {children}
    </Link>
  )
}
