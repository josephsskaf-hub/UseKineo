'use client'

// KINEO-STUDIO50-2026-09-22 — a oferta "Studio a 50%" mora onde a pessoa VOLTA sozinha (pricing e checkout
// cancelado), não só no e-mail (4 cartas, 196 envios, 0 pagamentos nessa coorte). Quem decide se mostra é o
// servidor (/api/offers/studio50); este componente só desenha e mede. Nada aparece para quem já paga.
import { useEffect, useRef, useState } from 'react'
import { trackEvent } from '@/lib/analytics'
import { STUDIO50_CLICKED_EVENT, STUDIO50_SHOWN_EVENT, offerCheckoutHref, studio50Copy, studio50OfferFor } from '@/lib/offers/studio50'

type Elig = { eligible: boolean; reason: string; attempts: number; lastAttemptAt: string | null; lastTier: string | null }

export default function Studio50OfferBanner({ surface }: { surface: 'pricing' | 'cancelled' }) {
  const [elig, setElig] = useState<Elig | null>(null)
  const shown = useRef(false)

  useEffect(() => {
    let alive = true
    fetch('/api/offers/studio50', { credentials: 'same-origin', cache: 'no-store' })
      .then((r) => (r.ok ? (r.json() as Promise<Elig>) : null))
      .then((e) => { if (alive && e) setElig(e) })
      .catch(() => { /* sem oferta é o padrão seguro */ })
    return () => { alive = false }
  }, [])

  useEffect(() => {
    if (!elig?.eligible || shown.current) return
    shown.current = true
    void trackEvent(STUDIO50_SHOWN_EVENT, { surface, attempts: elig.attempts, last_attempt_at: elig.lastAttemptAt, last_tier: elig.lastTier, offer: studio50OfferFor(elig.lastTier).code })
  }, [elig, surface])

  if (!elig?.eligible) return null
  const offer = studio50OfferFor(elig.lastTier)
  const copy = studio50Copy(offer)
  const href = offerCheckoutHref(offer, surface)
  return (
    <section
      data-studio50-surface={surface}
      style={{
        margin: surface === 'pricing' ? '0 auto 22px' : '18px 0 0', maxWidth: 980,
        border: '1px solid rgba(48,209,88,0.45)', background: 'linear-gradient(135deg, rgba(48,209,88,0.12), rgba(41,151,255,0.08))',
        borderRadius: 16, padding: '18px 20px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 14, justifyContent: 'space-between',
      }}
    >
      <div style={{ minWidth: 0, flex: '1 1 320px' }}>
        <p style={{ margin: '0 0 4px', fontSize: 11, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#30d158' }}>{copy.eyebrow}</p>
        <p style={{ margin: 0, fontSize: '1.02rem', fontWeight: 800, lineHeight: 1.35, color: '#f5f5f7' }}>{copy.headline}</p>
        <p style={{ margin: '6px 0 0', fontSize: '0.86rem', color: '#a1a1a6', lineHeight: 1.5 }}>{copy.sub}</p>
      </div>
      <a
        href={href}
        onClick={() => { void trackEvent(STUDIO50_CLICKED_EVENT, { surface, attempts: elig.attempts, offer: offer.code }) }}
        style={{ flex: '0 0 auto', background: '#30d158', color: '#04120a', fontWeight: 900, padding: '12px 22px', borderRadius: 980, textDecoration: 'none', fontSize: '0.95rem', whiteSpace: 'nowrap' }}
      >
        {copy.cta}
      </a>
    </section>
  )
}
