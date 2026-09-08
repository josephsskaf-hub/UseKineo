'use client'

import { useEffect, useRef } from 'react'
import { useCheckoutLaunch } from '@/lib/checkoutTelemetry'
import { trackClosedEvent } from '@/lib/analytics'
import { useInterfaceLanguage } from '@/components/InterfaceLanguage'
import {
  POST_FILM_CREATOR_VERSION,
  postFilmCreatorCheckoutHref,
  postFilmCreatorFacts,
  type CreatorOfferSurface,
} from '@/lib/growth/postFilmCreatorOffer'

type Props = {
  surface: CreatorOfferSurface
  eligible: boolean
  videoId?: string
  pending?: boolean
  firstPurchaseOnly?: boolean
  handoffHref?: string
  onLaunch?: (key: string, url: string, metadata: Record<string, unknown>) => boolean
  error?: string | null
}

export default function PostFilmCreatorOffer({ surface, eligible, videoId, pending = false, firstPurchaseOnly = false, handoffHref, onLaunch, error }: Props) {
  const language = useInterfaceLanguage()
  const checkout = useCheckoutLaunch(surface)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const handoffRef = useRef<HTMLAnchorElement>(null)
  const tracked = useRef<string | null>(null)
  const facts = postFilmCreatorFacts()
  const busy = pending || checkout.pending !== null
  const afterFilm = surface !== 'gpt_handoff'
  const campaign = `${POST_FILM_CREATOR_VERSION}_${surface}`
  const t = (en: string, es: string, hi: string) => language === 'es' ? es : language === 'hi' ? hi : en
  const metadata = {
    version: POST_FILM_CREATOR_VERSION,
    surface,
    intent_campaign: campaign,
    has_owned_film: afterFilm && Boolean(videoId),
    video_id: videoId ?? null,
    eligibility: firstPurchaseOnly ? 'first_purchase_required' : 'profile_verified',
    card_trial: '1',
    tier: 'basic',
    billing: 'monthly',
  }

  // Observe the actionable control, not a mount/page request. SQL still counts
  // identified people, and never treats browser visibility as proof of humanity.
  useEffect(() => {
    const button = afterFilm ? buttonRef.current : handoffRef.current
    const key = `${surface}:${videoId ?? 'script'}`
    if (!eligible || busy || !button || tracked.current === key || !('IntersectionObserver' in window)) return
    let visible = false
    let timer: ReturnType<typeof setTimeout> | null = null
    const clear = () => { if (timer !== null) clearTimeout(timer); timer = null }
    const update = () => {
      clear()
      if (!visible || document.visibilityState !== 'visible' || tracked.current === key) return
      timer = setTimeout(() => {
        if (!visible || document.visibilityState !== 'visible') return
        tracked.current = key
        void trackClosedEvent('pista3_creator_offer_viewed', { ...metadata, visible_ratio: 0.5, visible_ms: 1000 })
      }, 1000)
    }
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting && entry.intersectionRatio >= 0.5
      update()
    }, { threshold: [0, 0.5] })
    observer.observe(button)
    document.addEventListener('visibilitychange', update)
    return () => { clear(); observer.disconnect(); document.removeEventListener('visibilitychange', update) }
    // Context is fixed for this surface and owned film; avoid a new impression on copy changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eligible, busy, surface, videoId, firstPurchaseOnly, handoffHref])

  if (!eligible || (!afterFilm && !handoffHref)) return null

  return (
    <section data-testid="pista3-creator-offer" data-pista3-version={POST_FILM_CREATOR_VERSION}
      style={{ border: '1px solid #31587a', borderRadius: 18, padding: 20, background: '#0d1822', color: '#f5f5f7', textAlign: 'left' }}>
      <p style={{ margin: '0 0 8px', color: '#80c6ff', fontSize: 11, fontWeight: 800, letterSpacing: '.08em', textTransform: 'uppercase' }}>
        {t('Your next film · Creator', 'Tu próximo vídeo · Creator', 'आपकी अगली फ़िल्म · Creator')}
      </p>
      <h2 style={{ margin: '0 0 10px', fontSize: 22, lineHeight: 1.18, letterSpacing: '-.025em', fontWeight: 800 }}>
        {afterFilm
          ? t('Your next film, without the watermark.', 'Tu próximo vídeo, sin marca de agua.', 'आपकी अगली फ़िल्म, बिना वॉटरमार्क के।')
          : t('An idea worth taking further?', '¿Una idea que merece ir más lejos?', 'क्या इस विचार को आगे बढ़ाएँ?')}
      </h2>
      <p style={{ color: '#d2dce5', fontSize: 14, lineHeight: 1.6, margin: '0 0 16px' }}>
        {t(`${facts.credits} credits to turn your next ideas into films, with no Kineo watermark on new exports.`,
          `${facts.credits} créditos para convertir tus próximas ideas en vídeos, sin la marca de Kineo en las nuevas exportaciones.`,
          `अपने अगले विचारों से फ़िल्में बनाने के लिए ${facts.credits} क्रेडिट। नए एक्सपोर्ट पर Kineo वॉटरमार्क नहीं होगा।`)}
      </p>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 9, marginBottom: 12 }}>
        <strong style={{ fontSize: 38, lineHeight: 1, letterSpacing: '-.04em' }}>{facts.fee}</strong>
        <span style={{ color: '#d2dce5', fontSize: 13 }}>{t(`for ${facts.days} days of Creator`, `por ${facts.days} días de Creator`, `Creator के ${facts.days} दिनों के लिए`)}</span>
      </div>
      {!afterFilm ? <a ref={handoffRef} href={handoffHref}
        style={{ display: 'block', boxSizing: 'border-box', textAlign: 'center', textDecoration: 'none', width: '100%', minHeight: 48, padding: '12px 16px', borderRadius: 11, border: '1px solid #81c9ff', background: '#2997ff', color: '#06121c', fontSize: 15, fontWeight: 850 }}>
        {t('Open this script in Studio', 'Abrir este guion en Studio', 'यह स्क्रिप्ट Studio में खोलें')}
        <span aria-hidden="true"> →</span>
      </a> : <button ref={buttonRef} type="button" disabled={busy}
        onClick={() => (onLaunch ?? checkout.launch)('creator_trial', postFilmCreatorCheckoutHref(surface), metadata)}
        style={{ width: '100%', minHeight: 48, padding: '12px 16px', borderRadius: 11, border: '1px solid #81c9ff', background: '#2997ff', color: '#06121c', fontSize: 15, fontWeight: 850, cursor: busy ? 'wait' : 'pointer', opacity: busy ? 0.6 : 1 }}>
        {busy ? t('Opening checkout…', 'Abriendo el pago…', 'चेकआउट खोल रहे हैं…')
          : t(`Try Creator for ${facts.fee}`, `Prueba Creator por ${facts.fee}`, `${facts.fee} में Creator आज़माएँ`)}
        {!busy && <span aria-hidden="true"> →</span>}
      </button>}
      <p style={{ color: '#d2dce5', fontSize: 12, lineHeight: 1.55, margin: '10px 0 0' }}>
        {t(`${facts.fee} today. Then ${facts.monthly}/month from day ${facts.days + 1}, unless you cancel.`,
          `${facts.fee} hoy. Después, ${facts.monthly}/mes desde el día ${facts.days + 1}, salvo que canceles.`,
          `आज ${facts.fee}। रद्द न करने पर दिन ${facts.days + 1} से ${facts.monthly}/माह।`)}
      </p>
      <p style={{ color: '#a9bac8', fontSize: 11, lineHeight: 1.5, margin: '8px 0 0' }}>
        {afterFilm
          ? t('Your saved film stays available as it is. This starts a trial for new creations; it does not remove a watermark from this file.',
            'Tu vídeo guardado sigue disponible tal como está. La prueba es para nuevas creaciones; no elimina la marca de este archivo.',
            'आपकी सहेजी गई फ़िल्म जैसी है वैसी ही उपलब्ध रहेगी। ट्रायल नई फ़िल्मों के लिए है; यह इस फ़ाइल का वॉटरमार्क नहीं हटाता।')
          : t('Your script opens in Studio, where you can choose the Creator trial. For your first purchase on Kineo, with no existing subscription. Payment method required.',
            'Tu guion se abre en Studio, donde puedes elegir la prueba Creator. Para tu primera compra en Kineo, sin otra suscripción activa. Requiere método de pago.',
            'आपकी स्क्रिप्ट Studio में खुलेगी, जहाँ आप Creator ट्रायल चुन सकते हैं। Kineo पर पहली खरीद के लिए, बिना मौजूदा सदस्यता के। भुगतान विधि आवश्यक है।')}
      </p>
      {(error ?? checkout.error) && <p role="alert" style={{ color: '#ff9d9d', fontSize: 12, lineHeight: 1.5 }}>{error ?? checkout.error}</p>}
    </section>
  )
}
