'use client'
import { useState } from 'react'
type Preview = { eligible: number; expires: number; reviewToken: string; recipients: Array<{ id: string; email: string; subject: string; text: string }> }

export default function MrrReactivationReview() {
  const [preview, setPreview] = useState<Preview | null>(null)
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState('Nenhum e-mail enviado. A prévia só lê dados.')
  const [approved, setApproved] = useState(false)
  async function load() {
    setBusy(true); setApproved(false); setPreview(null)
    try {
      const res = await fetch('/api/admin/mrr-reactivation', { cache: 'no-store' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Prévia indisponível')
      setPreview(data); setResult(`Prévia: ${data.eligible} elegíveis; ${data.recipients.length} neste lote. Zero envios.`)
    } catch (e) { setResult(e instanceof Error ? e.message : 'Prévia indisponível') }
    finally { setBusy(false) }
  }
  async function send() {
    if (busy || !approved || !preview || preview.recipients.length === 0) return
    const reviewed = preview
    setBusy(true); setApproved(false); setPreview(null)
    try {
      const res = await fetch('/api/admin/mrr-reactivation', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dryRun: false, confirm: 'SEND_REVIEWED_READY_FILMS', ids: reviewed.recipients.map(p => p.id), expires: reviewed.expires, reviewToken: reviewed.reviewToken }) })
      const data = await res.json()
      setResult(JSON.stringify(data, null, 2))
    } catch { setResult('Resultado desconhecido. Consulte o ledger antes de tentar qualquer novo envio.') }
    finally { setBusy(false) }
  }
  return <main style={{ maxWidth: 900, margin: '32px auto', padding: 20, color: 'var(--text)' }}>
    <h1>Reativação MRR — filme pronto</h1>
    <p>Somente Joseph. O link abre esta revisão; não dispara mensagens. Nenhuma geração nova. Cada pessoa deve ter filme entregue, não ter pagamento, respeitar supressões e ficar fora do resgate de checkout. No máximo 10 por clique; envio não comprova entrega ou compra.</p>
    <button type="button" disabled={busy} onClick={load}>Carregar prévia sem enviar</button>
    <pre role="status" style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{result}</pre>
    {preview?.recipients.map(person => <article key={person.id} style={{ padding: 16, margin: '12px 0', border: '1px solid var(--border)', borderRadius: 12 }}>
      <strong>{person.email}</strong><p>{person.subject}</p><pre style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{person.text}</pre>
    </article>)}
    {preview && preview.recipients.length > 0 && <>
      <label><input type="checkbox" checked={approved} onChange={e => setApproved(e.target.checked)} /> Sou Joseph e revisei os destinatários e textos acima. Quero enviar este lote agora.</label>
      <button type="button" disabled={busy || !approved} onClick={send} style={{ display: 'block', marginTop: 16 }}>Enviar somente este lote revisado</button>
      <p>A revisão expira em 10 minutos. Nova elegibilidade é conferida no clique. Falha ou resultado ambíguo não gera reenvio automático.</p>
    </>}
  </main>
}
