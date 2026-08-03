'use client'

// Conversion — Exit-intent rescue modal for /pricing (59 abandoned
// checkouts/30d). Replaces the old inline "Don't leave yet!" modal with a
// low-commitment Starter Pack offer ($4.90 one-time / 10 Shorts) — the same
// checkout the featured entry-offer button already uses
// (/api/stripe/checkout?pack=starter, event starter_pack_checkout_clicked).
//
// Calibrated from 2025/26 exit-intent research (Wisepops / CrazyEgg /
// Popupsmart benchmarks):
//  - Never fire instantly: triggers arm only after 5s of engagement.
//  - Once per SESSION (sessionStorage) — repeat popups tank UX.
//  - Desktop: mouseleave through the top of the viewport.
//  - Mobile (coarse pointer): 25s inactivity OR fast scroll-up after the
//    user has scrolled down (classic mouse exit-intent is unreliable there).
//  - Don't show when the visitor is already subscribed (?already_subscribed=1)
//    or already carries a ?promo= code (they already got a rescue offer).
//  - Copy: short gain-framed headline, 2–5 word CTA, honest guarantee line.
//  - a11y: role=dialog, aria-modal, Escape closes, focus moves into the
//    dialog, close targets ≥44px.
//
// UI-only component: no payment/credit logic lives here — it navigates to
// the existing checkout endpoints.
//
// KINEO-REBASE-2026-07-10 — EXIT-INTENT v2 "ESCADA": the single $4.90 rescue
// is now a two-step ladder shown side by side —
//   left:  $4.90 one-time · 10 videos (same ?pack=starter checkout as before)
//   right: $9.90/mo Starter (HIGHLIGHTED, "BEST VALUE") — 25 credits every
//          month + no watermark + cancel anytime (?tier=starter, the same
//          GET checkout PricingCards uses)
// The FOUNDING50 secondary CTA is retired (the Starter card replaces it).
// New event: exit_intent_starter_monthly_clicked. Everything else (arm delay,
// once-per-session, desktop/mobile triggers, a11y) is unchanged.
//
// KINEO-REBASE-2026-07-10 — countdown hook: when the modal is SHOWN we write
// `kineo_exit_seen_at` (localStorage). If the visitor doesn't convert, the
// $2.90/24h countdown offer (Offer290Banner) uses that timestamp to arm
// itself on their next visits inside the 24h window. Converters end up
// has_paid=true, which the banner already filters out server-side.

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { trackEvent as trackAnalyticsEvent } from '@/lib/analytics'
import { useCheckoutLaunch } from '@/lib/checkoutTelemetry'

const SESSION_KEY = 'kineo_exit_offer_shown'
// KINEO-REBASE-2026-07-10 — read by Offer290Banner (post-exit $2.90 countdown).
const EXIT_SEEN_KEY = 'kineo_exit_seen_at'
const ARM_DELAY_MS = 5000 // engagement gate before any trigger is live
// PUSH #92 — raised from 25s: 25s of stillness fired on first-time visitors
// who were simply thinking about what topic to type into the hero form, and
// threw a modal over the composer. 45s + a scroll-engagement gate (below)
// give real "gone idle" behaviour instead of "just landed and paused".
const MOBILE_IDLE_MS = 45000 // mobile: show after 45s of inactivity, once armed
const MOBILE_IDLE_SCROLL_GATE = 0.5 // mobile: idle timer only arms after scrolling past this fraction of viewport height
const MOBILE_MIN_DEPTH_PX = 400 // mobile: only consider scroll-up after real scroll depth
const MOBILE_SCROLLUP_PX = 350 // mobile: accumulated fast upward scroll that counts as exit

// Same fire-and-forget event beacon pattern the pricing page uses.
function trackEvent(name: string): void {
  void trackAnalyticsEvent(name)
}

// PUSH #92 — the modal must never throw itself over an input the visitor is
// actively using (e.g. typing a topic into the hero composer).
function isFormFieldFocused(): boolean {
  if (typeof document === 'undefined') return false
  const tag = document.activeElement?.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA'
}

function checkoutIntentParam(): string {
  if (typeof window === 'undefined') return ''
  const raw = (new URLSearchParams(window.location.search).get('intent_campaign') ?? '').trim()
  return /^[A-Za-z0-9._~-]{1,100}$/.test(raw)
    ? `&intent_campaign=${encodeURIComponent(raw)}`
    : ''
}

