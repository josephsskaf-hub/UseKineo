'use client'
// KINEO-ADMIN-RAPIDO-1710 — "Avaliar pendentes": o juiz de coerência saiu da ABERTURA da página. Um clique julga até 6 filmes
// sem nota da janela que está na tela (POST /api/admin/coerencia/avaliar) e recarrega. O cron quality-radar faz o mesmo
// sozinho a cada 15 min.
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function AvaliarPendentes({ hours, engine, casa, pendentes }: { hours: number; engine?: string; casa: boolean; pendentes: number }) {
  const router = useRouter()
  const [estado, setEstado] = useState<'idle' | 'running' | 'error'>('idle')
  const avaliar = async () => {
    if (estado === 'running') return
    setEstado('running')
    try {
      const r = await fetch('/api/admin/coerencia/avaliar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ hours, engine: engine ?? null, casa }) })
      if (!r.ok) { setEstado('error'); return }
      setEstado('idle')
      router.refresh()
    } catch {
      setEstado('error')
    }
  }
  const rotulo = estado === 'running' ? 'avaliando… (até 15 s)' : estado === 'error' ? 'falhou — tentar de novo' : `⚖ Avaliar pendentes (${Math.min(pendentes, 6)} de ${pendentes})`
  return (
    <button
      type="button"
      onClick={avaliar}
      disabled={estado === 'running' || pendentes === 0}
      data-kineo="avaliar-pendentes"
      style={{ background: 'transparent', border: `1px solid ${estado === 'error' ? '#FF8787' : '#8DB4FF'}`, color: estado === 'error' ? '#FF8787' : '#8DB4FF', borderRadius: 8, padding: '4px 10px', fontSize: 11.5, fontWeight: 800, cursor: estado === 'running' ? 'default' : 'pointer', marginLeft: 8 }}
    >
      {rotulo}
    </button>
  )
}
