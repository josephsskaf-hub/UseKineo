'use client'

// KINEO-AVULSO-290-2CHECKOUT-0111 — o card compacto "Just want one film? $2.90" para quem já abandonou um checkout. Mora onde a
// pessoa VOLTA do checkout (/checkout/cancelled, o cancel_url da assinatura) e onde aperta o checkout pela 2ª vez (/pricing).
// Quem decide se aparece é o SERVIDOR (/api/offers/offer290-rescue → lib/offers/offer290Rescue); este componente só desenha e
// mede. O botão abre o SKU starter290, que o /api/stripe/checkout re-confere com a mesma regra (1 por conta, nunca para quem paga).
import { useEffect, useRef, useState } from 'react'
import { trackEvent } from '@/lib/analytics'
import { useCheckoutLaunch } from '@/lib/checkoutTelemetry'
import {
  OFFER290_RESCUE_CHECKOUT_HREF,
  OFFER290_RESCUE_CLICKED_EVENT,
  OFFER290_RESCUE_SHOWN_EVENT,
  OFFER290_RESCUE_SKU,
  OFFER290_RESCUE_VERSION,
  offer290RescueCopy,
  type Offer290RescueEligibility,
} from '@/lib/offers/offer290Rescue'

export type Offer290RescueSurface = 'cancelled' | 'pricing'

export default function Offer290RescueCard({ surface }: { surface: Offer290RescueSurface }) {
  const [elig, setElig] = useState<Offer290RescueEligibility | null>(null)
  const shown = useRef(false)
  const checkout = useCheckoutLaunch(`offer290_rescue_${surface}`)

  useEffect(() => {
    let alive = true
    fetch('/api/offers/offer290-rescue', { credentials: 'same-origin', cache: 'no-store' })
      .then((r) => (r.ok ? (r.json() as Promise<Offer290RescueEligibility>) : null))
      .then((e) => { if (alive && e) setElig(e) })
      .catch(() => { /* sem oferta é o padrão seguro */ })
    return () => { alive = false }
  }, [])

  useEffect(() => {
    if (!elig?.eligible || shown.current) return
    shown.current = true
    void trackEvent(OFFER290_RESCUE_SHOWN_EVENT, { surface, version: OFFER290_RESCUE_VERSION, checkout_starts: elig.checkoutStarts, sku: OFFER290_RESCUE_SKU })
  }, [elig, surface])

  if (!elig?.eligible) return null
  const copy = offer290RescueCopy(elig.priceLabel)
  const pending = checkout.pending !== null
  return (
    <section
      data-offer290-rescue={surface}
      style={{
        margin: surface === 'pricing' ? '0 auto 22px' : '18px 0 0', maxWidth: 980, textAlign: 'left',
        border: '1px solid var(--border)', background: 'var(--card, transparent)',
        borderRadius: 16, padding: '16px 18px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 14, justifyContent: 'space-between',
      }}
    >
      <div style={{ minWidth: 0, flex: '1 1 260px' }}>
        <p style={{ margin: '0 0 4px', fontSize: 11, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted2, var(--muted))' }}>{copy.eyebrow}</p>
        <p style={{ margin: 0, fontSize: '1rem', fontWeight: 850, lineHeight: 1.35, color: 'var(--text)' }}>{copy.headline}</p>
        <p style={{ margin: '4px 0 0', fontSize: '0.86rem', color: 'var(--muted2, var(--muted))', lineHeight: 1.5 }}>{copy.body}</p>
        <p style={{ margin: '4px 0 0', fontSize: '0.74rem', color: 'var(--muted2, var(--muted))', fontWeight: 600, opacity: 0.85 }}>{copy.fine}</p>
        {checkout.error && (
          <p role="alert" style={{ margin: '6px 0 0', fontSize: '0.78rem', color: '#ff6b6b', fontWeight: 700 }}>{checkout.error}</p>
        )}
      </div>
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          const started = checkout.launch(OFFER290_RESCUE_SKU, OFFER290_RESCUE_CHECKOUT_HREF, {
            pack: OFFER290_RESCUE_SKU,
            pricing_surface: `offer290_rescue_${surface}`,
          })
          if (!started) return
          void trackEvent(OFFER290_RESCUE_CLICKED_EVENT, { surface, version: OFFER290_RESCUE_VERSION, checkout_starts: elig.checkoutStarts, sku: OFFER290_RESCUE_SKU })
        }}
        style={{
          flex: '0 0 auto', background: 'var(--text)', color: 'var(--bg)', fontWeight: 900, padding: '11px 20px', borderRadius: 980,
          border: 'none', fontSize: '0.92rem', whiteSpace: 'nowrap', cursor: pending ? 'wait' : 'pointer', opacity: pending ? 0.7 : 1,
        }}
      >
        {pending ? 'Opening secure checkout…' : copy.cta}
      </button>
    </section>
  )
}