// KINEO-EXIT-VARIANT-2026-08-03 — POR QUE a prop `variant` existe.
// O modal de deals ($4.90/$9.90) estava montado TAMBÉM na home para visitante
// deslogado — gente que nunca gerou um vídeo levava tabela de preço como
// última impressão (diagnóstico do fundador: "poluído"; diagnóstico do funil:
// vender antes de entregar, o erro que já corrigimos na tela de download).
// Na home o objetivo do exit-intent é CADASTRO, não venda: variant="free"
// vende os 3 vídeos grátis sem cartão. O /pricing continua com o deal —
// lá a pessoa já está decidindo preço.
export default function ExitIntentOffer({ variant = 'deal' }: { variant?: 'deal' | 'free' } = {}) {
  const [open, setOpen] = useState(false)
  // KINEO-SPRINT-OFFER-2026-07-14 — 'pack' removed from the union with the
  // one-time escape-hatch link (single-offer cleanup: the modal now sells
  // exactly two things — intro Starter and intro Creator, both recurring).
  // KINEO-CHECKOUT-TRIAGE-2026-07-25 — `buying` was plain useState: React had
  // not painted the disabled button when a second tap arrived, so a double tap
  // minted two Stripe sessions, and a redirect that never happened showed
  // nothing at all. The shared launcher owns the latch, the pending key and the
  // inline error now.
  const checkout = useCheckoutLaunch('exit_intent_offer')
  const buying = checkout.pending
  const shownRef = useRef(false)
  const dialogRef = useRef<HTMLDivElement | null>(null)

  const show = useCallback(() => {
    if (shownRef.current) return
    // Never fire while the visitor is actively typing somewhere on the page.
    if (isFormFieldFocused()) return
    shownRef.current = true
    try {
      sessionStorage.setItem(SESSION_KEY, '1')
    } catch {
      // sessionStorage unavailable (private mode) — still show once via ref
    }
    // KINEO-REBASE-2026-07-10 — arm the post-exit $2.90 countdown
    // (Offer290Banner). Written at show time; converters become has_paid
    // and the banner filters them out server-side.
    try {
      if (!localStorage.getItem(EXIT_SEEN_KEY)) {
        localStorage.setItem(EXIT_SEEN_KEY, String(Date.now()))
      }
    } catch {
      // ignore — countdown just won't arm on this device
    }
    trackEvent('exit_intent_shown')
    setOpen(true)
  }, [])

  // Trigger wiring — armed 5s after mount, desktop vs mobile strategies.
  useEffect(() => {
    if (typeof window === 'undefined') return

    // Once per session.
    try {
      if (sessionStorage.getItem(SESSION_KEY) === '1') return
    } catch {
      // ignore and fall through — shownRef still guards repeats this mount
    }

    // When NOT to show: active subscriber banner, or a promo code already
    // in the URL (win-back email traffic already has its offer).
    const params = new URLSearchParams(window.location.search)
    if (params.get('already_subscribed') === '1') return
    if (params.get('promo')) return

    const isTouch =
      (typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches) ||
      'ontouchstart' in window

    const cleanups: Array<() => void> = []

    const armTimer = window.setTimeout(() => {
      if (!isTouch) {
        // Desktop: cursor exits through the top of the viewport.
        const onMouseLeave = (e: MouseEvent) => {
          if (e.clientY <= 0) show()
        }
        document.addEventListener('mouseleave', onMouseLeave)
        cleanups.push(() => document.removeEventListener('mouseleave', onMouseLeave))
      } else {
        // Mobile 1: inactivity timer — but PUSH #92 only arms it once the
        // visitor has scrolled past ~50% of the viewport height, i.e. they
        // have actually seen the page rather than just landed on it. Before
        // that point the timer never starts, so "stillness while reading
        // the hero / deciding what to type" can no longer fire the modal.
        let idleTimer: number | null = null
        let idleArmed = false
        const scheduleIdle = () => {
          if (idleTimer !== null) window.clearTimeout(idleTimer)
          idleTimer = window.setTimeout(() => {
            if (isFormFieldFocused()) {
              // Still idle from a scroll/touch perspective, but the visitor
              // is actively using a field — keep waiting instead of firing.
              scheduleIdle()
              return
            }
            show()
          }, MOBILE_IDLE_MS)
        }
        const resetIdle = () => {
          if (!idleArmed) return
          scheduleIdle()
        }
        const idleEvents: Array<keyof WindowEventMap> = ['touchstart', 'touchmove', 'scroll', 'keydown']
        idleEvents.forEach((ev) => window.addEventListener(ev, resetIdle, { passive: true }))

        // Mobile 2: fast scroll-up after meaningful scroll depth.
        let lastY = window.scrollY
        let lastT = Date.now()
        let maxY = window.scrollY
        let upAccum = 0
        const onScroll = () => {
          const y = window.scrollY
          const now = Date.now()
          if (y > maxY) maxY = y

          if (!idleArmed && y > window.innerHeight * MOBILE_IDLE_SCROLL_GATE) {
            idleArmed = true
            scheduleIdle()
          }

          const dy = lastY - y // positive = scrolling up
          if (dy > 0) {
            if (now - lastT > 400) upAccum = 0 // stale burst — restart
            upAccum += dy
            if (maxY > MOBILE_MIN_DEPTH_PX && upAccum > MOBILE_SCROLLUP_PX) show()
          } else {
            upAccum = 0
          }
          lastY = y
          lastT = now
        }
        window.addEventListener('scroll', onScroll, { passive: true })

        cleanups.push(() => {
          if (idleTimer !== null) window.clearTimeout(idleTimer)
          idleEvents.forEach((ev) => window.removeEventListener(ev, resetIdle))
          window.removeEventListener('scroll', onScroll)
        })
      }
    }, ARM_DELAY_MS)
    cleanups.push(() => window.clearTimeout(armTimer))

    return () => cleanups.forEach((fn) => fn())
  }, [show])

  // Escape closes + move focus into the dialog when it opens.
  useEffect(() => {
    if (!open) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKeyDown)
    dialogRef.current?.focus()
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open])

  // KINEO-INTRO-MONTH-2026-07-13 — EXIT-INTENT v3 "RECORRÊNCIA": os dois
  // cards agora são ASSINATURAS com 1º mês de entrada ($4.90 Starter /
  // $9.90 Creator). Mesma mecânica GET (302 servidor, gesture-chain do
  // iOS preservada).
  // KINEO-SPRINT-OFFER-2026-07-14 — o link discreto do pack one-time
  // ("prefer no subscription? 10 videos for $4.90 once") foi REMOVIDO:
  // era a 3ª oferta no mesmo modal e reabria o beco sem saída one-time.
  // O endpoint ?pack=starter segue vivo só para o fluxo return=wm.
  function handleIntroStarter() {
    const started = checkout.launch(
      'starter',
      `/api/stripe/checkout?tier=starter&intro=1${checkoutIntentParam()}`,
      { tier: 'starter', intro: true, pricing_surface: 'exit_intent_offer' },
    )
    if (!started) return
    trackEvent('starter_checkout_clicked')
    trackEvent('exit_intent_intro_starter_clicked')
  }

  function handleIntroCreator() {
    const started = checkout.launch(
      'creator',
      `/api/stripe/checkout?tier=basic&intro=1${checkoutIntentParam()}`,
      { tier: 'basic', intro: true, pricing_surface: 'exit_intent_offer' },
    )
    if (!started) return
    trackEvent('basic_checkout_clicked')
    trackEvent('exit_intent_intro_creator_clicked')
  }

  if (!open) return null

  if (variant === 'free') {
    return (
      <div
        className="fixed inset-0 z-[100] flex items-center justify-center p-4"
        style={{ background: 'rgba(0,0,0,0.78)', backdropFilter: 'blur(6px)' }}
        onClick={() => setOpen(false)}
      >
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="exit-free-title"
          tabIndex={-1}
          className="relative w-full max-w-md rounded-2xl p-7 text-center outline-none"
          style={{ background: '#161618', border: '1px solid rgba(41,151,255,.35)', boxShadow: '0 0 60px rgba(41,151,255,.15)' }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            aria-label="Close"
            onClick={() => setOpen(false)}
            className="absolute right-4 top-3 text-xl font-bold"
            style={{ color: '#86868b', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            ×
          </button>
          <h2 id="exit-free-title" className="text-[1.35rem] font-black tracking-tight" style={{ color: '#f5f5f7' }}>
            Before you go — make one free.
          </h2>
          <p className="mt-2 text-sm" style={{ color: '#a8adb5', lineHeight: 1.6 }}>
            Type one idea, get a finished Short in about 3 minutes.
            3 free videos every day · no card needed.
          </p>
          <a
            href="/signup"
            onClick={() => trackEvent('exit_intent_free_clicked')}
            className="mt-5 block w-full rounded-xl px-4 py-3 text-[15px] font-extrabold text-white"
            style={{ background: 'linear-gradient(135deg, #2997ff, #1d6fe0)', textDecoration: 'none' }}
          >
            Create my free Short →
          </a>
          <p className="mt-3 text-[11.5px] font-semibold" style={{ color: '#86868b' }}>
            No card · no watermark tricks · yours to post
          </p>
        </div>
      </div>
    )
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.78)', backdropFilter: 'blur(6px)' }}
      onClick={() => setOpen(false)}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="exit-offer-title"
        aria-describedby="exit-offer-desc"
        tabIndex={-1}
        className="relative w-full max-w-lg rounded-2xl p-7 text-center outline-none"
        style={{
          background: '#161618',
          border: '1px solid rgba(41,151,255,.35)',
          boxShadow: '0 0 60px rgba(41,151,255,.15)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Close offer"
          className="absolute top-2 right-2 flex items-center justify-center rounded-lg text-[#86868b] hover:text-white hover:bg-white/[.06] transition"
          style={{ width: 44, height: 44, fontSize: 20, fontWeight: 700, lineHeight: 1 }}
        >
          ×
        </button>

        <h2 id="exit-offer-title" className="text-2xl font-black text-[#f5f5f7] mb-2 text-balance">
          Wait — pick your <span style={{ color: '#2997ff' }}>deal</span> before you go
        </h2>
        {/* KINEO-SPRINT-OFFER-2026-07-14 — copy no longer implies a one-time
            option ("try it once" was the pack); both cards are subscriptions. */}
        <p id="exit-offer-desc" className="text-[13.5px] text-[#86868b] mb-5 leading-relaxed">
          Half-price first month, fresh credits every month. One click.
        </p>

        {/* KINEO-INTRO-MONTH-2026-07-13 — v3 ladder: intro Starter (left) vs
            intro Creator (right, highlighted). Ambos assinaturas → MRR. */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4 text-left">
          {/* Left — Starter: first month $4.90, then $9.90/mo */}
          <div
            className="rounded-xl p-4 flex flex-col"
            style={{
              background: 'rgba(255,255,255,.04)',
              border: '1px solid rgba(255,255,255,.14)',
            }}
          >
            <span className="text-[10px] font-black uppercase tracking-[.12em] text-[#86868b] mb-1.5">
              Starter · 25 credits/mo
            </span>
            <span className="text-xl font-black text-[#f5f5f7]">
              $4.90 <span className="text-[12px] font-bold text-[#86868b]">first month</span>
            </span>
            <span className="text-[12.5px] text-[#a1a1a6] mt-1 mb-3 leading-relaxed">
              then $9.90/mo · no watermark · cancel anytime
            </span>
            <button
              type="button"
              onClick={handleIntroStarter}
              disabled={buying !== null}
              className="mt-auto w-full rounded-lg py-2.5 text-[13.5px] font-extrabold text-[#f5f5f7] transition hover:bg-white/[.10] disabled:opacity-60"
              style={{
                background: 'rgba(255,255,255,.08)',
                border: '1px solid rgba(255,255,255,.18)',
                minHeight: 44,
                cursor: 'pointer',
              }}
            >
              {buying === 'starter' ? 'Loading…' : 'Start for $4.90 →'}
            </button>
          </div>

          {/* Right — Creator: first month $9.90, then $24.90/mo (HIGHLIGHTED) */}
          <div
            className="relative rounded-xl p-4 flex flex-col"
            style={{
              background: 'rgba(41,151,255,.08)',
              border: '1.5px solid #2997ff',
              boxShadow: '0 0 26px rgba(41,151,255,.22)',
            }}
          >
            <span
              className="absolute -top-2.5 right-3 rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-[.12em]"
              style={{ background: '#2997ff', color: '#fff' }}
            >
              Best value
            </span>
            <span className="text-[10px] font-black uppercase tracking-[.12em] mb-1.5" style={{ color: '#7cc0ff' }}>
              Creator · 150 credits/mo
            </span>
            <span className="text-xl font-black text-[#f5f5f7]">
              $9.90 <span className="text-[12px] font-bold text-[#86868b]">first month</span>
            </span>
            <span className="text-[12.5px] text-[#cfe7ff] mt-1 mb-3 leading-relaxed">
              then $24.90/mo · 1 Hollywood film included · AI Presenter
            </span>
            <button
              type="button"
              onClick={handleIntroCreator}
              disabled={buying !== null}
              className="mt-auto w-full rounded-lg py-2.5 text-[13.5px] font-extrabold text-white transition disabled:opacity-60"
              style={{
                background: '#2997ff',
                boxShadow: '0 8px 24px rgba(41,151,255,.4)',
                minHeight: 44,
                cursor: 'pointer',
              }}
            >
              {buying === 'creator' ? 'Loading…' : 'Start for $9.90 →'}
            </button>
          </div>
        </div>

        {checkout.error && (
          <div
            role="alert"
            className="rounded-xl px-4 py-3 text-[12.5px] mb-3 text-left"
            style={{
              background: 'rgba(255,107,107,.08)',
              border: '1px solid rgba(255,107,107,.35)',
              color: '#f5f5f7',
            }}
          >
            {checkout.error}
          </div>
        )}

        <p className="text-[11px] text-[#6e6e73]">
          7-day money-back guarantee · cancel anytime · renews at the full monthly price after month 1
        </p>
      </div>
    </div>
  )
}
