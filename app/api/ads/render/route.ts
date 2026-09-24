// KINEO-STUDIO-ADS-SELF-SERVE-2026-09-24 — o render do anúncio que a empresa faz sozinha (fundador 24/09 à noite).
//
// POST: confere dono, acesso e interruptor; valida o pedido (modelo, consentimento, batidas, mídia por batida, cartão
// final) contra lib/ads/renderContract.ts; confere cada arquivo no user_footage DO DONO; checa saldo; trava o pedido
// em 'rendering' (dois cliques não viram dois renders); sintetiza a narração na voz escolhida; mede a voz e as palavras
// (Whisper); simula o montador do Kineo 1 para saber onde cai cada tomada; monta a lista de clipes tomada a tomada
// (lib/ads/renderPlan.ts); e chama o /api/compose EM PROCESSO, com cabeçalho de serviço, como a rotina
// finish-stranded-renders já faz. O compose reserva e cobra o crédito pelo caminho normal (35 s = 3, 60 s = 5), sem
// marca d'água para quem tem o passe (has_paid). Nada na trava 8.2 é editado — só importado e chamado.
//
// GET ?order_id=…: o estado do pedido. Se está 'rendering' e o vídeo já existe (videos.render_id), marca 'delivered'
// e grava ads_delivered uma vez. Se o vídeo ainda não existe, pergunta ao status do compose (em processo) — é isso que
// liquida o crédito e grava a linha do vídeo mesmo se a aba fechou; falha vira 'failed' com o motivo.
import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { createClient } from '@/lib/supabase/server'
import { writeServerEvent } from '@/lib/serverEvents'
import { FOOTAGE_PUBLIC_PREFIX } from '@/lib/userFootage'
import { adsGate, isMissingAdsTable, loadAdsAccess } from '@/lib/ads/serverAccess'
import { adsModelById } from '@/lib/ads/models'
import { countWords, sanitizeRenderRequest, type AdsRenderStarted, type AdsRenderState } from '@/lib/ads/renderContract'
import { adsClipListLength, adsTimelineSeconds, beatStartTimes, planClipUrls, type PlanMedia } from '@/lib/ads/renderPlan'
import type { AdsMediaItem } from '@/lib/ads/types'
import { creditCostForDuration } from '@/lib/credits/engineCost'
import {
  buildCreatomateSource,
  estimateMp3DurationSeconds,
  transcribeTTSWithTimestamps,
  uploadVoiceoverToSupabase,
} from '@/lib/compose'
import { POST as composePost } from '@/app/api/compose/route'
import { GET as composeStatusGet } from '@/app/api/compose/status/[renderId]/route'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'
export const runtime = 'nodejs'
export const maxDuration = 300

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.usekineo.com'
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)
const fail = (error: string, status: number, extra: Record<string, unknown> = {}) =>
  NextResponse.json({ error, ...extra }, { status, headers: { 'Cache-Control': 'no-store' } })

function serviceHeaders(userId: string): Record<string, string> {
  return { 'content-type': 'application/json', authorization: `Bearer ${process.env.CRON_SECRET}`, 'x-kineo-service-user': userId }
}

