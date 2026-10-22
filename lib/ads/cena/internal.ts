// KINEO-ADS-CENA-2110 — porta interna do A/B, usando pedido/débito/estorno/entrega v2 já existentes.
// KINEO-ADS-CENA-AJUSTE-2110 — defaults explícitos e recusa de fala não suportada ANTES de qualquer cobrança.
import type { SupabaseClient } from '@supabase/supabase-js'
import { isAdsInternalEmail } from '../access'
import { cenaEnabled } from './catalog'
import { cenaInput, planCena, type CenaJson } from './plan'
import { cenaAssertVoiceRoute, cenaCosts, cenaResolveRoute, isCenaRoute } from './adapters'
import { newCenaState } from './pipeline'
import { planShots } from '../v2ShotLists'
import { v2Fail, v2Json } from '../v2Server'
import { adsV2Credits } from '../v2Tiers'
import type { AdsV2Caller } from '../v2PlanCore'
export interface CenaInternalDeps {
  json: CenaJson;
  moderate(text: string): Promise<boolean>;
  admin: SupabaseClient;
  start(orderId: string): Promise<Response>;
}
export async function internalCenaFor(user: AdsV2Caller, body: unknown, d: CenaInternalDeps): Promise<Response> {
  if (!cenaEnabled(isAdsInternalEmail(user.email))) return v2Fail('cena_internal_only', 403)
  try {
    const b = body as Record<string, unknown>
    if (!b || typeof b !== 'object' || (b.rota !== undefined && !isCenaRoute(b.rota))) return v2Fail('cena_bad_route', 400)
    if (b.dry_run !== undefined && typeof b.dry_run !== 'boolean') return v2Fail('cena_bad_dry_run', 400)
    const input = cenaInput(b)
    const voiceMode = input.voice_mode!
    const route = cenaResolveRoute(voiceMode, b.rota)
    cenaAssertVoiceRoute(route, voiceMode, input.language)
    if (!await d.moderate([input.frase, input.oferta, ...(input.beneficios ?? [])].join('\n'))) return v2Fail('moderation', 422)
    const plan = await planCena(input, route, d.json)
    const costs = cenaCosts(undefined, voiceMode)
    const response = { dry_run: b.dry_run === true, charged: false, rota: route, voice_mode: voiceMode, plan, costs, credits: adsV2Credits('commercial', 15), note: 'Planejamento usa GPT-4o-mini; dry_run não gera imagem/vídeo, não debita créditos nem grava pedido. Totais USD incluem parcelas desconhecidas.' }
    if (b.dry_run === true) return v2Json(response)
    // Nenhum preço novo: canário custa o mesmo nível Comercial. O start v2 confirma débito e garante uma geração ativa.
    const skeleton = planShots({ sector: 'store', tier: 'commercial', seconds: 15, photos: [{ id: '00000000-0000-4000-8000-000000000001', url: input.foto, kind: 'text' }] })
    const stored = { ...skeleton, overlays: [], narration: plan.script.narration, cena: newCenaState(plan, route) }
    const ins = await d.admin.from('ads_v2_orders').insert({ user_id: user.id, status: 'planned', tier: 'commercial', seconds: 15, sector: 'store', language: input.language, narration: true, card_url: input.foto, photos: [], brief: { sentence: input.frase, business: plan.product, offer: plan.input.oferta, kind: 'product', cena: true, voice_mode: voiceMode }, plan: stored }).select('id').maybeSingle()
    if (ins.error || !ins.data) return v2Fail('cena_order_failed', 503)
    const started = await d.start(String(ins.data.id))
    const result = await started.json() as Record<string, unknown>
    return v2Json({ ...result, rota: route, voice_mode: voiceMode, ...(started.ok ? { costs } : {}) }, started.status)
  } catch (e) {
    const message = e instanceof Error ? e.message : 'cena_plan_failed'
    const inputError = message.startsWith('cena_bad_') || message === 'cena_kling_native_speech_unsupported'
    return v2Fail(inputError ? message : 'cena_plan_failed', inputError ? 400 : 502)
  }
}
