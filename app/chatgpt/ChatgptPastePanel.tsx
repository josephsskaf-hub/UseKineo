'use client'

// ═══ KINEO-PASTE-PAGE-2026-09-07 — a parte da página /chatgpt que precisa de JS ═
//
// Duas ações e dois eventos, nada mais:
//   · "Copy prompt"  → clipboard + evento `chatgpt_prompt_copied`;
//   · "Make this video" → POST /api/gpt/handoff/paste e, com sucesso,
//     `window.location.href = url` (o /go/<token> devolvido). Erro do servidor
//     aparece em TEXTO na tela (a frase que a rota devolve), nunca um alerta
//     mudo. Botão desabilitado enquanto envia.
//   · `chatgpt_page_viewed` na montagem, uma vez (guardado por ref — o modo
//     estrito do React monta o efeito duas vezes em dev).
//
// Este arquivo NÃO importa @/lib/gptHandoff (ela usa node:crypto; tsc não vê a
// fronteira servidor/cliente e a Vercel quebraria no build — precedente:
// app/chatgpt-to-youtube-shorts/HandoffErrorNotice.tsx). Tudo o que vem da
// lib (prompt, durações, teto, assistentes) chega por PROPS do server
// component app/chatgpt/page.tsx. Evento pelo MESMO trackEvent das páginas
// públicas. Sem CSS novo: vocabulário inline da página (CARD/ACCENT/MUTED).
import { useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { trackEvent } from '@/lib/analytics'

export const PASTE_ENDPOINT = '/api/gpt/handoff/paste'
export const PAGE_VIEWED_EVENT = 'chatgpt_page_viewed'
export const PROMPT_COPIED_EVENT = 'chatgpt_prompt_copied'

type AssistantOption = { id: string; label: string }

type ChatgptPastePanelProps = {
  /** ASSISTANT_PASTE_PROMPT, montado no servidor a partir da régua. */
  prompt: string
  /** DURATIONS e DEFAULT_DURATION da lib. */
  durations: readonly number[]
  defaultDuration: number
  /** SCRIPT_MAX_CHARS da lib — o MESMO teto do Studio. */
  scriptMaxChars: number
  /** PASTE_ASSISTANTS com rótulo humano (id é o que a rota normaliza). */
  assistants: readonly AssistantOption[]
  /** Vocabulário de estilo da própria página — sem CSS novo. */
  cardStyle: CSSProperties
  accent: string
  muted: string
}

function countWords(text: string): number {
  return text.split(/\s+/).filter((t) => /[\p{L}\p{N}]/u.test(t)).length
}

export default function ChatgptPastePanel({
  prompt,
  durations,
  defaultDuration,
  scriptMaxChars,
  assistants,
  cardStyle,
  accent,
  muted,
}: ChatgptPastePanelProps) {
  const [copied, setCopied] = useState(false)
  const [script, setScript] = useState('')
  const [duration, setDuration] = useState<number>(defaultDuration)
  const [assistant, setAssistant] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const viewedOnce = useRef(false)

  useEffect(() => {
    if (viewedOnce.current) return
    viewedOnce.current = true
    void trackEvent(PAGE_VIEWED_EVENT, {})
  }, [])

  async function copyPrompt() {
    let ok = false
    try {
      await navigator.clipboard.writeText(prompt)
      ok = true
    } catch {
      // Sem clipboard API (http, permissão negada): seleciona o <pre> para
      // a pessoa copiar com Ctrl+C. O evento registra o método.
      try {
        const pre = document.getElementById('chatgpt-paste-prompt')
        if (pre) {
          const range = document.createRange()
          range.selectNodeContents(pre)
          const sel = window.getSelection()
          sel?.removeAllRanges()
          sel?.addRange(range)
        }
      } catch {
        /* nada a fazer — o texto continua visível */
      }
    }
    setCopied(ok)
    void trackEvent(PROMPT_COPIED_EVENT, { method: ok ? 'clipboard' : 'select' })
    if (ok) window.setTimeout(() => setCopied(false), 2500)
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (sending) return
    setError(null)
    const text = script.trim()
    if (!text) {
      setError('Paste the script first — the narration text your AI wrote.')
      return
    }
    setSending(true)
    try {
      const response = await fetch(PASTE_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          script: text,
          durationSec: duration,
          ...(assistant ? { assistant } : {}),
        }),
      })
      const data = (await response.json().catch(() => null)) as { url?: unknown; error?: unknown } | null
      if (!response.ok || typeof data?.url !== 'string') {
        setError(
          typeof data?.error === 'string' && data.error.trim()
            ? data.error
            : 'Kineo could not process the script right now. Try again in a minute.',
        )
        setSending(false)
        return
      }
      window.location.href = data.url
    } catch {
      setError('Kineo could not reach the server. Check your connection and try again.')
      setSending(false)
    }
  }

  const words = countWords(script)
  const chars = script.length
  const button: CSSProperties = {
    background: '#f5f5f7',
    color: '#000',
    fontWeight: 800,
    padding: '14px 26px',
    borderRadius: 980,
    border: 'none',
    fontSize: '1rem',
    cursor: sending ? 'wait' : 'pointer',
    opacity: sending ? 0.6 : 1,
  }
  const field: CSSProperties = {
    width: '100%',
    background: '#0c0c0e',
    color: '#f5f5f7',
    border: '1px solid #2a2a2d',
    borderRadius: 12,
    padding: '12px 14px',
    fontSize: '0.95rem',
    fontFamily: 'inherit',
  }
  const label: CSSProperties = { display: 'block', color: muted, fontSize: '0.85rem', margin: '0 0 6px' }

  return (
    <>
      {/* ── Passo 1: o prompt ── */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', margin: '0 0 12px' }}>
        <button type="button" onClick={copyPrompt} style={button}>
          {copied ? 'Copied ✓' : 'Copy prompt'}
        </button>
        <span style={{ color: muted, fontSize: '0.9rem' }}>
          {copied ? 'Now paste it into your AI and answer its one question.' : 'Then paste it into ChatGPT, Claude or Gemini.'}
        </span>
      </div>
      <pre
        id="chatgpt-paste-prompt"
        style={{
          ...cardStyle,
          padding: '18px 20px',
          margin: '0 0 12px',
          whiteSpace: 'pre-wrap',
          overflowX: 'auto',
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
          fontSize: '0.86rem',
          lineHeight: 1.6,
          color: '#d2d2d7',
        }}
      >
        {prompt}
      </pre>

      {/* ── Passo 2: a caixa ── */}
      <form id="chatgpt-paste-form" onSubmit={submit} style={{ ...cardStyle, padding: '18px 20px', marginTop: 34 }}>
        <label htmlFor="chatgpt-paste-script" style={label}>
          Paste the script your AI wrote
        </label>
        <textarea
          id="chatgpt-paste-script"
          name="script"
          value={script}
          onChange={(e) => setScript(e.target.value)}
          maxLength={scriptMaxChars}
          rows={12}
          required
          placeholder={'HOOK:\nMICRO REWARD:\nESCALATION:\nPAYOFF:'}
          style={{ ...field, resize: 'vertical', lineHeight: 1.55 }}
        />
        <p style={{ color: muted, fontSize: '0.82rem', margin: '6px 0 14px' }}>
          {words} {words === 1 ? 'word' : 'words'} · {chars.toLocaleString('en-US')} / {scriptMaxChars.toLocaleString('en-US')} characters
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, margin: '0 0 16px' }}>
          <div>
            <label htmlFor="chatgpt-paste-duration" style={label}>
              Video length
            </label>
            <select
              id="chatgpt-paste-duration"
              name="durationSec"
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              style={field}
            >
              {durations.map((d) => (
                <option key={d} value={d}>
                  {d} seconds
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="chatgpt-paste-assistant" style={label}>
              Which AI wrote it? <span style={{ color: muted }}>(optional)</span>
            </label>
            <select
              id="chatgpt-paste-assistant"
              name="assistant"
              value={assistant}
              onChange={(e) => setAssistant(e.target.value)}
              style={field}
            >
              <option value="">Prefer not to say</option>
              {assistants.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {error && (
          <p role="alert" style={{ color: '#ffb340', fontSize: '0.95rem', lineHeight: 1.55, margin: '0 0 14px' }}>
            {error}
          </p>
        )}

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
          <button type="submit" disabled={sending} style={button}>
            {sending ? 'Preparing your Studio…' : 'Make this video →'}
          </button>
          <span style={{ color: accent, fontSize: '0.85rem', fontWeight: 700 }}>
            Nothing renders until you press Generate in the Studio.
          </span>
        </div>
      </form>
    </>
  )
}
