// KINEO-ADS-ESCOLHA-PUBLICO-2410 — server transition events, never UI polling or client supplied identity.
import { writeServerEvent } from '@/lib/serverEvents'
import { escolhaOf } from './escolhaStills'
import { isUuid } from '../v2Contract'
export type EscolhaEventStage = 'plan' | 'stills_ready' | 'chosen' | 'render_started' | 'delivered' | 'failed'
export async function writeEscolhaEvent(stage: EscolhaEventStage, ownerId: string, orderId: string, plan: unknown, extra: Record<string, unknown> = {}) {
  const p = escolhaOf(plan)
  if (!p) return false
  const actorId = isUuid(p.escolhaActorId) ? p.escolhaActorId as string : ownerId
  return writeServerEvent({ name: `ads_escolha_${stage}`, userId: actorId, path: '/ads/v2', metadata: {
    ...extra, user_id: actorId, owner_id: ownerId, order_id: orderId, category: p.cena.plan.category,
    scenario_id: p.cena.plan.escolha!.scenarioId, presenter_id: p.cena.plan.escolha!.presenterId,
  } })
}
