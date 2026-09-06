import type { Metadata } from 'next'
import Link from 'next/link'
import Footer from '@/components/Footer'
import { InterfaceLanguageSelect, UiLabel, UiText } from '@/components/InterfaceLanguage'
import { TOOL_SPANISH } from '@/lib/ui/toolSpanish'
import { FREE_TOOL_FACTS, PUBLIC_COST_PLANNER_FACT } from '@/lib/kineoFacts'

const BASE = 'https://www.usekineo.com'
const PUBLIC_TOOL_FACTS = [...FREE_TOOL_FACTS, PUBLIC_COST_PLANNER_FACT]
type PublicToolFact = (typeof PUBLIC_TOOL_FACTS)[number]

export const metadata: Metadata = {
  metadataBase: new URL(BASE),
  title: 'Free YouTube Shorts Tools — No Signup or Card | Kineo',
  description:
    `Use ${PUBLIC_TOOL_FACTS.length} free YouTube Shorts tools without an account or card: ad briefs, scripts, hooks, publishing copy, viral score, content planning, earnings and production-cost calculators.`,
  alternates: { canonical: `${BASE}/tools` },
  openGraph: {
    title: 'Free YouTube Shorts Tools — No Signup',
    description:
      `Go from topic, comment, product or business goal to a useful Short plan, script, publishing kit or production-cost estimate. ${PUBLIC_TOOL_FACTS.length} made-to-order tools, no account or card.`,
    url: `${BASE}/tools`,
    type: 'website',
    images: [{ url: '/og-card.png', width: 1200, height: 630, alt: 'Kineo free YouTube Shorts tools' }],
  },
}

type ToolMeta = {
  eyebrow: string
  prompt: string
  cta: string
  featured?: boolean
}

const TOOL_META: Record<string, ToolMeta> = {
  '/business-pilot-review': {
    eyebrow: 'Start with an internal decision',
    prompt: 'I need an internal decision on Kineo',
    cta: 'Build the decision note',
  },
  '/client-video-brief-generator': {
    eyebrow: 'Start with a client request',
    prompt: 'I need an approvable Short brief',
    cta: 'Build the client brief',
    featured: true,
  },
  '/free-script-generator': {
    eyebrow: 'Start with a topic',
    prompt: 'I need the complete script',
    cta: 'Write my Short script',
    featured: true,
  },
  '/free-hook-generator': {
    eyebrow: 'Start with a topic',
    prompt: 'I need a stronger opening',
    cta: 'Generate five hooks',
  },
  '/youtube-shorts-title-generator': {
    eyebrow: 'Start with a topic',
    prompt: 'I need titles, a description and hashtags',
    cta: 'Build my publishing kit',
  },
  '/youtube-shorts-script-timer': {
    eyebrow: 'Start with a finished draft',
    prompt: 'I need to know if my script fits',
    cta: 'Time my narration',
  },
  '/viral-score': {
    eyebrow: 'Start with an idea',
    prompt: 'I need to pressure-test it',
    cta: 'Score my idea',
  },
  '/comment-to-video': {
    eyebrow: 'Start with your audience',
    prompt: 'I have a comment or FAQ',
    cta: 'Turn it into a response script',
  },
  '/product-to-video-script': {
    eyebrow: 'Start with verified facts',
    prompt: 'I need a product video script',
    cta: 'Build my product script',
  },
  '/free-ai-shorts/localbusiness': {
    eyebrow: 'Start with a real business offer',
    prompt: 'I need a local business ad script',
    cta: 'Build my business ad',
  },
  '/business-video-content-plan': {
    eyebrow: 'Start with a business goal',
    prompt: 'I need a week of content',
    cta: 'Plan my business Shorts',
  },
  '/shorts-money-calculator': {
    eyebrow: 'Start with your numbers',
    prompt: 'I need an earnings estimate',
    cta: 'Calculate Shorts earnings',
  },
  '/cheapest-ai-shorts-maker': {
    eyebrow: 'Start with a publishing schedule',
    prompt: 'I need the real Kineo production cost',
    cta: 'Find my cheapest plan',
  },
}

const TOOL_ORDER = [
  '/client-video-brief-generator',
  '/free-script-generator',
  '/free-hook-generator',
  '/youtube-shorts-title-generator',
  '/youtube-shorts-script-timer',
  '/viral-score',
  '/comment-to-video',
  '/product-to-video-script',
  '/free-ai-shorts/localbusiness',
  '/business-video-content-plan',
  '/shorts-money-calculator',
  '/cheapest-ai-shorts-maker',
  '/business-pilot-review',
] as const

