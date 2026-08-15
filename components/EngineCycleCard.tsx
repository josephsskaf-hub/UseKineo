'use client'

// KINEO-HERO-ENGINES-2026-08-15 v2 — o card DO MOTOR (pedido do fundador:
// "os cards que tinham o motor e a gente tinha colocado o video apropriado").
// Formato Higgsfield: NOME do motor grande + uma linha de descricao, com os
// videos CURADOS daquele motor passando atras (ate 3, em sequencia). Clique
// leva direto ao gerador ja no motor certo — nao a pagina do video.
// Orcamento: nada baixa antes do intersect; entrada escalonada por indice;
// Save-Data/2g/reduced-motion ficam na moldura com o nome (sem video).
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import type { WallVideo } from '@/lib/engineWall'

const META: Record<string, { name: string; desc: string; href: string }> = {
  cinematic_veo: { name: 'Veo 3', desc: "Google's flagship cinematic engine", href: '/generate?engine=veo&intent_campaign=hero_engine' },
  cinematic_kling: { name: 'Kling', desc: 'Ultra-real motion and physics', href: '/generate?engine=kling&intent_campaign=hero_engine' },
  cinematic_hollywood: { name: 'Hollywood', desc: 'Photoreal people, film-set light', href: '/generate?engine=hollywood&intent_campaign=hero_engine' },
  cinematic_ai: { name: 'Seedance', desc: 'Cinematic scenes, everyday price', href: '/generate?engine=seedance&intent_campaign=hero_engine' },
  fast: { name: 'Fast', desc: 'A finished Short in ~3 minutes', href: '/generate?engine=fast&intent_campaign=hero_engine' },
  presenter: { name: 'AI Presenter', desc: 'Your script, spoken to camera', href: '/avatar?intent_campaign=hero_engine' },
}

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
  const meta = META[v.engine] ?? { name: v.badge, desc: 'Real Kineo render', href: '/generate' }

  return (
    <Link
      ref={boxRef}
      href={meta.href}
      className="vcard ec-card"
      aria-label={`${meta.name} — ${meta.desc}. Open the generator with this engine selected.`}
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
      <span className="ec-chip">Engine</span>
      <div className="vt ec-vt">
        <span className="ec-name">{meta.name}</span>
        <span className="ec-desc">{meta.desc}</span>
      </div>
    </Link>
  )
}
