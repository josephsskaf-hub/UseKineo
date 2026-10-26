// KINEO-1-COERENCIA-2026-09-16 — o quadro de coerência (fundador 16/09: "o que a pessoa escrever precisa
// estar coerente no vídeo"; R3: "todos os motores… a régua do meu olho"; R4: "quero clareza: a nota, o tipo
// de vídeo, o que a pessoa escreveu e o link abaixo… melhor navegação… e um botão para mandar um e-mail
// para aquela pessoa perguntando se o feedback foi positivo ou negativo").
// Uma linha por filme, limpa: NOTA · motor · quem/quando · o que escreveu · ▶ filme · 👍👎 · botão.
// Tudo o mais (por que a nota, narração, cena a cena) fica dobrado em "detalhes". Filtros no topo.
// KINEO-ADMIN-RAPIDO-1710 — abrir a página só LÊ as notas (maxCompute: 0). Quem julga o que falta: o cron quality-radar (a cada
// 15 min) ou o botão "Avaliar pendentes" (POST /api/admin/coerencia/avaliar). Gate idêntico a toda tela /admin.
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { readAll } from '@/lib/supabase/readAll'
import { isAdminEmail, serviceClient } from '@/app/api/admin/_shared/db'
import { ENGINE_LABEL, listFastCoherence, type FastCoherenceRow } from '@/lib/admin/fastCoherence'
import { ROTULO_CRITERIO, type CriterioJuiz, type JuizStillPainel } from '@/lib/hollywood/juizStill' // KINEO-JUIZ-STILL-2026-10-06
import PedirFeedback from './PedirFeedback'
import AvaliarPendentes from './AvaliarPendentes' // KINEO-ADMIN-RAPIDO-1710
import AvaliarRegua95 from './AvaliarRegua95' // KINEO-META95-REGUA-1910
import { lerRegua95, placarRegua, type LinhaRegua95, type NotaRegua95 } from '@/lib/admin/regua95Painel' // KINEO-META95-REGUA-1910
import { META_95, REGUA95_DEPLOY_DESDE, ROTULO_PRODUTO_REGUA } from '@/lib/regua95/contexto' // KINEO-META95-REGUA-1910
import type { ProdutoRegua } from '@/lib/regua95/coherenceV2' // KINEO-META95-REGUA-1910
import QualityAssessment from '@/components/admin/QualityAssessment'
import { assessmentMatchesDelivery, combineQualityEvidence } from '@/lib/admin/qualityEvidence'
import { TASK_FULFILLMENT_CANARY_ENABLED } from '@/lib/regua95/taskFulfillmentCanary'
import TaskCanaryControl from '@/components/admin/TaskCanaryControl'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'
export const runtime = 'nodejs'

const FOUNDER = ['josephsskaf@gmail.com']

