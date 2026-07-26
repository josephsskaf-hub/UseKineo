'use client'

// ROBO1-CONV-2026-06-29b — Public Fast-preview CTA.
// Persistent bottom bar shown on high-intent SEO/marketing pages (alternatives,
// cheapest-ai-shorts-maker, youtube-shorts-from-topic) so a scrolling buyer always
// has a one-tap path to start — captures intent between the top and bottom CTAs.
// Honest copy mirrors the real offer: up to 3 watermarked Fast videos / 24h,
// no credit card.
// Dismissible (useState only, no localStorage → it gently reappears next session,
// matching StickyUpgradeBar). pointer-events:none on the wrapper so it never blocks
// clicks on page content behind the gutters.

import { useEffect, useState } from 'react'
import Link from 'next/link'

// KINEO-DL-PAYWALL-2026-07-09 — sticky bar was DISABLED per Joseph ("bem
// feio"). PUSH #92 — re-enabled: on mobile, once the hero scrolls away there
// is otherwise zero CTA anywhere on 7 host pages. Now only appears after the
// hero leaves the viewport (scroll-based heuristic below) instead of being
// visible immediately, and the default href no longer takes a redirect hop.
const DISMISS_KEY = 'kineo_sticky_free_short_cta_dismissed'
// Below the exit-intent modal's z-[100] so it never competes visually when
// both could be eligible at once.
const Z_INDEX = 60

export default function StickyFreeShortCTA({
  href = '/signup?utm_source=sticky_cta',
  label = 'Create up to 3 watermarked Fast videos every 24h — no card',
  cta = 'Start free',
}: {
  href?: string
  label?: string
  cta?: string
}) {
  const [dismissed, setDismissed] = useState(false)
  const [visible, setVisible] = useState(false)

  // Remembers dismissal for the session, and shows the bar only once the
  // hero has actually scrolled out of view (never immediately on load).
  useEffect(() => {
    try {
      if (sessionStorage.getItem(DISMISS_KEY) === '1') {
        setDismissed(true)
        return
      }
    } catch {
      // sessionStorage unavailable — fall through, bar can still show
    }

    let ticking = false
    const evaluate = () => {
      ticking = false
      const threshold = window.innerHeight * 0.6
      setVisible(window.scrollY > threshold)
    }
    const onScroll = () => {
      if (ticking) return
      ticking = true
      window.requestAnimationFrame(evaluate)
    }
    evaluate()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [])

  function dismiss() {
    setDismissed(true)
    try {
      sessionStorage.setItem(DISMISS_KEY, '1')
    } catch {
      // ignore — bar just won't remember dismissal this session
    }
  }

  if (dismissed || !visible) return null

  return (
    <>
      <style>{`
        @keyframes sfaCtaUp { from { opacity: 0; transform: translateY(120%); } to { opacity: 1; transform: translateY(0); } }
        .sfa-cta { animation: sfaCtaUp 0.45s cubic-bezier(0.22,1,0.36,1) both; }
        @media (prefers-reduced-motion: reduce) {
          .sfa-cta { animation: none; }
        }
      `}</style>
      <div
        className="sfa-cta"
        style={{
          position: 'fixed',
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: Z_INDEX,
          display: 'flex',
          justifyContent: 'center',
          padding: '0 12px calc(12px + env(safe-area-inset-bottom))',
          pointerEvents: 'none',
        }}
      >
        <div
          style={{
            pointerEvents: 'auto',
            width: '100%',
            maxWidth: 680,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '10px 12px 10px 16px',
            borderRadius: 16,
            background: 'linear-gradient(135deg, rgba(22,22,24,0.96), rgba(22,22,24,0.92))',
            border: '1px solid rgba(41,151,255,0.35)',
            boxShadow: '0 -6px 28px rgba(0,0,0,0.55)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
          }}
        >
          <span style={{ fontSize: '1.15rem', flexShrink: 0 }} aria-hidden>
            ⚡
          </span>
          <p style={{ flex: 1, margin: 0, minWidth: 0, fontSize: '0.84rem', fontWeight: 700, color: '#f5f5f7', lineHeight: 1.3 }}>
            {label}
          </p>
          <Link
            href={href}
            style={{
              flexShrink: 0,
              minHeight: 44,
              display: 'inline-flex',
              alignItems: 'center',
              padding: '9px 18px',
              borderRadius: 980,
              background: '#f5f5f7',
              color: '#000',
              fontWeight: 900,
              fontSize: '0.82rem',
              textDecoration: 'none',
              whiteSpace: 'nowrap',
            }}
          >
            {cta} →
          </Link>
          <button
            type="button"
            onClick={dismiss}
            aria-label="Dismiss"
            style={{
              flexShrink: 0,
              width: 44,
              height: 44,
              borderRadius: 8,
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.16)',
              color: 'rgba(255,255,255,0.7)',
              cursor: 'pointer',
              fontSize: '1.05rem',
              lineHeight: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            ×
          </button>
        </div>
      </div>
    </>
  )
}