function pathFromUrl(url: string): string {
  return new URL(url).pathname
}

const tools = PUBLIC_TOOL_FACTS.map((tool) => {
  const path = pathFromUrl(tool.url)
  return { ...tool, path, meta: TOOL_META[path] }
})
  .filter((tool): tool is PublicToolFact & { path: string; meta: ToolMeta } => Boolean(tool.meta))
  .sort((a, b) => TOOL_ORDER.indexOf(a.path as (typeof TOOL_ORDER)[number]) - TOOL_ORDER.indexOf(b.path as (typeof TOOL_ORDER)[number]))

const toolsJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'CollectionPage',
  name: 'Free YouTube Shorts tools by Kineo',
  url: `${BASE}/tools`,
  description: `${tools.length} free, no-signup tools for planning, writing, publishing and evaluating YouTube Shorts.`,
  mainEntity: {
    '@type': 'ItemList',
    numberOfItems: tools.length,
    itemListElement: tools.map((tool, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      url: tool.url,
      name: tool.name,
      description: tool.what,
    })),
  },
}

// Presentation groups only: the facts, tool destinations and JSON-LD remain canonical.
const TOOL_GROUPS = [
  { id: 'write', title: 'Write', paths: ['/free-script-generator', '/free-hook-generator', '/comment-to-video', '/product-to-video-script', '/free-ai-shorts/localbusiness'] },
  { id: 'plan', title: 'Plan', paths: ['/client-video-brief-generator', '/business-video-content-plan', '/shorts-money-calculator', '/cheapest-ai-shorts-maker', '/business-pilot-review'] },
  { id: 'publish', title: 'Review & publish', paths: ['/youtube-shorts-title-generator', '/youtube-shorts-script-timer', '/viral-score'] },
] as const

