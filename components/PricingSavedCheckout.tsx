'use client'

import { useEffect, useRef, useState } from 'react'
import { trackEvent } from '@/lib/analytics'
import { useCheckoutLaunch } from '@/lib/checkoutTelemetry'
import { formatCheckoutResumeMoney, type CheckoutResumeOffer } from '@/lib/checkoutResumeSurface'

function offerKey(offer: CheckoutResumeOffer): string {
  return [
    offer.tier,
    offer.billing,
    offer.currency,
    offer.firstChargeAmount,
    offer.renewalAmount,
    offer.destinationKind,
  ].join(':')
}

function eventMetadata(offer: CheckoutResumeOffer): Record<string, unknown> {
  return {
    surface: 'pricing',
    tier: offer.tier,
    billing: offer.billing,
    currency: offer.currency,
    first_charge_amount: offer.firstChargeAmount,
    renewal_amount: offer.renewalAmount,
    destination_kind: offer.destinationKind,
  }
}

export default function PricingSavedCheckout() {
  const [offer, setOffer] = useState<CheckoutResumeOffer | null>(null)
  const viewedKey = useRef<string | null>(null)
  const checkout = useCheckoutLaunch('pricing_saved_checkout')

  useEffect(() => {
    const controller = new AbortController()

    void fetch('/api/stripe/checkout/resume?surface=pricing', {
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
        if (!result || result.available !== true) return
        setOffer(result)

        const key = offerKey(result)
        if (viewedKey.current === key) return
        viewedKey.current = key
        void trackEvent('pricing_saved_checkout_viewed', eventMetadata(result))
      })
      .catch(() => {
        // Recovery is optional. Pricing and normal checkout remain usable.
      })

    return () => controller.abort()
  }, [])

  if (!offer) return null

  const firstCharge = formatCheckoutResumeMoney(offer.firstChargeAmount, offer.currency)
  const renewal = formatCheckoutResumeMoney(offer.renewalAmount, offer.currency)
  const renewalUnit = offer.billing === 'annual' ? 'year' : 'month'

  return (
    <section
      aria-labelledby="pricing-saved-checkout-title"
      className="mx-auto mb-8 max-w-3xl overflow-hidden rounded-2xl border border-[#2997ff]/45 bg-gradient-to-r from-[#111d2c] via-[#111820] to-[#141416] shadow-[0_20px_65px_-35px_rgba(41,151,255,.75)]"
    >
      <div className="flex flex-col gap-5 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="min-w-0">
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-[#2997ff]/30 bg-[#2997ff]/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[.14em] text-[#62b3ff]">
            <span aria-hidden="true">✓</span>
            Saved securely
          </div>
          <h2 id="pricing-saved-checkout-title" className="text-xl font-black tracking-[-.02em] text-white">
            Continue your {offer.planName} checkout
          </h2>
          <p className="mt-1.5 text-[13px] font-semibold leading-relaxed text-[#a9b4c5]">
            Your choice is still here: first charge {firstCharge}, then {renewal}/{renewalUnit}. No need to choose the plan again.
          </p>
          {checkout.error && (
            <p role="alert" className="mt-2 text-[12px] font-bold text-[#ff8f8f]">
              {checkout.error}
            </p>
          )}
        </div>

        <a
          href={offer.resumeUrl}
          aria-disabled={checkout.pending !== null}
          onClick={(event) => {
            event.preventDefault()
            const started = checkout.launch('resume', offer.resumeUrl, {
              destination_kind: offer.destinationKind,
              tier: offer.tier,
              billing: offer.billing,
            })
            if (!started) return
            void trackEvent('pricing_saved_checkout_clicked', eventMetadata(offer))
          }}
          className="inline-flex min-h-11 flex-none items-center justify-center rounded-xl bg-[#2997ff] px-5 py-3 text-[13px] font-black text-white no-underline shadow-[0_12px_30px_-15px_rgba(41,151,255,.95)] transition hover:bg-[#4aa8ff] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#62b3ff]"
          style={{
            opacity: checkout.pending !== null ? 0.68 : 1,
            cursor: checkout.pending !== null ? 'wait' : 'pointer',
          }}
        >
          {checkout.pending !== null ? 'Opening secure checkout…' : 'Continue securely →'}
        </a>
      </div>
    </section>
  )
}
