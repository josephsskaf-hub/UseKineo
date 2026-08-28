import type { Metadata } from 'next'
import Link from 'next/link'
import Footer from '@/components/Footer'
import { agencyPacksHref } from '@/lib/agencyDistribution'
import { getFreeTierOffer } from '@/lib/freeTierOffer'
import {
  buildRealEstateStudioHref,
  REAL_ESTATE_SHORT_FORMATS,
} from '@/lib/growth/realEstateShorts'

const CANONICAL = 'https://www.usekineo.com/real-estate-video-maker'
const OFFER = getFreeTierOffer()
const STUDIO_HREF = buildRealEstateStudioHref()
const AGENCY_HREF = agencyPacksHref('real_estate')

export const dynamic = 'force-static'

export const metadata: Metadata = {
  metadataBase: new URL('https://www.usekineo.com'),
  title: 'AI Real Estate Video Maker for Market Updates & Reels | Kineo',
  description:
    'Turn verified market stats, neighborhood facts and buyer or seller tips into faceless 9:16 real estate Shorts. Not a listing-tour or MLS-photo tool.',
  alternates: { canonical: CANONICAL },
  openGraph: {
    title: 'AI real estate Shorts from facts you verify',
    description:
      'Create faceless market updates, neighborhood guides and client-answer Reels without pretending generated footage is the property.',
    url: CANONICAL,
    type: 'website',
    images: [{ url: '/og-card.png', width: 1200, height: 630, alt: 'Kineo AI real estate video maker' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AI real estate Shorts from facts you verify',
    description: 'Market updates, neighborhood guides and client-answer Reels — faceless and vertical.',
    images: ['/og-card.png'],
  },
}
const faq = [
  {
    q: 'Can Kineo turn a property listing or MLS photos into a virtual tour?',
    a: 'No. This workflow starts from text and creates a faceless vertical Short. It does not ingest an MLS listing, preserve room geometry or produce a faithful walkthrough of a specific property.',
  },
  {
    q: 'What real estate videos can I make?',
    a: 'Use verified inputs to make local market updates, neighborhood guides, buyer or seller education, myth-versus-fact videos and answers to common client questions.',
  },
  {
    q: 'Does Kineo verify housing statistics or legal claims?',
    a: 'No. The agent or brokerage must supply and verify every statistic, source, legal statement, limitation and call to action before publishing.',
  },
  {
    q: 'Can a real estate team buy videos without a subscription?',
    a: 'Yes. Kineo publishes one-time self-service Fast Short packs for businesses and client work. They use one account and do not include team seats, approval routing or a white-label portal.',
  },
]

const structuredData = [
  {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Kineo AI Real Estate Video Maker',
    url: CANONICAL,
    applicationCategory: 'MultimediaApplication',
    operatingSystem: 'Web',
    description:
      'A text-to-Short workflow for faceless real estate market updates, neighborhood guides and buyer or seller education.',
  },
  {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faq.map((item) => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: { '@type': 'Answer', text: item.a },
    })),
  },
]

const card = {
  background: 'rgba(15,18,26,.9)',
  border: '1px solid rgba(255,255,255,.1)',
} as const

