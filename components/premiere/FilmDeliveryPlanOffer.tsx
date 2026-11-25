'use client'

import { trackEvent } from '@/lib/analytics'
import { formatCheckoutMoney, getTierPrice, type CheckoutCurrency, type PriceRegion } from '@/lib/checkoutPricing'
import { FILM_COMPLETE_TARGET_SECONDS } from '@/lib/growth/filmComplete'
import { useMrrVisible } from '@/lib/growth/useMrrVisible'

const RELEASE: 'on' | 'off' = 'off'
const CAMPAIGN = 'film_delivery_next_2511'

type DeliveryEvidence = {
  delivered: boolean
  confirmedFree: boolean
  activePlan: boolean
  finishedSeconds: number | null
  fullVersionEligible: boolean
}

export function decideFilmDeliveryOffer(evidence: DeliveryEvidence, release: 'on' | 'off' = RELEASE) {
  if (release === 'off' || !evidence.delivered || !evidence.confirmedFree || evidence.activePlan) return 'legacy'
  const finishedSeconds = evidence.finishedSeconds
  return evidence.fullVersionEligible && finishedSeconds !== null
    && Number.isFinite(finishedSeconds) && finishedSeconds > 0 && finishedSeconds < FILM_COMPLETE_TARGET_SECONDS
    ? 'full_version'
    : 'next_film'
}

export default function FilmDeliveryPlanOffer({ currency, region, canContinue }: {
  currency: CheckoutCurrency | null
  region: PriceRegion
  canContinue: boolean
}) {
  const { root } = useMrrVisible('film_delivery_next_offer', CAMPAIGN)
  const price = currency ? formatCheckoutMoney(currency, getTierPrice('starter', currency, region)) : null
  const title = canContinue ? 'Make the next episode' : 'Make another film'

  return (
    <div ref={root} data-testid="film-delivery-plan-offer" className="w-full rounded-2xl border px-5 py-4"
      style={{ background: 'var(--accent-soft)', borderColor: 'var(--border)' }}>
      <h3 className="m-0 text-base font-semibold leading-snug" style={{ color: 'var(--text)' }}>{title}</h3>
      <p className="m-0 mt-2 text-sm leading-relaxed" style={{ color: 'var(--muted2)' }}>
        {canContinue ? 'Keep your series going with a paid plan.' : 'Create longer films without a watermark.'}
        {price ? <> Plans from {price}/month.</> : null}
      </p>
      <a href={`/pricing?intent_campaign=${CAMPAIGN}#plans`}
        onClick={() => { void trackEvent('film_delivery_next_offer_clicked', { version: CAMPAIGN, target: 'pricing', surface: 'film_ready' }) }}
        className="mt-3 flex w-full items-center justify-center rounded-xl px-4 text-center text-sm font-semibold"
        style={{ background: 'var(--accent)', color: 'var(--on-accent)', textDecoration: 'none', minHeight: 44 }}>
        See plans
      </a>
    </div>
  )
}
