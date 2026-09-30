'use client'

// Admin — afiliados. KINEO-ADMIN-AFILIADOS-2026-09-30 (fundador: "reconstruir a página dos afiliados… deixa ela
// melhor, pra eu conseguir enxergar os dados melhor").
// Lê /api/admin/affiliates (403 = "Not authorized"). De cima para baixo: 6 números do programa (com a semana contra a
// anterior), cliques e cadastros dos últimos 30 dias, o funil clique → visitante → cadastro → pagante, os destinos
// dos links, e a tabela — busca, filtros, ordenação por coluna e, ao abrir a linha, os últimos cliques, as indicações,
// o link do afiliado e os controles de antes (taxa em %, cupom, aprovar/suspender/ativar). Cores pelos tokens do site
// (Porcelana claro/escuro), nada fixo.

import { Fragment, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'

type Money = Record<string, number>

interface Affiliate {
  id: string
  name: string | null
  email: string | null
  code: string
  status: string | null
  commission_rate: number | null
  coupon_code: string | null
  created_at: string | null
  internal: boolean
  clicks: number
  clicks7: number
  clicks30: number
  visitors: number
  lastClickAt: string | null
  signups: number
  signups30: number
  paid: number
  gross: Money
  owedByCurrency: Money
  paidOut: Money
  voided: Money
  spark: number[]
  recentClicks: { at: string; path: string | null; referrer: string | null }[]
  referrals: { email: string | null; status: string | null; firstTouchAt: string | null; convertedAt: string | null }[]
}

interface Dashboard {
  generatedAt: string
  totals: {
    affiliates: number
    internal: number
    active: number
    pending: number
    working30: number
    clicks: number
    clicks7: number
    clicksPrev7: number
    clicks30: number
    visitors: number
    hashedClicks: number
    signups: number
    signups30: number
    paid: number
    gross: Money
    owed: Money
    paidOut: Money
    voided: Money
  }
  daily: { day: string; clicks: number; signups: number }[]
  destinationClicks: Record<string, number>
  destinationLabels: Record<string, string>
  affiliates: Affiliate[]
}

type SortKey = 'name' | 'clicks7' | 'clicks30' | 'clicks' | 'visitors' | 'lastClickAt' | 'signups' | 'paid' | 'conv' | 'gross' | 'owed'
type Filter = 'all' | 'working' | 'idle' | 'selling' | 'pending'

const C = {
  bg: 'var(--bg)',
  card: 'var(--card)',
  soft: 'var(--card2)',
  border: '1px solid var(--border)',
  text: 'var(--text)',
  text2: 'var(--text2)',
  muted: 'var(--muted)',
  accent: 'var(--accent)',
  accentSoft: 'var(--accent-soft)',
  good: '#12A150',
  bad: '#D93025',
}

const SYMBOL: Record<string, string> = { usd: 'US$', brl: 'R$', eur: '€', gbp: '£' }
function money(m: Money | null | undefined): string {
  const parts = Object.entries(m ?? {})
    .filter(([, v]) => v !== 0)
    .sort(([a], [b]) => (a === 'usd' ? -1 : b === 'usd' ? 1 : a < b ? -1 : 1))
    .map(([cur, cents]) => `${SYMBOL[cur] ?? cur.toUpperCase() + ' '} ${(cents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`)
  return parts.length ? parts.join(' · ') : '—'
}
const moneyRank = (m: Money | null | undefined) => Object.values(m ?? {}).reduce((s, v) => s + v, 0)
const n = (v: number) => v.toLocaleString('pt-BR')
const pct = (num: number, den: number) => (den > 0 ? `${((num / den) * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%` : '—')

function ago(iso: string | null): string {
  if (!iso) return 'nunca'
  const ms = Date.now() - Date.parse(iso)
  if (!Number.isFinite(ms)) return '—'
  const min = Math.floor(ms / 60_000)
  if (min < 60) return `há ${Math.max(1, min)} min`
  const h = Math.floor(min / 60)
  if (h < 24) return `há ${h} h`
  const d = Math.floor(h / 24)
  return d < 60 ? `há ${d} d` : `há ${Math.floor(d / 30)} meses`
}
const date = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: '2-digit' }) : '—')
const dateTime = (iso: string | null) => (iso ? new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—')

function destinationOf(path: string | null, labels: Record<string, string>): string {
  if (!path) return labels.legacy ?? 'Home'
  try {
    const to = new URL(path, 'https://www.usekineo.com').searchParams.get('to')
    return (to && labels[to]) || labels.legacy || 'Home'
  } catch {
    return labels.legacy ?? 'Home'
  }
}
function hostOf(ref: string | null): string {
  if (!ref) return 'direto'
  try { return new URL(ref).hostname.replace(/^www\./, '') } catch { return ref.slice(0, 40) }
}

function StatusBadge({ status }: { status: string | null }) {
  const s = (status ?? '').toLowerCase()
  const map: Record<string, { label: string; bg: string; color: string }> = {
    active: { label: 'Ativo', bg: 'rgba(18,161,80,.12)', color: C.good },
    pending: { label: 'Pendente', bg: 'rgba(230,145,0,.14)', color: '#B86E00' },
    suspended: { label: 'Suspenso', bg: 'rgba(217,48,37,.12)', color: C.bad },
  }
  const st = map[s] ?? { label: status ?? '—', bg: C.accentSoft, color: C.muted }
  return (
    <span style={{ background: st.bg, color: st.color, fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 999, whiteSpace: 'nowrap' }}>
      {st.label}
    </span>
  )
}

function Spark({ values }: { values: number[] }) {
  const max = Math.max(1, ...values)
  const w = 70, h = 20, bw = w / values.length
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden="true" style={{ display: 'block' }}>
      {values.map((v, i) => {
        const bh = v === 0 ? 1.5 : Math.max(3, (v / max) * h)
        return <rect key={i} x={i * bw + 0.5} y={h - bh} width={bw - 1} height={bh} rx={1} fill={v === 0 ? 'var(--border)' : 'var(--accent)'} />
      })}
    </svg>
  )
}

