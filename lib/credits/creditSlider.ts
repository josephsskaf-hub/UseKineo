// ═══ KINEO-BARRA-DE-CREDITOS-2026-09-23 — decisão do fundador ═══
// "vai com mínimo 50, escada aprovada, pode liberar" (23/09, exceção registrada ao congelamento de oferta até 09/10;
// doc: docs/DECISAO-BARRA-DE-CREDITOS-2026-09-23.md). No lugar de 4 blocos fixos, uma barra: a pessoa arrasta, vê o
// preço e compra. O caso que abriu a conversa: 23/09 21:20Z, vindo do ChatGPT, comprou 30 créditos por $5,90 no pop-up.
//
// ESCADA (aprovada): US$ 0,199 por crédito até 100; cai em linha reta até US$ 0,149 em 1.000; fica em 0,149 até 2.000.
// Preço = dólares inteiros arredondados − US$ 0,10 (etiqueta ",90" da casa). O piso 0,149 fica ACIMA do plano mais barato
// por crédito (Creator/Studio ≈ 0,133): assinar continua sendo o melhor negócio — invariante (1) de lib/checkoutPricing,
// conferido pelo guardião scripts/test-barra-de-creditos-2026-09-23.mjs em TODOS os degraus.
//
// Fonte única: a barra (UI), a rota da Stripe e o guardião leem daqui. O cliente só manda a QUANTIDADE; o preço é sempre
// recalculado no servidor. Nada aqui chama rede.
export const CREDIT_SLIDER_PACK_ID = 'credits_custom'
export const CREDIT_SLIDER_MIN = 50
export const CREDIT_SLIDER_MAX = 2000
export const CREDIT_SLIDER_STEP = 10
export const CREDIT_SLIDER_DEFAULT = 300

const RATE_TOP = 0.199
const RATE_FLOOR = 0.149
const TAPER_FROM = 100
const TAPER_TO = 1000

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

/** Preço em centavos de dólar (terminando em ,90), ou null se a quantidade não é válida. */
export function sliderPriceUsdMinor(credits: unknown): number | null {
  const n = normalizeSliderCredits(credits)
  if (n === null) return null
  const dollars = Math.max(1, Math.round(n * sliderRatePerCredit(n)))
  return dollars * 100 - 10
}
