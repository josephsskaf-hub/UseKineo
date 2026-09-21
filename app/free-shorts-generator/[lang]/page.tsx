// ═══ KINEO-PORTAS-16-LINGUAS-2026-09-20 — a porta grátis nas 13 línguas que faltavam ═══
//
// Fundador (20/09): "quem traz pagantes é o GPT, vamos focar no GPT". A porta /free-ai-shorts-generator converte 51%
// das chegadas do ChatGPT em cadastro (14 d: 37 → 19), mas só existia em en/pt/es. O ChatGPT responde em francês,
// alemão, hindi, árabe… e não tinha página nossa para citar. Cada uma destas é a MESMA porta (mesmo formulário, mesma
// prova viva, mesmo exit-intent, language=<code> atravessa cadastro → Studio): só a língua e o alvo de busca mudam.
// Conteúdo em lib/seo/freeShortsGeneratorLangs.ts; hreflang cruzado nas 16; sitemap em app/sitemap.ts.
import type { Metadata } from 'next'
import type { CSSProperties } from 'react'
import styles from '@/app/localized-public.module.css'
import { notFound } from 'next/navigation'
import TopicGeneratorForm from '@/app/youtube-shorts-from-topic/TopicGeneratorForm'
import { PUBLIC_EXAMPLES, posterWebpPath } from '@/lib/publicExamples'
import ExampleLiveMedia from '@/app/examples/ExampleLiveMedia'
import ExitIntentOffer from '@/components/ExitIntentOffer'
import Footer from '@/components/Footer'
import LocalizedScriptHandoff from '@/components/LocalizedScriptHandoff'
import { STARTER_USD_AMOUNT } from '@/lib/marketingPrice'
import { FREE_SHORTS_LANGS, FREE_SHORTS_LANG_BY_CODE, freeShortsAlternates } from '@/lib/seo/freeShortsGeneratorLangs'

const BASE = 'https://www.usekineo.com'

export const dynamicParams = false
export function generateStaticParams() {
  return FREE_SHORTS_LANGS.map((l) => ({ lang: l.code }))
}

export function generateMetadata({ params }: { params: { lang: string } }): Metadata {
  const L = FREE_SHORTS_LANG_BY_CODE[params.lang]
  if (!L) return {}
  const url = `${BASE}/free-shorts-generator/${L.code}`
  return {
    title: L.title,
    description: L.description,
    alternates: { canonical: url, languages: freeShortsAlternates(BASE) },
    openGraph: {
      title: L.title,
      description: L.description,
      url,
      type: 'website',
      locale: L.locale,
      images: [{ url: '/videos/example-turkmenistan.jpg', width: 360, height: 640 }],
    },
  }
}

export default function FreeShortsGeneratorLangPage({ params }: { params: { lang: string } }) {
  const L = FREE_SHORTS_LANG_BY_CODE[params.lang]
  if (!L) notFound()
  const price = `US$ ${STARTER_USD_AMOUNT}`
  const faq = L.faq.map((f) => ({ q: f.q, a: f.a(price) }))
  const p: CSSProperties = { color: '#86868b', fontSize: '1rem', lineHeight: 1.65, margin: '0 0 12px' }
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faq.map((item) => ({ '@type': 'Question', name: item.q, acceptedAnswer: { '@type': 'Answer', text: item.a } })),
  }
  const campaign = `seo_gerador_${L.code}` // prefixo seo_ = atribuição orgânica (lib/growth/organicSignupTruth)

  return (
    <main lang={L.locale} dir={L.dir} className={styles.page} style={{ minHeight: '100vh', background: '#000', color: '#f5f5f7', fontFamily: 'var(--font-inter), system-ui, -apple-system, sans-serif' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd).replace(/</g, '\u003c') }} />
      <div style={{ maxWidth: 880, margin: '0 auto', padding: '64px 20px 88px' }}>
        <span style={{ display: 'inline-block', fontSize: 12, fontWeight: 850, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#2997ff', border: '1px solid rgba(41,151,255,0.4)', background: 'rgba(41,151,255,0.12)', borderRadius: 999, padding: '6px 12px' }}>
          {L.badge}
        </span>
        <h1 style={{ fontSize: 'clamp(1.9rem, 5vw, 2.9rem)', fontWeight: 900, lineHeight: 1.1, margin: '18px 0 0', fontFamily: 'var(--font-display), var(--font-inter), sans-serif' }}>
          {L.h1}
        </h1>
        <p style={{ fontSize: '1.08rem', color: '#86868b', lineHeight: 1.6, margin: '16px 0 0' }}>{L.lead}</p>

        <TopicGeneratorForm
          campaign={campaign}
          source={campaign}
          formId={`gerador-${L.code}`}
          language={L.code}
          examples={L.examples}
          copy={L.form}
        />

        <LocalizedScriptHandoff
          campaign={`seo_chatgpt_to_shorts_${L.code}`}
          formId={`roteiro-chatgpt-${L.code}`}
          language={L.code}
          eyebrow={L.handoff.eyebrow}
          heading={L.handoff.heading}
          description={L.handoff.description}
          label={L.handoff.label}
          placeholder={L.handoff.placeholder}
          submit={L.handoff.submit}
          note={L.handoff.note}
        />

        <section style={{ marginTop: 34 }}>
          <p style={{ margin: '0 0 4px', color: '#2997ff', fontSize: 12, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase' }}>{L.proof.eyebrow}</p>
          <p style={{ ...p, marginBottom: 14 }}>{L.proof.line}</p>
          <div className={styles.examples}>
            {PUBLIC_EXAMPLES.slice(0, 3).map((ex) => (
              <a key={ex.slug} href={`/examples/${ex.slug}`} style={{ position: 'relative', aspectRatio: '9 / 16', borderRadius: 18, overflow: 'hidden', background: '#000', border: '1px solid #2a2a2d', display: 'block' }}>
                <ExampleLiveMedia videoPath={ex.videoPath} posterPath={posterWebpPath(ex.posterPath)} />
                <span style={{ position: 'absolute', left: 10, bottom: 10, right: 10, zIndex: 1, fontSize: 12, fontWeight: 700, color: '#fff', textShadow: '0 1px 8px rgba(0,0,0,.7)' }}>{ex.shortTitle}</span>
              </a>
            ))}
          </div>
        </section>

        <section style={{ marginTop: 44 }}>
          <h2 style={{ fontSize: 'clamp(1.3rem, 3.5vw, 1.75rem)', fontWeight: 800, margin: '0 0 14px', fontFamily: 'var(--font-display), var(--font-inter), sans-serif' }}>{L.faqTitle}</h2>
          {faq.map((item) => (
            <div key={item.q} style={{ background: '#131316', border: '1px solid #2a2a2d', borderRadius: 18, padding: '16px 18px', marginBottom: 12 }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 6px' }}>{item.q}</h3>
              <p style={{ ...p, margin: 0, fontSize: '0.95rem' }}>{item.a}</p>
            </div>
          ))}
        </section>
      </div>
      <ExitIntentOffer variant="free" />
      <Footer />
    </main>
  )
}
