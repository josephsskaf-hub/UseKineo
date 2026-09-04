'use client'

// Push #063 — Checkout success page.
// Push #123 — auto-redirect to /generate after the confirmation window.

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { trackEvent } from '@/lib/analytics'
import { getViralNowTopics, type ViralTopic } from '@/lib/viralTopics'
import { armFirstWinHandshake } from '@/lib/firstWinHandshake'
import {
  AUTOPILOT_CHECKOUT_SUCCESS_VERSION,
  isAutopilotEntitlementReady,
  readCheckoutSuccessFlow,
  readyCheckoutSuccessDestination,
  type CheckoutSuccessFlow,
} from '@/lib/growth/checkoutSuccessFlow'
import {
  SELF_SERVE_CHECKOUT_SUCCESS_VERSION,
  isSelfServeEntitlementReady,
  selfServeEntitlementState,
} from '@/lib/growth/checkoutSuccessEntitlement'

// KINEO-FIRST-WIN-2026-08-02 — the 5th buyer ever (01/08) paid straight from
// TAAFT, was auto-redirected here into an EMPTY /generate, wandered between
// generate/pricing/autopilot for 20 minutes and left without ever generating a
// video. This page was a dead end for a buyer with no prompt in hand. Fix: the
// moment someone pays, hand them their first win — 3 trending topics, one
// click, video starts by itself via the existing create_intent=fast autostart
// rail. Topics come from the deterministic in-bundle pool (no fetch, no
// failure mode — the "demo never dies" principle applied at birth).

