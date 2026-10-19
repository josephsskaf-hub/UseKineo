// KINEO-CLOSE-REAL-1910 — o lado SERVIDOR do formato "Close do produto real" (lib/ads/v2CloseReal.ts): o GANCHO do 1º quadro.
//
//   adsV2CloseRealHeroRgba  (puro, pixels) o produto recortado colado INTEIRO — sem redesenhar um pixel — sobre um fundo na cor da própria
//                           embalagem: gradiente vertical escuro do tom médio do produto + um brilho suave atrás dele + sombra de contato.
//                           Nada de packshot branco "morto".
//   adsV2CloseRealHero      o recorte (fal-ai/birefnet/v2 — a MESMA chamada e o MESMO cache por foto da trava do produto,
//                           lib/ads/v2ProductLockServer.ts adsV2CutoutFor) → o PNG do gancho no bucket renders
//                           ('<uid>/adsv2-<pedido>-closereal-hero.png'). Toda falha = null: a montagem usa a FOTO REAL inteira (packshot).
//
// Nenhum motor de imagem ou de vídeo é chamado aqui: o BiRefNet só separa o produto do fundo. Nada cobra crédito, debita ou estorna.
// Custo de fornecedor: o recorte (≤ US$ 0,01, ADS_V2_CUTOUT_USD_MAX; cache por foto — a 2ª vez é de graça).
import { footageAdminClient } from '@/lib/userFootage'
import { adsV2CutoutFor } from '@/lib/ads/v2ProductLockServer'
import { adsV2MeanRgb, encodePng, pasteOver, resampleRgba, type AdsV2Rgba } from '@/lib/ads/v2Png'
import { ADS_V2_CLOSE_REAL_PRODUCT_BOX, type AdsV2CloseRealPlan } from '@/lib/ads/v2CloseReal'
import { ADS_V2_CLOSE_REAL_CARD_PRODUCT_BOX } from '@/lib/ads/v2CloseReal' // KINEO-CLOSE-REAL-AJUSTE-1910 — o produto pequeno do cartão final
import { alphaBox, decodePng, isPng } from '@/lib/ads/v2Png' // KINEO-CLOSE-REAL-V3-1910 — a caixa do produto em cada foto (o recorte SEM aparar)
import { adsV2CutoutPath } from '@/lib/ads/v2ShotLists' // KINEO-CLOSE-REAL-V3-1910 — o MESMO cache por foto do recorte (adsV2CutoutFor)
import type { AdsV2CloseRealPhotoBox } from '@/lib/ads/v2CloseReal' // KINEO-CLOSE-REAL-V3-1910

const RENDER_BUCKET = 'renders'
/** O quadro do gancho (9:16; a montagem o põe em `cover` no quadro do perfil de render). */
export const ADS_V2_CLOSE_REAL_HERO_W = 1080
export const ADS_V2_CLOSE_REAL_HERO_H = 1920

/** O caminho do gancho no bucket (o nome que só o servidor grava). */
export function adsV2CloseRealHeroPath(userId: string, orderId: string): string {
  return `${userId}/adsv2-${String(orderId).replace(/[^A-Za-z0-9_-]/g, '')}-closereal-hero.png`
}
/** KINEO-CLOSE-REAL-AJUSTE-1910 — o caminho do fundo do cartão final no bucket (o mesmo gradiente do gancho, produto pequeno). */ // KINEO-CLOSE-REAL-AJUSTE-1910
export function adsV2CloseRealCardPath(userId: string, orderId: string): string { // KINEO-CLOSE-REAL-AJUSTE-1910
  return `${userId}/adsv2-${String(orderId).replace(/[^A-Za-z0-9_-]/g, '')}-closereal-card.png` // KINEO-CLOSE-REAL-AJUSTE-1910
} // KINEO-CLOSE-REAL-AJUSTE-1910

const clamp255 = (n: number) => (n < 0 ? 0 : n > 255 ? 255 : Math.round(n))
const mix = (a: number, b: number, k: number) => a + (b - a) * k

/** KINEO-CLOSE-REAL-1910 — as cores do fundo a partir do tom médio do produto (puro): topo e base escuros do mesmo tom, brilho claro atrás. */
export function adsV2CloseRealPalette(mean: { r: number; g: number; b: number; l: number; n: number }): { top: [number, number, number]; bottom: [number, number, number]; glow: [number, number, number] } {
  // Produto quase preto (ou sem leitura): um cinza quente neutro — o produto escuro precisa de fundo mais claro que ele.
  const base: [number, number, number] = mean.n > 0 && mean.l >= 40 ? [mean.r, mean.g, mean.b] : [150, 140, 128]
  const dark = mean.n > 0 && mean.l < 40
  const top: [number, number, number] = base.map((c) => clamp255(mix(c, 0, dark ? 0.35 : 0.55))) as [number, number, number]
  const bottom: [number, number, number] = base.map((c) => clamp255(mix(c, 0, dark ? 0.6 : 0.8))) as [number, number, number]
  const glow: [number, number, number] = base.map((c) => clamp255(mix(c, 255, dark ? 0.45 : 0.3))) as [number, number, number]
  return { top, bottom, glow }
}

