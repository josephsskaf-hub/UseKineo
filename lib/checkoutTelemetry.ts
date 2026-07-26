'use client'

// KINEO-CHECKOUT-TRIAGE-2026-07-25 — one shared launcher for every button that
// can send a buyer to Stripe.
//
// Motivo: a produção mostrou 7 sessões Stripe criadas em 2,8 s pelo MESMO
// usuário (events: 7× starter_pack_checkout_clicked entre 04:07:41 e 04:07:44)
// porque o botão não tinha estado de "pending", não tinha trava de clique e
// nunca mostrava erro. O usuário clicava de novo porque nada acontecia.
//
// Every checkout surface must use `useCheckoutLaunch()` so that:
//   1. one click = at most one navigation (ref latch, survives a remount);
//   2. the button always shows an immediate pending state;
//   3. a redirect that never happens surfaces an inline English error instead
//      of silence;
//   4. every checkout event carries the same session_id the server-side
//      `checkout_attempted` uses (trackEvent → kineo_event_session_id).
//
// NOTE: the event is `checkout_cta_clicked`, NOT `checkout_click` — the latter
// is already taken by lib/trackClick.ts, which writes to public.click_events.

import { useCallback, useEffect, useRef, useState } from 'react'
import { trackEvent } from '@/lib/analytics'

// A full-page navigation to /api/stripe/checkout keeps this page alive while
// the server talks to Stripe (typically < 3 s). 15 s means something is wrong.
const REDIRECT_WATCHDOG_MS = 15_000

export type CheckoutFailureStage = 'click' | 'redirect' | 'session' | 'resume'

export const CHECKOUT_RETRY_MESSAGE =
  'We could not open the secure checkout. Check your connection and try again — you have not been charged.'

// Same house style as `generation_stage_error`: fire-and-forget, always inside
// try/catch, and the payload never carries an email, prompt, key or card data —
// only an error *name* and a short reason code.
export function trackCheckoutFailure(
  stage: CheckoutFailureStage,
  reason: string,
  metadata: Record<string, unknown> = {},
): void {
  try {
    void trackEvent('checkout_failure', {
      stage,
      reason: String(reason || 'unknown').slice(0, 120),
      ...metadata,
    })
  } catch {
    // Telemetry must never break a purchase.
  }
}

export type CheckoutLaunch = {
  /** Selection key currently navigating to Stripe (tier or SKU), else null. */
  pending: string | null
  /** Inline, user-facing English error. Render it next to the buttons. */
  error: string | null
  setError: (message: string | null) => void
  /** Returns true when this call actually started the navigation. */
  launch: (key: string, url: string, metadata?: Record<string, unknown>) => boolean
  release: () => void
}

export function useCheckoutLaunch(surface: string): CheckoutLaunch {
  const [pending, setPending] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  // Ref, not state: React has not painted the disabled button yet when a second
  // click arrives, and a remount would reset state but callers keep the hook.
  const lockedRef = useRef(false)
  const watchdogRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearWatchdog = useCallback(() => {
    if (watchdogRef.current) {
      clearTimeout(watchdogRef.current)
      watchdogRef.current = null
    }
  }, [])

  const release = useCallback(() => {
    lockedRef.current = false
    setPending(null)
    clearWatchdog()
  }, [clearWatchdog])

  useEffect(() => {
    // Back/forward cache: leaving Stripe restores this page WITH its refs, so
    // without this every plan button would stay disabled forever.
    const onPageShow = () => release()
    // The navigation actually happened — stop the "nothing happened" watchdog.
    const onPageHide = () => clearWatchdog()
    window.addEventListener('pageshow', onPageShow)
    window.addEventListener('pagehide', onPageHide)
    return () => {
      window.removeEventListener('pageshow', onPageShow)
      window.removeEventListener('pagehide', onPageHide)
      clearWatchdog()
    }
  }, [release, clearWatchdog])

  const launch = useCallback(
    (key: string, url: string, metadata: Record<string, unknown> = {}): boolean => {
      if (lockedRef.current) {
        // Recording the suppressed click is how we prove the guard is working
        // instead of guessing from Stripe session counts.
        try {
          void trackEvent('checkout_cta_suppressed', { surface, selection: key, ...metadata })
        } catch {
          /* never block */
        }
        return false
      }
      lockedRef.current = true
      setPending(key)
      setError(null)
      try {
        void trackEvent('checkout_cta_clicked', { surface, selection: key, ...metadata })
      } catch {
        /* never block */
      }

      clearWatchdog()
      watchdogRef.current = setTimeout(() => {
        watchdogRef.current = null
        lockedRef.current = false
        setPending(null)
        setError(CHECKOUT_RETRY_MESSAGE)
        try {
          void trackEvent('checkout_redirect_timeout', {
            surface,
            selection: key,
            waited_ms: REDIRECT_WATCHDOG_MS,
            ...metadata,
          })
        } catch {
          /* never block */
        }
      }, REDIRECT_WATCHDOG_MS)

      try {
        window.location.href = url
        return true
      } catch (err) {
        release()
        setError(CHECKOUT_RETRY_MESSAGE)
        trackCheckoutFailure(
          'redirect',
          err instanceof Error ? err.name : 'navigation_threw',
          { surface, selection: key, ...metadata },
        )
        return false
      }
    },
    [surface, clearWatchdog, release],
  )

  return { pending, error, setError, launch, release }
}
