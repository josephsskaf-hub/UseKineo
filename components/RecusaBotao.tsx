'use client'
// KINEO-RECUSA-BOTAO-3110 [TRAVA 8.2 — vai do fundador 31/10 "10 tarefas, já vamos fazer"] — o botão de 1 clique embaixo da recusa.
// A frase do servidor continua visível em cima (quem renderiza é a tela); aqui só os botões já RESOLVIDOS por
// lib/recusaBotao.resolverBotoesDaRecusa (o que cabe no motor, no saldo e no modo). `retry_later` agenda o reenvio no próprio
// cliente com relógio visível e botão de cancelar; os outros chamam onApply na hora.
import { useEffect, useRef, useState } from 'react'
import type { BotaoDaRecusa, RefusalFix } from '@/lib/recusaBotao'

type Props = {
  primary: BotaoDaRecusa
  secondary: BotaoDaRecusa | null
  onApply: (fix: RefusalFix) => void
  onShown?: (fix: RefusalFix) => void
  disabled?: boolean
}

function rotulo(b: BotaoDaRecusa): string {
  return typeof b.cost === 'number' ? `${b.label} · ${b.cost} credit${b.cost === 1 ? '' : 's'}` : b.label
}

export default function RecusaBotao({ primary, secondary, onApply, onShown, disabled }: Props) {
  const applyRef = useRef(onApply)
  applyRef.current = onApply
  const [agendadoPara, setAgendadoPara] = useState<number | null>(null)
  const [agora, setAgora] = useState(() => Date.now())
  const shownKey = `${primary.fix.code}:${primary.fix.reason}:${primary.fix.seconds ?? ''}`
  const shownRef = useRef('')

  useEffect(() => {
    if (shownRef.current === shownKey) return
    shownRef.current = shownKey
    onShown?.(primary.fix)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shownKey])

  useEffect(() => {
    if (agendadoPara === null) return
    const tick = setInterval(() => setAgora(Date.now()), 1000)
    const fire = setTimeout(() => {
      setAgendadoPara(null)
      applyRef.current(primary.fix)
    }, Math.max(0, agendadoPara - Date.now()))
    return () => { clearInterval(tick); clearTimeout(fire) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agendadoPara])

  const clique = (b: BotaoDaRecusa) => {
    if (disabled) return
    if (b.fix.code === 'retry_later') {
      setAgora(Date.now())
      setAgendadoPara(Date.now() + (b.fix.afterSec ?? 120) * 1000)
      return
    }
    applyRef.current(b.fix)
  }

  const restante = agendadoPara === null ? 0 : Math.max(0, Math.ceil((agendadoPara - agora) / 1000))
  const relogio = `${Math.floor(restante / 60)}:${String(restante % 60).padStart(2, '0')}`

  return (
    <div className="mt-3 flex items-center gap-2 flex-wrap" data-recusa-botao={primary.fix.code}>
      {agendadoPara !== null ? (
        <>
          <span className="text-sm font-bold" style={{ color: '#34d399' }} role="status">
            Retrying automatically in {relogio} — keep this tab open.
          </span>
          <button
            type="button"
            onClick={() => setAgendadoPara(null)}
            className="rounded-lg px-3 py-1.5 text-xs font-bold"
            style={{ background: 'transparent', border: '1px solid rgba(255,255,255,.22)', color: 'var(--muted2)', cursor: 'pointer' }}
          >
            Cancel
          </button>
        </>
      ) : (
        <>
          <button
            type="button"
            onClick={() => clique(primary)}
            disabled={disabled}
            className="rounded-xl px-5 py-2.5 text-sm font-bold"
            style={{ background: '#34d399', border: 'none', cursor: disabled ? 'not-allowed' : 'pointer', color: '#04130d' }}
          >
            ✨ {rotulo(primary)}
          </button>
          {secondary && (
            <button
              type="button"
              onClick={() => clique(secondary)}
              disabled={disabled}
              className="rounded-xl px-4 py-2.5 text-sm font-bold"
              style={{ background: 'transparent', border: '1px solid rgba(52,211,153,.55)', color: '#34d399', cursor: disabled ? 'not-allowed' : 'pointer' }}
            >
              {rotulo(secondary)}
            </button>
          )}
        </>
      )}
    </div>
  )
}
