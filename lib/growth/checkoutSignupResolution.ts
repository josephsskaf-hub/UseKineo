export const CHECKOUT_SIGNUP_RESOLUTION_VERSION = 'checkout_signup_resolution_v1' as const
export const CHECKOUT_AUTH_CHOICE_VERSION = 'checkout_auth_choice_v1' as const

export type CheckoutSignupResolutionCopy = {
  heading: string
  body: string
  continuity: string
  signInCta: string
}

export type CheckoutAuthChoiceCopy = {
  version: typeof CHECKOUT_AUTH_CHOICE_VERSION
  tier: 'starter' | 'basic' | 'pro'
  billing: 'monthly' | 'annual'
  planName: 'Starter' | 'Creator' | 'Studio'
  cadence: 'monthly' | 'annual'
  summary: string
  continuity: string
  button: string
}

/**
 * Repeat only the recurring choice already present in the checkout redirect.
 * Legacy public aliases are accepted because auth can outlive a deployment;
 * unknown products fail closed to the generic checkout copy.
 */
export function checkoutAuthChoiceCopy(
  rawTier: string | null | undefined,
  rawBilling: string | null | undefined,
): CheckoutAuthChoiceCopy | null {
  const tier = rawTier === 'starter'
    ? 'starter'
    : rawTier === 'basic' || rawTier === 'creator'
      ? 'basic'
      : rawTier === 'pro' || rawTier === 'studio'
        ? 'pro'
        : null
  const billing = rawBilling === 'monthly' || rawBilling === 'annual'
    ? rawBilling
    : null
  if (!tier || !billing) return null

  const planName = tier === 'starter'
    ? 'Starter'
    : tier === 'basic'
      ? 'Creator'
      : 'Studio'
  const cadence = billing === 'annual' ? 'annual' : 'monthly'
  const summary = `${planName} · ${cadence}`
  return {
    version: CHECKOUT_AUTH_CHOICE_VERSION,
    tier,
    billing,
    planName,
    cadence,
    summary,
    continuity: `Your choice — ${summary} — is saved. Sign up once and we’ll open that exact checkout.`,
    button: `Continue to ${planName} checkout →`,
  }
}

const CHECKOUT_COPY: CheckoutSignupResolutionCopy = Object.freeze({
  heading: 'Finish your purchase',
  body: 'If you already use Kineo, sign in with your password. If this is a new account, use the confirmation link sent to your email.',
  continuity: 'Your checkout is saved. Both paths return you to the same secure checkout.',
  signInCta: 'Continue to Sign In →',
})

/**
 * One neutral resolution for both Supabase signup outcomes. Deliberately never
 * reveals whether an email address already belongs to an account.
 */
export function checkoutSignupResolutionCopy(
  isCheckoutResume: boolean,
): CheckoutSignupResolutionCopy | null {
  return isCheckoutResume ? CHECKOUT_COPY : null
}
