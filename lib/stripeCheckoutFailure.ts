import { createHash } from 'node:crypto'

export const STRIPE_CHECKOUT_FAILURE_VERSION = 'stripe_checkout_failure_v1'

export type StripeCheckoutFailureStage = 'initial' | 'renewal' | 'unknown'

type FailureBaseInput = {
  paymentIntentId: string
  errorCode?: string | null
  declineCode?: string | null
  currency?: string | null
  amountMinor?: number | null
  cardCountry?: string | null
  cardBrand?: string | null
  cardFunding?: string | null
  paymentMethodType?: string | null
}

type CanonicalFailureInput = FailureBaseInput & {
  hasInvoice: boolean
  billingReason?: string | null
}

type ChargeEnrichmentInput = FailureBaseInput & {
  networkStatus?: string | null
  riskLevel?: string | null
}

const normalizeToken = (value?: string | null): string =>
  (value ?? '').trim().toLowerCase().replace(/[^a-z0-9_]+/g, '_').slice(0, 64)

export function stripeFailureReference(paymentIntentId: string): string {
  return createHash('sha256')
    .update(`kineo:stripe-checkout-failure:${paymentIntentId}`)
    .digest('hex')
    .slice(0, 24)
}

export function classifyStripeCheckoutFailureStage(input: {
  hasInvoice: boolean
  billingReason?: string | null
}): StripeCheckoutFailureStage {
  if (!input.hasInvoice) return 'initial'
  const reason = normalizeToken(input.billingReason)
  if (reason === 'subscription_create') return 'initial'
  if (reason === 'subscription_cycle') return 'renewal'
  return 'unknown'
}

export function classifyStripeFailureReason(
  declineCode?: string | null,
  errorCode?: string | null,
): string {
  const reason = normalizeToken(declineCode) || normalizeToken(errorCode)
  if (!reason) return 'unknown'
  if (reason === 'insufficient_funds') return 'insufficient_funds'
  if (reason === 'authentication_required' || reason === 'payment_intent_authentication_failure') {
    return 'authentication_required'
  }
  if (reason === 'expired_card') return 'expired_card'
  if (['incorrect_cvc', 'incorrect_number', 'invalid_cvc', 'invalid_number'].includes(reason)) {
    return 'incorrect_card_details'
  }
  if (['do_not_honor', 'transaction_not_allowed', 'card_not_supported'].includes(reason)) {
    return 'card_restricted'
  }
  if (['fraudulent', 'lost_card', 'stolen_card', 'merchant_blacklist'].includes(reason)) {
    return 'fraud_or_risk'
  }
  if (['currency_not_supported', 'payment_method_not_available'].includes(reason)) {
    return 'unsupported'
  }
  if (['processing_error', 'card_decline_rate_limit_exceeded'].includes(reason)) {
    return 'processing_error'
  }
  if (reason === 'generic_decline' || reason === 'card_declined') return 'generic_decline'
  return 'other_decline'
}

function normalizeCurrency(value?: string | null): string | null {
  const token = normalizeToken(value)
  return /^[a-z]{3}$/.test(token) ? token : null
}

function normalizeCountry(value?: string | null): string | null {
  const token = (value ?? '').trim().toUpperCase()
  return /^[A-Z]{2}$/.test(token) ? token : null
}

function normalizeCardBrand(value?: string | null): string {
  const token = normalizeToken(value)
  return ['visa', 'mastercard', 'amex', 'discover', 'jcb', 'diners', 'unionpay', 'cartes_bancaires'].includes(token)
    ? token
    : token ? 'other' : 'unknown'
}

function normalizeFunding(value?: string | null): string {
  const token = normalizeToken(value)
  return ['credit', 'debit', 'prepaid'].includes(token) ? token : token ? 'other' : 'unknown'
}

function normalizePaymentMethodFamily(value?: string | null): string {
  const token = normalizeToken(value)
  if (token === 'card') return 'card'
  if (['link', 'paypal', 'cashapp', 'amazon_pay'].includes(token)) return 'wallet'
  if (token.includes('bank') || token.includes('debit') || ['ideal', 'bancontact'].includes(token)) return 'bank'
  return token ? 'other' : 'unknown'
}

function normalizeNetworkStatus(value?: string | null): string {
  const token = normalizeToken(value)
  return ['approved_by_network', 'declined_by_network', 'not_sent_to_network', 'reversed_after_approval'].includes(token)
    ? token
    : 'unknown'
}

function normalizeRiskLevel(value?: string | null): string {
  const token = normalizeToken(value)
  return ['normal', 'elevated', 'highest', 'not_assessed'].includes(token) ? token : 'unknown'
}

function normalizeAmount(value?: number | null): number | null {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : null
}

export function buildCanonicalStripeCheckoutFailure(input: CanonicalFailureInput): Record<string, unknown> {
  const stage = classifyStripeCheckoutFailureStage(input)
  return {
    version: STRIPE_CHECKOUT_FAILURE_VERSION,
    source: 'stripe_webhook',
    object: 'payment_intent',
    failure_ref: stripeFailureReference(input.paymentIntentId),
    stage,
    is_renewal: stage === 'renewal',
    reason_category: classifyStripeFailureReason(input.declineCode, input.errorCode),
    currency: normalizeCurrency(input.currency),
    amount_minor: normalizeAmount(input.amountMinor),
    card_country: normalizeCountry(input.cardCountry),
    card_brand: normalizeCardBrand(input.cardBrand),
    card_funding: normalizeFunding(input.cardFunding),
    payment_method_family: normalizePaymentMethodFamily(input.paymentMethodType),
  }
}

export function buildStripeChargeFailureEnrichment(input: ChargeEnrichmentInput): Record<string, unknown> {
  return {
    version: STRIPE_CHECKOUT_FAILURE_VERSION,
    source: 'stripe_webhook',
    object: 'charge_enrichment',
    failure_ref: stripeFailureReference(input.paymentIntentId),
    reason_category: classifyStripeFailureReason(input.declineCode, input.errorCode),
    network_status: normalizeNetworkStatus(input.networkStatus),
    risk_level: normalizeRiskLevel(input.riskLevel),
    card_country: normalizeCountry(input.cardCountry),
    card_brand: normalizeCardBrand(input.cardBrand),
    card_funding: normalizeFunding(input.cardFunding),
    payment_method_family: normalizePaymentMethodFamily(input.paymentMethodType),
  }
}
