'use client'

// ═══ KINEO-WELCOME20-2026-08-25 — O MODAL DE BOAS-VINDAS COM NOME ═══════════
// Ordem do fundador (25/08): "quero um modal pra todo mundo que entrar no
// site, com o nome da pessoa, 20% off no primeiro mês, fechando Creator ou
// Studio — o melhor modal que exista, com as nossas cores e fontes perfeitas."
//
// Desenho, e por quê:
//   · NOME REAL no headline: vem do auth do próprio browser (user_metadata do
//     Google OAuth) — zero rota nova, zero PII viajando. Anônimo ganha a
//     versão sem nome, igualmente válida (o cupom é público).
//   · PREÇOS DERIVADOS de TIER_PRICES × 20% — o modal repete o que o caixa
//     cobra (WELCOME20 auto-provisionado no checkout, padrão CREATOR50).
//     Nunca um dígito de preço à mão: é a causa-raiz de 3 bugs passados.
//   · DOIS CARTÕES (Creator/Studio), Studio destacado — o fundador pediu
//     "fechando um dos 2", então a escolha mora DENTRO do modal: um clique
//     leva direto ao Stripe com o promo aplicado, sem escala em /pricing.
//   · VITRINE DENTRO DO MODAL: o clipe dos robôs (Omni #1, render de hoje) —
//     regra #273: a pessoa vê O QUE está comprando no quadro em que decide.
//   · FREQUÊNCIA: 1× a cada 72h por browser (localStorage com timestamp);
//     assinante pagante NUNCA vê (checa /api/me/plan). Delay de 5s — a pessoa
//     primeiro vê a vitrine, depois recebe o convite; modal no load é assalto.
//   · Sem prazo inventado: nenhum "ends tonight" falso. O gatilho é o
//     desconto, não uma mentira com relógio.
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { trackEvent } from '@/lib/analytics'
import { useCheckoutLaunch } from '@/lib/checkoutTelemetry'
import { TIER_CREDITS, TIER_PRICES, formatCheckoutMoney } from '@/lib/checkoutPricing'
import { formatResultCount, videosPerMonth } from '@/lib/marketingPrice'
import {
  WELCOME_OFFER_SEEN_KEY,
  WELCOME_OFFER_AFTER_FILM_VERSION,
  isWelcomeOfferMeasurementHost,
  parseWelcomeOfferSeenAt,
  shouldShowWelcomeOffer,
  shouldSuppressDashboardWelcomeOffer,
  welcomeOfferFrequencyMetadata,
  type WelcomeOfferSurface,
  type WelcomeOfferTier,
} from '@/lib/growth/welcomeOfferFrequency'
import {
  formatPlanFilmCapacity,
  planFilmLanguageMetadata,
} from '@/lib/growth/planFilmLanguage'

let memorySeenAt: number | null = null
let memoryDashboardSuppressed = false

function readSeenAt(now: number): number | null {
  const candidates: Array<number | null> = [memorySeenAt]
  try {
    candidates.push(parseWelcomeOfferSeenAt(localStorage.getItem(WELCOME_OFFER_SEEN_KEY), now))
  } catch {
    // localStorage may be denied; the session and in-memory latches remain.
  }
  try {
    candidates.push(parseWelcomeOfferSeenAt(sessionStorage.getItem(WELCOME_OFFER_SEEN_KEY), now))
  } catch {
    // sessionStorage may be denied; the in-memory latch remains.
  }
  const valid = candidates.filter((value): value is number => value !== null)
  return valid.length > 0 ? Math.max(...valid) : null
}

function seenRecently(): boolean {
  const now = Date.now()
  return !shouldShowWelcomeOffer(readSeenAt(now), now)
}

function markWelcomeOfferSeen(now: number): void {
  memorySeenAt = now
  for (const storage of [
    () => localStorage,
    () => sessionStorage,
  ]) {
    try {
      storage().setItem(WELCOME_OFFER_SEEN_KEY, String(now))
    } catch {
      // Frequency may fail open after a full reload, never during this page.
    }
  }
}

function welcomeOfferMetadata(surface: WelcomeOfferSurface, tier?: WelcomeOfferTier) {
  return {
    ...welcomeOfferFrequencyMetadata(surface, tier),
    ...planFilmLanguageMetadata(),
  }
}

