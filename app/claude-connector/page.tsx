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
// Nada digitado que tenha fonte: tools vêm de buildTools() (o mesmo objeto de tools/list), prazo e teto do roteiro
// de lib/gptHandoff, nomes de motor de ENGINE_LABELS. Nenhum preço literal — preço é o que kineo_facts devolve.
import type { Metadata } from 'next'
import type { CSSProperties } from 'react'
import Link from 'next/link'
import Footer from '@/components/Footer'
import { PAUSED_ENGINE_KEYS } from '@/lib/engineLaunch'
import { ENGINE_LABELS, HANDOFF_TTL_DAYS, SCRIPT_MAX_CHARS, type HandoffEngine } from '@/lib/gptHandoff'
import { MCP_SERVER_VERSION, buildTools } from '@/lib/mcp/kineoMcp'
import { CLAUDE_MCP_SERVER_URL, CLAUDE_START_PROMPT, claudePromptHref } from '@/lib/claudeConnect'
import ConnectPanel from './ConnectPanel'
import ClaudePromptLink from './ClaudePromptLink'

export const dynamic = 'force-static'

const BASE = 'https://www.usekineo.com'
// KINEO-CLAUDE-1CLIQUE-2026-09-30 — URL do servidor, modal de conector, chat novo e o fecho "If Kineo is not
// connected…" vêm da fonte única lib/claudeConnect.ts (card da home, painel e página usam os mesmos).
const SERVER_URL = CLAUDE_MCP_SERVER_URL
const PRICING_HREF = '/pricing?utm_source=claude_connector'

export const metadata: Metadata = {
  metadataBase: new URL(BASE),
  title: 'Kineo for Claude — connect the Kineo MCP server | Kineo',
  description:
    'Connect Kineo to Claude, Claude Code or any MCP client: Claude writes the script and sends it to Kineo Studio as a one-click link, and answers from live Kineo plans and engines.',
  alternates: { canonical: `${BASE}/claude-connector` },
  openGraph: {
    title: 'Kineo for Claude',
    description: 'Write the script with Claude, send it to Kineo Studio in one click. Nothing renders until you press Generate.',
    url: `${BASE}/claude-connector`,
    type: 'website',
  },
}

const ACCENT = '#2997ff'
const MUTED = '#86868b'
const CARD: CSSProperties = { background: '#161618', border: '1px solid #2a2a2d', borderRadius: 14, padding: '18px 20px' }

// KINEO-OPEN-IN-CLAUDE-2026-09-30 — pedidos prontos (claude.ai/new?q=…; deslogado, o login devolve para o mesmo
// pedido via returnTo). Todo pedido começa com "Using the Kineo connector" e pede roteiro + envio ao Studio (ou
// fatos) — nenhum promete que o vídeo sai dentro do Claude. `clip` = filme real da vitrine (public/previews), com o
// motor que o gerou; o texto do card diz que é uma amostra.
const PRESETS: readonly {
  id: 'clip' | 'film' | 'ad' | 'plans'
  title: string
  line: string
  clip: string | null
  engine: HandoffEngine | null
  learnMore: string
  prompt: string
}[] = [
  {
    id: 'clip',
    title: 'Clip from an idea',
    line: 'One sentence becomes a 15-second clip script, saved to Kineo Studio.',
    clip: '75728dfb-3b29-47fa-aea8-b806d549a2b9',
    engine: 'seedance',
    learnMore: '/ai-video-generator/seedance',
    prompt: 'Using the Kineo connector, turn this idea into a 15-second narration script and send it to Kineo Studio: a giant wave rolling in from the open sea.',
  },
  {
    id: 'film',
    title: 'Narrated 35-second film',
    line: 'From one line to a narrated Short with a hook, a build and a twist.',
    clip: '4b12925e-16e6-4b56-af5a-7047f9ae7a28',
    engine: 'hollywood',
    learnMore: '/ai-video-generator/kling-3',
    prompt: 'Using the Kineo connector, write a 35-second narrated YouTube Short from this one line and send it to Kineo Studio: the lake where lightning almost never stops.',
  },
  {
    id: 'ad',
    title: 'Product ad in 3 variations',
    line: 'Three angles on the same offer, each saved as its own Studio link.',
    clip: '9bbd5d98-33e5-423f-b9cb-82f7af6c67ba',
    engine: 'veo',
    learnMore: '/ads',
    prompt: 'Using the Kineo connector, write 3 variations of a 15-second ad script for my product and send each one to Kineo Studio. My product is: [describe your product].',
  },
  {
    id: 'plans',
    title: 'Kineo plans & prices',
    line: 'Live plans, free trial and credits per engine, straight from Kineo.',
    clip: null,
    engine: null,
    learnMore: '/pricing',
    prompt: 'Using the Kineo connector, explain Kineo\'s plans, prices and free trial, and tell me which plan covers four 60-second films a month.',
  },
]

