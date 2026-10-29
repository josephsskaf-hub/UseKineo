/** Server availability is a short lease, never an entitlement or a reservation. */
export type Kling4PaidAvailability = {
  paidLive: boolean
  promoLive: boolean
  promoAvailable: boolean
  publicOfferLive: boolean
  reason: string
  checkedAt: string
  validUntil: string
  expiresAt?: string | null
  remainingToday?: number | null
}

export const KLING4_PAID_COPY = {
  offer: 'Kling 4.0 free for 30 days when you subscribe',
  terms: 'Active paid subscribers only. Up to 3 Kling 4.0 films or ads per day, up to 60 seconds each, shared across both tools. No credits used within the allowance.',
  dates: 'Subscribe by November 30, 2026: your 30 days start with your subscription. Existing subscribers: 30 days from launch.',
  cap: 'The promotion has a shared US$100 daily fal budget. When it is used up, regular credits apply; we tell you before you confirm.',
  included: 'Included in your Kling 4.0 promotion · 0 credits',
  dailyCap: 'Today’s free Kling 4.0 allowance is used up. Regular credits apply before you confirm.',
  unavailable: 'Your free Kling 4.0 allowance is unavailable right now. Check the credit cost before you confirm.',
  directed: 'Directed scenes, your narration, captions and music',
  limits: 'Kling 4.0 currently supports vertical 9:16 films without face reference photos.',
  try: 'Try Kling 4.0',
  paused: 'Kling 4.0 is currently unavailable. You can choose Kling 3 in the Studio.',
} as const

export function validKling4PaidAvailability(value: unknown, now = Date.now()): value is Kling4PaidAvailability {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const a = value as Partial<Kling4PaidAvailability>
  if (typeof a.paidLive !== 'boolean' || typeof a.promoLive !== 'boolean' ||
      typeof a.promoAvailable !== 'boolean' || typeof a.publicOfferLive !== 'boolean' || typeof a.reason !== 'string') return false
  const at = Date.parse(String(a.checkedAt ?? '')), until = Date.parse(String(a.validUntil ?? ''))
  if (a.expiresAt !== undefined && a.expiresAt !== null && !Number.isFinite(Date.parse(a.expiresAt))) return false
  return Number.isFinite(at) && Number.isFinite(until) && at <= now && until > now && until > at && until - at <= 16_000
}

export function kling4PaidName(a: unknown, now = Date.now()): string {
  return validKling4PaidAvailability(a, now) && a.paidLive ? 'Kling 4.0' : 'Kling 3'
}

export function kling4PromoVisible(a: unknown, now = Date.now()): a is Kling4PaidAvailability {
  if (!validKling4PaidAvailability(a, now) || !a.paidLive || !a.promoLive) return false
  if (a.expiresAt && Date.parse(a.expiresAt) <= now) return false
  return a.publicOfferLive || a.promoAvailable
}

export function kling4PromoZeroCredits(a: unknown, seconds: number, now = Date.now()): boolean {
  return validKling4PaidAvailability(a, now) && a.paidLive && a.promoLive && a.promoAvailable &&
    Number.isFinite(seconds) && seconds > 0 && seconds <= 60 && (!a.expiresAt || Date.parse(a.expiresAt) > now)
}
