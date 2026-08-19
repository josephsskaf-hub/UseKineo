'use client'

// Push #060 — smart paywall shown right after a successful generation,
// only when the user's remaining credit balance is at or below 15
// (KINEO-REBASE-2026-07-10 — was 30 pre-rebase; 2:1 credit rebase). Two
// Stripe-hosted launch-offer links (same as PricingCards) for Basic and
// Pro. Dismiss link keeps the result page usable for users who don't
// want to upgrade yet.
//
// Push #114 — CTAs now POST to /api/stripe/checkout instead of opening
// the hardcoded buy.stripe.com links. The hosted links were USD-only and
// BR cards were getting rejected ("Seu cartão não aceita essa moeda");
// the server route applies BRL via x-vercel-ip-country (#112).

import { useState } from 'react'
import { PLANS } from '@/lib/pricing'
// KINEO-PILOT-99-2026-07-26 — em USD, igual ao resto deste card (PLANS.*.priceLabel
// também é USD fixo). O checkout continua resolvendo a moeda no servidor.
import { AUTOPILOT_PILOT_DAYS, AUTOPILOT_PILOT_PRICES, PACK_CREDITS, formatCheckoutMoney } from '@/lib/checkoutPricing'
// KINEO-PRICING-V6-2026-08-19 — contagem de vídeos derivada do grant do plano.
import { STUDIO_CINEMATIC_FILMS } from '@/lib/marketingPrice'
import { trackEvent } from '@/lib/analytics'
import { useCheckoutLaunch } from '@/lib/checkoutTelemetry'

interface PostVideoPaywallProps {
  // Current credit balance after the most recent generation. The parent
  // gates rendering on credits ≤ 15 (KINEO-REBASE-2026-07-10); we still
  // re-check here as a safety net so the card never shows for healthy balances.
  credits: number
}

// Push #063 — fire-and-forget checkout click tracking so the paywall feeds
// into /admin/funnel. Silently no-ops when public.events isn't present.
//
// KINEO-CHECKOUT-TRIAGE-2026-07-25 — este helper usava fetch('/api/events')
// CRU, sem session_id. Resultado em produção: basic_checkout_clicked (16
// eventos), pro_checkout_clicked (23) e starter_pack_checkout_clicked (40) com
// ZERO sessões distintas — impossível ligar um clique ao checkout_attempted que
// o servidor grava. trackEvent() sempre anexa kineo_event_session_id, que é o
// MESMO id que o route handler lê do cookie. Uma única fonte de verdade.
function trackCheckoutClick(tier: 'basic' | 'pro'): void {
  try {
    void trackEvent(tier === 'basic' ? 'basic_checkout_clicked' : 'pro_checkout_clicked', {
      source: 'post_video_paywall',
      tier,
    })
  } catch {
    // ignore
  }
}

