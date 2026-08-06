// KINEO-SEO-2026-07-25 — "TikTok vs YouTube Shorts: Which Pays More in 2026?"
// Low-difficulty SERP gap: the comparison query "tiktok vs youtube shorts
// monetization" / "which pays more" is dominated by thin micro-sites. This page
// is an honest, balanced side-by-side of the two monetization models, with a
// comparison table, an estimated-earnings band (clearly labeled as estimates)
// and accurate-as-of-2026 program requirements. Server component, force-static,
// zero client JS. Visual style mirrors app/state-of-ai-shorts-2026 and
// app/facts. JSON-LD: FAQPage (mirrors the visible FAQ) + BreadcrumbList.
// Verdict is deliberately not a single-platform answer — the honest winner is
// posting the same 9:16 export to both, which is Kineo's whole pitch.

import type { Metadata } from 'next'
import { getFreeTierOffer, swapFreeTierCopy as ft } from '@/lib/freeTierOffer'

// [KINEO-TRIAL-SWAP-2026-08-07] — oferta do free tier (flag OFF = copy atual).
const OFFER = getFreeTierOffer()

export const dynamic = 'force-static'

const UPDATED = 'July 25, 2026'
const CANONICAL = 'https://www.usekineo.com/tiktok-vs-youtube-shorts-monetization'

export const metadata: Metadata = {
  title: 'TikTok vs YouTube Shorts: Which Pays More in 2026?',
  description:
    'An honest, side-by-side comparison of TikTok and YouTube Shorts monetization in 2026: requirements, how you get paid, estimated RPM and earnings, payout thresholds, and which platform actually pays more.',
  alternates: { canonical: CANONICAL },
  openGraph: {
    title: 'TikTok vs YouTube Shorts: Which Pays More in 2026?',
    description:
      'YouTube Shorts ad-share vs TikTok Creator Rewards, compared honestly: requirements, estimated RPM, payout thresholds and the real verdict for 2026.',
    url: CANONICAL,
    type: 'article',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'TikTok vs YouTube Shorts: Which Pays More in 2026?',
    description:
      'Requirements, estimated RPM, payouts and an honest verdict on which short-form platform pays more in 2026.',
  },
}

// Comparison rows. Earnings figures are explicitly labeled estimates; program
// requirements are accurate as of 2026 (see notes in the verdict + FAQ).
const TABLE: { label: string; yt: string; tt: string }[] = [
  {
    label: 'Requirements to monetize',
    yt: '1,000 subscribers + either 10M valid public Shorts views in 90 days, or 4,000 valid public watch hours in 12 months (YouTube Partner Program).',
    tt: '10,000 followers + 100,000 video views in the last 30 days, age 18+, to join the Creator Rewards Program (the successor to the older Creator Fund).',
  },
  {
    label: 'How you get paid',
    yt: 'A share of ad revenue from ads shown between Shorts in the feed, pooled and paid out via RPM after music licensing costs are taken out.',
    tt: 'Performance-based rewards on qualifying videos over 1 minute long, calculated from qualified views, watch time, engagement and originality.',
  },
  {
    label: 'Typical RPM / earnings (estimated)',
    yt: 'Estimated ~$0.05–$0.30 per 1,000 Shorts views for most niches; higher-RPM niches (finance, business) can exceed that.',
    tt: 'Estimated ~$0.40–$1.00 per 1,000 qualified views on the Creator Rewards Program — but only 1-minute-plus videos qualify, and rates vary widely.',
  },
  {
    label: 'Payout threshold',
    yt: '$100 minimum balance via Google AdSense before a payout is issued.',
    tt: 'Typically a $10–$50 minimum balance depending on region before you can withdraw.',
  },
  {
    label: 'Best for',
    yt: 'Reliable per-view ad income at scale, evergreen search-friendly content, and higher-RPM info niches.',
    tt: 'Fast viral reach, longer 1-minute-plus videos, and creators who convert audience into brand deals, LIVE gifts and sales.',
  },
]

