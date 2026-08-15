'use client'

// KINEO-ENGINE-WALL-2026-08-15 — card da parede de motores.
// Orçamento idêntico ao da galeria do hero: NADA baixa antes do intersect.
// Estes vídeos do storage não têm poster, então o placeholder é um shimmer
// escuro e o <video> só monta quando o card entra na viewport (≥30%), com
// preload="metadata" (primeiro frame + moov) e play mudo em loop.
// Save-Data/2g/reduced-motion: fica no shimmer com o selo — honesto e leve.
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import type { WallVideo } from '@/lib/engineWall'

export default function EngineWallCard({ video }: { video: WallVideo }) {
  const boxRef = useRef<HTMLAnchorElement | null>(null)
  const vidRef = useRef<HTMLVideoElement | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const nav = navigator as Navigator & {
      connection?: { saveData?: boolean; effectiveType?: string }
    }
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
      { threshold: 0.3 },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  useEffect(() => {
    if (mounted) vidRef.current?.play().catch(() => {})
  }, [mounted])

  return (
    <Link ref={boxRef} href={`/v/${video.id}`} className="ew-card" aria-label={`${video.title} — made with the ${video.badge} engine`}>
      {mounted && (
        <video
          ref={vidRef}
          src={video.videoUrl}
          muted
          loop
          playsInline
          preload="metadata"
          onPlaying={(e) => {
            e.currentTarget.style.opacity = '1'
          }}
          style={{ opacity: 0, transition: 'opacity 250ms cubic-bezier(.2,0,0,1)' }}
        />
      )}
      <span className="ew-badge">{video.badge}</span>
      <span className="ew-title">{video.title}</span>
      <span className="ew-cta" aria-hidden="true">Watch →</span>
    </Link>
  )
}
