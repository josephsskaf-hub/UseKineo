// KINEO-ADS-MAO-JUIZ-1610 — os RECORTES do "produto na mão" (servidor; só o plano novo das contas internas, fora da TRAVA 8.2).
//
// O PORQUÊ (docs/PESQUISA-SEM-ERRO-PRODUTO-NA-MAO-2026-10-16.md, regra 7 e (c) prioridade 3; regra 6 e prioridade 1):
//   · "o que entra na referência entra na cena": a foto do cliente tem frasco + caixa e o plano quer só a caixa → o Nano Banana recebe o
//     RECORTE só da caixa (e o do frasco no plano do frasco). Pedir "show only the box" com os dois na referência é pedir ao modelo que
//     esqueça o que está vendo (D3: frasco e caixa grudados);
//   · o juiz de fidelidade compara o recorte do produto REAL com o recorte do produto GERADO, lado a lado e rotulados (D1: frasco preto).
//
// COMO: o recorte de sempre (BiRefNet, ADS_V2_CUTOUT_SLUG — a mesma chamada da trava) tira o fundo da foto do produto; o INVENTÁRIO do juiz
// (lib/ads/v2LockVision.ts) diz onde está cada objeto (box_2d) e o código corta o objeto do plano, apara o contorno e põe no branco. Cache
// por pedido e objeto no bucket renders. O recorte da foto gerada só existe quando ela é PNG (o plano novo pede PNG ao Nano Banana; não há
// decodificador de JPEG no repo): JPEG = sem recorte (a fidelidade compara as fotos inteiras, como antes). Toda falha = null, nunca lança.
import { fal } from '@fal-ai/client'
import { footageAdminClient } from '@/lib/userFootage'
import { ADS_V2_CUTOUT_SLUG } from '@/lib/ads/v2ShotLists'
import { alphaBox, cropRgba, decodePng, encodePng, isPng, resampleRgba, type AdsV2Rgba } from '@/lib/ads/v2Png'
import { adsV2InHandBoxToRect, adsV2InHandInventoryRule, type AdsV2InHandBox2d, type AdsV2InHandInventory, type AdsV2InHandObject } from '@/lib/ads/v2ProductInHand'
import { adsV2InHandInventoryOf, type AdsV2InHandCropFn } from '@/lib/ads/v2LockVision'

const RENDER_BUCKET = 'renders'
const MAX_BYTES = 40 * 1024 * 1024
/** Prazo do recorte (o mesmo da trava). */
export const ADS_V2_IN_HAND_CUTOUT_TIMEOUT_MS = 45_000
/** O recorte de referência maior que isto é reduzido (o Nano Banana não precisa de mais). */
export const ADS_V2_IN_HAND_REF_MAX_SIDE = 1536
/** O recorte da foto gerada que vai ao juiz (data URL) fica até este lado. */
export const ADS_V2_IN_HAND_CROP_MAX_SIDE = 1024

/** Onde o recorte de referência de um objeto fica no bucket (por pedido/chave e objeto). Pura. */
export function adsV2InHandRefPath(userId: string, cacheKey: string, object: AdsV2InHandObject | null): string {
  return `${userId}/adsv2-inhand-ref-${String(cacheKey).replace(/[^A-Za-z0-9_-]/g, '').slice(0, 64)}-${object ?? 'single'}.png`
}

/** O RGBA sobre fundo branco (o alfa some). Pura. */
export function adsV2FlattenWhite(img: AdsV2Rgba): AdsV2Rgba {
  const out = new Uint8Array(img.data.length)
  for (let i = 0; i < img.data.length; i += 4) {
    const a = img.data[i + 3] / 255
    out[i] = Math.round(img.data[i] * a + 255 * (1 - a))
    out[i + 1] = Math.round(img.data[i + 1] * a + 255 * (1 - a))
    out[i + 2] = Math.round(img.data[i + 2] * a + 255 * (1 - a))
    out[i + 3] = 255
  }
  return { width: img.width, height: img.height, data: out }
}

/** Reduz para caber em `max` (nunca amplia). Pura. */
export function adsV2FitMaxSide(img: AdsV2Rgba, max: number): AdsV2Rgba {
  const s = Math.min(1, max / Math.max(img.width, img.height))
  return s >= 1 ? img : resampleRgba(img, Math.max(1, Math.round(img.width * s)), Math.max(1, Math.round(img.height * s)))
}

/**
 * O recorte do objeto do plano a partir do recorte SEM fundo da foto do produto (pura): com objeto, a caixa do inventário da foto do produto
 * (com margem) e depois o contorno; sem objeto, o contorno inteiro. Recorte pequeno demais ou quase vazio = null.
 */
export function adsV2InHandRefPiece(cut: AdsV2Rgba, box: AdsV2InHandBox2d | null, object: AdsV2InHandObject | null): AdsV2Rgba | null {
  let piece = cut
  if (object) {
    if (!box) return null
    const rect = adsV2InHandBoxToRect(box, cut.width, cut.height, 0.03)
    if (!rect) return null
    piece = cropRgba(cut, rect)
  }
  const a = alphaBox(piece)
  if (!a || a.w < 24 || a.h < 24) return null
  piece = cropRgba(piece, a)
  let opaque = 0
  for (let i = 3; i < piece.data.length; i += 4) if (piece.data[i] >= 128) opaque++
  return opaque / (piece.width * piece.height) >= 0.2 ? piece : null
}

