// KINEO-SHOPIFY-2026-10-13 (etapa 2) — o produto da loja vira o PEDIDO de anúncio na conta Kineo da loja.
//
// O que mora aqui (só servidor; nenhuma linha de dinheiro — cobrança, saldo, trava, débito e estorno são o /plan e o /start de
// sempre, chamados por lib/ads/v2PlanCore.ts adsV2PlanFor e lib/ads/v2StartCore.ts adsV2StartFor):
//   · readProductForAd: o produto pela Admin GraphQL (título, marca, descrição, preço, página pública) e até 3 fotos já
//     RECORTADAS em 9:16 pelo próprio CDN da Shopify (transform crop CENTER 1080×1920, JPG) — o recorte que no site o navegador faz;
//   · importProductPhotos: cada foto passa pela MESMA porta do link-import (lib/ads/v2Link.ts adsV2FetchImage: host público antes e
//     depois do DNS a cada salto, tempo e bytes limitados, tipo pelos BYTES), e antes disso tem de ser do cdn.shopify.com; vai para
//     user-footage/<uid>/ com a moderação de imagem (barrada → quarentena) e a cota de bytes, igual ao /api/ads/v2/link-import;
//   · saveShopCard: o cartão final (lib/shopify/card.tsx) no user_footage, com a mesma moderação;
//   · createShopDraft: o rascunho no ads_v2_orders pelo MESMO contrato do POST /api/ads/v2/orders (sanitizeCreateOrderBody), com as
//     mesmas colunas, no modo simples.
import type { SupabaseClient } from '@supabase/supabase-js'
import { moderateContent } from '@/lib/safety/contentModeration'
import { quarantineObject } from '@/lib/safety/quarantine'
import { adsV2FetchImage } from '@/lib/ads/v2Link'
import { sanitizeCreateOrderBody } from '@/lib/ads/v2Contract'
import { ADS_V2_SCREEN_SECONDS } from '@/lib/ads/v2Screen'
import { ensureFootageBucket, FOOTAGE_PUBLIC_PREFIX, totalFootageBytes, USER_FOOTAGE_BUCKET } from '@/lib/userFootage'
import { isShopifyCdnImage, productAdSentence, productLinkForAd, productPriceLabel, type ShopifyAdTier } from '@/lib/shopify/core'
import { adminGraphql } from '@/lib/shopify/server'
import { renderShopEndCard } from '@/lib/shopify/card'

/** Até 3 fotos do produto (o mesmo teto do link-import). */
export const SHOP_AD_MAX_PHOTOS = 3

const PRODUCT_AD_QUERY = `query KineoProductAd($id: ID!) {
  product(id: $id) {
    id title vendor status onlineStoreUrl
    description(truncateAt: 600)
    priceRangeV2 { minVariantPrice { amount currencyCode } }
    media(first: 8) { nodes { mediaContentType ... on MediaImage { image { url(transform: { maxWidth: 1080, maxHeight: 1920, crop: CENTER, preferredContentType: JPG }) } } } }
  }
  shop { name primaryDomain { host } }
}`

interface ProductAdData {
  product: {
    id: string
    title: string
    vendor: string | null
    status: string
    onlineStoreUrl: string | null
    description: string | null
    priceRangeV2: { minVariantPrice: { amount: string; currencyCode: string } | null } | null
    media: { nodes: { mediaContentType?: string; image?: { url: string } | null }[] } | null
  } | null
  shop: { name: string; primaryDomain: { host: string } | null } | null
}

export interface ProductForAd {
  title: string
  sentence: string
  price: string | null
  link: string | null
  photoUrls: string[]
  shopName: string
  shopHost: string | null
}

/** O produto pronto para o anúncio. null = a Shopify não respondeu; { missing } = produto inexistente ou sem frase. */
export async function readProductForAd(shop: string, accessToken: string, productId: string): Promise<ProductForAd | { missing: true } | null> {
  const data = await adminGraphql<ProductAdData>(shop, accessToken, PRODUCT_AD_QUERY, { id: productId })
  if (!data) return null
  const p = data.product
  if (!p) return { missing: true }
  const sentence = productAdSentence({ title: p.title, vendor: p.vendor, description: p.description })
  if (!sentence) return { missing: true }
  const photoUrls = (p.media?.nodes ?? []).map((n) => n.image?.url).filter(isShopifyCdnImage).slice(0, SHOP_AD_MAX_PHOTOS * 2)
  const host = data.shop?.primaryDomain?.host ?? null
  return {
    title: p.title,
    sentence,
    price: productPriceLabel(p.priceRangeV2?.minVariantPrice?.amount, p.priceRangeV2?.minVariantPrice?.currencyCode),
    link: productLinkForAd(p.onlineStoreUrl),
    photoUrls,
    shopName: (data.shop?.name ?? '').trim() || shop.replace(/\.myshopify\.com$/, ''),
    shopHost: host && /^[a-z0-9.-]{3,253}$/i.test(host) ? host.toLowerCase() : null,
  }
}

