'use client'

// KINEO-HERO-ENGINES-2026-08-15 — o card-carrossel do hero: ate 3 videos do
// MESMO motor passando em sequencia (pedido literal do fundador). Reusa as
// classes da casa: .vcard (moldura+lift+gradiente), .hvid (cover+crossfade
// hv-on+zoom no hover), .vt (titulo legivel) e .ew-badge (selo do motor).
// Orcamento: nada baixa antes do intersect; entrada escalonada por indice;
// Save-Data/2g/reduced-motion ficam na moldura com o selo (sem video).
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import type { WallVideo } from '@/lib/engineWall'

export default function EngineCycleCard({ videos, index = 0 }: { videos: WallVideo[]; index?: number }) {
  const [idx, setIdx] = useState(0)
  const [started, setStarted] = useState(false)
  const boxRef = useRef<HTMLAnchorElement | null>(null)
  const vidRef = useRef<HTMLVideoElement | null>(null)
  const inViewRef = useRef(false)

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const nav = navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }
    if (nav.connection?.saveData || (nav.connection?.effectiveType ?? '').includes('2g')) return
    const el = boxRef.current
    if (!el) return
    const io = new IntersectionObserver(
      ([entry]) => {
        inViewRef.current = entry.isIntersecting
        if (entry.isIntersecting) {
          if (!started) {
            // Entrada escalonada: os 6 cards nao disputam a rede ao mesmo tempo.
            window.setTimeout(() => setStarted(true), 200 + index * 300)
          } else {
            vidRef.current?.play().catch(() => {})
          }
        } else {
          vidRef.current?.pause()
        }
      },
      { threshold: 0.3 },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [started, index])

  // Troca de video (key remonta o <video>): toca assim que possivel se visivel.
  useEffect(() => {
    if (started && inViewRef.current) vidRef.current?.play().catch(() => {})
  }, [idx, started])

  if (videos.length === 0) return null
  const v = videos[idx % videos.length]

  return (
    <Link
      ref={boxRef}
      href={`/v/${v.id}`}
      className="vcard"
      aria-label={`${v.title} — made with the ${v.badge} engine`}
    >
      {started && (
        <video
          key={v.id}
          ref={vidRef}
          className="hvid"
          src={v.videoUrl}
          muted
          playsInline
          preload="metadata"
          onPlaying={(e) => e.currentTarget.classList.add('hv-on')}
          onEnded={() => setIdx((i) => (i + 1) % videos.length)}
        />
      )}
      <span className="ew-badge">{v.badge}</span>
      <div className="vt">{v.title}</div>
    </Link>
  )
}