function Tile({ label, value, hint, tone }: { label: string; value: string; hint?: string; tone?: 'good' | 'bad' | 'accent' }) {
  const color = tone === 'good' ? C.good : tone === 'bad' ? C.bad : tone === 'accent' ? C.accent : C.text
  return (
    <div style={{ background: C.card, border: C.border, borderRadius: 14, padding: '14px 16px', minWidth: 0 }}>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: C.muted }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 800, marginTop: 6, color, fontVariantNumeric: 'tabular-nums', lineHeight: 1.15, overflowWrap: 'anywhere' }}>{value}</div>
      {hint ? <div style={{ fontSize: 12, marginTop: 4, color: C.muted }}>{hint}</div> : null}
    </div>
  )
}

function DailyChart({ daily }: { daily: Dashboard['daily'] }) {
  const max = Math.max(1, ...daily.map((d) => d.clicks))
  const W = 900, H = 170, padL = 28, padB = 22, padT = 10
  const bw = (W - padL) / daily.length
  const y = (v: number) => padT + (H - padT - padB) * (1 - v / max)
  const ticks = max <= 4 ? Array.from({ length: max + 1 }, (_, i) => i) : [0, Math.round(max / 2), max]
  return (
    <div style={{ overflowX: 'auto' }}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ minWidth: 520, display: 'block' }} role="img" aria-label="Cliques e cadastros por dia, últimos 30 dias">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={padL} x2={W} y1={y(t)} y2={y(t)} stroke="var(--border)" strokeWidth={1} />
            <text x={padL - 6} y={y(t) + 4} textAnchor="end" fontSize={10} fill="var(--muted)">{t}</text>
          </g>
        ))}
        {daily.map((d, i) => {
          const x = padL + i * bw
          const top = y(d.clicks)
          return (
            <g key={d.day}>
              <title>{`${new Date(d.day + 'T12:00:00Z').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}: ${d.clicks} clique(s), ${d.signups} cadastro(s)`}</title>
              <rect x={x + 2} y={top} width={Math.max(2, bw - 4)} height={Math.max(0, H - padB - top)} rx={3} fill={d.clicks ? 'var(--accent)' : 'transparent'} opacity={0.85} />
              {d.signups > 0 ? <circle cx={x + bw / 2} cy={Math.max(padT + 5, top - 8)} r={5} fill={C.good} stroke="var(--card)" strokeWidth={2} /> : null}
              {i % 5 === 4 || i === daily.length - 1 ? (
                <text x={x + bw / 2} y={H - 6} textAnchor="middle" fontSize={10} fill="var(--muted)">
                  {new Date(d.day + 'T12:00:00Z').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                </text>
              ) : null}
            </g>
          )
        })}
      </svg>
    </div>
  )
}

