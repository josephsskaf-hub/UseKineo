'use client'

// KINEO-PAGINAS-UGC-2010 — vídeo leve das páginas do AI UGC Ads: preload="none" + pôster (nada baixa antes de aparecer), toca
// mudo só enquanto está na tela (IntersectionObserver, mesmo padrão dos 3 cards da home) e fica parado no pôster com
// prefers-reduced-motion. Sem preço em lugar nenhum: o selo é o produto/motor real do vídeo.
import { useEffect, useRef } from 'react'

export default function UgcVideo({ src, poster, label, className }: { src: string; poster: string; label: string; className?: string }) {
  const ref = useRef<HTMLVideoElement>(null)
  useEffect(() => {
    const video = ref.current
    if (!video) return
    const reduce = typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduce) return
    const set = (visible: boolean) => {
      if (visible) { video.muted = true; video.play().catch(() => { /* autoplay recusado: fica o pôster */ }) } else video.pause()
    }
    if (typeof IntersectionObserver === 'undefined') { set(true); return }
    const io = new IntersectionObserver((entries) => entries.forEach((e) => set(e.isIntersecting)), { threshold: 0.35 })
    io.observe(video)
    return () => io.disconnect()
  }, [])
  return (
    <video
      ref={ref}
      className={className}
      src={src}
      poster={poster}
      muted
      loop
      playsInline
      preload="none"
      disablePictureInPicture
      aria-label={label}
    />
  )
}
