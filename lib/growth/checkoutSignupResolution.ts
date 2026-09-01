export const CHECKOUT_SIGNUP_RESOLUTION_VERSION = 'checkout_signup_resolution_v1' as const

export type CheckoutSignupResolutionCopy = {
  heading: string
  body: string
  continuity: string
  signInCta: string
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
