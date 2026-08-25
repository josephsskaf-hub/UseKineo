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
// ═══════════════════════════════════════════════════════════════════════════
// KINEO-USD-ONLY-2026-08-19 — UMA MOEDA (fundador: "quero leitura em USD pra
// todo mundo; não gosto de ter preço em português e o resto do site em outra
// língua, não faz sentido").
// ═══════════════════════════════════════════════════════════════════════════
// A razão dele é de coerência e é boa: o site inteiro é em inglês, e "R$79,90"
// no meio de uma página em inglês lê como se fosse outro produto. Mas existe
// um motivo mais duro, e é o que decidiu:
//
// OS PREÇOS LOCAIS ERAM NÚMEROS FIXOS DERIVANDO CONTRA O DÓLAR. R$37,90 valia
// "cerca de $7" a um câmbio de 5,41. Ninguém revisita esse número quando o
// câmbio anda:
//     câmbio 4,80 → R$37,90 vale $7,90  (cobramos 13% A MAIS)
//     câmbio 5,41 → R$37,90 vale $7,01  (alvo)
//     câmbio 6,20 → R$37,90 vale $6,11  (cobramos 13% A MENOS)
// Três moedas × três planos = nove números derivando sozinhos, sem ninguém
// olhando, contra o único preço que a gente realmente decidiu. É a MESMA
// doença que produziu as três telas mentirosas de hoje — uma segunda fonte da
// verdade que envelhece em silêncio — só que essa envelhece sem ninguém
// digitar nada.
//
// O tipo fica com um valor só de propósito, pelo mesmo motivo de PriceRegion:
// todo `currency === 'brl'` vira ERRO DE COMPILAÇÃO e o tsc lista sozinho cada
// tela que ainda acredita em multi-moeda.
//
// ⚠️ O QUE ISSO CUSTA, dito na cara: cobrar em USD para brasileiro e indiano
// adiciona IOF/spread do banco emissor e costuma converter pior que moeda
// local. A troca é deliberada — a moeda local não produziu UMA venda em 557
// cadastros desses países, e o risco de derivar em silêncio é maior que o
// ganho não comprovado.
export type CheckoutCurrency = 'usd'

// Single price source for the server-authoritative Stripe route and every
// checkout-facing display. Amounts are in cents, centavos, or paise.
// ═══════════════════════════════════════════════════════════════════════════
// KINEO-PRICING-V6-2026-08-19 — PREÇO GLOBAL ÚNICO (fundador: "preço global
// pra todo mundo, mais simples"). $7 / $15 / $29.
// ═══════════════════════════════════════════════════════════════════════════
// POR QUE A ESCADA DESCEU, e por que o desconto regional morreu junto:
//
// 1) O DESCONTO REGIONAL NUNCA VENDEU. Nem uma vez. Medido em 19/08: 557
//    cadastros de países `value` (Índia, Brasil, Nigéria, Quênia...), 46,5%
//    deles ATIVARAM (fizeram vídeo — mais engajados que a média global de
//    38,3%), e ZERO assinou no preço com desconto. Os 3 pagantes desses
//    países não provam nada dele: akajitin (NG) pagou em 03/08, um dia ANTES
//    do regional existir; noelrss21 (ZA) comprou Creator, que nunca teve
//    desconto regional; abhijeet (IN) foi pack avulso em julho.
//    Ressalva honesta: o preço regional ficou INVISÍVEL na vitrine até
//    19/08. "Nunca vendeu" está contaminado com "ninguém viu" — não dá para
//    afirmar que fracassou, dá para afirmar que custou caro sem ser testado.
//
// 2) O CUSTO DELE ERA ALTÍSSIMO. Em um único dia (19/08) TRÊS superfícies
//    foram flagradas mentindo preço, e a dimensão `region` estava em todas:
//    o JSON-LD que o ChatGPT lê, o bloco de planos da home (mostrando
//    R$24,90 ao lado de $19.90 na MESMA tabela) e o modal de exit-intent do
//    /pricing (prometendo "half-price first month" que não existe). Nenhuma
//    foi achada procurando — todas por tropeço.
//
// 3) E ELE EXISTIA PARA UM PLANO SÓ. Creator em BRL/INR já era idêntico nas
//    duas regiões (está escrito no bloco antigo: "não há nada a descontar") e
//    Studio nunca teve tier regional. Toda a máquina de geo, a lista de 18
//    países com furos conhecidos (Zâmbia, Camarões e Macedônia de fora,
//    Quênia e Gana dentro) e as três telas mentirosas existiam para dar
//    desconto no Starter. Relação custo/benefício indefensável.
//
// 4) O ARGUMENTO QUE FECHA: com 6 assinantes não existe amostra para otimizar
//    preço por região. Cada dimensão nova (região, moeda, intro, cupom)
//    multiplica superfícies e bugs enquanto o número de clientes nunca chega
//    para validar nenhuma. Nessa escala, simplificar não é limpeza — é a
//    única forma de conseguir aprender alguma coisa.
//
// (NOTA HISTÓRICA: por algumas horas de 19/08 a V6 manteve BRL e INR como
// tradução do mesmo preço. Isso caiu no mesmo dia — ver o bloco USD-ONLY no
// topo do arquivo: números locais fixos derivam contra o dólar quando o câmbio
// anda, e ninguém revisita nove números. Hoje existe UM preço, em USD.)
export const TIER_PRICES: Record<CheckoutTier, Record<CheckoutCurrency, number>> = {
  starter: { usd: 700 },
  basic: { usd: 1500 },
  pro: { usd: 2900 },
}

