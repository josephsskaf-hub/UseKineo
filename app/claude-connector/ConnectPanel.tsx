'use client'

// KINEO-CLAUDE-CONNECTOR-V2-2026-09-30 — o painel "conectar" da /claude-connector, na mecânica da página MCP da
// Higgsfield (abas por cliente, botão que abre o modal de conector do claude.ai, URL com Copy). Só a mecânica: a
// marca, o texto e as promessas são nossos, e cada aba diz só o que funciona hoje. A aba ChatGPT é "em breve" —
// não existe app da Kineo no ChatGPT ainda, e dizer o contrário seria selo desonesto.
//
// KINEO-MCP-PAGINA-2026-09-30 (fundador: "quero deixar o nosso modelo de MCP parecido com esses modelos") — o layout
// da Buzzy: abas com ícone (Claude · Claude Code · Cursor · Other MCP clients · ChatGPT em breve) e, em cada aba, 3
// CARTÕES NUMERADOS LADO A LADO (empilham no celular). A aba Cursor é nova (~/.cursor/mcp.json). Eventos, ?copied=,
// ?src= e a âncora #connect seguem iguais. Cores de ./palette (fonte única da página).
import { useEffect, useState, type CSSProperties, type ReactNode } from 'react'
import { trackEvent } from '@/lib/analytics'
import { CLAUDE_CONNECT_ANCHOR, CLAUDE_CONNECT_EVENTS, CLAUDE_START_PROMPT, claudeConnectSource, isMobileClient, type ClaudeConnectSource } from '@/lib/claudeConnect'
import { copyUrlAndOpenClaude } from '@/lib/claudeConnectClient'
import { ClientGlyph, type ClientKey } from './ClientGlyphs'
import { MCP_PALETTE as C, MONO } from './palette'

/** KINEO-CLAUDE-1CLIQUE-2026-09-30 — estado do botão principal: nada ainda, URL copiada, ou a cópia falhou. */
type CopyStatus = 'idle' | 'copied' | 'copy_failed'

type TabKey = ClientKey

const TABS: readonly { key: TabKey; label: string; soon?: true }[] = [
  { key: 'claude', label: 'Claude' },
  { key: 'claude_code', label: 'Claude Code' },
  { key: 'cursor', label: 'Cursor' },
  { key: 'other', label: 'Other MCP clients' },
  { key: 'chatgpt', label: 'ChatGPT', soon: true },
]

export function CopyField({ value, label, block = false }: { value: string; label: string; block?: boolean }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    } catch {
      setCopied(false)
    }
  }
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'stretch', marginTop: 10, flexDirection: block ? 'column' : 'row' }}>
      <code
        aria-label={label}
        style={{
          flex: 1,
          minWidth: 0,
          fontFamily: MONO,
          fontSize: '0.86rem',
          color: C.text,
          background: C.code,
          border: `1px solid ${C.line}`,
          borderRadius: 10,
          padding: '10px 12px',
          overflowWrap: 'anywhere',
          whiteSpace: 'pre-wrap',
          textAlign: 'left',
        }}
      >
        {value}
      </code>
      <button
        type="button"
        onClick={copy}
        style={{ flex: '0 0 auto', background: 'transparent', color: C.accent, border: `1px solid ${C.accentLine}`, borderRadius: 10, padding: '0 14px', fontWeight: 800, fontSize: '0.88rem', cursor: 'pointer', minHeight: 40 }}
      >
        {copied ? 'Copied' : 'Copy'}
      </button>
    </div>
  )
}

const STEP_GRID: CSSProperties = {
  listStyle: 'none',
  margin: 0,
  padding: 0,
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 250px), 1fr))',
  gap: 14,
}