const PAGE_CSS = `
  .tools-page { min-height: 100vh; background: #000; color: #f5f5f7; font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
  .tools-shell { width: min(1120px, calc(100% - 36px)); margin: 0 auto; padding: 26px 0 72px; }
  .tools-nav { display: flex; align-items: center; justify-content: space-between; gap: 18px; }
  .tools-logo { color: #2997ff; font-size: 1.08rem; font-weight: 900; text-decoration: none; }
  .tools-product-link { color: #cbd5e1; font-size: .86rem; font-weight: 750; text-decoration: none; }
  .tools-hero { max-width: 860px; margin: 86px auto 42px; text-align: center; }
  .tools-kicker, .tool-eyebrow { margin: 0; color: #5cb3ff; font-size: .72rem; font-weight: 900; letter-spacing: .11em; text-transform: uppercase; }
  .tools-hero h1 { margin: 16px 0 0; font-size: clamp(2.35rem, 7vw, 5.35rem); line-height: .98; letter-spacing: -.058em; }
  .tools-intro { max-width: 710px; margin: 22px auto 0; color: #aeb8c6; font-size: clamp(1rem, 2vw, 1.18rem); line-height: 1.65; }
  .tools-trust { display: flex; flex-wrap: wrap; justify-content: center; gap: 8px; margin-top: 25px; }
  .tools-trust span { padding: 8px 12px; border: 1px solid rgba(255,255,255,.1); border-radius: 999px; color: #cbd5e1; background: rgba(255,255,255,.035); font-size: .78rem; font-weight: 750; }
  .tools-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }
  .tool-card { min-height: 255px; display: flex; flex-direction: column; justify-content: space-between; gap: 28px; padding: 26px; border-radius: 22px; border: 1px solid rgba(255,255,255,.09); background: linear-gradient(145deg, rgba(14,20,34,.96), rgba(5,8,15,.98)); box-shadow: inset 0 1px 0 rgba(255,255,255,.035); }
  .tool-card-featured { grid-column: 1 / -1; min-height: 280px; background: radial-gradient(circle at 87% 12%, rgba(41,151,255,.2), transparent 34%), linear-gradient(145deg, rgba(14,24,44,.98), rgba(5,8,15,.98)); border-color: rgba(41,151,255,.34); }
  .tool-card h2 { max-width: 690px; margin: 11px 0 0; font-size: clamp(1.5rem, 3.4vw, 2.55rem); line-height: 1.08; letter-spacing: -.035em; }
  .tool-description { max-width: 760px; margin: 13px 0 0; color: #aeb8c6; font-size: .94rem; line-height: 1.55; }
  .tool-footer { display: flex; align-items: end; justify-content: space-between; gap: 18px; }
  .tool-footer span { color: #737e8e; font-size: .72rem; }
  .tool-footer a { color: #000; background: #2997ff; border-radius: 11px; padding: 11px 15px; font-size: .82rem; font-weight: 900; text-decoration: none; text-align: center; }
  .tools-boundary { display: flex; align-items: end; justify-content: space-between; gap: 36px; margin-top: 18px; padding: 30px; border-radius: 22px; border: 1px solid rgba(255,255,255,.09); background: #080b11; }
  .tools-boundary h2 { max-width: 700px; margin: 10px 0 0; font-size: clamp(1.35rem, 3vw, 2.1rem); line-height: 1.15; letter-spacing: -.03em; }
  .tools-boundary p:not(.tool-eyebrow) { max-width: 720px; margin: 13px 0 0; color: #98a3b3; line-height: 1.55; }
  .tools-boundary > a { flex: 0 0 auto; color: #5cb3ff; font-weight: 850; text-decoration: none; }
  .tool-footer a:hover, .tool-footer a:focus-visible { background: #5cb3ff; }
  .tools-logo:focus-visible, .tools-product-link:focus-visible, .tool-footer a:focus-visible, .tools-boundary > a:focus-visible { outline: 3px solid #fff; outline-offset: 3px; }
  @media (max-width: 720px) {
    .tools-shell { width: min(100% - 28px, 1120px); padding-bottom: 48px; }
    .tools-hero { margin: 58px auto 30px; text-align: left; }
    .tools-trust { justify-content: flex-start; }
    .tools-grid { grid-template-columns: 1fr; }
    .tool-card-featured { grid-column: auto; }
    .tool-card { min-height: 0; padding: 22px; }
    .tool-footer { align-items: stretch; flex-direction: column; }
    .tool-footer a { width: 100%; box-sizing: border-box; padding: 13px 15px; }
    .tools-boundary { align-items: flex-start; flex-direction: column; padding: 23px; }
    .tools-boundary > a { width: 100%; }
  }
  .tools-page { background:linear-gradient(160deg,#11151c,#080b10 50%); }
  .tools-hero { margin:54px 0 32px; text-align:left; max-width:780px; }
  .tools-hero h1 { font-size:clamp(32px,4.4vw,56px); line-height:1.12; letter-spacing:-.04em; }
  .tools-intro { margin:20px 0 0; font-size:16px; }
  .tools-trust { justify-content:flex-start; }
  .tools-sections { display:flex; flex-wrap:wrap; gap:10px; padding:20px 0; margin-bottom:16px; border-block:1px solid #283140; }
  .tools-sections a { color:#c8d9f5; padding:10px 16px; text-decoration:none; border:1px solid #344258; border-radius:10px; }
  .tools-sections a:focus-visible { outline:2px solid #96baff; outline-offset:3px; }
  .tool-group { scroll-margin-top:24px; margin-bottom:42px; }
  .tool-group > h2 { font-size:22px; letter-spacing:-.025em; margin:26px 0 16px; }
  .tool-card,.tool-card-featured { grid-column:auto; min-height:220px; padding:24px; border-radius:14px; background:#131924; box-shadow:none; gap:22px; }
  .tool-card h3 { font-size:24px; line-height:1.25; letter-spacing:-.025em; margin:12px 0 0; }
  .tool-card-featured { border-color:#496c9e; }
  @media(max-width:720px) { .tools-hero { margin-top:36px; } .tool-card { min-height:0; padding:20px; } .tool-card h3 { font-size:21px; } }
`

