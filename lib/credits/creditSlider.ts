// ═══ KINEO-BARRA-DE-CREDITOS-2026-09-23 — decisão do fundador ═══
// "vai com mínimo 50, escada aprovada, pode liberar" (23/09, exceção registrada ao congelamento de oferta até 09/10;
// doc: docs/DECISAO-BARRA-DE-CREDITOS-2026-09-23.md). No lugar de 4 blocos fixos, uma barra: a pessoa arrasta, vê o
// preço e compra. O caso que abriu a conversa: 23/09 21:20Z, vindo do ChatGPT, comprou 30 créditos por $5,90 no pop-up.
// KINEO-PRECO-V8-A-2026-09-28 subiu o piso para 0,189; KINEO-PRECO-MERCADO-0411 tirou a barra de venda (TOPUPS_LIVE).
//
// ═══ KINEO-RECARGA-ASSINANTE-1111 [fundador 11/11: "Aprovado pode fazer" — 60 créditos por US$ 9 · "eu aprovo a escada de
// 9 dólares até 500 dólares… só para assinantes"] — A ESCADA NOVA, que troca a de 23/09 e a de 28/09 ═══
// ÂNCORA = o botão do aviso de sem crédito: 60 créditos por US$ 9 (US$ 0,150 por crédito). É o PRIMEIRO degrau da barra e
// a MESMA constante do botão: trocar a oferta é UMA linha (RECARGA_ASSINANTE_1111). Daí a escada desce em linha reta até
// US$ 0,135 por crédito em 2.000 créditos e fica em 0,135 até o teto de 3.700 créditos = US$ 500. Preço em dólar inteiro
// (sem o ",90" antigo), passo de 10. Conferência do fundador: 60 → 9 · 350 → 52 · 700 → 102 · 2.000 → 270 · 3.700 → 500.
// O piso 0,135 fica ACIMA do crédito mais barato dos planos (Studio US$ 59 / 470 = 0,1255): assinar continua sendo o
// melhor negócio — o guardião scripts/test-barra-de-creditos-2026-09-23.mjs confere em TODOS os degraus, junto com a
// margem com cartão internacional (netAfterStripeIntlCardUsd abaixo).
//
// Fonte única: a barra (UI), o botão, a rota da Stripe, o webhook e os guardiões leem daqui. O cliente só manda a
// QUANTIDADE; o preço é sempre recalculado no servidor. MÓDULO PURO (sem import): dezenas de guardiões o carregam sozinho.

/** O botão do assinante que zerou e o primeiro degrau da barra — UMA constante. */
export const RECARGA_ASSINANTE_1111 = { usdMinor: 900, credits: 60 } as const

export const CREDIT_SLIDER_PACK_ID = 'credits_custom'
export const CREDIT_SLIDER_MIN = RECARGA_ASSINANTE_1111.credits
export const CREDIT_SLIDER_MAX = 3700
export const CREDIT_SLIDER_STEP = 10
export const CREDIT_SLIDER_DEFAULT = 350

const RATE_TOP = RECARGA_ASSINANTE_1111.usdMinor / 100 / RECARGA_ASSINANTE_1111.credits // 0,150
const RATE_FLOOR = 0.135
const TAPER_FROM = RECARGA_ASSINANTE_1111.credits
const TAPER_TO = 2000

/** Quantidade válida (inteira, dentro da faixa, múltipla do passo) ou null. */
export function normalizeSliderCredits(raw: unknown): number | null {
  const n = typeof raw === 'number' ? raw : typeof raw === 'string' && /^\d{1,5}$/.test(raw.trim()) ? Number(raw.trim()) : NaN
  if (!Number.isInteger(n)) return null
  if (n < CREDIT_SLIDER_MIN || n > CREDIT_SLIDER_MAX) return null
  if (n % CREDIT_SLIDER_STEP !== 0) return null
  return n
}

/** Dólares por crédito na escada aprovada. */
export function sliderRatePerCredit(credits: number): number {
  if (credits <= TAPER_FROM) return RATE_TOP
  if (credits >= TAPER_TO) return RATE_FLOOR
  return RATE_TOP - ((credits - TAPER_FROM) * (RATE_TOP - RATE_FLOOR)) / (TAPER_TO - TAPER_FROM)
}

/** Preço em centavos de dólar (dólar inteiro), ou null se a quantidade não é válida. O primeiro degrau é EXATAMENTE a
 *  âncora do botão (RECARGA_ASSINANTE_1111.usdMinor). */
export function sliderPriceUsdMinor(credits: unknown): number | null {
  const n = normalizeSliderCredits(credits)
  if (n === null) return null
  const dollars = Math.max(1, Math.round(n * sliderRatePerCredit(n)))
  return dollars * 100
}

/** "$9" / "$52" — preço em dólar inteiro (centavos só se um dia houver). A ÚNICA forma de um preço desta escada virar texto. */
export function usdWholeLabel(minor: number): string {
  const usd = minor / 100
  return Number.isInteger(usd) ? `$${usd.toLocaleString('en-US')}` : `$${usd.toFixed(2)}`
}

/** Stripe com cartão INTERNACIONAL (2,9% + 1,5% + US$ 0,30): o pior caso de taxa para a prova de margem dos guardiões. */
export function netAfterStripeIntlCardUsd(grossUsd: number): number {
  return grossUsd * (1 - 0.044) - 0.3
}
