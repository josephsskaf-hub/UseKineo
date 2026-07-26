// Push #233 — fire-and-forget checkout/upgrade click tracking.
// POSTs to /api/track-click, which writes one row to public.click_events.
// keepalive:true lets the request survive the immediate `window.location`
// navigation to Stripe that usually follows the click. Never throws and
// never blocks the caller — checkout must always proceed.
// KINEO-SPRINT-OFFER-2026-07-14 — widened to include 'starter': the intro-month
// CTAs track Starter clicks too (handleUpgradeNow already passed it, untyped).
// KINEO-AUTOPILOT-299-2026-07-26 — 'autopilot' incluído. Sem esta string o
// clique no SKU de maior ARPU do produto (8x o segundo) fica INVISÍVEL em
// /admin/click-stats, que é justamente onde a gente mede se a oferta pega.
export function trackCheckoutClick(plan: 'starter' | 'basic' | 'pro' | 'autopilot'): void {
  try {
    void fetch('/api/track-click', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event: 'checkout_click', plan }),
      keepalive: true,
    }).catch(() => {})
  } catch {
    // ignore — tracking must never break the checkout flow
  }
}
