// KINEO-ADS-CENA-95-2110 — canário novo sobre as mesmas linhas, lease, montagem, entrega e estorno do v2.
import type { SupabaseClient } from '@supabase/supabase-js'
import type { AdsV2OrderRow } from '../v2Advance'
import type { CenaJson } from './plan'
import { reserveCena95, stepCena95, type Cena95State } from './pipeline95'
import { prepareCena95Voice, prepareCena95Music, type Cena95FinishDeps } from './finish95'
import { synthesizeCena95NarratedVoice } from './audio95Runtime'
import { extractCena95Frames } from './frames95'
import { buildCena95Montage } from './montage95'
import { cena95Preflight } from './preflight95' // KINEO-ADS-CENA-95-PACING-2110
import { cena95UsageObservation } from './usage95'
import { submeterLyria, esperarLyria, lyriaPromptFor } from '@/lib/lyriaMusic'
import { CreatomateSubmitError, estimateMp3DurationSeconds, submitCreatomateRender, uploadVoiceoverToSupabase } from '@/lib/compose'
import { submitShotOnce, pollFalJob, persistShotClip } from '../v2Shots'
import { persistSceneImage } from '../v2Images'
import { writeServerEvent } from '@/lib/serverEvents'
export async function advanceCena95Order(admin: SupabaseClient, order: AdsV2OrderRow, d: { json: CenaJson; fail(reason: string): Promise<void>; deadlineMs?: number }): Promise<void> {
  const outer = (order.plan as unknown as { cena?: { score95?: Cena95State } }).cena
  const s = outer?.score95
  if (!s || s.version !== 'KINEO-ADS-CENA-95-2110' || s.plan.quality95?.version !== s.version || s.route !== (outer as { route?: string }).route) { await d.fail('cena95_state_invalid'); return }
  const deadlineMs = d.deadlineMs ?? Date.now() + 60_000, canSpend = (ms: number) => deadlineMs - Date.now() >= ms
  if (!canSpend(10_000)) return
  if (order.assembly_lease_at && Date.now() - Date.parse(order.assembly_lease_at) < 5 * 60_000) return
  const token = new Date().toISOString()
  let claim = admin.from('ads_v2_orders').update({ assembly_lease_at: token }).eq('id', order.id).eq('status', 'generating')
  claim = order.assembly_lease_at ? claim.eq('assembly_lease_at', order.assembly_lease_at) : claim.is('assembly_lease_at', null)
  const won = await claim.select('id').maybeSingle()
  if (won.error || !won.data) return
  const context = { userId: order.user_id, orderId: order.id }
  const save = async (state: Cena95State) => {
    const cena = { ...outer, plan: state.plan, route: state.route, score95: state, phase: state.phase === 'base' ? 'images' : state.phase === 'videos' ? 'video' : state.phase, costObservation: cena95UsageObservation(state) }
    const r = await admin.from('ads_v2_orders').update({ plan: { ...order.plan, cena } }).eq('id', order.id).eq('status', 'generating').eq('assembly_lease_at', token).select('id').maybeSingle()
    if (r.error || !r.data) throw new Error('cena95_lease_lost')
  }
  const event = async (name: string, metadata: Record<string, unknown>) => { await writeServerEvent({ name, userId: order.user_id, path: '/lib/ads/cena', metadata: { order_id: order.id, route: s.route, quality: s.version, ...metadata } }) }
  const audio: Cena95FinishDeps = { now: Date.now, save, event,
    voice: request => synthesizeCena95NarratedVoice(request, { timeoutMs: 30_000, downloadTimeoutMs: 10_000, upload: buffer => uploadVoiceoverToSupabase(order.user_id, buffer) }),
    music: async () => {
      if (!s.musicHandle) {
        const handle = await submeterLyria(lyriaPromptFor(s.plan.quality95.musicMood))
        if (!handle) return null
        s.musicHandle = handle; await save(s); return { pending: true }
      }
      const url = await esperarLyria(s.musicHandle, Math.min(deadlineMs - 30_000, Date.now() + 8_000))
      if (!url) return { pending: true }
      const r = await fetch(url, { signal: AbortSignal.timeout(10_000) })
      if (!r.ok || Number(r.headers.get('content-length')) > 10 * 1024 * 1024) return null
      const buffer = Buffer.from(await r.arrayBuffer())
      if (!buffer.length || buffer.length > 10 * 1024 * 1024 || estimateMp3DurationSeconds(buffer) < 15) return null
      return uploadVoiceoverToSupabase(order.user_id, buffer)
    },
  }
  try {
    // Registra também as chamadas já medidas no planejamento, antes de qualquer geração de mídia.
    const planning = s.plan.quality95.costs[s.route].breakdown.filter(p => ['planning_text_input', 'classifier_image_input', 'planning_output'].includes(p.component)).reduce((n, p) => n + p.usd, 0)
    await reserveCena95(s, audio, 'planning', 'planning', planning)
    // Detecta voz longa/ambígua ANTES de gastar os candidatos de vídeo de pessoa.
    if (s.phase === 'videos' && s.plan.voice_mode === 'narrated' && !s.voiceUrl && !canSpend(55_000)) return
    await prepareCena95Voice(s, audio)
    await stepCena95(s, { now: Date.now, save, json: d.json, event, canSpend, maxJobsPerStep: 1,
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
      persist: async j => {
        if (j.kind === 'image') return persistSceneImage({ ...context, idx: j.index, attempt: j.round, falUrl: j.url!, suffix: `-q95-${j.index}` })
        const r = await persistShotClip({ ...context, idx: j.index, attempt: j.round, falUrl: j.url! })
        return r && r.measuredSeconds >= j.seconds - 0.1 ? r.storedUrl : null
      },
      frames: async j => (await extractCena95Frames(j.url!, j.seconds, { falKey: process.env.FAL_KEY || process.env.FAL_API_KEY, timeoutMs: 40_000 }))?.frames ?? null,
    })
    if (s.phase === 'failed') { await d.fail(s.reason ?? 'cena95_failed'); return }
    if (s.phase !== 'ready') return
    if (!s.musicState && !canSpend(50_000)) return
    await prepareCena95Music(s, audio)
    if (!s.musicState || !canSpend(25_000)) return
    const prepared = cena95Preflight(s.plan.script, s.plan.input, s.route, s.plan.quality95.presenter, { ...(s.plan.voice_mode === 'narrated' ? { voiceSeconds: s.voiceSeconds! } : {}), words: s.words, product: s.plan.product }) // KINEO-ADS-CENA-95-PACING-2110
    const speechWindows = prepared.speechWindows, captions = prepared.captions // KINEO-ADS-CENA-95-PACING-2110
    s.captionTimingSource = captions.timingSource; s.words = captions.words
    const source = buildCena95Montage({ plan: s.plan, selectedClips: s.selectedClips, nativeAudioClips: s.nativeAudioClips, voiceUrl: s.voiceUrl, voiceSeconds: s.voiceSeconds, musicUrl: s.musicUrl, words: s.words, speechWindows })
    const render = s.plan.quality95.costs[s.route].breakdown.find(p => p.component === 'creatomate')!
    await reserveCena95(s, audio, 'montage', 'creatomate', render.usd); await save(s)
    const stamp = await admin.from('ads_v2_orders').update({ status: 'assembling', assembly_submit_at: new Date().toISOString() }).eq('id', order.id).eq('status', 'generating').eq('assembly_lease_at', token).is('assembly_submit_at', null).select('id').maybeSingle()
    if (stamp.error || !stamp.data) return
    try {
      const id = await submitCreatomateRender(source)
      const write = () => admin.from('ads_v2_orders').update({ creatomate_render_id: id }).eq('id', order.id).eq('status', 'assembling').is('creatomate_render_id', null)
      let r = await write(); if (r.error) r = await write()
      await event('ads_cena95_assembling', { creatomate_render_id: id, seconds: 15, reservedUsd: s.reservedUsd, budgetMaxUsd: s.budgetMaxUsd, actualTotalUsd: null, captionTimingSource: s.captionTimingSource })
    } catch (e) { if (!(e instanceof CreatomateSubmitError && e.ambiguous)) await d.fail('cena95_montage_rejected') }
  } catch (e) {
    if (e instanceof Error && e.message === 'cena95_lease_lost') return
    await d.fail(e instanceof Error && /^cena95_[a-z_]+$/u.test(e.message) ? e.message : 'cena95_generation_failed')
  } finally {
    await admin.from('ads_v2_orders').update({ assembly_lease_at: null }).eq('id', order.id).eq('status', 'generating').eq('assembly_lease_at', token)
  }
}
