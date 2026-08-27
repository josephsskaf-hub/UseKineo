'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { trackEvent } from '@/lib/analytics'
import {
  normalizeAffiliateActivationState,
  type AffiliateActivationState,
} from '@/lib/affiliateActivation'

export default function AffiliateMomentumCard({ completedVideoCount }: { completedVideoCount: number }) {
  const [state, setState] = useState<AffiliateActivationState | null>(null)
  const tracked = useRef(false)

  useEffect(() => {
    if (completedVideoCount < 2) return
    let cancelled = false
    fetch('/api/affiliate/me', { cache: 'no-store' })
      .then((response) => (response.ok ? response.json() : null))
      .then((payload) => {
        if (!cancelled) setState(normalizeAffiliateActivationState(payload))
      })
      .catch(() => {
        // Growth UI must never interfere with the creator's video library.
      })
    return () => { cancelled = true }
  }, [completedVideoCount])

  useEffect(() => {
    if (!state || state === 'pending' || state === 'suspended' || tracked.current) return
    tracked.current = true
    void trackEvent('affiliate_momentum_card_viewed', {
      source: 'history_paid_repeat_creator',
      affiliate_state: state,
      completed_video_count: completedVideoCount,
    })
  }, [completedVideoCount, state])

  if (!state || state === 'pending' || state === 'suspended') return null

  const active = state === 'active'
  return (
    <section
      aria-label={active ? 'Share your Kineo affiliate link' : 'Activate your Kineo affiliate link'}
      className="rounded-2xl p-5 sm:p-6 mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      style={{
        background: 'linear-gradient(135deg, rgba(16,185,129,.13), rgba(41,151,255,.05))',
        border: '1px solid rgba(52,211,153,.38)',
        boxShadow: '0 10px 32px rgba(16,185,129,.08)',
      }}
    >
      <div style={{ minWidth: 0 }}>
        <div
          className="font-black uppercase tracking-[.16em] mb-1.5"
          style={{ fontSize: '0.62rem', color: '#34d399' }}
        >
          {completedVideoCount} videos complete · creator momentum
        </div>
        <h2 className="font-black tracking-tight mb-1.5" style={{ color: 'var(--text)', fontSize: '1.05rem' }}>
          {active ? 'Your partner link is ready to share' : 'Turn your Kineo experience into recurring commission'}
        </h2>
        <p className="text-xs leading-relaxed" style={{ color: 'var(--muted2)', margin: 0, maxWidth: 650 }}>
          {active
            ? 'Send people to the free script generator with your link. Eligible subscription payments stay credited to you while the customer remains subscribed.'
            : 'You have real output to show now. Activate a partner link, send people to a useful free script tool, and earn 40% on eligible subscription payments you refer.'}
        </p>
      </div>
      <Link
        href="/affiliate"
        onClick={() => {
          void trackEvent('affiliate_momentum_card_clicked', {
            source: 'history_paid_repeat_creator',
            affiliate_state: state,
            completed_video_count: completedVideoCount,
          })
        }}
        className="flex items-center justify-center rounded-xl px-5 py-3 text-sm font-black flex-shrink-0"
        style={{
          color: '#04110c',
          background: '#34d399',
          textDecoration: 'none',
          boxShadow: '0 6px 22px rgba(16,185,129,.24)',
        }}
      >
        {active ? 'Open my partner kit →' : 'Activate my partner link →'}
      </Link>
    </section>
  )
}