export interface AdsV2InHandCropDeps {
  download: (url: string) => Promise<Uint8Array | null>
  upload: (path: string, png: Uint8Array) => Promise<string | null>
  publicUrl: (path: string) => string | null
  cutout: (imageUrl: string) => Promise<string | null>
  inventory: (imageUrl: string) => Promise<AdsV2InHandInventory | null>
}

async function download(url: string): Promise<Uint8Array | null> {
  try {
    if (url.startsWith('data:image/')) { const b = Buffer.from(url.slice(url.indexOf(',') + 1), 'base64'); return b.byteLength > 0 && b.byteLength <= MAX_BYTES ? new Uint8Array(b) : null }
    const res = await fetch(url, { signal: AbortSignal.timeout(30_000), cache: 'no-store' })
    if (!res.ok) return null
    const buf = new Uint8Array(await res.arrayBuffer())
    return buf.byteLength > 0 && buf.byteLength <= MAX_BYTES ? buf : null
  } catch {
    return null
  }
}
async function cutout(imageUrl: string): Promise<string | null> {
  const falKey = process.env.FAL_KEY
  if (!falKey) return null
  fal.config({ credentials: falKey })
  let timer: ReturnType<typeof setTimeout> | null = null
  const timeout = new Promise<null>((resolve) => { timer = setTimeout(() => resolve(null), ADS_V2_IN_HAND_CUTOUT_TIMEOUT_MS) })
  const job = fal
    .subscribe(ADS_V2_CUTOUT_SLUG, { input: { image_url: imageUrl, model: 'General Use (Light)', operating_resolution: '1024x1024', output_format: 'png', refine_foreground: true } })
    .then((r) => { const data = ((r as { data?: unknown }).data ?? r) as { image?: { url?: string } }; const u = data?.image?.url; return typeof u === 'string' && /^https:\/\//i.test(u) ? u : null })
    .catch(() => null)
  const url = await Promise.race([job, timeout])
  if (timer) clearTimeout(timer)
  return url
}
/** As dependências reais (fal, bucket, visão). */
export function adsV2InHandCropDeps(): AdsV2InHandCropDeps {
  return {
    download,
    upload: async (path, png) => { try { const admin = footageAdminClient(); const up = await admin.storage.from(RENDER_BUCKET).upload(path, png, { contentType: 'image/png', upsert: true }); if (up.error) return null; return admin.storage.from(RENDER_BUCKET).getPublicUrl(path).data?.publicUrl ?? null } catch { return null } },
    publicUrl: (path) => { try { return footageAdminClient().storage.from(RENDER_BUCKET).getPublicUrl(path).data?.publicUrl ?? null } catch { return null } },
    cutout,
    inventory: (u) => adsV2InHandInventoryOf(u),
  }
}

/** O recorte de referência do objeto (https no bucket), com cache. null = sem recorte (fica a foto inteira, como antes). Nunca lança. */
export async function adsV2InHandReferenceCrop(a: { userId: string; cacheKey: string; productUrl: string; object: AdsV2InHandObject | null }, deps: AdsV2InHandCropDeps = adsV2InHandCropDeps()): Promise<string | null> {
  try {
    const path = adsV2InHandRefPath(a.userId, a.cacheKey, a.object)
    const cached = deps.publicUrl(path)
    if (cached) { const b = await deps.download(cached); if (b && isPng(b)) return cached }
    const [cutUrl, inv] = await Promise.all([deps.cutout(a.productUrl), a.object ? deps.inventory(a.productUrl) : Promise.resolve(null)])
    if (!cutUrl) return null
    const bytes = await deps.download(cutUrl)
    if (!bytes || !isPng(bytes)) return null
    const box = a.object && inv ? adsV2InHandInventoryRule(inv, a.object).objectBox : null
    const piece = adsV2InHandRefPiece(decodePng(bytes), box, a.object)
    if (!piece) return null
    return await deps.upload(path, encodePng(adsV2FitMaxSide(adsV2FlattenWhite(piece), ADS_V2_IN_HAND_REF_MAX_SIDE), { alpha: false }))
  } catch {
    return null
  }
}

/** O recorte do produto na foto GERADA (data URL PNG), pela caixa do inventário. Foto que não é PNG = null. Nunca lança. */
export async function adsV2InHandSceneCrop(sceneUrl: string, box: AdsV2InHandBox2d | null, deps: Pick<AdsV2InHandCropDeps, 'download'> = adsV2InHandCropDeps()): Promise<string | null> {
  try {
    if (!box) return null
    const bytes = await deps.download(sceneUrl)
    if (!bytes || !isPng(bytes)) return null
    const img = decodePng(bytes)
    const rect = adsV2InHandBoxToRect(box, img.width, img.height, 0.06)
    if (!rect) return null
    const png = encodePng(adsV2FitMaxSide(adsV2FlattenWhite(cropRgba(img, rect)), ADS_V2_IN_HAND_CROP_MAX_SIDE), { alpha: false })
    return `data:image/png;base64,${Buffer.from(png).toString('base64')}`
  } catch {
    return null
  }
}

/** O crop do juiz (o MESMO no avanço e na calibração): o recorte de referência do objeto + o recorte da foto gerada. */
export function adsV2InHandCropper(a: { userId: string; cacheKey: string; productUrl: string }, deps: AdsV2InHandCropDeps = adsV2InHandCropDeps()): AdsV2InHandCropFn {
  return async ({ sceneUrl, objectBox, object }) => {
    if (!objectBox) return null
    const [reference, generated] = await Promise.all([adsV2InHandReferenceCrop({ ...a, object }, deps), adsV2InHandSceneCrop(sceneUrl, objectBox, deps)])
    return reference && generated ? { reference, generated } : null
  }
}
