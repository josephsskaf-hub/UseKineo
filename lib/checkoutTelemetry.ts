'use client'

// KINEO-CHECKOUT-TRIAGE-2026-07-25 — one shared launcher for every button that
// can send a buyer to Stripe.
//
// Motivo: a produção mostrou 7 sessões Stripe criadas em 2,8 s pelo MESMO
// usuário (events: 7× starter_pack_checkout_clicked entre 04:07:41 e 04:07:44)
// porque o botão não tinha estado de "pending", não tinha trava de clique e
// nunca mostrava erro. O usuário clicava de novo porque nada acontecia.
//
// Every checkout surface must use `useCheckoutLaunch()` so that:
//   1. one click = at most one navigation (ref latch, survives a remount);
//   2. the button always shows an immediate pending state;
//   3. a redirect that never happens surfaces an inline English error instead
//      of silence;
//   4. every checkout event carries the same session_id the server-side
//      `checkout_attempted` uses (trackEvent → kineo_event_session_id).
//
// NOTE: the event is `checkout_cta_clicked`, NOT `checkout_click` — the latter
// is already taken by lib/trackClick.ts, which writes to public.click_events.
//
// ─────────────────────────────────────────────────────────────────────────────
// KINEO-CHECKOUT-REDIRECT-2026-08-08 — POR QUE O WATCHDOG DEIXOU DE SER SÓ
// TELEMETRIA.
//
// Em 07/08 perdemos a venda mais cara da semana num redirect. O rastro do
// banco é inequívoco (user e934461f…, África do Sul, trial ativo, 11/40
// créditos já gastos — alguém que USOU o produto e decidiu pagar):
//
//   19:27:10.456  checkout_cta_clicked      (basic, generate_step_1)
//   19:27:10.614  checkout_attempted        (servidor recebeu em 158 ms)
//   19:27:12.017  checkout_started          cs_live_b16buI2… ← SESSÃO CRIADA
//   19:27:25.983  checkout_redirect_timeout waited_ms 15000
//
// O servidor fez tudo certo em 1,5 s e devolveu o 307 para checkout.stripe.com.
// O navegador RECEBEU esse 307 — sabemos porque o Set-Cookie que vem junto
// (kineo_checkout_session) foi gravado: 30 s depois o resume banner resolveu
// `destination_kind: open_session` a partir dele. O que nunca terminou foi o
// ÚLTIMO salto, navegador → checkout.stripe.com. `pagehide` nunca disparou, o
// documento nunca saiu de /generate, e o cliente ficou 15 s olhando um botão
// escrito "Loading…".
//
// E aí vem o erro de desenho que custou o dinheiro: aos 15 s o watchdog
// registrava um evento e escrevia "tente de novo". Um timeout que só vira
// telemetria é uma venda perdida em silêncio — a sessão do Stripe JÁ EXISTIA,
// paga e pronta, e a tela não tinha um único link para ela. O cliente foi
// embora e não voltou.
//
// O que muda aqui:
//   • aos 6 s (RESUME_PROBE_MS) perguntamos ao /api/stripe/checkout/resume qual
//     é a URL VIVA da sessão que acabou de ser criada. Esse endpoint é
//     read-only, valida a posse (session.metadata.supabase_user_id === user) e
//     NÃO cunha sessão nova — então sondar é de graça e nunca duplica cobrança;
//   • aos 15 s, além do evento, publicamos um fallback num store de módulo que
//     o <CheckoutStalledCta/> (montado UMA vez no layout) renderiza como uma
//     ÂNCORA DE VERDADE — <a href="https://checkout.stripe.com/…">. Sem JS de
//     navegação, sem promessa que pode não resolver, sem script de terceiro,
//     um salto só, e o clique é um gesto direto do usuário (o que também
//     resolve o bloqueio de navegação de Safari/iOS quando o gesto original já
//     "expirou" depois de um await).
//
// O store é de módulo, e não um prop, DE PROPÓSITO: existem 15 superfícies de
// checkout neste repo. Passar o fallback componente a componente garantiria que
// alguma ficasse de fora — e a que ficasse de fora seria exatamente a que
// perderia a próxima venda.

