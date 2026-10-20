// KINEO-KIT-BF-VENDA-2010 — as ofertas de Black Friday no RELÓGIO DO SERVIDOR (o cartão do kit e o selo do anual nunca contam com o relógio
// do navegador): o Kit Black Friday (vende até 30/11; o Business já tem incluído) e a oferta antecipada do anual (2 meses grátis até 21/11,
// só onde ela baixa o preço de verdade). Só lê; nada cobra, concede nem grava. As regras moram em lib/ads/kitBfSale.ts e
// lib/billing/annualEarlyOffer.ts; os preços, em lib/checkoutPricing.ts.
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ANNUAL_PRICES, TIER_PRICES, type CheckoutTier } from '@/lib/checkoutPricing'
import { KIT_BF_SALE_ENDS_AT, daysLeft, kitBfIncludedInPlan, kitBfSaleOpen } from '@/lib/ads/kitBfSale'
import { ANNUAL_EARLY_OFFER_ENDS_AT, annualEarlyOfferBadge, annualEarlyOfferOpen, annualEarlyOfferWinner } from '@/lib/billing/annualEarlyOffer'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

const TIERS: readonly CheckoutTier[] = ['starter', 'basic', 'pro']

export async function GET() {
  const nowMs = Date.now()
  let plan: string | null = null
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data } = await supabase.from('profiles').select('plan').eq('id', user.id).maybeSingle()
      plan = typeof (data as { plan?: unknown } | null)?.plan === 'string' ? ((data as { plan: string }).plan) : null
    }
  } catch {
    plan = null // sem sessão/leitura = o cartão de compra (o checkout recusa o Business de qualquer jeito)
  }
  const kitOpen = kitBfSaleOpen(nowMs)
  const annual = Object.fromEntries(TIERS.map((t) => [t, {
    winner: annualEarlyOfferWinner(ANNUAL_PRICES[t].usd, TIER_PRICES[t].usd),
    badge: annualEarlyOfferBadge(ANNUAL_PRICES[t].usd, TIER_PRICES[t].usd, nowMs),
  }]))
  return NextResponse.json({
    nowMs,
    kit: { state: !kitOpen ? 'closed' : kitBfIncludedInPlan(plan) ? 'included' : 'buy', endsAt: KIT_BF_SALE_ENDS_AT, daysLeft: daysLeft(KIT_BF_SALE_ENDS_AT, nowMs) },
    annual: { open: annualEarlyOfferOpen(nowMs), endsAt: ANNUAL_EARLY_OFFER_ENDS_AT, tiers: annual },
  }, { headers: { 'Cache-Control': 'private, no-store' } })
}
