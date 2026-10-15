'use client'
// KINEO-DEMO-SOB-MEDIDA-1510 — a tela /admin/demo: colar o link do produto da marca que RESPONDEU, gerar a demo (Comercial 15 s na
// conta da casa) e, quando pronta, copiar o link privado "Sample made by Kineo for <Brand>" + o texto curto EN/ES/DE.
// Só fala com /api/admin/demo. `initial` = dados de exemplo (prévia offline); sem ele, a tela busca o GET.
import { useCallback, useEffect, useState } from 'react'
import { DEMO_ERRORS, DEMO_REASON_MIN, DEMO_SCENE_MAX, DEMO_VOICE_LANGS, DEMO_VOICE_NAMES, type DemoVoiceLang } from '@/lib/ads/demoSobMedida'

export interface DemoRow {
  order_id: string
  brand: string
  host: string
  link: string
  voice: string
  created_at: string
  status: 'fazendo' | 'pronta' | 'falhou'
  order_status: string | null
  formats: { format: string; status: string }[]
  approval: { url: string; status: string; comment: string | null; viewed: boolean } | null
  messages: { en: string; es: string; de: string } | null
  exception: boolean
  exception_reason: string | null
}
export interface DemoData {
  house: boolean
  week: string
  count: number | null
  cap: number
  balance: number | null
  cost: number
  fal: { state: 'ok' | 'refused' | 'not_measured'; last_refusal_at: string | null }
  rows: DemoRow[]
  list_error?: boolean
}

const CSS = `
.dm{max-width:1100px;margin:0 auto;padding:28px 20px 80px;color:var(--text,#F2F4F7)}
.dm *{box-sizing:border-box}
.dm h1{margin:0 0 4px;font-size:24px}
.dm-sub{margin:0 0 20px;color:var(--muted,#9AA3B2);font-size:13px;max-width:760px}
.dm-kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px;margin-bottom:16px}
.dm-card{background:var(--card,#10141B);border:1px solid var(--border,#1F2530);border-radius:16px;padding:16px}
.dm-k{margin:0;color:var(--muted,#9AA3B2);font-size:11px;text-transform:uppercase;letter-spacing:.08em}
.dm-v{margin:6px 0 0;font-size:22px;font-weight:750}
.dm-v small{font-size:13px;color:var(--muted,#9AA3B2);font-weight:500}
.dm-ok{color:var(--success,#5FD4A4)}.dm-warn{color:var(--warning,#FFBF58)}.dm-bad{color:var(--danger,#FF8787)}
.dm form{display:grid;grid-template-columns:1fr 1fr;gap:12px 16px}
@media (max-width:720px){.dm form{grid-template-columns:1fr}}
.dm label{display:grid;gap:6px;font-size:12px;color:var(--text2,#C9CFD8);font-weight:650}
.dm input,.dm select,.dm textarea{width:100%;min-height:40px;padding:9px 12px;border-radius:10px;border:1px solid var(--border2,#2E3644);background:var(--card2,#161B24);color:var(--text,#F2F4F7);font:inherit;font-size:14px}
.dm textarea{min-height:64px;resize:vertical}
.dm .full{grid-column:1/-1}
.dm-check{display:flex!important;grid-template-columns:none!important;align-items:center;gap:8px;font-weight:600}
.dm-check input{width:18px;min-height:18px}
.dm-btn{min-height:44px;padding:10px 20px;border-radius:10px;border:0;background:var(--accent,#8DB4FF);color:var(--on-accent,#04122E);font:inherit;font-weight:750;cursor:pointer}
.dm-btn:disabled{opacity:.55;cursor:default}
.dm-ghost{min-height:32px;padding:5px 12px;border-radius:8px;border:1px solid var(--border2,#2E3644);background:transparent;color:var(--text2,#C9CFD8);font:inherit;font-size:12px;cursor:pointer}
.dm-msg{margin:12px 0 0;font-size:13px;font-weight:650}
.dm-list{display:grid;gap:12px;margin-top:8px}
.dm-row-h{display:flex;flex-wrap:wrap;align-items:center;gap:10px;justify-content:space-between}
.dm-row-h h3{margin:0;font-size:16px}
.dm-pill{display:inline-flex;align-items:center;gap:6px;padding:3px 10px;border-radius:999px;font-size:12px;font-weight:700;border:1px solid currentColor}
.dm-meta{margin:6px 0 0;color:var(--muted,#9AA3B2);font-size:12px;overflow-wrap:anywhere}
.dm-fmts{display:flex;gap:6px;flex-wrap:wrap;margin-top:10px}
.dm-fmt{padding:2px 8px;border-radius:6px;background:var(--card2,#161B24);font-size:12px}
.dm-link{display:flex;gap:8px;align-items:center;margin-top:12px;flex-wrap:wrap}
.dm-link code{flex:1 1 280px;min-width:0;padding:8px 10px;border-radius:8px;background:var(--card2,#161B24);font-size:12px;overflow-wrap:anywhere}
.dm-texts{display:grid;gap:8px;margin-top:10px}
.dm-text{display:grid;grid-template-columns:34px 1fr auto;gap:8px;align-items:start;font-size:13px;color:var(--text2,#C9CFD8)}
.dm-text b{color:var(--muted,#9AA3B2);font-size:11px;padding-top:2px}
.dm-empty{color:var(--muted,#9AA3B2);font-size:13px}
.dm-rule{margin:16px 0 0;color:var(--muted,#9AA3B2);font-size:12px}
`

