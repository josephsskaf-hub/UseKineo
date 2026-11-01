// KINEO-AVULSO-290-2CHECKOUT-0111 — a saída de US$ 2,90 para quem TRAVOU no checkout (fundador 01/11: "vai tudo, avulso 2,90").
//
// O DADO (7 dias até 01/11): 30 pessoas abriram o checkout 158 vezes (~5 cada) e 2 pagaram. A conclusão fechada do fundador é
// que o freio é PREÇO. Quem volta ao checkout cinco vezes quer comprar e não aceita a mensalidade — então, na volta, ganha a saída
// "Só quer um filme? US$ 2,90, sem assinatura".
//
// O QUE ISTO NÃO É: não é o avulso padrão. Em 31/10 o fundador decidiu "avulso único = passe US$ 4,99 (filme 60 s) em todo lugar";
// o passe continua sendo o avulso de vitrine. O US$ 2,90 é SÓ a oferta de resgate, e só aparece para quem já abandonou um checkout.
// O banner antigo das 24 h (app/(dashboard)/generate/Offer290Banner.tsx, OFFER_290_ENABLED) continua DESLIGADO — esta regra é outra.
//
// REGRA (servidor, nunca o navegador): conta logada · has_paid=false · plano não pago · offer290_used=false · nenhum
// payment_success · pelo menos 1 checkout_started com user_id. A mesma função decide a tela (/api/offers/offer290-rescue) e a
// cobrança (app/api/stripe/checkout buildStarter290AndRedirect) — tela e caixa não podem discordar.
//
// MARGEM (conferida 01/11): 25 créditos (PACK_CREDITS.starter290) pagam o filme anunciado — Seedance 1.5 de 35 s =
// creditCostForDuration('cinematic_ai', true, 35) = 21 cr — e sobram 4. Líquido Stripe US$ 2,52; custo do filme anunciado
// ≈ US$ 1,98 (21 × US$ 3,30/35 cr) → +US$ 0,54. O invariante (2) de lib/checkoutPricing (checkPricingInvariants) segue verde.
import type { SupabaseClient } from '@supabase/supabase-js'
import { PAID_PLANS } from '@/app/api/admin/_shared/mrr'
import { PACK290_PRICE_MINOR, PACK_ADVERTISED_SECONDS } from '@/lib/checkoutPricing'
import { OFFER_290_RESGATE_ENABLED } from '@/lib/flags'

export const OFFER290_RESCUE_VERSION = 'offer290_rescue_v1_0111'
export const OFFER290_RESCUE_SKU = 'starter290' as const
export const OFFER290_RESCUE_CHECKOUT_HREF = `/api/stripe/checkout?pack=${OFFER290_RESCUE_SKU}`
/** O evento de checkout que conta como "travou": gravado pelo servidor (recordCheckoutEvent) com user_id quando a sessão Stripe nasce. */
export const OFFER290_RESCUE_CHECKOUT_EVENT = 'checkout_started'
export const OFFER290_RESCUE_SHOWN_EVENT = 'offer290_rescue_shown'
export const OFFER290_RESCUE_CLICKED_EVENT = 'offer290_rescue_clicked'

export type Offer290RescueReason =
  | 'eligible'
  | 'disabled'
  | 'no_user'
  | 'paid'
  | 'used'
  | 'no_checkout_attempt'

export type Offer290RescueEligibility = { eligible: boolean; reason: Offer290RescueReason; checkoutStarts: number }

/** Decisão PURA (o guardião scripts/test-avulso-290-resgate-0111.mts a roda crua). Ordem: interruptor → conta → pagou → usou → travou. */
export function decideOffer290Rescue(input: {
  enabled?: boolean
  userId: string | null | undefined
  hasPaid: boolean | null | undefined
  plan: string | null | undefined
  offer290Used: boolean | null | undefined
  paymentSuccessCount: number
  checkoutStartedCount: number
}): Offer290RescueEligibility {
  const checkoutStarts = Math.max(0, Math.floor(input.checkoutStartedCount || 0))
  if (!(input.enabled ?? OFFER_290_RESGATE_ENABLED)) return { eligible: false, reason: 'disabled', checkoutStarts }
  if (!input.userId) return { eligible: false, reason: 'no_user', checkoutStarts }
  const plan = String(input.plan ?? '').trim().toLowerCase()
  if (input.hasPaid === true || (input.paymentSuccessCount ?? 0) > 0 || PAID_PLANS.has(plan)) return { eligible: false, reason: 'paid', checkoutStarts }
  if (input.offer290Used === true) return { eligible: false, reason: 'used', checkoutStarts }
  if (checkoutStarts < 1) return { eligible: false, reason: 'no_checkout_attempt', checkoutStarts }
  return { eligible: true, reason: 'eligible', checkoutStarts }
}

/** Lê o banco com o cliente de SERVIÇO (events é service_role-only) e aplica decideOffer290Rescue. Falha de leitura = sem oferta. */
export async function offer290RescueEligibility(admin: SupabaseClient, userId: string | null | undefined): Promise<Offer290RescueEligibility> {
  if (!OFFER_290_RESGATE_ENABLED) return { eligible: false, reason: 'disabled', checkoutStarts: 0 }
  if (!userId) return { eligible: false, reason: 'no_user', checkoutStarts: 0 }
  const [prof, paid, starts] = await Promise.all([
    admin.from('profiles').select('has_paid, plan, offer290_used').eq('id', userId).maybeSingle(),
    admin.from('events').select('id').eq('user_id', userId).eq('name', 'payment_success').limit(1),
    admin.from('events').select('id').eq('user_id', userId).eq('name', OFFER290_RESCUE_CHECKOUT_EVENT).limit(10),
  ])
  // fail closed: perfil ou eventos ilegíveis nunca viram oferta (melhor perder uma venda de US$ 2,90 que vender a quem já paga).
  if (prof.error || paid.error || starts.error || !prof.data) return { eligible: false, reason: 'no_user', checkoutStarts: 0 }
  const p = prof.data as { has_paid?: boolean | null; plan?: string | null; offer290_used?: boolean | null }
  return decideOffer290Rescue({
    userId,
    hasPaid: p.has_paid,
    plan: p.plan,
    offer290Used: p.offer290_used,
    paymentSuccessCount: paid.data?.length ?? 0,
    checkoutStartedCount: starts.data?.length ?? 0,
  })
}

/** "$2.90" — da MESMA linha que a Stripe cobra (PACK290_PRICE_MINOR). */
export function offer290RescuePriceLabel(): string {
  return `$${(PACK290_PRICE_MINOR.usd / 100).toFixed(2)}`
}

/** Copy única da oferta (inglês). Segundos e créditos sempre das fontes; nunca literal. */
export function offer290RescueCopy() {
  const seconds = PACK_ADVERTISED_SECONDS.starter290
  const price = offer290RescuePriceLabel()
  return {
    eyebrow: 'No subscription needed',
    headline: 'Just want one film?',
    body: `${price} — one ${seconds}-second AI film, no subscription.`,
    cta: `Get one film for ${price} →`,
    fine: 'One-time payment · one per account · nothing renews',
  }
}
