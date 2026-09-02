export type AffiliateCommissionType = 'initial' | 'recurring'
export type AffiliatePaymentKind = 'one_time' | 'subscription'

export interface AffiliateCommissionRecord {
  affiliate_id: string
  referral_id: string | null
  provider: 'stripe'
  external_id: string
  type: AffiliateCommissionType
  amount_gross: number
  currency: string
  commission_amount: number
  status: 'pending'
  period: string
}

export interface ExistingAffiliateCommission {
  affiliate_id: string | null
  referral_id: string | null
  provider: string | null
  external_id: string | null
  type: string | null
  amount_gross: number | null
  currency: string | null
  commission_amount: number | null
}

export interface AffiliateCommissionStore {
  find(provider: string, externalId: string): Promise<ExistingAffiliateCommission | null>
  insert(row: AffiliateCommissionRecord): Promise<'inserted' | 'duplicate'>
  markReferralPaid(referralId: string, convertedAt: string): Promise<void>
}

export class AffiliateLedgerIntegrityError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AffiliateLedgerIntegrityError'
  }
}

export function normalizeAffiliateCurrency(value: string): string {
  const currency = String(value ?? '').trim().toLowerCase()
  if (!/^[a-z]{3}$/.test(currency)) {
    throw new AffiliateLedgerIntegrityError('Invalid affiliate commission currency')
  }
  return currency
}

export function calculateAffiliateCommission(amountGross: number, rate: number): number {
  if (!Number.isSafeInteger(amountGross) || amountGross <= 0) {
    throw new AffiliateLedgerIntegrityError('Invalid affiliate commission gross amount')
  }
  if (!Number.isFinite(rate) || rate <= 0 || rate > 1) {
    throw new AffiliateLedgerIntegrityError('Invalid affiliate commission rate')
  }
  const amount = Math.round(amountGross * rate)
  if (amount <= 0) {
    throw new AffiliateLedgerIntegrityError('Affiliate commission rounded to zero')
  }
  return amount
}

export function normalizeAffiliateAdminUpdate(input: {
  commission_rate?: unknown
  coupon_code?: unknown
}): { commission_rate?: number; coupon_code?: string | null } {
  const result: { commission_rate?: number; coupon_code?: string | null } = {}
  if (input.commission_rate !== undefined) {
    if (
      typeof input.commission_rate !== 'number' ||
      !Number.isFinite(input.commission_rate) ||
      input.commission_rate <= 0 ||
      input.commission_rate > 1
    ) {
      throw new AffiliateLedgerIntegrityError('Commission rate must be greater than 0 and at most 1')
    }
    result.commission_rate = input.commission_rate
  }
  if (input.coupon_code !== undefined) {
    if (typeof input.coupon_code !== 'string') {
      throw new AffiliateLedgerIntegrityError('Coupon code must be text')
    }
    const coupon = input.coupon_code.trim().toUpperCase()
    if (coupon && !/^[A-Z0-9]{4,24}$/.test(coupon)) {
      throw new AffiliateLedgerIntegrityError('Coupon code must contain 4-24 letters or numbers')
    }
    result.coupon_code = coupon || null
  }
  return result
}

function assertSameCommission(
  existing: ExistingAffiliateCommission,
  expected: AffiliateCommissionRecord,
): void {
  const same =
    existing.affiliate_id === expected.affiliate_id &&
    existing.referral_id === expected.referral_id &&
    existing.provider === expected.provider &&
    existing.external_id === expected.external_id &&
    existing.type === expected.type &&
    existing.amount_gross === expected.amount_gross &&
    normalizeAffiliateCurrency(existing.currency ?? '') === expected.currency &&
    existing.commission_amount === expected.commission_amount
  if (!same) {
    throw new AffiliateLedgerIntegrityError('Existing affiliate commission conflicts with Stripe payment')
  }
}

export async function commitAffiliateCommission(
  store: AffiliateCommissionStore,
  row: AffiliateCommissionRecord,
  convertedAt: string,
  options: { paymentKind: AffiliatePaymentKind },
): Promise<'inserted' | 'duplicate'> {
  if (options?.paymentKind !== 'one_time' && options?.paymentKind !== 'subscription') {
    throw new AffiliateLedgerIntegrityError('Invalid affiliate payment kind')
  }

  let outcome: 'inserted' | 'duplicate' = 'duplicate'
  const existing = await store.find(row.provider, row.external_id)
  if (existing) {
    assertSameCommission(existing, row)
  } else {
    outcome = await store.insert(row)
    if (outcome === 'duplicate') {
      const winner = await store.find(row.provider, row.external_id)
      if (!winner) {
        throw new AffiliateLedgerIntegrityError('Duplicate commission could not be reconciled')
      }
      assertSameCommission(winner, row)
    }
  }

  // A commission proves that money moved, but only a subscription payment
  // proves the dashboard promise "Paid customers". One-time packs still earn
  // the exact same commission without converting the referral into a subscriber.
  // If a subscription mark fails, the caller retries: the duplicate commission
  // is reconciled above, then this repair runs again without creating new debt.
  if (row.referral_id && options.paymentKind === 'subscription') {
    await store.markReferralPaid(row.referral_id, convertedAt)
  }
  return outcome
}
