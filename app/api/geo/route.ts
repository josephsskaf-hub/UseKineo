import { NextRequest, NextResponse } from 'next/server'
import { resolveCheckoutCurrency, resolvePriceRegion } from '@/lib/checkoutPricing'
// ═══ KINEO-DATA-CACHE-2026-09-02 (sprint-assinaturas #17) ═══════════════════
// Rota SO-GET no Next 14.2: sem POST no modulo, o store nasce com
// revalidate=false, e `dynamic='force-dynamic'` NAO muda isso (so pula o proxy
// que marcaria a rota como dinamica). Resultado: todo GET do supabase-js (e da
// fal/Creatomate) com URL estavel ia para o Data Cache da Vercel PARA SEMPRE —
// a rota lia o banco como ele estava na PRIMEIRA vez que aquela URL foi pedida.
// Provado em producao 02/09: cron de resgate contando 1 tentativa com 3 no
// banco, marcador stranded_composed invisivel 13 min depois de gravado,
// "claim row missing" logo apos 23505 no MESMO id, e-mail de video pronto
// repetido 15 min depois (be9c6314). Esta linha e o unico interruptor que
// zera o revalidate ANTES do primeiro fetch. Nao remover.
export const fetchCache = 'force-no-store'

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
