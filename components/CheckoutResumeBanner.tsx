'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import styles from './CheckoutResumeBanner.module.css'
import { trackClosedEvent, trackEvent } from '@/lib/analytics'
import { useCheckoutLaunch, useStalledCheckout } from '@/lib/checkoutTelemetry'
import {
  formatCheckoutResumeMoney,
  formatCheckoutResumePlanFitGoal,
  type CheckoutResumeOffer,
} from '@/lib/checkoutResumeSurface'
import {
  CHECKOUT_RESUME_DWELL_MS,
  CHECKOUT_RESUME_CHOICE_VERSION,
  CHECKOUT_RESUME_RETRY_DELAY_MS,
  CHECKOUT_RESUME_VISIBLE_RATIO,
  checkoutResumeHumanViewOfferKey,
  createCheckoutResumeDwellController,
  createCheckoutResumeRecorder,
  shouldRecordCheckoutResumeAfterDwell,
} from '@/lib/growth/checkoutResumeHumanView'
import { useCheckoutResumeFilm } from '@/components/useCheckoutResumeFilm'
import { checkoutResumeFilmTelemetry } from '@/lib/growth/checkoutResumeFilm'
import {
  CHECKOUT_RESUME_DELIVERY_GUARD_VERSION,
  nextCheckoutResumeDeliveryDelay,
  readCheckoutResumeDeliveryProbe,
  type CheckoutResumeDeliveryProbe,
  type CheckoutResumeDeliveryState,
} from '@/lib/growth/checkoutResumeDeliveryGuard'


const COMPARE_PLANS_HREF = '/pricing?intent_campaign=checkout_resume_smaller_v1#plans'

const HIDDEN_PATHS = [
  '/login',
  '/signup',
  '/forgot-password',
  '/reset-password',
  '/auth',
  '/checkout/success',
  '/checkout/cancelled',
  // The pricing page owns a calmer, contextual recovery surface. Showing both
  // would ask the same buyer to resume twice in the same viewport.
  '/pricing',
  // ONDA4 #16 (14/08) — /v/[id] e pagina de aquisicao para anonimo em 4G:
  // nada de fetch de resume nem banner de compra la.
  '/v',
]

