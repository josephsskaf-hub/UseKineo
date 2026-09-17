'use client'
// KINEO-FEEDBACK-DO-FILME-2026-09-16 — o botão do quadro: um clique manda o e-mail "did it match?" para a
// pessoa daquele filme (POST /api/admin/film-feedback-ask). Estado no próprio botão: pedir → enviado ✓ → já pedido.
import { useState } from 'react'

export default function PedirFeedback({ videoId, askedAt, email }: { videoId: string; askedAt: string | null; email: string | null }) {
  const [estado, setEstado] = useState<'idle' | 'sending' | 'sent' | 'already' | 'error'>(askedAt ? 'already' : 'idle')
  const [erro, setErro] = useState<string | null>(null)
  const pedir = async () => {
    if (estado === 'sending') return
    setEstado('sending')
    setErro(null)
    try {
      const r = await fetch('/api/admin/film-feedback-ask', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ video_id: videoId }) })
      const j = (await r.json().catch(() => ({}))) as { ok?: boolean; already?: boolean; error?: string }
      if (!r.ok || !j.ok) { setEstado('error'); setErro(j.error ?? `http ${r.status}`); return }
      setEstado(j.already ? 'already' : 'sent')
    } catch (e) {
      setEstado('error')
      setErro(e instanceof Error ? e.message : String(e))
    }
  }
  const rotulo = estado === 'sending' ? 'enviando…' : estado === 'sent' ? 'e-mail enviado ✓' : estado === 'already' ? 'já pedido' : estado === 'error' ? 'falhou — tentar de novo' : '✉ pedir feedback'
  const cor = estado === 'sent' ? '#34d399' : estado === 'already' ? '#6b7280' : estado === 'error' ? '#f87171' : '#2997ff'
  return (
    <span style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-start', gap: 2 }}>
      <button
        type="button"
        onClick={pedir}
        disabled={estado === 'sending' || estado === 'already' || estado === 'sent' || !email}
        title={email ? `manda o e-mail “did it match?” para ${email}` : 'pessoa sem e-mail'}
        data-kineo="pedir-feedback"
        style={{ background: 'transparent', border: `1px solid ${cor}`, color: cor, borderRadius: 8, padding: '4px 10px', fontSize: 11.5, fontWeight: 800, cursor: estado === 'idle' || estado === 'error' ? 'pointer' : 'default', whiteSpace: 'nowrap' }}
      >
        {rotulo}
      </button>
      {erro && <span style={{ color: '#f87171', fontSize: 10 }}>{erro}</span>}
    </span>
  )
}
