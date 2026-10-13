// KINEO-PAGINAS-LOTE1-2026-10-12 — o molde das 3 páginas de intenção do lote 1 (/ai-shorts-generator-no-watermark,
// /ai-short-film-generator, /generador-de-videos-de-terror). Mesmo padrão das vencedoras (/text-to-video-shorts,
// /free-ai-shorts-generator): título que responde à busca, compra direta do Creator + botão grátis na primeira dobra,
// formulário que leva a ideia ao cadastro, UM filme real da vitrine do fundador com selo do motor, texto útil, FAQ com a
// verdade de hoje e schema FAQPage/VideoObject. Os textos vivem em lib/seo/paginasLote1.ts. Componente de SERVIDOR.
import type { Metadata } from 'next'
import type { CSSProperties } from 'react'
import Link from 'next/link'
import Footer from '@/components/Footer'
import OrganicCtaLink from '@/components/OrganicCtaLink'
import BuyCreatorCta from '@/components/BuyCreatorCta'
import TopicGeneratorForm from '@/app/youtube-shorts-from-topic/TopicGeneratorForm'
import { ENGINES } from '@/lib/growth/enginePageCatalog'
import { enginePaused } from '@/lib/engineLaunch'
import { getFreeTierOffer } from '@/lib/freeTierOffer'
import { buildPromptedSignupHref } from '@/lib/growth/publicCreationIntent'
import { LOTE1_LANDINGS, LOTE1_REVIEWED_ISO, lote1LandingFilm } from '@/lib/seo/paginasLote1'

const BASE = 'https://www.usekineo.com'
const OFFER = getFreeTierOffer()

export function lote1LandingMetadata(key: string): Metadata {
  const l = LOTE1_LANDINGS[key]
  const film = lote1LandingFilm(key)
  const url = `${BASE}${l.path}`
  return {
    metadataBase: new URL(BASE),
    title: l.metaTitle,
    description: l.metaDescription,
    alternates: { canonical: url },
    openGraph: {
      title: l.metaTitle,
      description: l.metaDescription,
      url,
      siteName: 'Kineo (usekineo.com)',
      type: 'website',
      locale: l.lang === 'es' ? 'es_ES' : 'en_US',
      ...(film ? { images: [{ url: film.posterPath, width: 360, height: 640 }] } : {}),
    },
    twitter: { card: 'summary_large_image', title: l.metaTitle, description: l.metaDescription },
  }
}

