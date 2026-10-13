'use client'

// KINEO-AGENCIAS-2026-10-13 — o formulário curto de inscrição de agência (nome, agência, site, e-mail, nº de clientes).
// Envia para /api/agencies/apply; não cria conta. Cores só pelos tokens do site (claro/escuro seguem sozinhos).
import { useState, type FormEvent } from 'react'
import {
  AGENCY_APPLY_API_PATH,
  AGENCY_CLIENT_COUNT_OPTIONS,
  AGENCY_FIELD_LIMITS,
  AGENCY_HONEYPOT_FIELD,
} from '@/lib/growth/agencyProgram'

type State = 'idle' | 'sending' | 'done' | 'error'

const FIELD_LABELS: Record<string, string> = {
  name: 'your name',
  agency: 'agency name',
  website: 'website',
  email: 'work email',
  client_count: 'number of clients',
}

export default function AgencyApplyForm() {
  const [state, setState] = useState<State>('idle')
  const [message, setMessage] = useState('')

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (state === 'sending') return
    const form = new FormData(e.currentTarget)
    const body = Object.fromEntries(Array.from(form.entries()).map(([k, v]) => [k, typeof v === 'string' ? v : '']))
    setState('sending')
    setMessage('')
    try {
      const res = await fetch(AGENCY_APPLY_API_PATH, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const json = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string; fields?: string[] }
      if (res.ok && json.ok) {
        setState('done')
        return
      }
      setState('error')
      if (json.error === 'invalid' && Array.isArray(json.fields) && json.fields.length) {
        setMessage(`Please check: ${json.fields.map((f) => FIELD_LABELS[f] ?? f).join(', ')}.`)
      } else if (json.error === 'rate_limited') {
        setMessage('Too many applications from this connection. Please try again in an hour.')
      } else {
        setMessage('We could not save your application right now. Please email support@usekineo.com and we will reply.')
      }
    } catch {
      setState('error')
      setMessage('Connection problem. Please try again, or email support@usekineo.com.')
    }
  }

  if (state === 'done') {
    return (
      <div className="kag-done" role="status" data-testid="agency-apply-done">
        <b>Application received.</b>
        <p>We read every application ourselves and reply by email. Meanwhile, you can make your first ad free to show a client.</p>
        <a className="kag-btn kag-primary" href="/ads?from=agencies_page">Make a free sample ad →</a>
      </div>
    )
  }

  return (
    <form className="kag-form" onSubmit={onSubmit} noValidate={false} data-testid="agency-apply-form">
      <div className="kag-grid">
        <label>
          <span>Your name</span>
          <input name="name" required minLength={2} maxLength={AGENCY_FIELD_LIMITS.name} autoComplete="name" />
        </label>
        <label>
          <span>Agency</span>
          <input name="agency" required minLength={2} maxLength={AGENCY_FIELD_LIMITS.agency} autoComplete="organization" />
        </label>
        <label>
          <span>Website</span>
          <input name="website" required maxLength={AGENCY_FIELD_LIMITS.website} inputMode="url" placeholder="youragency.com" autoComplete="url" />
        </label>
        <label>
          <span>Work email</span>
          <input name="email" type="email" required maxLength={AGENCY_FIELD_LIMITS.email} autoComplete="email" />
        </label>
        <label>
          <span>Clients you manage</span>
          <select name="client_count" required defaultValue="">
            <option value="" disabled>Choose…</option>
            {AGENCY_CLIENT_COUNT_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        </label>
        <label>
          <span>Anything we should know? <em>(optional)</em></span>
          <input name="note" maxLength={AGENCY_FIELD_LIMITS.note} placeholder="Niches, countries, ad platforms…" />
        </label>
      </div>
      {/* Armadilha para robôs: fora da tela e do teclado; gente nunca preenche. */}
      <div aria-hidden="true" className="kag-hp">
        <label>Leave empty<input name={AGENCY_HONEYPOT_FIELD} tabIndex={-1} autoComplete="off" /></label>
      </div>
      <button className="kag-btn kag-primary" type="submit" disabled={state === 'sending'}>
        {state === 'sending' ? 'Sending…' : 'Apply as an agency partner'}
      </button>
      <p className="kag-fine">No account is created. We reply by email. Your details are used only to review your application.</p>
      {state === 'error' && message ? <p className="kag-err" role="alert">{message}</p> : null}
    </form>
  )
}
