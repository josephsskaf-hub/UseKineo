// KINEO-CLIPES-2026-09-29 — PROPOSTA de preço do clipe (decisão de preço público é do fundador; nada disto vai ao ar
// sem o "vai" dele — o CEO leva a tabela antes de publicar).
//
// MÓDULO PURO (só `import type`, apagado na transpilação): o guardião executa isolado.
// (05/10: + um import RELATIVO de outro módulo puro, ./clipPriceVsMarket — o loader dos guardiões resolve './'.)
// (KINEO-PRECOS-CLIPES-KLING25-1610: + `@/lib/checkoutPricing`, para o piso de 40% LER o preço do crédito do plano em
// vez de um espelho digitado. checkoutPricing só importa engineCost (sem imports) e autopilot/config (só tipo); os
// loaders dos guardiões que carregam este arquivo resolvem '@/'.)
//
// A REGRA, em uma linha:
//   créditos = max(CLIP_MIN_CREDITS, ceil( custo_fal_do_clipe ÷ ( US$/crédito_do_Studio × (1 − margem_alvo) ) ))
//   margem_alvo = max( margem do FILME do mesmo motor no Studio , CLIP_MARGIN_FLOOR )
//
// POR QUE O STUDIO (REGRA DE 29/09 — HISTÓRICO): em 28/09 o Studio era o crédito MAIS BARATO da casa (US$ 54,90 / 300 cr =
// US$ 0,183/cr). DEIXOU DE SER em 08/10 (Creator de volta a US$ 19,90 / 150 cr = US$ 0,1327/cr; Creator anual a
// US$ 0,0928/cr). A regra de 29/09 (clipCreditCostRegra2909 e os efeitos-modelo, piso de 50%) segue medida no crédito do
// Studio porque o fundador não mexeu nela — os números que ela produz hoje (Seedance 1.5, Omni, efeitos) dão ≥ 47% no
// crédito do Creator mensal (guardião scripts/test-precos-clipes-kling25-1610.mjs prova motor a motor).
// ═══ KINEO-PRECOS-CLIPES-KLING25-1610 — O PISO DE 40% PASSA A SER MEDIDO NO CRÉDITO DE QUEM COMPRA ═══
// Decisão do fundador (15/10, "Sim para as 3"; docs/CONTA-STUDIO-E-MARGEM-CLIPES-2026-10-16.md, recomendação B): o piso
// de 40% da régua de mercado deixa de usar o Studio (US$ 0,183, plano que nunca vendeu a esse preço) e passa a usar
// CLIP_FLOOR_USD_PER_CREDIT = CHEAPEST_PLAN_USD_PER_CREDIT de lib/checkoutPricing.ts — o menor US$/crédito entre os planos
// MENSAIS, lido de TIER_PRICES/TIER_CREDITS (nunca digitado). Hoje é o Creator mensal (US$ 19,90 / 150 = US$ 0,1327),
// onde estão 100% dos pagantes. Se um dia o Studio ficar mais barato por crédito, o piso acompanha sozinho.
// O anual (30% off) fica com ~15–25% de margem nos clipes que sobem — escolha do relatório (0 anuais em 60 dias).
//
// POR QUE "≥ margem do filme": pedido do CEO — o clipe não pode ser um jeito mais barato (para nós) de usar o mesmo
// motor. E o PISO de 50%: dois motores (Seedance 1.5 e Kling 2.5) têm filme com margem baixa (28% e 23%) por causa de
// âncoras, retries e plano de 5 s que o clipe NÃO tem; herdar 23% num produto novo, sem histórico de falha, seria
// herdar um número ruim por acidente. 50% é a proposta — o fundador pode baixar.
//
// POR QUE O MÍNIMO DE 5 cr: é o preço que a casa JÁ cobra por um clipe — o Modo Clipe do Studio (/api/generate-clip,
// lib/cinematic/shotSpec.ts CLIP_CREDITS = 5, Seedance 1.5 de 4–12 s). Sem o piso, o mesmo clipe Seedance teria dois
// preços na casa (5 no Studio, 2–3 aqui). E a lição do Kineo 1 (engineCost.ts KINEO-FAST-2CR/5CR) vale: o preço também
// posiciona — um clipe de vídeo não fica abaixo de uma imagem Nano Banana (5 cr). O piso ainda cobre o que não é fal:
// o MP4 guardado no nosso bucket e a moderação. Espelho sem import (guardião confere a igualdade com shotSpec.ts).
//
// FOTO (withImage): na fal, image-to-video custa o MESMO por segundo que text-to-video em todos os 7 motores (páginas
// de preço lidas em 29/09). O parâmetro existe para o dia em que um motor cobrar diferente; hoje não muda o preço.
//
// CUSTO FAL POR SEGUNDO (fonte, 29/09/2026):
//   Kling 3 ....... US$ 0,112/s sem áudio (fal.ai/models/fal-ai/kling-video/v3/pro/text-to-video e o3/pro/image-to-video:
//                   "$0.112 (audio off)"). O clipe vai com generate_audio:false.
//   Kling 2.5 ..... US$ 0,07/s ("For 5s video your request will cost $0.35 … $0.07" — página do v2.5-turbo/pro)
//   Seedance 1.5 .. US$ 0,026/s em 720p sem áudio (tokens = h×w×fps×s/1024 a US$ 1,2/M; 720×1280×24×5/1024 = 108.000
//                   tokens = US$ 0,13 por 5 s — mesma conta de lib/fastAiClips.ts SEEDANCE_720P_USD_PER_SECOND)
//   Veo 3.1 Fast .. US$ 0,10/s sem áudio em 720p/1080p (página do veo3.1/fast)
//   MiniMax H3 .... US$ 0,06/s em 768P (página do minimax/h3: "$0.06 per second at 768p")
//   Omni Flash .... US$ 0,13/s em 720p (página do google/gemini-omni-flash/image-to-video)
//   Seedance 2.5 .. US$ 0,208/s em 480p 9:16 (lib/hollywood/router.ts S25_USD_PER_SECOND; página da fal em acesso antecipado,
//                   sem preço público — número da casa, conferir na fatura antes de abrir o motor)
//                   06/10 (KINEO-S25-CLIPES): a fal publica o preço do MESMO modelo na página de parceiro
//                   bytedance/seedance-2.5: US$ 0,0214 por 1.000 tokens a 480p/720p → ~US$ 0,215/s a 9:16 480p pela fórmula
//                   (496×864×24/1024 tokens/s) e "roughly $0.2205" no texto da fal — 3–6% acima dos 0,208. A régua de mercado
//                   já usa o maior (clipPriceVsMarket ENGINE_MARKET.s25); este espelho do filme fica como está.
//
// MARGEM DO FILME NO STUDIO (custo fal de um filme de 60 s ÷ receita dos créditos a US$ 0,183):
//   Kling 3 150 cr · US$ 11,00 (CLAUDE.md 18/08: "64-73 s ≈ $11-12"; usamos o PISO do custo = a margem mais alta) → 59,9%
//   Kling 2.5 75 cr · US$ 8,40 (engineCost.ts KINEO-KLING25-60CR: "≈ US$ 8,40 na fal"; 60 → 75 em
//                   KINEO-PRECOS-CLIPES-KLING25-1610 — era 23,5% a 60 cr)                                          → 38,8%
//   Seedance 1.5 25 cr · US$ 3,30 (engineCost.ts KINEO-V6.1: fatura de agosto, "$3.30/render TUDO-DENTRO")        → 27,9%
//   Veo 3.1 100 cr · US$ 9,75 (engineCost.ts KINEO-V6.1: "custo fal ~$9.75/render")                                → 46,7%
//   MiniMax H3 45 cr · US$ 3,90 (engineCost.ts KINEO-H3: "um filme de 65s … sai por $3.90")                        → 52,6%
//   Omni Flash 150 cr · US$ 8,50 (engineCost.ts KINEO-OMNI: "~$8.50 de fal")                                      → 69,0%
//   Seedance 2.5 150 cr · US$ 13,70 (engineCost.ts KINEO-S25-ESPERTA: "Custo fal ~$13.70/60s")                    → 50,1%
// Os créditos do filme são ESPELHO de creditCostFor() (lib/credits/engineCost.ts); o guardião confere a igualdade.
import type { ClipEngineKey } from './clipCatalog'
// KINEO-CLIP-PRECO-MERCADO-2026-10-05 — único import em tempo de execução, e RELATIVO a outro módulo puro (sem ciclo:
// clipPriceVsMarket só tem `import type`). A régua "−10% do concorrente" mora lá; aqui só o interruptor.
import { decideMarketClipPrice, type MarketDecision } from './clipPriceVsMarket'
// KINEO-PRECOS-CLIPES-KLING25-1610 — o preço do crédito do plano mais barato (mensal), derivado de TIER_PRICES/TIER_CREDITS.
import { CHEAPEST_PLAN_USD_PER_CREDIT } from '@/lib/checkoutPricing'

