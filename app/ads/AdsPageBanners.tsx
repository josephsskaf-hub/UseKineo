'use client'

// KINEO-STUDIO-ADS-SELF-SERVE-2026-09-24 — the client half of the public door /ads.
//
// WHAT LIVES HERE (and nothing else):
//   · the inline banner for the two ways the checkout sends people back here:
//     /ads?checkout_error=<msg> (app/api/stripe/checkout, buildAdsPassAndRedirect) and /ads?checkout=cancelled;
//   · ONE `ads_page_viewed` per page load (ref, not render), carrying the CTA state the server decided
//     ('open' | 'buy' | 'full' | 'soon'), so the impression can be split by branch before anyone reads a rate;
//   · the CTA wrapper that writes `ads_cta_clicked` — the FIRST gesture, the event impressions are compared with.
//
// The checkout error text arrives in the URL, so it is never echoed as-is: a crafted link could otherwise print
// any sentence on our page. Only the messages the checkout actually writes are shown verbatim; anything else
// becomes a generic sentence. The price is never typed here — the server page passes the label in.
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useSearchParams } from 'next/navigation'
import { trackEvent } from '@/lib/analytics'
import { ADS_OFFER_VERSION } from '@/lib/ads/offer'

export type AdsDoorCta = 'open' | 'buy' | 'full' | 'soon'

/** Messages the ads checkout redirects with (app/api/stripe/checkout/route.ts, buildAdsPassAndRedirect). */
const KNOWN_CHECKOUT_ERRORS: readonly string[] = [
  'Studio Ads opens soon.',
  'We could not confirm your sign-in. Please sign in and try again.',
  'Payment service is not configured. Please contact support.',
]
const GENERIC_CHECKOUT_ERROR = 'Checkout could not start. Please try again in a minute.'

function checkoutErrorMessage(raw: string | null): string | null {
  if (raw === null) return null
  const msg = raw.trim()
  if (KNOWN_CHECKOUT_ERRORS.includes(msg)) return msg
  if (msg.startsWith('Payment session failed')) return 'The payment page could not be created. Please try again in a minute.'
  return GENERIC_CHECKOUT_ERROR
}

/** `?from=` of the entry links (business_ads, dfy_card). Only a short snake_case token reaches the event. */
function entrySource(raw: string | null): string | null {
  const v = (raw ?? '').trim().toLowerCase()
  return /^[a-z0-9_]{1,40}$/.test(v) ? v : null
}

export default function AdsPageBanners({ live, cta }: { live: boolean; cta: AdsDoorCta }) {
  const params = useSearchParams()
  const error = checkoutErrorMessage(params?.get('checkout_error') ?? null)
  const cancelled = !error && params?.get('checkout') === 'cancelled'
  const from = entrySource(params?.get('from') ?? null)
  const [dismissed, setDismissed] = useState(false)
  const viewedRef = useRef(false)

  useEffect(() => {
    if (viewedRef.current) return
    viewedRef.current = true
    try {
      void trackEvent('ads_page_viewed', {
        live,
        cta,
        ads_offer_version: ADS_OFFER_VERSION,
        from,
        returned: error ? 'checkout_error' : cancelled ? 'checkout_cancelled' : null,
      })
    } catch {
      /* telemetry never breaks the page */
    }
  }, [live, cta, from, error, cancelled])

  function dismiss() {
    setDismissed(true)
    try {
      const url = new URL(window.location.href)
      url.searchParams.delete('checkout_error')
      url.searchParams.delete('checkout')
      window.history.replaceState(window.history.state, '', url.pathname + url.search + url.hash)
    } catch {
      /* the banner is already hidden */
    }
  }

  if (dismissed || (!error && !cancelled)) return null

  return error ? (
    <div className="ads-banner err" role="alert">
      <p>
        <b>Checkout did not open.</b> {error}
      </p>
      <button type="button" className="ads-x" aria-label="Dismiss message" onClick={dismiss}>×</button>
    </div>
  ) : (
    <div className="ads-banner" role="status">
      <p>
        <b>Checkout cancelled.</b> You have not been charged. The pass is below whenever you are ready.
      </p>
      <button type="button" className="ads-x" aria-label="Dismiss message" onClick={dismiss}>×</button>
    </div>
  )
}

/** The door's CTA: a plain <a> (never a prefetching <Link>) that records the first gesture before navigating. */
export function AdsCtaLink({
  href,
  cta,
  placement,
  className,
  children,
}: {
  href: string
  cta: Extract<AdsDoorCta, 'open' | 'buy'>
  placement: 'hero' | 'price' | 'end'
  className?: string
  children: ReactNode
}) {
  return (
    <a
      href={href}
      className={className}
      data-kineo="ads-door-cta"
      data-cta={cta}
      onClick={() => {
        try {
          void trackEvent('ads_cta_clicked', { source: 'ads_page', cta, placement, ads_offer_version: ADS_OFFER_VERSION })
        } catch {
          /* ignore */
        }
      }}
    >
      {children}
    </a>
  )
}