const FAQ: { q: string; a: string }[] = [
  {
    q: 'Does TikTok or YouTube Shorts pay more?',
    a: 'It depends on how you earn. Per 1,000 qualified views, TikTok’s Creator Rewards Program can post a higher headline rate (estimated ~$0.40–$1.00) than YouTube Shorts ad-share (estimated ~$0.05–$0.30) — but TikTok only pays on videos over 1 minute, while YouTube Shorts pays on every monetized Short. For most creators, YouTube Shorts delivers more reliable ad revenue per view across a whole channel, while TikTok can pay more on individual qualifying videos and is stronger for brand deals and virality. These earnings figures are estimates that vary by niche, region and season.',
  },
  {
    q: 'What are TikTok’s monetization requirements in 2026?',
    a: 'To join TikTok’s Creator Rewards Program you generally need 10,000 followers, at least 100,000 video views in the last 30 days, and to be 18 or older in an eligible region. The program rewards qualifying videos longer than 1 minute based on qualified views, watch time, engagement and originality.',
  },
  {
    q: 'What are YouTube Shorts’ monetization requirements in 2026?',
    a: 'You need to join the YouTube Partner Program: 1,000 subscribers plus either 10 million valid public Shorts views in the past 90 days, or 4,000 valid public watch hours in the past 12 months. Once accepted, YouTube shares a portion of the ad revenue earned between Shorts in the feed, paid out based on RPM.',
  },
  {
    q: 'Can I post the same video to both TikTok and YouTube Shorts?',
    a: 'Yes. A single 9:16 vertical MP4 works on YouTube Shorts, TikTok and Instagram Reels. Posting the same video to all three multiplies your reach and stacks payouts across platforms for the same production effort — which is why cross-posting almost always beats picking one platform.',
  },
  {
    q: 'Is a visible watermark a problem when cross-posting?',
    a: 'It can be. TikTok and YouTube both tend to down-rank clips that carry another app’s watermark, so exporting a clean, watermark-free video is worth it when you post the same file to multiple platforms.',
  },
]

const PAGE_BG = '#000'
const CARD = { background: '#161618', border: '1px solid #2a2a2d', borderRadius: 14 }
const ACCENT = '#2997ff'
const MUTED = '#86868b'

