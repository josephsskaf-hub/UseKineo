// SEO — /how-much-do-youtube-shorts-pay: money-intent page targeting
// "how much do youtube shorts pay" and long-tails ("per 1000 views",
// "for 1 million views", "shorts CPM/RPM"). Server component, zero client JS,
// dark theme matching /state-of-ai-shorts-2026 and /facts. Every payout figure
// is labelled as an ESTIMATED TYPICAL RANGE, never a guarantee — Shorts payouts
// vary widely by niche and geography. FAQPage + BreadcrumbList JSON-LD mirror
// the visible FAQ so the markup can never drift from what a human reads.

import type { Metadata } from 'next'

export const dynamic = 'force-static'

const UPDATED = 'July 2026'

export const metadata: Metadata = {
  title: 'How Much Do YouTube Shorts Pay in 2026? (Per 1K & 1M Views)',
  description:
    'How much do YouTube Shorts pay? A 2026 breakdown of Shorts RPM vs CPM, a payout table from 1K to 10M views, the monetization requirements, and what actually moves your earnings. Estimated ranges, honestly labelled.',
  alternates: { canonical: 'https://www.usekineo.com/how-much-do-youtube-shorts-pay' },
  openGraph: {
    title: 'How Much Do YouTube Shorts Pay in 2026? (Per 1K & 1M Views)',
    description:
      'Shorts RPM vs CPM explained, a realistic payout table from 1K to 10M views, the 2026 monetization requirements, and the levers that actually move your earnings.',
    url: 'https://www.usekineo.com/how-much-do-youtube-shorts-pay',
    type: 'article',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'How Much Do YouTube Shorts Pay in 2026?',
    description:
      'A realistic, honestly-labelled breakdown of Shorts payouts per 1K and 1M views, RPM vs CPM, and the 2026 requirements.',
  },
}

// Estimated typical Shorts RPM band (USD per 1,000 Shorts views), after
// YouTube's revenue split. NOT a guarantee — real RPM swings hard by niche
// and audience geography. Low/mid/high are illustrative ends of a common band.
const RPM_LOW = 0.03
const RPM_MID = 0.05
const RPM_HIGH = 0.1

const VIEW_TIERS: { label: string; views: number }[] = [
  { label: '1,000', views: 1_000 },
  { label: '10,000', views: 10_000 },
  { label: '100,000', views: 100_000 },
  { label: '1,000,000', views: 1_000_000 },
  { label: '10,000,000', views: 10_000_000 },
]

function money(views: number, rpm: number): string {
  const usd = (views / 1000) * rpm
  if (usd < 1) return `$${usd.toFixed(2)}`
  if (usd < 1000) return `$${usd.toFixed(0)}`
  return `$${usd.toLocaleString('en-US', { maximumFractionDigits: 0 })}`
}

const RPM_FACTORS: { title: string; detail: string }[] = [
  {
    title: 'Niche & advertiser demand',
    detail:
      'Finance, business and tech attract advertisers who pay far more per impression than entertainment or meme content. The same 1M views can pay several times more in a high-CPM niche.',
  },
  {
    title: 'Audience geography',
    detail:
      'Views from the US, UK, Canada and Australia monetize at a much higher rate than views from most of Asia, Africa and Latin America. A channel with a Tier-1 audience earns a multiple of one with the same view count elsewhere.',
  },
  {
    title: 'Watch time & retention',
    detail:
      'The Shorts revenue pool is split by views, but the platform rewards content that holds attention with more distribution — more views at the same RPM still means more dollars.',
  },
  {
    title: 'Season & ad spend cycles',
    detail:
      'RPM rises in Q4 (holiday ad budgets) and dips in January. The exact same video can pay noticeably more in December than in the new year.',
  },
]

const FAQ: { q: string; a: string }[] = [
  {
    q: 'How much do YouTube Shorts pay per 1,000 views?',
    a: 'Most monetized Shorts channels earn an estimated $0.03 to $0.10 per 1,000 views, with roughly $0.05 as a common midpoint after YouTube takes its share. This is a typical range, not a guarantee: a high-CPM niche with a US audience can beat it, while broad entertainment content with a global audience often lands at the low end.',
  },
  {
    q: 'How much do YouTube Shorts pay for 1 million views?',
    a: 'Using a typical Shorts RPM band of about $0.03 to $0.10 per 1,000 views, 1,000,000 views works out to roughly $30 to $100, with around $50 as a common midpoint. Long-form videos with the same view count usually pay several times more, which is why Shorts creators rely on volume.',
  },
  {
    q: 'Why do Shorts pay less than long videos?',
    a: 'Shorts are monetized from a shared ad pool that is split across all Shorts views and then divided with creators, rather than earning from ads placed directly in one video. Short clips also carry fewer and lighter ad formats than a multi-minute video with mid-rolls. The result is a much lower RPM per 1,000 views than long-form, which typically earns dollars rather than cents per 1,000 views.',
  },
  {
    q: 'What are the 2026 requirements to monetize Shorts?',
    a: 'To join the YouTube Partner Program you need 1,000 subscribers plus either 10 million valid public Shorts views in the last 90 days, or 4,000 valid public watch hours in the last 12 months from long-form and live content. You also need to follow the monetization policies and live in an eligible country.',
  },
  {
    q: 'Is CPM the same as RPM for Shorts?',
    a: 'No. CPM is what advertisers pay per 1,000 ad impressions before YouTube takes its cut. RPM is what actually lands in your account per 1,000 video views after the platform split and after accounting for views that were never monetized. RPM is the number that matters for estimating your take-home earnings.',
  },
]

