// KINEO-ADS-V2-2026-09-28 — cobrança do anúncio v2 (etapa 2, servidor).
//
// PADRÃO CONFIÁVEL DA CASA (lib/animate/service.ts reserveAnimateCredits + lib/animate/claim.ts confirmAnimateDebit),
// COPIADO e não importado — o claim do Animate tem o custo 5 cravado:
//   1. recordRenderIntent(render_id = chave, custo)  — o RPC de débito lê o custo de render_jobs, não do chamador;
//   2. saldo ≥ custo                                  — o RPC NÃO recusa saldo curto (corta em zero e grava o custo
//                                                       cheio no ledger; o estorno devolveria crédito que nunca existiu);
//   3. debitVideoCredits(service)                     — idempotente pela chave (unique em credit_debits.render_id);
//   4. RELER credit_debits e exigir o valor EXATO, do dono, não estornado — "sem erro" não prova que debitou.
//
// CHAVES (credit_debits.render_id):
//   'adsv2-<order>-<generation>'  pedido pago; é TAMBÉM o videos.render_id da entrega (videos_render_id_unique).
//   'adsv2redo-<retakeOrderId>'   refação cobrada à parte; o id do pedido de refação é determinístico (pai, plano,
//                                 linha substituída) e é gravado ANTES do débito e de qualquer POST à fal.
//   'adssample-<order>-<generation>' KINEO-ADS-AMOSTRA-2026-10-09: a amostra grátis (lib/ads/sample.ts) — também é o
//                                 videos.render_id da entrega, mas NUNCA tem linha em credit_debits (não cobra, não estorna).
// Os dois prefixos começam com 'adsv2' e ficam FORA da varredura genérica (lib/credits/refund.ts
// sweepStuckRenderDebits); quem os varre é sweepAbandonedAdsV2Debits, guiada por ads_v2_orders.
//
// ESTORNO: só quem VENCE o UPDATE condicional →failed chama refundRenderCredits (idempotente no banco: UPDATE ...
// WHERE refunded_at IS NULL RETURNING) e relê o ledger para confirmar. Perdeu a corrida = outro já estornou/entregou.
import { createHash } from 'node:crypto'
import type { SupabaseClient } from '@supabase/supabase-js'
import { recordRenderIntent } from '@/lib/credits/renderIntent'
import { debitVideoCredits } from '@/lib/credits/debit'
import { refundRenderCredits } from '@/lib/credits/refund'
import { writeServerEvent } from '@/lib/serverEvents'
import { isAdsSampleRef } from '@/lib/ads/sample' // KINEO-ADS-AMOSTRA-2026-10-09

/** quality gravado em render_jobs e em videos.quality_mode (selo 'Studio Ads' em lib/engineLabel.ts). */
export const ADS_V2_QUALITY = 'ads_v2'
export const ADS_V2_BILLING_PREFIX = 'adsv2-'
export const ADS_V2_RETAKE_PREFIX = 'adsv2redo-'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Chave de cobrança do pedido = videos.render_id da entrega. */
export function adsV2BillingRef(orderId: string, generationId: string): string {
  if (!UUID_RE.test(orderId) || !UUID_RE.test(generationId)) throw new Error('ads_v2_bad_billing_ids')
  return `${ADS_V2_BILLING_PREFIX}${orderId.toLowerCase()}-${generationId.toLowerCase()}`
}

/** Chave da refação = videos.render_id da entrega refeita. */
export function adsV2RetakeRef(retakeOrderId: string): string {
  if (!UUID_RE.test(retakeOrderId)) throw new Error('ads_v2_bad_retake_id')
  return `${ADS_V2_RETAKE_PREFIX}${retakeOrderId.toLowerCase()}`
}

/** UUID determinístico (formato v5-like, sha256) — o mesmo pedido de refação clicado 2 vezes vira o MESMO id. */
export function deterministicUuid(seed: string): string {
  const h = createHash('sha256').update(seed).digest('hex').slice(0, 32).split('')
  h[12] = '5'
  h[16] = ((parseInt(h[16], 16) & 0x3) | 0x8).toString(16)
  const s = h.join('')
  return `${s.slice(0, 8)}-${s.slice(8, 12)}-${s.slice(12, 16)}-${s.slice(16, 20)}-${s.slice(20, 32)}`
}

