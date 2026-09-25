// KINEO-ADS-IA-FAZ-2026-09-26 — modo "a IA faz o anúncio": UMA frase livre da empresa + a mídia já subida no pedido →
// brief estruturado + modelo escolhido. Não grava o pedido (quem grava é o PATCH de /api/ads/orders, depois que a pessoa
// confirma contato e oferta na tela), nunca gera vídeo, nunca cobra crédito.
// Garantias (as mesmas de /api/ads/script): login antes da chave de serviço; acesso ao Studio Ads antes do modelo; pedido
// do próprio dono, em rascunho; teto diário por pessoa contado ANTES do modelo; texto pela régua de moderação; a saída
// passa pelo validador puro (lib/ads/autoBrief.ts: número e contato só se estiverem no texto; modelo só se a mídia libera).
// Custo: gpt-4o-mini, ~US$ 0,001 por chamada.
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { openai } from '@/lib/openai'
import { writeServerEvent } from '@/lib/serverEvents'
import { moderateContent } from '@/lib/safety/contentModeration'
import { moderationRefusalMessage, moderationRefusalStatus } from '@/lib/safety/moderationPolicy'
import { LANGUAGE_NAMES, narrationLanguage, resolveNarrationLanguage } from '@/lib/textLanguage'
import { adsGate, loadAdsAccess, isMissingAdsTable } from '@/lib/ads/serverAccess'
import {
  ADS_AUTO_DAILY_CAP, ADS_AUTO_SERVED_EVENT, ADS_AUTO_TEXT_MAX_CHARS, ADS_AUTO_TEXT_MIN_CHARS, ADS_AUTO_VERSION,
  adsAutoVisible, buildAutoBriefMessages, chooseAutoModel, countAdsMedia, parseAutoBrief,
} from '@/lib/ads/autoBrief'

export const maxDuration = 30
export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

export async function POST(req: NextRequest) {
  const started = Date.now()
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'sign_in_required' }, { status: 401 })
    if (!process.env.OPENAI_API_KEY) return NextResponse.json({ error: 'unavailable' }, { status: 503 })

    const { admin, reason } = await loadAdsAccess(user.id, user.email)
    // Interruptor do modo: fora do ar = 404; só-internas = quem não é conta interna não vê a rota.
    if (!adsAutoVisible(reason)) return NextResponse.json({ error: 'not_found' }, { status: 404 })
    const gate = adsGate(reason)
    if (gate !== 'ok') {
      await writeServerEvent({ name: 'ads_access_denied', userId: user.id, path: '/api/ads/auto-brief', metadata: { reason: gate } })
      return gate === 'closed'
        ? NextResponse.json({ error: 'Studio Ads opens soon.', reason: 'closed' }, { status: 403 })
        : NextResponse.json({ error: 'Studio Ads needs the Studio Ads pass or a paid plan.', reason: 'no_access' }, { status: 403 })
    }

    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null
    const orderId = typeof body?.order_id === 'string' && /^[0-9a-f-]{36}$/i.test(body.order_id) ? body.order_id : null
    if (!orderId) return NextResponse.json({ error: 'order_id_invalid' }, { status: 400 })
    const text = typeof body?.text === 'string' ? body.text.replace(/\s+/g, ' ').trim() : ''
    if (text.length < ADS_AUTO_TEXT_MIN_CHARS) return NextResponse.json({ error: 'text_too_short' }, { status: 400 })
    if (text.length > ADS_AUTO_TEXT_MAX_CHARS) return NextResponse.json({ error: 'text_too_long', max: ADS_AUTO_TEXT_MAX_CHARS }, { status: 400 })

    const { data: order, error } = await admin.from('ads_orders').select('id, status, media').eq('id', orderId).eq('user_id', user.id).maybeSingle()
    if (error) {
      if (isMissingAdsTable(error.code)) return NextResponse.json({ error: 'Studio Ads is not ready yet.', ready: false }, { status: 503 })
      return NextResponse.json({ error: 'Could not load the order.' }, { status: 500 })
    }
    if (!order) return NextResponse.json({ error: 'Order not found.' }, { status: 404 })
    if (order.status !== 'draft') return NextResponse.json({ error: 'This order can no longer be edited.' }, { status: 409 })
    const have = countAdsMedia(Array.isArray(order.media) ? (order.media as { kind: string; isLogo?: boolean }[]) : [])

    const since = new Date(Date.now() - 24 * 3600_000).toISOString()
    const { count, error: capError } = await admin.from('events').select('id', { count: 'exact', head: true })
      .eq('user_id', user.id).eq('name', ADS_AUTO_SERVED_EVENT).gte('created_at', since)
    if (!capError && (count ?? 0) >= ADS_AUTO_DAILY_CAP) return NextResponse.json({ error: 'daily_limit' }, { status: 429 })

    const safety = await moderateContent({ surface: 'ads_brief', stage: 'input', userId: user.id, text, meta: { order_id: orderId, mode: 'auto' } })
    if (!safety.ok) {
      return NextResponse.json({ error: moderationRefusalMessage(safety.reason), code: safety.reason === 'blocked' ? 'moderation' : `moderation_${safety.reason}` }, { status: moderationRefusalStatus(safety.reason) })
    }

    // KINEO-ADS-TESTE1-2026-09-26 — o idioma do navegador (pt-BR do fundador) virava a narração de um site em inglês. Ordem
    // agora: o idioma declarado pela página do link > o idioma do texto > o do navegador > inglês.
    const fromLink = narrationLanguage(body?.language)
    const detected = resolveNarrationLanguage('en', text).detected
    const lang = fromLink ?? narrationLanguage(detected) ?? narrationLanguage(body?.language_hint) ?? 'en'
    const { system, user: userMsg } = buildAutoBriefMessages(text, LANGUAGE_NAMES[lang])
    const completion = await openai.chat.completions.create(
      {
        model: 'gpt-4o-mini',
        messages: [{ role: 'system', content: system }, { role: 'user', content: userMsg }],
        temperature: 0.2,
        max_tokens: 900,
        response_format: { type: 'json_object' },
      },
      { timeout: 20000, maxRetries: 0 },
    )
    const raw = completion.choices[0]?.message?.content ?? ''
    const parsed = parseAutoBrief(raw, text, lang)
    const choice = chooseAutoModel(parsed.brief, have, parsed.modelHint)

    await writeServerEvent({
      name: ADS_AUTO_SERVED_EVENT,
      userId: user.id,
      path: '/api/ads/auto-brief',
      metadata: {
        order_id: orderId, version: ADS_AUTO_VERSION, language: lang, chars: text.length, ms: Date.now() - started,
        template: choice.model?.id ?? null, hint: parsed.modelHint, eligible: choice.eligible.length,
        needs: parsed.needs, dropped: parsed.dropped, missing_media: choice.missing,
        photos: have.photos, videos: have.videos, logo: have.logo,
      },
    })

    return NextResponse.json({
      brief: parsed.brief,
      needs: parsed.needs,
      dropped: parsed.dropped,
      template: choice.model?.id ?? null,
      seconds: choice.model?.seconds ?? null,
      credits: choice.model?.credits ?? null,
      eligible: choice.eligible,
      missing_media: choice.missing,
    })
  } catch (e) {
    console.warn('[ads/auto-brief] falhou:', e instanceof Error ? e.message : String(e))
    return NextResponse.json({ error: 'failed' }, { status: 502 })
  }
}
