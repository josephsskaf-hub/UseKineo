'use client'

// KINEO-CARDS-GIRO-2410 — SSR first poster, two buffers and per-clip framing.
import { useEffect, useRef, type CSSProperties } from 'react'
import { homeCardClips, type HomeCardClip, type HomeCardPlaylist, type HomeCycleCardId } from '@/lib/ui/homeThreeCards'
import { attachHomeCardPlayback } from '@/lib/ui/homeCardPlayback'

export const HOME_CARD_CYCLE_CSS = `
.k3c-card .k3c-media[data-home-cycle] video[data-home-cycle-slot],.k3c-card:hover .k3c-media[data-home-cycle] video[data-home-cycle-slot]{object-fit:var(--home-clip-fit,cover);object-position:var(--home-clip-position,50% 0%) !important;transform:scale(var(--home-clip-scale,1)) !important;transform-origin:50% 0;opacity:0;transition:opacity .6s ease}
.k3c-card .k3c-media[data-home-cycle] video[data-home-cycle-slot][data-on]{opacity:1}
.k3c-media[data-home-cycle] .k3c-cycle-poster{position:absolute;inset:0;width:100%;height:100%;object-fit:var(--home-clip-fit,cover);object-position:var(--home-clip-position,50% 0%);transform:scale(var(--home-clip-scale,1));transform-origin:50% 0}
@media(max-width:760px){.k3c-card .k3c-media[data-home-cycle] video[data-home-cycle-slot],.k3c-card:hover .k3c-media[data-home-cycle] video[data-home-cycle-slot],.k3c-media[data-home-cycle] .k3c-cycle-poster{object-position:var(--home-clip-mobile-position,50% 0%) !important}}
@media(prefers-reduced-motion:reduce){.k3c-card .k3c-media[data-home-cycle] video[data-home-cycle-slot]{display:none;transition:none}}
`

const DESKTOP_MEDIA = '(min-width: 1100px)'
const productWall = (format: 'desktop' | 'mobile'): HomeCardClip => ({
  src: `/previews/home-card-wall-product-0611-${format}.mp4`,
  poster: `/posters/home-card-wall-product-0611-${format}.webp`,
  objectPosition: '50% 0%',
  objectFit: 'cover',
})
const PRODUCT_WALL_DESKTOP = [productWall('desktop')] as const
const PRODUCT_WALL_MOBILE = [productWall('mobile')] as const
const UGC_COVER: HomeCardPlaylist = [{
  src: '/previews/home-card-ugc-fone-0611.mp4',
  poster: '/posters/home-card-ugc-fone-0611.webp',
  objectPosition: '50% 0%',
  objectFit: 'cover',
}]

export default function HomeCardCycleMedia({ card, language, playlist }: { card: HomeCycleCardId; language: string; playlist?: HomeCardPlaylist }) { // KINEO-CARDS-TRAILER-0411 — playlist opcional: sem ela, as listas de sempre
  const root = useRef<HTMLSpanElement>(null)
  const clips = playlist ?? homeCardClips(card, language) // KINEO-CARDS-TRAILER-0411
  const showWall = !!playlist && card === 'product_ads'
  const showHeadphones = !!playlist && card === 'ugc_ads'
  const activeClips = showHeadphones ? UGC_COVER : clips
  useEffect(() => {
    const el = root.current
    if (!el) return
    if (!showWall) return attachHomeCardPlayback(el, activeClips)

    const query = window.matchMedia(DESKTOP_MEDIA)
    let detach: (() => void) | undefined
    const connect = () => {
      detach?.()
      detach = attachHomeCardPlayback(el, query.matches ? PRODUCT_WALL_DESKTOP : PRODUCT_WALL_MOBILE)
    }
    connect()
    query.addEventListener('change', connect)
    return () => { query.removeEventListener('change', connect); detach?.() }
  }, [activeClips, showWall])
  const first = showWall ? PRODUCT_WALL_MOBILE[0] : activeClips[0]
  return (
    <span className="k3c-media k3c-cycle" ref={root} data-home-cycle={card} data-home-cover={showWall ? 'product-wall' : showHeadphones ? 'ugc-headphones' : undefined}>
      <picture>
        {showWall ? <source media={DESKTOP_MEDIA} srcSet={PRODUCT_WALL_DESKTOP[0].poster} /> : null}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="k3c-cycle-poster" src={first.poster} alt="" style={{
          '--home-clip-position': first.objectPosition,
          '--home-clip-mobile-position': first.mobileObjectPosition ?? first.objectPosition,
          '--home-clip-fit': first.objectFit ?? 'cover',
          '--home-clip-scale': first.scale ?? 1,
        } as CSSProperties} />
      </picture>
      {[0, 1].map((slot) => <video key={slot} data-home-cycle-slot={slot} muted playsInline preload="none" disablePictureInPicture aria-hidden="true" tabIndex={-1} />)}
    </span>
  )
}
