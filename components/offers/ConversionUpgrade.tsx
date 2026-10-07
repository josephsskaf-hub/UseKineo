'use client'

import { useEffect, useRef, useState } from 'react'
import { trackEvent } from '@/lib/analytics'
import { createClient } from '@/lib/supabase/client'
import { useCheckoutLaunch } from '@/lib/checkoutTelemetry'
import { PUBLIC_ENGINE_EXAMPLES } from '@/lib/publicExamples'
import type { CheckoutCurrency, PriceRegion } from '@/lib/checkoutPricing'
import {
  ANNUAL_DISCOUNT_PERCENT, ANNUAL_REFUND_POLICY, CONVERSION_NAMES, CONVERSION_TIERS,
  MRR_CONVERSION_ENABLED, MRR_CONVERSION_VERSION, conversionCheckoutHref,
  conversionMetadata, conversionPass, conversionPlan, paidOnlyEntry,
  type ConversionBilling, type ConversionSurface, type ConversionTier,
} from '@/lib/offers/mrrConversion'
// KINEO-SAIDA-REGIAO-2026-10-07 (b) — o passe na moeda local para 'region_paid_only' (o servidor confere a régua; quem não
// é da régua recebe o cartão de sempre como `fallback`). Desligado (REGION_PASS_OFFER_LIVE): esta tela é a de hoje.
import { REGION_PASS_OFFER_LIVE } from '@/lib/freeFilmPolicy'
import RegionPassOffer from '@/components/RegionPassOffer'

const SAMPLE: { videoPath: string; arenaPosterPath?: string } | undefined = PUBLIC_ENGINE_EXAMPLES.find(v => v.engine === 'cinematic_ai' && 'arenaPosterPath' in v)
const panel = { border: '1px solid var(--border)', borderRadius: 14, padding: 16, background: 'var(--card2)' }
const button = { border: '1px solid var(--border2)', borderRadius: 10, padding: '12px 16px', fontWeight: 750, cursor: 'pointer', color: 'var(--text)', background: 'var(--card)' } as const

export function useOfferObservation(surface: ConversionSurface, offer: string, enabled = true) {
  const root = useRef<HTMLDivElement>(null)
  const viewed = useRef(false)
  const acted = useRef(false)
  useEffect(() => {
    if (!enabled || viewed.current || !root.current) return
    const observer = new IntersectionObserver(entries => {
      if (viewed.current || !entries.some(e => e.isIntersecting)) return
      viewed.current = true
      void trackEvent('conversion_offer_viewed', conversionMetadata(surface, offer))
      observer.disconnect()
    }, { threshold: 0.1 })
    observer.observe(root.current)
    return () => observer.disconnect()
  }, [enabled, surface, offer])
  function gesture(choice: string) {
    if (acted.current) return
    acted.current = true
    void trackEvent('conversion_offer_first_gesture', { ...conversionMetadata(surface, offer), choice })
  }
  return { root, gesture }
}

export function ConversionPlanCapacity({ tier, billing, currency, region, surface }: {
  tier: ConversionTier; billing: ConversionBilling; currency: CheckoutCurrency | null; region: PriceRegion; surface: ConversionSurface
}) {
  const observation = useOfferObservation(surface, `${tier}_${billing}`, MRR_CONVERSION_ENABLED && currency !== null)
  if (!MRR_CONVERSION_ENABLED || !currency) return null
  const plan = conversionPlan(tier, billing, currency, region)
  return <div ref={observation.root} data-conversion-plan={`${tier}_${billing}`} style={{ marginTop: 10 }}>
    <span style={{ display: 'block', fontSize: 14, fontWeight: 700 }}>{plan.capacity}</span>
    <span style={{ display: 'block', fontSize: 12, lineHeight: 1.5, color: 'var(--muted)', marginTop: 6 }}>{plan.renewal}</span>
    {surface === 'pricing' && <span style={{ display: 'block', fontSize: 11, color: 'var(--muted)', marginTop: 5 }}>Seedance 1.5 · formats are alternatives, without extras.</span>}
  </div>
}

