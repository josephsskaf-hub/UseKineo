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
import type { AjusteState, CenaAjusteLive } from './ajusteMedia' // KINEO-ADS-CENA-RETOMADA-2110
import { addAjusteQuality } from './ajusteQuality' // KINEO-ADS-CENA-SEGUE-2110
import { isEscolhaSamplePlan } from './escolhaSamplePolicy'
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
export async function advanceCenaOrder(admin: SupabaseClient, order: AdsV2OrderRow, deadlineMs = Date.now() + 60_000): Promise<void> {
  const state = cenaOf(order.plan)
  if (!state || order.status !== 'generating') return
  const auth = await admin.auth.admin.getUserById(order.user_id)
  if (auth.error || !isEscolhaSamplePlan(state.plan) && !cenaEnabled(isAdsInternalEmail(auth.data.user?.email))) { await failCenaOrder(admin, order, 'cena_internal_only'); return }
  if (!state.plan.escolha && !isAdsInternalEmail(auth.data.user?.email)) { await failCenaOrder(admin, order, 'cena_internal_only'); return } // KINEO-ADS-ESCOLHA-PUBLICO-2410
  if (state.plan.voice_mode) {
    try { cenaAssertVoiceRoute(state.route, state.plan.voice_mode, state.plan.input.language) }
    catch (e) { await failCenaOrder(admin, order, e instanceof Error ? e.message : 'cena_bad_voice_mode'); return }
  }
  // KINEO-ADS-CENA-95-2110 — só novos planos marcados; pedidos anteriores conservam o avanço existente.
  if ('quality95' in state.plan) {
    const { advanceCena95Order } = await import('./runtime95')
    await advanceCena95Order(admin, order, { json: cenaJson, fail: reason => failCenaOrder(admin, order, reason), deadlineMs })
    return
  }
  const escolhaLive = (state.plan as typeof state.plan & { escolha?: { marker?: string } }).escolha?.marker === 'KINEO-ADS-ESCOLHA-2310' // KINEO-ADS-ESCOLHA-2310 — old/95 requests retain their original dispatch and policy.
  // A mesma coluna de lease da montagem, enquanto generating. Um vencedor; relógio da segunda tentativa próprio.
  if (order.assembly_lease_at && Date.now() - Date.parse(order.assembly_lease_at) < 5 * 60_000) return
  const token = new Date().toISOString()
  let claim = admin.from('ads_v2_orders').update({ assembly_lease_at: token }).eq('id', order.id).eq('status', 'generating')
  claim = order.assembly_lease_at ? claim.eq('assembly_lease_at', order.assembly_lease_at) : claim.is('assembly_lease_at', null)
  const won = await claim.select('id').maybeSingle()
  if (won.error || !won.data) return
  const context = { userId: order.user_id, orderId: order.id }
  const save = async (s: CenaState) => {
    if (s.plan.ajusteLive?.version === 'KINEO-ADS-CENA-RETOMADA-2110') for (const note of s.plan.quality_notes ?? []) addAjusteQuality(s, note) // KINEO-ADS-CENA-SEGUE-2110
    const r = await admin.from('ads_v2_orders').update({ plan: { ...order.plan, ...(s.plan.ajusteLive?.version === 'KINEO-ADS-CENA-RETOMADA-2110' ? { narration: s.plan.script.narration } : {}), cena: s } }).eq('id', order.id).eq('status', 'generating').eq('assembly_lease_at', token).select('id').maybeSingle() // KINEO-ADS-CENA-SEGUE-2110 — canonical spoken text and notes persist together; legacy shape remains unchanged.
    if (r.error || !r.data) throw new Error('cena_lease_lost')
  }
  try {
    // KINEO-AMOSTRA-ANUNCIO-2410 — a contender can acquire a released NULL lease with an old snapshot.
    // Read the winner's durable state under our lease before TTS, video or montage; never overwrite it with stale intents.
    if (isEscolhaSamplePlan(state.plan)) {
      const fresh = await admin.from('ads_v2_orders').select('plan').eq('id', order.id).eq('status', 'generating').eq('assembly_lease_at', token).maybeSingle()
      const latest = !fresh.error && fresh.data ? cenaOf(fresh.data.plan) : null
      if (!latest || !isEscolhaSamplePlan(latest.plan)) return
      for (const key of Object.keys(state)) delete (state as unknown as Record<string, unknown>)[key]
      Object.assign(state, latest)
      order.plan = fresh.data!.plan
    }
    const advanceEscolhaMedia = async () => { // KINEO-ADS-ESCOLHA-2310 — injected effects share the existing winner lease and save, never a second billing path.
      const { stepCenaEscolhaMedia } = await import('./escolhaMedia') // KINEO-ADS-ESCOLHA-2310
      return stepCenaEscolhaMedia(state, { now: Date.now, save, // KINEO-ADS-ESCOLHA-2310
        synthesize: async text => { // KINEO-APRESENTADORES-2410 — new candidates use an explicit age/gender voice; the six existing choices retain their call.
          const { presenterCandidateById2410 } = await import('../presenterCandidates2410') // KINEO-APRESENTADORES-2410
          const candidate = presenterCandidateById2410(state.plan.escolha?.presenterId) // KINEO-APRESENTADORES-2410
          const audio = candidate // KINEO-APRESENTADORES-2410
            ? await (await import('@/lib/avatar/voice')).synthesizeWithVoice({ text, ...(await import('../presenterVoice2410')).presenterCandidateVoice2410(candidate, state.plan.input.language) }) // KINEO-APRESENTADORES-2410 — failure propagates; never substitute a default/female voice.
            : await synthesizeTtsFallback(text, { userId: order.user_id, generationId: order.id, language: state.plan.input.language }) // KINEO-APRESENTADORES-2410
          return { audio, seconds: estimateMp3DurationSeconds(audio) } // KINEO-APRESENTADORES-2410
        }, // KINEO-APRESENTADORES-2410
        upload: audio => uploadVoiceoverToSupabase(order.user_id, audio), // KINEO-ADS-ESCOLHA-2310
        submitMusic: async mood => { const { submeterLyria, lyriaPromptFor } = await import('@/lib/lyriaMusic'); return submeterLyria(lyriaPromptFor(mood)) }, // KINEO-ADS-ESCOLHA-2310
        pollMusic: async handle => { const { esperarLyria } = await import('@/lib/lyriaMusic'); return esperarLyria(handle, Math.min(deadlineMs - 1000, Date.now() + 5000)) }, // KINEO-ADS-ESCOLHA-2310
      }) // KINEO-ADS-ESCOLHA-2310
    } // KINEO-ADS-ESCOLHA-2310
    if (escolhaLive) { // KINEO-ADS-ESCOLHA-2310 — pre-approved stills enter video directly; no legacy images, judge, composition or copy repair.
      const { preflightCenaEscolha } = await import('./escolhaPlan'); preflightCenaEscolha(state.plan, state.route) // KINEO-ADS-ESCOLHA-2310
      if (!['video', 'ready'].includes(state.phase) || !state.keyframes || state.keyframes[0] !== state.keyframes[1] || !/^https:\/\/\S+$/u.test(state.keyframes[0])) { await failCenaOrder(admin, order, 'escolha_chosen_still_required'); return } // KINEO-ADS-ESCOLHA-2310
      const media = await advanceEscolhaMedia() // KINEO-ADS-ESCOLHA-2310 — complete measured narration fits before the first video submission.
      if (media === 'failed') { await failCenaOrder(admin, order, (state as import('./escolhaMedia').CenaEscolhaState).escolhaMedia?.voice.reason ?? 'escolha_voice_unusable'); return } // KINEO-ADS-ESCOLHA-2310
      if (media !== 'ready') return // KINEO-ADS-ESCOLHA-2310
    } // KINEO-ADS-ESCOLHA-2310
    if (!escolhaLive && state.plan.ajusteLive?.version === 'KINEO-ADS-CENA-RETOMADA-2110') { // KINEO-ADS-ESCOLHA-2310 — same legacy planning gate; never rewrites the chosen scene.
      const nativeSpoken = cenaVoiceModeOf(state.plan) === 'talking' && state.jobs.some(j => j.kind === 'video' && (j.status === 'submitting' || j.status === 'pending' || j.status === 'done' || j.claimedAt !== undefined)) // KINEO-ADS-CENA-SEGUE-2110 — a native-video intent has already committed its spoken text even without a separate TTS URL.
      const spoken = state.voiceUrl || state.voiceClaimedAt || nativeSpoken ? { ...state.plan.script, hooks: [...state.plan.script.hooks] as [string, string, string] } : null // KINEO-ADS-CENA-SEGUE-2110 — paid/available narration is immutable even if a later preflight proposes text changes.
      const nativePrompts = nativeSpoken ? { videoPrompt: state.plan.videoPrompt, segmentPrompts: state.plan.segmentPrompts ? [...state.plan.segmentPrompts] as [string, string] : undefined } : null // KINEO-ADS-CENA-SEGUE-2110
      try { (await import('./ajustePreflight')).preflightCenaAjuste(state.plan, state.route) } // KINEO-ADS-CENA-SEGUE-2110 — the exact shared corrective preflight owns quality; no second runtime policy.
      catch { await failCenaOrder(admin, order, 'cena_ajuste_plan_invalid'); return }
      if (spoken) { if (JSON.stringify(spoken) !== JSON.stringify(state.plan.script)) addAjusteQuality(state, { stage: 'voice', code: 'voice_script_preserved', message: 'Existing narration or its paid intention retains the exact original script; later text suggestions were not substituted under its audio.' }); state.plan.script = spoken } // KINEO-ADS-CENA-SEGUE-2110
      if (nativePrompts) Object.assign(state.plan, nativePrompts) // KINEO-ADS-CENA-SEGUE-2110 — all remaining native segments retain the wording contracted with the first submitted segment.
      for (const note of state.plan.quality_notes ?? []) addAjusteQuality(state, note); await save(state) // KINEO-ADS-CENA-SEGUE-2110 — lease loss stays outside the input-error handler.
    }
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
        if (state.plan.ajusteLive?.version === 'KINEO-ADS-CENA-RETOMADA-2110' && r && Number.isFinite(r.measuredSeconds) && r.measuredSeconds > 0) { j.measuredSeconds = r.measuredSeconds; if (r.measuredSeconds < j.seconds) addAjusteQuality(state, { stage: 'montage', code: 'video_duration_short', message: `Existing video has ${r.measuredSeconds}s instead of ${j.seconds}s; retain it and loop its moving visual where necessary.`, candidate: j.index, round: attempt }); return r.storedUrl } // KINEO-ADS-CENA-SEGUE-2110
        return r && r.measuredSeconds >= j.seconds - 0.1 ? r.storedUrl : null
      },
      event: async (name, metadata) => { await writeServerEvent({ name, userId: order.user_id, path: '/lib/ads/cena', metadata: { order_id: order.id, route: state.route, ...metadata } }) },
    })
    if (state.phase === 'failed') { await failCenaOrder(admin, order, state.reason ?? 'cena_failed'); return }
    if (state.phase !== 'ready') return
    const ajusteLive = (state.plan as typeof state.plan & { ajusteLive?: CenaAjusteLive }).ajusteLive?.version === 'KINEO-ADS-CENA-RETOMADA-2110' // KINEO-ADS-CENA-RETOMADA-2110
    const adjusted = state as AjusteState // KINEO-ADS-CENA-RETOMADA-2110
    if (ajusteLive && !escolhaLive) { // KINEO-ADS-ESCOLHA-2310 — selected scene remains live to15s, without a separately generated original-photo close.
      const { stepAjusteMedia } = await import('./ajusteMedia') // KINEO-ADS-CENA-RETOMADA-2110
      const media = await stepAjusteMedia(adjusted, { now: Date.now, save, // KINEO-ADS-CENA-RETOMADA-2110
        submitClose: async j => { // KINEO-ADS-CENA-RETOMADA-2110
          const r = await submitShotOnce(j.endpoint, j.input, context) // KINEO-ADS-CENA-RETOMADA-2110
          if (r.kind === 'accepted') return { kind: 'accepted', requestId: r.requestId } // KINEO-ADS-CENA-RETOMADA-2110
          if (r.kind === 'ambiguous') { // KINEO-ADS-CENA-RETOMADA-2110
            let timer: ReturnType<typeof setTimeout> | undefined // KINEO-ADS-CENA-RETOMADA-2110
            try { const id = await Promise.race([r.late, new Promise<null>(resolve => { timer = setTimeout(() => resolve(null), 5000) })]); if (id) return { kind: 'accepted', requestId: id } } // KINEO-ADS-CENA-RETOMADA-2110
            finally { if (timer) clearTimeout(timer) } // KINEO-ADS-CENA-RETOMADA-2110
          } // KINEO-ADS-CENA-RETOMADA-2110
          return { kind: r.kind === 'ambiguous' ? 'ambiguous' : 'rejected' } // KINEO-ADS-CENA-RETOMADA-2110
        }, // KINEO-ADS-CENA-RETOMADA-2110
        pollClose: j => pollFalJob(j.endpoint, j.requestId!, 'video', context), // KINEO-ADS-CENA-RETOMADA-2110
        persistClose: j => persistShotClip({ ...context, idx: 90, attempt: j.attempt, falUrl: j.falUrl! }), // KINEO-ADS-CENA-RETOMADA-2110
        submitMusic: async mood => { const { submeterLyria, lyriaPromptFor } = await import('@/lib/lyriaMusic'); return submeterLyria(lyriaPromptFor(mood)) }, // KINEO-ADS-CENA-RETOMADA-2110
        pollMusic: async handle => { const { esperarLyria } = await import('@/lib/lyriaMusic'); return esperarLyria(handle, Math.min(deadlineMs - 1000, Date.now() + 5000)) }, // KINEO-ADS-CENA-RETOMADA-2110
        event: async (name, metadata) => { await writeServerEvent({ name, userId: order.user_id, path: '/lib/ads/cena', metadata: { order_id: order.id, route: state.route, ...metadata } }) }, // KINEO-ADS-CENA-RETOMADA-2110
      }) // KINEO-ADS-CENA-RETOMADA-2110
      if (media === 'failed') { await failCenaOrder(admin, order, adjusted.ajusteMedia?.close.reason ?? 'cena_ajuste_close_failed'); return } // KINEO-ADS-CENA-RETOMADA-2110
      if (media !== 'ready') return // KINEO-ADS-CENA-RETOMADA-2110
    } // KINEO-ADS-CENA-RETOMADA-2110
    if (!escolhaLive && cenaVoiceModeOf(state.plan) === 'narrated' && !state.voiceUrl) { // KINEO-ADS-ESCOLHA-2310 — chosen flow already measured its complete narration before video.
      if (state.voiceClaimedAt) { await failCenaOrder(admin, order, 'cena_voice_submit_unconfirmed'); return }
      state.voiceClaimedAt = Date.now(); await save(state)
      const audio = await synthesizeTtsFallback(state.plan.script.narration, { userId: order.user_id, generationId: order.id, language: state.plan.input.language })
      const seconds = estimateMp3DurationSeconds(audio)
      if (!(seconds > 0 && (ajusteLive ? Number.isFinite(seconds) : seconds <= 15))) { if (ajusteLive) { addAjusteQuality(state, { stage: 'voice', code: 'voice_unusable', message: `Narration audio has an unusable duration (${String(seconds)}s); no valid positive-duration audio exists to assemble.` }); await save(state) }; await failCenaOrder(admin, order, ajusteLive ? 'cena_voice_unusable' : 'cena_voice_does_not_fit'); return } // KINEO-ADS-CENA-SEGUE-2110 — retain every valid AJUSTE spoken word; legacy duration policy is unchanged.
      if (ajusteLive) addAjusteQuality(state, { stage: 'voice', code: 'voice_ready', message: `Complete narration duration estimated at ${seconds}s from its audio; no spoken text or CTA was removed.` }) // KINEO-ADS-CENA-SEGUE-2110
      if (ajusteLive && seconds > 15) addAjusteQuality(state, { stage: 'voice', code: 'voice_duration_extended', message: `Valid narration lasts ${seconds}s. Output duration extends to ${seconds}s, keeping the entire voice and CTA, the final 5s moving close and last 2s overlay; caption timing remains an estimate.` }) // KINEO-ADS-CENA-SEGUE-2110
      state.voiceUrl = await uploadVoiceoverToSupabase(order.user_id, audio); if (ajusteLive && adjusted.ajusteMedia) adjusted.ajusteMedia.voiceSeconds = seconds; await save(state) // KINEO-ADS-CENA-RETOMADA-2110
    }
    if (escolhaLive) { const media = await advanceEscolhaMedia(); if (media !== 'ready') return } // KINEO-ADS-ESCOLHA-2310 — optional music reuses its durable handle and never submits a close.
    const source = escolhaLive ? (await import('./escolhaMontage')).buildCenaEscolhaMontage(state) : ajusteLive ? (await import('./ajusteMontage')).buildAjusteMontage(adjusted) : buildCenaMontage(state) // KINEO-ADS-ESCOLHA-2310
    if (ajusteLive) await save(state) // KINEO-ADS-CENA-SEGUE-2110 — persist montage/narration reservations before the render intent.
    // Carimbo ANTES do POST; erro ambíguo passa ao prazo v2, nunca reenviar Creatomate.
    const stamp = await admin.from('ads_v2_orders').update({ status: 'assembling', assembly_submit_at: new Date().toISOString() }).eq('id', order.id).eq('status', 'generating').eq('assembly_lease_at', token).is('assembly_submit_at', null).select('id').maybeSingle()
    if (stamp.error || !stamp.data) return
    try {
      const id = await submitCreatomateRender(source)
      const write = () => admin.from('ads_v2_orders').update({ creatomate_render_id: id }).eq('id', order.id).eq('status', 'assembling').is('creatomate_render_id', null)
      let r = await write(); if (r.error) r = await write()
      await writeServerEvent({ name: 'ads_cena_assembling', userId: order.user_id, path: '/lib/ads/cena', metadata: { order_id: order.id, route: state.route, video_attempt: state.videoAttempt, image_round: state.imageRound, creatomate_render_id: id, seconds: ajusteLive ? Number(source.duration) : 15 } }) // KINEO-ADS-CENA-SEGUE-2110
    } catch (e) {
      if (!(e instanceof CreatomateSubmitError && e.ambiguous)) await failCenaOrder(admin, order, 'cena_montage_rejected')
    }
  } catch (e) {
    if (e instanceof Error && e.message === 'cena_lease_lost') return
    if (escolhaLive || state.phase === 'ready') await failCenaOrder(admin, order, escolhaLive && e instanceof Error ? e.message : 'cena_montage_or_voice_failed') // KINEO-ADS-ESCOLHA-2310 — technical media failure retains the existing winner-only refund.
    else throw e
  } finally {
    await admin.from('ads_v2_orders').update({ assembly_lease_at: null }).eq('id', order.id).eq('status', 'generating').eq('assembly_lease_at', token)
  }
}