export default function ClaudeConnectorPage() {
  const tools = buildTools({ pausedEngines: PAUSED_ENGINE_KEYS })
  const h2: CSSProperties = { fontSize: 'clamp(1.35rem, 3.5vw, 1.8rem)', fontWeight: 800, margin: '52px 0 12px' }
  const p: CSSProperties = { fontSize: '1rem', color: '#d2d2d7', lineHeight: 1.7, margin: '0 0 14px' }
  const small: CSSProperties = { fontSize: '0.9rem', color: MUTED, lineHeight: 1.6, margin: '0 0 14px' }
  const link: CSSProperties = { color: ACCENT, textDecoration: 'none' }
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

  return (
    <main style={{ minHeight: '100vh', background: '#000', color: '#f5f5f7', fontFamily: 'var(--font-sans), Arial, sans-serif' }}>
      <div style={{ maxWidth: 1080, margin: '0 auto', padding: '56px 16px 88px' }}>
        <nav aria-label="Breadcrumb" style={{ margin: '0 0 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
          <span>
            <Link href="/" style={{ color: MUTED, textDecoration: 'none', fontSize: '0.85rem' }}>Home</Link>
            <span style={{ color: MUTED, fontSize: '0.85rem' }}> / </span>
            <span style={{ color: '#d2d2d7', fontSize: '0.85rem' }}>Kineo for Claude</span>
          </span>
          <Link href={PRICING_HREF} style={{ color: MUTED, fontSize: '0.9rem', textDecoration: 'none' }}>See plans →</Link>
        </nav>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 420px), 1fr))', gap: 28, alignItems: 'start' }}>
          <div>
            <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3rem)', fontWeight: 900, lineHeight: 1.08, margin: '8px 0 0' }}>
              Write it in Claude. Make it in Kineo.
            </h1>
            <p style={{ fontSize: '1.08rem', color: '#d2d2d7', lineHeight: 1.65, margin: '16px 0 0' }}>
              Connect Kineo and Claude can read Kineo&apos;s live plans and engines, write your script, and send it to
              Kineo Studio as a one-click link with the length, frame and engine already set. The connector never
              renders a video, never creates an account and never charges anything — you press Generate in Studio.
            </p>
          </div>
          <ConnectPanel serverUrl={SERVER_URL} startHref={claudePromptHref(CLAUDE_START_PROMPT)} accent={ACCENT} muted={MUTED} />
        </div>

        <h2 style={h2}>Try it in Claude</h2>
        <p style={p}>
          Each &ldquo;Try in Claude&rdquo; opens a new Claude chat with the request already typed in. Review it and press
          send. Claude uses Kineo only if the connector is added and turned on in that chat; every request ends by
          asking Claude to help you connect Kineo first if it is not.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 240px), 1fr))', gap: 16 }}>
          {PRESETS.map((pr) => (
            <div key={pr.title} style={{ ...CARD, padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              <div style={{ position: 'relative', aspectRatio: '16 / 10', background: 'linear-gradient(135deg, #0b1a2e, #12324f 55%, #2997ff)' }}>
                {pr.clip ? (
                  <video
                    src={`/previews/${pr.clip}.mp4`}
                    autoPlay
                    muted
                    loop
                    playsInline
                    preload="metadata"
                    aria-label={`Sample film made with Kineo on ${pr.engine ? ENGINE_LABELS[pr.engine] : 'Kineo'}`}
                    style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '1.4rem', letterSpacing: '-0.01em' }}>
                    Plans · Trial · Credits
                  </div>
                )}
                {pr.engine && (
                  <span style={{ position: 'absolute', left: 10, bottom: 10, background: 'rgba(0,0,0,0.62)', color: '#f5f5f7', borderRadius: 999, padding: '4px 10px', fontSize: 11, fontWeight: 700 }}>
                    Sample made with Kineo · {ENGINE_LABELS[pr.engine]}
                  </span>
                )}
              </div>
              <div style={{ padding: '14px 16px 16px', display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
                <p style={{ margin: 0, fontWeight: 800, fontSize: '1.05rem' }}>{pr.title}</p>
                <p style={{ ...small, margin: 0, flex: 1 }}>{pr.line}</p>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginTop: 4 }}>
                  <ClaudePromptLink href={claudePromptHref(pr.prompt)} preset={pr.id} title={pr.prompt} style={{ background: ACCENT, color: '#fff', borderRadius: 999, padding: '9px 16px', fontSize: '0.92rem', fontWeight: 800, textDecoration: 'none' }}>
                    Try in Claude ↗
                  </ClaudePromptLink>
                  <Link href={pr.learnMore} style={{ ...link, fontSize: '0.9rem', fontWeight: 700 }}>Learn more</Link>
                </div>
              </div>
            </div>
          ))}
        </div>

        <h2 style={h2}>The tools</h2>
        {tools.map((t) => (
          <div key={t.name} style={{ ...CARD, marginBottom: 14 }}>
            <p style={{ margin: '0 0 6px', fontWeight: 800, fontSize: '1.05rem' }}>
              {t.title}
              <span
                style={{
                  ...chip,
                  color: t.annotations.readOnlyHint ? '#30d158' : ACCENT,
                  border: `1px solid ${t.annotations.readOnlyHint ? 'rgba(48,209,88,0.4)' : 'rgba(41,151,255,0.4)'}`,
                }}
              >
                {t.annotations.readOnlyHint ? 'Read only' : 'Saves a script · not destructive'}
              </span>
            </p>
            <p style={{ ...small, margin: '0 0 8px', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}>{t.name}</p>
            <p style={{ ...p, margin: 0, fontSize: '0.95rem' }}>{t.description}</p>
          </div>
        ))}

        <h2 style={h2}>What happens after the link</h2>
        <p style={p}>
          The link shows the saved script. People without a Kineo account sign up first and come straight back to it;
          then Studio opens pre-filled and waits. Creating the video is a separate step the person takes in their own
          Kineo account, under that account&apos;s plan and credits. The link works for {HANDOFF_TTL_DAYS} days, and
          scripts can be up to {SCRIPT_MAX_CHARS.toLocaleString('en-US')} characters. Current prices are on the{' '}
          <Link href={PRICING_HREF} style={link}>pricing page</Link> and in the kineo_facts tool.
        </p>

        <h2 style={h2}>Data handling</h2>
        <p style={p}>
          kineo_facts stores nothing. create_video_handoff stores only what it receives — the script, length, frame,
          engine, language and optional title — plus a one-way hash of the calling IP address and the user agent, used
          for rate limiting. It does not receive or store your Claude conversation, memory or files. Details in the{' '}
          <Link href="/privacy" style={link}>privacy policy</Link>.
        </p>

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
