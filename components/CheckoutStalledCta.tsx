'use client'

// KINEO-CHECKOUT-REDIRECT-2026-08-08 — o botão que a venda de 07/08 não teve.
//
// Contexto curto (o longo está em lib/checkoutTelemetry.ts e em
// docs/CHECKOUT-REDIRECT-2026-08-08.md): um comprador em trial, na África do
// Sul, clicou em Creator; o servidor criou a sessão Stripe em 1,5 s
// (cs_live_b16buI2…) e devolveu o 307; o navegador recebeu o 307 (o cookie de
// resume foi gravado) mas o salto final para checkout.stripe.com nunca
// terminou. Aos 15 s o watchdog gravava um evento e escrevia "tente de novo" —
// e era só isso. A sessão existia, paga e pronta, e a tela não tinha UM link
// para ela.
//
// Três regras de desenho, nesta ordem:
//
//   1. É UMA ÂNCORA DE VERDADE. `<a href>` com a URL da Stripe, sem onClick que
//      chame preventDefault, sem window.location, sem stripe-js, sem promessa
//      que possa não resolver. Se o JS desta página estiver quebrado, o link
//      continua funcionando; se um adblock matar nosso bundle, o link continua
//      funcionando. O clique também é um gesto direto do usuário, o que é
//      exatamente o que Safari/iOS exige para permitir a navegação (o gesto do
//      clique original já tinha "expirado" depois de segundos de espera).
//
//   2. NUNCA APARECE EM CIMA DE UM CHECKOUT QUE FUNCIONOU. Só é publicado pelo
//      watchdog de 15 s, e `pageshow` (volta do bfcache, volta do Stripe)
//      limpa o store. Se a navegação tivesse acontecido, `pagehide` já teria
//      cancelado o watchdog antes.
//
//   3. NUNCA OFERECE LINK EXPIRADO. A URL preferida vem de
//      /api/stripe/checkout/resume, que RECARREGA a sessão da Stripe no
//      instante da sonda e só entrega `directUrl` quando `session.status ===
//      'open'`. Se a sessão já morreu, o fallback é a própria URL do clique,
//      que cria/reusa uma sessão válida no servidor.

import { useEffect, useRef } from 'react'
import { trackEvent } from '@/lib/analytics'
import { clearStalledCheckout, useStalledCheckout } from '@/lib/checkoutTelemetry'

export default function CheckoutStalledCta() {
  const stalled = useStalledCheckout()
  const shownKeyRef = useRef<string | null>(null)

  useEffect(() => {
    if (!stalled) {
      shownKeyRef.current = null
      return
    }
    const key = `${stalled.surface}:${stalled.selection}:${stalled.url}`
    if (shownKeyRef.current === key) return
    shownKeyRef.current = key
    try {
      void trackEvent('checkout_fallback_shown', {
        surface: stalled.surface,
        selection: stalled.selection,
        fallback_kind: stalled.direct ? 'stripe_direct' : 'server_retry',
      })
    } catch {
      // A recuperação nunca pode quebrar por causa de telemetria.
    }
  }, [stalled])

  if (!stalled) return null

  const detail = stalled.planLabel && stalled.priceLabel
    ? `${stalled.planLabel} · first charge ${stalled.priceLabel}. You have not been charged yet.`
    : 'Your payment page is ready. You have not been charged yet.'

  return (
    <aside
      aria-label="Continue to payment"
      aria-live="assertive"
      style={{
        position: 'fixed',
        // Acima do CheckoutResumeBanner (10050), que se esconde sozinho
        // enquanto isto está no ar — dois cards no mesmo canto seriam dois
        // pedidos concorrentes na hora mais sensível da jornada.
        zIndex: 10060,
        left: '50%',
        bottom: 16,
        transform: 'translateX(-50%)',
        width: 'min(680px, calc(100vw - 24px))',
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        padding: '12px 14px',
        border: '1px solid rgba(41,151,255,.55)',
        borderRadius: 16,
        background: 'rgba(11,17,32,.98)',
        color: '#f8fafc',
        boxShadow: '0 18px 55px rgba(0,0,0,.55)',
        backdropFilter: 'blur(14px)',
        fontFamily: 'var(--font-inter), Inter, system-ui, sans-serif',
      }}
    >
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontSize: '0.88rem', lineHeight: 1.25, fontWeight: 850 }}>
          Your checkout is ready — your browser did not open it
        </div>
        <div style={{ marginTop: 3, color: '#aeb9cc', fontSize: '0.76rem', lineHeight: 1.35 }}>
          {detail}
        </div>
      </div>
      {/* Âncora pura de propósito: sem preventDefault, sem navegação por JS.
          O trackEvent abaixo é fire-and-forget e NÃO é aguardado — awaitar
          telemetria antes de navegar é uma das formas de perder a venda que
          este componente existe para consertar. */}
      <a
        href={stalled.url}
        onClick={() => {
          try {
            void trackEvent('checkout_fallback_clicked', {
              surface: stalled.surface,
              selection: stalled.selection,
              fallback_kind: stalled.direct ? 'stripe_direct' : 'server_retry',
            })
          } catch {
            /* never block the navigation */
          }
        }}
        style={{
          flex: '0 0 auto',
          borderRadius: 10,
          padding: '11px 14px',
          background: 'linear-gradient(135deg, #2997ff, #1d6fe0)',
          color: '#fff',
          fontSize: '0.8rem',
          fontWeight: 850,
          textDecoration: 'none',
          whiteSpace: 'nowrap',
        }}
      >
        Continue to payment →
      </a>
      <button
        type="button"
        aria-label="Dismiss"
        onClick={() => clearStalledCheckout()}
        style={{
          flex: '0 0 auto',
          width: 28,
          height: 28,
          padding: 0,
          border: 0,
          borderRadius: 8,
          background: 'transparent',
          color: '#8d99ac',
          cursor: 'pointer',
          fontSize: 20,
          lineHeight: 1,
        }}
      >
        ×
      </button>
    </aside>
  )
}
