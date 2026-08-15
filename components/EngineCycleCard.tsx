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

// KINEO-ENGINE-NAMES-2026-08-15 — nomes REAIS dos modelos (fonte:
// generate-video-cinematic/route.ts). Hollywood roda Kling 3 Pro; o Fast e o
// motor PROPRIO do Kineo, batizado Kineo 1. Pares: bento em KineoLanding.tsx.
const META: Record<string, { name: string; desc: string; href: string }> = {
  cinematic_veo: { name: 'Veo 3.1', desc: "Google's flagship cinematic engine", href: '/generate?engine=veo&intent_campaign=hero_engine' },
  cinematic_kling: { name: 'Kling 2.5', desc: 'Cinematic motion and camera work', href: '/generate?engine=kling&intent_campaign=hero_engine' },
  cinematic_hollywood: { name: 'Kling 3', desc: 'Film scenes, native voice & lip sync', href: '/generate?engine=hollywood&intent_campaign=hero_engine' },
  cinematic_ai: { name: 'Seedance 1.5', desc: 'The workhorse AI video engine', href: '/generate?engine=seedance&intent_campaign=hero_engine' },
  presenter: { name: 'Avatar', desc: 'Talking video from one photo', href: '/avatar?intent_campaign=hero_engine' },
  fast: { name: 'Kineo 1', desc: 'Kineo\u2019s own engine \u2014 3\u20137 min', href: '/generate?engine=fast&intent_campaign=hero_engine' },
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
    // Pedido do fundador 15/08: os videos giram SOZINHOS assim que a pagina
    // abre — sem mouse, sem scroll. O start e imediato (escalonado so pra nao
    // disputar a rede); o observer fica apenas pausando fora da tela e
    // retomando quando volta.
    const t = window.setTimeout(() => setStarted(true), 120 + index * 220)
    const io = new IntersectionObserver(
      ([entry]) => {
        inViewRef.current = entry.isIntersecting
        if (entry.isIntersecting) vidRef.current?.play().catch(() => {})
        else vidRef.current?.pause()
      },
      { threshold: 0.15 },
    )
    io.observe(el)
    return () => { window.clearTimeout(t); io.disconnect() }
  }, [started, index])

  // Troca de video (key remonta o <video>): toca assim que possivel.
  useEffect(() => {
    if (started) vidRef.current?.play().catch(() => {})
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
            loop={videos.length === 1}
            onEnded={() => setIdx((i) => (i + 1) % videos.length)}
          />
        )}
      </span>
      <h3>{meta.name}</h3>
      <p>{meta.desc}</p>
    </Link>
  )
}
