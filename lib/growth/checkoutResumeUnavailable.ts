export const CHECKOUT_RESUME_UNAVAILABLE_VERSION =
  'checkout_resume_unavailable_v1' as const

export const CHECKOUT_RESUME_UNAVAILABLE_PARAM = 'checkout_resume'
export const CHECKOUT_RESUME_UNAVAILABLE_VALUE = 'unavailable'

export const CHECKOUT_RESUME_UNAVAILABLE_COPY = {
  title: 'Saved checkout needs a fresh start',
  body: 'We could not reopen the old payment page. This attempt did not change your billing. Choose a current plan below.',
} as const

export function checkoutResumeUnavailablePath(): string {
  const params = new URLSearchParams({
    [CHECKOUT_RESUME_UNAVAILABLE_PARAM]: CHECKOUT_RESUME_UNAVAILABLE_VALUE,
    intent_campaign: CHECKOUT_RESUME_UNAVAILABLE_VERSION,
  })
  return `/pricing?${params.toString()}`
}

export function isCheckoutResumeUnavailable(search: string): boolean {
  const params = new URLSearchParams(search)
  return params.get(CHECKOUT_RESUME_UNAVAILABLE_PARAM) === CHECKOUT_RESUME_UNAVAILABLE_VALUE
    && params.get('intent_campaign') === CHECKOUT_RESUME_UNAVAILABLE_VERSION
}

export function checkoutResumeUnavailableTelemetry(): {
  version: typeof CHECKOUT_RESUME_UNAVAILABLE_VERSION
  surface: 'pricing'
} {
  return {
    version: CHECKOUT_RESUME_UNAVAILABLE_VERSION,
    surface: 'pricing',
  }
}

export function checkoutResumeUnavailableStorageKey(): string {
  return `kineo:${CHECKOUT_RESUME_UNAVAILABLE_VERSION}:viewed`
}