function Funnel({ steps }: { steps: { label: string; value: number }[] }) {
  const top = Math.max(1, steps[0]?.value ?? 1)
  return (
    <div style={{ display: 'grid', gap: 10 }}>
      {steps.map((s, i) => (
        <div key={s.label} style={{ display: 'grid', gridTemplateColumns: 'minmax(96px,140px) 1fr auto', alignItems: 'center', gap: 10 }}>
          <div style={{ fontSize: 13, color: C.text2 }}>{s.label}</div>
          <div style={{ background: C.soft, borderRadius: 6, height: 14, overflow: 'hidden' }}>
            <div style={{ width: `${Math.max(s.value ? 2 : 0, (s.value / top) * 100)}%`, height: '100%', background: i === steps.length - 1 ? C.good : C.accent, borderRadius: 6 }} />
          </div>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.text, fontVariantNumeric: 'tabular-nums', minWidth: 96, textAlign: 'right' }}>
            {n(s.value)}
            {i > 0 ? <span style={{ fontWeight: 500, color: C.muted }}> · {pct(s.value, steps[i - 1].value)}</span> : null}
          </div>
        </div>
      ))}
    </div>
  )
}

const btn = (kind: 'primary' | 'ghost' | 'danger' = 'ghost'): React.CSSProperties => ({
  borderRadius: 8,
  padding: '6px 12px',
  fontSize: 12,
  fontWeight: 700,
  cursor: 'pointer',
  whiteSpace: 'nowrap',
  border: kind === 'primary' ? '1px solid var(--accent)' : kind === 'danger' ? '1px solid rgba(217,48,37,.45)' : C.border,
  background: kind === 'primary' ? 'var(--accent)' : kind === 'danger' ? 'rgba(217,48,37,.08)' : C.card,
  color: kind === 'primary' ? 'var(--on-accent)' : kind === 'danger' ? C.bad : C.text,
})
const input: React.CSSProperties = { background: C.card, border: C.border, color: C.text, borderRadius: 8, padding: '6px 10px', fontSize: 13, outline: 'none' }
const section: React.CSSProperties = { background: C.card, border: C.border, borderRadius: 16, padding: 18 }
const h2: React.CSSProperties = { fontSize: 14, fontWeight: 800, color: C.text, margin: 0 }

