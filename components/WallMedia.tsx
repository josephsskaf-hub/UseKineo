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
  const [active, setActive] = useState(false)

  useEffect(() => {
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)')
    const connection = (navigator as Navigator & { connection?: EventTarget & { saveData?: boolean; effectiveType?: string } }).connection
    let visible = false
    const sync = () => {
      const play = visible && !document.hidden && !motion.matches && !connection?.saveData && !(connection?.effectiveType ?? '').includes('2g')
      setActive(play)
      if (play) setMounted(true)
      else vidRef.current?.pause()
    }
    const el = boxRef.current
    if (!el) return
    const io = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting
        sync()
      },
      { threshold: 0.25 },
    )
    io.observe(el)
    document.addEventListener('visibilitychange', sync)
    motion.addEventListener('change', sync)
    connection?.addEventListener('change', sync)
    return () => { io.disconnect(); document.removeEventListener('visibilitychange', sync); motion.removeEventListener('change', sync); connection?.removeEventListener('change', sync) }
  }, [])

  useEffect(() => {
    if (mounted && active) vidRef.current?.play().catch(() => {})
    else vidRef.current?.pause()
  }, [mounted, active])

  return (
    <div ref={boxRef} style={{ position: 'absolute', inset: 0 }}>
      {mounted && (
        <video
          ref={vidRef}
          src={src}
          muted
          loop
          playsInline
          preload="none"
          onPlaying={(e) => { e.currentTarget.style.opacity = '1' }}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0, transition: 'opacity 250ms cubic-bezier(.2,0,0,1)' }}
        />
      )}
    </div>
  )
}
