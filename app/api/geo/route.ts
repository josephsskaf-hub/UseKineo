import { NextRequest, NextResponse } from 'next/server'
import { resolveCheckoutCurrency, resolvePriceRegion } from '@/lib/checkoutPricing'
import { dodoMode, localMethodFor } from '@/lib/dodo'
import { resolveSettlementCurrency } from '@/lib/settlementCurrency'
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
// O mapa país→método e os dois portões moram em lib/dodo.ts (localMethodFor).
// Esta rota NÃO guarda uma segunda cópia: o painel /api/admin/payment-rails
// responde a mesma pergunta, e duas cópias divergiriam no dia em que um país
// entrasse — a tela e o painel discordariam sobre quem vê o botão.
//
// ⚠️ A CHAVE SOZINHA NÃO LIGA ISTO. As envs da Vercel entram no bundle do
// deploy que as construiu ("not applied to previous deployments, they only
// apply to new deployments"), então depois de colar DODO_API_KEY é preciso um
// deploy novo. Sem ele, este campo continua null e não há erro em lugar nenhum.

export async function GET(req: NextRequest) {
  const country = (req.headers.get('x-vercel-ip-country') ?? 'US').toUpperCase()
  const currency = resolveCheckoutCurrency(country)
  const region = resolvePriceRegion(country)

  // Fecha por padrão nos dois eixos: sem chave, ou fora dos dois países, o
  // campo vem null e a tela não pinta botão nenhum.
  // KINEO-TRILHOS-POR-PAIS-2026-09-08 (tarefa 6) — a vitrine só anuncia UPI/Pix
  // quando o trilho está AO VIVO. Em modo test o /api/dodo/checkout recusa quem
  // não é interno ("not available yet"): mostrar o botão era oferecer o que o
  // cobrador recusa. `local_method_planned` diz o que VAI existir, para a copy
  // "cartão por enquanto — Pix/UPI em breve" sem prometer data.
  // KINEO-MOEDA-LOCAL-2026-09-09 — em que moeda o checkout vai NASCER para este
  // visitante (IP + idioma). Só exibição: a linha "Charged in BRL" embaixo do
  // preço em dólar. O checkout re-resolve no servidor e ainda consulta a
  // recusa anterior de cartão BR, que esta rota não olha.
  const settlement = resolveSettlementCurrency({ ipCountry: country, acceptLanguage: req.headers.get('accept-language') })
  const planned = localMethodFor(country)
  const local_method = dodoMode() === 'live' ? planned : null
  const local_method_planned = planned

  return NextResponse.json(
    { country, currency, region, local_method, local_method_planned, rail_live: local_method !== null, settlement_currency: settlement.currency },
    { headers: { 'Cache-Control': 'private, no-store, max-age=0' } },
  )
}
