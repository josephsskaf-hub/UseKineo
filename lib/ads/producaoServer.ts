// KINEO-PRODUCAO-ADS-2026-10-01 — a porta das rotas /api/ads/producao/* (servidor). A régua pura mora em lib/ads/producao.ts.
// Ordem (falha fechada, tudo ANTES de qualquer gasto): login (401) → interruptor PRODUCAO_PUBLIC / conta da casa pela lista
// EXATA do Ads (404, como o /spaces) → acesso ao Studio Ads (passe/assinante/interna; 403).
import { NextResponse } from 'next/server'
import type { SupabaseClient, User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { isAdsInternalEmail } from '@/lib/ads/access'
import { adsGate, loadAdsAccess } from '@/lib/ads/serverAccess'
import { createHash } from 'node:crypto'
import { recordRenderIntent } from '@/lib/credits/renderIntent' // KINEO-NUVEM-A3-2026-10-02 (cobrança da montagem, abaixo)
import { debitVideoCredits } from '@/lib/credits/debit'
import { confirmAdsV2Debit, refundAdsV2Confirmed } from '@/lib/ads/v2Billing'
import { PRODUCAO_MONTAGE_BILLING_PREFIX, PRODUCAO_MONTAGE_QUALITY, PRODUCAO_PUBLIC, producaoVisibleFor } from '@/lib/ads/producao'

export const PRODUCAO_NO_STORE = { 'Cache-Control': 'no-store' }
export const producaoFail = (error: string, status: number, extra?: Record<string, unknown>) =>
  NextResponse.json({ error, ...(extra ?? {}) }, { status, headers: PRODUCAO_NO_STORE })

export type ProducaoGate =
  | { ok: true; user: User; admin: Awaited<ReturnType<typeof loadAdsAccess>>['admin'] }
  | { ok: false; res: NextResponse }

export async function producaoGate(): Promise<ProducaoGate> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, res: producaoFail('unauthenticated', 401) }
  if (!producaoVisibleFor(PRODUCAO_PUBLIC, isAdsInternalEmail(user.email))) return { ok: false, res: producaoFail('not_found', 404) }
  const { admin, reason } = await loadAdsAccess(user.id, user.email)
  if (adsGate(reason) !== 'ok') return { ok: false, res: producaoFail('no_access', 403) }
  return { ok: true, user, admin }
}

// ═══ KINEO-NUVEM-A3-2026-10-02 — cobrança da montagem (só com PRODUCAO_MONTAGE_CHARGE_LIVE) ══════════════════════════
// MESMO padrão de lib/ads/v2Billing.ts chargeAdsV2 (copiado, não importado: lá a intenção nasce com quality 'ads_v2'):
//   1. recordRenderIntent(chave, custo) — o RPC de débito lê o custo de render_jobs, não do chamador;
//   2. saldo ≥ custo                    — o RPC não recusa saldo curto;
//   3. debitVideoCredits(service)       — idempotente pela chave;
//   4. RELER credit_debits (confirmAdsV2Debit, genérica pela chave) — "sem erro" não prova que debitou.
// O estorno é refundAdsV2Confirmed (também genérica pela chave): estorna e relê o ledger.

/** Chave do débito por (conta, clique): o mesmo clique repetido cai na MESMA chave (um débito só). */
export function producaoMontageBillingRef(userId: string, idempotencyKey: string): string {
  return `${PRODUCAO_MONTAGE_BILLING_PREFIX}${createHash('sha256').update(`${userId}:${idempotencyKey}`).digest('hex').slice(0, 32)}`
}

export type ProducaoChargeResult =
  | { ok: true }
  | { ok: false; code: 'intent_failed' | 'out_of_credits' | 'debit_refunded' | 'debit_mismatch' | 'debit_unconfirmed'; status: number; debitPossible: boolean }

export async function chargeProducaoMontage(admin: SupabaseClient, args: { userId: string; billingRef: string; cost: number }): Promise<ProducaoChargeResult> {
  const { userId, billingRef, cost } = args
  if (!Number.isInteger(cost) || cost <= 0) throw new Error('producao_bad_cost')
  const intent = await recordRenderIntent({ renderId: billingRef, userId, quality: PRODUCAO_MONTAGE_QUALITY, cost })
  if (!intent) return { ok: false, code: 'intent_failed', status: 503, debitPossible: false }
  const prof = await admin.from('profiles').select('video_credits').eq('id', userId).maybeSingle()
  if (prof.error) return { ok: false, code: 'intent_failed', status: 503, debitPossible: false }
  const balance = Number((prof.data as { video_credits?: number } | null)?.video_credits ?? 0)
  if (!(balance >= cost)) return { ok: false, code: 'out_of_credits', status: 402, debitPossible: false }
  const debit = await debitVideoCredits(admin, { userId, renderId: billingRef, cost, service: true })
  const check = await confirmAdsV2Debit(admin, { userId, billingRef, cost })
  if (check.ok && !check.refunded) return { ok: true }
  if (check.ok && check.refunded) return { ok: false, code: 'debit_refunded', status: 409, debitPossible: false }
  if (!check.ok && check.reason === 'mismatch') return { ok: false, code: 'debit_mismatch', status: 409, debitPossible: true }
  if (!check.ok && check.reason === 'missing' && debit.error && /balance|credit|insufficient/i.test(debit.error.message ?? '')) {
    return { ok: false, code: 'out_of_credits', status: 402, debitPossible: false }
  }
  return { ok: false, code: 'debit_unconfirmed', status: 503, debitPossible: true }
}

/** Estorno idempotente da montagem (chave = billingRef). Nunca lança. */
export async function refundProducaoMontage(admin: SupabaseClient, args: { userId: string; billingRef: string }): Promise<'refunded' | 'missing' | 'unconfirmed'> {
  try {
    return (await refundAdsV2Confirmed(admin, args)).state
  } catch {
    return 'unconfirmed'
  }
}
