// PROJETO 1 — GOOGLE (docs/PROJETO-1-GOOGLE-2026-09-17.md) — a página de intenção.
//
// Uma rota, 100 páginas (lib/seo/intentPages.ts): "AI video generator for X", "AI Y generator",
// "AI video generator in Z", "W alternative". O que a página tem que os concorrentes não têm:
// filmes REAIS da casa com o selo do motor real (vitrine do fundador), o que a pessoa escreve e o
// que sai, preço e trial lidos da fonte única (nunca literal) e um botão que abre o Studio com o
// prompt daquele nicho já na caixa. Honestidade: nada de "grátis" para motor que o trial não cobre;
// a família 'alternative' fala só da Kineo.
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import Footer from '@/components/Footer'
import OrganicCtaLink from '@/components/OrganicCtaLink'
import { getFreeTierOffer, swapFreeTierCopy as ft, trialFilmsForEngine, TRIAL_CREDITS_SHOWN } from '@/lib/freeTierOffer'
import { STARTER_MONTH, STARTER_CREDITS, creditsPerReferenceVideo } from '@/lib/marketingPrice'
import { PUBLIC_ENGINE_EXAMPLES, posterWebpPath } from '@/lib/publicExamples'
import { getIntentPage, INTENT_FAMILY_LABEL, INTENT_HUB_PATH, INTENT_PAGES, INTENT_SLUGS, intentPagePath, type IntentEngine } from '@/lib/seo/intentPages'

const OFFER = getFreeTierOffer()
const BASE = 'https://www.usekineo.com'
const ENGINE_NAME: Record<IntentEngine, string> = { fast: 'Kineo 1', cinematic_ai: 'Seedance 1.5' }

export const dynamic = 'force-static'
export const dynamicParams = false

export function generateStaticParams() {
  return INTENT_SLUGS.map((slug) => ({ slug }))
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const p = getIntentPage(params.slug)
  if (!p) return {}
  const url = `${BASE}${intentPagePath(p.slug)}`
  const description = `${p.intro.slice(0, 150).replace(/\s+\S*$/, '')}… Real films, ${ENGINE_NAME[p.engine]} and generative engines, free trial with no card.`
  return {
    metadataBase: new URL(BASE),
    title: p.title,
    description,
    alternates: { canonical: url },
    openGraph: { title: p.title, description, url, type: 'website' },
    twitter: { card: 'summary_large_image', title: p.title, description },
  }
}

/** Studio já com o prompt do nicho na caixa; cadastro preserva o destino (mesmo padrão das páginas por motor). */
function studioHref(slug: string, prompt: string, engine: IntentEngine): string {
  const campaign = `intent_${slug}`.slice(0, 100)
  const studio = new URLSearchParams({ engine, prompt, duration: '60', script_mode: 'ai', intent_campaign: campaign })
  const signup = new URLSearchParams({ utm_source: 'google', utm_medium: 'organic', utm_campaign: campaign, intent_campaign: campaign, redirect: `/studio?${studio.toString()}` })
  return `/signup?${signup.toString()}`
}

const CARD = { background: '#161618', border: '1px solid #2a2a2d', borderRadius: 16 } as const

