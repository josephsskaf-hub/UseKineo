'use client'

// KINEO-HERO-ENGINES-2026-08-15 v6 — DOUBLE-BUFFER: dois <video> persistentes
// alternando papeis. O elemento escondido pre-carrega o proximo clipe; quando
// o atual termina, os papeis trocam e o novo faz crossfade POR CIMA do frame
// final do anterior — zero piscada de poster (UX10 #2). O prefetch antigo
// (display:none) morreu: o proprio buffer B e o prefetch.
// Clipes: previews de 8s/~300KB em public/previews (fallback: render integral).
// Orcamento: nada baixa antes do started; entrada escalonada por indice;
// Save-Data/2g/reduced-motion ficam no poster estatico (sem video).
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import type { WallVideo } from '@/lib/engineWall'

// Posters estaticos (public/posters) = LCP instantaneo: o frame do video
// curado aparece no HTML servido, o video faz crossfade por cima ao chegar.
const POSTER: Record<string, string> = {
  cinematic_ai: '/posters/hero-seedance.webp',
  cinematic_kling: '/posters/hero-kling25.webp',
  cinematic_veo: '/posters/hero-veo31.webp',
  cinematic_hollywood: '/posters/hero-kling3.webp',
}

// KINEO-ENGINE-NAMES-2026-08-15 — nomes REAIS dos modelos (fonte:
// generate-video-cinematic/route.ts). Pares: bento em KineoLanding.tsx.
const META: Record<string, { name: string; desc: string; href: string }> = {
  cinematic_veo: { name: 'Veo 3.1', desc: "Google's flagship cinematic engine", href: '/generate?engine=veo&intent_campaign=hero_engine' },
  cinematic_kling: { name: 'Kling 2.5', desc: 'Cinematic motion and camera work', href: '/generate?engine=kling&intent_campaign=hero_engine' },
  cinematic_hollywood: { name: 'Kling 3', desc: 'Film scenes, native voice & lip sync', href: '/generate?engine=hollywood&intent_campaign=hero_engine' },
  cinematic_ai: { name: 'Seedance 1.5', desc: 'The workhorse AI video engine', href: '/generate?engine=seedance&intent_campaign=hero_engine' },
  presenter: { name: 'Avatar', desc: 'Talking video from one photo', href: '/avatar?intent_campaign=hero_engine' },
  fast: { name: 'Kineo 1', desc: 'Kineo’s own engine — 3–7 min', href: '/generate?engine=fast&intent_campaign=hero_engine' },
}

const srcOf = (v: WallVideo) => v.previewUrl ?? v.videoUrl

export default function EngineCycleCard({ videos, index = 0 }: { videos: WallVideo[]; index?: number }) {
  // `active` = indice do video corrente. Slot corrente = active % 2.
  const [active, setActive] = useState(0)
  // FIX 15/08 (fundador viu o proximo video vazando no fim do anterior): o
  // src de cada slot agora e ESTADO proprio — o slot que sai mantem o
  // conteudo antigo durante o fade e so recebe o proximo clipe DEPOIS.
  const [slotVids, setSlotVids] = useState<(WallVideo | null)[]>([videos[0] ?? null, videos[1] ?? null])
  const [started, setStarted] = useState(false)
  const boxRef = useRef<HTMLAnchorElement | null>(null)
  const refA = useRef<HTMLVideoElement | null>(null)
  const refB = useRef<HTMLVideoElement | null>(null)

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const nav = navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }
    if (nav.connection?.saveData || (nav.connection?.effectiveType ?? '').includes('2g')) return
    const el = boxRef.current
    if (!el) return
    // Start imediato (fundador: girar sozinho desde o load), escalonado pra
    // nao disputar rede; o observer so pausa fora da tela e retoma na volta.
    const t = window.setTimeout(() => setStarted(true), 120 + index * 220)
    const io = new IntersectionObserver(
      ([entry]) => {
        const cur = (active % 2 === 0 ? refA : refB).current
        if (entry.isIntersecting) cur?.play().catch(() => {})
        else { refA.current?.pause(); refB.current?.pause() }
      },
      { threshold: 0.15 },
    )
    io.observe(el)
    return () => { window.clearTimeout(t); io.disconnect() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [started, index, active])

  // Troca de papel: toca o slot corrente; o anterior faz fade-out (classe
  // hv-on sai -> transition de opacidade) e pausa depois do crossfade.
  useEffect(() => {
    if (!started) return
    const len = videos.length
    const cur = (active % 2 === 0 ? refA : refB).current
    const old = (active % 2 === 0 ? refB : refA).current
    cur?.play().catch(() => {})
    if (old && len > 1) {
      // O slot antigo segura o conteudo ate o crossfade acabar; SO ENTAO
      // recebe o proximo clipe pra pre-carregar (invisivel, opacity 0).
      const oldSlot = active % 2 === 0 ? 1 : 0
      const timer = window.setTimeout(() => {
        old.classList.remove('hv-on')
        old.pause()
        setSlotVids((sv) => {
          const ns = [...sv]
          ns[oldSlot] = videos[(active + 1) % len]
          return ns
        })
      }, 480)
      return () => window.clearTimeout(timer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, started])

  if (videos.length === 0) return null
  const len = videos.length
  const v = videos[active % len]
  const meta = META[v.engine]
  if (!meta) return null

  const advance = () => { if (len > 1) setActive((a) => a + 1) }

  const renderSlot = (s: number) => {
    const sv = slotVids[s]
    if (!sv) return null
    const isCur = s === active % 2
    return (
      <video
        key={`slot${s}-${sv.id}`}
        ref={s === 0 ? refA : refB}
        src={srcOf(sv)}
        muted
        playsInline
        preload="auto"
        loop={len === 1}
        onPlaying={(e) => { if (isCur) e.currentTarget.classList.add('hv-on') }}
        onEnded={() => { if (isCur) advance() }}
        // Blindagem: preview 404 -> tenta o render integral; senao, pula.
        onError={(e) => {
          const el = e.currentTarget
          if (sv.previewUrl && el.src.includes('/previews/')) {
            el.src = sv.videoUrl
            if (isCur) el.play().catch(() => {})
          } else if (isCur) advance()
        }}
      />
    )
  }

  return (
    <Link
      ref={boxRef}
      href={meta.href}
      className="ftr ec-ftr"
      aria-label={`${meta.name} — ${meta.desc}. Open the generator with this engine selected.`}
    >
      <span className="ftr-media">
        {POSTER[v.engine] && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={POSTER[v.engine]} alt="" className="ec-poster" loading="eager" fetchPriority={index === 0 ? 'high' : 'auto'} />
        )}
        {started && renderSlot(0)}
        {started && len > 1 && renderSlot(1)}
        <span className="ec-chip">{meta.name}</span>
        {len > 1 && (
          <span className="ec-dots" aria-hidden="true">
            {videos.map((vv, i) => (
              // key com active: a barra do video corrente REINICIA a animacao
              // de preenchimento (stories) a cada troca.
              <i key={i === active % len ? `on-${active}` : vv.id} className={i === active % len ? 'on' : ''} />
            ))}
          </span>
        )}
        <span className="ec-go">Generate →</span>
      </span>
      <h3>{meta.name}</h3>
      <p>{meta.desc}</p>
    </Link>
  )
}
