import type { Metadata } from 'next'
import Link from 'next/link'
import Footer from '@/components/Footer'
import { InterfaceLanguageSelect, UiLabel, UiText } from '@/components/InterfaceLanguage'
import { TOOL_SPANISH } from '@/lib/ui/toolSpanish'
import { FREE_TOOL_FACTS, PUBLIC_COST_PLANNER_FACT } from '@/lib/kineoFacts'
import { EDITING_TOOLS } from '@/lib/videoEditing/settings'

const BASE = 'https://www.usekineo.com'
const PUBLIC_TOOL_FACTS = [...FREE_TOOL_FACTS, PUBLIC_COST_PLANNER_FACT]
type PublicToolFact = (typeof PUBLIC_TOOL_FACTS)[number]

export const metadata: Metadata = {
  metadataBase: new URL(BASE),
  title: 'Video Editing & Free Creator Tools | Kineo',
  description:
    `Trim, resize, change speed, mute or add text to your video in your browser. Plus ${PUBLIC_TOOL_FACTS.length} free tools for scripts, hooks, publishing and planning.`,
  alternates: { canonical: `${BASE}/tools` },
  openGraph: {
    title: 'Video Editing & Free Creator Tools',
    description:
      `Five local video editing tools, plus ${PUBLIC_TOOL_FACTS.length} free creator tools. Edit a clip, write a script or plan your next Short.`,
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
    prompt: 'Business Approval Brief',
    cta: 'Build the decision note',
  },
  '/client-video-brief-generator': {
    eyebrow: 'Start with a client request',
    prompt: 'Client Video Brief',
    cta: 'Build the client brief',
    featured: true,
  },
  '/free-script-generator': {
    eyebrow: 'Start with a topic',
    prompt: 'Video Script Generator',
    cta: 'Write my Short script',
    featured: true,
  },
  '/free-hook-generator': {
    eyebrow: 'Start with a topic',
    prompt: 'Hook Generator',
    cta: 'Generate five hooks',
  },
  '/youtube-shorts-title-generator': {
    eyebrow: 'Start with a topic',
    prompt: 'YouTube Title & Description Generator',
    cta: 'Build my publishing kit',
  },
  '/youtube-shorts-script-timer': {
    eyebrow: 'Start with a finished draft',
    prompt: 'Script Duration Calculator',
    cta: 'Time my narration',
  },
  '/viral-score': {
    eyebrow: 'Start with an idea',
    prompt: 'Video Idea Checker',
    cta: 'Score my idea',
  },
  '/comment-to-video': {
    eyebrow: 'Start with your audience',
    prompt: 'Comment-to-Script Generator',
    cta: 'Turn it into a response script',
  },
  '/product-to-video-script': {
    eyebrow: 'Start with verified facts',
    prompt: 'Product Video Script Generator',
    cta: 'Build my product script',
  },
  '/free-ai-shorts/localbusiness': {
    eyebrow: 'Start with a real business offer',
    prompt: 'Local Business Ad Script',
    cta: 'Build my business ad',
  },
  '/business-video-content-plan': {
    eyebrow: 'Start with a business goal',
    prompt: 'Weekly Content Planner',
    cta: 'Plan my business Shorts',
  },
  '/shorts-money-calculator': {
    eyebrow: 'Start with your numbers',
    prompt: 'YouTube Shorts Earnings Calculator',
    cta: 'Calculate Shorts earnings',
  },
  '/cheapest-ai-shorts-maker': {
    eyebrow: 'Start with a publishing schedule',
    prompt: 'Video Cost Calculator',
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
  name: 'Video editing and creator tools by Kineo',
  url: `${BASE}/tools`,
  description: `Five local video editing tools and ${tools.length} free tools for planning, writing, publishing and evaluating YouTube Shorts.`,
  mainEntity: {
    '@type': 'ItemList',
    numberOfItems: EDITING_TOOLS.length + tools.length,
    itemListElement: [...EDITING_TOOLS.map(tool => ({ url: `${BASE}/tools/editor?tool=${tool.id}`, name: tool.name, what: tool.description })), ...tools].map((tool, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      url: tool.url,
      name: tool.name,
      description: tool.what,
    })),
  },
}

