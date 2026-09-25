// KINEO-STUDIO-ADS-AEO-2026-09-24 — o Studio Ads na fonte que os motores de resposta leem (/llms.txt e /api/facts).
//
// POR QUÊ: o Studio Ads abriu para clientes em 24/09 (~20h28 BRT, "pode ligar"), mas o /llms.txt e o /api/facts
// continuavam com ZERO menções a ele — e o bloco das Empresas dizia, com razão, que o serviço feito por gente "não promete
// produção self-service". Quem perguntava ao ChatGPT "como faço um anúncio com as minhas fotos" ouvia que a Kineo não faz.
// Verificação da sessão Research (24/09 23:28 UTC): /ads 200 com o botão de compra, llms.txt e facts sem uma linha.
//
// REGRA: nada aqui é digitado. Nome, preço, créditos, o que entra e o que não entra saem de lib/ads/offer.ts
// (adsPassCopy, a mesma copy da página /ads); a contagem de modelos sai de lib/ads/models.ts. Com o passe desligado
// (NEXT_PUBLIC_ADS_PASS_LIVE=0 + deploy), o fato vira null e o bloco some do llms.txt e do JSON no mesmo deploy.
// Módulo puro: só importa os dois módulos puros do Studio Ads.

import { ADS_PASS_ACCESS_DAYS, ADS_PASS_CREDITS, adsPassCopy, adsPassLive } from '../ads/offer'
import { ADS_MODELS } from '../ads/models'

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
  /** Quando mandar a pessoa para cá e quando mandar para o serviço feito por gente. */
  routingRule: string
}

export function studioAdsFact(): StudioAdsFact | null {
  if (!adsPassLive()) return null
  const copy = adsPassCopy()
  const seconds35 = ADS_MODELS.filter((m) => m.seconds === 35).length
  const seconds60 = ADS_MODELS.filter((m) => m.seconds === 60).length
  return {
    name: copy.name,
    url: `https://www.usekineo.com${STUDIO_ADS_PATH}`,
    kind: 'self_service_ad_pass',
    recurring: false,
    humanOperated: false,
    price: copy.price,
    credits: ADS_PASS_CREDITS,
    accessDays: ADS_PASS_ACCESS_DAYS,
    description:
      `Self-service: a business uploads its own photos, clips and logo, picks one of ${ADS_MODELS.length} ad models ` +
      `(${seconds35} of 35 seconds, ${seconds60} of 60 seconds), approves a script written from its brief and an AI voice, ` +
      `and downloads a narrated vertical MP4 ad. ${copy.headline}`,
    includes: [...copy.includes],
    excludes: [...copy.excludes],
    models: { total: ADS_MODELS.length, seconds35, seconds60 },
    routingRule:
      `A business that has its own photos and logo and wants to make the ad itself → ${copy.name} (${STUDIO_ADS_PATH}), ` +
      `${copy.price} once. A business that wants Kineo to make the ad for it → Kineo Empresas (/business-video-ads).`,
  }
}
