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
// KINEO-FAL-SALDO-ALERTA-2026-09-28 — card do topo: o alarme de saldo da fal, contado no banco.
import { readFalBalancePanel, falRefusalIsFresh, falLastRefusalAt, falStuckMoneyState, FAL_PANEL_MIGRATION, FAL_PANEL_IN_FLIGHT_MINUTES, type FalBalancePanel } from '@/lib/supplier/falBalancePanel'
import { FAL_BILLING_URL } from '@/lib/falAlert'
import { INTERNAL_ACCOUNTS_LABEL } from '@/lib/internalAccounts'
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

const CARD: CSSProperties = { background: 'var(--card)', border: '1px solid #1F2530', borderRadius: 20 }

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
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

function fmtUtc(iso: string): string {
  const t = Date.parse(iso)
  return Number.isFinite(t) ? `${new Date(t).toISOString().slice(0, 16).replace('T', ' ')} UTC` : iso
}

function fmtN(v: number | null): string {
  return v === null ? '—' : Math.round(v).toLocaleString('en-US')
}

/**
 * KINEO-FAL-SALDO-ALERTA-2026-09-28 — "a fal travou por saldo?" em 5 segundos. (a) a ÚLTIMA recusa, vermelho se tem
 * menos de 6 h (revisão de 28/09: antes seguia a reserva, que nasce na 1ª recusa da janela), e o último alarme com o
 * estado do e-mail, com o botão de recarga; (b) por dia e fonte; (c) o lado do dinheiro nos despachos cinematic.
 * Tudo contado no banco (lib/supplier/falBalancePanel). (d) saldo ao vivo: fora — a fal só expõe com chave admin.
 * panel null = leitura falhou (RPC E fallback): âmbar "não medido", nunca verde.
 * KINEO-FAL-EM-VOO-2026-09-28 — tile sem número (fallback sem a migration) = âmbar "Not measured", nunca verde; e o
 * filme ainda na janela de entrega sai do "Charged, NOT delivered" para "Charged, still rendering" (não estornar).
 */
