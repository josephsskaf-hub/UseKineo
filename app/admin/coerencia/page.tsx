// KINEO-1-COERENCIA-2026-09-16 — o quadro de coerência (fundador 16/09: "o que a pessoa escrever precisa
// estar coerente no vídeo"; R3: "todos os motores… a régua do meu olho"; R4: "quero clareza: a nota, o tipo
// de vídeo, o que a pessoa escreveu e o link abaixo… melhor navegação… e um botão para mandar um e-mail
// para aquela pessoa perguntando se o feedback foi positivo ou negativo").
// Uma linha por filme, limpa: NOTA · motor · quem/quando · o que escreveu · ▶ filme · 👍👎 · botão.
// Tudo o mais (por que a nota, narração, cena a cena) fica dobrado em "detalhes". Filtros no topo.
// Abrir a página julga o que ainda não tem nota (até 6 por vez) e grava. Gate idêntico a toda tela /admin.
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { isAdminEmail, serviceClient } from '@/app/api/admin/_shared/db'
import { ENGINE_LABEL, listFastCoherence, type FastCoherenceRow } from '@/lib/admin/fastCoherence'
import PedirFeedback from './PedirFeedback'

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
const motor = (q: string) => ENGINE_LABEL[q] ?? q
const primeiraLinha = (t: string, max = 150) => {
  const s = t.replace(/\s+/g, ' ').trim()
  return s.length > max ? `${s.slice(0, max - 1).trimEnd()}…` : s
}

const chip: React.CSSProperties = { display: 'inline-block', padding: '4px 10px', borderRadius: 999, fontSize: 11.5, fontWeight: 800, textDecoration: 'none', border: '1px solid #2a2a2d', color: '#c7c7cc' }
const chipOn: React.CSSProperties = { ...chip, background: '#e5e5ea', color: '#0a0a0c', borderColor: '#e5e5ea' }

