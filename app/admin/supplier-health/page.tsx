// KINEO-SUPPLIER-ALARM-2026-08-11 — /admin/supplier-health: uma LINHA por
// fornecedor com consumo do ciclo, ritmo diário e data projetada de estouro.
//
// POR QUE ESTA TELA EXISTE: em 09/08 a cota do Creatomate zerou e o produto
// ficou ~33 horas sem renderizar UM vídeo. O apagão foi descoberto porque o
// fundador PERGUNTOU. Não existia nenhuma superfície onde a resposta
// "quantos créditos restam e quando acabam?" pudesse ser lida em 5 segundos.
// Agora existe, e ela usa exatamente o mesmo cálculo do alarme automático
// (lib/supplier/burn.ts) — painel e alarme nunca discordam.
//
// READ-ONLY POR CONSTRUÇÃO: só SELECT. Não envia e-mail, não escreve evento,
// não muda plano, cota, preço ou entitlement. Gate idêntico a todo /admin/*.

import Link from 'next/link'
import type { CSSProperties } from 'react'
import { createClient } from '@/lib/supabase/server'
import { isAdminEmail, serviceClient } from '@/app/api/admin/_shared/db'
import { readSupplierBurn, type SupplierBurnRow } from '@/lib/supplier/burn'
import {
  readGenerationHealth,
  describeRules,
  FAILURE_RATE_PCT,
  FAST_MIN_ATTEMPTS,
  SLOW_MIN_ATTEMPTS,
  MIN_DISTINCT_USERS,
  REASON_REPEAT_MIN,
  type GenerationHealth,
} from '@/lib/supplier/generationHealth'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const CARD: CSSProperties = { background: '#161618', border: '1px solid #2a2a2d', borderRadius: 20 }

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: '#000', minHeight: '100vh' }}>
      <div className="px-4 sm:px-6 py-7 pb-20 max-w-[1400px] mx-auto">{children}</div>
    </div>
  )
}

function fmtAmount(row: SupplierBurnRow, value: number): string {
  return row.unit === 'usd'
    ? `$${value.toFixed(2)}`
    : Math.round(value).toLocaleString('en-US')
}

function fmtDate(iso: string | null): string {
  if (!iso) return '—'
  return iso.slice(0, 10)
}

/** Verde / âmbar / vermelho pela pergunta que importa: dá para dormir? */
function rowAccent(row: SupplierBurnRow): string {
  if (row.willBlowBeforeCycleEnd) return '#f87171'
  if (row.percentUsed !== null && row.percentUsed >= 70) return '#fbbf24'
  return '#34d399'
}