export default function CheckoutSuccessPage() {
  const router = useRouter()
  const [countdown, setCountdown] = useState(15)
  const [topics, setTopics] = useState<ViralTopic[]>([])
  const [flow, setFlow] = useState<CheckoutSuccessFlow | null>(null)
  const [accountPlan, setAccountPlan] = useState<string | null>(null)
  const [accountHasPaid, setAccountHasPaid] = useState<boolean | null>(null)
  const [entitlementsResolved, setEntitlementsResolved] = useState<boolean | null>(null)
  const autopilotReadyEventSent = useRef(false)
  const autopilotPendingEventSent = useRef(false)
  const selfServeReadyEventSent = useRef(false)
  const selfServePendingEventSent = useRef(false)
  // KINEO-TRIAL-ABUSE-PMP-2026-08-07 - PRIMEIRO MINUTO PAGO. Esta tela dizia
  // "Your plan is being activated" e, logo abaixo, "If your credits do not
  // appear immediately, refresh in a few seconds" - duas frases que sao a
  // confissao de um limbo: a pagina NUNCA perguntava ao servidor se o webhook
  // ja tinha creditado, entao delegava ao comprador a tarefa de apertar F5 no
  // minuto mais caro da relacao com ele. Agora ela pergunta: /api/credits em
  // ~20s de poll, e a copy passa a afirmar o que foi LIDO.
  const [credits, setCredits] = useState<number | null>(null)
  const [syncing, setSyncing] = useState(true)

  useEffect(() => {
    const resolved = readCheckoutSuccessFlow(new URLSearchParams(window.location.search))
    setFlow(resolved)

    // Computed after mount so the time-seeded shuffle can never cause a
    // hydration mismatch. Autopilot buyers need channel setup, not a generic
    // self-serve topic, so that branch never creates or renders this list.
    if (resolved.kind === 'self_serve') {
      try {
        setTopics(getViralNowTopics().slice(0, 3))
      } catch {
        // silent — the plain Generate CTA below remains
      }
    }
  }, [])

  useEffect(() => {
    const sp = new URLSearchParams(window.location.search)
    const sessionId = sp.get('session_id') || ''
    const purchaseCurrency = (sp.get('currency') ?? 'usd').toUpperCase()
    const purchaseAmountTotal = Number(sp.get('amount') ?? 490)
    const purchaseValue = purchaseAmountTotal / 100
    const successFlow = readCheckoutSuccessFlow(sp)

    // KINEO-PAYMENT-EVENT-2026-07-15 — `payment_success` is now written once
    // by the verified Stripe webhook. This client event only measures whether
    // the buyer actually saw the success page, so refreshes cannot inflate
    // canonical payment counts.
    const successViewMetadata: Record<string, unknown> = {
      stripe_session_id: sessionId,
      amount_total: purchaseAmountTotal,
      currency: purchaseCurrency.toLowerCase(),
    }
    if (successFlow.kind === 'autopilot') {
      successViewMetadata.intended_tier = 'autopilot'
      successViewMetadata.journey_version = AUTOPILOT_CHECKOUT_SUCCESS_VERSION
    }
    void trackEvent('checkout_success_viewed', successViewMetadata)

    // #376 — read Stripe checkout_session_id from the URL and use it as the
    // transaction_id so Google Ads + TikTok DEDUPLICATE the purchase if the
    // user refreshes the success page (same session_id = same conversion).
    // Google Ads purchase conversion — fires once per checkout session.
    // currency and amount come from the Stripe checkout route via URL params
    // so the value is always correct (USD for international, BRL for Brazil).
    // transaction_id (Stripe session id) makes Google dedup refreshes.
    try {
      const gtag = (window as unknown as { gtag?: Function }).gtag
      if (typeof gtag === 'function') {
        gtag('event', 'conversion', {
          send_to: 'AW-18156258081/NL4bCKXEwa4cEKGGytFD',
          value: purchaseValue,
          currency: purchaseCurrency,
          transaction_id: sessionId,
        })
      }
    } catch {
      // silent — never break the page
    }

    // #375/#376 — TikTok Pixel: Purchase conversion. event_id = Stripe session id
    // so TikTok dedups refreshes (and matches server events if added later).
    try {
      const ttq = (window as Window & { ttq?: { track: Function } }).ttq
      if (ttq && typeof ttq.track === 'function') {
        ttq.track('Purchase', {
          value: purchaseValue,
          currency: purchaseCurrency,
          content_type: 'product',
          content_name: 'Kineo subscription',
        }, { event_id: sessionId })
      }
    } catch {
      // silent — never break the page
    }
  }, [])

  // Poll do saldo. Agressivo no começo (o caso comum é o webhook já ter
  // rodado antes do redirect) e ralo depois; self-serve mantém os ~20s
  // históricos, enquanto Autopilot observa até 45s porque nunca pode navegar
  // para um paywall de "not entitled" antes de `plan=autopilot`. Nunca afirma
  // um DELTA: o baseline pré-compra não existe neste cliente.
  useEffect(() => {
    if (!flow) return
    let cancelled = false
    const delays = flow.kind === 'autopilot'
      ? [0, 2_000, 5_000, 10_000, 20_000, 30_000, 45_000]
      : [0, 2_000, 5_000, 10_000, 20_000]
    const timers = delays.map((delay, i) =>
      setTimeout(async () => {
        try {
          // Timeout explicito: sem ele um poll pendurado nunca resolve o
          // `finally` e o estado de sincronizacao fica preso (defeito D11).
          const res = await fetch('/api/credits', {
            cache: 'no-store',
            signal: AbortSignal.timeout(5_000),
          })
          if (!res.ok || cancelled) return
          const data = (await res.json()) as {
            credits?: unknown
            entitlementsResolved?: unknown
            hasPaid?: unknown
            plan?: unknown
          }
          if (!cancelled && typeof data.plan === 'string') setAccountPlan(data.plan)
          if (!cancelled && typeof data.hasPaid === 'boolean') setAccountHasPaid(data.hasPaid)
          if (!cancelled && typeof data.entitlementsResolved === 'boolean') {
            setEntitlementsResolved(data.entitlementsResolved)
          }
          // KINEO-FIRST-PAID-MINUTE-2026-08-11 (defeito D6 da 2a revisao
          // adversarial) - `syncing` desliga no PRIMEIRO poll que devolve
          // numero, nao no ultimo timer. O `finally` de baixo so roda em
          // t~20s, e esta pagina se auto-redireciona em t=15s: enquanto os
          // cards do primeiro video dependiam de `!syncing`, eles NUNCA
          // apareciam para ninguem. O caso comum e o webhook ja ter rodado
          // antes do redirect, ou seja, resposta boa em t~0s.
          if (
            !cancelled &&
            typeof data.credits === 'number' &&
            (
              flow.kind === 'self_serve'
                ? isSelfServeEntitlementReady({
                    entitlementsResolved: data.entitlementsResolved,
                    hasPaid: data.hasPaid,
                    plan: data.plan,
                  })
                : isAutopilotEntitlementReady(data.plan)
            )
          ) {
            setCredits(data.credits)
            setSyncing(false)
          } else if (!cancelled && typeof data.credits === 'number') {
            // The recurring Autopilot grant and plan are written together by
            // the webhook. Keep the current balance visible, but do not send
            // the buyer into the pre-entitlement paywall while plan is stale.
            setCredits(data.credits)
          }
        } catch {
          /* rede instavel - a proxima tentativa cobre */
        } finally {
          if (i === delays.length - 1 && !cancelled) setSyncing(false)
        }
      }, delay),
    )
    return () => {
      cancelled = true
      timers.forEach(clearTimeout)
    }
  }, [flow])

  // KINEO-FIRST-PAID-MINUTE-2026-08-11 (defeito D11 da 3a revisao adversarial)
  // - TETO DE `syncing` INDEPENDENTE DO FETCH.
  //
  // A 2a rodada tinha atrelado o countdown a `syncing` para dar ao comprador os
  // 15 segundos INTEIROS com os cards na tela. O ataque seguinte mostrou o
  // preco: o poll e `async` e o `fetch` nao tinha timeout, entao uma requisicao
  // pendurada (rede movel, proxy) deixava `syncing` em `true` para sempre - sem
  // cards E sem redirect. Trocar um beco sem saida por uma tela morta e piorar.
  //
  // Agora são duas garantias separadas. Self-serve mantém countdown e teto de
  // 6s independentes da rede. Nos dois fluxos, a navegação só ocorre depois da
  // confirmação autoritativa do pagamento e do plano; se o relógio chegar a
  // zero primeiro, a página oferece nova consulta sem afirmar acesso ativo.
  useEffect(() => {
    if (flow?.kind === 'autopilot') return
    const ceiling = setTimeout(() => setSyncing(false), 6_000)
    return () => clearTimeout(ceiling)
  }, [flow?.kind])

  const isAutopilot = flow?.kind === 'autopilot'
  const isSelfServe = flow?.kind === 'self_serve'
  const autopilotReady = isAutopilot && isAutopilotEntitlementReady(accountPlan)
  const selfServeState = selfServeEntitlementState({
    entitlementsResolved,
    hasPaid: accountHasPaid,
    plan: accountPlan,
  })
  const selfServeReady = isSelfServe && selfServeState === 'ready'
  const checkoutReady = autopilotReady || selfServeReady
  useEffect(() => {
    if (!autopilotReady || autopilotReadyEventSent.current) return
    autopilotReadyEventSent.current = true
    void trackEvent('autopilot_checkout_handoff_ready', {
      version: AUTOPILOT_CHECKOUT_SUCCESS_VERSION,
      destination: 'autopilot_setup',
    })
  }, [autopilotReady])

  useEffect(() => {
    if (!selfServeReady || selfServeReadyEventSent.current) return
    selfServeReadyEventSent.current = true
    void trackEvent('checkout_success_entitlement_ready', {
      version: SELF_SERVE_CHECKOUT_SUCCESS_VERSION,
      flow: 'self_serve',
    })
  }, [selfServeReady])

  useEffect(() => {
    if (!flow) return
    if (countdown <= 0) {
      const destination = checkoutReady
        ? readyCheckoutSuccessDestination(flow, accountPlan)
        : null
      if (destination) {
        router.push(destination)
      } else if (isAutopilot && !autopilotPendingEventSent.current) {
        autopilotPendingEventSent.current = true
        void trackEvent('autopilot_checkout_handoff_pending', {
          version: AUTOPILOT_CHECKOUT_SUCCESS_VERSION,
          reason: 'entitlement_not_ready',
        })
      } else if (isSelfServe && !selfServePendingEventSent.current) {
        selfServePendingEventSent.current = true
        void trackEvent('checkout_success_entitlement_delayed', {
          version: SELF_SERVE_CHECKOUT_SUCCESS_VERSION,
          flow: 'self_serve',
          reason: selfServeState,
        })
      }
      return
    }
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000)
    return () => clearTimeout(timer)
  }, [accountPlan, checkoutReady, countdown, flow, isAutopilot, isSelfServe, router, selfServeState])

  return (
    <main
      style={{
        minHeight: '100vh',
        background: 'var(--bg)',
        color: 'var(--text)',
        fontFamily: 'var(--font-inter), Inter, system-ui, sans-serif',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px 20px',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 520,
          background: 'rgba(11,17,32,0.85)',
          border: '1px solid var(--border)',
          borderRadius: 22,
          padding: 'clamp(24px, 5vw, 36px)',
          boxShadow: '0 16px 60px rgba(0,0,0,.5), 0 0 0 1px rgba(20,184,166,0.08) inset',
          textAlign: 'center',
        }}
      >
        <div
          aria-hidden="true"
          style={{
            width: 64,
            height: 64,
            borderRadius: '50%',
            margin: '0 auto 14px',
            background: 'linear-gradient(135deg, rgba(41,151,255,.25), rgba(41,151,255,.10))',
            border: '1px solid rgba(41,151,255,.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '2rem',
            color: '#2997ff',
            fontWeight: 900,
          }}
        >
          ✓
        </div>
        <h1
          style={{
            fontSize: 'clamp(1.6rem, 5vw, 2rem)',
            fontWeight: 900,
            letterSpacing: '-0.02em',
            margin: 0,
          }}
        >
          {flow === null
            ? 'Confirming checkout…'
            : isAutopilot
              ? 'Set up your Autopilot.'
              : 'Welcome to Kineo.'}
        </h1>
        <p
          style={{
            marginTop: 10,
            fontSize: '1rem',
            color: 'var(--muted2)',
            lineHeight: 1.55,
          }}
        >
          {flow === null
            ? 'Preparing the right next step.'
            : isAutopilot
            ? autopilotReady
              ? 'Your Autopilot plan is active.'
              : 'Your checkout is complete. We are confirming secure access.'
            : selfServeReady
              ? 'Your plan is active.'
              : 'Your checkout is complete. We are confirming secure access.'}
        </p>
        <p
          style={{
            marginTop: 8,
            fontSize: '0.85rem',
            color: credits === null ? 'var(--muted)' : '#34d399',
            fontWeight: credits === null ? 400 : 700,
            lineHeight: 1.55,
          }}
        >
          {flow === null
            ? 'One moment…'
            : isAutopilot && !autopilotReady
            ? syncing
              ? 'Finishing your Autopilot entitlement…'
              : 'Access is taking longer than usual. Refresh after Stripe confirms the payment.'
            : selfServeReady && credits !== null
            ? `${credits.toLocaleString('en-US')} credits available${syncing ? ' · syncing' : ''}`
            : syncing
              ? 'Finishing your plan activation…'
              : 'Access is taking longer than usual. You do not need to pay again.'}
        </p>
        <p
          style={{
            marginTop: 14,
            fontSize: '0.9rem',
            color: '#2997ff',
            fontWeight: 700,
            letterSpacing: '-0.01em',
          }}
        >
          {flow === null
            ? 'Reading your checkout…'
            : isAutopilot
            ? autopilotReady
              ? `Opening Autopilot setup in ${countdown}…`
              : countdown > 0
                ? `Confirming secure access · ${countdown}s`
                : 'Waiting for the secure activation to finish…'
            : selfServeReady
              ? `Redirecting to the app in ${countdown}…`
              : countdown > 0
                ? `Confirming secure access · ${countdown}s`
                : 'Waiting for the secure activation to finish…'}
        </p>

        {isAutopilot && (
          <div
            style={{
              marginTop: 20,
              padding: '15px 16px',
              borderRadius: 14,
              textAlign: 'left',
              background: 'rgba(41,151,255,.08)',
              border: '1px solid rgba(41,151,255,.3)',
            }}
          >
            <p style={{ margin: 0, color: 'var(--text)', fontSize: '0.9rem', fontWeight: 850 }}>
              Next: connect the YouTube channel you want Kineo to operate.
            </p>
            <p style={{ margin: '6px 0 0', color: 'var(--muted2)', fontSize: '0.8rem', lineHeight: 1.55 }}>
              Then choose the channel niche, posting time and visibility before turning daily publishing on.
            </p>
          </div>
        )}

        {/* KINEO-FIRST-PAID-MINUTE-2026-08-11 - os cards so aparecem depois que
            /api/credits confirmou pagamento e plano. Antes disso o /studio ainda
            enxerga a conta como gratuita por alguns instantes, e o primeiro
            video do COMPRADOR sairia pelo caminho de conta free. Se a confirmação
            atrasar, a página não redireciona e oferece uma consulta manual. */}
        {selfServeReady && topics.length > 0 && credits !== null && !syncing && (
          <div style={{ marginTop: 22, textAlign: 'left' }}>
            <p
              style={{
                margin: 0,
                fontSize: '0.8rem',
                fontWeight: 800,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: 'var(--muted)',
              }}
            >
              Your first video, one click — trending right now
            </p>
            <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {topics.map((t) => (
                <Link
                  key={t.id}
                  // KINEO-SEM-PORTEIRO-2026-09-02 — direto ao destino. Esta é a
                  // tela de QUEM ACABOU DE PAGAR: fazer ele esperar duas
                  // viagens de servidor no primeiro clique pós-compra é o pior
                  // lugar possível para uma tela lenta.
                  href={`/studio/create?create_intent=fast&prompt=${encodeURIComponent(t.prompt)}&utm_source=checkout_success&utm_medium=first_win`}
                  // KINEO-FIRST-PAID-MINUTE-2026-08-11 (defeito D10, corrigido
                  // pelo D12 da 3a revisao) - cobre o clique do BOTAO DO MEIO,
                  // que abre em nova aba sem disparar `onClick`. O teste de
                  // `button === 1` nao e detalhe: por spec, `auxclick` dispara
                  // para qualquer botao nao-primario, inclusive o DIREITO. Sem
                  // ele, abrir o menu de contexto e fecha-lo deixaria a
                  // autorizacao armada por 10 minutos numa aba que nunca foi
                  // para /generate - e uma autorizacao viva sem viagem e
                  // exatamente o vetor que este handshake existe para fechar.
                  //
                  // "Abrir link em nova aba" pelo menu de contexto continua sem
                  // disparar evento algum: ali o autostart nao arma, o
                  // comprador cai no Generate manual e o rail registra
                  // `first_win_handshake_missing`. Falha segura e VISIVEL.
                  onAuxClick={(e) => {
                    if (e.button === 1) armFirstWinHandshake()
                  }}
                  onClick={() => {
                    // O handshake que autoriza o autostart numa conta paga.
                    // Mora no sessionStorage (same-origin, por aba) e NAO na
                    // URL: as UTMs do href sao copiaveis e, sozinhas,
                    // deixariam um link colado por terceiro disparar geracao no
                    // saldo de um pagante logado. Ver lib/firstWinHandshake.ts.
                    armFirstWinHandshake()
                    void trackEvent('checkout_success_topic_clicked', {
                      topic_id: t.id,
                      vertical: t.vertical,
                      badge: t.badge,
                    })
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    textDecoration: 'none',
                    padding: '12px 14px',
                    borderRadius: 14,
                    background: 'rgba(41,151,255,.08)',
                    border: '1px solid rgba(41,151,255,.35)',
                    color: 'var(--text)',
                  }}
                >
                  <span aria-hidden="true" style={{ fontSize: '1.15rem' }}>{t.emoji}</span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: 'block', fontSize: '0.9rem', fontWeight: 800, letterSpacing: '-0.01em', lineHeight: 1.3 }}>
                      {t.title}
                    </span>
                    <span style={{ display: 'block', marginTop: 2, fontSize: '0.75rem', color: 'var(--muted2)' }}>
                      {t.badge} · Fast video, starts automatically
                    </span>
                  </span>
                  <span aria-hidden="true" style={{ color: '#2997ff', fontWeight: 900 }}>→</span>
                </Link>
              ))}
            </div>
          </div>
        )}

        <div
          style={{
            marginTop: 24,
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}
        >
          {isAutopilot ? (
            autopilotReady && flow ? (
              <Link
                href={flow.destination}
                onClick={() => {
                  void trackEvent('autopilot_checkout_handoff_clicked', {
                    version: AUTOPILOT_CHECKOUT_SUCCESS_VERSION,
                    destination: 'autopilot_setup',
                  })
                }}
                style={{
                  display: 'block',
                  textAlign: 'center',
                  textDecoration: 'none',
                  padding: '14px 22px',
                  borderRadius: 14,
                  fontSize: '0.95rem',
                  fontWeight: 900,
                  color: '#fff',
                  background: 'linear-gradient(135deg, #2997ff 0%, #2997ff 55%, #2997ff 100%)',
                  boxShadow: '0 10px 32px rgba(41,151,255,.45)',
                  letterSpacing: '-0.01em',
                }}
              >
                Open Autopilot setup
              </Link>
            ) : (
              <button
                type="button"
                disabled={countdown > 0}
                onClick={() => window.location.reload()}
                style={{
                  display: 'block',
                  width: '100%',
                  textAlign: 'center',
                  padding: '14px 22px',
                  borderRadius: 14,
                  fontSize: '0.95rem',
                  fontWeight: 900,
                  color: '#fff',
                  background: countdown > 0 ? 'rgba(41,151,255,.25)' : 'rgba(41,151,255,.45)',
                  border: '1px solid rgba(41,151,255,.45)',
                  cursor: countdown > 0 ? 'wait' : 'pointer',
                  letterSpacing: '-0.01em',
                }}
              >
                {countdown > 0 ? 'Confirming access…' : 'Check access again'}
              </button>
            )
          ) : selfServeReady ? (
            <Link
              href="/studio"
              style={{
                display: 'block',
                textAlign: 'center',
                textDecoration: 'none',
                padding: '14px 22px',
                borderRadius: 14,
                fontSize: '0.95rem',
                fontWeight: 900,
                color: '#fff',
                background: 'linear-gradient(135deg, #2997ff 0%, #2997ff 55%, #2997ff 100%)',
                boxShadow: '0 10px 32px rgba(41,151,255,.45)',
                letterSpacing: '-0.01em',
              }}
            >
              Go to Generate Video
            </Link>
          ) : isSelfServe ? (
            <button
              type="button"
              disabled={countdown > 0}
              onClick={() => window.location.reload()}
              style={{
                display: 'block',
                width: '100%',
                textAlign: 'center',
                padding: '14px 22px',
                borderRadius: 14,
                fontSize: '0.95rem',
                fontWeight: 900,
                color: '#fff',
                background: countdown > 0 ? 'rgba(41,151,255,.25)' : 'rgba(41,151,255,.45)',
                border: '1px solid rgba(41,151,255,.45)',
                cursor: countdown > 0 ? 'wait' : 'pointer',
                letterSpacing: '-0.01em',
              }}
            >
              {countdown > 0 ? 'Confirming access…' : 'Check access again'}
            </button>
          ) : null}
          {selfServeReady && (
          <Link
            href="/my-videos"
            style={{
              display: 'block',
              textAlign: 'center',
              textDecoration: 'none',
              padding: '12px 22px',
              borderRadius: 14,
              fontSize: '0.9rem',
              fontWeight: 700,
              color: 'var(--muted2)',
              background: 'rgba(255,255,255,.03)',
              border: '1px solid var(--border)',
            }}
          >
            View My Videos
          </Link>
          )}
          {isSelfServe && !selfServeReady && countdown <= 0 && (
            <Link
              href="/account"
              style={{
                display: 'block',
                textAlign: 'center',
                textDecoration: 'none',
                padding: '12px 22px',
                borderRadius: 14,
                fontSize: '0.9rem',
                fontWeight: 700,
                color: 'var(--muted2)',
                background: 'rgba(255,255,255,.03)',
                border: '1px solid var(--border)',
              }}
            >
              Open Account status
            </Link>
          )}
        </div>
      </div>
    </main>
  )
}