export default function IntentPage({ params }: { params: { slug: string } }) {
  const p = getIntentPage(params.slug)
  if (!p) notFound()
  const url = `${BASE}${intentPagePath(p.slug)}`
  const engineCost = creditsPerReferenceVideo(p.engine)
  const trialFilms = trialFilmsForEngine(engineCost)
  // A vitrine é `as const`: nem toda entrada tem poster/preview leve. O Kineo 1 da home é um master de 48 MB;
  // aqui vai o preview de 5 s (arenaPreviewPath) quando existir. Nunca a URL do fal.
  const films = PUBLIC_ENGINE_EXAMPLES.filter((e) => e.engine === p.engine).slice(0, 3).map((e) => {
    const x = e as { id: string; title: string; videoPath: string; posterPath?: string; arenaPreviewPath?: string; arenaPosterPath?: string }
    return { id: x.id, title: x.title, videoPath: x.arenaPreviewPath ?? x.videoPath, posterPath: x.arenaPosterPath ?? x.posterPath }
  })
  const cta = studioHref(p.slug, p.examplePrompt, p.engine)
  const campaign = `intent_${p.slug}`
  const siblings = INTENT_PAGES.filter((x) => x.family === p.family && x.slug !== p.slug).slice(0, 8)

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      ...p.faq,
      { q: 'How much does it cost?', a: `The free trial gives ${TRIAL_CREDITS_SHOWN} credits with no card. ${ENGINE_NAME[p.engine]} costs ${engineCost} credits for a 60-second film${trialFilms > 0 ? `, so the trial covers ${trialFilms} film${trialFilms > 1 ? 's' : ''}` : ', which needs a plan'}. Plans start at ${STARTER_MONTH} for ${STARTER_CREDITS} credits.` },
    ].map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
  }
  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Kineo', item: `${BASE}/` },
      { '@type': 'ListItem', position: 2, name: 'AI video generator', item: `${BASE}/ai-video-generator` },
      { '@type': 'ListItem', position: 3, name: INTENT_FAMILY_LABEL[p.family], item: `${BASE}${INTENT_HUB_PATH}` },
      { '@type': 'ListItem', position: 4, name: p.h1, item: url },
    ],
  }
  const videoJsonLd = films.map((f) => ({
    '@context': 'https://schema.org',
    '@type': 'VideoObject',
    name: f.title,
    description: `A short film made with Kineo on ${ENGINE_NAME[p.engine]}: ${f.title}.`,
    thumbnailUrl: f.posterPath ? `${BASE}${f.posterPath}` : undefined,
    contentUrl: f.videoPath.startsWith('http') ? f.videoPath : `${BASE}${f.videoPath}`,
    uploadDate: '2026-09-07',
  }))

  return (
    <main style={{ minHeight: '100vh', background: '#000', color: '#f5f5f7', fontFamily: 'var(--font-sans), Arial, sans-serif' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd).replace(/</g, '\\u003c') }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd).replace(/</g, '\\u003c') }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(videoJsonLd).replace(/</g, '\\u003c') }} />

      <div style={{ maxWidth: 960, margin: '0 auto', padding: '28px 18px 64px' }}>
        <nav aria-label="Breadcrumb" style={{ color: '#86868b', fontSize: 13 }}>
          <Link href="/" style={{ color: '#2997ff', fontWeight: 800, textDecoration: 'none' }}>Kineo</Link>
          <span aria-hidden> / </span>
          <Link href="/ai-video-generator" style={{ color: '#2997ff', textDecoration: 'none' }}>AI video generator</Link>
          <span aria-hidden> / </span>
          <Link href={INTENT_HUB_PATH} style={{ color: '#2997ff', textDecoration: 'none' }}>{INTENT_FAMILY_LABEL[p.family]}</Link>
        </nav>

        <section style={{ marginTop: 30, textAlign: 'center' }}>
          <div style={{ display: 'inline-block', fontSize: '0.72rem', fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#2997ff', background: 'rgba(41,151,255,0.1)', border: '1px solid rgba(41,151,255,0.3)', borderRadius: 980, padding: '6px 12px' }}>
            {ENGINE_NAME[p.engine]} · {engineCost} credits per 60-second film
          </div>
          <h1 style={{ fontSize: 'clamp(1.8rem, 5vw, 2.6rem)', fontWeight: 900, lineHeight: 1.15, margin: '16px 0 0' }}>{p.h1}</h1>
          <p style={{ fontSize: '1.02rem', color: '#86868b', lineHeight: 1.6, margin: '16px auto 0', maxWidth: 680 }}>{p.intro}</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 10, marginTop: 22 }}>
            <OrganicCtaLink href={cta} source={campaign} placement="hero" style={{ display: 'inline-block', background: '#f5f5f7', color: '#000', fontWeight: 900, padding: '15px 32px', borderRadius: 980, textDecoration: 'none', fontSize: '1.05rem' }}>
              Make this film free →
            </OrganicCtaLink>
            <Link href="/pricing" style={{ display: 'inline-block', border: '1px solid #48484a', color: '#f5f5f7', fontWeight: 800, padding: '14px 24px', borderRadius: 980, textDecoration: 'none' }}>
              See plans &amp; credits
            </Link>
          </div>
          <p style={{ fontSize: '0.82rem', color: '#86868b', margin: '12px 0 0' }}>
            {ft(OFFER, `${TRIAL_CREDITS_SHOWN} free credits, no card`, OFFER.copy.chip)}
            {trialFilms > 0 ? ` · the trial covers ${trialFilms} ${ENGINE_NAME[p.engine]} film${trialFilms > 1 ? 's' : ''}` : ` · ${ENGINE_NAME[p.engine]} needs a plan (from ${STARTER_MONTH})`}
          </p>
        </section>

        {/* O que a pessoa escreve → o que sai */}
        <section style={{ marginTop: 44, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
          <div style={{ ...CARD, padding: 18 }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#86868b' }}>What you write</div>
            <p style={{ margin: '10px 0 0', fontSize: '1rem', lineHeight: 1.55, color: '#f5f5f7' }}>“{p.examplePrompt}”</p>
            <p style={{ margin: '10px 0 0', fontSize: '0.82rem', color: '#86868b' }}>One idea is enough. A full script is narrated word for word.</p>
          </div>
          <div style={{ ...CARD, padding: 18 }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#86868b' }}>What you get</div>
            <ul style={{ margin: '10px 0 0', paddingLeft: 18, lineHeight: 1.7, color: '#d2d2d7', fontSize: '0.95rem' }}>
              <li>A hook-first script and a natural AI voice</li>
              <li>A scene for every line, {p.engine === 'fast' ? 'from real footage and generated stills' : 'generated from the text'}</li>
              <li>Captions timed to the voice, music, a vertical MP4</li>
              <li>A written next episode, so it becomes a series</li>
            </ul>
            <p style={{ margin: '10px 0 0', fontSize: '0.82rem', color: '#86868b' }}>{p.engineWhy}</p>
          </div>
        </section>

        {p.competitor && (
          <section style={{ marginTop: 36, ...CARD, padding: 18 }}>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 900, margin: 0 }}>What Kineo does differently</h2>
            <ul style={{ margin: '10px 0 0', paddingLeft: 18, lineHeight: 1.7, color: '#d2d2d7', fontSize: '0.95rem' }}>
              {p.competitor.differences.map((d, i) => <li key={i}>{d}</li>)}
            </ul>
            <p style={{ margin: '10px 0 0', fontSize: '0.8rem', color: '#86868b' }}>We describe Kineo only. {p.competitor.name}'s features and prices are theirs to state and change.</p>
          </section>
        )}

        {/* A prova: filmes reais da casa, selo do motor real */}
        {films.length > 0 && (
          <section style={{ marginTop: 44 }}>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 900, textAlign: 'center', margin: '0 0 6px' }}>Real films made with {ENGINE_NAME[p.engine]}</h2>
            <p style={{ textAlign: 'center', color: '#86868b', fontSize: '0.9rem', margin: '0 auto 18px', maxWidth: 600, lineHeight: 1.6 }}>Founder-owned renders, unedited previews. The engine badge is the engine that made the film.</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
              {films.map((f) => (
                <figure key={f.id} style={{ ...CARD, margin: 0, overflow: 'hidden' }}>
                  <video src={f.videoPath} poster={f.posterPath ? posterWebpPath(f.posterPath) : undefined} muted playsInline controls preload="metadata" style={{ display: 'block', width: '100%', aspectRatio: '9/16', background: '#000', objectFit: 'cover' }} />
                  <figcaption style={{ padding: '8px 10px', fontSize: '0.82rem', color: '#d2d2d7' }}>
                    <span style={{ color: '#a78bfa', fontWeight: 800, textTransform: 'uppercase', fontSize: '0.7rem' }}>{ENGINE_NAME[p.engine]}</span> · {f.title}
                  </figcaption>
                </figure>
              ))}
            </div>
          </section>
        )}

        {/* FAQ */}
        <section style={{ marginTop: 44 }}>
          <h2 style={{ fontSize: '1.3rem', fontWeight: 900, margin: '0 0 12px' }}>Questions</h2>
          {[...p.faq, { q: 'How much does it cost?', a: `The free trial gives ${TRIAL_CREDITS_SHOWN} credits with no card. ${ENGINE_NAME[p.engine]} costs ${engineCost} credits per 60-second film${trialFilms > 0 ? `, so the trial covers ${trialFilms} film${trialFilms > 1 ? 's' : ''}` : ', which needs a plan'}. Plans start at ${STARTER_MONTH} for ${STARTER_CREDITS} credits.` }].map((f) => (
            <details key={f.q} style={{ ...CARD, padding: '12px 16px', marginBottom: 8 }}>
              <summary style={{ cursor: 'pointer', fontWeight: 800 }}>{f.q}</summary>
              <p style={{ margin: '8px 0 0', color: '#d2d2d7', lineHeight: 1.6 }}>{f.a}</p>
            </details>
          ))}
        </section>

        {/* Irmãs: o caminho de rastreio interno */}
        {siblings.length > 0 && (
          <section style={{ marginTop: 40 }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 900, color: '#86868b', margin: '0 0 10px' }}>More · {INTENT_FAMILY_LABEL[p.family]}</h2>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {siblings.map((s) => (
                <Link key={s.slug} href={intentPagePath(s.slug)} style={{ fontSize: '0.85rem', color: '#2997ff', textDecoration: 'none', border: '1px solid #2a2a2d', borderRadius: 980, padding: '6px 12px' }}>{s.h1}</Link>
              ))}
              <Link href={INTENT_HUB_PATH} style={{ fontSize: '0.85rem', color: '#f5f5f7', textDecoration: 'none', border: '1px solid #48484a', borderRadius: 980, padding: '6px 12px' }}>All use cases →</Link>
            </div>
          </section>
        )}

        <section style={{ marginTop: 44, textAlign: 'center' }}>
          <OrganicCtaLink href={cta} source={campaign} placement="footer" style={{ display: 'inline-block', background: '#2997ff', color: '#fff', fontWeight: 900, padding: '15px 32px', borderRadius: 980, textDecoration: 'none', fontSize: '1.05rem' }}>
            Make this film free →
          </OrganicCtaLink>
        </section>
      </div>
      <Footer showStats={false} />
    </main>
  )
}
