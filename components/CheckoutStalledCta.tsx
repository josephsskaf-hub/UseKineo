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
//   2. NUNCA APARECE EM CIMA DE UM CHECKOUT QUE FUNCIONOU. O card só NASCE pelo
//      watchdog de 15 s, e `pageshow` (volta do bfcache, volta do Stripe) limpa
//      o store. Se a navegação tivesse acontecido, `pagehide` já teria
//      cancelado o watchdog antes.
//      KINEO-CHECKOUT-RESCUE-BLIND-2026-08-09: existe um SEGUNDO publicador,
//      `upgradeStalledCheckout`, que troca a URL de um card já visível. Ele não
//      viola a regra porque recusa quando não há card ('no_card') — promover
//      não é criar.
//
//   3. NUNCA OFERECE LINK EXPIRADO. A URL preferida vem de
//      /api/stripe/checkout/resume, que RECARREGA a sessão da Stripe no
//      instante da sonda e só entrega `directUrl` quando `session.status ===
//      'open'`. Se a sessão já morreu, o fallback é a própria URL do clique,
//      que cria/reusa uma sessão válida no servidor.

import { useEffect, useRef } from 'react'
import { trackEvent } from '@/lib/analytics'
import { clearStalledCheckout, useStalledCheckout, type StalledCheckoutKind } from '@/lib/checkoutTelemetry'
import {
  CHECKOUT_FALLBACK_COPY_VERSION,
  checkoutFallbackCopy,
} from '@/lib/growth/checkoutFallbackTruth'

export default function CheckoutStalledCta() {
  const stalled = useStalledCheckout()
  // ONDA4 #16 (14/08) — mesmo racional do CheckoutResumeBanner: /v/[id] e
  // superficie de aquisicao anonima, nao de resgate de checkout.
  const onPublicVideoPage =
    typeof window !== 'undefined' && window.location.pathname.startsWith('/v/')
  const shownKeyRef = useRef<string | null>(null)
  // Tipo do link NO MOMENTO DA IMPRESSÃO. Sem ele, um card impresso como
  // `server_retry` e promovido a `stripe_direct` antes do clique daria 1
  // impressão a um tipo e 1 clique ao outro — e o CTR por tipo, que é a única
  // pergunta que este trabalho existe para responder ("o link direto converte
  // melhor?"), sairia 0% de um lado e divisão por zero do outro.
  const shownKindRef = useRef<StalledCheckoutKind | null>(null)

  useEffect(() => {
    if (!stalled) {
      shownKeyRef.current = null
      shownKindRef.current = null
      return
    }
    // KINEO-CHECKOUT-RESCUE-BLIND-2026-08-09 — a chave NÃO inclui mais a URL.
    // O card agora pode ser promovido no lugar (`server_retry` → `stripe_direct`)
    // sem desmontar, e com a URL na chave essa troca emitiria um SEGUNDO
    // `checkout_fallback_shown` — o mesmo card viraria duas impressões e a razão
    // view→clique desta superfície nasceria pela metade. Quem conta a promoção é
    // `checkout_fallback_upgraded`. Um clique novo limpa o store, o efeito zera
    // esta ref, e um stall realmente novo volta a contar.
    const key = `${stalled.surface}:${stalled.selection}`
    if (shownKeyRef.current === key) return
    shownKeyRef.current = key
    shownKindRef.current = stalled.kind
    try {
      void trackEvent('checkout_fallback_shown', {
        version: CHECKOUT_FALLBACK_COPY_VERSION,
        surface: stalled.surface,
        selection: stalled.selection,
        fallback_kind: shownKindRef.current,
      })
    } catch {
      // A recuperação nunca pode quebrar por causa de telemetria.
    }
  }, [stalled])

  if (!stalled || onPublicVideoPage) return null

  const copy = checkoutFallbackCopy({
    kind: stalled.kind,
    planLabel: stalled.planLabel,
    priceLabel: stalled.priceLabel,
  })

  return (
    <aside
      className="checkout-stalled-card"
      aria-label={copy.regionAriaLabel}
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
      <div className="checkout-stalled-copy" style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontSize: '0.88rem', lineHeight: 1.25, fontWeight: 850 }}>
          {copy.title}
        </div>
        <div style={{ marginTop: 3, color: '#aeb9cc', fontSize: '0.76rem', lineHeight: 1.35 }}>
          {copy.detail}
        </div>
      </div>
      {/* Âncora pura de propósito: sem preventDefault, sem navegação por JS.
          O trackEvent abaixo é fire-and-forget e NÃO é aguardado — awaitar
          telemetria antes de navegar é uma das formas de perder a venda que
          este componente existe para consertar. */}
      <a
        className="checkout-stalled-action"
        href={stalled.url}
        aria-label={copy.actionAriaLabel}
        onClick={() => {
          try {
            void trackEvent('checkout_fallback_clicked', {
              version: CHECKOUT_FALLBACK_COPY_VERSION,
              surface: stalled.surface,
              selection: stalled.selection,
              // O tipo no CLIQUE (pode ter sido promovido depois da impressão)…
              fallback_kind: stalled.kind,
              // …e o tipo na IMPRESSÃO, que é o que fecha a razão view→clique.
              // Nome com o instante embutido: campo cujo valor depende de QUANDO
              // foi medido leva o quando no nome, senão a análise conclui o
              // oposto.
              shown_kind: shownKindRef.current,
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
        {copy.actionLabel}
      </a>
      <button
        className="checkout-stalled-dismiss"
        type="button"
        aria-label="Dismiss"
        onClick={() => {
          try {
            void trackEvent('checkout_fallback_dismissed', {
              version: CHECKOUT_FALLBACK_COPY_VERSION,
              surface: stalled.surface,
              selection: stalled.selection,
              fallback_kind: stalled.kind,
              shown_kind: shownKindRef.current,
            })
          } catch {
            /* never block dismissal */
          }
          clearStalledCheckout()
        }}
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
      <style jsx>{`
        @media (max-width: 520px) {
          .checkout-stalled-card {
            align-items: stretch !important;
            flex-wrap: wrap;
            padding-right: 46px !important;
          }
          .checkout-stalled-copy {
            flex-basis: 100% !important;
          }
          .checkout-stalled-action {
            width: 100%;
            text-align: center;
            white-space: normal !important;
          }
          .checkout-stalled-dismiss {
            position: absolute;
            top: 10px;
            right: 10px;
          }
        }
      `}</style>
    </aside>
  )
}