import { useCallback, useEffect, useRef, useState } from 'react'
import { trackEvent } from '@/lib/analytics'

// A full-page navigation to /api/stripe/checkout keeps this page alive while
// the server talks to Stripe (typically < 3 s). 15 s means something is wrong.
const REDIRECT_WATCHDOG_MS = 15_000

// Deliberately BEFORE the watchdog: quando os 15 s chegam, a URL de resgate já
// tem que estar na mão, senão o cliente ainda espera um fetch para ver o botão.
// 6 s é folgado para o servidor (que resolveu em 1,5 s no incidente) e curto o
// bastante para caber dentro da janela de paciência.
const RESUME_PROBE_MS = 6_000

export type CheckoutFailureStage = 'click' | 'redirect' | 'session' | 'resume'

export const CHECKOUT_RETRY_MESSAGE =
  'We could not open the secure checkout. Check your connection and try again — you have not been charged.'

// KINEO-CHECKOUT-REDIRECT-2026-08-08 — quando EXISTE link de resgate a mensagem
// não pode ser "tente de novo": a sessão já está criada e o próximo passo é
// clicar no botão, não repetir o fluxo.
export const CHECKOUT_STALLED_MESSAGE =
  'Your secure checkout is ready, but your browser did not open it. Use the "Continue to payment" button — you have not been charged.'

// ─── Stalled-checkout store ─────────────────────────────────────────────────
// Um único fallback por vez, por construção: um comprador só pode estar preso
// em um checkout. O último a travar vence.

export type StalledCheckout = {
  /** Real, navigable URL. Stripe-hosted when we could resolve the live session. */
  url: string
  /** True when `url` points straight at checkout.stripe.com (one hop, no server). */
  direct: boolean
  surface: string
  selection: string
  planLabel: string | null
  priceLabel: string | null
  metadata: Record<string, unknown>
}

let stalledCheckout: StalledCheckout | null = null
const stalledListeners = new Set<() => void>()

function publishStalledCheckout(next: StalledCheckout | null): void {
  if (stalledCheckout === next) return
  stalledCheckout = next
  for (const listener of stalledListeners) {
    try {
      listener()
    } catch {
      // A broken subscriber must never take the recovery CTA down with it.
    }
  }
}

export function getStalledCheckout(): StalledCheckout | null {
  return stalledCheckout
}

export function subscribeStalledCheckout(listener: () => void): () => void {
  stalledListeners.add(listener)
  return () => {
    stalledListeners.delete(listener)
  }
}

export function clearStalledCheckout(): void {
  publishStalledCheckout(null)
}

// Same house style as `generation_stage_error`: fire-and-forget, always inside
// try/catch, and the payload never carries an email, prompt, key or card data —
// only an error *name* and a short reason code.
export function trackCheckoutFailure(
  stage: CheckoutFailureStage,
  reason: string,
  metadata: Record<string, unknown> = {},
): void {
  try {
    void trackEvent('checkout_failure', {
      stage,
      reason: String(reason || 'unknown').slice(0, 120),
      ...metadata,
    })
  } catch {
    // Telemetry must never break a purchase.
  }
}

type ResumeProbe = {
  available?: boolean
  reason?: string
  directUrl?: string | null
  resumeUrl?: string
  planName?: string
  currency?: string
  firstChargeAmount?: number
}

