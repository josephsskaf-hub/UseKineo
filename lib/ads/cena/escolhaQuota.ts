// KINEO-ADS-ESCOLHA-PUBLICO-2410 — eligibility is not a debit; the database reserves photo orders atomically.
import type { SupabaseClient } from '@supabase/supabase-js'
import type { AdsAccessLoad } from '../serverAccess'
import { ADS_SUBSCRIBER_PLANS } from '../access'
import { adsV2Credits } from '../v2Tiers'

export const ESCOLHA_DAILY_PHOTO_ORDERS = 6
export async function escolhaPhotoEligibility(admin: SupabaseClient, ownerId: string, access?: AdsAccessLoad) {
  const needed = adsV2Credits('commercial', 15)
  if (access && (ADS_SUBSCRIBER_PLANS.includes(access.ownerPlan ?? '') || access.reason === 'partner')) return { ok: true as const, needed }
  const r = await admin.from('profiles').select('video_credits, plan').eq('id', ownerId).maybeSingle()
  if (r.error || !r.data) return { ok: false as const, error: 'cena_photo_quota_unavailable', status: 503, needed }
  const balance = Number(r.data.video_credits)
  return ADS_SUBSCRIBER_PLANS.includes(String(r.data.plan ?? '').trim().toLowerCase()) || Number.isFinite(balance) && balance >= needed
    ? { ok: true as const, needed }
    : { ok: false as const, error: 'cena_photo_credits_required', status: 402, needed, balance: Number.isFinite(balance) ? balance : 0 }
}

export async function reserveEscolhaPhotos(admin: SupabaseClient, args: { orderId: string; ownerId: string; actorId: string; leaseAt: string }) {
  try {
    const r = await admin.rpc('reserve_ads_escolha_photos', { p_order_id: args.orderId, p_owner_id: args.ownerId, p_actor_id: args.actorId, p_lease_at: args.leaseAt })
    const row = Array.isArray(r.data) ? r.data[0] : r.data
    if (r.error || !row || !['ok', 'cena_photo_daily_limit'].includes(row.code)) return { ok: false as const, error: 'cena_photo_quota_unavailable', status: 503 }
    if (row.code === 'cena_photo_daily_limit') return { ok: false as const, error: row.code as string, status: 429, limit: ESCOLHA_DAILY_PHOTO_ORDERS, reset_at: row.reset_at }
    return { ok: true as const }
  } catch { return { ok: false as const, error: 'cena_photo_quota_unavailable', status: 503 } }
}
