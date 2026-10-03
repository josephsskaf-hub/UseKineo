// KINEO-PRODUCAO-ADS-2026-10-01 — /api/ads/producao/plan: a ideia vira de 3 a 5 planos (título + prompt de imagem em inglês +
// prompt de movimento + clipe ou fala para a câmera). GRÁTIS para a pessoa (gpt-4o-mini, ~US$0,001), com teto diário.
// POST { idea, template, character_kind, character_description?, language, product_photo? } → { shots, source }
// Ordem: porta (login → interruptor → acesso ao Ads) → forma → moderação do pedido → teto diário → planejador (falhou =
// plano de reserva do modelo, marcado source:'fallback'; nunca um plano vazio) → evento. Nada é cobrado aqui: a primeira
// cobrança é a imagem de cada plano, no /api/images/generate, com o preço na tela antes do clique.
import { NextRequest, NextResponse } from 'next/server'
import { writeServerEvent } from '@/lib/serverEvents'
import { moderateContent } from '@/lib/safety/contentModeration'
import { moderationRefusalMessage, moderationRefusalStatus } from '@/lib/safety/moderationPolicy'
import { PRODUCAO_NO_STORE, producaoFail, producaoGate } from '@/lib/ads/producaoServer'
import {
  PRODUCAO_IDEA_MAX,
  PRODUCAO_IDEA_MIN,
  PRODUCAO_PLAN_DAILY_CAP,
  PRODUCAO_PLAN_EVENT,
  PRODUCAO_PLAN_MODEL,
  PRODUCAO_VERSION,
  buildPlanMessages,
  cleanLine,
  fallbackPlan,
  isProducaoCharacterKind,
  parsePlan,
  producaoLanguage,
  producaoTemplate,
} from '@/lib/ads/producao'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'
export const maxDuration = 45

export async function POST(req: NextRequest) {
  try {
    const g = await producaoGate()
    if (!g.ok) return g.res
    const { user, admin } = g

    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null
    const idea = cleanLine(body?.idea, PRODUCAO_IDEA_MAX)
    if (idea.length < PRODUCAO_IDEA_MIN) return producaoFail('idea_required', 400)
    const template = producaoTemplate(body?.template)
    const rawKind = body?.character_kind
    const kind = isProducaoCharacterKind(rawKind) ? rawKind : template.characterKind
    const characterDescription = cleanLine(body?.character_description, 300)
    const language = producaoLanguage(body?.language)
    const productPhoto = body?.product_photo === true

    const safety = await moderateContent({ surface: 'ads_brief', stage: 'input', userId: user.id, text: [idea, characterDescription].filter(Boolean).join('\n'), meta: { mode: 'producao_plan' } })
    if (!safety.ok) {
      return NextResponse.json({ error: moderationRefusalMessage(safety.reason), code: safety.reason === 'blocked' ? 'moderation' : `moderation_${safety.reason}` }, { status: moderationRefusalStatus(safety.reason), headers: PRODUCAO_NO_STORE })
    }

    // Teto diário por conta (leitura falhou = não planeja; falha fechada, nada cobrado).
    const since = new Date(Date.now() - 24 * 3_600_000).toISOString()
    const cap = await admin.from('events').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('name', PRODUCAO_PLAN_EVENT).gte('created_at', since)
    if (cap.error) return producaoFail('plan_unavailable', 503)
    if ((cap.count ?? 0) >= PRODUCAO_PLAN_DAILY_CAP) return producaoFail('daily_limit', 429)

    const started = Date.now()
    let shots = null as ReturnType<typeof parsePlan>
    let why: string | null = null
    try {
      const { openai } = await import('@/lib/openai')
      const msgs = buildPlanMessages({ idea, template: template.key, kind, characterDescription, language, productPhoto })
      const completion = await openai.chat.completions.create(
        {
          model: PRODUCAO_PLAN_MODEL,
          messages: [{ role: 'system', content: msgs.system }, { role: 'user', content: msgs.user }],
          temperature: 0.6,
          max_tokens: 1400,
          response_format: { type: 'json_object' },
        },
        { timeout: 25_000, maxRetries: 0 },
      )
      shots = parsePlan(completion.choices[0]?.message?.content ?? '')
      if (!shots) why = 'unparseable'
    } catch (e) {
      why = e instanceof Error ? e.message.slice(0, 120) : 'planner_failed'
    }
    const source = shots ? 'ai' : 'fallback'
    const finalShots = shots ?? fallbackPlan(template.key, idea)

    await writeServerEvent({
      name: PRODUCAO_PLAN_EVENT,
      userId: user.id,
      path: '/api/ads/producao/plan',
      metadata: { version: PRODUCAO_VERSION, template: template.key, kind, language, source, shots: finalShots.length, talk: finalShots.filter((s) => s.mode === 'talk').length, product_photo: productPhoto, ms: Date.now() - started, why },
    })
    return NextResponse.json({ shots: finalShots, source, template: template.key, kind, language }, { headers: PRODUCAO_NO_STORE })
  } catch (e) {
    console.warn('[ads/producao/plan] falhou:', e instanceof Error ? e.message : String(e))
    return producaoFail('plan_failed', 502)
  }
}
