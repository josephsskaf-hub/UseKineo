'use client'

// KINEO-BEBE-QUE-FALA-2010 — a mídia do card "AI Product Ads" no modo 4 cards (fundador 20/10, 20:55): o reel que troca 3 vezes — o Close real
// do perfume LUME (o vídeo de hoje do card, na língua da interface) e depois os trios do "ADS: 3 VARIATIONS" (garrafa, fone e tênis).
// Dados em lib/ui/homeKidsCard.ts (homeProductAdsReel). Mesmo padrão do AdsMedia das portas (components/home/HomeTwoDoors.tsx): troca no
// FIM do vídeo (onEnded), nunca por timer; só toca com o card na tela; prefers-reduced-motion = pôster parado. Sem o 4º card, nada disto
// é montado (a home de hoje segue com o vídeo único do card).
import { useEffect, useRef, useState } from 'react'
import { homeCardClip } from '@/lib/ui/homeThreeCards'
import { homeProductAdsReel } from '@/lib/ui/homeKidsCard'

const REDUCED_MOTION = '(prefers-reduced-motion: reduce)'

export default function HomeProductAdsReel({ language }: { language: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const [active, setActive] = useState(0)
  const [visible, setVisible] = useState(false)
  const reel = homeProductAdsReel(homeCardClip('product_ads', language))
  useEffect(() => {
    const root = ref.current
    if (!root) return
    if (typeof IntersectionObserver === 'undefined') { setVisible(true); return }
    const io = new IntersectionObserver((es) => es.forEach((e) => setVisible(e.isIntersecting)), { threshold: 0.3 })
    io.observe(root)
    return () => io.disconnect()
  }, [])
  useEffect(() => {
    const root = ref.current
    if (!root) return
    const videos = Array.from(root.querySelectorAll('video'))
    const reduce = typeof window.matchMedia === 'function' && window.matchMedia(REDUCED_MOTION).matches
    const next = videos[(active + 1) % videos.length]
    if (next) next.preload = 'auto'
    videos.forEach((v, i) => {
      if (i === active && visible && !reduce) { v.muted = true; v.currentTime = 0; v.play().catch(() => { /* autoplay recusado: fica o pôster */ }) } else v.pause()
    })
  }, [active, visible])
  return (
    <span className="k3c-media k3c-reel" ref={ref} data-home-ads-reel="1">
      {reel.map((clip, i) => (
        <video
          key={clip.src}
          src={clip.src}
          poster={clip.poster}
          data-on={i === active ? '' : undefined}
          data-trio={clip.trio ? '' : undefined}
          onEnded={() => setActive((i + 1) % reel.length)}
          muted
          playsInline
          preload="none"
          disablePictureInPicture
          aria-hidden="true"
          tabIndex={-1}
        />
      ))}
    </span>
  )
}
