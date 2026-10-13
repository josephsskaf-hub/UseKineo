// KINEO-ADS-ROTEIROS-2026-10-13 — escolher 1 dos 2 a 3 roteiros do plano (POST /api/ads/v2/plan/choose). SEM COBRAR, sem
// modelo e sem fal: só copia o roteiro GUARDADO no plano do pedido (lib/ads/v2Scripts.ts adsV2ChooseScript) para
// plan.narration/plan.overlays e marca plan.script_id. O cliente manda só { order_id, script_id } — texto dele não entra aqui
// (para editar o texto há o PATCH /api/ads/v2/orders, com a régua dele). Preço, nível, duração e planos de câmera ficam como
// estão: o crédito devolvido é a MESMA conta do /plan e do /start (adsV2Credits(tier, seconds)). O /start de sempre lê o plano
// gravado e modera o texto final antes de qualquer débito.
//
// Portões iguais aos do PATCH /api/ads/v2/orders: acesso (ou a amostra grátis), interruptor do v2, pedido DO DONO (workspace:
// o membro age na conta do dono), só rascunho/planejado, UPDATE condicional (status ainda draft|planned).
import type { NextResponse } from 'next/server'
import { writeServerEvent } from '@/lib/serverEvents'
import { adsGate, adsSampleOpen, isMissingAdsTable, type AdsAccessLoad } from '@/lib/ads/serverAccess'
import { adsV2Visible } from '@/lib/ads/v2Access'
import { adsV2Credits } from '@/lib/ads/v2Tiers'
import { loadAdsV2Order } from '@/lib/ads/v2Advance'
import { v2Fail, v2Json } from '@/lib/ads/v2Server'
import { adsV2ChooseScript, sanitizeChooseBody } from '@/lib/ads/v2Scripts'
import type { AdsV2Caller } from '@/lib/ads/v2PlanCore'

export async function adsV2ChooseFor(user: AdsV2Caller, access: AdsAccessLoad, readBody: () => Promise<unknown>): Promise<NextResponse> {
  try {
    const { admin, reason, ...ws } = access
    const uid: string = ws.ownerId ?? user.id
    const gate = adsGate(reason)
    const sample = gate === 'no_access' && await adsSampleOpen(admin, uid, reason)
    if (gate !== 'ok' && !sample) {
      await writeServerEvent({ name: 'ads_access_denied', userId: user.id, path: '/api/ads/v2/plan/choose', metadata: { reason: gate } })
      return v2Fail(gate === 'closed' ? 'closed' : 'no_access', 403)
    }
    if (!adsV2Visible(user.email)) return v2Fail('v2_closed', 403)

    const parsed = sanitizeChooseBody(await readBody())
    if (!parsed.ok) return v2Fail(parsed.error, 400)
    const { order_id: orderId, script_id: scriptId } = parsed.value

    const { order, error } = await loadAdsV2Order(admin, orderId, uid)
    if (error) return isMissingAdsTable(error.code) ? v2Fail('not_ready', 503) : v2Fail('choose_failed', 502)
    if (!order) return v2Fail('order_not_found', 404)
    if (order.status !== 'draft' && order.status !== 'planned') return v2Fail('not_editable', 409)

    const chosen = adsV2ChooseScript(order.plan, scriptId)
    if (!chosen.ok) return v2Fail(chosen.error, chosen.status)

    const upd = await admin
      .from('ads_v2_orders')
      .update({ plan: chosen.plan })
      .eq('id', order.id)
      .eq('user_id', uid)
      .in('status', ['draft', 'planned'])
      .select('id')
      .maybeSingle()
    if (upd.error) return isMissingAdsTable(upd.error.code) ? v2Fail('not_ready', 503) : v2Fail('choose_failed', 502)
    if (!upd.data) return v2Fail('not_editable', 409)
    return v2Json({
      order_id: order.id,
      script_id: chosen.script.id,
      tone: chosen.script.tone,
      narration: chosen.plan.narration,
      overlays: chosen.plan.overlays,
      credits: adsV2Credits(order.tier, order.seconds),
    })
  } catch (e) {
    console.warn('[ads/v2/plan/choose] falhou:', e instanceof Error ? e.message : String(e))
    return v2Fail('choose_failed', 502)
  }
}
