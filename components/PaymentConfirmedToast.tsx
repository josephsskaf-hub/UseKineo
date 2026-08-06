'use client'

// KINEO-TRIAL-ABUSE-PMP-2026-08-07 — O PRIMEIRO MINUTO PAGO.
//
// O BURACO QUE ISTO FECHA (auditado em 07/08, com evidência):
// nem todo checkout passa pela tela /checkout/success. Grep em
// app/api/stripe/checkout/route.ts:
//   linha 1697  topup   → `${appUrl}/generate?success=true&topup=…`
//   linha 2023  bulk    → `${appUrl}/generate?success=true&pack=…`
//   linha 1869  pilot   → `${appUrl}/autopilot?success=true&pack=autopilot_pilot`
// Esses três SKUs jogam o comprador direto numa tela do app com `success=true`
// na URL — e um grep por `success` em GenerateClient.tsx não encontra NENHUMA
// leitura desse parâmetro. Ou seja: o cartão foi cobrado, o Stripe redirecionou
// e o app não disse absolutamente nada. Nenhuma confirmação, nenhum "+120
// créditos", nada. O saldo do topo até muda — se o webhook já tiver rodado
// quando o efeito de /api/credits montou. Se não tiver, o comprador olha para o
// saldo ANTIGO e a única saída dele é apertar F5 por conta própria.
//
// POR QUE NO LAYOUT E NÃO DENTRO DO GenerateClient:
// os três destinos acima são DUAS telas diferentes (/generate e /autopilot), e
// amanhã um SKU novo aponta para uma terceira. O layout do (dashboard) é a
// única superfície que todas atravessam. Custo com `success` ausente na URL:
// um `useEffect` que lê a query string e retorna — zero fetch, zero render.
//
// O QUE ELE NÃO FAZ:
//   · não toca no checkout (ordem explícita: não refatorar);
//   · não afirma "+N créditos adicionados". Ele não sabe o delta — o baseline
//     anterior à compra não existe no cliente. Ele afirma o que ACABOU de ler
//     do servidor ("N credits available"), que é verdade em qualquer ordem de
//     chegada do webhook, e continua repolando por ~20s para o número subir
//     sozinho se o webhook chegar atrasado. Copy que envelhece mal em 3 segundos
//     é pior que copy nenhuma.
//   · não interfere com `wm_unlock=1`, que tem tratamento próprio no
//     GenerateClient (re-render limpo do vídeo). Só reage a `success=true`.

import { useCallback, useEffect, useRef, useState } from 'react'
import { trackEvent } from '@/lib/analytics'

// Poll agressivo no começo (o caso comum é o webhook já ter rodado) e ralo
// depois. Soma ~20s, que cobre com folga a latência observada do webhook.
const POLL_DELAYS_MS = [0, 2_000, 5_000, 10_000, 20_000] as const
// O toast some ANTES do último poll, de propósito: o que importa depois dos
// primeiros segundos não é o cartãozinho na tela, é o `creditsChanged` que
// atualiza o saldo do resto da UI. Esconder o toast não cancela o poll.
const AUTO_DISMISS_MS = 14_000

interface CreditsPayload {
  credits?: unknown
  hasPaid?: unknown
  plan?: unknown
}

