'use client'

// KINEO-FLUXO-NOVO-2026-09-25 — o formulário do briefing Express/Pro. Lógica aqui, visual do Codex depois.
// Só `import type` de lib/growth/dfyBrief (o módulo usa node:crypto; valor importado quebraria o build do
// navegador — memória "tsc não vê a fronteira servidor/cliente"). Os campos chegam como props do servidor.
// Arquivos na v1: links + "responda o recibo". NÃO prometer o My footage: conta grátis recebe 402 lá.
import { useCallback, useEffect, useRef, useState } from 'react'
import { trackEvent } from '@/lib/analytics'
import type { DfyBrief, DfyBriefField } from '@/lib/growth/dfyBrief'
import styles from '../businessAds.module.css'

type FieldSpec = { key: DfyBriefField; label: string; hint: string; max: number; required: boolean; multiline: boolean }
type Ready = {
  state: 'ready'
  tier: string | null
  tier_name: string | null
  hours: number | null
  revisions: number | null
  email: string | null
  prefill: Partial<DfyBrief>
  brief: DfyBrief | null
  submitted_at: string | null
  edits_left: number
}
type Phase =
  | { kind: 'loading' }
  | { kind: 'blocked'; state: string }
  | { kind: 'ready'; data: Ready }

const EMPTY: Record<DfyBriefField, string> = { business: '', goal: '', audience: '', language: '', cta: '', facts: '' }

const BLOCKED_COPY: Record<string, string> = {
  pending: 'Your payment is still being confirmed by your bank. This page opens as soon as it clears. Check again in a few minutes, or reply to your receipt email with your brief.',
  not_found: 'We could not find a paid Express or Pro order for this link. If you just paid, reply to your receipt email with your brief and we will take it from there.',
  invalid: 'This link is incomplete. Use the link from your payment confirmation, or reply to your receipt email with your brief.',
  unavailable: 'We could not reach the payment system just now. Please try again in a minute.',
}

const SESSION_RE = /^cs_(live|test)_[A-Za-z0-9]{10,200}$/

