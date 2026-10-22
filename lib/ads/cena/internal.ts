// KINEO-ADS-CENA-2110 — porta interna do A/B, usando pedido/débito/estorno/entrega v2 já existentes.
// KINEO-ADS-CENA-AJUSTE-2110 — defaults explícitos e recusa de fala não suportada ANTES de qualquer cobrança.
import type { SupabaseClient } from '@supabase/supabase-js'
import { isAdsInternalEmail } from '../access'
import { cenaEnabled } from './catalog'
import { cenaInput, type CenaJson } from './plan'
import { cenaAssertVoiceRoute, cenaResolveRoute, isCenaRoute } from './adapters'
import { planCena95 } from './plan95'
import { newCena95State } from './pipeline95'
import { cena95ActorFromOrder } from './presenters95'
import { planShots } from '../v2ShotLists'
import { v2Fail, v2Json } from '../v2Server'
import { adsV2Credits } from '../v2Tiers'
import type { AdsV2Caller } from '../v2PlanCore'
import type { ModerationVerdict } from '@/lib/safety/contentModeration' // KINEO-ADS-CENA-95-PACING-2110
import { cena95ModerationFailure } from './moderation95' // KINEO-ADS-CENA-95-PACING-2110
import { CENA95_LIVE } from './live' // KINEO-ADS-CENA-RETOMADA-2110
import { internalCenaAjusteFor } from './internalAjuste' // KINEO-ADS-CENA-RETOMADA-2110
export interface CenaInternalDeps {
  json: CenaJson;
  moderate(text: string): Promise<boolean | ModerationVerdict>; // KINEO-ADS-CENA-95-PACING-2110
  admin: SupabaseClient;
  start(orderId: string): Promise<Response>;
  recentActors?(userId: string): Promise<string[]>;
}
export async function internalCenaFor(user: AdsV2Caller, body: unknown, d: CenaInternalDeps): Promise<Response> {
  if (!cenaEnabled(isAdsInternalEmail(user.email))) return v2Fail('cena_internal_only', 403)
  if (!CENA95_LIVE) return internalCenaAjusteFor(user, body, d) // KINEO-ADS-CENA-RETOMADA-2110 — one selector; 95 below stays intact.
  try {
    const b = body as Record<string, unknown>
    if (!b || typeof b !== 'object' || (b.rota !== undefined && !isCenaRoute(b.rota))) return v2Fail('cena_bad_route', 400)
    if (b.dry_run !== undefined && typeof b.dry_run !== 'boolean') return v2Fail('cena_bad_dry_run', 400)
    const input = cenaInput(b)
    const voiceMode = input.voice_mode!
    const route = cenaResolveRoute(voiceMode, b.rota)
    cenaAssertVoiceRoute(route, voiceMode, input.language)
    const inputSafety = cena95ModerationFailure(await d.moderate([input.frase, input.oferta, input.cta, ...(input.beneficios ?? [])].filter(Boolean).join('\n'))) // KINEO-ADS-CENA-95-PACING-2110
    if (inputSafety) return v2Fail(inputSafety.error, inputSafety.status) // KINEO-ADS-CENA-95-PACING-2110
    const history = d.recentActors ? await d.recentActors(user.id) : await (async () => {
      const r = await d.admin.from('ads_v2_orders').select('id,plan,created_at').eq('user_id', user.id).order('created_at', { ascending: false }).order('id', { ascending: false }).limit(3)
      if (r.error || !Array.isArray(r.data)) throw new Error('cena95_history_unavailable')
      return r.data.map(row => cena95ActorFromOrder(row.plan) ?? '')
    })()
    const plan = await planCena95(input, route, d.json, { userId: user.id, recentActors: history })
    const scriptSafety = cena95ModerationFailure(await d.moderate(plan.script.narration)) // KINEO-ADS-CENA-95-PACING-2110 — same generated-text gate before dry/live diverge.
    if (scriptSafety) return v2Fail(scriptSafety.error, scriptSafety.status) // KINEO-ADS-CENA-95-PACING-2110
    const costs = plan.quality95.costs
    const response = { dry_run: b.dry_run === true, charged: false, rota: route, voice_mode: voiceMode, plan, costs, credits: adsV2Credits('commercial', 15), note: 'KINEO-ADS-CENA-95-2110: previsão completa com tarifas públicas e reservas declaradas; actualTotalUsd só após medição e confirmação de tarifas. Dry run planeja com visão; não gera mídia, não debita e não grava pedido.' }
    if (b.dry_run === true) return v2Json(response)
    // Nenhum preço novo: canário custa o mesmo nível Comercial. O start v2 confirma débito e garante uma geração ativa.
    const skeleton = planShots({ sector: 'store', tier: 'commercial', seconds: 15, photos: [{ id: '00000000-0000-4000-8000-000000000001', url: input.foto, kind: 'text' }] })
    const stored = { ...skeleton, overlays: [], narration: plan.script.narration, cena: newCena95State(plan, route) }
    const ins = await d.admin.from('ads_v2_orders').insert({ user_id: user.id, status: 'planned', tier: 'commercial', seconds: 15, sector: 'store', language: input.language, narration: true, card_url: input.foto, photos: [], brief: { sentence: input.frase, business: plan.product, offer: plan.input.oferta, kind: 'product', cena: true, voice_mode: voiceMode }, plan: stored }).select('id').maybeSingle()
    if (ins.error || !ins.data) return v2Fail('cena_order_failed', 503)
    const started = await d.start(String(ins.data.id))
    const result = await started.json() as Record<string, unknown>
    return v2Json({ ...result, rota: route, voice_mode: voiceMode, ...(started.ok ? { costs } : {}) }, started.status)
  } catch (e) {
    const message = e instanceof Error ? e.message : 'cena_plan_failed'
    console.warn('[ads-cena] plan_failed', message) // KINEO-ADS-CENA-95-PLAN-FAILED-2110 — rota restrita à conta da casa.
    if (message === 'cena95_history_unavailable') return v2Fail(message, 503)
    if (message === 'cena95_required_speech_does_not_fit') return v2Fail(message, 422, { reason: 'Gancho, oferta e CTA obrigatórios não cabem em 15 segundos. Reduza somente o texto obrigatório e tente novamente.' }) // KINEO-ADS-CENA-95-PACING-2110
    const inputError = message.startsWith('cena_bad_') || message === 'cena_kling_native_speech_unsupported' || ['cena95_packshot_required', 'cena95_actor_not_approved', 'cena95_actor_recent', 'cena95_voice_language_unsupported'].includes(message)
    if (inputError) return v2Fail(message, 400)
    return v2Fail('cena_plan_failed', 502, { reason: message.slice(0, 200) }) // KINEO-ADS-CENA-95-PLAN-FAILED-2110
  }
}
