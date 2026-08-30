import type { Metadata } from 'next'
import type { CSSProperties } from 'react'
import Link from 'next/link'
import Footer from '@/components/Footer'
import OrganicCtaLink from '@/components/OrganicCtaLink'
import ExampleVideoPlayer from '@/app/examples/ExampleVideoPlayer'
import TopicGeneratorForm from '@/app/youtube-shorts-from-topic/TopicGeneratorForm'
import { PUBLIC_EXAMPLES, posterWebpPath } from '@/lib/publicExamples'
import ExampleLiveMedia from '@/app/examples/ExampleLiveMedia'
import ExitIntentOffer from '@/components/ExitIntentOffer'
import { buildBlankStudioSignupHref } from '@/lib/growth/publicCreationIntent'
import { getFreeTierOffer, swapFreeTierCopy as ft } from '@/lib/freeTierOffer'
import AffiliateLandingContext from '@/components/AffiliateLandingContext'
import {
  affiliateLandingContext,
  type PublicSearchParams,
} from '@/lib/growth/affiliateLandingContext'

// [KINEO-TRIAL-SWAP-2026-08-07] — oferta do free tier (flag OFF = copy atual).
const OFFER = getFreeTierOffer()

const BASE = 'https://www.usekineo.com'
const CAMPAIGN = 'push60_free_ai_shorts_generator'
const FORM_ID = 'free-ai-shorts-generator-form'
const FEATURED_EXAMPLE = PUBLIC_EXAMPLES[1]
const PUBLICATION_DATE = '2026-07-23T00:00:00.000Z'

const FEATURES = [
  {
    t: 'From idea to full Short',
    d: 'Kineo creates the script, AI voiceover, vertical visuals, pacing, and captions from one topic.',
  },
  {
    t: 'No card for the first test',
    d: ft(OFFER, 'New accounts can create up to 3 watermarked Fast videos every 24 hours before choosing a paid plan.', OFFER.copy.sentence),
  },
  {
    t: 'Built for faceless channels',
    d: 'Use it for mystery, money, AI, geography, facts, history, psychology, and other repeatable Shorts formats.',
  },
] as const

const FAQ = [
  {
    q: 'Is there a free AI Shorts generator?',
    a: `Yes. ${ft(OFFER, 'Kineo lets new accounts create up to 3 watermarked Fast videos every 24 hours with no credit card.', OFFER.copy.sentence)} Paid plans unlock clean exports and higher quality engines.`,
  },
  {
    q: 'Does it generate the whole Short or only a script?',
    a: 'It generates the whole Short: hook-first script, AI voiceover, vertical visuals, captions, and an MP4 export.',
  },
  {
    q: 'Can I use it without showing my face?',
    a: 'Yes. Kineo is built for faceless Shorts, so you do not need to film yourself, record your voice, or edit a timeline.',
  },
  {
    q: 'What happens after the free videos?',
    a: 'You can keep testing with watermarked Fast videos within the free daily limit, or upgrade when you want watermark-free exports and premium AI engines.',
  },
] as const

