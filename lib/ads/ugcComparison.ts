// ═══ KINEO-CHECKOUT-CLAREZA-1610 — ANÚNCIO NA KINEO × CRIADOR UGC HUMANO (fundador 16/10, "tudo sim", jogada 2) ═══════
// Uma linha de comparação honesta onde se vende anúncio (/ads, seção Price; e o bloco do plano Business no /pricing).
//
// FONTE DO NÚMERO DE MERCADO (nunca inventado; rotulado "market estimate" na tela):
//   US$ 150–500 por vídeo de criador UGC humano — guia de preços da Billo, citado por sync.so em
//   https://sync.so/blog/ai-ugc (junho de 2026), acessado em 15/10/2026 para docs/PESQUISA-FECHAMENTO-CONCORRENTES-2026-10-16.md
//   (seções 5.2 e 7). Se a fonte mudar, muda AQUI e as duas telas acompanham.
//
// O LADO DA KINEO É CALCULADO, NUNCA DIGITADO: o preço do plano (centavos, das tabelas do caixa) × os créditos que UM
// anúncio debita (adsV2Credits / BUSINESS_AD_CREDITS, as funções que a rota cobra) ÷ os créditos do plano. É o valor
// proporcional do plano que um anúncio usa — não um preço avulso — e a frase diz isso ("of the X plan").
// Não promete resultado de anúncio (CTR, vendas): só custo.
//
// MÓDULO PURO E SEM IMPORT (o guardião scripts/test-checkout-clareza-1610.mjs o executa cru).

export const UGC_CREATOR_PRICE_USD = { low: 150, high: 500 } as const
export const UGC_CREATOR_PRICE_SOURCE = 'Billo UGC pricing guide, cited by sync.so (https://sync.so/blog/ai-ugc), June 2026'
/** A frase de mercado, a mesma nas duas telas. */
export const UGC_CREATOR_LINE = `A human UGC creator typically charges US$ ${UGC_CREATOR_PRICE_USD.low}–${UGC_CREATOR_PRICE_USD.high} per video (market estimate).`

/** Centavos do plano que um anúncio de `adCredits` usa: preço × créditos do anúncio ÷ créditos do plano. null se não fecha. */
export function adShareOfPlanMinor(planPriceMinor: number, planCredits: number, adCredits: number): number | null {
  if (![planPriceMinor, planCredits, adCredits].every((n) => Number.isFinite(n) && n > 0)) return null
  if (adCredits > planCredits) return null
  return Math.round((planPriceMinor * adCredits) / planCredits)
}

/** "US$ 5.61" — sem regex (o valor nunca passa por replace). */
export function usdMinorLabel(minor: number): string {
  const n = Math.round(minor)
  return `US$ ${Math.floor(n / 100)}.${String(n % 100).padStart(2, '0')}`
}

/** /ads: "…(market estimate). On Kineo, a 15-second ad uses 34–51 credits: about US$ 5.61–8.50 of the Starter plan." */
export function adsUgcComparisonLine(input: { planName: string; planPriceMinor: number; planCredits: number; seconds: number; adCredits: readonly number[] }): string | null {
  const credits = input.adCredits.filter((c) => Number.isFinite(c) && c > 0)
  if (credits.length === 0) return null
  const lo = Math.min(...credits)
  const hi = Math.max(...credits)
  const loMinor = adShareOfPlanMinor(input.planPriceMinor, input.planCredits, lo)
  const hiMinor = adShareOfPlanMinor(input.planPriceMinor, input.planCredits, hi)
  if (loMinor === null || hiMinor === null) return null
  const range = lo === hi ? `${lo} credits: about ${usdMinorLabel(loMinor)}` : `${lo}–${hi} credits: about ${usdMinorLabel(loMinor)}–${usdMinorLabel(hiMinor).slice(4)}`
  return `${UGC_CREATOR_LINE} On Kineo, a ${input.seconds}-second ad uses ${range} of the ${input.planName} plan.`
}

/** Business: "…(market estimate). On Business, each 15-second ad works out to about US$ 7.00." */
export function businessUgcComparisonLine(input: { planPriceMinor: number; adsPerMonth: number; seconds: number }): string | null {
  if (!Number.isFinite(input.planPriceMinor) || input.planPriceMinor <= 0 || !Number.isInteger(input.adsPerMonth) || input.adsPerMonth < 1) return null
  return `${UGC_CREATOR_LINE} On Business, each ${input.seconds}-second ad works out to about ${usdMinorLabel(Math.round(input.planPriceMinor / input.adsPerMonth))}.`
}
