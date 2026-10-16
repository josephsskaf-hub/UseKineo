'use client'
// KINEO-PACOTE-3-FILMES-1610 — botões do /admin/pedidos: pago → em produção → entregue. "Marcar entregue" pede
// confirmação (manda e-mail ao cliente) e recarrega a tela com o status novo.
import { useState } from 'react'
import { useRouter } from 'next/navigation'

const btn = { padding: '6px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--text)', fontWeight: 700, fontSize: 12.5, cursor: 'pointer', marginRight: 6, marginBottom: 6 } as const

export default function PedidosActions({ orderId, status }: { orderId: string; status: string }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  async function mover(to: 'in_production' | 'delivered') {
    if (busy) return
    if (to === 'delivered' && !window.confirm('Marcar entregue e mandar o e-mail "seus 3 filmes estão no Library" ao cliente?')) return
    setBusy(true)
    setMsg(null)
    try {
      const res = await fetch('/api/admin/dfy-films', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ order_id: orderId, status: to }) })
      const data = (await res.json().catch(() => ({}))) as { error?: string; email?: string }
      if (!res.ok) setMsg(data.error ?? `erro ${res.status}`)
      else { setMsg(to === 'delivered' ? `entregue · e-mail ${data.email ?? '?'}` : 'em produção'); router.refresh() }
    } catch {
      setMsg('falhou')
    } finally {
      setBusy(false)
    }
  }

  if (status === 'delivered') return <span style={{ color: 'var(--muted)', fontSize: 12.5 }}>—</span>
  return (
    <div>
      {status === 'paid' && <button type="button" style={btn} disabled={busy} onClick={() => mover('in_production')}>Em produção</button>}
      <button type="button" style={btn} disabled={busy} onClick={() => mover('delivered')}>Marcar entregue</button>
      {msg && <div style={{ fontSize: 12, color: 'var(--muted)' }}>{msg}</div>}
    </div>
  )
}