export default function TikTokVsYouTubeShortsPage() {
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
        name: 'TikTok vs YouTube Shorts',
        item: CANONICAL,
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
          Monetization guide — updated {UPDATED}
        </p>
        <h1 style={{ fontSize: '2.2rem', fontWeight: 800, lineHeight: 1.15, margin: '0 0 16px' }}>
          TikTok vs YouTube Shorts: Which Pays More in 2026?
        </h1>
        <p style={{ color: MUTED, fontSize: '1.08rem', lineHeight: 1.6, margin: '0 0 8px' }}>
          Short answer: it depends on how you count. TikTok can post a higher rate on a
          single qualifying video, but YouTube Shorts usually pays more reliably per view
          across an entire channel. Below is an honest, side-by-side breakdown of both
          monetization models, what it takes to qualify in 2026, and the earnings math —
          with every dollar figure clearly labeled as an estimate.
        </p>
        <p style={{ color: MUTED, fontSize: '0.9rem', lineHeight: 1.6, margin: '0 0 40px' }}>
          Earnings numbers below are estimated ranges that vary by niche, region and
          season. Program requirements reflect the platforms&rsquo; published rules as of{' '}
          {UPDATED}.
        </p>

        <h2 style={{ fontSize: '1.4rem', fontWeight: 700, margin: '0 0 12px' }}>
          The two monetization models, briefly
        </h2>
        <div style={{ display: 'grid', gap: 10, margin: '0 0 40px' }}>
          <section style={{ ...CARD, padding: '18px 18px' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: '0 0 8px' }}>
              YouTube Shorts — ad revenue sharing (RPM-based)
            </h3>
            <p style={{ color: '#d2d2d7', lineHeight: 1.6, fontSize: '0.95rem', margin: 0 }}>
              YouTube runs ads between Shorts in the feed, pools that ad revenue, deducts
              music licensing costs, and shares a portion with creators in the YouTube
              Partner Program (YPP). You are paid on an RPM basis — revenue per 1,000
              views — so every monetized Short contributes, and higher-value niches like
              finance and business command higher RPMs. To join YPP on the Shorts path you
              need 1,000 subscribers and 10 million valid public Shorts views in 90 days
              (or the long-form path of 1,000 subscribers and 4,000 watch hours in 12
              months).
            </p>
          </section>
          <section style={{ ...CARD, padding: '18px 18px' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: '0 0 8px' }}>
              TikTok — Creator Rewards Program (formerly the Creator Fund)
            </h3>
            <p style={{ color: '#d2d2d7', lineHeight: 1.6, fontSize: '0.95rem', margin: 0 }}>
              TikTok retired the old flat-rate Creator Fund and replaced it with the
              Creator Rewards Program, which pays out on qualifying videos longer than 1
              minute. Rewards are calculated from qualified views, watch time, engagement
              and originality rather than a simple per-view rate. To qualify you generally
              need 10,000 followers and 100,000 video views in the last 30 days, and to be
              18 or older. Because only 1-minute-plus videos earn, TikTok rewards a
              different content strategy than sub-60-second viral clips — and many TikTok
              creators earn far more from brand deals, LIVE gifts and product sales than
              from the rewards program itself.
            </p>
          </section>
        </div>

        <h2 style={{ fontSize: '1.4rem', fontWeight: 700, margin: '0 0 6px' }}>
          Side-by-side comparison
        </h2>
        <p style={{ color: MUTED, fontSize: '0.95rem', lineHeight: 1.6, margin: '0 0 16px' }}>
          Requirements are accurate as of {UPDATED}. RPM and earnings bands are estimated
          ranges, not guarantees.
        </p>
        <div style={{ display: 'grid', gap: 8, margin: '0 0 48px' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1fr',
              gap: 8,
            }}
          >
            <div style={{ ...CARD, padding: '12px 14px', background: '#2a2a2d' }}>
              <span style={{ fontWeight: 700, fontSize: '0.85rem', color: MUTED }}>Category</span>
            </div>
            <div style={{ ...CARD, padding: '12px 14px', background: '#2a2a2d' }}>
              <span style={{ fontWeight: 800, fontSize: '0.9rem', color: ACCENT }}>
                YouTube Shorts
              </span>
            </div>
            <div style={{ ...CARD, padding: '12px 14px', background: '#2a2a2d' }}>
              <span style={{ fontWeight: 800, fontSize: '0.9rem' }}>TikTok</span>
            </div>
          </div>
          {TABLE.map((row) => (
            <div
              key={row.label}
              style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}
            >
              <div style={{ ...CARD, padding: '14px 14px' }}>
                <span style={{ fontWeight: 700, fontSize: '0.88rem' }}>{row.label}</span>
              </div>
              <div style={{ ...CARD, padding: '14px 14px' }}>
                <span style={{ color: '#d2d2d7', fontSize: '0.86rem', lineHeight: 1.5 }}>
                  {row.yt}
                </span>
              </div>
              <div style={{ ...CARD, padding: '14px 14px' }}>
                <span style={{ color: '#d2d2d7', fontSize: '0.86rem', lineHeight: 1.5 }}>
                  {row.tt}
                </span>
              </div>
            </div>
          ))}
        </div>

        <h2 style={{ fontSize: '1.4rem', fontWeight: 700, margin: '0 0 16px' }}>
          The honest verdict
        </h2>
        <div style={{ display: 'grid', gap: 10, margin: '0 0 40px' }}>
          <section style={{ ...CARD, padding: '16px 18px' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 8px' }}>
              YouTube Shorts usually pays more reliably per view
            </h3>
            <p style={{ color: '#d2d2d7', lineHeight: 1.55, fontSize: '0.95rem', margin: 0 }}>
              Because YouTube pays ad-share on every monetized Short — not just long ones —
              a channel that posts consistently tends to see steadier income that scales
              directly with views. In higher-RPM niches, the per-view economics are hard
              for TikTok to match. If your goal is predictable ad revenue from short
              content, YouTube Shorts is generally the stronger base.
            </p>
          </section>
          <section style={{ ...CARD, padding: '16px 18px' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 8px' }}>
              TikTok can win per-video and dominates on virality and deals
            </h3>
            <p style={{ color: '#d2d2d7', lineHeight: 1.55, fontSize: '0.95rem', margin: 0 }}>
              On a single qualifying 1-minute-plus video, TikTok&rsquo;s Creator Rewards
              rate can beat YouTube Shorts ad-share. More importantly, TikTok&rsquo;s
              discovery engine is unmatched for going viral fast, and that reach converts
              into brand deals, LIVE gifts and product sales that often dwarf the rewards
              payout. For creators building an audience and a business, TikTok is a
              powerful top of funnel.
            </p>
          </section>
          <section style={{ ...CARD, padding: '16px 18px', borderColor: ACCENT }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 8px' }}>
              The real winner: post the same video to both
            </h3>
            <p style={{ color: '#d2d2d7', lineHeight: 1.55, fontSize: '0.95rem', margin: 0 }}>
              You do not have to choose. The same 9:16 vertical video works on YouTube
              Shorts, TikTok and Instagram Reels. Making it once and posting it everywhere
              stacks three payout streams and three audiences on top of a single
              production effort — which almost always beats going all-in on one platform.
              The only real cost of cross-posting is the extra work of producing content,
              and that is exactly the part you can automate.
            </p>
          </section>
        </div>

        <section style={{ ...CARD, padding: '20px 20px', margin: '0 0 48px', borderColor: ACCENT }}>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: '0 0 8px' }}>
            Make it once, post it everywhere
          </h2>
          <p style={{ color: '#d2d2d7', lineHeight: 1.6, fontSize: '0.95rem', margin: '0 0 14px' }}>
            Kineo turns one typed idea into a finished faceless video and exports one clean
            9:16 MP4 you post to YouTube Shorts, TikTok <em>and</em> Instagram Reels — no
            watermark down-ranking, no re-editing per platform. {ft(OFFER, 'Generate up to 3 free videos every 24 hours, no card.', OFFER.copy.headline)}
          </p>
          <a
            href="https://www.usekineo.com/free-ai-shorts-generator?utm_source=tiktok-vs-shorts&utm_medium=seo&utm_campaign=seo-sprint"
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
          Keep reading
        </h2>
        <ul style={{ color: MUTED, lineHeight: 1.9, fontSize: '0.95rem', paddingLeft: 20, margin: '0 0 40px' }}>
          <li>
            <a href="/how-much-do-youtube-shorts-pay" style={{ color: ACCENT, textDecoration: 'none' }}>
              How much do YouTube Shorts pay?
            </a>{' '}
            — the RPM math behind Shorts ad-share.
          </li>
          <li>
            <a href="/youtube-shorts-rpm-by-niche" style={{ color: ACCENT, textDecoration: 'none' }}>
              YouTube Shorts RPM by niche
            </a>{' '}
            — which content categories pay the most per view.
          </li>
          <li>
            <a href="/shorts-money-calculator" style={{ color: ACCENT, textDecoration: 'none' }}>
              Shorts money calculator
            </a>{' '}
            — estimate your earnings from views and RPM.
          </li>
        </ul>

        <p style={{ color: MUTED, fontSize: '0.85rem', lineHeight: 1.6 }}>
          Estimated earnings ranges on this page are illustrative and vary by niche,
          region, season and platform changes. Program requirements reflect the
          platforms&rsquo; published rules as of {UPDATED}; always check YouTube and
          TikTok&rsquo;s official monetization pages for the latest thresholds before you
          rely on them.
        </p>
      </div>
    </main>
  )
}
