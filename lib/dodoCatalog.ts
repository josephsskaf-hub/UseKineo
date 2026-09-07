// KINEO-DODO-2026-09-07 — o que cada sku da Dodo significa NA CASA.
//
// Separado de lib/dodo.ts de propósito: lib/dodo.ts é puro (o guardião o
// importa fora do Next) e lib/checkoutPricing.ts puxa `@/lib/credits/...`.
// Este arquivo é a ponte: nome do produto na Dodo → tier/créditos/preço que a
// Stripe já cobra. NENHUM número é digitado aqui — tudo vem de checkoutPricing,
// senão o trilho novo mentiria no dia em que o preço mudasse (defeito que
// este repositório já pegou duas vezes: o `20` do Seedance e o `25` do Starter).
//
// Nomes: a Dodo chama de Starter/Creator/Studio o que a casa chama de
// starter/basic/pro (CheckoutTier). "first_pack" é o MESMO pacote único de
// $4,90 do `?pack=starter` da Stripe — 30 créditos, cobrança única, sem
// mandato. É o que o cartão indiano consegue pagar.
import {
  PACK_CREDITS,
  PACK_PRICE_MINOR,
  TIER_CREDITS,
  TIER_PRICES,
  type CheckoutTier,
} from '@/lib/checkoutPricing'
import type { DodoSku } from '@/lib/dodo'

export type DodoSubscriptionSku = Exclude<DodoSku, 'first_pack'>

export const DODO_SKU_TO_TIER: Record<DodoSubscriptionSku, CheckoutTier> = {
  starter: 'starter',
  creator: 'basic',
  studio: 'pro',
}

export function isDodoSubscriptionSku(sku: DodoSku): sku is DodoSubscriptionSku {
  return sku !== 'first_pack'
}

/** Créditos que o sku entrega — a mesma linha que a Stripe concede. */
export function dodoSkuCredits(sku: DodoSku): number {
  if (sku === 'first_pack') return PACK_CREDITS.starter
  return TIER_CREDITS[DODO_SKU_TO_TIER[sku]]
}

/** Preço em centavos de USD — o mesmo que a Stripe cobra. A Dodo cobra igual. */
export function dodoSkuPriceMinorUsd(sku: DodoSku): number {
  if (sku === 'first_pack') return PACK_PRICE_MINOR.usd
  return TIER_PRICES[DODO_SKU_TO_TIER[sku]].usd
}

/** `checkout_mode` no evento payment_success, no vocabulário que a Stripe já usa. */
export function dodoSkuCheckoutMode(sku: DodoSku): 'payment' | 'subscription' {
  return sku === 'first_pack' ? 'payment' : 'subscription'
}
