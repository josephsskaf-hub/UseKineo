// KINEO-PILOT-99-2026-07-26 — imported so the $99 pilot's credit grant is
// checked against the REAL cost of the engines the Autopilot cron is allowed
// to run, not against a number retyped here that stops being true the next
// time someone reprices an engine. Neither module imports this one, so there
// is no cycle: engineCost.ts imports nothing, autopilot/config.ts imports only
// a type from engineCost.ts.
import { creditCostFor } from '@/lib/credits/engineCost'
import { AUTOPILOT_ALLOWED_ENGINES, AUTOPILOT_PILOT_DAYS } from '@/lib/autopilot/config'

export type CheckoutTier = 'starter' | 'basic' | 'pro'
// KINEO-AUTOPILOT-299-2026-07-26 — Autopilot is a fourth PAID plan, but it is
// deliberately NOT folded into CheckoutTier. CheckoutTier is consumed by
// Record<CheckoutTier, …> maps outside this module (lib/kineoFacts.ts) that
// describe the three self-serve credit plans; widening it there would be a lie
// (Autopilot is a done-for-you service, not a credit bundle) as well as a
// compile break. Anything that must accept all four uses CheckoutPlanTier.
export type CheckoutPlanTier = CheckoutTier | 'autopilot'
export type CheckoutIntroTier = 'starter' | 'basic'
export type CheckoutCurrency = 'usd' | 'brl' | 'inr'

// Single price source for the server-authoritative Stripe route and every
// checkout-facing display. Amounts are in cents, centavos, or paise.
export const TIER_PRICES: Record<CheckoutTier, Record<CheckoutCurrency, number>> = {
  starter: { usd: 990, brl: 4990, inr: 79900 },
  basic: { usd: 2490, brl: 9990, inr: 159900 },
  pro: { usd: 3790, brl: 18990, inr: 299900 },
}

// KINEO-AUTOPILOT-299-2026-07-26 — $299/mo done-for-you tier. BRL/INR follow
// the same multipliers the rest of the ladder already uses (BRL ≈ 5.0x USD,
// INR ≈ 81x USD) so the three storefronts stay internally consistent.
export const AUTOPILOT_PRICES: Record<CheckoutCurrency, number> = {
  usd: 29900, brl: 149900, inr: 2419900,
}

// ═══════════════════════════════════════════════════════════════════════════
// KINEO-PILOT-99-2026-07-26 — THE $99 AUTOPILOT PILOT (one-time, 7 days).
// ═══════════════════════════════════════════════════════════════════════════
// $299/month is the right price for Autopilot and the wrong ASK for a base of
// 713 signups whose entire paid history is 3 customers. The pilot is the ask
// that fits: "$99. One week. 7 Shorts published to your channel, one per day,
// at the time you pick." It is a one-time PAYMENT, not a subscription — the
// $299 upsell then becomes a decision to NOT interrupt something already
// running on the customer's own channel.
//
// The pilot is NOT a cheaper Autopilot. It is the same machine with a hard
// end date, which is why the plan it grants (autopilot_pilot) carries an
// expiry that the CRON enforces — see lib/autopilot/config.ts.
//
// BRL/INR follow the same multipliers as the rest of the ladder (BRL ≈ 5.0x,
// INR ≈ 80.8x). Do NOT let any two SKU amounts collide across currencies
// without a currency check: the webhook's value-based fallback compares
// amount_total, and topup40 is ₹49,900 while the pilot is R$499,00 — the same
// integer. Every fallback added for this SKU is currency-qualified.
export const AUTOPILOT_PILOT_PRICES: Record<CheckoutCurrency, number> = {
  usd: 9900, brl: 49900, inr: 799900,
}

// Days of Autopilot the pilot buys — and therefore the number of Shorts
// promised. Declared in lib/autopilot/config.ts (the cron reads it there) and
// re-exported here so the pricing page and the invariants below cannot drift
// from what the scheduler actually does.
export { AUTOPILOT_PILOT_DAYS }

// Credit grant. The pilot's 7 daily Shorts are produced by the cron on a
// server-clamped engine (lib/autopilot/config.ts limits Autopilot to
// 'fast' = 1 credit or 'basic_ai' = 8 credits), so the worst case the daily
// job can cost is 7 x 8 = 56 credits. 60 clears that with a little room for
// the customer to press Generate themselves without the pilot silently dying
// on 'insufficient_credits' — which, mid-pilot, reads to the buyer as "the
// product broke", not "I ran out". The invariant below machine-checks it.
export const AUTOPILOT_PILOT_CREDITS = 60

// Monthly price for ANY paid plan, including Autopilot. Prefer this over
// indexing TIER_PRICES directly when the tier can be 'autopilot'.
// KINEO-REGIONAL-PRICING-2026-08-04 — `region` é opcional e default 'standard':
// Autopilot NÃO tem preço regional, e nenhum chamador antigo muda de
// comportamento sem passar a região explicitamente.
export function monthlyPriceMinor(
  tier: CheckoutPlanTier,
  currency: CheckoutCurrency,
  region: PriceRegion = 'standard',
): number {
  return tier === 'autopilot' ? AUTOPILOT_PRICES[currency] : getTierPrice(tier, currency, region)
}

// Autopilot has no annual SKU on purpose: it is an operational commitment
// (we publish to the customer's channel every day), and a 12-month prepay on a
// service we have never run at scale is a refund liability, not revenue.
export const ANNUAL_PRICES: Record<CheckoutTier, Record<CheckoutCurrency, number>> = {
  starter: { usd: 9900, brl: 49900, inr: 799000 },
  basic: { usd: 19900, brl: 99900, inr: 1599000 },
  pro: { usd: 37900, brl: 189900, inr: 2999000 },
}

export const INTRO_PRICES: Record<CheckoutIntroTier, Record<CheckoutCurrency, number>> = {
  starter: { usd: 490, brl: 2490, inr: 39900 },
  basic: { usd: 990, brl: 4990, inr: 79900 },
}

// ═══════════════════════════════════════════════════════════════════════════
// KINEO-REGIONAL-PRICING-2026-08-04 — PREÇO REGIONAL (APROVADO PELO FUNDADOR).
// ═══════════════════════════════════════════════════════════════════════════
// MOEDA E REGIÃO SÃO COISAS DIFERENTES. `CheckoutCurrency` responde "em que
// moeda o cartão é cobrado" (BR→BRL, IN→INR, resto→USD). `PriceRegion` responde
// "quanto este mercado consegue pagar". Um nigeriano paga em USD e mora numa
// região de menor renda: sem esta separação ele só teria o preço americano.
// Por isso resolvePriceRegion() vive AO LADO de resolveCheckoutCurrency() e
// NÃO dentro dela.
//
// O QUE MUDA: só Starter e Creator (`basic`), só o mensal e o 1º mês.
//   Starter  $9.90 → $4.99   ·  Creator $24.90 → $19.90
// O QUE NÃO MUDA: Studio (`pro`), Autopilot, piloto, packs, top-ups e atacado.
// Razão do fundador: o custo do MOTOR de IA não cai por região. Studio a 200
// créditos custa até $23.40 de provider no pior caso — descontar o Studio o
// deixaria estruturalmente negativo. O desconto regional só cabe onde a margem
// aguenta, e a checagem de invariante no fim deste arquivo prova isso a cada
// import em dev.
export type PriceRegion = 'standard' | 'value'

