// Guía SEO en español: "como hacer videos sin rostro para youtube".
// Parte del cluster ES: /es · /es/videos-sin-rostro · /es/canal-dark
// Estática, 800+ palabras, FAQ visible + FAQPage JSON-LD espejado 1:1.
import type { Metadata } from 'next'
import Link from 'next/link'

export const dynamic = 'force-static'

const CTA_URL =
  'https://www.usekineo.com/free-ai-shorts-generator?utm_source=es-cluster&utm_medium=seo&utm_campaign=acq5'

export const metadata: Metadata = {
  metadataBase: new URL('https://www.usekineo.com'),
  title: 'Cómo hacer videos sin rostro para YouTube (guía 2026 con IA) — Kineo',
  description:
    'Guía completa para hacer videos sin rostro para YouTube: qué son los canales faceless, 6 nichos que funcionan en español y cómo crear tu primer Short con IA en 3 pasos, sin cámara ni edición.',
  alternates: { canonical: 'https://www.usekineo.com/es/videos-sin-rostro' },
  openGraph: {
    title: 'Cómo hacer videos sin rostro para YouTube — guía 2026',
    description:
      'Qué son los canales sin rostro, 6 nichos que funcionan en español y el flujo de 3 pasos para crear tu primer Short con IA sin aparecer en cámara.',
    url: 'https://www.usekineo.com/es/videos-sin-rostro',
    type: 'article',
  },
}

const CARD = { background: '#161618', border: '1px solid #2a2a2d' }
const ACCENT = '#2997ff'
const MUTED = '#86868b'

const niches = [
  {
    t: 'Finanzas personales',
    d: 'Ahorro, deudas, inversión básica, errores con el dinero. Es de los nichos con mejor RPM en español porque atrae anunciantes de bancos, fintechs y seguros. Ideas que funcionan: "3 hábitos que te mantienen pobre", "qué pasa si inviertes $10 al día".',
  },
  {
    t: 'Misterio',
    d: 'Casos sin resolver, desapariciones, lugares prohibidos, expedientes extraños. La curiosidad genera retención altísima, y la retención es lo que el algoritmo de Shorts premia. Voz grave + imágenes oscuras + un buen gancho en el primer segundo.',
  },
  {
    t: 'Historia',
    d: 'Batallas, imperios, personajes olvidados, "lo que no te contaron en la escuela". Contenido infinito, libre de derechos y fácil de verificar. En español hay mucha menos competencia que en inglés para el mismo tipo de video.',
  },
  {
    t: 'Motivación',
    d: 'Disciplina, mentalidad, frases de grandes personajes, historias de superación. Se comparte muchísimo por WhatsApp e Instagram, lo que trae vistas fuera de YouTube. Funciona con narración intensa y música épica de fondo.',
  },
  {
    t: 'Datos curiosos',
    d: 'Ciencia, geografía, animales, el cuerpo humano, récords absurdos. Es el nicho más fácil para empezar: cualquier dato verificable se convierte en un Short de 45 segundos. "¿Sabías que...?" sigue siendo uno de los ganchos más efectivos.',
  },
  {
    t: 'Terror',
    d: 'Historias de terror narradas, leyendas de Latinoamérica y España, relatos de usuarios. La audiencia en español es enorme y muy fiel: quien ve un relato completo casi siempre ve el siguiente. Perfecto para series y para retención en cadena.',
  },
]

const faq = [
  {
    q: '¿Se puede monetizar un canal de YouTube sin mostrar la cara?',
    a: 'Sí. YouTube no exige aparecer en cámara para monetizar. Lo que exige es contenido original con valor añadido: guion propio, narración propia y edición con criterio. Miles de canales sin rostro de finanzas, misterio e historia están monetizados hoy. Lo que no funciona es resubir contenido de otros sin transformarlo.',
  },
  {
    q: '¿Qué necesito para hacer videos sin rostro para YouTube?',
    a: 'Con el método clásico: un guion, una voz en off, imágenes o clips de archivo, un editor tipo CapCut y varias horas por video. Con un generador de IA como Kineo solo necesitas la idea: la herramienta escribe el guion, narra con voz de IA, coloca las imágenes y agrega los subtítulos automáticamente.',
  },
  {
    q: '¿Los videos sin rostro hechos con IA se pueden monetizar?',
    a: 'Sí, siempre que el resultado sea contenido original y no repetitivo. Cada video de Kineo se genera desde cero a partir de tu idea, con guion y narración únicos, y tú eres dueño del video con todos los derechos de monetización en YouTube, TikTok e Instagram.',
  },
  {
    q: '¿Cuánto tarda en generarse un Short con Kineo?',
    a: 'Normalmente entre 2 y 4 minutos en modo Fast. Escribes el tema y recibes un MP4 vertical 9:16 con guion, voz, imágenes y subtítulos, listo para descargar y publicar. Puedes crear hasta 3 videos gratis con marca de agua cada 24 horas, sin tarjeta.',
  },
]