/** KINEO-CLOSE-REAL-1910 — onde o produto pousa (puro): cabe na caixa do gancho sem distorcer, centrado, a base encostada na base da caixa. */
export function adsV2CloseRealProductRect(frameW: number, frameH: number, cutW: number, cutH: number, box: { x0: number; x1: number; y0: number; y1: number } = ADS_V2_CLOSE_REAL_PRODUCT_BOX): { x: number; y: number; w: number; h: number } { // KINEO-CLOSE-REAL-AJUSTE-1910 — + box (o cartão usa a caixa pequena)
  const B = box // KINEO-CLOSE-REAL-AJUSTE-1910 — era: ADS_V2_CLOSE_REAL_PRODUCT_BOX
  const boxW = (B.x1 - B.x0) * frameW
  const boxH = (B.y1 - B.y0) * frameH
  const k = Math.min(boxW / Math.max(1, cutW), boxH / Math.max(1, cutH))
  const w = Math.max(1, Math.round(cutW * k))
  const h = Math.max(1, Math.round(cutH * k))
  return { x: Math.round((frameW - w) / 2), y: Math.round(B.y1 * frameH - h), w, h }
}

/**
 * KINEO-CLOSE-REAL-1910 — o quadro do gancho (puro): fundo na cor do produto + o recorte REAL colado por cima, intocado (só redimensionado).
 * `cut` = o recorte já aparado (trimCutout). Devolve a imagem, onde o produto ficou e as cores usadas.
 */
export function adsV2CloseRealHeroRgba(cut: AdsV2Rgba, frameW: number = ADS_V2_CLOSE_REAL_HERO_W, frameH: number = ADS_V2_CLOSE_REAL_HERO_H, box: { x0: number; x1: number; y0: number; y1: number } = ADS_V2_CLOSE_REAL_PRODUCT_BOX): { img: AdsV2Rgba; rect: { x: number; y: number; w: number; h: number }; palette: ReturnType<typeof adsV2CloseRealPalette> } { // KINEO-CLOSE-REAL-AJUSTE-1910 — + box (o cartão final: o mesmo fundo, o produto pequeno)
  const W = frameW, H = frameH
  const palette = adsV2CloseRealPalette(adsV2MeanRgb(cut, { x: 0, y: 0, w: cut.width, h: cut.height }, 128))
  const rect = adsV2CloseRealProductRect(W, H, cut.width, cut.height, box) // KINEO-CLOSE-REAL-AJUSTE-1910 — era: sem box
  const data = new Uint8Array(W * H * 4)
  const cx = rect.x + rect.w / 2
  const cy = rect.y + rect.h * 0.45
  const radius = Math.max(W, rect.h) * 0.62
  const shadowCx = cx, shadowCy = rect.y + rect.h, shadowRx = Math.max(8, rect.w * 0.48), shadowRy = Math.max(4, rect.h * 0.035)
  for (let y = 0; y < H; y++) {
    const v = y / (H - 1)
    const r0 = mix(palette.top[0], palette.bottom[0], v), g0 = mix(palette.top[1], palette.bottom[1], v), b0 = mix(palette.top[2], palette.bottom[2], v)
    for (let x = 0; x < W; x++) {
      const d = Math.hypot(x - cx, y - cy) / radius
      const glow = d < 1 ? (1 - d) * (1 - d) * 0.65 : 0
      let r = mix(r0, palette.glow[0], glow), g = mix(g0, palette.glow[1], glow), b = mix(b0, palette.glow[2], glow)
      const sx = (x - shadowCx) / shadowRx, sy = (y - shadowCy) / shadowRy
      const s = sx * sx + sy * sy
      if (s < 1) { const dk = 1 - 0.45 * (1 - s); r *= dk; g *= dk; b *= dk }
      const o = (y * W + x) * 4
      data[o] = clamp255(r); data[o + 1] = clamp255(g); data[o + 2] = clamp255(b); data[o + 3] = 255
    }
  }
  const img: AdsV2Rgba = { width: W, height: H, data }
  pasteOver(img, resampleRgba(cut, rect.w, rect.h), rect.x, rect.y)
  return { img, rect, palette }
}