export function ConversionProof() {
  const [film, setFilm] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    let alive = true
    void fetch('/api/videos', { credentials: 'same-origin', cache: 'no-store' })
      .then(r => r.ok ? r.json() : null)
      .then((d: { videos?: { status?: string; video_url?: string }[] } | null) => {
        const own = d?.videos?.find(v => v.status === 'completed' && v.video_url?.startsWith('https://'))
        if (alive && own?.video_url) setFilm(own.video_url)
      }).catch(() => {})
    return () => { alive = false }
  }, [])
  return <figure style={{ margin: '12px 0 18px' }}>
    <video controls playsInline preload="none" src={failed ? SAMPLE?.videoPath : film ?? SAMPLE?.videoPath}
      poster={!film || failed ? SAMPLE?.arenaPosterPath : undefined}
      onError={() => setFailed(true)}
      style={{ width: '100%', maxHeight: 200, borderRadius: 12, background: '#111' }} />
    <figcaption style={{ fontSize: 12, color: 'var(--muted)', marginTop: 6 }}>
      {film && !failed ? 'Your completed film — keep creating with your own ideas.' : 'A short excerpt from a Kineo founder film · Seedance 1.5. Your purchase creates your own film or clips.'}
    </figcaption>
  </figure>
}

export function ConversionPassCard({ surface, onBuy, disabled = false }: { surface: ConversionSurface; onBuy: () => void; disabled?: boolean }) {
  const observation = useOfferObservation(surface, 'pass')
  const offer = conversionPass()
  return <div ref={observation.root} data-conversion-pass={MRR_CONVERSION_VERSION} style={{ ...panel, borderColor: 'var(--accent)', marginBottom: 18 }}>
    <p style={{ margin: '0 0 5px', fontSize: 12, color: 'var(--accent)', fontWeight: 800 }}>START WITH ONE FILM · NO SUBSCRIPTION</p>
    <strong style={{ fontSize: 23 }}>{offer.price} once</strong>
    <p style={{ margin: '8px 0', lineHeight: 1.5 }}>{offer.capacity}, made from your own idea.</p>
    <p style={{ fontSize: 12, color: 'var(--muted)' }}>Seedance 1.5. Choose films or clips from the same allowance; other engines, durations and extras use it differently. No renewal.</p>
    <button type="button" disabled={disabled} style={{ ...button, width: '100%', background: 'var(--accent)', color: 'var(--on-accent)', opacity: disabled ? 0.6 : 1 }} onClick={() => { observation.gesture('pass'); onBuy() }}>
      {disabled ? 'Opening checkout…' : `Make my own · ${offer.price} once`}
    </button>
  </div>
}

