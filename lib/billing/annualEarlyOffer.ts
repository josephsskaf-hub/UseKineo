// KINEO-KIT-BF-VENDA-2010 — OFERTA ANTECIPADA DO ANUAL: "2 meses grátis no anual" (pague 10, leve 12) até 21/11/2026 (fundador 19/10,
// "3 decisões sim"; execução 20/10).
//
// REGRA (sem somar descontos): durante a janela, o preço anual cobrado = o MENOR entre o anual vigente do site (ANNUAL_PRICES, hoje 30% off
// = 12 × mensal × 0,70) e 10 × o mensal. Fora da janela = o anual vigente, sem mudança nenhuma.
// QUEM VENCE HOJE (preços de 20/10): o anual vigente em TODOS os planos — Starter 83 < 99 · Creator 167 < 199 · Studio 460 < 549 (10 × mensal).
//   30% off equivale a pagar 8,4 meses; "2 meses grátis" = pagar 10. Ou seja, com os preços de hoje a oferta NÃO muda nenhum valor cobrado,
//   e por isso o selo com a contagem NÃO aparece (anunciar "até 21/11" um preço que continua igual depois seria urgência falsa). O selo e o
//   preço da oferta só acordam num plano em que 10 × o mensal fique ABAIXO do anual vigente (ex.: se o desconto do anual cair abaixo de 16,7%).
//   O Business não tem anual (só mensal, sem cupom: NO_PROMOTION_PLAN_TIERS) e o Autopilot também não — ficam fora.
// RECARGA ANUAL: quem pagar o preço da oferta (quando ele vencer) recebe o grant CHEIO — annualRefillCredits trata como "legado" só o que
//   ficou abaixo do PISO da oferta (annualEarlyOfferFloorMinor), nunca o próprio preço da oferta.
//
// MÓDULO PURO E SEM IMPORT: o checkout (app/api/stripe/checkout, anual), a recarga (lib/billing/annualRefill.ts), a rota da oferta
// (/api/offers/black-friday) e o guardião scripts/test-kit-bf-venda-2010.mjs leem DAQUI. Os preços entram por argumento (do servidor).

/** Fim da oferta: 21/11/2026 24:00 em Brasília (UTC−3) = 22/11 03:00 UTC. Depois disso desliga sozinha (relógio do servidor). */
export const ANNUAL_EARLY_OFFER_ENDS_AT = '2026-11-22T03:00:00.000Z'
/** "Pague 10, leve 12". */
export const ANNUAL_EARLY_OFFER_PAID_MONTHS = 10
export const ANNUAL_EARLY_OFFER_ID = 'annual_2m_free_2026_bf' as const

/** A janela está aberta AGORA? */
export function annualEarlyOfferOpen(nowMs: number = Date.now()): boolean {
  return Number.isFinite(nowMs) && nowMs < Date.parse(ANNUAL_EARLY_OFFER_ENDS_AT)
}

/** 10 × o mensal (em centavos). Mensal inválido = null. */
export function tenTimesMonthlyMinor(monthlyMinor: number): number | null {
  return Number.isInteger(monthlyMinor) && monthlyMinor > 0 ? monthlyMinor * ANNUAL_EARLY_OFFER_PAID_MONTHS : null
}

/** Quem vence num plano: o anual vigente ('current') ou "2 meses grátis" ('two_months_free'). Empate = o vigente (nada muda). */
export function annualEarlyOfferWinner(currentAnnualMinor: number, monthlyMinor: number): 'current' | 'two_months_free' {
  const ten = tenTimesMonthlyMinor(monthlyMinor)
  return ten !== null && Number.isInteger(currentAnnualMinor) && ten < currentAnnualMinor ? 'two_months_free' : 'current'
}

/** O PISO: o menor preço anual que o site pode ter cobrado na janela (a recarga anual dá o grant cheio a partir dele). */
export function annualEarlyOfferFloorMinor(currentAnnualMinor: number, monthlyMinor: number): number {
  return annualEarlyOfferWinner(currentAnnualMinor, monthlyMinor) === 'two_months_free' ? (tenTimesMonthlyMinor(monthlyMinor) as number) : currentAnnualMinor
}

/** O preço anual que o checkout cobra AGORA: na janela, o menor dos dois; fora dela (ou empate/derrota), o anual vigente — o MESMO número de antes. */
export function annualEarlyOfferPriceMinor(currentAnnualMinor: number, monthlyMinor: number, nowMs: number = Date.now()): number {
  return annualEarlyOfferOpen(nowMs) ? annualEarlyOfferFloorMinor(currentAnnualMinor, monthlyMinor) : currentAnnualMinor
}

/** O selo do plano: só com a janela aberta E a oferta baixando o preço de verdade. null = nenhum selo (o caso de todos os planos hoje). */
export function annualEarlyOfferBadge(currentAnnualMinor: number, monthlyMinor: number, nowMs: number = Date.now()): { priceMinor: number; savedMinor: number; daysLeft: number } | null {
  if (!annualEarlyOfferOpen(nowMs) || annualEarlyOfferWinner(currentAnnualMinor, monthlyMinor) !== 'two_months_free') return null
  const priceMinor = tenTimesMonthlyMinor(monthlyMinor) as number
  const ms = Date.parse(ANNUAL_EARLY_OFFER_ENDS_AT) - nowMs
  return { priceMinor, savedMinor: currentAnnualMinor - priceMinor, daysLeft: Math.max(1, Math.ceil(ms / 86_400_000)) }
}