/** US$ 54,90 (5490 centavos) — espelho de TIER_PRICES.pro.usd em lib/checkoutPricing.ts (guardião confere). */
export const STUDIO_PLAN_USD_CENTS = 5490
/** 300 créditos — espelho de TIER_CREDITS.pro em lib/checkoutPricing.ts (guardião confere). */
export const STUDIO_PLAN_CREDITS = 300
export const STUDIO_USD_PER_CREDIT = STUDIO_PLAN_USD_CENTS / 100 / STUDIO_PLAN_CREDITS

/** KINEO-PRECOS-CLIPES-KLING25-1610 — base do piso de 40% da régua de mercado: o menor US$/crédito entre os planos
 *  mensais (lib/checkoutPricing.ts CHEAPEST_PLAN_USD_PER_CREDIT, lido — não espelhado). Hoje = Creator mensal, US$ 0,1327. */
export const CLIP_FLOOR_USD_PER_CREDIT: number = CHEAPEST_PLAN_USD_PER_CREDIT

export const CLIP_MARGIN_FLOOR = 0.5
export const CLIP_MIN_CREDITS = 5

export interface ClipCostSpec {
  /** Custo fal por segundo do clipe como a casa o manda (sem áudio onde há chave). */
  usdPerSecond: number
  /** Quality do filme em lib/credits/engineCost.ts. */
  filmQuality: string
  /** Créditos do filme de 60 s (espelho de creditCostFor(filmQuality)). */
  filmCredits: number
  /** Custo fal de um filme de 60 s (fonte no cabeçalho). */
  filmFalUsd: number
}

