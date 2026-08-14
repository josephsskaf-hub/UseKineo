'use client'

import Link from 'next/link'
import { useCallback, useRef, useState } from 'react'
import { trackEvent } from '@/lib/analytics'

interface ExampleVideoPlayerProps {
  slug: string
  title: string
  src: string
  poster: string
  placement?: string
  version?: string
  /**
   * Porta mostrada NO FIM da previa. Opcional de proposito: sem ela o player
   * volta a ser exatamente o que era, e nenhuma outra superficie que o importe
   * ganha uma sobreposicao sem pedir.
   */
  ctaHref?: string
  ctaLabel?: string
}

// KINEO-EXAMPLES-PROVA-SEM-PORTA-2026-08-14
//
// Duas correcoes, ambas vindas da mesma medicao de hoje (30 dias, tabela `events`):
//
//   187 sessoes entraram por /examples/*  ·  153 deram play (82%)  ·  16 clicaram
//   em algum CTA (8,6%)  ·  10 desses 16 foram para /pricing  ·  0 chegaram ao
//   /signup e 2 ao /generate.
//
// 1. TELEMETRIA ORFA. O `fetch` cru para /api/events nao mandava `session_id`, e
//    100% das 153+16 linhas ficaram sem sessao. Como todo funil da casa agrupa
//    por sessao, a superficie de MAIOR engajamento organico que temos era lida
//    como morta em todos os documentos. `trackEvent` resolve na origem.
//
// 2. A PORTA ESTAVA FORA DA TELA NO MOMENTO CERTO. O quadro e 9:16 e ocupa a
//    altura inteira de um celular; os CTAs vivem ABAIXO dele. Quem assiste os 5
//    segundos ate o fim acabou de receber a prova — e nesse segundo exato a tela
//    nao pede nada. O `onEnded` passa a ser o pedido: a porta aparece DENTRO do
//    quadro, sem empurrar layout e sem interromper quem ainda esta assistindo.
export default function ExampleVideoPlayer({
  slug,
  title,
  src,
  poster,
  placement = 'example_watch',
  version = 'push31',
  ctaHref,
  ctaLabel = 'Make this Short with my topic →',
}: ExampleVideoPlayerProps) {
  const played = useRef(false)
  const endedTracked = useRef(false)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [ended, setEnded] = useState(false)

  const trackPlay = useCallback(() => {
    setEnded(false)
    if (played.current) return
    played.current = true
    void trackEvent('example_video_play', {
      version,
      example_slug: slug,
      placement,
    })
  }, [placement, slug, version])

  const handleEnded = useCallback(() => {
    setEnded(true)
    if (endedTracked.current) return
    endedTracked.current = true
    // Evento novo: separa "curiosidade" (play) de "prova consumida ate o fim",
    // que e a unica das duas que justifica um pedido.
    void trackEvent('example_preview_ended', {
      version,
      example_slug: slug,
      placement,
      has_cta: Boolean(ctaHref),
    })
  }, [ctaHref, placement, slug, version])

  const replay = useCallback(() => {
    setEnded(false)
    const el = videoRef.current
    if (!el) return
    el.currentTime = 0
    void el.play().catch(() => {
      // Um replay recusado pelo navegador nunca pode deixar a tela travada no
      // overlay: o estado ja voltou para false acima, os controles nativos ficam.
    })
  }, [])

  return (
    <div className="relative h-full w-full">
      <video
        ref={videoRef}
        aria-label={title}
        className="h-full w-full bg-black object-cover"
        src={src}
        poster={poster}
        controls
        playsInline
        preload="metadata"
        onPlay={trackPlay}
        onEnded={handleEnded}
      />

      {ended && ctaHref ? (
        <div className="absolute inset-0 flex flex-col items-center justify-end gap-3 bg-gradient-to-t from-black/92 via-black/60 to-black/10 px-5 pb-8 text-center">
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-white/60">
            That was 5 seconds of a real export
          </p>
          <Link
            href={ctaHref}
            onClick={() => {
              void trackEvent('example_watch_cta_click', {
                version,
                example_slug: slug,
                target: 'generate',
                placement: 'preview_ended',
              })
              void trackEvent('organic_cta_clicked', {
                source: `example_${slug}`,
                placement: 'preview_ended',
                destination: ctaHref.split('?')[0],
              })
            }}
            className="w-full max-w-[320px] rounded-full bg-white px-5 py-3 text-sm font-black text-black transition hover:bg-cyan-200"
          >
            {ctaLabel}
          </Link>
          <button
            type="button"
            onClick={replay}
            className="text-xs font-bold text-white/55 underline underline-offset-4 transition hover:text-white"
          >
            Watch again
          </button>
        </div>
      ) : null}
    </div>
  )
}
