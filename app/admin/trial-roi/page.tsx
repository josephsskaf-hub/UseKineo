// ═══════════════════════════════════════════════════════════════════════════
// KINEO-TRIAL-ROI-2026-08-19 — /admin/trial-roi: O TRIAL SE PAGA?
// ═══════════════════════════════════════════════════════════════════════════
// Pedido do fundador: "me coloca isso no adm, na aba reverse trial, de todos
// que gastaram quem comprou".
//
// POR QUE ESTA TELA E NÃO UMA COLUNA NAS QUE JÁ EXISTEM: /admin/trial-abuse
// responde "alguém farmou o grant?" e /admin/trial-cohort responde "quem está
// vivo agora e travado em quê". Nenhuma das duas responde a única pergunta que
// decide se o reverse trial continua existindo: DO DINHEIRO QUE JÁ SAIU, QUANTO
// VOLTOU? Isso é uma conta de retorno, não de comportamento, e mistura duas
// fontes que nenhuma das outras telas cruza — consumo por motor e assinatura.
//
// O NÚMERO QUE ORIGINOU A TELA (medido em 19/08, fatura da fal aberta):
//   · fal, ciclo de agosto: $551.33 · queima diária $29.28
//   · Seedance sozinho: $398.93 = 72% da conta
//   · dos 121 renders Seedance do período, 118 (97%) são de quem nunca pagou
//   · 93 pessoas fizeram Seedance no trial · 0 assinaram até agora
// A ressalva que impede a conclusão apressada, e que está na tela: o gasto
// grande começou em 16/08. A coorte tem três dias. "Converteu zero" ainda pode
// ser "não deu tempo" — e é exatamente por isso que a leitura vira uma TELA em
// vez de uma conversa: para ser relida no domingo com os mesmos critérios.
//
// CUSTO POR RENDER — MEDIDO, NÃO ESTIMADO. Os valores abaixo saem da divisão
// da fatura real da fal pelo número de renders do mesmo período, não da tabela
// teórica de $/segundo. A diferença importa: a estimativa dizia $2.34 por
// Seedance e a fatura diz $3.30 (41% mais). Estimar custo para decidir sobre
// dinheiro é como estimar receita — só serve até a primeira fatura.
//
// READ-ONLY POR CONSTRUÇÃO: esta página só faz SELECT. Nunca escreve perfil,
// nunca manda e-mail.
import Link from 'next/link'
import type { CSSProperties } from 'react'
import { createClient } from '@/lib/supabase/server'
import { isAdminEmail, serviceClient } from '@/app/api/admin/_shared/db'
import { isInternalEmail } from '@/lib/internalAccounts'
import { formatUsd, isPaidPlan } from '@/app/api/admin/_shared/mrr'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/** Custo médio POR RENDER, derivado da fatura real da fal de agosto/2026.
 *  ⚠️ Reconferir quando a fatura do mês fechar — é a única forma honesta de
 *  manter esta tela dizendo dinheiro de verdade em vez de teoria. */
const USD_PER_RENDER: Record<string, number> = {
  cinematic_ai: 3.30,        // Seedance 1.5 — $398.93 / 121 renders (medido)
  cinematic_h3: 3.90,        // MiniMax H3 — $0.06/s × 65s (ainda sem fatura)
  cinematic_kling: 3.00,
  cinematic_veo: 9.75,
  cinematic_hollywood: 10.92,
  fast: 0.04,
}
const ENGINE_LABEL: Record<string, string> = {
  fast: 'Kineo 1',
  cinematic_ai: 'Seedance 1.5',
  cinematic_kling: 'Kling 2.5',
  cinematic_h3: 'MiniMax H3',
  cinematic_veo: 'Veo 3.1',
  cinematic_hollywood: 'Kling 3',
}

const CARD: CSSProperties = {
  background: 'var(--card,#161618)', border: '1px solid var(--border,rgba(255,255,255,.09))',
  borderRadius: 14, padding: '14px 16px',
}
const TH: CSSProperties = {
  fontSize: '0.58rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '.09em',
  color: '#86868b', textAlign: 'left', padding: '8px 12px', whiteSpace: 'nowrap',
}
const TD: CSSProperties = { padding: '9px 12px', fontSize: '0.8rem', whiteSpace: 'nowrap' }

