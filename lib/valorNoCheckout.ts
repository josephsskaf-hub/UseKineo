// KINEO-VALOR-NO-CHECKOUT-3110 — o valor na hora de pagar, nas unidades do produto (filmes), nunca em créditos soltos.
//
// O vazamento medido (7 d até 31/10): 33 pessoas abriram o checkout 155 vezes (4,7 cada) e 1 pagou. A conclusão fechada do
// fundador é PERCEPÇÃO DE PREÇO ("acham caro"). Este módulo NÃO muda preço, plano, crédito nem desconto: só traduz o que
// cada plano já compra, com as MESMAS funções que cobram (creditCostForDuration · TIER_CREDITS · TIER_PRICES), para:
//   1. "≈ N more films like this per month" — a partir do filme que a PRÓPRIA pessoa já fez (motor + duração dele);
//   2. "Which plan fits me?" — 3 perguntas (por semana · duração · motor) → o plano MAIS BARATO que cobre, com a conta à vista;
//   3. a prova social real — filmes concluídos nos últimos 30 dias (contas internas fora), só acima de um piso;
//   4. a linha do produto na Stripe no ANUAL — o anual caía na descrição velha ("Fast videos", motor que a conta nova não
//      vê desde 29/09; "priority render queue", que não existe). Os créditos do anual chegam mês a mês (lib/billing/
//      annualRefill.ts), então a MESMA linha do mensal vale, com o aviso "credits arrive monthly".
// Uma régua só: toda tela que mostra um destes números importa daqui. Contagem = floor(créditos ÷ custo), "≈" na tela.
import { creditCostForDuration, type Quality } from './credits/engineCost'
import { TIER_CREDITS, TIER_PRICES, type CheckoutTier } from './checkoutPricing'
import { buildCheckoutValueContext, checkoutPlanLine, type CheckoutValueContextInput } from './growth/checkoutValueContext'
import { engineLabelFor } from './engineLabel'
import { KLING4_PAID_LIVE } from './kling4PaidPolicy'

export const VALOR_NO_CHECKOUT_VERSION = 'valor_no_checkout_3110' as const
export const PLAN_FINDER_OPENED_EVENT = 'plan_finder_opened' as const
export const PLAN_FINDER_RECOMMENDED_EVENT = 'plan_finder_recommended' as const

/** Os três planos de assinatura, do mais barato ao mais caro (a ordem da recomendação). */
export const VALOR_TIERS: readonly CheckoutTier[] = ['starter', 'basic', 'pro']
export const VALOR_TIER_NAMES: Record<CheckoutTier, string> = { starter: 'Starter', basic: 'Creator', pro: 'Studio' }

/** Semanas por mês (52 ÷ 12): "3 por semana" = ceil(3 × 4,33) = 13 filmes no mês. */
export const WEEKS_PER_MONTH = 52 / 12

// ─── 1. "≈ N more films like this" ───────────────────────────────────────────────────────────────────────────────────────
/** Só qualidades de FILME contam (anúncio, avatar e legados não viram "filmes como este" — o custo seria outro). */
const FILM_QUALITIES: ReadonlySet<string> = new Set([
  'fast', 'cinematic_ai', 'cinematic_kling', 'cinematic_veo', 'cinematic_hollywood', 'cinematic_h3', 'cinematic_h3max',
  'cinematic_omni', 'cinematic_s25',
])

export interface FilmsLikeThisTier { tier: CheckoutTier; name: string; credits: number; films: number }
export interface FilmsLikeThis {
  engineLabel: string
  seconds: number
  /** Créditos que UM filme destes custa numa conta paga (a função que cobra). */
  creditsEach: number
  tiers: FilmsLikeThisTier[]
}

