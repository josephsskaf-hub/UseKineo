// KINEO-BUSINESS-84-2026-10-09 — a oferta do plano Business, DERIVADA da fonte de preço.
//
// Decisão do fundador (09/10/2026, "sim pra as 4"): o mercado vende anúncio de produto por IA a ~US$ 99/mês por
// ~12 anúncios de 15 s (Creatify Pro $99, HeyGen Business $149, Arcads €100-220). O Business sai a US$ 84/mês
// (15% abaixo), 500 créditos, self-serve no Studio Ads (/ads → /ads/v2).
//
// REGRA DA CASA: a copy LÊ o número, nunca digita. "12 product ads of 15 s" sai daqui:
//   floor(TIER_CREDITS.business ÷ custo do nível Commercial de 15 s em lib/ads/v2Tiers.ts) = floor(500 ÷ 41) = 12.
// Se o fundador reprecificar o nível Commercial ou o grant do plano, a promessa acompanha sozinha (e o guardião
// scripts/test-business-84-2026-10-09.mjs confere que nenhuma tela digitou o 12, o 84 ou o 500 à mão).
//
// Módulo sem servidor (nada de Stripe/Supabase): entra no PricingClient ('use client') e na página /business.
import { ADS_V2_TIERS } from '@/lib/ads/v2Tiers'
import { ADS_V2_VARIATION_SLOTS } from '@/lib/ads/v2Variations'
import { BUSINESS_PRICES, TIER_CREDITS } from '@/lib/checkoutPricing'

/** O nível do Studio Ads que a promessa usa (Commercial: 3 cenas com gente criadas a partir das fotos do cliente). */
export const BUSINESS_AD_LEVEL = 'commercial' as const
/** Duração do anúncio da promessa, em segundos. */
export const BUSINESS_AD_SECONDS = 15
/** Créditos de UM anúncio de 15 s no nível Commercial (lido de lib/ads/v2Tiers.ts). */
export const BUSINESS_AD_CREDITS: number = ADS_V2_TIERS[BUSINESS_AD_LEVEL].credits15
/** Créditos por mês do plano (lido de TIER_CREDITS.business). */
export const BUSINESS_MONTHLY_CREDITS: number = TIER_CREDITS.business
/** Quantos anúncios de 15 s no nível Commercial cabem no mês — a promessa da vitrine. */
export const BUSINESS_ADS_PER_MONTH: number = Math.floor(BUSINESS_MONTHLY_CREDITS / BUSINESS_AD_CREDITS)
/** Variações por anúncio para teste A/B (as vagas A/B/C do Studio Ads v2). */
export const BUSINESS_AB_VARIATIONS: number = ADS_V2_VARIATION_SLOTS.length
/** Preço mensal em centavos de dólar (lido de BUSINESS_PRICES). */
export const BUSINESS_PRICE_USD_MINOR: number = BUSINESS_PRICES.usd

/** "$84" para 8400; "$84.50" para 8450 — nunca "$84.5". */
export function businessUsdLabel(minor: number = BUSINESS_PRICE_USD_MINOR): string {
  const value = minor / 100
  return Number.isInteger(value) ? `$${value}` : `$${value.toFixed(2)}`
}

/** "$84". */
export const BUSINESS_PRICE_LABEL: string = businessUsdLabel()
/** "12 product ads of 15 s per month". */
export const BUSINESS_ADS_PROMISE: string = `${BUSINESS_ADS_PER_MONTH} product ads of ${BUSINESS_AD_SECONDS} s per month`
/** Link do checkout do plano (mensal, USD, sem cupom — a rota garante). */
export const BUSINESS_CHECKOUT_HREF = '/api/stripe/checkout?tier=business'
/** Onde mora a oferta "feito para você" (Kineo Empresas: Express / Pro, pagamento único). */
export const BUSINESS_DFY_HREF = '/business-video-ads#packages'
/** Página de marketing do plano. */
export const BUSINESS_PAGE_PATH = '/business'

/** Os itens que a vitrine lista (mesma lista no /pricing e no /business). */
export const BUSINESS_BULLETS: readonly string[] = [
  'Product photo or link → ready ad',
  'Voice, music and on-screen text',
  `${BUSINESS_AB_VARIATIONS} variations to A/B test`,
  'Commercial use',
  'First ad free to try',
]