/**
 * KINEO-CLOSE-REAL-1910 — o PNG do gancho no bucket (URL pública). null = sem foto de produto, recorte falhou (fora do ar, não é produto,
 * prazo) ou upload falhou: a montagem usa a foto real inteira. Nunca lança.
 */
export async function adsV2CloseRealHero(args: { userId: string; orderId: string; product: AdsV2CloseRealPlan['product'] }): Promise<{ url: string; rect: { x: number; y: number; w: number; h: number }; cardUrl: string | null; ink: string } | null> { // KINEO-CLOSE-REAL-V3-1910 — + ink (o tom escuro da embalagem: o texto do botão do cartão) · + cardUrl (o fundo do cartão final; null = o cartão do pedido)
  try {
    const p = args.product
    if (!p || typeof p.url !== 'string') return null
    const cut = await adsV2CutoutFor(args.userId, { footageId: p.footageId, url: p.url, sourceFootageId: p.originalFootageId, sourceUrl: p.originalUrl })
    const hero = adsV2CloseRealHeroRgba(cut)
    const png = encodePng(hero.img, { alpha: false })
    const admin = footageAdminClient()
    const path = adsV2CloseRealHeroPath(args.userId, args.orderId)
    const up = await admin.storage.from(RENDER_BUCKET).upload(path, png, { contentType: 'image/png', upsert: true })
    if (up.error) return null
    const url = admin.storage.from(RENDER_BUCKET).getPublicUrl(path).data?.publicUrl ?? null
    if (!url) return null // KINEO-CLOSE-REAL-AJUSTE-1910
    const cardUrl = await (async () => { try { const card = adsV2CloseRealHeroRgba(cut, ADS_V2_CLOSE_REAL_HERO_W, ADS_V2_CLOSE_REAL_HERO_H, ADS_V2_CLOSE_REAL_CARD_PRODUCT_BOX); const cp = adsV2CloseRealCardPath(args.userId, args.orderId); const cu = await admin.storage.from(RENDER_BUCKET).upload(cp, encodePng(card.img, { alpha: false }), { contentType: 'image/png', upsert: true }); return cu.error ? null : admin.storage.from(RENDER_BUCKET).getPublicUrl(cp).data?.publicUrl ?? null } catch { return null } })() // KINEO-CLOSE-REAL-AJUSTE-1910 — o cartão falhou = o do pedido (o gancho segue)
    return { url, rect: hero.rect, cardUrl, ink: adsV2CloseRealHex(hero.palette.bottom) } // KINEO-CLOSE-REAL-V3-1910 — + ink (a base do gradiente: o tom da embalagem escurecido)
  } catch (e) {
    console.warn('[ads-v2] gancho do Close real falhou (segue a foto real):', e instanceof Error ? e.message : String(e))
    return null
  }
}
// ── KINEO-CLOSE-REAL-V3-1910 — A CAIXA DO PRODUTO EM CADA FOTO (canário v2: a legenda cobria a tampa do frasco nas fotos B e C). O recorte BiRefNet de
// KINEO-CLOSE-REAL-V3-1910 — cada foto dos planos (o MESMO cache por foto da trava do produto: a 2ª vez é de graça; a 1ª, ≤ US$ 0,01 por foto), lido SEM aparar:
// KINEO-CLOSE-REAL-V3-1910 — a caixa do contorno em frações da foto. Roda em paralelo com o gancho, com prazo; falhou = null (a legenda fica no lugar de sempre).
/** KINEO-CLOSE-REAL-V3-1910 — [r, g, b] → '#rrggbb'. Pura. */
export function adsV2CloseRealHex(rgb: readonly number[]): string { // KINEO-CLOSE-REAL-V3-1910
  return '#' + [0, 1, 2].map((k) => clamp255(Number(rgb?.[k]) || 0).toString(16).padStart(2, '0')).join('') // KINEO-CLOSE-REAL-V3-1910
} // KINEO-CLOSE-REAL-V3-1910
/** KINEO-CLOSE-REAL-V3-1910 — o prazo das caixas (todas as fotos juntas): passou = as que não chegaram ficam null. */
export const ADS_V2_CLOSE_REAL_BOXES_TIMEOUT_MS = 25_000 // KINEO-CLOSE-REAL-V3-1910
/** KINEO-CLOSE-REAL-V3-1910 — a caixa do produto no recorte SEM aparar (pura): frações da foto + o tamanho dela. Contorno vazio ou menor que 1% da foto = null (não confiável). */
export function adsV2CloseRealBoxOf(raw: { width: number; height: number; data: Uint8Array }): AdsV2CloseRealPhotoBox | null { // KINEO-CLOSE-REAL-V3-1910
  if (!raw || !(raw.width > 0) || !(raw.height > 0)) return null // KINEO-CLOSE-REAL-V3-1910
  const b = alphaBox(raw) // KINEO-CLOSE-REAL-V3-1910
  if (!b || b.w * b.h < 0.01 * raw.width * raw.height) return null // KINEO-CLOSE-REAL-V3-1910
  const r4 = (n: number) => Math.round(n * 10000) / 10000 // KINEO-CLOSE-REAL-V3-1910
  return { w: raw.width, h: raw.height, x0: r4(b.x / raw.width), y0: r4(b.y / raw.height), x1: r4((b.x + b.w) / raw.width), y1: r4((b.y + b.h) / raw.height) } // KINEO-CLOSE-REAL-V3-1910
} // KINEO-CLOSE-REAL-V3-1910
async function closeRealFetchPng(url: string): Promise<Uint8Array | null> { // KINEO-CLOSE-REAL-V3-1910
  try { const res = await fetch(url, { signal: AbortSignal.timeout(15_000), cache: 'no-store' }); if (!res.ok) return null; const buf = new Uint8Array(await res.arrayBuffer()); return buf.byteLength > 0 && buf.byteLength <= 40 * 1024 * 1024 && isPng(buf) ? buf : null } catch { return null } // KINEO-CLOSE-REAL-V3-1910
} // KINEO-CLOSE-REAL-V3-1910
/** KINEO-CLOSE-REAL-V3-1910
 * KINEO-CLOSE-REAL-V3-1910 — a caixa do produto em cada foto (pelo URL da foto). Cache do recorte por foto: lê; sem cache, adsV2CutoutFor recorta e grava o
 * KINEO-CLOSE-REAL-V3-1910 · cache (mesmo quando o contorno não passa no teste de "é produto" — a caixa ainda serve para desviar a legenda) e lê de novo. Nunca lança.
 */ // KINEO-CLOSE-REAL-V3-1910