export type AdsV2DebitCheck =
  | { ok: true; refunded: boolean; amount: number }
  | { ok: false; reason: 'missing' | 'mismatch' | 'unavailable' }

/** Relê o ledger: a chave existe, é do dono e tem o valor EXATO. */
export async function confirmAdsV2Debit(admin: SupabaseClient, args: { userId: string; billingRef: string; cost: number }): Promise<AdsV2DebitCheck> {
  const { data, error } = await admin
    .from('credit_debits')
    .select('render_id, user_id, amount, refunded_at')
    .eq('render_id', args.billingRef)
    .maybeSingle()
  if (error) return { ok: false, reason: 'unavailable' }
  if (!data) return { ok: false, reason: 'missing' }
  const row = data as { user_id: string; amount: number | string; refunded_at: string | null }
  const amount = typeof row.amount === 'number' ? row.amount : Number(row.amount)
  if (row.user_id !== args.userId || !Number.isFinite(amount) || amount !== args.cost) return { ok: false, reason: 'mismatch' }
  return { ok: true, amount, refunded: typeof row.refunded_at === 'string' && row.refunded_at.length > 0 }
}

export type AdsV2ChargeResult =
  | { ok: true; balance: number | null }
  | { ok: false; code: 'intent_failed' | 'out_of_credits' | 'debit_refunded' | 'debit_mismatch' | 'debit_unconfirmed'; status: number; balance?: number; debitPossible: boolean }

/**
 * Cobra `cost` na chave `billingRef`. `debitPossible` diz ao chamador se pode desfazer a trava do pedido sem estorno
 * (false = provado que nada foi debitado) ou se precisa ir pelo caminho de falha com estorno (true).
 */
export async function chargeAdsV2(admin: SupabaseClient, args: { userId: string; billingRef: string; cost: number }): Promise<AdsV2ChargeResult> {
  const { userId, billingRef, cost } = args
  if (!Number.isInteger(cost) || cost <= 0) throw new Error('ads_v2_bad_cost')
  // 1. intenção autoritativa (render_jobs) ANTES do débito.
  const intent = await recordRenderIntent({ renderId: billingRef, userId, quality: ADS_V2_QUALITY, cost })
  if (!intent) return { ok: false, code: 'intent_failed', status: 503, debitPossible: false }
  // 2. saldo ≥ custo (o RPC não recusa saldo curto).
  const prof = await admin.from('profiles').select('video_credits').eq('id', userId).maybeSingle()
  if (prof.error) return { ok: false, code: 'intent_failed', status: 503, debitPossible: false }
  const balance = Number((prof.data as { video_credits?: number } | null)?.video_credits ?? 0)
  if (!(balance >= cost)) return { ok: false, code: 'out_of_credits', status: 402, balance, debitPossible: false }
  // 3. débito idempotente pela chave.
  const debit = await debitVideoCredits(admin, { userId, renderId: billingRef, cost, service: true })
  // 4. reler o ledger e exigir o valor exato, do dono, não estornado.
  const check = await confirmAdsV2Debit(admin, { userId, billingRef, cost })
  if (check.ok && !check.refunded) return { ok: true, balance: debit.data }
  if (check.ok && check.refunded) return { ok: false, code: 'debit_refunded', status: 409, debitPossible: false }
  if (!check.ok && check.reason === 'mismatch') return { ok: false, code: 'debit_mismatch', status: 409, debitPossible: true }
  if (!check.ok && check.reason === 'missing' && debit.error && /balance|credit|insufficient/i.test(debit.error.message ?? '')) {
    return { ok: false, code: 'out_of_credits', status: 402, balance, debitPossible: false }
  }
  // Débito sem confirmação (resposta perdida, leitura fora): trata como POSSÍVEL — o caminho de falha estorna, e a
  // varredura sweepAbandonedAdsV2Debits pega o que sobrar.
  return { ok: false, code: 'debit_unconfirmed', status: 503, debitPossible: true }
}

