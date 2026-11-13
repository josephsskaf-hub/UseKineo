'use client'
// KINEO-CAMINHOS-DO-VIDEO-1311 [dono 13/11 05:40, testando pelo celular: "Ainda não achei meus vídeos, movimentação tá bem confusa, arruma todos os
// caminhos"] — "My videos" existe em três telas (/library, /history e /my-videos) e só a Library mostrava Recreate e clipe (linhas da tabela
// `clips`). Quem ia pelo menu da conta caía no /history e não achava o vídeo que tinha acabado de fazer. Esta estante mostra os prontos mais novos
// no topo das outras duas telas também, com o atalho para a Library. Só leitura (/api/clips); nada de cobrança nem de geração.
import { useEffect, useState } from 'react'
import Link from 'next/link'

type Clipe = { id: string; seconds: number; status: string; video_url: string | null }

export default function RecreateShelf() {
  const [clipes, setClipes] = useState<Clipe[]>([])
  useEffect(() => {
    let vivo = true
    fetch('/api/clips', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (vivo && Array.isArray(d?.clips)) setClipes((d.clips as Clipe[]).filter((c) => c.status === 'done' && !!c.video_url).slice(0, 6)) })
      .catch(() => {})
    return () => { vivo = false }
  }, [])
  if (clipes.length === 0) return null
  return (
    <section aria-label="Recreate and clips" data-recreate-shelf="1" style={{ maxWidth: 1240, margin: '0 auto', padding: '16px 16px 4px' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, marginBottom: 10 }}>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--text, #111)' }}>Recreate and clips</h2>
        <Link href="/library" style={{ fontSize: 14, fontWeight: 600, color: 'var(--accent, #0a5cff)', textDecoration: 'underline' }}>See all in Library ↗</Link>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12 }}>
        {clipes.map((c) => (
          <div key={c.id} style={{ border: '1px solid var(--border, #d9dde5)', borderRadius: 14, padding: 8, background: 'var(--card, #fff)' }}>
            <video src={c.video_url ?? undefined} controls playsInline preload="metadata" style={{ width: '100%', borderRadius: 10, display: 'block', background: '#000' }} />
            <a href={c.video_url ?? undefined} download style={{ display: 'inline-block', marginTop: 8, fontSize: 14, fontWeight: 600, color: 'var(--text, #111)', textDecoration: 'underline' }}>Download ↓</a>
          </div>
        ))}
      </div>
    </section>
  )
}
