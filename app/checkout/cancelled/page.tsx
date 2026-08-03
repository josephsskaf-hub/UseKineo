'use client'

// Push #063 — Checkout cancelled page.
// Push #123 — auto-redirect to /pricing after 5 seconds.

import Link from 'next/link'
import { Suspense, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { trackCheckoutClick } from '@/lib/trackClick'
import { trackEvent } from '@/lib/analytics'
import { useCheckoutLaunch } from '@/lib/checkoutTelemetry'
import { useState } from 'react'

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
  // KINEO-CHECKOUT-TRIAGE-2026-07-25 — the retry link was a bare <a href>: a
  // buyer who already abandoned once and taps it twice created two Stripe
  // sessions and saw no feedback at all in between.
  const checkout = useCheckoutLaunch('checkout_cancelled')
  // KINEO-CANCEL-REASON-2026-08-03 — ver comentário no bloco do survey.
  const [reasonSent, setReasonSent] = useState<string | null>(null)
  const searchParams = useSearchParams()
  const rawTier = searchParams.get('tier')
  const tier: 'starter' | 'basic' | 'pro' =
    rawTier === 'starter' || rawTier === 'pro' ? rawTier : 'basic'
  const billing = searchParams.get('billing') === 'annual' ? 'annual' : 'monthly'
  const intro = searchParams.get('intro') === '1' && billing === 'monthly' && tier !== 'pro'
  const rawPromo = (searchParams.get('promo') ?? '').trim()
  const promo = /^[A-Za-z0-9_-]{1,64}$/.test(rawPromo) ? rawPromo : null
  const privatePackPromo = Boolean(promo?.toUpperCase().startsWith('KINEO5-')) && billing === 'monthly' && tier === 'basic'
  const introEligible = intro && billing === 'monthly' && (tier === 'starter' || tier === 'basic')
  const rawCurrency = searchParams.get('currency')
  const checkoutCurrency: 'usd' | 'brl' | 'inr' =
    rawCurrency === 'brl' || rawCurrency === 'inr' ? rawCurrency : 'usd'
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
  const retryHref = `/api/stripe/checkout?${retryParams.toString()}`
  const planName = tier === 'starter' ? 'Starter' : tier === 'pro' ? 'Studio' : 'Creator'
  const displayedPrices = {
    usd: {
      monthly: { starter: '$9.90', basic: '$24.90', pro: '$37.90' },
      annual: { starter: '$99', basic: '$199', pro: '$379' },
      intro: { starter: '$4.90', basic: '$9.90' },
      privateFirst: 'US$5',
    },
    brl: {
      monthly: { starter: 'R$49,90', basic: 'R$99,90', pro: 'R$189,90' },
      annual: { starter: 'R$499', basic: 'R$999', pro: 'R$1.899' },
      intro: { starter: 'R$24,90', basic: 'R$49,90' },
      // KINEO5 is currently validated only for its supported Stripe currencies;
      // this label is defensive for a hand-edited cancelled-page URL.
      privateFirst: 'the verified private price',
    },
    inr: {
      monthly: { starter: '₹799', basic: '₹1,599', pro: '₹2,999' },
      annual: { starter: '₹7,990', basic: '₹15,990', pro: '₹29,990' },
      intro: { starter: '₹399', basic: '₹799' },
      privateFirst: '₹405',
    },
  } as const
  const prices = displayedPrices[checkoutCurrency]
  const monthlyPrice = prices.monthly[tier]
  const annualPrice = prices.annual[tier]
  const introPrice = tier === 'starter'
    ? prices.intro.starter
    : tier === 'basic'
      ? prices.intro.basic
      : null
  const todayPrice = billing === 'annual'
    ? `${annualPrice}/year`
    : privatePackPromo
      ? `${prices.privateFirst} today`
      : introEligible && introPrice
        ? `${introPrice} today`
        : `${monthlyPrice}/month`
  const renewalCopy = privatePackPromo
    ? `Renews at ${prices.monthly.basic}/month in 30 days. Cancel anytime.`
    : introEligible
    ? `Renews at ${monthlyPrice}/month in 30 days. Cancel anytime.`
    : billing === 'annual'
      ? `Renews at ${annualPrice}/year. Your annual billing choice will be preserved.`
      : `Renews at ${monthlyPrice}/month in 30 days. Cancel anytime.`

  useEffect(() => {
    trackEvent('checkout_cancelled', {
      tier,
      billing,
      intro,
      private_offer: privatePackPromo,
      return_to_watermark: returnToWatermark,
      intent_campaign: intentCampaign,
    })
  }, [tier, billing, intro, privatePackPromo, returnToWatermark, intentCampaign])

  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)', fontFamily: 'var(--font-inter), Inter, system-ui, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px 20px' }}>
      <div style={{ width: '100%', maxWidth: 560, background: 'rgba(11,17,32,0.85)', border: '1px solid var(--border)', borderRadius: 22, padding: 'clamp(24px, 5vw, 36px)', boxShadow: '0 16px 60px rgba(0,0,0,.5)' }}>
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ fontSize: 'clamp(1.5rem, 4.5vw, 1.9rem)', fontWeight: 900, letterSpacing: '-0.02em', margin: 0 }}>Payment was not completed.</h1>
          <p style={{ marginTop: 10, fontSize: '0.95rem', color: 'var(--muted2)', lineHeight: 1.55 }}>Your card was not charged if checkout was not completed.</p>
          <p style={{ marginTop: 10, fontSize: '0.88rem', color: '#2997ff', fontWeight: 700 }}>Your selected plan is saved below.</p>
        </div>
        <div style={{ marginTop: 22, background: 'linear-gradient(135deg, rgba(5,150,105,.10), rgba(5,150,105,.06))', border: '1px solid rgba(5,150,105,.30)', borderRadius: 16, padding: 18 }}>
          <p style={{ fontSize: '0.92rem', color: 'var(--text)', fontWeight: 700, margin: 0 }}>{planName} — {todayPrice}</p>
          <p style={{ fontSize: '0.82rem', color: 'var(--muted2)', margin: '4px 0 14px', lineHeight: 1.5 }}>{renewalCopy}</p>
          {/* KINEO-CHECKOUT-TRIAGE-2026-07-25 — the visible href must NOT be the
              checkout API: prefetch, middle-click and link scanners follow it and
              bypass the latch entirely. The real destination stays in
              checkout.launch(); the href is only the no-JS / new-tab fallback. */}
          <a
            href="/pricing"
            aria-disabled={checkout.pending !== null}
            onClick={(e) => {
              e.preventDefault()
              const started = checkout.launch(tier, retryHref, {
                tier,
                billing,
                intro,
                private_offer: privatePackPromo,
              })
              if (!started) return
              trackEvent(`${tier}_checkout_retry_clicked`, {
                tier,
                billing,
                intro,
                private_offer: privatePackPromo,
                return_to_watermark: returnToWatermark,
                intent_campaign: intentCampaign,
              })
              trackCheckoutClick(tier)
            }}
            style={{ display: 'block', textAlign: 'center', textDecoration: 'none', padding: '13px 14px', borderRadius: 12, fontSize: '0.9rem', fontWeight: 900, color: '#fff', background: 'linear-gradient(135deg, #2997ff, #1d6fe0)', boxShadow: '0 8px 24px rgba(41,151,255,.28)', opacity: checkout.pending !== null ? 0.7 : 1, cursor: checkout.pending !== null ? 'wait' : 'pointer' }}
          >
            {checkout.pending !== null ? 'Opening secure checkout…' : 'Try secure checkout again →'}
          </a>
          {checkout.error && (
            <p role="alert" style={{ marginTop: 10, fontSize: '0.8rem', color: '#ff6b6b', fontWeight: 700, textAlign: 'center' }}>
              {checkout.error}
            </p>
          )}
          {/* KINEO-CHECKOUT-REASSURANCE-2026-08-03 — a garantia estava em toda a
              jornada MENOS aqui, na página onde o hesitante aterrissa. */}
          <p style={{ marginTop: 10, fontSize: '0.8rem', color: 'var(--muted2)', textAlign: 'center', fontWeight: 600 }}>
            7-day money-back guarantee · cancel anytime in one click
          </p>
        </div>
        {/* ═══════════════════════════════════════════════════════════════
            KINEO-CANCEL-REASON-2026-08-03 — POR QUE ESTE SURVEY EXISTE.
            Autópsia no Stripe (03/08): ZERO declines reais de clientes
            externos — quem não paga está desistindo sem digitar o cartão, e
            nós não fazemos ideia do motivo. Três botões, um clique, evento
            checkout_cancel_reason no funil. É a instrumentação mais barata
            que existe para a maior perda do funil (16 abrem → 1 paga).
            Nenhuma resposta é obrigatória; a página funciona igual sem tocar. */}
        {reasonSent === null ? (
          <div style={{ marginTop: 16, textAlign: 'center' }}>
            <p style={{ fontSize: '0.82rem', color: 'var(--muted2)', fontWeight: 700, margin: '0 0 10px' }}>
              Mind telling us what stopped you?
            </p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
              {([
                ['price', 'Price'],
                ['just_looking', 'Just looking'],
                ['had_questions', 'I had questions'],
              ] as const).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => {
                    setReasonSent(value)
                    trackEvent('checkout_cancel_reason', { tier, reason: value })
                  }}
                  style={{ padding: '8px 14px', borderRadius: 999, fontSize: '0.8rem', fontWeight: 700, color: 'var(--text)', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', cursor: 'pointer' }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <p style={{ marginTop: 16, textAlign: 'center', fontSize: '0.82rem', color: 'var(--muted2)', fontWeight: 600 }}>
            {reasonSent === 'had_questions'
              ? 'Thanks — email support@usekineo.com and Joseph answers personally.'
              : 'Thanks — that helps us more than you know.'}
          </p>
        )}
        <div style={{ marginTop: 18, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, fontSize: '0.85rem' }}>
          <Link href={intentCampaign ? `/pricing?intent_campaign=${encodeURIComponent(intentCampaign)}` : '/pricing'} style={{ color: '#2997ff', textDecoration: 'none', fontWeight: 700 }}>← Go back to pricing</Link>
          <a href="mailto:support@usekineo.com" style={{ color: 'var(--muted2)', textDecoration: 'none', fontWeight: 600 }}>Contact support</a>
        </div>
      </div>
    </main>
  )
}
