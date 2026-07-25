// SEO link-magnet — /shorts-money-calculator: an interactive "YouTube Shorts
// Money Calculator". Targets "youtube shorts money calculator" / "shorts
// earnings calculator". Server component: metadata + SEO explainer copy +
// JSON-LD (FAQPage + BreadcrumbList). The interactive math lives in the
// client island <CalculatorClient/>. Dark theme matches
// /state-of-ai-shorts-2026 and /facts.

import type { Metadata } from 'next'
import CalculatorClient from './CalculatorClient'

export const metadata: Metadata = {
  title: 'YouTube Shorts Money Calculator (2026) — Estimate Your Earnings',
  description:
    'Free YouTube Shorts money calculator: estimate your monthly and yearly Shorts earnings from views per Short, posting frequency and niche RPM. Simple, no signup — all figures are estimates.',
  alternates: { canonical: 'https://www.usekineo.com/shorts-money-calculator' },
  openGraph: {
    title: 'YouTube Shorts Money Calculator (2026)',
    description:
      'Estimate your YouTube Shorts earnings from views, posting frequency and niche RPM. Free interactive calculator, no signup.',
    url: 'https://www.usekineo.com/shorts-money-calculator',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'YouTube Shorts Money Calculator (2026)',
    description:
      'Estimate your YouTube Shorts earnings from views, posting frequency and niche RPM. Free, no signup.',
  },
}

const FAQ: { q: string; a: string }[] = [
  {
    q: 'How does the YouTube Shorts money calculator work?',
    a: 'It multiplies your average views per Short by how many Shorts you post per week to estimate monthly views, then applies your niche RPM using the formula monthly views × RPM ÷ 1,000. It shows a low/mid/high range by flexing the RPM ±40%, plus a yearly projection. Every number is an estimate, not a guarantee.',
  },
  {
    q: 'What is RPM for YouTube Shorts?',
    a: 'RPM (revenue per mille) is how much you earn per 1,000 views after YouTube takes its share. Shorts RPM is much lower than long-form — often only a few cents to about 20 cents per 1,000 views — and it swings with your niche, audience country and advertiser demand.',
  },
  {
    q: 'How much do YouTube Shorts pay per 1,000 views?',
    a: 'Most channels see roughly $0.03 to $0.20 per 1,000 monetized Shorts views depending on niche. Finance and business tend to sit at the high end, while entertainment, gaming and animals sit at the low end. Only monetized views count, so real payouts are usually lower than raw view totals imply.',
  },
  {
    q: 'Are these earnings estimates accurate?',
    a: 'They are ballpark estimates to help you plan, not a promise of income. Real earnings depend on watch time, how many views are monetized, your audience geography, the season and shifting ad rates. Treat the calculator as a directional guide and always verify against your own YouTube Analytics.',
  },
]

const PAGE_BG = '#000'
const CARD = { background: '#161618', border: '1px solid #2a2a2d', borderRadius: 14 }
const ACCENT = '#2997ff'
const MUTED = '#86868b'

