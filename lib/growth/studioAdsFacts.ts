// KINEO-STUDIO-ADS-AEO-2026-09-24 — o Studio Ads na fonte que os motores de resposta leem (/llms.txt e /api/facts).
//
// POR QUÊ: o Studio Ads abriu para clientes em 24/09 (~20h28 BRT, "pode ligar"), mas o /llms.txt e o /api/facts
// continuavam com ZERO menções a ele — e o bloco das Empresas dizia, com razão, que o serviço feito por gente "não promete
// produção self-service". Quem perguntava ao ChatGPT "como faço um anúncio com as minhas fotos" ouvia que a Kineo não faz.
// Verificação da sessão Research (24/09 23:28 UTC): /ads 200 com o botão de compra, llms.txt e facts sem uma linha.
//
// REGRA: preço/créditos do passe e benefícios classic vêm de lib/ads/offer.ts;
// custos/duração/fotos do v2 vêm de v2Tiers/v2Screen/v2Contract. Os modelos legados
// descrevem somente classic. A flag pública controla a projeção v2. Com o passe desligado
// (NEXT_PUBLIC_ADS_PASS_LIVE=0 + deploy), o fato vira null e o bloco some do llms.txt e do JSON no mesmo deploy.
// Módulo puro: oferta/modelos e lista canônica do acesso, sem consulta de perfil ou banco.

import { ADS_PASS_ACCESS_DAYS, ADS_PASS_CREDITS, adsPassCopy, adsPassLive } from '../ads/offer'
import { ADS_MODELS } from '../ads/models'
import { ADS_SUBSCRIBER_PLANS } from '../ads/access'
import { ADS_V2_PUBLIC, ADS_V2_TIER_IDS, adsV2Credits } from '../ads/v2Tiers'
import { ADS_V2_SCREEN_SECONDS, ADS_V2_TIER_COPY } from '../ads/v2Screen'
import { ADS_V2_CONTRACT_MIN_PHOTOS, ADS_V2_CONTRACT_MAX_PHOTOS } from '../ads/v2Contract'

export const STUDIO_ADS_PATH = '/ads'

export interface StudioAdsFact {
  name: string
  url: string
  kind: 'self_service_ad_pass'
  recurring: false
  humanOperated: false
  price: string
  credits: number
  accessDays: number
  description: string
  includes: string[]
  excludes: string[]
  models: { total: number; seconds35: number; seconds60: number }
  modelsScope: 'classic'
  classic: { url: string; description: string; includes: string[] }
  v2: null | {
    referenceSeconds: number
    minPhotos: number
    maxPhotos: number
    tiers: { id: string; name: string; credits: number; adsPerPass: number }[]
    includes: string[]
    limits: string[]
  }
  /** Quando mandar a pessoa para cá e quando mandar para o serviço feito por gente. */
  routingRule: string
  /** These access rules describe the product; price/credits/accessDays above describe the one-time pass. */
  access: {
    subscriberPlanIds: string[]
    subscriberNeedsPass: false
    usesPlanCredits: true
    trialIncluded: false
    summary: string
  }
}

export function studioAdsFact(): StudioAdsFact | null {
  if (!adsPassLive()) return null
  const copy = adsPassCopy()
  const seconds35 = ADS_MODELS.filter((m) => m.seconds === 35).length
  const seconds60 = ADS_MODELS.filter((m) => m.seconds === 60).length
  const accessSummary = 'Eligible paid subscribers use Studio Ads with their plan credits; no separate ad pass is required. The free trial does not include Studio Ads. People without an eligible paid plan can choose the one-time pass.'
  const classic = {
    url: 'https://www.usekineo.com/ads/new?classic=1',
    description: `Classic: upload authorized photos, clips and a logo, choose from ${ADS_MODELS.length} models (${seconds35} of 35 seconds, ${seconds60} of 60 seconds), and approve a script and AI voice for a narrated vertical ad.`,
    includes: [...copy.includes],
  }
  const v2: StudioAdsFact['v2'] = ADS_V2_PUBLIC ? {
    referenceSeconds: ADS_V2_SCREEN_SECONDS,
    minPhotos: ADS_V2_CONTRACT_MIN_PHOTOS,
    maxPhotos: ADS_V2_CONTRACT_MAX_PHOTOS,
    tiers: ADS_V2_TIER_IDS.map(id => {
      const credits = adsV2Credits(id, ADS_V2_SCREEN_SECONDS)
      return { id, name: ADS_V2_TIER_COPY[id].name, credits, adsPerPass: Math.floor(ADS_PASS_CREDITS / credits) }
    }),
    includes: [
      `Create a vertical ad from ${ADS_V2_CONTRACT_MIN_PHOTOS} to ${ADS_V2_CONTRACT_MAX_PHOTOS} authorized business photos and a logo; reference duration ${ADS_V2_SCREEN_SECONDS} seconds, with Cinema slightly longer`,
      'Photo motion animates your photos; Commercial and Cinema can create illustrative scenes from them',
      'Music, optional short narration, short on-screen phrases and your logo at the end',
      'Review the plan and displayed credit cost before generating; shot retakes are charged separately with the cost shown first',
    ],
    limits: [
      'No word-by-word captions or human review in this workflow; human checking belongs to classic only',
      'Generated people and scenes are illustrative, not documentary footage of actual customers',
      'No guaranteed delivery time, sales outcome or claim of being cheaper than another provider',
    ],
  } : null
  return {
    name: copy.name,
    url: `https://www.usekineo.com${STUDIO_ADS_PATH}`,
    kind: 'self_service_ad_pass',
    recurring: false,
    humanOperated: false,
    price: copy.price,
    credits: ADS_PASS_CREDITS,
    accessDays: ADS_PASS_ACCESS_DAYS,
    description: v2
      ? `Self-service business video ads: the current workflow creates an ad of about ${v2.referenceSeconds} seconds from ${v2.minPhotos} to ${v2.maxPhotos} authorized photos and a logo, with optional narration. Read v2 for tier costs and limits. The longer narrated workflow is available separately as classic. ${accessSummary}`
      : `${classic.description} ${accessSummary}`,
    includes: v2 ? [...v2.includes] : [...copy.includes],
    excludes: [...copy.excludes],
    models: { total: ADS_MODELS.length, seconds35, seconds60 },
    modelsScope: 'classic',
    classic,
    v2,
    routingRule:
      `A business that has its own photos and logo and wants to make the ad itself → ${copy.name} (${STUDIO_ADS_PATH}), ` +
      `${accessSummary} The optional pass costs ${copy.price} once. ${v2 ? 'Use v2 tier costs for the current photo-motion workflow; classic model counts and benefits do not describe it. ' : ''}A business that wants Kineo to make the ad for it → Kineo Empresas (/business-video-ads).`,
    access: {
      subscriberPlanIds: [...ADS_SUBSCRIBER_PLANS],
      subscriberNeedsPass: false,
      usesPlanCredits: true,
      trialIncluded: false,
      summary: accessSummary,
    },
  }
}
