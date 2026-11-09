'use client'

// KINEO-NO-CLAUDE-0911 [fundador 09/11: "também quero isso: generate in Claude, with Kineo AI" + regra "copiar 90%"] —
// a página inteira do lado do navegador: as abas Claude · ChatGPT trocam o nome no herói, o botão principal, os passos e o
// botão "Open in …" de cada cartão. O botão principal é o mesmo gesto da /claude-connector (copiar a URL ANTES de abrir a
// aba, dentro do clique; no celular só copia) e mede com os mesmos eventos (CLAUDE_CONNECT_EVENTS), marcando
// connector:'studio' e page:'generate_in_claude' para não misturar com o conector do diretório.
// Cores só de ../claude-connector/palette (fonte única das páginas de conector). Sem logo de terceiros: nomes em texto.
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import Link from 'next/link'
import { trackEvent } from '@/lib/analytics'
import { CLAUDE_ADD_CONNECTOR_URL, CLAUDE_CONNECT_EVENTS, CLAUDE_NEW_CHAT_URL, isMobileClient } from '@/lib/claudeConnect'
import { CHATGPT_NEW_CHAT_URL, vemDoChatgpt } from '@/lib/seo/paginasIaClaras2110'
import {
  ASK_LANGUAGE_NAMES,
  CURRENT_CLAUDE_MODEL,
  GENERATE_IN_CLAUDE_STEPS_ANCHOR,
  GENERATE_IN_CLAUDE_TABS,
  STUDIO_ONLY_FORMATS_LINE,
  assistantTabFrom,
  heroTitle,
  type AskCard,
  type AssistantTab,
} from '@/lib/generateInClaude'
import { MCP_PALETTE as C, MONO } from '../claude-connector/palette'

export type CreditRow = { seconds: number; from: number }
type Card = AskCard & { from: number | null }
type ToolRow = { name: string; title: string; readOnly: boolean }
type CopyStatus = 'idle' | 'copied' | 'copy_failed'

const PAGE = 'generate_in_claude'

function track(event: string, meta: Record<string, unknown>) {
  void trackEvent(event, { source: 'page', page: PAGE, connector: 'studio', ...meta })
}

function CopyButton({ value, label, onCopied }: { value: string; label: string; onCopied?: () => void }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      type="button"
      aria-label={label}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value)
          setCopied(true)
          onCopied?.()
          setTimeout(() => setCopied(false), 1600)
        } catch {
          setCopied(false)
        }
      }}
      style={{ flex: '0 0 auto', background: C.card, color: C.accent, border: `1px solid ${C.accentLine}`, borderRadius: 10, padding: '0 14px', fontWeight: 800, fontSize: '0.86rem', cursor: 'pointer', minHeight: 40 }}
    >
      {copied ? 'Copied' : 'Copy'}
    </button>
  )
}

/** Prévia muda e leve: o vídeo só ganha `src` perto da tela; antes disso (e sem JS) fica o pôster. */
function Preview({ clip, aspect, title }: { clip: Card['clip']; aspect: Card['aspect']; title: string }) {
  const ref = useRef<HTMLDivElement | null>(null)
  const [near, setNear] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (typeof IntersectionObserver === 'undefined') {
      setNear(true)
      return
    }
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        setNear(true)
        io.disconnect()
      }
    }, { rootMargin: '300px 0px' })
    io.observe(el)
    return () => io.disconnect()
  }, [])
  const ratio = aspect.replace(':', ' / ')
  return (
    <div ref={ref} style={{ position: 'relative', aspectRatio: ratio, maxHeight: 340, width: '100%', background: C.placeholder, overflow: 'hidden' }}>
      <video
        src={near ? clip.src : undefined}
        poster={clip.poster}
        autoPlay
        muted
        loop
        playsInline
        preload="none"
        aria-label={`${title} — sample film made with Kineo`}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
      />
    </div>
  )
}

