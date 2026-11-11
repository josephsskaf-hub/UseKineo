// KINEO-BARRA-3H-MENSAL-1111 [CEO 11/11, oferta — só publica com o sim do fundador] — a barra fina das 3 h deixa de anunciar o
// anual de 50% e passa a anunciar os 30% do 1º mês do MENSAL ("Your 30% off the first month ends in 2:41:07 →"), com link para
// /pricing?from=welcome_bar SEM `billing` — o /pricing abre no mensal (KINEO-PRICING-MENSAL-1111), onde os cartões já mostram os 30%;
// o anual de 50% segue a um clique na própria página.
// Por quê (medido 11/11): a barra é vista por ~136 pessoas por semana e levava a /pricing?billing=annual, passando por cima da aba
// mensal e escondendo os 30%; desde 05/11: 136 viram → 4 clicaram → 2 checkouts com a oferta do anual → 0 pagos; e 0 anuais no
// checkout em 60 dias (12 de 12 vendas mensais).
// O relógio é o MESMO das duas ofertas (created_at + 3 h, lido no servidor); a barra só anuncia o mensal se a oferta mensal estiver
// viva (MONTHLY_FIRST_MONTH_3H_LIVE) — senão volta ao texto do anual, que é o que de fato vale.
// Volta: KINEO_BARRA_3H_MENSAL_1111 = 'off' → a barra de 04/11, byte a byte no texto e no link.
// Medida: annual_welcome_bar_shown/_clicked levam offer + version; o checkout já grava monthly_first_month_3h_applied.
// Leitura: docs/queries/BARRA-3H-MENSAL-2026-11-11.sql.
import { MONTHLY_FIRST_MONTH_3H_LIVE, MONTHLY_FIRST_MONTH_OFFER_KIND } from '@/lib/billing/monthlyFirstMonthOffer'

export const KINEO_BARRA_3H_MENSAL_1111 = 'on' as 'on' | 'off'
export const BARRA_3H_VERSION = 'barra_3h_mensal_1111'
/** O destino da barra no mensal: o /pricing sem `billing` (abre no mensal). */
export const BARRA_3H_MONTHLY_HREF = '/pricing?from=welcome_bar'

export type Barra3hModo = 'monthly' | 'annual'

/** O que a barra anuncia. 'monthly' só com o interruptor ligado E a oferta mensal viva. */
export function barra3hModo(chave: 'on' | 'off' = KINEO_BARRA_3H_MENSAL_1111, monthlyLive: boolean = MONTHLY_FIRST_MONTH_3H_LIVE): Barra3hModo {
  return chave === 'on' && monthlyLive ? 'monthly' : 'annual'
}

/** Para onde o clique leva. No anual, o link de sempre (recebido de fora, para não redigitar). */
export function barra3hHref(modo: Barra3hModo, annualHref: string): string {
  return modo === 'monthly' ? BARRA_3H_MONTHLY_HREF : annualHref
}

/** A releitura de /api/offers/annual-welcome: a janela da oferta QUE A BARRA ANUNCIA, ou null (a barra some). */
export function barra3hJanela(modo: Barra3hModo, j: { nowMs?: unknown; offer?: unknown; endsAtMs?: unknown; monthlyOffer?: unknown; monthlyEndsAtMs?: unknown } | null): { nowMs: number; endsAtMs: number } | null {
  if (!j || typeof j.nowMs !== 'number') return null
  if (modo === 'monthly') return j.monthlyOffer === MONTHLY_FIRST_MONTH_OFFER_KIND && typeof j.monthlyEndsAtMs === 'number' ? { nowMs: j.nowMs, endsAtMs: j.monthlyEndsAtMs } : null
  return j.offer === 'welcome_3h' && typeof j.endsAtMs === 'number' ? { nowMs: j.nowMs, endsAtMs: j.endsAtMs } : null
}

/** O que os eventos da barra gravam: qual oferta ela anunciava e a versão (o corte antes/depois, nunca o relógio). */
export function barra3hMetadata(modo: Barra3hModo): { offer: 'monthly_first_month_3h' | 'annual_welcome_3h'; offer_version: string } {
  return { offer: modo === 'monthly' ? 'monthly_first_month_3h' : 'annual_welcome_3h', offer_version: BARRA_3H_VERSION }
}
