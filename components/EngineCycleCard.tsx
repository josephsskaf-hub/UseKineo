'use client'

// KINEO-HERO-ENGINES-2026-08-15 v3 — o card do hero E o tile do bento sao o
// MESMO visual (pedido do fundador: "os tiles do Pick your engine, aqueles que
// a gente tinha deixado bonito"): icone do motor + selo + nome + descricao,
// com os videos CURADOS daquele motor passando atras (ate 3, em sequencia).
// Clique leva ao gerador ja no motor certo.
// ⚠ REGRA DOS PARES: icones/nomes/descricoes copiados do bento em
// KineoLanding.tsx (#engines). Mudou la, muda aqui.
// Orcamento: nada baixa antes do intersect; entrada escalonada por indice;
// Save-Data/2g/reduced-motion ficam no tile estatico (sem video).
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import type { WallVideo } from '@/lib/engineWall'

const META: Record<string, { name: string; desc: string; href: string; tb?: string; icon: ReactNode }> = {
  cinematic_ai: {
    name: 'Seedance', desc: 'The workhorse AI video engine', tb: 'Popular',
    href: '/generate?engine=seedance&intent_campaign=hero_engine',
    icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M7 5v14M17 5v14M3 10h4M3 14h4M17 10h4M17 14h4"/></svg>,
  },
  cinematic_veo: {
    name: 'Veo 3', desc: "Google's flagship, on Studio", tb: 'Studio',
    href: '/generate?engine=veo&intent_campaign=hero_engine',
    icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2l1.9 6.1L20 10l-6.1 1.9L12 18l-1.9-6.1L4 10l6.1-1.9L12 2z"/><path d="M19 15l.9 2.6L22.5 18.5l-2.6.9L19 22l-.9-2.6-2.6-.9 2.6-.9L19 15z" opacity=".7"/></svg>,
  },
  cinematic_kling: {
    name: 'Kling', desc: 'Cinematic motion & camera', tb: 'Studio',
    href: '/generate?engine=kling&intent_campaign=hero_engine',
    icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 8l6-3v14l-6-3"/><rect x="3" y="6" width="12" height="12" rx="2"/></svg>,
  },
  cinematic_hollywood: {
    name: 'Hollywood', desc: 'Multi-scene film pipeline', tb: 'Studio',
    href: '/generate?engine=hollywood&intent_campaign=hero_engine',
    icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 11l16-4-1-4L3 7l1 4z"/><path d="M4 11h16v9a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-9z"/><path d="M8 7l2 4M13 5.7l2 4M18 4.4l2 4"/></svg>,
  },
  presenter: {
    name: 'AI Presenter', desc: 'Talking video from one photo', tb: 'New',
    href: '/avatar?intent_campaign=hero_engine',
    icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="10" cy="8" r="4"/><path d="M3 21c0-3.9 3.1-7 7-7 1.6 0 3.1.5 4.3 1.4"/><path d="M18 8c1 1.2 1 3 0 4.2M21 6c2 2.4 2 6 0 8.4"/></svg>,
  },
  fast: {
    name: 'Fast', desc: 'Stock + captions in 3–7 min',
    href: '/generate?engine=fast&intent_campaign=hero_engine',
    icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M13 2L3 14h7l-1 8 10-12h-7l1-8z"/></svg>,
  },
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
            // Entrada escalonada: os 6 tiles nao disputam a rede ao mesmo tempo.
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
      className="tile ec-tile"
      aria-label={`${meta.name} — ${meta.desc}. Open the generator with this engine selected.`}
    >
      <span className="tvid" aria-hidden="true">
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
      <span className="trow">
        <span className="tic">{meta.icon}</span>
        {meta.tb ? <span className="tb">{meta.tb}</span> : null}
      </span>
      <span className="tbody">
        <h3>{meta.name}</h3>
        <p>{meta.desc}</p>
      </span>
    </Link>
  )
}
