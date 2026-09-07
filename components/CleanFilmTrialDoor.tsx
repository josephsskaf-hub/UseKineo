'use client'

// KINEO-TRIAL-1DOLAR-NA-ENTREGA-2026-09-07 — a porta de $1 dentro da caixa
// comercial da tela de filme pronto. A decisão e a copy moram em
// `lib/growth/cleanFilmTrialDoor.ts` (puro, testado por mutação); este arquivo
// é só a pintura e o clique.
//
// ⚠️ POR QUE ESTE É UM COMPONENTE NOVO E NÃO UMA EDIÇÃO NO MEIO DA CAIXA:
// a tela é do Codex. A regra da casa é componente NOVO + UMA linha de montagem.
// A única coisa que este push muda na caixa existente é o PESO VISUAL do botão
// de plano, que passa a ser contorno quando esta porta está no ar — porque dois
// botões azuis preenchidos e adjacentes com checkouts de tier diferente já
// custaram uma vez a esta casa (ver docs/PEDIDOS-ENTRE-PISTAS).

import { useEffect, useRef } from 'react'
import { trackEvent } from '@/lib/analytics'
import type { CleanFilmTrialDoorDecision } from '@/lib/growth/cleanFilmTrialDoor'

type Props = {
  decision: CleanFilmTrialDoorDecision
  /** Bloqueia o clique enquanto outro checkout da mesma caixa está navegando. */
  pending: boolean
  /** Campos de contexto que a caixa já emite nos outros eventos dela. */
  telemetry: Record<string, unknown>
  onStart: () => void
}

export default function CleanFilmTrialDoor({ decision, pending, telemetry, onStart }: Props) {
  // Uma impressão por montagem. A caixa só monta na fase `done`, e o
  // denominador honesto desta oferta é gente-por-dia, não renderização —
  // por isso a medição do diário conta `count(distinct user_id)`.
  const shownRef = useRef(false)
  useEffect(() => {
    if (!decision.visible || shownRef.current) return
    shownRef.current = true
    void trackEvent('post_video_trial_1usd_shown', { ...telemetry, reason: decision.reason })
    // A telemetria é fotografada na primeira impressão de propósito: reemitir a
    // cada mudança de contexto inflaria o denominador da única oferta que
    // precisamos medir limpa.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [decision.visible])

  if (!decision.visible || !decision.buttonLabel) return null

  return (
    <div className="mt-4">
      <button
        type="button"
        data-testid="post-video-trial-1usd"
        onClick={onStart}
        disabled={pending}
        className="flex items-center justify-center w-full rounded-xl py-3.5 text-sm font-black text-white"
        style={{
          background: 'linear-gradient(135deg, #2997ff, #0a6fd8)',
          border: '1px solid rgba(41,151,255,.6)',
          cursor: pending ? 'wait' : 'pointer',
          opacity: pending ? 0.6 : 1,
          boxShadow: '0 8px 24px rgba(41,151,255,.28)',
        }}
      >
        {pending ? 'Opening checkout…' : decision.buttonLabel}
      </button>
      <p
        className="mt-2 text-center"
        style={{ color: '#5cb3ff', fontSize: '0.7rem', lineHeight: 1.45, fontWeight: 700 }}
      >
        {decision.priceNote}
      </p>
    </div>
  )
}
