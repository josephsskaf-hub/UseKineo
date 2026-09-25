// KINEO-STUDIO-ADS-2026-09-25 — roteiro do anúncio (passo 4 do /ads/new): 3 versões (pergunta / número / resultado)
// escritas a partir das batidas do modelo escolhido e do brief do pedido. Nunca gera vídeo, nunca cobra crédito.
// Garantias: login antes da chave de serviço; acesso ao Studio Ads antes do modelo; pedido do próprio dono, em rascunho,
// com brief e modelo; teto de ADS_SCRIPT_DAILY_CAP por pessoa em 24 h contado ANTES do modelo; a saída passa pelo
// validador puro (lib/ads/scriptPrompt.ts: nenhum número fora do brief, contato exato na última batida, faixa de
// palavras do modelo) e a versão que falha é descartada. A pessoa escolhe e grava pelo PATCH de /api/ads/orders.
// Custo: gpt-4o-mini, ~US$ 0,002 por chamada.
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { openai } from '@/lib/openai'
import { writeServerEvent } from '@/lib/serverEvents'
import { moderateContent } from '@/lib/safety/contentModeration' // KINEO-MODERACAO-2026-09-25
import { moderationRefusalMessage, moderationRefusalStatus } from '@/lib/safety/moderationPolicy'
import { LANGUAGE_NAMES, narrationLanguage } from '@/lib/textLanguage'
import { adsGate, loadAdsAccess, isMissingAdsTable } from '@/lib/ads/serverAccess'
import { adsModelById } from '@/lib/ads/models'
import { sanitizeBrief } from '@/lib/ads/orderContract'
import { diagnoseAdsScriptOutput, ADS_SCRIPT_DAILY_CAP, ADS_SCRIPT_SERVED_EVENT, buildAdsScriptMessages, parseAdsScriptOutput } from '@/lib/ads/scriptPrompt'