/** Só starter e basic têm preço regional. Coincide com CheckoutIntroTier. */
export type RegionalTier = CheckoutIntroTier

// Mensalidade na região de menor renda.
//   usd 499 ($4.99) — NÃO 490. Ver a nota "COLISÃO DE VALOR" logo abaixo.
//   inr 39900 (₹399) — metade do ₹799 atual, alinhado ao novo USD.
//   brl 2490 (R$24,90) — KINEO-REGIONAL-PRICING-BR-2026-08-04. Este número era
//         o espelho do padrão (4990) enquanto a decisão sobre o Brasil estava
//         pendente. ELA VEIO: o fundador incluiu o Brasil na região `value` em
//         04/08/2026 (o dado que decidiu está no bloco de
//         VALUE_REGION_COUNTRIES). R$49,90 → R$24,90 é o MESMO corte pela
//         metade que o Starter levou em USD ($9.90 → $4.99) e em INR
//         (₹799 → ₹399) — não é uma escada nova, é a mesma escada em BRL.
export const VALUE_REGION_TIER_PRICES: Record<RegionalTier, Record<CheckoutCurrency, number>> = {
  starter: { usd: 499, brl: 2490, inr: 39900 },
  // ₹1599 ≈ $19.84 — o INR do Creator JÁ equivale ao novo preço regional em
  // dólar. Mantido igual ao padrão de propósito: não há nada a descontar.
  // KINEO-REGIONAL-PRICING-BR-2026-08-04 — o MESMO vale para o BRL: R$99,90 é
  // ≈ $19,90, ou seja, o Creator brasileiro JÁ ESTAVA no preço regional antes
  // de 'BR' entrar na lista. Entrar na região não muda nada para o Creator em
  // BRL, e isso é o correto: não existe desconto a dar sobre um preço que já é
  // o regional. No Brasil quem sente a mudança é o Starter (linha acima).
  basic: { usd: 1990, brl: 9990, inr: 159900 },
}

// ── COLISÃO DE VALOR: POR QUE $4.99 E NÃO $4.90 ────────────────────────────
// PACK_PRICES.usd é 490 (o First Pack de $4.90, mode:'payment'). O Starter
// regional é mode:'subscription' (app/api/stripe/checkout/route.ts:867) e o
// fallback por valor do webhook está atrás de `if (session.mode === 'payment')`
// (app/api/stripe/webhook/route.ts:414) — então, HOJE, 490 não colidiria de
// fato. O motivo de não usar 490 mesmo assim é mais concreto que a teoria:
//
//   Se 490 passasse a ter dois donos, ele teria de entrar em
//   AMBIGUOUS_ONE_TIME_USD_AMOUNTS para o invariante (6) parar de reclamar. E
//   o webhook, ao ver um valor dessa lista sem metadata.pack, RECUSA a sessão
//   (webhook/route.ts:~474). Isso MATARIA o fallback legado
//   `amount === 490 → PACK_CREDITS.starter`, que existe justamente para as
//   sessões de Payment Link antigas que chegam sem metadata. Trocaríamos um
//   risco hipotético por uma regressão real em quem paga $4.90 hoje.
//
// $4.99 preserva a intenção do fundador (~$4.90), não colide com nada, e é o
// que o invariante (7) machine-checka.
//
// ── E POR QUE, EM BRL, O EMPATE É ACEITO ───────────────────────────────────
// KINEO-REGIONAL-PRICING-BR-2026-08-04. PACK_PRICES.brl é 2490 (o First Pack
// brasileiro, app/api/stripe/checkout/route.ts:384) e o Starter regional em
// BRL também é 2490 — exatamente o empate que acabou de ser RECUSADO em USD.
// A decisão oposta aqui não é incoerência; é que NENHUM dos dois motivos que
// reprovaram o 490 existe em BRL:
//
//   1. O empate não é alcançável. Todo o fallback por valor do webhook está
//      dentro de `if (session.mode === 'payment')`
//      (app/api/stripe/webhook/route.ts:413), e o Starter — regional ou não —
//      é criado com `mode: 'subscription'`
//      (app/api/stripe/checkout/route.ts:896). Uma assinatura nunca entra
//      naquele bloco, então 2490 nunca chega a ser resolvido por valor.
//   2. Mesmo se entrasse, não há SKU errado a conceder. A escada de valores
//      legados escrita à mão no webhook é 900 / 1900 / 490 / 290 — 2490 não
//      está lá. O pior caso seria o log 'unexpected amount_total' e ZERO
//      créditos concedidos, não a concessão de outro produto.
//
// Em USD o 490 tem um dono legado ATIVO (`amount === 490 →
// PACK_CREDITS.starter`) que seria morto ao declarar o valor ambíguo. Não há
// equivalente em BRL: nenhuma linha do webhook lê 2490. Por isso o invariante
// (7) checa colisão só em USD — é a única moeda onde o fallback por valor tem
// entradas escritas à mão para matar.

// Primeiro mês na região de menor renda.
//
// ⚠️ O INTRO DO STARTER REGIONAL É INTENCIONALMENTE IGUAL À MENSALIDADE.
// O cupom de 1º mês é criado com amount_off = mensalidade − intro. Com o
// Starter regional em $4.99 não sobra desconto que feche a conta:
//   INTRO_CREDITS.starter = 25 créditos → pior caso $2.59 de provider.
//   Para cobrir isso o bruto precisa ser ≥ $2.99 (net $2.60). Um "1º mês por
//   $2.49" seria −$0.47 no dia 1, e um "1º mês por $3.49" seria um desconto de
//   $1.50 que não convence ninguém.
// A leitura correta é outra: NA REGIÃO, O PREÇO DE LISTA JÁ É O PREÇO DE
// ENTRADA. $4.99/mês regional == $4.90 que o resto do mundo paga só no 1º mês.
// Mesma coisa em INR: ₹399 regional == o ₹399 que era o intro padrão.
// KINEO-REGIONAL-PRICING-BR-2026-08-04 — e mesma coisa em BRL: R$24,90
// regional == o R$24,90 que era o INTRO_PRICES.starter.brl padrão. Logo
// introDiscountMinor('starter','brl','value') = 2490 − 2490 = 0, o
// `if (amountOff > 0)` do checkout pula o cupom, e nenhum cupom de valor zero
// (que a Stripe recusaria) é criado para o comprador brasileiro.
// Com intro == lista, amountOff = 0, e o checkout já pula o cupom nesse caso
// (`if (amountOff > 0)`), então nenhum cupom lixo chega à Stripe.
// hasIntroOffer() abaixo é o que as telas usam para não prometer um desconto
// que não existe.
//
// O Creator regional MANTÉM intro de verdade: $19.90 → $9.90 (amountOff 1000),
// ₹1599 → ₹799 (amountOff 80000) e — KINEO-REGIONAL-PRICING-BR-2026-08-04 —
// R$99,90 → R$49,90 (amountOff 5000, o INTRO_PRICES.basic.brl que já existia).
// Todos positivos, todos com margem (net $9.31 contra $5.18 de pior caso em 50
// créditos; o BRL é o mesmo produto vendido a ≈$9,90).
export const VALUE_REGION_INTRO_PRICES: Record<RegionalTier, Record<CheckoutCurrency, number>> = {
  starter: { usd: 499, brl: 2490, inr: 39900 },
  basic: { usd: 990, brl: 4990, inr: 79900 },
}

