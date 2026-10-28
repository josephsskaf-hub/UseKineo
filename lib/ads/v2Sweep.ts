// KINEO-ADS-SIMPLES-2810 — a varredura dos pedidos ABANDONADOS do anúncio v2 (fundador 28/10, item 4 do plano "Ads simples").
//
// POR QUÊ: o cron app/api/cron/ads-v2-advance só olha generating/assembling; rascunho ('draft') e plano ('planned') que a pessoa
// largou ficavam para sempre — medido em 28/10: 44 pedidos de cliente parados há mais de 48 h (7 draft + 37 planned) em 30 dias.
// Eles poluem "Seus anúncios", o painel e a lista de retomada, e nunca viram nada.
//
// REGRAS (falha FECHADA: erro de leitura = nada muda; erro numa linha = pula a linha):
//   · só 'draft'/'planned' sem atividade há ≥ 48 h (updated_at — a tabela tem gatilho touch — nunca created_at);
//   · só pedido SEM débito (credits_charged 0): dinheiro é assunto do refund-sweep (lib/credits/refund.ts), nunca daqui;
//   · UPDATE condicional (status ainda draft|planned E o mesmo updated_at) → 'cancelled' com error 'abandoned_48h': idempotente
//     (a 2ª passada não acha nada) e seguro contra corrida com um /start que acabou de travar o pedido;
//   · a amostra reservada no livro-razão (ads_escolha_samples) NÃO é tocada: amostra usada continua usada, nada é devolvido
//     nem reaberto; nenhum crédito é estornado;
//   · um evento ads_v2_order_abandoned por pedido cancelado (quem, qual, parado há quantas horas, amostra ou não).
import type { SupabaseClient } from '@supabase/supabase-js'
import { writeServerEvent } from '@/lib/serverEvents'

/** Sem atividade por este tempo = abandonado. */
export const ADS_V2_ABANDON_AFTER_MS = 48 * 60 * 60 * 1000
/** Lote por passada (o cron roda a cada 5 min; 44 parados hoje). */
export const ADS_V2_SWEEP_BATCH = 50
export const ADS_V2_SWEPT_ERROR = 'abandoned_48h'
export const ADS_V2_SWEPT_EVENT = 'ads_v2_order_abandoned'
export const ADS_V2_SWEEP_STATUSES: readonly string[] = ['draft', 'planned']

export interface AdsV2SweepRow { id: string; user_id: string; status: string; updated_at: string | null; credits_charged: number | null; billing_ref: string | null }

export function adsV2SweepCutoffIso(nowMs: number = Date.now()): string {
  return new Date(nowMs - ADS_V2_ABANDON_AFTER_MS).toISOString()
}

/** A régua PURA de uma linha: draft/planned, parada há ≥ 48 h, sem débito. */
export function adsV2SweepCandidate(row: AdsV2SweepRow, nowMs: number = Date.now()): boolean {
  if (!ADS_V2_SWEEP_STATUSES.includes(row.status)) return false
  const at = Date.parse(row.updated_at ?? '')
  if (!Number.isFinite(at) || nowMs - at < ADS_V2_ABANDON_AFTER_MS) return false
  return Number(row.credits_charged ?? 0) === 0
}

export async function sweepAbandonedAdsV2Orders(admin: SupabaseClient, opts: { deadlineMs?: number; now?: () => number } = {}): Promise<{ scanned: number; cancelled: number; skipped: number }> {
  const now = opts.now ?? Date.now
  const result = { scanned: 0, cancelled: 0, skipped: 0 }
  try {
    const { data, error } = await admin
      .from('ads_v2_orders')
      .select('id, user_id, status, updated_at, credits_charged, billing_ref')
      .in('status', [...ADS_V2_SWEEP_STATUSES])
      .lt('updated_at', adsV2SweepCutoffIso(now()))
      .order('updated_at', { ascending: true })
      .limit(ADS_V2_SWEEP_BATCH)
    if (error || !Array.isArray(data)) return result
    for (const row of data as AdsV2SweepRow[]) {
      if (opts.deadlineMs && now() > opts.deadlineMs) break
      result.scanned++
      if (!adsV2SweepCandidate(row, now())) { result.skipped++; continue }
      const won = await admin
        .from('ads_v2_orders')
        .update({ status: 'cancelled', error: ADS_V2_SWEPT_ERROR, failed_at: new Date(now()).toISOString() })
        .eq('id', row.id)
        .in('status', [...ADS_V2_SWEEP_STATUSES])
        .eq('updated_at', row.updated_at)
        .select('id')
        .maybeSingle()
      if (won.error || !won.data) { result.skipped++; continue }
      result.cancelled++
      await writeServerEvent({ name: ADS_V2_SWEPT_EVENT, userId: row.user_id, path: '/api/cron/ads-v2-advance', metadata: { order_id: row.id, status_before: row.status, idle_hours: Math.round((now() - Date.parse(row.updated_at ?? '')) / 3600_000), sample: typeof row.billing_ref === 'string' && row.billing_ref.startsWith('adssample-'), credits_charged: Number(row.credits_charged ?? 0) } })
    }
  } catch (e) {
    console.warn('[ads/v2/sweep] falhou:', e instanceof Error ? e.message : String(e))
  }
  return result
}
