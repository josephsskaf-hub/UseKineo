// KINEO-MCP-CLAUDE-2026-09-29 — /claude-connector: a documentação pública do
// conector da Kineo no Claude.
//
// O Connectors Directory do Claude exige uma URL de documentação ("required by
// your publish date"); esta página é ela, e é também a porta de quem quer
// adicionar a Kineo como conector personalizado HOJE, antes da listagem.
// URL ESTÁVEL: o card "KINEO FOR CLAUDE" da home aponta para cá.
//
// KINEO-CLAUDE-CONNECTOR-V2-2026-09-30 (sessão CEO + fundador: "dá uma olhada como eles fazem, faz igual") — a
// MECÂNICA da página MCP da Higgsfield: abas por cliente com "Connect" + URL com Copy (ConnectPanel), e uma grade de
// pedidos prontos com "Try in Claude". O truque deles, copiado: todo pedido termina pedindo ao Claude que, se a Kineo
// ainda não estiver conectada, guie a pessoa a conectar antes de continuar — quem chega sem conector é conduzido
// pelo próprio Claude. O que NÃO se copia é a promessa: a Higgsfield gera mídia dentro do Claude; o nosso conector
// escreve o roteiro e o manda ao Studio (o diretório do Claude recusa conector que gera vídeo). Cada card diz isso, e
// o clipe de cada card é um filme REAL da vitrine, com o selo do motor que o gerou (lib/engineWall CURATED).
//
// KINEO-MCP-PAGINA-2026-09-30 (fundador: "quero deixar o nosso modelo de MCP parecido com esses modelos"; o menu do
// topo ganha "MCP" apontando para cá) — o LAYOUT da Buzzy (mcp.buzzy.now) + Higgsfield: hero centrado com azulejos de
// cliente (glifos próprios, sem logo de terceiros), título "Kineo MCP for any AI", URL do servidor com Copy logo
// abaixo do CTA; abas com ícone e 3 cartões numerados lado a lado (ConnectPanel); galeria de pedidos com chips de
// categoria (PresetFilter). Os 2 pedidos novos (MiniMax H3, Kling 2.5) usam clipes de lib/engineWall CURATED desses
// mesmos motores. Paleta única em ./palette. Guardião: scripts/test-mcp-pagina-2026-09-30.mjs.
//
// Nada digitado que tenha fonte: tools vêm de buildTools() (o mesmo objeto de tools/list), prazo e teto do roteiro
// de lib/gptHandoff, nomes de motor de ENGINE_LABELS. Nenhum preço literal — preço é o que kineo_facts devolve.
//
// KINEO-MCP-STUDIO-AJUSTE-2010 (fundador 20/10: "muito feia" — escura, vídeos velhos, fontes velhas) — CLARA nos tokens da home (./palette),
// tipografia da home (Manrope, peso 600-700, letter-spacing negativo), os vídeos velhos dos cartões de pedido SAEM e entra a
// vitrine de 9 (./ShowcaseGrid: 3 UGC, 3 anúncios de produto, 3 filmes, clipes que o site já serve). O topo diz a verdade de
// hoje: o Kineo Studio está no ar no Claude E no ChatGPT; o herói separa os dois conectores (Kineo MCP não renderiza nem
// cobra; Kineo Studio faz o filme e gasta os créditos da conta).
import type { Metadata } from 'next'
import type { CSSProperties } from 'react'
import Link from 'next/link'
import Footer from '@/components/Footer'
import { PAUSED_ENGINE_KEYS } from '@/lib/engineLaunch'
import { ENGINE_LABELS, HANDOFF_TTL_DAYS, SCRIPT_MAX_CHARS, type HandoffEngine } from '@/lib/gptHandoff'
import { MCP_SERVER_VERSION, buildTools } from '@/lib/mcp/kineoMcp'
import { CLAUDE_CONNECT_ANCHOR, CLAUDE_MCP_SERVER_URL, CLAUDE_START_PROMPT, CLAUDE_STUDIO_CONNECT_ANCHOR, claudePromptHref } from '@/lib/claudeConnect' // KINEO-MCP-STUDIO-AJUSTE-2010: + âncora do Kineo Studio
import ConnectPanel, { CopyField } from './ConnectPanel'
import ClaudePromptLink from './ClaudePromptLink'
import PresetFilter from './PresetFilter'
import StudioSection from './StudioSection' // KINEO-MCP-STUDIO-2010
import ShowcaseGrid from './ShowcaseGrid' // KINEO-MCP-STUDIO-AJUSTE-2010
import { ClientGlyph, type ClientKey } from './ClientGlyphs'
import { MCP_PALETTE as C, MONO } from './palette'
import { CONNECTOR_GUIDES } from '@/lib/seo/connectorGuides' // KINEO-PAGINAS-CONECTOR-2110

