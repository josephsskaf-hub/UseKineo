// KINEO-KIT-BF-1910 — o lado SERVIDOR da oferta no cartão final do "Close do produto real": o fundo do cartão COM oferta — o MESMO quadro
// do gancho (gradiente na cor da embalagem + o produto recortado INTEIRO, sem redesenhar um pixel: adsV2CloseRealHeroRgba), com o produto
// numa caixa mais alta (ADS_V2_KIT_BF_CARD_PRODUCT_BOX) para a oferta caber entre o nome e o botão.
// O recorte é o do CACHE por foto (adsV2CutoutFor: o gancho acabou de gravá-lo — a 2ª leitura é de graça). Nenhum motor de imagem ou de
// vídeo; nada cobra, debita ou estorna. Toda falha = null: o cartão fica como estava (lib/ads/v2KitBfMontage.ts).
import { footageAdminClient } from '@/lib/userFootage'
import { adsV2CutoutFor } from '@/lib/ads/v2ProductLockServer'
import { encodePng } from '@/lib/ads/v2Png'
import { ADS_V2_CLOSE_REAL_HERO_H, ADS_V2_CLOSE_REAL_HERO_W, adsV2CloseRealHeroRgba } from '@/lib/ads/v2CloseRealServer'
import { ADS_V2_KIT_BF_CARD_PRODUCT_BOX } from '@/lib/ads/v2KitBfMontage'
import type { AdsV2CloseRealPlan } from '@/lib/ads/v2CloseReal'

const RENDER_BUCKET = 'renders'

/** O caminho do fundo do cartão com oferta no bucket (o nome que só o servidor grava). */
export function adsV2KitBfCardPath(userId: string, orderId: string): string {
  return `${userId}/adsv2-${String(orderId).replace(/[^A-Za-z0-9_-]/g, '')}-closereal-card-offer.png`
}

/** A URL pública do fundo do cartão com oferta. null = sem foto de produto, recorte ou upload falhou. Nunca lança. */
export async function adsV2KitBfCardUrl(args: { userId: string; orderId: string; product: AdsV2CloseRealPlan['product'] }): Promise<string | null> {
  try {
    const p = args.product
    if (!p || typeof p.url !== 'string') return null
    const cut = await adsV2CutoutFor(args.userId, { footageId: p.footageId, url: p.url, sourceFootageId: p.originalFootageId, sourceUrl: p.originalUrl })
    const card = adsV2CloseRealHeroRgba(cut, ADS_V2_CLOSE_REAL_HERO_W, ADS_V2_CLOSE_REAL_HERO_H, ADS_V2_KIT_BF_CARD_PRODUCT_BOX)
    const admin = footageAdminClient()
    const path = adsV2KitBfCardPath(args.userId, args.orderId)
    const up = await admin.storage.from(RENDER_BUCKET).upload(path, encodePng(card.img, { alpha: false }), { contentType: 'image/png', upsert: true })
    if (up.error) return null
    return admin.storage.from(RENDER_BUCKET).getPublicUrl(path).data?.publicUrl ?? null
  } catch (e) {
    console.warn('[ads-v2] cartão com oferta do Close real falhou (segue o cartão de sempre):', e instanceof Error ? e.message : String(e))
    return null
  }
}
