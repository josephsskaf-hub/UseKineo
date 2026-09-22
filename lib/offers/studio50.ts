// KINEO-STUDIO50-2026-09-22 — ordem do fundador (22/09, 11:47): "pega essa lista de pessoas que fizeram
// checkout e não pagaram e oferece 50% no plano mais caro". Fonte única da oferta: código, plano, duração,
// copy e ELEGIBILIDADE. Banner do /pricing, página de checkout cancelado e a carta lêem daqui.
//
// O QUE O BANCO DISSE ANTES DE ESCREVER (22/09): 162 pessoas com checkout_attempted/started em 60 dias e
// nenhum payment_success; 155 tentaram 2+ vezes; 100 têm filme pronto; só 35 tentaram nos últimos 14 dias.
// Quatro cartas já foram para essa coorte (rescue 19/08 com FIRST50, comeback50, recovery, second_try_1usd):
// 196 envios, 2 voltaram ao site, 0 pagaram. Duas delas JÁ ofereciam 50%. Conclusão que molda esta oferta:
// o e-mail para essa coorte é canal morto; a coorte volta SOZINHA ao checkout (155 tentaram 2+×). Então a
// oferta mora onde ela volta — /pricing e /checkout/cancelled — com o cupom aplicado sem digitar nada, e a
// carta é secundária, só para os quentes (≤ 14 dias) e com um assunto que não é "50% off".
//
// GATE EM CÓDIGO (app/api/stripe/checkout): só Studio ('pro') MENSAL. Nunca anual (já embute 2 meses).
// DURAÇÃO 'once' (1ª fatura): Studio a 50% = 300 créditos por ~metade do preço — 12 filmes Seedance custam
// ~US$ 22,7 na fal (docs/BRIEF 21/09: US$ 1,89/filme), acima do que entra. Um mês é CAC limitado;
// três meses seria margem negativa recorrente. Trocar para 'repeating' é decisão de preço do fundador.
import type { SupabaseClient } from '@supabase/supabase-js'
import { PAID_PLANS } from '@/app/api/admin/_shared/mrr'
import { TIER_CREDITS } from '@/lib/checkoutPricing'

export const STUDIO50_CODE = 'STUDIO50'
export const STUDIO50_COUPON_ID = 'KINEO_STUDIO50'
export const STUDIO50_PERCENT = 50
export const STUDIO50_TIER = 'pro' as const
/** 'once' = só a primeira fatura (ver cabeçalho). */
export const STUDIO50_DURATION: 'once' | 'repeating' = 'once'
export const STUDIO50_REPEATING_MONTHS = 3
/** janela em que a intenção de compra ainda conta como viva para a CARTA (o banner não tem janela) */
export const STUDIO50_WARM_DAYS = 14

export const STUDIO50_CHECKOUT_EVENTS = ['checkout_attempted', 'checkout_started'] as const
export const STUDIO50_SHOWN_EVENT = 'studio50_offer_shown'
export const STUDIO50_CLICKED_EVENT = 'studio50_offer_clicked'
export const STUDIO50_SENT_STAMP = 'studio50_sent'

export function studio50CheckoutHref(surface: string): string {
  return `/api/stripe/checkout?tier=${STUDIO50_TIER}&billing=monthly&promo=${STUDIO50_CODE}&intent_campaign=studio50_${surface}`
}

/** Copy única (banner + carta), em função da oferta. Sem número de preço: quem diz o valor é a Stripe/pricing. */
export function studio50Copy(offer: { planName: string; credits: number }) {
  return {
    eyebrow: `For you · ${offer.planName} at half price`,
    headline: `You got as far as checkout. Take ${offer.planName} — the ${offer.credits}-credit plan — at 50% off your first month.`,
    sub: 'Applied automatically, no code to type. Month to month, cancel any time.',
    cta: `Get ${offer.planName} at 50% →`,
    subject: `${offer.planName}, half price for your first month — applied automatically`,
  }
}

export type Studio50Eligibility = {
  eligible: boolean
  reason: 'eligible' | 'paid' | 'no_checkout_attempt' | 'opted_out' | 'no_user'
  attempts: number
  lastAttemptAt: string | null
  /** plano em que a pessoa parou da última vez (metadata.tier do evento), se houver */
  lastTier: string | null
}

/**
 * KINEO-STUDIO50-DECISAO-2026-09-22 (fundador delegou: "você decide para quem e com que desconto"): a oferta segue
 * o plano em que a pessoa PAROU. Quem parou no Starter achou caro o menor preço — pedir o dobro (Studio) é perder;
 * essa pessoa recebe Creator a 50% (150 créditos pelo dinheiro do Starter). Todos os outros recebem Studio a 50%
 * (300 créditos pelo dinheiro do Creator). Os dois cupons já têm gate no checkout (CREATOR50 = só Creator mensal).
 */
export function studio50OfferFor(lastTier: string | null | undefined): { code: 'STUDIO50' | 'CREATOR50'; tier: 'pro' | 'basic'; planName: 'Studio' | 'Creator'; credits: number } {
  if (lastTier === 'starter') return { code: 'CREATOR50', tier: 'basic', planName: 'Creator', credits: TIER_CREDITS.basic }
  return { code: STUDIO50_CODE, tier: STUDIO50_TIER, planName: 'Studio', credits: TIER_CREDITS.pro }
}
export function offerCheckoutHref(offer: ReturnType<typeof studio50OfferFor>, surface: string): string {
  return `/api/stripe/checkout?tier=${offer.tier}&billing=monthly&promo=${offer.code}&intent_campaign=studio50_${surface}`
}

/**
 * Elegível = tem pelo menos 1 tentativa de checkout, nunca pagou (payment_success ausente E perfil sem
 * has_paid/plano pago) e não optou por sair. Lê o banco com o cliente de serviço; nunca confia no cliente.
 */
export async function studio50Eligibility(admin: SupabaseClient, userId: string | null | undefined): Promise<Studio50Eligibility> {
  if (!userId) return { eligible: false, reason: 'no_user', attempts: 0, lastAttemptAt: null, lastTier: null }
  const [{ data: prof }, { data: paid }, { data: hits }] = await Promise.all([
    admin.from('profiles').select('has_paid, plan, email_opted_out').eq('id', userId).maybeSingle(),
    admin.from('events').select('id').eq('user_id', userId).eq('name', 'payment_success').limit(1),
    admin.from('events').select('created_at, metadata').eq('user_id', userId).in('name', [...STUDIO50_CHECKOUT_EVENTS]).order('created_at', { ascending: false }).limit(50),
  ])
  const attempts = hits?.length ?? 0
  const lastAttemptAt = (hits?.[0]?.created_at as string | undefined) ?? null
  const lastTier = ((hits ?? []).map((h) => (h.metadata as { tier?: string } | null)?.tier).find((t) => typeof t === 'string' && t.length > 0) as string | undefined) ?? null
  if (prof?.email_opted_out) return { eligible: false, reason: 'opted_out', attempts, lastAttemptAt, lastTier }
  if ((paid?.length ?? 0) > 0 || prof?.has_paid || PAID_PLANS.has(String(prof?.plan ?? ''))) {
    return { eligible: false, reason: 'paid', attempts, lastAttemptAt, lastTier }
  }
  if (attempts === 0) return { eligible: false, reason: 'no_checkout_attempt', attempts, lastAttemptAt, lastTier }
  return { eligible: true, reason: 'eligible', attempts, lastAttemptAt, lastTier }
}
