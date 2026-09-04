import { CHECKOUT_SESSION_PATTERN, type VerifiedCheckoutPurchase } from './verifiedCheckoutPurchase'
import { dispatchCheckoutPurchasePixels } from './checkoutPurchasePixels'

type PixelTargets = Parameters<typeof dispatchCheckoutPurchasePixels>[1]
type PixelStorage = Parameters<typeof dispatchCheckoutPurchasePixels>[2]

/** Bounded, cancellable observer. It never gates navigation or entitlements. */
export function observeCheckoutPurchase(input: {
  sessionId: string
  fetch: typeof fetch
  targets: () => PixelTargets
  storage: () => PixelStorage
}): () => void {
  if (!CHECKOUT_SESSION_PATTERN.test(input.sessionId)) return () => {}
  let cancelled = false
  let terminal = false
  let purchase: VerifiedCheckoutPurchase | null = null
  const controllers = new Set<AbortController>()
  const flush = () => {
    if (cancelled || !purchase) return
    try { dispatchCheckoutPurchasePixels(purchase, input.targets(), input.storage()) } catch { /* no UI impact */ }
  }
  const timers = [0, 2_000, 5_000, 10_000, 20_000].map(delay => setTimeout(async () => {
    if (cancelled || terminal || purchase) return
    const controller = new AbortController()
    controllers.add(controller)
    const timeout = setTimeout(() => controller.abort(), 6_000)
    try {
      const response = await input.fetch(`/api/stripe/checkout/verify?session_id=${encodeURIComponent(input.sessionId)}`, {
        cache: 'no-store', credentials: 'same-origin', signal: controller.signal,
      })
      if (cancelled) return
      if ([400, 401, 403, 404].includes(response.status)) { terminal = true; return }
      if (!response.ok) return
      const result = await response.json()
      if (cancelled) return
      if (result.state === 'ineligible') { terminal = true; return }
      if (result.state === 'verified' && result.purchase?.sessionId === input.sessionId) {
        purchase = result.purchase
        flush()
      }
    } catch { /* next bounded attempt handles network failures */ }
    finally { clearTimeout(timeout); controllers.delete(controller) }
  }, delay))
  // Allow consent/SDK loading after the verification response without re-querying Stripe.
  for (let delay = 1_000; delay <= 30_000; delay += 1_000) timers.push(setTimeout(flush, delay))
  return () => {
    cancelled = true
    timers.forEach(clearTimeout)
    controllers.forEach(controller => controller.abort())
  }
}
