'use client'

// KINEO-LOWCREDITS-UPSELL-2026-07-08 — "running low → go monthly" upsell banner.
//
// When a NON-subscriber is almost out of videos (video_credits <= 5), show a slim
// banner pushing the $9.90/mo Starter subscription. This captures one-time pack
// buyers (has_paid=true but plan='free') AND low-balance free users at the exact
// moment they most want more videos, converting them into recurring subscribers.
//
// GATE (all must be true):
//   • credits <= 5
//   • NOT an active subscriber  → !isStarter && !isCreator && !isStudio
//     (pack buyers stay on plan='free' → they SHOULD see this)
//   • not dismissed this session (localStorage kineo_lowcredits_dismissed)
//
// Self-contained: fetches its own inputs from /api/credits (cookie auth). Renders
// null when the gate isn't met OR the fetch fails — safe to mount unconditionally.

import { useEffect, useState } from 'react'
import { useCheckoutLaunch } from '@/lib/checkoutTelemetry'
import { TIER_CREDITS } from '@/lib/checkoutPricing'

const DISMISSED_KEY = 'kineo_lowcredits_dismissed'
const THRESHOLD = 5

export default function LowCreditsUpsell() {
  const [eligible, setEligible] = useState(false)
  const [credits, setCredits] = useState<number>(0)
  const [dismissed, setDismissed] = useState(false)
  // KINEO-CHECKOUT-TRIAGE-2026-07-25 — was a bare window.location.href with no
  // click latch, no pending state and no failure telemetry: a double tap minted
  // two Stripe sessions. Shared launcher gives us all three.
  const checkout = useCheckoutLaunch('generate_low_credits')

  useEffect(() => {
    // Session dismissal — if the user closed it, stay hidden this session.
    try {
      if (localStorage.getItem(DISMISSED_KEY)) {
        setDismissed(true)
        return
      }
    } catch { /* ignore storage errors */ }

    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/credits', { cache: 'no-store' })
        if (!res.ok) return
        const data = await res.json()
        if (cancelled) return
        const bal: number = typeof data?.credits === 'number' ? data.credits : NaN
        if (!Number.isFinite(bal)) return
        // Active subscribers never see this — only free/pack (plan='free') users.
        const isSubscriber =
          data?.isStarter === true || data?.isCreator === true || data?.isStudio === true
        if (isSubscriber) return
        if (bal > THRESHOLD) return
        setCredits(bal)
        setEligible(true)
      } catch { /* silent — banner just won't show */ }
    })()
    return () => { cancelled = true }
  }, [])

  const dismiss = () => {
    setDismissed(true)
    try { localStorage.setItem(DISMISSED_KEY, String(Date.now())) } catch { /* ignore */ }
  }

  if (!eligible || dismissed) return null

  return (
    <div
      style={{
        background: 'linear-gradient(90deg, rgba(99,102,241,.18), rgba(168,85,247,.10))',
        border: '1px solid rgba(129,140,248,.5)',
        borderRadius: 12,
        padding: '14px 16px',
        marginBottom: 16,
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        flexWrap: 'wrap',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3, flex: '1 1 240px' }}>
        <span style={{ color: '#c7d2fe', fontWeight: 800, fontSize: 14 }}>
          You&apos;re almost out of videos —{' '}
          <span style={{ color: '#fff' }}>{credits} left</span>.
        </span>
        {/* KINEO-PRICING-V3D-2026-07-26 — this line said "Get 50 Fast videos
            every month". Starter has granted 25 credits since the 2:1 rebase on
            2026-07-10; the banner had been promising double the product for
            over two weeks, at the exact moment of highest purchase intent.
            Now derived from TIER_CREDITS so it cannot go stale again. */}
        <span style={{ color: '#a5b4fc', fontSize: 13, fontWeight: 600 }}>
          Get {TIER_CREDITS.starter} credits every month — {TIER_CREDITS.starter} Fast
          videos, or 1 AI Generated video. $9.90/mo. Cancel anytime.
        </span>
      </div>
      <button
        onClick={() => {
          checkout.launch('starter', '/api/stripe/checkout?tier=starter', {
            tier: 'starter',
            pricing_surface: 'generate_low_credits',
          })
        }}
        disabled={checkout.pending !== null}
        style={{
          background: '#818cf8',
          color: '#111',
          fontWeight: 800,
          fontSize: 14,
          padding: '10px 18px',
          borderRadius: 10,
          border: 'none',
          cursor: checkout.pending ? 'wait' : 'pointer',
          opacity: checkout.pending ? 0.7 : 1,
          whiteSpace: 'nowrap',
        }}
      >
        {checkout.pending ? 'Loading…' : 'Go monthly — $9.90'}
      </button>
      <button
        onClick={dismiss}
        aria-label="Dismiss"
        style={{
          background: 'transparent',
          border: 'none',
          color: 'rgba(255,255,255,.55)',
          fontSize: 18,
          lineHeight: 1,
          cursor: 'pointer',
          padding: 4,
        }}
      >
        ×
      </button>
      {checkout.error && (
        <div
          role="alert"
          style={{
            flexBasis: '100%',
            color: '#fecaca',
            fontSize: 13,
            fontWeight: 600,
            marginTop: 4,
          }}
        >
          {checkout.error}
        </div>
      )}
    </div>
  )
}
