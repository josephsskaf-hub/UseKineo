// KINEO-ADS-PAREDE-2026-10-06 — as FONTES da oferta da parede do Studio Ads, num lugar só (lido pelo Server Component
// app/ads/page.tsx; a conta mora em lib/ads/paywall.ts, puro). Nada digitado:
//   · planos: os tiers de TIER_PRICES, mensalidade por getTierPrice e créditos por TIER_CREDITS (lib/checkoutPricing.ts —
//     as MESMAS tabelas que o checkout cobra e o webhook concede); nome por planName (lib/growth/planFit.ts);
//   · quem abre o Studio Ads: ADS_SUBSCRIBER_PLANS (lib/ads/access.ts, a régua do gate);
//   · anúncio novo: os créditos de cada nível de ADS_V2_LEVEL_PRICES (lib/ads/v2Levels.ts = adsV2Credits, o mesmo que
//     /api/ads/v2/start debita) e a duração ADS_V2_SCREEN_SECONDS;
//   · anúncio clássico: KINEO1_35S_CREDITS (lib/ads/offer.ts) com a duração do modelo mais curto de ADS_MODELS;
//   · Express: DFY_TIERS.express (lib/growth/dfyOffer.ts) — url vazia ou inválida = dfyPaymentLink devolve null = o botão some.
// O guardião scripts/test-ads-parede-2026-10-06.mjs executa este arquivo pelo carregador offline e compara com as fontes.
import { TIER_CREDITS, TIER_PRICES, formatCheckoutMoney, getTierPrice, type CheckoutTier } from '@/lib/checkoutPricing'
import { planName } from '@/lib/growth/planFit'
import { ADS_SUBSCRIBER_PLANS } from '@/lib/ads/access'
import { ADS_V2_LEVEL_PRICES } from '@/lib/ads/v2Levels'
import { ADS_V2_SCREEN_SECONDS } from '@/lib/ads/v2Screen'
import { KINEO1_35S_CREDITS } from '@/lib/ads/offer'
import { ADS_MODELS } from '@/lib/ads/models'
import { DFY_TIERS, dfyPaymentLink, dfyPriceLabel } from '@/lib/growth/dfyOffer'
import { ADS_PAYWALL_CAMPAIGN, type AdsPaywallSources } from '@/lib/ads/paywall'

/** `userId` vira o client_reference_id do Payment Link do Express (o webhook liga o pedido à conta). Nunca e-mail na URL. */
export function adsPaywallSources(userId: string | null): AdsPaywallSources {
  const tiers = Object.keys(TIER_PRICES) as CheckoutTier[]
  const express = DFY_TIERS.express
  return {
    plans: tiers.map((tier) => ({ tier, name: planName(tier), priceMinor: getTierPrice(tier, 'usd', 'standard'), credits: TIER_CREDITS[tier] })),
    opensAds: ADS_SUBSCRIBER_PLANS,
    formatMoney: (minor) => formatCheckoutMoney('usd', minor),
    newAdCredits: ADS_V2_LEVEL_PRICES.map((level) => level.credits),
    newAdSeconds: ADS_V2_SCREEN_SECONDS,
    classicAdCredits: KINEO1_35S_CREDITS,
    classicAdSeconds: Math.min(...ADS_MODELS.map((model) => model.seconds)),
    express: {
      name: express.name,
      priceLabel: dfyPriceLabel(express.priceMinor),
      hours: express.hours,
      href: dfyPaymentLink({ tier: 'express', userId, source: ADS_PAYWALL_CAMPAIGN }),
    },
  }
}
