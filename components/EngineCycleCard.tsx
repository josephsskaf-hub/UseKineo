'use client'

// KINEO-HERO-ENGINES-2026-08-15 v4 — o card LARGO da vitrine do topo (pedido
// do fundador: "os cards horizontais com os videos nitidos dentro", estilo
// Higgsfield): midia 16:10 com o video em opacidade TOTAL (sem veu escuro),
// nome do motor em caps ABAIXO da midia + uma linha de descricao. Os 3 videos
// CURADOS do motor passam em sequencia; clique abre o gerador no motor certo.
// Visual: reusa .ftr/.ftr-media/.ftr h3/.ftr p da casa (Engine Wall v2).
// Orcamento: nada baixa antes do intersect; entrada escalonada por indice;
// Save-Data/2g/reduced-motion ficam no shimmer estatico (sem video).
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import type { WallVideo } from '@/lib/engineWall'

const META: Record<string, { name: string; desc: string; href: string }> = {
  cinematic_veo: { name: 'Veo 3', desc: "Google's flagship cinematic engine", href: '/generate?engine=veo&intent_campaign=hero_engine' },
  cinematic_kling: { name: 'Kling', desc: 'Cinematic motion and camera work', href: '/generate?engine=kling&intent_campaign=hero_engine' },
  cinematic_hollywood: { name: 'Hollywood', desc: 'Multi-scene film pipeline', href: '/generate?engine=hollywood&intent_campaign=hero_engine' },
  cinematic_ai: { name: 'Seedance', desc: 'The workhorse AI video engine', href: '/generate?engine=seedance&intent_campaign=hero_engine' },
  presenter: { name: 'AI Presenter', desc: 'Talking video from one photo', href: '/avatar?intent_campaign=hero_engine' },
  fast: { name: 'Fast', desc: 'Stock + captions in 3–7 min', href: '/generate?engine=fast&intent_campaign=hero_engine' },
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
            // Entrada escalonada: os cards nao disputam a rede ao mesmo tempo.
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
  const meta = META[v.engine]
  if (!meta) return null

  return (
    <Link
      ref={boxRef}
      href={meta.href}
      className="ftr ec-ftr"
      aria-label={`${meta.name} — ${meta.desc}. Open the generator with this engine selected.`}
    >
      <span className="ftr-media">
        {started && (
          <video
            key={v.id}
            ref={vidRef}
            src={v.videoUrl}
            muted
            playsInline
            preload="metadata"
            onPlaying={(e) => e.currentTarget.classList.add('hv-on')}
            onEnded={() => setIdx((i) => (i + 1) % videos.length)}
          />
        )}
      </span>
      <h3>{meta.name}</h3>
      <p>{meta.desc}</p>
    </Link>
  )
}
