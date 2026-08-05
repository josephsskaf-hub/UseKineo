// SEO/G1 — /make-money-clipping-with-ai: EARN-angle page from
// docs/PESQUISA-CONCORRENTES-2026-08-03.md (ordem G1, sanctioned exception to
// the "no new SEO pages" rule: real answer page for a money-intent query).
// The insight: competitors that grew (Crayo ~$7.2M ARR) sell "your page pays
// for itself", not "make videos". This page targets "make money clipping",
// "get paid per view", "clipping with AI" and connects the pay-per-view
// clipping economy (marketplaces paying $1–5 per 1,000 views — honest,
// labelled ranges) to Kineo's pipeline. Server component, zero client JS,
// dark theme matching /how-much-do-youtube-shorts-pay. FAQPage +
// BreadcrumbList JSON-LD mirror the visible FAQ. No Kineo prices hardcoded
// (rule: prices live only in lib/checkoutPricing.ts) — CTA sells the free
// tier. Metric: signups with utm_source=clipping-page.

import type { Metadata } from 'next'

export const dynamic = 'force-static'

const UPDATED = 'August 2026'

export const metadata: Metadata = {
  title: 'How to Make Money Clipping with AI in 2026 (Pay-Per-View Explained)',
  description:
    'Clipping marketplaces pay creators an estimated $1–5 per 1,000 views — 10 to 100 times more per view than Shorts ad revenue. How the pay-per-view clipping economy works in 2026, what actually gets paid, and how to build view volume with AI.',
  alternates: { canonical: 'https://www.usekineo.com/make-money-clipping-with-ai' },
  openGraph: {
    title: 'How to Make Money Clipping with AI in 2026 (Pay-Per-View Explained)',
    description:
      'The pay-per-view clipping economy explained: marketplaces paying $1–5 per 1,000 views, what content qualifies, and how AI generation changes the volume math.',
    url: 'https://www.usekineo.com/make-money-clipping-with-ai',
    type: 'article',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Make Money Clipping with AI (2026)',
    description:
      'Pay-per-view clipping pays an estimated $1–5 per 1,000 views. How it works, honestly labelled — and how AI content volume fits in.',
  },
}

// Estimated pay-per-view rates published by clipping campaigns on marketplaces
// like Whop in 2026. Honest, labelled ranges — individual campaigns set their
// own rates, caps and content rules. NOT a guarantee.
const PPV_LOW = 1
const PPV_HIGH = 5

// Typical Shorts ad-share RPM band for comparison (same figures as
// /how-much-do-youtube-shorts-pay — keep in sync if that page changes).
const SHORTS_RPM_LOW = 0.03
const SHORTS_RPM_HIGH = 0.1

const MATH_ROWS: { label: string; views: number }[] = [
  { label: '10,000', views: 10_000 },
  { label: '100,000', views: 100_000 },
  { label: '1,000,000', views: 1_000_000 },
]

function usd(views: number, per1k: number): string {
  const v = (views / 1000) * per1k
  if (v < 1) return `$${v.toFixed(2)}`
  if (v < 1000) return `$${v.toFixed(0)}`
  return `$${v.toLocaleString('en-US', { maximumFractionDigits: 0 })}`
}

const ROUTES: { title: string; detail: string }[] = [
  {
    title: 'Route 1 — Clipping campaigns (pay-per-view)',
    detail:
      'Creators, apps and brands fund campaigns on marketplaces like Whop: you post clips that feature or promote them, submit your links, and get paid per 1,000 verified views — commonly an estimated $1–5 per 1,000, set by each campaign. Most campaigns require their specific footage or product in the clip and have quality rules and payout caps. Read each campaign brief before you post.',
  },
  {
    title: 'Route 2 — Your own faceless channel (ad share + everything else)',
    detail:
      'Original short-form content you own earns Shorts ad revenue (a much lower rate per view), but stacks affiliate links, sponsorships and your own products on top — and nobody can end the campaign. This is slower per view and stronger long-term. Most full-time clippers end up running both routes at once.',
  },
  {
    title: 'The common denominator: volume',
    detail:
      'Neither route pays without a steady stream of posts. Campaigns reward accounts that post daily and hold attention; ad share is a pure volume split. The bottleneck for almost everyone is not finding somewhere to get paid — it is producing enough decent short-form content every single day.',
  },
]

