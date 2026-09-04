export const CHECKOUT_ENTRY_SURFACE_VERSION = 'checkout_entry_surface_v1' as const

export type CheckoutEntrySurface =
  | 'home'
  | 'pricing'
  | 'checkout_cancelled'
  | 'signup'
  | 'login'
  | 'dashboard_home'
  | 'studio'
  | 'studio_create'
  | 'history'
  | 'account'
  | 'dashboard_tool'
  | 'public_landing'
  | 'cross_origin'
  | 'missing'
  | 'invalid'

const DASHBOARD_TOOLS = new Set([
  '/animate',
  '/audio',
  '/avatar',
  '/images',
  '/library',
  '/viral-now',
])

/**
 * Classifies the browser page that navigated to the recurring Stripe checkout.
 *
 * The raw Referer is deliberately never returned. It can contain a prompt or
 * other query-string data, while the business question only needs a closed
 * surface name. Cross-origin and malformed values also fail closed.
 */
export function classifyCheckoutEntrySurface(
  referer: string | null | undefined,
  requestOrigin: string,
): CheckoutEntrySurface {
  if (!referer) return 'missing'

  let source: URL
  let destination: URL
  try {
    source = new URL(referer)
    destination = new URL(requestOrigin)
  } catch {
    return 'invalid'
  }

  if (source.origin !== destination.origin) return 'cross_origin'

  const pathname = source.pathname.length > 1
    ? source.pathname.replace(/\/+$/, '')
    : source.pathname

  if (pathname === '/') return 'home'
  if (pathname === '/pricing') return 'pricing'
  if (pathname === '/checkout/cancelled') return 'checkout_cancelled'
  if (pathname === '/signup') return 'signup'
  if (pathname === '/login') return 'login'
  if (pathname === '/dashboard') return 'dashboard_home'
  if (pathname === '/studio') return 'studio'
  if (pathname === '/studio/create') return 'studio_create'
  if (pathname === '/history') return 'history'
  if (pathname === '/account') return 'account'
  if (DASHBOARD_TOOLS.has(pathname)) return 'dashboard_tool'

  return 'public_landing'
}