export default function AdminAffiliatesPage() {
  const [data, setData] = useState<Dashboard | null>(null)
  const [denied, setDenied] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [openId, setOpenId] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: 'clicks30', dir: -1 })
  const [rateDraft, setRateDraft] = useState<Record<string, string>>({})
  const [couponDraft, setCouponDraft] = useState<Record<string, string>>({})
  const [copied, setCopied] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/affiliates', { cache: 'no-store' })
      if (res.status === 403) { setDenied(true); return }
      const json = await res.json()
      if (!res.ok) { setError(json?.error ?? `Erro ${res.status}`); return }
      setError(null)
      const d = json as Dashboard
      setData(d)
      const rd: Record<string, string> = {}
      const cd: Record<string, string> = {}
      for (const a of d.affiliates) {
        rd[a.id] = a.commission_rate != null ? String(Math.round(a.commission_rate * 1000) / 10) : ''
        cd[a.id] = a.coupon_code ?? ''
      }
      setRateDraft(rd)
      setCouponDraft(cd)
    } catch {
      setError('Não consegui carregar os afiliados. Tente atualizar.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function post(id: string, body: Record<string, unknown>) {
    setBusyId(id)
    try {
      await fetch(`/api/admin/affiliates/${id}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      await load()
    } finally {
      setBusyId(null)
    }
  }

  async function copyLink(code: string) {
    const url = `https://www.usekineo.com/a/${code}`
    try { await navigator.clipboard.writeText(url); setCopied(code); setTimeout(() => setCopied(null), 1500) } catch { /* sem permissão de área de transferência */ }
  }

  const rows = useMemo(() => {
    const list = data?.affiliates ?? []
    const q = query.trim().toLowerCase()
    const filtered = list.filter((a) => {
      if (q && !`${a.name ?? ''} ${a.email ?? ''} ${a.code} ${a.coupon_code ?? ''}`.toLowerCase().includes(q)) return false
      if (filter !== 'all' && a.internal) return false
      if (filter === 'working') return a.clicks30 > 0
      if (filter === 'idle') return a.clicks30 === 0
      if (filter === 'selling') return a.paid > 0
      if (filter === 'pending') return (a.status ?? '').toLowerCase() === 'pending'
      return true
    })
    const val = (a: Affiliate): number | string => {
      switch (sort.key) {
        case 'name': return (a.name || a.email || a.code).toLowerCase()
        case 'lastClickAt': return a.lastClickAt ? Date.parse(a.lastClickAt) : 0
        case 'conv': return a.clicks ? a.signups / a.clicks : -1
        case 'gross': return moneyRank(a.gross)
        case 'owed': return moneyRank(a.owedByCurrency)
        default: return a[sort.key]
      }
    }
    return [...filtered].sort((x, y) => {
      // A conta da casa fica sempre no fim, qualquer que seja a coluna.
      if (x.internal !== y.internal) return x.internal ? 1 : -1
      const a = val(x), b = val(y)
      return (a < b ? -1 : a > b ? 1 : 0) * sort.dir
    })
  }, [data, query, filter, sort])

  if (denied) {
    return (
      <div style={{ background: C.bg, minHeight: '100vh', padding: '64px 16px' }}>
        <div style={{ ...section, maxWidth: 420, margin: '0 auto', textAlign: 'center' }}>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: C.text, margin: 0 }}>Not authorized</h1>
          <p style={{ color: C.muted, fontSize: 14, marginTop: 8 }}>Admin only.</p>
        </div>
      </div>
    )
  }

  const t = data?.totals
  // "Pessoas" só quando quase todo clique tem o IP anonimizado (sem AFFILIATE_IP_SALT o link não grava).
  const peopleOk = !!t && (t.clicks === 0 || t.hashedClicks / t.clicks >= 0.9)
  const weekDelta = t ? t.clicks7 - t.clicksPrev7 : 0
  const labels = data?.destinationLabels ?? {}
  const filters: { key: Filter; label: string; count: number }[] = [
    { key: 'all', label: 'Todos', count: data?.affiliates.length ?? 0 },
    { key: 'working', label: 'Trazendo cliques (30 d)', count: data?.affiliates.filter((a) => !a.internal && a.clicks30 > 0).length ?? 0 },
    { key: 'idle', label: 'Parados', count: data?.affiliates.filter((a) => !a.internal && a.clicks30 === 0).length ?? 0 },
    { key: 'selling', label: 'Com venda', count: data?.affiliates.filter((a) => !a.internal && a.paid > 0).length ?? 0 },
    { key: 'pending', label: 'Pendentes', count: t?.pending ?? 0 },
  ]
  const cols: { key: SortKey; label: string; align?: 'right' }[] = [
    { key: 'name', label: 'Afiliado' },
    { key: 'clicks7', label: '7 d', align: 'right' },
    { key: 'clicks30', label: '30 d', align: 'right' },
    { key: 'clicks', label: 'Total', align: 'right' },
    ...(peopleOk ? [{ key: 'visitors' as SortKey, label: 'Pessoas', align: 'right' as const }] : []),
    { key: 'lastClickAt', label: 'Último clique' },
    { key: 'signups', label: 'Cadastros', align: 'right' },
    { key: 'paid', label: 'Pagantes', align: 'right' },
    { key: 'conv', label: 'Clique→cad.', align: 'right' },
    { key: 'gross', label: 'Vendas', align: 'right' },
    { key: 'owed', label: 'A pagar', align: 'right' },
  ]
  const th = (align?: 'right'): React.CSSProperties => ({ padding: '10px 10px', fontSize: 11, fontWeight: 700, letterSpacing: '.04em', textTransform: 'uppercase', color: C.muted, textAlign: align ?? 'left', whiteSpace: 'nowrap', borderBottom: C.border, background: C.soft, position: 'sticky', top: 0 })
  const td = (align?: 'right'): React.CSSProperties => ({ padding: '10px 10px', fontSize: 13, color: C.text, textAlign: align ?? 'left', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums', verticalAlign: 'middle' })

  return (
    <div style={{ background: C.bg, minHeight: '100vh' }}>
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '28px 16px 96px', display: 'grid', gap: 16 }}>
        {/* Cabeçalho */}
        <header style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.accent, letterSpacing: '.08em', textTransform: 'uppercase' }}>Admin</div>
            <h1 style={{ fontSize: 28, fontWeight: 800, color: C.text, margin: '2px 0 0', letterSpacing: '-.01em' }}>Afiliados</h1>
            <p style={{ fontSize: 13, color: C.muted, margin: '4px 0 0' }}>
              {data ? `${n(t!.affiliates)} afiliados${t!.internal ? ` (+${n(t!.internal)} da casa, fora dos totais)` : ''} · atualizado ${dateTime(data.generatedAt)}` : loading ? 'Carregando…' : ''}
            </p>
          </div>
          <nav style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button type="button" onClick={load} disabled={loading} style={btn('ghost')}>{loading ? 'Atualizando…' : 'Atualizar'}</button>
            <a href="/api/admin/affiliates/export" style={{ ...btn('ghost'), textDecoration: 'none' }}>Exportar comissões (CSV)</a>
            <Link href="/admin/funnel" style={{ ...btn('ghost'), textDecoration: 'none' }}>← Funil</Link>
          </nav>
        </header>

        {error ? <div style={{ ...section, color: C.bad, fontSize: 14 }}>{error}</div> : null}

        {!data ? (
          <div style={{ ...section, height: 220 }} aria-busy="true" />
        ) : (
          <>
            {/* Números do programa */}
            <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12 }}>
              <Tile label="Afiliados trazendo gente" value={`${n(t!.working30)} de ${n(t!.affiliates)}`} hint="com clique nos últimos 30 dias" tone="accent" />
              <Tile
                label="Cliques · 7 dias"
                value={n(t!.clicks7)}
                hint={`${weekDelta > 0 ? '+' : ''}${n(weekDelta)} vs. 7 dias anteriores (${n(t!.clicksPrev7)})`}
                tone={weekDelta > 0 ? 'good' : weekDelta < 0 ? 'bad' : undefined}
              />
              <Tile label="Cliques · 30 dias" value={n(t!.clicks30)} hint={`${n(t!.clicks)} desde o início${peopleOk ? ` · ${n(t!.visitors)} pessoas` : ''}`} />
              <Tile label="Cadastros" value={n(t!.signups)} hint={`${n(t!.signups30)} em 30 dias · ${pct(t!.signups, t!.clicks)} dos cliques`} />
              <Tile label="Pagantes" value={n(t!.paid)} hint={`${pct(t!.paid, t!.signups)} dos cadastros`} tone={t!.paid > 0 ? 'good' : undefined} />
              <Tile label="Vendas atribuídas" value={money(t!.gross)} hint={`a pagar ${money(t!.owed)} · pago ${money(t!.paidOut)}${moneyRank(t!.voided) ? ` · anulado ${money(t!.voided)}` : ''}`} />
            </section>

            {/* Tempo */}
            <section style={{ ...section, minWidth: 0 }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
                  <h2 style={h2}>Últimos 30 dias</h2>
                  <div style={{ fontSize: 12, color: C.muted, display: 'flex', gap: 14 }}>
                    <span><span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 2, background: 'var(--accent)', marginRight: 6 }} />cliques</span>
                    <span><span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 999, background: C.good, marginRight: 6 }} />dia com cadastro</span>
                  </div>
                </div>
                <DailyChart daily={data.daily} />
              </div>
            </section>

            {/* Funil + destinos */}
            <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 380px), 1fr))', gap: 12 }}>
              <div style={{ ...section, minWidth: 0 }}>
                <h2 style={{ ...h2, marginBottom: 14 }}>Funil desde o início</h2>
                <Funnel steps={[
                  { label: 'Cliques', value: t!.clicks },
                  ...(peopleOk ? [{ label: 'Pessoas', value: t!.visitors }] : []),
                  { label: 'Cadastros', value: t!.signups },
                  { label: 'Pagantes', value: t!.paid },
                ]} />
                <p style={{ fontSize: 12, color: C.muted, margin: '14px 0 0' }}>
                  {peopleOk
                    ? 'Pessoas = aparelhos diferentes (por IP anonimizado). % = em relação à etapa anterior.'
                    : `% = em relação à etapa anterior. Pessoas únicas indisponíveis: só ${pct(t!.hashedClicks, t!.clicks)} dos cliques têm IP anonimizado — o link não grava o IP sem a variável AFFILIATE_IP_SALT na Vercel.`}
                </p>
              </div>
              <div style={{ ...section, minWidth: 0 }} aria-label="Affiliate click destinations">
                <h2 style={{ ...h2, marginBottom: 12 }}>Para onde os links levam</h2>
                <div style={{ display: 'grid', gap: 8 }}>
                  {Object.entries(data.destinationClicks).sort(([, a], [, b]) => b - a).map(([k, v]) => (
                    <div key={k} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, fontSize: 13 }}>
                      <span style={{ color: C.text2 }}>{labels[k] ?? k}</span>
                      <span style={{ fontWeight: 700, color: v ? C.text : C.muted, fontVariantNumeric: 'tabular-nums' }}>{n(v)}</span>
                    </div>
                  ))}
                </div>
                <p style={{ fontSize: 12, color: C.muted, margin: '12px 0 0' }}>Visitas ao link (raw link visits), não pessoas.</p>
              </div>
            </section>

            {/* Tabela */}
            <section style={{ ...section, padding: 0, overflow: 'hidden' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', justifyContent: 'space-between', padding: 14, borderBottom: C.border }}>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {filters.map((f) => (
                    <button
                      key={f.key}
                      type="button"
                      onClick={() => setFilter(f.key)}
                      style={{ ...btn(filter === f.key ? 'primary' : 'ghost'), borderRadius: 999, padding: '5px 12px' }}
                    >
                      {f.label} <span style={{ opacity: 0.7 }}>{f.count}</span>
                    </button>
                  ))}
                </div>
                <input
                  id="affiliate-search"
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Buscar nome, e-mail, código ou cupom"
                  aria-label="Buscar afiliado"
                  style={{ ...input, width: 'min(100%, 300px)' }}
                />
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1080 }}>
                  <thead>
                    <tr>
                      {cols.map((c) => (
                        <th key={c.key} style={th(c.align)}>
                          <button
                            type="button"
                            onClick={() => setSort((s) => ({ key: c.key, dir: s.key === c.key ? (s.dir === 1 ? -1 : 1) : c.key === 'name' ? 1 : -1 }))}
                            style={{ all: 'unset', cursor: 'pointer' }}
                          >
                            {c.label}{sort.key === c.key ? (sort.dir === -1 ? ' ↓' : ' ↑') : ''}
                          </button>
                        </th>
                      ))}
                      <th style={th()}>14 d</th>
                      <th style={th()}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((a) => {
                      const open = openId === a.id
                      const busy = busyId === a.id
                      const status = (a.status ?? '').toLowerCase()
                      return (
                        <Fragment key={a.id}>
                          <tr
                            onClick={() => setOpenId(open ? null : a.id)}
                            style={{ borderTop: C.border, cursor: 'pointer', background: open ? C.soft : 'transparent' }}
                          >
                            <td style={{ ...td(), maxWidth: 260 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span style={{ color: C.muted, fontSize: 11, width: 10 }}>{open ? '▾' : '▸'}</span>
                                <div style={{ minWidth: 0 }}>
                                  <div style={{ fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.name || a.email || a.code}</div>
                                  <div style={{ fontSize: 12, color: C.muted, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    <code style={{ color: C.accent, fontWeight: 700 }}>{a.code}</code> · desde {date(a.created_at)}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td style={{ ...td('right'), fontWeight: a.clicks7 ? 700 : 400, color: a.clicks7 ? C.text : C.muted }}>{n(a.clicks7)}</td>
                            <td style={{ ...td('right'), fontWeight: a.clicks30 ? 700 : 400, color: a.clicks30 ? C.text : C.muted }}>{n(a.clicks30)}</td>
                            <td style={{ ...td('right'), color: C.muted }}>{n(a.clicks)}</td>
                            {peopleOk ? <td style={{ ...td('right'), color: C.muted }}>{n(a.visitors)}</td> : null}
                            <td style={{ ...td(), color: a.lastClickAt ? C.text2 : C.muted }} title={dateTime(a.lastClickAt)}>{ago(a.lastClickAt)}</td>
                            <td style={{ ...td('right'), color: a.signups ? C.text : C.muted }}>{n(a.signups)}</td>
                            <td style={{ ...td('right'), color: a.paid ? C.good : C.muted, fontWeight: a.paid ? 800 : 400 }}>{n(a.paid)}</td>
                            <td style={{ ...td('right'), color: C.muted }}>{pct(a.signups, a.clicks)}</td>
                            <td style={{ ...td('right') }}>{money(a.gross)}</td>
                            <td style={{ ...td('right'), fontWeight: moneyRank(a.owedByCurrency) ? 800 : 400, color: moneyRank(a.owedByCurrency) ? C.text : C.muted }}>{money(a.owedByCurrency)}</td>
                            <td style={td()}><Spark values={a.spark} /></td>
                            <td style={td()}>
                              {a.internal ? (
                                <span title="Conta da casa: fora dos totais" style={{ background: C.accentSoft, color: C.accent, fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 999, whiteSpace: 'nowrap' }}>Casa</span>
                              ) : (
                                <StatusBadge status={a.status} />
                              )}
                            </td>
                          </tr>
                          {open ? (
                            <tr style={{ background: C.soft }}>
                              <td colSpan={cols.length + 2} style={{ padding: '4px 16px 18px' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 }}>
                                  <div style={{ ...section, padding: 14 }}>
                                    <h3 style={{ ...h2, fontSize: 13, marginBottom: 10 }}>Conta</h3>
                                    <div style={{ fontSize: 13, color: C.text2, display: 'grid', gap: 6 }}>
                                      {a.name ? <div>{a.name}</div> : null}
                                      <div style={{ color: C.muted, overflowWrap: 'anywhere' }}>{a.email || '—'}</div>
                                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                                        <code style={{ fontSize: 12, color: C.text, overflowWrap: 'anywhere' }}>usekineo.com/a/{a.code}</code>
                                        <button type="button" onClick={(e) => { e.stopPropagation(); copyLink(a.code) }} style={btn('ghost')}>{copied === a.code ? 'Copiado' : 'Copiar link'}</button>
                                      </div>
                                      <div style={{ color: C.muted }}>Comissão paga: {money(a.paidOut)}{moneyRank(a.voided) ? ` · anulada: ${money(a.voided)}` : ''}</div>
                                    </div>
                                    <div style={{ display: 'grid', gap: 8, marginTop: 14 }} onClick={(e) => e.stopPropagation()}>
                                      <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13, color: C.text2 }}>
                                        <span style={{ width: 70 }}>Comissão</span>
                                        <input id={`rate-${a.id}`} type="number" min={0} max={100} step={0.5} value={rateDraft[a.id] ?? ''} onChange={(e) => setRateDraft((d) => ({ ...d, [a.id]: e.target.value }))} style={{ ...input, width: 80 }} />
                                        <span>%</span>
                                        <button type="button" disabled={busy} onClick={() => { const p = parseFloat(rateDraft[a.id]); if (!Number.isNaN(p)) post(a.id, { commission_rate: p / 100 }) }} style={btn('ghost')}>Salvar</button>
                                      </label>
                                      <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13, color: C.text2 }}>
                                        <span style={{ width: 70 }}>Cupom</span>
                                        <input id={`coupon-${a.id}`} type="text" value={couponDraft[a.id] ?? ''} placeholder="—" onChange={(e) => setCouponDraft((d) => ({ ...d, [a.id]: e.target.value }))} style={{ ...input, width: 140 }} />
                                        <button type="button" disabled={busy} onClick={() => post(a.id, { coupon_code: couponDraft[a.id] ?? '' })} style={btn('ghost')}>Definir</button>
                                      </label>
                                      <div style={{ display: 'flex', gap: 8 }}>
                                        {status === 'pending' ? <button type="button" disabled={busy} onClick={() => post(a.id, { action: 'approve' })} style={btn('primary')}>Aprovar</button> : null}
                                        {status === 'suspended'
                                          ? <button type="button" disabled={busy} onClick={() => post(a.id, { action: 'activate' })} style={btn('primary')}>Reativar</button>
                                          : <button type="button" disabled={busy} onClick={() => post(a.id, { action: 'suspend' })} style={btn('danger')}>Suspender</button>}
                                      </div>
                                    </div>
                                  </div>
                                  <div style={{ ...section, padding: 14, minWidth: 0 }}>
                                    <h3 style={{ ...h2, fontSize: 13, marginBottom: 10 }}>Últimos cliques</h3>
                                    {a.recentClicks.length === 0 ? (
                                      <p style={{ fontSize: 13, color: C.muted, margin: 0 }}>Nenhum clique ainda. O link nunca foi usado.</p>
                                    ) : (
                                      <div style={{ display: 'grid', gap: 8 }}>
                                        {a.recentClicks.map((c, i) => (
                                          <div key={i} style={{ display: 'grid', gridTemplateColumns: '98px 1fr', gap: 8, fontSize: 12 }}>
                                            <span style={{ color: C.muted, fontVariantNumeric: 'tabular-nums' }}>{dateTime(c.at)}</span>
                                            <span style={{ color: C.text2, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                              {destinationOf(c.path, labels)} <span style={{ color: C.muted }}>· de {hostOf(c.referrer)}</span>
                                            </span>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                  <div style={{ ...section, padding: 14, minWidth: 0 }}>
                                    <h3 style={{ ...h2, fontSize: 13, marginBottom: 10 }}>Indicações ({n(a.referrals.length)})</h3>
                                    {a.referrals.length === 0 ? (
                                      <p style={{ fontSize: 13, color: C.muted, margin: 0 }}>Ninguém se cadastrou por este link ainda.</p>
                                    ) : (
                                      <div style={{ display: 'grid', gap: 8 }}>
                                        {a.referrals.map((r, i) => (
                                          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 12 }}>
                                            <span style={{ color: C.text2, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.email || '—'}</span>
                                            <span style={{ color: r.status === 'paid' ? C.good : C.muted, fontWeight: r.status === 'paid' ? 700 : 400, whiteSpace: 'nowrap' }}>
                                              {r.status === 'paid' ? `pagou ${date(r.convertedAt)}` : `cadastro ${date(r.firstTouchAt)}`}
                                            </span>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </td>
                            </tr>
                          ) : null}
                        </Fragment>
                      )
                    })}
                    {rows.length === 0 ? (
                      <tr>
                        <td colSpan={cols.length + 2} style={{ padding: 32, textAlign: 'center', color: C.muted, fontSize: 14 }}>
                          {data.affiliates.length === 0 ? 'Nenhum afiliado ainda.' : 'Nenhum afiliado neste filtro.'}
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  )
}