export default function ShortsMoneyCalculatorPage() {
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQ.map((item) => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: { '@type': 'Answer', text: item.a },
    })),
  }

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: 'https://www.usekineo.com',
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Shorts Money Calculator',
        item: 'https://www.usekineo.com/shorts-money-calculator',
      },
    ],
  }

  return (
    <main
      style={{
        background: PAGE_BG,
        minHeight: '100vh',
        color: '#f5f5f7',
        fontFamily:
          'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        padding: '64px 20px 96px',
      }}
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd).replace(/</g, '\\u003c') }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbJsonLd).replace(/</g, '\\u003c'),
        }}
      />
      <div style={{ maxWidth: 820, margin: '0 auto' }}>
        <p
          style={{
            color: ACCENT,
            fontWeight: 700,
            fontSize: '0.85rem',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            margin: '0 0 12px',
          }}
        >
          Free interactive tool
        </p>
        <h1 style={{ fontSize: '2.2rem', fontWeight: 800, lineHeight: 1.15, margin: '0 0 16px' }}>
          YouTube Shorts Money Calculator
        </h1>
        <p style={{ color: MUTED, fontSize: '1.08rem', lineHeight: 1.6, margin: '0 0 40px' }}>
          Estimate how much your YouTube Shorts could earn. Enter your average views per Short,
          how often you post and your niche, and this calculator projects your estimated monthly
          and yearly earnings using a niche-based RPM. Every figure is an estimate — real payouts
          vary with your audience, watch time and advertiser demand.
        </p>

        <CalculatorClient />

        <h2 style={{ fontSize: '1.4rem', fontWeight: 700, margin: '0 0 12px' }}>
          How the Shorts earnings math works
        </h2>
        <p style={{ color: '#d2d2d7', fontSize: '0.98rem', lineHeight: 1.65, margin: '0 0 12px' }}>
          The core formula is simple: <strong>monthly views × RPM ÷ 1,000</strong>. First the tool
          turns your inputs into monthly views (average views per Short × Shorts per week × about
          4.35 weeks per month). Then it multiplies those views by your niche&rsquo;s estimated RPM
          and divides by 1,000, because RPM is priced per one thousand views.
        </p>
        <p style={{ color: '#d2d2d7', fontSize: '0.98rem', lineHeight: 1.65, margin: '0 0 12px' }}>
          <strong>RPM (revenue per mille)</strong> is how many dollars you keep for every 1,000
          views after YouTube&rsquo;s share. Shorts RPM is far lower than long-form video — often
          just a few cents to around 20 cents per 1,000 views — and it changes with niche, audience
          country, watch time and the time of year. That is why finance and business Shorts can pay
          several times more per view than entertainment, gaming or animal Shorts.
        </p>
        <p style={{ color: '#d2d2d7', fontSize: '0.98rem', lineHeight: 1.65, margin: '0 0 32px' }}>
          To reflect that swing, the calculator shows a low/mid/high range by flexing the estimated
          RPM ±40%. <strong>Treat all results as estimates.</strong> Only monetized views earn ad
          revenue, so your real earnings are usually lower than your total view count suggests.
          Always check the numbers against your own YouTube Analytics.
        </p>

        <h2 style={{ fontSize: '1.4rem', fontWeight: 700, margin: '0 0 16px' }}>
          Frequently asked questions
        </h2>
        <div style={{ display: 'grid', gap: 10, margin: '0 0 40px' }}>
          {FAQ.map((item, i) => (
            <section key={i} style={{ ...CARD, padding: '16px 18px' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 8px' }}>{item.q}</h3>
              <p style={{ color: '#d2d2d7', lineHeight: 1.55, fontSize: '0.95rem', margin: 0 }}>
                {item.a}
              </p>
            </section>
          ))}
        </div>

        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0 0 12px' }}>
          Keep exploring Shorts earnings
        </h2>
        <ul
          style={{
            color: MUTED,
            lineHeight: 1.9,
            fontSize: '0.95rem',
            paddingLeft: 20,
            margin: '0 0 40px',
          }}
        >
          <li>
            <a href="/how-much-do-youtube-shorts-pay" style={{ color: ACCENT, textDecoration: 'none' }}>
              How much do YouTube Shorts pay?
            </a>{' '}
            — what the payouts really look like in 2026.
          </li>
          <li>
            <a href="/youtube-shorts-rpm-by-niche" style={{ color: ACCENT, textDecoration: 'none' }}>
              YouTube Shorts RPM by niche
            </a>{' '}
            — the RPM bands behind this calculator, explained.
          </li>
          <li>
            <a href="/best-ai-shorts-generators" style={{ color: ACCENT, textDecoration: 'none' }}>
              Best AI Shorts generators
            </a>{' '}
            — tools to produce the volume these numbers assume.
          </li>
        </ul>

        <p style={{ color: MUTED, fontSize: '0.85rem', lineHeight: 1.6 }}>
          Estimates only. This calculator is a planning aid, not financial advice or a guarantee of
          income. Actual YouTube Shorts earnings depend on monetized views, watch time, audience
          location, niche and current ad rates — verify against your own YouTube Analytics.
        </p>
      </div>
    </main>
  )
}
