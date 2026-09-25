'use client'

// KINEO-FLUXO-NOVO-2026-09-25 — os dois botões da revisão humana do Studio Ads (/admin/ads).
// Reprovar exige motivo: em três meses ninguém lembra por que um anúncio voltou (mesma regra do + créditos).
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function AdsAdminActions({ orderId }: { orderId: string }) {
  const router = useRouter()
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  async function decide(ok: boolean) {
    if (busy) return
    setBusy(true)
    setMsg(null)
    try {
      const res = await fetch('/api/admin/ads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'qa', order_id: orderId, ok, note }),
      })
      const json = await res.json().catch(() => ({}))
      if (res.ok) {
        setMsg(ok ? 'Aprovado.' : 'Reprovado — mande a versão corrigida ao cliente.')
        router.refresh()
      } else {
        setMsg(typeof json?.error === 'string' ? json.error : `Erro ${res.status}`)
      }
    } catch {
      setMsg('Falha de rede.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
      <input aria-label="Motivo da decisão" value={note} onChange={(e) => setNote(e.target.value)} placeholder="motivo (obrigatório para reprovar)" maxLength={500}
        style={{ background: '#0b0b0c', color: '#f5f5f7', border: '1px solid #2a2a2d', borderRadius: 8, padding: '6px 8px', minWidth: 220 }} />
      <button type="button" disabled={busy} onClick={() => void decide(true)}
        style={{ background: '#34d399', color: '#04130c', borderRadius: 8, padding: '6px 12px', fontWeight: 700 }}>Aprovar</button>
      <button type="button" disabled={busy} onClick={() => void decide(false)}
        style={{ background: '#f87171', color: '#1a0404', borderRadius: 8, padding: '6px 12px', fontWeight: 700 }}>Reprovar</button>
      {msg && <span role="status" style={{ fontSize: 12, color: '#86868b' }}>{msg}</span>}
    </div>
  )
}
