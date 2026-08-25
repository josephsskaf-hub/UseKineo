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
  // KINEO-VITRINE-FIX-25/08 — posters dos cards novos: o frame de abertura do
  // clipe curado nº1 de cada um (robôs p/ Omni, aérea noturna p/ H3).
  cinematic_h3: '/posters/8aabb05a-2492-48de-a96a-0a7875c0c8d3.jpg',
  cinematic_omni: '/posters/36a04f7b-65f7-42d9-a2ab-198b5a7f115e.jpg',
}

// KINEO-ENGINE-NAMES-2026-08-15 — nomes REAIS dos modelos (fonte:
// generate-video-cinematic/route.ts). Pares: bento em KineoLanding.tsx.
const META: Record<string, { name: string; desc: string; href: string }> = {
  // ⚠️ KINEO-VITRINE-FIX-25/08 — A LIÇÃO DO CARD FANTASMA: o hero do #335
  // mandava 4 cards do servidor, mas este mapa não conhecia cinematic_h3 nem
  // cinematic_omni e o `if (!meta) return null` ENGOLIA os dois no cliente —
  // a home abriu com 2 cards gigantes e o fundador viu na hora. Motor novo na
  // vitrine = par obrigatório AQUI (META + POSTER), não só no engineWall.
  cinematic_h3: { name: 'MiniMax H3', desc: 'Cinematic film — 9-image consistency', href: '/studio?engine=h3&intent_campaign=hero_engine' },
  cinematic_omni: { name: 'Omni Flash', desc: '#1-ranked video model — Aug 2026 arena', href: '/studio?engine=omni&intent_campaign=hero_engine' },
  cinematic_veo: { name: 'Veo 3.1', desc: "Google's flagship cinematic engine", href: '/studio?engine=veo&intent_campaign=hero_engine' },
  cinematic_kling: { name: 'Kling 2.5', desc: 'Cinematic motion and camera work', href: '/studio?engine=kling&intent_campaign=hero_engine' },
  cinematic_hollywood: { name: 'Kling 3', desc: 'Film scenes, native voice & lip sync', href: '/studio?engine=hollywood&intent_campaign=hero_engine' },
  cinematic_ai: { name: 'Seedance 1.5', desc: 'The workhorse AI video engine', href: '/studio?engine=seedance&intent_campaign=hero_engine' },
  presenter: { name: 'Avatar', desc: 'Talking video from one photo', href: '/avatar?intent_campaign=hero_engine' },
  fast: { name: 'Kineo 1', desc: 'Kineo’s own engine — 3–7 min', href: '/studio?engine=fast&intent_campaign=hero_engine' },
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
  // Em qual `active` a transicao ja foi disparada (evita disparo duplo
  // entre onTimeUpdate e onEnded).
  const firedRef = useRef(-1)
  // KINEO-CARD-SHARP-2026-08-19 (fundador: 'a moca de cabelos pretos demora
  // pra ficar nitida e trava um pouquinho na troca') — o play() do proximo
  // clipe so acontecia NA troca: decoder frio = primeiros frames moles +
  // micro-engasgo. Agora o slot escondido comeca a TOCAR ~1.2s antes
  // (invisivel, opacity 0): na troca o fade revela um video ja decodificado
  // e em movimento. warmedRef evita re-aquecer no mesmo ciclo.
  const warmedRef = useRef(-1)
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
    // KINEO-CARD-REVEAL-2026-08-19 (fundador: "o card do Kling 3 travou no
    // rosto da mulher") — REGRESSAO do pre-roll (196): a classe .hv-on (a que
    // revela o video, opacity 0→1) era adicionada SO no evento onPlaying, e
    // com o pre-roll o play() acontece 1.2s ANTES do swap, quando o slot
    // ainda nao e o corrente — o handler via isCur=false, nao revelava, e
    // depois nunca mais disparava (o video ja estava tocando). O card ficava
    // preso no POSTER estatico. Agora a revelacao e explicita no swap: quem
    // vira corrente ganha .hv-on aqui, tocando ou nao.
    cur?.classList.add('hv-on')
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
      }, 800)
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
        // CORTE NATURAL (fundador 15/08): a troca dispara ~0.45s ANTES do fim —
        // o proximo entra em crossfade enquanto este AINDA esta em movimento,
        // sem frame congelado. onEnded fica de reserva.
        onTimeUpdate={(e) => {
          const el = e.currentTarget
          if (!isCur || len <= 1 || !el.duration) return
          const left = el.duration - el.currentTime
          // Pre-roll: aquece o decoder do slot escondido antes do swap.
          if (left <= 1.2 && warmedRef.current !== active) {
            warmedRef.current = active
            const hidden = (active % 2 === 0 ? refB : refA).current
            hidden?.play().catch(() => {})
          }
          if (left <= 0.45 && firedRef.current !== active) {
            firedRef.current = active
            advance()
          }
        }}
        onEnded={() => { if (isCur && firedRef.current !== active) { firedRef.current = active; advance() } }}
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