// Anual na região. NÃO é uma decisão de preço nova: é a MESMA razão que a
// escada padrão já pratica (anual = 10× o mensal, "2 meses grátis") aplicada
// ao número novo do fundador. Sem isto o toggle anual viraria um produto
// quebrado na região — $99/ano contra $4.99/mês (= $59.88/ano) é um "desconto"
// que custa 65% MAIS caro. O invariante (8) trava exatamente isso.
//   starter usd 4990 = 10 × 499   ·  inr 399000 = 10 × 39900
//   KINEO-REGIONAL-PRICING-BR-2026-08-04 — brl 24900 = 10 × 2490. MESMA regra,
//   aplicada ao BRL novo; não há decisão de preço nova aqui. Deixar o anual em
//   49900 seria o produto quebrado que o invariante (8) descreve: R$499/ano
//   contra R$24,90/mês (= R$298,80/ano) custaria 67% MAIS caro com o rótulo
//   "≈2 meses grátis" em cima. Isto não é hipótese — o invariante (8) FALHA
//   com 49900 aqui, e foi assim que o número foi conferido.
//   basic — igual ao padrão em todas as moedas, porque 19900 já é 10 × 1990
//   (e 99900 já é 10 × 9990, que é o BRL do Creator regional).
export const VALUE_REGION_ANNUAL_PRICES: Record<RegionalTier, Record<CheckoutCurrency, number>> = {
  starter: { usd: 4990, brl: 24900, inr: 399000 },
  basic: { usd: 19900, brl: 99900, inr: 1599000 },
}

/** true quando o tier tem tabela regional própria (starter/basic). */
export function isRegionalTier(tier: CheckoutPlanTier): tier is RegionalTier {
  return tier === 'starter' || tier === 'basic'
}

/**
 * PONTO ÚNICO de leitura da mensalidade de um tier. Todo lugar que mostrava
 * TIER_PRICES[tier][currency] direto passa por aqui. `region` tem default
 * 'standard' para que qualquer chamador não migrado continue com o
 * comportamento de hoje em vez de quebrar em silêncio.
 */
export function getTierPrice(
  tier: CheckoutTier,
  currency: CheckoutCurrency,
  region: PriceRegion = 'standard',
): number {
  if (region === 'value' && isRegionalTier(tier)) return VALUE_REGION_TIER_PRICES[tier][currency]
  return TIER_PRICES[tier][currency]
}

/** Preço do 1º mês. Ver a nota acima sobre o Starter regional. */
export function getIntroPrice(
  tier: RegionalTier,
  currency: CheckoutCurrency,
  region: PriceRegion = 'standard',
): number {
  if (region === 'value') return VALUE_REGION_INTRO_PRICES[tier][currency]
  return INTRO_PRICES[tier][currency]
}

/** Preço anual. */
export function getAnnualPrice(
  tier: CheckoutTier,
  currency: CheckoutCurrency,
  region: PriceRegion = 'standard',
): number {
  if (region === 'value' && isRegionalTier(tier)) return VALUE_REGION_ANNUAL_PRICES[tier][currency]
  return ANNUAL_PRICES[tier][currency]
}

/** amount_off do cupom de 1º mês. 0 = não existe desconto nesta combinação. */
export function introDiscountMinor(
  tier: RegionalTier,
  currency: CheckoutCurrency,
  region: PriceRegion = 'standard',
): number {
  return getTierPrice(tier, currency, region) - getIntroPrice(tier, currency, region)
}

/**
 * true = há um 1º mês REALMENTE mais barato para vender. As telas devem
 * checar isto antes de escrever "First month $X": na região `value` o Starter
 * não tem intro, e prometer um desconto inexistente é a diferença entre uma
 * página de preço e uma cobrança-surpresa.
 */
export function hasIntroOffer(
  tier: RegionalTier,
  currency: CheckoutCurrency,
  region: PriceRegion = 'standard',
): boolean {
  return introDiscountMinor(tier, currency, region) > 0
}

// ═══════════════════════════════════════════════════════════════════════════
// KINEO-PRICING-V3D-2026-07-26 — CREDIT GRANTS ARE PART OF THE PRICE.
// ═══════════════════════════════════════════════════════════════════════════
// Every grant below used to live as a magic number inside the checkout route,
// the webhook, and the marketing copy independently. They drifted (see the
// three defects fixed in this push). They are declared ONCE here and imported
// everywhere; the invariant assertions at the bottom of this file fail loudly
// in dev if a future edit reintroduces a below-cost or inverted SKU.
//
// COST BASIS (from lib/credits/engineCost.ts + the provider notes in
// app/api/generate-video-cinematic/route.ts):
//   Fast              1 credit  ≈ $0.02 – 0.05 / render  → ≤ $0.050 / credit
//   AI Gen (Seedance) 20 credits ≈ $1.56 – 2.34 / render → ≤ $0.117 / credit
//   Kling             50 credits (cost not repriced here)
//   Hollywood         150 credits ≈ $8.90 – 10.20        → ≤ $0.068 / credit
//   Avatar            110 credits ≈ $9.60                → ≤ $0.087 / credit
// Seedance is the WORST dollar-per-credit engine in the catalog at $0.117/cr.
// Worst-case COGS for a grant of N credits is therefore:
//   floor(N / 20) Seedance renders + (N mod 20) Fast renders.
export const WORST_CASE_USD_PER_CREDIT = 0.117
export const FAST_USD_PER_CREDIT = 0.05

/** Worst-case provider cost (USD) a user can extract from a grant of N credits. */
export function worstCaseCogsUsd(credits: number): number {
  const seedanceRenders = Math.floor(credits / 20)
  const leftoverFast = credits % 20
  return seedanceRenders * 20 * WORST_CASE_USD_PER_CREDIT + leftoverFast * FAST_USD_PER_CREDIT
}

/** Stripe standard card pricing: 2.9% + $0.30. USD only — used for margin math. */
export function netAfterStripeUsd(grossUsd: number): number {
  return grossUsd * 0.971 - 0.30
}

// Recurring monthly credit grant per paid plan. Autopilot's 400 is sized so a
// daily Short (30 Fast renders = 30 credits) leaves the customer plenty of
// manual headroom without ever letting the plan go underwater: even if all 400
// were burned on Seedance the COGS is $46.80 against ~$290 net.
export const TIER_CREDITS: Record<CheckoutPlanTier, number> = {
  starter: 25,
  basic: 150,
  pro: 200,
  autopilot: 400,
}