export default function PostVideoPaywall({ credits }: PostVideoPaywallProps) {
  const [dismissed, setDismissed] = useState(false)
  // Push #077 — Pro selected by default. Card click selects, CTA navigates.
  const [selectedPlan, setSelectedPlan] = useState<'basic' | 'pro' | null>('pro')
  // Push #114 — CTAs go through /api/stripe/checkout, so we need a busy
  // flag to disable the buttons + show a "Loading…" label while the
  // session is being created.
  // KINEO-CHECKOUT-TRIAGE-2026-07-25 — useState alone was not enough: React had
  // not repainted the disabled button when the second click landed, and the
  // Starter Pack button below had no busy state at all (7 Stripe sessions in
  // 2.8 s from one account). useCheckoutLaunch adds a synchronous ref latch, a
  // redirect watchdog and an inline error.
  const checkout = useCheckoutLaunch('post_video_paywall')
  const purchasing = checkout.pending

  // Push #175 — use direct GET navigation (same fix as PricingCards #173).
  // Avoids iOS Safari gesture-chain break from async fetch/await and
  // removes the broken /generate redirect on already-subscribed.
  function handleBuy(tier: 'basic' | 'pro') {
    // #471 — carry the founding 50%-off promo (same as the wall modal) so the
    // inline post-video paywall converts at the same discount.
    // ⚠️ KINEO-PRICING-V6-2026-08-19 — `&promo=FOUNDING50` REMOVIDO, e não é
    // só coerência com a copy que acabou de sair daqui. O código não é
    // auto-provisionado (só FIRST50/COMEBACK50 são): ele resolve de um
    // promotion code que pode ou não continuar ativo na Stripe. Se continuar,
    // metade da 1ª fatura do Creator = líquido $7.28 contra um COGS de pior
    // caso de $9.86 nos 90 créditos concedidos — venda com prejuízo, aplicada
    // em silêncio, sem nenhuma tela mencionando desconto. Deixar um cupom
    // pendurado numa URL sem copy que o justifique é dinheiro saindo por uma
    // porta que ninguém está olhando. Preço cheio, igual ao resto do produto.
    const started = checkout.launch(tier, `/api/stripe/checkout?tier=${tier}`, {
      pricing_surface: 'post_video_paywall',
    })
    if (started) trackCheckoutClick(tier)
  }

  if (dismissed) return null
  if (credits > 15) return null // KINEO-REBASE-2026-07-10 — 30 → 15 (2:1 rebase)

  return (
    <section
      className="rounded-2xl p-5 sm:p-6 mb-6 relative overflow-hidden"
      style={{
        background: '#161618',
        border: '1px solid #2a2a2d',
        boxShadow: 'none',
      }}
    >
      <div className="text-center mb-5">
        <div
          className="text-[10px] font-black uppercase tracking-widest mb-1"
          style={{ color: '#2997ff' }}
        >
          Keep creating
        </div>
        <h3
          className="font-black tracking-tight mb-1"
          style={{ fontSize: '1.25rem', color: 'var(--text)' }}
        >
          Your Short is ready. Unlock your Creator Pack.
        </h3>
        {/* ⚠️ KINEO-PRICING-V6-2026-08-19 — "Founding offer: 50% off your first
            month" SAIU. Não era mais uma frase de marketing otimista: era uma
            afirmação sobre a PRIMEIRA FATURA, e a primeira fatura passou a ser
            o preço cheio (INTRO_PRICES == TIER_PRICES desde 17/08). A pessoa
            lia "metade do preço", clicava, e o Stripe cobrava o dobro do que
            ela acabara de ler — no cartão, não numa landing. É a diferença
            entre uma oferta e uma cobrança-surpresa. O que sobrou é o que
            continua sendo verdade e não depende de tabela nenhuma. */}
        <p className="text-xs" style={{ color: 'var(--muted)' }}>
          {credits} credit{credits === 1 ? '' : 's'} left.{' '}
          <span style={{ color: '#f5f5f7', fontWeight: 800 }}>Same price every month</span>
          {' '}· cancel anytime · 7-day money-back.
        </p>
      </div>

      <div
        className="grid gap-3 mb-3"
        style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}
      >
        <PlanCard
          tier="basic"
          name={PLANS.basic.name}
          price={PLANS.basic.priceLabel}
          renew={PLANS.basic.periodLabel}
          features={[
            `${PLANS.basic.credits} credits / month`,
            'Email support',
          ]}
          ctaLabel={
            purchasing === 'basic'
              ? 'Loading…'
              : selectedPlan === 'basic'
                ? 'Continue with Basic →'
                : 'Start Basic →'
          }
          onClick={() => handleBuy('basic')}
          loading={purchasing === 'basic'}
          busy={purchasing !== null}
          selected={selectedPlan === 'basic'}
          onSelect={() => setSelectedPlan('basic')}
        />
        <PlanCard
          tier="pro"
          name={PLANS.pro.name}
          price={PLANS.pro.priceLabel}
          renew={PLANS.pro.periodLabel}
          features={[
            `${PLANS.pro.credits} credits / month`,
            // KINEO-PRICING-V6-2026-08-19 — era "1 Cinematic AI video / month",
            // literal e subestimado (160 créditos pagam 3 Kling 2.5). Derivado.
            `${STUDIO_CINEMATIC_FILMS} cinematic AI videos / month`,
            'Download without watermark',
          ]}
          ctaLabel={
            purchasing === 'pro'
              ? 'Loading…'
              : selectedPlan === 'pro'
                ? 'Continue with Pro →'
                : 'Start Pro →'
          }
          onClick={() => handleBuy('pro')}
          loading={purchasing === 'pro'}
          busy={purchasing !== null}
          highlight
          selected={selectedPlan === 'pro'}
          onSelect={() => setSelectedPlan('pro')}
        />
      </div>

      {/* ROBO-ENTRY-490 (Joseph aprovou 30/06) — lowest-commitment option on the
          post-Short nudge. A free user who just made their first Short faces a
          big jump straight to a monthly plan; the $4.90 one-time pack is a far
          easier first "yes". Same checkout as the 0-credit modal + /pricing.
          KINEO-PRICING-V6-2026-08-19 — o "$24.90/mo" desta nota morreu (Creator
          é $15). O PREÇO do pack ($4.90) NÃO mudou na V6 e continua literal
          porque não existe constante exportada para ele; o que passou a ser
          derivado é a QUANTIDADE: o pack concede PACK_CREDITS.starter (30)
          créditos, e a copy vendia "10 videos" desde antes do rebase. */}
      <button
        type="button"
        disabled={purchasing !== null}
        onClick={() => {
          const started = checkout.launch('starter_pack', '/api/stripe/checkout?pack=starter', {
            sku: 'starter10',
          })
          if (started) {
            try {
              void trackEvent('starter_pack_checkout_clicked', { source: 'post_video_paywall' })
            } catch { /* non-blocking */ }
          }
        }}
        className="block w-full rounded-xl px-4 py-3 mb-3 text-center"
        style={{
          background: 'rgba(41,151,255,0.06)',
          border: '1px dashed rgba(41,151,255,0.4)',
          color: '#f5f5f7',
          fontSize: '0.86rem',
          fontWeight: 800,
          lineHeight: 1.35,
          cursor: purchasing !== null ? 'wait' : 'pointer',
          opacity: purchasing !== null ? 0.7 : 1,
        }}
      >
        {purchasing === 'starter_pack' ? (
          'Opening secure checkout…'
        ) : (
          <>
            Not ready for a monthly plan?{' '}
            <span style={{ color: '#2997ff' }}>Start with {PACK_CREDITS.starter} credits for $4.90 →</span>
            <span style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: '#86868b', marginTop: 2 }}>
              One-time · no subscription · credits never expire
            </span>
          </>
        )}
      </button>

      {/* ══════════════════════════════════════════════════════════════════
          KINEO-PILOT-99-2026-07-26 — AUTOPILOT PILOT.

          This is the highest-intent surface in the product: the user has just
          watched a Short they made and is looking at how few credits are left.
          It had zero Autopilot presence — every option above sells them MORE
          WORK. 82% of activated users make exactly one video and leave, so for
          most people reading this the honest offer is "stop making them".

          Placed BELOW the $4.90 pack on purpose: the pack is the cheap yes,
          this is the different yes. Promise is exactly what the cron ships.
          ══════════════════════════════════════════════════════════════════ */}
      <button
        type="button"
        disabled={purchasing !== null}
        onClick={() => {
          const started = checkout.launch('autopilot_pilot', '/api/stripe/checkout?pack=autopilot_pilot', {
            sku: 'autopilot_pilot',
          })
          if (started) {
            try {
              void trackEvent('autopilot_pilot_checkout_clicked', { source: 'post_video_paywall' })
            } catch { /* non-blocking */ }
          }
        }}
        className="block w-full rounded-xl px-4 py-3 mb-3 text-center"
        style={{
          background: 'rgba(41,151,255,0.06)',
          border: '1px dashed rgba(41,151,255,0.4)',
          color: '#f5f5f7',
          fontSize: '0.86rem',
          fontWeight: 800,
          lineHeight: 1.35,
          cursor: purchasing !== null ? 'wait' : 'pointer',
          opacity: purchasing !== null ? 0.7 : 1,
        }}
      >
        {purchasing === 'autopilot_pilot' ? (
          'Opening secure checkout…'
        ) : (
          <>
            Don&apos;t want to make the next one?{' '}
            <span style={{ color: '#2997ff' }}>
              We&apos;ll publish {AUTOPILOT_PILOT_DAYS} to your YouTube for{' '}
              {formatCheckoutMoney('usd', AUTOPILOT_PILOT_PRICES.usd)} →
            </span>
            <span style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: '#86868b', marginTop: 2 }}>
              One per day, at the time you pick · one-time, no auto-renew · an agency
              charges ~$217 for {AUTOPILOT_PILOT_DAYS} Shorts
            </span>
          </>
        )}
      </button>

      {/* KINEO-CHECKOUT-TRIAGE-2026-07-25 — silent failure is what produced the
          repeat-click bursts. Any checkout that does not open now says so. */}
      {checkout.error && (
        <p
          role="alert"
          className="text-xs text-center mb-3"
          style={{ color: '#ff6b6b', fontWeight: 700 }}
        >
          {checkout.error}
        </p>
      )}

      <div className="text-center">
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="text-xs font-bold"
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--muted)',
            cursor: 'pointer',
            textDecoration: 'underline',
          }}
        >
          Continue with current plan
        </button>
      </div>
    </section>
  )
}

