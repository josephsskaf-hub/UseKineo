'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { trackEvent } from '@/lib/analytics'
import {
  RECOMMENDED_AFFILIATE_DESTINATION,
} from '@/lib/affiliateDestinations'
import {
  buildAffiliateFirstClickOffer,
  type AffiliateFirstClickOffer,
  type AffiliateFirstClickPayload,
} from '@/lib/affiliateFirstClick'

const FIRST_CLICK_PATHS = new Set(['/studio', '/history'])

export default function AffiliateFirstClickNudge({
  pathname,
  isLoggedIn,
}: {
  pathname: string
  isLoggedIn: boolean
}) {
  const [offer, setOffer] = useState<AffiliateFirstClickOffer | null>(null)
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>('idle')
  const viewed = useRef(false)
  const eligiblePath = FIRST_CLICK_PATHS.has(pathname)

  useEffect(() => {
    if (!isLoggedIn || !eligiblePath) {
      setOffer(null)
      return
    }

    let cancelled = false
    fetch('/api/affiliate/me', { cache: 'no-store' })
      .then((response) => (response.ok ? response.json() : null))
      .then((payload: AffiliateFirstClickPayload | null) => {
        if (!cancelled) setOffer(buildAffiliateFirstClickOffer(payload))
      })
      .catch(() => {
        // A Growth nudge must never interfere with the creator workspace.
        if (!cancelled) setOffer(null)
      })

    return () => {
      cancelled = true
    }
  }, [eligiblePath, isLoggedIn])

  useEffect(() => {
    if (!offer || viewed.current) return
    viewed.current = true
    void trackEvent('affiliate_first_click_nudge_viewed', {
      source: pathname === '/history' ? 'history' : 'creator_hub',
      destination: RECOMMENDED_AFFILIATE_DESTINATION,
      link_visits: 0,
    })
  }, [offer, pathname])

  if (!offer) return null
  const readyCaption = offer.caption

  async function copyReadyPost() {
    try {
      await navigator.clipboard.writeText(readyCaption)
      setCopyState('copied')
      void trackEvent('affiliate_first_click_nudge_copied', {
        source: pathname === '/history' ? 'history' : 'creator_hub',
        destination: RECOMMENDED_AFFILIATE_DESTINATION,
        link_visits: 0,
      })
    } catch {
      setCopyState('failed')
    }
  }

  return (
    <div className="px-4 sm:px-6 pt-4 max-w-6xl mx-auto">
      <section
        aria-label="Get the first visit to your affiliate link"
        className="rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
        style={{
          background: 'linear-gradient(135deg, rgba(41,151,255,.14), rgba(16,185,129,.07))',
          border: '1px solid rgba(41,151,255,.38)',
          boxShadow: '0 10px 30px rgba(41,151,255,.08)',
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div className="text-[10px] font-black uppercase tracking-[.16em] mb-1.5" style={{ color: '#7cc0ff' }}>
            First-click mission · 0 link visits
          </div>
          <h2 className="font-black tracking-tight mb-1" style={{ color: 'var(--text)', fontSize: '1rem' }}>
            Your partner link is live. Put it in front of one real person.
          </h2>
          <p className="text-xs leading-relaxed" style={{ color: 'var(--muted2)', margin: 0, maxWidth: 690 }}>
            We prepared the post and attached your tracking link. Copy it, paste it where creators already ask about AI video, and your dashboard will record the first eligible visit.
          </p>
          <div className="mt-2 text-[11px] font-bold" aria-live="polite" style={{ color: copyState === 'failed' ? '#fca5a5' : '#86efac' }}>
            {copyState === 'copied' ? '✓ Ready to paste — your personal link is included.' : null}
            {copyState === 'failed' ? 'Clipboard was blocked. Open the partner kit to copy it there.' : null}
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 flex-shrink-0">
          <button
            type="button"
            onClick={() => void copyReadyPost()}
            className="rounded-xl px-4 py-2.5 text-sm font-black text-white"
            style={{ background: '#2997ff', border: 0, cursor: 'pointer', whiteSpace: 'nowrap' }}
          >
            {copyState === 'copied' ? '✓ Post copied' : 'Copy ready post'}
          </button>
          <Link
            href="/affiliate#partner-campaign-kit"
            onClick={() => {
              void trackEvent('affiliate_first_click_nudge_opened', {
                source: pathname === '/history' ? 'history' : 'creator_hub',
                link_visits: 0,
              })
            }}
            className="rounded-xl px-4 py-2.5 text-sm font-black text-center"
            style={{ color: '#7cc0ff', border: '1px solid rgba(124,192,255,.38)', textDecoration: 'none', whiteSpace: 'nowrap' }}
          >
            Open partner kit →
          </Link>
        </div>
      </section>
    </div>
  )
}