export default function PaymentConfirmedToast() {
  const [visible, setVisible] = useState(false)
  const [credits, setCredits] = useState<number | null>(null)
  const [syncing, setSyncing] = useState(true)
  const [plan, setPlan] = useState<string | null>(null)
  const lastCreditsRef = useRef<number | null>(null)
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([])

  const dismiss = useCallback(() => setVisible(false), [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    let params: URLSearchParams
    try {
      params = new URLSearchParams(window.location.search)
    } catch {
      return
    }
    if (params.get('success') !== 'true') return

    const sku = params.get('pack') ?? params.get('topup') ?? null
    setVisible(true)
    void trackEvent('payment_confirmed_shown', {
      sku,
      path: window.location.pathname,
      stripe_session_id: params.get('session_id') ?? '',
    })

    // Tira `success` da URL AGORA. Só ele: `session_id`, `pack` e `topup` ficam
    // porque outras telas (e a analítica) podem lê-los. Sem isto, um F5 do
    // comprador reabre o toast e conta um segundo `payment_confirmed_shown`.
    try {
      const url = new URL(window.location.href)
      url.searchParams.delete('success')
      window.history.replaceState({}, '', url.toString())
    } catch {
      /* URL exótica — o toast ainda funciona, só reaparece num refresh */
    }

    let cancelled = false
    const poll = async (isLast: boolean) => {
      try {
        const res = await fetch('/api/credits', { cache: 'no-store' })
        if (!res.ok || cancelled) return
        const data = (await res.json()) as CreditsPayload
        if (cancelled) return
        const value = typeof data.credits === 'number' ? data.credits : null
        if (typeof data.plan === 'string') setPlan(data.plan)
        if (value !== null) {
          setCredits(value)
          // Só avisa o resto do app quando o número REALMENTE mudou. O
          // `creditsChanged` faz cada tela ouvinte disparar o próprio
          // /api/credits; emiti-lo a cada poll transformaria 5 chamadas em 10+.
          if (lastCreditsRef.current !== value) {
            lastCreditsRef.current = value
            try {
              window.dispatchEvent(new Event('creditsChanged'))
            } catch {
              /* ignore */
            }
          }
        }
      } catch {
        /* rede instável — a próxima tentativa cobre */
      } finally {
        if (isLast && !cancelled) setSyncing(false)
      }
    }

    POLL_DELAYS_MS.forEach((delay, i) => {
      timersRef.current.push(
        setTimeout(() => void poll(i === POLL_DELAYS_MS.length - 1), delay),
      )
    })
    timersRef.current.push(setTimeout(() => !cancelled && setVisible(false), AUTO_DISMISS_MS))

    const timers = timersRef.current
    return () => {
      cancelled = true
      timers.forEach(clearTimeout)
      timers.length = 0
    }
  }, [])

  if (!visible) return null

  const planLabel =
    plan && plan !== 'free' ? plan.replace(/_/g, ' ') : null

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: 'fixed',
        left: '50%',
        transform: 'translateX(-50%)',
        bottom: 'calc(18px + env(safe-area-inset-bottom, 0px))',
        zIndex: 9000,
        maxWidth: 'min(420px, calc(100vw - 24px))',
        width: 'max-content',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '13px 16px',
        borderRadius: 16,
        background: 'rgba(11,17,32,.96)',
        border: '1px solid rgba(52,211,153,.45)',
        boxShadow: '0 14px 44px rgba(0,0,0,.55)',
        color: '#f5f5f7',
        fontFamily: 'var(--font-inter), Inter, system-ui, sans-serif',
      }}
    >
      <span
        aria-hidden="true"
        style={{
          flexShrink: 0,
          width: 30,
          height: 30,
          borderRadius: '50%',
          background: 'rgba(52,211,153,.16)',
          border: '1px solid rgba(52,211,153,.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#34d399',
          fontWeight: 900,
        }}
      >
        ✓
      </span>
      <span style={{ minWidth: 0 }}>
        <span style={{ display: 'block', fontSize: '.9rem', fontWeight: 900, letterSpacing: '-.01em' }}>
          Payment confirmed{planLabel ? ` · ${planLabel}` : ''}
        </span>
        <span style={{ display: 'block', marginTop: 2, fontSize: '.78rem', color: 'var(--muted2, #a1a1aa)' }}>
          {credits !== null
            ? `${credits.toLocaleString('en-US')} credits available${syncing ? ' · syncing' : ''}`
            : syncing
              ? 'Loading your balance…'
              : 'Your balance will refresh in a moment.'}
        </span>
      </span>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss"
        style={{
          flexShrink: 0,
          marginLeft: 4,
          background: 'transparent',
          border: 'none',
          color: 'var(--muted, #86868b)',
          fontSize: '1.05rem',
          lineHeight: 1,
          cursor: 'pointer',
          padding: 4,
        }}
      >
        ×
      </button>
    </div>
  )
}