/** Estorna a chave e relê o ledger. 'refunded' só com refunded_at gravado. */
export async function refundAdsV2Confirmed(admin: SupabaseClient, args: { userId: string; billingRef: string }): Promise<{ state: 'refunded' | 'missing' | 'unconfirmed'; amount: number }> {
  const returned = await refundRenderCredits(args.billingRef)
  const { data, error } = await admin
    .from('credit_debits')
    .select('user_id, amount, refunded_at')
    .eq('render_id', args.billingRef)
    .maybeSingle()
  if (error) return { state: 'unconfirmed', amount: returned }
  if (!data) return { state: 'missing', amount: 0 }
  const row = data as { user_id: string; amount: number | string; refunded_at: string | null }
  if (row.user_id !== args.userId) return { state: 'unconfirmed', amount: returned }
  return row.refunded_at ? { state: 'refunded', amount: Number(row.amount) } : { state: 'unconfirmed', amount: returned }
}

export interface AdsV2FailableOrder {
  id: string
  user_id: string
  billing_ref: string | null
  credits_charged?: number | null
  parent_order_id?: string | null
}

/**
 * Falha TERMINAL do pedido: UPDATE condicional →failed (só de generating/assembling, e só se ainda não houver vídeo).
 * Só o VENCEDOR estorna (refundRenderCredits) e grava o evento. Devolve o que aconteceu.
 */
export async function failAdsV2Order(
  admin: SupabaseClient,
  order: AdsV2FailableOrder,
  reason: string,
  path = '/lib/ads/v2Billing',
): Promise<{ won: boolean; refund: 'refunded' | 'missing' | 'unconfirmed' | 'skipped'; amount: number }> {
  // REVISÃO 28/09 (dinheiro): a linha em videos com render_id = chave de cobrança É a entrega (o cliente já tem o
  // filme na biblioteca). video_id nulo no pedido não prova que não entregou — a entrega grava videos ANTES do
  // →delivered. Com entrega (ou sem conseguir ler), NUNCA vira failed nem estorna; a varredura de 2 h lê o mesmo fato.
  if (order.billing_ref) {
    const delivered = await admin.from('videos').select('id').eq('render_id', order.billing_ref).maybeSingle()
    if (delivered.error || delivered.data) return { won: false, refund: 'skipped', amount: 0 }
  }
  const won = await admin
    .from('ads_v2_orders')
    .update({ status: 'failed', failed_at: new Date().toISOString(), error: reason.slice(0, 300) })
    .eq('id', order.id)
    .in('status', ['generating', 'assembling'])
    .is('video_id', null)
    .select('id')
    .maybeSingle()
  if (won.error || !won.data) return { won: false, refund: 'skipped', amount: 0 }
  let refund: 'refunded' | 'missing' | 'unconfirmed' | 'skipped' = 'skipped'
  let amount = 0
  // KINEO-ADS-AMOSTRA-2026-10-09 — a amostra grátis ('adssample-…') nunca foi debitada: marca failed e grava o evento,
  // mas NUNCA chama o estorno (refund 'skipped', 0) — estornar uma chave sem débito não pode virar crédito de presente.
  if (order.billing_ref && !isAdsSampleRef(order.billing_ref)) {
    const r = await refundAdsV2Confirmed(admin, { userId: order.user_id, billingRef: order.billing_ref })
    refund = r.state
    amount = r.amount
  }
  await writeServerEvent({
    name: 'ads_v2_failed',
    userId: order.user_id,
    path,
    metadata: {
      order_id: order.id,
      billing_ref: order.billing_ref,
      reason: reason.slice(0, 300),
      refund,
      credits_returned: amount,
      retake: Boolean(order.parent_order_id),
      sample: isAdsSampleRef(order.billing_ref), // KINEO-ADS-AMOSTRA-2026-10-09
    },
  })
  return { won: true, refund, amount }
}
