// Founder 2026-10-28. The stored engine identifies the supplier; old orders retain Kling 3.
import { KLING4_PAID_LIVE } from '@/lib/kling4PaidPolicy'

export const KLING4_AD_FAL_EXTRAS_MILLIUSD = 1480 // eight preview images + one Lyria + two bounded 1000-char voices
export const KLING4_AD_OTHER_EXTRAS_MILLIUSD = 170 // declared planning/TTS/render allowance; not an invoice
export const KLING4_AD_SECONDS = 15
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
