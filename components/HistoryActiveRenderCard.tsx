'use client'

// ═══════════════════════════════════════════════════════════════════════════
// KINEO-HISTORICO-RENDER-VIVO-2026-09-04 (#10) — a tela que recebe a promessa
// passa a saber que o filme existe.
//
// O DEFEITO (medido antes de subir o #9): `/history` monta a lista a partir de
// UMA leitura de `videos` no servidor. Um render cinematografico ainda no fal
// nao tem linha em `videos` — ela nasce no fim, quando o compose termina. O #9
// passou a mandar para ca justamente o render SEM id (54 de 95 cliques em
// "Rendering" em 14 dias, 11 pessoas, 6 delas sem um filme na vida), com a
// frase "the film saves to My Videos on its own". A pessoa chegava e via a
// lista velha — ou "No videos yet". Prometer e nao mostrar e a mesma doenca do
// #9, so que na outra ponta.
//
// ESTE CARTAO E A OUTRA METADE DO #9. Ele nao inventa nada: le a MESMA verdade
// de servidor que a pilula ja lia (/api/compose/active, KINEO-RESUME-RENDER-
// 2026-08-04) e diz na tela o que o servidor respondeu.
//
// DELIBERADAMENTE NAO E UM POLLER DE RENDER. Nunca fala com /api/compose/status
// nem com a Creatomate e nunca dispara render. Quando o servidor responde
// `completed`, ele so pede `router.refresh()` — a lista da pagina (server
// component) recarrega e o filme aparece pelo caminho normal.
//
// Custo: uma sonda ao montar e uma a cada 20s ENQUANTO o estado for
// `rendering`. Estado diferente de `rendering` = nenhum intervalo. Aba
// escondida = intervalo desmontado, com sonda fresca na volta.
// ═══════════════════════════════════════════════════════════════════════════

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { trackEvent } from '@/lib/analytics'
import {
  FRASE_RENDER_NA_BIBLIOTECA,
  TITULO_RENDER_NA_BIBLIOTECA,
} from '@/lib/renderPillTarget'

const POLL_MS = 20000

type Estado =
  | { fase: 'rendering'; renderId: string | null; religavel: boolean; comecouEmMs: number }
  | { fase: 'quieto' }

function decorrido(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000))
  const m = Math.floor(s / 60)
  return m > 0 ? `${m}m ${String(s % 60).padStart(2, '0')}s` : `${s}s`
}

export default function HistoryActiveRenderCard() {
  const router = useRouter()
  const [estado, setEstado] = useState<Estado>({ fase: 'quieto' })
  const [tick, setTick] = useState(() => Date.now())
  const emVooRef = useRef(false)
  const mostradoRef = useRef<string>('')
  // O refresh so pode acontecer se ESTA tela viu o render vivo antes. Sem isso
  // um `completed` antigo (video que a pessoa ja tem na lista) recarregaria a
  // pagina a toa toda vez que ela abrisse a biblioteca.
  const viuRenderVivoRef = useRef(false)

  const sondar = useCallback(async () => {
    if (emVooRef.current) return
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return
    emVooRef.current = true
    try {
      const res = await fetch('/api/compose/active', { cache: 'no-store' })
      if (!res.ok) {
        // 401 (deslogado) ou sonda degradada: nao afirmar nada sobre o filme
        // de ninguem. O cartao some, a lista continua.
        setEstado({ fase: 'quieto' })
        return
      }
      const data = (await res.json().catch(() => null)) as Record<string, unknown> | null
      if (data && data.state === 'rendering') {
        const comecou = Date.parse(typeof data.started_at === 'string' ? data.started_at : '')
        const idLido =
          typeof data.render_id === 'string' && data.render_id.trim() ? data.render_id.trim() : null
        viuRenderVivoRef.current = true
        setEstado({
          fase: 'rendering',
          renderId: idLido,
          // Mesma regra do #9: a fonte mais restritiva vence. Sem id nao ha o
          // que religar, e e exatamente esse render que cai nesta tela.
          religavel: data.resumable !== false && Boolean(idLido),
          comecouEmMs: Number.isFinite(comecou) ? comecou : Date.now(),
        })
        setTick(Date.now())
        return
      }
      const acabouAgora = viuRenderVivoRef.current && data?.state === 'completed'
      setEstado({ fase: 'quieto' })
      if (acabouAgora) {
        viuRenderVivoRef.current = false
        void trackEvent('history_active_render_landed', {})
        // A lista e server-side: sem refresh o filme so apareceria num F5 manual.
        router.refresh()
      }
    } catch {
      // silencio — um cartao de aviso nunca pode quebrar a biblioteca que ele
      // enfeita.
    } finally {
      emVooRef.current = false
    }
  }, [router])

  useEffect(() => {
    void sondar()
  }, [sondar])

  useEffect(() => {
    if (typeof document === 'undefined') return
    const aoTrocarVisibilidade = () => {
      if (document.visibilityState === 'visible') void sondar()
    }
    document.addEventListener('visibilitychange', aoTrocarVisibilidade)
    return () => document.removeEventListener('visibilitychange', aoTrocarVisibilidade)
  }, [sondar])

  const vivo = estado.fase === 'rendering'
  useEffect(() => {
    if (!vivo) return
    const id = setInterval(() => {
      setTick(Date.now())
      void sondar()
    }, POLL_MS)
    return () => clearInterval(id)
  }, [vivo, sondar])

  useEffect(() => {
    if (estado.fase !== 'rendering') return
    const identidade = `r:${estado.renderId ?? 'pending'}`
    if (mostradoRef.current === identidade) return
    mostradoRef.current = identidade
    void trackEvent('history_active_render_shown', {
      resumable: estado.religavel,
      render_id: estado.renderId,
    })
  }, [estado])

  if (estado.fase !== 'rendering') return null

  return (
    <section
      aria-live="polite"
      aria-label="Film being made"
      className="rounded-2xl p-5 sm:p-6 mb-6"
      style={{ background: 'rgba(41,151,255,.06)', border: '1px solid rgba(41,151,255,.28)' }}
    >
      <div className="flex items-start gap-3">
        <span
          aria-hidden="true"
          style={{
            width: 10,
            height: 10,
            borderRadius: 999,
            background: '#2997ff',
            marginTop: 6,
            flexShrink: 0,
            boxShadow: '0 0 0 4px rgba(41,151,255,.18)',
          }}
        />
        <div>
          <div className="font-black text-base mb-1" style={{ color: '#5cb3ff' }}>
            {TITULO_RENDER_NA_BIBLIOTECA}
            <span className="ml-2 text-xs font-bold" style={{ color: 'var(--muted2)' }}>
              {decorrido(tick - estado.comecouEmMs)}
            </span>
          </div>
          <div className="text-sm" style={{ color: 'var(--muted2)', lineHeight: 1.6 }}>
            {FRASE_RENDER_NA_BIBLIOTECA}
          </div>
        </div>
      </div>
    </section>
  )
}