// Original planning tools keep their canonical destinations; local editors are an additional group.
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
  .editing-grid { display:grid; grid-template-columns:repeat(5,minmax(0,1fr)); gap:12px; }
  .editing-card { display:flex; flex-direction:column; min-width:0; padding:22px 18px; border:1px solid #354c4b; border-radius:14px; background:linear-gradient(155deg,#192d2c,#121c24); }
  .editing-number { color:#91e6d0; font-size:12px; letter-spacing:.08em; }
  .editing-card h3 { font-size:20px; margin:22px 0 12px; letter-spacing:-.03em; }
  .editing-card p { color:#a8bdbf; font-size:13px; line-height:1.6; flex:1; margin:0 0 20px; }
  .editing-card a { color:#a6f0dc; font-size:13px; font-weight:750; text-decoration:none; min-height:44px; display:flex; align-items:center; }
  .editing-card a:focus-visible { outline:2px solid #a6f0dc; outline-offset:4px; }
  .editing-note { color:#93a6b8; font-size:13px; line-height:1.6; }
  @media(max-width:1000px) { .editing-grid { grid-template-columns:repeat(3,minmax(0,1fr)); } }
  @media(max-width:620px) { .editing-grid { grid-template-columns:1fr; } .editing-card { padding:18px 20px; } .editing-card h3 { margin:12px 0 10px; } .editing-card p { margin-bottom:4px; } }
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
          <p className="tools-kicker"><UiText es="Herramientas de edición y creación">Editing & creator tools</UiText></p>
          <h1><UiText es="Herramientas para editar y crear vídeos">Video Editing & Creator Tools</UiText></h1>
          <p className="tools-intro">
            <UiText es="Recorta, cambia el formato, ajusta la velocidad, silencia o añade texto. Edita un archivo que ya tienes, directamente en tu navegador. Las herramientas de guion y planificación siguen aquí abajo.">Trim, resize, change speed, mute or add text. Edit a file you already have, right in your browser. Your script and planning tools are still here below.</UiText>
          </p>
          <div className="tools-trust" aria-label="Tool limits">
            <span><UiText es="5 herramientas de edición local">5 local editing tools</UiText></span>
            <span><UiText es="Sin subir tu vídeo">No video upload</UiText></span>
            <span><UiText es="Sin créditos de generación para editar">No generation credits to edit</UiText></span>
          </div>
        </header>

        <nav className="tools-sections" aria-label="Tool categories">
          <a href="#tools-edit"><UiText es="Editar vídeo">Edit video</UiText></a>
          {TOOL_GROUPS.map(group => <a key={group.id} href={`#tools-${group.id}`}><UiLabel>{group.title}</UiLabel></a>)}
        </nav>
        <section id="tools-edit" className="tool-group" aria-labelledby="tools-edit-heading">
          <h2 id="tools-edit-heading"><UiText es="Editar un vídeo">Edit your video</UiText></h2>
          <div className="editing-grid">{EDITING_TOOLS.map(tool => <article key={tool.id} className="editing-card"><span className="editing-number" aria-hidden="true">{tool.icon} /</span><h3><UiText es={tool.es}>{tool.name}</UiText></h3><p><UiText es={tool.descriptionEs}>{tool.description}</UiText></p><Link href={`/tools/editor?tool=${tool.id}`}><UiText es={tool.actionEs}>{tool.action}</UiText> ↗</Link></article>)}</div>
          <p className="editing-note"><UiText es="Archivos de hasta 100 MB y 3 minutos. Exportación local en tiempo real, hasta 1280 px en el lado largo. MP4 o WebM según el navegador; no se guardan en Mis vídeos.">Files up to 100 MB and 3 minutes. Local, real-time export up to 1280 px on the long edge. MP4 or WebM depending on your browser; downloads are not saved to My Videos.</UiText></p>
        </section>
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
            <p className="tool-eyebrow"><UiText es="Crear un vídeo nuevo">Create a new video</UiText></p>
            <h2 id="finished-video-title"><UiText es="Edita un vídeo existente aquí. Crea uno nuevo con Kineo.">Edit an existing video here. Create a new one with Kineo.</UiText></h2>
            <p>
              <UiText es="Cuando tu idea esté lista, Kineo puede convertirla en un Short vertical completo con voz, imágenes y subtítulos. Ese siguiente paso requiere una cuenta; la prueba gratuita no requiere tarjeta.">When your idea is ready, Kineo can turn it into a finished vertical Short with
              voiceover, visuals and captions. That next step requires an account; the free test
              does not require a card.</UiText>
            </p>
          </div>
          <Link href="/free-ai-shorts-generator"><UiText es="Crear un vídeo con IA →">Create an AI video →</UiText></Link>
        </section>
      </div>

      <Footer />

      <style dangerouslySetInnerHTML={{ __html: PAGE_CSS }} />
    </main>
  )
}
