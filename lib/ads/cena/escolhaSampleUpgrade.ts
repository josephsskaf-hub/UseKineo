// KINEO-AMOSTRA-ANUNCIO-2410 — one idempotent paid order from the exact customer-approved sample reference.
import { createHash } from 'node:crypto'
import { newPaidCenaRoute, isKling4AdPromoRef } from '@/lib/ads/kling4Paid'
import { verifyKling4PromoReservation } from '@/lib/kling4PromoServer'
import type { AdsV2Caller } from '../v2PlanCore'
import type { AdsV2OrderRow } from '../v2Advance'
import type { EscolhaInternalDeps } from './internalEscolha'
import type { EscolhaStored } from './escolhaStills'
import { escolhaReadyForStart } from './escolhaStills'
import { isEscolhaSamplePlan } from './escolhaSamplePolicy'
import { fullEscolhaPlan } from './escolhaPlan'
import { newCenaState } from './pipeline'
import { adsV2BillingRef, confirmAdsV2Debit } from '../v2Billing'
import { v2Fail, v2Json } from '../v2Server'
import { hasEscolhaSampleReservation, markEscolhaSampleUpsell } from './escolhaSampleServer'

export function escolhaUpgradeId(sampleId: string): string {
  const h = createHash('sha256').update(`ads-escolha-upgrade-v1:${sampleId}`).digest('hex')
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-5${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`
}
export async function upgradeEscolhaSample(user: AdsV2Caller, order: AdsV2OrderRow, stored: EscolhaStored, d: EscolhaInternalDeps): Promise<Response> {
  if (order.user_id !== user.id || !isEscolhaSamplePlan(stored.cena.plan) || order.status !== 'delivered') return v2Fail('ads_sample_result_required', 409)
  const args = { orderId: order.id, actorId: user.id, ownerId: user.id }
  if (!await hasEscolhaSampleReservation(d.admin, args)) return v2Fail('ads_sample_unavailable', 503)
  if (!await markEscolhaSampleUpsell(d.admin, args)) return v2Fail('ads_sample_unavailable', 503)
  let id = escolhaUpgradeId(order.id)
  const readAttempt = () => d.admin.from('ads_v2_orders').select('*').eq('id', id).eq('user_id', user.id).maybeSingle()
  let found = await readAttempt()
  // Failed paid attempts stay immutable. Follow at most eight refunded links (nine attempt reads),
  // then fail closed; a damaged/long history cannot create an unbounded request or new charge.
  for (let depth = 0; !found.error && found.data && ['failed', 'cancelled'].includes(found.data.status); depth++) {
    const previous = found.data
    if (depth >= 8 || previous.plan?.escolhaSampleSource !== order.id || previous.video_id || !previous.generation_id || !previous.billing_ref) return v2Fail('ads_sample_retry_unavailable', 503)
    try {
      if (isKling4AdPromoRef(previous.billing_ref)) {
        if (Number(previous.credits_charged) !== 0 || !await verifyKling4PromoReservation(d.admin, { userId: user.id, jobId: previous.id, kind: 'ad', seconds: 15 })) return v2Fail('ads_sample_retry_unavailable', 503)
      } else {
      if (previous.billing_ref !== adsV2BillingRef(previous.id, previous.generation_id)) return v2Fail('ads_sample_retry_unavailable', 503)
      const debit = await confirmAdsV2Debit(d.admin, { userId: user.id, billingRef: previous.billing_ref, cost: Number(previous.credits_charged) })
      if (!debit.ok || !debit.refunded) return v2Fail('ads_sample_retry_unavailable', 503)
      }
    } catch { return v2Fail('ads_sample_retry_unavailable', 503) }
    // Every concurrent click derives the same successor from the same settled generation.
    id = escolhaUpgradeId(`retry:${previous.id}:${previous.generation_id}:${previous.billing_ref}`)
    found = await readAttempt()
  }
  if (found.error) return v2Fail('cena_order_failed', 503)
  if (found.data && ['generating', 'assembling', 'delivered'].includes(found.data.status)) return v2Json({ order_id: id, status: found.data.status, sample: false, status_url: `/api/ads/v2/status?order_id=${id}` }, 202)
  if (found.data && !['draft', 'planned'].includes(found.data.status)) return v2Fail('ads_sample_retry_unavailable', 503)
  // The existing atomic start validates the promotion or the full credit balance before any new media.
  if (!found.data) {
    const plan = fullEscolhaPlan(stored.cena.plan)
    const chosen = stored.escolhaFlow.stills.find(j => j.id === stored.escolhaFlow.selectedStillId && j.status === 'done' && j.url)
    if (!chosen) return v2Fail('cena_still_choice_required', 409)
    const paid = { ...JSON.parse(JSON.stringify(order.plan)), cena: newCenaState(plan, newPaidCenaRoute('kling3', false)), escolhaSampleSource: order.id }
    paid.totalSeconds = 15
    paid.cena.keyframe = chosen.url; paid.cena.keyframes = [chosen.url, chosen.url]; paid.cena.phase = 'video'; paid.cena.jobs = []
    paid.narration = plan.script.narration
    if (!escolhaReadyForStart(paid)) return v2Fail('cena_still_choice_required', 409)
    const ins = await d.admin.from('ads_v2_orders').insert({ id, user_id: user.id, status: 'planned', tier: 'commercial', seconds: 15, sector: 'store', language: order.language, narration: true, card_url: order.card_url, photos: [], brief: order.brief, plan: paid }).select('id').maybeSingle()
    if (ins.error && ins.error.code !== '23505') return v2Fail('cena_order_failed', 503)
  }
  const response = await d.start(id), body = await response.json()
  if (response.status === 409) {
    // The other tab may have won the existing atomic start claim after our read/insert.
    const raced = await readAttempt()
    if (!raced.error && raced.data && ['generating', 'assembling', 'delivered'].includes(raced.data.status)) return v2Json({ order_id: id, status: raced.data.status, sample: false, status_url: `/api/ads/v2/status?order_id=${id}` }, 202)
  }
  return v2Json({ ...body, sample: false, seconds: 15 }, response.status)
}