export async function POST(req: NextRequest) {
  let claimed: { admin: ReturnType<typeof import('@/lib/userFootage').footageAdminClient>; orderId: string; userId: string } | null = null
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return fail('unauthenticated', 401)
    const { admin, reason } = await loadAdsAccess(user.id, user.email)
    const gate = adsGate(reason)
    if (gate !== 'ok') {
      await writeServerEvent({ name: 'ads_access_denied', userId: user.id, path: '/api/ads/render', metadata: { reason: gate } })
      return fail(gate === 'closed' ? 'closed' : 'no_access', 403)
    }
    const body = await req.json().catch(() => null)
    if (!isObject(body)) return fail('body_must_be_object', 400)
    const orderId = typeof body.order_id === 'string' && UUID.test(body.order_id) ? body.order_id : null
    if (!orderId) return fail('order_id_invalid', 400)

    const orderRes = await admin
      .from('ads_orders')
      .select('id, status, template, seconds, brief, media, consent_at')
      .eq('id', orderId)
      .eq('user_id', user.id)
      .maybeSingle()
    if (orderRes.error) return isMissingAdsTable(orderRes.error.code) ? fail('not_ready', 503) : fail('render_failed', 500)
    const order = orderRes.data as { id: string; status: string; template: string | null; seconds: number | null; brief: Record<string, unknown> | null; media: AdsMediaItem[] | null; consent_at: string | null } | null
    if (!order) return fail('order_not_found', 404)
    if (order.status !== 'draft' && order.status !== 'failed') return fail('not_renderable', 409)
    const model = adsModelById(order.template)
    if (!model) return fail('template_required', 400)
    if (!order.consent_at) return fail('consent_required', 400)
    const media = Array.isArray(order.media) ? order.media : []
    const nonLogoIds = media.filter((m) => !m.isLogo).map((m) => m.footageId)
    const parsed = sanitizeRenderRequest(body, model, nonLogoIds)
    if (!parsed.ok) return fail(parsed.error, 400)
    const input = parsed.value

    // Cada arquivo é conferido no banco, dono = esta conta; a URL usada é a do banco, nunca a do navegador.
    const ids = [...new Set([...input.storyboard.flatMap((s) => s.footageIds), input.card_footage_id])]
    const own = await admin.from('user_footage').select('id, url, kind').eq('user_id', user.id).in('id', ids)
    if (own.error) return fail('render_failed', 500)
    const prefix = `${FOOTAGE_PUBLIC_PREFIX().replace(/\/+$/, '')}/${user.id}/`
    const byId = new Map<string, PlanMedia>()
    for (const r of (own.data ?? []) as { id: string; url: string; kind: string }[]) {
      if (typeof r.url !== 'string' || !r.url.startsWith(prefix)) continue
      const isImage = /\.(png|jpe?g)(\?|#|$)/i.test(r.url)
      const isVideo = /\.(mp4|mov|webm)(\?|#|$)/i.test(r.url)
      if (!isImage && !isVideo) continue
      byId.set(r.id, { url: r.url, kind: isImage ? 'image' : 'video' })
    }
    const card = byId.get(input.card_footage_id)
    if (!card || card.kind !== 'image' || !/\.png(\?|#|$)/i.test(card.url)) return fail('card_invalid', 400)
    const beatMedia: PlanMedia[][] = input.storyboard.map((s) => s.footageIds.map((id) => byId.get(id)).filter((m): m is PlanMedia => Boolean(m)))
    if (beatMedia.some((list, i) => list.length !== input.storyboard[i].footageIds.length)) return fail('media_not_owned', 400)

    // Saldo antes de gastar voz e Whisper (o compose confere de novo, com reservas).
    const seconds = model.seconds
    const cost = creditCostForDuration('fast', true, seconds)
    const prof = await admin.from('profiles').select('video_credits').eq('id', user.id).maybeSingle()
    const balance = Number((prof.data as { video_credits?: number } | null)?.video_credits ?? 0)
    if (!(balance >= cost)) return fail('out_of_credits', 402, { needed: cost, balance })

    // Trava o pedido: só um render por vez (o UPDATE só pega rascunho ou falha).
    const generationId = randomUUID()
    const script = input.beats.join('\n\n')
    const claim = await admin
      .from('ads_orders')
      .update({ status: 'rendering', voice: input.voice, script, storyboard: input.storyboard, card_footage_id: input.card_footage_id, generation_id: generationId, render_id: null })
      .eq('id', orderId)
      .eq('user_id', user.id)
      .in('status', ['draft', 'failed'])
      .select('id')
      .maybeSingle()
    if (claim.error || !claim.data) return fail('not_renderable', 409)
    claimed = { admin, orderId, userId: user.id }
    const back = async (status: 'draft' | 'failed', reasonText: string) => {
      await admin.from('ads_orders').update({ status }).eq('id', orderId).eq('user_id', user.id).eq('generation_id', generationId)
      if (status === 'failed') await writeServerEvent({ name: 'ads_render_failed', userId: user.id, path: '/api/ads/render', metadata: { order_id: orderId, generation_id: generationId, reason: reasonText.slice(0, 300) } })
      claimed = null
    }

    // Narração na voz escolhida (OpenAI tts-1-hd, a mesma família do Kineo 1), verbatim, velocidade 1.
    const narration = input.beats.join(' ')
    let voiceBuf: Buffer
    try {
      const { openai } = await import('@/lib/openai')
      const speech = await openai.audio.speech.create({ model: 'tts-1-hd', voice: input.voice, input: narration.slice(0, 4000), speed: 1 }, { timeout: 60_000, maxRetries: 1 })
      voiceBuf = Buffer.from(await speech.arrayBuffer())
      if (voiceBuf.length < 1000) throw new Error('empty_audio')
    } catch (e) {
      await back('failed', `voice_failed: ${e instanceof Error ? e.message : String(e)}`)
      return fail('voice_failed', 502)
    }
    const voiceUrl = await uploadVoiceoverToSupabase(user.id, voiceBuf)
    const narrationSeconds = estimateMp3DurationSeconds(voiceBuf)
    const words = await transcribeTTSWithTimestamps(voiceBuf).catch(() => [])

    // Onde cada tomada cai: simula o montador (puro) com URLs falsas e a MESMA voz/palavras.
    const total = adsTimelineSeconds(narrationSeconds, seconds)
    const listLength = adsClipListLength(total)
    const sim = buildCreatomateSource({
      clipUrls: Array.from({ length: listLength }, (_, j) => `https://sim.invalid/${j}.png`),
      voiceoverUrl: 'https://sim.invalid/v.mp3',
      voiceoverScript: narration,
      sceneCaptions: [],
      duration: seconds,
      quality: 'fast',
      realAudioDuration: narrationSeconds,
      whisperWords: words,
      musicUrl: null,
      aspect: '9:16',
    } as Parameters<typeof buildCreatomateSource>[0]) as { elements?: { track?: number; time?: number; duration?: number }[] }
    const slots = (sim.elements ?? [])
      .filter((e) => e && e.track === 2 && typeof e.time === 'number' && typeof e.duration === 'number')
      .map((e) => ({ time: Number(e.time), duration: Number(e.duration) }))
    const starts = beatStartTimes(input.beats.map(countWords), words, total)
    const clipUrls = planClipUrls({ slots, beatStarts: starts, beatMedia, cardUrl: card.url, listLength })

    const brief = order.brief ?? {}
    const business = typeof brief.business === 'string' ? brief.business : 'Your business'
    const topic = `${business} · ${model.name}`.slice(0, 200)
    const language = typeof brief.language === 'string' && /^[a-z]{2}$/.test(brief.language) ? brief.language : 'en'
    const payload = {
      generationId,
      quality: 'fast',
      duration: seconds,
      language,
      speed: 1,
      topic,
      voiceover_script: narration,
      scene_captions: input.beats,
      user_voiceover_url: voiceUrl,
      real_audio_duration: narrationSeconds,
      clip_urls: clipUrls,
      aspect: '9:16',
    }
    let res = await composePost(new NextRequest(`${APP_URL}/api/compose`, { method: 'POST', headers: serviceHeaders(user.id), body: JSON.stringify(payload) }))
    let j = (await res.json().catch(() => ({}))) as Record<string, unknown>
    if ((res.status === 409 || res.status === 503) && j.pending) {
      const wait = Math.min(8000, Math.max(1000, Number(j.retry_after_ms) || 3000))
      await new Promise((r) => setTimeout(r, wait))
      res = await composePost(new NextRequest(`${APP_URL}/api/compose`, { method: 'POST', headers: serviceHeaders(user.id), body: JSON.stringify(payload) }))
      j = (await res.json().catch(() => ({}))) as Record<string, unknown>
    }
    const renderId = typeof j.render_id === 'string' ? j.render_id : typeof j.renderId === 'string' ? j.renderId : null
    if (res.status === 402) {
      await back('draft', 'out_of_credits')
      return fail('out_of_credits', 402, { needed: cost, balance })
    }
    if (!res.ok || !renderId) {
      await back('failed', `compose ${res.status}: ${typeof j.error === 'string' ? j.error : ''}`)
      return fail('render_failed', 502)
    }
    await admin.from('ads_orders').update({ render_id: renderId }).eq('id', orderId).eq('user_id', user.id).eq('generation_id', generationId)
    claimed = null
    const userMediaSlots = clipUrls.slice(0, slots.length).filter((u) => u !== card.url).length
    await writeServerEvent({
      name: 'ads_render_requested',
      userId: user.id,
      path: '/api/ads/render',
      metadata: { order_id: orderId, generation_id: generationId, render_id: renderId, template: model.id, seconds, credits: cost, voice: input.voice, narration_seconds: Math.round(narrationSeconds * 10) / 10, slots: slots.length, user_media_slots: userMediaSlots, words: countWords(narration), whisper_words: words.length },
    })
    const started: AdsRenderStarted = { order_id: orderId, status: 'rendering', generation_id: generationId, render_id: renderId, seconds, credits: cost, narration_seconds: Math.round(narrationSeconds * 10) / 10, topic }
    return NextResponse.json(started, { headers: { 'Cache-Control': 'no-store' } })
  } catch (e) {
    console.warn('[ads/render POST] falhou:', e instanceof Error ? e.message : String(e))
    if (claimed) {
      const c = claimed
      await c.admin.from('ads_orders').update({ status: 'failed' }).eq('id', c.orderId).eq('user_id', c.userId).eq('status', 'rendering').is('render_id', null)
      await writeServerEvent({ name: 'ads_render_failed', userId: c.userId, path: '/api/ads/render', metadata: { order_id: c.orderId, reason: `exception: ${e instanceof Error ? e.message : String(e)}`.slice(0, 300) } })
    }
    return fail('render_failed', 500)
  }
}

export async function GET(req: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return fail('unauthenticated', 401)
    const orderId = req.nextUrl.searchParams.get('order_id') ?? ''
    if (!UUID.test(orderId)) return fail('order_id_invalid', 400)
    const { admin } = await loadAdsAccess(user.id, user.email)
    const read = async () =>
      admin.from('ads_orders').select('id, status, seconds, render_id, video_id, brief, template').eq('id', orderId).eq('user_id', user.id).maybeSingle()
    let o = await read()
    if (o.error) return isMissingAdsTable(o.error.code) ? fail('not_ready', 503) : fail('render_failed', 500)
    if (!o.data) return fail('order_not_found', 404)
    let order = o.data as { id: string; status: AdsRenderState['status']; seconds: 35 | 60 | null; render_id: string | null; video_id: string | null; brief: Record<string, unknown> | null; template: string | null }
    const model = adsModelById(order.template)
    const topic = order.brief && typeof order.brief.business === 'string' && model ? `${order.brief.business} · ${model.name}`.slice(0, 200) : null
    let failure: string | null = null

    const findVideo = async (renderId: string) => {
      const v = await admin.from('videos').select('id, video_url').eq('user_id', user.id).eq('render_id', renderId).maybeSingle()
      return (v.data as { id: string; video_url: string | null } | null) ?? null
    }
    if (order.status === 'rendering' && order.render_id) {
      let video = await findVideo(order.render_id)
      if (!video) {
        // Pergunta ao status do compose, em processo: ele liquida o crédito e grava a linha do vídeo quando pronto.
        const q = new URLSearchParams({ quality: 'fast', duration: String(order.seconds ?? 35), resume: '1', ...(topic ? { topic } : {}) })
        const sres = await composeStatusGet(
          new NextRequest(`${APP_URL}/api/compose/status/${encodeURIComponent(order.render_id)}?${q.toString()}`, { method: 'GET', headers: serviceHeaders(user.id) }),
          { params: { renderId: order.render_id } },
        )
        const sj = (await sres.json().catch(() => ({}))) as Record<string, unknown>
        if (sj.phase === 'done') video = await findVideo(order.render_id)
        else if (sj.phase === 'failed') {
          failure = typeof sj.error === 'string' ? sj.error : typeof sj.failure_reason === 'string' ? sj.failure_reason : 'render_failed'
          const f = await admin.from('ads_orders').update({ status: 'failed' }).eq('id', orderId).eq('user_id', user.id).eq('status', 'rendering').select('id').maybeSingle()
          if (f.data) await writeServerEvent({ name: 'ads_render_failed', userId: user.id, path: '/api/ads/render', metadata: { order_id: orderId, render_id: order.render_id, reason: String(failure).slice(0, 300) } })
        }
      }
      if (video) {
        const d = await admin
          .from('ads_orders')
          .update({ status: 'delivered', video_id: video.id, delivered_at: new Date().toISOString() })
          .eq('id', orderId)
          .eq('user_id', user.id)
          .eq('status', 'rendering')
          .select('id')
          .maybeSingle()
        if (d.data) {
          await writeServerEvent({ name: 'ads_render_served', userId: user.id, path: '/api/ads/render', metadata: { order_id: orderId, render_id: order.render_id, video_id: video.id } })
          await writeServerEvent({ name: 'ads_delivered', userId: user.id, path: '/api/ads/render', metadata: { order_id: orderId, video_id: video.id } })
        }
      }
      o = await read()
      if (o.data) order = o.data as typeof order
    }
    let finalUrl: string | null = null
    if (order.video_id) {
      const v = await admin.from('videos').select('video_url').eq('id', order.video_id).eq('user_id', user.id).maybeSingle()
      finalUrl = ((v.data as { video_url?: string | null } | null)?.video_url) ?? null
    }
    const state: AdsRenderState = { order_id: order.id, status: order.status, render_id: order.render_id, seconds: order.seconds, video_id: order.video_id, final_video_url: finalUrl, failure, topic }
    return NextResponse.json(state, { headers: { 'Cache-Control': 'no-store' } })
  } catch (e) {
    console.warn('[ads/render GET] falhou:', e instanceof Error ? e.message : String(e))
    return fail('render_failed', 500)
  }
}
