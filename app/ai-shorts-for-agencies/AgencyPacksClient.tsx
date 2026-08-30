'use client'

import { useEffect, useState } from 'react'
import { trackEvent } from '@/lib/analytics'
import { readAgencyDistributionEntry } from '@/lib/agencyDistribution'
import {
  AGENCY_CHECKOUT_RETURN_VARIANT,
  agencyCheckoutResumeHref,
  readAgencyCheckoutReturn,
} from '@/lib/growth/agencyCheckoutReturn'

export interface AgencyPackView {
  id: 'bulk10' | 'bulk20' | 'bulk30' | 'bulk50'
  videos: number
  credits: number
  price: string
  priceMinor: number
  perVideo: string
}

const VIEW_MARKER = 'kineo:agency-bulk-page:viewed:v2'
const CANCEL_RETURN_MARKER = 'kineo:agency-bulk-checkout:cancelled:v1'
const FREE_BRIEF_BRIDGE_VARIANT = 'agency_free_brief_bridge_v1'

export default function AgencyPacksClient({ packs }: { packs: AgencyPackView[] }) {
  const [cancelledPackId, setCancelledPackId] = useState<string | null>(null)

  useEffect(() => {
    const entry = readAgencyDistributionEntry(window.location.search)
    const marker = `${VIEW_MARKER}:${entry ?? 'direct'}`
    try {
      if (sessionStorage.getItem(marker) === '1') return
      sessionStorage.setItem(marker, '1')
    } catch {
      // Privacy modes can deny sessionStorage. The page must still sell.
    }
    void trackEvent('agency_bulk_page_viewed', {
      version: 'agency_bulk_v2_2026_08_27',
      pack_count: packs.length,
      surface: 'ai_shorts_for_agencies',
      entry: entry ?? 'direct',
    })
  }, [packs.length])

  useEffect(() => {
    const checkoutReturn = readAgencyCheckoutReturn(window.location.search)
    if (!checkoutReturn || !packs.some((pack) => pack.id === checkoutReturn.packId)) return
    setCancelledPackId(checkoutReturn.packId)

    const marker = `${CANCEL_RETURN_MARKER}:${checkoutReturn.packId}`
    try {
      if (sessionStorage.getItem(marker) === '1') return
      sessionStorage.setItem(marker, '1')
    } catch {
      // The recovery remains visible even when storage is unavailable.
    }
    const pack = packs.find((candidate) => candidate.id === checkoutReturn.packId)
    void trackEvent('agency_bulk_checkout_cancelled_return_viewed', {
      variant: AGENCY_CHECKOUT_RETURN_VARIANT,
      pack: checkoutReturn.packId,
      videos: pack?.videos ?? null,
      unit_amount: pack?.priceMinor ?? null,
      currency: 'usd',
      surface: 'ai_shorts_for_agencies',
    })
  }, [packs])

  const cancelledPack = cancelledPackId
    ? packs.find((pack) => pack.id === cancelledPackId) ?? null
    : null

  return (
    <section aria-labelledby="agency-pack-heading" style={{ marginTop: 42 }}>
      <div style={{ textAlign: 'center', maxWidth: 760, margin: '0 auto 22px' }}>
        <span style={{ color: '#34d399', fontWeight: 850, fontSize: 12, letterSpacing: '.14em', textTransform: 'uppercase' }}>
          One-time packs · no subscription
        </span>
        <h2 id="agency-pack-heading" style={{ color: '#f5f5f7', fontSize: 'clamp(1.7rem, 4vw, 2.5rem)', lineHeight: 1.08, margin: '10px 0 10px', fontWeight: 900 }}>
          Pick the client volume you already sold
        </h2>
        <p style={{ color: '#9a9aa1', fontSize: 15, lineHeight: 1.65, margin: 0 }}>
          Every pack is paid once in USD. Credits do not expire. The named video count is the Fast workflow; premium generative engines use more credits per video.
        </p>
      </div>

      {cancelledPack ? (
        <div
          role="status"
          aria-live="polite"
          style={{
            margin: '0 auto 20px',
            padding: '17px 18px',
            maxWidth: 820,
            borderRadius: 16,
            border: '1px solid rgba(251,191,36,.38)',
            background: 'linear-gradient(135deg, rgba(245,158,11,.13), rgba(52,211,153,.06))',
          }}
        >
          <div style={{ color: '#fbbf24', fontSize: 11, fontWeight: 900, letterSpacing: '.11em', textTransform: 'uppercase' }}>
            Checkout closed · nothing was charged
          </div>
          <div style={{ color: '#f5f5f7', fontSize: 17, lineHeight: 1.35, fontWeight: 900, marginTop: 6 }}>
            Your {cancelledPack.videos}-video pack is still selected at {cancelledPack.price}.
          </div>
          <p style={{ color: '#aaaab1', fontSize: 13, lineHeight: 1.55, margin: '7px 0 13px' }}>
            Resume the same one-time USD checkout, or keep comparing the four packs below. Your selection did not become a subscription.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 9 }}>
            <a
              href={agencyCheckoutResumeHref(cancelledPack.id)}
              onClick={() => {
                void trackEvent('agency_bulk_checkout_resume_clicked', {
                  variant: AGENCY_CHECKOUT_RETURN_VARIANT,
                  pack: cancelledPack.id,
                  videos: cancelledPack.videos,
                  unit_amount: cancelledPack.priceMinor,
                  currency: 'usd',
                  surface: 'ai_shorts_for_agencies',
                })
              }}
              style={{ display: 'inline-flex', alignItems: 'center', minHeight: 42, padding: '0 15px', borderRadius: 11, background: '#34d399', color: '#04110c', fontSize: 13, fontWeight: 900, textDecoration: 'none' }}
            >
              Resume {cancelledPack.videos}-video checkout →
            </a>
            <button
              type="button"
              onClick={() => setCancelledPackId(null)}
              style={{ minHeight: 42, padding: '0 15px', borderRadius: 11, border: '1px solid rgba(255,255,255,.16)', background: 'transparent', color: '#d4d4d8', fontSize: 13, fontWeight: 800, cursor: 'pointer' }}
            >
              Keep comparing packs
            </button>
          </div>
        </div>
      ) : null}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
        {packs.map((pack) => {
          const featured = pack.id === 'bulk30'
          return (
            <article
              key={pack.id}
              id={`pack-${pack.id}`}
              style={{
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                minHeight: 340,
                padding: 22,
                borderRadius: 20,
                border: featured ? '1px solid rgba(52,211,153,.7)' : '1px solid rgba(255,255,255,.11)',
                background: featured
                  ? 'linear-gradient(155deg, rgba(52,211,153,.14), rgba(41,151,255,.06) 50%, #111216)'
                  : 'linear-gradient(155deg, rgba(255,255,255,.055), rgba(255,255,255,.02))',
                boxShadow: featured ? '0 18px 60px rgba(16,185,129,.12)' : 'none',
              }}
            >
              {featured ? (
                <span style={{ position: 'absolute', top: -11, right: 18, background: '#34d399', color: '#04110c', borderRadius: 999, padding: '5px 10px', fontSize: 10, fontWeight: 900, letterSpacing: '.1em', textTransform: 'uppercase' }}>
                  Monthly content batch
                </span>
              ) : null}
              <div style={{ color: '#8a8a92', fontSize: 11, fontWeight: 850, letterSpacing: '.13em', textTransform: 'uppercase' }}>
                {pack.videos} Fast Shorts
              </div>
              <div style={{ color: '#f5f5f7', fontSize: 38, fontWeight: 920, lineHeight: 1, marginTop: 14 }}>
                {pack.price}
              </div>
              <div style={{ color: featured ? '#34d399' : '#5cb3ff', fontSize: 14, fontWeight: 800, marginTop: 7 }}>
                {pack.perVideo} per finished Fast Short
              </div>
              <ul style={{ listStyle: 'none', padding: 0, margin: '22px 0 20px', display: 'grid', gap: 9, color: '#c7c7cc', fontSize: 13, lineHeight: 1.45 }}>
                <li>✓ {pack.credits} universal credits included</li>
                <li>✓ Script, AI voice, visuals and captions</li>
                <li>✓ Clean 9:16 MP4 for commercial delivery</li>
                <li>✓ One account and one shared credit balance</li>
              </ul>
              <a
                href={`/api/stripe/checkout?pack=${pack.id}`}
                onClick={() => {
                  void trackEvent('agency_bulk_pack_clicked', {
                    version: 'agency_bulk_v1_2026_08_27',
                    pack: pack.id,
                    videos: pack.videos,
                    credits: pack.credits,
                    unit_amount: pack.priceMinor,
                    currency: 'usd',
                    surface: 'ai_shorts_for_agencies',
                  })
                }}
                style={{
                  marginTop: 'auto',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  minHeight: 48,
                  borderRadius: 13,
                  textDecoration: 'none',
                  fontSize: 14,
                  fontWeight: 900,
                  color: featured ? '#04110c' : '#fff',
                  background: featured ? '#34d399' : '#2997ff',
                  boxShadow: featured ? '0 8px 25px rgba(52,211,153,.2)' : '0 8px 25px rgba(41,151,255,.2)',
                }}
              >
                Buy {pack.videos}-video pack →
              </a>
            </article>
          )
        })}
      </div>

      <p style={{ maxWidth: 820, margin: '17px auto 0', color: '#85858c', fontSize: 12, lineHeight: 1.6, textAlign: 'center' }}>
        Fast uses stock footage matched to your narration. If you choose Seedance, Kling, Veo or another generative engine, the same universal credits are used at that engine&apos;s published rate and the pack will produce fewer videos.
      </p>

      <div
        style={{
          maxWidth: 820,
          margin: '18px auto 0',
          padding: '15px 17px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
          borderRadius: 15,
          border: '1px solid rgba(167,139,250,.28)',
          background: 'rgba(167,139,250,.07)',
        }}
      >
        <div>
          <div style={{ color: '#f5f5f7', fontSize: 14, fontWeight: 880 }}>Need client approval before buying a batch?</div>
          <div style={{ color: '#9a9aa1', fontSize: 12, lineHeight: 1.5, marginTop: 3 }}>Turn the offer, audience and verified proof into a client-ready Short brief first.</div>
        </div>
        <a
          href="/client-video-brief-generator?entry=agency_page"
          onClick={() => {
            void trackEvent('agency_free_brief_clicked', {
              version: FREE_BRIEF_BRIDGE_VARIANT,
              surface: 'ai_shorts_for_agencies',
              placement: 'after_pack_comparison',
            })
          }}
          style={{ display: 'inline-flex', alignItems: 'center', minHeight: 42, padding: '0 14px', borderRadius: 11, border: '1px solid rgba(167,139,250,.42)', background: 'rgba(167,139,250,.12)', color: '#ddd6fe', fontSize: 13, fontWeight: 850, textDecoration: 'none' }}
        >
          Build the free brief →
        </a>
      </div>
    </section>
  )
}
