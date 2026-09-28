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
import { adsV2NarrationMaxWords, planShots } from '@/lib/ads/v2ShotLists'
import { ADS_V2_PLAN_DAILY_CAP, checkV2Prompts, extractAdsV2Brief } from '@/lib/ads/v2Brief'
import { adsV2LinkText } from '@/lib/ads/v2Link'
import { loadAdsV2Order, type AdsV2StoredPlan } from '@/lib/ads/v2Advance'
import { ownedFootage, v2Fail, v2Json } from '@/lib/ads/v2Server'

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
    if (gate !== 'ok') {
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

    // Cada arquivo conferido no user_footage DO DONO; a URL usada é a do banco.
    const own = await ownedFootage(admin, user.id, [input.logo_footage_id, ...(cardId ? [cardId] : []), ...input.photos.map((p) => p.footage_id)])
    if (!own) return v2Fail('plan_failed', 502)
    if (!own.get(input.logo_footage_id)?.isImage) return v2Fail('logo_invalid', 400)
    if (cardId && !own.get(cardId)?.isPng) return v2Fail('card_invalid', 400)
    const photos = input.photos.map((p) => ({ footage_id: p.footage_id, kind: p.kind, url: own.get(p.footage_id)?.isImage ? own.get(p.footage_id)!.url : '' }))
    if (photos.some((p) => !p.url)) return v2Fail('media_not_owned', 400)

    // Teto diário ANTES do modelo.
    const since = new Date(Date.now() - 24 * 3600_000).toISOString()
    const cap = await admin.from('events').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('name', 'ads_v2_plan_served').gte('created_at', since)
    if (!cap.error && (cap.count ?? 0) >= ADS_V2_PLAN_DAILY_CAP) return v2Fail('daily_limit', 429)

    // O texto do negócio: a frase, ou o que o link diz (só a página; as fotos vêm recortadas do navegador).
    const brief0 = order.brief ?? {}
    let text = typeof brief0.sentence === 'string' ? brief0.sentence.trim() : ''
    let pageLang: string | null = null
    if (!text && typeof brief0.link === 'string' && brief0.link) {
      const read = await adsV2LinkText(brief0.link)
      if (!read) return v2Fail('link_unreachable', 422)
      text = read.text
      pageLang = read.lang
    }
    if (!text) return v2Fail('sentence_or_link_required', 400)

    const safety = await moderateContent({ surface: 'ads_brief', stage: 'input', userId: user.id, text, meta: { order_id: order.id, v2: true } })
    if (!safety.ok) {
      return v2Fail(safety.reason === 'blocked' ? 'moderation' : `moderation_${safety.reason}`, moderationRefusalStatus(safety.reason), { message: moderationRefusalMessage(safety.reason) })
    }

    const language = narrationLanguage(order.language) ?? narrationLanguage(pageLang) ?? resolveNarrationLanguage(undefined, text).language
    const maxWords = adsV2NarrationMaxWords(order.seconds)
    const extracted = await extractAdsV2Brief({ text, language, languageName: LANGUAGE_NAMES[language], maxWords, narration: order.narration })
    const served = async (ok: boolean, extra: Record<string, unknown>) =>
      writeServerEvent({ name: 'ads_v2_plan_served', userId: user.id, path: '/api/ads/v2/plan', metadata: { order_id: order.id, ok, tier: order.tier, seconds: order.seconds, sector: input.sector, language, ms: Date.now() - started, ...extra } })
    if (!extracted.ok) {
      await served(false, { stage: extracted.stage, why: extracted.why.slice(0, 4), attempts: extracted.attempts })
      return extracted.stage === 'brief'
        ? v2Fail('brief_needs_business', 422, { hint: 'Write the business name in your sentence.' })
        : v2Fail('no_copy', 502, { why: extracted.why.slice(0, 4) })
    }

    // Lista de planos (determinística) e a régua anti-invenção também sobre cada prompt de movimento/cena.
    const plan = planShots({ sector: input.sector, tier: order.tier, photos: photos.map((p) => ({ id: p.footage_id, url: p.url, kind: p.kind })), seconds: order.seconds })
    const promptIssues = checkV2Prompts(plan.shots.flatMap((s) => [s.prompt, s.scenePrompt].filter((x): x is string => !!x)), extracted.brief)
    if (promptIssues.length) {
      await served(false, { stage: 'prompts', why: promptIssues.slice(0, 4) })
      return v2Fail('plan_prompts_invalid', 502, { why: promptIssues.slice(0, 4) })
    }
    const overlays = plan.overlays
      .map((slot, i) => ({ role: slot.role, start: slot.start, end: slot.end, text: extracted.copy.overlays[i] ?? '' }))
      .filter((o) => o.text)
    const stored: AdsV2StoredPlan = { ...plan, overlays, narration: extracted.copy.narration }
    const credits = adsV2Credits(order.tier, order.seconds)
    const usd = estimateAdUsd({ tier: order.tier, shots: plan.shots.map((s) => ({ kind: s.kind, source: s.source })), seconds: plan.totalSeconds })

    const upd = await admin
      .from('ads_v2_orders')
      .update({
        status: 'planned',
        sector: input.sector,
        language,
        brief: { ...brief0, extracted: extracted.brief, copy: extracted.copy, dropped: extracted.dropped, business: extracted.brief.business },
        plan: stored,
        logo_footage_id: input.logo_footage_id,
        photos,
        ...(cardId ? { card_footage_id: cardId, card_url: own.get(cardId)!.url } : {}),
      })
      .eq('id', order.id)
      .eq('user_id', user.id)
      .in('status', ['draft', 'planned'])
      .select('id, card_url')
      .maybeSingle()
    if (upd.error || !upd.data) return v2Fail('not_editable', 409)
    await served(true, { shots: plan.shots.length, text_shots: plan.shots.filter((s) => s.kind === 'text').length, scenes: plan.shots.filter((s) => s.source === 'generated_scene').length, credits, usd: usd.totalUsd, attempts: extracted.attempts, sector_hint: extracted.copy.sectorHint })
    return v2Json({
      order_id: order.id,
      status: 'planned',
      sector: input.sector,
      sector_hint: extracted.copy.sectorHint,
      language,
      credits,
      usd_estimate: usd,
      narration: extracted.copy.narration,
      overlays,
      total_seconds: plan.totalSeconds,
      card_ready: Boolean((upd.data as { card_url: string | null }).card_url),
      photo_requests: plan.photoRequests,
      shots: plan.shots.map((s) => ({ idx: s.idx, role: s.role, beat: s.beat, kind: s.kind, source: s.source, cut_seconds: s.cutSeconds, photo: s.sourceFootageId })),
    })
  } catch (e) {
    console.warn('[ads/v2/plan] falhou:', e instanceof Error ? e.message : String(e))
    return v2Fail('plan_failed', 502)
  }
}
