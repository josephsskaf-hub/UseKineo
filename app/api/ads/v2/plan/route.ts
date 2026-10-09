// KINEO-ADS-V2-2026-09-28 — plano do anúncio v2 (especificação, seção 5, passo 2). SEM COBRAR e sem chamar a fal.
//
// Recebe setor, logo, 3 a 7 fotos JÁ recortadas em 9:16 no navegador (cada uma com o tipo marcado) e, se quiser, o
// cartão final. Extrai o brief da frase (ou do link) com gpt-4o-mini (lib/ads/v2Brief.ts), monta a lista de planos
// pelo molde do setor (lib/ads/v2ShotLists.ts planShots, determinístico), passa os validadores anti-invenção pela
// narração, pelas frases de tela E por cada prompt de movimento/cena, e devolve o custo em créditos e em US$
// estimado. O pedido vira 'planned'. Teto diário de planos por pessoa (evento ads_v2_plan_served) ANTES do modelo.
import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { writeServerEvent } from '@/lib/serverEvents'
import { moderateContent } from '@/lib/safety/contentModeration'
import { moderationRefusalMessage, moderationRefusalStatus } from '@/lib/safety/moderationPolicy'
import { LANGUAGE_NAMES, narrationLanguage, resolveNarrationLanguage } from '@/lib/textLanguage'
import { adsGate, isMissingAdsTable, loadAdsAccess } from '@/lib/ads/serverAccess'
import { adsV2Visible } from '@/lib/ads/v2Access'
import { sanitizeAssetsBody, sanitizePlanBody } from '@/lib/ads/v2Contract'
import { adsV2Credits, estimateAdUsd } from '@/lib/ads/v2Tiers'
import { ADS_V2_PLAN_VIDEO_MAX_SECONDS, ADS_V2_PLAN_VIDEO_MIN_SECONDS, adsV2NarrationMaxWords, planShots, type AdsV2Video } from '@/lib/ads/v2ShotLists'
import { ADS_V2_PLAN_DAILY_CAP, checkV2Prompts, extractAdsV2Brief } from '@/lib/ads/v2Brief'
import { adsV2LinkText } from '@/lib/ads/v2Link'
import { researchState, storedResearchFacts } from '@/lib/ads/v2Research'
// KINEO-ESTILOS-PRODUTO-2026-10-09 — interruptor único dos estilos de produto (false = o campo `style` é ignorado aqui).
import { ADS_V2_STYLES_PUBLIC } from '@/lib/ads/v2Styles'
import { loadAdsV2Order, type AdsV2StoredPlan } from '@/lib/ads/v2Advance'
import { measureFootageVideo, ownedFootage, v2Fail, v2Json } from '@/lib/ads/v2Server'
// KINEO-ADS-AMOSTRA-2026-10-09 — a amostra grátis abre o plano (sem custo de fal) para a conta free/trial que ainda não usou a dela.
import { adsSampleLevelOk, adsSampleOpen } from '@/lib/ads/serverAccess'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'
export const maxDuration = 60

