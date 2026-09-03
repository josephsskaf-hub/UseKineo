// KINEO-BACKLINK-ENGINE — /widget/embed: the iframe-friendly "Shorts Idea of
// the Day" card that creators embed on their site, blog or Notion page. Every
// embed is a followed link + referral traffic back to usekineo.com. Server
// component, zero client JS, deterministic UTC-day rotation anchored to keep
// the 2026 schedule stable and continuous across later year boundaries. Every
// visitor sees the same idea on the same day, and the ISR cache (1h) cannot
// show two different ideas in the same hour. Marketing page: /widget.
// Style matches app/facts/page.tsx: #000 page, #161618 card, #2a2a2d border,
// #2997ff accent. Do not add nav/footer here — it must stay clean inside a
// 360x200 iframe.

import type { Metadata } from 'next'
import { buildAffiliateWidgetCta } from '@/lib/growth/affiliateWidget'
import { dailyShortIdeaForDate } from '@/lib/growth/dailyShortIdeas'

export const revalidate = 3600

export const metadata: Metadata = {
  title: 'Shorts Idea of the Day — Kineo',
  description:
    'A fresh YouTube Shorts research prompt every day. Verify factual claims before publishing. Free embeddable widget by Kineo.',
  robots: { index: false, follow: true },
}

const ACCENT = '#2997ff'
const MUTED = '#86868b'

export default function WidgetEmbedPage({
  searchParams,
}: {
  searchParams?: { affiliate?: string | string[] }
}) {
  const { idea } = dailyShortIdeaForDate()
  const affiliateCode = typeof searchParams?.affiliate === 'string'
    ? searchParams.affiliate
    : null
  const ctaHref = buildAffiliateWidgetCta(affiliateCode)

  return (
    <main
      style={{
        background: '#000',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        padding: 8,
        fontFamily:
          'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
    >
      <div
        style={{
          background: '#161618',
          border: '1px solid #2a2a2d',
          borderRadius: 14,
          padding: '16px 18px',
          maxWidth: 360,
          width: '100%',
          color: '#f5f5f7',
          boxSizing: 'border-box',
        }}
      >
        <p
          style={{
            color: ACCENT,
            fontWeight: 700,
            fontSize: '0.72rem',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            margin: '0 0 10px',
          }}
        >
          💡 Shorts idea of the day
        </p>
        <p
          style={{
            fontSize: '0.92rem',
            lineHeight: 1.5,
            fontWeight: 600,
            margin: '0 0 12px',
          }}
        >
          {idea}
        </p>
        <a
          href={ctaHref}
          target="_blank"
          rel="noopener"
          style={{
            color: MUTED,
            fontSize: '0.78rem',
            fontWeight: 600,
            textDecoration: 'none',
          }}
        >
          Powered by <span style={{ color: ACCENT }}>Kineo →</span>
        </a>
      </div>
    </main>
  )
}
