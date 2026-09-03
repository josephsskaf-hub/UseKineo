'use client'

// Push #063 — Checkout cancelled page.
// Push #123 — auto-redirect to /pricing after 5 seconds.

import Link from 'next/link'
import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { trackCheckoutClick } from '@/lib/trackClick'
import { trackEvent } from '@/lib/analytics'
import { useCheckoutLaunch } from '@/lib/checkoutTelemetry'
import {
  AUTOPILOT_PILOT_DAYS,
  AUTOPILOT_PILOT_PRICES,
  coercePriceRegion,
  formatCheckoutMoney,
  getAnnualPrice,
  getIntroPrice,
  getTierPrice,
  hasIntroOffer,
  isRegionalTier,
  monthlyPriceMinor,
  type CheckoutCurrency,
  type CheckoutPlanTier,
  type CheckoutTier,
} from '@/lib/checkoutPricing'
import { useFreeTierOffer } from '@/components/FreeTierOfferProvider'
import { swapFreeTierCopy as ft, TRIAL_GRANT_CREDITS_COPY } from '@/lib/freeTierOffer'
import { readAutopilotCheckoutReturn } from '@/lib/growth/autopilotCheckoutReturn'
import { readPlanFitCheckoutReturn } from '@/lib/growth/planFitCheckout'
import {
  TRIAL_FIRST_DELIVERY_DURATION,
  TRIAL_FIRST_DELIVERY_COST,
  TRIAL_FIRST_DELIVERY_VERSION,
} from '@/lib/growth/trialBalanceBridge'
import { decideCheckoutCancelledPrimary } from '@/lib/growth/checkoutCancelledRecovery'
import CheckoutCancelObjectionTelemetry from './CheckoutCancelObjectionTelemetry'
import { CHECKOUT_CANCEL_OBJECTION_TARGET_ID } from '@/lib/growth/checkoutCancelObjectionVisibility'

const PLAN_FIT_RETRY_PARAM_KEYS = [
  'checkout_origin',
  'pf_engine',
  'pf_monthly_videos',
  'pf_seconds',
  'pf_tier',
  'pf_video_id',
] as const

// Push #175 — use checkout GET route instead of hardcoded Stripe links.
// KINEO-SPRINT-FIX-2026-07-15 — plan/offer preservation: buyers who abandon an
// intro-month checkout land HERE via cancel_url, and the old retry link
// re-entered checkout at FULL price (intro dropped → second-chance conversion
// killed). Carry ?intro=1 on the Creator retry; the server validates
// eligibility (1 per customer, monthly only), so this can never double-apply.
// PUSH #37 also carries a validated private promotion code and its display
// currency. A buyer who backs out of the $5 pack-upgrade must never retry at
// full price or see copy that contradicts the Stripe checkout they just left.
export default function CheckoutCancelledPage() {
  return (
    <Suspense fallback={<main style={{ minHeight: '100vh', background: 'var(--bg)' }} />}>
      <CheckoutCancelledContent />
    </Suspense>
  )
}