export default function GenerateInClaude({ serverUrl, cards, credits, tools, scriptsOnlyHref }: { serverUrl: string; cards: readonly Card[]; credits: readonly CreditRow[]; tools: readonly ToolRow[]; scriptsOnlyHref: string }) {
  const [tab, setTab] = useState<AssistantTab>('claude')
  const [status, setStatus] = useState<CopyStatus>('idle')
  const [mobile, setMobile] = useState(false)

  useEffect(() => {
    const sp = new URLSearchParams(window.location.search)
    const fromQuery = assistantTabFrom(sp.get('tab'))
    if (fromQuery) setTab(fromQuery)
    else if (vemDoChatgpt(sp.get('utm_source'), document.referrer)) setTab('chatgpt')
    setMobile(isMobileClient(window.innerWidth, navigator.userAgent))
  }, [])

  const name = tab === 'chatgpt' ? 'ChatGPT' : 'Claude'
  const chooseTab = (t: AssistantTab) => {
    setTab(t)
    setStatus('idle')
    try {
      const url = new URL(window.location.href)
      url.searchParams.set('tab', t)
      window.history.replaceState(null, '', url.toString())
    } catch {
      /* só a URL não muda */
    }
  }

  // Mesmo gesto da /claude-connector (lib/claudeConnectClient.ts), com a URL do Kineo Studio: a cópia COMEÇA antes do
  // window.open, no mesmo tique do clique; no ChatGPT não existe janela de conector para abrir, então só copia e rola aos passos.
  const addConnector = async () => {
    const open = tab === 'claude' && !mobile
    let copying: Promise<void> | null = null
    try {
      copying = navigator.clipboard?.writeText(serverUrl) ?? null
    } catch {
      copying = null
    }
    if (open) {
      try {
        window.open(CLAUDE_ADD_CONNECTOR_URL, '_blank', 'noopener')
      } catch {
        /* pop-up bloqueado: os passos abaixo continuam valendo */
      }
    }
    let copied = false
    if (copying) {
      try {
        await copying
        copied = true
      } catch {
        copied = false
      }
    }
    setStatus(copied ? 'copied' : 'copy_failed')
    track(CLAUDE_CONNECT_EVENTS.copyOpen, { assistant: tab, copied, mobile, opened: open })
    if (copied) track(CLAUDE_CONNECT_EVENTS.copiedStateView, { assistant: tab, via: 'click' })
    if (!open) document.getElementById(GENERATE_IN_CLAUDE_STEPS_ANCHOR)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const openHref = (prompt: string) => (tab === 'chatgpt' ? CHATGPT_NEW_CHAT_URL : CLAUDE_NEW_CHAT_URL) + encodeURIComponent(prompt)

  const wrap: CSSProperties = { maxWidth: 1120, margin: '0 auto', padding: '0 16px' }
  const h2: CSSProperties = { fontSize: 'clamp(1.5rem, 3.6vw, 2.2rem)', fontWeight: 650, letterSpacing: '-0.024em', lineHeight: 1.12, margin: '0 0 10px', color: C.text, textAlign: 'center' }
  const lead: CSSProperties = { fontSize: '0.98rem', color: C.muted, lineHeight: 1.6, margin: '0 auto 26px', maxWidth: 680, textAlign: 'center' }
  const p: CSSProperties = { fontSize: '0.95rem', color: C.body, lineHeight: 1.6, margin: 0 }
  const card: CSSProperties = { background: C.card, border: `1px solid ${C.line}`, borderRadius: 18, boxShadow: C.shadow, minWidth: 0 }
  const pill: CSSProperties = { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: 999, padding: '13px 24px', fontWeight: 800, fontSize: '1rem', textDecoration: 'none', minHeight: 48, cursor: 'pointer', border: 0 }
  const chip: CSSProperties = { fontSize: 11, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: C.accent, background: C.accentSoft, borderRadius: 999, padding: '3px 9px' }
  const chipQuiet: CSSProperties = { ...chip, color: C.muted, background: C.cardHi }

  return (
    <main style={{ minHeight: '100vh', background: C.bg, color: C.text, fontFamily: 'var(--font-sans), Arial, sans-serif', overflowX: 'hidden' }}>
      <div style={{ background: C.heroGlow, paddingBottom: 64 }}>
        <div style={wrap}>
          <nav aria-label="Breadcrumb" style={{ padding: '28px 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: '0.85rem' }}>
              <Link href="/" style={{ color: C.muted, textDecoration: 'none' }}>Home</Link>
              <span style={{ color: C.muted }}> / </span>
              <span style={{ color: C.body }}>Kineo in {name}</span>
            </span>
            <Link href="/pricing?utm_source=generate_in_claude" style={{ color: C.muted, fontSize: '0.9rem', textDecoration: 'none' }}>See plans →</Link>
          </nav>

          {/* Abas no topo, como as deles — só onde o conector foi testado. */}
          <div role="tablist" aria-label="Where you use Kineo" style={{ display: 'flex', justifyContent: 'center', gap: 6, margin: '30px 0 0', flexWrap: 'wrap' }}>
            {GENERATE_IN_CLAUDE_TABS.map((t) => {
              const on = t.key === tab
              return (
                <button
                  key={t.key}
                  role="tab"
                  aria-selected={on}
                  type="button"
                  onClick={() => chooseTab(t.key)}
                  style={{ background: on ? C.text : C.card, color: on ? C.bg : C.body, border: `1px solid ${on ? C.text : C.line}`, borderRadius: 999, padding: '9px 20px', fontWeight: 750, fontSize: '0.95rem', cursor: 'pointer', minHeight: 42 }}
                >
                  {t.name}
                </button>
              )
            })}
          </div>

          <section style={{ textAlign: 'center', maxWidth: 900, margin: '0 auto', padding: '34px 0 0' }}>
            <h1 style={{ fontSize: 'clamp(2.1rem, 6.6vw, 4.4rem)', fontWeight: 800, lineHeight: 1.02, letterSpacing: '-0.03em', margin: 0, textTransform: 'uppercase', textWrap: 'balance' }}>
              {heroTitle(tab)}
            </h1>
            <p style={{ fontSize: 'clamp(1rem, 2.4vw, 1.14rem)', color: C.body, lineHeight: 1.65, margin: '20px auto 0', maxWidth: 700 }}>
              Ask {name} for a narrated film in plain words. Kineo makes it in your Kineo account, using your account&apos;s credits,
              and {name} hands you the link when it is ready.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 10, margin: '28px 0 0' }}>
              <button type="button" onClick={addConnector} style={{ ...pill, background: C.accent, color: C.onAccent }}>
                Add Kineo in {name}
              </button>
              <a href={`#${GENERATE_IN_CLAUDE_STEPS_ANCHOR}`} style={{ ...pill, color: C.text, background: C.card, border: `1px solid ${C.line}` }}>
                How to connect?
              </a>
            </div>
            {status === 'copied' && (
              <p role="status" style={{ ...p, margin: '14px auto 0', color: C.ok, fontWeight: 700, maxWidth: 640 }}>
                {tab === 'claude' && !mobile
                  ? '✓ Connector URL copied. In the Claude window: name it Kineo Studio, paste the URL (Ctrl+V / ⌘V) and add it.'
                  : `✓ Connector URL copied. Follow the steps below to add it in ${name}.`}
              </p>
            )}
            {status === 'copy_failed' && (
              <p role="status" style={{ ...p, margin: '14px auto 0', color: C.warn, fontWeight: 700, maxWidth: 640 }}>
                Copy did not work in this browser. Use the Copy button next to the Kineo Studio connector URL.
              </p>
            )}
            {tab === 'claude' && mobile && (
              <p style={{ ...p, margin: '12px auto 0', color: C.muted, fontSize: '0.88rem' }}>Add the connector from Claude on the web or desktop.</p>
            )}
            <div style={{ maxWidth: 520, margin: '24px auto 0', textAlign: 'left' }}>
              <p style={{ margin: '0 0 6px', fontSize: '0.78rem', letterSpacing: '0.06em', textTransform: 'uppercase', color: C.muted }}>Kineo Studio connector URL</p>
              <div style={{ display: 'flex', gap: 8 }}>
                <code style={{ flex: 1, minWidth: 0, fontFamily: MONO, fontSize: '0.86rem', color: C.text, background: C.code, border: `1px solid ${C.line}`, borderRadius: 10, padding: '10px 12px', overflowWrap: 'anywhere' }}>{serverUrl}</code>
                <CopyButton value={serverUrl} label="Copy the Kineo Studio connector URL" />
              </div>
            </div>
          </section>
        </div>
      </div>

      <div style={{ ...wrap, padding: '56px 16px 88px' }}>
        {/* O que dá para pedir: cada cartão = um pedido que kineo_create_video produz hoje (format 'film'). */}
        <section id="what-you-can-ask" aria-label={`What you can ask ${name} to make`} style={{ scrollMarginTop: 24 }}>
          <h2 style={h2}>What you can ask {name} to make</h2>
          <p style={lead}>
            Copy a sentence and paste it in {name} with Kineo Studio connected. Kineo asks {name} to confirm the length and the
            credits with you before the film starts. The clips below are samples made with Kineo.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 250px), 1fr))', gap: 16 }}>
            {cards.map((c) => (
              <article key={c.id} data-ask={c.id} data-format={c.format} style={{ ...card, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <Preview clip={c.clip} aspect={c.aspect} title={c.title} />
                <div style={{ padding: '14px 16px 16px', display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
                  <p style={{ margin: 0, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <span style={chip}>{c.kind}</span>
                    <span style={chipQuiet}>{c.duration} s · {c.aspect}</span>
                    {ASK_LANGUAGE_NAMES[c.language] && <span style={chipQuiet}>{ASK_LANGUAGE_NAMES[c.language]}</span>}
                    {c.mode === 'script' && <span style={chipQuiet}>Your script</span>}
                  </p>
                  <p style={{ margin: 0, fontWeight: 750, fontSize: '1.05rem', letterSpacing: '-0.01em' }}>{c.title}</p>
                  <p style={{ ...p, color: C.muted, fontSize: '0.9rem' }}>{c.line}</p>
                  <blockquote style={{ margin: '4px 0 0', padding: '10px 12px', background: C.code, border: `1px solid ${C.line}`, borderRadius: 10, fontSize: '0.86rem', lineHeight: 1.5, color: C.body, flex: 1 }}>
                    {c.prompt}
                  </blockquote>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginTop: 2 }}>
                    <CopyButton value={c.prompt} label={`Copy the request: ${c.title}`} onCopied={() => track(CLAUDE_CONNECT_EVENTS.openPrompt, { preset: c.id, assistant: tab, action: 'copy' })} />
                    <a
                      href={openHref(c.prompt)}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => track(CLAUDE_CONNECT_EVENTS.openPrompt, { preset: c.id, assistant: tab, action: 'open' })}
                      style={{ color: C.accent, fontWeight: 800, fontSize: '0.9rem', textDecoration: 'none' }}
                    >
                      Open in {name} ↗
                    </a>
                    {c.from !== null && <span style={{ marginLeft: 'auto', color: C.muted, fontSize: '0.82rem' }}>from {c.from} credits</span>}
                  </div>
                </div>
              </article>
            ))}
          </div>
          <p style={{ ...lead, margin: '22px auto 0', fontSize: '0.9rem' }}>{STUDIO_ONLY_FORMATS_LINE}</p>
        </section>

        {/* Passos numerados — o "How to connect?" rola até aqui. */}
        <section id={GENERATE_IN_CLAUDE_STEPS_ANCHOR} style={{ scrollMarginTop: 24, marginTop: 84 }}>
          <h2 style={h2}>How to connect Kineo to {name}</h2>
          <p style={lead}>You need a Kineo account. {tab === 'chatgpt' ? 'In ChatGPT this uses Developer mode, which needs a paid ChatGPT plan (Plus or higher).' : 'Add it from Claude on the web or desktop.'}</p>
          <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 240px), 1fr))', gap: 14 }}>
            {(tab === 'chatgpt' ? CHATGPT_STEPS : CLAUDE_STEPS).map(([title, body], i) => (
              <Step key={title} n={i + 1} title={title}>{body}</Step>
            ))}
          </ol>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))', gap: 16, marginTop: 30 }}>
            <div style={{ ...card, padding: '18px 20px' }}>
              <p style={{ margin: '0 0 10px', fontWeight: 800, fontSize: '1.05rem' }}>What the connector does</p>
              <ul style={{ margin: 0, paddingLeft: 18, display: 'grid', gap: 8 }}>
                {tools.map((t) => (
                  <li key={t.name} style={p}>
                    {t.title} <span style={{ fontFamily: MONO, fontSize: '0.8rem', color: C.muted }}>({t.name}{t.readOnly ? ', read only' : ''})</span>
                  </li>
                ))}
              </ul>
            </div>
            <div style={{ ...card, padding: '18px 20px' }}>
              <p style={{ margin: '0 0 10px', fontWeight: 800, fontSize: '1.05rem' }}>What it does not do</p>
              <ul style={{ margin: 0, paddingLeft: 18, display: 'grid', gap: 8 }}>
                <li style={p}>It does not charge when the balance does not cover the film: nothing is spent and {name} gets a link to the plans.</li>
                <li style={p}>It does not make product ads, UGC ads or cartoon episodes yet: those return a Kineo Studio link, with no charge.</li>
                <li style={p}>It does not put a talking presenter on screen: films are narrated by a voiceover.</li>
                <li style={p}>It does not touch other accounts: every tool acts only on the Kineo account you signed in with.</li>
              </ul>
            </div>
          </div>

          <div style={{ ...card, padding: '18px 20px', marginTop: 16 }}>
            <p style={{ margin: '0 0 6px', fontWeight: 800, fontSize: '1.05rem' }}>What it costs</p>
            <p style={{ ...p, margin: '0 0 12px' }}>
              Each film uses credits from your Kineo plan, the same as pressing Generate in Kineo Studio. Credits are spent only when
              a render actually starts, and a film that fails gives its credits back.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {credits.map((r) => (
                <span key={r.seconds} style={{ border: `1px solid ${C.line}`, borderRadius: 12, padding: '8px 12px', fontSize: '0.9rem', background: C.surface }}>
                  <strong>{r.seconds} s</strong> <span style={{ color: C.muted }}>· from {r.from} credits</span>
                </span>
              ))}
            </div>
            <p style={{ ...p, margin: '12px 0 0', color: C.muted, fontSize: '0.88rem' }}>
              Plans and credits: <Link href="/pricing?utm_source=generate_in_claude" style={{ color: C.accent, textDecoration: 'none', fontWeight: 700 }}>pricing</Link>.
            </p>
          </div>

          <div style={{ ...card, padding: '18px 20px', marginTop: 16 }}>
            <p style={{ margin: '0 0 6px', fontWeight: 800, fontSize: '1.05rem' }}>How to disconnect</p>
            <p style={p}>
              {tab === 'chatgpt'
                ? 'In ChatGPT: Settings → Apps & Connectors, open Kineo Studio and remove it. Your films stay in your Kineo library.'
                : 'In Claude: Customize → Connectors, open Kineo Studio and remove it. Your films stay in your Kineo library.'}
            </p>
          </div>
        </section>

        <section aria-label="FAQ" style={{ marginTop: 84, maxWidth: 820, marginLeft: 'auto', marginRight: 'auto' }}>
          <h2 style={h2}>FAQ</h2>
          <div style={{ display: 'grid', gap: 10, marginTop: 18 }}>
            {faq(name, scriptsOnlyHref, credits.map((r) => r.seconds)).map(([q, a]) => (
              <details key={q} style={{ ...card, padding: '14px 18px' }}>
                <summary style={{ cursor: 'pointer', fontWeight: 750, fontSize: '1rem' }}>{q}</summary>
                <div style={{ ...p, marginTop: 10 }}>{a}</div>
              </details>
            ))}
          </div>
        </section>
      </div>
    </main>
  )
}

