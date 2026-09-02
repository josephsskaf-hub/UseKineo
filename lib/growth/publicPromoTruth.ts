export const PUBLIC_PROMO_TRUTH_VERSION = 'public_promo_truth_v1' as const

export const WELCOME20_PROMOTION_CODE = 'WELCOME20' as const
export const WELCOME20_COUPON_ID = 'KINEO_WELCOME20' as const
export const WELCOME20_PERCENT_OFF = 20 as const

export type PromisedPublicPromoKind = 'welcome_first_month_20'
export type PublicPromoTruthState = 'requested' | 'verified' | 'applied' | 'failed'

export type PublicPromoFailureReason =
  | 'invalid_checkout_shape'
  | 'conflicting_discount'
  | 'not_found_or_inactive'
  | 'promotion_code_mismatch'
  | 'promotion_inactive'
  | 'promotion_expired'
  | 'promotion_exhausted'
  | 'first_transaction_restricted'
  | 'minimum_amount_restricted'
  | 'promotion_currency_restricted'
  | 'customer_mismatch'
  | 'coupon_identity_mismatch'
  | 'coupon_deleted'
  | 'coupon_invalid'
  | 'percent_mismatch'
  | 'amount_discount_mismatch'
  | 'duration_mismatch'
  | 'coupon_expired'
  | 'coupon_currency_restricted'
  | 'product_restricted'
  | 'verification_failed'
  | 'discount_not_applied'

export type PublicPromoVerificationFacts = {
  kind: PromisedPublicPromoKind
  promotionCode: string
  promotionActive: boolean
  promotionExpiresAtSeconds: number | null
  promotionMaxRedemptions: number | null
  promotionTimesRedeemed: number
  promotionFirstTimeTransaction: boolean
  promotionMinimumAmount: number | null
  promotionMinimumAmountCurrency: string | null
  promotionCurrencyOptionCodes: readonly string[]
  restrictedCustomerId: string | null
  currentCustomerId: string
  couponId: string | null
  couponDeleted: boolean
  couponValid: boolean
  couponPercentOff: number | null
  couponAmountOff: number | null
  couponDuration: string | null
  couponRedeemBySeconds: number | null
  couponCurrencyOptionCodes: readonly string[]
  couponProductIds: readonly string[]
  nowMs: number
}

/**
 * Recognize only a public promise that is currently made by a live Kineo UI.
 * Private offers have their own stricter contract and must never be relabeled.
 */
export function promisedPublicPromoKind(
  requestedPromo: string | null | undefined,
  privatePackPromo: boolean,
): PromisedPublicPromoKind | null {
  if (privatePackPromo) return null
  return requestedPromo?.trim().toUpperCase() === WELCOME20_PROMOTION_CODE
    ? 'welcome_first_month_20'
    : null
}

/** Closed, PII-free metadata. Raw query codes and Stripe object ids stay out. */
export function publicPromoTruthMetadata(
  kind: PromisedPublicPromoKind | null,
  state: PublicPromoTruthState,
  failureReason?: PublicPromoFailureReason,
): Record<string, string> {
  if (!kind) return {}
  return {
    public_promo_truth_version: PUBLIC_PROMO_TRUTH_VERSION,
    public_promo_kind: kind,
    public_promo_state: state,
    ...(failureReason ? { public_promo_failure_reason: failureReason } : {}),
  }
}

/**
 * Prove the exact offer that the welcome modal promises. A promotion merely
 * existing is insufficient: its coupon, percentage, duration and scope must
 * all still match the public sentence shown immediately before checkout.
 */
