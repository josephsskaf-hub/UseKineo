'use client'

import { trackEvent } from '@/lib/analytics'
import { formatCheckoutMoney, getTierPrice, type CheckoutCurrency, type PriceRegion } from '@/lib/checkoutPricing'
import { useMrrVisible } from '@/lib/growth/useMrrVisible'

const RELEASE: 'on' | 'off' = 'off'
const CAMPAIGN = 'first_film_wait_2511'

type WaitOfferEvidence = {
  mode: string
  filmsDelivered: number | null
  confirmedFree: boolean
  activePlan: boolean
}

export function firstFilmWaitOfferVisible(evidence: WaitOfferEvidence, release: 'on' | 'off' = RELEASE) {
  return release === 'on'
    && (evidence.mode === 'cinematic' || evidence.mode === 'cinematic_ai')
    && evidence.filmsDelivered === 0
    && evidence.confirmedFree
    && !evidence.activePlan
}

export default function FirstFilmWaitOffer({ currency, region }: { currency: CheckoutCurrency | null; region: PriceRegion }) {
  const { root } = useMrrVisible('first_film_wait_offer', CAMPAIGN)
  const price = currency ? formatCheckoutMoney(currency, getTierPrice('starter', currency, region)) : null

  return (
    <div ref={root} data-testid="first-film-wait-offer" className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border px-4 py-3.5"
      style={{ background: 'var(--accent-soft)', borderColor: 'var(--border)' }}>
      <div>
        <p className="m-0 text-sm font-semibold" style={{ color: 'var(--text)' }}>Make longer films without a watermark</p>
        <p className="m-0 mt-1 text-xs leading-relaxed" style={{ color: 'var(--muted2)' }}>
          Your first film is still rendering.{price ? <> Plans from {price}/month.</> : null}
        </p>
      </div>
      <a href={`/pricing?intent_campaign=${CAMPAIGN}#plans`}
        onClick={() => { void trackEvent('first_film_cta_click', { version: CAMPAIGN, target: 'pricing', surface: 'film_wait' }) }}
        className="inline-flex min-h-11 w-full items-center justify-center rounded-xl px-4 text-sm font-semibold sm:w-auto"
        style={{ background: 'var(--accent)', color: 'var(--on-accent)', textDecoration: 'none' }}>
        See plans
      </a>
    </div>
  )
}
