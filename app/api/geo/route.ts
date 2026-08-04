import { NextRequest, NextResponse } from 'next/server'
import { resolveCheckoutCurrency, resolvePriceRegion } from '@/lib/checkoutPricing'

// Display-only geo lookup, kept aligned with /api/stripe/checkout:
// BR → BRL, IN → INR, all other countries → USD. Checkout repeats the
// resolution server-side and never trusts a currency supplied by the browser.
//
// KINEO-REGIONAL-PRICING-2026-08-04 — devolve também `region`. Moeda e região
// são independentes (um comprador nigeriano é 'usd' + 'value'), então a tela
// precisa das DUAS para escrever o preço certo. Mesma regra de sempre: isto é
// só EXIBIÇÃO. O /api/stripe/checkout re-resolve país → moeda → região no
// servidor e nunca aceita nenhum dos dois vindo do navegador, então mexer na
// resposta deste endpoint com devtools muda o rótulo e não muda a cobrança.
export async function GET(req: NextRequest) {
  const country = (req.headers.get('x-vercel-ip-country') ?? 'US').toUpperCase()
  const currency = resolveCheckoutCurrency(country)
  const region = resolvePriceRegion(country)

  return NextResponse.json(
    { country, currency, region },
    { headers: { 'Cache-Control': 'private, no-store, max-age=0' } },
  )
}
