'use client'

import KineoBolt from '@/components/KineoBolt'
import CreditMinutesSummary from '@/components/CreditMinutesSummary'

// KINEO-TOPUP-POPUP-2026-08-18 — tarefa do dia (fundador): "adicionar o pop
// de crédito caso a pessoa que gaste seus créditos queira mais SEM trocar de
// plano". Até hoje os packs one-time (topup40/120/100) só existiam enterrados
// no modal do /generate antigo; quem zerava créditos no Studio/Images/Audio
// batia num beco: erro de texto ou um link pro /pricing (que vende PLANO, não
// crédito). Este modal é a superfície única de recarga:
//   · Sidebar: o chip de créditos (+) abre isto em vez de navegar pro pricing
//   · Images/Audio: o 402 "Not enough credits" abre isto direto
// Regras herdadas das outras superfícies de venda (mesma tabela, mesma moeda):
//   · preços SEMPRE de TOPUP_PRICES/TOPUP_CREDITS (a tabela que a rota Stripe
//     cobra) — nunca dígitos à mão (causa-raiz de 3 bugs de pricing passados)
//   · moeda via /api/geo com '—' enquanto resolve (nunca mostrar USD e trocar
//     o número na cara do comprador)
//   · checkout via useCheckoutLaunch (telemetria + guard de duplo clique)
// KINEO-BARRA-DE-CREDITOS-2026-09-23 (fundador: "não quero 4 blocos... uma linha em que a pessoa puxa a bolinha e escolhe
// quantos créditos quer"): os 4 pacotes fixos viraram UMA barra de 50 a 2.000 créditos. Preço da escada aprovada em
// lib/credits/creditSlider (a MESMA função que a rota da Stripe usa para cobrar — aqui só se mostra). Os ids antigos
// (topup40/120/100/300) seguem vendáveis por link direto; só saíram desta vitrine.
import { useEffect, useState } from 'react'
import {
  formatCheckoutMoney,
  type CheckoutCurrency,
} from '@/lib/checkoutPricing'
import { useCheckoutLaunch } from '@/lib/checkoutTelemetry'
import {
  CREDIT_SLIDER_DEFAULT, CREDIT_SLIDER_MAX, CREDIT_SLIDER_MIN, CREDIT_SLIDER_PACK_ID, CREDIT_SLIDER_STEP, sliderPriceUsdMinor,
} from '@/lib/credits/creditSlider'

