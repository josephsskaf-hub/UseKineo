'use client'

// Public proof used above the fold.
//
// These previews are compressed cuts from founder-owned Kineo exports that
// were explicitly selected for the public homepage. The shared allow-list also
// powers dedicated watch pages; private customer renders never enter it.
//
// KINEO-HERO-SHOWCASE-2026-08-05 — a fileira voltou a ter SEIS cards (a forma
// que está na ficha do TAAFT), e por isso a estratégia de carregamento mudou
// de "vídeo em todos" para "POSTER em todos, vídeo só quando pedido".
//
// Por quê: o modelo anterior (card 0 com autoPlay + IntersectionObserver
// tocando os cards 1-3 ao entrar na viewport) fazia a home baixar os QUATRO
// MP4s assim que a pessoa rolava o hero — ~966 KB. Com seis cards o mesmo
// modelo custaria ~1,43 MB na página de maior tráfego do site, e metade da
// base chega de celular em IN/NG/PK/BR.
//
// Agora:
//   · cards 1-5 nascem como <img> do poster (14-31 KB cada, lazy) — ZERO byte
//     de vídeo, e nem o elemento <video> existe no DOM;
//   · o <video> só é montado quando há intenção real (pointerenter/focus no
//     desktop) — e o clique continua indo para a página do exemplo;
//   · o card 0 continua tocando sozinho, porque é ele que prova em um segundo
//     que aquilo é vídeo e não print;
//   · um único IntersectionObserver PAUSA o que estiver tocando quando sai da
//     tela (o autoplay antigo do card 0 rodava para sempre, gastando bateria);
//   · prefers-reduced-motion: reduce desliga tudo — seis posters estáticos.
// Custo de vídeo na primeira dobra: 247 KB (só example-turkmenistan.mp4),
// contra 943 KB dos quatro MP4s do modelo anterior. Os seis posters somam
// ~134 KB, e cinco deles são lazy.
//
// KINEO-UI-NORTH-STAR-2026-08-12 — "os vídeos ficam passando na tela".
// O padrão Higgsfield (medido no HTML deles: <video loop muted playsinline
// preload="none"> em TODO card) agora vale para os seis cards, SEM abrir mão
// do orçamento acima:
//   · o poster continua sendo o primeiro paint (LCP intacto — o <video> dos
//     cards 1-5 só é montado depois do window load + requestIdleCallback);
//   · preload="none" + poster: montar não baixa NADA; o download só começa
//     quando o IntersectionObserver chama play() num card visível (≥35%).
//     No celular o trilho mostra ~3 cards — só esses baixam;
//   · pausa fora da viewport continua (mesmo observer de antes);
//   · sem autoPlay attribute: quem dá play é o observer, então um card
//     montado mas fora da tela fica em zero byte;
//   · NotAllowedError (low power mode / autoplay bloqueado) desmonta o card
//     de volta para poster + badge de play — nunca um retângulo morto;
//   · prefers-reduced-motion, Save-Data e 2g: nada de autoplay — seis
//     posters, hover ainda ativa (intenção explícita).
// Peso medido: os 6 MP4s somam ~1,43 MB (135–314 KB cada, previews de 5s
// 360x640 sem áudio). Desktop pós-idle: ok. Mobile: só o que intersecta.
// CLS: zero — poster e vídeo são camadas absolute inset-0 no mesmo box de
// aspect-ratio 9/16, e o poster do <video> é o MESMO jpg já em cache.
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { PUBLIC_EXAMPLES, posterWebpPath } from '@/lib/publicExamples'
import { trackEvent } from '@/lib/analytics'

const GALLERY_SOURCE = 'hero_showcase_row'

