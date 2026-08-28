import type { CSSProperties } from 'react'
import type { Metadata } from 'next'
import Link from 'next/link'
import Footer from '@/components/Footer'
import { BULK_PACK_IDS, BULK_PACKS, formatCheckoutMoney } from '@/lib/checkoutPricing'
import AgencyPacksClient, { type AgencyPackView } from './AgencyPacksClient'
import AgencyMarginCalculator from './AgencyMarginCalculator'
import AgencyBriefClient from './AgencyBriefClient'

const CANONICAL = 'https://www.usekineo.com/ai-shorts-for-agencies'

export const metadata: Metadata = {
  title: 'AI Shorts for Agencies — 10 to 50 Client Videos | Kineo',
  description:
    'One-time AI Shorts packs for freelancers, agencies and businesses. Deliver 10–50 commercial 9:16 videos with script, AI voice, visuals and captions — no subscription.',
  alternates: { canonical: CANONICAL },
  openGraph: {
    title: 'AI Shorts for Agencies — client-ready video packs',
    description: 'Buy 10–50 commercial AI Shorts at once. One payment, clean MP4 delivery, no subscription.',
    url: CANONICAL,
    siteName: 'Kineo',
    type: 'website',
    images: [{ url: 'https://www.usekineo.com/og-card.png', width: 1200, height: 630, alt: 'Kineo AI Shorts for agencies' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AI Shorts for Agencies — 10 to 50 client videos',
    description: 'One-time commercial video packs with script, AI voice, visuals and captions.',
    images: ['https://www.usekineo.com/og-card.png'],
  },
}

const PACKS: AgencyPackView[] = BULK_PACK_IDS.map((id) => {
  const pack = BULK_PACKS[id]
  return {
    id,
    videos: pack.videos,
    credits: pack.credits,
    price: formatCheckoutMoney('usd', pack.usdMinor),
    priceMinor: pack.usdMinor,
    perVideo: formatCheckoutMoney('usd', Math.round(pack.usdMinor / pack.videos)),
  }
})

const FAQ = [
  {
    q: 'Can I deliver Kineo videos to paying clients?',
    a: 'Yes. Commercial use is included: the finished videos you generate are yours to post, monetize or deliver to a client. You may not resell access to Kineo itself.',
  },
  {
    q: 'Is this a subscription?',
    a: 'No. Agency packs are one-time purchases in USD. The credits remain in your account until you use them.',
  },
  {
    q: 'Does a 30-video pack always create exactly 30 videos?',
    a: 'It covers 30 Fast videos and includes operating headroom. Credits are universal, so choosing a premium generative engine uses more credits per video and reduces the number you can make.',
  },
  {
    q: 'Does Kineo include team seats, client approval portals or white-label software?',
    a: 'No. These are self-service production packs for one Kineo account. You receive clean MP4 files that you can deliver under your own service, but Kineo is not a multi-seat or white-label client portal.',
  },
] as const

const WHO = [
  { title: 'Freelancers', copy: 'Turn a signed content package into a predictable production cost before you start editing.' },
  { title: 'Social media agencies', copy: 'Batch short-form deliverables for multiple clients without adding another monthly software commitment.' },
  { title: 'Businesses', copy: 'Create your own Reels, TikToks and YouTube Shorts without a camera crew or agency retainer.' },
] as const

export default function AiShortsForAgenciesPage() {
  const low = Math.min(...PACKS.map((pack) => pack.priceMinor)) / 100
  const high = Math.max(...PACKS.map((pack) => pack.priceMinor)) / 100
  const structuredData = [
    {
      '@context': 'https://schema.org',
      '@type': 'Service',
      name: 'Kineo AI Shorts packs for agencies',
      url: CANONICAL,
      provider: { '@type': 'Organization', name: 'Kineo', url: 'https://www.usekineo.com' },
      description: 'One-time commercial AI Shorts production packs for freelancers, agencies and businesses.',
      offers: {
        '@type': 'AggregateOffer',
        priceCurrency: 'USD',
        lowPrice: low.toFixed(2),
        highPrice: high.toFixed(2),
        offerCount: PACKS.length,
      },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: FAQ.map((item) => ({
        '@type': 'Question',
        name: item.q,
        acceptedAnswer: { '@type': 'Answer', text: item.a },
      })),
    },
  ]

  const sectionTitle: CSSProperties = {
    color: '#f5f5f7',
    fontSize: 'clamp(1.55rem, 4vw, 2.2rem)',
    lineHeight: 1.12,
    fontWeight: 900,
    margin: 0,
  }

  return (
    <main style={{ minHeight: '100vh', background: '#050608', color: '#f5f5f7', fontFamily: 'var(--font-inter), system-ui, sans-serif' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />

      <header style={{ borderBottom: '1px solid rgba(255,255,255,.07)', background: 'rgba(5,6,8,.9)' }}>
        <div style={{ maxWidth: 1160, margin: '0 auto', padding: '17px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 18 }}>
          <Link href="/" style={{ color: '#fff', textDecoration: 'none', fontSize: 18, fontWeight: 900 }}>
            ⚡ Kineo
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <Link href="/examples" style={{ color: '#a5a5ac', textDecoration: 'none', fontSize: 13, fontWeight: 700 }}>Examples</Link>
            <Link href="/login?redirect=%2Fai-shorts-for-agencies" style={{ color: '#fff', textDecoration: 'none', fontSize: 13, fontWeight: 850, background: '#24262c', border: '1px solid rgba(255,255,255,.12)', borderRadius: 999, padding: '9px 15px' }}>Sign in</Link>
          </div>
        </div>
      </header>

      <div style={{ maxWidth: 1160, margin: '0 auto', padding: '68px 20px 88px' }}>
        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 420px), 1fr))', gap: 38, alignItems: 'center' }}>
          <div>
            <span style={{ display: 'inline-flex', color: '#34d399', background: 'rgba(52,211,153,.1)', border: '1px solid rgba(52,211,153,.35)', borderRadius: 999, padding: '7px 12px', fontSize: 11, fontWeight: 900, letterSpacing: '.12em', textTransform: 'uppercase' }}>
              Commercial video production · one payment
            </span>
            <h1 style={{ fontSize: 'clamp(2.35rem, 6vw, 4.6rem)', letterSpacing: '-.045em', lineHeight: .98, margin: '20px 0 18px', fontWeight: 950 }}>
              Ship 10–50 client Shorts without an agency retainer
            </h1>
            <p style={{ color: '#aaaab1', fontSize: 'clamp(1rem, 2.2vw, 1.2rem)', lineHeight: 1.63, maxWidth: 650, margin: 0 }}>
              Kineo turns a topic or script into a finished 9:16 video — script, AI voiceover, matched visuals and burned-in captions. Buy the batch once, deliver clean MP4s commercially and keep the margin.
            </p>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 26 }}>
              <a href="#agency-pack-heading" style={{ color: '#04110c', background: '#34d399', borderRadius: 999, padding: '13px 20px', fontSize: 14, fontWeight: 900, textDecoration: 'none' }}>
                See one-time packs ↓
              </a>
              <Link href="/examples" style={{ color: '#fff', border: '1px solid rgba(255,255,255,.16)', borderRadius: 999, padding: '13px 20px', fontSize: 14, fontWeight: 800, textDecoration: 'none' }}>
                Watch real outputs
              </Link>
            </div>
          </div>

          <div style={{ borderRadius: 24, padding: 24, border: '1px solid rgba(41,151,255,.25)', background: 'radial-gradient(circle at 100% 0%, rgba(41,151,255,.2), transparent 42%), #101116' }}>
            <div style={{ color: '#5cb3ff', fontWeight: 900, fontSize: 11, letterSpacing: '.13em', textTransform: 'uppercase' }}>What each file includes</div>
            <div style={{ display: 'grid', gap: 12, marginTop: 18 }}>
              {[
                ['01', 'Hook and complete short-form script'],
                ['02', 'AI voiceover timed to the narration'],
                ['03', 'Visuals matched scene by scene'],
                ['04', 'Burned-in captions and vertical MP4'],
              ].map(([number, label]) => (
                <div key={number} style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '12px 13px', borderRadius: 13, background: 'rgba(255,255,255,.045)', border: '1px solid rgba(255,255,255,.07)' }}>
                  <span style={{ color: '#34d399', fontWeight: 900, fontSize: 12 }}>{number}</span>
                  <span style={{ color: '#dedee2', fontSize: 14, fontWeight: 720 }}>{label}</span>
                </div>
              ))}
            </div>
            <p style={{ color: '#85858c', fontSize: 12, lineHeight: 1.55, margin: '16px 2px 0' }}>
              Self-service production, not a human editing service. You choose the topics, review the outputs and deliver the final files.
            </p>
          </div>
        </section>

        <AgencyMarginCalculator packs={PACKS} />

        <AgencyPacksClient packs={PACKS} />

        <AgencyBriefClient />

        <section style={{ marginTop: 76 }}>
          <h2 style={sectionTitle}>Built for the person responsible for publishing</h2>
          <p style={{ color: '#929299', lineHeight: 1.65, margin: '12px 0 22px', maxWidth: 760 }}>
            This is not a seat-based enterprise suite. It is a direct production budget for people who already know how many Shorts they need to ship.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(235px, 1fr))', gap: 13 }}>
            {WHO.map((item) => (
              <article key={item.title} style={{ padding: 20, borderRadius: 17, background: '#111216', border: '1px solid rgba(255,255,255,.09)' }}>
                <h3 style={{ color: '#f5f5f7', fontSize: 17, margin: 0, fontWeight: 850 }}>{item.title}</h3>
                <p style={{ color: '#929299', fontSize: 14, lineHeight: 1.6, margin: '8px 0 0' }}>{item.copy}</p>
              </article>
            ))}
          </div>
        </section>

        <section style={{ marginTop: 76, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 350px), 1fr))', gap: 28, alignItems: 'start' }}>
          <div>
            <span style={{ color: '#5cb3ff', fontWeight: 850, fontSize: 11, letterSpacing: '.12em', textTransform: 'uppercase' }}>Know the boundary before buying</span>
            <h2 style={{ ...sectionTitle, marginTop: 9 }}>Commercial output, without fake enterprise promises</h2>
            <p style={{ color: '#929299', lineHeight: 1.65, margin: '13px 0 0' }}>
              You can sell and deliver the finished videos. Kineo does not currently include team seats, separate client workspaces, approval routing or a white-label portal. One account owns the balance and the library.
            </p>
            <Link href="/terms" style={{ display: 'inline-block', marginTop: 14, color: '#5cb3ff', fontWeight: 800, textDecoration: 'none' }}>Read the commercial-use terms →</Link>
          </div>
          <div style={{ padding: 22, borderRadius: 18, background: 'rgba(245,158,11,.07)', border: '1px solid rgba(245,158,11,.25)' }}>
            <div style={{ color: '#fbbf24', fontWeight: 900, fontSize: 12, textTransform: 'uppercase', letterSpacing: '.12em' }}>Not a fit when</div>
            <ul style={{ margin: '14px 0 0', paddingLeft: 20, color: '#bcbcc2', fontSize: 14, lineHeight: 1.75 }}>
              <li>several teammates need separate logins;</li>
              <li>your customer must approve inside the platform;</li>
              <li>you need landscape, long-form or source-footage editing;</li>
              <li>you expect a human editor to revise every scene.</li>
            </ul>
          </div>
        </section>

        <section style={{ marginTop: 76 }}>
          <h2 style={sectionTitle}>Questions before you put client work through Kineo</h2>
          <div style={{ display: 'grid', gap: 11, marginTop: 20 }}>
            {FAQ.map((item) => (
              <details key={item.q} style={{ borderRadius: 15, background: '#111216', border: '1px solid rgba(255,255,255,.09)', padding: '16px 18px' }}>
                <summary style={{ cursor: 'pointer', color: '#f5f5f7', fontWeight: 820, fontSize: 15 }}>{item.q}</summary>
                <p style={{ color: '#929299', fontSize: 14, lineHeight: 1.65, margin: '10px 0 0' }}>{item.a}</p>
              </details>
            ))}
          </div>
        </section>

        <section style={{ marginTop: 76, textAlign: 'center', borderRadius: 24, padding: '38px 22px', background: 'linear-gradient(135deg, rgba(52,211,153,.13), rgba(41,151,255,.1))', border: '1px solid rgba(52,211,153,.3)' }}>
          <h2 style={{ ...sectionTitle, margin: '0 auto' }}>Start with the batch you can deliver this month</h2>
          <p style={{ color: '#aaaab1', lineHeight: 1.6, margin: '11px auto 20px', maxWidth: 660 }}>
            No sales call and no recurring contract. Choose a one-time pack above; sign-in is handled before secure Stripe checkout.
          </p>
          <a href="#agency-pack-heading" style={{ display: 'inline-flex', color: '#04110c', background: '#34d399', borderRadius: 999, padding: '13px 21px', fontSize: 14, fontWeight: 900, textDecoration: 'none' }}>Compare the four packs ↑</a>
        </section>
      </div>

      <Footer />
    </main>
  )
}