export default function RealEstateVideoMakerPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      <main style={{ minHeight: '100vh', background: '#030405', color: '#f5f5f7', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
        <div style={{ maxWidth: 1040, margin: '0 auto', padding: '28px 18px 80px' }}>
          <nav aria-label="Page navigation" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 18 }}>
            <Link href="/" style={{ color: '#2997ff', fontWeight: 900, textDecoration: 'none', fontSize: '1.05rem' }}>Kineo</Link>
            <Link href="/business-video-content-plan" style={{ color: '#9a9aa1', textDecoration: 'none', fontSize: '.82rem' }}>Free weekly planner</Link>
          </nav>

          <section style={{ marginTop: 50, textAlign: 'center' }}>
            <div style={{ display: 'inline-block', color: '#7dd3fc', background: 'rgba(14,165,233,.1)', border: '1px solid rgba(125,211,252,.25)', borderRadius: 999, padding: '7px 14px', fontSize: '.72rem', fontWeight: 900, letterSpacing: '.09em', textTransform: 'uppercase' }}>
              For real estate agents and brokerages
            </div>
            <h1 style={{ fontSize: 'clamp(2.15rem, 7vw, 4.3rem)', lineHeight: 1, letterSpacing: '-.05em', fontWeight: 950, margin: '18px auto 0', maxWidth: 920 }}>
              Make real estate Shorts from facts you verify
            </h1>
            <p style={{ color: '#b4b4bc', fontSize: 'clamp(1rem, 2.2vw, 1.16rem)', lineHeight: 1.65, margin: '19px auto 0', maxWidth: 760 }}>
              Turn a local market update, neighborhood guide or client question into a scripted, voiced and captioned 9:16 video — without filming yourself or pretending generated footage is the home for sale.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 10, marginTop: 25 }}>
              <Link href={STUDIO_HREF} style={{ minHeight: 50, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '0 22px', borderRadius: 12, background: '#7dd3fc', color: '#041018', fontWeight: 920, textDecoration: 'none' }}>
                Start a real estate Short →
              </Link>
              <Link href="/business-video-content-plan" style={{ minHeight: 50, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '0 22px', borderRadius: 12, border: '1px solid rgba(255,255,255,.16)', color: '#f5f5f7', fontWeight: 850, textDecoration: 'none' }}>
                Build the weekly plan first
              </Link>
            </div>
            <p style={{ color: '#777780', fontSize: '.78rem', lineHeight: 1.5, margin: '13px auto 0' }}>{OFFER.copy.sentence}</p>
          </section>

          <section aria-labelledby="direct-answer-heading" style={{ ...card, marginTop: 38, borderRadius: 20, padding: 'clamp(20px, 4vw, 30px)', borderColor: 'rgba(125,211,252,.28)' }}>
            <div style={{ color: '#7dd3fc', fontSize: '.7rem', fontWeight: 900, letterSpacing: '.12em', textTransform: 'uppercase' }}>Direct answer</div>
            <h2 id="direct-answer-heading" style={{ fontSize: 'clamp(1.45rem, 4vw, 2.2rem)', margin: '8px 0 0', lineHeight: 1.1 }}>What is Kineo useful for in real estate?</h2>
            <p style={{ color: '#b7b7bf', fontSize: '.96rem', lineHeight: 1.7, margin: '13px 0 0', maxWidth: 880 }}>
              Kineo is useful when the source is a fact pattern or an explanation: a monthly market recap, a neighborhood overview, a financing question or a seller tip. It turns the text into one finished faceless Short. It is not the right tool for an MLS-photo tour, a geometrically faithful walkthrough, a digital twin of the agent or a claim that has not been checked.
            </p>
          </section>

          <section aria-labelledby="formats-heading" style={{ marginTop: 44 }}>
            <div style={{ textAlign: 'center', maxWidth: 720, margin: '0 auto' }}>
              <div style={{ color: '#7dd3fc', fontSize: '.7rem', fontWeight: 900, letterSpacing: '.12em', textTransform: 'uppercase' }}>Three repeatable formats</div>
              <h2 id="formats-heading" style={{ fontSize: 'clamp(1.7rem, 4.5vw, 2.7rem)', margin: '9px 0 0', lineHeight: 1.06 }}>Bring the facts. Kineo builds the Short.</h2>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 270px), 1fr))', gap: 14, marginTop: 24 }}>
              {REAL_ESTATE_SHORT_FORMATS.map((format, index) => (
                <article key={format.id} style={{ ...card, borderRadius: 18, padding: 21 }}>
                  <div style={{ width: 34, height: 34, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(125,211,252,.1)', color: '#7dd3fc', fontWeight: 950 }}>{index + 1}</div>
                  <h3 style={{ fontSize: '1.12rem', margin: '14px 0 0' }}>{format.title}</h3>
                  <p style={{ color: '#f1f5f9', fontWeight: 800, fontSize: '.9rem', lineHeight: 1.5, margin: '8px 0 0' }}>“{format.hook}”</p>
                  <div style={{ marginTop: 16 }}>
                    <div style={{ color: '#7dd3fc', fontSize: '.68rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '.08em' }}>Supply</div>
                    <p style={{ color: '#a3a3ab', fontSize: '.82rem', lineHeight: 1.58, margin: '5px 0 0' }}>{format.inputs}</p>
                  </div>
                  <div style={{ marginTop: 13, paddingTop: 13, borderTop: '1px solid rgba(255,255,255,.08)' }}>
                    <div style={{ color: '#fbbf24', fontSize: '.68rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '.08em' }}>Boundary</div>
                    <p style={{ color: '#8d8d96', fontSize: '.78rem', lineHeight: 1.55, margin: '5px 0 0' }}>{format.boundary}</p>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section style={{ marginTop: 44, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))', gap: 14 }}>
            <article style={{ ...card, borderRadius: 18, padding: 22 }}>
              <div style={{ color: '#34d399', fontSize: '.7rem', fontWeight: 900, letterSpacing: '.1em', textTransform: 'uppercase' }}>The finished asset</div>
              <h2 style={{ fontSize: '1.25rem', margin: '9px 0 0' }}>One vertical Short, ready for social</h2>
              <ul style={{ color: '#a9a9b1', fontSize: '.86rem', lineHeight: 1.65, paddingLeft: 19, margin: '13px 0 0' }}>
                <li>Hook, structured script and payoff</li>
                <li>AI voiceover, matched visuals and burned-in captions</li>
                <li>9:16 MP4 for Reels, TikTok and YouTube Shorts</li>
                <li>Review before you publish; you remain responsible for every claim</li>
              </ul>
            </article>
            <article style={{ ...card, borderRadius: 18, padding: 22 }}>
              <div style={{ color: '#fbbf24', fontSize: '.7rem', fontWeight: 900, letterSpacing: '.1em', textTransform: 'uppercase' }}>The honest limit</div>
              <h2 style={{ fontSize: '1.25rem', margin: '9px 0 0' }}>Do not use it as property evidence</h2>
              <p style={{ color: '#a9a9b1', fontSize: '.86rem', lineHeight: 1.68, margin: '13px 0 0' }}>
                Generated and stock visuals can set context, but they are not proof of a room, view, amenity, boundary or condition. For a specific listing, publish the real property media separately and never label illustrative footage as the home.
              </p>
            </article>
          </section>

          <section style={{ ...card, marginTop: 44, borderRadius: 20, padding: 'clamp(21px, 4vw, 30px)', textAlign: 'center', borderColor: 'rgba(52,211,153,.25)' }}>
            <div style={{ color: '#34d399', fontSize: '.7rem', fontWeight: 900, letterSpacing: '.12em', textTransform: 'uppercase' }}>For teams and client work</div>
            <h2 style={{ fontSize: 'clamp(1.45rem, 4vw, 2.25rem)', margin: '9px 0 0' }}>Need a month of real estate Shorts?</h2>
            <p style={{ color: '#a9a9b1', fontSize: '.9rem', lineHeight: 1.65, maxWidth: 680, margin: '12px auto 0' }}>
              Compare the existing one-time Fast Short packs for agents, brokerages and freelancers. They are self-service, use one Kineo account and do not include team seats, client workspaces, approval routing or white-label delivery.
            </p>
            <Link href={AGENCY_HREF} style={{ minHeight: 48, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '0 20px', marginTop: 18, borderRadius: 12, background: '#34d399', color: '#04110c', fontWeight: 920, textDecoration: 'none' }}>
              Compare one-time video packs →
            </Link>
          </section>

          <section aria-labelledby="faq-heading" style={{ marginTop: 46 }}>
            <h2 id="faq-heading" style={{ fontSize: '1.45rem', textAlign: 'center', margin: 0 }}>Questions before you publish</h2>
            <div style={{ display: 'grid', gap: 10, marginTop: 18 }}>
              {faq.map((item) => (
                <details key={item.q} style={{ ...card, borderRadius: 14, padding: '16px 18px' }}>
                  <summary style={{ cursor: 'pointer', color: '#f5f5f7', fontWeight: 850, lineHeight: 1.45 }}>{item.q}</summary>
                  <p style={{ color: '#9b9ba3', fontSize: '.85rem', lineHeight: 1.65, margin: '10px 0 0' }}>{item.a}</p>
                </details>
              ))}
            </div>
          </section>

          <div style={{ marginTop: 44, textAlign: 'center' }}>
            <Link href={STUDIO_HREF} style={{ minHeight: 50, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '0 24px', borderRadius: 12, background: '#7dd3fc', color: '#041018', fontWeight: 920, textDecoration: 'none' }}>
              Start with verified facts →
            </Link>
          </div>
        </div>
      </main>
      <Footer showStats={false} />
    </>
  )
}
