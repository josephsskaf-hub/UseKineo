// KINEO-ADS-CENA-2110 — ligação ao v2 sem tabela nova; este módulo só é carregado para pedido com a marca.
// KINEO-ADS-CENA-AJUSTE-2110 — TTS obrigatório em narrated, nunca em talking; mantém audioMode de pedidos legados.
import type { SupabaseClient } from '@supabase/supabase-js'
import type { AdsV2OrderRow } from '../v2Advance'
import { isAdsInternalEmail } from '../access'
import { cenaEnabled } from './catalog'
import { cenaOf, stepCena, type CenaState } from './pipeline'
import { buildCenaMontage } from './montage'
import { openai } from '@/lib/openai'
import { cenaVoiceModeOf, type CenaJson } from './plan'
import { cenaAssertVoiceRoute } from './adapters'
import { failAdsV2Order } from '../v2Billing'
import { submitShotOnce, pollFalJob, persistShotClip } from '../v2Shots'
import { persistSceneImage } from '../v2Images'
import { writeServerEvent } from '@/lib/serverEvents'
import { CreatomateSubmitError, estimateMp3DurationSeconds, submitCreatomateRender, uploadVoiceoverToSupabase } from '@/lib/compose'
import { synthesizeTtsFallback } from '@/lib/ttsFallback'
export const cenaJson: CenaJson = async c => {
  const measured = c as typeof c & { maxOutputTokens?: number; onUsage?: (u: { prompt_tokens?: number; completion_tokens?: number }) => void }
  const result = await openai.chat.completions.create({ model: c.model, response_format: { type: 'json_object' }, temperature: 0.3, max_tokens: measured.maxOutputTokens ?? 1000, messages: [{ role: 'system', content: c.system }, { role: 'user', content: [{ type: 'text', text: c.text }, ...c.images.map(url => ({ type: 'image_url' as const, image_url: { url, detail: 'high' as const } }))] }] }, { timeout: 20_000, maxRetries: 0 })
  if (result.usage) measured.onUsage?.(result.usage)
  return result.choices[0]?.message?.content ?? ''
}
export async function failCenaOrder(admin: SupabaseClient, order: AdsV2OrderRow, reason: string): Promise<void> {
  const r = await failAdsV2Order(admin, order, reason, '/lib/ads/cena')
  if (r.won) await writeServerEvent({ name: 'ads_cena_failed', userId: order.user_id, path: '/lib/ads/cena', metadata: { order_id: order.id, reason, refund: r.refund, credits_returned: r.amount } })
}
export async function advanceCenaOrder(admin: SupabaseClient, order: AdsV2OrderRow): Promise<void> {
  const state = cenaOf(order.plan)
  if (!state || order.status !== 'generating') return
  const auth = await admin.auth.admin.getUserById(order.user_id)
  if (auth.error || !cenaEnabled(isAdsInternalEmail(auth.data.user?.email))) { await failCenaOrder(admin, order, 'cena_internal_only'); return }
  if (state.plan.voice_mode) {
    try { cenaAssertVoiceRoute(state.route, state.plan.voice_mode, state.plan.input.language) }
    catch (e) { await failCenaOrder(admin, order, e instanceof Error ? e.message : 'cena_bad_voice_mode'); return }
  }
  // KINEO-ADS-CENA-95-2110 — só novos planos marcados; pedidos anteriores conservam o avanço existente.
  if ('quality95' in state.plan) {
    const { advanceCena95Order } = await import('./runtime95')
    await advanceCena95Order(admin, order, { json: cenaJson, fail: reason => failCenaOrder(admin, order, reason) })
    return
  }
  // A mesma coluna de lease da montagem, enquanto generating. Um vencedor; relógio da segunda tentativa próprio.
  if (order.assembly_lease_at && Date.now() - Date.parse(order.assembly_lease_at) < 5 * 60_000) return
  const token = new Date().toISOString()
  let claim = admin.from('ads_v2_orders').update({ assembly_lease_at: token }).eq('id', order.id).eq('status', 'generating')
  claim = order.assembly_lease_at ? claim.eq('assembly_lease_at', order.assembly_lease_at) : claim.is('assembly_lease_at', null)
  const won = await claim.select('id').maybeSingle()
  if (won.error || !won.data) return
  const context = { userId: order.user_id, orderId: order.id }
  const save = async (s: CenaState) => {
    const r = await admin.from('ads_v2_orders').update({ plan: { ...order.plan, cena: s } }).eq('id', order.id).eq('status', 'generating').eq('assembly_lease_at', token).select('id').maybeSingle()
    if (r.error || !r.data) throw new Error('cena_lease_lost')
  }
  try {
    await stepCena(state, { now: Date.now, save, json: cenaJson,
      submit: async j => {
        const r = await submitShotOnce(j.endpoint, j.input, context)
        if (r.kind === 'accepted') return { kind: 'accepted', requestId: r.requestId }
        if (r.kind === 'ambiguous') {
          let timer: ReturnType<typeof setTimeout> | undefined
          try { const id = await Promise.race([r.late, new Promise<null>(resolve => { timer = setTimeout(() => resolve(null), 5000) })]); if (id) return { kind: 'accepted', requestId: id } }
          finally { if (timer) clearTimeout(timer) }
        }
        return { kind: r.kind === 'ambiguous' ? 'ambiguous' : 'rejected' }
      },
      poll: j => pollFalJob(j.endpoint, j.requestId!, j.kind, context),
      persist: async (j, attempt) => {
        if (j.kind === 'image') return persistSceneImage({ ...context, idx: j.index, attempt, falUrl: j.url!, suffix: `-o${j.index}` })
        const r = await persistShotClip({ ...context, idx: j.index, attempt, falUrl: j.url! })
        return r && r.measuredSeconds >= j.seconds - 0.1 ? r.storedUrl : null
      },
      event: async (name, metadata) => { await writeServerEvent({ name, userId: order.user_id, path: '/lib/ads/cena', metadata: { order_id: order.id, route: state.route, ...metadata } }) },
    })
    if (state.phase === 'failed') { await failCenaOrder(admin, order, state.reason ?? 'cena_failed'); return }
    if (state.phase !== 'ready') return
    if (cenaVoiceModeOf(state.plan) === 'narrated' && !state.voiceUrl) {
      if (state.voiceClaimedAt) { await failCenaOrder(admin, order, 'cena_voice_submit_unconfirmed'); return }
      state.voiceClaimedAt = Date.now(); await save(state)
      const audio = await synthesizeTtsFallback(state.plan.script.narration, { userId: order.user_id, generationId: order.id })
      const seconds = estimateMp3DurationSeconds(audio)
      if (!(seconds > 0 && seconds <= 15)) { await failCenaOrder(admin, order, 'cena_voice_does_not_fit'); return }
      state.voiceUrl = await uploadVoiceoverToSupabase(order.user_id, audio); await save(state)
    }
    const source = buildCenaMontage(state)
    // Carimbo ANTES do POST; erro ambíguo passa ao prazo v2, nunca reenviar Creatomate.
    const stamp = await admin.from('ads_v2_orders').update({ status: 'assembling', assembly_submit_at: new Date().toISOString() }).eq('id', order.id).eq('status', 'generating').eq('assembly_lease_at', token).is('assembly_submit_at', null).select('id').maybeSingle()
    if (stamp.error || !stamp.data) return
    try {
      const id = await submitCreatomateRender(source)
      const write = () => admin.from('ads_v2_orders').update({ creatomate_render_id: id }).eq('id', order.id).eq('status', 'assembling').is('creatomate_render_id', null)
      let r = await write(); if (r.error) r = await write()
      await writeServerEvent({ name: 'ads_cena_assembling', userId: order.user_id, path: '/lib/ads/cena', metadata: { order_id: order.id, route: state.route, video_attempt: state.videoAttempt, image_round: state.imageRound, creatomate_render_id: id, seconds: 15 } })
    } catch (e) {
      if (!(e instanceof CreatomateSubmitError && e.ambiguous)) await failCenaOrder(admin, order, 'cena_montage_rejected')
    }
  } catch (e) {
    if (e instanceof Error && e.message === 'cena_lease_lost') return
    if (state.phase === 'ready') await failCenaOrder(admin, order, 'cena_montage_or_voice_failed')
    else throw e
  } finally {
    await admin.from('ads_v2_orders').update({ assembly_lease_at: null }).eq('id', order.id).eq('status', 'generating').eq('assembly_lease_at', token)
  }
}
