// Landing en español (LatAm + España). Espejo de app/pt/page.tsx pero con
// copy nativo en español. Keyword objetivo: "generador de YouTube Shorts con IA".
// Estática, canonical + hreflang, FAQ schema, precios en USD.
// Cluster: /es · /es/videos-sin-rostro · /es/canal-dark
import type { Metadata } from 'next'
import Link from 'next/link'

export const dynamic = 'force-static'

const CTA_URL =
  'https://www.usekineo.com/free-ai-shorts-generator?utm_source=es-cluster&utm_medium=seo&utm_campaign=acq5'

export const metadata: Metadata = {
  metadataBase: new URL('https://www.usekineo.com'),
  title: 'Kineo — Generador de YouTube Shorts con IA (en español)',
  description:
    'El generador de YouTube Shorts con IA que convierte una idea en un video sin rostro listo para publicar: guion, voz de IA, imágenes y subtítulos. Hasta 3 videos gratis cada 24 horas, sin tarjeta. Planes desde $4.90 USD.',
  alternates: {
    canonical: 'https://www.usekineo.com/es',
    languages: {
      'en-US': 'https://www.usekineo.com/',
      'pt-BR': 'https://www.usekineo.com/pt',
      es: 'https://www.usekineo.com/es',
    },
  },
  openGraph: {
    title: 'Generador de YouTube Shorts con IA — en español',
    description:
      'Escribes una idea y la IA arma el Short completo: guion, voz, imágenes y subtítulos. Sin aparecer en cámara, sin editar. Hasta 3 videos gratis cada 24 horas.',
    url: 'https://www.usekineo.com/es',
    type: 'website',
  },
}

const CARD = { background: '#161618', border: '1px solid #2a2a2d' }
const ACCENT = '#2997ff'
const MUTED = '#86868b'

const faq = [
  {
    q: '¿Qué es un generador de YouTube Shorts con IA?',
    a: 'Es una herramienta que crea el video completo a partir de una idea escrita. En Kineo escribes un tema y la IA redacta el guion, graba la narración con voz de IA, elige las imágenes escena por escena y agrega los subtítulos. Recibes un MP4 vertical 9:16 listo para YouTube Shorts, TikTok y Reels.',
  },
  {
    q: '¿Sirve para canales sin rostro (canal dark)?',
    a: 'Sí, es exactamente para eso. No necesitas cámara, micrófono ni aparecer en pantalla: todo el video se genera desde el texto. Funciona para finanzas, misterio, historia, motivación, datos curiosos, terror y más.',
  },
  {
    q: '¿Cuánto cuesta Kineo?',
    a: 'Puedes crear hasta 3 videos Fast con marca de agua cada 24 horas gratis, sin tarjeta. Los planes en USD: Starter a $4.90 el primer mes (luego $9.90/mes, 25 créditos), Creator a $9.90 el primer mes (luego $24.90/mes, 150 créditos) y Studio a $37.90/mes (200 créditos). Cancelas cuando quieras.',
  },
  {
    q: '¿En qué se diferencia de Opus Clip?',
    a: 'Opus Clip recorta videos largos que tú ya grabaste. Kineo crea el video desde cero a partir de una idea: no necesitas material grabado, no necesitas aparecer y el resultado sale en español nativo.',
  },
]

