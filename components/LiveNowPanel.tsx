'use client'

// KINEO-ADMIN-LIVE-2026-08-19 — "quem está no site AGORA", no topo da tela CEO.
// Pedido do fundador depois do caso wongzeehern (SG, veio do ChatGPT, foi ao
// checkout em 2 min e hesitou): ele quer ver a pessoa quente ENQUANTO ela está
// online, com e-mail ao lado e o que ela testou, pra mandar o e-mail na hora.
//
// Auto-refresh de 30s (a janela de "online" é de 5 min, então 30s dá granularidade
// de sobra sem martelar o banco). E-mail é clicável: abre o Gmail com assunto já
// escrito conforme o CALOR do visitante — 🚨 no checkout ganha um assunto
// diferente de quem só está navegando.
import { useEffect, useState } from 'react'
import type { LiveData, LiveVisitor } from '@/app/api/admin/live/route'

const REFRESH_MS = 30_000

function flag(cc: string | null): string {
  if (!cc || cc.length !== 2) return ''
  const A = 0x1f1e6
  return String.fromCodePoint(...[...cc.toUpperCase()].map((c) => A + c.charCodeAt(0) - 65))
}

// Assunto por calor: quem está no checkout recebe a pergunta direta; quem só
// navega recebe o convite de ajuda. Copy no padrão da casa (curta, de gente).
function mailtoFor(v: LiveVisitor): string {
  const subject =
    v.heat === 3
      ? 'Anything I can fix at checkout?'
      : v.heat === 2
        ? 'Saw you making a video — need a hand?'
        : 'Founder here — anything I can help with?'
  return `mailto:${v.email}?subject=${encodeURIComponent(subject)}`
}

function heatColor(heat: number): string {
  return heat === 3 ? '#f87171' : heat === 2 ? '#fbbf24' : '#86868b'
}

export default function LiveNowPanel() {
  const [data, setData] = useState<LiveData | null>(null)
  const [err, setErr] = useState(false)

  useEffect(() => {
    let cancelled = false
    const load = () => {
      void fetch('/api/admin/live', { cache: 'no-store' })
        .then(async (r) => (r.ok ? (r.json() as Promise<LiveData>) : Promise.reject()))
        .then((d) => { if (!cancelled) { setData(d); setErr(false) } })
        .catch(() => { if (!cancelled) setErr(true) })
    }
    load()
    const t = setInterval(load, REFRESH_MS)
    return () => { cancelled = true; clearInterval(t) }
  }, [])

  const CARD: React.CSSProperties = { background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14 }

  return (
    <section className="mb-6">
      <div className="flex items-center gap-2 mb-3">
        <span className="inline-block w-2 h-2 rounded-full animate-pulse" style={{ background: '#34d399' }} />
        <h2 className="font-black tracking-tight" style={{ fontSize: '0.88rem', color: 'var(--muted2)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Live · who&apos;s on the site
        </h2>
      </div>

      {/* Placar de tráfego: 7 dias · 24h · agora */}
      <div className="grid gap-3 mb-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))' }}>
        {[
          ['Visitors 7d', data?.visitors_7d, 'var(--text)'],
          ['Visitors 24h', data?.visitors_24h, 'var(--text)'],
          ['Signups 24h', data?.signups_24h, '#2997ff'],
          ['Videos 24h', data?.videos_24h, '#a78bfa'],
          ['Checkouts 24h', data?.checkouts_24h, '#fbbf24'],
          ['🟢 Online now', data?.online_now, '#34d399'],
        ].map(([label, value, color]) => (
          <div key={label as string} className="px-3 py-2.5" style={CARD}>
            <div className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--muted2)' }}>{label}</div>
            <div className="font-black" style={{ fontSize: '1.25rem', color: color as string }}>
              {typeof value === 'number' ? value.toLocaleString('en-US') : '—'}
            </div>
          </div>
        ))}
      </div>

      {/* Lista de quem está online: mais quente primeiro */}
      <div className="overflow-x-auto" style={{ ...CARD, padding: 0 }}>
        {err && <div className="px-4 py-6 text-center text-xs" style={{ color: '#f87171' }}>Could not load live data.</div>}
        {!err && !data && <div className="px-4 py-6 text-center text-xs" style={{ color: 'var(--muted2)' }}>Loading…</div>}
        {data && data.online.length === 0 && (
          <div className="px-4 py-6 text-center text-xs" style={{ color: 'var(--muted2)' }}>
            Nobody signed-in on the site in the last 5 minutes.
          </div>
        )}
        {data && data.online.length > 0 && (
          <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,.03)' }}>
                {['Who', 'Doing now', 'Credits', 'Videos', 'From', 'Seen'].map((h) => (
                  <th key={h} className="font-black uppercase tracking-widest" style={{ fontSize: '0.58rem', color: 'var(--muted2)', textAlign: 'left', padding: '8px 12px', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.online.map((v) => (
                <tr key={v.user_id} style={{ borderTop: '1px solid var(--border)' }}>
                  <td style={{ padding: '9px 12px', whiteSpace: 'nowrap' }}>
                    <a
                      href={mailtoFor(v)}
                      title="Email this person now"
                      style={{ color: '#93c5fd', textDecoration: 'none', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: '0.8rem' }}
                    >
                      {v.email}
                    </a>
                    {v.name && <span className="ml-2" style={{ color: 'var(--muted2)', fontSize: '0.75rem' }}>{v.name}</span>}
                    {v.is_paid && (
                      <span className="ml-2 rounded px-1.5 py-0.5 text-[9px] font-black uppercase" style={{ background: 'rgba(52,211,153,.12)', color: '#34d399', border: '1px solid rgba(52,211,153,.35)' }}>sub</span>
                    )}
                  </td>
                  <td style={{ padding: '9px 12px', color: heatColor(v.heat), fontSize: '0.78rem', whiteSpace: 'nowrap' }}>{v.did.join(' · ')}</td>
                  <td style={{ padding: '9px 12px', color: (v.credits ?? 0) <= 5 ? '#fb923c' : 'var(--text)', fontSize: '0.8rem' }}>{v.credits ?? '—'}</td>
                  <td style={{ padding: '9px 12px', color: 'var(--text)', fontSize: '0.8rem' }}>{v.videos}</td>
                  <td style={{ padding: '9px 12px', color: 'var(--muted2)', fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
                    {flag(v.country)} {v.country ?? '—'}{v.source ? ` · ${v.source}` : ''}
                  </td>
                  <td style={{ padding: '9px 12px', color: 'var(--muted2)', fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
                    {v.minutes_ago === 0 ? 'now' : `${v.minutes_ago}m ago`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <p className="text-[10px] mt-2" style={{ color: 'var(--muted2)' }}>
        Online = signed-in visitor with activity in the last 5 minutes · refreshes every 30s · click the email to write them now.
      </p>
    </section>
  )
}