/** O que cada plano paga por mês em filmes iguais ao da pessoa; null quando o filme não dá base honesta para a conta. */
export function filmsLikeThis(qualityMode: string | null | undefined, seconds: number | null | undefined): FilmsLikeThis | null {
  const q = String(qualityMode ?? '').toLowerCase().trim()
  if (!FILM_QUALITIES.has(q)) return null
  const engineLabel = q === 'cinematic_hollywood' && KLING4_PAID_LIVE ? 'Kling 4.0' : engineLabelFor(q)
  if (!engineLabel) return null
  if (typeof seconds !== 'number' || !Number.isFinite(seconds) || seconds <= 0) return null
  const secs = Math.round(seconds)
  const creditsEach = creditCostForDuration(q as Quality, true, secs)
  if (!(creditsEach > 0)) return null
  const tiers = VALOR_TIERS.map((tier) => ({ tier, name: VALOR_TIER_NAMES[tier], credits: TIER_CREDITS[tier], films: Math.floor(TIER_CREDITS[tier] / creditsEach) }))
  return { engineLabel, seconds: secs, creditsEach, tiers }
}

/** "≈ 12 more films like this a month on Starter · 30 on Creator · 60 on Studio" (só os planos que pagam ≥ 1). */
export function filmsLikeThisLine(value: FilmsLikeThis | null): string | null {
  if (!value) return null
  const paying = value.tiers.filter((t) => t.films >= 1)
  if (paying.length === 0) return null
  const [first, ...rest] = paying
  const head = `≈ ${first.films} more ${first.films === 1 ? 'film' : 'films'} like this a month on ${first.name}`
  return [head, ...rest.map((t) => `${t.films} on ${t.name}`)].join(' · ')
}

/** "Seedance 1.5 · 35 s · 21 credits each" — a conta à vista, embaixo da linha. */
export function filmsLikeThisMath(value: FilmsLikeThis | null): string | null {
  if (!value) return null
  return `${value.engineLabel} · ${value.seconds} s · ${value.creditsEach} credits each`
}

// ─── 2. "Which plan fits me?" ─────────────────────────────────────────────────────────────────────────────────────────────
export type PlanFinderEngine = 'seedance' | 'kling' | 'cinematic'
export interface PlanFinderEngineOption { key: PlanFinderEngine; quality: Quality; label: string; hint: string }

/** Três estradas que o público vê (Seedance 1.5 · Kling 2.5 · Kling 3/4.0), do custo menor ao maior. */
export const PLAN_FINDER_ENGINES: readonly PlanFinderEngineOption[] = [
  { key: 'seedance', quality: 'cinematic_ai', label: 'Seedance 1.5', hint: 'AI scenes · best value' },
  { key: 'kling', quality: 'cinematic_kling', label: 'Kling 2.5', hint: 'smoother motion' },
  { key: 'cinematic', quality: 'cinematic_hollywood', label: KLING4_PAID_LIVE ? 'Kling 4.0' : 'Kling 3', hint: 'top cinematic' },
]
/** Durações que as três estradas aceitam (lib/durationByEngine.ts supportedDurationsFor: 15/35/60/90 em todas). */
export const PLAN_FINDER_LENGTHS: readonly number[] = [15, 35, 60, 90]
export const PLAN_FINDER_PER_WEEK: readonly { value: number; label: string }[] = [
  { value: 1, label: '1 a week' },
  { value: 3, label: '3 a week' },
  { value: 7, label: 'Every day' },
]

export interface PlanFinderInput { perWeek: number; seconds: number; engine: PlanFinderEngine }
export interface PlanFinderResult {
  filmsPerMonth: number
  creditsEach: number
  creditsNeeded: number
  engineLabel: string
  /** O plano mais barato que cobre o mês inteiro, ou o maior (Studio) quando nenhum cobre. */
  tier: CheckoutTier
  name: string
  covers: boolean
  /** Filmes destes que o plano recomendado paga por mês. */
  filmsOnTier: number
  /** Preço cheio mensal do plano, em centavos de US$ (TIER_PRICES — o preço não muda aqui). */
  monthlyUsdMinor: number
}

