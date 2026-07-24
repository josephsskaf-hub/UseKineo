// Guía SEO en español: "como crear un canal dark / canal sin rostro rentable".
// Parte del cluster ES: /es · /es/videos-sin-rostro · /es/canal-dark
// Estática, guía completa: qué es, requisitos YPP, RPM realista ES vs EN,
// por qué Shorts es la entrada más rápida, CTA a Kineo.
import type { Metadata } from 'next'
import Link from 'next/link'

export const dynamic = 'force-static'

const CTA_URL =
  'https://www.usekineo.com/free-ai-shorts-generator?utm_source=es-cluster&utm_medium=seo&utm_campaign=acq5'

export const metadata: Metadata = {
  metadataBase: new URL('https://www.usekineo.com'),
  title: 'Cómo crear un canal dark rentable en 2026 (guía realista) — Kineo',
  description:
    'Guía realista para crear un canal dark (canal sin rostro) rentable: qué es, requisitos del Programa de Socios de YouTube, RPM real en español vs. inglés y por qué los Shorts son la entrada más rápida.',
  alternates: { canonical: 'https://www.usekineo.com/es/canal-dark' },
  openGraph: {
    title: 'Cómo crear un canal dark rentable — guía realista 2026',
    description:
      'Qué es un canal dark, cuánto se gana de verdad en español, qué pide YouTube para monetizar y cómo empezar hoy con Shorts generados con IA.',
    url: 'https://www.usekineo.com/es/canal-dark',
    type: 'article',
  },
}

const CARD = { background: '#161618', border: '1px solid #2a2a2d' }
const ACCENT = '#2997ff'
const MUTED = '#86868b'

