// KINEO-COMPRA-AVULSA-2410 — called only from the signature-verified webhook; an atomic RPC owns credits and purchase telemetry.
import type Stripe from 'stripe'
import type { SupabaseClient } from '@supabase/supabase-js'
import { isOneTimeItemId, ONE_TIME_ITEM_VERSION, oneTimeItemOrderId, oneTimeItemSurface, oneTimeItemV1Credits, oneTimeItemV1Amount } from '@/lib/oneTimeItem'

/** Include malformed/unknown new SKUs so they can NEVER fall through to legacy grants by amount. */
export function isOneTimeItemSession(session: Stripe.Checkout.Session): boolean {
  return (session.metadata?.pack ?? '').startsWith('one_time_') || !!session.metadata?.one_time_item_version
}
export async function fulfillOneTimeItem(admin: SupabaseClient, session: Stripe.Checkout.Session): Promise<boolean> {
  const sku = session.metadata?.pack
  const userId = session.metadata?.supabase_user_id
  if (!isOneTimeItemId(sku) || session.mode !== 'payment' || session.payment_status !== 'paid' || !userId || session.metadata?.one_time_item_version !== ONE_TIME_ITEM_VERSION || (session.client_reference_id && session.client_reference_id !== userId)) throw new Error('Invalid paid single-item contract')
  const credits = oneTimeItemV1Credits(sku)
  const currency = session.currency
  if ((currency !== 'usd' && currency !== 'brl') || session.amount_total !== oneTimeItemV1Amount(sku, currency) || session.metadata?.pack_credits !== String(credits)) throw new Error('Single-item amount or quantity mismatch')
  const orderId = oneTimeItemOrderId(session.metadata?.order_id)
  if (session.metadata?.order_id && (!orderId || sku !== 'one_time_ad')) throw new Error('Invalid single-item order')
  const result = await admin.rpc('fulfill_one_time_item', {
    p_session_id: session.id, p_user_id: userId, p_sku: sku, p_credits: credits, p_amount_total: session.amount_total, p_currency: currency,
    p_browser_session_id: session.metadata?.browser_session_id?.slice(0, 64) ?? null, p_surface: oneTimeItemSurface(session.metadata?.surface), p_order_id: orderId,
  })
  if (result.error || typeof result.data !== 'boolean') throw new Error('Single-item grant unavailable; Stripe must retry')
  return result.data
}
