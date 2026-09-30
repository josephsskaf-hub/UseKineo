'use client'

// KINEO-CLAUDE-CONNECTOR-V2-2026-09-30 — o painel "conectar" da /claude-connector, na mecânica da página MCP da
// Higgsfield (abas por cliente, botão que abre o modal de conector do claude.ai, URL com Copy). Só a mecânica: a
// marca, o texto e as promessas são nossos, e cada aba diz só o que funciona hoje. A aba ChatGPT é "em breve" —
// não existe app da Kineo no ChatGPT ainda, e dizer o contrário seria selo desonesto.
import { useState, type CSSProperties } from 'react'

type TabKey = 'claude' | 'claude_code' | 'other' | 'chatgpt'

const TABS: readonly { key: TabKey; label: string }[] = [
  { key: 'claude', label: 'Claude' },
  { key: 'claude_code', label: 'Claude Code' },
  { key: 'other', label: 'Other MCP clients' },
  { key: 'chatgpt', label: 'ChatGPT · soon' },
]

function CopyField({ value, accent, label }: { value: string; accent: string; label: string }) {
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
    <div style={{ display: 'flex', gap: 8, alignItems: 'stretch', marginTop: 8 }}>
      <code
        aria-label={label}
        style={{
          flex: 1,
          minWidth: 0,
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
          fontSize: '0.92rem',
          color: '#f5f5f7',
          background: '#0b0b0c',
          border: '1px solid #2a2a2d',
          borderRadius: 10,
          padding: '11px 12px',
          overflowWrap: 'anywhere',
          whiteSpace: 'pre-wrap',
        }}
      >
        {value}
      </code>
      <button
        type="button"
        onClick={copy}
        style={{ flex: '0 0 auto', background: 'transparent', color: accent, border: `1px solid ${accent}66`, borderRadius: 10, padding: '0 14px', fontWeight: 800, fontSize: '0.9rem', cursor: 'pointer', minHeight: 44 }}
      >
        {copied ? 'Copied' : 'Copy'}
      </button>
    </div>
  )
}

export default function ConnectPanel({ serverUrl, connectUrl, accent, muted }: { serverUrl: string; connectUrl: string; accent: string; muted: string }) {
  const [tab, setTab] = useState<TabKey>('claude')
  const p: CSSProperties = { fontSize: '0.98rem', color: '#d2d2d7', lineHeight: 1.65, margin: '0 0 12px' }
  const small: CSSProperties = { fontSize: '0.88rem', color: muted, lineHeight: 1.6, margin: '10px 0 0' }
  const cliCommand = `claude mcp add --transport http kineo ${serverUrl}`
  const jsonConfig = JSON.stringify({ mcpServers: { kineo: { type: 'http', url: serverUrl } } }, null, 2)

  return (
    <div style={{ background: '#161618', border: '1px solid #2a2a2d', borderRadius: 18, padding: '18px 18px 20px' }}>
      <div role="tablist" aria-label="Where to use Kineo" style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 18 }}>
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
                background: on ? '#f5f5f7' : 'transparent',
                color: on ? '#000' : '#d2d2d7',
                border: `1px solid ${on ? '#f5f5f7' : '#2a2a2d'}`,
                borderRadius: 999,
                padding: '8px 14px',
                fontWeight: 700,
                fontSize: '0.9rem',
                cursor: 'pointer',
                minHeight: 40,
              }}
            >
              {t.label}
            </button>
          )
        })}
      </div>

      {tab === 'claude' && (
        <div role="tabpanel">
          <a
            href={connectUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{ display: 'inline-block', background: accent, color: '#fff', fontWeight: 800, fontSize: '1rem', borderRadius: 999, padding: '12px 22px', textDecoration: 'none' }}
          >
            Connect Kineo to Claude →
          </a>
          <p style={small}>Opens Claude&apos;s &ldquo;Add custom connector&rdquo; window. Name it Kineo and paste this URL; leave the authentication fields empty.</p>
          <CopyField value={serverUrl} accent={accent} label="Kineo MCP server URL" />
          <details style={{ marginTop: 14 }}>
            <summary style={{ cursor: 'pointer', color: accent, fontWeight: 700, minHeight: 32 }}>How to connect?</summary>
            <ol style={{ ...p, paddingLeft: 22, marginTop: 10, listStyle: 'decimal' }}>
              <li>In Claude (web or desktop), open <strong>Settings → Connectors</strong>, or use the button above.</li>
              <li>Choose <strong>Add custom connector</strong>, name it <strong>Kineo</strong> and paste the URL. No login is needed.</li>
              <li>In a chat, turn Kineo on from the tools menu, then try one of the requests below.</li>
            </ol>
          </details>
        </div>
      )}

      {tab === 'claude_code' && (
        <div role="tabpanel">
          <p style={p}>Run this once in your terminal:</p>
          <CopyField value={cliCommand} accent={accent} label="Claude Code command" />
          <p style={small}>Then ask Claude Code for a script and to send it to Kineo Studio.</p>
        </div>
      )}

      {tab === 'other' && (
        <div role="tabpanel">
          <p style={p}>Any client that speaks MCP over Streamable HTTP can use the same server, with no sign-in:</p>
          <CopyField value={jsonConfig} accent={accent} label="MCP client configuration" />
        </div>
      )}

      {tab === 'chatgpt' && (
        <div role="tabpanel">
          <p style={p}>
            <strong>Coming soon.</strong> A Kineo app for ChatGPT is not available yet. Today you can paste a script
            written in ChatGPT on the{' '}
            <a href="/chatgpt" style={{ color: accent, textDecoration: 'none' }}>
              paste page
            </a>{' '}
            and open it in Kineo Studio the same way.
          </p>
        </div>
      )}
    </div>
  )
}
