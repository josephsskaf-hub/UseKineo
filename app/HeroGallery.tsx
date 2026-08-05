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
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { PUBLIC_EXAMPLES } from '@/lib/publicExamples'
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

  // Um observer só, sobre os vídeos que existirem: fora da tela, pausa. Ele
  // nunca MONTA nada — descer a página não baixa um byte a mais.
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const video = entry.target as HTMLVideoElement
          if (entry.isIntersecting) {
            if (!reducedMotion) {
              video.play().catch(() => {
                // Autoplay pode ser negado (low power mode); o poster continua.
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
            {showVideo ? (
              <video
                ref={(el) => {
                  videoRefs.current[index] = el
                }}
                className="hvid"
                src={example.videoPath}
                poster={example.posterPath}
                muted
                loop
                autoPlay
                playsInline
                preload="metadata"
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                className="hvid"
                src={example.posterPath}
                alt=""
                loading={index === 0 ? 'eager' : 'lazy'}
                decoding="async"
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