function corDaNota(score: number | null | undefined): string {
  if (score == null) return '#6b7280'
  if (score >= 75) return '#5FD4A4'
  if (score >= 50) return '#FFBF58'
  return '#FF8787'
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

const chip: React.CSSProperties = { display: 'inline-block', padding: '4px 10px', borderRadius: 999, fontSize: 11.5, fontWeight: 800, textDecoration: 'none', border: '1px solid #1F2530', color: '#C9CFD8' }
const chipOn: React.CSSProperties = { ...chip, background: '#C9CFD8', color: '#161B24', borderColor: '#C9CFD8' }

// ═══ KINEO-JUIZ-STILL-2026-10-06 — o juiz da FOTO-BASE ao lado da nota ═══
// A nota (acima) julga o filme PRONTO; o juiz da foto-base julgou cada foto ANTES de ela virar vídeo (hoje só Seedance 2.5):
// quantas viu, quantas recusou (anacronismo, encara a câmera, texto legível, igual à anterior), quantas refez e o custo.
const corDoJuiz = (j: JuizStillPainel) => (j.com_defeito > 0 ? '#FF8787' : j.recusadas > 0 ? '#FFBF58' : j.julgadas > 0 ? '#5FD4A4' : '#9AA3B2')
const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`
const rotuloCriterio = (c: string) => ROTULO_CRITERIO[c as CriterioJuiz] ?? c
function desfechoDoMotivo(m: JuizStillPainel['motivos'][number]): string {
  if (m.escolhida === 'regerada') return m.veredito_regerada === 'OK' ? 'foto nova aprovada' : m.veredito_regerada === 'REJECT' ? `foto nova também recusada${m.motivo_regerada ? ` (${m.motivo_regerada})` : ''} — seguiu a de nota maior` : 'foto nova (sem 2º julgamento)'
  return m.veredito_regerada === 'REJECT' ? 'as duas recusadas — seguiu a original' : 'seguiu a original (sem foto nova)'
}
function JuizDaFoto({ j }: { j: JuizStillPainel }) {
  const resumo = j.fotos === 0
    ? 'nenhuma cena com foto-base (todas sem still)'
    : [plural(j.julgadas, 'foto julgada', 'fotos julgadas'), plural(j.recusadas, 'recusada', 'recusadas'), plural(j.regeradas, 'refeita', 'refeitas'), j.salvas ? plural(j.salvas, 'salva', 'salvas') : '', j.com_defeito ? plural(j.com_defeito, 'seguiu com defeito', 'seguiram com defeito') : '', j.erros + j.puladas ? `${j.erros + j.puladas} sem juiz (erro/tempo)` : ''].filter(Boolean).join(' · ')
  return (
    <div data-kineo="juiz-still" style={{ marginTop: 6, fontSize: 12, lineHeight: 1.45 }}>
      <span style={{ color: corDoJuiz(j), fontWeight: 800 }}>📷 Juiz da foto-base</span>
      <span style={{ color: '#9AA3B2' }}> · {resumo} · US$ {j.custo_usd.toFixed(3)} · {(j.ms / 1000).toFixed(1)} s{j.orcamento_estourado ? ' · teto de tempo atingido' : ''}{j.disjuntor ? ' · juiz desligado por falhas' : ''}</span>
      {j.motivos.length > 0 && (
        <ul style={{ margin: '3px 0 0', paddingLeft: 18, color: '#C9CFD8' }}>
          {j.motivos.map((m, i) => (
            <li key={i}>cena {m.cena}{m.origem === 'ambiente' ? ' (foto de ambiente)' : ''} · <b>{rotuloCriterio(m.criterio)}</b>{m.motivo ? `: ${m.motivo}` : ''} <span style={{ color: '#9AA3B2' }}>→ {desfechoDoMotivo(m)}</span></li>
          ))}
        </ul>
      )}
    </div>
  )
}

// ═══ KINEO-META95-REGUA-1910 — o PLACAR DA RÉGUA 95: as notas novas (coherence_v2 + pixel_score) por produto e por motor ═══
// "% ≥ 95" e média de cada nota e da combinada (a menor das duas), com corte por data de entrega. Só lê: o cron
// /api/cron/regua-95 julga a cada 10 min (ou o botão "Avaliar agora").
const pct = (l: LinhaRegua95['nota']) => (l.pct95 == null ? '—' : `${l.pct95}%`)
const corPct = (p: number | null) => (p == null ? '#6b7280' : p >= 80 ? '#5FD4A4' : p >= 40 ? '#FFBF58' : '#FF8787')
function CelulaPlacar({ l }: { l: LinhaRegua95['nota'] }) {
  if (l.n === 0) return <td style={{ padding: '5px 10px', color: '#6b7280' }}>—</td>
  return (
    <td style={{ padding: '5px 10px', whiteSpace: 'nowrap' }}>
      <b style={{ color: corPct(l.pct95) }}>{pct(l)}</b>
      <span style={{ color: '#9AA3B2' }}> · média {l.media} · n {l.n}</span>
    </td>
  )
}
function TabelaRegua95({ linhas, titulo, dataKineo }: { linhas: LinhaRegua95[]; titulo: string; dataKineo: string }) {
  const th: React.CSSProperties = { padding: '4px 10px', fontWeight: 700, textAlign: 'left' }
  return (
    <table data-kineo={dataKineo} style={{ borderCollapse: 'collapse', fontSize: 12, marginBottom: 10 }}>
      <thead>
        <tr style={{ color: '#9AA3B2' }}>
          <th style={{ ...th, paddingLeft: 0 }}>{titulo}</th><th style={th}>nota validada · % ≥ {META_95}</th><th style={th}>texto e plano</th><th style={th}>quadros</th><th style={th} title="Só UGC/apresentador: olhos, sorriso, mão, pessoa duplicada e rótulo">apresentador</th><th style={th}>cobertura</th><th style={th}>US$</th>
        </tr>
      </thead>
      <tbody>
        {linhas.map((l) => (
          <tr key={l.rotulo} style={{ borderTop: '1px solid #161B24' }}>
            <td style={{ padding: '5px 10px 5px 0', fontWeight: 800, color: '#C9CFD8' }}>{l.rotulo}</td>
            <CelulaPlacar l={l.nota} />
            <CelulaPlacar l={l.coerencia} />
            <CelulaPlacar l={l.pixel} />
            <CelulaPlacar l={l.ugc} />{/* KINEO-META95-UGC-1910 */}
            <td style={{ padding: '5px 10px', color: '#CBD5E1', whiteSpace: 'nowrap' }}>{l.nota.n}/{l.entregas} completas{l.incompletas ? ` · ${l.incompletas} incompletas` : ''}{l.historicas ? ` · ${l.historicas} históricas` : ''}</td>
            <td style={{ padding: '5px 10px', color: '#9AA3B2' }}>{l.usd.toFixed(3)}</td>
          </tr>
        ))}
        {linhas.length === 0 && <tr><td colSpan={7} style={{ color: '#9AA3B2', padding: '5px 0' }}>Nenhuma avaliação registrada nesta janela.</td></tr>}
      </tbody>
    </table>
  )
}
function PiorRegua95({ n }: { n: NotaRegua95 }) {
  return (
    <li style={{ marginBottom: 3 }}>
      <b style={{ color: corDaNota(n.nota) }}>{n.nota ?? '—'}</b> <span style={{ color: '#C4B5FD' }}>{ROTULO_PRODUTO_REGUA[n.product]} · {motor(n.engine)}</span> <span style={{ color: '#9AA3B2' }}>{fmt(n.delivered_at)} · coerência {n.coerencia ?? '—'} · pixel {n.pixel ?? '—'}{n.product === 'ugc' ? ` · juiz UGC ${n.ugc ?? '—'}` : ''}</span>
      {n.video_url ? <a href={n.video_url} target="_blank" rel="noreferrer" style={{ color: '#8DB4FF', marginLeft: 6 }}>▶</a> : null}
      {(n.pixel_caps.length > 0 || n.coerencia_problems.length > 0 || n.ugc_caps.length > 0) && <span style={{ color: '#FF8787' }}> — {[...n.ugc_caps, ...n.pixel_caps, ...n.coerencia_problems].slice(0, 3).join(' · ')}</span>}
      {n.ugc_motivos.length > 0 && <span data-kineo="regua95-ugc-motivos" style={{ color: '#9AA3B2' }}> · quadros: {n.ugc_motivos.slice(0, 3).join(' · ')}</span>}{/* KINEO-META95-UGC-1910 */}
    </li>
  )
}

function Linha({ r, assessment }: { r: FastCoherenceRow; assessment?: NotaRegua95 }) {
  const verifiedAssessment = assessmentMatchesDelivery(assessment, r) ? assessment : undefined
  const c = r.coherence
  const ai = r.engine !== 'fast'
  return (
    <div data-kineo="linha-coerencia" className="quality-film-row" style={{ background: 'var(--card)', border: '1px solid #161B24', borderRadius: 12, padding: '12px 14px', display: 'grid', gridTemplateColumns: '64px minmax(0, 1fr) auto', gap: 14, alignItems: 'start' }}>
      {/* 1 · a nota */}
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 30, fontWeight: 900, color: corDaNota(verifiedAssessment?.nota), lineHeight: 1 }}>{verifiedAssessment?.nota ?? '—'}</div>
        <div style={{ fontSize: 9.5, color: '#9AA3B2', marginTop: 4 }}>nota técnica validada</div>
        <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 8 }}>texto antigo: {c?.score ?? '—'}</div>
        {r.feedback && <div style={{ fontSize: 18, marginTop: 6 }} title={`a pessoa disse ${r.feedback.verdict === 'up' ? 'sim' : 'não'} em ${fmt(r.feedback.at)}`}>{r.feedback.verdict === 'up' ? '👍' : '👎'}</div>}
        {r.juiz_still && (
          <div data-kineo="juiz-still-selo" style={{ fontSize: 10.5, marginTop: 6, fontWeight: 800, color: corDoJuiz(r.juiz_still) }} title={`juiz da foto-base: ${r.juiz_still.julgadas} julgada(s), ${r.juiz_still.recusadas} recusada(s), ${r.juiz_still.regeradas} refeita(s)`}>
            📷 {r.juiz_still.fotos === 0 ? '—' : r.juiz_still.recusadas === 0 ? `${r.juiz_still.julgadas} ✓` : `${r.juiz_still.recusadas}✗/${r.juiz_still.julgadas}`}
          </div>
        )}
      </div>
      {/* 2 · motor · quem · o que escreveu · link */}
      <div style={{ minWidth: 0 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 10px', alignItems: 'baseline', fontSize: 11.5, color: '#9AA3B2' }}>
          <span style={{ color: '#C4B5FD', fontWeight: 900, textTransform: 'uppercase', fontSize: 11 }}>{motor(r.engine)}</span>
          <a href={`/admin/people/${encodeURIComponent(r.user_id)}`} data-kineo="pessoa-link" title="Abrir a tela desta pessoa" style={{ color: '#C9CFD8', fontWeight: 700 }}>{r.email ?? r.user_id.slice(0, 8)}</a>{/* KINEO-ADMIN-PESSOA-1910 — quem fez o filme abre a tela da pessoa (link comum: a linha é carregada offline por guardiões) */}
          <span>{fmt(r.created_at)}</span>
          {r.seconds != null && <span>{r.seconds}s</span>}
          {r.credits != null && <span>{r.credits} cr</span>}
        </div>
        <div style={{ color: '#C9CFD8', fontSize: 13.5, lineHeight: 1.4, marginTop: 6 }} title={r.topic}>
          <span style={{ color: '#9AA3B2', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', marginRight: 6 }}>{c?.request_pt ? 'pediu' : 'escreveu'}</span>
          {c?.request_pt || primeiraLinha(r.topic) || <em style={{ color: '#FF8787' }}>prompt vazio no banco</em>}
          {c?.request_pt && <span style={{ color: '#6b7280', fontSize: 11.5, marginLeft: 8 }}>— original: {primeiraLinha(r.topic, 90)}</span>}
        </div>
        <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', fontSize: 12 }}>
          {r.url ? (
            <a href={r.url} target="_blank" rel="noreferrer" data-kineo="abrir-filme" style={{ color: '#8DB4FF', fontWeight: 800 }}>▶ abrir o filme</a>
          ) : (
            <span style={{ color: '#6b7280' }}>sem arquivo</span>
          )}
          {c && c.summary && <span style={{ color: '#9AA3B2' }}>{c.summary}</span>}
        </div>
        {r.juiz_still && <JuizDaFoto j={r.juiz_still} />}
        <QualityAssessment quality={verifiedAssessment?.quality ?? combineQualityEvidence(r.engine === 'ads_v2' ? 'ads' : 'filme', {})} judges={verifiedAssessment?.judges ?? {}} findings={verifiedAssessment ? [...verifiedAssessment.coerencia_problems, ...verifiedAssessment.pixel_caps, ...verifiedAssessment.ugc_motivos] : []} />
        {r.engine !== 'ads_v2' && <TaskCanaryControl key={`${r.video_id}:${r.generation_id ?? 'unknown'}:${r.user_id}`} enabled={TASK_FULFILLMENT_CANARY_ENABLED} target={verifiedAssessment?.canary_target ?? null} seconds={r.claim_seconds ?? r.seconds} savedResult={verifiedAssessment?.canary_result ?? null} />}
        {r.feedback?.comment && (
          <div style={{ marginTop: 6, color: '#fde68a', fontSize: 12, borderLeft: '2px solid #FFBF58', paddingLeft: 8 }}>a pessoa escreveu: “{r.feedback.comment}”</div>
        )}
        <details style={{ marginTop: 8 }}>
          <summary style={{ color: '#6b7280', fontSize: 11, fontWeight: 800, cursor: 'pointer' }}>detalhes{c && c.problems.length ? ` · ${c.problems.length} problema${c.problems.length > 1 ? 's' : ''}` : ''}{c ? ` · texto ${c.prompt_vs_narration} · visual ${c.narration_vs_visuals ?? '—'}` : ''}</summary>
          <div style={{ marginTop: 8, display: 'grid', gap: 8 }}>
            {c && c.problems.length > 0 && (
              <ul style={{ margin: 0, paddingLeft: 18, color: '#FF8787', fontSize: 12, lineHeight: 1.45 }}>
                {c.problems.map((p, i) => (
                  <li key={i}>{p}{c.worst_scene && i === 0 ? ` (pior cena: ${c.worst_scene})` : ''}</li>
                ))}
              </ul>
            )}
            <details>
              <summary style={{ color: '#8DB4FF', fontSize: 11, fontWeight: 800, cursor: 'pointer' }}>O que escreveu, inteiro ({r.topic.length} caracteres{r.topic_truncated ? ' · cortado pelo banco em 500/1.000 — filme anterior ao rastro completo' : ''})</summary>
              <pre style={{ whiteSpace: 'pre-wrap', color: '#C9CFD8', fontSize: 11.5, lineHeight: 1.45, margin: '4px 0 0', fontFamily: 'inherit', maxHeight: 240, overflow: 'auto' }}>{r.topic}</pre>
            </details>
            <details>
              <summary style={{ color: '#8DB4FF', fontSize: 11, fontWeight: 800, cursor: 'pointer' }}>Roteiro enviado à narração{r.narration ? '' : ' (sem registro)'}</summary>
              <pre style={{ whiteSpace: 'pre-wrap', color: '#C9CFD8', fontSize: 11.5, lineHeight: 1.45, margin: '4px 0 0', fontFamily: 'inherit', maxHeight: 240, overflow: 'auto' }}>{r.narration ?? '—'}</pre>
            </details>
            {r.scenes && r.scenes.length > 0 && (
              <details>
                <summary style={{ color: '#8DB4FF', fontSize: 11, fontWeight: 800, cursor: 'pointer' }}>Plano de cenas ({r.scenes.length}){ai ? ' — texto enviado ao gerador, sem inspeção dos quadros' : ' — fala · busca · origem · tags'}</summary>
                <table style={{ marginTop: 6, borderCollapse: 'collapse', fontSize: 11, width: '100%' }}>
                  <tbody>
                    {r.scenes.map((s) => (
                      <tr key={s.scene} style={{ borderTop: '1px solid #161B24', background: c?.worst_scene === s.scene ? 'rgba(248,113,113,.08)' : undefined }}>
                        <td style={{ padding: '4px 6px', color: '#9AA3B2', verticalAlign: 'top', whiteSpace: 'nowrap' }}>{s.scene}</td>
                        {!ai && <td style={{ padding: '4px 6px', color: '#C9CFD8', verticalAlign: 'top' }}>{s.voiceover}</td>}
                        <td style={{ padding: '4px 6px', color: '#C4B5FD', verticalAlign: 'top', whiteSpace: ai ? 'normal' : 'nowrap' }}>{s.query ?? '—'}</td>
                        <td style={{ padding: '4px 6px', color: s.sources.includes('fallbackA') || s.sources.includes('rejected') ? '#FF8787' : s.sources.includes('aiStill') || s.sources.includes('aiVideo') ? '#5FD4A4' : '#C9CFD8', verticalAlign: 'top', whiteSpace: 'nowrap' }}>{s.sources.join('+') || 'none'}</td>
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
      <div className="quality-film-actions" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
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
    return <div style={{ padding: 40, color: '#C9CFD8', fontFamily: 'system-ui' }}>403</div>
  }
  const admin = serviceClient()
  if (!admin) return <div style={{ padding: 40, color: '#C9CFD8' }}>service unavailable</div>

  const one = (k: string) => (Array.isArray(searchParams?.[k]) ? (searchParams?.[k] as string[])[0] : (searchParams?.[k] as string | undefined))
  const hoursRaw = Number(one('hours'))
  const hours = Number.isFinite(hoursRaw) && hoursRaw > 0 ? hoursRaw : 48
  const incluirCasa = one('casa') === '1'
  const engine = (one('engine') ?? '').trim() || undefined
  const so = one('so') // 'fora' | 'parcial' | 'semfeedback'
  const todas = await listFastCoherence(admin, { hours, limit: 150, engine, maxCompute: 0, excludeEmails: incluirCasa ? [] : FOUNDER }, readAll) // KINEO-ADMIN-RAPIDO-1710 — só lê; o juiz roda no cron ou no botão
  const rows = todas.filter((r) => {
    if (so === 'fora') return r.coherence?.verdict === 'off'
    if (so === 'parcial') return r.coherence?.verdict === 'partial'
    if (so === 'baixo') return !!r.coherence && r.coherence.score < 75
    if (so === 'semfeedback') return !r.feedback && !r.feedback_asked_at
    if (so === 'juiz') return !!r.juiz_still && r.juiz_still.recusadas > 0 // KINEO-JUIZ-STILL-2026-10-06
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
    const merged: Record<string, string | undefined> = { hours: String(hours), engine, so, casa: incluirCasa ? '1' : undefined, desde: desdeParam || undefined /* KINEO-META95-REGUA-1910 */, ...extra }
    for (const [k, v] of Object.entries(merged)) if (v) p.set(k, v)
    return `/admin/coerencia?${p.toString()}`
  }

  // KINEO-META95-REGUA-1910 — placar da régua 95 (notas novas). desde = 'deploy' (padrão: dia desta régua) | '24h' | '7d' | data ISO.
  const desdeParam = (one('desde') ?? '').trim()
  const desdeIso = desdeParam === '24h' ? new Date(Date.now() - 24 * 3600_000).toISOString() : desdeParam === '7d' ? new Date(Date.now() - 7 * 24 * 3600_000).toISOString() : desdeParam && !Number.isNaN(Date.parse(desdeParam)) ? new Date(desdeParam).toISOString() : REGUA95_DEPLOY_DESDE
  let regua: Awaited<ReturnType<typeof lerRegua95>> | null = null
  try {
    regua = await lerRegua95(admin, { desde: desdeIso, incluirCasa }, readAll)
  } catch (e) {
    console.warn('[admin/coerencia] régua 95 não leu:', e instanceof Error ? e.message : String(e)) // falha aberta: a tela antiga segue
  }
  const reguaPorProduto = regua ? placarRegua(regua.notas, (n) => ROTULO_PRODUTO_REGUA[n.product as ProdutoRegua]) : []
  const reguaPorMotor = regua ? placarRegua(regua.notas, (n) => `${ROTULO_PRODUTO_REGUA[n.product as ProdutoRegua]} · ${motor(n.engine)}`) : []
  const reguaPiores = regua ? regua.notas.filter((n) => n.nota != null && n.nota < META_95).sort((a, b) => (a.nota ?? 0) - (b.nota ?? 0)).slice(0, 8) : []
  const avaliacaoPorVideo = new Map((regua?.notas ?? []).filter((n) => n.video_id).map((n) => [n.video_id!, n]))

  return (
    <main style={{ background: '#07090D', minHeight: '100vh', color: '#C9CFD8', fontFamily: 'system-ui, -apple-system, sans-serif', padding: '22px 18px 60px' }}>
      <style>{`@media(max-width:640px){.quality-film-row{grid-template-columns:52px minmax(0,1fr)!important;gap:10px!important}.quality-film-actions{grid-column:2;align-items:flex-start!important}}`}</style>
      <div style={{ maxWidth: 1040, margin: '0 auto' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'baseline', marginBottom: 12 }}>
          <h1 style={{ fontSize: 20, fontWeight: 900, margin: 0 }}>Qualidade e fidelidade</h1>
          <span style={{ color: '#9AA3B2', fontSize: 12 }}>Texto, plano de cenas e quadros do vídeo são verificações diferentes. A nota final exige evidência completa dos avaliadores necessários. Áudio e movimento contínuo ainda não são avaliados.</span>
          <span style={{ marginLeft: 'auto', fontSize: 12 }}>
            <Link href="/admin" style={{ color: '#8DB4FF' }}>CEO</Link> · <Link href="/admin/people" style={{ color: '#8DB4FF' }}>People</Link>
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
          {[['baixo', 'nota < 75'], ['fora', 'fora do pedido'], ['parcial', 'parciais'], ['semfeedback', 'sem feedback pedido'], ['juiz', 'foto recusada pelo juiz']].map(([k, l]) => (
            <Link key={k} href={q({ so: so === k ? undefined : k })} style={so === k ? chipOn : chip}>{l}</Link>
          ))}
          <Link href={q({ casa: incluirCasa ? undefined : '1' })} style={incluirCasa ? chipOn : chip}>{incluirCasa ? 'com a casa' : '+ casa'}</Link>
        </div>

        {/* placar por motor */}
        <p style={{ color: '#94A3B8', fontSize: 12, margin: '10px 0 6px' }}>Histórico de coerência textual: estas notas leem roteiros e descrições; não são uma inspeção do vídeo final.</p>
        <table style={{ borderCollapse: 'collapse', fontSize: 12, marginBottom: 16 }} data-kineo="placar-por-motor">
          <thead>
            <tr style={{ color: '#9AA3B2', textAlign: 'left' }}>
              <th style={{ padding: '4px 12px 4px 0', fontWeight: 700 }}>motor</th><th style={{ padding: '4px 12px', fontWeight: 700 }}>filmes</th><th style={{ padding: '4px 12px', fontWeight: 700 }}>média</th><th style={{ padding: '4px 12px', fontWeight: 700 }}>fora do pedido</th><th style={{ padding: '4px 12px', fontWeight: 700 }}>👍</th><th style={{ padding: '4px 12px', fontWeight: 700 }}>👎</th>
            </tr>
          </thead>
          <tbody>
            {Array.from(porMotor.entries()).sort((a, b) => b[1].n - a[1].n).map(([eng, m]) => (
              <tr key={eng} style={{ borderTop: '1px solid #161B24' }}>
                <td style={{ padding: '5px 12px 5px 0', fontWeight: 800, color: '#C9CFD8' }}>{motor(eng)}</td>
                <td style={{ padding: '5px 12px' }}>{m.n}</td>
                <td style={{ padding: '5px 12px', fontWeight: 900, color: corDaNota(m.comNota ? Math.round(m.soma / m.comNota) : null) }}>{m.comNota ? Math.round(m.soma / m.comNota) : '—'}{m.comNota < m.n ? <span style={{ color: '#6b7280', fontWeight: 400 }}> ({m.comNota}/{m.n})</span> : null}</td>
                <td style={{ padding: '5px 12px', color: m.off ? '#FF8787' : '#9AA3B2' }}>{m.off}</td>
                <td style={{ padding: '5px 12px' }}>{m.up}</td>
                <td style={{ padding: '5px 12px' }}>{m.down}</td>
              </tr>
            ))}
            <tr style={{ borderTop: '1px solid #1F2530', color: '#9AA3B2' }}>
              <td style={{ padding: '5px 12px 5px 0' }}>todos</td>
              <td style={{ padding: '5px 12px' }}>{todas.length}</td>
              <td style={{ padding: '5px 12px', fontWeight: 900, color: corDaNota(media) }}>{media ?? '—'}</td>
              <td style={{ padding: '5px 12px' }}>{comNota.filter((r) => r.coherence?.verdict === 'off').length}</td>
              <td style={{ padding: '5px 12px' }}>{todas.filter((r) => r.feedback?.verdict === 'up').length}</td>
              <td style={{ padding: '5px 12px' }}>{todas.filter((r) => r.feedback?.verdict === 'down').length}</td>
            </tr>
          </tbody>
        </table>
        {/* KINEO-META95-REGUA-1910 — placar da régua 95 */}
        <section data-kineo="regua95" style={{ border: '1px solid #1F2530', borderRadius: 12, padding: '12px 14px', marginBottom: 16 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'baseline', marginBottom: 8 }}>
            <h2 style={{ fontSize: 15, fontWeight: 900, margin: 0 }}>Evidência das avaliações</h2>
            <span style={{ color: '#9AA3B2', fontSize: 11.5 }}>Só entram na nota final os registros com cobertura validada. Filme exige texto e quadros; apresentador exige quadros e inspeção específica. Histórico, ausência e avaliação incompleta ficam separados. Uma nota técnica alta não comprova qualidade editorial nem resultado comercial.</span>
          </div>
          <p style={{ color: '#CBD5E1', fontSize: 12, margin: '4px 0 10px' }}>Critério experimental de atendimento ao pedido: {TASK_FULFILLMENT_CANARY_ENABLED ? 'canário manual disponível' : 'desligado, aguardando calibração e autorização do teste pago'}. Nenhuma avaliação desta tela comprova que o cliente publicaria ou compraria.</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center', marginBottom: 10 }}>
            <span style={{ color: '#6b7280', fontSize: 11, marginRight: 2 }}>entregas desde</span>
            {[['', 'o deploy da régua'], ['24h', '24h'], ['7d', '7 dias']].map(([k, l]) => (
              <Link key={k || 'deploy'} href={q({ desde: k || undefined })} style={desdeParam === k ? chipOn : chip}>{l}</Link>
            ))}
            <span style={{ color: '#94A3B8', fontSize: 11 }}>{regua ? `${regua.notas.length} entregas com registro · ${plural(regua.notas.filter((n) => n.quality.state === 'complete').length, 'completa', 'completas')}${regua.casaFora ? ` · ${regua.casaFora} da casa fora` : ''}` : 'placar indisponível agora'}</span>
            <AvaliarRegua95 hours={hours} />
          </div>
          <div style={{ overflowX: 'auto' }}><TabelaRegua95 linhas={reguaPorProduto} titulo="produto" dataKineo="regua95-por-produto" /></div>
          <details>
            <summary style={{ color: '#8DB4FF', fontSize: 11.5, fontWeight: 800, cursor: 'pointer' }}>por motor ({reguaPorMotor.length})</summary>
            <div style={{ overflowX: 'auto' }}><TabelaRegua95 linhas={reguaPorMotor} titulo="produto · motor" dataKineo="regua95-por-motor" /></div>
          </details>
          {reguaPiores.length > 0 && (
            <details style={{ marginTop: 6 }}>
              <summary style={{ color: '#FF8787', fontSize: 11.5, fontWeight: 800, cursor: 'pointer' }}>abaixo de {META_95} ({reguaPiores.length} piores)</summary>
              <ul data-kineo="regua95-piores" style={{ margin: '6px 0 0', paddingLeft: 18, fontSize: 12, lineHeight: 1.45 }}>
                {reguaPiores.map((n) => <PiorRegua95 key={n.key} n={n} />)}
              </ul>
            </details>
          )}
        </section>

        {semNota > 0 && <div data-kineo="sem-nota" style={{ color: '#9AA3B2', fontSize: 12, marginBottom: 10 }}>{semNota} filme{semNota > 1 ? 's' : ''} ainda sem nota — o radar avalia sozinho a cada 15 min, ou agora:<AvaliarPendentes hours={hours} engine={engine} casa={incluirCasa} pendentes={semNota} /></div>}

        <div style={{ display: 'grid', gap: 8 }}>
          {rows.map((r) => (
            <Linha key={r.video_id} r={r} assessment={avaliacaoPorVideo.get(r.video_id)} />
          ))}
          {rows.length === 0 && <div style={{ color: '#9AA3B2' }}>Nenhum filme com esse filtro.</div>}
        </div>
      </div>
    </main>
  )
}
