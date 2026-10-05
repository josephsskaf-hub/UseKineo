// KINEO-CLIPES-2026-09-29 — PROPOSTA de preço do clipe (decisão de preço público é do fundador; nada disto vai ao ar
// sem o "vai" dele — o CEO leva a tabela antes de publicar).
//
// MÓDULO PURO (só `import type`, apagado na transpilação): o guardião executa isolado.
// (05/10: + um import RELATIVO de outro módulo puro, ./clipPriceVsMarket — o loader dos guardiões resolve './'.)
//
// A REGRA, em uma linha:
//   créditos = max(CLIP_MIN_CREDITS, ceil( custo_fal_do_clipe ÷ ( US$/crédito_do_Studio × (1 − margem_alvo) ) ))
//   margem_alvo = max( margem do FILME do mesmo motor no Studio , CLIP_MARGIN_FLOOR )
//
// POR QUE O STUDIO: é o plano com o crédito MAIS BARATO da casa (US$ 54,90 / 300 cr = US$ 0,183/cr, V8-A de 28/09 —
// lib/checkoutPricing.ts TIER_PRICES.pro e TIER_CREDITS.pro). Se a margem fecha no crédito mais barato, fecha em todo
// plano e na barra (piso da barra US$ 0,189/cr > 0,183, docs/DECISAO-PRECOS-V8-2026-09-28.md).
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
//
// MARGEM DO FILME NO STUDIO (custo fal de um filme de 60 s ÷ receita dos créditos a US$ 0,183):
//   Kling 3 150 cr · US$ 11,00 (CLAUDE.md 18/08: "64-73 s ≈ $11-12"; usamos o PISO do custo = a margem mais alta) → 59,9%
//   Kling 2.5 60 cr · US$ 8,40 (engineCost.ts KINEO-KLING25-60CR: "≈ US$ 8,40 na fal")                          → 23,5%
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

/** US$ 54,90 (5490 centavos) — espelho de TIER_PRICES.pro.usd em lib/checkoutPricing.ts (guardião confere). */
export const STUDIO_PLAN_USD_CENTS = 5490
/** 300 créditos — espelho de TIER_CREDITS.pro em lib/checkoutPricing.ts (guardião confere). */
export const STUDIO_PLAN_CREDITS = 300
export const STUDIO_USD_PER_CREDIT = STUDIO_PLAN_USD_CENTS / 100 / STUDIO_PLAN_CREDITS

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
  kling: { usdPerSecond: 0.07, filmQuality: 'cinematic_kling', filmCredits: 60, filmFalUsd: 8.4 },
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
// concorrente mais barato no MESMO modelo e resolução, piso de 40% de margem no crédito do Studio, "IMPOSSÍVEL A −10%"
// quando o mercado vende abaixo do que a fal nos cobra) mora em lib/clips/clipPriceVsMarket.ts, com fonte/URL/data de
// cada número. DESLIGADO = clipCreditCost devolve EXATAMENTE a regra de 29/09 (guardião
// scripts/test-clip-preco-mercado-2026-10-05.mjs prova motor a motor, duração a duração). Ligar é decisão de preço
// público do fundador.
export const CLIP_PRECO_MERCADO_PUBLIC = false

/** US$ 29,90 (2990 centavos) — espelho de TIER_PRICES.basic.usd (Creator) em lib/checkoutPricing.ts (guardião confere). */
export const CREATOR_PLAN_USD_CENTS = 2990
/** 150 créditos — espelho de TIER_CREDITS.basic (Creator) em lib/checkoutPricing.ts (guardião confere). */
export const CREATOR_PLAN_CREDITS = 150
export const CREATOR_USD_PER_CREDIT = CREATOR_PLAN_USD_CENTS / 100 / CREATOR_PLAN_CREDITS

/** A decisão da régua de mercado para o motor e a duração (vale com o interruptor ligado; a tabela do fundador lê daqui). */
export function clipMarketDecision(engine: ClipEngineKey, seconds: number, withImage = false): MarketDecision {
  return decideMarketClipPrice(engine, seconds, {
    houseFalUsdPerSecond: CLIP_COSTS[engine].usdPerSecond,
    floorUsdPerCredit: STUDIO_USD_PER_CREDIT,
    refUsdPerCredit: CREATOR_USD_PER_CREDIT,
    shelfMaxUsdCents: STUDIO_PLAN_USD_CENTS,
    minCredits: CLIP_MIN_CREDITS,
    fallbackCredits: clipCreditCostRegra2909(engine, seconds, withImage),
  })
}

/** Créditos do clipe. Só aceita segundos inteiros positivos; o catálogo decide quais o motor oferece. */
export function clipCreditCost(engine: ClipEngineKey, seconds: number, withImage = false): number {
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

/** Margem real do clipe no crédito do Studio (0..1), para a tabela e o guardião. */
export function clipMarginAtStudio(engine: ClipEngineKey, seconds: number, withImage = false): number {
  const revenue = clipCreditCost(engine, seconds, withImage) * STUDIO_USD_PER_CREDIT
  return 1 - clipFalUsd(engine, seconds, withImage) / revenue
}
