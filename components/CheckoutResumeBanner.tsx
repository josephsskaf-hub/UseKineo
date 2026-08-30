'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { trackEvent } from '@/lib/analytics'
import { useCheckoutLaunch, useStalledCheckout } from '@/lib/checkoutTelemetry'
import {
  formatCheckoutResumeMoney,
  formatCheckoutResumePlanFitGoal,
  type CheckoutResumeOffer,
} from '@/lib/checkoutResumeSurface'

const RESUME_CHOICE_VERSION = 'resume_smaller_choice_v1'
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
  const viewedKey = useRef<string | null>(null)
  const checkout = useCheckoutLaunch('checkout_resume_banner')
  // KINEO-CHECKOUT-REDIRECT-2026-08-08 — os dois cards ocupam o MESMO canto.
  // Enquanto o CTA de resgate (checkout travado agora, sessão viva) está no ar,
  // este banner ("seu checkout está salvo") sai da frente: são dois pedidos
  // concorrentes no instante mais sensível da jornada, e o urgente é o outro.
  const stalled = useStalledCheckout()

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
          RESUME_CHOICE_VERSION,
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
            resume_choice_version: RESUME_CHOICE_VERSION,
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

  if (!offer || shouldHide(pathname) || stalled) return null

  const firstCharge = formatCheckoutResumeMoney(offer.firstChargeAmount, offer.currency)
  const renewal = formatCheckoutResumeMoney(offer.renewalAmount, offer.currency)
  const renewalUnit = offer.billing === 'annual' ? 'year' : 'month'
  const savedGoal = offer.planFit ? formatCheckoutResumePlanFitGoal(offer.planFit) : null
  const eventMetadata = {
    resume_choice_version: RESUME_CHOICE_VERSION,
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
  }

  const dismiss = () => {
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
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontSize: '0.88rem', lineHeight: 1.25, fontWeight: 850 }}>
          Your {offer.planName} checkout is saved
        </div>
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
      <div style={{ flex: '0 0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
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
          {checkout.pending !== null ? 'Opening…' : savedGoal ? 'Resume this goal' : 'Resume checkout'}
        </a>
        <Link
          href={COMPARE_PLANS_HREF}
          aria-label="See smaller subscription plans"
          onClick={() => void trackEvent('checkout_resume_smaller_plan_clicked', {
            ...eventMetadata,
            target: 'pricing_plans',
          })}
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
