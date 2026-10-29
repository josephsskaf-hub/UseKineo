// Founder 2026-10-28. The stored engine identifies the supplier; old orders retain Kling 3.
import { KLING4_PAID_LIVE } from '@/lib/kling4PaidPolicy'
import type { CenaEscolhaState } from '@/lib/ads/cena/escolhaMedia'

export const KLING4_AD_FAL_EXTRAS_MILLIUSD = 1480 // eight preview images + one Lyria + two bounded 1000-char voices
export const KLING4_AD_OTHER_EXTRAS_MILLIUSD = 170 // declared planning/TTS/render allowance; not an invoice
export const KLING4_AD_SECONDS = 15
/** Only thrown before a provider POST; its persisted intent can safely return to new. */
export class Kling4PromoBudgetWait extends Error {
  constructor(readonly effect: 'voice' | 'video' | 'music', readonly index?: number) {
    super('kling4_promo_budget_wait'); this.name = 'Kling4PromoBudgetWait'
  }
}
export const KLING4_AD_CREDITS = Math.max(35, Math.ceil((15 * 157 + KLING4_AD_FAL_EXTRAS_MILLIUSD + KLING4_AD_OTHER_EXTRAS_MILLIUSD) / (133 * 0.6)))

export function newPaidCenaRoute(route: 'kling3' | 'kling4' | 'seedance2' | 'veo31', sample: boolean, live = KLING4_PAID_LIVE) {
  if (sample) return 'kling3' as const
  return route === 'kling3' || route === 'kling4' ? live ? 'kling4' as const : 'kling3' as const : route
}

export function kling4AdBillingRef(orderId: string, generationId: string): string {
  return `kling4promo-ad-${orderId}-${generationId}`
}
export function isKling4AdPromoRef(ref: unknown): ref is string {
  return typeof ref === 'string' && /^kling4promo-ad-[0-9a-f-]{36}-[0-9a-f-]{36}$/i.test(ref)
}

export function kling4AdActualEngine(plan: unknown): 'kling4' | null {
  const p = plan as { cena?: { route?: string } } | null
  return p?.cena?.route === 'kling4' ? 'kling4' : null
}

/** Gate before durable provider intentions; read-only polls and completed jobs need no new budget. */
export function kling4AdMaySpend(state: CenaEscolhaState): boolean {
  if (state.phase !== 'video' && state.phase !== 'ready') return false
  const media = state.escolhaMedia
  const narrated = state.plan.voice_mode === 'narrated' || !state.plan.voice_mode && state.plan.audioMode === 'voiceover'
  const voice = narrated && !state.voiceUrl && (!media || media.voice.status === 'new')
  const music = state.phase === 'ready' && state.plan.ajusteLive?.music === true && (!media || media.music.status === 'new')
  const videos = state.jobs.filter(j => j.kind === 'video')
  const video = state.phase === 'video' && (!videos.length || videos.some(j => j.status === 'new'))
  return !!(voice || music || video)
}