export default function ConnectPanel({ serverUrl, startHref }: { serverUrl: string; startHref: string }) {
  const [tab, setTab] = useState<TabKey>('claude')
  const [status, setStatus] = useState<CopyStatus>('idle')
  const [mobile, setMobile] = useState(false)
  const [source, setSource] = useState<ClaudeConnectSource>('page')

  // Quem chega do card da home já com a URL copiada (?copied=1) vê o estado "copiado" sem clicar de novo.
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search)
    const src = claudeConnectSource(sp.get('src'))
    setSource(src)
    setMobile(isMobileClient(window.innerWidth, navigator.userAgent))
    if (sp.get('copied') === '1') {
      setStatus('copied')
      void trackEvent(CLAUDE_CONNECT_EVENTS.copiedStateView, { source: src, via: 'arrival' })
    } else if (sp.get('copied') === '0') {
      setStatus('copy_failed')
    }
  }, [])

  // Dentro do gesto: copia e (no computador) abre o modal de conector do claude.ai numa aba nova.
  const copyAndOpen = async () => {
    const copied = await copyUrlAndOpenClaude({ open: !mobile })
    setStatus(copied ? 'copied' : 'copy_failed')
    void trackEvent(CLAUDE_CONNECT_EVENTS.copyOpen, { source, copied, mobile })
    if (copied) void trackEvent(CLAUDE_CONNECT_EVENTS.copiedStateView, { source, via: 'click' })
  }
  const p: CSSProperties = { fontSize: '0.95rem', color: C.body, lineHeight: 1.6, margin: 0 }
  const small: CSSProperties = { fontSize: '0.86rem', color: C.muted, lineHeight: 1.55, margin: '10px 0 0' }
  const primary: CSSProperties = { display: 'inline-block', background: C.accent, color: C.onAccent, fontWeight: 800, fontSize: '0.95rem', border: 0, borderRadius: 999, padding: '11px 20px', cursor: 'pointer', minHeight: 44, textDecoration: 'none', textAlign: 'center' }
  const cliCommand = `claude mcp add --transport http kineo ${serverUrl}`
  const jsonConfig = JSON.stringify({ mcpServers: { kineo: { type: 'http', url: serverUrl } } }, null, 2)
  const cursorConfig = JSON.stringify({ mcpServers: { kineo: { url: serverUrl } } }, null, 2)

  return (
    <div id={CLAUDE_CONNECT_ANCHOR} style={{ background: C.surface, border: `1px solid ${C.line}`, borderRadius: 22, padding: 'clamp(16px, 3vw, 26px)', scrollMarginTop: 24 }}>
      <div role="tablist" aria-label="Where to use Kineo" style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 6, marginBottom: 22 }}>
        {TABS.map((t) => {
          const on = t.key === tab
          return (
            <button
              key={t.key}
              role="tab"
              aria-selected={on}
              type="button"
              onClick={() => setTab(t.key)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                background: on ? C.text : 'transparent',
                color: on ? C.bg : C.body,
                border: `1px solid ${on ? C.text : C.line}`,
                borderRadius: 999,
                padding: '7px 14px 7px 10px',
                fontWeight: 700,
                fontSize: '0.88rem',
                cursor: 'pointer',
                minHeight: 40,
              }}
            >
              <span style={{ display: 'inline-flex', width: 24, height: 24, alignItems: 'center', justifyContent: 'center', borderRadius: 7, background: C.card }}>
                <ClientGlyph kind={t.key} size={16} />
              </span>
              {t.label}
              {t.soon && (
                <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.warn, border: `1px solid ${C.warn}`, borderRadius: 999, padding: '1px 6px' }}>soon</span>
              )}
            </button>
          )
        })}
      </div>

      {tab === 'claude' && (
        <div role="tabpanel" aria-label="Claude">
          <ol style={STEP_GRID}>
            <StepCard n={1} title="Open connector settings">
              <p style={p}>One click copies the Kineo server URL and opens Claude&apos;s &ldquo;Add custom connector&rdquo; window.</p>
              <div style={{ marginTop: 'auto', paddingTop: 14 }}>
                <button type="button" onClick={copyAndOpen} style={primary}>
                  {mobile ? 'Copy URL' : 'Copy URL & open Claude →'}
                </button>
              </div>
              {mobile && (
                <p style={small}>Add the connector from Claude on the web or desktop.</p>
              )}
              {status === 'copied' && (
                <p role="status" style={{ ...p, margin: '12px 0 0', color: C.ok, fontWeight: 700, fontSize: '0.88rem' }}>
                  ✓ URL copied. In Claude: type Kineo as the name, paste the URL (Ctrl+V / ⌘V), click Continue → Add → Connect.
                </p>
              )}
              {status === 'copy_failed' && (
                <p role="status" style={{ ...p, margin: '12px 0 0', color: C.warn, fontWeight: 700, fontSize: '0.88rem' }}>
                  Copy did not work in this browser — use the Copy button in step 2, then paste the URL in Claude.
                </p>
              )}
            </StepCard>
            <StepCard n={2} title="Add the Kineo connector">
              <p style={p}>Name: <strong>Kineo</strong>. URL: paste it. Click <strong>Continue</strong>.</p>
              <div style={{ marginTop: 'auto' }}>
                <CopyField value={serverUrl} label="Kineo MCP server URL" block />
              </div>
            </StepCard>
            <StepCard n={3} title="Connect and start">
              <p style={p}>Claude detects that no login is needed: click <strong>Add</strong>. On the Kineo connector page, click <strong>Connect</strong>. Done.</p>
              <div style={{ marginTop: 'auto', paddingTop: 14 }}>
                <a
                  href={startHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => { void trackEvent(CLAUDE_CONNECT_EVENTS.openPrompt, { source, preset: 'start' }) }}
                  style={primary}
                >
                  Start in Claude →
                </a>
              </div>
            </StepCard>
          </ol>
        </div>
      )}

      {tab === 'claude_code' && (
        <div role="tabpanel" aria-label="Claude Code">
          <ol style={STEP_GRID}>
            <StepCard n={1} title="Add the server">
              <p style={p}>Run this once in your terminal:</p>
              <CopyField value={cliCommand} label="Claude Code command" block />
            </StepCard>
            <StepCard n={2} title="Check it is connected">
              <p style={p}>Start Claude Code and type <code style={{ fontFamily: MONO, color: C.text }}>/mcp</code>. Kineo should be listed as connected, with no sign-in.</p>
            </StepCard>
            <StepCard n={3} title="Ask for a script">
              <p style={p}>Ask Claude Code for a script and to send it to Kineo Studio, for example:</p>
              <CopyField value={CLAUDE_START_PROMPT} label="Example request for Claude Code" block />
            </StepCard>
          </ol>
        </div>
      )}

      {tab === 'cursor' && (
        <div role="tabpanel" aria-label="Cursor">
          <ol style={STEP_GRID}>
            <StepCard n={1} title="Open the MCP config">
              <p style={p}>
                Open (or create) <code style={{ fontFamily: MONO, color: C.text }}>~/.cursor/mcp.json</code> — or{' '}
                <code style={{ fontFamily: MONO, color: C.text }}>.cursor/mcp.json</code> inside one project.
              </p>
            </StepCard>
            <StepCard n={2} title="Add Kineo">
              <p style={p}>Paste this server entry (merge it if the file already has other servers):</p>
              <CopyField value={cursorConfig} label="Cursor MCP configuration" block />
            </StepCard>
            <StepCard n={3} title="Ask the agent">
              <p style={p}>Save, then check Kineo is enabled in Cursor&apos;s MCP settings. Ask the agent for a script and to send it to Kineo Studio.</p>
            </StepCard>
          </ol>
        </div>
      )}

      {tab === 'other' && (
        <div role="tabpanel" aria-label="Other MCP clients">
          <ol style={STEP_GRID}>
            <StepCard n={1} title="Use the server URL">
              <p style={p}>Any client that speaks MCP over Streamable HTTP can use the same server, with no sign-in:</p>
              <CopyField value={serverUrl} label="Kineo MCP server URL" block />
            </StepCard>
            <StepCard n={2} title="Or paste the config">
              <p style={p}>Clients that read a JSON config file take this entry:</p>
              <CopyField value={jsonConfig} label="MCP client configuration" block />
            </StepCard>
            <StepCard n={3} title="Ask for a script">
              <p style={p}>Ask your assistant to write the script and send it to Kineo Studio. You get a one-click link; nothing renders until you press Generate.</p>
            </StepCard>
          </ol>
        </div>
      )}

      {tab === 'chatgpt' && (
        <div role="tabpanel" aria-label="ChatGPT">
          <ol style={STEP_GRID}>
            <StepCard n={1} title="Not available yet">
              <p style={p}>
                <strong>Coming soon.</strong> A Kineo app for ChatGPT is not available yet.
              </p>
            </StepCard>
            <StepCard n={2} title="Write the script in ChatGPT">
              <p style={p}>Today you can still write your script in ChatGPT as usual and copy it.</p>
            </StepCard>
            <StepCard n={3} title="Paste it into Kineo">
              <p style={p}>
                Paste it on the{' '}
                <a href="/chatgpt" style={{ color: C.accent, textDecoration: 'none', fontWeight: 700 }}>
                  paste page
                </a>{' '}
                and open it in Kineo Studio the same way.
              </p>
            </StepCard>
          </ol>
        </div>
      )}
    </div>
  )
}

/** Um cartão numerado (Buzzy): número, título, corpo; ações descem para o pé do cartão. */
function StepCard({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <li style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 16, padding: '18px 18px 20px', display: 'flex', flexDirection: 'column', minWidth: 0 }}>
      <span aria-hidden style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 30, height: 30, borderRadius: 999, background: C.accentSoft, color: C.accent, fontWeight: 900, fontSize: '0.9rem', marginBottom: 12 }}>
        {n}
      </span>
      <p style={{ margin: '0 0 8px', fontWeight: 800, fontSize: '1.05rem', color: C.text }}>{title}</p>
      {children}
    </li>
  )
}
