// sprint-assinaturas #12 — o momento "o 5o clipe zerou o saldo" no /animate.
//
// Medido 02/09 (30d, contas externas): 17 pessoas receberam clipe do Animate;
// 13 delas estao HOJE com menos de 5 creditos e nunca pagaram; so 4 das 17
// chegaram a abrir um checkout. xzavior000 (TAAFT, 02/09) abriu /pricing 2x,
// fez 5 clipes em 24 min, zerou — e a tela respondeu com "you have 0 credits"
// em vermelho e um botao cinza. /images e /audio abrem o popup de recarga no
// 402; o /animate nao abria NADA. Este modulo e a parte pura (testavel) da
// parede: quem vai para onde, com que numeros, e por que motivo.
//
// Regras herdadas:
//   · numeros SEMPRE derivados das tabelas que a Stripe cobra (TIER_CREDITS,
//     TIER_PRICES) e do custo real do clipe (ANIMATE_COST) — nunca digitados;
//   · recarga (topup) so existe para Creator/Studio (lib/growth/topupEligibility,
//     a mesma regra que o checkout aplica); trial/free/starter vao para planos.
//     Mandar um trial ao popup de recarga = checkout recusa com
//     topup_requires_creator_plus e joga a pessoa no /pricing com erro;
//   · nada aqui muda preco, credito, trial ou SKU — so mostra o que existe.
import { ANIMATE_COST } from '@/lib/animate/cost'
import { TIER_CREDITS, TIER_PRICES, formatCheckoutMoney, type CheckoutTier } from '@/lib/checkoutPricing'
import { canPurchaseCreditTopup } from '@/lib/growth/topupEligibility'

export type AnimatePaywallReason = 'insufficient_402' | 'balance_after_clip' | 'balance_on_load'
export type AnimatePaywallDestination = 'topup' | 'pricing'

export const ANIMATE_PAYWALL_PRICING_HREF =
  '/pricing?utm_source=animate&utm_medium=paywall&utm_campaign=animate_out_of_credits'

/** A parede so aparece para quem esta logado, com saldo conhecido abaixo de um
 *  clipe, e sem trabalho em andamento (um clipe rodando ainda pode falhar e
 *  devolver o credito — nao vender em cima de um saldo provisorio). */
export function isOutOfAnimateCredits(credits: number | null, isLoggedIn: boolean, busy: boolean): boolean {
  if (!isLoggedIn || busy) return false
  if (typeof credits !== 'number' || !Number.isFinite(credits)) return false
  return credits < ANIMATE_COST
}

/** Creator/Studio compram recarga sem trocar de plano; o resto escolhe plano. */
export function animatePaywallDestination(plan: unknown): AnimatePaywallDestination {
  return canPurchaseCreditTopup(plan) ? 'topup' : 'pricing'
}

/** Por que a parede apareceu — vira o `reason` do evento animate_paywall_shown. */
export function animatePaywallReason(input: {
  phase: string
  lastInsufficient: boolean
}): AnimatePaywallReason {
  if (input.lastInsufficient) return 'insufficient_402'
  if (input.phase === 'done') return 'balance_after_clip'
  return 'balance_on_load'
}

export function animateClipsPerMonth(tier: CheckoutTier): number {
  return Math.floor(TIER_CREDITS[tier] / ANIMATE_COST)
}

export type AnimatePlanRow = {
  tier: CheckoutTier
  name: string
  credits: number
  clips: number
  price: string
  highlighted: boolean
}

const TIER_NAMES: Record<CheckoutTier, string> = { starter: 'Starter', basic: 'Creator', pro: 'Studio' }

/** As 3 linhas da parede, em ordem de preco. Creator e o destacado: e o
 *  primeiro plano que tambem compra recarga e o que mais gente escolhe. */
export function animatePlanRows(): AnimatePlanRow[] {
  return (['starter', 'basic', 'pro'] as CheckoutTier[]).map((tier) => ({
    tier,
    name: TIER_NAMES[tier],
    credits: TIER_CREDITS[tier],
    clips: animateClipsPerMonth(tier),
    price: formatCheckoutMoney('usd', TIER_PRICES[tier].usd),
    highlighted: tier === 'basic',
  }))
}

/** Titulo honesto: conta os clipes desta sessao quando ha, e nunca imprime "0 clips". */
export function animatePaywallHeadline(clipsThisSession: number): string {
  const n = Math.max(0, Math.floor(clipsThisSession))
  if (n >= 1) return `Out of credits — the ${n} ${n === 1 ? 'clip' : 'clips'} you just made ${n === 1 ? 'is' : 'are'} yours.`
  return 'Out of credits — every clip you made is yours.'
}

export function animatePaywallBody(destination: AnimatePaywallDestination, credits: number): string {
  const have = Math.max(0, Math.floor(credits))
  const haveTxt = have === 0 ? 'You have 0 credits' : `You have ${have} ${have === 1 ? 'credit' : 'credits'}`
  if (destination === 'topup') {
    return `${haveTxt} and a clip costs ${ANIMATE_COST}. Add a one-time pack and keep animating — your plan stays the same.`
  }
  return `${haveTxt} and a clip costs ${ANIMATE_COST}. A plan refills every month — and the same credits work in the video studio.`
}
