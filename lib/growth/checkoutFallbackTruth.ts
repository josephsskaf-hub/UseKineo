export const CHECKOUT_FALLBACK_COPY_VERSION = 'checkout_fallback_truth_v1' as const

export type CheckoutFallbackCopyKind =
  | 'stripe_direct'
  | 'resume_endpoint'
  | 'idempotent_retry'

export type CheckoutFallbackCopy = {
  title: string
  detail: string
  actionLabel: string
  actionAriaLabel: string
  regionAriaLabel: string
  confirmedCheckout: boolean
}

export function checkoutFallbackCopy({
  kind,
  planLabel,
  priceLabel,
}: {
  kind: CheckoutFallbackCopyKind
  planLabel?: string | null
  priceLabel?: string | null
}): CheckoutFallbackCopy {
  const planDetail = planLabel && priceLabel
    ? `${planLabel} · first charge ${priceLabel}.`
    : null

  if (kind === 'idempotent_retry') {
    return {
      title: 'Checkout took too long to open',
      detail: planDetail
        ? `${planDetail} This attempt did not charge you. Try secure checkout again.`
        : 'This attempt did not charge you. Try secure checkout again.',
      actionLabel: 'Try secure checkout again →',
      actionAriaLabel: 'Try secure checkout again',
      regionAriaLabel: 'Retry secure checkout',
      confirmedCheckout: false,
    }
  }

  return {
    title: 'Your checkout is ready — your browser did not open it',
    detail: planDetail
      ? `${planDetail} You have not been charged yet.`
      : 'Your payment page is ready. You have not been charged yet.',
    actionLabel: 'Continue to payment →',
    actionAriaLabel: 'Continue to payment',
    regionAriaLabel: 'Continue to payment',
    confirmedCheckout: true,
  }
}