export default function ConversionUpgrade({ currency, region, onClose, onUpgrade, onFilmPass, loading, error, freeAction, regionPass = null }: {
  currency: CheckoutCurrency | null; region: PriceRegion; onClose: () => void
  onUpgrade: (tier: ConversionTier, billing?: ConversionBilling) => void
  onFilmPass: (() => void) | null; loading: boolean; error: string | null
  freeAction?: { label: string; onClick: () => void } | null
  /** KINEO-SAIDA-REGIAO-2026-10-07 — a parede pede o passe da região (o pai só passa isto para quem não assina). */
  regionPass?: { beforeBuy?: () => void } | null
}) {
  const [billing, setBilling] = useState<ConversionBilling>('annual')
  const observation = useOfferObservation('upgrade', 'menu')
  const close = useRef<HTMLButtonElement>(null)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    close.current?.focus()
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCloseRef.current()
      if (e.key === 'Tab' && observation.root.current) {
        const nodes = [...observation.root.current.querySelectorAll<HTMLElement>('button:not(:disabled),a[href],video')]
        const first = nodes[0], last = nodes[nodes.length - 1]
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus() }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus() }
      }
    }
    document.addEventListener('keydown', key)
    return () => { document.removeEventListener('keydown', key); previous?.focus() }
  }, [observation.root])
  return <div role="presentation" onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,.7)', display: 'grid', placeItems: 'center', padding: 12 }}>
    <div ref={observation.root} role="dialog" aria-modal="true" aria-labelledby="conversion-upgrade-title" data-conversion-upgrade={MRR_CONVERSION_VERSION}
      onClick={e => e.stopPropagation()} onClickCapture={e => { const control = (e.target as HTMLElement).closest('button,video'); if (control && control !== close.current) observation.gesture(control.tagName === 'VIDEO' ? 'play_proof' : 'choose_offer') }}
      style={{ width: '100%', maxWidth: 570, maxHeight: '92dvh', overflowY: 'auto', borderRadius: 20, padding: 22, background: 'var(--card)', color: 'var(--text)', border: '1px solid var(--border)' }}>
      <button ref={close} type="button" aria-label="Close upgrade" onClick={onClose} style={{ ...button, float: 'right', padding: '6px 10px' }}>×</button>
      <h2 id="conversion-upgrade-title" style={{ fontSize: 25, lineHeight: 1.2, margin: '6px 40px 10px 0' }}>Your idea. Your next film.</h2>
      <ConversionProof />
      {freeAction && <div style={{ ...panel, marginBottom: 14 }}><p style={{ marginTop: 0 }}>You still have a film available before you buy.</p><button style={button} type="button" onClick={freeAction.onClick}>{freeAction.label}</button></div>}
      {REGION_PASS_OFFER_LIVE && regionPass
        ? <RegionPassOffer surface="wall" beforeBuy={regionPass.beforeBuy} fallback={onFilmPass ? <ConversionPassCard surface="upgrade" onBuy={onFilmPass} disabled={loading} /> : null} />
        : onFilmPass && <ConversionPassCard surface="upgrade" onBuy={onFilmPass} disabled={loading} />}
      <h3 style={{ fontSize: 17, marginBottom: 12 }}>Making more? Choose a plan.</h3>
      <div role="group" aria-label="Billing period" style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        {(['monthly', 'annual'] as const).map(value => <button type="button" key={value} aria-pressed={billing === value}
          onClick={() => setBilling(value)} style={{ ...button, flex: 1, borderColor: billing === value ? 'var(--accent)' : 'var(--border)' }}>
          {value === 'monthly' ? 'Monthly' : `Annual · save ${ANNUAL_DISCOUNT_PERCENT}%`}
        </button>)}
      </div>
      {CONVERSION_TIERS.map(tier => {
        const plan = currency ? conversionPlan(tier, billing, currency, region) : null
        return <button type="button" key={tier} disabled={loading || !plan} onClick={() => onUpgrade(tier, billing)}
          style={{ ...button, display: 'block', width: '100%', textAlign: 'left', marginBottom: 10, opacity: loading ? 0.6 : 1 }}>
          <strong>{CONVERSION_NAMES[tier]} · {plan ? `${plan.price} ${plan.period}` : 'Loading price…'}</strong>
          <ConversionPlanCapacity key={`${tier}_${billing}`} tier={tier} billing={billing} currency={currency} region={region} surface="upgrade" />
        </button>
      })}
      <p style={{ color: 'var(--muted)', fontSize: 12, lineHeight: 1.5 }}>Capacity uses Seedance 1.5, with the entire allowance used for one format, without extras. Films and clips are alternatives, not added together.</p>
      <p style={{ color: 'var(--muted)', fontSize: 12 }}>{billing === 'annual' ? ANNUAL_REFUND_POLICY : 'Monthly billing. Cancel anytime. See the current refund terms.'} <a href="/terms">Terms</a></p>
      {error && <p role="alert" style={{ color: 'var(--danger, #d43b3b)' }}>{error}</p>}
    </div>
  </div>
}

export function ConversionPricingEntry() {
  const [eligible, setEligible] = useState(false)
  const checkout = useCheckoutLaunch('mrr_conversion_pricing_pass')
  useEffect(() => {
    if (!MRR_CONVERSION_ENABLED) return
    let alive = true
    const client = createClient()
    void client.auth.getUser().then(async ({ data }) => {
      if (!data.user) return
      const { data: profile, error } = await client.from('profiles').select('trial_status,has_paid,plan').eq('id', data.user.id).single()
      if (alive && !error) setEligible(paidOnlyEntry(profile))
    }).catch(() => {})
    return () => { alive = false }
  }, [])
  if (!MRR_CONVERSION_ENABLED || !eligible) return null
  return <div style={{ maxWidth: 700, margin: '0 auto 24px' }}>
    {REGION_PASS_OFFER_LIVE /* KINEO-SAIDA-REGIAO-2026-10-07: o passe na moeda local; fora da régua, o cartão de sempre */
      ? <RegionPassOffer surface="pricing" fallback={<ConversionPassCard surface="pricing" disabled={checkout.pending !== null} onBuy={() => {
      checkout.launch('pass', conversionCheckoutHref('/api/stripe/checkout?pack=starter', 'pricing', 'pass'), conversionMetadata('pricing', 'pass'))
    }} />} />
      : <ConversionPassCard surface="pricing" disabled={checkout.pending !== null} onBuy={() => {
      checkout.launch('pass', conversionCheckoutHref('/api/stripe/checkout?pack=starter', 'pricing', 'pass'), conversionMetadata('pricing', 'pass'))
    }} />}
    {checkout.error && <p role="alert">{checkout.error}</p>}
  </div>
}