function Step({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <li style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 16, padding: '18px 18px 20px', minWidth: 0 }}>
      <span aria-hidden style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 30, height: 30, borderRadius: 999, background: C.accentSoft, color: C.accent, fontWeight: 900, fontSize: '0.9rem', marginBottom: 12 }}>
        {n}
      </span>
      <p style={{ margin: '0 0 8px', fontWeight: 800, fontSize: '1.02rem', color: C.text }}>{title}</p>
      <p style={{ fontSize: '0.92rem', color: C.body, lineHeight: 1.6, margin: 0 }}>{children}</p>
    </li>
  )
}

// Os passos são os que o fundador conferiu em 20/10 (os mesmos de app/claude-connector/StudioSection.tsx).
const CLAUDE_STEPS: readonly (readonly [string, string])[] = [
  ['Open Claude’s connectors', 'Click “Add Kineo in Claude” above: it copies the Kineo Studio URL and opens Customize → Connectors → “Add custom connector”.'],
  ['Paste the Kineo Studio URL', 'Name it “Kineo Studio”, paste the URL and continue. Claude detects the sign-in on its own.'],
  ['Sign in to your Kineo account', 'Claude opens the Kineo login you already use. Allow the connection and you are back in Claude.'],
  ['Ask for a film', 'Turn Kineo Studio on in the chat if it is off, then ask for a film. Kineo asks Claude to confirm the length and credits with you first; then Claude starts it and gives you the link when it is ready.'],
]

