// KINEO-ANUAL-RECARGA-MENSAL-2026-09-24 — o plano anual passa a receber créditos
// TODO MÊS, como o FAQ sempre prometeu.
//
// O DEFEITO (achado na análise de 23/09): a assinatura anual é uma fatura por
// ano; o webhook concede TIER_CREDITS em invoice.payment_succeeded, ou seja,
// UMA vez a cada 12 meses. O FAQ do /pricing diz "Credits reset each month (no
// rollover)". Quem pagasse US$99 pelo ano receberia 1 mês de crédito. Zero
// vendas anuais na vida até 24/09 — nenhuma vítima, mas o /pricing abria no
// anual por padrão até 23/09. Fundador (24/09): "recarga mensal".
//
// O QUE ESTE MÓDULO É: puro. Nem Stripe, nem Supabase, nem crypto. Ele decide
// (a) quais meses de uma assinatura anual já venceram, (b) quantos créditos
// cada mês vale e (c) a chave idempotente de cada recarga. Quem lê a Stripe,
// grava o razão em `events` e faz o SET no perfil é o cron
// app/api/cron/annual-credit-refill (server).
//
// REGRAS ESPELHADAS DO WEBHOOK (renovação mensal, app/api/stripe/webhook):
//  · a recarga é SET, não soma — "no rollover" vale para o anual também;
//  · o mês 0 é o da própria fatura (já concedido pelo webhook); aqui vão os
//    meses 1..11; o mês 12 é a fatura seguinte;
//  · quem pagou o preço anual ANTIGO (menor que ANNUAL_PRICES vigente) recebe
//    o grant antigo (LEGACY_TIER_CREDITS_V6), como a renovação mensal faz com
//    renewalCreditsFor; em BRL o anual só existe desde 09/09 na tabela vigente,
//    então não há legado a honrar;
//  · cinematic_tokens: Studio = 1, demais = 0 (Push #088).
import {
  ANNUAL_PRICES,
  LEGACY_TIER_CREDITS_V6,
  TIER_CREDITS,
  type CheckoutTier,
} from '@/lib/checkoutPricing'

export const ANNUAL_REFILL_VERSION = 'annual_refill_v1' as const
export const ANNUAL_REFILL_EVENT = 'annual_credit_refill' as const
/** Meses 1..11 recebem recarga; o 12 é a próxima fatura anual. */
export const ANNUAL_REFILL_MAX_MONTH = 11
export const ANNUAL_TIERS: readonly CheckoutTier[] = ['starter', 'basic', 'pro']

/** Só os 3 planos self-serve têm anual. Autopilot/Lite não. */
export function annualTierFromMetadata(tier: unknown): CheckoutTier | null {
  return typeof tier === 'string' && (ANNUAL_TIERS as readonly string[]).includes(tier) ? (tier as CheckoutTier) : null
}

/**
 * Soma meses em UTC prendendo o dia do mês (31/01 + 1 mês = 28/02 ou 29/02,
 * nunca 03/03). É a mesma aritmética que a Stripe usa para ciclos mensais.
 */
export function addUtcMonths(ms: number, months: number): number {
  const d = new Date(ms)
  const day = d.getUTCDate()
  const target = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + months, 1, d.getUTCHours(), d.getUTCMinutes(), d.getUTCSeconds(), d.getUTCMilliseconds()))
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate()
  target.setUTCDate(Math.min(day, lastDay))
  return target.getTime()
}

/** Data (ms) em que a recarga do mês k vence, contada do início do período anual. */
export function annualRefillDueAt(periodStartSec: number, monthIndex: number): number {
  return addUtcMonths(periodStartSec * 1000, monthIndex)
}

/**
 * Os índices de mês (1..11) cuja recarga já venceu em `nowMs`. Vazio no
 * primeiro mês (a fatura já pagou) e sempre vazio para período inválido.
 */
export function annualRefillDueMonths(periodStartSec: number, nowMs: number): number[] {
  if (!Number.isFinite(periodStartSec) || periodStartSec <= 0 || !Number.isFinite(nowMs)) return []
  const due: number[] = []
  for (let k = 1; k <= ANNUAL_REFILL_MAX_MONTH; k++) {
    if (annualRefillDueAt(periodStartSec, k) <= nowMs) due.push(k)
  }
  return due
}

/**
 * Créditos da recarga: o grant vigente do plano, ou o grant antigo quando o
 * preço anual pago é menor que o vigente (assinante que entrou antes de uma
 * subida de preço). Moeda que não é USD não tem legado a honrar.
 */
export function annualRefillCredits(
  tier: CheckoutTier,
  annualAmountMinor: number | null | undefined,
  currency: string | null | undefined,
): number {
  const cur = typeof currency === 'string' ? currency.trim().toLowerCase() : 'usd'
  if (cur === 'usd' && typeof annualAmountMinor === 'number' && annualAmountMinor > 0 && annualAmountMinor < ANNUAL_PRICES[tier].usd) {
    return LEGACY_TIER_CREDITS_V6[tier]
  }
  return TIER_CREDITS[tier]
}

/** Espelho do webhook (Push #088): Studio renova com 1 token cinemático, os demais com 0. */
export function annualRefillCinematicTokens(tier: CheckoutTier): number {
  return tier === 'pro' ? 1 : 0
}

/**
 * Chave idempotente da recarga: assinatura + início do período + mês. O cron
 * transforma isto num uuid determinístico (sha256) para o `id` da linha de
 * `events`; a segunda rodada bate em 23505 e não concede duas vezes.
 */
export function annualRefillEventKey(subscriptionId: string, periodStartSec: number, monthIndex: number): string {
  return `${ANNUAL_REFILL_EVENT}:${subscriptionId}:${periodStartSec}:${monthIndex}`
}
