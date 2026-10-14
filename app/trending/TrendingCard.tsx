'use client'
// KINEO-TRENDING-2026-10-13 — o cartão do /trending. Vídeo REAL feito na Kineo: mudo, em laço, playsInline, preload="none",
// com pôster; só carrega e toca quando está na tela (IntersectionObserver) e a aba está visível; com prefers-reduced-motion
// ou economia de dados fica no pôster. A mídia tem proporção fixa 9:16 (sem layout shift). O selo do motor vem do dado.
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { UiLabel, useInterfaceLanguage } from '@/components/InterfaceLanguage'
import { adsV2Style, adsV2StyleCopy, isAdsV2Style } from '@/lib/ads/v2Styles'
import type { TrendingBlock, TrendingCardData } from '@/lib/trending/trendingNow'

function TrendingVideo({ video, poster, label }: { video: string; poster: string; label: string }) {
  const ref = useRef<HTMLVideoElement>(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el || typeof IntersectionObserver === 'undefined') return
    let intersects = false
    const update = () => setVisible(intersects && document.visibilityState === 'visible')
    const observer = new IntersectionObserver((entries) => { intersects = entries[0]?.isIntersecting ?? false; update() }, { threshold: 0.35 })
    observer.observe(el)
    document.addEventListener('visibilitychange', update)
    return () => { observer.disconnect(); document.removeEventListener('visibilitychange', update) }
  }, [])
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData === true
    if (visible && !reduce && !saveData) void el.play().catch(() => {})
    else el.pause()
  }, [visible])
  return <video ref={ref} className="tr-video" src={visible ? video : undefined} poster={poster} aria-label={label} muted loop playsInline preload="none" />
}

export default function TrendingCard({ block, card }: { block: TrendingBlock['id']; card: TrendingCardData }) {
  const language = useInterfaceLanguage()
  // Estilos de anúncio: nome e frase nas 16 línguas pelo próprio catálogo (ADS_V2_STYLE_COPY); efeitos: pelo dicionário.
  const styleCopy = block === 'ad-styles' && isAdsV2Style(card.key) ? adsV2StyleCopy(language).styles[card.key] : null
  const translatable = block === 'ad-styles' || block === 'clip-effects'
  const title = styleCopy ? styleCopy.label : card.title
  const sub = styleCopy ? styleCopy.oneLine : card.sub
  // KINEO-ESTILOS-DIA1-2026-10-13 — estilo de época (season 'holiday' no catálogo): selo "Holiday" na língua da interface.
  const seasonTag = styleCopy && isAdsV2Style(card.key) && adsV2Style(card.key).season === 'holiday' ? adsV2StyleCopy(language).seasonTag : null
  return (
    <article className="tr-card" data-trending-card={card.key}>
      <div className="tr-media">
        {card.video && card.poster
          ? <TrendingVideo video={card.video} poster={card.poster} label={title} />
          : <div className="tr-script"><span className="tr-script-mark" aria-hidden="true">“</span><p>{card.sub}</p></div>}
        {card.badge === 'new' ? <span className="tr-badge tr-badge-new"><UiLabel>New</UiLabel></span> : null}
        {card.badge === 'pick' ? <span className="tr-badge tr-badge-pick"><UiLabel>Today’s pick</UiLabel></span> : null}
        {seasonTag ? <span className="tr-badge tr-badge-season" data-season="holiday">{seasonTag}</span> : null}
        {card.scriptReady ? <span className="tr-badge tr-badge-script"><UiLabel>Script ready</UiLabel></span> : null}
      </div>
      <div className="tr-body">
        {card.engine
          ? <span className="tr-engine"><UiLabel>Made on Kineo</UiLabel> · <span dir="ltr">{card.engine}</span></span>
          : null}
        <h3>{translatable && !styleCopy ? <UiLabel>{title}</UiLabel> : title}</h3>
        {sub && !card.scriptReady ? <p className="tr-sub">{translatable && !styleCopy ? <UiLabel>{sub}</UiLabel> : sub}</p> : null}
        {card.houseFilm ? <p className="tr-caption"><UiLabel>House film on this subject</UiLabel></p> : null}
        <Link className="tr-cta" href={card.href} prefetch={false} data-trending-make={block}><UiLabel>Make mine</UiLabel> <span aria-hidden="true">↗</span></Link>
      </div>
    </article>
  )
}