// KINEO-PRICING-V3D-2026-07-26 — DEFECT (b). The intro coupon sells the FIRST
// month of Creator for $9.90 (net $9.31) but used to hand over the full 150
// credits. 150 credits buys 7 Seedance renders + 10 Fast = $16.88 of provider
// spend, i.e. −$7.57 on month one, and it also puts a 150-credit Hollywood
// render ($8.90–10.20) in reach for $9.90. The intro month now grants 50
// credits: worst case 2 Seedance + 10 Fast = $5.18, leaving +$4.13 (44%), and
// Hollywood/Avatar/Veo/Sora are all structurally out of reach.
// APPLIES TO THE FIRST INVOICE ONLY — renewals grant TIER_CREDITS.
export const INTRO_CREDITS: Record<CheckoutIntroTier, number> = {
  starter: 25,
  basic: 50,
}

// KINEO-PRICING-V3D-2026-07-26 — DEFECT (a). The entry packs used to grant 10
// credits. 10 credits does buy 10 Fast videos (Fast = 1 credit for a paying
// account), so the copy was not lying — but the cheapest GENERATIVE engine
// (Seedance) costs 20, so the first dollar a customer ever spent with us
// bought exactly zero AI videos. Both packs now clear that bar.
//   $2.90 → net $2.516; 20 cr = 1 Seedance ($2.34)            → +$0.18 (7.0%)
//   $4.90 → net $4.458; 30 cr = 1 Seedance + 10 Fast ($2.84)  → +$1.62 (36.3%)
// NOTE FOR THE NEXT PERSON: "two or three AI videos for $4.90" is arithmetically
// impossible. 40 credits = 2 Seedance = $4.68 worst case, which is −$0.22 on a
// $4.90 sale. 30 is the ceiling at this price point.
export const PACK_CREDITS = {
  /** ?pack=starter — the $4.90 First Pack. */
  starter: 30,
  /** ?pack=starter290 — the dormant $2.90 offer (lib/flags.ts OFFER_290_ENABLED). */
  starter290: 20,
} as const

// KINEO-PRICING-V3D-2026-07-26 — DEFECT (c). Top-ups are sold ONLY to existing
// subscribers, so they must cost MORE per credit than the subscription they sit
// on top of; otherwise the rational move for a Creator/Studio subscriber is to
// buy the plan once and then top up forever, and we sell credits below our own
// cheapest shelf price. That invariant was inverted:
//   Creator  $24.90 / 150 = $0.1660 / cr
//   Studio   $37.90 / 200 = $0.1895 / cr   ← cheapest paid plan per credit
//   topup40  $5.90  /  40 = $0.1475 / cr   ← BELOW both
//   topup120 $12.90 / 120 = $0.1075 / cr   ← BELOW both, by 35%
// The SKU IDS ARE PRESERVED — they are the ?pack= URL keys and appear in
// GenerateClient. The grants shrink to restore the invariant:
//   topup40  $5.90  / 30 = $0.1967 / cr  (+3.8% vs Studio, +18.5% vs Creator)
//   topup120 $12.90 / 65 = $0.1985 / cr  (+4.8% vs Studio, +19.6% vs Creator)
// Worst-case margins: +$2.59 (48%) and +$4.96 (41%).
export const TOPUP_CREDITS = {
  topup40: 30,
  topup120: 65,
  // KINEO-TOPUP100-2026-08-17 (aprovado): o pacote-ancora — 100 creditos
  // (5 AI videos) por \$14.90 = \$0.149/cr. Efeito Goldilocks: o topup120
  // (65cr por \$12.90) vira decoy; +\$2 compra +35cr. Margem ~80% (COGS
  // ~\$0.03/cr). Segue 43% acima do \$/cr do Creator — nunca canibaliza a
  // assinatura.
  topup100: 100,
} as const

export type TopupId = keyof typeof TOPUP_CREDITS

// ═══════════════════════════════════════════════════════════════════════════
// KINEO-BULK-2026-07-27 — PACOTES DE ATACADO. Escada APROVADA pelo fundador em
// 27/07/2026 (docs/DECISIONS.md). Preços NÃO negociáveis aqui.
// ═══════════════════════════════════════════════════════════════════════════
// Por que existem: 713 cadastros produziram 4 compras avulsas e ZERO assinaturas
// recorrentes em ~3 meses. O ICP que paga quer vídeo pronto, não ferramenta.
// A escada $7,58–$9,90 por vídeo cai dentro da faixa de editor humano iniciante
// ($5–20/Short) praticada hoje em Fiverr/Upwork/Kwork — a primeira vez que o
// preço da Kineo coincide com um mercado que já transaciona.
//
// ── SÓ USD, DE PROPÓSITO ───────────────────────────────────────────────────
// Os outros SKUs têm preço em BRL e INR. Estes não. O fundador aprovou QUATRO
// números, em dólar. Inventar multiplicadores de BRL/INR para um SKU de atacado
// seria eu definindo preço, o que não é decisão de Development (AGENTS.md §7).
// Um comprador fora dos EUA paga em USD — o Stripe cobra normalmente. Se um dia
// houver demanda medida por moeda local, é o fundador quem escreve os números.
//
// ── FOLGA DE CRÉDITO: +20%, MÍNIMO +2 ──────────────────────────────────────
// Fast custa 1 crédito para conta paga (creditCostFor('fast', true)), e o
// webhook marca has_paid=true nesta mesma compra. Então "10 vídeos" seriam 10
// créditos exatos — e é aí que mora o problema.
//
// Um render que trava NÃO devolve o crédito na hora. O reembolso ao vivo cobre
// as falhas terminais, mas o caso "travado" só é varrido por
// sweepStuckRenderDebits(), que roda uma vez por dia (app/api/cron/refund-sweep).
// Com crédito exato, UM render travado deixa o comprador de "10 vídeos" parado
// no nono por até 24h. Ele não lê isso como "o sistema vai me reembolsar", lê
// como "paguei 10 e recebi 9".
//
// É o mesmo raciocínio, e a mesma justificativa, de AUTOPILOT_PILOT_CREDITS = 60
// para um pior caso de 56: a folga não é generosidade, é o que impede a promessa
// de quebrar por aritmética. Aqui ela é barata — cada crédito extra vale $0,05
// em Fast, e a checagem de margem no fim deste arquivo cobre o caso em que o
// comprador gasta a folga inteira no motor MAIS CARO do catálogo.
//
// ⚠️ Crédito é UNIVERSAL: nada impede o comprador de gastar em Seedance (20 cr)
// em vez de Fast (1 cr). A partir de bulk20 a folga sozinha já compra 1 vídeo de
// IA. Isso é escolha do cliente e a margem aguenta (ver invariante 5), mas é uma
// decisão de produto que vale revisitar se o atacado virar o carro-chefe.
export type BulkPackId = 'bulk10' | 'bulk20' | 'bulk30' | 'bulk50'

/** Folga sobre o número de vídeos vendido. Ver o bloco acima. */
export const BULK_HEADROOM_RATIO = 0.2

/** Créditos concedidos por um pacote de N vídeos Fast, já com a folga. */
export function bulkCreditsFor(videos: number): number {
  return videos + Math.max(2, Math.ceil(videos * BULK_HEADROOM_RATIO))
}