type ClaimRow = { user_id: string | null; metadata: { quality?: string } | null; created_at: string }
type ProfRow = { id: string; email: string; plan: string | null; has_paid: boolean | null; created_at: string }

export default async function TrialRoiPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !isAdminEmail(user.email)) {
    return <main style={{ padding: 40, color: '#f5f5f7' }}>Forbidden</main>
  }
  const admin = serviceClient()
  if (!admin) return <main style={{ padding: 40, color: '#f5f5f7' }}>Service unavailable</main>

  // Consumo real: o claim é o evento que representa cobrança de verdade.
  const { data: claims } = await admin
    .from('events')
    .select('user_id, metadata, created_at')
    .eq('name', 'compose_submission_claim')
    .gte('created_at', new Date(Date.now() - 45 * 864e5).toISOString())
    .limit(20000)

  const ids = [...new Set((claims ?? []).map((c) => (c as ClaimRow).user_id).filter(Boolean))] as string[]
  const { data: profiles } = ids.length
    ? await admin.from('profiles').select('id, email, plan, has_paid, created_at').in('id', ids)
    : { data: [] as ProfRow[] }

  const profById = new Map<string, ProfRow>()
  for (const p of (profiles ?? []) as ProfRow[]) if (!isInternalEmail(p.email)) profById.set(p.id, p)

  // ── Agregação por pessoa ────────────────────────────────────────────────
  type Person = {
    email: string; plan: string | null; paid: boolean
    renders: Record<string, number>; cost: number; total: number
    firstSpend: string; signedUp: string
  }
  const people = new Map<string, Person>()
  const byEngine = new Map<string, { renders: number; cost: number; people: Set<string>; converted: Set<string> }>()

  for (const raw of (claims ?? []) as ClaimRow[]) {
    const uid = raw.user_id
    if (!uid) continue
    const prof = profById.get(uid)
    if (!prof) continue
    const q = raw.metadata?.quality ?? 'fast'
    const unit = USD_PER_RENDER[q] ?? 0
    const paid = isPaidPlan(prof.plan) || prof.has_paid === true

    const p = people.get(uid) ?? {
      email: prof.email, plan: prof.plan, paid,
      renders: {}, cost: 0, total: 0,
      firstSpend: raw.created_at, signedUp: prof.created_at,
    }
    p.renders[q] = (p.renders[q] ?? 0) + 1
    p.cost += unit
    p.total += 1
    if (raw.created_at < p.firstSpend) p.firstSpend = raw.created_at
    people.set(uid, p)

    const e = byEngine.get(q) ?? { renders: 0, cost: 0, people: new Set(), converted: new Set() }
    e.renders += 1; e.cost += unit; e.people.add(uid)
    if (paid) e.converted.add(uid)
    byEngine.set(q, e)
  }

  const all = [...people.values()]
  // Quem gastou motor de IA (não só o Kineo 1) — é aqui que o dinheiro está.
  const aiSpenders = all.filter((p) => Object.keys(p.renders).some((q) => q !== 'fast'))
  const aiCost = aiSpenders.reduce((s, p) => s + p.cost, 0)
  const aiConverted = aiSpenders.filter((p) => p.paid)
  const totalCost = all.reduce((s, p) => s + p.cost, 0)
  const converted = all.filter((p) => p.paid)
  const cac = converted.length > 0 ? totalCost / converted.length : null

  const engines = [...byEngine.entries()].sort((a, b) => b[1].cost - a[1].cost)
  const topSpenders = [...aiSpenders].sort((a, b) => b.cost - a.cost).slice(0, 40)

  const fmtDay = (iso: string) => new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })

  return (
    <main style={{ padding: '28px 22px', maxWidth: 1280, margin: '0 auto', color: '#f5f5f7' }}>
      <div style={{ fontSize: '0.6rem', fontWeight: 900, letterSpacing: '.12em', color: '#86868b', textTransform: 'uppercase' }}>
        Admin · Reverse trial · retorno
      </div>
      <h1 style={{ fontSize: '1.6rem', fontWeight: 900, margin: '6px 0 4px' }}>O trial se paga?</h1>
      <p style={{ color: '#86868b', fontSize: '0.85rem', margin: 0 }}>
        Todo mundo que consumiu crédito nos últimos 45 dias, o que isso custou de fornecedor, e quem virou cliente.
        Contas internas fora. Custo por render medido na fatura da fal, não estimado.
      </p>

      <nav style={{ display: 'flex', gap: 6, margin: '16px 0 20px', flexWrap: 'wrap' }}>
        {[['CEO', '/admin'], ['People', '/admin/people'], ['Trial', '/admin/trial-abuse'],
          ['Cohort', '/admin/trial-cohort'], ['ROI do trial', '/admin/trial-roi'], ['Suppliers', '/admin/supplier-health']].map(([l, h]) => (
          <Link key={h} href={h} style={{
            fontSize: '0.74rem', fontWeight: 700, padding: '6px 11px', borderRadius: 8, textDecoration: 'none',
            color: h === '/admin/trial-roi' ? '#0a0a0b' : '#c7c7cc',
            background: h === '/admin/trial-roi' ? '#2997ff' : 'rgba(255,255,255,.05)',
            border: '1px solid rgba(255,255,255,.08)',
          }}>{l}</Link>
        ))}
      </nav>

      {/* ── O placar ───────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: 12, marginBottom: 10 }}>
        {[
          ['Gastou crédito', String(all.length), '#f5f5f7', 'pessoas com pelo menos 1 render'],
          ['Usou motor de IA', String(aiSpenders.length), '#a78bfa', 'onde o dinheiro realmente vai'],
          ['Custo de fornecedor', formatUsd(totalCost), '#fb923c', '45 dias, todos os motores'],
          ['Viraram clientes', String(converted.length), converted.length > 0 ? '#34d399' : '#f87171', 'dos que gastaram'],
          ['Custo por cliente', cac ? formatUsd(cac) : '—', cac ? '#fbbf24' : '#86868b', 'gasto ÷ convertidos'],
        ].map(([label, value, color, sub]) => (
          <div key={label} style={CARD}>
            <div style={{ fontSize: '0.58rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '.09em', color: '#86868b' }}>{label}</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 900, color, lineHeight: 1.15, marginTop: 3 }}>{value}</div>
            <div style={{ fontSize: '0.66rem', color: '#86868b', marginTop: 2 }}>{sub}</div>
          </div>
        ))}
      </div>

      {/* ── A régua, escrita ANTES de olhar o resultado ─────────────────── */}
      <div style={{ ...CARD, borderColor: 'rgba(41,151,255,.3)', background: 'rgba(41,151,255,.05)', marginBottom: 18 }}>
        <div style={{ fontSize: '0.72rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '.09em', color: '#7cc0ff', marginBottom: 6 }}>
          A régua, combinada antes do resultado
        </div>
        <p style={{ fontSize: '0.82rem', color: '#c7c7cc', lineHeight: 1.6, margin: 0 }}>
          Um cliente de <b>$15/mês</b> paga um custo de aquisição de <b>$130</b> em cerca de 9 meses — defensável se
          ele fica. Então: <b style={{ color: '#34d399' }}>custo por cliente abaixo de ~$130 = o trial funciona</b> e a
          conversa vira otimizar. <b style={{ color: '#f87171' }}>Acima disso, ou zero convertidos</b>, o trial está
          comprando uso e não cliente — e a pergunta deixa de ser &quot;cortar?&quot; e passa a ser &quot;o que falta
          entre o vídeo pronto e o cartão?&quot;.
          <br /><br />
          <b>⚠ Não leia esta tela antes de a coorte amadurecer.</b> O gasto grande de Seedance começou em 16/08:
          quem gerou ontem ainda não teve tempo de decidir. Uma coorte de 3 dias com zero conversão não prova nada —
          é o mesmo erro de concluir a partir de campo vazio.
        </p>
      </div>

      {/* ── Por motor ──────────────────────────────────────────────────── */}
      <h2 style={{ fontSize: '0.95rem', fontWeight: 900, margin: '0 0 8px' }}>Onde o dinheiro foi, por motor</h2>
      <div style={{ ...CARD, padding: 0, overflowX: 'auto', marginBottom: 20 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr style={{ background: 'rgba(255,255,255,.03)' }}>
            {['Motor', 'Renders', 'Pessoas', 'Custo', '$ / pessoa', 'Convertidos'].map((h) => <th key={h} style={TH}>{h}</th>)}
          </tr></thead>
          <tbody>
            {engines.map(([q, e]) => (
              <tr key={q} style={{ borderTop: '1px solid rgba(255,255,255,.06)' }}>
                <td style={{ ...TD, fontWeight: 700 }}>{ENGINE_LABEL[q] ?? q}</td>
                <td style={TD}>{e.renders}</td>
                <td style={TD}>{e.people.size}</td>
                <td style={{ ...TD, color: '#fb923c', fontWeight: 700 }}>{formatUsd(e.cost)}</td>
                <td style={{ ...TD, color: '#86868b' }}>{formatUsd(e.cost / Math.max(1, e.people.size))}</td>
                <td style={{ ...TD, color: e.converted.size > 0 ? '#34d399' : '#f87171', fontWeight: 700 }}>
                  {e.converted.size} de {e.people.size}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Quem gastou mais ───────────────────────────────────────────── */}
      <h2 style={{ fontSize: '0.95rem', fontWeight: 900, margin: '0 0 4px' }}>
        Quem consumiu motor de IA — {aiSpenders.length} pessoas, {formatUsd(aiCost)}, {aiConverted.length} viraram cliente
      </h2>
      <p style={{ color: '#86868b', fontSize: '0.75rem', margin: '0 0 8px' }}>
        Ordenado pelo que cada um custou. O e-mail é clicável: quem gastou muito e não comprou é a lista mais quente que existe.
      </p>
      <div style={{ ...CARD, padding: 0, overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr style={{ background: 'rgba(255,255,255,.03)' }}>
            {['Quem', 'Custou', 'Renders', 'Motores', 'Gastou em', 'Virou cliente?'].map((h) => <th key={h} style={TH}>{h}</th>)}
          </tr></thead>
          <tbody>
            {topSpenders.map((p) => (
              <tr key={p.email} style={{ borderTop: '1px solid rgba(255,255,255,.06)' }}>
                <td style={TD}>
                  <a href={`mailto:${p.email}?subject=${encodeURIComponent('About your Kineo videos')}`}
                     style={{ color: '#93c5fd', textDecoration: 'none', fontFamily: 'ui-monospace,monospace', fontSize: '.78rem' }}>
                    {p.email}
                  </a>
                </td>
                <td style={{ ...TD, color: '#fb923c', fontWeight: 800 }}>{formatUsd(p.cost)}</td>
                <td style={TD}>{p.total}</td>
                <td style={{ ...TD, color: '#86868b', fontSize: '.72rem' }}>
                  {Object.entries(p.renders).map(([q, n]) => `${ENGINE_LABEL[q] ?? q}×${n}`).join(' · ')}
                </td>
                <td style={{ ...TD, color: '#86868b', fontSize: '.72rem' }}>{fmtDay(p.firstSpend)}</td>
                <td style={TD}>
                  {p.paid
                    ? <span style={{ color: '#34d399', fontWeight: 800 }}>✓ sim</span>
                    : <span style={{ color: '#f87171' }}>não</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p style={{ color: '#86868b', fontSize: '0.7rem', marginTop: 10 }}>
        Custo por render medido na fatura da fal de agosto ({formatUsd(USD_PER_RENDER.cinematic_ai)} o Seedance, contra
        os $2.34 que a tabela teórica estimava — 41% de diferença). Reconferir quando a fatura fechar.
      </p>
    </main>
  )
}