function formatProbeMoney(amount: number, currency: string): string | null {
  if (!Number.isFinite(amount) || amount < 0 || !/^[a-z]{3}$/i.test(currency)) return null
  try {
    return new Intl.NumberFormat(currency.toLowerCase() === 'brl' ? 'pt-BR' : 'en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount / 100)
  } catch {
    return `${currency.toUpperCase()} ${(amount / 100).toFixed(2)}`
  }
}

export type CheckoutLaunch = {
  /** Selection key currently navigating to Stripe (tier or SKU), else null. */
  pending: string | null
  /** Inline, user-facing English error. Render it next to the buttons. */
  error: string | null
  setError: (message: string | null) => void
  /** Returns true when this call actually started the navigation. */
  launch: (key: string, url: string, metadata?: Record<string, unknown>) => boolean
  release: () => void
}

export function useCheckoutLaunch(surface: string): CheckoutLaunch {
  const [pending, setPending] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  // Ref, not state: React has not painted the disabled button yet when a second
  // click arrives, and a remount would reset state but callers keep the hook.
  const lockedRef = useRef(false)
  const watchdogRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const probeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const probeAbortRef = useRef<AbortController | null>(null)
  // Resultado da sondagem, guardado em ref porque o watchdog é um setTimeout:
  // ele lê o valor no instante em que dispara, não no instante em que foi
  // agendado.
  const rescueRef = useRef<{ url: string; direct: boolean; planLabel: string | null; priceLabel: string | null } | null>(null)
  // 'blocked' = o resume disse que este comprador NÃO deve receber link nenhum
  // (já assinante). Oferecer um botão de pagar a quem já pagou é pior que não
  // oferecer nada.
  const rescueBlockedRef = useRef(false)

  const clearWatchdog = useCallback(() => {
    if (watchdogRef.current) {
      clearTimeout(watchdogRef.current)
      watchdogRef.current = null
    }
    if (probeTimerRef.current) {
      clearTimeout(probeTimerRef.current)
      probeTimerRef.current = null
    }
    if (probeAbortRef.current) {
      probeAbortRef.current.abort()
      probeAbortRef.current = null
    }
  }, [])

  const release = useCallback(() => {
    lockedRef.current = false
    setPending(null)
    clearWatchdog()
  }, [clearWatchdog])

  useEffect(() => {
    // Back/forward cache: leaving Stripe restores this page WITH its refs, so
    // without this every plan button would stay disabled forever.
    // KINEO-CHECKOUT-REDIRECT-2026-08-08 — voltar do Stripe também tem que
    // apagar o CTA de resgate: um botão "continue para o pagamento" em cima de
    // um checkout que JÁ funcionou (ou que o comprador cancelou de propósito) é
    // ruído que destrói a confiança na tela inteira.
    const onPageShow = () => {
      clearStalledCheckout()
      release()
    }
    // The navigation actually happened — stop the "nothing happened" watchdog.
    const onPageHide = () => clearWatchdog()
    window.addEventListener('pageshow', onPageShow)
    window.addEventListener('pagehide', onPageHide)
    return () => {
      window.removeEventListener('pageshow', onPageShow)
      window.removeEventListener('pagehide', onPageHide)
      clearWatchdog()
    }
  }, [release, clearWatchdog])

  const launch = useCallback(
    (key: string, url: string, metadata: Record<string, unknown> = {}): boolean => {
      if (lockedRef.current) {
        // Recording the suppressed click is how we prove the guard is working
        // instead of guessing from Stripe session counts.
        try {
          void trackEvent('checkout_cta_suppressed', { surface, selection: key, ...metadata })
        } catch {
          /* never block */
        }
        return false
      }
      lockedRef.current = true
      setPending(key)
      setError(null)
      // Um novo clique invalida qualquer resgate anterior: a URL antiga pode
      // apontar para outro tier.
      rescueRef.current = null
      rescueBlockedRef.current = false
      clearStalledCheckout()
      try {
        void trackEvent('checkout_cta_clicked', { surface, selection: key, ...metadata })
      } catch {
        /* never block */
      }

      clearWatchdog()

      // ── Sonda de resgate (read-only, não cunha sessão) ──────────────────────
      probeTimerRef.current = setTimeout(() => {
        probeTimerRef.current = null
        const controller = new AbortController()
        probeAbortRef.current = controller
        void fetch('/api/stripe/checkout/resume', {
          method: 'GET',
          credentials: 'same-origin',
          cache: 'no-store',
          signal: controller.signal,
        })
          .then(async (response) => (response.ok ? (await response.json()) as ResumeProbe : null))
          .then((result) => {
            if (!result) return
            if (result.available !== true) {
              // Só 'already_subscribed' é motivo para NÃO oferecer link nenhum.
              // 'none' / 'stale' / 'dismissed' apenas significam que não há
              // sessão recuperável — o fallback vira a própria URL do clique,
              // que é idempotente por 5 min no servidor.
              if (result.reason === 'already_subscribed') rescueBlockedRef.current = true
              return
            }
            const rescueUrl = typeof result.directUrl === 'string' && result.directUrl
              ? result.directUrl
              : typeof result.resumeUrl === 'string' && result.resumeUrl
                ? result.resumeUrl
                : null
            if (!rescueUrl) return
            rescueRef.current = {
              url: rescueUrl,
              direct: rescueUrl === result.directUrl,
              planLabel: typeof result.planName === 'string' ? result.planName : null,
              priceLabel:
                typeof result.firstChargeAmount === 'number' && typeof result.currency === 'string'
                  ? formatProbeMoney(result.firstChargeAmount, result.currency)
                  : null,
            }
          })
          .catch(() => {
            // A sonda é opcional: sem ela o fallback ainda é a URL do clique.
          })
      }, RESUME_PROBE_MS)

      watchdogRef.current = setTimeout(() => {
        watchdogRef.current = null
        lockedRef.current = false
        setPending(null)

        // KINEO-CHECKOUT-REDIRECT-2026-08-08 — AQUI ESTAVA A VENDA PERDIDA.
        // Antes: só `setError(...)` + um evento. Agora a tela ganha um link
        // real. `rescueRef` tem a URL viva da sessão quando a sonda respondeu;
        // senão caímos na própria URL do clique, que o servidor colapsa na
        // MESMA sessão Stripe por 5 minutos (checkoutIdempotencyKeyFor /
        // oneTimeIdempotencyKey), então o botão não pode cobrar duas vezes.
        const rescue = rescueRef.current
        const fallbackUrl = rescue?.url ?? (rescueBlockedRef.current ? null : url)
        if (fallbackUrl) {
          publishStalledCheckout({
            url: fallbackUrl,
            direct: rescue?.direct ?? false,
            surface,
            selection: key,
            planLabel: rescue?.planLabel ?? null,
            priceLabel: rescue?.priceLabel ?? null,
            metadata,
          })
          setError(CHECKOUT_STALLED_MESSAGE)
        } else {
          setError(CHECKOUT_RETRY_MESSAGE)
        }

        try {
          void trackEvent('checkout_redirect_timeout', {
            surface,
            selection: key,
            waited_ms: REDIRECT_WATCHDOG_MS,
            // Sem isto não dá para responder a única pergunta que importa
            // depois de shipar: o botão de resgate apareceu, e era o link
            // direto do Stripe ou o retry idempotente?
            fallback_offered: Boolean(fallbackUrl),
            fallback_kind: rescue ? (rescue.direct ? 'stripe_direct' : 'resume_endpoint') : fallbackUrl ? 'idempotent_retry' : 'none',
            ...metadata,
          })
        } catch {
          /* never block */
        }
      }, REDIRECT_WATCHDOG_MS)

      try {
        window.location.href = url
        return true
      } catch (err) {
        release()
        setError(CHECKOUT_RETRY_MESSAGE)
        trackCheckoutFailure(
          'redirect',
          err instanceof Error ? err.name : 'navigation_threw',
          { surface, selection: key, ...metadata },
        )
        return false
      }
    },
    [surface, clearWatchdog, release],
  )

  return { pending, error, setError, launch, release }
}

/**
 * KINEO-CHECKOUT-REDIRECT-2026-08-08 — subscription helper for the single
 * <CheckoutStalledCta/> mounted in the root layout.
 */
export function useStalledCheckout(): StalledCheckout | null {
  const [snapshot, setSnapshot] = useState<StalledCheckout | null>(null)

  useEffect(() => {
    setSnapshot(getStalledCheckout())
    return subscribeStalledCheckout(() => setSnapshot(getStalledCheckout()))
  }, [])

  return snapshot
}
