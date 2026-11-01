'use client'

// ═══ KINEO-PROXIMO-EPISODIO-0111 — o clique do botão "Next episode" (vai do fundador 01/11 "vai tudo") ═══
// O mesmo comportamento nas duas telas que mostram filme pronto (tela de pronto do /generate e cartão da biblioteca):
//   1. grava next_episode_clicked;
//   2. pede ao servidor (POST /api/next-episode/studio) a ideia do episódio seguinte com a ficha do personagem e o link do
//      Studio no MESMO motor, duração e língua;
//   3. abre o Studio preenchido. O servidor não respondeu? Abre o link de reserva que a tela já tinha (o de sempre) —
//      o botão nunca vira erro em cima de um filme que deu certo.
// Clique com Ctrl/Cmd/Shift/botão do meio segue o link de reserva do próprio <a> (nova aba), sem interceptar.
import { useEffect, useRef } from 'react'
import { trackEvent } from '@/lib/analytics'
import { NEXT_EPISODE_CLICKED_EVENT, NEXT_EPISODE_LINK_READY_EVENT, NEXT_EPISODE_SHOWN_EVENT } from '@/lib/proximoEpisodioLink'

/** 'library_card' = cartão do /library (HistoryClient embutido); 'history_card' = o mesmo cartão no /history (My Videos). */
export type SuperficieDoEpisodio = 'library_card' | 'history_card' | 'done_screen_top'

// Um clique por filme de cada vez: o segundo clique, com o primeiro ainda buscando a ideia, não dispara outra chamada.
const EM_VOO = new Set<string>()

export interface PedidoDoEpisodio {
  surface: SuperficieDoEpisodio
  videoId: string
  /** Link de reserva (o de sempre da tela) — usado se o servidor falhar. */
  fallbackHref: string
  language?: string | null
  engine?: string | null
  durationSeconds?: number | null
  /** Como navegar (router.push da tela); sem ele, window.location.assign. */
  navegar?: (href: string) => void
}

const PRAZO_MS = 12_000

/** Abre o Studio com o próximo episódio. Devolve o link usado (para teste/telemetria da tela). */
export async function abrirProximoEpisodio(p: PedidoDoEpisodio, ev?: { preventDefault(): void; metaKey?: boolean; ctrlKey?: boolean; shiftKey?: boolean; button?: number }): Promise<string> {
  if (ev && (ev.metaKey || ev.ctrlKey || ev.shiftKey || (typeof ev.button === 'number' && ev.button !== 0))) return p.fallbackHref
  ev?.preventDefault()
  if (EM_VOO.has(p.videoId)) return p.fallbackHref
  EM_VOO.add(p.videoId)
  void trackEvent(NEXT_EPISODE_CLICKED_EVENT, { surface: p.surface, video_id: p.videoId })
  let href = p.fallbackHref
  let via: 'server' | 'fallback' = 'fallback'
  let extras: Record<string, unknown> = {}
  try {
    const r = await fetch('/api/next-episode/studio', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fromVideoId: p.videoId,
        language: p.language ?? undefined,
        engine: p.engine ?? undefined,
        durationSeconds: typeof p.durationSeconds === 'number' && p.durationSeconds > 0 ? p.durationSeconds : undefined,
      }),
      signal: AbortSignal.timeout(PRAZO_MS),
    })
    if (r.ok) {
      const d = (await r.json()) as { studioHref?: string; fichas?: string[]; wroteEpisode?: boolean; usedEpisode?: boolean; episodeOffTopic?: boolean; engine?: string | null; duration?: string | null; language?: string }
      if (typeof d.studioHref === 'string' && d.studioHref.startsWith('/studio?')) {
        href = d.studioHref
        via = 'server'
        extras = { fichas: Array.isArray(d.fichas) ? d.fichas.length : 0, wrote_episode: d.wroteEpisode === true, used_episode: d.usedEpisode === true, episode_off_topic: d.episodeOffTopic === true, engine: d.engine ?? null, duration: d.duration ?? null, language: d.language ?? null }
      }
    } else {
      extras = { status: r.status }
    }
  } catch {
    extras = { status: 'network' }
  }
  void trackEvent(NEXT_EPISODE_LINK_READY_EVENT, { surface: p.surface, video_id: p.videoId, via, ...extras })
  EM_VOO.delete(p.videoId)
  if (p.navegar) p.navegar(href)
  else window.location.assign(href)
  return href
}

/** next_episode_shown — UMA vez por tela montada (por superfície), com quantos botões a pessoa tem na frente. */
export function useProximoEpisodioVisto(surface: SuperficieDoEpisodio, botoes: number, videoId?: string | null) {
  const feito = useRef<string | null>(null)
  useEffect(() => {
    if (botoes <= 0) return
    const chave = `${surface}:${videoId ?? ''}`
    if (feito.current === chave) return
    feito.current = chave
    void trackEvent(NEXT_EPISODE_SHOWN_EVENT, { surface, buttons: botoes, video_id: videoId ?? null })
  }, [surface, botoes, videoId])
}