function PlanCard({
  tier,
  name,
  price,
  renew,
  features,
  ctaLabel,
  highlight,
  onClick,
  loading,
  busy,
  selected,
  onSelect,
}: {
  tier: 'basic' | 'pro'
  name: string
  price: string
  renew: string
  features: string[]
  ctaLabel: string
  highlight?: boolean
  onClick?: () => void
  loading?: boolean
  // Some other checkout on this card is already navigating to Stripe.
  busy?: boolean
  selected?: boolean
  onSelect?: () => void
}) {
  const isSelected = !!selected

  function background(): string {
    if (isSelected) return '#1d1d1f'
    if (highlight) return '#1d1d1f'
    return '#161618'
  }
  function border(): string {
    if (isSelected) return '2px solid #2997ff'
    if (highlight) return '2px solid #48484a'
    return '1px solid #2a2a2d'
  }
  function shadow(): string {
    if (isSelected) return '0 0 28px rgba(41,151,255,0.18)'
    if (highlight) return 'none'
    return 'none'
  }

  return (
    <div
      role="button"
      tabIndex={0}
      aria-pressed={isSelected}
      onClick={() => {
        if (onSelect) onSelect()
      }}
      onKeyDown={(e) => {
        if (!onSelect) return
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onSelect()
        }
      }}
      className="rounded-xl p-4 flex flex-col relative transition-all duration-200"
      style={{
        background: background(),
        border: border(),
        boxShadow: shadow(),
        cursor: 'pointer',
      }}
      onMouseEnter={(e) => {
        if (isSelected) return
        e.currentTarget.style.borderColor = '#48484a'
        e.currentTarget.style.background = '#1d1d1f'
        e.currentTarget.style.boxShadow = 'none'
      }}
      onMouseLeave={(e) => {
        if (isSelected) return
        e.currentTarget.style.background = background()
        e.currentTarget.style.border = border()
        e.currentTarget.style.boxShadow = shadow()
      }}
    >
      {isSelected && (
        <div
          className="absolute top-3 right-3 flex items-center justify-center rounded-full"
          style={{
            width: 22, height: 22,
            background: '#2997ff',
            color: '#FFFFFF',
            boxShadow: 'none',
          }}
          aria-label="Selected"
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      )}
      <div
        className="text-xs font-black uppercase tracking-widest mb-1"
        style={{ color: highlight ? '#2997ff' : 'var(--muted)' }}
      >
        {name}
      </div>
      <div
        className="font-black"
        style={{ fontSize: '1.1rem', color: 'var(--text)', lineHeight: 1.15 }}
      >
        {price}
      </div>
      <p className="text-[11px] mt-0.5 mb-3" style={{ color: '#86868b', fontWeight: 700 }}>
        {renew}
      </p>
      <ul className="flex flex-col gap-1.5 mb-4 flex-1">
        {features.map((f) => (
          <li
            key={f}
            className="flex items-start gap-2 text-xs"
            style={{ color: 'var(--text2)' }}
          >
            <span style={{ color: '#2997ff', marginTop: 1 }}>✓</span>
            <span>{f}</span>
          </li>
        ))}
      </ul>
      <button
        type="button"
        disabled={!!loading || !!busy}
        onClick={(e) => {
          e.stopPropagation()
          if (onSelect) onSelect()
          if (onClick) onClick()
        }}
        className="rounded-xl py-2.5 text-sm font-black text-center"
        style={{
          background: '#f5f5f7',
          color: '#000',
          boxShadow: 'none',
          border: 'none',
          cursor: loading || busy ? 'wait' : 'pointer',
          opacity: loading || busy ? 0.7 : 1,
        }}
      >
        {ctaLabel}
      </button>
    </div>
  )
}
