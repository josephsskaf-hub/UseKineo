'use client'

import { useEffect } from 'react'
import { trackEvent } from '@/lib/analytics'

export interface AgencyPackView {
  id: 'bulk10' | 'bulk20' | 'bulk30' | 'bulk50'
  videos: number
  credits: number
  price: string
  priceMinor: number
  perVideo: string
}

const VIEW_MARKER = 'kineo:agency-bulk-page:viewed:v1'

export default function AgencyPacksClient({ packs }: { packs: AgencyPackView[] }) {
  useEffect(() => {
    try {
      if (sessionStorage.getItem(VIEW_MARKER) === '1') return
      sessionStorage.setItem(VIEW_MARKER, '1')
    } catch {
      // Privacy modes can deny sessionStorage. The page must still sell.
    }
    void trackEvent('agency_bulk_page_viewed', {
      version: 'agency_bulk_v1_2026_08_27',
      pack_count: packs.length,
      surface: 'ai_shorts_for_agencies',
    })
  }, [packs.length])

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

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
        {packs.map((pack) => {
          const featured = pack.id === 'bulk30'
          return (
            <article
              key={pack.id}
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
    </section>
  )
}