export const CLIP_COSTS: Record<ClipEngineKey, ClipCostSpec> = {
  hollywood: { usdPerSecond: 0.112, filmQuality: 'cinematic_hollywood', filmCredits: 150, filmFalUsd: 11.0 },
  kling: { usdPerSecond: 0.07, filmQuality: 'cinematic_kling', filmCredits: 75, filmFalUsd: 8.4 }, // KINEO-PRECOS-CLIPES-KLING25-1610 (era 60)
  seedance: { usdPerSecond: 0.026, filmQuality: 'cinematic_ai', filmCredits: 35, filmFalUsd: 3.3 }, // KINEO-SEEDANCE-35CR-2026-10-04 (era 25)
  veo: { usdPerSecond: 0.1, filmQuality: 'cinematic_veo', filmCredits: 100, filmFalUsd: 9.75 },
  h3: { usdPerSecond: 0.06, filmQuality: 'cinematic_h3', filmCredits: 45, filmFalUsd: 3.9 },
  omni: { usdPerSecond: 0.13, filmQuality: 'cinematic_omni', filmCredits: 150, filmFalUsd: 8.5 },
  s25: { usdPerSecond: 0.208, filmQuality: 'cinematic_s25', filmCredits: 150, filmFalUsd: 13.7 },
}

/** Margem do filme do motor no crédito do Studio (0..1). */
export function filmMarginAtStudio(engine: ClipEngineKey): number {
  const c = CLIP_COSTS[engine]
  return 1 - c.filmFalUsd / (c.filmCredits * STUDIO_USD_PER_CREDIT)
}

export function clipTargetMargin(engine: ClipEngineKey): number {
  return Math.max(filmMarginAtStudio(engine), CLIP_MARGIN_FLOOR)
}

/** Custo fal do clipe em US$ (i2v = t2v na fal hoje). */
export function clipFalUsd(engine: ClipEngineKey, seconds: number, _withImage = false): number {
  return Math.round(CLIP_COSTS[engine].usdPerSecond * seconds * 10000) / 10000
}

// ═══ KINEO-CLIP-PRECO-MERCADO-2026-10-05 — PREÇO POR SEGUNDO ~10% ABAIXO DO CONCORRENTE, NUNCA NO PREJUÍZO ═══
// Fundador (04/10): clipe = porta de entrada, comparado na mesma aba com Higgsfield/Kling/Runway. A régua (90% do
// concorrente mais barato no MESMO modelo e resolução, piso de 40% de margem — desde KINEO-PRECOS-CLIPES-KLING25-1610 no
// crédito de CLIP_FLOOR_USD_PER_CREDIT, o Creator mensal; antes, no do Studio —, "IMPOSSÍVEL A −10%"
// quando o mercado vende abaixo do que a fal nos cobra) mora em lib/clips/clipPriceVsMarket.ts, com fonte/URL/data de
// cada número. DESLIGADO = clipCreditCost devolve EXATAMENTE a regra de 29/09 (guardião
// scripts/test-clip-preco-mercado-2026-10-05.mjs prova motor a motor, duração a duração). Ligar é decisão de preço
// público do fundador.
export const CLIP_PRECO_MERCADO_PUBLIC = true // fundador 05/10: −10% do concorrente onde a margem deixa; senão piso de 40%

