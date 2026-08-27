'use client'

// Conversion — Exit-intent rescue modal for /pricing (59 abandoned
// checkouts/30d). Replaces the old inline "Don't leave yet!" modal with a
// low-commitment Starter Pack offer ($4.90 one-time / 10 Shorts) — the same
// checkout the featured entry-offer button already uses
// (/api/stripe/checkout?pack=starter, event starter_pack_checkout_clicked).
//
// Calibrated from 2025/26 exit-intent research (Wisepops / CrazyEgg /
// Popupsmart benchmarks):
//  - Never fire instantly: triggers arm only after 5s of engagement.
//  - Once per SESSION (sessionStorage) — repeat popups tank UX.
//  - Desktop: mouseleave through the top of the viewport.
//  - Mobile (coarse pointer): 25s inactivity OR fast scroll-up after the
//    user has scrolled down (classic mouse exit-intent is unreliable there).
//  - Don't show when the visitor is already subscribed (?already_subscribed=1)
//    or already carries a ?promo= code (they already got a rescue offer).
//  - Copy: short gain-framed headline, 2–5 word CTA, honest guarantee line.
//  - a11y: role=dialog, aria-modal, Escape closes, focus moves into the
//    dialog, close targets ≥44px.
//
// UI-only component: no payment/credit logic lives here — it navigates to
// the existing checkout endpoints.
//
// KINEO-REBASE-2026-07-10 — EXIT-INTENT v2 "ESCADA": the single $4.90 rescue
// is now a two-step ladder shown side by side —
//   left:  $4.90 one-time · 10 videos (same ?pack=starter checkout as before)
//   right: $9.90/mo Starter (HIGHLIGHTED, "BEST VALUE") — 25 credits every
//          month + no watermark + cancel anytime (?tier=starter, the same
//          GET checkout PricingCards uses)
// The FOUNDING50 secondary CTA is retired (the Starter card replaces it).
// New event: exit_intent_starter_monthly_clicked. Everything else (arm delay,
// once-per-session, desktop/mobile triggers, a11y) is unchanged.
//
// KINEO-REBASE-2026-07-10 — countdown hook: when the modal is SHOWN we write
// `kineo_exit_seen_at` (localStorage). If the visitor doesn't convert, the
// $2.90/24h countdown offer (Offer290Banner) uses that timestamp to arm
// itself on their next visits inside the 24h window. Converters end up
// has_paid=true, which the banner already filters out server-side.

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { trackEvent as trackAnalyticsEvent } from '@/lib/analytics'
import { useCheckoutLaunch } from '@/lib/checkoutTelemetry'
import { FreeTierCopy } from '@/components/FreeTierOfferProvider'
import { TRIAL_FILMS, TRIAL_GRANT_CREDITS_COPY } from '@/lib/freeTierOffer'
// KINEO-PRICING-V6-2026-08-19 — "≈ 7 engine films" era literal; ver o comentário
// no card do Creator, mais abaixo.
import { CREATOR_AI_FILMS } from '@/lib/marketingPrice'
// KINEO-VITRINE-MOEDA-2026-08-19 — ver o bloco grande junto ao texto do modal.
import {
  coercePriceRegion,
  formatCheckoutMoney,
  getTierPrice,
  TIER_CREDITS,
  type CheckoutCurrency,
  type CheckoutTier,
  type PriceRegion,
} from '@/lib/checkoutPricing'

const SESSION_KEY = 'kineo_exit_offer_shown'
// KINEO-REBASE-2026-07-10 — read by Offer290Banner (post-exit $2.90 countdown).
const EXIT_SEEN_KEY = 'kineo_exit_seen_at'
const ARM_DELAY_MS = 5000 // engagement gate before any trigger is live
// PUSH #92 — raised from 25s: 25s of stillness fired on first-time visitors
// who were simply thinking about what topic to type into the hero form, and
// threw a modal over the composer. 45s + a scroll-engagement gate (below)
// give real "gone idle" behaviour instead of "just landed and paused".
const MOBILE_IDLE_MS = 45000 // mobile: show after 45s of inactivity, once armed
const MOBILE_IDLE_SCROLL_GATE = 0.5 // mobile: idle timer only arms after scrolling past this fraction of viewport height
const MOBILE_MIN_DEPTH_PX = 400 // mobile: only consider scroll-up after real scroll depth
const MOBILE_SCROLLUP_PX = 350 // mobile: accumulated fast upward scroll that counts as exit

