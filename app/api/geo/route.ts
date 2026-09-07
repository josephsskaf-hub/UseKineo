import { NextRequest, NextResponse } from 'next/server'
import { resolveCheckoutCurrency, resolvePriceRegion } from '@/lib/checkoutPricing'
import { isDodoEnabled } from '@/lib/dodo'
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
// ═══════════════════════════════════════════════════════════════════════════
// KINEO-METODO-LOCAL-2026-09-07 — a tela precisa saber se o trilho local EXISTE.
// ═══════════════════════════════════════════════════════════════════════════
// A ordem do fundador de 07/09 foi literal: "aceitar UPI só para quem vem de IP
// da Índia". Duas condições, e as duas moram no SERVIDOR: (a) a chave do Dodo
// existe, (b) o país tem um método local que o Dodo faz e a Stripe não faz.
// O navegador não pode responder nenhuma das duas, então elas viajam aqui —
// como as outras respostas desta rota, isto é SÓ EXIBIÇÃO: `/api/dodo/checkout`
// re-resolve chave e país no servidor e devolve 503 se algo faltar. Mexer nesta
// resposta pelo devtools faz aparecer um botão que dá 503, e nada mais.
//
// ⛔ SÓ ENTRAM PAÍSES ONDE O DODO FAZ ALGO QUE A STRIPE NÃO FAZ:
//   · IN → UPI / RuPay. É o pedido do fundador, e é a razão do ciclo: cartão
//     indiano em recorrência internacional esbarra no e-mandate do RBI, e UPI
//     pela Stripe não existe para comerciante fora da Índia.
//   · BR → Pix. Métodos ativos confirmados pelo Cowork em 07/09; o Brasil tem
//     5 pessoas no checkout para 1 pagamento em 30 dias.
// Nigéria, Paquistão, Bangladesh e Quênia ficam FORA de propósito: lá o Dodo
// seria só mais um processador de cartão, e "outro processador do mesmo cartão"
// não é uma segunda porta — é a mesma porta com outra placa. Para esses quatro
// a saída continua sendo a compra ÚNICA de US$ 4,90, que já está no ar.
const METODO_LOCAL_POR_PAIS: Record<string, 'upi' | 'pix'> = {
  IN: 'upi',
  BR: 'pix',
}

export async function GET(req: NextRequest) {
  const country = (req.headers.get('x-vercel-ip-country') ?? 'US').toUpperCase()
  const currency = resolveCheckoutCurrency(country)
  const region = resolvePriceRegion(country)

  // Fecha por padrão nos dois eixos: sem chave, ou fora dos dois países, o
  // campo vem null e a tela não pinta botão nenhum.
  const local_method = isDodoEnabled() ? (METODO_LOCAL_POR_PAIS[country] ?? null) : null

  return NextResponse.json(
    { country, currency, region, local_method },
    { headers: { 'Cache-Control': 'private, no-store, max-age=0' } },
  )
}
