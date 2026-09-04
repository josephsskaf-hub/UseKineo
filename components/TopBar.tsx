'use client'

import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { trackEvent } from '@/lib/analytics'
import {
  lowBalancePricingBridgeMetadata,
  lowBalancePricingBridgeState,
} from '@/lib/growth/lowBalancePricingBridge'

interface TopBarProps {
  title: string
  subtitle?: string
  onMenuToggle?: () => void
  isPro: boolean
}

// Push #082 — auth UI consolidated to the Sidebar inside the dashboard layout.
// The TopBar used to also render Sign In / Sign Up / Sign Out, which meant
// every dashboard page showed two auth controls (one in the sidebar, one in
// the header). The sidebar already exposes the avatar, email, settings menu,
// and sign-out button for signed-in users, plus a "Get Started Free" CTA and
// inline Sign in button for guests, so the duplicate header tail was just
// noise. The TopBar now keeps only the breadcrumb + Pro badge.
export default function TopBar({ title, subtitle, onMenuToggle, isPro }: TopBarProps) {
  return (
    <div
      className="flex items-center gap-4 flex-shrink-0 sticky top-0 z-30 px-6"
      style={{
        height: 64,
        // Kineo re-skin — black glass bar.
        background: 'rgba(0,0,0,0.88)',
        backdropFilter: 'blur(24px) saturate(180%)',
        WebkitBackdropFilter: 'blur(24px) saturate(180%)',
        borderBottom: '1px solid var(--border)',
      }}
    >
      {/* Hamburger (mobile) */}
      <button
        onClick={onMenuToggle}
        className="md:hidden w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-all"
        style={{
          background: 'rgba(255,255,255,.03)',
          border: '1px solid var(--border)',
          color: 'var(--muted2)',
          cursor: 'pointer',
          fontSize: '1rem',
        }}
        aria-label="Toggle menu"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <rect y="2" width="16" height="1.5" rx="1" fill="currentColor" />
          <rect y="7.25" width="16" height="1.5" rx="1" fill="currentColor" />
          <rect y="12.5" width="16" height="1.5" rx="1" fill="currentColor" />
        </svg>
      </button>

      {/* Mobile logo link */}
      <Link
        href="/"
        className="md:hidden flex items-center justify-center flex-shrink-0"
        style={{
          width: 32, height: 32, borderRadius: 10, textDecoration: 'none',
          background: 'rgba(41,151,255,0.08)',
          border: '1px solid rgba(41,151,255,0.35)',
          boxShadow: '0 0 14px rgba(41,151,255,0.3)',
        }}
        aria-label="Home"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <path d="M13 2L3 14h7l-1 8 10-12h-7l1-8z" fill="#2997ff" />
        </svg>
      </Link>

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs min-w-0" style={{ color: 'var(--muted)' }}>
        <Link href="/" className="hidden sm:inline" style={{ textDecoration: 'none', color: 'inherit' }}>Kineo</Link>
        <span className="hidden sm:inline" style={{ opacity: 0.3 }}>›</span>
        <span className="font-semibold truncate" style={{ color: 'var(--text)' }}>
          {title}
        </span>
        {subtitle && (
          <>
            <span style={{ opacity: 0.3 }}>›</span>
            <span className="truncate">{subtitle}</span>
          </>
        )}
      </div>

      {/* Right side — credits badge + Pro badge.
          KINEO-DL-PAYWALL-2026-07-09 — the "🎭 AI Avatar (New)" top-bar chip
          was removed on every page per Joseph: the sidebar entry is the single
          nav home for the Avatar product; the top bar stays clean. */}
      <div className="ml-auto flex items-center gap-2 flex-shrink-0">
        {/* Push #098 — header credits badge. Red link to /pricing when 0,
            amber when <=5 and not Pro, neutral otherwise. */}
        <CreditsBadge isPro={isPro} />
        {isPro && (
          <div
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold"
            style={{
              background: 'rgba(41,151,255,.08)',
              border: '1px solid rgba(41,151,255,.18)',
              color: '#2997ff',
            }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: '#2997ff', boxShadow: '0 0 6px rgba(41,151,255,.5)' }}
            />
            Pro
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Push #098 — Credits badge ──────────────────────────────────────────────
// Fetches /api/credits (same endpoint the Sidebar uses) and listens for the
// `creditsChanged` event so it stays in sync after every generation. Three
// visual states: empty (red-tinted, links to /pricing), low (amber, not-Pro),
// and neutral (subtle slate chip).
//
// PUSH #92 — this badge used to `return null` while loading or on any 401 /
// fetch failure, which makes the balance vanish exactly when a user is
// deciding whether to spend credits. It now always renders something: a
// fixed-size skeleton while loading, a `—` with a retry affordance on error,
// and never a blank gap that shifts the layout.
const CREDITS_BADGE_MIN_WIDTH = 84
const CREDITS_BADGE_HEIGHT = 26
// Push #098's original low-credit threshold — kept as-is, not reinvented.
const LOW_CREDITS_THRESHOLD = 5

function CreditsBadge({ isPro }: { isPro: boolean }) {
  const [credits, setCredits] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [errored, setErrored] = useState(false)
  const [anon, setAnon] = useState(false)
  const [entitlementsResolved, setEntitlementsResolved] = useState(false)
  const [plan, setPlan] = useState<string | null>(null)
  const [trialActive, setTrialActive] = useState(false)
  const mountedRef = useRef(true)
  const lowBalanceLinkRef = useRef<HTMLAnchorElement | null>(null)
  const lowBalanceViewSentRef = useRef(false)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  const fetchCredits = useCallback(async () => {
    try {
      const res = await fetch('/api/credits', { cache: 'no-store' })
      if (res.status === 401) {
        // ONDA2 #18 (13/08) — 401 = visitante sem sessao, NAO erro. O
        // (dashboard) e publico e /generate recebe trafego de anuncio
        // deslogado: esse trafego via um chip "— ↻" com tooltip de erro como
        // primeira impressao. Anonimo nao tem saldo para mostrar: some o chip.
        if (mountedRef.current) setAnon(true)
        return
      }
      const data = await res.json()
      if (mountedRef.current) {
        setCredits(typeof data.credits === 'number' ? data.credits : 0)
        setEntitlementsResolved(data.entitlementsResolved === true)
        setPlan(typeof data.plan === 'string' ? data.plan : null)
        setTrialActive(data.trialActive === true)
        setErrored(false)
      }
    } catch {
      if (mountedRef.current) setErrored(true)
    } finally {
      if (mountedRef.current) setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchCredits()
    window.addEventListener('creditsChanged', fetchCredits)
    return () => {
      window.removeEventListener('creditsChanged', fetchCredits)
    }
  }, [fetchCredits])

  // Supabase Realtime — pushes the new balance to this client whenever the
  // user's profiles row changes in the DB, so the header badge updates on
  // every device/tab without a refresh (the `creditsChanged` event above only
  // fires within the same window). Subscription wiring unchanged from before;
  // only clearing the error/loading flags on a fresh payload is new, since a
  // live update means the balance is demonstrably reachable again.
  useEffect(() => {
    const supabase = createClient()
    let channel: ReturnType<typeof supabase.channel> | null = null
    let cancelled = false
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (cancelled || !user) return
      channel = supabase
        .channel('credits-realtime-topbar')
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${user.id}` },
          (payload) => {
            const row = payload.new as { video_credits?: number }
            if (typeof row.video_credits === 'number') {
              setCredits(row.video_credits)
              setErrored(false)
              setLoading(false)
            }
          },
        )
        .subscribe()
    })
    return () => {
      cancelled = true
      if (channel) supabase.removeChannel(channel)
    }
  }, [])

  const lowBalanceState = lowBalancePricingBridgeState({
    credits,
    entitlementsResolved,
    plan,
    trialActive,
  })
  const lowBalanceBridgeEligible = lowBalanceState === 'eligible'

  useEffect(() => {
    const link = lowBalanceLinkRef.current
    if (!lowBalanceBridgeEligible || !link || lowBalanceViewSentRef.current) return

    let dwell: ReturnType<typeof setTimeout> | null = null
    const clearDwell = () => {
      if (dwell) clearTimeout(dwell)
      dwell = null
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        clearDwell()
        if (!entry?.isIntersecting || entry.intersectionRatio < 0.6 || document.visibilityState !== 'visible') return
        dwell = setTimeout(() => {
          if (lowBalanceViewSentRef.current || document.visibilityState !== 'visible') return
          lowBalanceViewSentRef.current = true
          void trackEvent(
            'low_balance_pricing_bridge_viewed',
            lowBalancePricingBridgeMetadata('topbar_credit_chip'),
          )
        }, 1_000)
      },
      { threshold: [0.6] },
    )
    observer.observe(link)
    return () => {
      clearDwell()
      observer.disconnect()
    }
  }, [lowBalanceBridgeEligible])

  // Loading — fixed-width skeleton, same footprint as the resolved badge, so
  // nothing shifts when the real number lands.
  if (loading) {
    return (
      <span
        aria-hidden="true"
        className="shimmer-overlay rounded-lg"
        style={{
          position: 'relative',
          overflow: 'hidden',
          display: 'inline-block',
          minWidth: CREDITS_BADGE_MIN_WIDTH,
          height: CREDITS_BADGE_HEIGHT,
          background: 'rgba(255,255,255,.04)',
          border: '1px solid rgba(255,255,255,.08)',
        }}
      />
    )
  }

  // ONDA2 #18 (13/08) — sem sessao nao ha saldo: nada a mostrar nem a
  // "retentar". O estado de erro abaixo volta a ser so para erro DE VERDADE.
  if (anon) return null

  // Error (network hiccup) — never hide the balance slot; show a
  // retry affordance instead of vanishing at the exact moment the user is
  // deciding whether to spend credits.
  if (errored || credits === null) {
    return (
      <button
        type="button"
        onClick={() => {
          setLoading(true)
          void fetchCredits()
        }}
        aria-label="Retry loading credits"
        title="Couldn't load your credit balance — tap to retry"
        className="flex items-center justify-center gap-1.5 rounded-lg text-xs font-bold"
        style={{
          minWidth: 44,
          minHeight: 44,
          padding: '0 10px',
          background: 'rgba(255,255,255,.04)',
          border: '1px solid rgba(255,255,255,.08)',
          color: 'var(--muted)',
          cursor: 'pointer',
        }}
      >
        <span aria-hidden="true">—</span>
        <span aria-hidden="true" style={{ fontSize: '0.85em' }}>↻</span>
      </button>
    )
  }

  const isZero = credits <= 0
  const isLow = !isZero && credits <= LOW_CREDITS_THRESHOLD && !isPro

  // PUSH #92 — isZero and isLow used to resolve to the identical blue palette
  // (dead code) per the KINEO-ZERO-SIGNUP note this replaces, which treated 0
  // credits on free Fast as a normal, non-error state. The balance is exactly
  // what a user reads at the moment they decide whether to spend it, so this
  // sprint makes the three states visually distinct: zero is red-tinted, low
  // is amber, everything else keeps the original neutral chip. If product
  // wants zero back to "normal, not urgent," revert this block.
  const colors = isZero
    ? { fg: '#ff6b6b', bg: 'rgba(255,107,107,.10)', border: 'rgba(255,107,107,.35)' }
    : isLow
    ? { fg: '#ffb020', bg: 'rgba(255,176,32,.10)', border: 'rgba(255,176,32,.35)' }
    : { fg: '#f5f5f7', bg: 'rgba(255,255,255,.04)', border: 'rgba(255,255,255,.08)' }

  const opensPricing = isZero || lowBalanceBridgeEligible
  const balanceDescription = `${credits} credit${credits === 1 ? '' : 's'} remaining${opensPricing ? ' — view pricing' : ''}`

  const label = (
    <span
      title={balanceDescription}
      aria-label={balanceDescription}
      className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold"
      style={{
        background: colors.bg,
        border: `1px solid ${colors.border}`,
        color: colors.fg,
      }}
    >
      {/* KINEO-NAV-REDESIGN-2026-07-10 — brand bolt instead of the emoji. */}
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M13 2L3 14h7l-1 8 10-12h-7l1-8z" fill={colors.fg} />
      </svg>
      {credits} credit{credits === 1 ? '' : 's'}
    </span>
  )

  if (opensPricing) {
    // Push #92 — ≥44px tap target on the interactive wrapper, independent of
    // the compact visual chip it wraps.
    return (
      <Link
        ref={lowBalanceBridgeEligible ? lowBalanceLinkRef : undefined}
        href="/pricing"
        aria-label={balanceDescription}
        title={balanceDescription}
        onClick={() => {
          if (!lowBalanceBridgeEligible) return
          void trackEvent(
            'low_balance_pricing_bridge_clicked',
            lowBalancePricingBridgeMetadata('topbar_credit_chip'),
          )
        }}
        style={{
          textDecoration: 'none',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          minWidth: 44,
          minHeight: 44,
        }}
      >
        {label}
      </Link>
    )
  }
  return label
}
