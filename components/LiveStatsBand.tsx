'use client'

// KINEO-CONCORRENTES-2026-08-15 — a faixa de numeros que os concorrentes
// exibem com dados inventados ("3.2M users", "billions of views"), feita do
// nosso jeito: numeros REAIS de /api/stats/public, com os MESMOS thresholds
// de honestidade do LiveStatsBadge — se o numero nao impressiona ou a API
// falha, a secao INTEIRA some (return null). Melhor invisivel que inflado.
// KINEO-COPIA-ORCAMENTO-CONTADOR-0211 — pisos, formato e leitura vêm de lib/publicStats.ts, a régua única de todo contador
// público: a faixa e o selo logo acima dela não podem mais dizer números diferentes.
import { useEffect, useState } from 'react'
import { PUBLIC_STATS_ENDPOINT, parsePublicStats, publicStatsBandItems } from '@/lib/publicStats'

export default function LiveStatsBand() {
  const [items, setItems] = useState<Array<{ n: string; label: string }>>([])

  useEffect(() => {
    let cancelled = false
    fetch(PUBLIC_STATS_ENDPOINT)
      .then((res) => (res.ok ? (res.json() as Promise<unknown>) : null))
      .then((raw) => {
        if (!cancelled) setItems(publicStatsBandItems(parsePublicStats(raw)))
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  if (items.length < 2) return null

  return (
    <div className="statband" role="group" aria-label="Kineo live numbers">
      {items.map((item) => (
        <div key={item.label} className="statband-item">
          <span className="statband-n">{item.n}</span>
          <span className="statband-l">{item.label}</span>
        </div>
      ))}
    </div>
  )
}