export default function BriefForm({ sessionId: fromQuery, fields, maxLinks }: { sessionId: string; fields: FieldSpec[]; maxLinks: number }) {
  // O redirect do Payment Link manda #session_id=... (fragmento: não vai ao servidor nem ao Google Ads). A query
  // ?session_id= ainda vale (link antigo, alerta), mas sai da barra de endereço assim que a página abre.
  const [sessionId, setSessionId] = useState(fromQuery)
  const [phase, setPhase] = useState<Phase>({ kind: 'loading' })
  useEffect(() => {
    const fromHash = new URLSearchParams(window.location.hash.replace(/^#/, '')).get('session_id') ?? ''
    const id = SESSION_RE.test(fromHash) ? fromHash : fromQuery
    if (window.location.search || window.location.hash) window.history.replaceState(null, '', window.location.pathname)
    if (id) setSessionId(id)
    else setPhase({ kind: 'blocked', state: 'invalid' })
  }, [fromQuery])
  const [values, setValues] = useState<Record<DfyBriefField, string>>(EMPTY)
  const [links, setLinks] = useState('')
  const [sending, setSending] = useState(false)
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null)
  const viewed = useRef(false)

  const load = useCallback(async () => {
    if (!sessionId) return
    setPhase({ kind: 'loading' })
    let state = 'unavailable'
    try {
      const res = await fetch(`/api/dfy/brief?session_id=${encodeURIComponent(sessionId)}`, { cache: 'no-store' })
      const json = await res.json().catch(() => ({}))
      state = typeof json?.state === 'string' ? json.state : 'unavailable'
      if (state === 'ready') {
        const data = json as Ready
        const base: Partial<DfyBrief> = data.brief ?? data.prefill ?? {}
        setValues({ ...EMPTY, ...Object.fromEntries(fields.map((f) => [f.key, typeof base[f.key] === 'string' ? base[f.key] : ''])) } as Record<DfyBriefField, string>)
        setLinks((data.brief?.links ?? []).join('\n'))
        setPhase({ kind: 'ready', data })
      } else {
        setPhase({ kind: 'blocked', state })
      }
    } catch {
      setPhase({ kind: 'blocked', state })
    }
    if (!viewed.current) {
      viewed.current = true
      // Sem session_id no evento: ele é a senha do pedido. O fato do envio é o evento de servidor dfy_brief_submitted.
      void trackEvent('dfy_brief_viewed', { state })
    }
  }, [sessionId, fields])

  useEffect(() => { void load() }, [load])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (sending) return
    setSending(true)
    setStatus(null)
    try {
      const res = await fetch('/api/dfy/brief', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId, brief: { ...values, links: links.split(/\s+/).filter(Boolean) } }),
      })
      const json = await res.json().catch(() => ({}))
      if (json?.state === 'saved') {
        setStatus({ ok: true, text: 'Brief received. A person on our team starts from it; if anything is missing we reply by email. You can edit and send it again from this page.' })
        setPhase((p) => (p.kind === 'ready' ? { kind: 'ready', data: { ...p.data, submitted_at: json.submitted_at ?? p.data.submitted_at, edits_left: json.edits_left ?? p.data.edits_left } } : p))
      } else if (json?.state === 'incomplete') {
        setStatus({ ok: false, text: 'Please fill in the required fields.' })
      } else if (json?.state === 'too_many_edits') {
        setStatus({ ok: false, text: 'This brief was edited too many times here. Reply to your receipt email with any further changes.' })
      } else {
        setStatus({ ok: false, text: 'We could not save your brief just now. Please try again, or reply to your receipt email with it.' })
      }
    } catch {
      setStatus({ ok: false, text: 'We could not save your brief just now. Please try again, or reply to your receipt email with it.' })
    } finally {
      setSending(false)
    }
  }

  if (phase.kind === 'loading') return <p role="status">Checking your order…</p>
  if (phase.kind === 'blocked') {
    return (
      <div role="status">
        <p>{BLOCKED_COPY[phase.state] ?? BLOCKED_COPY.unavailable}</p>
        {(phase.state === 'pending' || phase.state === 'unavailable') && sessionId && (
          <button type="button" className={styles.primary} onClick={() => void load()}>Check again</button>
        )}
      </div>
    )
  }

  const d = phase.data
  return (
    <form onSubmit={submit}>
      <p>
        {d.tier_name ? `${d.tier_name} order` : 'Your order'}
        {d.hours ? ` · delivery within ${d.hours} hours of payment` : ''}
        {d.revisions ? ` · ${d.revisions} ${d.revisions === 1 ? 'revision' : 'revisions'}` : ''}
        {d.email ? ` · we reply to ${d.email}` : ''}
      </p>
      {d.submitted_at && <p>Brief already received. Changes you send now replace it.</p>}
      {fields.map((f) => (
        <p key={f.key}>
          <label htmlFor={`brief-${f.key}`}>{f.label}{f.required ? ' *' : ''}</label><br />
          <small id={`brief-${f.key}-hint`}>{f.hint}</small><br />
          {f.multiline ? (
            <textarea id={`brief-${f.key}`} name={f.key} rows={3} maxLength={f.max} required={f.required} aria-describedby={`brief-${f.key}-hint`}
              value={values[f.key]} onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))} />
          ) : (
            <input id={`brief-${f.key}`} name={f.key} type="text" maxLength={f.max} required={f.required} aria-describedby={`brief-${f.key}-hint`}
              value={values[f.key]} onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))} />
          )}
        </p>
      ))}
      <p>
        <label htmlFor="brief-links">Links to your logo, photos or clips (optional)</label><br />
        <small id="brief-links-hint">One link per line, up to {maxLinks}: Google Drive, Dropbox, WeTransfer or your website. Or reply to your receipt email with the files attached. Only send material you have permission to use.</small><br />
        <textarea id="brief-links" name="links" rows={3} aria-describedby="brief-links-hint" value={links} onChange={(e) => setLinks(e.target.value)} />
      </p>
      <button type="submit" className={styles.primary} disabled={sending || d.edits_left <= 0}>
        {sending ? 'Sending…' : d.submitted_at ? 'Update brief' : 'Send brief'}
      </button>
      <p role="status" aria-live="polite">{status?.text ?? ''}</p>
    </form>
  )
}
