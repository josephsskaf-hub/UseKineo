// KINEO-AMOSTRA-ANUNCIO-2410 — personal ownership resolved by the server, never inherited from a Business workspace.
import type { SupabaseClient } from '@supabase/supabase-js'
import { isUuid } from '../v2Contract'
import { isEscolhaSamplePlan } from './escolhaSamplePolicy'
export async function isEscolhaPersonalOrder(admin: SupabaseClient, userId: string, orderId: unknown): Promise<boolean> {
  if (!isUuid(orderId)) return false
  const r = await admin.from('ads_v2_orders').select('plan').eq('id', orderId).eq('user_id', userId).maybeSingle()
  if (r.error || !r.data) return false
  const p = r.data.plan
  return isEscolhaSamplePlan(p?.cena?.plan) || typeof p?.escolhaSampleSource === 'string' && isUuid(p.escolhaSampleSource)
}