export async function adsV2CloseRealPhotoBoxes(args: { userId: string; photos: readonly { footageId: string; url: string }[] }): Promise<Record<string, AdsV2CloseRealPhotoBox | null>> { // KINEO-CLOSE-REAL-V3-1910
  const out: Record<string, AdsV2CloseRealPhotoBox | null> = {} // KINEO-CLOSE-REAL-V3-1910
  try { // KINEO-CLOSE-REAL-V3-1910
    const admin = footageAdminClient() // KINEO-CLOSE-REAL-V3-1910
    const seen = new Set<string>() // KINEO-CLOSE-REAL-V3-1910
    const list = (Array.isArray(args.photos) ? args.photos : []).filter((p) => p && typeof p.footageId === 'string' && p.footageId && typeof p.url === 'string' && /^https:\/\//i.test(p.url) && !seen.has(p.url) && seen.add(p.url)) // KINEO-CLOSE-REAL-V3-1910
    const one = async (p: { footageId: string; url: string }) => { // KINEO-CLOSE-REAL-V3-1910
      const pub = admin.storage.from(RENDER_BUCKET).getPublicUrl(adsV2CutoutPath(args.userId, p.footageId)).data?.publicUrl ?? null // KINEO-CLOSE-REAL-V3-1910
      const read = async () => { const bytes = pub ? await closeRealFetchPng(pub) : null; return bytes ? decodePng(bytes) : null } // KINEO-CLOSE-REAL-V3-1910
      let raw = await read() // KINEO-CLOSE-REAL-V3-1910
      if (!raw) { await adsV2CutoutFor(args.userId, { footageId: p.footageId, url: p.url }).catch(() => null); raw = await read() } // KINEO-CLOSE-REAL-V3-1910
      out[p.url] = raw ? adsV2CloseRealBoxOf(raw) : null // KINEO-CLOSE-REAL-V3-1910
    } // KINEO-CLOSE-REAL-V3-1910
    let timer: ReturnType<typeof setTimeout> | null = null // KINEO-CLOSE-REAL-V3-1910
    await Promise.race([Promise.all(list.map((p) => one(p).catch(() => { out[p.url] = null }))), new Promise<void>((resolve) => { timer = setTimeout(resolve, ADS_V2_CLOSE_REAL_BOXES_TIMEOUT_MS) })]) // KINEO-CLOSE-REAL-V3-1910
    if (timer) clearTimeout(timer) // KINEO-CLOSE-REAL-V3-1910
  } catch (e) { console.warn('[ads-v2] caixas do Close real falharam (legenda no lugar de sempre):', e instanceof Error ? e.message : String(e)) } // KINEO-CLOSE-REAL-V3-1910
  return { ...out } // KINEO-CLOSE-REAL-V3-1910
} // KINEO-CLOSE-REAL-V3-1910
