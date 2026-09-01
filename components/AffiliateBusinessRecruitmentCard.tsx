'use client'

import Link from 'next/link'
import { useEffect, useRef } from 'react'
import { trackEvent } from '@/lib/analytics'
import {
  AFFILIATE_BUSINESS_RECRUITMENT_CLICK_MARKER,
  AFFILIATE_BUSINESS_RECRUITMENT_PLACEMENT,
  AFFILIATE_BUSINESS_RECRUITMENT_VERSION,
  AFFILIATE_BUSINESS_RECRUITMENT_VIEW_MARKER,
  AFFILIATE_BUSINESS_RECRUITMENT_VISIBLE_RATIO,
  affiliateBusinessRecruitmentMetadata,
  isAffiliateBusinessRecruitmentMeasurementHost,
} from '@/lib/growth/affiliateBusinessRecruitment'

type Props = {
  href: string
}

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
    // Privacy mode may deny storage. The in-memory latch still protects a mount.
  }
  return false
}

async function recordOnce(marker: string, eventName: string): Promise<boolean> {
  if (wasRecorded(marker) || inFlight.has(marker)) return false
  inFlight.add(marker)
  const stored = await trackEvent(eventName, affiliateBusinessRecruitmentMetadata())
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

export default function AffiliateBusinessRecruitmentCard({ href }: Props) {
  const cardRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const card = cardRef.current
    if (!card || typeof IntersectionObserver === 'undefined') return
    if (!isAffiliateBusinessRecruitmentMeasurementHost(window.location.hostname)) return
    if (wasRecorded(AFFILIATE_BUSINESS_RECRUITMENT_VIEW_MARKER)) return

    const observer = new IntersectionObserver((entries) => {
      const entry = entries[0]
      if (!entry?.isIntersecting || entry.intersectionRatio < AFFILIATE_BUSINESS_RECRUITMENT_VISIBLE_RATIO) return
      void recordOnce(
        AFFILIATE_BUSINESS_RECRUITMENT_VIEW_MARKER,
        'affiliate_business_recruitment_viewed',
      ).then((stored) => {
        if (stored || wasRecorded(AFFILIATE_BUSINESS_RECRUITMENT_VIEW_MARKER)) observer.disconnect()
      })
    }, { threshold: [AFFILIATE_BUSINESS_RECRUITMENT_VISIBLE_RATIO] })

    observer.observe(card)
    return () => observer.disconnect()
  }, [])

  return (
    <div
      ref={cardRef}
      data-experiment={AFFILIATE_BUSINESS_RECRUITMENT_VERSION}
      style={{
        background: 'linear-gradient(145deg,rgba(41,151,255,.13),rgba(11,17,32,.9))',
        border: '1px solid rgba(41,151,255,.34)',
        borderRadius: 14,
        padding: 17,
      }}
    >
      <div style={{ color: '#7cc0ff', fontWeight: 900, marginBottom: 6 }}>
        Businesses &amp; freelancers
      </div>
      <p style={{ margin: 0, color: '#a4a4aa', fontSize: '0.84rem', lineHeight: 1.55 }}>
        Send business owners, freelancers and agencies to a free weekly content plan before they choose a video workflow.
      </p>
      <Link
        href={href}
        onClick={() => {
          if (!isAffiliateBusinessRecruitmentMeasurementHost(window.location.hostname)) return
          void recordOnce(
            AFFILIATE_BUSINESS_RECRUITMENT_CLICK_MARKER,
            'affiliate_business_recruitment_clicked',
          )
          void trackEvent('organic_cta_clicked', {
            source: 'partners',
            placement: AFFILIATE_BUSINESS_RECRUITMENT_PLACEMENT,
            destination: '/affiliate',
          })
        }}
        style={{
          display: 'inline-block',
          marginTop: 13,
          color: '#7cc0ff',
          fontSize: '0.8rem',
          fontWeight: 900,
          textDecoration: 'none',
        }}
      >
        Apply and get the business campaign →
      </Link>
    </div>
  )
}