/** US$ 29,90 (2990 centavos) — espelho de TIER_PRICES.basic.usd (Creator) em lib/checkoutPricing.ts (guardião confere).
 *  KINEO-PRECO-TESTE-2026-10-08 — DEIXOU de acompanhar o Creator: no teste de 7 dias o Creator voltou a $19,90, e se esta
 *  referência acompanhasse, todo clipe da régua de mercado ficaria ~50% mais caro EM CRÉDITOS (créditos = alvo em US$ ÷
 *  US$/crédito) sem decisão do fundador. Fica congelada no valor em que a régua de 05-06/10 foi decidida; o guardião
 *  scripts/test-clip-preco-mercado-2026-10-05.mjs confere o 2990. Se o Creator ficar em $19,90 depois do teste, rever a
 *  régua dos clipes é decisão de preço do fundador. */
export const CREATOR_PLAN_USD_CENTS = 2990
/** 150 créditos — espelho de TIER_CREDITS.basic (Creator) em lib/checkoutPricing.ts (guardião confere). */
export const CREATOR_PLAN_CREDITS = 150
export const CREATOR_USD_PER_CREDIT = CREATOR_PLAN_USD_CENTS / 100 / CREATOR_PLAN_CREDITS

/** A decisão da régua de mercado para o motor e a duração (vale com o interruptor ligado; a tabela do fundador lê daqui). */
export function clipMarketDecision(engine: ClipEngineKey, seconds: number, withImage = false): MarketDecision {
  return decideMarketClipPrice(engine, seconds, {
    houseFalUsdPerSecond: CLIP_COSTS[engine].usdPerSecond,
    floorUsdPerCredit: CLIP_FLOOR_USD_PER_CREDIT, // KINEO-PRECOS-CLIPES-KLING25-1610 (era STUDIO_USD_PER_CREDIT)
    refUsdPerCredit: CREATOR_USD_PER_CREDIT,
    shelfMaxUsdCents: STUDIO_PLAN_USD_CENTS,
    minCredits: CLIP_MIN_CREDITS,
    fallbackCredits: clipCreditCostRegra2909(engine, seconds, withImage),
  })
}

// ═══ KINEO-S25-CLIPES-2026-10-06 — O PREÇO DO CLIPE DO SEEDANCE 2.5: UMA CONSTANTE, DECISÃO DO FUNDADOR ═══
// fundador 06/10: opção C, igualar Runway Pro seedance-2.5 480p, chamariz.
//   5 s = 8 cr e 10 s = 16 cr (≈ US$ 1,59 e 3,19 no crédito do Creator). A Runway Pro vende o 2.5 a 480p por 20 cr/s num
//   plano de US$ 35 / 2.250 cr = US$ 0,311/s → US$ 1,56 por 5 s e 3,11 por 10 s (clipPriceVsMarket 'runway-s25-pro',
//   fonte oficial). 7 s e 15 s (o catálogo do 2.5 também os oferece — regra das durações de 29/09) seguem a MESMA conta da
//   decisão: ceil(preço da Runway Pro ÷ US$/crédito do Creator) = 11 e 24 cr.
//   Conferido em 06/10 depois da decisão: a 480p o oficial mais barato é a Higgsfield Plus (US$ 0,74 / 5 s — abaixo do custo
//   da fal, ~US$ 1,07–1,10), e a Pika vende 720p a US$ 1,36 / 5 s; igualar a Higgsfield daria prejuízo (4 cr / 5 s).
// (06/10) Ficava ABAIXO do piso de 40% da régua de mercado de propósito (chamariz): margem ~30–35% no crédito do Creator a
// US$ 29,90. Com o Creator a US$ 19,90 virou prejuízo — ver KINEO-PRECOS-CLIPES-KLING25-1610 logo abaixo.
// Trocar o preço = editar ESTA constante e nada mais (tela, débito e tabela do /pricing leem clipCreditCost).
// null = o 2.5 volta para a régua de mercado ("IMPOSSÍVEL A −10%").
// Guardião: scripts/test-s25-clipes-2026-10-06.mjs (a tabela cobre toda duração oferecida).
// ═══ KINEO-PRECOS-CLIPES-KLING25-1610 — 8/11/16/24 → 14/20/28/42 (fundador 15/10, "Sim para as 3") ═══
// O chamariz de 06/10 foi calculado sobre o Creator a US$ 29,90; com o Creator a US$ 19,90 cada clipe do 2.5 dava
// PREJUÍZO no crédito de quem compra (−4% a −6% no Creator mensal). Os valores novos são exatamente o piso de 40% da régua
// no crédito do Creator mensal (custo fal 0,2205/s, o maior conhecido): margem 40,6% / 41,8% / 40,6% / 40,6%.
export const CLIP_S25_CREDITS: Readonly<Record<number, number>> | null = { 5: 14, 7: 20, 10: 28, 15: 42 }