function shouldHide(pathname: string): boolean {
  return HIDDEN_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`))
}

export default function CheckoutResumeBanner() {
  const pathname = usePathname()
  const [offer, setOffer] = useState<CheckoutResumeOffer | null>(null)
  const [deliveryState, setDeliveryState] = useState<CheckoutResumeDeliveryState>('checking')
  const viewedKey = useRef<string | null>(null)
  const deliverySuppressedKey = useRef<string | null>(null)
  const film = useCheckoutResumeFilm(offer !== null)
  const filmLoadedKey = useRef<string | null>(null)
  const choiceRef = useRef<HTMLDivElement | null>(null)
  const humanViewStopRef = useRef<(() => void) | null>(null)
  const checkout = useCheckoutLaunch('checkout_resume_banner')
  // KINEO-CHECKOUT-REDIRECT-2026-08-08 — os dois cards ocupam o MESMO canto.
  // Enquanto o CTA de resgate (checkout travado agora, sessão viva) está no ar,
  // este banner ("seu checkout está salvo") sai da frente: são dois pedidos
  // concorrentes no instante mais sensível da jornada, e o urgente é o outro.
  const stalled = useStalledCheckout()
  const humanViewStateRef = useRef<{
    offerKey: string | null
    pathname: string
    stalled: boolean
    checkoutPending: boolean
  }>({
    offerKey: null,
    pathname,
    stalled: false,
    checkoutPending: false,
  })
  // Updated during render so an old passive-effect timer sees the new state
  // before its cleanup runs. This makes the race fail closed.
  humanViewStateRef.current = {
    offerKey: offer ? checkoutResumeHumanViewOfferKey(offer) : null,
    pathname,
    stalled: Boolean(stalled),
    checkoutPending: checkout.pending !== null,
  }

  useEffect(() => {
    if (shouldHide(pathname)) {
      setOffer(null)
      return
    }

    const controller = new AbortController()
    void fetch('/api/stripe/checkout/resume', {
      method: 'GET',
      credentials: 'same-origin',
      cache: 'no-store',
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) return null
        return response.json() as Promise<CheckoutResumeOffer | { available: false }>
      })
      .then((result) => {
        if (!result || result.available !== true) {
          setOffer(null)
          return
        }
        setOffer(result)
        const key = [
          CHECKOUT_RESUME_CHOICE_VERSION,
          result.tier,
          result.billing,
          result.currency,
          result.firstChargeAmount,
          result.renewalAmount,
          result.destinationKind,
          result.planFit?.engine ?? 'standard',
          result.planFit?.monthlyVideos ?? '',
          result.planFit?.seconds ?? '',
          result.planFit?.selectedTierMatches ?? '',
        ].join(':')
        if (viewedKey.current !== key) {
          viewedKey.current = key
          void trackEvent('checkout_resume_banner_viewed', {
            resume_choice_version: CHECKOUT_RESUME_CHOICE_VERSION,
            tier: result.tier,
            billing: result.billing,
            currency: result.currency,
            first_charge_amount: result.firstChargeAmount,
            renewal_amount: result.renewalAmount,
            destination_kind: result.destinationKind,
            checkout_origin: result.planFit ? 'plan_fit_first_delivery' : 'standard',
            plan_fit_engine: result.planFit?.engine ?? null,
            plan_fit_monthly_videos: result.planFit?.monthlyVideos ?? null,
            plan_fit_seconds: result.planFit?.seconds ?? null,
            plan_fit_selected_tier_matches: result.planFit?.selectedTierMatches ?? null,
          })
        }
      })
      .catch(() => {
        // Checkout recovery is optional and must never disturb the page.
      })

    return () => controller.abort()
  }, [pathname])

  // CAIXA R15 — a saved-checkout reminder used to compete with the product
  // while the buyer's film was still rendering. Keep the saved choice, hide
  // only the payment prompt, and let it return after the owner-scoped active
  // render probe becomes terminal. Two idle rechecks catch a render that starts
  // just after this global layout mounted; sustained polling happens only while
  // work is actually in flight.
  useEffect(() => {
    if (!offer || shouldHide(pathname)) {
      setDeliveryState('checking')
      return
    }

    const controller = new AbortController()
    let timer: number | null = null
    let stopped = false
    let idleChecks = 0
    let wasRendering = false
    const offerKey = checkoutResumeHumanViewOfferKey(offer)

    const probe = async () => {
      let result: CheckoutResumeDeliveryProbe = { state: 'clear', resumable: false }
      try {
        const response = await fetch('/api/compose/active', {
          method: 'GET',
          credentials: 'same-origin',
          cache: 'no-store',
          signal: controller.signal,
        })
        if (response.ok) {
          result = readCheckoutResumeDeliveryProbe(await response.json().catch(() => null))
        }
      } catch {
        // Optional truth probe: fail open, never erase a legitimate recovery.
      }
      if (stopped) return

      if (result.state === 'rendering') {
        wasRendering = true
        setDeliveryState('rendering')
        const suppressionKey = `${offerKey}:${pathname}`
        if (deliverySuppressedKey.current !== suppressionKey) {
          deliverySuppressedKey.current = suppressionKey
          void trackEvent('checkout_resume_suppressed_active_render', {
            version: CHECKOUT_RESUME_DELIVERY_GUARD_VERSION,
            path: pathname,
            resumable: result.resumable,
          })
        }
      } else {
        idleChecks += 1
        deliverySuppressedKey.current = null
        setDeliveryState('clear')
      }

      const delay = nextCheckoutResumeDeliveryDelay({
        state: result.state,
        idleChecks,
        wasRendering,
      })
      if (delay !== null) timer = window.setTimeout(() => void probe(), delay)
    }

    setDeliveryState('checking')
    void probe()
    return () => {
      stopped = true
      controller.abort()
      if (timer !== null) window.clearTimeout(timer)
    }
  }, [offer, pathname])

  // checkout_resume_banner_viewed remains the technical denominator: the
  // server found a resumable choice. This event is the human denominator:
  // both actions occupied at least half of their own box for one continuous
  // second in a visible tab, while no urgent stalled-checkout card covered it.
  useEffect(() => {
    if (
      !offer
      || shouldHide(pathname)
      || stalled
      || checkout.pending !== null
      || deliveryState !== 'clear'
      || typeof IntersectionObserver === 'undefined'
    ) return
    const target = choiceRef.current
    if (!target) return
    const lockManager = navigator.locks
    if (!lockManager) return

    let storage: Storage | null = null
    try {
      storage = window.sessionStorage
    } catch {
      // No durable claim means no trustworthy denominator. Fail closed.
    }
    if (!storage) return

    const recorder = createCheckoutResumeRecorder({
      offer,
      storage,
      withExclusiveClaim: async (claimName, task) => await lockManager.request(claimName, task),
      transport: (eventName, metadata) => trackClosedEvent(eventName, metadata),
    })
    if (recorder.wasSettled()) return

    let isIntersecting = false
    let intersectionRatio = 0
    let observer: IntersectionObserver | null = null
    let retryTimer: number | null = null
    let retryUsed = false
    let stopped = false
    const expectedOfferKey = checkoutResumeHumanViewOfferKey(offer)
    const expectedPathname = pathname

    const qualifies = () => {
      const live = humanViewStateRef.current
      return shouldRecordCheckoutResumeAfterDwell({
        expectedOfferKey,
        currentOfferKey: live.offerKey,
        expectedPathname,
        currentPathname: live.pathname,
        currentPathHidden: shouldHide(live.pathname),
        targetConnected: target.isConnected,
        targetStillCurrent: choiceRef.current === target,
        stalled: live.stalled,
        checkoutPending: live.checkoutPending,
        isIntersecting,
        intersectionRatio,
        documentVisible: document.visibilityState === 'visible',
      })
    }
    let dwell: ReturnType<typeof createCheckoutResumeDwellController> | null = null
    const clearRetry = () => {
      if (retryTimer !== null) window.clearTimeout(retryTimer)
      retryTimer = null
    }
    const handleVisibility = () => {
      dwell?.update({ documentVisible: document.visibilityState === 'visible' })
    }
    const stop = () => {
      if (stopped) return
      stopped = true
      dwell?.stop()
      clearRetry()
      observer?.disconnect()
      document.removeEventListener('visibilitychange', handleVisibility)
      if (humanViewStopRef.current === stop) humanViewStopRef.current = null
    }

    dwell = createCheckoutResumeDwellController({
      dwellMs: CHECKOUT_RESUME_DWELL_MS,
      setTimer: (callback, delayMs) => window.setTimeout(callback, delayMs),
      clearTimer: (timerId) => window.clearTimeout(timerId),
      onDwell: () => {
        if (!qualifies()) return
        void recorder.recordOnce().then((result) => {
          if (stopped || !dwell?.canContinue()) return
          if (result === 'not_stored' && !retryUsed) {
            retryUsed = true
            retryTimer = window.setTimeout(() => {
              retryTimer = null
              dwell?.rearm()
            }, CHECKOUT_RESUME_RETRY_DELAY_MS)
            return
          }
          stop()
        })
      },
    })

    observer = new IntersectionObserver((entries) => {
      const entry = entries[0]
      isIntersecting = Boolean(entry?.isIntersecting)
      intersectionRatio = entry?.intersectionRatio ?? 0
      dwell?.update({
        rendered: true,
        stalled: Boolean(stalled),
        checkoutPending: checkout.pending !== null,
        isIntersecting,
        intersectionRatio,
      })
    }, { threshold: [CHECKOUT_RESUME_VISIBLE_RATIO] })

    dwell.update({
      rendered: true,
      stalled: Boolean(stalled),
      checkoutPending: false,
      documentVisible: document.visibilityState === 'visible',
    })
    humanViewStopRef.current = stop
    observer.observe(target)
    document.addEventListener('visibilitychange', handleVisibility)

    return () => stop()
  }, [checkout.pending, deliveryState, offer, pathname, stalled])

  if (!offer || shouldHide(pathname) || stalled || deliveryState !== 'clear') return null

  const firstCharge = formatCheckoutResumeMoney(offer.firstChargeAmount, offer.currency)
  const renewal = formatCheckoutResumeMoney(offer.renewalAmount, offer.currency)
  const renewalUnit = offer.billing === 'annual' ? 'year' : 'month'
  const savedGoal = offer.planFit ? formatCheckoutResumePlanFitGoal(offer.planFit) : null
  const eventMetadata = {
    resume_choice_version: CHECKOUT_RESUME_CHOICE_VERSION,
    tier: offer.tier,
    billing: offer.billing,
    currency: offer.currency,
    first_charge_amount: offer.firstChargeAmount,
    renewal_amount: offer.renewalAmount,
    destination_kind: offer.destinationKind,
    checkout_origin: offer.planFit ? 'plan_fit_first_delivery' : 'standard',
    plan_fit_engine: offer.planFit?.engine ?? null,
    plan_fit_monthly_videos: offer.planFit?.monthlyVideos ?? null,
    plan_fit_seconds: offer.planFit?.seconds ?? null,
    plan_fit_selected_tier_matches: offer.planFit?.selectedTierMatches ?? null,
    ...checkoutResumeFilmTelemetry(film),
  }

  const dismiss = () => {
    humanViewStopRef.current?.()
    setOffer(null)
    void trackEvent('checkout_resume_banner_dismissed', eventMetadata)
    void fetch('/api/stripe/checkout/resume', {
      method: 'POST',
      credentials: 'same-origin',
      keepalive: true,
    }).catch(() => {
      // The in-memory dismissal still prevents a disruptive retry loop.
    })
  }

  return (
    <aside
      className={styles.banner}
      aria-label="Resume secure checkout"
      aria-live="polite"
      style={{
        position: 'fixed',
        zIndex: 10050,
        left: '50%',
        bottom: 16,
        transform: 'translateX(-50%)',
        width: 'min(680px, calc(100vw - 24px))',
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        padding: '12px 14px',
        border: '1px solid rgba(41,151,255,.4)',
        borderRadius: 16,
        background: 'rgba(11,17,32,.97)',
        color: '#f8fafc',
        boxShadow: '0 18px 55px rgba(0,0,0,.48)',
        backdropFilter: 'blur(14px)',
        fontFamily: 'var(--font-inter), Inter, system-ui, sans-serif',
      }}
    >
      {film ? (
        <video
          src={film.playbackUrl}
          poster={film.posterUrl ?? undefined}
          className={styles.film}
          aria-label={'Preview of ' + film.title}
          autoPlay muted loop playsInline preload="metadata"
          onLoadedData={() => {
            if (filmLoadedKey.current === film.playbackUrl) return
            filmLoadedKey.current = film.playbackUrl
            void trackEvent('checkout_resume_film_proof_loaded', {
              ...checkoutResumeFilmTelemetry(film),
              resume_choice_version: CHECKOUT_RESUME_CHOICE_VERSION,
            })
          }}
        />
      ) : null}
      <div className={styles.copy} style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontSize: '0.88rem', lineHeight: 1.25, fontWeight: 850 }}>
          {film ? 'Your latest film is ready' : <>Your {offer.planName} checkout is saved</>}
        </div>
        {film ? (
          <div style={{ marginTop: 3, color: '#62b3ff', fontSize: '0.76rem', lineHeight: 1.35, fontWeight: 800 }}>“{film.title}”</div>
        ) : null}

        {savedGoal ? (
          <div style={{ marginTop: 3, color: '#62b3ff', fontSize: '0.76rem', lineHeight: 1.35, fontWeight: 800 }}>
            {savedGoal}
          </div>
        ) : null}
        <div style={{ marginTop: 3, color: '#aeb9cc', fontSize: '0.76rem', lineHeight: 1.35 }}>
          First charge {firstCharge} · renews at {renewal}/{renewalUnit}. Cancel anytime.
        </div>
        {checkout.error && (
          <div role="alert" style={{ marginTop: 6, color: '#ff8f8f', fontSize: '0.74rem', fontWeight: 700, lineHeight: 1.35 }}>
            {checkout.error}
          </div>
        )}
      </div>
      <div ref={choiceRef} className={styles.actions} style={{ flex: '0 0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
        <a
          href={offer.resumeUrl}
          aria-disabled={checkout.pending !== null}
          onClick={(e) => {
            // KINEO-CHECKOUT-TRIAGE-2026-07-25 — one click = one resume. This
            // banner is shown to buyers who already abandoned once, so a second
            // impatient tap here is exactly the behaviour that produced the
            // duplicate-session bursts.
            e.preventDefault()
            const started = checkout.launch('resume', offer.resumeUrl, {
              destination_kind: offer.destinationKind,
            })
            if (!started) return
            humanViewStopRef.current?.()
            void trackEvent('checkout_resume_banner_clicked', eventMetadata)
          }}
          style={{
            borderRadius: 10,
            padding: '9px 12px',
            background: 'linear-gradient(135deg, #2997ff, #1d6fe0)',
            color: '#fff',
            fontSize: '0.78rem',
            fontWeight: 850,
            textDecoration: 'none',
            whiteSpace: 'nowrap',
            opacity: checkout.pending !== null ? 0.7 : 1,
            cursor: checkout.pending !== null ? 'wait' : 'pointer',
          }}
        >
          {checkout.pending !== null ? 'Opening…' : film ? 'Finish secure checkout' : savedGoal ? 'Resume this goal' : 'Resume checkout'}
        </a>
        <Link
          href={COMPARE_PLANS_HREF}
          aria-label="See smaller subscription plans"
          onClick={() => {
            humanViewStopRef.current?.()
            void trackEvent('checkout_resume_smaller_plan_clicked', {
              ...eventMetadata,
              target: 'pricing_plans',
            })
          }}
          style={{
            color: '#9ccfff',
            fontSize: '0.7rem',
            fontWeight: 800,
            lineHeight: 1.2,
            textDecoration: 'underline',
            textUnderlineOffset: 3,
            whiteSpace: 'nowrap',
          }}
        >
          See smaller plans
        </Link>
      </div>
      <button
        className={styles.dismiss}
        type="button"
        aria-label="Dismiss checkout reminder"
        onClick={dismiss}
        style={{
          flex: '0 0 auto',
          width: 28,
          height: 28,
          padding: 0,
          border: 0,
          borderRadius: 8,
          background: 'transparent',
          color: '#8d99ac',
          cursor: 'pointer',
          fontSize: 20,
          lineHeight: 1,
        }}
      >
        ×
      </button>
    </aside>
  )
}
