'use client'

import { useEffect, useState } from 'react'
import { trackEvent } from '@/lib/analytics'
import {
  AGENCY_MARKETPLACE_FEE_OPTIONS,
  DEFAULT_AGENCY_CLIENT_PRICE_MINOR,
  DEFAULT_AGENCY_MARKETPLACE_FEE_PCT,
  calculateAgencyMargin,
} from '@/lib/agencyMargin'
import type { AgencyPackView } from './AgencyPacksClient'

const VIEW_MARKER = 'kineo:agency-margin:viewed:v1'
const USD_FORMATTER = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
})

function formatUsd(minor: number): string {
  return USD_FORMATTER.format(minor / 100)
}

export default function AgencyMarginCalculator({ packs }: { packs: AgencyPackView[] }) {
  const initialPack = packs.find((pack) => pack.id === 'bulk30') ?? packs[0]
  const [selectedPackId, setSelectedPackId] = useState(initialPack?.id ?? 'bulk10')
  const [clientPrice, setClientPrice] = useState(String(DEFAULT_AGENCY_CLIENT_PRICE_MINOR / 100))
  const [marketplaceFeePct, setMarketplaceFeePct] = useState(DEFAULT_AGENCY_MARKETPLACE_FEE_PCT)

  useEffect(() => {
    try {
      if (sessionStorage.getItem(VIEW_MARKER) === '1') return
      sessionStorage.setItem(VIEW_MARKER, '1')
    } catch {
      // Privacy modes can deny sessionStorage. The calculator must still work.
    }
    void trackEvent('agency_margin_calculator_viewed', {
      version: 'agency_margin_v1_2026_08_27',
      surface: 'ai_shorts_for_agencies',
    })
  }, [])

  const selectedPack = packs.find((pack) => pack.id === selectedPackId) ?? initialPack
  if (!selectedPack) return null

  const parsedClientPrice = Number.parseFloat(clientPrice)
  const clientPriceMinor = Number.isFinite(parsedClientPrice)
    ? Math.max(0, Math.round(parsedClientPrice * 100))
    : 0
  const result = calculateAgencyMargin({
    videos: selectedPack.videos,
    packCostMinor: selectedPack.priceMinor,
    clientPriceMinor,
    marketplaceFeePct,
  })

  const inputStyle = {
    width: '100%',
    minHeight: 48,
    borderRadius: 12,
    border: '1px solid rgba(255,255,255,.15)',
    background: '#090a0d',
    color: '#f5f5f7',
    padding: '0 13px',
    fontSize: 15,
    fontWeight: 760,
  } as const

  return (
    <section
      aria-labelledby="agency-margin-heading"
      style={{
        marginTop: 64,
        padding: 'clamp(20px, 4vw, 32px)',
        borderRadius: 24,
        border: '1px solid rgba(92,179,255,.32)',
        background: 'radial-gradient(circle at 100% 0%, rgba(41,151,255,.18), transparent 38%), #101116',
      }}
    >
      <div style={{ maxWidth: 790 }}>
        <span style={{ color: '#5cb3ff', fontWeight: 900, fontSize: 11, letterSpacing: '.13em', textTransform: 'uppercase' }}>
          Client margin calculator
        </span>
        <h2 id="agency-margin-heading" style={{ color: '#f5f5f7', fontSize: 'clamp(1.65rem, 4vw, 2.45rem)', lineHeight: 1.08, margin: '10px 0 10px', fontWeight: 920 }}>
          Price the client job before you buy the production
        </h2>
        <p style={{ color: '#aaaab1', fontSize: 15, lineHeight: 1.65, margin: 0 }}>
          Use your real client rate and marketplace fee. We calculate the cash left after the platform fee and the Kineo pack — before your labor, revisions, taxes and other costs.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap: 13, marginTop: 24 }}>
        <label style={{ display: 'grid', gap: 7, color: '#c7c7cc', fontSize: 12, fontWeight: 800 }}>
          Delivery volume
          <select value={selectedPackId} onChange={(event) => setSelectedPackId(event.target.value as AgencyPackView['id'])} style={inputStyle}>
            {packs.map((pack) => (
              <option key={pack.id} value={pack.id}>{pack.videos} Shorts · {pack.price} Kineo cost</option>
            ))}
          </select>
        </label>

        <label style={{ display: 'grid', gap: 7, color: '#c7c7cc', fontSize: 12, fontWeight: 800 }}>
          Your client price · per Short (USD)
          <input
            type="number"
            inputMode="decimal"
            min="0"
            step="1"
            value={clientPrice}
            onChange={(event) => setClientPrice(event.target.value)}
            style={inputStyle}
          />
        </label>

        <label style={{ display: 'grid', gap: 7, color: '#c7c7cc', fontSize: 12, fontWeight: 800 }}>
          Marketplace fee
          <select value={marketplaceFeePct} onChange={(event) => setMarketplaceFeePct(Number(event.target.value))} style={inputStyle}>
            {AGENCY_MARKETPLACE_FEE_OPTIONS.map((fee) => (
              <option key={fee} value={fee}>{fee}%</option>
            ))}
          </select>
        </label>
      </div>

      <div aria-live="polite" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(165px, 1fr))', gap: 11, marginTop: 18 }}>
        <div style={{ padding: 16, borderRadius: 14, background: 'rgba(255,255,255,.045)', border: '1px solid rgba(255,255,255,.08)' }}>
          <div style={{ color: '#85858c', fontSize: 10, fontWeight: 900, letterSpacing: '.1em', textTransform: 'uppercase' }}>Client revenue</div>
          <strong style={{ display: 'block', color: '#f5f5f7', fontSize: 25, marginTop: 7 }}>{formatUsd(result.clientRevenueMinor)}</strong>
        </div>
        <div style={{ padding: 16, borderRadius: 14, background: 'rgba(255,255,255,.045)', border: '1px solid rgba(255,255,255,.08)' }}>
          <div style={{ color: '#85858c', fontSize: 10, fontWeight: 900, letterSpacing: '.1em', textTransform: 'uppercase' }}>Marketplace fee</div>
          <strong style={{ display: 'block', color: '#fbbf24', fontSize: 25, marginTop: 7 }}>−{formatUsd(result.marketplaceFeeMinor)}</strong>
        </div>
        <div style={{ padding: 16, borderRadius: 14, background: 'rgba(255,255,255,.045)', border: '1px solid rgba(255,255,255,.08)' }}>
          <div style={{ color: '#85858c', fontSize: 10, fontWeight: 900, letterSpacing: '.1em', textTransform: 'uppercase' }}>Kineo production</div>
          <strong style={{ display: 'block', color: '#5cb3ff', fontSize: 25, marginTop: 7 }}>−{selectedPack.price}</strong>
        </div>
        <div style={{ padding: 16, borderRadius: 14, background: result.cashAfterKineoMinor >= 0 ? 'rgba(52,211,153,.09)' : 'rgba(248,113,113,.09)', border: `1px solid ${result.cashAfterKineoMinor >= 0 ? 'rgba(52,211,153,.35)' : 'rgba(248,113,113,.35)'}` }}>
          <div style={{ color: '#85858c', fontSize: 10, fontWeight: 900, letterSpacing: '.1em', textTransform: 'uppercase' }}>Left before labor + tax</div>
          <strong style={{ display: 'block', color: result.cashAfterKineoMinor >= 0 ? '#34d399' : '#f87171', fontSize: 25, marginTop: 7 }}>{formatUsd(result.cashAfterKineoMinor)}</strong>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginTop: 18 }}>
        <p style={{ color: '#929299', fontSize: 12, lineHeight: 1.55, margin: 0, maxWidth: 720 }}>
          Break-even at this fee: <strong style={{ color: '#f5f5f7' }}>{formatUsd(result.breakEvenClientPriceMinor)} per Short</strong>. This is arithmetic, not an earnings forecast. It excludes your time, revisions, refunds, taxes, ads and client acquisition costs.
        </p>
        <a
          href={`#pack-${selectedPack.id}`}
          onClick={() => {
            void trackEvent('agency_margin_pack_selected', {
              version: 'agency_margin_v1_2026_08_27',
              pack: selectedPack.id,
              videos: selectedPack.videos,
              client_price_minor: clientPriceMinor,
              marketplace_fee_pct: marketplaceFeePct,
              surface: 'ai_shorts_for_agencies',
            })
          }}
          style={{ display: 'inline-flex', minHeight: 48, alignItems: 'center', justifyContent: 'center', padding: '0 18px', borderRadius: 13, background: '#2997ff', color: '#fff', textDecoration: 'none', fontSize: 14, fontWeight: 900 }}
        >
          Choose the {selectedPack.videos}-video pack ↓
        </a>
      </div>
    </section>
  )
}