export const metadata: Metadata = {
  title: 'Free AI Shorts Generator - Create Faceless Shorts With No Card | Kineo',
  description:
    'Use Kineo as a free AI Shorts generator. Type one idea and create a faceless YouTube Short with script, AI voiceover, visuals, captions, and MP4 export. No card for the Fast test.',
  alternates: {
    canonical: `${BASE}/free-ai-shorts-generator`,
    languages: {
      en: `${BASE}/free-ai-shorts-generator`,
      'pt-BR': `${BASE}/gerador-de-shorts-gratis`,
      es: `${BASE}/generador-de-shorts-gratis`,
    },
  },
  openGraph: {
    title: 'Free AI Shorts Generator - Kineo',
    description:
      'Type one idea and create a faceless Short with script, AI voiceover, visuals, captions, and MP4 export.',
    url: `${BASE}/free-ai-shorts-generator`,
    type: 'website',
    images: [{ url: FEATURED_EXAMPLE.posterPath, width: 360, height: 640 }],
    videos: [{ url: FEATURED_EXAMPLE.videoPath, width: 360, height: 640, type: 'video/mp4' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Free AI Shorts Generator | Kineo',
    description: 'Create a faceless AI Short from one idea. No card for the free Fast test.',
    images: [FEATURED_EXAMPLE.posterPath],
  },
}

export default function FreeAiShortsGeneratorPage({ searchParams }: { searchParams?: PublicSearchParams }) {
  const signupUrl = buildBlankStudioSignupHref({ campaign: CAMPAIGN })
  const partnerContext = affiliateLandingContext(searchParams, 'video')
  const h2: CSSProperties = { fontSize: 'clamp(1.3rem, 3.5vw, 1.75rem)', fontWeight: 850, margin: '44px 0 12px' }
  const p: CSSProperties = { color: '#86868b', fontSize: '1rem', lineHeight: 1.65, margin: '0 0 12px' }
  const card: CSSProperties = { background: '#161618', border: '1px solid #2a2a2d', borderRadius: 14, padding: '16px 18px' }
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQ.map((item) => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: { '@type': 'Answer', text: item.a },
    })),
  }
  const videoJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'VideoObject',
    name: FEATURED_EXAMPLE.title,
    description: FEATURED_EXAMPLE.description,
    thumbnailUrl: [`${BASE}${FEATURED_EXAMPLE.posterPath}`],
    uploadDate: PUBLICATION_DATE,
    duration: `PT${FEATURED_EXAMPLE.previewDurationSeconds}S`,
    contentUrl: `${BASE}${FEATURED_EXAMPLE.videoPath}`,
    embedUrl: `${BASE}/free-ai-shorts-generator#example`,
  }

  return (
    <main style={{ minHeight: '100vh', background: '#000', color: '#f5f5f7', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd).replace(/</g, '\\u003c') }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(videoJsonLd).replace(/</g, '\\u003c') }} />
      <div style={{ maxWidth: 880, margin: '0 auto', padding: '64px 20px 88px' }}>
        <AffiliateLandingContext context={partnerContext} targetId={FORM_ID} />
        <span style={{ display: 'inline-block', fontSize: 12, fontWeight: 850, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#2997ff', border: '1px solid rgba(41,151,255,0.4)', background: 'rgba(41,151,255,0.12)', borderRadius: 999, padding: '6px 12px' }}>
          Free AI Shorts Generator
        </span>
        <h1 style={{ fontSize: 'clamp(1.9rem, 5vw, 2.9rem)', fontWeight: 900, lineHeight: 1.1, margin: '18px 0 0' }}>
          Create a Faceless AI Short for Free
        </h1>
        <p style={{ fontSize: '1.08rem', color: '#86868b', lineHeight: 1.6, margin: '16px 0 0' }}>
          Type one idea and Kineo generates a ready-to-post vertical Short: script, AI voiceover, visuals, captions, and MP4 export. {ft(OFFER, 'Try the Fast workflow with no credit card.', 'Your active trial starts with the best engine it can cover — Seedance when eligible.')}
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, margin: '26px 0 0' }}>
          <OrganicCtaLink href={`#${FORM_ID}`} source={CAMPAIGN} placement="hero" style={{ background: '#f5f5f7', color: '#000', fontWeight: 850, padding: '14px 26px', borderRadius: 980, textDecoration: 'none' }}>
            Generate a free Short
          </OrganicCtaLink>
          <OrganicCtaLink href={signupUrl} source={CAMPAIGN} placement="hero_signup" style={{ border: '1px solid #48484a', color: '#f5f5f7', fontWeight: 750, padding: '14px 22px', borderRadius: 980, textDecoration: 'none' }}>
            Start from scratch
          </OrganicCtaLink>
        </div>
        <p style={{ fontSize: 13, color: '#2997ff', fontWeight: 750, margin: '12px 0 0' }}>
          {ft(OFFER, 'Up to 3 watermarked Fast videos every 24h. No card required.', OFFER.copy.headline)}
        </p>

        <TopicGeneratorForm
          campaign={CAMPAIGN}
          source={CAMPAIGN}
          formId={FORM_ID}
          creationIntent={OFFER.reverseTrial ? 'trial_best' : 'fast'}
          examples={[
            'The island nobody is allowed to visit',
            'The money habit that quietly makes people broke',
            'Why AI agents are replacing old software',
          ]}
          copy={{
            label: 'What should your free AI Short be about?',
            placeholder: 'Type one topic or paste your script',
            submit: 'Create my free Short',
            examplesLabel: 'Free Short ideas',
            note: ft(
              OFFER,
              'Your idea is carried into signup so the first Fast video can start without a card.',
              'Your idea stays attached through signup. Your active trial starts with Seedance when its balance covers it; otherwise Kineo falls back safely to Fast.',
            ),
          }}
        />

        <section id="example" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 24, alignItems: 'center', marginTop: 38, padding: 22, background: '#101012', border: '1px solid #2a2a2d', borderRadius: 18 }}>
          <div style={{ width: '100%', maxWidth: 280, margin: '0 auto', aspectRatio: '9 / 16', overflow: 'hidden', borderRadius: 18, background: '#000' }}>
            <ExampleVideoPlayer slug={FEATURED_EXAMPLE.slug} title={FEATURED_EXAMPLE.title} src={FEATURED_EXAMPLE.videoPath} poster={FEATURED_EXAMPLE.posterPath} />
          </div>
          <div>
            <p style={{ margin: '0 0 8px', color: '#2997ff', fontSize: 12, fontWeight: 850, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              Real Kineo output
            </p>
            <h2 style={{ fontSize: 'clamp(1.35rem, 4vw, 1.9rem)', fontWeight: 900, lineHeight: 1.2, margin: 0 }}>
              One idea became this faceless Short.
            </h2>
            <p style={{ ...p, marginTop: 12 }}>{FEATURED_EXAMPLE.description}</p>
            <p style={{ ...p, fontSize: 14 }}>This preview demonstrates the output format, not views or revenue performance.</p>
          </div>
        </section>

        {/* AQUISICAO T3 (14/08) — prova viva: esta e a pagina que recebe o
            trafego da marca d'agua e converte 41%. Tres exports reais tocando
            em viewport (mesmo motor da home, poster-first, preload none) dao a
            quem chegou do Google a prova em movimento antes do pedido. */}
        <section style={{ marginTop: 26 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            {PUBLIC_EXAMPLES.slice(2, 5).map((ex) => (
              <a key={ex.slug} href={`/examples/${ex.slug}`} style={{ position: 'relative', aspectRatio: '9 / 16', borderRadius: 18, overflow: 'hidden', background: '#000', border: '1px solid #2a2a2d', display: 'block' }}>
                <ExampleLiveMedia videoPath={ex.videoPath} posterPath={posterWebpPath(ex.posterPath)} />
                <span style={{ position: 'absolute', left: 10, bottom: 10, right: 10, zIndex: 1, fontSize: 12, fontWeight: 700, color: '#fff', textShadow: '0 1px 8px rgba(0,0,0,.7)' }}>{ex.shortTitle}</span>
              </a>
            ))}
          </div>
          <p style={{ ...p, marginTop: 10, fontSize: 13, textAlign: 'center' }}>
            <a href="/examples" style={{ color: '#2997ff', textDecoration: 'none', fontWeight: 700 }}>See all real examples →</a>
          </p>
        </section>
        {/* AQUISICAO T9 (14/08) — exit-intent na porta que mais recebe SEO:
            quem vai embora sem agir leva a oferta de CADASTRO (variant free),
            nao tabela de preco. Mesmo componente da home. */}
        <ExitIntentOffer variant="free" />

        <h2 style={h2}>What the free test includes</h2>
        <div style={{ display: 'grid', gap: 12 }}>
          {FEATURES.map((feature) => (
            <div key={feature.t} style={card}>
              <h3 style={{ margin: 0, fontSize: '1.04rem' }}>{feature.t}</h3>
              <p style={{ ...p, fontSize: 14, margin: '7px 0 0' }}>{feature.d}</p>
            </div>
          ))}
        </div>

        <h2 style={h2}>Made for posting, not just drafting</h2>
        <p style={p}>
          A script generator gives you text. A clipper needs footage you already recorded. Kineo creates the whole Short from an idea, so the free test shows the actual workflow: prompt, voice, visuals, captions, and export.
        </p>
        <p style={p}>
          Want a more specific path? See the <Link href="/faceless-video-generator" style={{ color: '#2997ff' }}>faceless video generator</Link>, <Link href="/text-to-video-shorts" style={{ color: '#2997ff' }}>text to video Shorts</Link>, <Link href="/youtube-shorts-from-topic" style={{ color: '#2997ff' }}>YouTube Shorts from a topic</Link>, or <Link href="/free-ai-shorts" style={{ color: '#2997ff' }}>free AI Shorts by niche</Link>.
        </p>

        <h2 style={h2}>Frequently asked questions</h2>
        <div style={{ display: 'grid', gap: 10 }}>
          {FAQ.map((item) => (
            <div key={item.q} style={card}>
              <div style={{ fontWeight: 750, color: '#f5f5f7' }}>{item.q}</div>
              <p style={{ ...p, fontSize: 14, margin: '6px 0 0' }}>{item.a}</p>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 44, textAlign: 'center', background: 'radial-gradient(circle at 50% 0%, rgba(41,151,255,0.14), #0c0c0e 70%)', border: '1px solid rgba(41,151,255,0.25)', borderRadius: 18, padding: '34px 22px' }}>
          <div style={{ fontSize: 'clamp(1.3rem, 4vw, 1.85rem)', fontWeight: 900 }}>Generate the first Short now.</div>
          <p style={{ color: '#86868b', margin: '8px 0 18px' }}>Use a watermarked Fast video to test the workflow before paying.</p>
          <OrganicCtaLink href={`#${FORM_ID}`} source={CAMPAIGN} placement="final" style={{ background: '#f5f5f7', color: '#000', fontWeight: 850, padding: '14px 30px', borderRadius: 980, textDecoration: 'none' }}>
            Try the free generator
          </OrganicCtaLink>
        </div>
      </div>
      <Footer />
    </main>
  )
}
