// KINEO-ADS-ESCOLHA-PUBLICO-2410 — transactional delivery notice, only after a real delivered order.
import type { SupabaseClient } from '@supabase/supabase-js'
import { escolhaOf } from './escolhaStills'
import { isUuid } from '../v2Contract'
import { claimEmailSlot, recordResendResponse } from '@/lib/email/quota'
import { emailFooterText, unsubscribeHeaders } from '@/lib/emailSuppression'
import { writeServerEvent } from '@/lib/serverEvents'
import { isEscolhaSamplePlan } from './escolhaSamplePolicy'

type ReadyOrder = { id: string; user_id: string; status: string; plan: unknown; language: string | null; video_id: string | null }
export async function notifyEscolhaDelivered(admin: SupabaseClient, order: ReadyOrder): Promise<boolean> {
  const p = escolhaOf(order.plan), key = process.env.RESEND_API_KEY
  if (!p || order.status !== 'delivered' || !order.video_id) return false
  const userId = isUuid(p.escolhaActorId) ? p.escolhaActorId as string : order.user_id
  try {
    const queued = await admin.from('ads_escolha_ready_notices').upsert({ order_id: order.id }, { onConflict: 'order_id', ignoreDuplicates: true })
    if (queued.error || !key) return false
    const token = new Date().toISOString(), stale = new Date(Date.now() - 5 * 60_000).toISOString()
    const claim = await admin.from('ads_escolha_ready_notices').update({ claimed_at: token })
      .eq('order_id', order.id).is('closed_at', null)
      .or(`claimed_at.is.null,claimed_at.lt.${stale}`).select('order_id').maybeSingle()
    if (claim.error || !claim.data) return false
    const preference = await admin.from('profiles').select('email_opted_out').eq('id', userId).maybeSingle()
    if (preference.error) return false
    if (!preference.data || preference.data.email_opted_out === true) {
      await admin.from('ads_escolha_ready_notices').update({ closed_at: token }).eq('order_id', order.id).eq('claimed_at', token)
      return false
    }
    const auth = await admin.auth.admin.getUserById(userId)
    const email = auth.error ? null : auth.data.user?.email
    if (!email) return false
    const slot = await claimEmailSlot({ kind: 'ads_escolha_ready', priority: 'product', admin })
    if (!slot.allowed) return false
    const pt = order.language?.toLowerCase().startsWith('pt'), link = `https://www.usekineo.com/ads/v2?order=${encodeURIComponent(order.id)}`
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST', signal: AbortSignal.timeout(10_000),
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', 'Idempotency-Key': `ads-escolha-ready-${order.id}` },
      body: JSON.stringify({ from: 'Kineo <hello@usekineo.com>', reply_to: 'support@usekineo.com', to: email,
        subject: pt ? 'Seu anúncio está pronto' : 'Your ad is ready',
        text: (isEscolhaSamplePlan(p.cena.plan) ? pt ? 'Sua amostra grátis de 8 segundos está pronta. Assista e gere a versão completa no Studio Ads:' : 'Your free 8-second sample is ready. Watch it and generate the full version in Studio Ads:' : pt ? 'Seu anúncio de 15 segundos está pronto. Abra o Studio Ads para assistir e baixar:' : 'Your 15-second ad is ready. Open Studio Ads to watch and download:') + `\n\n${link}` + emailFooterText(userId),
        headers: unsubscribeHeaders(userId),
      }),
    })
    await recordResendResponse({ kind: 'ads_escolha_ready', priority: 'product', userId, res, admin })
    if (!res.ok) return false
    await admin.from('ads_escolha_ready_notices').update({ sent_at: token, closed_at: token }).eq('order_id', order.id).eq('claimed_at', token)
    await writeServerEvent({ name: 'ads_escolha_ready_email_sent', userId, path: '/ads/v2', metadata: { order_id: order.id } })
    return true
  } catch { return false }
}

/** Existing scheduled Ads cron retries only recent notices; no new schedule or marketing campaign. */
export async function retryEscolhaNotices(admin: SupabaseClient, deadlineMs: number): Promise<void> {
  const pending = await admin.from('ads_escolha_ready_notices').select('order_id').is('closed_at', null)
    .gte('delivered_at', new Date(Date.now() - 24 * 60 * 60_000).toISOString()).order('claimed_at', { nullsFirst: true }).limit(6)
  if (pending.error) return
  for (const row of pending.data ?? []) {
    if (Date.now() + 12_000 >= deadlineMs) break
    const r = await admin.from('ads_v2_orders').select('id,user_id,status,plan,language,video_id').eq('id', row.order_id).eq('status', 'delivered').maybeSingle()
    if (r.data) await notifyEscolhaDelivered(admin, r.data as ReadyOrder)
  }
}