export const BULK_PACKS: Record<BulkPackId, {
  /** Número de vídeos Fast vendido — é o que a copy promete. */
  videos: number
  /** Preço em centavos de dólar. APROVADO pelo fundador; não altere. */
  usdMinor: number
  /** Créditos concedidos = videos + folga. */
  credits: number
}> = {
  bulk10: { videos: 10, usdMinor: 9900, credits: bulkCreditsFor(10) },
  bulk20: { videos: 20, usdMinor: 17900, credits: bulkCreditsFor(20) },
  bulk30: { videos: 30, usdMinor: 24900, credits: bulkCreditsFor(30) },
  bulk50: { videos: 50, usdMinor: 37900, credits: bulkCreditsFor(50) },
}

export const BULK_PACK_IDS = Object.keys(BULK_PACKS) as BulkPackId[]

export function isBulkPackId(raw: string | null | undefined): raw is BulkPackId {
  return typeof raw === 'string' && Object.prototype.hasOwnProperty.call(BULK_PACKS, raw)
}

// ═══════════════════════════════════════════════════════════════════════════
// KINEO-BULK-2026-07-27 — COLISÃO DE VALOR ENTRE SKUs ONE-TIME.
// ═══════════════════════════════════════════════════════════════════════════
// O webhook tem um fallback POR VALOR para sessões que perderam a metadata
// (app/api/stripe/webhook/route.ts, Path A). Esse fallback só é seguro enquanto
// o valor identificar UM único SKU dentro da moeda.
//
// O atacado quebra isso: bulk10 custa $99, e AUTOPILOT_PILOT_PRICES.usd também
// é 9900. Os dois são mode:'payment' e os dois chegam ao mesmo bloco. Sem uma
// trava, uma sessão de bulk10 que perdesse a metadata cairia no fallback do
// piloto e sairia com plan='autopilot_pilot' — um plano de $299/mês entregue
// por um pacote de 10 vídeos.
//
// (ANNUAL_PRICES.starter.usd também é 9900 e ANNUAL_PRICES.pro.usd é 37900,
// iguais a bulk10 e bulk50. Hoje o anual é mode:'subscription' e nunca alcança
// o Path A — mas o comentário do webhook já avisava que isso é uma bomba-relógio
// se o anual virar pagamento único. Por isso os anuais entram na conta abaixo.)
//
// Esta lista é o contrato entre o preço e o webhook: para QUALQUER valor aqui,
// o webhook resolve SÓ por metadata.pack exata e NUNCA por valor.
export const AMBIGUOUS_ONE_TIME_USD_AMOUNTS: ReadonlySet<number> = new Set([9900, 37900])

/** true = este valor em USD não identifica um SKU sozinho. */
export function isAmbiguousOneTimeUsdAmount(amountMinor: number, currency: string | null | undefined): boolean {
  if ((currency ?? 'usd').toLowerCase().trim() !== 'usd') return false
  return AMBIGUOUS_ONE_TIME_USD_AMOUNTS.has(amountMinor)
}

/** USD price per credit of a recurring plan. Lower = better value for the user. */
export function planUsdPerCredit(tier: CheckoutPlanTier, region: PriceRegion = 'standard'): number {
  return monthlyPriceMinor(tier, 'usd', region) / 100 / TIER_CREDITS[tier]
}

/**
 * The cheapest per-credit rate any subscriber can get from a recurring plan.
 * Autopilot is excluded: its credits are a byproduct of a managed service, not
 * the thing being sold, and including it would make the floor meaningless.
 * Every top-up must price ABOVE this number.
 *
 * KINEO-REGIONAL-PRICING-2026-08-04 — a região `value` entra no cálculo. Os
 * top-ups NÃO têm preço regional, então o Creator regional ($19.90 / 150 cr =
 * $0.1327/cr) é agora o piso real do produto inteiro. Se um dia um top-up
 * descer abaixo disso, um assinante de país de menor renda passaria a comprar
 * crédito avulso mais barato que a própria assinatura — o invariante (1)
 * detecta isso porque este mínimo enxerga as duas regiões.
 */
export const CHEAPEST_PLAN_USD_PER_CREDIT: number = Math.min(
  planUsdPerCredit('starter'),
  planUsdPerCredit('basic'),
  planUsdPerCredit('pro'),
  planUsdPerCredit('starter', 'value'),
  planUsdPerCredit('basic', 'value'),
)

export const CURRENCY_DISPLAY: Record<CheckoutCurrency, {
  locale: string
  currencyCode: string
  label: string
}> = {
  usd: { locale: 'en-US', currencyCode: 'USD', label: 'USD' },
  brl: { locale: 'pt-BR', currencyCode: 'BRL', label: 'BRL' },
  inr: { locale: 'en-IN', currencyCode: 'INR', label: 'INR' },
}

export function resolveCheckoutCurrency(country: string | null | undefined): CheckoutCurrency {
  const normalized = String(country || '').toUpperCase()
  return normalized === 'BR' ? 'brl' : normalized === 'IN' ? 'inr' : 'usd'
}

// ═══════════════════════════════════════════════════════════════════════════
// KINEO-REGIONAL-PRICING-2026-08-04 — PAÍSES DA REGIÃO DE MENOR RENDA.
// ═══════════════════════════════════════════════════════════════════════════
// COMO ESTA LISTA FOI ESCOLHIDA (o fundador aprovou o critério, não os ISOs um
// a um): interseção de DUAS coisas, nesta ordem —
//   1. BASE DE USUÁRIOS MEDIDA. São os países de onde os 713 cadastros já
//      chegam em volume e onde o funil morre no preço, não no produto. Cortar
//      preço num país sem tráfego não gera venda; gera só desconto para quem
//      já ia pagar.
//   2. RENDA. Todos são economias de renda baixa/média-baixa a média (faixa do
//      Banco Mundial), onde $9.90/mês é uma fração relevante da renda diária.
// A lista é DELIBERADAMENTE curta. Cada país aqui é receita cortada pela
// metade no Starter; ampliar é decisão do fundador, não de manutenção.
//
// ✅ 'BR' ENTROU — DECIDIDO PELO FUNDADOR EM 04/08/2026.
// KINEO-REGIONAL-PRICING-BR-2026-08-04. A versão anterior deste comentário
// dizia que a decisão sobre o Brasil estava PENDENTE. Não está mais.
//
// O DADO QUE DECIDIU: o Brasil é o 4º maior país da base — 59 usuários, 14
// cadastros novos nos últimos 14 dias. Tráfego real, e crescendo. Contra isso:
// ativação de apenas 20,3% e ZERO pagantes, com UM único checkout aberto em
// toda a história do país. Volume alto com conversão zero é a assinatura de um
// funil que morre no PREÇO e não no produto — que é literalmente o critério
// (1) desta lista. R$49,90/mês por um app que o comprador ainda não sabe se
// funciona é um pedido grande no Brasil; R$24,90 é o pedido que cabe.
//
// O QUE MUDA NA PRÁTICA: só o Starter, R$49,90 → R$24,90 (e o anual, 10×).
// O Creator NÃO muda: R$99,90 ≈ $19,90 JÁ era o preço regional. Studio,
// Autopilot, piloto, packs, top-ups e atacado seguem intocados, pelo mesmo
// motivo de margem descrito no topo deste arquivo.
//
// ⚠️ O RISCO QUE O FUNDADOR ACEITOU, ESCRITO PARA NÃO SER ESQUECIDO: se os 59
// brasileiros não convertem a R$49,90, é possível que também não convertam a
// R$24,90 — e nesse caso cortamos pela metade a receita futura de um país sem
// ter provado a hipótese. O experimento é barato só ENQUANTO a receita
// brasileira for zero, que é o caso hoje. Se em ~30 dias o Brasil continuar em
// 0 pagante, a conclusão é que o preço não era a causa: remover 'BR' desta
// lista é uma linha, e os números BRL acima voltam a ser letra morta sem
// quebrar nada.
export const VALUE_REGION_COUNTRIES: ReadonlySet<string> = new Set([
  'BR', // Brasil — entrou em 04/08/2026; ver o bloco acima
  'IN', // Índia
  'NG', // Nigéria
  'PK', // Paquistão
  'ZA', // África do Sul
  'BD', // Bangladesh
  'ID', // Indonésia
  'PH', // Filipinas
  'VN', // Vietnã
  'EG', // Egito
  'KE', // Quênia
  'GH', // Gana
  'LK', // Sri Lanka
  'NP', // Nepal
  'TZ', // Tanzânia
  'UG', // Uganda
  'MA', // Marrocos
  'DZ', // Argélia
])