// Same fire-and-forget event beacon pattern the pricing page uses.
function trackEvent(name: string): void {
  void trackAnalyticsEvent(name)
}

// PUSH #92 — the modal must never throw itself over an input the visitor is
// actively using (e.g. typing a topic into the hero composer).
function isFormFieldFocused(): boolean {
  if (typeof document === 'undefined') return false
  const tag = document.activeElement?.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA'
}

function checkoutIntentParam(): string {
  if (typeof window === 'undefined') return ''
  const raw = (new URLSearchParams(window.location.search).get('intent_campaign') ?? '').trim()
  return /^[A-Za-z0-9._~-]{1,100}$/.test(raw)
    ? `&intent_campaign=${encodeURIComponent(raw)}`
    : ''
}

// KINEO-EXIT-VARIANT-2026-08-03 — POR QUE a prop `variant` existe.
// O modal de deals ($4.90/$9.90) estava montado TAMBÉM na home para visitante
// deslogado — gente que nunca gerou um vídeo levava tabela de preço como
// última impressão (diagnóstico do fundador: "poluído"; diagnóstico do funil:
// vender antes de entregar, o erro que já corrigimos na tela de download).
// Na home o objetivo do exit-intent é CADASTRO, não venda: variant="free"
// vende os 3 vídeos grátis sem cartão. O /pricing continua com o deal —
// lá a pessoa já está decidindo preço.
export default function ExitIntentOffer({ variant = 'deal' }: { variant?: 'deal' | 'free' } = {}) {
  const [open, setOpen] = useState(false)
  // KINEO-VITRINE-MOEDA-2026-08-19 — moeda + região do visitante, resolvidas
  // só quando o modal abre (é exit-intent: na maioria das visitas ele nunca
  // aparece, e não vale gastar um fetch em toda pageview por isso).
  // Fallback = USD/standard: na dúvida, preço cheio, nunca desconto fantasma.
  const [money, setMoney] = useState<{ currency: CheckoutCurrency; region: PriceRegion }>({
    currency: 'usd',
    region: 'standard',
  })
  const exitPrice = (tier: CheckoutTier) =>
    formatCheckoutMoney(money.currency, getTierPrice(tier, money.currency, money.region))
  // KINEO-SPRINT-OFFER-2026-07-14 — 'pack' removed from the union with the
  // one-time escape-hatch link (single-offer cleanup: the modal now sells
  // exactly two things — intro Starter and intro Creator, both recurring).
  // KINEO-CHECKOUT-TRIAGE-2026-07-25 — `buying` was plain useState: React had
  // not painted the disabled button when a second tap arrived, so a double tap
  // minted two Stripe sessions, and a redirect that never happened showed
  // nothing at all. The shared launcher owns the latch, the pending key and the
  // inline error now.
  const checkout = useCheckoutLaunch('exit_intent_offer')
  const buying = checkout.pending
  const shownRef = useRef(false)
  const dialogRef = useRef<HTMLDivElement | null>(null)

  const show = useCallback(() => {
    if (shownRef.current) return
    // Never fire while the visitor is actively typing somewhere on the page.
    if (isFormFieldFocused()) return
    shownRef.current = true
    try {
      sessionStorage.setItem(SESSION_KEY, '1')
    } catch {
      // sessionStorage unavailable (private mode) — still show once via ref
    }
    // KINEO-REBASE-2026-07-10 — arm the post-exit $2.90 countdown
    // (Offer290Banner). Written at show time; converters become has_paid
    // and the banner filters them out server-side.
    try {
      if (!localStorage.getItem(EXIT_SEEN_KEY)) {
        localStorage.setItem(EXIT_SEEN_KEY, String(Date.now()))
      }
    } catch {
      // ignore — countdown just won't arm on this device
    }
    trackEvent('exit_intent_shown')
    setOpen(true)
  }, [])

  // Trigger wiring — armed 5s after mount, desktop vs mobile strategies.
  useEffect(() => {
    if (typeof window === 'undefined') return

    // Once per session.
    try {
      if (sessionStorage.getItem(SESSION_KEY) === '1') return
    } catch {
      // ignore and fall through — shownRef still guards repeats this mount
    }

    // When NOT to show: active subscriber banner, or a promo code already
    // in the URL (win-back email traffic already has its offer).
    const params = new URLSearchParams(window.location.search)
    if (params.get('already_subscribed') === '1') return
    if (params.get('promo')) return

    const isTouch =
      (typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches) ||
      'ontouchstart' in window

    const cleanups: Array<() => void> = []

    const armTimer = window.setTimeout(() => {
      if (!isTouch) {
        // Desktop: cursor exits through the top of the viewport.
        const onMouseLeave = (e: MouseEvent) => {
          if (e.clientY <= 0) show()
        }
        document.addEventListener('mouseleave', onMouseLeave)
        cleanups.push(() => document.removeEventListener('mouseleave', onMouseLeave))
      } else {
        // Mobile 1: inactivity timer — but PUSH #92 only arms it once the
        // visitor has scrolled past ~50% of the viewport height, i.e. they
        // have actually seen the page rather than just landed on it. Before
        // that point the timer never starts, so "stillness while reading
        // the hero / deciding what to type" can no longer fire the modal.
        let idleTimer: number | null = null
        let idleArmed = false
        const scheduleIdle = () => {
          if (idleTimer !== null) window.clearTimeout(idleTimer)
          idleTimer = window.setTimeout(() => {
            if (isFormFieldFocused()) {
              // Still idle from a scroll/touch perspective, but the visitor
              // is actively using a field — keep waiting instead of firing.
              scheduleIdle()
              return
            }
            show()
          }, MOBILE_IDLE_MS)
        }
        const resetIdle = () => {
          if (!idleArmed) return
          scheduleIdle()
        }
        const idleEvents: Array<keyof WindowEventMap> = ['touchstart', 'touchmove', 'scroll', 'keydown']
        idleEvents.forEach((ev) => window.addEventListener(ev, resetIdle, { passive: true }))

        // Mobile 2: fast scroll-up after meaningful scroll depth.
        let lastY = window.scrollY
        let lastT = Date.now()
        let maxY = window.scrollY
        let upAccum = 0
        const onScroll = () => {
          const y = window.scrollY
          const now = Date.now()
          if (y > maxY) maxY = y

          if (!idleArmed && y > window.innerHeight * MOBILE_IDLE_SCROLL_GATE) {
            idleArmed = true
            scheduleIdle()
          }

          const dy = lastY - y // positive = scrolling up
          if (dy > 0) {
            if (now - lastT > 400) upAccum = 0 // stale burst — restart
            upAccum += dy
            if (maxY > MOBILE_MIN_DEPTH_PX && upAccum > MOBILE_SCROLLUP_PX) show()
          } else {
            upAccum = 0
          }
          lastY = y
          lastT = now
        }
        window.addEventListener('scroll', onScroll, { passive: true })

        cleanups.push(() => {
          if (idleTimer !== null) window.clearTimeout(idleTimer)
          idleEvents.forEach((ev) => window.removeEventListener(ev, resetIdle))
          window.removeEventListener('scroll', onScroll)
        })
      }
    }, ARM_DELAY_MS)
    cleanups.push(() => window.clearTimeout(armTimer))

    return () => cleanups.forEach((fn) => fn())
  }, [show])

  // Escape closes + move focus into the dialog when it opens.
  useEffect(() => {
    if (!open) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKeyDown)
    dialogRef.current?.focus()
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open])

  // Resolve a moeda no instante em que o modal abre. Só EXIBIÇÃO: o
  // /api/stripe/checkout re-resolve país → moeda → região no servidor e nunca
  // aceita nada vindo do navegador.
  useEffect(() => {
    if (!open) return
    let cancelled = false
    void fetch('/api/geo', { credentials: 'same-origin', cache: 'no-store' })
      .then((r) => (r.ok ? (r.json() as Promise<{ currency?: string; region?: string }>) : Promise.reject()))
      .then((d) => {
        if (cancelled) return
        const currency: CheckoutCurrency =
          'usd' // KINEO-USD-ONLY-2026-08-19
        setMoney({ currency, region: coercePriceRegion(d.region) })
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [open])

  // KINEO-INTRO-MONTH-2026-07-13 — EXIT-INTENT v3 "RECORRÊNCIA": os dois
  // cards agora são ASSINATURAS com 1º mês de entrada ($4.90 Starter /
  // $9.90 Creator). Mesma mecânica GET (302 servidor, gesture-chain do
  // iOS preservada).
  // KINEO-SPRINT-OFFER-2026-07-14 — o link discreto do pack one-time
  // ("prefer no subscription? 10 videos for $4.90 once") foi REMOVIDO:
  // era a 3ª oferta no mesmo modal e reabria o beco sem saída one-time.
  // O endpoint ?pack=starter segue vivo só para o fluxo return=wm.
  function handleIntroStarter() {
    const started = checkout.launch(
      'starter',
      `/api/stripe/checkout?tier=starter&intro=1${checkoutIntentParam()}`,
      { tier: 'starter', intro: true, pricing_surface: 'exit_intent_offer' },
    )
    if (!started) return
    trackEvent('starter_checkout_clicked')
    trackEvent('exit_intent_intro_starter_clicked')
  }

  function handleIntroCreator() {
    const started = checkout.launch(
      'creator',
      `/api/stripe/checkout?tier=basic&intro=1${checkoutIntentParam()}`,
      { tier: 'basic', intro: true, pricing_surface: 'exit_intent_offer' },
    )
    if (!started) return
    trackEvent('basic_checkout_clicked')
    trackEvent('exit_intent_intro_creator_clicked')
  }

  if (!open) return null

  if (variant === 'free') {
    // ═══ KINEO-MODAL-VITRINE-2026-08-22 — casca nova aprovada em preview.
    // Duas mudanças além do visual, ambas pedidas pelo fundador:
    //   1. TAMANHO/FORMA: 448px→880px, cantos 8, duas colunas (prova + decisão).
    //   2. COPY SEM AMBIGUIDADE DE BÔNUS: o fundador leu a versão anterior e
    //      entendeu que SAIR renderia crédito extra. Se ele entendeu assim,
    //      cliente entende também. A copy agora nomeia a FONTE da oferta
    //      ("signing up gets you the standard N credits...") e diz com todas
    //      as letras que não há prêmio por sair — o que também nos protege de
    //      treinar o comportamento de ameaçar sair para ganhar bônus.
    // Gatilhos, guards de sessão e telemetria: intactos.
    return (
      <div
        className="fixed inset-0 z-[100] flex items-center justify-center p-4"
        style={{ background: 'rgba(0,0,0,0.78)', backdropFilter: 'blur(6px)' }}
        onClick={() => setOpen(false)}
      >
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="exit-free-title"
          tabIndex={-1}
          className="relative w-full max-w-[880px] overflow-hidden text-left outline-none grid md:grid-cols-[1fr_1.15fr]"
          style={{ background: '#131316', border: '1px solid #2a2a2d', borderRadius: 10, boxShadow: '0 24px 80px rgba(0,0,0,.55)' }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            aria-label="Close"
            onClick={() => setOpen(false)}
            className="absolute right-4 top-3 text-xl font-bold z-10"
            style={{ color: '#86868b', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            ×
          </button>
          {/* ── Prova ─────────────────────────────────────────────────── */}
          <div className="hidden md:flex flex-col gap-3" style={{ background: '#0d0d10', borderRight: '1px solid #2a2a2d', padding: 22 }}>
            <div style={{ position: 'relative', borderRadius: 8, overflow: 'hidden', aspectRatio: '16 / 10', background: '#111', border: '1px solid #2a2a2d' }}>
              <video src="/previews/26d25419-6719-47ab-b24b-df214e007fbd.mp4" autoPlay muted loop playsInline preload="metadata" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
              <span style={{ position: 'absolute', top: 8, left: 8, background: 'rgba(0,0,0,.72)', padding: '3px 8px', borderRadius: 4, fontSize: 9, fontWeight: 900, letterSpacing: '0.1em', color: '#fff' }}>KLING 2.5</span>
              <span style={{ position: 'absolute', bottom: 8, left: 8, right: 8, fontSize: 11, fontWeight: 600, color: '#fff', textShadow: '0 1px 3px rgba(0,0,0,.9)' }}>Made with Kineo</span>
            </div>
            <div style={{ fontSize: 13, color: '#86868b', lineHeight: 1.65 }}>
              One thing before you go:<br /><br />
              Kineo writes the script, records the voiceover, cuts the scenes, captions and delivers the MP4. <b style={{ color: '#f5f5f7', fontWeight: 800 }}>You just type the topic.</b>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {[`${TRIAL_GRANT_CREDITS_COPY} FREE CREDITS`, 'NO CARD', 'EVERY ENGINE UNLOCKED'].map((t) => (
                <span key={t} style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: '0.08em', padding: '4px 9px', borderRadius: 4, background: '#1d1d1f', border: '1px solid #2a2a2d', color: '#a8a8ad' }}>{t}</span>
              ))}
            </div>
          </div>
          {/* ── Decisão ───────────────────────────────────────────────── */}
          <div style={{ padding: '26px 26px 22px' }}>
            <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#5cb3ff', marginBottom: 10 }}>Before you go</div>
            <h2 id="exit-free-title" style={{ fontSize: 26, lineHeight: 1.12, fontWeight: 900, letterSpacing: '-0.02em', color: '#f5f5f7', margin: 0, marginBottom: 10 }}>
              You haven&apos;t tried it yet —<br />and trying it is free
            </h2>
            <p style={{ fontSize: 13.5, color: '#86868b', lineHeight: 1.6, margin: 0, marginBottom: 18 }}>
              {/* KINEO-GRANT-COPY-UNICA — número derivado; ver lib/freeTierOffer.ts. */}
              <FreeTierCopy
                legacy="3 free videos every day · no card needed."
                on={`Signing up gets you the standard ${TRIAL_GRANT_CREDITS_COPY} free credits every new account receives — enough for ${TRIAL_FILMS} Seedance ${TRIAL_FILMS === 1 ? 'film' : 'films'}. No card, no special deal for leaving: this is simply what a new account comes with.`}
              />
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 18 }}>
              {[
                ['~3 min', 'from topic to finished video'],
                ['9:16', 'built for Shorts, TikTok & Reels'],
                ['6 engines', 'Veo, Kling 3, Seedance…'],
                ['$0', 'to try — no card, no trick'],
              ].map(([n, d]) => (
                <div key={n} style={{ background: '#1d1d1f', border: '1px solid #2a2a2d', borderRadius: 8, padding: '12px 13px' }}>
                  <div style={{ fontSize: 20, fontWeight: 800, color: '#f5f5f7' }}>{n}</div>
                  <div style={{ fontSize: 10.5, color: '#86868b', marginTop: 3, lineHeight: 1.45 }}>{d}</div>
                </div>
              ))}
            </div>
            <a
              href="/signup"
              onClick={() => trackEvent('exit_intent_free_clicked')}
              style={{ display: 'block', width: '100%', textAlign: 'center', background: '#2997ff', color: '#fff', borderRadius: 8, padding: 15, fontSize: 15, fontWeight: 800, textDecoration: 'none' }}
            >
              Sign up and make my first video
            </a>
            <p style={{ fontSize: 11, color: '#6e6e73', textAlign: 'center', marginTop: 14, lineHeight: 1.5 }}>
              Creating an account takes under a minute.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.78)', backdropFilter: 'blur(6px)' }}
      onClick={() => setOpen(false)}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="exit-offer-title"
        aria-describedby="exit-offer-desc"
        tabIndex={-1}
        className="relative w-full max-w-[880px] overflow-hidden text-left outline-none grid md:grid-cols-[1fr_1.15fr]"
        style={{
          background: '#131316',
          border: '1px solid #2a2a2d',
          borderRadius: 10,
          boxShadow: '0 24px 80px rgba(0,0,0,.55)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ═══ KINEO-MODAL-VITRINE-2026-08-22 — a variante deal era a última
            superfície de VENDA no visual velho (card 512px centrado). Mesma
            casca aprovada; os preços já eram derivados desde o
            KINEO-VITRINE-MOEDA-2026-08-19, então aqui só a moldura muda. */}
        <div className="hidden md:flex flex-col gap-3" style={{ background: '#0d0d10', borderRight: '1px solid #2a2a2d', padding: 22 }}>
          <div style={{ position: 'relative', borderRadius: 8, overflow: 'hidden', aspectRatio: '16 / 10', background: '#111', border: '1px solid #2a2a2d' }}>
            <video src="/previews/9bbd5d98-33e5-423f-b9cb-82f7af6c67ba.mp4" autoPlay muted loop playsInline preload="metadata" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            <span style={{ position: 'absolute', top: 8, left: 8, background: 'rgba(0,0,0,.72)', padding: '3px 8px', borderRadius: 4, fontSize: 9, fontWeight: 900, letterSpacing: '0.1em', color: '#fff' }}>VEO 3.1</span>
            <span style={{ position: 'absolute', bottom: 8, left: 8, right: 8, fontSize: 11, fontWeight: 600, color: '#fff', textShadow: '0 1px 3px rgba(0,0,0,.9)' }}>Made with Kineo</span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {/* KINEO-AUDITORIA-MOTORES-2026-08-25 — o Omni Flash (#1 do ranking
                de agosto, o motor da campanha) faltava nesta fileira: a última
                superfície de venda antes da pessoa ir embora mostrava um
                catálogo menor do que o real. Abre a lista, como na vitrine. */}
            {['OMNI FLASH · #1', 'VEO 3.1', 'KLING 3', 'MINIMAX H3', 'KLING 2.5', 'SEEDANCE 1.5', 'KINEO 1'].map((e) => (
              <span key={e} style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: '0.08em', padding: '4px 9px', borderRadius: 4, background: '#1d1d1f', border: '1px solid #2a2a2d', color: '#a8a8ad' }}>{e}</span>
            ))}
          </div>
          <div style={{ fontSize: 12, color: '#86868b', lineHeight: 1.6 }}>
            Every film above was made with Kineo, labeled with the real engine that rendered it.
          </div>
        </div>
        <div style={{ padding: '26px 26px 22px' }}>
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Close offer"
          className="absolute top-2 right-2 flex items-center justify-center rounded-lg text-[#86868b] hover:text-white hover:bg-white/[.06] transition"
          style={{ width: 44, height: 44, fontSize: 20, fontWeight: 700, lineHeight: 1 }}
        >
          ×
        </button>

        <h2 id="exit-offer-title" className="font-black text-[#f5f5f7] mb-2" style={{ fontSize: 26, lineHeight: 1.12, letterSpacing: '-0.02em' }}>
          Wait — pick your <span style={{ color: '#2997ff' }}>deal</span> before you go
        </h2>
        {/* KINEO-SPRINT-OFFER-2026-07-14 — copy no longer implies a one-time
            option ("try it once" was the pack); both cards are subscriptions. */}
        {/* ═══ KINEO-VITRINE-MOEDA-2026-08-19 — ESTE MODAL MENTIA INTEIRO ═════
            Pergunta do fundador ("a pessoa vê um preço e no checkout é outro,
            isso tira credibilidade") me fez auditar as superfícies de preço.
            Este modal — o ÚLTIMO que um visitante hesitante vê antes de sair
            do /pricing, ou seja, o pior lugar possível para uma mentira —
            tinha TODOS os números errados, congelados na tabela V3:
              "Half-price first month"   → não existe half-price
              Starter "25 credits/mo"    → literal, ficou para trás
              Starter "$4.90 first month, then $9.90"  → $4.90 morreu
              Creator "150 credits/mo"   → literal, ficou para trás
              Creator "$9.90 first month, then $24.90" → os DOIS morreram
            (Os "valores corretos" que esta nota trazia em 19/08 — 60 e 140 —
            duraram algumas horas: a V6 os levou para 40 e 90 no mesmo dia.
            Comentário que anota o número certo envelhece igualzinho ao código
            que o digita. Por isso nenhum deles é citado aqui: quem quiser
            saber lê TIER_CREDITS.)
            E tudo em dólar chumbado, para brasileiro e indiano também.
            Resultado prático: prometíamos metade do preço, a pessoa clicava,
            e o Stripe cobrava o valor cheio numa moeda diferente. Não existe
            jeito mais eficiente de queimar a confiança de quem já hesitou.
            Agora: preço de getTierPrice() na moeda+região do visitante, sem
            NENHUMA afirmação de desconto — o que a gente tem de verdade para
            oferecer aqui é a escada (o degrau barato), não um desconto. */}
        <p id="exit-offer-desc" className="text-[13.5px] text-[#86868b] mb-5 leading-relaxed">
          Fresh credits every month, every engine unlocked. Cancel anytime.
        </p>

        {/* KINEO-INTRO-MONTH-2026-07-13 — v3 ladder: intro Starter (left) vs
            intro Creator (right, highlighted). Ambos assinaturas → MRR. */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4 text-left">
          {/* Left — Starter (KINEO-PRICING-V6-2026-08-19: preço único, sem 1º
              mês; o rótulo sai de exitPrice() → getTierPrice()). */}
          <div
            className="rounded-xl p-4 flex flex-col"
            style={{
              background: 'rgba(255,255,255,.04)',
              border: '1px solid rgba(255,255,255,.14)',
            }}
          >
            <span className="text-[10px] font-black uppercase tracking-[.12em] text-[#86868b] mb-1.5">
              Starter · {TIER_CREDITS.starter} credits/mo
            </span>
            <span className="text-xl font-black text-[#f5f5f7]">
              {exitPrice('starter')} <span className="text-[12px] font-bold text-[#86868b]">/month</span>
            </span>
            <span className="text-[12.5px] text-[#a1a1a6] mt-1 mb-3 leading-relaxed">
              every engine · no watermark · cancel anytime
            </span>
            <button
              type="button"
              onClick={handleIntroStarter}
              disabled={buying !== null}
              className="mt-auto w-full rounded-lg py-2.5 text-[13.5px] font-extrabold text-[#f5f5f7] transition hover:bg-white/[.10] disabled:opacity-60"
              style={{
                background: 'rgba(255,255,255,.08)',
                border: '1px solid rgba(255,255,255,.18)',
                minHeight: 44,
                cursor: 'pointer',
              }}
            >
              {buying === 'starter' ? 'Loading…' : `Start for ${exitPrice('starter')} →`}
            </button>
          </div>

          {/* Right — Creator (HIGHLIGHTED). Mesmo raciocínio do card da
              esquerda: sem 1º mês, preço derivado. */}
          <div
            className="relative rounded-xl p-4 flex flex-col"
            style={{
              background: 'rgba(41,151,255,.08)',
              border: '1.5px solid #2997ff',
              boxShadow: '0 0 26px rgba(41,151,255,.22)',
            }}
          >
            <span
              className="absolute -top-2.5 right-3 rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-[.12em]"
              style={{ background: '#2997ff', color: '#fff' }}
            >
              Best value
            </span>
            <span className="text-[10px] font-black uppercase tracking-[.12em] mb-1.5" style={{ color: '#7cc0ff' }}>
              Creator · {TIER_CREDITS.basic} credits/mo
            </span>
            <span className="text-xl font-black text-[#f5f5f7]">
              {exitPrice('basic')} <span className="text-[12px] font-bold text-[#86868b]">/month</span>
            </span>
            {/* ⚠️ KINEO-PRICING-V6-2026-08-19 — "≈ 7 engine films a month" era o
                último número literal deste modal, e sobreviveu à correção de
                19/08 justamente por não ter cifrão (a auditoria caçou preços).
                7 vinha de 140 ÷ 20; com 90 créditos são 4. Derivado agora. */}
            <span className="text-[12.5px] text-[#cfe7ff] mt-1 mb-3 leading-relaxed">
              ≈ {CREATOR_AI_FILMS} engine films a month · voice, captions and score included
            </span>
            <button
              type="button"
              onClick={handleIntroCreator}
              disabled={buying !== null}
              className="mt-auto w-full rounded-lg py-2.5 text-[13.5px] font-extrabold text-white transition disabled:opacity-60"
              style={{
                background: '#2997ff',
                boxShadow: '0 8px 24px rgba(41,151,255,.4)',
                minHeight: 44,
                cursor: 'pointer',
              }}
            >
              {buying === 'creator' ? 'Loading…' : `Start for ${exitPrice('basic')} →`}
            </button>
          </div>
        </div>

        {checkout.error && (
          <div
            role="alert"
            className="rounded-xl px-4 py-3 text-[12.5px] mb-3 text-left"
            style={{
              background: 'rgba(255,107,107,.08)',
              border: '1px solid rgba(255,107,107,.35)',
              color: '#f5f5f7',
            }}
          >
            {checkout.error}
          </div>
        )}

        {/* ⚠️ KINEO-PRICING-V6-2026-08-19 — "renews at the full monthly price
            after month 1" AFIRMA UM DESCONTO DE ENTRADA por implicação: só faz
            sentido se o mês 1 for mais barato que os seguintes, e ele não é.
            A letra miúda contradizia os dois cards logo acima, que já mostram
            o preço cheio. Trocada pelo que é verdade e é argumento de venda:
            o valor não muda depois. */}
        <p className="text-[11px] text-[#6e6e73]">
          7-day money-back guarantee · cancel anytime · same price every month
        </p>
        </div>{/* fim da coluna de decisão (KINEO-MODAL-VITRINE) */}
      </div>
    </div>
  )
}