const CHATGPT_STEPS: readonly (readonly [string, string])[] = [
  ['Turn on Developer mode', 'In ChatGPT: Settings → Apps & Connectors (called Plugins in some versions) → Advanced settings → turn on Developer mode.'],
  ['Add a custom MCP server', 'Click Create (or “Add custom MCP server”). Name it “Kineo Studio”, paste the URL above, choose Authentication: OAuth and tick “I trust this application”.'],
  ['Sign in and allow', 'ChatGPT opens the Kineo login you already use. Click Allow on the Kineo screen and you are back in ChatGPT.'],
  ['Turn it on in a chat', 'In a new chat, enable Kineo Studio from the “+” / Developer mode menu, then ask for a film.'],
]

function faq(name: string, scriptsOnlyHref: string, durations: readonly number[]): readonly (readonly [string, ReactNode])[] {
  return [
    ['Do I need a Kineo account?', 'Yes. The connector signs in to your own Kineo account and every film is made there, with that account’s credits. If you do not have one yet, create it at usekineo.com first, then connect.'],
    ['What can it make today?', <>Narrated films of {durations.join(', ')} seconds (the cost list above shows each length), vertical, widescreen, square or 4:5, narrated in many languages, from an idea or from your own script word for word. {STUDIO_ONLY_FORMATS_LINE}</>],
    ['How much does it cost?', 'The same credits as making the film in Kineo Studio. Kineo asks the assistant to confirm the cost with you before it starts, nothing is charged if your balance does not cover it, and a failed film gives its credits back.'],
    ['Where do my films go?', `To your Kineo library, like any film you make on the website. ${name} gives you the link when the film is ready, and can list your recent films.`],
    ['Is Kineo part of Claude or ChatGPT?', `No. Kineo is an independent product. Kineo Studio is a custom connector you add yourself, by URL, in ${name}.`],
    ['Which Claude model does it work with?', `You talk to Claude as usual — today that is ${CURRENT_CLAUDE_MODEL} — and Claude calls the Kineo Studio tools when you ask for a film.`],
    ['I only want help writing the script, without an account.', <>Use the scripts-only Kineo connector: it writes the script and hands it to Kineo Studio as a link, and never renders or charges. <Link href={scriptsOnlyHref} style={{ color: C.accent, textDecoration: 'none', fontWeight: 700 }}>See how it works →</Link></>],
  ]
}
