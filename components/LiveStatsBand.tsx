'use client'

// KINEO-CONCORRENTES-2026-08-15 — a faixa de numeros que os concorrentes
// exibem com dados inventados ("3.2M users", "billions of views"), feita do
// nosso jeito: numeros REAIS de /api/stats/public, com os MESMOS thresholds
// de honestidade do LiveStatsBadge — se o numero nao impressiona ou a API
// falha, a secao INTEIRA some (return null). Melhor invisivel que inflado.
import { useEffect, useState } from 'react'

type PublicStats = {
  ok?: boolean
  totalVideos?: number
  videosLast7Days?: number
  totalCreators?: number
}

const MIN_TOTAL_VIDEOS = 500
const MIN_CREATORS = 200
const MIN_WEEKLY = 100

function fmt(n: number): string {
  return n.toLocaleString('en-US')
}

export default function LiveStatsBand() {
  const [stats, setStats] = useState<PublicStats | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch('/api/stats/public')
      .then((res) => (res.ok ? (res.json() as Promise<PublicStats>) : null))
      .then((s) => {
        if (!cancelled && s?.ok) setStats(s)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  if (!stats) return null
  const videos = stats.totalVideos ?? 0
  const weekly = stats.videosLast7Days ?? 0
  const creators = stats.totalCreators ?? 0
  const items: Array<{ n: string; label: string }> = []
  if (videos >= MIN_TOTAL_VIDEOS) items.push({ n: fmt(videos), label: 'Shorts generated' })
  if (weekly >= MIN_WEEKLY) items.push({ n: fmt(weekly), label: 'in the last 7 days' })
  if (creators >= MIN_CREATORS) items.push({ n: fmt(creators), label: 'accounts created' })
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
