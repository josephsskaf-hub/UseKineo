'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { TIER_CREDITS, TIER_PRICES, formatCheckoutMoney, getTierPrice, coercePriceRegion, type CheckoutCurrency, type PriceRegion } from '@/lib/checkoutPricing'
import { videosPerMonth } from '@/lib/marketingPrice'

// KINEO-CHECKOUT-TRIAGE-2026-07-25 — this modal advertised a hardcoded
// "$11.90/mo" that no plan has charged for two pricing generations. Derived
// from lib/checkoutPricing (the same table the Stripe route bills from) so it
// can never drift again. USD is the display default here; the checkout itself
// still resolves the buyer's real currency server-side by IP.
const STARTER_FROM_PRICE = formatCheckoutMoney('usd', TIER_PRICES.starter.usd)
// KINEO-REGIONAL-VITRINE-2026-08-19 — o modal e superficie de venda batida e
// dizia "$9.90" pra todo mundo; regiao value ve o preco regional real.

interface UpgradeModalProps {
  onClose: () => void
  generationsUsed: number
}

export default function UpgradeModal({ onClose }: UpgradeModalProps) {
  const router = useRouter()
  const [fromPrice, setFromPrice] = useState(STARTER_FROM_PRICE)
  useEffect(() => {
    let cancelled = false
    void fetch('/api/geo', { credentials: 'same-origin', cache: 'no-store' })
      .then(async (r) => (r.ok ? (r.json() as Promise<{ currency?: string; region?: string }>) : Promise.reject()))
      .then(({ currency, region }) => {
        if (cancelled) return
        const cur: CheckoutCurrency = 'usd' // KINEO-USD-ONLY-2026-08-19
        const reg: PriceRegion = coercePriceRegion(region)
        setFromPrice(formatCheckoutMoney(cur, getTierPrice('starter', cur, reg)))
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  // Accessibility: close on Escape, reusing the existing onClose handler.
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(8,8,15,.88)', backdropFilter: 'blur(20px)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
      aria-label="Upgrade your plan"
    >
      <div
        className="w-full max-w-md rounded-2xl p-8 animate-fade-in text-center relative"
        style={{
          background: '#1d1d1f',
          border: '1px solid #2a2a2d',
          boxShadow: '0 0 80px rgba(0,0,0,.5)',
        }}
      >
        {/* Close */}
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute top-4 right-4 w-8 h-8 rounded-lg flex items-center justify-center text-sm transition-all"
          style={{
            background: 'rgba(255,255,255,.04)',
            border: '1px solid #2a2a2d',
            color: '#86868b',
          }}
        >
          <span aria-hidden="true">✕</span>
        </button>

        {/* Icon */}
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-5"
          style={{
            background: '#161618',
            border: '1px solid #2a2a2d',
          }}
          aria-hidden="true"
        >
          ⚡
        </div>

        <div
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold mb-3"
          style={{
            background: 'rgba(41,151,255,.12)',
            border: '1px solid rgba(41,151,255,.25)',
            color: '#2997ff',
          }}
        >
          <span aria-hidden="true">🔒</span> Free Limit Reached
        </div>

        <h2
          className="text-2xl font-black mb-2 tracking-tight"
          style={{ color: '#f5f5f7' }}
        >
          You&apos;ve used all your{' '}
          <span className="grad-text">free renders</span>
        </h2>
        <p className="text-sm mb-7" style={{ color: '#86868b' }}>
          Activate a plan to keep your pipeline running — from {fromPrice}/mo.
        </p>

        {/* Features */}
        <div
          className="rounded-xl p-4 mb-6 text-left"
          style={{
            background: '#161618',
            border: '1px solid #2a2a2d',
          }}
        >
          {[
            // KINEO-PRICING-V6-2026-08-19 — era "⚡ 50–100 Fast Mode renders /
            // month", um intervalo digitado que nunca correspondeu a plano
            // nenhum da V5 (60–320) nem da V6 (40–160). Fast custa 1 crédito
            // para conta paga, então a faixa é literalmente o menor e o maior
            // grant do catálogo — e agora ela sai deles.
            `⚡ ${videosPerMonth('starter', 'fast')}–${videosPerMonth('pro', 'fast')} Kineo 1 videos / month`,
            '🎬 AI script + voiceover pipeline',
            '🔤 Auto-captions engine',
            '📥 Watermark-free MP4 output',
            '📊 Generation history & analytics',
            '🚀 Priority render queue',
          ].map((f) => {
            const spaceIdx = f.indexOf(' ')
            const emoji = spaceIdx > -1 ? f.slice(0, spaceIdx) : ''
            const text = spaceIdx > -1 ? f.slice(spaceIdx + 1) : f
            return (
              <div
                key={f}
                className="flex items-center gap-2 py-1.5 text-sm"
                style={{ color: '#f5f5f7' }}
              >
                <span style={{ color: '#2997ff', fontSize: '0.8rem' }} aria-hidden="true">✓</span>
                <span aria-hidden="true">{emoji}</span> {text}
              </div>
            )
          })}
        </div>

        <button
          onClick={() => router.push('/pricing')}
          className="w-full rounded-xl py-4 font-black text-base mb-3 transition-all"
          style={{
            background: '#f5f5f7',
            color: '#000',
            boxShadow: 'none',
            cursor: 'pointer',
          }}
          onMouseEnter={(e) => {
            ;(e.currentTarget as HTMLElement).style.background = '#fff'
            ;(e.currentTarget as HTMLElement).style.transform = 'scale(1.02)'
          }}
          onMouseLeave={(e) => {
            ;(e.currentTarget as HTMLElement).style.background = '#f5f5f7'
            ;(e.currentTarget as HTMLElement).style.transform = 'scale(1)'
          }}
        >
          Activate Plan →
        </button>

        <button
          onClick={() => router.push('/pricing')}
          className="w-full text-sm font-medium transition-colors"
          style={{ color: '#86868b', background: 'none', border: 'none', cursor: 'pointer' }}
        >
          View pricing details →
        </button>
      </div>
    </div>
  )
}