export function recommendPlan(input: PlanFinderInput): PlanFinderResult | null {
  const engine = PLAN_FINDER_ENGINES.find((e) => e.key === input.engine)
  if (!engine) return null
  if (!PLAN_FINDER_LENGTHS.includes(input.seconds)) return null
  if (!PLAN_FINDER_PER_WEEK.some((p) => p.value === input.perWeek)) return null
  const creditsEach = creditCostForDuration(engine.quality, true, input.seconds)
  if (!(creditsEach > 0)) return null
  const filmsPerMonth = Math.ceil(input.perWeek * WEEKS_PER_MONTH)
  const creditsNeeded = filmsPerMonth * creditsEach
  const fit = VALOR_TIERS.find((t) => TIER_CREDITS[t] >= creditsNeeded)
  const tier = fit ?? VALOR_TIERS[VALOR_TIERS.length - 1]
  return {
    filmsPerMonth,
    creditsEach,
    creditsNeeded,
    engineLabel: engine.label,
    tier,
    name: VALOR_TIER_NAMES[tier],
    covers: fit !== undefined,
    filmsOnTier: Math.floor(TIER_CREDITS[tier] / creditsEach),
    monthlyUsdMinor: TIER_PRICES[tier].usd,
  }
}

/** A conta que sustenta a recomendação, em uma linha. */
export function planFinderMathLine(r: PlanFinderResult): string {
  return `${r.filmsPerMonth} ${r.engineLabel} films a month × ${r.creditsEach} credits = ${r.creditsNeeded} credits · ${r.name} includes ${TIER_CREDITS[r.tier]}`
}

/** A frase do veredito: cobre (com folga dita) ou, com honestidade, até onde o maior plano chega. */
export function planFinderVerdictLine(r: PlanFinderResult): string {
  return r.covers
    ? `${r.name} covers it — up to ${r.filmsOnTier} films like these a month.`
    : `No single plan covers ${r.filmsPerMonth} of these a month. ${r.name} makes ${r.filmsOnTier}; try a shorter length or a lighter engine.`
}

// ─── 3. Prova social real ─────────────────────────────────────────────────────────────────────────────────────────────────
/** Abaixo disso a tela fica muda (número pequeno não prova nada — e nunca se arredonda para cima). */
export const FILMS_MADE_MIN_TO_SHOW = 100
export const FILMS_MADE_WINDOW_DAYS = 30

export function filmsMadeLine(input: { films: number | null | undefined; creators?: number | null }): string | null {
  const films = input.films
  if (typeof films !== 'number' || !Number.isFinite(films) || films < FILMS_MADE_MIN_TO_SHOW) return null
  const n = Math.floor(films).toLocaleString('en-US')
  const creators = typeof input.creators === 'number' && Number.isFinite(input.creators) && input.creators >= 2 ? Math.floor(input.creators) : null
  return creators
    ? `${n} films made on Kineo by ${creators.toLocaleString('en-US')} creators in the last ${FILMS_MADE_WINDOW_DAYS} days`
    : `${n} films made on Kineo in the last ${FILMS_MADE_WINDOW_DAYS} days`
}

// ─── 4. A linha da Stripe no anual ────────────────────────────────────────────────────────────────────────────────────────
/** A linha única do anual ("85 credits a month · Billed yearly · Cancel anytime"); null fora dos 3 planos. */
export function annualLineItemDescription(input: Pick<CheckoutValueContextInput, 'tier' | 'credits' | 'kling4Paid'> & { billing: 'monthly' | 'annual' }): string | null {
  if (input.billing !== 'annual') return null
  if (input.tier !== 'starter' && input.tier !== 'basic' && input.tier !== 'pro') return null
  const monthly = buildCheckoutValueContext({ billing: 'monthly', credits: input.credits, intentCampaign: undefined, tier: input.tier, kling4Paid: input.kling4Paid })
  return monthly.lineItemDescription ? checkoutPlanLine(input.credits, 'annual') : null // KINEO-CHECKOUT-FINO-0411
}
