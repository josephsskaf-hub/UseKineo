'use client'

// KINEO-CARDS-GIRO-2410 — SSR first poster, two buffers and per-clip framing.
import { useEffect, useRef, type CSSProperties } from 'react'
import { homeCardClips, type HomeCardClip, type HomeCardPlaylist, type HomeCycleCardId } from '@/lib/ui/homeThreeCards'
import { attachHomeCardPlayback } from '@/lib/ui/homeCardPlayback'

export const HOME_CARD_CYCLE_CSS = `
.k3c-card .k3c-media[data-home-cycle] video[data-home-cycle-slot],.k3c-card:hover .k3c-media[data-home-cycle] video[data-home-cycle-slot]{object-fit:var(--home-clip-fit,cover);object-position:var(--home-clip-position,50% 0%) !important;transform:scale(var(--home-clip-scale,1)) !important;transform-origin:50% 0;opacity:0;transition:opacity .6s ease}
.k3c-card .k3c-media[data-home-cycle] video[data-home-cycle-slot][data-on]{opacity:1}
.k3c-media[data-home-cycle] .k3c-cycle-poster{position:absolute;inset:0;width:100%;height:100%;object-fit:var(--home-clip-fit,cover);object-position:var(--home-clip-position,50% 0%);transform:scale(var(--home-clip-scale,1));transform-origin:50% 0}
.k3c-media[data-home-cover="ugc-scenes"]::before{content:'';position:absolute;inset:-32px;background-image:var(--home-current-backdrop,var(--home-first-backdrop));background-size:cover;background-position:center;filter:blur(24px) brightness(.72)}
@media(max-width:1099px){.k3c-card .k3c-media[data-home-cycle][data-home-cover="ugc-scenes"] .k3c-cycle-poster,.k3c-card .k3c-media[data-home-cycle][data-home-cover="ugc-scenes"] video[data-home-cycle-slot]{object-fit:cover!important;object-position:var(--home-clip-mobile-position,50% 0%)!important}}
@media(max-width:760px){.k3c-card .k3c-media[data-home-cycle] video[data-home-cycle-slot],.k3c-card:hover .k3c-media[data-home-cycle] video[data-home-cycle-slot],.k3c-media[data-home-cycle] .k3c-cycle-poster{object-position:var(--home-clip-mobile-position,50% 0%) !important}}
@media(prefers-reduced-motion:reduce){.k3c-card .k3c-media[data-home-cycle] video[data-home-cycle-slot]{display:none;transition:none}.k3c-media[data-home-cover="ugc-scenes"]::before{background-image:var(--home-first-backdrop)}}
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
// Original scenes fill the cards without the blue trailer layout or embedded titles.
const CARTOON_COVER: HomeCardPlaylist = [{
  src: '/previews/home-card-novo-pumpkin.mp4',
  poster: '/posters/home-card-cartoon-scene-0811.webp',
  objectPosition: '50% 55%',
  mobileObjectPosition: '50% 35%',
  objectFit: 'cover',
}]
// Approved 08/11: headphones opens the reel; the cream scene was excluded by the founder.
// Wide desktop cards show the complete portrait. Taller tablet/mobile cards use the safe crop below.
const UGC_SCENES: HomeCardPlaylist = [{
  src: '/previews/galeria/ugc-indiano-fone.mp4',
  poster: '/posters/home-card-ugc-scene-0811.webp',
  objectPosition: '50% 50%',
  mobileObjectPosition: '50% 25%',
  objectFit: 'contain',
}, {
  src: '/previews/galeria/ugc-homem-cafe.mp4',
  poster: '/posters/home-card-ugc-cafe-scene-0811.webp',
  objectPosition: '50% 50%',
  mobileObjectPosition: '50% 30%',
  objectFit: 'contain',
}, {
  src: '/previews/home-card-ugc-unboxing-scene-0811.mp4',
  poster: '/posters/home-card-ugc-unboxing-scene-0811.webp',
  objectPosition: '50% 50%',
  mobileObjectPosition: '50% 0%',
  objectFit: 'contain',
}, {
  src: '/previews/home-card-novo-ugc_shaker.mp4',
  poster: '/posters/home-card-ugc-academia-scene-0811.webp',
  objectPosition: '50% 50%',
  mobileObjectPosition: '50% 15%',
  objectFit: 'contain',
}, {
  src: '/previews/home-card-novo-ugc_podcast.mp4',
  poster: '/posters/home-card-ugc-podcast-scene-0811.webp',
  objectPosition: '50% 50%',
  mobileObjectPosition: '50% 35%',
  objectFit: 'contain',
}]

export default function HomeCardCycleMedia({ card, language, playlist }: { card: HomeCycleCardId; language: string; playlist?: HomeCardPlaylist }) { // KINEO-CARDS-TRAILER-0411 — playlist opcional: sem ela, as listas de sempre
  const root = useRef<HTMLSpanElement>(null)
  const clips = playlist ?? homeCardClips(card, language) // KINEO-CARDS-TRAILER-0411
  const showWall = !!playlist && card === 'product_ads'
  const showUgcScenes = !!playlist && card === 'ugc_ads'
  const showCartoon = !!playlist && card === 'kids_cartoon'
  const desktopClips = showWall ? PRODUCT_WALL_DESKTOP : undefined
  const activeClips = showWall ? PRODUCT_WALL_MOBILE : showUgcScenes ? UGC_SCENES : showCartoon ? CARTOON_COVER : clips
  useEffect(() => {
    const el = root.current
    if (!el) return
    if (!desktopClips) return attachHomeCardPlayback(el, activeClips)

    const query = window.matchMedia(DESKTOP_MEDIA)
    let detach: (() => void) | undefined
    const connect = () => {
      detach?.()
      detach = attachHomeCardPlayback(el, query.matches ? desktopClips : activeClips)
    }
    connect()
    query.addEventListener('change', connect)
    return () => { query.removeEventListener('change', connect); detach?.() }
  }, [activeClips, desktopClips])
  const first = activeClips[0]
  return (
    <span className="k3c-media k3c-cycle" ref={root} data-home-cycle={card} data-home-cover={showWall ? 'product-wall' : showUgcScenes ? 'ugc-scenes' : showCartoon ? 'cartoon-scene' : undefined}
      style={showUgcScenes ? { '--home-first-backdrop': `url("${first.poster}")` } as CSSProperties : undefined}
      onPlaying={showUgcScenes ? (event) => {
        const video = event.target
        if (video instanceof HTMLVideoElement && video.poster) event.currentTarget.style.setProperty('--home-current-backdrop', `url("${video.poster}")`)
      } : undefined}>
      <picture>
        {desktopClips ? <source media={DESKTOP_MEDIA} srcSet={desktopClips[0].poster} /> : null}
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