/** Créditos decididos para o clipe do 2.5 nesta duração, ou null (sem decisão para ela: vale a régua). */
export function clipS25DecidedCredits(seconds: number): number | null {
  if (!CLIP_S25_CREDITS) return null
  if (!Number.isInteger(seconds) || seconds <= 0) throw new Error('clipCreditCost: seconds must be a positive integer')
  return Object.prototype.hasOwnProperty.call(CLIP_S25_CREDITS, seconds) ? CLIP_S25_CREDITS[seconds] : null
}

/** Créditos do clipe. Só aceita segundos inteiros positivos; o catálogo decide quais o motor oferece. */
export function clipCreditCost(engine: ClipEngineKey, seconds: number, withImage = false): number {
  // KINEO-S25-CLIPES-2026-10-06 — o preço decidido pelo fundador vence as duas réguas abaixo (que seguem valendo para os
  // outros motores). Duração sem decisão cai na régua — nunca abaixo do custo —, e o guardião prova que não há buraco.
  const decided = engine === 's25' ? clipS25DecidedCredits(seconds) : null
  if (decided !== null) return decided
  if (CLIP_PRECO_MERCADO_PUBLIC) {
    if (!Number.isInteger(seconds) || seconds <= 0) throw new Error('clipCreditCost: seconds must be a positive integer')
    return clipMarketDecision(engine, seconds, withImage).credits
  }
  return clipCreditCostRegra2909(engine, seconds, withImage)
}

/** A regra de 29/09 (a de hoje): margem ≥ a do filme do motor e ≥ 50%, mínimo de 5 cr. */
export function clipCreditCostRegra2909(engine: ClipEngineKey, seconds: number, withImage = false): number {
  if (!Number.isInteger(seconds) || seconds <= 0) throw new Error('clipCreditCost: seconds must be a positive integer')
  const perCreditKept = STUDIO_USD_PER_CREDIT * (1 - clipTargetMargin(engine))
  // Arredonda a 6 casas antes do ceil: 7,000000001 de ruído de ponto flutuante não vira 8 créditos.
  const raw = Math.round((clipFalUsd(engine, seconds, withImage) / perCreditKept) * 1e6) / 1e6
  return Math.max(CLIP_MIN_CREDITS, Math.ceil(raw))
}

/**
 * KINEO-EFEITOS-NOVOS-2026-10-13 — créditos de um EFEITO-MODELO (lib/clips/clipEffects.ts `template`: efeito pronto do
 * fornecedor, custo fixo por clipe). Mesma régua de 29/09 sem filme de referência: piso de 50% de margem no crédito do Studio
 * e mínimo de 5 cr. Não mexe no preço de nenhum outro clipe. (KINEO-PRECOS-CLIPES-KLING25-1610: o Studio NÃO é mais o
 * crédito mais barato da casa; os efeitos de hoje dão ≥ 47% no Creator mensal, e scripts/test-precos-clipes-kling25-1610.mjs
 * trava isso.)
 */
export function clipTemplateCreditCost(usd: number): number {
  if (typeof usd !== 'number' || !Number.isFinite(usd) || usd <= 0) throw new Error('clipTemplateCreditCost: usd must be a positive number')
  const raw = Math.round((usd / (STUDIO_USD_PER_CREDIT * (1 - CLIP_MARGIN_FLOOR))) * 1e6) / 1e6
  return Math.max(CLIP_MIN_CREDITS, Math.ceil(raw))
}

/** Margem real do clipe no crédito do Studio (0..1), para a tabela e o guardião. */
export function clipMarginAtStudio(engine: ClipEngineKey, seconds: number, withImage = false): number {
  const revenue = clipCreditCost(engine, seconds, withImage) * STUDIO_USD_PER_CREDIT
  return 1 - clipFalUsd(engine, seconds, withImage) / revenue
}
