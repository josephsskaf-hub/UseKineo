import type { Metadata } from 'next'
import Link from 'next/link'
import Footer from '@/components/Footer'
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
          <Link href="/free-ai-shorts-generator" className="tools-product-link">Make a finished Short →</Link>
        </nav>

        <header className="tools-hero">
          <p className="tools-kicker">Free tools · no signup · no card</p>
          <h1>Do the next useful thing for your Short.</h1>
          <p className="tools-intro">
            Do not start with a blank editor. Pick what you already have — a topic, comment,
            product, business offer, content goal, revenue target or production schedule — and leave with a made-to-order result.
          </p>
          <div className="tools-trust" aria-label="Tool limits">
            <span>{tools.length} free tools</span>
            <span>Made from your input</span>
            <span>Text, planning and cost estimates</span>
          </div>
        </header>

        <section className="tools-grid" aria-label="Free YouTube Shorts tools">
          {tools.map((tool) => (
            <article key={tool.path} className={`tool-card${tool.meta.featured ? ' tool-card-featured' : ''}`}>
              <div>
                <p className="tool-eyebrow">{tool.meta.eyebrow}</p>
                <h2>{tool.meta.prompt}</h2>
                <p className="tool-description">{tool.what}</p>
              </div>
              <div className="tool-footer">
                <span>
                  {tool.output === 'cost_plan'
                    ? 'No account · current Kineo plans'
                    : tool.rateLimit
                      ? 'No account · fair-use limit'
                      : 'No account · unlimited in browser'}
                </span>
                <Link href={tool.path}>{tool.meta.cta} →</Link>
              </div>
            </article>
          ))}
        </section>

        <section className="tools-boundary" aria-labelledby="finished-video-title">
          <div>
            <p className="tool-eyebrow">Where these tools stop</p>
            <h2 id="finished-video-title">The free tools return text, planning or a cost estimate — not a rendered video.</h2>
            <p>
              When your idea is ready, Kineo can turn it into a finished vertical Short with
              voiceover, visuals and captions. That next step requires an account; the free test
              does not require a card.
            </p>
          </div>
          <Link href="/free-ai-shorts-generator">See the finished-video workflow →</Link>
        </section>
      </div>

      <Footer />

      <style dangerouslySetInnerHTML={{ __html: PAGE_CSS }} />
    </main>
  )
}