export default function VideosSinRostroPage() {
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faq.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  }
  const h2 = { fontSize: '1.35rem', fontWeight: 600, letterSpacing: '-0.025em', margin: '0 0 12px', color: '#f5f5f7' } as const
  const para = { color: '#a1a1a6', lineHeight: 1.7, margin: '0 0 14px', fontSize: '0.98rem' } as const

  return (
    <main style={{ minHeight: '100vh', background: '#000', color: '#f5f5f7', fontFamily: 'Inter, -apple-system, sans-serif' }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd).replace(/</g, '\\u003c') }}
      />
      <div style={{ maxWidth: 780, margin: '0 auto', padding: '28px 18px 64px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Link href="/es" style={{ color: ACCENT, fontWeight: 800, textDecoration: 'none', fontSize: '1.05rem' }}>⚡ Kineo</Link>
          <Link href="/" style={{ color: MUTED, textDecoration: 'none', fontSize: '0.8rem' }}>English</Link>
        </div>

        {/* Hero */}
        <section style={{ marginTop: 36 }}>
          <div style={{ display: 'inline-block', fontSize: '0.72rem', fontWeight: 800, letterSpacing: '0.05em', textTransform: 'uppercase', color: ACCENT, background: 'rgba(41,151,255,0.12)', borderRadius: 999, padding: '6px 14px' }}>
            Guía 2026 · En español
          </div>
          <h1 style={{ fontSize: 'clamp(1.8rem, 5vw, 2.5rem)', fontWeight: 600, letterSpacing: '-0.03em', lineHeight: 1.15, margin: '16px 0 0', background: 'linear-gradient(180deg,#fff 35%,#a1a1a6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
            Cómo hacer videos sin rostro para YouTube (sin cámara y sin editar)
          </h1>
          <p style={{ fontSize: '1.02rem', color: MUTED, lineHeight: 1.65, margin: '14px 0 0' }}>
            No necesitas mostrar tu cara, comprar una cámara ni aprender a editar para tener un canal de YouTube que crezca. En esta guía te explicamos qué son los canales sin rostro, cuáles son los 6 nichos que mejor funcionan en español y cómo crear tu primer video hoy mismo con inteligencia artificial, en 3 pasos.
          </p>
          <a href={CTA_URL} style={{ display: 'inline-block', marginTop: 20, background: '#f5f5f7', color: '#000', fontWeight: 600, padding: '14px 30px', borderRadius: 980, textDecoration: 'none', fontSize: '1.02rem' }}>
            Crear mi primer video gratis →
          </a>
          <p style={{ fontSize: '0.82rem', color: MUTED, margin: '10px 0 0' }}>
            Hasta 3 videos gratis cada 24 horas · sin tarjeta
          </p>
        </section>

        {/* Qué es un canal sin rostro */}
        <section style={{ marginTop: 44 }}>
          <h2 style={h2}>¿Qué es un canal sin rostro (faceless)?</h2>
          <p style={para}>
            Un canal sin rostro — también llamado canal faceless o <Link href="/es/canal-dark" style={{ color: ACCENT, textDecoration: 'none' }}>canal dark</Link> — es un canal de YouTube donde el creador nunca aparece en pantalla. En lugar de una persona hablando a cámara, el video se construye con una voz en off que narra sobre imágenes, clips de archivo o escenas generadas, con subtítulos encima. Piensa en los canales de misterio que narran casos sin resolver, los de finanzas que explican cómo ahorrar, o los de datos curiosos que te cuentan por qué los aviones no vuelan sobre el Tíbet.
          </p>
          <p style={para}>
            La ventaja es evidente: no dependes de tu imagen, no necesitas un set de grabación y el canal no eres tú — es un sistema. Puedes producir en serie, mantener varios canales a la vez e incluso venderlos, porque el activo es el contenido y no tu presencia. Y desde que existe la IA generativa, la barrera de producción prácticamente desapareció: lo que antes exigía guionista, locutor y editor, hoy lo hace una sola herramienta en minutos.
          </p>
          <p style={para}>
            El formato ideal para empezar son los YouTube Shorts: videos verticales de menos de un minuto que el algoritmo distribuye a gente que no te conoce, sin que necesites suscriptores previos. Es la vía de entrada más rápida que existe hoy en YouTube, y la explicamos a fondo en nuestra guía sobre <Link href="/es/canal-dark" style={{ color: ACCENT, textDecoration: 'none' }}>cómo crear un canal dark rentable</Link>.
          </p>
        </section>

        {/* 6 nichos */}
        <section style={{ marginTop: 44 }}>
          <h2 style={h2}>6 nichos sin rostro que funcionan en español</h2>
          <p style={para}>
            El nicho importa más que la calidad de edición. Estos seis tienen demanda comprobada en Latinoamérica y España, contenido prácticamente infinito y mucha menos competencia que sus equivalentes en inglés:
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12, marginTop: 6 }}>
            {niches.map((n, i) => (
              <div key={n.t} style={{ ...CARD, borderRadius: 16, padding: '16px 18px' }}>
                <div style={{ color: ACCENT, fontWeight: 800, fontSize: '0.8rem', marginBottom: 6 }}>Nicho {i + 1}</div>
                <div style={{ fontWeight: 600, marginBottom: 6, color: '#f5f5f7' }}>{n.t}</div>
                <p style={{ margin: 0, color: MUTED, lineHeight: 1.6, fontSize: '0.88rem' }}>{n.d}</p>
              </div>
            ))}
          </div>
          <p style={{ ...para, marginTop: 14 }}>
            Un consejo antes de elegir: quédate con un solo nicho durante tus primeros 30 videos. El algoritmo de YouTube necesita entender a quién mostrarle tu contenido, y un canal que mezcla terror con finanzas confunde a la señal de recomendación. La constancia dentro de un nicho vale más que cualquier truco.
          </p>
        </section>

        {/* Flujo 3 pasos */}
        <section style={{ marginTop: 44 }}>
          <h2 style={h2}>Cómo hacer tu primer video sin rostro en 3 pasos (con Kineo)</h2>
          <p style={para}>
            El método tradicional — escribir el guion en un documento, grabar la voz o pagar una voz de IA aparte, buscar clips de archivo uno por uno y montarlo todo en CapCut — funciona, pero consume entre 2 y 4 horas por video. Kineo comprime todo ese flujo en un solo paso de escritura:
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginTop: 6 }}>
            {[
              { n: '1', t: 'Escribe tu idea', d: 'Un tema o un dato en una frase: "El misterio del vuelo MH370" o "3 hábitos que te mantienen pobre". También puedes pegar tu propio guion y la IA lo narra palabra por palabra.' },
              { n: '2', t: 'La IA genera el video completo', d: 'Kineo escribe el guion con gancho, lo narra con una voz de IA en español nativo, coloca las imágenes escena por escena y quema los subtítulos. Sin timeline, sin edición.' },
              { n: '3', t: 'Descarga y publica', d: 'En 2 a 4 minutos tienes un MP4 vertical 9:16 listo para YouTube Shorts, TikTok e Instagram Reels. El video es 100% tuyo, con todos los derechos de monetización.' },
            ].map((s) => (
              <div key={s.n} style={{ ...CARD, borderRadius: 16, padding: 16 }}>
                <div style={{ width: 30, height: 30, borderRadius: 8, background: 'rgba(41,151,255,0.14)', color: ACCENT, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>{s.n}</div>
                <div style={{ fontWeight: 600, marginBottom: 4, color: '#f5f5f7' }}>{s.t}</div>
                <p style={{ margin: 0, fontSize: '0.85rem', color: MUTED, lineHeight: 1.55 }}>{s.d}</p>
              </div>
            ))}
          </div>
          <p style={{ ...para, marginTop: 14 }}>
            Con ese tiempo de producción, publicar a diario deja de ser una meta imposible y se convierte en una rutina de 10 minutos. Y en Shorts, la frecuencia es la variable que más acelera el crecimiento: cada video nuevo es un boleto más en la lotería del algoritmo.
          </p>
          <div style={{ textAlign: 'center', marginTop: 18 }}>
            <a href={CTA_URL} style={{ display: 'inline-block', background: '#f5f5f7', color: '#000', fontWeight: 600, padding: '14px 30px', borderRadius: 980, textDecoration: 'none', fontSize: '1.02rem' }}>
              Probar Kineo gratis →
            </a>
          </div>
        </section>

        {/* FAQ */}
        <section style={{ marginTop: 44 }}>
          <h2 style={h2}>Preguntas frecuentes</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {faq.map((f) => (
              <div key={f.q} style={{ ...CARD, borderRadius: 12, padding: '16px 18px' }}>
                <h3 style={{ fontWeight: 600, margin: '0 0 6px', fontSize: '0.95rem', color: '#f5f5f7' }}>{f.q}</h3>
                <p style={{ margin: 0, color: MUTED, lineHeight: 1.6, fontSize: '0.9rem' }}>{f.a}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA final */}
        <section style={{ marginTop: 44, textAlign: 'center', ...CARD, borderRadius: 20, padding: '28px 20px' }}>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 600, letterSpacing: '-0.025em', margin: 0, color: '#f5f5f7' }}>Tu primer video sin rostro, hoy</h2>
          <p style={{ color: MUTED, margin: '8px 0 18px', fontSize: '0.95rem' }}>Entra una idea, sale un Short terminado con guion, voz y subtítulos. Sin cámara, sin editar, sin tarjeta.</p>
          <a href={CTA_URL} style={{ display: 'inline-block', background: '#f5f5f7', color: '#000', fontWeight: 600, padding: '14px 30px', borderRadius: 980, textDecoration: 'none', fontSize: '1.02rem' }}>Crear mi primer video gratis →</a>
        </section>

        {/* Cross-links del cluster ES */}
        <nav style={{ marginTop: 36, textAlign: 'center', fontSize: '0.85rem', color: '#6e6e73' }}>
          <span>Más en español: </span>
          <Link href="/es" style={{ color: MUTED, textDecoration: 'none' }}>Generador de YouTube Shorts con IA</Link>
          {' · '}
          <Link href="/es/canal-dark" style={{ color: MUTED, textDecoration: 'none' }}>Cómo crear un canal dark rentable</Link>
        </nav>
      </div>
    </main>
  )
}
