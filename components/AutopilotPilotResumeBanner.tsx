'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { trackEvent } from '@/lib/analytics'
import { useCheckoutLaunch, useStalledCheckout } from '@/lib/checkoutTelemetry'
import { formatCheckoutResumeMoney } from '@/lib/checkoutResumeSurface'
import {
  AUTOPILOT_PILOT_RESUME_VERSION,
  AUTOPILOT_PILOT_RESUME_HINT_COOKIE,
  AUTOPILOT_PILOT_RESUME_VISIBLE_RATIO,
  autopilotPilotResumeMetadata,
  isAutopilotPilotResumeMeasurementHost,
} from '@/lib/growth/autopilotPilotResume'

type PilotResumeOffer = {
  available: true
  productKind: 'autopilot_pilot'
  variant: typeof AUTOPILOT_PILOT_RESUME_VERSION
  resumeUrl: string
  destinationKind: 'open_session' | 'stripe_recovery' | 'internal_retry'
  currency: string
  amountTotal: number
  days: number
}

const HIDDEN_PATHS = [
  '/login',
  '/signup',
  '/forgot-password',
  '/reset-password',
  '/auth',
  '/checkout/success',
  '/checkout/cancelled',
  '/v',
]
const VIEW_MARKER = `${AUTOPILOT_PILOT_RESUME_VERSION}:viewed`
const CLICK_MARKER = `${AUTOPILOT_PILOT_RESUME_VERSION}:clicked`
const recorded = new Set<string>()
const inFlight = new Set<string>()