export default function CreditsTopupModal({
  onClose,
  surface,
}: {
  onClose: () => void
  /** telemetry surface, e.g. 'sidebar_chip' | 'images_402' | 'audio_402' */
  surface: string
}) {
  const checkout = useCheckoutLaunch(`credits_topup_modal_${surface}`)
  const [currency, setCurrency] = useState<CheckoutCurrency | null>(null)
  const [credits, setCredits] = useState<number | null>(null)
  const [amount, setAmount] = useState<number>(CREDIT_SLIDER_DEFAULT)

  // Moeda do comprador — mesma regra do UpgradeModal/PricingCards: rótulo
  // segura no '—' até o /api/geo responder; a COBRANÇA é re-resolvida
  // server-side pelo IP de qualquer forma.
  useEffect(() => {
    let cancelled = false
    void fetch('/api/geo', { credentials: 'same-origin', cache: 'no-store' })
      .then(async (r) => (r.ok ? (r.json() as Promise<{ currency?: string }>) : Promise.reject()))
      .then(({ currency: c }) => {
        if (!cancelled) setCurrency('usd') // KINEO-USD-ONLY-2026-08-19
      })
      .catch(() => {
        if (!cancelled) setCurrency('usd')
      })
    return () => {
      cancelled = true
    }
  }, [])

  // Saldo atual — best effort, só pro cabeçalho ("You have N credits left").
  useEffect(() => {
    let cancelled = false
    void fetch('/api/credits', { cache: 'no-store' })
      .then(async (r) => (r.ok ? (r.json() as Promise<{ credits?: number }>) : Promise.reject()))
      .then((d) => {
        if (!cancelled && typeof d.credits === 'number') setCredits(d.credits)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center p-4"
      // KINEO-TOPUP-UX-2026-09-01 (pedido do fundador, com print): o fundo
      // 88% preto + blur 20px APAGAVA o dashboard — o modal parecia uma tela
      // nova, não uma caixa sobre a tela dele. Véu leve: o dashboard continua
      // visível escurecido atrás, como era antes.
      style={{ background: 'rgba(13,21,32,.55)', backdropFilter: 'blur(6px)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
      aria-label="Add credits"
    >
      <div
        className="w-full max-w-lg rounded-2xl p-7 relative"
        style={{ background: 'var(--card)', border: '1px solid var(--border)', boxShadow: '0 0 80px rgba(0,0,0,.5)', maxHeight: 'calc(100dvh - 32px)', overflowY: 'auto' }}
      >
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute top-4 right-4 w-8 h-8 rounded-lg flex items-center justify-center text-sm"
          style={{ background: 'var(--card2)', border: '1px solid var(--border)', color: 'var(--muted)', cursor: 'pointer' }}
        >
          <span aria-hidden="true">✕</span>
        </button>

        <div
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold mb-3"
          style={{ background: 'rgba(143,198,255,.12)', border: '1px solid rgba(143,198,255,.25)', color: 'var(--accent)' }}
        >
          <span aria-hidden="true"><KineoBolt /></span>
          {credits !== null ? `${credits} ${credits === 1 ? 'credit' : 'credits'} left` : 'Credits'}
        </div>

        <h2 className="text-2xl font-black mb-1 tracking-tight" style={{ color: 'var(--text)' }}>
          Keep your plan. <span className="grad-text">Add credits.</span>
        </h2>
        <p className="text-sm mb-6" style={{ color: 'var(--muted)' }}>
          One-time packs, added to your balance instantly after payment. No subscription change.
        </p>

        {(() => {
          const priceMinor = sliderPriceUsdMinor(amount) ?? 0
          const price = currency ? formatCheckoutMoney(currency, priceMinor) : '—'
          const perCredit = currency ? formatCheckoutMoney(currency, Math.round(priceMinor / amount * 100) / 100) : '—'
          const pct = ((amount - CREDIT_SLIDER_MIN) / (CREDIT_SLIDER_MAX - CREDIT_SLIDER_MIN)) * 100
          return (
            <div data-kineo="credit-slider">
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                <div>
                  <span style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--text)', letterSpacing: '-0.02em' }}>+{amount.toLocaleString('en-US')}</span>
                  <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--muted)', marginLeft: 6 }}>credits</span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ display: 'block', fontSize: '1.6rem', fontWeight: 900, color: 'var(--accent)' }}>{price}</span>
                  <span style={{ display: 'block', fontSize: '0.7rem', color: 'var(--muted)' }}>{perCredit} per credit · one-time</span>
                </div>
              </div>
              <input
                id="credit-slider"
                type="range"
                min={CREDIT_SLIDER_MIN}
                max={CREDIT_SLIDER_MAX}
                step={CREDIT_SLIDER_STEP}
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                aria-label="Credits to add"
                aria-valuetext={`${amount} credits for ${price}`}
                disabled={checkout.pending !== null}
                style={{
                  width: '100%', margin: '18px 0 6px', accentColor: '#2997ff', cursor: 'pointer',
                  background: `linear-gradient(90deg, #2997ff ${pct}%, var(--border) ${pct}%)`, height: 6, borderRadius: 999,
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.66rem', color: 'var(--muted)' }}>
                <span>{CREDIT_SLIDER_MIN}</span><span>500</span><span>1,000</span><span>{CREDIT_SLIDER_MAX.toLocaleString('en-US')}</span>
              </div>
              <CreditMinutesSummary credits={amount} live />
              <button
                type="button"
                disabled={checkout.pending !== null}
                onClick={() => {
                  checkout.launch(CREDIT_SLIDER_PACK_ID, `/api/stripe/checkout?pack=${CREDIT_SLIDER_PACK_ID}&credits=${amount}`, {
                    pack: CREDIT_SLIDER_PACK_ID,
                    credits: amount,
                    pricing_surface: `credits_topup_modal_${surface}`,
                  })
                }}
                style={{
                  width: '100%', marginTop: 16, padding: '14px 16px', borderRadius: 14, border: 'none',
                  background: '#2997ff', color: '#fff', fontSize: '0.95rem', fontWeight: 900,
                  cursor: checkout.pending ? 'not-allowed' : 'pointer', opacity: checkout.pending ? 0.6 : 1,
                }}
              >
                {checkout.pending === CREDIT_SLIDER_PACK_ID ? 'Loading…' : `Buy ${amount.toLocaleString('en-US')} credits — ${price}`}
              </button>
            </div>
          )
        })()}

        {checkout.error && (
          <p role="alert" style={{ fontSize: '0.74rem', fontWeight: 600, color: '#ff6b6b', textAlign: 'center', margin: '10px 0 0' }}>
            {checkout.error}
          </p>
        )}

        <p style={{ fontSize: '0.74rem', color: 'var(--muted)', textAlign: 'center', margin: '16px 0 0' }}>
          Need more every month?{' '}
          <a href="/pricing" style={{ color: 'var(--accent)', fontWeight: 700, textDecoration: 'none' }}>
            Upgrade your plan →
          </a>
        </p>
      </div>
    </div>
  )
}
