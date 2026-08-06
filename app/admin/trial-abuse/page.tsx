// KINEO-TRIAL-ABUSE-PMP-2026-08-07 — /admin/trial-abuse: o painel mínimo do
// reverse trial. SOMENTE LEITURA — esta tela não tem um único caminho de
// escrita, de propósito: um botão "desbloquear este fingerprint" seria a
// primeira coisa a ser clicada sem contexto, e a decisão de conceder trial já
// falha aberto sozinha (ver lib/trialFingerprint.ts).
//
// Mesmo gate de todo /admin/*: sessão por cookie + ADMIN_EMAILS, checado no
// servidor ANTES de qualquer query, e a service-role key nunca entra no bundle
// do browser (Server Component).
//
// O que ele responde, e por que estas quatro perguntas:
//   1. Quantos trials estão ativos / venceram / foram rebaixados / converteram
//      — a taxa de conversão do experimento inteiro, por variante (3d vs 7d).
//   2. Quantos créditos foram CONCEDIDOS vs. USADOS — o custo real do brinde.
//      Lido da COLUNA trial_credits_granted (por linha), nunca da constante:
//      se o teto mudar, os trials antigos continuam somando o que receberam.
//   3. Quantos signups o fingerprint barrou — e o número que importa ao lado
//      dele: quantos ele DEIXOU passar. Um painel que só mostra bloqueios
//      convida a apertar o limite; mostrando os dois, o custo do falso
//      positivo fica na mesma linha do benefício.
//   4. Se a checagem FALHOU (tabela ausente, query com erro). Esse ramo concede
//      o trial silenciosamente, então sem esta linha o anti-abuso poderia estar
//      desligado há semanas sem ninguém notar.

import Link from 'next/link'
import type { CSSProperties } from 'react'
import { createClient } from '@/lib/supabase/server'
import { fetchAllRows, isAdminEmail, serviceClient } from '@/app/api/admin/_shared/db'
import { REVERSE_TRIAL_ENABLED, TRIAL_CREDIT_CAP } from '@/lib/reverseTrial'
import {
  TRIAL_FINGERPRINT_MAX_ACTIVATIONS,
  TRIAL_FINGERPRINT_TABLE,
  TRIAL_FINGERPRINT_WINDOW_DAYS,
} from '@/lib/trialFingerprint'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const CARD: CSSProperties = { background: '#161618', border: '1px solid #2a2a2d', borderRadius: 20 }

// ── data ────────────────────────────────────────────────────────────────────

interface TrialProfileRow {
  id: string
  email: string | null
  trial_status: string | null
  trial_variant: string | null
  trial_credits_granted: number | null
  trial_credits_used: number | null
  trial_ends_at: string | null
}

interface FingerprintRow {
  fingerprint_hash: string | null
  outcome: string | null
  created_at: string | null
}

interface EventRow {
  name: string | null
  created_at: string | null
}

interface VariantStat {
  variant: string
  total: number
  converted: number
}

interface AbuseData {
  byStatus: Record<string, number>
  totalTrials: number
  creditsGranted: number
  creditsUsed: number
  byVariant: VariantStat[]
  fingerprintTableMissing: boolean
  fpActivated30d: number
  fpBlocked30d: number
  fpBlockedAllTime: number
  checkFailed30d: number
  repeatOffenders: Array<{ label: string; activated: number; blocked: number; lastSeen: string | null }>
}

const DAY = 24 * 60 * 60 * 1000

