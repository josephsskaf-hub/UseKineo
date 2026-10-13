'use client'

// KINEO-PAIS-SEM-GRATIS-2026-10-13 — o aviso NEUTRO para a conta 'blocked'.
//
// 'blocked' é o carimbo anti-abuso de lib/reverseTrial.ts: a digital do aparelho passou do limite de ativações (os 19 casos
// de 30 dias medidos em 13/10 são TODOS trial_blocked_fingerprint; JO 8, PL 2, sem país 9) ou o e-mail é descartável. Até
// aqui a conta entrava muda, batia na parede de saldo sem explicação e sumia. Agora lê a verdade sem acusação e sem
// motivo: "esta conta não inclui um filme grátis". SEM botão de compra (decisão do pedido de 13/10: bloqueio por abuso não
// recebe oferta) — os planos continuam onde sempre estiveram (menu, /pricing, parede), nada é escondido nem empurrado.
// Régua e texto em lib/freeFilmPolicy.ts (blockedNeutralNoticeVisible, BLOCKED_NEUTRAL_NOTICE); o layout decide no servidor.
import { useEffect, useRef } from 'react'
import { trackEvent } from '@/lib/analytics'
import { useInterfaceLanguage } from '@/components/InterfaceLanguage'
import { pickInterfaceCopy } from '@/lib/ui/interfaceLanguage'
import { BLOCKED_NEUTRAL_NOTICE } from '@/lib/freeFilmPolicy'

export const BLOCKED_NEUTRAL_NOTICE_VERSION = 'blocked_neutral_notice_v1' as const

export default function BlockedNeutralNotice() {
  const language = useInterfaceLanguage()
  const copy = pickInterfaceCopy(BLOCKED_NEUTRAL_NOTICE, language)
  const shownRef = useRef(false)

  useEffect(() => {
    if (shownRef.current) return
    shownRef.current = true
    void trackEvent('blocked_neutral_notice_shown', { version: BLOCKED_NEUTRAL_NOTICE_VERSION, language })
  }, [language])

  return (
    <div
      data-blocked-neutral={BLOCKED_NEUTRAL_NOTICE_VERSION}
      role="status"
      style={{
        margin: '12px 16px 0',
        padding: '12px 16px',
        borderRadius: 12,
        background: 'var(--card2, var(--card))',
        border: '1px solid var(--border)',
      }}
    >
      <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text)' }}>{copy.title}</div>
      <div style={{ marginTop: 4, fontSize: 13, lineHeight: 1.5, color: 'var(--text2)' }}>{copy.body}</div>
    </div>
  )
}
