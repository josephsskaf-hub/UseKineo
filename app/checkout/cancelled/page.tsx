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
import {
  coercePriceRegion,
  formatCheckoutMoney,
  getAnnualPrice,
  getIntroPrice,
  getTierPrice,
  hasIntroOffer,
  isRegionalTier,
  type CheckoutCurrency,
  type CheckoutTier,
} from '@/lib/checkoutPricing'
import { useFreeTierOffer } from '@/components/FreeTierOfferProvider'
import { swapFreeTierCopy as ft } from '@/lib/freeTierOffer'

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
  const monthlyPrice = monthlyOf(tier)
  const annualPrice = money(getAnnualPrice(tier, checkoutCurrency, priceRegion))
  // O 1º mês só existe onde REALMENTE existe desconto: na região `value` o
  // Starter não tem intro, e escrever "First month X" ali seria a diferença
  // entre uma página de preço e uma cobrança-surpresa.
  const introPrice =
    isRegionalTier(tier) && hasIntroOffer(tier, checkoutCurrency, priceRegion)
      ? money(getIntroPrice(tier, checkoutCurrency, priceRegion))
      : null
  const privateFirstLabel = checkoutCurrency === 'usd' ? 'US$5' : 'the verified private price'
  const todayPrice = billing === 'annual'
    ? `${annualPrice}/year`
    : privatePackPromo
      ? `${privateFirstLabel} today`
      : introEligible && introPrice
        ? `${introPrice} today`
        : `${monthlyPrice}/month`
  const renewalCopy = privatePackPromo
    ? `Renews at ${monthlyOf('basic')}/month in 30 days. Cancel anytime.`
    : introEligible
    ? `Renews at ${monthlyPrice}/month in 30 days. Cancel anytime.`
    : billing === 'annual'
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
  const cheaperTier: CheckoutTier | null =
    tier === 'pro' ? 'basic' : tier === 'basic' ? 'starter' : null
  const cheaperIntro =
    cheaperTier && isRegionalTier(cheaperTier) && hasIntroOffer(cheaperTier, checkoutCurrency, priceRegion)
      ? money(getIntroPrice(cheaperTier, checkoutCurrency, priceRegion))
      : null
  const cheaperName = cheaperTier === 'starter' ? 'Starter' : 'Creator'
  const cheaperParams = new URLSearchParams({ tier: cheaperTier ?? 'starter', billing: 'monthly' })
  if (cheaperIntro) cheaperParams.set('intro', '1')
  if (returnToWatermark) cheaperParams.set('return', 'wm')
  if (intentCampaign) cheaperParams.set('intent_campaign', intentCampaign)
  const cheaperHref = `/api/stripe/checkout?${cheaperParams.toString()}`

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
        <div style={{ marginTop: 16 }}>
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
                cheaperTier ? (
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
                        const started = checkout.launch(cheaperTier, cheaperHref, {
                          tier: cheaperTier,
                          billing: 'monthly',
                          intro: Boolean(cheaperIntro),
                          private_offer: false,
                        })
                        if (!started) return
                        trackEvent('checkout_downgrade_offer_clicked', {
                          from_tier: tier,
                          to_tier: cheaperTier,
                          intro: Boolean(cheaperIntro),
                        })
                        trackCheckoutClick(cheaperTier)
                      }}
                      style={{ display: 'block', textAlign: 'center', textDecoration: 'none', padding: '11px 14px', borderRadius: 12, fontSize: '0.85rem', fontWeight: 900, color: '#fff', background: 'linear-gradient(135deg, #059669, #047857)' }}
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
                      href="/generate"
                      onClick={() => trackEvent('checkout_free_path_clicked', { tier, reason: 'too_expensive' })}
                      style={{ display: 'block', textAlign: 'center', textDecoration: 'none', padding: '11px 14px', borderRadius: 12, fontSize: '0.85rem', fontWeight: 900, color: '#fff', background: 'linear-gradient(135deg, #059669, #047857)' }}
                    >
                      Make a free Short instead →
                    </Link>
                  </>
                )
              )}

              {reasonSent === 'which_plan' && (
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
              )}

              {reasonSent === 'had_questions' && (
                <>
                  <p style={{ margin: 0, fontSize: '0.88rem', fontWeight: 800, color: 'var(--text)' }}>
                    The two we get most:
                  </p>
                  <p style={{ margin: '8px 0 0', fontSize: '0.82rem', color: 'var(--muted2)', lineHeight: 1.6 }}>
                    <strong style={{ color: 'var(--text)' }}>Can I cancel?</strong> One click from your
                    dashboard, anytime — and the first 7 days are money-back.
                  </p>
                  <p style={{ margin: '8px 0 12px', fontSize: '0.82rem', color: 'var(--muted2)', lineHeight: 1.6 }}>
                    <strong style={{ color: 'var(--text)' }}>Is it really watermark-free?</strong> Yes. Paid
                    plans export a clean 9:16 MP4 you upload straight to Shorts, TikTok and Reels.
                  </p>
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
                  <p style={{ margin: '6px 0 12px', fontSize: '0.82rem', color: 'var(--muted2)', lineHeight: 1.55 }}>
                    {ft(OFFER, 'Make up to 3 Fast videos every 24h on the free account, no card.', 'Use your trial credits — 40 free credits on signup, no card.')} If one of them is good
                    enough to post, that&apos;s the only argument for paying that actually works.
                  </p>
                  <Link
                    href="/generate"
                    onClick={() => trackEvent('checkout_free_path_clicked', { tier, reason: 'just_looking' })}
                    style={{ display: 'block', textAlign: 'center', textDecoration: 'none', padding: '11px 14px', borderRadius: 12, fontSize: '0.85rem', fontWeight: 900, color: '#fff', background: 'linear-gradient(135deg, #059669, #047857)' }}
                  >
                    Make a free Short →
                  </Link>
                </>
              )}
            </div>
          )}
        </div>
        <div style={{ marginTop: 18, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, fontSize: '0.85rem' }}>
          <Link href={intentCampaign ? `/pricing?intent_campaign=${encodeURIComponent(intentCampaign)}` : '/pricing'} style={{ color: '#2997ff', textDecoration: 'none', fontWeight: 700 }}>← Go back to pricing</Link>
          <a href="mailto:support@usekineo.com" style={{ color: 'var(--muted2)', textDecoration: 'none', fontWeight: 600 }}>Contact support</a>
        </div>
      </div>
    </main>
  )
}
