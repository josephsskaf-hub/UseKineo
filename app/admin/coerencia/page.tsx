// KINEO-1-COERENCIA-2026-09-16 — o quadro de coerência do Kineo 1 (fundador 16/09: "o que a pessoa
// escrever precisa estar coerente no vídeo"). Cada linha = um filme do Kineo 1: quem, quando, o que
// ESCREVEU, o que foi NARRADO, o plano visual cena a cena (busca · origem · tags) e a NOTA 0-100 com
// os problemas nomeados pelo juiz. Abrir a página julga o que ainda não tem nota (até 6 por vez) e
// grava; recarregar julga os próximos. Gate idêntico a toda tela /admin.
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { isAdminEmail, serviceClient } from '@/app/api/admin/_shared/db'
import { listFastCoherence, type FastCoherenceRow } from '@/lib/admin/fastCoherence'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'
export const runtime = 'nodejs'

const FOUNDER = ['josephsskaf@gmail.com']

function corDaNota(score: number | null | undefined): string {
  if (score == null) return '#6b7280'
  if (score >= 75) return '#34d399'
  if (score >= 50) return '#fbbf24'
  return '#f87171'
}
function fmt(iso: string): string {
  const d = new Date(iso)
  return `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')} ${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}Z`
}

function Linha({ r }: { r: FastCoherenceRow }) {
  const c = r.coherence
  return (
    <div style={{ background: '#0f0f12', border: `1px solid ${c ? corDaNota(c.score) + '66' : '#2a2a2d'}`, borderRadius: 12, padding: '12px 14px', display: 'grid', gridTemplateColumns: '88px 1fr', gap: 14 }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 30, fontWeight: 900, color: corDaNota(c?.score), lineHeight: 1 }}>{c ? c.score : '—'}</div>
        <div style={{ fontSize: 10, color: '#8e8e93', marginTop: 4, textTransform: 'uppercase', letterSpacing: 0.4 }}>{c ? c.verdict : 'sem nota'}</div>
        {c && (
          <div style={{ fontSize: 10, color: '#6b7280', marginTop: 6, lineHeight: 1.4 }}>
            texto {c.prompt_vs_narration}
            <br />
            visual {c.narration_vs_visuals ?? '—'}
          </div>
        )}
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'baseline', fontSize: 11.5, color: '#8e8e93' }}>
          <span style={{ color: '#e5e5ea', fontWeight: 700 }}>{r.email ?? r.user_id.slice(0, 8)}</span>
          <span>{fmt(r.created_at)}</span>
          {r.seconds != null && <span>{r.seconds}s</span>}
          {r.credits != null && <span>{r.credits} cr</span>}
          <span>
            {Object.entries(r.sources).map(([k, n]) => `${k} ${n}`).join(' · ') || 'plano visual não registrado (filme anterior ao rastro)'}
          </span>
          {r.url && (
            <a href={r.url} target="_blank" rel="noreferrer" style={{ color: '#2997ff', fontWeight: 700 }}>
              ▶ abrir filme
            </a>
          )}
        </div>
        {c && c.summary && <div style={{ color: '#e5e5ea', fontSize: 12.5, marginTop: 6 }}>{c.summary}</div>}
        {c && c.problems.length > 0 && (
          <ul style={{ margin: '6px 0 0', paddingLeft: 18, color: '#fca5a5', fontSize: 12, lineHeight: 1.45 }}>
            {c.problems.map((p, i) => (
              <li key={i}>{p}{c.worst_scene && i === 0 ? ` (pior cena: ${c.worst_scene})` : ''}</li>
            ))}
          </ul>
        )}
        <details style={{ marginTop: 8 }}>
          <summary style={{ color: '#2997ff', fontSize: 11, fontWeight: 800, cursor: 'pointer' }}>O que escreveu ({r.topic.length} caracteres)</summary>
          <pre style={{ whiteSpace: 'pre-wrap', color: '#c7c7cc', fontSize: 11.5, lineHeight: 1.45, margin: '4px 0 0', fontFamily: 'inherit', maxHeight: 240, overflow: 'auto' }}>{r.topic}</pre>
        </details>
        <details style={{ marginTop: 4 }}>
          <summary style={{ color: '#2997ff', fontSize: 11, fontWeight: 800, cursor: 'pointer' }}>O que foi narrado{r.narration ? '' : ' (sem registro)'}</summary>
          <pre style={{ whiteSpace: 'pre-wrap', color: '#c7c7cc', fontSize: 11.5, lineHeight: 1.45, margin: '4px 0 0', fontFamily: 'inherit', maxHeight: 240, overflow: 'auto' }}>{r.narration ?? '—'}</pre>
        </details>
        {r.scenes && r.scenes.length > 0 && (
          <details style={{ marginTop: 4 }}>
            <summary style={{ color: '#2997ff', fontSize: 11, fontWeight: 800, cursor: 'pointer' }}>Cena a cena ({r.scenes.length})</summary>
            <table style={{ marginTop: 6, borderCollapse: 'collapse', fontSize: 11, width: '100%' }}>
              <tbody>
                {r.scenes.map((s) => (
                  <tr key={s.scene} style={{ borderTop: '1px solid #1f1f23', background: c?.worst_scene === s.scene ? 'rgba(248,113,113,.08)' : undefined }}>
                    <td style={{ padding: '4px 6px', color: '#8e8e93', verticalAlign: 'top', whiteSpace: 'nowrap' }}>{s.scene}</td>
                    <td style={{ padding: '4px 6px', color: '#e5e5ea', verticalAlign: 'top' }}>{s.voiceover}</td>
                    <td style={{ padding: '4px 6px', color: '#a78bfa', verticalAlign: 'top', whiteSpace: 'nowrap' }}>{s.query ?? '—'}</td>
                    <td style={{ padding: '4px 6px', color: s.sources.includes('fallbackA') ? '#fca5a5' : s.sources.includes('aiStill') ? '#34d399' : '#c7c7cc', verticalAlign: 'top', whiteSpace: 'nowrap' }}>{s.sources.join('+') || 'none'}</td>
                    <td style={{ padding: '4px 6px', color: '#6b7280', verticalAlign: 'top' }}>{s.tags.slice(0, 2).join(' | ').slice(0, 140)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </details>
        )}
      </div>
    </div>
  )
}

export default async function AdminCoerenciaPage({ searchParams }: { searchParams?: Record<string, string | string[] | undefined> }) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const email = user?.email?.toLowerCase() ?? ''
  if (!user || !isAdminEmail(email)) {
    return <div style={{ padding: 40, color: '#e5e5ea', fontFamily: 'system-ui' }}>403</div>
  }
  const admin = serviceClient()
  if (!admin) return <div style={{ padding: 40, color: '#e5e5ea' }}>service unavailable</div>

  const hoursRaw = Number(Array.isArray(searchParams?.hours) ? searchParams?.hours[0] : searchParams?.hours)
  const hours = Number.isFinite(hoursRaw) && hoursRaw > 0 ? hoursRaw : 48
  const incluirCasa = (Array.isArray(searchParams?.casa) ? searchParams?.casa[0] : searchParams?.casa) === '1'
  const rows = await listFastCoherence(admin, { hours, limit: 150, maxCompute: 6, excludeEmails: incluirCasa ? [] : FOUNDER })
  const comNota = rows.filter((r) => r.coherence)
  const media = comNota.length ? Math.round(comNota.reduce((a, r) => a + (r.coherence?.score ?? 0), 0) / comNota.length) : null
  const off = comNota.filter((r) => r.coherence?.verdict === 'off').length
  const parcial = comNota.filter((r) => r.coherence?.verdict === 'partial').length
  const semNota = rows.length - comNota.length

  return (
    <main style={{ background: '#050507', minHeight: '100vh', color: '#e5e5ea', fontFamily: 'system-ui, -apple-system, sans-serif', padding: '22px 18px 60px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'baseline', marginBottom: 6 }}>
          <h1 style={{ fontSize: 20, fontWeight: 900, margin: 0 }}>Coerência · Kineo 1</h1>
          <span style={{ color: '#8e8e93', fontSize: 12 }}>o que a pessoa escreveu × o que foi narrado × o que cada cena mostrou</span>
          <span style={{ marginLeft: 'auto', fontSize: 12 }}>
            <Link href="/admin" style={{ color: '#2997ff' }}>CEO</Link> · <Link href="/admin/people" style={{ color: '#2997ff' }}>People</Link>
          </span>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, fontSize: 12, color: '#8e8e93', marginBottom: 14 }}>
          <span>janela {hours}h · {rows.length} filmes</span>
          <span>média <b style={{ color: corDaNota(media) }}>{media ?? '—'}</b></span>
          <span>fora do pedido <b style={{ color: '#f87171' }}>{off}</b></span>
          <span>parciais <b style={{ color: '#fbbf24' }}>{parcial}</b></span>
          {semNota > 0 && <span>sem nota ainda <b>{semNota}</b> (recarregue: 6 por vez)</span>}
          <span>
            <Link href="/admin/coerencia?hours=24" style={{ color: '#2997ff' }}>24h</Link> · <Link href="/admin/coerencia?hours=48" style={{ color: '#2997ff' }}>48h</Link> ·{' '}
            <Link href="/admin/coerencia?hours=168" style={{ color: '#2997ff' }}>7d</Link> · <Link href={`/admin/coerencia?hours=${hours}&casa=1`} style={{ color: '#2997ff' }}>+casa</Link>
          </span>
        </div>
        <div style={{ display: 'grid', gap: 10 }}>
          {rows.map((r) => (
            <Linha key={r.video_id} r={r} />
          ))}
          {rows.length === 0 && <div style={{ color: '#8e8e93' }}>Nenhum filme do Kineo 1 na janela.</div>}
        </div>
      </div>
    </main>
  )
}
