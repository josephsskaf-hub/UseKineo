import {
  INTRO_CREDITS,
  TIER_CREDITS,
  TOPUP_CREDITS,
  type TopupId,
} from '@/lib/checkoutPricing'
import { canPurchaseCreditTopup } from '@/lib/growth/topupEligibility'

export const LIMIT_PURCHASE_FIT_VERSION = 'limit_purchase_fit_v1' as const

export type LimitPurchasePlanTier = 'starter' | 'basic' | 'pro'
export type LimitPurchaseChoice =
  | { type: 'plan'; id: LimitPurchasePlanTier }
  | { type: 'topup'; id: TopupId }

export type LimitPurchaseFit = {
  version: typeof LIMIT_PURCHASE_FIT_VERSION
  accountState: 'subscriber' | 'non_subscriber'
  balance: number
  requiredCredits: number
  shortfall: number
  fittingPlanIds: LimitPurchasePlanTier[]
  fittingTopupIds: TopupId[]
  recommended: LimitPurchaseChoice | null
  /**
   * KINEO-TOPUP-OFERTA-2026-09-06 — se o COBRADOR venderia recarga a esta
   * conta. Falso => `fittingTopupIds` vem VAZIO e `recommended` nunca e um
   * pacote. O /api/stripe/checkout recusa recarga fora de Creator/Studio com
   * 403 `topup_requires_creator_plus`; ate hoje este modulo recomendava
   * exatamente esse 403 para quem nao tinha plano nenhum.
   */
  topupPurchasable: boolean
  balanceBucket: CreditAmountBucket
  requiredBucket: CreditAmountBucket
  shortfallBucket: CreditAmountBucket
}

export type CreditAmountBucket =
  | 'zero'
  | '1_24'
  | '25_49'
  | '50_99'
  | '100_199'
  | '200_plus'

const SELF_SERVE_TIERS: LimitPurchasePlanTier[] = ['starter', 'basic', 'pro']
const TOPUP_IDS = Object.keys(TOPUP_CREDITS) as TopupId[]

/**
 * The first paid invoice can use an intro grant. Use the lower of the intro
 * and recurring grants so the UI never says a plan can finish the request if
 * the checkout could legally grant less on that first invoice.
 */
export function firstPurchaseCredits(tier: LimitPurchasePlanTier): number {
  if (tier === 'starter' || tier === 'basic') {
    return Math.min(TIER_CREDITS[tier], INTRO_CREDITS[tier])
  }
  return TIER_CREDITS[tier]
}

export function creditAmountBucket(value: number): CreditAmountBucket {
  if (value <= 0) return 'zero'
  if (value <= 24) return '1_24'
  if (value <= 49) return '25_49'
  if (value <= 99) return '50_99'
  if (value <= 199) return '100_199'
  return '200_plus'
}

export function calculateLimitPurchaseFit(input: {
  balance: number | null
  requiredCredits: number
  isSubscriber: boolean
  /**
   * KINEO-TOPUP-OFERTA-2026-09-06 — o plano da conta, lido pela MESMA funcao
   * que o /api/stripe/checkout usa para aceitar ou recusar a compra
   * (`canPurchaseCreditTopup`). Ausente = trata como NAO comprador de recarga:
   * o padrao seguro e nao oferecer o que o cobrador recusa.
   */
  plan?: unknown
}): LimitPurchaseFit | null {
  const { balance, requiredCredits, isSubscriber } = input
  const topupPurchasable = canPurchaseCreditTopup(input.plan)
  if (
    balance === null ||
    !Number.isFinite(balance) ||
    !Number.isFinite(requiredCredits) ||
    balance < 0 ||
    requiredCredits <= balance ||
    requiredCredits <= 0
  ) {
    return null
  }

  const safeBalance = Math.floor(balance)
  const safeRequired = Math.ceil(requiredCredits)
  const shortfall = safeRequired - safeBalance

  // A subscriber already has a recurring plan. We do not claim that buying a
  // second plan changes or immediately re-grants that subscription; only
  // one-time credits are recommended for this account state.
  // KINEO-TOPUP-OFERTA-2026-09-06 — o Starter e assinante E NAO pode comprar
  // recarga (TOPUP_ELIGIBLE_PLANS = basic/pro). Com a regra antiga ele saia
  // desta funcao com fittingPlanIds=[] E um pacote recomendado que o checkout
  // recusa: a UNICA conta do produto que ficava sem NENHUMA saida comprável.
  // Para ele as saidas sao os planos ACIMA do dele, nunca um segundo Starter.
  const planCandidates: LimitPurchasePlanTier[] = isSubscriber
    ? (topupPurchasable ? [] : SELF_SERVE_TIERS.filter((tier) => tier !== 'starter'))
    : SELF_SERVE_TIERS
  const fittingPlanIds = planCandidates.filter(
    (tier) => safeBalance + firstPurchaseCredits(tier) >= safeRequired,
  )

  // A recarga so entra na conta de quem o cobrador aceitaria cobrar.
  const fittingTopupIds = topupPurchasable
    ? TOPUP_IDS.filter(
        (id) => safeBalance + TOPUP_CREDITS[id] >= safeRequired,
      ).sort((a, b) => TOPUP_CREDITS[a] - TOPUP_CREDITS[b])
    : []

  const recommended: LimitPurchaseChoice | null = fittingPlanIds[0]
    ? { type: 'plan', id: fittingPlanIds[0] }
    : fittingTopupIds[0]
      ? { type: 'topup', id: fittingTopupIds[0] }
      : null

  return {
    version: LIMIT_PURCHASE_FIT_VERSION,
    accountState: isSubscriber ? 'subscriber' : 'non_subscriber',
    balance: safeBalance,
    requiredCredits: safeRequired,
    shortfall,
    fittingPlanIds,
    fittingTopupIds,
    recommended,
    topupPurchasable,
    balanceBucket: creditAmountBucket(safeBalance),
    requiredBucket: creditAmountBucket(safeRequired),
    shortfallBucket: creditAmountBucket(shortfall),
  }
}

export function limitPurchaseFitTelemetry(fit: LimitPurchaseFit) {
  return {
    version: fit.version,
    account_state: fit.accountState,
    balance_bucket: fit.balanceBucket,
    required_bucket: fit.requiredBucket,
    shortfall_bucket: fit.shortfallBucket,
    fitting_plan_count: fit.fittingPlanIds.length,
    fitting_topup_count: fit.fittingTopupIds.length,
    recommendation_type: fit.recommended?.type ?? 'none',
    recommendation_id: fit.recommended?.id ?? 'none',
    topup_purchasable: fit.topupPurchasable,
  }
}

export function limitPurchaseChoiceFits(
  fit: LimitPurchaseFit,
  choice: LimitPurchaseChoice,
): boolean {
  return choice.type === 'plan'
    ? fit.fittingPlanIds.includes(choice.id)
    : fit.fittingTopupIds.includes(choice.id)
}