export async function POST(req: NextRequest) {
  const started = Date.now()
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return v2Fail('unauthenticated', 401)
    if (!process.env.OPENAI_API_KEY) return v2Fail('unavailable', 503)
    const { admin, reason } = await loadAdsAccess(user.id, user.email)
    const gate = adsGate(reason)
    const sample = gate === 'no_access' && await adsSampleOpen(admin, user.id, reason) // KINEO-ADS-AMOSTRA-2026-10-09
    if (gate !== 'ok' && !sample) {
      await writeServerEvent({ name: 'ads_access_denied', userId: user.id, path: '/api/ads/v2/plan', metadata: { reason: gate } })
      return v2Fail(gate === 'closed' ? 'closed' : 'no_access', 403)
    }
    if (!adsV2Visible(user.email)) return v2Fail('v2_closed', 403)

    const body = await req.json().catch(() => null)
    const parsed = sanitizePlanBody(body)
    if (!parsed.ok) return v2Fail(parsed.error, 400)
    const assets = sanitizeAssetsBody(body)
    if (!assets.ok) return v2Fail(assets.error, 400)
    const input = parsed.value
    const cardId = assets.value.card_footage_id

    const { order, error } = await loadAdsV2Order(admin, input.order_id, user.id)
    if (error) return isMissingAdsTable(error.code) ? v2Fail('not_ready', 503) : v2Fail('plan_failed', 502)
    if (!order) return v2Fail('order_not_found', 404)
    if (order.status !== 'draft' && order.status !== 'planned') return v2Fail('not_editable', 409)
    // KINEO-ADS-AMOSTRA-2026-10-09 — pela amostra, só o pedido no nível e na duração da amostra é planejado.
    if (gate !== 'ok' && sample && !adsSampleLevelOk(order.tier, order.seconds)) return v2Fail('sample_level_only', 403)
    // KINEO-ADS-MODO-SIMPLES-2026-09-29 — corpo simples só para pedido nascido no modo simples; enquanto a pesquisa roda,
    // não há plano (nem cobrança): 409 research_running (pesquisa parada há > 90 s conta como falha e libera).
    const brief0 = order.brief ?? {}
    const simple = input.mode === 'simple'
    if (simple && brief0.mode !== 'simple') return v2Fail('mode_mismatch', 400)
    if (researchState(brief0.research, Date.now()) === 'running') return v2Fail('research_running', 409)
    // Fatos escolhidos: resolvidos pelos ids contra o que o SERVIDOR gravou. Texto de fato vindo do cliente não existe.
    const known = simple ? storedResearchFacts(brief0.research) : []
    const chosenFacts = (input.facts ?? []).map((id) => known.find((f) => f.id === id))
    if (chosenFacts.some((f) => !f)) return v2Fail('bad_fact', 400)
    const factTexts = chosenFacts.map((f) => f!.text)

    // Cada arquivo conferido no user_footage DO DONO; a URL usada é a do banco. Logo só se veio (modo simples: opcional).
    const videosIn = input.videos ?? []
    const own = await ownedFootage(admin, user.id, [...(input.logo_footage_id ? [input.logo_footage_id] : []), ...(cardId ? [cardId] : []), ...input.photos.map((p) => p.footage_id), ...videosIn.map((v) => v.footage_id)])
    if (!own) return v2Fail('plan_failed', 502)
    if (input.logo_footage_id && !own.get(input.logo_footage_id)?.isImage) return v2Fail('logo_invalid', 400)
    if (cardId && !own.get(cardId)?.isPng) return v2Fail('card_invalid', 400)
    const photos = input.photos.map((p) => ({ footage_id: p.footage_id, kind: p.kind, url: own.get(p.footage_id)?.isImage ? own.get(p.footage_id)!.url : '' }))
    if (photos.some((p) => !p.url)) return v2Fail('media_not_owned', 400)
    // KINEO-ADS-VIDEO-DO-CLIENTE-2026-09-29 — cada vídeo: do DONO, MP4/MOV (kind 'video' no user_footage).
    const badVideo = videosIn.find((v) => !own.get(v.footage_id)?.isVideo)
    if (badVideo) return v2Fail('video_invalid', 400, { footage_id: badVideo.footage_id })

    // Teto diário ANTES do modelo.
    const since = new Date(Date.now() - 24 * 3600_000).toISOString()
    const cap = await admin.from('events').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('name', 'ads_v2_plan_served').gte('created_at', since)
    if (!cap.error && (cap.count ?? 0) >= ADS_V2_PLAN_DAILY_CAP) return v2Fail('daily_limit', 429)

    // A duração que manda é a MEDIDA aqui (mvhd do arquivo no bucket), nunca a do navegador. Não mediu ou curto demais =
    // 422 com o id: a tela transforma ESSE vídeo em fotos (plano B) e a pessoa planeja de novo, grátis.
    // Revisão: a recusa da medição também CONTA no teto diário (cada medição baixa até 50 MB); antes só o plano servido
    // contava e um vídeo ilegível podia ser medido sem fim. Longo demais (> 10 min) = numeric(6,3) do banco estouraria.
    const videos: AdsV2Video[] = []
    const measureRefused = async (code: 'video_unreadable' | 'video_too_short' | 'video_too_long', footageId: string, seconds: number | null) => {
      await writeServerEvent({ name: 'ads_v2_plan_served', userId: user.id, path: '/api/ads/v2/plan', metadata: { order_id: order.id, ok: false, stage: 'video_measure', why: code, seconds_measured: seconds, videos: videosIn.length, ms: Date.now() - started } })
      return v2Fail(code, 422, { footage_id: footageId })
    }
    for (const [i, measured] of (await Promise.all(videosIn.map((v) => measureFootageVideo(own.get(v.footage_id)!.url)))).entries()) {
      const v = videosIn[i]
      if (measured === null) return measureRefused('video_unreadable', v.footage_id, null)
      if (measured < ADS_V2_PLAN_VIDEO_MIN_SECONDS) return measureRefused('video_too_short', v.footage_id, measured)
      if (measured > ADS_V2_PLAN_VIDEO_MAX_SECONDS) return measureRefused('video_too_long', v.footage_id, measured)
      videos.push({ id: v.footage_id, url: own.get(v.footage_id)!.url, seconds: measured, start: v.start, focusX: v.focus_x, focusY: v.focus_y, width: v.width, height: v.height })
    }

    // O texto do negócio: a frase, ou o que o link diz (só a página; as fotos vêm recortadas do navegador).
    // Modo simples: a frase + o preço e o contato que a PESSOA escreveu nos campos próprios.
    let text = typeof brief0.sentence === 'string' ? brief0.sentence.trim() : ''
    if (simple && text) {
      const price = typeof brief0.price === 'string' ? brief0.price.trim() : ''
      const contact = typeof brief0.contact === 'string' ? brief0.contact.trim() : ''
      text = [text, price ? `Price: ${price}` : '', contact ? `Contact: ${contact}` : ''].filter(Boolean).join('\n')
    }
    let pageLang: string | null = null
    if (!text && typeof brief0.link === 'string' && brief0.link) {
      const read = await adsV2LinkText(brief0.link)
      if (!read) return v2Fail('link_unreachable', 422)
      text = read.text
      pageLang = read.lang
    }
    if (!text) return v2Fail('sentence_or_link_required', 400)

    const safety = await moderateContent({ surface: 'ads_brief', stage: 'input', userId: user.id, text: [text, ...factTexts].join('\n'), meta: { order_id: order.id, v2: true } })
    if (!safety.ok) {
      return v2Fail(safety.reason === 'blocked' ? 'moderation' : `moderation_${safety.reason}`, moderationRefusalStatus(safety.reason), { message: moderationRefusalMessage(safety.reason) })
    }

    const language = narrationLanguage(order.language) ?? narrationLanguage(pageLang) ?? resolveNarrationLanguage(undefined, text).language
    const maxWords = adsV2NarrationMaxWords(order.seconds)
    const overlaysOn = brief0.overlays !== false
    const extracted = await extractAdsV2Brief({
      text,
      language,
      languageName: LANGUAGE_NAMES[language],
      maxWords,
      narration: order.narration,
      // KINEO-ADS-SIMPLES-ACABAMENTO-2026-09-29 — a frase exata (sem preço/contato): dela saem os nomes que a narração cita.
      ...(simple ? { overlays: overlaysOn, facts: factTexts, sentence: typeof brief0.sentence === 'string' ? brief0.sentence.trim() : '' } : {}),
    })
    const modeTag = { mode: simple ? 'simple' : 'full', facts_selected: factTexts.length, overlays: overlaysOn }
    const served = async (ok: boolean, extra: Record<string, unknown>) =>
      writeServerEvent({ name: 'ads_v2_plan_served', userId: user.id, path: '/api/ads/v2/plan', metadata: { order_id: order.id, ok, tier: order.tier, seconds: order.seconds, sector: input.sector, language, ms: Date.now() - started, ...modeTag, ...extra } })
    if (!extracted.ok) {
      await served(false, { stage: extracted.stage, why: extracted.why.slice(0, 4), attempts: extracted.attempts })
      return extracted.stage === 'brief'
        ? v2Fail('brief_needs_business', 422, { hint: 'Write the business name in your sentence.' })
        : v2Fail('no_copy', 502, { why: extracted.why.slice(0, 4) })
    }

    // Modo simples: o setor veio do texto (palavras-chave na tela). Só quando deu 'other' o palpite do modelo entra;
    // o palpite nunca troca um setor que as palavras já decidiram.
    const sector = simple && input.sector === 'other' && extracted.copy.sectorHint ? extracted.copy.sectorHint : input.sector

    // Lista de planos (determinística) e a régua anti-invenção também sobre cada prompt de movimento/cena.
    // KINEO-ESTILOS-PRODUTO-2026-10-09 — estilo pedido (já validado pelo contrato): só o plano-herói do produto ganha o
    // efeito; sem foto de produto, planShots ignora e o plano sai como antes. O preço em créditos não muda.
    const styleAsked = ADS_V2_STYLES_PUBLIC ? input.style ?? null : null
    const plan = planShots({ sector, tier: order.tier, photos: photos.map((p) => ({ id: p.footage_id, url: p.url, kind: p.kind })), seconds: order.seconds, ...(videos.length ? { videos } : {}), ...(styleAsked ? { style: styleAsked } : {}) })
    const promptIssues = checkV2Prompts(plan.shots.flatMap((s) => [s.prompt, s.scenePrompt].filter((x): x is string => !!x)), extracted.brief)
    if (promptIssues.length) {
      await served(false, { stage: 'prompts', why: promptIssues.slice(0, 4) })
      return v2Fail('plan_prompts_invalid', 502, { why: promptIssues.slice(0, 4) })
    }
    // Frases desligadas no modo simples = nenhuma frase na tela (a montagem aceita [] — adV2Montage/v2Advance).
    const overlays = !overlaysOn
      ? []
      : plan.overlays
          .map((slot, i) => ({ role: slot.role, start: slot.start, end: slot.end, text: extracted.copy.overlays[i] ?? '' }))
          .filter((o) => o.text)
    const stored: AdsV2StoredPlan = { ...plan, overlays, narration: extracted.copy.narration }
    const credits = adsV2Credits(order.tier, order.seconds)
    const usd = estimateAdUsd({ tier: order.tier, shots: plan.shots.map((s) => ({ kind: s.kind, source: s.source, styled: !!s.effect })), seconds: plan.totalSeconds })

    const upd = await admin
      .from('ads_v2_orders')
      .update({
        status: 'planned',
        sector,
        language,
        brief: {
          ...brief0,
          extracted: extracted.brief,
          copy: extracted.copy,
          dropped: extracted.dropped,
          business: extracted.brief.business,
          ...(simple && brief0.research && typeof brief0.research === 'object' ? { research: { ...(brief0.research as Record<string, unknown>), selected: input.facts ?? [] } } : {}),
        },
        plan: stored,
        logo_footage_id: input.logo_footage_id ?? null,
        photos,
        ...(cardId ? { card_footage_id: cardId, card_url: own.get(cardId)!.url } : {}),
      })
      .eq('id', order.id)
      .eq('user_id', user.id)
      .in('status', ['draft', 'planned'])
      .select('id, card_url')
      .maybeSingle()
    if (upd.error || !upd.data) return v2Fail('not_editable', 409)
    await served(true, { sector, shots: plan.shots.length, text_shots: plan.shots.filter((s) => s.kind === 'text').length, video_shots: plan.shots.filter((s) => s.kind === 'user_video').length, scenes: plan.shots.filter((s) => s.source === 'generated_scene').length, credits, usd: usd.totalUsd, attempts: extracted.attempts, sector_hint: extracted.copy.sectorHint, style_asked: styleAsked, style: plan.style ?? null, ...(extracted.voice ? { names_required: extracted.voice.names.length, names_missing: extracted.voice.namesMissing.length, common_noun: extracted.voice.commonNoun !== null } : {}) })
    return v2Json({
      order_id: order.id,
      status: 'planned',
      sector,
      sector_hint: extracted.copy.sectorHint,
      language,
      credits,
      usd_estimate: usd,
      narration: extracted.copy.narration,
      overlays,
      total_seconds: plan.totalSeconds,
      card_ready: Boolean((upd.data as { card_url: string | null }).card_url),
      photo_requests: plan.photoRequests,
      // KINEO-ESTILOS-PRODUTO-2026-10-09 — o estilo pedido e o APLICADO (null = sem foto de produto, sai sem efeito).
      style_asked: styleAsked,
      style: plan.style ?? null,
      shots: plan.shots.map((s) => ({ idx: s.idx, role: s.role, beat: s.beat, kind: s.kind, source: s.source, cut_seconds: s.cutSeconds, photo: s.sourceFootageId, ...(s.effect ? { effect: s.effect } : {}) })),
    })
  } catch (e) {
    console.warn('[ads/v2/plan] falhou:', e instanceof Error ? e.message : String(e))
    return v2Fail('plan_failed', 502)
  }
}
