'use client'
// KINEO-META95-REGUA-1910 — "Avaliar agora (régua 95)": julga até 2 entregas sem nota nova (POST /api/admin/coerencia/regua95)
// e recarrega. O cron /api/cron/regua-95 faz o mesmo sozinho a cada 10 min.
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function AvaliarRegua95({ hours }: { hours: number }) {
  const router = useRouter()
  const [estado, setEstado] = useState<'idle' | 'running' | 'error'>('idle')
  const avaliar = async () => {
    if (estado === 'running') return
    setEstado('running')
    try {
      const r = await fetch('/api/admin/coerencia/regua95', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ hours }) })
      if (!r.ok) { setEstado('error'); return }
      setEstado('idle')
      router.refresh()
    } catch {
      setEstado('error')
    }
  }
  return (
    <button
      type="button"
      onClick={avaliar}
      disabled={estado === 'running'}
      data-kineo="avaliar-regua95"
      style={{ background: 'transparent', border: `1px solid ${estado === 'error' ? '#FF8787' : '#8DB4FF'}`, color: estado === 'error' ? '#FF8787' : '#8DB4FF', borderRadius: 8, padding: '4px 10px', fontSize: 11.5, fontWeight: 800, cursor: estado === 'running' ? 'default' : 'pointer', marginLeft: 8 }}
    >
      {estado === 'running' ? 'avaliando… (até 90 s)' : estado === 'error' ? 'falhou — tentar de novo' : '⚖ Avaliar agora (régua 95)'}
    </button>
  )
}