/** Guarda bytes de imagem no user_footage DA CONTA, com moderação (barrada → quarentena). null = não entrou. */
async function saveImage(admin: SupabaseClient, uid: string, bytes: Uint8Array, ext: 'jpg' | 'png', label: string, meta: Record<string, unknown>): Promise<{ footage_id: string; url: string } | null> {
  const path = `${uid}/clip-${Date.now()}-${label}.${ext}`
  const up = await admin.storage.from(USER_FOOTAGE_BUCKET).upload(path, bytes, { contentType: ext === 'png' ? 'image/png' : 'image/jpeg', upsert: false })
  if (up.error) return null
  const url = `${FOOTAGE_PUBLIC_PREFIX()}${path}`
  const mod = await moderateContent({ surface: 'footage', stage: 'upload', userId: uid, imageUrls: [url], meta: { path, size_bytes: bytes.byteLength, ...meta } })
  if (!mod.ok) {
    if (mod.reason === 'blocked') await quarantineObject(admin, { bucket: USER_FOOTAGE_BUCKET, path, label: 'footage-bloqueado' }).catch(() => null)
    else await admin.storage.from(USER_FOOTAGE_BUCKET).remove([path]).catch(() => null)
    return null
  }
  const row = await admin.from('user_footage').insert({ user_id: uid, url, kind: 'image', size_bytes: bytes.byteLength }).select('id, url').maybeSingle()
  if (row.error || !row.data) return null
  return { footage_id: String((row.data as { id: string }).id), url: String((row.data as { url: string }).url) }
}

/** As fotos do produto no NOSSO storage (até 3), na cota da conta (`quotaBytes`). Devolve as que entraram e quantas foram puladas. */
export async function importProductPhotos(admin: SupabaseClient, uid: string, shop: string, urls: readonly string[], quotaBytes: number): Promise<{ photos: { footage_id: string; url: string }[]; skipped: number }> {
  const photos: { footage_id: string; url: string }[] = []
  let skipped = 0
  let room = Math.max(0, quotaBytes - (await totalFootageBytes(uid)))
  if (urls.length) await ensureFootageBucket(admin)
  for (let i = 0; i < urls.length && photos.length < SHOP_AD_MAX_PHOTOS; i++) {
    const u = urls[i]
    if (!isShopifyCdnImage(u)) { skipped++; continue }
    const img = await adsV2FetchImage(u, room).catch(() => null)
    if (!img || img.ext === 'webp') { skipped++; continue }
    const saved = await saveImage(admin, uid, img.bytes, img.ext, `shopify${i}`, { source: 'shopify_product', shop })
    if (!saved) { skipped++; continue }
    room -= img.bytes.byteLength
    photos.push(saved)
  }
  return { photos, skipped }
}

/** O cartão final (PNG do servidor) no user_footage da conta. null = o gerador ou a moderação recusou. */
export async function saveShopCard(admin: SupabaseClient, uid: string, shop: string, input: { business: string; offer: string | null; contact: string | null }): Promise<{ footage_id: string; url: string } | null> {
  const png = await renderShopEndCard({ ...input, cta: 'Shop now' })
  if (!png) return null
  return saveImage(admin, uid, png, 'png', 'shopify-card', { source: 'shopify_card', shop })
}

/** O rascunho do pedido, pelo contrato do POST /api/ads/v2/orders (modo simples, 15 s, setor loja, voz e frases ligadas). */
export async function createShopDraft(admin: SupabaseClient, uid: string, input: { tier: ShopifyAdTier; product: ProductForAd; cardFootageId: string; cardUrl: string }): Promise<{ ok: true; orderId: string } | { ok: false; error: string }> {
  const parsed = sanitizeCreateOrderBody({
    mode: 'simple',
    tier: input.tier,
    seconds: ADS_V2_SCREEN_SECONDS,
    sector: 'store',
    sentence: input.product.sentence,
    link: input.product.link,
    narration: true,
    overlays: true,
    price: input.product.price,
    contact: input.product.shopHost,
  })
  if (!parsed.ok) return { ok: false, error: parsed.error }
  const o = parsed.value
  const ins = await admin
    .from('ads_v2_orders')
    .insert({
      user_id: uid,
      status: 'draft',
      tier: o.tier,
      seconds: o.seconds,
      sector: o.sector,
      brief: { sentence: o.sentence, link: o.link, mode: 'simple', overlays: o.overlays !== false, price: o.price ?? null, contact: o.contact ?? null, source: 'shopify' },
      language: o.language,
      narration: o.narration,
      logo_footage_id: null,
      card_footage_id: input.cardFootageId,
      card_url: input.cardUrl,
      photos: null,
    })
    .select('id')
    .maybeSingle()
  if (ins.error || !ins.data) return { ok: false, error: ins.error?.code === '42P01' || ins.error?.code === 'PGRST205' ? 'not_ready' : 'orders_failed' }
  return { ok: true, orderId: String((ins.data as { id: string }).id) }
}