// 24/09 noite: 2 chamadas ao modelo (a 2a com o motivo da recusa) cabem em 60 s, cada uma com 22 s de teto.
export const maxDuration = 60
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
    const gate = adsGate(reason)
    if (gate !== 'ok') {
      await writeServerEvent({ name: 'ads_access_denied', userId: user.id, path: '/api/ads/script', metadata: { reason: gate } })
      return gate === 'closed'
        ? NextResponse.json({ error: 'Studio Ads opens soon.', reason: 'closed' }, { status: 403 })
        : NextResponse.json({ error: 'Studio Ads needs the Studio Ads pass or a paid plan.', reason: 'no_access' }, { status: 403 })
    }

    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null
    const orderId = typeof body?.order_id === 'string' && /^[0-9a-f-]{36}$/i.test(body.order_id) ? body.order_id : null
    if (!orderId) return NextResponse.json({ error: 'order_id_invalid' }, { status: 400 })

    const { data: order, error } = await admin.from('ads_orders').select('id, status, template, brief').eq('id', orderId).eq('user_id', user.id).maybeSingle()
    if (error) {
      if (isMissingAdsTable(error.code)) return NextResponse.json({ error: 'Studio Ads is not ready yet.', ready: false }, { status: 503 })
      return NextResponse.json({ error: 'Could not load the order.' }, { status: 500 })
    }
    if (!order) return NextResponse.json({ error: 'Order not found.' }, { status: 404 })
    if (order.status !== 'draft') return NextResponse.json({ error: 'This order can no longer be edited.' }, { status: 409 })
    const model = adsModelById(order.template)
    if (!model) return NextResponse.json({ error: 'template_required' }, { status: 400 })
    const brief = sanitizeBrief(order.brief)
    if (!brief.ok) return NextResponse.json({ error: 'brief_required' }, { status: 400 })

    const since = new Date(Date.now() - 24 * 3600_000).toISOString()
    const { count, error: capError } = await admin.from('events').select('id', { count: 'exact', head: true })
      .eq('user_id', user.id).eq('name', ADS_SCRIPT_SERVED_EVENT).gte('created_at', since)
    if (!capError && (count ?? 0) >= ADS_SCRIPT_DAILY_CAP) return NextResponse.json({ error: 'daily_limit' }, { status: 429 })

    // KINEO-MODERACAO-2026-09-25 — o brief é texto livre da empresa: passa pela régua antes de virar roteiro e voz.
    const b = brief.value
    const briefText = [b.business, b.offer, b.contact, b.audience, ...Object.values(b.extra ?? {})].filter((v): v is string => typeof v === 'string' && v.trim().length > 0).join('\n')
    const safety = await moderateContent({ surface: 'ads_brief', stage: 'input', userId: user.id, text: briefText, meta: { order_id: orderId } })
    if (!safety.ok) {
      return NextResponse.json({ error: moderationRefusalMessage(safety.reason), code: safety.reason === 'blocked' ? 'moderation' : `moderation_${safety.reason}` }, { status: moderationRefusalStatus(safety.reason) })
    }

    const lang = narrationLanguage(brief.value.language) ?? 'en'
    const { system, user: userMsg } = buildAdsScriptMessages(model, brief.value, LANGUAGE_NAMES[lang])
    const completion = await openai.chat.completions.create(
      {
        model: 'gpt-4o-mini',
        messages: [{ role: 'system', content: system }, { role: 'user', content: userMsg }],
        temperature: 0.7,
        max_tokens: 2200,
        response_format: { type: 'json_object' },
      },
      { timeout: 22000, maxRetries: 0 },
    )
    let raw = completion.choices[0]?.message?.content ?? ''
    let versions = parseAdsScriptOutput(raw, model, brief.value)
    // KINEO-STUDIO-ADS-SELF-SERVE-2026-09-24 — segunda tentativa com o MOTIVO (teste da padaria: 0 de 6 versões
    // passavam na primeira). Mesma chamada, mesmo validador; conta como um pedido no teto diário.
    let attempts = 1
    // Até 2 correções (3 chamadas no total, ~25 s): o tamanho varia de uma chamada para outra (teste da padaria), e cada
    // correção leva o motivo da recusa anterior. Para no primeiro que passar ou a 45 s do início (teto da função: 60 s).
    for (let repair = 0; !versions && repair < 2 && Date.now() - started < 45_000; repair++) {
      const fix = diagnoseAdsScriptOutput(raw, model, brief.value)
      const retry = await openai.chat.completions.create(
        {
          // a 2a tentativa usa o gpt-4o: segue tamanho e contagem de batidas bem melhor que o mini (teste da padaria)
          model: 'gpt-4o',
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: userMsg },
            { role: 'assistant', content: raw.slice(0, 6000) || '{}' },
            { role: 'user', content: `None of these versions can be used. Fix all of this and rewrite the three versions:\n- ${fix.join('\n- ')}\nKeep every other rule. Answer with the JSON only.` },
          ],
          temperature: 0.5,
          max_tokens: 2600,
          response_format: { type: 'json_object' },
        },
        { timeout: 22000, maxRetries: 0 },
      )
      raw = retry.choices[0]?.message?.content ?? ''
      versions = parseAdsScriptOutput(raw, model, brief.value)
      attempts += 1
    }

    await writeServerEvent({
      name: ADS_SCRIPT_SERVED_EVENT,
      userId: user.id,
      path: '/api/ads/script',
      metadata: {
        order_id: order.id, template: model.id, seconds: model.seconds, language: lang,
        angles: versions?.length ?? 0, words: versions?.map((v) => v.words) ?? [], ok: Boolean(versions), ms: Date.now() - started, attempts,
        why: versions ? [] : diagnoseAdsScriptOutput(raw, model, brief.value).slice(0, 4),
      },
    })
    if (!versions) return NextResponse.json({ error: 'no_script', hint: 'Add the missing facts to your brief and try again.' }, { status: 502 })
    return NextResponse.json({ versions })
  } catch (e) {
    console.warn('[ads/script] falhou:', e instanceof Error ? e.message : String(e))
    return NextResponse.json({ error: 'failed' }, { status: 502 })
  }
}