const STEPS: { title: string; detail: string }[] = [
  {
    title: '1. Pick your lane',
    detail:
      'Browse active clipping campaigns on a marketplace like Whop and note what they pay and require — or pick a faceless niche you can post in daily (finance, history, geography and "curiosity" niches hold up well). If a campaign requires footage of a specific creator, you need their content and an editor; if you are building your own channel, an AI generator can carry the whole pipeline.',
  },
  {
    title: '2. Build a daily production pipeline',
    detail:
      'The clippers who get paid treat it like a factory: a repeatable way to go from idea to posted video in minutes, every day. This is where AI collapses the cost — a tool like Kineo turns one typed topic into a finished 9:16 Short (script, voiceover, visuals, captions) in about 3–7 minutes.',
  },
  {
    title: '3. Post daily, track per-view earnings, cut what fails',
    detail:
      'Post at a fixed cadence, track views and payouts per clip, and double down on the formats that clear the campaign minimums or hold retention. Expect the first weeks to pay little — the accounts that win are the ones still posting in week six.',
  },
]

const FAQ: { q: string; a: string }[] = [
  {
    q: 'How much do clipping campaigns pay per 1,000 views?',
    a: 'Campaigns on pay-per-view marketplaces commonly offer an estimated $1 to $5 per 1,000 verified views in 2026, with each campaign setting its own rate, total budget cap and content rules. That is roughly 10 to 100 times the per-view rate of YouTube Shorts ad share, which typically pays an estimated $0.03 to $0.10 per 1,000 views. These are typical published ranges, not guarantees — payouts depend on the campaign verifying your views and your clips following its rules.',
  },
  {
    q: 'Is clipping actually a real way to make money?',
    a: 'The pay-per-view clipping economy is real and large — marketplaces like Whop report billions of clipped views paid out per month across thousands of campaigns. It is also competitive: campaigns have budgets that run out, view minimums, and quality standards. Treat it like freelance work with variable income, not passive income.',
  },
  {
    q: 'Can I use AI-generated videos for clipping campaigns?',
    a: 'It depends on the campaign. Campaigns that pay for clips of a specific streamer or podcast require that person’s footage, so a from-scratch AI video does not qualify. Campaigns promoting apps, products or general content often accept original videos, including AI-generated ones, if they meet the brief. Where AI always works is your own faceless channel: original AI-generated Shorts you post to accounts you own, monetized through ad share, affiliates and sponsorships.',
  },
  {
    q: 'Do I need to show my face or record anything?',
    a: 'No. Faceless short-form content is the norm in the clipping economy. For campaign clipping you edit existing footage; for your own channel, AI tools generate the script, voiceover, visuals and captions from a typed idea — no camera, no microphone.',
  },
  {
    q: 'How many videos a day do I need to post?',
    a: 'Serious clippers post at least one video per day per account, and campaign leaderboards are usually dominated by people posting several. What matters is a cadence you can hold for months. This is the exact problem AI generation solves: producing daily short-form content in minutes instead of hours.',
  },
]

const PAGE_BG = '#000'
const CARD = { background: '#161618', border: '1px solid #2a2a2d', borderRadius: 14 }
const ACCENT = '#2997ff'
const MUTED = '#86868b'

