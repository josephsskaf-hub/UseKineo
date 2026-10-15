// KINEO-ADS-FIEL-3-1510 — o lado da TELA dos consertos da validação paga de 15/10 (Studio Ads v2; fora da TRAVA 8.2). Puro, sem rede.
//
//   adsV2SimplePhotoKindFor  a foto que veio do LINK e que a página declara ser do produto entra como 'product' quando a pessoa marcou
//                            "Um produto" (T3, link do café: as 3 fotos entravam como "lugar" porque o título "Café…" cai em restaurante, e
//                            a trava do produto nem ligava). A regra de antes vem primeiro, intacta.
//   adsV2NeedsOriginal       a foto do produto foi cortada para o formato? (T2, 1:1: o recorte da foto já cortada pegou só o painel dourado
//                            da caixa). Cortada = a tela sobe TAMBÉM a foto inteira, e o recorte do produto sai dela.
//   adsV2OriginalSize        o tamanho da foto inteira que sobe (lado maior até ADS_V2_ORIGINAL_MAX_SIDE: o recorte roda em 1024×1024).
import { adsV2CropRectFor, type AdsV2Format } from '@/lib/ads/v2ShotLists'
import type { AdsV2SimplePhotoKind } from '@/lib/ads/v2Simple'

/** Lado maior da foto inteira que sobe para o recorte (o birefnet opera em 1024×1024; 2048 sobra e cabe no teto da /api/footage). */
export const ADS_V2_ORIGINAL_MAX_SIDE = 2048

/**
 * O tipo da foto no /plan. 1º a regra de antes (estilo/ator: a 1ª foto é produto; foto do link com setor não reconhecido é produto); depois o
 * conserto: "Um produto" marcado + foto do link que a página DECLARA do produto + ainda nenhuma foto de produto = 'product'. Foto de tela de
 * app ('text') nunca vira produto. Pura.
 */
export function adsV2SimplePhotoKindFor(i: {
  photoKind: AdsV2SimplePhotoKind
  firstAsProduct: boolean
  firstPhoto: boolean
  fromLink: boolean
  linkProduct: boolean
  sector: string
  adKind: string
  productAlready: boolean
}): AdsV2SimplePhotoKind {
  const before: AdsV2SimplePhotoKind = (i.firstAsProduct && i.firstPhoto) || (i.fromLink === true && i.sector === 'other') ? 'product' : i.photoKind
  if (before === 'product' || i.photoKind === 'text') return before
  return i.adKind === 'product' && i.fromLink === true && i.linkProduct === true && !i.productAlready ? 'product' : before
}

/** A janela do formato não cobre a foto inteira (cortou alguma coisa)? 1 px de tolerância. Pura. */
export function adsV2NeedsOriginal(imgW: number, imgH: number, fx: number, fy: number, format: AdsV2Format): boolean {
  if (!(imgW > 0 && imgH > 0)) return false
  const r = adsV2CropRectFor(imgW, imgH, fx, fy, format)
  return r.sw < imgW - 1 || r.sh < imgH - 1
}

/** O tamanho da foto inteira que sobe: a mesma proporção, lado maior ≤ ADS_V2_ORIGINAL_MAX_SIDE (nunca amplia). Pura. */
export function adsV2OriginalSize(imgW: number, imgH: number): { width: number; height: number } {
  const k = Math.min(1, ADS_V2_ORIGINAL_MAX_SIDE / Math.max(imgW, imgH))
  return { width: Math.max(1, Math.round(imgW * k)), height: Math.max(1, Math.round(imgH * k)) }
}