export default async function AdminSupplierHealthPage() {
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

  const admin = serviceClient()
  if (!admin) {
    return (
      <Shell>
        <div className="rounded-2xl p-8 text-center text-sm" style={{ ...CARD, color: '#86868b' }}>
          Service role not configured on this environment.
        </div>
      </Shell>
    )
  }

  const now = new Date()
  const [rows, health]: [SupplierBurnRow[], GenerationHealth | null] = await Promise.all([
    readSupplierBurn(admin, now),
    readGenerationHealth(admin, now),
  ])

  const worst = rows.filter((r) => r.willBlowBeforeCycleEnd)

  return (
    <Shell>
      <header className="mb-6">
        <div className="font-black uppercase tracking-widest mb-1" style={{ fontSize: '0.62rem', color: '#fbbf24' }}>
          Admin · Supplier health
        </div>
        <h1 className="font-black tracking-tight" style={{ fontSize: '1.6rem', color: '#f5f5f7' }}>
          {worst.length === 0
            ? 'No supplier is projected to run out this cycle'
            : `${worst.length} supplier${worst.length === 1 ? '' : 's'} projected to run out BEFORE the cycle ends`}
        </h1>
        <p className="text-xs mt-1" style={{ color: '#86868b' }}>
          Cycle consumption, daily burn and projected exhaustion date per supplier. Read-only — the
          alarm itself is /api/cron/supplier-watch, hourly, and it uses these exact numbers.
          The company went dark twice in 11 days on supplier balance (31/07 and 09–11/08) with nobody
          watching; see docs/INCIDENTES-FORNECEDOR.md.
        </p>
        <nav className="flex gap-1 mt-4 flex-wrap">
          {[
            { label: '← CEO', href: '/admin' },
            { label: 'Metrics', href: '/admin/metrics' },
            { label: 'Overview', href: '/admin/overview' },
            { label: 'Cohort', href: '/admin/trial-cohort' },
          ].map((t) => (
            <Link key={t.href} href={t.href} className="px-3 py-1.5 rounded-lg text-xs font-bold" style={{ color: '#86868b' }}>
              {t.label}
            </Link>
          ))}
        </nav>
      </header>

      {/* ── one line per supplier ─────────────────────────────────────────── */}
      <section className="rounded-2xl overflow-hidden mb-6" style={CARD}>
        <div className="overflow-x-auto">
          <table className="w-full text-left" style={{ borderCollapse: 'collapse', minWidth: 900 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #2a2a2d' }}>
                {['Supplier', 'Cycle', 'Used / limit', '%', 'Burn per day', 'Projected exhaustion'].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-[10px] font-black uppercase tracking-widest"
                    style={{ color: '#86868b' }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-sm" style={{ color: '#86868b' }}>
                    Could not measure supplier consumption right now. This is NOT a sign of health —
                    reload, and check the service-role key if it persists.
                  </td>
                </tr>
              )}
              {rows.map((r) => {
                const accent = rowAccent(r)
                return (
                  <tr key={r.key} style={{ borderBottom: '1px solid #202023' }}>
                    <td className="px-4 py-4 align-top" style={{ minWidth: 260 }}>
                      <div className="font-black text-sm" style={{ color: '#f5f5f7' }}>{r.label}</div>
                      <div className="text-[11px] mt-1" style={{ color: '#6e6e73' }}>{r.basis}</div>
                      <div className="text-[11px] mt-1" style={{ color: '#6e6e73' }}>{r.note}</div>
                    </td>
                    <td className="px-4 py-4 align-top text-xs" style={{ color: '#86868b', whiteSpace: 'nowrap' }}>
                      {r.cycleLabel}
                      {r.daysLeftInCycle !== null && (
                        <div className="text-[11px] mt-1">{r.daysLeftInCycle.toFixed(1)}d left</div>
                      )}
                    </td>
                    <td className="px-4 py-4 align-top text-sm font-bold" style={{ color: '#f5f5f7', whiteSpace: 'nowrap' }}>
                      {fmtAmount(r, r.used)}
                      <span style={{ color: '#6e6e73' }}>
                        {' / '}
                        {r.limit === null ? 'unknown' : fmtAmount(r, r.limit)}
                      </span>
                    </td>
                    <td className="px-4 py-4 align-top font-black" style={{ color: accent, whiteSpace: 'nowrap' }}>
                      {r.percentUsed === null ? '—' : `${r.percentUsed.toFixed(1)}%`}
                    </td>
                    <td className="px-4 py-4 align-top text-sm" style={{ color: '#f5f5f7', whiteSpace: 'nowrap' }}>
                      {fmtAmount(r, r.perDay)}
                      <span className="text-[11px]" style={{ color: '#6e6e73' }}>
                        {r.unit === 'usd' ? '/day' : ' cr/day'}
                      </span>
                    </td>
                    <td className="px-4 py-4 align-top text-sm font-bold" style={{ color: accent, whiteSpace: 'nowrap' }}>
                      {fmtDate(r.projectedExhaustionIso)}
                      {r.willBlowBeforeCycleEnd && (
                        <div className="text-[11px] font-black mt-1">BEFORE CYCLE END</div>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── the symptom side ──────────────────────────────────────────────── */}
      <section className="rounded-2xl p-5 mb-6" style={CARD}>
        <div className="text-[10px] font-black uppercase tracking-widest mb-3" style={{ color: '#86868b' }}>
          Delivery right now (what the alarm actually watches)
        </div>
        {!health ? (
          <p className="text-sm" style={{ color: '#f87171' }}>
            Could not read generation health. Not a sign of health — the alarm treats this as
            &quot;unmeasured&quot; and stays quiet, so check PostgREST if it persists.
          </p>
        ) : (
          <>
            <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
              {health.windows.map((w) => (
                <div key={w.key} className="rounded-xl p-4" style={{ background: '#1c1c1f', border: '1px solid #2a2a2d' }}>
                  <div className="text-[10px] font-black uppercase tracking-widest mb-2" style={{ color: '#86868b' }}>
                    {w.label}
                  </div>
                  <div
                    className="font-black"
                    style={{ fontSize: '1.9rem', lineHeight: 1.1, color: w.triggered.length ? '#f87171' : '#f5f5f7' }}
                  >
                    {w.failureRatePct === null ? '—' : `${w.failureRatePct.toFixed(0)}%`}
                  </div>
                  <p className="text-[11px] mt-1" style={{ color: '#86868b' }}>
                    {w.attempts} attempt{w.attempts === 1 ? '' : 's'} · {w.completed} delivered ·{' '}
                    {w.failed} failed · {w.distinctUsers} people
                  </p>
                  {w.topReason && (
                    <p className="text-[11px] mt-1" style={{ color: '#6e6e73' }}>
                      top reason: {w.topReason} ({w.topReasonCount}×)
                    </p>
                  )}
                  {w.triggered.length > 0 && (
                    <p className="text-[11px] mt-2 font-black" style={{ color: '#f87171' }}>
                      FIRING: {describeRules(w.triggered)}
                    </p>
                  )}
                </div>
              ))}
            </div>
            <p className="text-[11px] mt-3" style={{ color: '#6e6e73' }}>
              Rules: (a) ≥{FAST_MIN_ATTEMPTS} attempts in 1h (≥{SLOW_MIN_ATTEMPTS} in 6h) and ≥
              {FAILURE_RATE_PCT}% failed · (b) zero deliveries with the same minimum · (c) the same
              failure reason ≥{REASON_REPEAT_MIN}×. All of them also require ≥{MIN_DISTINCT_USERS}{' '}
              distinct people, so one person in a retry loop never pages anyone. Our own refusals
              (free wall, active-render gate, trial gates) are excluded from rule (c) on purpose —
              they fire on healthy days.
            </p>
          </>
        )}
      </section>

      <p className="text-[11px]" style={{ color: '#6e6e73' }}>
        Numbers are estimates reconstructed from our own tables — no supplier here exposes balance
        over API. They are calibrated against the one real reading we have (Creatomate panel, 10/08:
        10.0K of 10.0K) and deliberately biased to over-count, because a meter that under-counts
        rings late, and late is the defect being fixed.
      </p>
    </Shell>
  )
}