export const dynamic = 'force-static'

const BASE = 'https://www.usekineo.com'
// KINEO-CLAUDE-1CLIQUE-2026-09-30 — URL do servidor, modal de conector, chat novo e o fecho "If Kineo is not
// connected…" vêm da fonte única lib/claudeConnect.ts (card da home, painel e página usam os mesmos).
const SERVER_URL = CLAUDE_MCP_SERVER_URL
const PRICING_HREF = '/pricing?utm_source=claude_connector'

export const metadata: Metadata = {
  metadataBase: new URL(BASE),
  title: 'Kineo MCP — connect Kineo to Claude, Claude Code and Cursor | Kineo',
  description:
    'Connect the Kineo MCP server to Claude, Claude Code, Cursor or any MCP client: your assistant writes the script and sends it to Kineo Studio as a one-click link, and answers from live Kineo plans and engines.',
  alternates: { canonical: `${BASE}/claude-connector` },
  openGraph: {
    title: 'Kineo MCP for any AI',
    description: 'Write the script with Claude, send it to Kineo Studio in one click. Nothing renders until you press Generate.',
    url: `${BASE}/claude-connector`,
    type: 'website',
  },
}

const CARD: CSSProperties = { background: C.card, border: `1px solid ${C.line}`, borderRadius: 18, padding: '18px 20px', boxShadow: C.shadow }

/** Azulejos do hero (molde Buzzy): onde a Kineo funciona. KINEO-MCP-STUDIO-AJUSTE-2010: ChatGPT no ar (Kineo Studio por Developer mode). */
const HERO_CLIENTS: readonly { key: ClientKey; label: string; soon?: true }[] = [
  { key: 'claude', label: 'Claude' },
  { key: 'claude_code', label: 'Claude Code' },
  { key: 'cursor', label: 'Cursor' },
  { key: 'other', label: 'Any MCP client' },
  { key: 'chatgpt', label: 'ChatGPT' },
]

/** Chips da galeria (molde Higgsfield). */
const PRESET_CATEGORIES = [
  { key: 'shorts', label: 'Shorts' },
  { key: 'ads', label: 'Ads' },
  { key: 'clips', label: 'Clips' },
  { key: 'plans', label: 'Plans' },
] as const
type PresetCategory = (typeof PRESET_CATEGORIES)[number]['key']

// KINEO-OPEN-IN-CLAUDE-2026-09-30 — pedidos prontos (claude.ai/new?q=…; deslogado, o login devolve para o mesmo
// pedido via returnTo). Todo pedido começa com "Using the Kineo connector" e pede roteiro + envio ao Studio (ou
// fatos) — nenhum promete que o vídeo sai dentro do Claude. `clip` = filme real da vitrine (public/previews), com o
// motor que o gerou; o texto do card diz que é uma amostra.
// KINEO-MCP-PAGINA-2026-09-30 — +2 pedidos (mystery, history) com clipes de lib/engineWall CURATED: 04189a48 está em
// cinematic_h3 (MiniMax H3) e c4e4fbab em cinematic_kling (Kling 2.5); o pedido nomeia o mesmo motor do selo.
const PRESETS: readonly {
  id: 'clip' | 'film' | 'ad' | 'plans' | 'mystery' | 'history'
  cat: PresetCategory
  title: string
  line: string
  engine: HandoffEngine | null
  learnMore: string
  prompt: string
}[] = [
  {
    id: 'clip',
    cat: 'clips',
    title: 'Clip from an idea',
    line: 'One sentence becomes a 15-second clip script, saved to Kineo Studio.',
    engine: 'seedance',
    learnMore: '/ai-video-generator/seedance',
    prompt: 'Using the Kineo connector, turn this idea into a 15-second narration script and send it to Kineo Studio: a giant wave rolling in from the open sea.',
  },
  {
    id: 'film',
    cat: 'shorts',
    title: 'Narrated 35-second film',
    line: 'From one line to a narrated Short with a hook, a build and a twist.',
    engine: 'hollywood',
    learnMore: '/ai-video-generator/kling-3',
    prompt: 'Using the Kineo connector, write a 35-second narrated YouTube Short from this one line and send it to Kineo Studio: the lake where lightning almost never stops.',
  },
  {
    id: 'ad',
    cat: 'ads',
    title: 'Product ad in 3 variations',
    line: 'Three angles on the same offer, each saved as its own Studio link.',
    engine: 'veo',
    learnMore: '/ads',
    prompt: 'Using the Kineo connector, write 3 variations of a 15-second ad script for my product and send each one to Kineo Studio. My product is: [describe your product].',
  },
  {
    id: 'mystery',
    cat: 'shorts',
    title: '60-second mystery Short',
    line: 'A full mystery story sized for 60 seconds, with the engine already set.',
    engine: 'h3',
    learnMore: '/ai-video-generator/minimax-h3',
    prompt: 'Using the Kineo connector, write a 60-second mystery YouTube Short script about a ship that vanished in a storm, set the engine to MiniMax H3 and send it to Kineo Studio.',
  },
  {
    id: 'history',
    cat: 'shorts',
    title: 'History in 35 seconds',
    line: 'One moment from history told as a Short, ready to open in Studio.',
    engine: 'kling',
    learnMore: '/ai-video-generator/kling',
    prompt: 'Using the Kineo connector, write a 35-second history YouTube Short script about a lost Roman treasure, set the engine to Kling 2.5 and send it to Kineo Studio.',
  },
  {
    id: 'plans',
    cat: 'plans',
    title: 'Kineo plans & prices',
    line: 'Live plans, free trial and credits per engine, straight from Kineo.',
    engine: null,
    learnMore: '/pricing',
    prompt: 'Using the Kineo connector, explain Kineo\'s plans, prices and free trial, and tell me which plan covers four 60-second films a month.',
  },
]