/**
 * Região de preço a partir do país do IP (`x-vercel-ip-country`).
 *
 * Mora AO LADO de resolveCheckoutCurrency, não dentro: um comprador nigeriano
 * é cobrado em USD (moeda) e paga o preço regional (região). Fundir as duas
 * resoluções tornaria impossível descrever esse caso.
 *
 * País desconhecido/ausente → 'standard' (fail-safe: na dúvida, preço cheio;
 * o erro caro é dar desconto a quem pagaria integral, não o contrário).
 * O servidor SEMPRE re-resolve isto no /api/stripe/checkout — o navegador
 * nunca escolhe a própria região, do mesmo jeito que nunca escolhe a moeda.
 */
export function resolvePriceRegion(country: string | null | undefined): PriceRegion {
  const normalized = String(country || '').toUpperCase().trim()
  return VALUE_REGION_COUNTRIES.has(normalized) ? 'value' : 'standard'
}

/** Narrowing para valores vindos da rede (/api/geo) — nunca confia no browser. */
export function coercePriceRegion(raw: string | null | undefined): PriceRegion {
  return raw === 'value' ? 'value' : 'standard'
}

export function formatCheckoutMoney(currency: CheckoutCurrency, amountMinor: number): string {
  const config = CURRENCY_DISPLAY[currency]
  const fractionDigits = currency === 'inr' ? 0 : 2
  return new Intl.NumberFormat(config.locale, {
    style: 'currency',
    currency: config.currencyCode,
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(amountMinor / 100).replace(/\u00a0/g, ' ')
}

// ═══════════════════════════════════════════════════════════════════════════
// INVARIANTS — checked at import time in dev/test, never in production.
// ═══════════════════════════════════════════════════════════════════════════
// The three defects this push fixed were all "a comment asserted an invariant
// that the numbers stopped satisfying". A comment cannot fail. These can.
export function checkPricingInvariants(): string[] {
  const problems: string[] = []

  // (1) Every top-up costs MORE per credit than the cheapest recurring plan.
  for (const id of Object.keys(TOPUP_CREDITS) as TopupId[]) {
    const usd = TOPUP_USD_PRICES[id] / 100
    const perCredit = usd / TOPUP_CREDITS[id]
    if (perCredit <= CHEAPEST_PLAN_USD_PER_CREDIT) {
      problems.push(
        `${id} is $${perCredit.toFixed(4)}/credit, at or below the cheapest plan rate ` +
        `($${CHEAPEST_PLAN_USD_PER_CREDIT.toFixed(4)}/credit). Top-ups must cost MORE.`,
      )
    }
  }

  // (2) Every one-time entry pack buys at least one real AI video (20 credits)
  //     and still nets positive against worst-case provider cost.
  const packSkus: Array<{ id: string; usdMinor: number; credits: number }> = [
    { id: 'pack:starter', usdMinor: 490, credits: PACK_CREDITS.starter },
    { id: 'pack:starter290', usdMinor: 290, credits: PACK_CREDITS.starter290 },
  ]
  for (const sku of packSkus) {
    if (sku.credits < 20) {
      problems.push(`${sku.id} grants ${sku.credits} credits — below the 20 needed for one AI video.`)
    }
    const net = netAfterStripeUsd(sku.usdMinor / 100)
    if (net - worstCaseCogsUsd(sku.credits) < 0) {
      problems.push(`${sku.id} is below cost in the worst case (net $${net.toFixed(2)} vs COGS $${worstCaseCogsUsd(sku.credits).toFixed(2)}).`)
    }
  }

  // (3) Every recurring plan — and the discounted intro month — survives a
  //     customer who spends the entire grant on the worst engine available.
  const recurring: Array<{ id: string; usdMinor: number; credits: number }> = [
    { id: 'plan:starter', usdMinor: TIER_PRICES.starter.usd, credits: TIER_CREDITS.starter },
    { id: 'plan:basic', usdMinor: TIER_PRICES.basic.usd, credits: TIER_CREDITS.basic },
    { id: 'plan:pro', usdMinor: TIER_PRICES.pro.usd, credits: TIER_CREDITS.pro },
    { id: 'plan:autopilot', usdMinor: AUTOPILOT_PRICES.usd, credits: TIER_CREDITS.autopilot },
    { id: 'intro:starter', usdMinor: INTRO_PRICES.starter.usd, credits: INTRO_CREDITS.starter },
    { id: 'intro:basic', usdMinor: INTRO_PRICES.basic.usd, credits: INTRO_CREDITS.basic },
    // KINEO-REGIONAL-PRICING-2026-08-04 — a região `value` leva EXATAMENTE o
    // mesmo teste. É o ponto do arquivo onde um desconto regional generoso
    // demais aparece como número, não como opinião: o Creator regional
    // ($19.90 / 150 créditos) sobrevive por +$2.14 (11%) no pior caso, que é a
    // margem mais fina de todo o catálogo. Uma reprecificação de motor que
    // suba WORST_CASE_USD_PER_CREDIT de $0.117 para ~$0.135 apaga essa folga —
    // e é aqui que isso vai gritar, antes de virar prejuízo.
    { id: 'plan:starter/value', usdMinor: getTierPrice('starter', 'usd', 'value'), credits: TIER_CREDITS.starter },
    { id: 'plan:basic/value', usdMinor: getTierPrice('basic', 'usd', 'value'), credits: TIER_CREDITS.basic },
    { id: 'intro:starter/value', usdMinor: getIntroPrice('starter', 'usd', 'value'), credits: INTRO_CREDITS.starter },
    { id: 'intro:basic/value', usdMinor: getIntroPrice('basic', 'usd', 'value'), credits: INTRO_CREDITS.basic },
  ]
  for (const sku of recurring) {
    const net = netAfterStripeUsd(sku.usdMinor / 100)
    const cogs = worstCaseCogsUsd(sku.credits)
    if (net - cogs < 0) {
      problems.push(`${sku.id} is below cost in the worst case (net $${net.toFixed(2)} vs COGS $${cogs.toFixed(2)}).`)
    }
  }

  // (4) KINEO-PILOT-99-2026-07-26 — the $99 / 7-day Autopilot pilot.
  // Three separate ways this SKU can quietly become a loss, all checked:
  //   (4a) the grant must survive the cron itself. The pilot PROMISES 7
  //        published Shorts; if the credit grant cannot pay for 7 renders on
  //        the most expensive engine the server allows Autopilot to use, the
  //        pilot dies on 'insufficient_credits' somewhere around day 4 and we
  //        have taken $99 for a broken promise. This is the invariant that a
  //        future engine reprice is most likely to break, silently.
  //   (4b) the whole grant, spent on the worst engine in the catalog, must
  //        still net positive — same test every other SKU gets.
  //   (4c) the pilot must not be a cheaper way to buy the $299 tier. Per day
  //        it has to cost MORE than the monthly plan does per day, or the
  //        rational move is to re-buy the pilot forever instead of upgrading.
  const pilotWorstEngineCost = Math.max(
    ...AUTOPILOT_ALLOWED_ENGINES.map((engine) => creditCostFor(engine, true)),
  )
  const pilotRunCredits = pilotWorstEngineCost * AUTOPILOT_PILOT_DAYS
  if (pilotRunCredits > AUTOPILOT_PILOT_CREDITS) {
    problems.push(
      `pilot:autopilot grants ${AUTOPILOT_PILOT_CREDITS} credits but its own ${AUTOPILOT_PILOT_DAYS} ` +
      `scheduled Shorts cost up to ${pilotRunCredits} (${pilotWorstEngineCost}/render on the most ` +
      `expensive Autopilot-allowed engine). The pilot would run out before it delivers what it sold.`,
    )
  }
  const pilotNet = netAfterStripeUsd(AUTOPILOT_PILOT_PRICES.usd / 100)
  const pilotCogs = worstCaseCogsUsd(AUTOPILOT_PILOT_CREDITS)
  if (pilotNet - pilotCogs < 0) {
    problems.push(
      `pilot:autopilot is below cost in the worst case (net $${pilotNet.toFixed(2)} vs COGS $${pilotCogs.toFixed(2)}).`,
    )
  }
  const pilotUsdPerDay = AUTOPILOT_PILOT_PRICES.usd / 100 / AUTOPILOT_PILOT_DAYS
  const autopilotUsdPerDay = AUTOPILOT_PRICES.usd / 100 / 30
  if (pilotUsdPerDay <= autopilotUsdPerDay) {
    problems.push(
      `pilot:autopilot costs $${pilotUsdPerDay.toFixed(2)}/day, at or below the $299 plan's ` +
      `$${autopilotUsdPerDay.toFixed(2)}/day. A trial must never be the cheap way to buy the product.`,
    )
  }

  // (5) KINEO-BULK-2026-07-27 — os quatro pacotes de atacado.
  //   (5a) a folga precisa existir de verdade: o pacote tem de conceder MAIS
  //        crédito do que os vídeos que promete, senão um único render travado
  //        (reembolsado só na varredura diária) deixa o comprador sem o último
  //        vídeo que pagou;
  //   (5b) preço por vídeo estritamente DECRESCENTE conforme o pacote cresce —
  //        é a única coisa que faz "atacado" significar alguma coisa. Um reprice
  //        que inverta isso torna o pacote maior um mau negócio, em silêncio;
  //   (5c) o teste de margem que todo SKU leva: o grant inteiro gasto no pior
  //        motor do catálogo ainda tem de sobrar dinheiro. Crédito é universal,
  //        então "é só Fast" NÃO é uma proteção — é uma expectativa.
  let previousUsdPerVideo = Number.POSITIVE_INFINITY
  for (const id of BULK_PACK_IDS) {
    const pack = BULK_PACKS[id]

    if (pack.credits <= pack.videos) {
      problems.push(
        `bulk:${id} grants ${pack.credits} credits for ${pack.videos} videos — no headroom. ` +
        `One stuck render (refunded only by the daily sweep) leaves the buyer short of what they paid for.`,
      )
    }

    const usdPerVideo = pack.usdMinor / 100 / pack.videos
    if (usdPerVideo >= previousUsdPerVideo) {
      problems.push(
        `bulk:${id} costs $${usdPerVideo.toFixed(2)}/video, at or above the smaller pack's ` +
        `$${previousUsdPerVideo.toFixed(2)}/video. A wholesale ladder must get cheaper per unit as it grows.`,
      )
    }
    previousUsdPerVideo = usdPerVideo

    const net = netAfterStripeUsd(pack.usdMinor / 100)
    const cogs = worstCaseCogsUsd(pack.credits)
    if (net - cogs < 0) {
      problems.push(`bulk:${id} is below cost in the worst case (net $${net.toFixed(2)} vs COGS $${cogs.toFixed(2)}).`)
    }
  }

  // (6) KINEO-BULK-2026-07-27 — colisão de valor entre SKUs one-time.
  // O webhook resolve sessões sem metadata POR VALOR. Isso só é seguro enquanto
  // o valor identificar um SKU único. Esta checagem calcula as colisões reais e
  // exige que cada uma esteja declarada em AMBIGUOUS_ONE_TIME_USD_AMOUNTS — a
  // lista que o webhook consulta para se recusar a adivinhar. Uma colisão NOVA
  // (o próximo reprice) aparece aqui em vez de virar uma concessão errada.
  const usdAmountOwners = new Map<number, string[]>()
  const claim = (amount: number, sku: string) => {
    const owners = usdAmountOwners.get(amount) ?? []
    owners.push(sku)
    usdAmountOwners.set(amount, owners)
  }
  claim(490, 'pack:starter')
  claim(290, 'pack:starter290')
  claim(TOPUP_USD_PRICES.topup40, 'topup40')
  claim(TOPUP_USD_PRICES.topup100, 'topup100')
  claim(TOPUP_USD_PRICES.topup120, 'topup120')
  claim(AUTOPILOT_PILOT_PRICES.usd, 'pilot:autopilot')
  for (const id of BULK_PACK_IDS) claim(BULK_PACKS[id].usdMinor, `bulk:${id}`)
  // Os anuais são mode:'subscription' HOJE e não alcançam o Path A do webhook.
  // Entram assim mesmo: o dia em que alguém os transformar em pagamento único,
  // esta checagem é o que avisa antes de o dinheiro entrar errado.
  for (const tier of Object.keys(ANNUAL_PRICES) as CheckoutTier[]) {
    claim(ANNUAL_PRICES[tier].usd, `annual:${tier}`)
  }
  // KINEO-REGIONAL-PRICING-2026-08-04 — o anual regional entra pelo MESMO
  // motivo defensivo dos anuais acima. Só é reivindicado quando difere do
  // padrão: quando é o mesmo número (basic/value = 19900 = basic), é o mesmo
  // preço do mesmo SKU e reivindicar duas vezes produziria uma colisão falsa
  // que esconderia as verdadeiras.
  for (const tier of ['starter', 'basic'] as RegionalTier[]) {
    const valueAnnual = VALUE_REGION_ANNUAL_PRICES[tier].usd
    if (valueAnnual !== ANNUAL_PRICES[tier].usd) claim(valueAnnual, `annual:${tier}/value`)
  }

  for (const [amount, owners] of usdAmountOwners) {
    if (owners.length > 1 && !AMBIGUOUS_ONE_TIME_USD_AMOUNTS.has(amount)) {
      problems.push(
        `USD amount ${amount} is claimed by ${owners.length} SKUs (${owners.join(', ')}) but is NOT in ` +
        `AMBIGUOUS_ONE_TIME_USD_AMOUNTS. The webhook's amount fallback would grant one of them at random.`,
      )
    }
  }
  for (const amount of AMBIGUOUS_ONE_TIME_USD_AMOUNTS) {
    if ((usdAmountOwners.get(amount) ?? []).length <= 1) {
      problems.push(
        `USD amount ${amount} is listed in AMBIGUOUS_ONE_TIME_USD_AMOUNTS but only one SKU claims it. ` +
        `Stale entries block a legitimate amount fallback — remove it.`,
      )
    }
  }

  // (7) KINEO-REGIONAL-PRICING-2026-08-04 — o preço regional NÃO pode empatar
  // com nenhum SKU de compra única em USD.
  //
  // Hoje isso é redundante: o Path A do webhook está atrás de
  // `session.mode === 'payment'` e toda assinatura é mode:'subscription'. Mas
  // a redundância é exatamente o ponto — o preço regional é o número mais
  // provável de ser mexido a próximo (o fundador vai testar $3.99, $5.99…), e
  // o mode gate é uma propriedade de RUNTIME de outro arquivo. Se alguém
  // escolher $4.90 aqui, o conserto não é "adicionar 490 à lista de ambíguos":
  // isso mataria o fallback legado `amount === 490 → PACK_CREDITS.starter` das
  // sessões de Payment Link antigas. O conserto é escolher outro preço, e esta
  // mensagem diz isso.
  const regionalUsdAmounts: Array<{ id: string; amount: number }> = []
  for (const tier of ['starter', 'basic'] as RegionalTier[]) {
    regionalUsdAmounts.push({ id: `plan:${tier}/value`, amount: getTierPrice(tier, 'usd', 'value') })
    regionalUsdAmounts.push({ id: `intro:${tier}/value`, amount: getIntroPrice(tier, 'usd', 'value') })
  }
  for (const { id, amount } of regionalUsdAmounts) {
    const owners = (usdAmountOwners.get(amount) ?? []).filter((o) => o !== id)
    if (owners.length > 0) {
      problems.push(
        `${id} is USD ${amount}, the same amount as one-time SKU(s) ${owners.join(', ')}. ` +
        `Pick a different regional price — do NOT add it to AMBIGUOUS_ONE_TIME_USD_AMOUNTS, ` +
        `that would disable the legacy amount fallback those SKUs depend on.`,
      )
    }
  }

  // (8) KINEO-REGIONAL-PRICING-2026-08-04 — o anual tem de valer a pena DENTRO
  // da própria região e da própria moeda.
  //
  // Sem isto, o preço regional cria um produto quebrado em silêncio: o Starter
  // regional custa $4.99/mês ($59.88/ano) e o anual continuaria em $99 — 65%
  // MAIS caro que pagar mês a mês, com o rótulo "2 meses grátis" em cima. O
  // comprador que confia no rótulo é punido por confiar.
  // A checagem é por (região × moeda) porque as três moedas têm escadas
  // próprias e um reprice quase sempre mexe em uma só.
  for (const region of ['standard', 'value'] as PriceRegion[]) {
    for (const currency of Object.keys(CURRENCY_DISPLAY) as CheckoutCurrency[]) {
      for (const tier of Object.keys(TIER_PRICES) as CheckoutTier[]) {
        const annual = getAnnualPrice(tier, currency, region)
        const twelveMonths = getTierPrice(tier, currency, region) * 12
        if (annual >= twelveMonths) {
          problems.push(
            `annual:${tier} in ${currency}/${region} costs ${annual}, at or above 12 monthly ` +
            `payments (${twelveMonths}). The annual toggle would sell a WORSE deal while the UI ` +
            `says "≈2 months free".`,
          )
        }
      }
    }
  }

  return problems
}

// ═══════════════════════════════════════════════════════════════════════════
// KINEO-TOPUP-CURRENCY-2026-08-12 — PREÇO DOS TOP-UPS, POR MOEDA, AQUI.
// ═══════════════════════════════════════════════════════════════════════════
// Estes números viviam SÓ em `CREDIT_TOPUPS.prices` dentro de
// app/api/stripe/checkout/route.ts (server), e o modal de upgrade em
// app/(dashboard)/generate/GenerateClient.tsx imprimia '$5.90'/'$12.90'
// DIGITADOS À MÃO. Resultado em produção: um assinante brasileiro via a linha
// de plano em R$ (correta, vem daqui) e, doze pixels abaixo, o top-up em US$ —
// DUAS MOEDAS NA MESMA TELA, e a de baixo era falsa: topup40 é R$ 29,90, não
// "$5.90"; topup120 é R$ 64,90, não "$12.90".
//
// O comentário do próprio repo já nomeava a causa-raiz ("Copiar número de preço
// à mão é exatamente a causa-raiz dos três defeitos de precificação que
// acabamos de consertar") — e a linha logo abaixo dele copiava dois preços à
// mão. Por isso a correção NÃO é retypar em BRL/INR no componente: é mover a
// tabela para a fonte única e fazer a rota da Stripe LER daqui.
//
// NENHUM PREÇO MUDA NESTE COMMIT. Os seis valores abaixo são cópia byte a byte
// de CREDIT_TOPUPS.prices, que continua sendo quem cobra — a rota agora
// importa em vez de declarar.
export const TOPUP_PRICES: Record<TopupId, Record<CheckoutCurrency, number>> = {
  topup40: { usd: 590, brl: 2990, inr: 49900 },
  topup100: { usd: 1490, brl: 7490, inr: 124900 },
  topup120: { usd: 1290, brl: 6490, inr: 109900 },
}

/** USD list price of each top-up SKU, in cents. Derivado de TOPUP_PRICES. */
export const TOPUP_USD_PRICES: Record<TopupId, number> = {
  topup40: TOPUP_PRICES.topup40.usd,
  topup100: TOPUP_PRICES.topup100.usd,
  topup120: TOPUP_PRICES.topup120.usd,
}

if (process.env.NODE_ENV !== 'production') {
  const problems = checkPricingInvariants()
  if (problems.length > 0) {
    // eslint-disable-next-line no-console
    console.warn('[checkoutPricing] pricing invariant violations:\n  - ' + problems.join('\n  - '))
  }
}
