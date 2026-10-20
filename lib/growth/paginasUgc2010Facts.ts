// KINEO-PAGINAS-UGC-2010 — os NÚMEROS das páginas do AI UGC Ads e do Kit Black Friday, lidos das funções que cobram.
// Nenhum crédito nem preço é digitado: adsV2Credits (o nível Comercial é o do apresentador v2, ADS_V2_PRESENTER_V2_TIERS),
// getTierPrice (o plano de entrada, o mesmo que o /ads/for usa), a frase do criador UGC humano (lib/ads/ugcComparison.ts),
// as travas da amostra grátis com a pessoa e o kit (lib/ads/v2KitBf.ts). Muda o preço lá → a página acompanha no build.
import { ADS_V2_TIER_IDS, adsV2Credits } from '@/lib/ads/v2Tiers'
import { ADS_V2_PRESENTER_V2_TIERS } from '@/lib/ads/v2PresenterV2'
import { ADS_V2_PRESENTER_PUBLIC } from '@/lib/ads/v2Presenter'
import { ADS_SAMPLE_LIVE } from '@/lib/ads/sample'
import { adsPassLive } from '@/lib/ads/offer'
import { CARD_ENTRY_ONLY } from '@/lib/entryPolicy'
import { ADS_SAMPLE_PRESENTER_LIVE } from '@/lib/ads/sampleEntry'
import { ADS_V2_SCREEN_SECONDS } from '@/lib/ads/v2Screen'
import { ADS_V2_MAX_PHOTOS, ADS_V2_MIN_PHOTOS } from '@/lib/ads/v2ShotLists'
import { ADS_V2_KIT_BF_COUNTS, ADS_V2_KIT_BF_OFFER_MAX } from '@/lib/ads/v2KitBf'
import { UGC_CREATOR_LINE, UGC_CREATOR_PRICE_SOURCE, UGC_CREATOR_PRICE_USD } from '@/lib/ads/ugcComparison'
import { formatCheckoutMoney, getTierPrice } from '@/lib/checkoutPricing'
import { NARRATION_LANGUAGES } from '@/lib/textLanguage'
import type { UgcFacts } from '@/lib/growth/paginasUgc2010Content'

/** O nível do anúncio UGC (o 1º nível em que o apresentador v2 vive; hoje só o Comercial). */
export const UGC_AD_TIER = (ADS_V2_PRESENTER_V2_TIERS[0] ?? 'commercial') as (typeof ADS_V2_TIER_IDS)[number]

export function paginasUgcFacts(): UgcFacts {
  return {
    ugcCredits: { s15: adsV2Credits(UGC_AD_TIER, 15), s20: adsV2Credits(UGC_AD_TIER, 20), s30: adsV2Credits(UGC_AD_TIER, 30) },
    minAdCredits15: Math.min(...ADS_V2_TIER_IDS.map((id) => adsV2Credits(id, 15))),
    starterPrice: formatCheckoutMoney('usd', getTierPrice('starter', 'usd', 'standard')),
    starterPriceAmount: (getTierPrice('starter', 'usd', 'standard') / 100).toFixed(2),
    // as MESMAS travas de adsSampleOpen (lib/ads/serverAccess.ts): amostra no ar, pessoa no ar, ator público e o Studio Ads aberto.
    freeUgcLive: ADS_SAMPLE_LIVE === true && ADS_SAMPLE_PRESENTER_LIVE === true && ADS_V2_PRESENTER_PUBLIC === true && adsPassLive(),
    noCard: CARD_ENTRY_ONLY !== true,
    sampleSeconds: ADS_V2_SCREEN_SECONDS,
    narrationLanguages: NARRATION_LANGUAGES.length,
    minPhotos: ADS_V2_MIN_PHOTOS,
    maxPhotos: ADS_V2_MAX_PHOTOS,
    creatorLine: UGC_CREATOR_LINE,
    creatorLinePt: `um criador UGC humano costuma cobrar US$ ${UGC_CREATOR_PRICE_USD.low}–${UGC_CREATOR_PRICE_USD.high} por vídeo (estimativa de mercado).`,
    creatorSource: UGC_CREATOR_PRICE_SOURCE,
    kitCounts: ADS_V2_KIT_BF_COUNTS,
    offerMax: ADS_V2_KIT_BF_OFFER_MAX,
  }
}