function Linha({ r }: { r: FastCoherenceRow }) {
  const c = r.coherence
  const ai = r.engine !== 'fast'
  return (
    <div data-kineo="linha-coerencia" style={{ background: '#0f0f12', border: '1px solid #1f1f23', borderRadius: 12, padding: '12px 14px', display: 'grid', gridTemplateColumns: '64px minmax(0, 1fr) auto', gap: 14, alignItems: 'start' }}>
      {/* 1 · a nota */}
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 30, fontWeight: 900, color: corDaNota(c?.score), lineHeight: 1 }}>{c ? c.score : '—'}</div>
        <div style={{ fontSize: 9.5, color: '#8e8e93', marginTop: 4, textTransform: 'uppercase', letterSpacing: 0.4 }}>{c ? (c.verdict === 'coherent' ? 'coerente' : c.verdict === 'partial' ? 'parcial' : 'fora') : 'sem nota'}</div>
        {r.feedback && <div style={{ fontSize: 18, marginTop: 6 }} title={`a pessoa disse ${r.feedback.verdict === 'up' ? 'sim' : 'não'} em ${fmt(r.feedback.at)}`}>{r.feedback.verdict === 'up' ? '👍' : '👎'}</div>}
      </div>
      {/* 2 · motor · quem · o que escreveu · link */}
      <div style={{ minWidth: 0 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 10px', alignItems: 'baseline', fontSize: 11.5, color: '#8e8e93' }}>
          <span style={{ color: '#a78bfa', fontWeight: 900, textTransform: 'uppercase', fontSize: 11 }}>{motor(r.engine)}</span>
          <span style={{ color: '#e5e5ea', fontWeight: 700 }}>{r.email ?? r.user_id.slice(0, 8)}</span>
          <span>{fmt(r.created_at)}</span>
          {r.seconds != null && <span>{r.seconds}s</span>}
          {r.credits != null && <span>{r.credits} cr</span>}
        </div>
        <div style={{ color: '#e5e5ea', fontSize: 13.5, lineHeight: 1.4, marginTop: 6 }} title={r.topic}>
          <span style={{ color: '#8e8e93', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', marginRight: 6 }}>escreveu</span>
          {primeiraLinha(r.topic) || <em style={{ color: '#f87171' }}>prompt vazio no banco</em>}
        </div>
        <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', fontSize: 12 }}>
          {r.url ? (
            <a href={r.url} target="_blank" rel="noreferrer" data-kineo="abrir-filme" style={{ color: '#2997ff', fontWeight: 800 }}>▶ abrir o filme</a>
          ) : (
            <span style={{ color: '#6b7280' }}>sem arquivo</span>
          )}
          {c && c.summary && <span style={{ color: '#8e8e93' }}>{c.summary}</span>}
        </div>
        {r.feedback?.comment && (
          <div style={{ marginTop: 6, color: '#fde68a', fontSize: 12, borderLeft: '2px solid #fbbf24', paddingLeft: 8 }}>a pessoa escreveu: “{r.feedback.comment}”</div>
        )}
        <details style={{ marginTop: 8 }}>
          <summary style={{ color: '#6b7280', fontSize: 11, fontWeight: 800, cursor: 'pointer' }}>detalhes{c && c.problems.length ? ` · ${c.problems.length} problema${c.problems.length > 1 ? 's' : ''}` : ''}{c ? ` · texto ${c.prompt_vs_narration} · visual ${c.narration_vs_visuals ?? '—'}` : ''}</summary>
          <div style={{ marginTop: 8, display: 'grid', gap: 8 }}>
            {c && c.problems.length > 0 && (
              <ul style={{ margin: 0, paddingLeft: 18, color: '#fca5a5', fontSize: 12, lineHeight: 1.45 }}>
                {c.problems.map((p, i) => (
                  <li key={i}>{p}{c.worst_scene && i === 0 ? ` (pior cena: ${c.worst_scene})` : ''}</li>
                ))}
              </ul>
            )}
            <details>
              <summary style={{ color: '#2997ff', fontSize: 11, fontWeight: 800, cursor: 'pointer' }}>O que escreveu, inteiro ({r.topic.length} caracteres{r.topic_truncated ? ' · cortado pelo banco em 500/1.000 — filme anterior ao rastro completo' : ''})</summary>
              <pre style={{ whiteSpace: 'pre-wrap', color: '#c7c7cc', fontSize: 11.5, lineHeight: 1.45, margin: '4px 0 0', fontFamily: 'inherit', maxHeight: 240, overflow: 'auto' }}>{r.topic}</pre>
            </details>
            <details>
              <summary style={{ color: '#2997ff', fontSize: 11, fontWeight: 800, cursor: 'pointer' }}>O que foi narrado{r.narration ? '' : ' (sem registro)'}</summary>
              <pre style={{ whiteSpace: 'pre-wrap', color: '#c7c7cc', fontSize: 11.5, lineHeight: 1.45, margin: '4px 0 0', fontFamily: 'inherit', maxHeight: 240, overflow: 'auto' }}>{r.narration ?? '—'}</pre>
            </details>
            {r.scenes && r.scenes.length > 0 && (
              <details>
                <summary style={{ color: '#2997ff', fontSize: 11, fontWeight: 800, cursor: 'pointer' }}>Cena a cena ({r.scenes.length}){ai ? ' — prompt exato enviado ao gerador' : ' — fala · busca · origem · tags'}</summary>
                <table style={{ marginTop: 6, borderCollapse: 'collapse', fontSize: 11, width: '100%' }}>
                  <tbody>
                    {r.scenes.map((s) => (
                      <tr key={s.scene} style={{ borderTop: '1px solid #1f1f23', background: c?.worst_scene === s.scene ? 'rgba(248,113,113,.08)' : undefined }}>
                        <td style={{ padding: '4px 6px', color: '#8e8e93', verticalAlign: 'top', whiteSpace: 'nowrap' }}>{s.scene}</td>
                        {!ai && <td style={{ padding: '4px 6px', color: '#e5e5ea', verticalAlign: 'top' }}>{s.voiceover}</td>}
                        <td style={{ padding: '4px 6px', color: '#a78bfa', verticalAlign: 'top', whiteSpace: ai ? 'normal' : 'nowrap' }}>{s.query ?? '—'}</td>
                        <td style={{ padding: '4px 6px', color: s.sources.includes('fallbackA') || s.sources.includes('rejected') ? '#fca5a5' : s.sources.includes('aiStill') || s.sources.includes('aiVideo') ? '#34d399' : '#c7c7cc', verticalAlign: 'top', whiteSpace: 'nowrap' }}>{s.sources.join('+') || 'none'}</td>
                        {!ai && <td style={{ padding: '4px 6px', color: '#6b7280', verticalAlign: 'top' }}>{s.tags.slice(0, 2).join(' | ').slice(0, 140)}</td>}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </details>
            )}
          </div>
        </details>
      </div>
      {/* 3 · o botão */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
        <PedirFeedback videoId={r.video_id} askedAt={r.feedback_asked_at} email={r.email} />
        {r.feedback_asked_at && <span style={{ color: '#6b7280', fontSize: 10 }}>pedido em {fmt(r.feedback_asked_at)}</span>}
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

  const one = (k: string) => (Array.isArray(searchParams?.[k]) ? (searchParams?.[k] as string[])[0] : (searchParams?.[k] as string | undefined))
  const hoursRaw = Number(one('hours'))
  const hours = Number.isFinite(hoursRaw) && hoursRaw > 0 ? hoursRaw : 48
  const incluirCasa = one('casa') === '1'
  const engine = (one('engine') ?? '').trim() || undefined
  const so = one('so') // 'fora' | 'parcial' | 'semfeedback'
  const todas = await listFastCoherence(admin, { hours, limit: 150, engine, maxCompute: 6, excludeEmails: incluirCasa ? [] : FOUNDER })
  const rows = todas.filter((r) => {
    if (so === 'fora') return r.coherence?.verdict === 'off'
    if (so === 'parcial') return r.coherence?.verdict === 'partial'
    if (so === 'baixo') return !!r.coherence && r.coherence.score < 75
    if (so === 'semfeedback') return !r.feedback && !r.feedback_asked_at
    return true
  })
  const comNota = todas.filter((r) => r.coherence)
  const media = comNota.length ? Math.round(comNota.reduce((a, r) => a + (r.coherence?.score ?? 0), 0) / comNota.length) : null
  const semNota = todas.length - comNota.length

  // Placar por motor (a régua do olho do fundador, um número por motor).
  const porMotor = new Map<string, { n: number; soma: number; comNota: number; off: number; up: number; down: number }>()
  for (const r of todas) {
    const m = porMotor.get(r.engine) ?? { n: 0, soma: 0, comNota: 0, off: 0, up: 0, down: 0 }
    m.n++
    if (r.coherence) { m.comNota++; m.soma += r.coherence.score; if (r.coherence.verdict === 'off') m.off++ }
    if (r.feedback?.verdict === 'up') m.up++
    if (r.feedback?.verdict === 'down') m.down++
    porMotor.set(r.engine, m)
  }
  const q = (extra: Record<string, string | undefined>) => {
    const p = new URLSearchParams()
    const merged: Record<string, string | undefined> = { hours: String(hours), engine, so, casa: incluirCasa ? '1' : undefined, ...extra }
    for (const [k, v] of Object.entries(merged)) if (v) p.set(k, v)
    return `/admin/coerencia?${p.toString()}`
  }

  return (
    <main style={{ background: '#050507', minHeight: '100vh', color: '#e5e5ea', fontFamily: 'system-ui, -apple-system, sans-serif', padding: '22px 18px 60px' }}>
      <div style={{ maxWidth: 1040, margin: '0 auto' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'baseline', marginBottom: 12 }}>
          <h1 style={{ fontSize: 20, fontWeight: 900, margin: 0 }}>Coerência</h1>
          <span style={{ color: '#8e8e93', fontSize: 12 }}>nota do juiz (0-100) = o que a pessoa escreveu × o que foi narrado × o que cada cena mostrou · 👍👎 = o que a pessoa disse</span>
          <span style={{ marginLeft: 'auto', fontSize: 12 }}>
            <Link href="/admin" style={{ color: '#2997ff' }}>CEO</Link> · <Link href="/admin/people" style={{ color: '#2997ff' }}>People</Link>
          </span>
        </div>

        {/* filtros — uma linha, chips */}
        <div data-kineo="filtros" style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center', marginBottom: 10 }}>
          <span style={{ color: '#6b7280', fontSize: 11, marginRight: 2 }}>janela</span>
          {[['24', '24h'], ['48', '48h'], ['168', '7 dias']].map(([h, l]) => (
            <Link key={h} href={q({ hours: h })} style={String(hours) === h ? chipOn : chip}>{l}</Link>
          ))}
          <span style={{ color: '#6b7280', fontSize: 11, marginLeft: 10, marginRight: 2 }}>motor</span>
          <Link href={q({ engine: undefined })} style={!engine ? chipOn : chip}>todos</Link>
          {Array.from(porMotor.entries()).sort((a, b) => b[1].n - a[1].n).map(([eng, m]) => (
            <Link key={eng} href={q({ engine: engine === eng ? undefined : eng })} style={engine === eng ? chipOn : chip}>{motor(eng)} <span style={{ opacity: 0.7 }}>{m.n}</span></Link>
          ))}
          <span style={{ color: '#6b7280', fontSize: 11, marginLeft: 10, marginRight: 2 }}>só</span>
          {[['baixo', 'nota < 75'], ['fora', 'fora do pedido'], ['parcial', 'parciais'], ['semfeedback', 'sem feedback pedido']].map(([k, l]) => (
            <Link key={k} href={q({ so: so === k ? undefined : k })} style={so === k ? chipOn : chip}>{l}</Link>
          ))}
          <Link href={q({ casa: incluirCasa ? undefined : '1' })} style={incluirCasa ? chipOn : chip}>{incluirCasa ? 'com a casa' : '+ casa'}</Link>
        </div>

        {/* placar por motor */}
        <table style={{ borderCollapse: 'collapse', fontSize: 12, marginBottom: 16 }} data-kineo="placar-por-motor">
          <thead>
            <tr style={{ color: '#8e8e93', textAlign: 'left' }}>
              <th style={{ padding: '4px 12px 4px 0', fontWeight: 700 }}>motor</th><th style={{ padding: '4px 12px', fontWeight: 700 }}>filmes</th><th style={{ padding: '4px 12px', fontWeight: 700 }}>média</th><th style={{ padding: '4px 12px', fontWeight: 700 }}>fora do pedido</th><th style={{ padding: '4px 12px', fontWeight: 700 }}>👍</th><th style={{ padding: '4px 12px', fontWeight: 700 }}>👎</th>
            </tr>
          </thead>
          <tbody>
            {Array.from(porMotor.entries()).sort((a, b) => b[1].n - a[1].n).map(([eng, m]) => (
              <tr key={eng} style={{ borderTop: '1px solid #1f1f23' }}>
                <td style={{ padding: '5px 12px 5px 0', fontWeight: 800, color: '#e5e5ea' }}>{motor(eng)}</td>
                <td style={{ padding: '5px 12px' }}>{m.n}</td>
                <td style={{ padding: '5px 12px', fontWeight: 900, color: corDaNota(m.comNota ? Math.round(m.soma / m.comNota) : null) }}>{m.comNota ? Math.round(m.soma / m.comNota) : '—'}{m.comNota < m.n ? <span style={{ color: '#6b7280', fontWeight: 400 }}> ({m.comNota}/{m.n})</span> : null}</td>
                <td style={{ padding: '5px 12px', color: m.off ? '#f87171' : '#8e8e93' }}>{m.off}</td>
                <td style={{ padding: '5px 12px' }}>{m.up}</td>
                <td style={{ padding: '5px 12px' }}>{m.down}</td>
              </tr>
            ))}
            <tr style={{ borderTop: '1px solid #2a2a2d', color: '#8e8e93' }}>
              <td style={{ padding: '5px 12px 5px 0' }}>todos</td>
              <td style={{ padding: '5px 12px' }}>{todas.length}</td>
              <td style={{ padding: '5px 12px', fontWeight: 900, color: corDaNota(media) }}>{media ?? '—'}</td>
              <td style={{ padding: '5px 12px' }}>{comNota.filter((r) => r.coherence?.verdict === 'off').length}</td>
              <td style={{ padding: '5px 12px' }}>{todas.filter((r) => r.feedback?.verdict === 'up').length}</td>
              <td style={{ padding: '5px 12px' }}>{todas.filter((r) => r.feedback?.verdict === 'down').length}</td>
            </tr>
          </tbody>
        </table>
        {semNota > 0 && <div style={{ color: '#8e8e93', fontSize: 12, marginBottom: 10 }}>{semNota} filme{semNota > 1 ? 's' : ''} ainda sem nota — recarregue a página (o juiz avalia 6 por vez).</div>}

        <div style={{ display: 'grid', gap: 8 }}>
          {rows.map((r) => (
            <Linha key={r.video_id} r={r} />
          ))}
          {rows.length === 0 && <div style={{ color: '#8e8e93' }}>Nenhum filme com esse filtro.</div>}
        </div>
      </div>
    </main>
  )
}
