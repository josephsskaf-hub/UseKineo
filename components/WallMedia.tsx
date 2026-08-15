'use client'

// KINEO-ENGINE-WALL-2026-08-15 v2 — midia da vitrine: video real do storage
// tocando em viewport, preenchendo o card pai (wide OU tile). Mesmo orcamento
// de sempre: nada baixa antes do intersect; Save-Data/2g/reduced-motion ficam
// no fundo escuro do pai.
import { useEffect, useRef, useState } from 'react'

export default function WallMedia({ src }: { src: string }) {
  const boxRef = useRef<HTMLDivElement | null>(null)
  const vidRef = useRef<HTMLVideoElement | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const nav = navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }
    if (nav.connection?.saveData || (nav.connection?.effectiveType ?? '').includes('2g')) return
    const el = boxRef.current
    if (!el) return
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setMounted(true)
          vidRef.current?.play().catch(() => {})
        } else {
          vidRef.current?.pause()
        }
      },
      { threshold: 0.25 },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  useEffect(() => {
    if (mounted) vidRef.current?.play().catch(() => {})
  }, [mounted])

  return (
    <div ref={boxRef} style={{ position: 'absolute', inset: 0 }}>
      {mounted && (
        <video
          ref={vidRef}
          src={src}
          muted
          loop
          playsInline
          preload="metadata"
          onPlaying={(e) => { e.currentTarget.style.opacity = '1' }}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0, transition: 'opacity 250ms cubic-bezier(.2,0,0,1)' }}
        />
      )}
    </div>
  )
}