export default function Lote1Landing({ pageKey }: { pageKey: string }) {
  const l = LOTE1_LANDINGS[pageKey]
  const film = lote1LandingFilm(pageKey)
  const formId = `lote1-form-${l.buyPage}`
  const creationIntent = OFFER.reverseTrial ? 'trial_best' : 'fast'
  const seedanceLive = !enginePaused(ENGINES.seedance.param)
  const filmHref = film ? buildPromptedSignupHref({ prompt: film.idea, campaign: l.campaign, creationIntent }) : `#${formId}`

  const h2: CSSProperties = { fontSize: 'clamp(1.3rem, 3.5vw, 1.7rem)', fontWeight: 850, margin: '44px 0 12px' }
  const p: CSSProperties = { color: '#CBD5E1', fontSize: '1rem', lineHeight: 1.7, margin: '0 0 12px' }
  const card: CSSProperties = { background: '#161618', border: '1px solid #2a2a2d', borderRadius: 14, padding: '16px 18px' }

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    inLanguage: l.lang,
    mainEntity: l.faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
  }
  const videoJsonLd = film
    ? {
        '@context': 'https://schema.org',
        '@type': 'VideoObject',
        name: film.title,
        description: `${film.kind}. ${film.ideaLabel}: ${film.idea}`,
        thumbnailUrl: [`${BASE}${film.posterPath}`],
        uploadDate: `${LOTE1_REVIEWED_ISO}T00:00:00.000Z`,
        contentUrl: `${BASE}${film.previewPath}`,
        embedUrl: `${BASE}${l.path}#real-output`,
      }
    : null

  return (
    <main lang={l.lang} style={{ minHeight: '100vh', background: '#000', color: '#f5f5f7', fontFamily: 'var(--font-sans), Arial, sans-serif' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd).replace(/</g, '\\u003c') }} />
      {videoJsonLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(videoJsonLd).replace(/</g, '\\u003c') }} />}
      <div style={{ maxWidth: 860, margin: '0 auto', padding: '56px 18px 88px' }}>
        <Link href="/" style={{ color: '#2997ff', fontWeight: 800, textDecoration: 'none', fontSize: '1.05rem' }}>Kineo</Link>
        <div style={{ marginTop: 24 }}>
          <span style={{ display: 'inline-block', fontSize: 12, fontWeight: 850, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#2997ff', border: '1px solid rgba(41,151,255,0.4)', background: 'rgba(41,151,255,0.12)', borderRadius: 999, padding: '6px 12px' }}>
            {l.badge}
          </span>
        </div>
        <h1 style={{ fontSize: 'clamp(1.9rem, 5vw, 2.7rem)', fontWeight: 900, lineHeight: 1.12, margin: '18px 0 0' }}>{l.h1}</h1>
        <p style={{ fontSize: '1.06rem', color: '#CBD5E1', lineHeight: 1.65, margin: '16px 0 0' }}>{l.lead}</p>

        {/* Primeira dobra: compra direta do Creator + o grátis ao lado (Seedance pausado = só o grátis, como nas vencedoras). */}
        {seedanceLive ? (
          <BuyCreatorCta
            page={l.buyPage}
            lang={l.lang}
            align="left"
            secondary={
              <OrganicCtaLink href={`#${formId}`} source={l.campaign} placement="hero" style={{ border: '1px solid #48484a', color: '#f5f5f7', fontWeight: 800, padding: '14px 22px', borderRadius: 980, textDecoration: 'none' }}>
                {l.freeCta}
              </OrganicCtaLink>
            }
          />
        ) : (
          <div style={{ marginTop: 22 }}>
            <OrganicCtaLink href={`#${formId}`} source={l.campaign} placement="hero" style={{ display: 'inline-block', background: '#f5f5f7', color: '#000', fontWeight: 850, padding: '14px 26px', borderRadius: 980, textDecoration: 'none' }}>
              {l.freeCta}
            </OrganicCtaLink>
          </div>
        )}

        <div id={formId}>
          <TopicGeneratorForm
            campaign={l.campaign}
            source={l.campaign}
            formId={`${formId}-input`}
            creationIntent={creationIntent}
            language={l.lang === 'es' ? 'es' : undefined}
            examples={l.examples}
            copy={l.form}
          />
        </div>

        {film && (
          <section id="real-output" data-kineo="lote1-real-film" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 24, alignItems: 'start', marginTop: 38, padding: 20, background: '#101012', border: '1px solid #2a2a2d', borderRadius: 18 }}>
            <div style={{ position: 'relative', width: '100%', maxWidth: 280, margin: '0 auto', aspectRatio: '9 / 16', overflow: 'hidden', borderRadius: 16, background: '#000' }}>
              <video src={film.previewPath} poster={film.posterPath} muted playsInline controls preload="none" style={{ display: 'block', width: '100%', height: '100%', objectFit: 'cover' }} />
              <span style={{ position: 'absolute', left: 8, top: 8, borderRadius: 6, border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(0,0,0,0.6)', padding: '2px 7px', fontSize: 10, fontWeight: 800, letterSpacing: '0.06em', color: '#fff', pointerEvents: 'none', textTransform: 'uppercase' }}>{film.engineName}</span>
            </div>
            <div>
              <p style={{ margin: '0 0 8px', color: '#2997ff', fontSize: 12, fontWeight: 850, letterSpacing: '0.1em', textTransform: 'uppercase' }}>{l.labels.realOutput} · {film.kind}</p>
              <h2 style={{ fontSize: '1.3rem', fontWeight: 900, margin: '0 0 10px' }}>{film.title}</h2>
              <p style={{ color: '#86868b', fontSize: '0.82rem', fontWeight: 700, margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{film.ideaLabel}</p>
              <blockquote style={{ margin: '0 0 14px', padding: '10px 14px', borderLeft: '3px solid #2997ff', background: 'rgba(41,151,255,0.06)', color: '#e5e7eb', fontSize: '0.95rem', lineHeight: 1.6 }}>“{film.idea}”</blockquote>
              {film.honestNote && <p data-kineo="lote1-honest-note" style={{ color: '#ffb454', fontSize: '0.86rem', lineHeight: 1.6, margin: '0 0 12px' }}>{film.honestNote}</p>}
              <OrganicCtaLink href={filmHref} source={l.campaign} placement="house_film" style={{ display: 'inline-block', background: '#2997ff', color: '#000', fontWeight: 900, padding: '12px 20px', borderRadius: 12, textDecoration: 'none', fontSize: '0.95rem' }}>
                {l.lang === 'es' ? 'Abrir esta idea en el Studio →' : 'Open this idea in the Studio →'}
              </OrganicCtaLink>
              <p style={{ color: '#86868b', fontSize: '0.82rem', lineHeight: 1.6, margin: '10px 0 0' }}>
                <Link href={film.enginePath} style={{ color: '#2997ff', textDecoration: 'none', fontWeight: 700 }}>{film.engineName} →</Link>
              </p>
            </div>
          </section>
        )}

        <h2 style={h2}>{l.labels.howItWorks}</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
          {l.steps.map((s, i) => (
            <div key={s.t} style={card}>
              <div style={{ color: '#2997ff', fontWeight: 900, marginBottom: 6 }}>{i + 1}</div>
              <div style={{ fontWeight: 800, marginBottom: 4 }}>{s.t}</div>
              <p style={{ margin: 0, fontSize: '0.88rem', color: '#86868b', lineHeight: 1.55 }}>{s.d}</p>
            </div>
          ))}
        </div>

        {l.sections.map((s) => (
          <section key={s.h2}>
            <h2 style={h2}>{s.h2}</h2>
            {s.paragraphs.map((para) => <p key={para.slice(0, 40)} style={p}>{para}</p>)}
          </section>
        ))}

        <h2 style={h2}>{l.labels.faqTitle}</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {l.faq.map((f) => (
            <div key={f.q} style={card}>
              <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: '0 0 6px' }}>{f.q}</h3>
              <p style={{ margin: 0, color: '#CBD5E1', fontSize: '0.93rem', lineHeight: 1.6 }}>{f.a}</p>
            </div>
          ))}
        </div>

        <section style={{ marginTop: 44, textAlign: 'center', ...card, borderRadius: 18, padding: '26px 20px' }}>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 900, margin: '0 0 14px' }}>{l.labels.finalTitle}</h2>
          <OrganicCtaLink href={`#${formId}`} source={l.campaign} placement="final" style={{ display: 'inline-block', background: '#f5f5f7', color: '#000', fontWeight: 850, padding: '14px 28px', borderRadius: 980, textDecoration: 'none' }}>
            {l.labels.finalCta}
          </OrganicCtaLink>
        </section>

        <nav style={{ marginTop: 36, textAlign: 'center', fontSize: '0.88rem', color: '#86868b' }}>
          <span>{l.labels.related}: </span>
          {l.related.map((r, i) => (
            <span key={r.href}>
              {i > 0 && ' · '}
              <Link href={r.href} style={{ color: '#2997ff', textDecoration: 'none', fontWeight: 700 }}>{r.label}</Link>
            </span>
          ))}
        </nav>
      </div>
      <Footer />
    </main>
  )
}