function CheckoutCancelledContent() {
  // [KINEO-TRIAL-SWAP-2026-08-07] — oferta do free tier via contexto (client).
  const OFFER = useFreeTierOffer()
  // KINEO-CHECKOUT-TRIAGE-2026-07-25 — the retry link was a bare <a href>: a
  // buyer who already abandoned once and taps it twice created two Stripe
  // sessions and saw no feedback at all in between.
  const checkout = useCheckoutLaunch('checkout_cancelled')
  // KINEO-CANCEL-REASON-2026-08-03 — ver comentário no bloco do survey.
  const [reasonSent, setReasonSent] = useState<string | null>(null)
  const [trialResumeProbe, setTrialResumeProbe] = useState<{
    resolved: boolean
    reason: string | null
  }>({ resolved: false, reason: null })
  const searchParams = useSearchParams()
  const autopilotReturn = readAutopilotCheckoutReturn(searchParams)
  const rawTier = searchParams.get('tier')
  const tier: CheckoutPlanTier = autopilotReturn
    ? 'autopilot'
    : rawTier === 'starter' || rawTier === 'pro'
      ? rawTier
      : 'basic'
  const billing = tier === 'autopilot'
    ? 'monthly'
    : searchParams.get('billing') === 'annual' ? 'annual' : 'monthly'
  const intro = searchParams.get('intro') === '1' && billing === 'monthly' && (tier === 'starter' || tier === 'basic')
  const rawPromo = (searchParams.get('promo') ?? '').trim()
  const promo = /^[A-Za-z0-9_-]{1,64}$/.test(rawPromo) ? rawPromo : null
  const privatePackPromo = Boolean(promo?.toUpperCase().startsWith('KINEO5-')) && billing === 'monthly' && tier === 'basic'
  const introEligible = intro && billing === 'monthly' && (tier === 'starter' || tier === 'basic')
  const rawCurrency = searchParams.get('currency')
  // KINEO-USD-ONLY-2026-08-19 — a querystring pode trazer moeda de uma sessão
  // antiga; ignorada de propósito. Existe uma moeda só, e quem manda é o servidor.
  const checkoutCurrency: 'usd' = 'usd'
  void rawCurrency
  const planFitReturn = readPlanFitCheckoutReturn(searchParams, tier, checkoutCurrency)
  const planFitCheckoutOrigin = planFitReturn?.context.checkout_origin ?? 'standard'
  const planFitEngine = planFitReturn?.context.plan_fit_planned_engine ?? null
  const planFitMonthlyVideos = planFitReturn?.monthlyVideos ?? null
  const planFitSeconds = planFitReturn?.seconds ?? null
  const planFitSelectedTierMatches = planFitReturn?.selectedTierMatches ?? null
  const returnToWatermark = searchParams.get('return') === 'wm'
  const rawIntentCampaign = (searchParams.get('intent_campaign') ?? '').trim()
  const intentCampaign = /^[A-Za-z0-9._~-]{1,100}$/.test(rawIntentCampaign)
    ? rawIntentCampaign
    : null
  const retryParams = new URLSearchParams({ tier, billing })
  if (intro) retryParams.set('intro', '1')
  if (promo) retryParams.set('promo', promo)
  if (returnToWatermark) retryParams.set('return', 'wm')
  if (intentCampaign) retryParams.set('intent_campaign', intentCampaign)
  for (const key of PLAN_FIT_RETRY_PARAM_KEYS) {
    const value = searchParams.get(key)
    if (value) retryParams.set(key, value)
  }
  const retryHref = autopilotReturn?.retryHref ?? `/api/stripe/checkout?${retryParams.toString()}`
  const checkoutSelection = autopilotReturn?.selection ?? tier
  const isAutopilotReturn = autopilotReturn !== null
  const isAutopilotPilot = autopilotReturn?.kind === 'pilot'
  const planName = isAutopilotPilot
    ? 'Autopilot Pilot'
    : tier === 'autopilot'
      ? 'Autopilot'
      : tier === 'starter' ? 'Starter' : tier === 'pro' ? 'Studio' : 'Creator'
  // ═══════════════════════════════════════════════════════════════════════
  // KINEO-OBJECTION-HANDLER-2026-08-04 — ESTA TELA TINHA UMA TABELA DE PREÇOS
  // DIGITADA À MÃO, e a armadilha previsível aconteceu: horas depois de
  // KINEO-REGIONAL-PRICING-BR-2026-08-04 baixar o Starter brasileiro de
  // R$49,90 para R$24,90, o literal 'R$49,90' continuava aqui. A ÚNICA
  // superfície de recuperação do funil estava prestes a cobrar o dobro do
  // preço real de quem já tinha desistido uma vez. Agora tudo deriva de
  // lib/checkoutPricing (fonte única) com a região vinda do cancel_url.
  const priceRegion = coercePriceRegion(searchParams.get('region'))
  const money = (amountMinor: number) => formatCheckoutMoney(checkoutCurrency, amountMinor)
  const monthlyOf = (t: CheckoutTier) => money(getTierPrice(t, checkoutCurrency, priceRegion))
  const monthlyPrice = money(monthlyPriceMinor(tier, checkoutCurrency, priceRegion))
  const annualPrice = tier === 'autopilot'
    ? null
    : money(getAnnualPrice(tier, checkoutCurrency, priceRegion))
  const autopilotPilotPrice = money(AUTOPILOT_PILOT_PRICES[checkoutCurrency])
  // O 1º mês só existe onde REALMENTE existe desconto: na região `value` o
  // Starter não tem intro, e escrever "First month X" ali seria a diferença
  // entre uma página de preço e uma cobrança-surpresa.
  const introPrice =
    isRegionalTier(tier) && hasIntroOffer(tier, checkoutCurrency, priceRegion)
      ? money(getIntroPrice(tier, checkoutCurrency, priceRegion))
      : null
  const privateFirstLabel = checkoutCurrency === 'usd' ? 'US$5' : 'the verified private price'
  const todayPrice = isAutopilotPilot
    ? `${autopilotPilotPrice} once`
    : billing === 'annual' && annualPrice
    ? `${annualPrice}/year`
    : privatePackPromo
      ? `${privateFirstLabel} today`
      : introEligible && introPrice
        ? `${introPrice} today`
        : `${monthlyPrice}/month`
  const renewalCopy = isAutopilotPilot
    ? `One-time payment. Nothing renews; the pilot ends after ${AUTOPILOT_PILOT_DAYS} days.`
    : tier === 'autopilot'
      ? `Renews at ${monthlyPrice}/month. Cancel anytime.`
      : privatePackPromo
    ? `Renews at ${monthlyOf('basic')}/month in 30 days. Cancel anytime.`
    : introEligible
    ? `Renews at ${monthlyPrice}/month in 30 days. Cancel anytime.`
    : billing === 'annual' && annualPrice
      ? `Renews at ${annualPrice}/year. Your annual billing choice will be preserved.`
      : `Renews at ${monthlyPrice}/month in 30 days. Cancel anytime.`

  // ═══════════════════════════════════════════════════════════════════════
  // O DEGRAU MAIS BARATO QUE AINDA É UMA VENDA.
  // ═══════════════════════════════════════════════════════════════════════
  // Quem clica "Too expensive" não pode receber um agradecimento: ele acabou
  // de dizer, com o cartão na mão, a única objeção que o produto sabe
  // responder sozinho. Se havia um degrau abaixo do que ele tentou, mostramos
  // esse degrau COM botão. Se ele já estava no degrau mais baixo, a resposta
  // certa não é insistir — é o caminho gratuito (3 Fast/24h), que é ativação.
  const cheaperTier: CheckoutTier | null = isAutopilotReturn
    ? null
    : tier === 'pro' ? 'basic' : tier === 'basic' ? 'starter' : null
  const cheaperIntro =
    cheaperTier && isRegionalTier(cheaperTier) && hasIntroOffer(cheaperTier, checkoutCurrency, priceRegion)
      ? money(getIntroPrice(cheaperTier, checkoutCurrency, priceRegion))
      : null
  const cheaperName = cheaperTier === 'starter' ? 'Starter' : 'Creator'
  const cheaperParams = new URLSearchParams({ tier: cheaperTier ?? 'starter', billing: 'monthly' })
  if (cheaperIntro) cheaperParams.set('intro', '1')
  if (returnToWatermark) cheaperParams.set('return', 'wm')
  if (intentCampaign) cheaperParams.set('intent_campaign', intentCampaign)
  for (const key of PLAN_FIT_RETRY_PARAM_KEYS) {
    const value = searchParams.get(key)
    if (value) cheaperParams.set(key, value)
  }
  const cheaperHref = `/api/stripe/checkout?${cheaperParams.toString()}`

  const cancelledPrimary = decideCheckoutCancelledPrimary({
    resolved: trialResumeProbe.resolved,
    resumeReason: trialResumeProbe.reason,
  })
  const downshiftAvailable =
    cancelledPrimary === 'checkout' && !isAutopilotReturn && cheaperTier !== null
  const objectionCheckoutProduct = isAutopilotPilot
    ? 'autopilot_pilot'
    : isAutopilotReturn
      ? 'autopilot_subscription'
      : 'self_serve'
  const firstDeliveryHref = `/studio/create?engine=seedance&duration=${TRIAL_FIRST_DELIVERY_DURATION}&intent_campaign=${TRIAL_FIRST_DELIVERY_VERSION}`

  const startSavedCheckout = () => {
    const started = checkout.launch(checkoutSelection, retryHref, {
      tier,
      billing,
      checkout_product: autopilotReturn?.kind ?? 'self_serve',
      intro,
      private_offer: privatePackPromo,
    })
    if (!started) return
    trackEvent(isAutopilotPilot ? 'autopilot_pilot_checkout_retry_clicked' : `${tier}_checkout_retry_clicked`, {
      tier,
      billing,
      checkout_product: autopilotReturn?.kind ?? 'self_serve',
      intro,
      private_offer: privatePackPromo,
      return_to_watermark: returnToWatermark,
      intent_campaign: intentCampaign,
      checkout_origin: planFitCheckoutOrigin,
      plan_fit_engine: planFitEngine,
      plan_fit_monthly_videos: planFitMonthlyVideos,
      plan_fit_seconds: planFitSeconds,
    })
    trackCheckoutClick(checkoutSelection)
  }

  const startDownshiftCheckout = (placement: 'primary' | 'objection') => {
    if (!cheaperTier) return
    const started = checkout.launch(cheaperTier, cheaperHref, {
      tier: cheaperTier,
      billing: 'monthly',
      intro: Boolean(cheaperIntro),
      private_offer: false,
      checkout_origin: 'checkout_cancelled_downshift',
    })
    if (!started) return
    const metadata = {
      from_tier: tier,
      to_tier: cheaperTier,
      placement,
      intro: Boolean(cheaperIntro),
      monthly_price_minor: getTierPrice(cheaperTier, checkoutCurrency, priceRegion),
      return_to_watermark: returnToWatermark,
      intent_campaign: intentCampaign,
      checkout_origin: planFitCheckoutOrigin,
      plan_fit_engine: planFitEngine,
      plan_fit_monthly_videos: planFitMonthlyVideos,
      plan_fit_seconds: planFitSeconds,
    }
    trackEvent('checkout_downshift_offer_clicked', metadata)
    trackEvent('checkout_downgrade_offer_clicked', metadata)
    trackCheckoutClick(cheaperTier)
  }

  // The passive recovery endpoint already owns the financial and trial truth.
  // Reusing its explicit reason keeps this page from inventing a second
  // eligibility rule. Failures fall back to the established checkout recovery.
  useEffect(() => {
    const controller = new AbortController()

    void fetch('/api/stripe/checkout/resume', {
      cache: 'no-store',
      credentials: 'same-origin',
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) return null
        return response.json() as Promise<{ reason?: unknown }>
      })
      .then((payload) => {
        if (controller.signal.aborted) return
        setTrialResumeProbe({
          resolved: true,
          reason: typeof payload?.reason === 'string' ? payload.reason : null,
        })
      })
      .catch(() => {
        if (controller.signal.aborted) return
        setTrialResumeProbe({ resolved: true, reason: null })
      })

    return () => controller.abort()
  }, [])

  useEffect(() => {
    if (cancelledPrimary !== 'first_delivery') return
    trackEvent('checkout_cancelled_trial_delivery_offered', {
      tier,
      billing,
      version: TRIAL_FIRST_DELIVERY_VERSION,
      target_engine: 'seedance',
      target_duration: TRIAL_FIRST_DELIVERY_DURATION,
    })
  }, [cancelledPrimary, tier, billing])

  useEffect(() => {
    if (!downshiftAvailable || !cheaperTier) return
    trackEvent('checkout_downshift_offer_viewed', {
      from_tier: tier,
      to_tier: cheaperTier,
      monthly_price_minor: getTierPrice(cheaperTier, checkoutCurrency, priceRegion),
      return_to_watermark: returnToWatermark,
      intent_campaign: intentCampaign,
      checkout_origin: planFitCheckoutOrigin,
      plan_fit_engine: planFitEngine,
      plan_fit_monthly_videos: planFitMonthlyVideos,
      plan_fit_seconds: planFitSeconds,
    })
  }, [downshiftAvailable, cheaperTier, tier, checkoutCurrency, priceRegion, returnToWatermark, intentCampaign, planFitCheckoutOrigin, planFitEngine, planFitMonthlyVideos, planFitSeconds])

  useEffect(() => {
    trackEvent('checkout_cancelled', {
      tier,
      billing,
      checkout_product: autopilotReturn?.kind ?? 'self_serve',
      intro,
      private_offer: privatePackPromo,
      return_to_watermark: returnToWatermark,
      intent_campaign: intentCampaign,
      checkout_origin: planFitCheckoutOrigin,
      plan_fit_engine: planFitEngine,
      plan_fit_monthly_videos: planFitMonthlyVideos,
      plan_fit_seconds: planFitSeconds,
      plan_fit_selected_tier_matches: planFitSelectedTierMatches,
    })
  }, [tier, billing, autopilotReturn?.kind, intro, privatePackPromo, returnToWatermark, intentCampaign, planFitCheckoutOrigin, planFitEngine, planFitMonthlyVideos, planFitSeconds, planFitSelectedTierMatches])

  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)', fontFamily: 'var(--font-inter), Inter, system-ui, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px 20px' }}>
      <div style={{ width: '100%', maxWidth: 560, background: '#131316', border: '1px solid var(--border)', borderRadius: 22, padding: 'clamp(24px, 5vw, 36px)', boxShadow: '0 16px 60px rgba(0,0,0,.5)' }}>
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ fontSize: 'clamp(1.5rem, 4.5vw, 1.9rem)', fontWeight: 900, letterSpacing: '-0.02em', margin: 0 }}>
            {cancelledPrimary === 'first_delivery' ? 'You can try Kineo before deciding.' : 'Payment was not completed.'}
          </h1>
          <p style={{ marginTop: 10, fontSize: '0.95rem', color: 'var(--muted2)', lineHeight: 1.55 }}>Your card was not charged if checkout was not completed.</p>
          <p style={{ marginTop: 10, fontSize: '0.88rem', color: '#2997ff', fontWeight: 700 }}>
            {cancelledPrimary === 'first_delivery'
              ? `Your included ${TRIAL_FIRST_DELIVERY_DURATION}s Seedance episode is still available.`
              : 'Your selected plan is saved below.'}
          </p>
        </div>
        <div style={{ marginTop: 22, background: 'linear-gradient(135deg, rgba(41,151,255,.10), rgba(41,151,255,.06))', border: '1px solid rgba(41,151,255,.30)', borderRadius: 16, padding: 18 }}>
          {cancelledPrimary === 'checking' ? (
            <p style={{ margin: 0, minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted2)', fontSize: '0.85rem', fontWeight: 750 }}>
              Checking your included trial…
            </p>
          ) : cancelledPrimary === 'first_delivery' ? (
            <>
              <p style={{ fontSize: '0.92rem', color: 'var(--text)', fontWeight: 850, margin: 0 }}>
                Use what is already included — no card
              </p>
              <p style={{ fontSize: '0.82rem', color: 'var(--muted2)', margin: '6px 0 14px', lineHeight: 1.55 }}>
                Start with a premium {TRIAL_FIRST_DELIVERY_DURATION}s Seedance episode for {TRIAL_FIRST_DELIVERY_COST} credits and keep the rest of your trial for more videos. Nothing starts until you choose Generate.
              </p>
              <Link
                href={firstDeliveryHref}
                onClick={() => trackEvent('checkout_cancelled_trial_delivery_clicked', {
                  tier,
                  billing,
                  version: TRIAL_FIRST_DELIVERY_VERSION,
                  target_engine: 'seedance',
                  target_duration: TRIAL_FIRST_DELIVERY_DURATION,
                })}
                style={{ display: 'block', textAlign: 'center', textDecoration: 'none', padding: '13px 14px', borderRadius: 12, fontSize: '0.9rem', fontWeight: 900, color: '#fff', background: 'linear-gradient(135deg, #2997ff, #1d6fe0)', boxShadow: '0 8px 24px rgba(41,151,255,.28)' }}
              >
                Build my {TRIAL_FIRST_DELIVERY_DURATION}s Seedance episode →
              </Link>
              <p style={{ margin: '10px 0 0', fontSize: '0.78rem', color: 'var(--muted2)', textAlign: 'center', fontWeight: 600 }}>
                No card · no automatic charge · your saved plan stays available
              </p>
            </>
          ) : (
            <>
          {downshiftAvailable && cheaperTier ? (
            <div data-checkout-downshift-primary="true">
              <p style={{ margin: 0, color: '#62b3ff', fontSize: '0.7rem', fontWeight: 900, letterSpacing: '.09em', textTransform: 'uppercase' }}>
                Start smaller · same clean exports
              </p>
              <p style={{ fontSize: '1rem', color: 'var(--text)', fontWeight: 850, margin: '6px 0 0' }}>
                {cheaperName} — {monthlyOf(cheaperTier)}/month
              </p>
              <p style={{ fontSize: '0.82rem', color: 'var(--muted2)', margin: '6px 0 14px', lineHeight: 1.55 }}>
                Keep the same watermark-free 9:16 MP4 exports with fewer videos per month. Upgrade whenever you need more.
              </p>
              {planFitReturn && (
                <p style={{ margin: '0 0 14px', padding: '10px 12px', borderRadius: 11, border: '1px solid rgba(98,179,255,.24)', background: 'rgba(41,151,255,.065)', color: 'var(--muted2)', fontSize: '0.78rem', lineHeight: 1.5 }}>
                  Your original {planName} goal stays saved. This smaller plan is a lighter starting point.
                </p>
              )}
              <a
                href="/pricing"
                aria-disabled={checkout.pending !== null}
                onClick={(e) => {
                  e.preventDefault()
                  startDownshiftCheckout('primary')
                }}
                style={{ display: 'block', textAlign: 'center', textDecoration: 'none', padding: '13px 14px', borderRadius: 12, fontSize: '0.9rem', fontWeight: 900, color: '#fff', background: 'linear-gradient(135deg, #2997ff, #1d6fe0)', boxShadow: '0 8px 24px rgba(41,151,255,.28)', opacity: checkout.pending !== null ? 0.7 : 1, cursor: checkout.pending !== null ? 'wait' : 'pointer' }}
              >
                {checkout.pending !== null ? 'Opening secure checkout…' : `Start ${cheaperName} — ${monthlyOf(cheaperTier)}/month →`}
              </a>
              <a
                href="/pricing"
                aria-disabled={checkout.pending !== null}
                onClick={(e) => {
                  e.preventDefault()
                  startSavedCheckout()
                }}
                style={{ display: 'block', marginTop: 10, textAlign: 'center', textDecoration: 'none', padding: '10px 12px', borderRadius: 11, fontSize: '0.8rem', fontWeight: 800, color: 'var(--muted2)', border: '1px solid var(--border)', opacity: checkout.pending !== null ? 0.65 : 1, cursor: checkout.pending !== null ? 'wait' : 'pointer' }}
              >
                Keep {planName} — {todayPrice}
              </a>
              {checkout.error && (
                <p role="alert" style={{ marginTop: 10, fontSize: '0.8rem', color: '#ff6b6b', fontWeight: 700, textAlign: 'center' }}>
                  {checkout.error}
                </p>
              )}
              <p style={{ marginTop: 10, fontSize: '0.8rem', color: 'var(--muted2)', textAlign: 'center', fontWeight: 600 }}>
                7-day money-back guarantee · cancel anytime in one click
              </p>
            </div>
          ) : (
            <>
          <p style={{ fontSize: '0.92rem', color: 'var(--text)', fontWeight: 700, margin: 0 }}>{planName} — {todayPrice}</p>
          <p style={{ fontSize: '0.82rem', color: 'var(--muted2)', margin: '4px 0 14px', lineHeight: 1.5 }}>{renewalCopy}</p>
          {planFitReturn && (
            <div
              aria-label="Saved Plan Fit goal"
              style={{ margin: '0 0 14px', padding: '12px 13px', borderRadius: 12, border: '1px solid rgba(98,179,255,.26)', background: 'rgba(41,151,255,.075)' }}
            >
              <p style={{ margin: 0, color: '#62b3ff', fontSize: '0.69rem', fontWeight: 900, letterSpacing: '.09em', textTransform: 'uppercase' }}>
                Matched to the video you just made
              </p>
              <p style={{ margin: '5px 0 0', color: 'var(--text)', fontSize: '0.9rem', fontWeight: 850, lineHeight: 1.4 }}>
                {planFitReturn.monthlyVideos} × {planFitReturn.seconds}s {planFitReturn.engineLabel} video{planFitReturn.monthlyVideos === 1 ? '' : 's'}/month
              </p>
              <p style={{ margin: '4px 0 0', color: 'var(--muted2)', fontSize: '0.77rem', lineHeight: 1.5 }}>
                {planFitReturn.selectedTierMatches
                  ? `${planName} was recommended to cover this exact publishing goal.`
                  : 'This selected plan is one step below the recommendation for the full goal.'}
              </p>
            </div>
          )}
          {/* KINEO-CHECKOUT-TRIAGE-2026-07-25 — the visible href must NOT be the
              checkout API: prefetch, middle-click and link scanners follow it and
              bypass the latch entirely. The real destination stays in
              checkout.launch(); the href is only the no-JS / new-tab fallback. */}
          <a
            href="/pricing"
            aria-disabled={checkout.pending !== null}
            onClick={(e) => {
              e.preventDefault()
              startSavedCheckout()
            }}
            style={{ display: 'block', textAlign: 'center', textDecoration: 'none', padding: '13px 14px', borderRadius: 12, fontSize: '0.9rem', fontWeight: 900, color: '#fff', background: 'linear-gradient(135deg, #2997ff, #1d6fe0)', boxShadow: '0 8px 24px rgba(41,151,255,.28)', opacity: checkout.pending !== null ? 0.7 : 1, cursor: checkout.pending !== null ? 'wait' : 'pointer' }}
          >
            {checkout.pending !== null
              ? 'Opening secure checkout…'
              : planFitReturn
                ? `Continue with ${planName} for this goal →`
                : 'Try secure checkout again →'}
          </a>
          {checkout.error && (
            <p role="alert" style={{ marginTop: 10, fontSize: '0.8rem', color: '#ff6b6b', fontWeight: 700, textAlign: 'center' }}>
              {checkout.error}
            </p>
          )}
          {/* KINEO-CHECKOUT-REASSURANCE-2026-08-03 — a garantia estava em toda a
              jornada MENOS aqui, na página onde o hesitante aterrissa. */}
          <p style={{ marginTop: 10, fontSize: '0.8rem', color: 'var(--muted2)', textAlign: 'center', fontWeight: 600 }}>
            {isAutopilotPilot
              ? 'Secure Stripe checkout · one-time payment · no auto-renew'
              : '7-day money-back guarantee · cancel anytime in one click'}
          </p>
            </>
          )}
            </>
          )}
        </div>
        {/* ═══════════════════════════════════════════════════════════════
            KINEO-OBJECTION-HANDLER-2026-08-04 — O SURVEY ERA UM INSTRUMENTO
            CEGO E O NÚMERO PROVOU.
            ═══════════════════════════════════════════════════════════════
            KINEO-CANCEL-REASON-2026-08-03 colocou aqui três chips ("Price" /
            "Just looking" / "I had questions") para descobrir por que ninguém
            paga. Medição de hoje (04/08, 21:30Z): `checkout_cancel_reason` tem
            ZERO linhas na história inteira, contra 7 `checkout_cancelled`
            desde o deploy. É o MESMO defeito que matou o pedido de review do
            TAAFT (124 exibições, 0 cliques) e a causa é a mesma: a tela PEDIA
            e não DEVOLVIA. Clicar levava a "Thanks — that helps us more than
            you know". Ninguém gasta um toque para nos ajudar; gasta para
            resolver o próprio problema.

            A autópsia de um lead real diz o que construir. thewaqaskhanofficial
            (TAAFT, 04/08) abriu TRÊS checkouts em 18 minutos: Creator anual
            (US$199) → Starter 1º mês (US$4,90) → Autopilot (US$299), e
            cancelou os três. Quem desce para o mais barato E DEPOIS sobe para
            o mais caro não está achando caro — está tentando descobrir o que
            cada plano faz, usando o checkout do Stripe como catálogo. A
            resposta que a tela dava a esse homem era um endereço de e-mail.

            Agora cada motivo tem UMA resposta acionável no mesmo pixel:
              · too_expensive  → o degrau mais barato que ainda é venda, com botão
              · which_plan     → a diferença entre os planos em 3 linhas (o chip do Waqas)
              · had_questions  → as duas dúvidas reais respondidas inline
              · just_looking   → o caminho grátis, que é ativação e não venda
            O evento continua sendo gravado igual — a diferença é que agora o
            usuário tem motivo próprio para clicar. DELIVER-FIRST vale também
            para a superfície que faz uma pergunta. */}
        <div
          id={CHECKOUT_CANCEL_OBJECTION_TARGET_ID}
          style={{ marginTop: 16, display: cancelledPrimary === 'checkout' ? undefined : 'none' }}
          aria-hidden={cancelledPrimary !== 'checkout'}
        >
          <CheckoutCancelObjectionTelemetry
            active={cancelledPrimary === 'checkout' && reasonSent === null}
            tier={tier}
            billing={billing}
            checkoutProduct={objectionCheckoutProduct}
            downshiftAvailable={downshiftAvailable}
          />
          {reasonSent === null ? (
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: '0.82rem', color: 'var(--muted2)', fontWeight: 700, margin: '0 0 10px' }}>
                What stopped you? One tap — we&apos;ll answer it right here.
              </p>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
                {([
                  ['too_expensive', 'Too expensive'],
                  ['which_plan', 'Not sure which plan'],
                  ['had_questions', 'I had questions'],
                  ['just_looking', 'Just looking'],
                ] as const).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    data-checkout-cancel-reason={value}
                    onClick={() => {
                      setReasonSent(value)
                      trackEvent('checkout_cancel_reason', { tier, billing, reason: value })
                    }}
                    style={{ padding: '9px 14px', borderRadius: 999, fontSize: '0.8rem', fontWeight: 700, color: 'var(--text)', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', cursor: 'pointer' }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', borderRadius: 14, padding: 16 }}>
              {reasonSent === 'too_expensive' && (
                isAutopilotReturn ? (
                  isAutopilotPilot ? (
                    <>
                      <p style={{ margin: 0, fontSize: '0.88rem', fontWeight: 800, color: 'var(--text)' }}>
                        The pilot is the smallest done-for-you step.
                      </p>
                      <p style={{ margin: '6px 0 12px', fontSize: '0.82rem', color: 'var(--muted2)', lineHeight: 1.55 }}>
                        If you want a lower price, compare the self-serve plans instead. You make each
                        video yourself; Kineo still handles the script, voiceover, footage and captions.
                      </p>
                      <Link
                        href="/pricing"
                        onClick={() => trackEvent('autopilot_pilot_self_serve_clicked', { reason: 'too_expensive' })}
                        style={{ display: 'block', textAlign: 'center', textDecoration: 'none', padding: '11px 14px', borderRadius: 12, fontSize: '0.85rem', fontWeight: 900, color: '#fff', background: 'linear-gradient(135deg, #2997ff, #1d6fe0)' }}
                      >
                        Compare self-serve plans →
                      </Link>
                    </>
                  ) : (
                    <>
                      <p style={{ margin: 0, fontSize: '0.88rem', fontWeight: 800, color: 'var(--text)' }}>
                        Try the same Autopilot for one week.
                      </p>
                      <p style={{ margin: '6px 0 12px', fontSize: '0.82rem', color: 'var(--muted2)', lineHeight: 1.55 }}>
                        {AUTOPILOT_PILOT_DAYS} Shorts published to your YouTube channel, one per day,
                        for {autopilotPilotPrice} once. No subscription and no auto-renewal.
                      </p>
                      <a
                        href="/pricing#autopilot"
                        onClick={(e) => {
                          e.preventDefault()
                          const started = checkout.launch(
                            'autopilot_pilot',
                            '/api/stripe/checkout?pack=autopilot_pilot',
                            { sku: 'autopilot_pilot', source: 'autopilot_cancelled_price_objection' },
                          )
                          if (!started) return
                          trackEvent('autopilot_cancelled_pilot_clicked', { from_tier: 'autopilot' })
                          trackCheckoutClick('autopilot_pilot')
                        }}
                        style={{ display: 'block', textAlign: 'center', textDecoration: 'none', padding: '11px 14px', borderRadius: 12, fontSize: '0.85rem', fontWeight: 900, color: '#fff', background: 'linear-gradient(135deg, #2997ff, #1d6fe0)' }}
                      >
                        {checkout.pending !== null ? 'Opening secure checkout…' : `Start the ${AUTOPILOT_PILOT_DAYS}-day pilot →`}
                      </a>
                    </>
                  )
                ) : cheaperTier ? (
                  <>
                    <p style={{ margin: 0, fontSize: '0.88rem', fontWeight: 800, color: 'var(--text)' }}>
                      Then start one step down.
                    </p>
                    <p style={{ margin: '6px 0 12px', fontSize: '0.82rem', color: 'var(--muted2)', lineHeight: 1.55 }}>
                      {cheaperName} is {cheaperIntro ? `${cheaperIntro} for your first month, then ` : ''}
                      {monthlyOf(cheaperTier)}/month. Same watermark-free 9:16 MP4, fewer videos per month.
                      You can move up anytime.
                    </p>
                    <a
                      href="/pricing"
                      onClick={(e) => {
                        e.preventDefault()
                        startDownshiftCheckout('objection')
                      }}
                      style={{ display: 'block', textAlign: 'center', textDecoration: 'none', padding: '11px 14px', borderRadius: 12, fontSize: '0.85rem', fontWeight: 900, color: '#fff', background: 'linear-gradient(135deg, #2997ff, #1d6fe0)' }}
                    >
                      {checkout.pending !== null ? 'Opening secure checkout…' : `Start ${cheaperName} instead →`}
                    </a>
                  </>
                ) : (
                  <>
                    <p style={{ margin: 0, fontSize: '0.88rem', fontWeight: 800, color: 'var(--text)' }}>
                      Then don&apos;t pay yet.
                    </p>
                    <p style={{ margin: '6px 0 12px', fontSize: '0.82rem', color: 'var(--muted2)', lineHeight: 1.55 }}>
                      Starter is already our lowest plan. {ft(OFFER, 'Make up to 3 Fast videos every 24h on the free account instead — no card. They carry a watermark; everything else is the same.', 'Use the free account instead — 1 free Fast video/month, no card. It carries a watermark; everything else is the same.')}
                    </p>
                    <Link
                      href="/studio"
                      onClick={() => trackEvent('checkout_free_path_clicked', { tier, reason: 'too_expensive' })}
                      style={{ display: 'block', textAlign: 'center', textDecoration: 'none', padding: '11px 14px', borderRadius: 12, fontSize: '0.85rem', fontWeight: 900, color: '#fff', background: 'linear-gradient(135deg, #2997ff, #1d6fe0)' }}
                    >
                      Make a free Short instead →
                    </Link>
                  </>
                )
              )}

              {reasonSent === 'which_plan' && (
                isAutopilotReturn ? (
                  <>
                    <p style={{ margin: 0, fontSize: '0.88rem', fontWeight: 800, color: 'var(--text)' }}>
                      Pilot and monthly are the same done-for-you workflow.
                    </p>
                    <ul style={{ margin: '8px 0 12px', padding: '0 0 0 18px', fontSize: '0.82rem', color: 'var(--muted2)', lineHeight: 1.7 }}>
                      <li><strong style={{ color: 'var(--text)' }}>Pilot {autopilotPilotPrice} once</strong> — {AUTOPILOT_PILOT_DAYS} Shorts, one per day, then it ends.</li>
                      <li><strong style={{ color: 'var(--text)' }}>Autopilot {monthlyPrice}/mo</strong> — one Short every day until you pause or cancel.</li>
                    </ul>
                    <p style={{ margin: '0 0 12px', fontSize: '0.8rem', color: 'var(--muted2)', lineHeight: 1.55 }}>
                      Both connect to your YouTube channel and handle script, voiceover, footage,
                      captions, title, description and upload.
                    </p>
                    <Link
                      href="/pricing#autopilot"
                      onClick={() => trackEvent('autopilot_cancelled_compare_clicked', { checkout_product: autopilotReturn.kind })}
                      style={{ display: 'block', textAlign: 'center', textDecoration: 'none', padding: '11px 14px', borderRadius: 12, fontSize: '0.85rem', fontWeight: 900, color: '#fff', background: 'linear-gradient(135deg, #2997ff, #1d6fe0)' }}
                    >
                      Compare both Autopilot options →
                    </Link>
                  </>
                ) : (
                  <>
                    <p style={{ margin: 0, fontSize: '0.88rem', fontWeight: 800, color: 'var(--text)' }}>
                      They only differ in how many Shorts you get.
                    </p>
                    <ul style={{ margin: '8px 0 12px', padding: '0 0 0 18px', fontSize: '0.82rem', color: 'var(--muted2)', lineHeight: 1.7 }}>
                      <li><strong style={{ color: 'var(--text)' }}>Starter {monthlyOf('starter')}/mo</strong> — posting a few times a week.</li>
                      <li><strong style={{ color: 'var(--text)' }}>Creator {monthlyOf('basic')}/mo</strong> — posting every day.</li>
                      <li><strong style={{ color: 'var(--text)' }}>Studio {monthlyOf('pro')}/mo</strong> — several channels at once.</li>
                    </ul>
                    <p style={{ margin: '0 0 12px', fontSize: '0.8rem', color: 'var(--muted2)', lineHeight: 1.55 }}>
                      Every paid plan exports the same clean, watermark-free 9:16 MP4. Start low — upgrading
                      takes one click and nothing is lost.
                    </p>
                    <Link
                      href="/pricing"
                      onClick={() => trackEvent('checkout_compare_plans_clicked', { tier })}
                      style={{ display: 'block', textAlign: 'center', textDecoration: 'none', padding: '11px 14px', borderRadius: 12, fontSize: '0.85rem', fontWeight: 900, color: '#fff', background: 'linear-gradient(135deg, #2997ff, #1d6fe0)' }}
                    >
                      Compare all plans side by side →
                    </Link>
                  </>
                )
              )}

              {reasonSent === 'had_questions' && (
                <>
                  <p style={{ margin: 0, fontSize: '0.88rem', fontWeight: 800, color: 'var(--text)' }}>
                    The two we get most:
                  </p>
                  {isAutopilotReturn ? (
                    <>
                      <p style={{ margin: '8px 0 0', fontSize: '0.82rem', color: 'var(--muted2)', lineHeight: 1.6 }}>
                        <strong style={{ color: 'var(--text)' }}>Do I have to upload?</strong> No. You connect
                        your YouTube channel once; Kineo handles the title, description and upload.
                      </p>
                      <p style={{ margin: '8px 0 12px', fontSize: '0.82rem', color: 'var(--muted2)', lineHeight: 1.6 }}>
                        <strong style={{ color: 'var(--text)' }}>{isAutopilotPilot ? 'Does the pilot renew?' : 'Can I cancel?'}</strong>{' '}
                        {isAutopilotPilot
                          ? `No. It is a one-time payment and ends after ${AUTOPILOT_PILOT_DAYS} days.`
                          : 'Yes. Pause or cancel whenever you want from your dashboard.'}
                      </p>
                    </>
                  ) : (
                    <>
                      <p style={{ margin: '8px 0 0', fontSize: '0.82rem', color: 'var(--muted2)', lineHeight: 1.6 }}>
                        <strong style={{ color: 'var(--text)' }}>Can I cancel?</strong> One click from your
                        dashboard, anytime — and the first 7 days are money-back.
                      </p>
                      <p style={{ margin: '8px 0 12px', fontSize: '0.82rem', color: 'var(--muted2)', lineHeight: 1.6 }}>
                        <strong style={{ color: 'var(--text)' }}>Is it really watermark-free?</strong> Yes. Paid
                        plans export a clean 9:16 MP4 you upload straight to Shorts, TikTok and Reels.
                      </p>
                    </>
                  )}
                  <a
                    href={`mailto:support@usekineo.com?subject=${encodeURIComponent('Question before I subscribe')}&body=${encodeURIComponent('Hi Joseph,\n\nI stopped at checkout because I had a question:\n\n')}`}
                    onClick={() => trackEvent('checkout_question_email_clicked', { tier })}
                    style={{ display: 'block', textAlign: 'center', textDecoration: 'none', padding: '11px 14px', borderRadius: 12, fontSize: '0.85rem', fontWeight: 900, color: '#fff', background: 'linear-gradient(135deg, #2997ff, #1d6fe0)' }}
                  >
                    Ask Joseph directly →
                  </a>
                </>
              )}

              {reasonSent === 'just_looking' && (
                <>
                  <p style={{ margin: 0, fontSize: '0.88rem', fontWeight: 800, color: 'var(--text)' }}>
                    Fair — then look at the product, not the price.
                  </p>
                  {isAutopilotReturn ? (
                    <p style={{ margin: '6px 0 12px', fontSize: '0.82rem', color: 'var(--muted2)', lineHeight: 1.55 }}>
                      See the exact daily workflow, what Kineo publishes, and the one-time pilot
                      before deciding. You do not need to reopen checkout to compare them.
                    </p>
                  ) : (
                    <p style={{ margin: '6px 0 12px', fontSize: '0.82rem', color: 'var(--muted2)', lineHeight: 1.55 }}>
                      {ft(OFFER, 'Make up to 3 Fast videos every 24h on the free account, no card.', `Use your ${TRIAL_GRANT_CREDITS_COPY} free credits — every engine unlocked.`)} If one of them is good
                      enough to post, that&apos;s the only argument for paying that actually works.
                    </p>
                  )}
                  <Link
                    href={isAutopilotReturn ? '/pricing#autopilot' : '/generate'}
                    onClick={() => trackEvent(
                      isAutopilotReturn ? 'autopilot_cancelled_details_clicked' : 'checkout_free_path_clicked',
                      { tier, reason: 'just_looking' },
                    )}
                    style={{ display: 'block', textAlign: 'center', textDecoration: 'none', padding: '11px 14px', borderRadius: 12, fontSize: '0.85rem', fontWeight: 900, color: '#fff', background: 'linear-gradient(135deg, #2997ff, #1d6fe0)' }}
                  >
                    {isAutopilotReturn ? 'See how Autopilot works →' : 'Make a free Short →'}
                  </Link>
                </>
              )}
            </div>
          )}
        </div>
        <div style={{ marginTop: 18, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, fontSize: '0.85rem' }}>
          <Link
            href={cancelledPrimary === 'first_delivery'
              ? '/studio'
              : isAutopilotReturn
                ? '/pricing#autopilot'
                : intentCampaign
                  ? `/pricing?intent_campaign=${encodeURIComponent(intentCampaign)}`
                  : '/pricing'}
            style={{ color: '#2997ff', textDecoration: 'none', fontWeight: 700 }}
          >
            {cancelledPrimary === 'first_delivery' ? '← Back to studio' : '← Go back to pricing'}
          </Link>
          <a href="mailto:support@usekineo.com" style={{ color: 'var(--muted2)', textDecoration: 'none', fontWeight: 600 }}>Contact support</a>
        </div>
      </div>
    </main>
  )
}
