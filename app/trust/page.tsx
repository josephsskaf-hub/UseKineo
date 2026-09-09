import type { CSSProperties } from 'react'
import type { Metadata } from 'next'
import Link from 'next/link'
import Footer from '@/components/Footer'
import TrustActions from './TrustActions'

const BASE = 'https://www.usekineo.com'
const CANONICAL = `${BASE}/trust`

export const metadata: Metadata = {
  title: 'Kineo Trust Center — Privacy, Payments & Commercial Rights',
  description:
    'Verify who operates Kineo, how payments and customer videos are handled, what commercial rights you receive, and how to contact the founder.',
  alternates: { canonical: CANONICAL },
  openGraph: {
    title: 'Kineo Trust Center',
    description: 'Plain-language facts about privacy, payments, video ownership, refunds and who operates Kineo.',
    url: CANONICAL,
    siteName: 'Kineo',
    type: 'website',
    images: [{ url: `${BASE}/og-card.png`, width: 1200, height: 630, alt: 'Kineo Trust Center' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Kineo Trust Center',
    description: 'Privacy, payments, commercial rights and direct founder contact — without invented badges.',
    images: [`${BASE}/og-card.png`],
  },
}

const FACTS = [
  {
    eyebrow: 'Operator',
    title: 'A real founder, reachable directly',
    body: 'Kineo is an independent software product built and operated by Joseph Skaf. Product and account questions go to support@usekineo.com — not an anonymous ticket marketplace.',
    link: { href: 'mailto:support@usekineo.com?subject=Question%20about%20Kineo', label: 'Email support@usekineo.com' },
  },
  {
    eyebrow: 'Payments',
    title: 'Card details stay with Stripe',
    body: 'Checkout runs on Stripe. Kineo receives the payment result and account entitlement; it does not receive or store your full card number.',
    link: { href: '/pricing', label: 'See current plans and checkout terms' },
  },
  {
    eyebrow: 'Customer work',
    title: 'Your library is private by default',
    body: 'A completed customer video is not added to Kineo’s public galleries, public video sitemap or related-video rails. Public examples are a separate founder-approved set.',
    link: { href: '/examples', label: 'See the separate public examples' },
  },
  {
    eyebrow: 'Commercial use',
    title: 'You keep the videos you generate',
    body: 'You can post, monetize or deliver your finished videos to a client. The service itself cannot be resold, and every AI output should be reviewed before publication.',
    link: { href: '/terms', label: 'Read the exact Terms of Service' },
  },
  {
    eyebrow: 'Data',
    title: 'Processors are named, not hidden',
    body: 'Kineo uses Supabase for authentication and data, Stripe for payment, Vercel for hosting, Resend for transactional email and the AI or stock providers required for a render.',
    link: { href: '/privacy', label: 'Read the Privacy Policy' },
  },
  {
    eyebrow: 'Purchase protection',
    title: 'Seven days to request the first-month refund',
    body: 'The first paid subscription month has a 7-day money-back guarantee. Failed generations return their credits automatically. Refund requests go directly to support.',
    link: { href: 'mailto:support@usekineo.com?subject=Kineo%20refund%20request', label: 'Contact support' },
  },
] as const

const NOT_CLAIMED = [
  'No invented customer count, retention rate or “#1 tool” badge.',
  'No SOC 2, ISO 27001 or enterprise SLA claim.',
  'No promise that AI output is factually perfect — review remains your responsibility.',
  'No team seats, client approval portal or white-label software claim.',
] as const

const FAQ = [
  {
    q: 'Is Kineo the same company as the unrelated products named “Kineo” elsewhere?',
    a: 'This Trust Center describes only the AI Shorts product at www.usekineo.com. The canonical domain is part of every link and policy on this page.',
  },
  {
    q: 'Does Kineo publish customer videos as examples?',
    a: 'No. Customer videos are private by default. Public examples come from a separate, founder-approved allowlist.',
  },
  {
    q: 'Can I use a Kineo video for a paying client?',
    a: 'Yes. The finished video can be delivered commercially. You may not resell access to Kineo itself or redistribute standalone stock footage from inside a finished render.',
  },
  {
    q: 'Where do I request account deletion or a refund?',
    a: 'Email support@usekineo.com. Data-access and deletion requests are handled under the Privacy Policy; first-month subscription refund requests are covered for seven days under the Terms.',
  },
] as const

export default function TrustPage() {
  const structuredData = [
    {
      '@context': 'https://schema.org',
      '@type': 'AboutPage',
      name: 'Kineo Trust Center',
      url: CANONICAL,
      description: metadata.description,
      mainEntity: {
        '@type': 'Organization',
        name: 'Kineo',
        url: BASE,
        founder: { '@type': 'Person', name: 'Joseph Skaf' },
        email: 'support@usekineo.com',
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
    fontSize: 'clamp(1.55rem, 4vw, 2.25rem)',
    lineHeight: 1.12,
    fontWeight: 900,
    margin: 0,
  }

  return (
    <main style={{ minHeight: '100vh', background: '#050608', color: '#f5f5f7', fontFamily: 'var(--font-inter), system-ui, sans-serif' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />

      <header style={{ borderBottom: '1px solid rgba(255,255,255,.07)', background: 'rgba(5,6,8,.92)' }}>
        <div style={{ maxWidth: 1120, margin: '0 auto', padding: '17px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 18 }}>
          <Link href="/" style={{ color: '#fff', textDecoration: 'none', fontSize: 18, fontWeight: 900 }}>⚡ Kineo</Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <Link href="/terms" style={{ color: '#a5a5ac', textDecoration: 'none', fontSize: 13, fontWeight: 700 }}>Terms</Link>
            <Link href="/privacy" style={{ color: '#a5a5ac', textDecoration: 'none', fontSize: 13, fontWeight: 700 }}>Privacy</Link>
            <Link href="/signup?utm_source=trust&utm_medium=organic&utm_campaign=trust_center" style={{ color: '#fff', textDecoration: 'none', fontSize: 13, fontWeight: 850, background: '#24262c', border: '1px solid rgba(255,255,255,.12)', borderRadius: 999, padding: '9px 15px' }}>Start free</Link>
          </div>
        </div>
      </header>

      <div style={{ maxWidth: 1120, margin: '0 auto', padding: '72px 20px 88px' }}>
        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 420px), 1fr))', gap: 38, alignItems: 'center' }}>
          <div>
            <span style={{ display: 'inline-flex', color: '#67e8f9', background: 'rgba(34,211,238,.08)', border: '1px solid rgba(34,211,238,.3)', borderRadius: 999, padding: '7px 12px', fontSize: 11, fontWeight: 900, letterSpacing: '.12em', textTransform: 'uppercase' }}>
              Last reviewed · August 27, 2026
            </span>
            <h1 style={{ fontSize: 'clamp(2.45rem, 6vw, 4.8rem)', letterSpacing: '-.05em', lineHeight: .97, margin: '20px 0 18px', fontWeight: 950 }}>
              Verify Kineo before you trust it with a card or a client video
            </h1>
            <p style={{ color: '#aaaab1', fontSize: 'clamp(1rem, 2.2vw, 1.2rem)', lineHeight: 1.65, maxWidth: 670, margin: 0 }}>
              No borrowed logos and no anonymous superlatives. These are the concrete policies, processors and people behind the AI Shorts product at <strong style={{ color: '#e5e7eb' }}>www.usekineo.com</strong>.
            </p>
            <TrustActions />
          </div>

          <aside style={{ borderRadius: 24, padding: 24, border: '1px solid rgba(52,211,153,.28)', background: 'radial-gradient(circle at 100% 0%, rgba(52,211,153,.18), transparent 42%), #101116' }}>
            <div style={{ color: '#6ee7b7', fontWeight: 900, fontSize: 11, letterSpacing: '.13em', textTransform: 'uppercase' }}>Fast verification</div>
            <div style={{ display: 'grid', gap: 11, marginTop: 18 }}>
              {[
                ['Canonical site', 'www.usekineo.com'],
                ['Founder', 'Joseph Skaf'],
                ['Support', 'support@usekineo.com'],
                ['Payments', 'Stripe-hosted checkout'],
                ['Customer videos', 'Private by default'],
                ['Commercial output', 'Allowed under the Terms'],
              ].map(([label, value]) => (
                <div key={label} style={{ display: 'grid', gridTemplateColumns: 'minmax(110px, .8fr) minmax(0, 1.2fr)', gap: 14, padding: '11px 12px', borderRadius: 12, background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.065)' }}>
                  <span style={{ color: '#85858c', fontSize: 12, fontWeight: 750 }}>{label}</span>
                  <span style={{ color: '#f1f5f9', fontSize: 12, fontWeight: 850, overflowWrap: 'anywhere' }}>{value}</span>
                </div>
              ))}
            </div>
          </aside>
        </section>

        <section style={{ marginTop: 80 }}>
          <p style={{ color: '#5cb3ff', fontWeight: 900, fontSize: 11, letterSpacing: '.12em', textTransform: 'uppercase', margin: '0 0 10px' }}>Six facts you can check</p>
          <h2 style={sectionTitle}>The promise is only as strong as the boundary</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(285px, 1fr))', gap: 14, marginTop: 24 }}>
            {FACTS.map((fact) => (
              <article key={fact.title} style={{ padding: 22, borderRadius: 18, background: '#111216', border: '1px solid rgba(255,255,255,.09)' }}>
                <div style={{ color: '#67e8f9', fontWeight: 900, fontSize: 10, letterSpacing: '.13em', textTransform: 'uppercase' }}>{fact.eyebrow}</div>
                <h3 style={{ color: '#f5f5f7', fontSize: 18, lineHeight: 1.25, margin: '10px 0 8px', fontWeight: 880 }}>{fact.title}</h3>
                <p style={{ color: '#929299', fontSize: 14, lineHeight: 1.65, margin: 0 }}>{fact.body}</p>
                {fact.link.href.startsWith('mailto:') ? (
                  <a href={fact.link.href} style={{ display: 'inline-block', marginTop: 14, color: '#5cb3ff', fontSize: 13, fontWeight: 800, textDecoration: 'none' }}>{fact.link.label} →</a>
                ) : (
                  <Link href={fact.link.href} style={{ display: 'inline-block', marginTop: 14, color: '#5cb3ff', fontSize: 13, fontWeight: 800, textDecoration: 'none' }}>{fact.link.label} →</Link>
                )}
              </article>
            ))}
          </div>
        </section>

        <section style={{ marginTop: 76, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 360px), 1fr))', gap: 28, alignItems: 'start' }}>
          <div>
            <p style={{ color: '#fbbf24', fontWeight: 900, fontSize: 11, letterSpacing: '.12em', textTransform: 'uppercase', margin: '0 0 10px' }}>Claims deliberately not made</p>
            <h2 style={sectionTitle}>Trust does not need imaginary proof</h2>
            <p style={{ color: '#929299', lineHeight: 1.65, margin: '13px 0 0' }}>
              Kineo is a young, independently operated product. That is not hidden behind enterprise language or badges that have not been earned.
            </p>
          </div>
          <div style={{ padding: 22, borderRadius: 18, background: 'rgba(245,158,11,.065)', border: '1px solid rgba(245,158,11,.24)' }}>
            <ul style={{ margin: 0, paddingLeft: 20, color: '#c5c5cb', fontSize: 14, lineHeight: 1.8 }}>
              {NOT_CLAIMED.map((item) => <li key={item}>{item}</li>)}
            </ul>
          </div>
        </section>

        <section style={{ marginTop: 76 }}>
          <h2 style={sectionTitle}>Questions people ask before creating an account</h2>
          <div style={{ display: 'grid', gap: 11, marginTop: 20 }}>
            {FAQ.map((item) => (
              <details key={item.q} style={{ borderRadius: 15, background: '#111216', border: '1px solid rgba(255,255,255,.09)', padding: '16px 18px' }}>
                <summary style={{ cursor: 'pointer', color: '#f5f5f7', fontWeight: 820, fontSize: 15 }}>{item.q}</summary>
                <p style={{ color: '#929299', fontSize: 14, lineHeight: 1.65, margin: '10px 0 0' }}>{item.a}</p>
              </details>
            ))}
          </div>
        </section>

        <section style={{ marginTop: 76, textAlign: 'center', borderRadius: 24, padding: '38px 22px', background: 'linear-gradient(135deg, rgba(34,211,238,.1), rgba(52,211,153,.1))', border: '1px solid rgba(103,232,249,.25)' }}>
          <h2 style={{ ...sectionTitle, margin: '0 auto' }}>Verify the output before you pay</h2>
          <p style={{ color: '#aaaab1', lineHeight: 1.6, margin: '11px auto 20px', maxWidth: 650 }}>
            Watch public examples, create your own watermarked Fast preview without a card, and only then decide whether Kineo belongs in your workflow.
          </p>
          <Link href="/signup?utm_source=trust&utm_medium=organic&utm_campaign=trust_center_bottom" style={{ display: 'inline-flex', color: '#04110c', background: '#34d399', borderRadius: 999, padding: '13px 21px', fontSize: 14, fontWeight: 900, textDecoration: 'none' }}>Create a free preview →</Link>
        </section>
      </div>

      <Footer />
    </main>
  )
}
