// AQUISICAO 5 (14/08) — [KINEO-PORTAS-INTL-2026-08-14]
// Versao ES da porta de 41%: "generador de shorts gratis" — LatAm/Espanha,
// language=es atravessa signup → /generate.
import type { Metadata } from 'next'
import type { CSSProperties } from 'react'
import TopicGeneratorForm from '@/app/youtube-shorts-from-topic/TopicGeneratorForm'
import { PUBLIC_EXAMPLES, posterWebpPath } from '@/lib/publicExamples'
import ExampleLiveMedia from '@/app/examples/ExampleLiveMedia'
import ExitIntentOffer from '@/components/ExitIntentOffer'
import Footer from '@/components/Footer'

const BASE = 'https://www.usekineo.com'
const CAMPAIGN = 'seo_generador_es'
const FORM_ID = 'generador'

export const metadata: Metadata = {
  title: 'Generador de Shorts con IA Gratis (sin aparecer) — Kineo',
  description:
    'Escribe una idea y la IA genera un Short vertical completo: guion, voz en español, subtítulos y video listo para publicar. Gratis, sin tarjeta.',
  alternates: {
    canonical: `${BASE}/generador-de-shorts-gratis`,
    languages: {
      en: `${BASE}/free-ai-shorts-generator`,
      'pt-BR': `${BASE}/generador-de-shorts-gratis`,
      es: `${BASE}/generador-de-shorts-gratis`,
    },
  },
  openGraph: {
    title: 'Generador de Shorts con IA Gratis — Kineo',
    description: 'Una idea se convierte en un Short listo: guion, voz en español, subtítulos y MP4. Sin tarjeta.',
    url: `${BASE}/generador-de-shorts-gratis`,
    type: 'website',
    images: [{ url: '/videos/example-turkmenistan.jpg', width: 360, height: 640 }],
  },
}

const FAQ = [
  {
    q: '¿El video sale en español?',
    a: 'Sí. Guion, narración con voz neural y subtítulos salen en español — el idioma ya viene seleccionado desde esta página.',
  },
  {
    q: '¿Es gratis de verdad? ¿Hace falta tarjeta?',
    a: 'Creas, ves, descargas y publicas videos Fast con marca de agua sin tarjeta. Los planes de pago liberan el MP4 limpio, desde US$ 4,90 el primer mes.',
  },
  {
    q: '¿Tengo que aparecer o saber editar?',
    a: 'No. Es el formato faceless: la IA escribe, narra, elige las escenas y añade los subtítulos. Escribes el tema y descargas el video listo, normalmente en 3 a 7 minutos.',
  },
]

export default function GeneradorDeShortsPage() {
  const p: CSSProperties = { color: '#86868b', fontSize: '1rem', lineHeight: 1.65, margin: '0 0 12px' }
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQ.map((item) => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: { '@type': 'Answer', text: item.a },
    })),
  }

  return (
    <main style={{ minHeight: '100vh', background: '#000', color: '#f5f5f7', fontFamily: 'var(--font-inter), system-ui, -apple-system, sans-serif' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd).replace(/</g, '\\u003c') }} />
      <div style={{ maxWidth: 880, margin: '0 auto', padding: '64px 20px 88px' }}>
        <span style={{ display: 'inline-block', fontSize: 12, fontWeight: 850, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#2997ff', border: '1px solid rgba(41,151,255,0.4)', background: 'rgba(41,151,255,0.12)', borderRadius: 999, padding: '6px 12px' }}>
          Generador de Shorts con IA
        </span>
        <h1 style={{ fontSize: 'clamp(1.9rem, 5vw, 2.9rem)', fontWeight: 900, lineHeight: 1.1, margin: '18px 0 0', fontFamily: 'var(--font-display), var(--font-inter), sans-serif' }}>
          Crea un Short sin aparecer — gratis
        </h1>
        <p style={{ fontSize: '1.08rem', color: '#86868b', lineHeight: 1.6, margin: '16px 0 0' }}>
          Escribe una idea y Kineo genera el Short vertical completo: guion, narración en español, escenas y subtítulos — listo para YouTube Shorts, TikTok o Reels. Sin tarjeta.
        </p>

        <TopicGeneratorForm
          campaign={CAMPAIGN}
          source={CAMPAIGN}
          formId={FORM_ID}
          language="es"
          examples={[
            'La isla que nadie puede visitar',
            'El hábito que hace pobre a la gente sin darse cuenta',
            'Por qué la IA está cambiando el trabajo de todos',
          ]}
          copy={{
            label: '¿Sobre qué será tu Short gratis?',
            placeholder: 'Ej.: la isla prohibida que aparece en el mapa',
            submit: 'Crear mi Short gratis',
            examplesLabel: 'Ideas listas',
            note: 'Tu idea atraviesa el registro — el primer video Fast empieza sin tarjeta.',
          }}
        />

        {/* Prova viva: 3 exports reais tocando (mesmo motor da home). */}
        <section style={{ marginTop: 34 }}>
          <p style={{ margin: '0 0 4px', color: '#2997ff', fontSize: 12, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            Hecho de verdad con Kineo
          </p>
          <p style={{ ...p, marginBottom: 14 }}>Cada uno empezó con una línea de texto.</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            {PUBLIC_EXAMPLES.slice(0, 3).map((ex) => (
              <a key={ex.slug} href={`/examples/${ex.slug}`} style={{ position: 'relative', aspectRatio: '9 / 16', borderRadius: 18, overflow: 'hidden', background: '#000', border: '1px solid #2a2a2d', display: 'block' }}>
                <ExampleLiveMedia videoPath={ex.videoPath} posterPath={posterWebpPath(ex.posterPath)} />
                <span style={{ position: 'absolute', left: 10, bottom: 10, right: 10, zIndex: 1, fontSize: 12, fontWeight: 700, color: '#fff', textShadow: '0 1px 8px rgba(0,0,0,.7)' }}>{ex.shortTitle}</span>
              </a>
            ))}
          </div>
        </section>

        <section style={{ marginTop: 44 }}>
          <h2 style={{ fontSize: 'clamp(1.3rem, 3.5vw, 1.75rem)', fontWeight: 800, margin: '0 0 14px', fontFamily: 'var(--font-display), var(--font-inter), sans-serif' }}>
            Preguntas frecuentes
          </h2>
          {FAQ.map((item) => (
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
