// KINEO-MCP-CLAUDE-2026-09-29 — /claude-connector: a documentação pública do
// conector da Kineo no Claude.
//
// O Connectors Directory do Claude exige uma URL de documentação ("required by
// your publish date"); esta página é ela, e é também a porta de quem quer
// adicionar a Kineo como conector personalizado HOJE, antes da listagem.
//
// Nada digitado que tenha fonte: nome, título, descrição e anotações de cada
// tool vêm de buildTools() (lib/mcp/kineoMcp.ts), o mesmo objeto que o
// servidor devolve em tools/list; prazo e teto do roteiro vêm de
// lib/gptHandoff. Nenhum preço literal — preço é o que kineo_facts devolve.
// Molde visual: app/chatgpt/page.tsx (sem CSS novo).
import type { Metadata } from 'next'
import type { CSSProperties } from 'react'
import Link from 'next/link'
import Footer from '@/components/Footer'
import { PAUSED_ENGINE_KEYS } from '@/lib/engineLaunch'
import { HANDOFF_TTL_DAYS, SCRIPT_MAX_CHARS } from '@/lib/gptHandoff'
import { MCP_SERVER_VERSION, buildTools } from '@/lib/mcp/kineoMcp'

export const dynamic = 'force-static'

const BASE = 'https://www.usekineo.com'
const SERVER_URL = `${BASE}/api/mcp`
const PRICING_HREF = '/pricing?utm_source=claude_connector'

export const metadata: Metadata = {
  metadataBase: new URL(BASE),
  title: 'Kineo connector for Claude — MCP server setup and tools | Kineo',
  description:
    'Add Kineo to Claude as a connector: check Kineo plans and engines, and send an approved script to Kineo Studio as a one-click link. Setup, tools, data handling and support.',
  alternates: { canonical: `${BASE}/claude-connector` },
  openGraph: {
    title: 'Kineo connector for Claude',
    description: 'Write the script with Claude, send it to Kineo Studio in one click. Nothing renders until you press create.',
    url: `${BASE}/claude-connector`,
    type: 'website',
  },
}

const ACCENT = '#2997ff'
const MUTED = '#86868b'
const CARD: CSSProperties = { background: '#161618', border: '1px solid #2a2a2d', borderRadius: 14, padding: '18px 20px' }

// KINEO-OPEN-IN-CLAUDE-2026-09-30 (sessão CEO, fundador aprovou) — pedidos prontos que abrem um chat novo no
// claude.ai já com o texto na caixa (claude.ai/new?q=…; deslogado, o login devolve para o mesmo pedido via
// returnTo). Cada pedido diz o que a Kineo FAZ: o Claude escreve o roteiro e o conector o manda ao Studio — nenhum
// promete que o vídeo sai dentro do Claude. A primeira entrada é o botão principal.
const TRY_IN_CLAUDE: readonly { label: string; prompt: string }[] = [
  {
    label: '15-second clip: a lightning storm over the sea',
    prompt: 'Using the Kineo connector, write a 15-second narration script about a lightning storm over the sea, then send it to Kineo Studio.',
  },
  {
    label: 'A product ad in 3 variations',
    prompt: 'Using the Kineo connector, write 3 variations of a 15-second ad script for my product and send each one to Kineo Studio. My product is: ',
  },
  {
    label: 'A 35-second narrated film',
    prompt: 'Using the Kineo connector, write a 35-second narrated YouTube Short about why octopuses have three hearts, then send it to Kineo Studio.',
  },
  {
    label: 'Which Kineo plan fits me?',
    prompt: 'Using the Kineo connector, tell me which Kineo plan covers four 60-second Seedance films a month.',
  },
]
const CLAUDE_NEW_CHAT = 'https://claude.ai/new?q='
const openInClaude = (prompt: string) => CLAUDE_NEW_CHAT + encodeURIComponent(prompt)

