'use client'

import Link from 'next/link'
import { useEffect, useRef } from 'react'
import { trackEvent } from '@/lib/analytics'
import { agencyPacksHref } from '@/lib/agencyDistribution'
import {
  ENTERPRISE_ALTERNATIVE_BUSINESS_PATH_VISIBLE_RATIO,
  createEnterpriseAlternativeBusinessEventRecorder,
  enterpriseAlternativeBusinessPathMarker,
  enterpriseAlternativeEntry,
  type EnterpriseAlternativeCompetitor,
} from '@/lib/growth/enterpriseAlternativeBusinessPath'

const eventRecorder = createEnterpriseAlternativeBusinessEventRecorder({
  read: (marker) => window.sessionStorage.getItem(marker),
  write: (marker, value) => window.sessionStorage.setItem(marker, value),
  send: (eventName, metadata) => trackEvent(eventName, metadata),
})

export default function EnterpriseAlternativeBusinessPath({
  competitor,
}: {
  competitor: EnterpriseAlternativeCompetitor
}) {
  const targetRef = useRef<HTMLElement | null>(null)
  const viewMarker = enterpriseAlternativeBusinessPathMarker('viewed', competitor)
  const clickMarker = enterpriseAlternativeBusinessPathMarker('clicked', competitor)
  const destination = agencyPacksHref(enterpriseAlternativeEntry(competitor))

  useEffect(() => {
    const target = targetRef.current
    if (!target || typeof IntersectionObserver === 'undefined') return
    if (eventRecorder.wasRecorded(viewMarker)) return

    let currentlyVisible = false
    let retries = 0
    let retryTimer: ReturnType<typeof setTimeout> | null = null

    const attemptView = () => {
      if (!currentlyVisible || eventRecorder.wasRecorded(viewMarker)) return
      void eventRecorder.record(
        viewMarker,
        'enterprise_alternative_business_path_viewed',
        competitor,
      ).then((stored) => {
        if (stored || eventRecorder.wasRecorded(viewMarker)) {
          observer.disconnect()
          return
        }
        if (currentlyVisible && retries < 1) {
          retries += 1
          retryTimer = setTimeout(attemptView, 1_500)
        }
      })
    }

    const observer = new IntersectionObserver((entries) => {
      const entry = entries[0]
      currentlyVisible = Boolean(
        entry?.isIntersecting &&
        entry.intersectionRatio >= ENTERPRISE_ALTERNATIVE_BUSINESS_PATH_VISIBLE_RATIO,
      )
      if (currentlyVisible) attemptView()
    }, { threshold: [ENTERPRISE_ALTERNATIVE_BUSINESS_PATH_VISIBLE_RATIO] })

    observer.observe(target)
    return () => {
      observer.disconnect()
      if (retryTimer) clearTimeout(retryTimer)
    }
  }, [competitor, viewMarker])

  return (
    <section
      ref={targetRef}
      aria-labelledby={`enterprise-alternative-business-path-${competitor}`}
      style={{
        marginTop: 14,
        border: '1px solid rgba(52,211,153,.3)',
        borderRadius: 16,
        padding: '18px 20px',
        background: 'linear-gradient(135deg, rgba(52,211,153,.08), rgba(41,151,255,.045))',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16,
      }}
    >
      <div style={{ flex: '1 1 390px', minWidth: 0 }}>
        <p style={{ margin: 0, color: '#6ee7b7', fontSize: '.7rem', fontWeight: 900, letterSpacing: '.11em', textTransform: 'uppercase' }}>
          For clients and business content
        </p>
        <h2
          id={`enterprise-alternative-business-path-${competitor}`}
          style={{ margin: '6px 0 0', color: '#f5f5f7', fontSize: '1.05rem', lineHeight: 1.35, fontWeight: 900 }}
        >
          Producing short-form for clients or one business?
        </h2>
        <p style={{ margin: '6px 0 0', color: '#9a9aa1', fontSize: '.86rem', lineHeight: 1.6 }}>
          Compare Kineo&apos;s existing one-time self-service packs for 10–50 Fast Shorts.
          They do not include a team workspace, avatar governance or a managed service.
        </p>
      </div>
      <Link
        href={destination}
        onClick={() => {
          void eventRecorder.record(
            clickMarker,
            'enterprise_alternative_business_path_clicked',
            competitor,
          )
        }}
        style={{
          flex: '0 1 auto',
          minHeight: 44,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '1px solid rgba(110,231,183,.72)',
          borderRadius: 999,
          padding: '11px 18px',
          color: '#a7f3d0',
          fontSize: '.86rem',
          fontWeight: 850,
          textAlign: 'center',
          textDecoration: 'none',
        }}
      >
        Compare business video packs →
      </Link>
    </section>
  )
}
