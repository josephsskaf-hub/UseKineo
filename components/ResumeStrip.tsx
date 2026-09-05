'use client'

// KINEO-FAIXA-CONTINUAR-2026-09-01 — sprint v1->v4, rodada #13.
//
// O NUMERO QUE FEZ ISTO EXISTIR (medido 01/09): das 66 pessoas externas que
// fizeram EXATAMENTE 1 video em 7 dias, 29 (44%) VOLTARAM ao site depois.
// Oito acharam o Studio sozinhas. ZERO apertaram gerar. Elas voltam e caem na
// pagina de VENDAS — os mesmos cards de motor e a mesma tabela de preco que um
// estranho ve. Nenhum video delas, nenhum botao de continuar, nenhuma memoria
// de que ela ja e cliente.
//
// A APOSTA: ancora vence novidade. Em 7 dias, series_continue_clicked = 14 e
// series_continuation_landed = 20 — 91% de quem clica em "continuar a serie"
// chega no compositor. No MESMO periodo, next_shorts_picked ("3 ideias novas")
// = 0 em 93 exibicoes. A diferenca entre as duas superficies nao e o desenho:
// e que uma parte do que a pessoa JA FEZ e a outra oferece assunto novo.
// Por isso esta faixa reaproveita buildSeriesContinuationHref, nao inventa
// ideia nenhuma.
//
// LIMITES DA PISTA (acordo com o Codex, 31/08): esta faixa NAO fala de preco,
// plano, moeda nem cobranca, e nao encosta em EngineCycleCard,
// lib/engineWall.ts nem public/previews (desenho manual do fundador). Ela e
// puramente aditiva e so existe para usuario LOGADO que ja tem video pronto —
// o visitante anonimo ve a home exatamente como antes.

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import { trackEvent } from '@/lib/analytics'
import { buildStudioSeriesReviewHref } from '@/lib/navigation/studioSeriesReview'

type Props = {
  title: string
  episode: number
  videoId?: string | null
}

export default function ResumeStrip({ title, episode, videoId = null }: Props) {
  const rootRef = useRef<HTMLDivElement | null>(null)
  const seenRef = useRef(false)
  const limpo = (title ?? '').trim()
  const ep = Number.isFinite(episode) && episode > 1 ? Math.floor(episode) : 2

  // LICAO DA RODADA #9: `shown` disparado no fetch mede o SERVIDOR, nao o olho.
  // resume_strip_seen so dispara quando metade da faixa esteve de fato na tela.
  useEffect(() => {
    if (!limpo) return
    let obs: IntersectionObserver | null = null
    const marcarVisto = () => {
      if (seenRef.current) return
      seenRef.current = true
      void trackEvent('resume_strip_seen', { episode: ep, video_id: videoId })
    }
    if (typeof IntersectionObserver === 'undefined') {
      marcarVisto()
      return
    }
    const el = rootRef.current
    if (!el) return
    try {
      obs = new IntersectionObserver(
        (entradas) => {
          for (const e of entradas) {
            if (e.isIntersecting && e.intersectionRatio >= 0.5) {
              marcarVisto()
              try { obs?.disconnect() } catch { /* noop */ }
            }
          }
        },
        { threshold: [0.5] },
      )
      obs.observe(el)
    } catch {
      marcarVisto()
    }
    return () => {
      try { obs?.disconnect() } catch { /* noop */ }
    }
  }, [limpo, ep, videoId])

  // Falha invisivel, mesmo padrao do NextShortsSection: sem titulo legivel a
  // faixa simplesmente nao existe. Nunca uma faixa vazia no topo da home.
  if (!limpo) return null

  const href = buildStudioSeriesReviewHref(limpo, 'landing_resume_strip')

  return (
    <div
      ref={rootRef}
      data-kineo="resume-strip"
      style={{
        position: 'relative',
        zIndex: 60,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        flexWrap: 'wrap',
        padding: '10px 20px',
        background: 'linear-gradient(90deg, rgba(41,151,255,.16), rgba(41,151,255,.05))',
        borderBottom: '1px solid rgba(41,151,255,.28)',
        color: '#e9e9ee',
        fontSize: '0.82rem',
        lineHeight: 1.35,
      }}
    >
      <span
        aria-hidden="true"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 22,
          height: 22,
          flex: '0 0 auto',
          borderRadius: 6,
          background: 'rgba(41,151,255,.22)',
          fontSize: '0.7rem',
        }}
      >
        🎬
      </span>

      <span style={{ minWidth: 0, flex: '1 1 260px' }}>
        <strong style={{ fontWeight: 800, color: '#fff' }}>Your last Short:</strong>{' '}
        <span
          title={limpo}
          style={{
            display: 'inline-block',
            maxWidth: '100%',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            verticalAlign: 'bottom',
            color: '#c9c9d1',
          }}
        >
          {limpo}
        </span>
      </span>

      <Link
        href={href}
        prefetch={false}
        onClick={() => {
          void trackEvent('resume_strip_clicked', { episode: ep, video_id: videoId })
        }}
        style={{
          flex: '0 0 auto',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          padding: '7px 14px',
          borderRadius: 9,
          background: 'linear-gradient(135deg, #2997ff, #1d6fe0)',
          border: '1px solid transparent',
          color: '#fff',
          fontWeight: 800,
          fontSize: '0.78rem',
          textDecoration: 'none',
          boxShadow: '0 4px 16px rgba(41,151,255,.28)',
        }}
      >
        Continue this story →
      </Link>

      <span style={{ flex: '0 0 auto', color: '#8f8f96', fontSize: '0.7rem' }}>
        Same series, new hook — your topic is already filled in.
      </span>
    </div>
  )
}
