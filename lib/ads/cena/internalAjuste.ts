// KINEO-ADS-CENA-RETOMADA-2110 — approved AJUSTE engine, no 95 classification/judge/history/rewrite.
import type { CenaInternalDeps } from './internal'
import type { AdsV2Caller } from '../v2PlanCore'
import { isAdsInternalEmail } from '../access'
import { cenaEnabled } from './catalog'
import { cenaInput, planCena } from './plan'
import { cenaAssertVoiceRoute, cenaResolveRoute, cenaCosts, isCenaRoute } from './adapters'
import { newCenaState } from './pipeline'
import { cena95ModerationFailure } from './moderation95'
import { preflightCenaAjuste } from './ajustePreflight'
import { planShots } from '../v2ShotLists'
import { v2Fail, v2Json } from '../v2Server'
import { adsV2Credits } from '../v2Tiers'
export async function internalCenaAjusteFor(user: AdsV2Caller, body: unknown, d: CenaInternalDeps): Promise<Response> {
  if (!cenaEnabled(isAdsInternalEmail(user.email))) return v2Fail('cena_internal_only', 403)
  try {
    const b = body as Record<string, unknown>
    if (!b || typeof b !== 'object' || b.rota !== undefined && !isCenaRoute(b.rota)) return v2Fail('cena_bad_route', 400)
    if (b.dry_run !== undefined && typeof b.dry_run !== 'boolean') return v2Fail('cena_bad_dry_run', 400)
    const input = cenaInput(b), route = cenaResolveRoute(input.voice_mode!, b.rota)
    cenaAssertVoiceRoute(route, input.voice_mode!, input.language)
    const first = cena95ModerationFailure(await d.moderate([input.frase, input.oferta, input.cta, ...(input.beneficios ?? [])].filter(Boolean).join('\n')))
    if (first) return v2Fail(first.error, first.status)
    const plan = await planCena(input, route, d.json, { retomada: true })
    preflightCenaAjuste(plan, route)
    const safety = cena95ModerationFailure(await d.moderate(plan.script.narration))
    if (safety) return v2Fail(safety.error, safety.status)
    const costs = cenaCosts(undefined, plan.voice_mode), engine = 'AJUSTE-2110', note = 'AJUSTE aprovado + música opcional e close i2v da foto original. Subtotais legados não incluem essas extensões; totalUsd permanece desconhecido. Dry run não gera mídia, grava pedido ou debita.'
    if (b.dry_run === true) return v2Json({ dry_run: true, charged: false, engine, rota: route, voice_mode: plan.voice_mode, plan, costs, credits: adsV2Credits('commercial', 15), note })
    const skeleton = planShots({ sector: 'store', tier: 'commercial', seconds: 15, photos: [{ id: '00000000-0000-4000-8000-000000000001', url: input.foto, kind: 'text' }] })
    const stored = { ...skeleton, overlays: [], narration: plan.script.narration, cena: newCenaState(plan, route) }
    const ins = await d.admin.from('ads_v2_orders').insert({ user_id: user.id, status: 'planned', tier: 'commercial', seconds: 15, sector: 'store', language: input.language, narration: true, card_url: input.foto, photos: [], brief: { sentence: input.frase, business: plan.product, offer: plan.input.oferta, kind: 'product', cena: true, voice_mode: plan.voice_mode }, plan: stored }).select('id').maybeSingle()
    if (ins.error || !ins.data) return v2Fail('cena_order_failed', 503)
    const started = await d.start(String(ins.data.id)), result = await started.json() as Record<string, unknown>
    return v2Json({ ...result, engine, rota: route, voice_mode: plan.voice_mode, ...(started.ok ? { costs } : {}) }, started.status)
  } catch (e) {
    const message = e instanceof Error ? e.message : 'cena_plan_failed'
    console.warn('[ads-cena] ajuste_plan_failed', message)
    if (message.startsWith('cena_bad_') || message === 'cena_kling_native_speech_unsupported') return v2Fail(message, 400)
    return v2Fail('cena_plan_failed', 502, { reason: message.slice(0, 200) })
  }
}
