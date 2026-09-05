'use client'

import { useCallback, useEffect, useRef } from 'react'
import { trackEvent } from '@/lib/analytics'

// ═══════════════════════════════════════════════════════════════════════════
// sprint-retencao #15 — O DENOMINADOR DAS PORTAS DO EPISODIO 2
//
// O QUE ESTAVA ERRADO, MEDIDO NO BANCO (30 dias, `events`):
//   series_continue_clicked  = 122 eventos, em ONZE pares (source, path)
//   series_continue_seen     =  72 eventos, em DOIS   pares
// Impressao MENOR que clique e impossivel — a nao ser que a maior parte das
// portas nunca tenha aprendido a dizer que apareceu. E era isso: o evento de
// exposicao existia em UM arquivo so (GenerateClient, fontes `done_screen` e
// `composer_empty`). As outras nove fontes — `history_video_card` (31 cliques),
// `history_milestone` (26), `generate_recent_video` (24), `studio_milestone`
// (11), `render_pill` (7), `library_video_card` (1) — tinham clique e NENHUM
// denominador. Toda leitura de "a porta converte?" saia errada por construcao:
// dividia clique de onze portas pela impressao de duas.
//
// O QUE ESTE MODULO FAZ: uma unica definicao de "esta porta apareceu de
// verdade". Metade do elemento dentro do viewport, uma vez por porta por
// visita, `source` identico ao do clique (e por isso o par fecha), e
// fire-and-forget — nunca bloqueia pintura, nunca muda o que a pessoa ve.
//
// O QUE ELE NAO FAZ: nao muda copy, layout, href, preco, credito nem ordem de
// nada. E telemetria pura. Uma porta que hoje aparece continua aparecendo
// exatamente igual; a diferenca e que agora ela conta.
//
// Sem IntersectionObserver (navegador velho) marca `observed:false` em vez de
// perder a serie — numero generoso e melhor que numero cego. E a MESMA
// convencao que o `done_screen` ja usava desde a #47, de proposito: as duas
// fontes precisam continuar comparaveis.
// ═══════════════════════════════════════════════════════════════════════════

export type PortaDeSerie = {
  /** o MESMO valor que o `series_continue_clicked` daquela porta manda. */
  source: string
  video_id?: string | null
  position?: number | null
  completed_video_count?: number | null
}

export const LIMIAR_PORTA_VISIVEL = 0.5

export function chaveDaPorta(porta: PortaDeSerie): string {
  return [
    porta.source,
    porta.video_id ?? 'sem-video',
    porta.position ?? 'sem-posicao',
  ].join('::')
}

/**
 * Devolve `registrarPorta(porta)` — um ref callback para pendurar no elemento
 * que JA existe. Nada de wrapper, nada de elemento novo: a marcacao da tela
 * fica byte a byte a mesma, com um `ref` a mais.
 *
 *   const { registrarPorta } = useSeriesDoorSeen()
 *   <a ref={registrarPorta({ source: 'studio_milestone', video_id: v.id })} …>
 */
export function useSeriesDoorSeen() {
  const portas = useRef<Map<Element, PortaDeSerie>>(new Map())
  const disparadas = useRef<Set<string>>(new Set())
  const observados = useRef<Set<Element>>(new Set())
  const observerRef = useRef<IntersectionObserver | null>(null)
  const abertoEm = useRef<number>(0)
  if (abertoEm.current === 0) abertoEm.current = Date.now()

  const marcarVista = useCallback((porta: PortaDeSerie, observed: boolean) => {
    const chave = chaveDaPorta(porta)
    if (disparadas.current.has(chave)) return
    disparadas.current.add(chave)
    try {
      void trackEvent('series_continue_seen', {
        source: porta.source,
        video_id: porta.video_id ?? null,
        position: porta.position ?? null,
        completed_video_count: porta.completed_video_count ?? null,
        seconds_after_open: Math.round((Date.now() - abertoEm.current) / 1000),
        observed,
      })
    } catch {
      /* telemetria nunca derruba tela */
    }
  }, [])

  // O observer nasce no primeiro registro, nao num efeito: ref callback roda
  // no commit, ANTES de qualquer useEffect. Criar depois perderia a primeira
  // porta de toda tela que ja monta com a porta na frente.
  const garantirObserver = useCallback((): IntersectionObserver | null => {
    if (observerRef.current) return observerRef.current
    if (typeof IntersectionObserver === 'undefined') return null
    try {
      observerRef.current = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (!entry.isIntersecting) continue
            const porta = portas.current.get(entry.target)
            if (porta) marcarVista(porta, true)
            try { observerRef.current?.unobserve(entry.target) } catch { /* ignore */ }
            portas.current.delete(entry.target)
            observados.current.delete(entry.target)
          }
        },
        { threshold: LIMIAR_PORTA_VISIVEL },
      )
    } catch {
      observerRef.current = null
    }
    return observerRef.current
  }, [marcarVista])

  const registrarPorta = useCallback(
    (porta: PortaDeSerie) => {
      return (el: Element | null) => {
        if (!el) return
        if (disparadas.current.has(chaveDaPorta(porta))) return
        portas.current.set(el, porta)
        if (observados.current.has(el)) return
        const observer = garantirObserver()
        if (!observer) {
          // Sem suporte no navegador: conta a porta como vista, marcada.
          marcarVista(porta, false)
          return
        }
        observados.current.add(el)
        try { observer.observe(el) } catch { /* ignore */ }
      }
    },
    [garantirObserver, marcarVista],
  )

  useEffect(() => {
    const portasVivas = portas.current
    const observadosVivos = observados.current
    return () => {
      try { observerRef.current?.disconnect() } catch { /* ignore */ }
      observerRef.current = null
      portasVivas.clear()
      observadosVivos.clear()
    }
  }, [])

  return { registrarPorta, marcarVista }
}
