'use client'
import { useState } from 'react'
import { mrrFilmCapacity, MRR_PRICING_PROOF_ENABLED, MRR_PRICING_VERSION, MRR_TIERS } from '@/lib/growth/mrrRevenueFollowthrough'
import { planName } from '@/lib/growth/planFit'
import { useMrrVisible } from '@/lib/growth/useMrrVisible'

export default function MrrPricingProof() {
  const [seconds, setSeconds] = useState<15 | 35 | 60>(35)
  const { root, gesture } = useMrrVisible('mrr_pricing_proof', MRR_PRICING_VERSION, MRR_PRICING_PROOF_ENABLED)
  if (!MRR_PRICING_PROOF_ENABLED) return null
  return <div ref={root} data-mrr-pricing-proof onClickCapture={event => {
    if ((event.target as HTMLElement).closest('a,select')) gesture()
  }} style={{ maxWidth: 920, margin: '18px auto', border: '1px solid var(--border)', borderRadius: 12, padding: 18 }}>
    <strong>See the film. Choose how many you want to make.</strong>
    <p style={{ fontSize: 13, lineHeight: 1.6 }}>
      <a href="/v/83db8b63-b654-491e-a0aa-86ce1bc1f3d7" style={{ color: 'var(--accent)' }}>Watch Lituya Bay — a Kineo founder film, made with Seedance</a>.
      {' '}A finished narrated Short made in Kineo.
    </p>
    <label style={{ fontSize: 13 }}>Plan for Seedance films of{' '}
      <select aria-label="Plan film duration" value={seconds} onChange={event => {
        const value = Number(event.target.value)
        if (value === 15 || value === 35 || value === 60) { setSeconds(value); gesture() }
      }} style={{ background: 'var(--card)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 6, padding: 6 }}>
        <option value={15}>15 seconds</option><option value={35}>35 seconds</option><option value={60}>60 seconds</option>
      </select>
    </label>
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 18, marginTop: 12 }} aria-live="polite">
      {MRR_TIERS.map(tier => { const p = mrrFilmCapacity(tier, 'cinematic_ai', seconds); return p ?
        <div key={tier} style={{ flex: '1 1 170px', fontSize: 13 }}><strong>{planName(tier)}</strong><br />Up to {p.films} films/month · {p.price}/month</div> : null })}
    </div>
    <p style={{ fontSize: 11, color: 'var(--muted2)', lineHeight: 1.5 }}>Monthly plans, using all included credits on this engine and duration, without extras. Other engines, lengths and add-ons change the number of films. Promotions and annual billing: check the selected plan and final checkout total.</p>
    <p style={{ fontSize: 12, lineHeight: 1.6, marginBottom: 0 }}>If generation fails, the credits used for that failed render are returned. This is a credit refund, not an automatic refund of your subscription payment. The first paid month has a 7-day money-back guarantee: contact support@usekineo.com within 7 days of the first charge. <a href="/terms" style={{ color: 'var(--accent)' }}>Current terms</a>.</p>
  </div>
}