export default function WelcomeOfferModal({
  delayMs = 5000,
  surface,
}: {
  delayMs?: number
  surface: WelcomeOfferSurface
}) {
  const [open, setOpen] = useState(false)
  const [firstName, setFirstName] = useState<string | null>(null)
  const [nativePending, setNativePending] = useState<'basic' | 'pro' | null>(null)
  const checkout = useCheckoutLaunch(`welcome_offer_${surface}`)
  const pending = checkout.pending ?? nativePending

  useEffect(() => {
    if (seenRecently()) return
    let cancelled = false
    let visibilityHandler: (() => void) | null = null

    const removeVisibilityHandler = () => {
      if (!visibilityHandler) return
      document.removeEventListener('visibilitychange', visibilityHandler)
      visibilityHandler = null
    }

    const reveal = async () => {
      if (cancelled || seenRecently()) return
      if (document.visibilityState !== 'visible') {
        if (!visibilityHandler) {
          visibilityHandler = () => {
            if (document.visibilityState !== 'visible') return
            removeVisibilityHandler()
            void reveal()
          }
          document.addEventListener('visibilitychange', visibilityHandler)
        }
        return
      }
      // Plano e identidade são independentes. Lê ambos em paralelo para não
      // acrescentar uma espera de rede antes de revelar a oferta.
      const planPromise = fetch('/api/me/plan', { cache: 'no-store' })
        .then(async (planRes) => {
          if (!planRes.ok) return null
          return (await planRes.json()) as { plan?: string; isPro?: boolean }
        })
        .catch(() => null)
      const userPromise = createClient().auth.getUser().catch(() => null)
      const historyPromise = surface === 'dashboard'
        ? fetch('/api/videos', { cache: 'no-store', credentials: 'same-origin' })
            .then(async (response) => {
              if (!response.ok) return null
              return (await response.json().catch(() => null)) as {
                completedCount?: number | null
                historyReliable?: boolean
              } | null
            })
            .catch(() => null)
        : Promise.resolve(null)
      const [planInfo, userResult, history] = await Promise.all([
        planPromise,
        userPromise,
        historyPromise,
      ])

      // Assinante pagante nunca vê oferta de 1º mês — já pagou o 1º mês.
      // Se a rede falhar, mantém o comportamento anterior e segue com a oferta.
      if (planInfo?.isPro || (planInfo?.plan && planInfo.plan !== 'free')) return

      // CAIXA R17 — K1 already makes delivery the primary action in the trial
      // banner, but this global modal still covered the dashboard seconds after
      // signup. Only exact, owner-scoped history can delay it. Pricing stays
      // untouched because a real buyer used that pre-film path and paid.
      if (shouldSuppressDashboardWelcomeOffer({
        surface,
        historyReliable: history?.historyReliable === true,
        completedCount: typeof history?.completedCount === 'number' ? history.completedCount : null,
      })) {
        if (!memoryDashboardSuppressed && isWelcomeOfferMeasurementHost(window.location.hostname)) {
          memoryDashboardSuppressed = true
          void trackEvent('welcome_offer_suppressed_before_first_film', {
            ...welcomeOfferMetadata(surface),
            gate_version: WELCOME_OFFER_AFTER_FILM_VERSION,
            completed_count_bucket: '0',
          })
        }
        return
      }

      try {
        const data = userResult?.data
        const meta = (data?.user?.user_metadata ?? {}) as { full_name?: string; name?: string }
        const raw = (meta.full_name || meta.name || '').trim()
        if (raw) {
          const first = raw.split(/\s+/)[0]
          if (!cancelled && first) setFirstName(first.charAt(0).toUpperCase() + first.slice(1))
        }
      } catch {
        // sem nome — headline genérico
      }
      // Recheck after the async plan/auth reads: another mounted surface or
      // tab may have claimed the same 72-hour exposure in the meantime.
      if (cancelled || seenRecently()) return
      markWelcomeOfferSeen(Date.now())
      setOpen(true)
      if (isWelcomeOfferMeasurementHost(window.location.hostname)) {
        void trackEvent('welcome_offer_viewed', welcomeOfferMetadata(surface))
      }
    }

    const timer = window.setTimeout(() => { void reveal() }, delayMs)
    return () => {
      cancelled = true
      window.clearTimeout(timer)
      removeVisibilityHandler()
    }
  }, [delayMs, surface])

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') dismiss()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  function dismiss() {
    setOpen(false)
    if (isWelcomeOfferMeasurementHost(window.location.hostname)) {
      void trackEvent('welcome_offer_dismissed', welcomeOfferMetadata(surface))
    }
  }

  function recordCheckoutClick(tier: WelcomeOfferTier): void {
    setNativePending(tier)
    if (isWelcomeOfferMeasurementHost(window.location.hostname)) {
      void trackEvent('welcome_offer_checkout_clicked', welcomeOfferMetadata(surface, tier))
    }
  }

  if (!open) return null

  const off = (minor: number) => Math.round(minor * 0.8)
  const plans: Array<{
    tier: 'basic' | 'pro'
    name: string
    capacity: string
    perks: string[]
    highlight: boolean
  }> = [
    {
      tier: 'basic',
      name: 'Creator',
      capacity: formatPlanFilmCapacity(
        videosPerMonth('basic', 'cinematic_ai'),
        'Seedance film',
        TIER_CREDITS.basic,
      ),
      perks: [`${formatResultCount(videosPerMonth('basic', 'cinematic_ai'), 'Seedance film')} or ${formatResultCount(videosPerMonth('basic', 'cinematic_h3'), 'MiniMax H3 film')}`, 'Every engine incl. MiniMax H3', 'Watermark-free exports you own'],
      highlight: false,
    },
    {
      tier: 'pro',
      name: 'Studio',
      capacity: formatPlanFilmCapacity(
        videosPerMonth('pro', 'cinematic_ai'),
        'Seedance film',
        TIER_CREDITS.pro,
      ),
      perks: [`${formatResultCount(videosPerMonth('pro', 'cinematic_omni'), 'film')} on Omni Flash — the #1 model — plus change`, 'Kling 3 film scenes with native voice & lip sync', '2 free HD Enhance upscales / month'],
      highlight: true,
    },
  ]

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Welcome offer — 20% off your first month"
      style={{
        position: 'fixed', inset: 0, zIndex: 95,
        background: 'rgba(6,6,10,.82)', backdropFilter: 'blur(18px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
      }}
      onClick={dismiss}
    >
      {/* Anel de gradiente: wrapper 1px — o "acabamento de vitrine" da casa. */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          padding: 1, borderRadius: 18, width: 560, maxWidth: '96vw',
          background: 'linear-gradient(135deg, rgba(41,151,255,.55), rgba(167,139,250,.35) 45%, rgba(41,151,255,.12))',
          boxShadow: '0 0 90px rgba(41,151,255,.14), 0 30px 80px rgba(0,0,0,.6)',
          // KINEO-MOBILE-2026-08-29 — em tela baixa o modal precisa rolar por
          // dentro; sem isto o card Studio ficava CORTADO e inclicável no
          // celular (visto na auditoria mobile do fundador).
          maxHeight: '92vh', overflowY: 'auto',
        }}
      >
        <div style={{ background: '#101013', borderRadius: 17, padding: '26px 28px 24px', position: 'relative' }}>
          <button
            onClick={dismiss}
            aria-label="Close"
            style={{
              position: 'absolute', top: 14, right: 14, width: 30, height: 30, borderRadius: 9,
              background: 'rgba(255,255,255,.05)', border: '1px solid #2a2a2d', color: '#86868b',
              cursor: 'pointer', fontSize: 13, lineHeight: 1,
            }}
          >
            ✕
          </button>

          <p style={{ color: '#2997ff', fontSize: 11, fontWeight: 900, letterSpacing: '.14em', textTransform: 'uppercase', margin: '0 0 10px' }}>
            ⚡ Welcome offer
          </p>

          <h2 style={{ color: '#f5f5f7', fontSize: 26, fontWeight: 900, lineHeight: 1.15, letterSpacing: '-0.02em', margin: '0 0 6px' }}>
            {firstName ? `${firstName}, your first month is ` : 'Your first month is '}
            <span className="grad-text">20% off.</span>
          </h2>
          <p style={{ color: '#a1a1a8', fontSize: 13.5, lineHeight: 1.55, margin: '0 0 14px' }}>
            Pick Creator or Studio below — the discount applies itself at checkout. Films like this one, from a text box:
          </p>

          {/* A prova: batalha de robôs, Omni Flash (#1 ranked), render real de hoje. */}
          <video
            src="/previews/36a04f7b-65f7-42d9-a2ab-198b5a7f115e.mp4"
            muted loop autoPlay playsInline preload="metadata"
            style={{ width: '100%', borderRadius: 12, border: '1px solid #2a2a2d', maxHeight: 170, objectFit: 'cover', marginBottom: 16 }}
          />

          {/* KINEO-MOBILE-2026-08-29 — flexWrap + base 230px: no celular os
              dois planos EMPILHAM em vez de estourar pra fora da tela (o
              Studio ficava cortado à direita, com o botão de comprar
              inalcançável — perda de venda literal). */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {plans.map((p) => {
              const fullMinor = TIER_PRICES[p.tier].usd
              const full = formatCheckoutMoney('usd', fullMinor)
              const now = formatCheckoutMoney('usd', off(fullMinor))
              const checkoutHref = `/api/stripe/checkout?tier=${p.tier}&billing=monthly&promo=WELCOME20&checkout_origin=welcome20_modal`
              return (
                <a
                  key={p.tier}
                  href={checkoutHref}
                  onClick={(event) => {
                    recordCheckoutClick(p.tier)
                    // CAIXA R33 — only the HOME modal lacked the last-hop
                    // recovery already used by the other checkout surfaces.
                    // Keep modified-click and no-JS anchor behavior native;
                    // enhance only the ordinary same-tab purchase gesture.
                    if (
                      surface !== 'home' ||
                      event.defaultPrevented ||
                      event.button !== 0 ||
                      event.metaKey ||
                      event.ctrlKey ||
                      event.shiftKey ||
                      event.altKey
                    ) return
                    event.preventDefault()
                    checkout.launch(p.tier, checkoutHref, {
                      ...welcomeOfferMetadata(surface, p.tier),
                      checkout_origin: 'welcome20_modal',
                      rescue_version: 'welcome_offer_home_rescue_v1',
                    })
                  }}
                  style={{
                    flex: '1 1 230px', minWidth: 0, display: 'block', textDecoration: 'none',
                    borderRadius: 14, padding: '16px 16px 14px', position: 'relative',
                    background: p.highlight ? 'rgba(41,151,255,.10)' : 'rgba(255,255,255,.03)',
                    border: p.highlight ? '1px solid rgba(41,151,255,.55)' : '1px solid rgba(255,255,255,.10)',
                    opacity: pending && pending !== p.tier ? 0.55 : 1,
                    transition: 'transform .15s ease, border-color .15s ease',
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)' }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.transform = 'translateY(0)' }}
                >
                  {p.highlight && (
                    <span style={{
                      position: 'absolute', top: -9, left: '50%', transform: 'translateX(-50%)',
                      whiteSpace: 'nowrap', fontSize: 10, fontWeight: 900, letterSpacing: '.08em',
                      textTransform: 'uppercase', color: '#0a0a0b', background: '#2997ff',
                      borderRadius: 999, padding: '2px 10px',
                    }}>
                      ⭐ Best deal
                    </span>
                  )}
                  <span style={{ display: 'block', color: '#f5f5f7', fontSize: 15, fontWeight: 900 }}>{p.name}</span>
                  <span style={{ display: 'block', color: '#86868b', fontSize: 11.5, fontWeight: 700, margin: '1px 0 8px' }}>{p.capacity}</span>
                  <span style={{ display: 'flex', alignItems: 'baseline', gap: 7, marginBottom: 9 }}>
                    <span style={{ color: p.highlight ? '#5cb3ff' : '#f5f5f7', fontSize: 24, fontWeight: 900, letterSpacing: '-0.02em' }}>
                      {pending === p.tier ? '…' : now}
                    </span>
                    <s style={{ color: '#5a5a60', fontSize: 13, fontWeight: 700 }}>{full}</s>
                    <span style={{ color: '#86868b', fontSize: 11 }}>first month</span>
                  </span>
                  <span style={{ display: 'block' }}>
                    {p.perks.map((perk) => (
                      <span key={perk} style={{ display: 'flex', gap: 6, color: '#c7c7cc', fontSize: 11.5, lineHeight: 1.55 }}>
                        <span style={{ color: '#34d399' }}>✓</span>
                        <span>{perk}</span>
                      </span>
                    ))}
                  </span>
                  <span style={{
                    display: 'block', textAlign: 'center', marginTop: 12, padding: '9px 0',
                    borderRadius: 10, fontSize: 12.5, fontWeight: 900,
                    background: p.highlight ? '#2997ff' : 'rgba(255,255,255,.07)',
                    color: p.highlight ? '#fff' : '#f5f5f7',
                    border: p.highlight ? 'none' : '1px solid rgba(255,255,255,.12)',
                  }}>
                    {pending === p.tier ? 'Opening checkout…' : `Claim 20% off ${p.name} →`}
                  </span>
                </a>
              )
            })}
          </div>

          <p style={{ color: '#5a5a60', fontSize: 10.5, textAlign: 'center', margin: '13px 0 0' }}>
            Applies to your first month · cancel anytime · renews at the regular price
          </p>
        </div>
      </div>
    </div>
  )
}