function FalBalanceCard({ panel, nowMs }: { panel: FalBalancePanel | null; nowMs: number }) {
  const fresh = falRefusalIsFresh(panel, nowMs)
  const lastRefusal = falLastRefusalAt(panel)
  const d = panel?.dispatch ?? null
  const dinheiro = falStuckMoneyState(d)
  const janela = d?.inFlightWindowMinutes ?? FAL_PANEL_IN_FLIGHT_MINUTES
  const naoMedido = panel?.mode === 'fallback' ? `Not measured — waits for ${FAL_PANEL_MIGRATION.split('/').pop()}` : 'Not measured'
  // value null = número não medido: âmbar com a nota "Not measured", qualquer que seja a cor pedida.
  const tile = (label: string, value: string | null, color = '#F2F4F7', note?: string) => (
    <div key={label} className="rounded-xl p-4" style={{ background: 'var(--card2)', border: '1px solid #1F2530' }}>
      <div className="text-[10px] font-black uppercase tracking-widest mb-2" style={{ color: '#9AA3B2' }}>{label}</div>
      <div className="font-black" style={{ fontSize: '1.5rem', lineHeight: 1.1, color: value === null ? '#FFBF58' : color }}>{value ?? '—'}</div>
      {(value === null || note) && <p className="text-[11px] mt-1" style={{ color: value === null ? '#FFBF58' : '#8A93A3' }}>{value === null ? naoMedido : note}</p>}
    </div>
  )
  const n = (v: number | null): string | null => (v === null ? null : fmtN(v))
  return (
    <section className="rounded-2xl p-5 mb-6" style={{ ...CARD, border: `1px solid ${fresh ? '#FF8787' : '#1F2530'}` }}>
      <div className="flex items-start justify-between gap-3 flex-wrap mb-3">
        <div>
          <div className="text-[10px] font-black uppercase tracking-widest mb-1" style={{ color: '#9AA3B2' }}>
            fal.ai balance — the alarm that e-mails you
          </div>
          <div className="font-black" style={{ fontSize: '1.15rem', color: !panel ? '#FFBF58' : fresh ? '#FF8787' : '#5FD4A4' }}>
            {!panel
              ? 'Not measured right now — this is NOT a sign of health'
              : fresh
                ? 'fal refused work for BALANCE in the last 6 h'
                : lastRefusal
                  ? 'No balance refusal in the last 6 h'
                  : 'No balance refusal recorded yet'}
          </div>
        </div>
        <a
          href={FAL_BILLING_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="px-4 py-2 rounded-xl text-xs font-black"
          style={{ background: fresh ? '#FF8787' : '#1F2530', color: fresh ? 'var(--on-accent)' : '#F2F4F7' }}
        >
          Recharge fal.ai →
        </a>
      </div>

      {lastRefusal && (
        <p className="text-xs mb-1" style={{ color: '#9AA3B2' }}>
          Last refusal: <b style={{ color: fresh ? '#FF8787' : '#F2F4F7' }}>{fmtUtc(lastRefusal)}</b>
        </p>
      )}
      {panel?.latest ? (
        <p className="text-xs mb-4" style={{ color: '#9AA3B2' }}>
          Last alarm: <b style={{ color: '#F2F4F7' }}>{fmtUtc(panel.latest.createdAt)}</b>
          {' · '}source {panel.latest.source ?? '—'}
          {panel.latest.engine ? ` · ${panel.latest.engine}` : ''}
          {panel.latest.scenesRefused !== null ? ` · ${panel.latest.scenesRefused} scenes refused` : ''}
          {' · '}e-mail {panel.latest.state ?? 'unknown'}
        </p>
      ) : (
        <p className="text-xs mb-4" style={{ color: '#8A93A3' }}>
          The alarm writes a <code>fal_balance_exhausted</code> row on every refusal since 28/09; the history before that
          lives only in the dispatch numbers below.
        </p>
      )}

      {d && (
        <div className="grid gap-3 mb-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))' }}>
          {tile(`Dispatches hit (${panel?.days ?? 30}d)`, fmtN(d.dispatches), d.dispatches > 0 ? '#FFBF58' : '#F2F4F7', 'cinematic, balance_exhausted')}
          {tile('Scenes refused', n(d.scenesRefused))}
          {tile('People', d.people === null ? null : `${fmtN(d.people)} (${fmtN(d.externalPeople)} ext.)`, '#F2F4F7', INTERNAL_ACCOUNTS_LABEL)}
          {tile('Credits refunded', n(d.refundedCredits))}
          {tile('Charged, film delivered', n(d.deliveredChargedCredits))}
          {tile(
            'Charged, NOT delivered',
            n(d.unrefundedUndeliveredCredits),
            dinheiro === 'stuck' ? '#FF8787' : dinheiro === 'clear' ? '#5FD4A4' : '#FFBF58',
            dinheiro === 'stuck'
              ? `${fmtN(d.unrefundedUndeliveredDebits)} debit(s), ${fmtN(d.unrefundedUndeliveredExternal)} external, older than ${janela} min — refund them`
              : dinheiro === 'unseparated'
                ? 'may include films still rendering — check each one before refunding'
                : 'should always be 0',
          )}
          {d.inFlightCredits !== null && tile(
            'Charged, still rendering',
            n(d.inFlightCredits),
            d.inFlightCredits > 0 ? '#FFBF58' : '#F2F4F7',
            d.inFlightCredits > 0
              ? `${fmtN(d.inFlightDebits)} film(s) inside the ${janela}-min delivery window — do NOT refund, they are on their way`
              : `none inside the ${janela}-min delivery window`,
          )}
        </div>
      )}

      {panel?.mode === 'rpc' && panel.byDay.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs" style={{ borderCollapse: 'collapse', minWidth: 640 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #1F2530' }}>
                {['Day (UTC)', 'Source', 'Refusals', 'E-mails sent', 'Scenes refused', 'People', 'External'].map((h) => (
                  <th key={h} className="px-3 py-2 text-[10px] font-black uppercase tracking-widest" style={{ color: '#9AA3B2' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {panel.byDay.map((r) => (
                <tr key={`${r.day}-${r.source}`} style={{ borderBottom: '1px solid #1F2530', color: '#F2F4F7' }}>
                  <td className="px-3 py-2">{r.day}</td>
                  <td className="px-3 py-2">{r.source}</td>
                  <td className="px-3 py-2 font-bold">{r.events}</td>
                  <td className="px-3 py-2">{r.alerts}</td>
                  <td className="px-3 py-2">{r.scenesRefused}</td>
                  <td className="px-3 py-2">{r.people}</td>
                  <td className="px-3 py-2" style={{ color: r.externalPeople > 0 ? '#FFBF58' : '#F2F4F7' }}>{r.externalPeople}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {panel?.mode === 'fallback' && (
        <p className="text-[11px] mt-2" style={{ color: '#FFBF58' }}>
          Per-day detail and the money side wait for the migration {FAL_PANEL_MIGRATION}. Until then only the last alarm
          and the exact dispatch count are shown.
        </p>
      )}
      <p className="text-[11px] mt-3" style={{ color: '#8A93A3' }}>
        One delivered e-mail per 6 h window (KINEO_ALERT_EMAIL + the alert webhook; a send that fails is retried at the
        next refusal 10+ min later, up to 3 tries); every other refusal is counted here. Only the
        balance class triggers it — a 403 for model access does not. Live fal balance is not shown: fal exposes it only
        to an admin key.
      </p>
    </section>
  )
}

/** Verde / âmbar / vermelho pela pergunta que importa: dá para dormir? */
function rowAccent(row: SupplierBurnRow): string {
  if (row.willBlowBeforeCycleEnd) return '#FF8787'
  if (row.percentUsed !== null && row.percentUsed >= 70) return '#FFBF58'
  return '#5FD4A4'
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
          <h1 className="text-xl font-black mb-2" style={{ color: '#F2F4F7' }}>Access denied.</h1>
          <p className="text-sm" style={{ color: '#9AA3B2' }}>Admin only.</p>
        </div>
      </Shell>
    )
  }

  const admin = serviceClient()
  if (!admin) {
    return (
      <Shell>
        <div className="rounded-2xl p-8 text-center text-sm" style={{ ...CARD, color: '#9AA3B2' }}>
          Service role not configured on this environment.
        </div>
      </Shell>
    )
  }

  const now = new Date()
  const [rows, health, falPanel]: [SupplierBurnRow[], GenerationHealth | null, FalBalancePanel | null] = await Promise.all([
    readSupplierBurn(admin, now),
    readGenerationHealth(admin, now),
    readFalBalancePanel(admin, now), // KINEO-FAL-SALDO-ALERTA-2026-09-28
  ])

  const worst = rows.filter((r) => r.willBlowBeforeCycleEnd)

  return (
    <Shell>
      <header className="mb-6">
        <div className="font-black uppercase tracking-widest mb-1" style={{ fontSize: '0.62rem', color: '#FFBF58' }}>
          Admin · Supplier health
        </div>
        <h1 className="font-black tracking-tight" style={{ fontSize: '1.6rem', color: '#F2F4F7' }}>
          {worst.length === 0
            ? 'No supplier is projected to run out this cycle'
            : `${worst.length} supplier${worst.length === 1 ? '' : 's'} projected to run out BEFORE the cycle ends`}
        </h1>
        <p className="text-xs mt-1" style={{ color: '#9AA3B2' }}>
          Cycle consumption, daily burn and projected exhaustion date per supplier. Read-only — the
          alarm itself is /api/cron/supplier-watch, hourly, and it uses these exact numbers.
          The company went dark twice in 11 days on supplier balance (31/07 and 09–11/08) with nobody
          watching; see docs/INCIDENTES-FORNECEDOR.md.
        </p>
        <nav className="adm-legacy-nav flex gap-1 mt-4 flex-wrap">
          {[
            { label: '← CEO', href: '/admin' },
            { label: 'Metrics', href: '/admin/metrics' },
            { label: 'Overview', href: '/admin/overview' },
            { label: 'Cohort', href: '/admin/trial-cohort' },
          ].map((t) => (
            <Link key={t.href} href={t.href} className="px-3 py-1.5 rounded-lg text-xs font-bold" style={{ color: '#9AA3B2' }}>
              {t.label}
            </Link>
          ))}
        </nav>
      </header>

      {/* ── KINEO-FAL-SALDO-ALERTA-2026-09-28: fal balance alarm, on top ────── */}
      <FalBalanceCard panel={falPanel} nowMs={now.getTime()} />

      {/* ── one line per supplier ─────────────────────────────────────────── */}
      <section className="rounded-2xl overflow-hidden mb-6" style={CARD}>
        <div className="overflow-x-auto">
          <table className="w-full text-left" style={{ borderCollapse: 'collapse', minWidth: 900 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #1F2530' }}>
                {['Supplier', 'Cycle', 'Used / limit', '%', 'Burn per day', 'Projected exhaustion'].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-[10px] font-black uppercase tracking-widest"
                    style={{ color: '#9AA3B2' }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-sm" style={{ color: '#9AA3B2' }}>
                    Could not measure supplier consumption right now. This is NOT a sign of health —
                    reload, and check the service-role key if it persists.
                  </td>
                </tr>
              )}
              {rows.map((r) => {
                const accent = rowAccent(r)
                return (
                  <tr key={r.key} style={{ borderBottom: '1px solid #1F2530' }}>
                    <td className="px-4 py-4 align-top" style={{ minWidth: 260 }}>
                      <div className="font-black text-sm" style={{ color: '#F2F4F7' }}>{r.label}</div>
                      <div className="text-[11px] mt-1" style={{ color: '#8A93A3' }}>{r.basis}</div>
                      <div className="text-[11px] mt-1" style={{ color: '#8A93A3' }}>{r.note}</div>
                    </td>
                    <td className="px-4 py-4 align-top text-xs" style={{ color: '#9AA3B2', whiteSpace: 'nowrap' }}>
                      {r.cycleLabel}
                      {r.daysLeftInCycle !== null && (
                        <div className="text-[11px] mt-1">{r.daysLeftInCycle.toFixed(1)}d left</div>
                      )}
                    </td>
                    <td className="px-4 py-4 align-top text-sm font-bold" style={{ color: '#F2F4F7', whiteSpace: 'nowrap' }}>
                      {fmtAmount(r, r.used)}
                      <span style={{ color: '#8A93A3' }}>
                        {' / '}
                        {r.limit === null ? 'unknown' : fmtAmount(r, r.limit)}
                      </span>
                    </td>
                    <td className="px-4 py-4 align-top font-black" style={{ color: accent, whiteSpace: 'nowrap' }}>
                      {r.percentUsed === null ? '—' : `${r.percentUsed.toFixed(1)}%`}
                    </td>
                    <td className="px-4 py-4 align-top text-sm" style={{ color: '#F2F4F7', whiteSpace: 'nowrap' }}>
                      {fmtAmount(r, r.perDay)}
                      <span className="text-[11px]" style={{ color: '#8A93A3' }}>
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
        <div className="text-[10px] font-black uppercase tracking-widest mb-3" style={{ color: '#9AA3B2' }}>
          Delivery right now (what the alarm actually watches)
        </div>
        {!health ? (
          <p className="text-sm" style={{ color: '#FF8787' }}>
            Could not read generation health. Not a sign of health — the alarm treats this as
            &quot;unmeasured&quot; and stays quiet, so check PostgREST if it persists.
          </p>
        ) : (
          <>
            <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
              {health.windows.map((w) => (
                <div key={w.key} className="rounded-xl p-4" style={{ background: 'var(--card2)', border: '1px solid #1F2530' }}>
                  <div className="text-[10px] font-black uppercase tracking-widest mb-2" style={{ color: '#9AA3B2' }}>
                    {w.label}
                  </div>
                  <div
                    className="font-black"
                    style={{ fontSize: '1.9rem', lineHeight: 1.1, color: w.triggered.length ? '#FF8787' : '#F2F4F7' }}
                  >
                    {w.failureRatePct === null ? '—' : `${w.failureRatePct.toFixed(0)}%`}
                  </div>
                  <p className="text-[11px] mt-1" style={{ color: '#9AA3B2' }}>
                    {w.attempts} attempt{w.attempts === 1 ? '' : 's'} · {w.completed} delivered ·{' '}
                    {w.failed} failed · {w.distinctUsers} people
                  </p>
                  {w.topReason && (
                    <p className="text-[11px] mt-1" style={{ color: '#8A93A3' }}>
                      top reason: {w.topReason} ({w.topReasonCount}×)
                    </p>
                  )}
                  {w.triggered.length > 0 && (
                    <p className="text-[11px] mt-2 font-black" style={{ color: '#FF8787' }}>
                      FIRING: {describeRules(w.triggered)}
                    </p>
                  )}
                </div>
              ))}
            </div>
            <p className="text-[11px] mt-3" style={{ color: '#8A93A3' }}>
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

      <p className="text-[11px]" style={{ color: '#8A93A3' }}>
        Numbers are estimates reconstructed from our own tables — no supplier here exposes balance
        over API. They are calibrated against the one real reading we have (Creatomate panel, 10/08:
        10.0K of 10.0K) and deliberately biased to over-count, because a meter that under-counts
        rings late, and late is the defect being fixed.
      </p>
    </Shell>
  )
}