async function loadAbuse(): Promise<AbuseData | null> {
  const admin = serviceClient()
  if (!admin) return null

  const [profiles, fingerprints, events] = await Promise.all([
    fetchAllRows<TrialProfileRow>(
      admin,
      'profiles',
      'id, email, trial_status, trial_variant, trial_credits_granted, trial_credits_used, trial_ends_at',
    ),
    // fetchAllRows já degrada para [] quando a query falha (loga um warn). Se a
    // migração ainda não rodou neste ambiente, o painel abre vazio em vez de
    // 500 — mas a linha "table missing" abaixo diz isso em voz alta.
    fetchAllRows<FingerprintRow>(admin, TRIAL_FINGERPRINT_TABLE, 'fingerprint_hash, outcome, created_at'),
    fetchAllRows<EventRow>(admin, 'events', 'name, created_at', {
      column: 'name',
      values: ['trial_blocked_fingerprint', 'trial_fingerprint_check_failed'],
    }),
  ])

  const since30 = Date.now() - TRIAL_FINGERPRINT_WINDOW_DAYS * DAY

  const byStatus: Record<string, number> = {}
  let creditsGranted = 0
  let creditsUsed = 0
  const variantMap = new Map<string, VariantStat>()
  for (const p of profiles) {
    const status = (p.trial_status ?? '').trim()
    if (!status) continue // nunca teve trial — fora de todas as contagens
    byStatus[status] = (byStatus[status] ?? 0) + 1
    creditsGranted += typeof p.trial_credits_granted === 'number' ? p.trial_credits_granted : 0
    creditsUsed += typeof p.trial_credits_used === 'number' ? p.trial_credits_used : 0
    const variant = (p.trial_variant ?? '?').trim() || '?'
    const stat = variantMap.get(variant) ?? { variant, total: 0, converted: 0 }
    stat.total += 1
    if (status === 'converted') stat.converted += 1
    variantMap.set(variant, stat)
  }
  const totalTrials = Object.values(byStatus).reduce((a, b) => a + b, 0)

  // A tabela pode existir e estar legitimamente vazia (flag OFF, que é o estado
  // de produção hoje). "Vazia" e "ausente" só se distinguem por uma pergunta
  // direta ao schema, e um painel que confunde as duas mente sobre o anti-abuso
  // estar ligado.
  let fingerprintTableMissing = false
  {
    const probe = await admin.from(TRIAL_FINGERPRINT_TABLE).select('id', { count: 'exact', head: true })
    if (probe.error) fingerprintTableMissing = true
  }

  let fpActivated30d = 0
  let fpBlocked30d = 0
  let fpBlockedAllTime = 0
  const perHash = new Map<string, { activated: number; blocked: number; lastSeen: string | null }>()
  for (const f of fingerprints) {
    const hash = (f.fingerprint_hash ?? '').trim()
    if (!hash) continue
    const ts = f.created_at ? Date.parse(f.created_at) : NaN
    const recent = Number.isFinite(ts) && ts >= since30
    const blocked = f.outcome === 'blocked'
    if (blocked) fpBlockedAllTime += 1
    if (recent) {
      if (blocked) fpBlocked30d += 1
      else fpActivated30d += 1
    }
    const entry = perHash.get(hash) ?? { activated: 0, blocked: 0, lastSeen: null }
    if (blocked) entry.blocked += 1
    else entry.activated += 1
    if (f.created_at && (!entry.lastSeen || f.created_at > entry.lastSeen)) entry.lastSeen = f.created_at
    perHash.set(hash, entry)
  }

  // PII: só o PREFIXO de 12 chars sai daqui. É o bastante para correlacionar
  // duas linhas desta tabela e inútil para qualquer outra coisa.
  const repeatOffenders = [...perHash.entries()]
    .filter(([, v]) => v.activated + v.blocked > 1)
    .sort((a, b) => b[1].activated + b[1].blocked - (a[1].activated + a[1].blocked))
    .slice(0, 25)
    .map(([hash, v]) => ({ label: hash.slice(0, 12), activated: v.activated, blocked: v.blocked, lastSeen: v.lastSeen }))

  let checkFailed30d = 0
  for (const e of events) {
    const ts = e.created_at ? Date.parse(e.created_at) : NaN
    if (!Number.isFinite(ts) || ts < since30) continue
    if (e.name === 'trial_fingerprint_check_failed') checkFailed30d += 1
  }

  return {
    byStatus,
    totalTrials,
    creditsGranted,
    creditsUsed,
    byVariant: [...variantMap.values()].sort((a, b) => b.total - a.total),
    fingerprintTableMissing,
    fpActivated30d,
    fpBlocked30d,
    fpBlockedAllTime,
    checkFailed30d,
    repeatOffenders,
  }
}

