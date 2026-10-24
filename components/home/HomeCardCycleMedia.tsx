'use client'

// KINEO-CARDS-GIRO-2410 — SSR first poster, two buffers and per-clip framing.
import { useEffect, useRef, type CSSProperties } from 'react'
import { homeCardClips, type HomeCycleCardId } from '@/lib/ui/homeThreeCards'
import { attachHomeCardPlayback } from '@/lib/ui/homeCardPlayback'

export const HOME_CARD_CYCLE_CSS = `
.k3c-card .k3c-media[data-home-cycle] video[data-home-cycle-slot],.k3c-card:hover .k3c-media[data-home-cycle] video[data-home-cycle-slot]{object-fit:var(--home-clip-fit,cover);object-position:var(--home-clip-position,50% 0%) !important;transform:none !important;opacity:0;transition:opacity .6s ease}
.k3c-card .k3c-media[data-home-cycle] video[data-home-cycle-slot][data-on]{opacity:1}
.k3c-media[data-home-cycle] .k3c-cycle-poster{position:absolute;inset:0;width:100%;height:100%;object-fit:var(--home-clip-fit,cover);object-position:var(--home-clip-position,50% 0%)}
@media(max-width:760px){.k3c-card .k3c-media[data-home-cycle] video[data-home-cycle-slot],.k3c-card:hover .k3c-media[data-home-cycle] video[data-home-cycle-slot],.k3c-media[data-home-cycle] .k3c-cycle-poster{object-position:var(--home-clip-mobile-position,50% 0%) !important}}
@media(prefers-reduced-motion:reduce){.k3c-card .k3c-media[data-home-cycle] video[data-home-cycle-slot]{display:none;transition:none}}
`

export default function HomeCardCycleMedia({ card, language }: { card: HomeCycleCardId; language: string }) {
  const root = useRef<HTMLSpanElement>(null)
  const clips = homeCardClips(card, language)
  useEffect(() => {
    if (root.current) return attachHomeCardPlayback(root.current, clips)
  }, [clips])
  const first = clips[0]
  return (
    <span className="k3c-media k3c-cycle" ref={root} data-home-cycle={card}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="k3c-cycle-poster" src={first.poster} alt="" style={{
        '--home-clip-position': first.objectPosition,
        '--home-clip-mobile-position': first.mobileObjectPosition ?? first.objectPosition,
        '--home-clip-fit': first.objectFit ?? 'cover',
      } as CSSProperties} />
      {[0, 1].map((slot) => <video key={slot} data-home-cycle-slot={slot} muted playsInline preload="none" disablePictureInPicture aria-hidden="true" tabIndex={-1} />)}
    </span>
  )
}