export default function ClaudeConnectorPage() {
  const tools = buildTools({ pausedEngines: PAUSED_ENGINE_KEYS })
  const h2: CSSProperties = { fontSize: 'clamp(1.5rem, 3.6vw, 2.2rem)', fontWeight: 650, letterSpacing: '-0.024em', lineHeight: 1.12, margin: '80px 0 12px', color: C.text }
  const h2Center: CSSProperties = { ...h2, textAlign: 'center' }
  const p: CSSProperties = { fontSize: '1rem', color: C.body, lineHeight: 1.7, margin: '0 0 14px' }
  const small: CSSProperties = { fontSize: '0.9rem', color: C.muted, lineHeight: 1.6, margin: '0 0 14px' }
  const link: CSSProperties = { color: C.accent, textDecoration: 'none' }
  const kicker: CSSProperties = { fontSize: 12, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: C.muted, margin: 0 }
  const chip: CSSProperties = {
    display: 'inline-block',
    fontSize: 11,
    fontWeight: 800,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    borderRadius: 999,
    padding: '4px 10px',
    marginLeft: 8,
    verticalAlign: 'middle',
  }
  const pill: CSSProperties = { display: 'inline-block', borderRadius: 999, padding: '12px 22px', fontWeight: 750, fontSize: '0.98rem', textDecoration: 'none', minHeight: 44 }
  const livePill: CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 8, borderRadius: 999, padding: '7px 14px', fontWeight: 700, fontSize: '0.9rem', color: C.text, background: C.card, border: `1px solid ${C.line}`, boxShadow: C.shadow }
  const liveDot: CSSProperties = { width: 8, height: 8, borderRadius: 999, background: C.ok, boxShadow: `0 0 0 3px ${C.okSoft}` }

  return (
    <main style={{ minHeight: '100vh', background: C.bg, color: C.text, fontFamily: 'var(--font-sans), Arial, sans-serif', overflowX: 'hidden' }}>
      <div style={{ background: C.heroGlow }}>
        <div style={{ maxWidth: 1120, margin: '0 auto', padding: '40px 16px 0' }}>
          <nav aria-label="Breadcrumb" style={{ margin: '0 0 36px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
            <span>
              <Link href="/" style={{ color: C.muted, textDecoration: 'none', fontSize: '0.85rem' }}>Home</Link>
              <span style={{ color: C.muted, fontSize: '0.85rem' }}> / </span>
              <span style={{ color: C.body, fontSize: '0.85rem' }}>Kineo MCP</span>
            </span>
            <Link href={PRICING_HREF} style={{ color: C.muted, fontSize: '0.9rem', textDecoration: 'none' }}>See plans →</Link>
          </nav>

          {/* Hero centrado (molde Buzzy): azulejos de cliente → título → subtítulo honesto → CTA → URL com Copy. */}
          <section style={{ textAlign: 'center', maxWidth: 860, margin: '0 auto' }}>
            <ul aria-label="Works with" style={{ listStyle: 'none', margin: '0 0 30px', padding: 0, display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 'clamp(8px, 2.5vw, 18px)' }}>
              {HERO_CLIENTS.map((c) => (
                <li key={c.key} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, width: 'clamp(58px, 16vw, 76px)' }}>
                  <span style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', width: 'clamp(50px, 13vw, 56px)', height: 'clamp(50px, 13vw, 56px)', borderRadius: 16, background: C.card, border: `1px solid ${C.line}`, boxShadow: C.shadow }}>
                    <ClientGlyph kind={c.key} size={26} />
                  </span>
                  <span style={{ fontSize: 11.5, color: C.muted, lineHeight: 1.25 }}>
                    {c.label}
                  </span>
                </li>
              ))}
            </ul>
            <p style={kicker}>MCP server · v{MCP_SERVER_VERSION}</p>
            <h1 style={{ fontSize: 'clamp(2.4rem, 7vw, 4.6rem)', fontWeight: 600, lineHeight: 1.02, letterSpacing: '-0.035em', margin: '12px 0 0', textWrap: 'balance' }}>
              Kineo MCP for any AI
            </h1>
            <div aria-label="Live now" style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 10, margin: '20px 0 0' }}>
              <span style={livePill}><span aria-hidden style={liveDot} />Live in Claude</span>
              <span style={livePill}><span aria-hidden style={liveDot} />Live in ChatGPT</span>
            </div>
            <p style={{ fontSize: 'clamp(1rem, 2.4vw, 1.12rem)', color: C.body, lineHeight: 1.65, margin: '20px auto 0', maxWidth: 720 }}>
              <strong>Kineo MCP</strong> writes your script and sends it to Studio as a one-click link — it never renders, creates an
              account or charges. <strong>Kineo Studio</strong> (<a href={`#${CLAUDE_STUDIO_CONNECT_ANCHOR}`} style={{ color: C.accent, textDecoration: 'none', fontWeight: 700 }}>below</a>) makes the film in your Kineo account, using your credits.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 10, margin: '26px 0 0' }}>
              <a href={`#${CLAUDE_CONNECT_ANCHOR}`} style={{ ...pill, background: C.accent, color: C.onAccent }}>Connect Kineo →</a>
              <a href="#presets" style={{ ...pill, color: C.text, border: `1px solid ${C.line}`, background: C.card }}>Browse presets</a>
            </div>
            <div style={{ maxWidth: 520, margin: '22px auto 0' }}>
              <p style={{ ...small, margin: 0, fontSize: '0.8rem', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Server URL</p>
              <CopyField value={SERVER_URL} label="Kineo MCP server URL" />
            </div>
          </section>
        </div>
      </div>

      <div style={{ maxWidth: 1120, margin: '0 auto', padding: '56px 16px 88px' }}>
        <section aria-label="Made with Kineo" style={{ margin: '0 0 72px' }}>
          <h2 style={{ ...h2Center, margin: '0 0 8px' }}>Made with Kineo</h2>
          <p style={{ ...small, textAlign: 'center', margin: '0 auto 26px', maxWidth: 600 }}>UGC ads, product ads and narrated films — real videos made in Kineo.</p>
          <ShowcaseGrid />
        </section>
        <h2 style={{ ...h2Center, margin: '0 0 8px' }}>Connect in three steps</h2>
        <p style={{ ...small, textAlign: 'center', margin: '0 auto 22px', maxWidth: 560 }}>Pick where you use AI. No sign-in to Kineo is needed to connect.</p>
        <ConnectPanel serverUrl={SERVER_URL} startHref={claudePromptHref(CLAUDE_START_PROMPT)} />

        <section id="presets" style={{ scrollMarginTop: 24 }}>
          <h2 style={h2}>Try it in Claude</h2>
          <p style={{ ...p, maxWidth: 760 }}>
            Each &ldquo;Try in Claude&rdquo; opens a new Claude chat with the request already typed in. Review it and press
            send. Claude uses Kineo only if the connector is added and turned on in that chat; every request ends by
            asking Claude to help you connect Kineo first if it is not.
          </p>
          <PresetFilter categories={PRESET_CATEGORIES}>
            {PRESETS.map((pr) => (
              <div key={pr.title} data-cat={pr.cat} style={{ ...CARD, padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <div style={{ padding: '18px 18px 18px', display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
                  <p style={{ margin: 0, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.accent, background: C.accentSoft, borderRadius: 999, padding: '3px 9px' }}>{PRESET_CATEGORIES.find((c) => c.key === pr.cat)?.label}</span>
                    {pr.engine && <span style={{ fontSize: 11, fontWeight: 700, color: C.muted, border: `1px solid ${C.line}`, borderRadius: 999, padding: '3px 9px' }}>Engine set · {ENGINE_LABELS[pr.engine]}</span>}
                  </p>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: '1.08rem', letterSpacing: '-0.01em' }}>{pr.title}</p>
                  <p style={{ ...small, margin: 0, flex: 1 }}>{pr.line}</p>
                  <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap', marginTop: 4 }}>
                    <ClaudePromptLink href={claudePromptHref(pr.prompt)} preset={pr.id} title={pr.prompt} style={{ background: C.accent, color: C.onAccent, borderRadius: 999, padding: '9px 16px', fontSize: '0.92rem', fontWeight: 800, textDecoration: 'none' }}>
                      Try in Claude ↗
                    </ClaudePromptLink>
                    <Link href={pr.learnMore} style={{ ...link, fontSize: '0.9rem', fontWeight: 700 }}>Learn more</Link>
                  </div>
                </div>
              </div>
            ))}
          </PresetFilter>
        </section>

        <h2 style={h2}>The tools</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 420px), 1fr))', gap: 14 }}>
          {tools.map((t) => (
            <div key={t.name} style={CARD}>
              <p style={{ margin: '0 0 6px', fontWeight: 800, fontSize: '1.05rem' }}>
                {t.title}
                <span
                  style={{
                    ...chip,
                    color: t.annotations.readOnlyHint ? C.ok : C.accent,
                    border: `1px solid ${t.annotations.readOnlyHint ? C.okLine : C.accentLine}`,
                  }}
                >
                  {t.annotations.readOnlyHint ? 'Read only' : 'Saves a script · not destructive'}
                </span>
              </p>
              <p style={{ ...small, margin: '0 0 8px', fontFamily: MONO }}>{t.name}</p>
              <p style={{ ...p, margin: 0, fontSize: '0.95rem' }}>{t.description}</p>
            </div>
          ))}
        </div>

        <StudioSection /> {/* KINEO-MCP-STUDIO-2010 */}
        <section aria-label="Kineo Studio setup guides" style={{ ...CARD, marginTop: 32 }}><h2 style={{ ...h2, margin: '0 0 12px' }}>Kineo Studio connection guides · Guias de conexão</h2><ul style={{ margin: 0, paddingLeft: 20, display: 'grid', gap: 12 }}>{CONNECTOR_GUIDES.map((guide) => <li key={guide.path}><Link href={guide.path} hrefLang={guide.lang} lang={guide.lang} style={link}>{guide.title} →</Link></li>)}</ul></section> {/* KINEO-PAGINAS-CONECTOR-2110 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))', gap: '0 32px' }}>
          <section>
            <h2 style={h2}>What happens after the link</h2>
            <p style={p}>
              The link shows the saved script. People without a Kineo account sign up first and come straight back to it;
              then Studio opens pre-filled and waits. Creating the video is a separate step the person takes in their own
              Kineo account, under that account&apos;s plan and credits. The link works for {HANDOFF_TTL_DAYS} days, and
              scripts can be up to {SCRIPT_MAX_CHARS.toLocaleString('en-US')} characters. Current prices are on the{' '}
              <Link href={PRICING_HREF} style={link}>pricing page</Link> and in the kineo_facts tool.
            </p>
          </section>
          <section>
            <h2 style={h2}>Data handling</h2>
            <p style={p}>
              kineo_facts stores nothing. create_video_handoff stores only what it receives — the script, length, frame,
              engine, language and optional title — plus a one-way hash of the calling IP address and the user agent, used
              for rate limiting. It does not receive or store your Claude conversation, memory or files. Details in the{' '}
              <Link href="/privacy" style={link}>privacy policy</Link>.
            </p>
          </section>
        </div>

        <h2 style={h2}>Support</h2>
        <p style={p}>
          Questions or problems: <a href="mailto:support@usekineo.com" style={link}>support@usekineo.com</a>. Server
          version {MCP_SERVER_VERSION}. Prefer to paste instead? <Link href="/chatgpt" style={link}>The paste page</Link>{' '}
          does the same handoff from any assistant.
        </p>
      </div>
      <Footer />
    </main>
  )
}