const PAGE_BG = '#000'
const CARD = { background: '#161618', border: '1px solid #2a2a2d', borderRadius: 14 }
const ACCENT = '#2997ff'
const MUTED = '#86868b'

export default function HowMuchDoYouTubeShortsPayPage() {
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
        name: 'How Much Do YouTube Shorts Pay',
        item: 'https://www.usekineo.com/how-much-do-youtube-shorts-pay',
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
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd).replace(/</g, '\\u003c') }}
      />
      <div style={{ maxWidth: 820, margin: '0 auto' }}>
        <nav aria-label="Breadcrumb" style={{ margin: '0 0 20px' }}>
          <a href="/" style={{ color: MUTED, textDecoration: 'none', fontSize: '0.85rem' }}>
            Home
          </a>
          <span style={{ color: MUTED, fontSize: '0.85rem' }}> / </span>
          <span style={{ color: '#d2d2d7', fontSize: '0.85rem' }}>How Much Do YouTube Shorts Pay</span>
        </nav>

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
          Creator earnings guide — updated {UPDATED}
        </p>
        <h1 style={{ fontSize: '2.2rem', fontWeight: 800, lineHeight: 1.15, margin: '0 0 16px' }}>
          How Much Do YouTube Shorts Pay? (2026)
        </h1>
        <p style={{ color: MUTED, fontSize: '1.08rem', lineHeight: 1.6, margin: '0 0 8px' }}>
          The honest answer: YouTube Shorts pay an estimated $0.03 to $0.10 per 1,000
          views for most monetized channels — roughly $0.05 on average — which means
          about $30 to $100 per 1,000,000 views. Those are typical estimated ranges,
          not guarantees. Your real number depends heavily on your niche and where your
          audience lives. Here is exactly how the payout math works, and what moves it.
        </p>
        <p style={{ color: MUTED, fontSize: '0.9rem', lineHeight: 1.6, margin: '0 0 40px' }}>
          No figure on this page is a promise of earnings. Shorts RPM varies widely and
          YouTube does not publish per-view rates.
        </p>

        <h2 style={{ fontSize: '1.4rem', fontWeight: 700, margin: '0 0 12px' }}>
          How the Shorts payout model actually works
        </h2>
        <p style={{ color: '#d2d2d7', fontSize: '1rem', lineHeight: 1.7, margin: '0 0 14px' }}>
          Long-form YouTube videos earn from ads placed inside the video itself — the
          more (and longer) the video, the more mid-roll ad slots it carries. Shorts
          work differently. Ads run in the Shorts feed between clips, and all of that ad
          money goes into a single shared pool. YouTube first sets aside a portion to
          cover music licensing, then divides the rest among Shorts creators based on
          their share of total Shorts views, and finally splits that with each creator
          (creators keep 45% of their allocated revenue). You are being paid a slice of
          a communal pool, not the ads on your specific clip.
        </p>
        <p style={{ color: '#d2d2d7', fontSize: '1rem', lineHeight: 1.7, margin: '0 0 32px' }}>
          That structure is the entire reason Shorts pay less per view than long-form.
          There is no getting around it with a &ldquo;trick&rdquo; — the lever is volume
          and niche, not a hidden setting.
        </p>

        <h2 style={{ fontSize: '1.4rem', fontWeight: 700, margin: '0 0 12px' }}>
          RPM vs CPM — the two numbers people confuse
        </h2>
        <div style={{ display: 'grid', gap: 10, margin: '0 0 20px' }}>
          <section style={{ ...CARD, padding: '16px 18px' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 8px' }}>
              CPM (cost per mille)
            </h3>
            <p style={{ color: '#d2d2d7', lineHeight: 1.55, fontSize: '0.95rem', margin: 0 }}>
              What an advertiser pays per 1,000 ad impressions, before YouTube takes its
              cut. It is an advertiser-side number and is always higher than what you
              actually receive.
            </p>
          </section>
          <section style={{ ...CARD, padding: '16px 18px' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 8px' }}>
              RPM (revenue per mille)
            </h3>
            <p style={{ color: '#d2d2d7', lineHeight: 1.55, fontSize: '0.95rem', margin: 0 }}>
              What actually lands in your account per 1,000 video views, after the
              revenue split and after the many views that were never monetized. RPM is
              the honest number to plan with — and for Shorts it is low, typically a few
              cents per 1,000 views rather than the dollars long-form can earn.
            </p>
          </section>
        </div>
        <p style={{ color: MUTED, fontSize: '0.9rem', lineHeight: 1.6, margin: '0 0 32px' }}>
          When someone says &ldquo;my Shorts CPM is $4&rdquo;, that is the advertiser
          number — it does not mean $4 per 1,000 views in your pocket. Your Shorts RPM is
          the figure the table below is built on.
        </p>

        <h2 style={{ fontSize: '1.4rem', fontWeight: 700, margin: '0 0 12px' }}>
          The 2026 requirements to get paid at all
        </h2>
        <p style={{ color: '#d2d2d7', fontSize: '1rem', lineHeight: 1.7, margin: '0 0 14px' }}>
          You earn $0 from Shorts until you are accepted into the YouTube Partner
          Program. As of 2026 the monetization threshold is:
        </p>
        <ul style={{ color: '#d2d2d7', lineHeight: 1.8, fontSize: '0.98rem', paddingLeft: 20, margin: '0 0 14px' }}>
          <li>
            <strong>1,000 subscribers</strong>, plus
          </li>
          <li>
            <strong>10 million valid public Shorts views in the last 90 days</strong>,{' '}
            <em>or</em>
          </li>
          <li>
            <strong>4,000 valid public watch hours in the last 12 months</strong> from
            long-form and live content.
          </li>
        </ul>
        <p style={{ color: MUTED, fontSize: '0.9rem', lineHeight: 1.6, margin: '0 0 32px' }}>
          You also need to live in an eligible country and follow YouTube&rsquo;s
          monetization policies. There is a lower earlier tier for fan funding features,
          but the numbers above are what unlock ad-share revenue on Shorts.
        </p>

        <h2 style={{ fontSize: '1.4rem', fontWeight: 700, margin: '0 0 6px' }}>
          YouTube Shorts payout table (estimated)
        </h2>
        <p style={{ color: MUTED, fontSize: '0.95rem', lineHeight: 1.6, margin: '0 0 16px' }}>
          Based on a typical estimated Shorts RPM band of{' '}
          <strong style={{ color: '#d2d2d7' }}>
            ${RPM_LOW.toFixed(2)}–${RPM_HIGH.toFixed(2)} per 1,000 views
          </strong>{' '}
          (about <strong style={{ color: '#d2d2d7' }}>${RPM_MID.toFixed(2)}</strong> at
          the midpoint). These are illustrative ranges, not guaranteed rates — a
          high-CPM niche with a US audience can exceed the &ldquo;high&rdquo; column,
          while a broad global audience often sits at the &ldquo;low&rdquo; column.
        </p>
        <div style={{ ...CARD, padding: '4px 4px', margin: '0 0 12px', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.95rem', minWidth: 460 }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: '14px 16px', color: MUTED, fontWeight: 600, fontSize: '0.82rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Views
                </th>
                <th style={{ textAlign: 'right', padding: '14px 16px', color: MUTED, fontWeight: 600, fontSize: '0.82rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Low (${RPM_LOW.toFixed(2)})
                </th>
                <th style={{ textAlign: 'right', padding: '14px 16px', color: ACCENT, fontWeight: 700, fontSize: '0.82rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Mid (${RPM_MID.toFixed(2)})
                </th>
                <th style={{ textAlign: 'right', padding: '14px 16px', color: MUTED, fontWeight: 600, fontSize: '0.82rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  High (${RPM_HIGH.toFixed(2)})
                </th>
              </tr>
            </thead>
            <tbody>
              {VIEW_TIERS.map((t, i) => (
                <tr key={t.label} style={{ borderTop: '1px solid #2a2a2d' }}>
                  <td style={{ padding: '14px 16px', fontWeight: 700 }}>{t.label} views</td>
                  <td style={{ padding: '14px 16px', textAlign: 'right', color: '#d2d2d7' }}>
                    {money(t.views, RPM_LOW)}
                  </td>
                  <td style={{ padding: '14px 16px', textAlign: 'right', color: ACCENT, fontWeight: 700 }}>
                    {money(t.views, RPM_MID)}
                  </td>
                  <td style={{ padding: '14px 16px', textAlign: 'right', color: '#d2d2d7' }}>
                    {money(t.views, RPM_HIGH)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p style={{ color: MUTED, fontSize: '0.85rem', lineHeight: 1.6, margin: '0 0 32px' }}>
          Read the table as &ldquo;this is roughly the range a typical monetized channel
          might see,&rdquo; not &ldquo;this is what you will be paid.&rdquo; It also
          excludes any income from brand deals, affiliate links or memberships, which for
          most Shorts creators end up larger than ad-share revenue.
        </p>

        <h2 style={{ fontSize: '1.4rem', fontWeight: 700, margin: '0 0 12px' }}>
          What actually moves your Shorts RPM
        </h2>
        <div style={{ display: 'grid', gap: 10, margin: '0 0 32px' }}>
          {RPM_FACTORS.map((f, i) => (
            <section key={i} style={{ ...CARD, padding: '16px 18px' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 8px' }}>{f.title}</h3>
              <p style={{ color: '#d2d2d7', lineHeight: 1.55, fontSize: '0.95rem', margin: 0 }}>
                {f.detail}
              </p>
            </section>
          ))}
        </div>

        <h2 style={{ fontSize: '1.4rem', fontWeight: 700, margin: '0 0 12px' }}>
          The honest takeaway
        </h2>
        <p style={{ color: '#d2d2d7', fontSize: '1rem', lineHeight: 1.7, margin: '0 0 14px' }}>
          Shorts pay less per view than long-form videos, and no amount of optimization
          changes the underlying model. What you <em>can</em> control is the two levers
          that actually matter: <strong>niche</strong> (pick one advertisers pay for, and
          ideally one with a Tier-1 audience) and <strong>volume</strong> (post
          consistently so the shared pool math works in your favor). A channel posting one
          Short a week in a low-CPM niche will earn cents. A channel posting daily in a
          high-value niche can turn the same platform into a real income stream — mostly
          because volume also opens the door to brand deals and affiliate revenue that
          dwarf ad share.
        </p>
        <p style={{ color: '#d2d2d7', fontSize: '1rem', lineHeight: 1.7, margin: '0 0 32px' }}>
          The bottleneck for most people is not the payout rate — it is producing enough
          good Shorts consistently. That is the problem worth solving first.
        </p>

        <section style={{ ...CARD, padding: '20px 20px', margin: '0 0 40px', borderColor: ACCENT }}>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: '0 0 8px' }}>
            Post enough Shorts to reach monetization — for free
          </h2>
          <p style={{ color: '#d2d2d7', lineHeight: 1.6, fontSize: '0.95rem', margin: '0 0 14px' }}>
            Volume is the whole game, and volume is exactly what an AI generator gives you.
            Kineo turns one typed idea into a finished faceless Short — script, AI
            voiceover, visuals and captions — in about 3–7 minutes. Generate up to 3
            watermarked videos every 24 hours with no credit card, in a high-RPM niche of
            your choice.
          </p>
          <a
            href="/free-ai-shorts-generator?utm_source=payout-page&utm_medium=seo&utm_campaign=seo-sprint"
            style={{
              display: 'inline-block',
              background: ACCENT,
              color: '#000',
              fontWeight: 700,
              padding: '12px 22px',
              borderRadius: 10,
              textDecoration: 'none',
              fontSize: '0.95rem',
            }}
          >
            Generate a free Short →
          </a>
        </section>

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
          Keep going
        </h2>
        <ul style={{ color: MUTED, lineHeight: 1.9, fontSize: '0.95rem', paddingLeft: 20, margin: '0 0 40px' }}>
          <li>
            <a href="/youtube-shorts-rpm-by-niche" style={{ color: ACCENT, textDecoration: 'none' }}>
              Shorts RPM by niche
            </a>{' '}
            — which niches actually pay the most per 1,000 views.
          </li>
          <li>
            <a href="/shorts-money-calculator" style={{ color: ACCENT, textDecoration: 'none' }}>
              Shorts money calculator
            </a>{' '}
            — plug in your own views and RPM for a custom estimate.
          </li>
          <li>
            <a href="/best-ai-shorts-generators" style={{ color: ACCENT, textDecoration: 'none' }}>
              Best AI Shorts generators
            </a>{' '}
            — tools to produce the volume monetization needs.
          </li>
          <li>
            <a href="/free-ai-shorts" style={{ color: ACCENT, textDecoration: 'none' }}>
              Free AI Shorts by niche
            </a>{' '}
            — pick a high-value niche and start generating.
          </li>
        </ul>

        <p style={{ color: MUTED, fontSize: '0.85rem', lineHeight: 1.6 }}>
          All payout figures on this page are estimated typical ranges for illustration,
          updated {UPDATED}. They are not guarantees of income. Actual YouTube Shorts
          earnings depend on niche, audience geography, season and YouTube&rsquo;s own
          revenue-sharing terms, which can change at any time.
        </p>
      </div>
    </main>
  )
}