export default function MakeMoneyClippingWithAiPage() {
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
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://www.usekineo.com' },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Make Money Clipping with AI',
        item: 'https://www.usekineo.com/make-money-clipping-with-ai',
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
          <span style={{ color: '#d2d2d7', fontSize: '0.85rem' }}>Make Money Clipping with AI</span>
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
          How to Make Money Clipping with AI (2026)
        </h1>
        <p style={{ color: MUTED, fontSize: '1.08rem', lineHeight: 1.6, margin: '0 0 8px' }}>
          There is now a real market that pays short-form creators per view: clipping
          campaigns on marketplaces like Whop commonly offer an estimated ${PPV_LOW}–$
          {PPV_HIGH} per 1,000 verified views — roughly 10 to 100 times the per-view rate
          of YouTube Shorts ad share. The catch is that it only pays people who post
          consistently, every day. Here is how the clipping economy actually works, what
          qualifies for payouts, and where AI generation fits.
        </p>
        <p style={{ color: MUTED, fontSize: '0.9rem', lineHeight: 1.6, margin: '0 0 40px' }}>
          Every figure on this page is an estimated typical range published by
          marketplaces and campaigns, not a promise of earnings. Individual campaigns set
          their own rates, caps and rules, and budgets run out.
        </p>

        <h2 style={{ fontSize: '1.4rem', fontWeight: 700, margin: '0 0 12px' }}>
          What &ldquo;clipping&rdquo; means in 2026
        </h2>
        <p style={{ color: '#d2d2d7', fontSize: '1rem', lineHeight: 1.7, margin: '0 0 14px' }}>
          Clipping started as fans cutting highlights from streams and podcasts. It has
          become an economy: creators, apps and brands now fund campaigns that pay
          clippers directly per 1,000 views their posts generate on TikTok, YouTube
          Shorts and Instagram Reels. Marketplaces like Whop coordinate the campaigns,
          verify views and handle payouts — and report billions of clipped views flowing
          through per month. For the people posting, it is closer to performance-paid
          distribution work than to traditional &ldquo;content creation&rdquo;.
        </p>
        <p style={{ color: '#d2d2d7', fontSize: '1rem', lineHeight: 1.7, margin: '0 0 32px' }}>
          Why do the rates beat ad share so heavily? Because the payer is different. Ad
          share pays you a slice of a communal ad pool. Clipping campaigns are marketing
          budgets — the campaign owner is buying attention for themselves, and attention
          bought directly is worth dollars, not cents, per 1,000 views.
        </p>

        <h2 style={{ fontSize: '1.4rem', fontWeight: 700, margin: '0 0 6px' }}>
          The math: pay-per-view vs Shorts ad share
        </h2>
        <p style={{ color: MUTED, fontSize: '0.95rem', lineHeight: 1.6, margin: '0 0 16px' }}>
          Estimated ranges: campaign clipping at{' '}
          <strong style={{ color: '#d2d2d7' }}>
            ${PPV_LOW.toFixed(2)}–${PPV_HIGH.toFixed(2)} per 1,000 views
          </strong>{' '}
          vs typical Shorts ad-share RPM of{' '}
          <strong style={{ color: '#d2d2d7' }}>
            ${SHORTS_RPM_LOW.toFixed(2)}–${SHORTS_RPM_HIGH.toFixed(2)} per 1,000 views
          </strong>
          .
        </p>
        <div style={{ ...CARD, padding: '4px 4px', margin: '0 0 12px', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.95rem', minWidth: 460 }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: '14px 16px', color: MUTED, fontWeight: 600, fontSize: '0.82rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Views
                </th>
                <th style={{ textAlign: 'right', padding: '14px 16px', color: MUTED, fontWeight: 600, fontSize: '0.82rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Shorts ad share (est.)
                </th>
                <th style={{ textAlign: 'right', padding: '14px 16px', color: ACCENT, fontWeight: 700, fontSize: '0.82rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Clipping campaign (est.)
                </th>
              </tr>
            </thead>
            <tbody>
              {MATH_ROWS.map((t) => (
                <tr key={t.label} style={{ borderTop: '1px solid #2a2a2d' }}>
                  <td style={{ padding: '14px 16px', fontWeight: 700 }}>{t.label} views</td>
                  <td style={{ padding: '14px 16px', textAlign: 'right', color: '#d2d2d7' }}>
                    {usd(t.views, SHORTS_RPM_LOW)}–{usd(t.views, SHORTS_RPM_HIGH)}
                  </td>
                  <td style={{ padding: '14px 16px', textAlign: 'right', color: ACCENT, fontWeight: 700 }}>
                    {usd(t.views, PPV_LOW)}–{usd(t.views, PPV_HIGH)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p style={{ color: MUTED, fontSize: '0.85rem', lineHeight: 1.6, margin: '0 0 32px' }}>
          Illustrative only. Campaign payouts require verified views, rule-compliant
          clips and remaining campaign budget; ad share requires YouTube Partner Program
          acceptance. Real earnings in both columns vary widely.
        </p>

        <h2 style={{ fontSize: '1.4rem', fontWeight: 700, margin: '0 0 12px' }}>
          The two ways people actually get paid
        </h2>
        <div style={{ display: 'grid', gap: 10, margin: '0 0 32px' }}>
          {ROUTES.map((r, i) => (
            <section key={i} style={{ ...CARD, padding: '16px 18px' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 8px' }}>{r.title}</h3>
              <p style={{ color: '#d2d2d7', lineHeight: 1.55, fontSize: '0.95rem', margin: 0 }}>
                {r.detail}
              </p>
            </section>
          ))}
        </div>

        <h2 style={{ fontSize: '1.4rem', fontWeight: 700, margin: '0 0 12px' }}>
          How to start, step by step
        </h2>
        <div style={{ display: 'grid', gap: 10, margin: '0 0 32px' }}>
          {STEPS.map((s, i) => (
            <section key={i} style={{ ...CARD, padding: '16px 18px' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 8px' }}>{s.title}</h3>
              <p style={{ color: '#d2d2d7', lineHeight: 1.55, fontSize: '0.95rem', margin: 0 }}>
                {s.detail}
              </p>
            </section>
          ))}
        </div>

        <section style={{ ...CARD, padding: '20px 20px', margin: '0 0 40px', borderColor: ACCENT }}>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: '0 0 8px' }}>
            Build the daily volume — free, no camera
          </h2>
          <p style={{ color: '#d2d2d7', lineHeight: 1.6, fontSize: '0.95rem', margin: '0 0 14px' }}>
            The clipping economy pays for view volume, and volume is a production
            problem. Kineo turns one typed topic into a finished faceless Short — script,
            AI voiceover, matched visuals and captions — in about 3–7 minutes. Generate
            up to 3 watermarked videos every 24 hours free, no credit card, and see
            whether a daily pipeline fits your workflow before spending anything.
          </p>
          <a
            href="/free-ai-shorts-generator?utm_source=clipping-page&utm_medium=seo&utm_campaign=earn-angle"
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
            <a href="/youtube-automation-case-study" style={{ color: ACCENT, textDecoration: 'none' }}>
              Our YouTube automation case study
            </a>{' '}
            — a real channel run on AI-generated Shorts, numbers included.
          </li>
          <li>
            <a href="/how-much-do-youtube-shorts-pay" style={{ color: ACCENT, textDecoration: 'none' }}>
              How much do YouTube Shorts pay
            </a>{' '}
            — the ad-share side of the math in detail.
          </li>
          <li>
            <a href="/shorts-money-calculator" style={{ color: ACCENT, textDecoration: 'none' }}>
              Shorts money calculator
            </a>{' '}
            — plug in your own views and rates.
          </li>
          <li>
            <a href="/faceless-channel-ideas" style={{ color: ACCENT, textDecoration: 'none' }}>
              Faceless channel ideas
            </a>{' '}
            — niches that work without a face on camera.
          </li>
        </ul>

        <p style={{ color: MUTED, fontSize: '0.85rem', lineHeight: 1.6 }}>
          All rates on this page are estimated typical ranges for illustration, updated{' '}
          {UPDATED}. They are not guarantees of income. Clipping campaign payouts depend
          on each campaign&rsquo;s rules, view verification and remaining budget;
          platform ad-share rates depend on niche, geography and platform terms, which
          can change at any time.
        </p>
      </div>
    </main>
  )
}
