'use client'
// KINEO-PACOTE-3-FILMES-1610 — o formulário do pacote "3 filmes": tema + língua (16) + estilo opcional → "Pay US$19".
// 1) POST /api/dfy-films/order salva o briefing (o tema nunca vai na URL); 2) o navegador vai para o checkout com o id
// do pedido (GET, padrão iOS-safe da casa). Botão travado enquanto pede: um clique = um pedido.
import { useState, type FormEvent } from 'react'

const field = { width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: 15 } as const
const label = { display: 'block', fontSize: 13.5, fontWeight: 700, margin: '14px 0 6px' } as const

export default function DoneForYouForm({ price, languages, topicMax, styleMax }: { price: string; languages: Array<{ code: string; native: string }>; topicMax: number; styleMax: number }) {
  const [topic, setTopic] = useState('')
  const [language, setLanguage] = useState('en')
  const [style, setStyle] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (busy) return
    setBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/dfy-films/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, language, style }),
      })
      const data = (await res.json().catch(() => ({}))) as { checkout?: string; error?: string; signin?: string }
      if (res.status === 401 && data.signin) { window.location.href = data.signin; return }
      if (!res.ok || !data.checkout) { setError(data.error ?? 'Something went wrong. Please try again.'); setBusy(false); return }
      window.location.href = data.checkout
    } catch {
      setError('Something went wrong. Please try again.')
      setBusy(false)
    }
  }

  return (
    <form onSubmit={onSubmit} data-testid="dfy-form">
      <label htmlFor="dfy-topic" style={{ ...label, marginTop: 0 }}>Topic</label>
      <textarea id="dfy-topic" required minLength={8} maxLength={topicMax} rows={4} value={topic} onChange={(e) => setTopic(e.target.value)}
        placeholder="e.g. 3 strange facts about the deep ocean" style={{ ...field, resize: 'vertical' }} />
      <label htmlFor="dfy-language" style={label}>Language of the narration</label>
      <select id="dfy-language" value={language} onChange={(e) => setLanguage(e.target.value)} style={field}>
        {languages.map((l) => <option key={l.code} value={l.code}>{l.native}</option>)}
      </select>
      <label htmlFor="dfy-style" style={label}>Style <span style={{ fontWeight: 500, color: 'var(--muted)' }}>(optional)</span></label>
      <input id="dfy-style" maxLength={styleMax} value={style} onChange={(e) => setStyle(e.target.value)} placeholder="e.g. dark and cinematic, calm narrator" style={field} />
      {error && <p role="alert" style={{ color: 'var(--danger, #d43b3b)', fontSize: 14, margin: '12px 0 0' }}>{error}</p>}
      <button type="submit" disabled={busy} data-testid="dfy-pay"
        style={{ marginTop: 18, width: '100%', minHeight: 48, borderRadius: 12, border: 0, background: 'var(--accent, #2997ff)', color: '#fff', fontWeight: 800, fontSize: 16, cursor: busy ? 'wait' : 'pointer', opacity: busy ? 0.7 : 1 }}>
        {busy ? 'Opening payment…' : `Pay ${price}`}
      </button>
    </form>
  )
}