export default function HeroGallery() {
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([])
  const [reducedMotion, setReducedMotion] = useState(false)
  // Índices com <video> montado. O card 0 já nasce montado (autoplay).
  const [mounted, setMounted] = useState<boolean[]>(() => PUBLIC_EXAMPLES.map((_, i) => i === 0))

  // Track the user's reduced-motion preference live (it can change mid-session
  // on some OSes/browsers via the accessibility settings panel).
  useEffect(() => {
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReducedMotion(mql.matches)
    const onChange = (e: MediaQueryListEvent) => setReducedMotion(e.matches)
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [])

  // KINEO-UI-NORTH-STAR-2026-08-12 — depois do load + idle, monta os seis
  // <video>. Montar é grátis (preload="none"); o play/download é decisão do
  // observer abaixo, card a card, só para quem está visível.
  useEffect(() => {
    if (reducedMotion) return
    const nav = navigator as Navigator & {
      connection?: { saveData?: boolean; effectiveType?: string }
    }
    const conn = nav.connection
    // Economia de dados pedida explicitamente, ou rede 2g: fica no modelo
    // poster-first + hover, que já funciona.
    if (conn?.saveData || (conn?.effectiveType ?? '').includes('2g')) return

    let idleId: number | undefined
    let timeoutId: ReturnType<typeof setTimeout> | undefined
    const mountAll = () => setMounted(PUBLIC_EXAMPLES.map(() => true))
    const schedule = () => {
      if ('requestIdleCallback' in window) {
        idleId = window.requestIdleCallback(mountAll, { timeout: 3000 })
      } else {
        timeoutId = setTimeout(mountAll, 1200)
      }
    }
    if (document.readyState === 'complete') {
      schedule()
    } else {
      window.addEventListener('load', schedule, { once: true })
    }
    return () => {
      window.removeEventListener('load', schedule)
      if (idleId !== undefined && 'cancelIdleCallback' in window) window.cancelIdleCallback(idleId)
      if (timeoutId !== undefined) clearTimeout(timeoutId)
    }
  }, [reducedMotion])

  // Um observer só, sobre os vídeos que existirem: dentro da tela, play (é o
  // play que dispara o download, por causa do preload="none"); fora, pausa.
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const video = entry.target as HTMLVideoElement
          if (entry.isIntersecting) {
            if (!reducedMotion) {
              video.play().catch((err: unknown) => {
                // Autoplay negado de verdade (low power mode, política do
                // navegador): volta o card para poster + badge de play, que é
                // um estado honesto e clicável. AbortError (pause() durante um
                // play() pendente, ao rolar rápido) NÃO desmonta nada.
                if ((err as { name?: string } | null)?.name === 'NotAllowedError') {
                  const index = videoRefs.current.indexOf(video)
                  if (index > 0) {
                    setMounted((prev) => {
                      if (!prev[index]) return prev
                      const next = [...prev]
                      next[index] = false
                      return next
                    })
                  }
                }
              })
            }
          } else {
            video.pause()
          }
        })
      },
      { threshold: 0.35 },
    )
    videoRefs.current.forEach((video) => video && observer.observe(video))
    return () => observer.disconnect()
  }, [mounted, reducedMotion])

  function activate(index: number) {
    if (reducedMotion || index === 0) return
    setMounted((prev) => {
      if (prev[index]) return prev
      const next = [...prev]
      next[index] = true
      return next
    })
  }

  return (
    <div id="samples" className="hero-gallery" aria-label="Real Shorts made with Kineo">
      {PUBLIC_EXAMPLES.map((example, index) => {
        const showVideo = mounted[index] && !reducedMotion

        return (
          <Link
            key={example.slug}
            href={`/examples/${example.slug}`}
            className="vcard"
            aria-label={`${example.title} — watch a real Kineo output preview`}
            onPointerEnter={() => activate(index)}
            onFocus={() => activate(index)}
            onClick={() => {
              void trackEvent('hero_example_clicked', {
                source: GALLERY_SOURCE,
                placement: 'home_hero_gallery',
                destination: `/examples/${example.slug}`,
                example_slug: example.slug,
                position: index + 1,
                output_duration_seconds: example.outputDurationSeconds,
              }, '/')
            }}
          >
            {/* KINEO-HIGGSFIELD-20D dia 2 (13/08) — o poster e camada
                PERMANENTE (e continua o LCP); o <video> monta por cima com
                opacity:0 e so aparece em crossfade --dur-base quando o evento
                `playing` dispara. Antes a troca img→video era seca; agora nada
                pisca. Se o autoplay for negado, o video desmonta e o poster ja
                esta embaixo — nunca um retangulo morto. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              className="hvid"
              src={posterWebpPath(example.posterPath)}
              alt=""
              loading={index === 0 ? 'eager' : 'lazy'}
              decoding="async"
            />
            {showVideo && (
              <video
                ref={(el) => {
                  videoRefs.current[index] = el
                }}
                className="hvid"
                src={example.videoPath}
                poster={posterWebpPath(example.posterPath)}
                muted
                loop
                playsInline
                preload="none"
                onPlaying={(e) => e.currentTarget.classList.add('hv-on')}
              />
            )}
            {!showVideo && (
              <span className="hvid-play" aria-hidden="true">
                <span>▶</span>
              </span>
            )}
            <div className="vt">{example.shortTitle}</div>
          </Link>
        )
      })}
    </div>
  )
}