export function publicPromoVerificationFailure(
  facts: PublicPromoVerificationFacts,
): PublicPromoFailureReason | null {
  if (facts.kind !== 'welcome_first_month_20') return 'promotion_code_mismatch'
  if (facts.promotionCode.trim().toUpperCase() !== WELCOME20_PROMOTION_CODE) {
    return 'promotion_code_mismatch'
  }
  if (!facts.promotionActive) return 'promotion_inactive'
  if (
    facts.promotionExpiresAtSeconds !== null &&
    facts.promotionExpiresAtSeconds * 1000 <= facts.nowMs
  ) {
    return 'promotion_expired'
  }
  if (
    facts.promotionMaxRedemptions !== null &&
    facts.promotionTimesRedeemed >= facts.promotionMaxRedemptions
  ) {
    return 'promotion_exhausted'
  }
  if (facts.promotionFirstTimeTransaction) return 'first_transaction_restricted'
  if (
    facts.promotionMinimumAmount !== null ||
    facts.promotionMinimumAmountCurrency !== null
  ) {
    return 'minimum_amount_restricted'
  }
  if (facts.promotionCurrencyOptionCodes.length > 0) {
    return 'promotion_currency_restricted'
  }
  if (
    facts.restrictedCustomerId !== null &&
    facts.restrictedCustomerId !== facts.currentCustomerId
  ) {
    return 'customer_mismatch'
  }
  if (facts.couponDeleted) return 'coupon_deleted'
  if (facts.couponId !== WELCOME20_COUPON_ID) return 'coupon_identity_mismatch'
  if (!facts.couponValid) return 'coupon_invalid'
  if (facts.couponPercentOff !== WELCOME20_PERCENT_OFF) return 'percent_mismatch'
  if (facts.couponAmountOff !== null) return 'amount_discount_mismatch'
  if (facts.couponDuration !== 'once') return 'duration_mismatch'
  if (
    facts.couponRedeemBySeconds !== null &&
    facts.couponRedeemBySeconds * 1000 <= facts.nowMs
  ) {
    return 'coupon_expired'
  }
  if (facts.couponCurrencyOptionCodes.length > 0) return 'coupon_currency_restricted'
  if (facts.couponProductIds.length > 0) return 'product_restricted'
  return null
}

export function publicPromoFirstChargeMinor(
  kind: PromisedPublicPromoKind,
  fullAmountMinor: number,
): number | null {
  if (
    kind !== 'welcome_first_month_20' ||
    !Number.isInteger(fullAmountMinor) ||
    fullAmountMinor <= 0
  ) {
    return null
  }
  return Math.round(fullAmountMinor * (100 - WELCOME20_PERCENT_OFF) / 100)
}

export type LoadedPublicPromoCandidate = PublicPromoVerificationFacts & {
  promotionCodeId: string
}

export type PromisedPublicPromoResolution =
  | {
      status: 'applied'
      promotionCodeId: string
      firstChargeMinor: number
    }
  | {
      status: 'rejected'
      reason: PublicPromoFailureReason
    }

/**
 * Executable orchestration boundary for the Stripe lookup. Tests can inject a
 * fake loader and prove not-found, thrown lookup and malformed-object paths;
 * production injects the real Stripe calls.
 */
export async function resolvePromisedPublicPromo(
  kind: PromisedPublicPromoKind,
  fullAmountMinor: number,
  loadCandidate: () => Promise<LoadedPublicPromoCandidate | null>,
): Promise<PromisedPublicPromoResolution> {
  let candidate: LoadedPublicPromoCandidate | null
  try {
    candidate = await loadCandidate()
  } catch {
    return { status: 'rejected', reason: 'verification_failed' }
  }
  if (!candidate) return { status: 'rejected', reason: 'not_found_or_inactive' }

  const failure = publicPromoVerificationFailure(candidate)
  if (failure) return { status: 'rejected', reason: failure }

  const firstChargeMinor = publicPromoFirstChargeMinor(kind, fullAmountMinor)
  if (firstChargeMinor === null) {
    return { status: 'rejected', reason: 'verification_failed' }
  }
  return {
    status: 'applied',
    promotionCodeId: candidate.promotionCodeId,
    firstChargeMinor,
  }
}

export class UnverifiedPublicPromoError extends Error {
  constructor() {
    super('promised public promotion was not verified')
    this.name = 'UnverifiedPublicPromoError'
  }
}

/** Last invariant immediately around the irreversible Stripe Session call. */
export async function createCheckoutWithPublicPromoTruth<T>(
  kind: PromisedPublicPromoKind | null,
  verified: boolean,
  createCheckout: () => Promise<T>,
): Promise<T> {
  if (kind && !verified) throw new UnverifiedPublicPromoError()
  return createCheckout()
}
