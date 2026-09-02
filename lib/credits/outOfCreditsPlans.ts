// sprint-assinaturas #13 — o 402 do /images e do /audio mandava TODO MUNDO ao
// popup de recarga (CreditsTopupModal). Recarga so existe para Creator/Studio
// (lib/growth/topupEligibility — a MESMA regra que o checkout aplica): um trial,
// free ou Starter que clicava num pack levava `topup_requires_creator_plus` do
// /api/stripe/checkout e caia no /pricing com um erro vermelho. Medido 30d
// (externos): 0 checkout_started por credits_topup_modal_images/audio — o beco
// nunca converteu ninguem, e quem bate nele e justamente quem gastou o trial.
//
// Este modulo e a parte pura (testavel) da decisao, generalizando o que o #12
// fez para o /animate: quem vai para onde, e as 3 linhas de plano com numeros
// DERIVADOS (TIER_CREDITS / TIER_PRICES / custo real da unidade) — nunca
// digitados. Nada aqui muda preco, credito, trial ou SKU.
import { TIER_CREDITS, TIER_PRICES, formatCheckoutMoney, type CheckoutTier } from '@/lib/checkoutPricing'
import { canPurchaseCreditTopup } from '@/lib/growth/topupEligibility'

export type OutOfCreditsProduct = 'images' | 'audio'
export type OutOfCreditsDestination = 'topup' | 'pricing'

/** Creator/Studio compram recarga sem trocar de plano; o resto escolhe plano. */
export function outOfCreditsDestination(plan: unknown): OutOfCreditsDestination {
  return canPurchaseCreditTopup(plan) ? 'topup' : 'pricing'
}

export function outOfCreditsPricingHref(product: OutOfCreditsProduct): string {
  return `/pricing?utm_source=${product}&utm_medium=paywall&utm_campaign=${product}_out_of_credits`
}

export type UnitPlanRow = {
  tier: CheckoutTier
  name: string
  credits: number
  units: number
  price: string
  highlighted: boolean
}

const TIER_NAMES: Record<CheckoutTier, string> = { starter: 'Starter', basic: 'Creator', pro: 'Studio' }

/** Custo de unidade saneado: inteiro >= 1 (um custo 0/NaN daria "Infinity images"). */
export function sanitizeUnitCost(unitCost: unknown): number {
  const n = typeof unitCost === 'number' && Number.isFinite(unitCost) ? Math.floor(unitCost) : 1
  return Math.max(1, n)
}

/** As 3 linhas da parede, em ordem de preco. `units` = quantas unidades do
 *  produto (imagens / clipes de audio como o pedido) o plano compra por mes
 *  ao custo informado. Creator e o destacado: e o 1o plano que tambem compra
 *  recarga e o que mais gente escolhe. */
export function planRowsForUnit(unitCost: number): UnitPlanRow[] {
  const cost = sanitizeUnitCost(unitCost)
  return (['starter', 'basic', 'pro'] as CheckoutTier[]).map((tier) => ({
    tier,
    name: TIER_NAMES[tier],
    credits: TIER_CREDITS[tier],
    units: Math.floor(TIER_CREDITS[tier] / cost),
    price: formatCheckoutMoney('usd', TIER_PRICES[tier].usd),
    highlighted: tier === 'basic',
  }))
}

/** Substantivo da unidade por produto, no singular/plural certo. */
export function unitNoun(product: OutOfCreditsProduct, n: number): string {
  if (product === 'images') return n === 1 ? 'image' : 'images'
  return n === 1 ? 'audio clip' : 'audio clips'
}

/** Titulo honesto: conta o que a pessoa fez nesta visita e nunca imprime "0". */
export function outOfCreditsHeadline(product: OutOfCreditsProduct, madeThisSession: number): string {
  const n = Math.max(0, Math.floor(madeThisSession))
  if (n >= 1) {
    return `Out of credits — the ${n} ${unitNoun(product, n)} you just made ${n === 1 ? 'is' : 'are'} yours.`
  }
  return product === 'images'
    ? 'Out of credits — every image you made is yours.'
    : 'Out of credits — every audio clip you made is yours.'
}

export function outOfCreditsBody(input: {
  product: OutOfCreditsProduct
  destination: OutOfCreditsDestination
  credits: number | null
  unitCost: number
}): string {
  const cost = sanitizeUnitCost(input.unitCost)
  const have = typeof input.credits === 'number' && Number.isFinite(input.credits) ? Math.max(0, Math.floor(input.credits)) : null
  const haveTxt = have === null
    ? 'You are out of credits'
    : have === 0
      ? 'You have 0 credits'
      : `You have ${have} ${have === 1 ? 'credit' : 'credits'}`
  const unit = input.product === 'images' ? 'this image' : 'this clip'
  if (input.destination === 'topup') {
    return `${haveTxt} and ${unit} costs ${cost}. Add a one-time pack and keep going — your plan stays the same.`
  }
  return `${haveTxt} and ${unit} costs ${cost}. A plan refills every month — and the same credits work in the video studio.`
}

/** O texto de uma linha, para a UI e para o teste ("40 cr/mo = 20 images"). */
export function planRowLabel(product: OutOfCreditsProduct, row: UnitPlanRow): string {
  return `${row.credits} cr/mo = ${row.units} ${unitNoun(product, row.units)}`
}
