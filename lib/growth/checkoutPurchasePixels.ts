import { CHECKOUT_SESSION_PATTERN, type VerifiedCheckoutPurchase } from './verifiedCheckoutPurchase'

export type CheckoutPixelTargets = {
  gtag?: (...args: unknown[]) => void
  ttq?: { track: (...args: unknown[]) => void }
  uetq?: { push: (...args: unknown[]) => void } // KINEO-MS-UET-1111 — fila da tag UET (só existe com a tag carregada)
}

/** KINEO-MS-UET-1111 — a ação do evento que a meta "assinou" da Microsoft Ads casa (Custom event, Action = este texto). */
export const MS_UET_SUBSCRIPTION_EVENT = 'kineo_subscribed'
type PixelStorage = Pick<Storage, 'getItem' | 'setItem'>
const dispatched = new Set<string>()

/** Synchronous claim around each provider prevents StrictMode/remount duplicates.
 * Storage survives refresh; transaction/event IDs also give provider-side dedupe.
 * No receipt is written until the SDK accepts the call. SDK absence isn't success.
 * This is attribution only: a pixel call is never evidence of revenue received.
 */
export function dispatchCheckoutPurchasePixels(
  purchase: VerifiedCheckoutPurchase,
  targets: CheckoutPixelTargets,
  storage?: PixelStorage,
): void {
  if (!CHECKOUT_SESSION_PATTERN.test(purchase.sessionId) ||
      !Number.isSafeInteger(purchase.amountMinor) || purchase.amountMinor <= 0 ||
      purchase.value !== purchase.amountMinor / 100 ||
      !['USD', 'BRL'].includes(purchase.currency) ||
      !['subscription', 'payment'].includes(purchase.mode)) return
  const send = (provider: string, call: (() => void) | undefined) => {
    if (!call) return
    const key = `kineo:verified-purchase:${provider}:${purchase.sessionId}`
    if (dispatched.has(key)) return
    try { if (storage?.getItem(key) === '1') { dispatched.add(key); return } } catch { /* private mode */ }
    dispatched.add(key)
    try { call() } catch { dispatched.delete(key); return }
    try { storage?.setItem(key, '1') } catch { /* module + provider IDs still dedupe */ }
  }
  send('google', typeof targets.gtag === 'function' ? () => targets.gtag!('event', 'conversion', {
    send_to: 'AW-18156258081/NL4bCKXEwa4cEKGGytFD',
    value: purchase.value, currency: purchase.currency, transaction_id: purchase.sessionId,
  }) : undefined)
  send('tiktok', typeof targets.ttq?.track === 'function' ? () => targets.ttq!.track('Purchase', {
    value: purchase.value, currency: purchase.currency, content_type: 'product',
    content_name: purchase.mode === 'subscription' ? 'Kineo subscription' : 'Kineo one-time purchase',
  }, { event_id: purchase.sessionId }) : undefined)
  // KINEO-MS-UET-1111 — Microsoft Ads: só ASSINATURA paga (avulso não é "assinou"), formato novo do UET
  // (help.ads.microsoft.com 56956). A UET não tem id de transação: a trava por sessão acima é o que impede contar duas vezes.
  send('microsoft', purchase.mode === 'subscription' && typeof targets.uetq?.push === 'function' ? () => targets.uetq!.push('event', MS_UET_SUBSCRIPTION_EVENT, {
    event_category: 'checkout', event_label: 'subscription', revenue_value: purchase.value, currency: purchase.currency,
  }) : undefined)
}
