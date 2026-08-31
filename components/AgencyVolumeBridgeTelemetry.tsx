'use client'

import Link from 'next/link'
import { useEffect } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import type { AgencyDistributionEntry } from '@/lib/agencyDistribution'
import { trackEvent } from '@/lib/analytics'
import {
  AGENCY_BRIDGE_VISIBLE_RATIO,
  agencyBridgeTelemetryMetadata,
  agencyBridgeViewMarker,
} from '@/lib/growth/agencyBridgeTelemetry'

type ImpressionProps = {
  entry: AgencyDistributionEntry
  targetId: string
}

const pendingViews = new Set<string>()
const recordedViews = new Set<string>()

export function AgencyVolumeBridgeImpression({ entry, targetId }: ImpressionProps) {
  useEffect(() => {
    const marker = agencyBridgeViewMarker(entry)
    const target = document.getElementById(targetId)
    if (!target || typeof IntersectionObserver === 'undefined') return

    try {
      if (sessionStorage.getItem(marker) === '1') recordedViews.add(marker)
    } catch {
      // Privacy mode may disable storage. Measurement must never hide the CTA.
    }
    if (recordedViews.has(marker) || pendingViews.has(marker)) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((item) =>
          item.isIntersecting && item.intersectionRatio >= AGENCY_BRIDGE_VISIBLE_RATIO
        )) return
        observer.disconnect()
        if (recordedViews.has(marker) || pendingViews.has(marker)) return

        pendingViews.add(marker)
        void trackEvent(
          'agency_volume_bridge_viewed',
          agencyBridgeTelemetryMetadata(entry),
        ).then((stored) => {
          pendingViews.delete(marker)
          if (!stored) return
          recordedViews.add(marker)
          try {
            sessionStorage.setItem(marker, '1')
          } catch {
            // In-memory dedupe still protects this mounted page.
          }
        })
      },
      { threshold: [AGENCY_BRIDGE_VISIBLE_RATIO] },
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
        void trackEvent(
          'agency_volume_bridge_clicked',
          agencyBridgeTelemetryMetadata(entry),
        )
      }}
    >
      {children}
    </Link>
  )
}