export default function ToolsPage() {
  return (
    <main className="tools-page">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(toolsJsonLd) }}
      />

      <div className="tools-shell">
        <nav className="tools-nav" aria-label="Primary">
          <Link href="/" className="tools-logo">Kineo</Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}><InterfaceLanguageSelect /><Link href="/free-ai-shorts-generator" className="tools-product-link"><UiText es="Crear un Short completo →">Make a finished Short →</UiText></Link></div>
        </nav>

        <header className="tools-hero">
          <p className="tools-kicker"><UiText es="Herramientas gratuitas · sin registro · sin tarjeta">Free tools · no signup · no card</UiText></p>
          <h1><UiText es="Da el siguiente paso para crear tu Short.">Do the next useful thing for your Short.</UiText></h1>
          <p className="tools-intro">
            <UiText es="No empieces con un editor en blanco. Elige lo que ya tienes: un tema, comentario, producto, oferta comercial, objetivo de contenido, meta de ingresos o calendario de producción. Obtén un resultado adaptado a tus datos.">Do not start with a blank editor. Pick what you already have — a topic, comment,
            product, business offer, content goal, revenue target or production schedule — and leave with a made-to-order result.</UiText>
          </p>
          <div className="tools-trust" aria-label="Tool limits">
            <span>{tools.length} <UiText es="herramientas gratuitas">free tools</UiText></span>
            <span><UiText es="A partir de tus datos">Made from your input</UiText></span>
            <span><UiText es="Texto, planificación y estimación de costes">Text, planning and cost estimates</UiText></span>
          </div>
        </header>

        <nav className="tools-sections" aria-label="Tool categories">
          {TOOL_GROUPS.map(group => <a key={group.id} href={`#tools-${group.id}`}><UiLabel>{group.title}</UiLabel></a>)}
        </nav>
        {TOOL_GROUPS.map(group => (
        <section key={group.id} id={`tools-${group.id}`} className="tool-group" aria-labelledby={`tools-${group.id}-heading`}>
          <h2 id={`tools-${group.id}-heading`}><UiLabel>{group.title}</UiLabel></h2>
          <div className="tools-grid">
          {tools.filter(tool => (group.paths as readonly string[]).includes(tool.path)).map((tool) => (
            <article key={tool.path} className={`tool-card${tool.meta.featured ? ' tool-card-featured' : ''}`}>
              <div>
                <p className="tool-eyebrow"><UiText es={TOOL_SPANISH[tool.path]?.eyebrow ?? tool.meta.eyebrow}>{tool.meta.eyebrow}</UiText></p>
                <h3><UiText es={TOOL_SPANISH[tool.path]?.prompt ?? tool.meta.prompt}>{tool.meta.prompt}</UiText></h3>
                <p className="tool-description"><UiText es={TOOL_SPANISH[tool.path]?.what ?? tool.what}>{tool.what}</UiText></p>
              </div>
              <div className="tool-footer">
                <span>
                  <UiText es={tool.output === 'cost_plan' ? 'Sin cuenta · planes actuales de Kineo' : tool.rateLimit ? 'Sin cuenta · límite de uso razonable' : 'Sin cuenta · sin límite en el navegador'}>{tool.output === 'cost_plan'
                    ? 'No account · current Kineo plans'
                    : tool.rateLimit
                      ? 'No account · fair-use limit'
                      : 'No account · unlimited in browser'}</UiText>
                </span>
                <Link href={tool.path}><UiText es={TOOL_SPANISH[tool.path]?.cta ?? tool.meta.cta}>{tool.meta.cta}</UiText> →</Link>
              </div>
            </article>
          ))}
          </div>
        </section>
        ))}

        <section className="tools-boundary" aria-labelledby="finished-video-title">
          <div>
            <p className="tool-eyebrow"><UiText es="Hasta dónde llegan estas herramientas">Where these tools stop</UiText></p>
            <h2 id="finished-video-title"><UiText es="Las herramientas gratuitas ofrecen texto, planificación o una estimación de coste, no un vídeo generado.">The free tools return text, planning or a cost estimate — not a rendered video.</UiText></h2>
            <p>
              <UiText es="Cuando tu idea esté lista, Kineo puede convertirla en un Short vertical completo con voz, imágenes y subtítulos. Ese siguiente paso requiere una cuenta; la prueba gratuita no requiere tarjeta.">When your idea is ready, Kineo can turn it into a finished vertical Short with
              voiceover, visuals and captions. That next step requires an account; the free test
              does not require a card.</UiText>
            </p>
          </div>
          <Link href="/free-ai-shorts-generator"><UiText es="Ver cómo se crea el vídeo completo →">See the finished-video workflow →</UiText></Link>
        </section>
      </div>

      <Footer />

      <style dangerouslySetInnerHTML={{ __html: PAGE_CSS }} />
    </main>
  )
}