// ── formatting ──────────────────────────────────────────────────────────────

function fmtDate(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

const STATUS_ORDER = ['active', 'expired', 'downgraded', 'converted'] as const
const STATUS_ACCENT: Record<string, string> = {
  active: '#34d399',
  expired: '#fbbf24',
  downgraded: '#f87171',
  converted: '#2997ff',
}

// ── page ────────────────────────────────────────────────────────────────────

export default async function AdminTrialAbusePage() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user || !isAdminEmail(user.email)) {
    return (
      <Shell>
        <div className="rounded-2xl p-8 text-center" style={CARD}>
          <div className="text-5xl mb-3">🔒</div>
          <h1 className="text-xl font-black mb-2" style={{ color: '#f5f5f7' }}>Access denied.</h1>
          <p className="text-sm" style={{ color: '#86868b' }}>Admin only.</p>
        </div>
      </Shell>
    )
  }

  const data = await loadAbuse()
  if (!data) {
    return (
      <Shell>
        <div className="rounded-2xl p-8 text-center text-sm" style={{ ...CARD, color: '#86868b' }}>
          Service role not configured on this environment.
        </div>
      </Shell>
    )
  }

  const statuses = [
    ...STATUS_ORDER.filter((s) => data.byStatus[s] !== undefined),
    ...Object.keys(data.byStatus).filter((s) => !STATUS_ORDER.includes(s as (typeof STATUS_ORDER)[number])),
  ]

  return (
    <Shell>
      <div className="flex items-center justify-between gap-4 mb-1">
        <h1 className="text-2xl font-black" style={{ color: '#f5f5f7' }}>Reverse trial · abuse</h1>
        <Link href="/admin" className="text-[12px] font-bold" style={{ color: '#2997ff' }}>← Admin</Link>
      </div>
      <p className="text-[12px] mb-5" style={{ color: '#86868b' }}>
        Read-only. Flag <code>KINEO_REVERSE_TRIAL_ENABLED</code> is{' '}
        <strong style={{ color: REVERSE_TRIAL_ENABLED ? '#34d399' : '#fbbf24' }}>
          {REVERSE_TRIAL_ENABLED ? 'ON' : 'OFF'}
        </strong>
        {' · '}cap {TRIAL_CREDIT_CAP} credits{' · '}fingerprint limit{' '}
        {TRIAL_FINGERPRINT_MAX_ACTIVATIONS} activations / {TRIAL_FINGERPRINT_WINDOW_DAYS}d
      </p>

      {data.fingerprintTableMissing && (
        <div
          className="rounded-2xl p-4 mb-5 text-[12.5px]"
          style={{ background: 'rgba(248,113,113,.10)', border: '1px solid rgba(248,113,113,.35)', color: '#f87171' }}
        >
          <strong>{TRIAL_FINGERPRINT_TABLE} is missing on this environment.</strong> The device/IP guard
          is fail-open by design, so every signup is currently getting a trial with no device check.
          Apply the tail of <code>docs/SQL-REVERSE-TRIAL.sql</code>.
        </div>
      )}

      <section className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {statuses.map((s) => (
          <Stat key={s} label={s} value={data.byStatus[s] ?? 0} accent={STATUS_ACCENT[s] ?? '#f5f5f7'} />
        ))}
        {statuses.length === 0 && (
          <div className="col-span-2 md:col-span-4 rounded-2xl p-6 text-center text-sm" style={{ ...CARD, color: '#86868b' }}>
            No trial has ever been activated (expected while the flag is OFF).
          </div>
        )}
      </section>

      <section className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Stat label="trials, total" value={data.totalTrials} accent="#f5f5f7" />
        <Stat label="credits granted" value={data.creditsGranted} accent="#fbbf24" />
        <Stat label="credits used" value={data.creditsUsed} accent="#fbbf24" />
        <Stat
          label={`blocked by fingerprint (${TRIAL_FINGERPRINT_WINDOW_DAYS}d)`}
          value={data.fpBlocked30d}
          accent="#f87171"
        />
      </section>

      <section className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Stat
          label={`allowed by fingerprint (${TRIAL_FINGERPRINT_WINDOW_DAYS}d)`}
          value={data.fpActivated30d}
          accent="#34d399"
        />
        <Stat label="blocked, all time" value={data.fpBlockedAllTime} accent="#f87171" />
        <Stat label={`check failed (${TRIAL_FINGERPRINT_WINDOW_DAYS}d)`} value={data.checkFailed30d} accent="#fbbf24" />
        <Stat label="repeat fingerprints" value={data.repeatOffenders.length} accent="#f5f5f7" />
      </section>

      {data.byVariant.length > 0 && (
        <section className="rounded-2xl p-4 mb-6" style={CARD}>
          <h2 className="text-sm font-black mb-3" style={{ color: '#f5f5f7' }}>A/B · 3d vs 7d</h2>
          <div className="flex flex-wrap gap-3">
            {data.byVariant.map((v) => (
              <div key={v.variant} className="text-[12.5px]" style={{ color: '#86868b' }}>
                <strong style={{ color: '#f5f5f7' }}>{v.variant}</strong> · {v.total} trials ·{' '}
                {v.converted} converted{' '}
                <span style={{ color: '#2997ff' }}>
                  ({v.total > 0 ? Math.round((v.converted / v.total) * 100) : 0}%)
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="rounded-2xl overflow-hidden" style={CARD}>
        <div className="px-4 py-3 text-sm font-black" style={{ color: '#f5f5f7', borderBottom: '1px solid #2a2a2d' }}>
          Repeat fingerprints (2+ signups)
        </div>
        {data.repeatOffenders.length === 0 ? (
          <div className="px-4 py-6 text-center text-sm" style={{ color: '#86868b' }}>
            Nothing repeated yet.
          </div>
        ) : (
          <table className="w-full text-[12.5px]">
            <thead>
              <tr style={{ color: '#86868b', textAlign: 'left' }}>
                <Th>fingerprint</Th>
                <Th>trials granted</Th>
                <Th>blocked</Th>
                <Th>last seen</Th>
              </tr>
            </thead>
            <tbody>
              {data.repeatOffenders.map((r) => (
                <tr key={r.label} style={{ borderTop: '1px solid #2a2a2d' }}>
                  <Td><code style={{ color: '#86868b' }}>{r.label}…</code></Td>
                  <Td>{r.activated}</Td>
                  <Td style={{ color: r.blocked > 0 ? '#f87171' : '#f5f5f7' }}>{r.blocked}</Td>
                  <Td>{fmtDate(r.lastSeen)}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <p className="text-[11px] mt-3" style={{ color: '#6e6e73' }}>
        Fingerprint = SHA-256(salt · IP · user-agent · accept-language). Raw IPs are never stored, here
        or in logs — only the 12-char prefix shown above. Every failure mode of the check (missing salt,
        missing IP, missing table, query error) GRANTS the trial: &quot;check failed&quot; above counts
        those, and a number climbing there means the guard is effectively off, not that abuse is down.
      </p>
    </Shell>
  )
}

function Stat({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <div className="rounded-2xl p-4" style={CARD}>
      <div className="text-[11px] uppercase tracking-wider mb-1" style={{ color: '#86868b' }}>{label}</div>
      <div className="text-2xl font-black" style={{ color: accent }}>{value.toLocaleString('en-US')}</div>
    </div>
  )
}

function Th({ children }: { children: React.ReactNode }) {
  return <th style={{ padding: '10px 14px', fontWeight: 700, whiteSpace: 'nowrap' }}>{children}</th>
}

function Td({ children, style }: { children: React.ReactNode; style?: CSSProperties }) {
  return <td style={{ padding: '10px 14px', color: '#f5f5f7', whiteSpace: 'nowrap', ...style }}>{children}</td>
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: '#000', minHeight: '100vh' }}>
      <div className="px-4 sm:px-6 py-7 pb-20 max-w-[1400px] mx-auto">{children}</div>
    </div>
  )
}