// KINEO-AUTOPILOT-299-2026-07-26 — $299/mo done-for-you tier.
export const AUTOPILOT_PRICES: Record<CheckoutCurrency, number> = {
  usd: 29900,
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
// KINEO-USD-ONLY-2026-08-19 — a advertência sobre COLISÃO ENTRE MOEDAS que
// vivia aqui perdeu o objeto (topup40 era ₹49.900 e o piloto R$499,00, o mesmo
// inteiro). Com uma moeda só, colisão de valor é sempre colisão de verdade —
// e é exatamente isso que o invariante (6) checa, agora sem falso negativo.
export const AUTOPILOT_PILOT_PRICES: Record<CheckoutCurrency, number> = {
  usd: 9900,
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
// KINEO-PRICING-V6-2026-08-19 — anual segue a mesma regra de sempre: 10× o
// mensal (dois meses de graça). $70 / $150 / $290.
export const ANNUAL_PRICES: Record<CheckoutTier, Record<CheckoutCurrency, number>> = {
  starter: { usd: 7000 },
  basic: { usd: 15000 },
  pro: { usd: 29000 },
}

export const INTRO_PRICES: Record<CheckoutIntroTier, Record<CheckoutCurrency, number>> = {
  // KINEO-PRICING-V5-2026-08-17 (fundador: 'não quero mais o plano de
  // $4.90'): intro do Starter = preço cheio → hasIntroOffer() devolve false e
  // toda a UI do desconto some sozinha. O intro do Creator ($9.90 no 1º mês
  // do plano de $19.90 = 50% off) continua — funil saudável.
  // KINEO-NO-INTRO-2026-08-17 (fundador: 'nao tem mais isso de 1 mes'):
  // TODO intro morreu — starter E basic = preço cheio. hasIntroOffer() false
  // em toda parte apaga badges, CTAs e letras miúdas sozinho.
  // KINEO-PRICING-V6-2026-08-19 — segue espelhando TIER_PRICES. Se algum dia
  // voltar a existir intro, é AQUI que ele nasce, e o hasIntroOffer() acende
  // a UI sozinho. Enquanto for igual, nenhuma tela promete desconto.
  starter: { usd: 700 },
  basic: { usd: 1500 },
}

// ═══════════════════════════════════════════════════════════════════════════
// KINEO-PRICING-V6-2026-08-19 — A REGIÃO DE PREÇO MORREU. Ver o bloco de
// TIER_PRICES para os quatro motivos (nunca vendeu · três telas mentindo no
// mesmo dia · existia para um plano só · não há amostra para otimizá-la).
// ═══════════════════════════════════════════════════════════════════════════
// O TIPO FICA COM UM VALOR SÓ DE PROPÓSITO. Apagar `PriceRegion` de vez
// obrigaria a editar as ~15 telas que passam `region` — um refactor grande no
// caminho do dinheiro, tudo de uma vez. Estreitar o tipo para `'standard'`
// consegue mais com menos risco:
//   · quem passa `region` continua compilando (o valor ainda é válido);
//   · TODA comparação `region === 'value'` vira ERRO DE COMPILAÇÃO, então o
//     tsc lista sozinho cada tela que ainda acredita na região — não sobra
//     ramo morto escondido;
//   · e a região não pode voltar por acidente: não existe mais o valor.
// A limpeza final (remover o parâmetro das assinaturas) fica para um passo
// separado, quando ele já não fizer nada em lugar nenhum.
export type PriceRegion = 'standard'

/** Tier que PODE ter preço de 1º mês. Hoje INTRO_PRICES == TIER_PRICES, então
 *  hasIntroOffer() é false em toda parte e nenhuma tela promete desconto. */
export type RegionalTier = CheckoutIntroTier

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
  void region // V6: existe uma tabela só. Parâmetro mantido por compatibilidade.
  return TIER_PRICES[tier][currency]
}

/** Preço do 1º mês. Ver a nota acima sobre o Starter regional. */
export function getIntroPrice(
  tier: RegionalTier,
  currency: CheckoutCurrency,
  region: PriceRegion = 'standard',
): number {
  void region
  return INTRO_PRICES[tier][currency]
}

/** Preço anual. */
export function getAnnualPrice(
  tier: CheckoutTier,
  currency: CheckoutCurrency,
  region: PriceRegion = 'standard',
): number {
  void region
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
// ═══ COST BASIS — REMEDIDO EM 20/08/2026 (sessão de margem) ═══════════════
// A base anterior usava o custo TEÓRICO do Seedance ($1,56-2,34/render). A
// fatura real da fal desmentiu: $3,30/render em 1080p. O invariante estava
// portanto medindo o pior caso com o número errado e passando planos que na
// verdade rodavam no zero a zero.
//
// Os números abaixo saem da fórmula PÚBLICA do fal, conferida no schema
// oficial hoje: tokens = (w × h × fps × s) / 1024, a $1,20/M sem áudio.
// Vídeo típico = 6 cenas de 8s.
//   Kineo 1 (fast)  5 cr ≈ $0.33/render (Creatomate 24fps + OpenAI; Pexels
//                          é grátis — não há fornecedor de vídeo) → $0.066/cr
//   Seedance 720p  20 cr ≈ $1.61/render                            → $0.081/cr
//   MiniMax H3     45 cr ≈ $5.20/render                            → $0.116/cr  ← PIOR
//   Kling 2.5      50 cr ≈ $5.50/render                            → $0.110/cr
//   Veo 3.1        90 cr ≈ $9.50/render                            → $0.106/cr
//   Avatar        110 cr ≈ $9.00/render                            → $0.082/cr
//   Kling 3       150 cr ≈ $11.85/render                           → $0.079/cr
//
// O PIOR MOTOR MUDOU DE DONO. Com o Seedance em 720p (KINEO-SEEDANCE-720-
// MARGEM-2026-08-20) quem passa a definir o pior caso é o MiniMax H3, a
// $0.116/crédito. O número quase não muda ($0.117 → $0.116) — mas o dono
// muda, e quem reprecificar o H3 amanhã precisa saber que mexe no piso de
// TODOS os planos. Este comentário existe para essa pessoa.
//
// Worst-case COGS de um grant de N créditos: N × pior-$/crédito, com o resto
// em Fast (o motor mais barato por crédito).
export const WORST_CASE_USD_PER_CREDIT = 0.116
export const FAST_USD_PER_CREDIT = 0.066

/** Worst-case provider cost (USD) a user can extract from a grant of N credits.
 *  KINEO-COGS-H3-2026-08-20 — o pior motor agora é o H3 (45cr, $0.116/cr), não
 *  o Seedance (20cr). A conta gasta o máximo possível no pior motor e joga o
 *  resto no Fast, que é o mais barato por crédito. */
export function worstCaseCogsUsd(credits: number): number {
  const WORST_ENGINE_CREDITS = 45 // MiniMax H3
  const worstRenders = Math.floor(credits / WORST_ENGINE_CREDITS)
  const leftover = credits % WORST_ENGINE_CREDITS
  return worstRenders * WORST_ENGINE_CREDITS * WORST_CASE_USD_PER_CREDIT + leftover * FAST_USD_PER_CREDIT
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
  // ═══ KINEO-PRICING-V6-2026-08-19 — O GRANT FOI RECALIBRADO PELO CONSUMO ═══
  // O preço só pôde cair porque o grant desceu junto, e o grant só pôde
  // descer porque NINGUÉM o consumia. Medido em 19/08, o que cada assinante
  // pagante realmente usou do que recebeu:
  //     gapozweb    Starter  60cr → usou 43   (72%)
  //     akajitin    Starter  60cr → usou 38   (63%)
  //     valos87196  Creator 140cr → usou 67   (48%)
  //     noelrss21   Creator 140cr → usou 52   (37%)
  //     den.higgins Creator 140cr → usou  0   ( 0%)
  // O Creator entregava TRÊS VEZES o que o cliente mais faminto retirava.
  // Isso não era generosidade: era margem paga por um valor que ninguém
  // levava embora — e era exatamente o que impedia o preço de $15.
  //
  // Cortar 140 → 90 não tira nada de NENHUM cliente atual (o recordista pegou
  // 67). Trocamos um número de vitrine que ninguém consome por uma redução de
  // preço de 25% que todo mundo vê.
  //
  // MARGENS NO PIOR CASO (tudo gasto no Seedance, $0,117/cr — o motor mais
  // caro do catálogo), calculadas com worstCaseCogsUsd + netAfterStripeUsd:
  //     Starter $7  / 40cr  → líquido $6.50  · COGS $4.68  · +$1.82 (28%)
  //     Creator $15 / 90cr  → líquido $14.26 · COGS $9.86  · +$4.40 (31%)
  //     Studio  $29 / 160cr → líquido $27.86 · COGS $18.72 · +$9.14 (33%)
  // Comparação com a V5, que era pior do que aparentava: Studio rodava a 3%
  // de margem no pior caso ($39.90/320cr). A V6 é mais barata para o cliente
  // E mais segura para a casa.
  //
  // O pior caso é grade de proteção, não previsão: o uso real é dominado pelo
  // Kineo 1 (138 renders contra 73 do Seedance em 7 dias), então a margem
  // efetiva é bem maior. Com 6 assinantes, um único usuário pesado custa mais
  // que um mês inteiro de MRR — por isso o piso é o pior caso.
  // ⚠️ KINEO-LADDER-FIX-2026-08-19 — STUDIO SUBIU DE 160 PARA 180 CRÉDITOS.
  //
  // A primeira versão da V6 QUEBROU A ESCADA e só apareceu quando o fundador
  // pediu o preço por crédito. Com Studio a 160cr o $/cr ficava assim:
  //     Starter $0.1750 · Creator $0.1667 · Studio $0.1812  ← invertido
  // Ou seja: quem pagava $29 comprava crédito MAIS CARO que quem pagava $15.
  // Isso destrói a razão de existir do degrau de cima — a promessa implícita
  // de uma escada é que subir compra volume mais barato, e um cliente atento
  // faz essa conta em trinta segundos. O movimento racional dele viraria
  // "fico no Creator e compro top-up", que é exatamente a inversão que o
  // invariante (1) guarda entre plano e top-up mas NÃO guarda entre planos.
  //
  // 180cr devolve a ordem correta, decrescente como deve ser:
  //     Starter $0.1750 → Creator $0.1667 → Studio $0.1611
  // Custo: 20 créditos de margem no cenário ruim (33% → 24% no pior caso,
  // ~50% no mix real). Segue oito vezes acima dos 3% que o Studio da V5 tinha,
  // e 180 mantém verdadeira a promessa que sustenta o plano premium: um filme
  // Kling 3 (150cr) por mês com folga.
  starter: 40,
  basic: 90,
  pro: 180,
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
  // KINEO-NO-INTRO-2026-08-17 — sem mês com desconto em nenhum plano: o grant
  // do 1º mês é sempre o grant cheio do plano.
  // KINEO-PRICING-V6-2026-08-19 — e por isso ele TEM de acompanhar TIER_CREDITS.
  // O invariante pegou esta linha esquecida: com o preço já em $7/$15 e o grant
  // do 1º mês ainda em 60/140, os SKUs `intro:starter` e `intro:basic` ficavam
  // abaixo do custo no pior caso (net $6.50 vs COGS $7.02; $14.26 vs $16.38) —
  // ou seja, o primeiro mês de todo assinante novo seria prejuízo. É o tipo de
  // erro que só aparece em produção, no extrato, um mês depois.
  starter: 40,
  basic: 90,
}

// KINEO-PRICING-V3D-2026-07-26 — DEFECT (a). The entry packs used to grant 10
// credits. 10 credits does buy 10 Fast videos (Fast = 1 credit for a paying
// account), so the copy was not lying — but the cheapest GENERATIVE engine
// (Seedance) costs 20, so the first dollar a customer ever spent with us
// bought exactly zero AI videos. Both packs now clear that bar.
//   $2.90 → net $2.516; 20 cr = 1 Seedance ($2.34)            → +$0.18 (7.0%)
//   $4.90 → net $4.458; 30 cr = 1 Seedance + 10 Fast ($2.84)  → +$1.62 (36.3%)
// NOTE FOR THE NEXT PERSON: "two or three AI videos for $4.90" is arithmetically
// impossible. 50 credits = 2 Seedance = $4.68 worst case, which is −$0.22 on a
// $4.90 sale. 30 is the ceiling at this price point.
export const PACK_CREDITS = {
  /** ?pack=starter — the $4.90 First Pack. */
  starter: 30,
  /** ?pack=starter290 — the dormant $2.90 offer (lib/flags.ts OFFER_290_ENABLED). */
  starter290: 25,
} as const

// KINEO-VENDER-O-VIDEO-2026-08-21 — o preço do pacote avulso mora aqui porque
// a TELA passou a mostrá-lo. Antes ele só existia dentro de
// app/api/stripe/checkout/route.ts (PACK_PRICES), invisível para o client, e
// eu quase escrevi "$4.90" cravado no JSX — que é exatamente o defeito que
// este repositório já pegou duas vezes (o `20` do Seedance e o `25` do
// Starter). Preço que aparece em tela e preço que a Stripe cobra têm de sair
// da MESMA linha.
/** ?pack=starter — valor em centavos. Espelha PACK_PRICES.usd do checkout. */
export const PACK_PRICE_MINOR: Record<CheckoutCurrency, number> = { usd: 490 }

/** "$4.90" — formatado para copy. */
export function packPriceLabel(currency: CheckoutCurrency = 'usd'): string {
  return `$${(PACK_PRICE_MINOR[currency] / 100).toFixed(2)}`
}

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
  // ⚠ KINEO-PRICING-V6-2026-08-19 — topup100 CAIU DE 100 PARA 75 CRÉDITOS.
  // Não é mesquinharia, é o invariante (1) fazendo o trabalho dele: com o
  // Creator a $15/90cr ($0.1667/cr), um top-up de $14.90 por 100 créditos
  // sairia a $0.1490/cr — MAIS BARATO que a assinatura que ele deveria
  // complementar. O movimento racional do cliente viraria "assino o Starter e
  // compro top-up pra sempre", e a gente estaria vendendo crédito abaixo da
  // própria prateleira mais barata. A 75cr ele volta para $0.1987/cr, em linha
  // com os outros dois (0.1967 e 0.1985), e o efeito Goldilocks continua de pé:
  // +$2 sobre o topup120 compra +10 créditos.
  // KINEO-TOPUP100-2026-08-17 (aprovado): o pacote-ancora — 100 creditos
  // (5 AI videos) por \$14.90 = \$0.149/cr. Efeito Goldilocks: o topup120
  // (65cr por \$12.90) vira decoy; +\$2 compra +35cr. Margem ~80% (COGS
  // ~\$0.03/cr). Segue 43% acima do \$/cr do Creator — nunca canibaliza a
  // assinatura.
  topup100: 75,
  // ═══ KINEO-TOPUP300-2026-08-20 — O PACOTE QUE COMPRA O NOSSO MELHOR MOTOR ═
  // Pedido do fundador, e ele nasceu de um defeito de desenho que só ficou
  // visível quando ele perguntou "existe top-up de 150?": NÃO existia. Tínhamos
  // o Kling 3 (150cr) na vitrine — nos cards da home, no vídeo que o fundador
  // posta — e nenhum jeito limpo de comprá-lo avulso. Quem quisesse um precisava
  // somar dois pacotes e ficar com troco. Fricção no exato momento em que a
  // pessoa JÁ decidiu gastar.
  // 300 = DOIS filmes Kling 3, que é como o fundador pediu e é melhor unidade:
  // um filme é teste, dois é uso.
  topup300: 300,
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
// (ANNUAL_PRICES.starter.usd também era 9900, igual a bulk10. Hoje o anual é
// mode:'subscription' e nunca alcança o Path A — mas o comentário do webhook já
// avisava que isso é uma bomba-relógio se o anual virar pagamento único. Por
// isso os anuais entram na conta abaixo.)
//
// KINEO-PRICING-V6-2026-08-19 — 37900 SAIU DA LISTA. Ele estava aqui porque o
// anual do Studio custava $379 e empatava com o bulk50; na V6 o anual do Studio
// é $290, então 37900 tem um dono só. O invariante (6) reclamou sozinho —
// "entrada obsoleta bloqueia um fallback legítimo" —, e ele está certo: manter
// um valor não-ambíguo nesta lista faz o webhook RECUSAR creditar uma sessão de
// bulk50 que perdesse a metadata. Sobrou 9900, que segue empatando de verdade
// (bulk10 = piloto Autopilot = anual do Starter na V6).
//
// Esta lista é o contrato entre o preço e o webhook: para QUALQUER valor aqui,
// o webhook resolve SÓ por metadata.pack exata e NUNCA por valor.
export const AMBIGUOUS_ONE_TIME_USD_AMOUNTS: ReadonlySet<number> = new Set([9900])

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
)

export const CURRENCY_DISPLAY: Record<CheckoutCurrency, {
  locale: string
  currencyCode: string
  label: string
}> = {
  usd: { locale: 'en-US', currencyCode: 'USD', label: 'USD' },
}

export function resolveCheckoutCurrency(_country: string | null | undefined): CheckoutCurrency {
  return 'usd'
}
// KINEO-PRICING-V6-2026-08-19 — a lista de países da região `value` foi
// REMOVIDA junto com a região. Ela tinha furos conhecidos que nunca fecharam
// (Zâmbia, Camarões e Macedônia do Norte de fora, com renda comparável a
// Quênia e Gana que estavam dentro) e cada furo era uma pessoa engajada
// vendo o preço cheio sem que ninguém percebesse. Manter uma lista de 18
// países atualizada à mão é uma dívida que a gente não tem tamanho para
// pagar — e o motivo dela deixou de existir quando a escada virou uma só.

/**
 * V6: existe uma tabela de preço só, então a região é sempre 'standard'.
 *
 * A função CONTINUA existindo — e não é vestígio preguiçoso. O /api/geo, o
 * /api/stripe/checkout e ~15 telas a chamam; mantê-la devolvendo o valor
 * único deixa a mudança de preço isolada de um refactor de assinatura no
 * caminho do dinheiro. Como `PriceRegion` agora tem um valor só, é
 * impossível esta função voltar a devolver outra coisa sem o tipo reclamar.
 */
export function resolvePriceRegion(_country: string | null | undefined): PriceRegion {
  return 'standard'
}

/** Narrowing para valores vindos da rede (/api/geo) — nunca confia no browser. */
export function coercePriceRegion(_raw: string | null | undefined): PriceRegion {
  return 'standard'
}

export function formatCheckoutMoney(currency: CheckoutCurrency, amountMinor: number): string {
  const config = CURRENCY_DISPLAY[currency]
  const fractionDigits = 2
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
    // KINEO-PRICING-V6-2026-08-19 — as quatro linhas da região `value` saíram
    // daqui junto com a região. Elas eram o ponto do arquivo onde um desconto
    // regional generoso demais aparecia como número em vez de opinião; sem
    // segunda tabela, os SKUs acima já são o catálogo inteiro.
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
  claim(TOPUP_USD_PRICES.topup300, 'topup300')
  claim(AUTOPILOT_PILOT_PRICES.usd, 'pilot:autopilot')
  for (const id of BULK_PACK_IDS) claim(BULK_PACKS[id].usdMinor, `bulk:${id}`)
  // Os anuais são mode:'subscription' HOJE e não alcançam o Path A do webhook.
  // Entram assim mesmo: o dia em que alguém os transformar em pagamento único,
  // esta checagem é o que avisa antes de o dinheiro entrar errado.
  for (const tier of Object.keys(ANNUAL_PRICES) as CheckoutTier[]) {
    claim(ANNUAL_PRICES[tier].usd, `annual:${tier}`)
  }
  // KINEO-PRICING-V6-2026-08-19 — o laço do anual REGIONAL saiu junto com a
  // região. Não existe mais um segundo conjunto de valores anuais para
  // reivindicar, e o laço acima já cobre os três que restaram.

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

  // (7) KINEO-PRICING-V6-2026-08-19 — a checagem de "preço regional não pode
  // empatar com SKU de compra única" saiu junto com a região. O risco que ela
  // guardava, porém, NÃO saiu: qualquer preço de assinatura novo que colida
  // com um valor de compra única em USD ainda faria o fallback por valor do
  // webhook creditar o pacote errado. Isso continua coberto pela checagem (6)
  // logo acima, que reivindica TODOS os valores USD do catálogo — inclusive
  // os três mensais e os três anuais da tabela nova.

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
  topup40: { usd: 590 },
  topup100: { usd: 1490 },
  topup120: { usd: 1290 },
  // $49.90 / 300 = $0.1663 por crédito. Escolhido contra duas âncoras:
  //   · o INVARIANTE (1) deste arquivo — todo top-up custa mais por crédito
  //     que o plano mais barato (Studio, $0.1611). Passa por 3%, o que é
  //     apertado de propósito: é o maior pacote, então é o mais barato por
  //     crédito, como manda qualquer escada de volume. Se o Studio um dia
  //     ficar mais caro por crédito, a checagem no fim deste arquivo AVISA.
  //   · o que a pessoa paga HOJE para chegar a 300cr: 4× topup100 = $59.60.
  //     O pacote novo é 16% mais barato e não deixa troco.
  // Margem: líquido $48.15 contra $23.70 de dois Kling 3 → 51%.
  topup300: { usd: 4990 },
}

/** USD list price of each top-up SKU, in cents. Derivado de TOPUP_PRICES. */
export const TOPUP_USD_PRICES: Record<TopupId, number> = {
  topup40: TOPUP_PRICES.topup40.usd,
  topup100: TOPUP_PRICES.topup100.usd,
  topup300: TOPUP_PRICES.topup300.usd,
  topup120: TOPUP_PRICES.topup120.usd,
}

if (process.env.NODE_ENV !== 'production') {
  const problems = checkPricingInvariants()
  if (problems.length > 0) {
    // eslint-disable-next-line no-console
    console.warn('[checkoutPricing] pricing invariant violations:\n  - ' + problems.join('\n  - '))
  }
}
