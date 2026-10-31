// KINEO-AVULSO-UNICO-3110 [TRAVA 8.2 — vai do fundador 31/10 "2A"] — UMA oferta avulsa de filme em todo lugar: o passe de
// US$ 4,99 que já existia (?pack=starter → metadata.pack 'starter10', PACK_CREDITS.starter = 1 filme Seedance 1.5 de 60 s, webhook
// Path A com guard por sessão) no lugar do pacote one_time_film35 (US$ 5 / 21 cr / 35 s). Nenhuma tela abre sessão nova do
// one_time_film35; o webhook continua entregando sessão desse SKU que já estava aberta. O anúncio avulso (one_time_ad) não muda.
// Preço, créditos e segundos saem de lib/checkoutPricing.ts — a MESMA linha que a Stripe cobra (buildPackAndRedirect).
import { PACK_ADVERTISED_SECONDS, PACK_CREDITS, packPriceLabel } from '@/lib/checkoutPricing'

export const AVULSO_UNICO_VERSION = 'avulso_unico_3110' as const
/** O que o checkout grava em checkout_*.metadata.sku e metadata.pack da sessão (→ payment_success.metadata.pack). */
export const FILM_PASS_SKU = 'starter10' as const
/** A chave ?pack= do passe. */
export const FILM_PASS_PACK_PARAM = 'starter' as const
export type FilmPassSurface = 'pricing' | 'generate_paywall' | 'exit_intent'

/** O checkout de sempre do passe, devolvendo ao Studio (resume=wall_v1&pack=starter: a volta espera o crédito cair; o
 *  /checkout/success espera ASSINATURA e prendia o comprador do passe no "preparando sua conta"). A campanha separa a superfície. */
export function filmPassCheckoutHref(surface: FilmPassSurface): string {
  return `/api/stripe/checkout?pack=${FILM_PASS_PACK_PARAM}&return=studio&intent_campaign=${AVULSO_UNICO_VERSION}_${surface}`
}

/** "$4.99", 60, 35 e a frase da oferta — tudo das tabelas reais. */
export function filmPassOffer() {
  const price = packPriceLabel(), seconds = PACK_ADVERTISED_SECONDS.starter, credits = PACK_CREDITS.starter
  return { price, seconds, credits, line: `One ${seconds}-second film for ${price}, once` }
}