const brt = (iso: string | null) => {
  if (!iso) return '—'
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', dateStyle: 'short', timeStyle: 'short' })
}
const STATUS_TXT: Record<DemoRow['status'], { t: string; c: string }> = { fazendo: { t: 'fazendo', c: 'dm-warn' }, pronta: { t: 'pronta', c: 'dm-ok' }, falhou: { t: 'falhou', c: 'dm-bad' } }
const APPROVAL_TXT: Record<string, string> = { pending: 'aguardando a marca', approved: 'APROVADA pela marca', changes_requested: 'a marca pediu ajuste', revoked: 'link desligado', expired: 'link vencido' }
const FMT_TXT: Record<string, string> = { delivered: 'pronto', rendering: 'montando', failed: 'falhou', generating: 'gerando', assembling: 'montando', planned: 'planejado' }

function copy(text: string) {
  try { void navigator.clipboard.writeText(text) } catch { /* sem área de transferência: o texto está à vista */ }
}

export default function DemoClient({ denied, initial }: { denied?: boolean; initial?: DemoData }) {
  const [data, setData] = useState<DemoData | null>(initial ?? null)
  const [loadErr, setLoadErr] = useState<string | null>(null)
  const [link, setLink] = useState('')
  const [brand, setBrand] = useState('')
  const [voice, setVoice] = useState<DemoVoiceLang>('en')
  const [scene, setScene] = useState('')
  const [exception, setException] = useState(false)
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState<{ kind: 'ok' | 'bad'; text: string } | null>(null)

  const load = useCallback(async () => {
    try {
      const r = await fetch('/api/admin/demo', { cache: 'no-store' })
      const d = (await r.json().catch(() => ({}))) as DemoData & { error?: string }
      if (!r.ok) { setLoadErr(DEMO_ERRORS[d.error ?? ''] ?? 'Não consegui ler as demos.'); return }
      setData(d)
      setLoadErr(null)
    } catch {
      setLoadErr('Não consegui ler as demos.')
    }
  }, [])

  useEffect(() => {
    if (denied || initial) return
    void load()
    const t = window.setInterval(() => void load(), 60_000)
    return () => window.clearInterval(t)
  }, [denied, initial, load])

  if (denied) return <main className="dm"><style dangerouslySetInnerHTML={{ __html: CSS }} /><h1>Demo sob medida</h1><p className="dm-sub">Sem acesso.</p></main>

  const count = data?.count ?? null
  const cap = data?.cap ?? 3
  const full = count !== null && count >= cap
  const blocked = !data?.house || (full && !(exception && reason.trim().length >= DEMO_REASON_MIN)) || data?.fal.state === 'refused' || (data?.balance !== null && data?.balance !== undefined && data.balance < data.cost)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (busy || blocked) return
    setBusy(true)
    setNote(null)
    try {
      const r = await fetch('/api/admin/demo', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ link: link.trim(), brand: brand.trim(), voice, scene: scene.trim() || null, ...(exception ? { exception: true, exception_reason: reason.trim() } : {}) }),
      })
      const d = (await r.json().catch(() => ({}))) as { error?: string; message?: string; credits?: number }
      if (r.status === 202) {
        setNote({ kind: 'ok', text: `Começou (${d.credits ?? ''} créditos da casa). O vídeo sai em ~5–8 min; os formatos e o link aparecem aqui sozinhos.` })
        setLink(''); setBrand(''); setScene(''); setException(false); setReason('')
        void load()
      } else {
        setNote({ kind: 'bad', text: `${DEMO_ERRORS[d.error ?? ''] ?? `Falhou (${d.error ?? r.status}).`}${d.message ? ` ${d.message}` : ''}` })
      }
    } catch {
      setNote({ kind: 'bad', text: 'A requisição caiu. Confira a lista antes de tentar de novo.' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="dm" data-kineo="admin-demo">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <h1>Demo sob medida</h1>
      <p className="dm-sub">Só para a marca que RESPONDEU à prospecção. Cole o link do produto: sai um anúncio Comercial 15 s (9:16, 4:5 e 1:1) feito com o material público da página, numa página privada &quot;Made for &lt;Brand&gt;&quot; com aprovar/pedir ajuste. Nada é publicado.</p>

      <section className="dm-kpis" aria-label="Situação">
        <div className="dm-card"><p className="dm-k">Demos nesta semana ({data?.week ?? '—'})</p><p className={`dm-v ${full ? 'dm-bad' : ''}`}>{count === null ? '—' : `${count} de ${cap}`} <small>demos nesta semana</small></p></div>
        <div className="dm-card"><p className="dm-k">Créditos da conta da casa</p><p className={`dm-v ${data && data.balance !== null && data.balance < data.cost ? 'dm-bad' : ''}`}>{data?.balance ?? '—'} <small>· cada demo = {data?.cost ?? '—'}</small></p></div>
        <div className="dm-card"><p className="dm-k">Saldo da fal</p><p className={`dm-v ${data?.fal.state === 'refused' ? 'dm-bad' : data?.fal.state === 'ok' ? 'dm-ok' : 'dm-warn'}`}>{data?.fal.state === 'refused' ? 'recusou' : data?.fal.state === 'ok' ? 'ok' : 'não medido'} <small>{data?.fal.last_refusal_at ? `última recusa ${brt(data.fal.last_refusal_at)}` : 'sem recusa por saldo em 6 h'}</small></p></div>
        <div className="dm-card"><p className="dm-k">Conta em uso</p><p className={`dm-v ${data?.house ? 'dm-ok' : 'dm-bad'}`}>{data ? (data.house ? 'da casa' : 'não é da casa') : '—'}</p></div>
      </section>
      {loadErr ? <p className="dm-msg dm-bad" role="alert">{loadErr}</p> : null}

      <section className="dm-card" aria-labelledby="dm-new">
        <h2 id="dm-new" style={{ margin: '0 0 12px', fontSize: 16 }}>Nova demo</h2>
        <form onSubmit={(e) => void submit(e)}>
          <label className="full">Link do produto<input type="url" required placeholder="https://loja.com/produto/…" value={link} onChange={(e) => setLink(e.target.value)} /></label>
          <label>Nome da marca<input required maxLength={60} placeholder="Ex.: Lume Parfums" value={brand} onChange={(e) => setBrand(e.target.value)} /></label>
          <label>Língua da voz<select value={voice} onChange={(e) => setVoice(e.target.value as DemoVoiceLang)}>{DEMO_VOICE_LANGS.map((l) => <option key={l} value={l}>{DEMO_VOICE_NAMES[l]} ({l})</option>)}</select></label>
          <label className="full">Cena (opcional)<input maxLength={DEMO_SCENE_MAX} placeholder="Ex.: num banheiro de mármore com luz da manhã" value={scene} onChange={(e) => setScene(e.target.value)} /></label>
          {full ? (
            <>
              <p className="full dm-msg dm-warn" style={{ margin: 0 }}>Já saíram {count} de {cap} demos nesta semana. A próxima só com a exceção do fundador.</p>
              <label className="full dm-check"><input type="checkbox" checked={exception} onChange={(e) => setException(e.target.checked)} />Exceção aprovada pelo fundador</label>
              {exception ? <label className="full">Motivo da exceção (vai para o registro)<textarea maxLength={300} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ex.: a marca X pediu a 2ª versão em alemão antes da reunião de sexta" /></label> : null}
            </>
          ) : null}
          <div className="full"><button className="dm-btn" type="submit" disabled={busy || blocked}>{busy ? 'Gerando… (até 2 min)' : 'Gerar demo'}</button></div>
        </form>
        {note ? <p className={`dm-msg ${note.kind === 'ok' ? 'dm-ok' : 'dm-bad'}`} role="status">{note.text}</p> : null}
        <p className="dm-rule">Regra: até {cap} por semana (semana ISO, horário de Brasília) · só quem respondeu · o saldo da fal é lido antes · ensaio de US$ 0 antes do débito · a trava do produto fiel vale para todos.</p>
      </section>

      <h2 style={{ fontSize: 16, margin: '24px 0 8px' }}>Demos desta semana</h2>
      <div className="dm-list">
        {data && data.rows.length === 0 ? <p className="dm-empty">Nenhuma demo nesta semana.</p> : null}
        {(data?.rows ?? []).map((r) => (
          <article className="dm-card" key={r.order_id}>
            <div className="dm-row-h">
              <h3>{r.brand}</h3>
              <span className={`dm-pill ${STATUS_TXT[r.status].c}`}>{STATUS_TXT[r.status].t}</span>
            </div>
            <p className="dm-meta">{r.host || r.link} · voz {r.voice} · {brt(r.created_at)}{r.exception ? ` · exceção: ${r.exception_reason ?? ''}` : ''}</p>
            <div className="dm-fmts">{r.formats.map((f) => <span className="dm-fmt" key={f.format}>{f.format} · {FMT_TXT[f.status] ?? f.status}</span>)}</div>
            {r.approval ? (
              <>
                <div className="dm-link">
                  <code>{r.approval.url}</code>
                  <button type="button" className="dm-ghost" onClick={() => copy(r.approval!.url)}>Copiar link</button>
                </div>
                <p className="dm-meta">{APPROVAL_TXT[r.approval.status] ?? r.approval.status}{r.approval.viewed ? ' · a marca abriu' : ' · ainda não aberto'}{r.approval.comment ? ` · “${r.approval.comment}”` : ''}</p>
              </>
            ) : null}
            {r.messages ? (
              <div className="dm-texts">
                {(['en', 'es', 'de'] as const).map((l) => (
                  <div className="dm-text" key={l}><b>{l.toUpperCase()}</b><span>{r.messages![l]}</span><button type="button" className="dm-ghost" onClick={() => copy(r.messages![l])}>Copiar</button></div>
                ))}
              </div>
            ) : null}
            {r.status === 'falhou' ? <p className="dm-meta dm-bad">O pedido falhou; o estorno de sempre devolve os créditos. A demo conta na semana.</p> : null}
          </article>
        ))}
      </div>
    </main>
  )
}