export default function ClaudeConnectorPage() {
  const tools = buildTools({ pausedEngines: PAUSED_ENGINE_KEYS })
  const h2: CSSProperties = { fontSize: 'clamp(1.35rem, 3.5vw, 1.8rem)', fontWeight: 800, margin: '46px 0 12px' }
  const p: CSSProperties = { fontSize: '1rem', color: '#d2d2d7', lineHeight: 1.7, margin: '0 0 14px' }
  const small: CSSProperties = { fontSize: '0.9rem', color: MUTED, lineHeight: 1.6, margin: '0 0 14px' }
  const link: CSSProperties = { color: ACCENT, textDecoration: 'none' }
  const code: CSSProperties = {
    display: 'block',
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
    fontSize: '1rem',
    color: '#f5f5f7',
    background: '#0b0b0c',
    border: '1px solid #2a2a2d',
    borderRadius: 10,
    padding: '12px 14px',
    overflowWrap: 'anywhere',
  }
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
      <div style={{ maxWidth: 860, margin: '0 auto', padding: '64px 16px 88px' }}>
        <nav aria-label="Breadcrumb" style={{ margin: '0 0 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
          <span>
            <Link href="/" style={{ color: MUTED, textDecoration: 'none', fontSize: '0.85rem' }}>Home</Link>
            <span style={{ color: MUTED, fontSize: '0.85rem' }}> / </span>
            <span style={{ color: '#d2d2d7', fontSize: '0.85rem' }}>Kineo connector for Claude</span>
          </span>
          <Link href={PRICING_HREF} style={{ color: MUTED, fontSize: '0.9rem', textDecoration: 'none' }}>See plans →</Link>
        </nav>

        <h1 style={{ fontSize: 'clamp(2rem, 5vw, 2.9rem)', fontWeight: 900, lineHeight: 1.1, margin: '18px 0 0' }}>
          Write the script with Claude. Open it in Kineo Studio with one click.
        </h1>
        <p style={{ fontSize: '1.08rem', color: '#d2d2d7', lineHeight: 1.65, margin: '16px 0 0', maxWidth: 780 }}>
          The Kineo connector gives Claude two tools: one reads Kineo&apos;s current plans, trial and video engines, and
          one saves the script you approved and returns a link that opens Kineo Studio with the script, length, frame
          and engine already filled in. The connector never renders a video, never creates an account and never charges
          anything — you decide in Studio.
        </p>

        <h2 style={h2}>Add it to Claude</h2>
        <div style={CARD}>
          <p style={{ ...small, margin: '0 0 8px' }}>Remote MCP server URL (Streamable HTTP, no sign-in):</p>
          <code style={code}>{SERVER_URL}</code>
        </div>
        <ol style={{ ...p, paddingLeft: 22, marginTop: 16, listStyle: 'decimal' }}>
          <li>In Claude (web or desktop), open <strong>Settings → Connectors</strong>.</li>
          <li>Choose <strong>Add custom connector</strong>, name it <strong>Kineo</strong> and paste the URL above. Leave the authentication fields empty — the connector does not use a login.</li>
          <li>In a chat, enable Kineo from the tools menu and ask for a script. When you approve it, ask Claude to send it to Kineo.</li>
        </ol>
        <p style={small}>
          Works on any Claude plan that supports custom connectors, and in other clients that speak MCP over Streamable
          HTTP. Use the <code>www</code> address exactly as shown.
        </p>

        <h2 style={h2}>Try it in Claude</h2>
        <p style={p}>
          Each button opens a new Claude chat with the request already typed in. Review it and press send. Claude uses
          Kineo only if you have added the connector with the steps above and turned it on in that chat; otherwise it
          answers without Kineo.
        </p>
        <a href={openInClaude(TRY_IN_CLAUDE[0].prompt)} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-block', background: ACCENT, color: '#fff', fontWeight: 800, fontSize: '1rem', borderRadius: 999, padding: '12px 22px', textDecoration: 'none' }}>
          Open in Claude →
        </a>
        <p style={{ ...small, margin: '8px 0 18px' }}>&ldquo;{TRY_IN_CLAUDE[0].prompt}&rdquo;</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          {TRY_IN_CLAUDE.slice(1).map((t) => (
            <a key={t.label} href={openInClaude(t.prompt)} target="_blank" rel="noopener noreferrer" title={t.prompt} style={{ color: ACCENT, border: '1px solid rgba(41,151,255,0.4)', borderRadius: 999, padding: '8px 14px', fontSize: '0.92rem', fontWeight: 700, textDecoration: 'none' }}>
              {t.label} ↗
            </a>
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
