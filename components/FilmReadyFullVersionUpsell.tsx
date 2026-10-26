'use client'

import { useEffect, useRef } from 'react'
import { trackEvent } from '@/lib/analytics'
import { useInterfaceLanguage } from '@/components/InterfaceLanguage'
import { filmCompleteCheckoutHref, filmCompleteCopy } from '@/lib/growth/filmCompleteCopy'
import { FILM_COMPLETE_TARGET_SECONDS, FILM_COMPLETE_VERSION } from '@/lib/growth/filmComplete'
import { WELCOME20_SITE_OFFER_LIVE } from '@/lib/growth/publicPromoTruth'
import { useWelcome20OfferLive } from '@/lib/growth/useWelcome20Deadline'
import { interfaceLanguageIsRtl } from '@/lib/ui/interfaceLanguage'

/** Visible only after the free film was delivered. The checkout route saves the owner's film before opening Stripe. */
export default function FilmReadyFullVersionUpsell({ videoId }: { videoId: string | null }) {
  const language = useInterfaceLanguage()
  const welcomeLive = useWelcome20OfferLive(WELCOME20_SITE_OFFER_LIVE)
  const copy = filmCompleteCopy(language, welcomeLive)
  const root = useRef<HTMLDivElement>(null)
  const viewed = useRef<string | null>(null)
  useEffect(() => {
    if (!videoId || !root.current || viewed.current === videoId) return
    const emit = () => {
      if (viewed.current === videoId) return
      viewed.current = videoId
      void trackEvent('film15_full_offer_viewed', {
        version: FILM_COMPLETE_VERSION, source_video_id: videoId, video_id: videoId,
        surface: 'film_ready', target_seconds: FILM_COMPLETE_TARGET_SECONDS,
      })
    }
    if (typeof IntersectionObserver === 'undefined') return
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting && entry.intersectionRatio >= 0.5)) {
        emit()
        observer.disconnect()
      }
    }, { threshold: 0.5 })
    observer.observe(root.current)
    return () => observer.disconnect()
  }, [videoId])

  if (!videoId) return null
  return (
    <div ref={root} data-kineo="film15-full-version-upsell" dir={interfaceLanguageIsRtl(language) ? 'rtl' : undefined}
      className="w-full rounded-2xl px-5 py-4"
      style={{ background: 'var(--accent-soft)', border: '1px solid var(--accent)', boxShadow: 'var(--sh-card)' }}>
      <p style={{ margin: 0, fontSize: '1.05rem', fontWeight: 850, color: 'var(--text)', lineHeight: 1.3 }}>{copy.title}</p>
      <p style={{ margin: '8px 0 10px', fontSize: '0.84rem', color: 'var(--muted2)', lineHeight: 1.5 }}>{copy.body}</p>
      <a href={filmCompleteCheckoutHref(videoId, 'film_ready')}
        onClick={() => { void trackEvent('film15_full_offer_clicked', {
          version: FILM_COMPLETE_VERSION, source_video_id: videoId, video_id: videoId,
          surface: 'film_ready', target_seconds: FILM_COMPLETE_TARGET_SECONDS,
        }) }}
        className="flex w-full items-center justify-center rounded-xl px-4 py-3 text-center text-sm font-black"
        style={{ background: 'var(--accent)', color: 'var(--on-accent)', textDecoration: 'none', lineHeight: 1.45 }}>
        {copy.button}
      </a>
      <p style={{ margin: '10px 0 0', fontSize: '0.75rem', color: 'var(--muted2)', lineHeight: 1.5 }}>{copy.billing}</p>
    </div>
  )
}