function shouldHide(pathname: string): boolean {
  return HIDDEN_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`))
}

function hasPilotResumeHint(): boolean {
  try {
    return document.cookie
      .split(';')
      .some((part) => part.trim() === `${AUTOPILOT_PILOT_RESUME_HINT_COOKIE}=1`)
  } catch {
    return false
  }
}

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

async function recordOnce(
  marker: string,
  eventName: string,
  metadata: Record<string, unknown>,
): Promise<boolean> {
  if (wasRecorded(marker) || inFlight.has(marker)) return false
  inFlight.add(marker)
  const stored = await trackEvent(eventName, metadata)
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

export default function AutopilotPilotResumeBanner() {
  const pathname = usePathname()
  const bannerRef = useRef<HTMLElement | null>(null)
  const [offer, setOffer] = useState<PilotResumeOffer | null>(null)
  const checkout = useCheckoutLaunch('autopilot_pilot_resume_banner')
  const stalled = useStalledCheckout()

  useEffect(() => {
    if (shouldHide(pathname) || !hasPilotResumeHint()) {
      setOffer(null)
      return
    }

    const controller = new AbortController()
    void fetch('/api/stripe/checkout/pilot-resume', {
      method: 'GET',
      credentials: 'same-origin',
      cache: 'no-store',
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) return null
        return response.json() as Promise<PilotResumeOffer | { available: false }>
      })
      .then((result) => {
        setOffer(result?.available === true ? result : null)
      })
      .catch(() => {
        // Recovery is optional and must never disturb the page.
      })

    return () => controller.abort()
  }, [pathname])

  useEffect(() => {
    const banner = bannerRef.current
    if (!offer || !banner || typeof IntersectionObserver === 'undefined') return
    if (!isAutopilotPilotResumeMeasurementHost(window.location.hostname)) return
    if (wasRecorded(VIEW_MARKER)) return

    const metadata = autopilotPilotResumeMetadata(offer.destinationKind)
    const observer = new IntersectionObserver((entries) => {
      const entry = entries[0]
      if (!entry?.isIntersecting || entry.intersectionRatio < AUTOPILOT_PILOT_RESUME_VISIBLE_RATIO) return
      void recordOnce(VIEW_MARKER, 'autopilot_pilot_resume_viewed', metadata).then((stored) => {
        if (stored || wasRecorded(VIEW_MARKER)) observer.disconnect()
      })
    }, { threshold: [AUTOPILOT_PILOT_RESUME_VISIBLE_RATIO] })

    observer.observe(banner)
    return () => observer.disconnect()
  }, [offer])

  if (!offer || shouldHide(pathname) || stalled) return null

  const price = formatCheckoutResumeMoney(offer.amountTotal, offer.currency)
  const metadata = autopilotPilotResumeMetadata(offer.destinationKind)

  const dismiss = () => {
    setOffer(null)
    if (isAutopilotPilotResumeMeasurementHost(window.location.hostname)) {
      void trackEvent('autopilot_pilot_resume_dismissed', metadata)
    }
    void fetch('/api/stripe/checkout/pilot-resume', {
      method: 'POST',
      credentials: 'same-origin',
      keepalive: true,
    }).catch(() => {
      // The in-memory dismissal still prevents a disruptive retry loop.
    })
  }

  return (
    <>
    <aside
      ref={bannerRef}
      className="appr-banner"
      aria-label="Resume Autopilot Pilot checkout"
      aria-live="polite"
      data-experiment={AUTOPILOT_PILOT_RESUME_VERSION}
      style={{
        position: 'fixed',
        zIndex: 10052,
        left: '50%',
        bottom: 16,
        transform: 'translateX(-50%)',
        width: 'min(700px, calc(100vw - 24px))',
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        padding: '12px 14px',
        border: '1px solid rgba(52,211,153,.42)',
        borderRadius: 16,
        background: 'rgba(7,20,18,.97)',
        color: '#f8fafc',
        boxShadow: '0 18px 55px rgba(0,0,0,.48)',
        backdropFilter: 'blur(14px)',
        fontFamily: 'var(--font-inter), Inter, system-ui, sans-serif',
      }}
    >
      <div className="appr-copy" style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontSize: '0.88rem', lineHeight: 1.25, fontWeight: 850 }}>
          Your Autopilot Pilot checkout is saved
        </div>
        <div style={{ marginTop: 3, color: '#a7f3d0', fontSize: '0.76rem', lineHeight: 1.35, fontWeight: 800 }}>
          {offer.days} Shorts over {offer.days} days · {price} one time · no auto-renewal
        </div>
        <div style={{ marginTop: 3, color: '#b8c7c2', fontSize: '0.74rem', lineHeight: 1.35 }}>
          Opening this reminder never charges you. Payment completes only inside Stripe.
        </div>
        {checkout.error ? (
          <div role="alert" style={{ marginTop: 6, color: '#ff9b9b', fontSize: '0.74rem', fontWeight: 700, lineHeight: 1.35 }}>
            {checkout.error}
          </div>
        ) : null}
      </div>
      <div className="appr-actions" style={{ flex: '0 0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
        <a
          className="appr-cta"
          href={offer.resumeUrl}
          aria-disabled={checkout.pending !== null}
          onClick={(event) => {
            event.preventDefault()
            const started = checkout.launch('autopilot_pilot', offer.resumeUrl, {
              product: 'autopilot_pilot',
              destination_kind: offer.destinationKind,
            })
            if (!started) return
            if (isAutopilotPilotResumeMeasurementHost(window.location.hostname)) {
              void recordOnce(CLICK_MARKER, 'autopilot_pilot_resume_clicked', metadata)
            }
          }}
          style={{
            borderRadius: 10,
            padding: '9px 12px',
            background: 'linear-gradient(135deg, #34d399, #10b981)',
            color: '#04110c',
            fontSize: '0.78rem',
            fontWeight: 900,
            textDecoration: 'none',
            whiteSpace: 'nowrap',
            opacity: checkout.pending !== null ? 0.7 : 1,
            cursor: checkout.pending !== null ? 'wait' : 'pointer',
          }}
        >
          {checkout.pending !== null ? 'Opening…' : 'Resume one-time checkout'}
        </a>
        <Link
          href="/pricing#autopilot"
          style={{
            color: '#a7f3d0',
            fontSize: '0.7rem',
            fontWeight: 800,
            lineHeight: 1.2,
            textDecoration: 'underline',
            textUnderlineOffset: 3,
            whiteSpace: 'nowrap',
          }}
        >
          Review Pilot details
        </Link>
      </div>
      <button
        className="appr-dismiss"
        type="button"
        aria-label="Dismiss Pilot checkout reminder"
        onClick={dismiss}
        style={{
          flex: '0 0 auto',
          width: 28,
          height: 28,
          padding: 0,
          border: 0,
          borderRadius: 8,
          background: 'transparent',
          color: '#91a69f',
          cursor: 'pointer',
          fontSize: 20,
          lineHeight: 1,
        }}
      >
        ×
      </button>
    </aside>
    <style jsx>{`
      @media (max-width: 560px) {
        .appr-banner {
          align-items: flex-start !important;
          flex-wrap: wrap;
          gap: 10px !important;
          padding: 12px !important;
        }
        .appr-copy {
          flex: 1 1 calc(100% - 32px) !important;
          padding-right: 18px;
        }
        .appr-actions {
          width: 100%;
        }
        .appr-cta {
          width: 100%;
          text-align: center;
        }
        .appr-dismiss {
          position: absolute;
          top: 8px;
          right: 8px;
        }
      }
    `}</style>
    </>
  )
}