export default function CanalDarkPage() {
  const h2 = { fontSize: '1.35rem', fontWeight: 600, letterSpacing: '-0.025em', margin: '0 0 12px', color: '#f5f5f7' } as const
  const para = { color: '#a1a1a6', lineHeight: 1.7, margin: '0 0 14px', fontSize: '0.98rem' } as const

  return (
    <main style={{ minHeight: '100vh', background: '#000', color: '#f5f5f7', fontFamily: 'Inter, -apple-system, sans-serif' }}>
      <div style={{ maxWidth: 780, margin: '0 auto', padding: '28px 18px 64px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Link href="/es" style={{ color: ACCENT, fontWeight: 800, textDecoration: 'none', fontSize: '1.05rem' }}>⚡ Kineo</Link>
          <Link href="/" style={{ color: MUTED, textDecoration: 'none', fontSize: '0.8rem' }}>English</Link>
        </div>

        {/* Hero */}
        <section style={{ marginTop: 36 }}>
          <div style={{ display: 'inline-block', fontSize: '0.72rem', fontWeight: 800, letterSpacing: '0.05em', textTransform: 'uppercase', color: ACCENT, background: 'rgba(41,151,255,0.12)', borderRadius: 999, padding: '6px 14px' }}>
            Guía realista · 2026
          </div>
          <h1 style={{ fontSize: 'clamp(1.8rem, 5vw, 2.5rem)', fontWeight: 600, letterSpacing: '-0.03em', lineHeight: 1.15, margin: '16px 0 0', background: 'linear-gradient(180deg,#fff 35%,#a1a1a6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
            Cómo crear un canal dark rentable (sin humo, con números reales)
          </h1>
          <p style={{ fontSize: '1.02rem', color: MUTED, lineHeight: 1.65, margin: '14px 0 0' }}>
            Sí, se puede vivir de un canal sin mostrar la cara. No, no es dinero fácil ni pasivo desde el día uno. Esta guía te cuenta lo que casi nadie dice: qué es exactamente un canal dark, qué exige YouTube para pagarte, cuánto se gana de verdad en español comparado con el inglés, y cuál es la forma más rápida de entrar hoy.
          </p>
          <a href={CTA_URL} style={{ display: 'inline-block', marginTop: 20, background: '#f5f5f7', color: '#000', fontWeight: 600, padding: '14px 30px', borderRadius: 980, textDecoration: 'none', fontSize: '1.02rem' }}>
            Crear mi primer video gratis →
          </a>
          <p style={{ fontSize: '0.82rem', color: MUTED, margin: '10px 0 0' }}>
            Hasta 3 videos gratis cada 24 horas · sin tarjeta
          </p>
        </section>

        {/* Qué es */}
        <section style={{ marginTop: 44 }}>
          <h2 style={h2}>¿Qué es un canal dark?</h2>
          <p style={para}>
            Un canal dark es un canal de YouTube donde el creador nunca aparece en pantalla: los videos se construyen con voz en off, imágenes o clips de archivo y subtítulos. Es el mismo concepto que en inglés llaman canal faceless, y en español se popularizó con ese nombre por los canales de misterio, terror y finanzas que crecieron sin que nadie supiera quién estaba detrás.
          </p>
          <p style={para}>
            Lo importante: un canal dark no es un canal de contenido robado. Resubir videos de otros o pegar clips sin transformarlos es la vía directa a la desmonetización. Un canal dark rentable produce contenido original — guion propio, narración propia, montaje propio — solo que sin cara. Si quieres ver qué nichos funcionan mejor en español y cómo se produce este contenido paso a paso, tenemos una guía dedicada a <Link href="/es/videos-sin-rostro" style={{ color: ACCENT, textDecoration: 'none' }}>cómo hacer videos sin rostro para YouTube</Link>.
          </p>
        </section>

        {/* Requisitos YPP */}
        <section style={{ marginTop: 44 }}>
          <h2 style={h2}>Qué pide YouTube para monetizar (Programa de Socios)</h2>
          <p style={para}>
            Para cobrar ingresos por publicidad necesitas entrar al Programa de Socios de YouTube (YPP). Los umbrales para el nivel completo — el que incluye reparto de ingresos por anuncios — son:
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12, marginTop: 6 }}>
            <div style={{ ...CARD, borderRadius: 16, padding: '16px 18px' }}>
              <div style={{ color: ACCENT, fontWeight: 800, fontSize: '0.8rem', marginBottom: 6 }}>Ruta clásica</div>
              <div style={{ fontWeight: 600, marginBottom: 6, color: '#f5f5f7' }}>1,000 suscriptores + 4,000 horas de visualización</div>
              <p style={{ margin: 0, color: MUTED, lineHeight: 1.6, fontSize: '0.88rem' }}>Las 4,000 horas deben ser de videos largos públicos en los últimos 12 meses. Es la ruta lenta si solo publicas Shorts.</p>
            </div>
            <div style={{ ...CARD, borderRadius: 16, padding: '16px 18px' }}>
              <div style={{ color: ACCENT, fontWeight: 800, fontSize: '0.8rem', marginBottom: 6 }}>Ruta Shorts</div>
              <div style={{ fontWeight: 600, marginBottom: 6, color: '#f5f5f7' }}>1,000 suscriptores + 10 millones de vistas en Shorts</div>
              <p style={{ margin: 0, color: MUTED, lineHeight: 1.6, fontSize: '0.88rem' }}>Las vistas cuentan en los últimos 90 días. Suena enorme, pero un solo Short viral puede acumular millones de vistas en una semana.</p>
            </div>
          </div>
          <p style={{ ...para, marginTop: 14 }}>
            Además, YouTube exige cumplir sus políticas de monetización de canales: el contenido generado con ayuda de IA es monetizable siempre que sea original y aporte valor — es decir, tu idea, tu guion y tu narrativa, no contenido repetitivo producido en masa sin criterio. También existe un nivel intermedio del YPP con requisitos menores (500 suscriptores) que desbloquea membresías y Supers, pero el dinero real de publicidad llega con los umbrales de arriba.
          </p>
        </section>

        {/* RPM realista */}
        <section style={{ marginTop: 44 }}>
          <h2 style={h2}>Cuánto se gana de verdad: RPM en español vs. inglés</h2>
          <p style={para}>
            El RPM es lo que te queda por cada 1,000 vistas monetizadas, y aquí es donde conviene tener expectativas realistas. Los anunciantes pagan más por audiencias de EE. UU. y Reino Unido que por audiencias de Latinoamérica, así que el mismo video gana menos en español:
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12, marginTop: 6 }}>
            <div style={{ ...CARD, borderRadius: 16, padding: '16px 18px' }}>
              <div style={{ fontWeight: 600, marginBottom: 6, color: '#f5f5f7' }}>Videos largos</div>
              <p style={{ margin: 0, color: MUTED, lineHeight: 1.6, fontSize: '0.88rem' }}>
                En español, un RPM típico ronda <b style={{ color: '#f5f5f7' }}>$0.50–$2 USD</b> (nichos de finanzas pueden superarlo). En inglés, el mismo contenido suele moverse entre <b style={{ color: '#f5f5f7' }}>$2–$10 USD</b>. La brecha es real: 3 a 5 veces.
              </p>
            </div>
            <div style={{ ...CARD, borderRadius: 16, padding: '16px 18px' }}>
              <div style={{ fontWeight: 600, marginBottom: 6, color: '#f5f5f7' }}>Shorts</div>
              <p style={{ margin: 0, color: MUTED, lineHeight: 1.6, fontSize: '0.88rem' }}>
                El RPM de Shorts es bajo en todos los idiomas: típicamente <b style={{ color: '#f5f5f7' }}>$0.03–$0.10 USD</b> en español y $0.10–$0.30 en inglés. Los Shorts no son para vivir del RPM: son para conseguir volumen, suscriptores y monetización rápida.
              </p>
            </div>
          </div>
          <p style={{ ...para, marginTop: 14 }}>
            ¿Significa que el español no vale la pena? No: la competencia en español es una fracción de la que hay en inglés, la audiencia hispanohablante supera los 500 millones de personas y el costo de producción con IA es idéntico. Menos RPM, pero muchas más vistas alcanzables y nichos aún vacíos. Y los canales dark maduros no viven solo del RPM: afiliados, productos digitales y patrocinios suelen superar a AdSense una vez que hay audiencia.
          </p>
        </section>

        {/* Por qué Shorts */}
        <section style={{ marginTop: 44 }}>
          <h2 style={h2}>Por qué los Shorts son la entrada más rápida</h2>
          <p style={para}>
            Un canal nuevo de videos largos empieza con un problema frío: nadie te conoce, el algoritmo no sabe a quién mostrarte y cada video cuesta horas de producción. Los Shorts invierten esa ecuación. El feed de Shorts muestra tu contenido a desconocidos desde el primer día, sin necesitar suscriptores, y el veredicto llega en horas, no en meses.
          </p>
          <p style={para}>
            Eso convierte a los Shorts en el laboratorio perfecto para un canal dark: publicas a diario, mides qué ganchos y qué nichos retienen, acumulas suscriptores hacia el umbral de monetización — y solo entonces inviertes en videos largos, que es donde el RPM alto convierte esas vistas en ingresos serios. La estrategia ganadora en 2026 no es "Shorts o largos": es Shorts para crecer, largos para cobrar.
          </p>
          <p style={para}>
            El único requisito es la frecuencia, y ahí es donde la producción manual mata a la mayoría de canales antes de despegar. Escribir, narrar, buscar clips y editar un Short toma 2 a 4 horas a mano. Con un generador como Kineo toma minutos: escribes la idea y recibes el video terminado con guion, voz de IA en español, imágenes y subtítulos. Publicar todos los días deja de ser heroico.
          </p>
        </section>

        {/* Plan de acción */}
        <section style={{ marginTop: 44 }}>
          <h2 style={h2}>Tu plan de acción, resumido</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
            {[
              { n: '1', t: 'Elige un nicho y quédate', d: 'Finanzas, misterio, historia, motivación, datos curiosos o terror. Un nicho, un canal, 30 videos antes de juzgar resultados.' },
              { n: '2', t: 'Publica un Short al día', d: 'Genera el video con IA en minutos, revisa el gancho de los 2 primeros segundos y publica. La frecuencia es tu mayor palanca.' },
              { n: '3', t: 'Monetiza y escala', d: 'Alcanza el umbral del YPP con Shorts, añade videos largos para capturar RPM alto y suma afiliados cuando tengas audiencia.' },
            ].map((s) => (
              <div key={s.n} style={{ ...CARD, borderRadius: 16, padding: 16 }}>
                <div style={{ width: 30, height: 30, borderRadius: 8, background: 'rgba(41,151,255,0.14)', color: ACCENT, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>{s.n}</div>
                <div style={{ fontWeight: 600, marginBottom: 4, color: '#f5f5f7' }}>{s.t}</div>
                <p style={{ margin: 0, fontSize: '0.85rem', color: MUTED, lineHeight: 1.55 }}>{s.d}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA final */}
        <section style={{ marginTop: 44, textAlign: 'center', ...CARD, borderRadius: 20, padding: '28px 20px' }}>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 600, letterSpacing: '-0.025em', margin: 0, color: '#f5f5f7' }}>Empieza tu canal dark hoy</h2>
          <p style={{ color: MUTED, margin: '8px 0 18px', fontSize: '0.95rem' }}>
            Escribe una idea y Kineo genera el Short completo: guion, voz de IA en español, imágenes y subtítulos. Hasta 3 videos gratis cada 24 horas, sin tarjeta.
          </p>
          <a href={CTA_URL} style={{ display: 'inline-block', background: '#f5f5f7', color: '#000', fontWeight: 600, padding: '14px 30px', borderRadius: 980, textDecoration: 'none', fontSize: '1.02rem' }}>Crear mi primer video gratis →</a>
        </section>

        {/* Cross-links del cluster ES */}
        <nav style={{ marginTop: 36, textAlign: 'center', fontSize: '0.85rem', color: '#6e6e73' }}>
          <span>Más en español: </span>
          <Link href="/es" style={{ color: MUTED, textDecoration: 'none' }}>Generador de YouTube Shorts con IA</Link>
          {' · '}
          <Link href="/es/videos-sin-rostro" style={{ color: MUTED, textDecoration: 'none' }}>Cómo hacer videos sin rostro para YouTube</Link>
        </nav>
      </div>
    </main>
  )
}
