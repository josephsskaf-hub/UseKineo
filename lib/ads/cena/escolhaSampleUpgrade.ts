// KINEO-AMOSTRA-ANUNCIO-2410 — one idempotent paid order from the exact customer-approved sample reference.
import { createHash } from 'node:crypto'
import type { AdsV2Caller } from '../v2PlanCore'
import type { AdsV2OrderRow } from '../v2Advance'
import type { EscolhaInternalDeps } from './internalEscolha'
import type { EscolhaStored } from './escolhaStills'
import { escolhaReadyForStart } from './escolhaStills'
import { isEscolhaSamplePlan } from './escolhaSamplePolicy'
import { fullEscolhaPlan } from './escolhaPlan'
import { newCenaState } from './pipeline'
import { adsV2Credits } from '../v2Tiers'
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
  const id = escolhaUpgradeId(order.id)
  const found = await d.admin.from('ads_v2_orders').select('*').eq('id', id).eq('user_id', user.id).maybeSingle()
  if (found.error) return v2Fail('cena_order_failed', 503)
  if (found.data && ['generating', 'assembling', 'delivered'].includes(found.data.status)) return v2Json({ order_id: id, status: found.data.status, sample: false, status_url: `/api/ads/v2/status?order_id=${id}` }, 202)
  const needed = adsV2Credits('commercial', 15)
  const profile = await d.admin.from('profiles').select('video_credits').eq('id', user.id).maybeSingle()
  if (profile.error || !profile.data) return v2Fail('credits_unavailable', 503)
  const balance = Number(profile.data.video_credits)
  if (!Number.isFinite(balance) || balance < needed) return v2Fail('out_of_credits', 402, { needed, balance: Number.isFinite(balance) ? balance : 0 })
  if (!found.data) {
    const plan = fullEscolhaPlan(stored.cena.plan)
    const chosen = stored.escolhaFlow.stills.find(j => j.id === stored.escolhaFlow.selectedStillId && j.status === 'done' && j.url)
    if (!chosen) return v2Fail('cena_still_choice_required', 409)
    const paid = { ...JSON.parse(JSON.stringify(order.plan)), cena: newCenaState(plan, 'kling3'), escolhaSampleSource: order.id }
    paid.totalSeconds = 15
    paid.cena.keyframe = chosen.url; paid.cena.keyframes = [chosen.url, chosen.url]; paid.cena.phase = 'video'; paid.cena.jobs = []
    paid.narration = plan.script.narration
    if (!escolhaReadyForStart(paid)) return v2Fail('cena_still_choice_required', 409)
    const ins = await d.admin.from('ads_v2_orders').insert({ id, user_id: user.id, status: 'planned', tier: 'commercial', seconds: 15, sector: 'store', language: order.language, narration: true, card_url: order.card_url, photos: [], brief: order.brief, plan: paid }).select('id').maybeSingle()
    if (ins.error && ins.error.code !== '23505') return v2Fail('cena_order_failed', 503)
  }
  const response = await d.start(id), body = await response.json()
  return v2Json({ ...body, sample: false, seconds: 15 }, response.status)
}
