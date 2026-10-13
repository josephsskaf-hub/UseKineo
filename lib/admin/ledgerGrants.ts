// KINEO-PAINEL-ORIGEM-2026-10-13 — os PRESENTES que o código concede e que o razão do /admin (coluna "SALDO E NO QUE
// GASTOU", app/api/admin/live/route.ts) não lia. Sem eles a equação do saldo acusava "+14 sem origem" em toda conta de
// região (caso mrmzedits3@gmail.com, cadastro 13/10 09:40 UTC: +5 do clipe grátis e +9 do filme grátis de região).
//
// Regra: só entra o que o PRÓPRIO evento prova que somou ao saldo (o escritor grava `granted`/o valor). Nunca adivinha.
//   · region_free_clip_granted   — lib/reverseTrial.ts (cadastro de região): `credits` quando `granted === true`.
//   · region_free_film_granted   — lib/reverseTrial.ts concederFilmeDeRegiao: `credits` quando `granted === true`.
//   · free_weekly_film_granted   — lib/freeWeeklyFilmGrant.ts: `granted` (número) é a recarga; o carimbo é gravado ANTES
//     do crédito, e um `free_weekly_film_grant_voided` logo depois anula o carimbo anterior (o crédito não entrou).
//   · admin_courtesy_granted     — lib/courtesyStore.ts (cortesia e a recarga dela): `credits`.
//   · admin_courtesy_expired     — lib/courtesyStore.ts (vencimento): `credits_removed` SAI do saldo.
//   · post_reward_claimed        — app/api/post-reward: `credits`.
//   · business_upgrade_credits_granted — lib/billing/trocaBusiness.ts: `credits_delta` só com `credits_granted === true`.
//   · admin_credit_granted       — concessão antiga (jul/2026, antes do botão): `amount` com `status === 'completed'`.
//   · admin_credits_revoked      — revogação manual: `credits_revoked` SAI do saldo.
// Fora de propósito: admin_br_trial_recredited (o recrédito grava trial_credits_granted, que a equação já soma como
// "trial" — somar de novo contaria duas vezes) e admin_credits_granted (já é o termo "bônus").

export const LEDGER_GRANT_EVENTS = [
  'region_free_clip_granted',
  'region_free_film_granted',
  'free_weekly_film_granted',
  'free_weekly_film_grant_voided',
  'admin_courtesy_granted',
  'admin_courtesy_expired',
  'post_reward_claimed',
  'business_upgrade_credits_granted',
  'admin_credit_granted',
  'admin_credits_revoked',
] as const

export type LedgerGrantEvent = { user_id: string | null; name: string; created_at?: string | null; metadata?: Record<string, unknown> | null }

/** Rótulo legível de cada termo (o mesmo nome em toda linha do painel). */
export const LEDGER_GRANT_LABEL: Record<string, string> = {
  region_free_clip_granted: 'Region free clip',
  region_free_film_granted: 'Region free film',
  free_weekly_film_granted: 'Free weekly film',
  admin_courtesy_granted: 'Courtesy',
  admin_courtesy_expired: 'Courtesy expired',
  post_reward_claimed: 'Post reward',
  business_upgrade_credits_granted: 'Business upgrade',
  admin_credit_granted: 'Admin grant (old)',
  admin_credits_revoked: 'Revoked',
}

const num = (v: unknown): number => {
  const n = typeof v === 'number' ? v : typeof v === 'string' && v.trim() !== '' ? Number(v) : NaN
  return Number.isFinite(n) ? n : 0
}

/** Quanto o evento mexeu no saldo (positivo soma, negativo tira). 0 = não provou crédito. */
export function ledgerGrantDelta(name: string, md: Record<string, unknown> | null | undefined): number {
  const m = md ?? {}
  switch (name) {
    case 'region_free_clip_granted':
    case 'region_free_film_granted':
      return m.granted === true ? Math.max(0, num(m.credits)) : 0
    case 'free_weekly_film_granted':
      return typeof m.granted === 'number' ? Math.max(0, num(m.granted)) : 0
    case 'admin_courtesy_granted':
    case 'post_reward_claimed':
      return Math.max(0, num(m.credits))
    case 'business_upgrade_credits_granted':
      return m.credits_granted === true ? Math.max(0, num(m.credits_delta)) : 0
    case 'admin_credit_granted':
      return m.status === 'completed' ? Math.max(0, num(m.amount)) : 0
    case 'admin_courtesy_expired':
      return -Math.max(0, num(m.credits_removed))
    case 'admin_credits_revoked':
      return -Math.max(0, num(m.credits_revoked))
    default:
      return 0
  }
}

export type LedgerGrantSummary = { total: number; terms: string[] }

/**
 * Soma por pessoa, em ordem de data. Um `free_weekly_film_grant_voided` anula o carimbo de recarga mais recente ainda não
 * anulado da mesma pessoa. Devolve o total (entra na equação) e os termos já escritos ("+ 9 Region free film").
 */
export function summarizeLedgerGrants(rows: LedgerGrantEvent[]): Map<string, LedgerGrantSummary> {
  const sorted = [...rows].sort((a, b) => Date.parse(a.created_at ?? '') - Date.parse(b.created_at ?? ''))
  const perUser = new Map<string, Map<string, number>>()
  const weeklyStack = new Map<string, number[]>()
  for (const r of sorted) {
    const uid = r.user_id
    if (!uid) continue
    const byName = perUser.get(uid) ?? new Map<string, number>()
    perUser.set(uid, byName)
    if (r.name === 'free_weekly_film_grant_voided') {
      const stack = weeklyStack.get(uid) ?? []
      const last = stack.pop()
      weeklyStack.set(uid, stack)
      if (typeof last === 'number' && last > 0) byName.set('free_weekly_film_granted', (byName.get('free_weekly_film_granted') ?? 0) - last)
      continue
    }
    const d = ledgerGrantDelta(r.name, r.metadata ?? null)
    if (r.name === 'free_weekly_film_granted') {
      const stack = weeklyStack.get(uid) ?? []
      stack.push(d)
      weeklyStack.set(uid, stack)
    }
    if (d !== 0) byName.set(r.name, (byName.get(r.name) ?? 0) + d)
  }
  const out = new Map<string, LedgerGrantSummary>()
  for (const [uid, byName] of perUser) {
    let total = 0
    const terms: string[] = []
    for (const name of LEDGER_GRANT_EVENTS) {
      const v = byName.get(name) ?? 0
      if (v === 0) continue
      total += v
      terms.push(`${v > 0 ? '+' : '−'} ${Math.abs(v)} ${LEDGER_GRANT_LABEL[name] ?? name}`)
    }
    if (terms.length > 0 || total !== 0) out.set(uid, { total, terms })
  }
  return out
}