export default function EsLandingPage() {
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faq.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  }
  return (
    <main style={{ minHeight: '100vh', background: '#000', color: '#f5f5f7', fontFamily: 'Inter, -apple-system, sans-serif' }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd).replace(/</g, '\\u003c') }}
      />
      <div style={{ maxWidth: 820, margin: '0 auto', padding: '28px 18px 64px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Link href="/es" style={{ color: ACCENT, fontWeight: 800, textDecoration: 'none', fontSize: '1.05rem' }}>⚡ Kineo</Link>
          <Link href="/" style={{ color: MUTED, textDecoration: 'none', fontSize: '0.8rem' }}>English</Link>
        </div>

        {/* Hero */}
        <section style={{ marginTop: 36, textAlign: 'center' }}>
          <div style={{ display: 'inline-block', fontSize: '0.72rem', fontWeight: 800, letterSpacing: '0.05em', textTransform: 'uppercase', color: ACCENT, background: 'rgba(41,151,255,0.12)', borderRadius: 999, padding: '6px 14px' }}>
            En español
          </div>
          <h1 style={{ fontSize: 'clamp(1.9rem, 5.5vw, 2.7rem)', fontWeight: 600, letterSpacing: '-0.03em', lineHeight: 1.12, margin: '16px 0 0', background: 'linear-gradient(180deg,#fff 35%,#a1a1a6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
            Generador de YouTube Shorts con IA — sin cámara, sin editar
          </h1>
          <p style={{ fontSize: '1.05rem', color: MUTED, lineHeight: 1.6, margin: '16px auto 0', maxWidth: 640 }}>
            Escribes una idea y Kineo arma el Short completo: <b>guion + voz de IA + imágenes + subtítulos</b>, normalmente en 2 a 4 minutos. Listo para publicar en YouTube Shorts, TikTok y Reels.
          </p>
          <a href={CTA_URL} style={{ display: 'inline-block', marginTop: 22, background: '#f5f5f7', color: '#000', fontWeight: 600, padding: '15px 32px', borderRadius: 980, textDecoration: 'none', fontSize: '1.05rem' }}>
            Crear mi primer video gratis →
          </a>
          <p style={{ fontSize: '0.82rem', color: MUTED, margin: '10px 0 0' }}>
            Hasta <b style={{ color: ACCENT }}>3 videos gratis</b> cada 24 horas · sin tarjeta · cancela cuando quieras
          </p>
        </section>

        {/* Cómo funciona */}
        <section style={{ marginTop: 48 }}>
          <h2 style={{ fontSize: '1.3rem', fontWeight: 600, letterSpacing: '-0.025em', textAlign: 'center', margin: '0 0 18px', color: '#f5f5f7' }}>Cómo funciona</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
            {[
              { n: '1', t: 'Escribe la idea', d: 'Un tema, un dato, una historia. Con una frase alcanza.' },
              { n: '2', t: 'La IA arma el video', d: 'Guion con gancho, narración con voz de IA, imágenes y subtítulos — todo en automático.' },
              { n: '3', t: 'Descarga y publica', d: 'Un MP4 vertical 9:16 en minutos, listo para YouTube Shorts, TikTok y Reels.' },
            ].map((s) => (
              <div key={s.n} style={{ ...CARD, borderRadius: 20, padding: 16 }}>
                <div style={{ width: 30, height: 30, borderRadius: 8, background: 'rgba(41,151,255,0.14)', color: ACCENT, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>{s.n}</div>
                <div style={{ fontWeight: 600, marginBottom: 4, color: '#f5f5f7' }}>{s.t}</div>
                <p style={{ margin: 0, fontSize: '0.85rem', color: MUTED, lineHeight: 1.5 }}>{s.d}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Precios */}
        <section style={{ marginTop: 48 }}>
          <h2 style={{ fontSize: '1.3rem', fontWeight: 600, letterSpacing: '-0.025em', textAlign: 'center', margin: '0 0 6px', color: '#f5f5f7' }}>Planes mensuales en USD</h2>
          <p style={{ textAlign: 'center', color: MUTED, fontSize: '0.9rem', margin: '0 0 18px' }}>Los créditos se renuevan cada mes · cancela cuando quieras</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
            {[
              { price: '$4.90 hoy', credits: 'Starter · 25 créditos/mes', detail: 'Renueva a $9.90/mes en 30 días' },
              { price: '$9.90 hoy', credits: 'Creator · 150 créditos/mes', detail: 'Renueva a $24.90/mes en 30 días' },
              { price: '$37.90/mes', credits: 'Studio · 200 créditos/mes', detail: 'Para publicar todos los días en varios canales' },
            ].map((p) => (
              <div key={p.credits} style={{ ...CARD, borderRadius: 20, padding: '22px 20px', textAlign: 'center' }}>
                <div style={{ fontSize: '1.7rem', fontWeight: 600, color: '#f5f5f7' }}>{p.price}</div>
                <div style={{ color: ACCENT, fontWeight: 700, margin: '4px 0' }}>{p.credits}</div>
                <p style={{ color: MUTED, fontSize: '0.85rem', margin: '0 0 14px' }}>{p.detail}</p>
                <a href={CTA_URL} style={{ display: 'inline-block', background: '#f5f5f7', color: '#000', fontWeight: 600, padding: '11px 22px', borderRadius: 980, textDecoration: 'none', fontSize: '0.92rem' }}>Crear primer Short →</a>
              </div>
            ))}
          </div>
        </section>

        {/* vs OpusClip */}
        <section style={{ marginTop: 44, ...CARD, borderRadius: 20, padding: '20px 22px' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 600, letterSpacing: '-0.025em', margin: '0 0 8px', color: '#f5f5f7' }}>Kineo vs. Opus Clip</h2>
          <p style={{ margin: 0, color: MUTED, lineHeight: 1.6, fontSize: '0.95rem' }}>
            Opus Clip <b>recorta</b> videos largos que ya grabaste. Kineo <b>crea el video desde cero</b> a partir de una idea: 100% sin rostro, con narración en español nativo. Si no tienes material grabado, Kineo es la herramienta correcta.
          </p>
        </section>

        {/* FAQ */}
        <section style={{ marginTop: 44 }}>
          <h2 style={{ fontSize: '1.3rem', fontWeight: 600, letterSpacing: '-0.025em', textAlign: 'center', margin: '0 0 18px', color: '#f5f5f7' }}>Preguntas frecuentes</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {faq.map((f) => (
              <div key={f.q} style={{ ...CARD, borderRadius: 12, padding: '16px 18px' }}>
                <div style={{ fontWeight: 600, marginBottom: 6, fontSize: '0.95rem', color: '#f5f5f7' }}>{f.q}</div>
                <p style={{ margin: 0, color: MUTED, lineHeight: 1.6, fontSize: '0.9rem' }}>{f.a}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA final */}
        <section style={{ marginTop: 44, textAlign: 'center', ...CARD, borderRadius: 20, padding: '28px 20px' }}>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 600, letterSpacing: '-0.025em', margin: 0, color: '#f5f5f7' }}>Crea tu primer Short gratis</h2>
          <p style={{ color: MUTED, margin: '8px 0 18px', fontSize: '0.95rem' }}>Entra una idea, sale un Short terminado. Sin editar, sin tarjeta.</p>
          <a href={CTA_URL} style={{ display: 'inline-block', background: '#f5f5f7', color: '#000', fontWeight: 600, padding: '14px 30px', borderRadius: 980, textDecoration: 'none', fontSize: '1.02rem' }}>Elegir mi tema →</a>
        </section>

        {/* Cross-links del cluster ES */}
        <nav style={{ marginTop: 36, textAlign: 'center', fontSize: '0.85rem', color: '#6e6e73' }}>
          <span>Guías: </span>
          <Link href="/es/videos-sin-rostro" style={{ color: MUTED, textDecoration: 'none' }}>Cómo hacer videos sin rostro para YouTube</Link>
          {' · '}
          <Link href="/es/canal-dark" style={{ color: MUTED, textDecoration: 'none' }}>Cómo crear un canal dark rentable</Link>
        </nav>
      </div>
    </main>
  )
}
