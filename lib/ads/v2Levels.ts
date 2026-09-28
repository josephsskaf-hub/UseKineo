// KINEO-PASSE-B-2026-09-28 — preço de cada nível do anúncio v2, DERIVADO (nada digitado): nome de ADS_V2_TIER_COPY, créditos de
// adsV2Credits(tier, ADS_V2_SCREEN_SECONDS) — a mesma função que /api/ads/v2/start debita —, na ordem de ADS_V2_TIER_IDS.
// Quem pode importar usa ESTE (a página /ads, o bloco do /pricing); lib/ads/offer.ts é puro e lê o espelho
// ADS_V2_LEVEL_PRICES_MIRROR, que o guardião scripts/test-passe-b-90-creditos-2026-09-28.mjs prova igual a este.
import type { AdsLevelPrice } from './offer'
import { ADS_V2_TIER_IDS, adsV2Credits } from './v2Tiers'
import { ADS_V2_SCREEN_SECONDS, ADS_V2_TIER_COPY } from './v2Screen'

export const ADS_V2_LEVEL_PRICES: readonly AdsLevelPrice[] = ADS_V2_TIER_IDS.map((id) => ({
  name: ADS_V2_TIER_COPY[id].name,
  credits: adsV2Credits(id, ADS_V2_SCREEN_SECONDS),
}))
