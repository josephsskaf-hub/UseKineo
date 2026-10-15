// KINEO-ADS-FIEL-1510 — o lado SERVIDOR da trava do produto (Studio Ads v2). Chamado pelo motor de avanço (lib/ads/v2Advance.ts)
// por import DINÂMICO, só quando um plano tem produto a travar (adsV2ProductLockFor) — o anúncio sem produto nunca carrega isto.
//
//   adsV2ProductLockEnabled  o interruptor ADS_V2_PRODUCT_LOCK_MODE ('internal' = só a lista exata das contas da casa).
//   adsV2PrepareLockedScene  recorte (fal-ai/birefnet/v2, UMA vez por foto, cache '<uid>/adsv2-cutout-<foto>.png') + o ESBOÇO
//                            ('<uid>/adsv2-<pedido>-p<i>-a<n>-layout.png'): a 1ª referência do Nano Banana.
//   adsV2FinishLockedScene   a cena do Nano Banana (PNG) em cover + o recorte REAL colado no mesmo lugar →
//                            '<uid>/adsv2-<pedido>-p<i>-a<n>-lock.png' (adsV2IsLockedImage reconhece o nome).
//   adsV2CancelFalJob        cancela (melhor esforço) a tentativa abandonada pelo prazo: job ainda na fila não é cobrado.
//
// Nada aqui cobra crédito, debita ou estorna. Custo de fornecedor novo: só o recorte (fal lista US$ 0 por segundo de computação em
// 15/10; teto conservador ADS_V2_CUTOUT_USD_MAX). Toda falha devolve null/lança e o chamador anima a FOTO REAL do produto.
import { fal } from '@fal-ai/client'
import { footageAdminClient } from '@/lib/userFootage'
import { isAdsInternalEmail } from '@/lib/ads/access'
import {
  ADS_V2_CUTOUT_SLUG,
  ADS_V2_PRODUCT_LOCK_MODE,
  adsV2CutoutPath,
  type AdsV2Format,
  type AdsV2ProductLock,
} from '@/lib/ads/v2ShotLists'
import { adsV2LayoutPng, adsV2LockedFramePng, decodePng, isPng, trimCutout, type AdsV2Rgba } from '@/lib/ads/v2Png'
import { adsV2EmptyLayoutPng, type AdsV2Shade } from '@/lib/ads/v2Png' // KINEO-ADS-FIEL-2-1510 — a cena nasce SEM produto (esboço só cinza) e o recorte entra com sombra e tom
import { adsV2CutoutSource, adsV2LockSidecar, type AdsV2LockPlacement, type AdsV2SceneLayout } from '@/lib/ads/v2ShotLists' // KINEO-ADS-FIEL-3-1510 — recorte da foto original, onde pousou e o JSON ao lado do quadro
import { adsV2ShotRenderId } from '@/lib/ads/v2Shots'
import { adsV2FaceOverlap, adsV2LockCheckTrust, adsV2LockCornerBusy, adsV2LockSidecarSeen, type AdsV2Box, type AdsV2LockCheck, type AdsV2LockSide } from '@/lib/ads/v2ShotLists' // KINEO-ADS-FIEL-4-1510 — o canto reservado + a conferência
import { adsV2ReservedFramePng, adsV2ReservedLayout } from '@/lib/ads/v2Png' // KINEO-ADS-FIEL-4-1510

const RENDER_BUCKET = 'renders'
const MAX_BYTES = 40 * 1024 * 1024
/** Prazo do recorte síncrono (fila + modelo leve). Passou = sem trava neste plano (foto real do produto). */
export const ADS_V2_CUTOUT_TIMEOUT_MS = 45_000

async function download(url: string, timeoutMs = 30_000): Promise<Uint8Array | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs), cache: 'no-store' })
    if (!res.ok) return null
    const buf = new Uint8Array(await res.arrayBuffer())
    return buf.byteLength > 0 && buf.byteLength <= MAX_BYTES ? buf : null
  } catch {
    return null
  }
}

async function upload(path: string, png: Uint8Array): Promise<string | null> {
  const admin = footageAdminClient()
  const up = await admin.storage.from(RENDER_BUCKET).upload(path, png, { contentType: 'image/png', upsert: true })
  if (up.error) return null
  return admin.storage.from(RENDER_BUCKET).getPublicUrl(path).data?.publicUrl ?? null
}

/** O interruptor: 'all' liga para todos; 'internal' só para a lista EXATA de contas da casa (isAdsInternalEmail); erro = desligado. */
export async function adsV2ProductLockEnabled(userId: string): Promise<boolean> {
  if (ADS_V2_PRODUCT_LOCK_MODE === 'all') return true
  if (ADS_V2_PRODUCT_LOCK_MODE !== 'internal') return false
  try {
    const r = await footageAdminClient().auth.admin.getUserById(userId)
    return isAdsInternalEmail(r.data?.user?.email ?? null)
  } catch {
    return false
  }
}

async function runCutout(imageUrl: string): Promise<string | null> {
  const falKey = process.env.FAL_KEY
  if (!falKey) return null
  fal.config({ credentials: falKey })
  let timer: ReturnType<typeof setTimeout> | null = null
  const timeout = new Promise<null>((resolve) => { timer = setTimeout(() => resolve(null), ADS_V2_CUTOUT_TIMEOUT_MS) })
  const job = fal
    .subscribe(ADS_V2_CUTOUT_SLUG, { input: { image_url: imageUrl, model: 'General Use (Light)', operating_resolution: '1024x1024', output_format: 'png', refine_foreground: true } })
    .then((r) => {
      const data = ((r as { data?: unknown }).data ?? r) as { image?: { url?: string } }
      const url = data?.image?.url
      return typeof url === 'string' && /^https:\/\//i.test(url) ? url : null
    })
    .catch(() => null)
  const url = await Promise.race([job, timeout])
  if (timer) clearTimeout(timer)
  return url
}

/** O recorte APARADO da foto do produto (cache no bucket por foto; sem cache, o birefnet). Lança com o motivo. */
export async function adsV2CutoutFor(userId: string, lock: Pick<AdsV2ProductLock, 'footageId' | 'url' | 'sourceFootageId' | 'sourceUrl'>): Promise<AdsV2Rgba> { // KINEO-ADS-FIEL-3-1510 — + a foto original
  const src = adsV2CutoutSource(lock) // KINEO-ADS-FIEL-3-1510 — o recorte sai da foto INTEIRA quando a tela mandou a original (o 1:1 cortava a caixa)
  const path = adsV2CutoutPath(userId, src.footageId) // KINEO-ADS-FIEL-3-1510 — cache por foto de ORIGEM (o recorte da cortada nunca é reaproveitado)
  const admin = footageAdminClient()
  const cachedUrl = admin.storage.from(RENDER_BUCKET).getPublicUrl(path).data?.publicUrl ?? null
  let bytes = cachedUrl ? await download(cachedUrl, 15_000) : null
  if (!bytes || !isPng(bytes)) {
    const falUrl = await runCutout(src.url) // KINEO-ADS-FIEL-3-1510
    if (!falUrl) throw new Error('cutout_provider')
    bytes = await download(falUrl)
    if (!bytes || !isPng(bytes)) throw new Error('cutout_download')
    await upload(path, bytes).catch(() => null)
  }
  return trimCutout(decodePng(bytes))
}

/** O ESBOÇO no bucket (URL pública) — a 1ª referência da cena travada. Lança com o motivo. */
export async function adsV2PrepareLockedScene(args: { userId: string; orderId: string; idx: number; attempt: number; lock: AdsV2ProductLock; format: AdsV2Format }): Promise<string> {
  const cut = await adsV2CutoutFor(args.userId, args.lock) // KINEO-ADS-FIEL-2-1510 — na cena ('scene') o recorte só é aquecido aqui (falhou = foto real do produto, como antes)
  const png = args.lock.mode === 'scene' ? adsV2EmptyLayoutPng(args.format) : adsV2LayoutPng(cut, args.format, args.lock.mode) // KINEO-ADS-FIEL-2-1510 — cena de gente: o esboço é só a tela cinza (o modelo não vê o produto)
  const url = await upload(`${args.userId}/${adsV2ShotRenderId(args.orderId, args.idx, args.attempt)}-layout.png`, png)
  if (!url) throw new Error('layout_upload')
  return url
}

/** O QUADRO TRAVADO no bucket (URL pública), a partir da cena PNG do Nano Banana. Lança com o motivo. */
export async function adsV2FinishLockedScene(args: { userId: string; orderId: string; idx: number; attempt: number; lock: AdsV2ProductLock; format: AdsV2Format; sceneUrl: string; layout?: AdsV2SceneLayout | null }): Promise<{ url: string; rect: { x: number; y: number; w: number; h: number }; shade?: AdsV2Shade; placement?: Omit<AdsV2LockPlacement, 'rect'> }> { // KINEO-ADS-FIEL-2-1510 — + o tom e a sombra aplicados · KINEO-ADS-FIEL-3-1510 — + a leitura da cena (superfície e rostos) e onde pousou
  const bytes = await download(args.sceneUrl)
  if (!bytes) throw new Error('scene_download')
  if (!isPng(bytes)) throw new Error('scene_not_png')
  const cut = await adsV2CutoutFor(args.userId, args.lock)
  const out = adsV2LockedFramePng(decodePng(bytes), cut, args.format, args.lock.mode, { shade: true, ...(args.lock.mode === 'scene' ? { place: { sceneIdx: args.idx, layout: args.layout ?? null } } : {}) }) // KINEO-ADS-FIEL-2-1510 — sombra de contato + tom da cena · KINEO-ADS-FIEL-3-1510 — pousa na superfície, com teto, longe dos rostos
  const url = await upload(`${args.userId}/${adsV2ShotRenderId(args.orderId, args.idx, args.attempt)}-lock.png`, out.png)
  if (!url) throw new Error('lock_upload')
  if (out.placement) await uploadJson(`${args.userId}/${adsV2ShotRenderId(args.orderId, args.idx, args.attempt)}-lock.json`, adsV2LockSidecar(out.rect, out.width, out.height, out.faces ?? [])).catch(() => null) // KINEO-ADS-FIEL-3-1510 — onde o produto e os rostos ficaram: as frases de tela desviam deles (falhou = a regra fixa das frases)
  const where = out.placement ? { source: out.placement.source, side: out.placement.side, scale: out.placement.scale, faceOverlap: out.placement.faceOverlap } : null // KINEO-ADS-FIEL-3-1510
  return { url, rect: out.rect, ...(out.shade ? { shade: out.shade } : {}), ...(where ? { placement: where } : {}) } // KINEO-ADS-FIEL-2-1510 · KINEO-ADS-FIEL-3-1510
}

/**
 * KINEO-ADS-FIEL-4-1510 — o QUADRO TRAVADO no CANTO RESERVADO (reteste 15/10: com o lugar lido pela visão 'low', o produto boiou em 7/7 cenas e
 * cobriu um rosto). O lugar vem só do formato e do lado (adsV2LockReservedRect: base no terço de baixo, encostado na margem do lado); a
 * conferência (`check`, visão 'high') só decide se o canto está OCUPADO: não confiável (sem resposta, caixa redonda, caixa repetida de outra
 * cena em `previous`, nenhum rosto) = o canto fica; confiável e com gente no canto = { busy: true } SEM gravar nada (o avanço refaz a cena 1
 * vez e, de novo, usa a foto real do produto). Grava o PNG e o JSON (produto + rostos confiáveis + `seen`, os crus). Lança com o motivo.
 */
export async function adsV2FinishReservedScene(args: { userId: string; orderId: string; idx: number; attempt: number; lock: AdsV2ProductLock; format: AdsV2Format; sceneUrl: string; side: AdsV2LockSide; check: AdsV2LockCheck | null; previous?: readonly (readonly AdsV2Box[])[] | null }): Promise<{ busy: true; trust: { trusted: boolean; why: string | null } } | { busy: false; url: string; rect: { x: number; y: number; w: number; h: number }; shade: AdsV2Shade; placement: { source: 'reserved'; side: AdsV2LockSide; scale: 1; faceOverlap: number }; trust: { trusted: boolean; why: string | null }; faces: number }> { // KINEO-ADS-FIEL-4-1510
  const bytes = await download(args.sceneUrl) // KINEO-ADS-FIEL-4-1510
  if (!bytes) throw new Error('scene_download') // KINEO-ADS-FIEL-4-1510
  if (!isPng(bytes)) throw new Error('scene_not_png') // KINEO-ADS-FIEL-4-1510
  const cut = await adsV2CutoutFor(args.userId, args.lock) // KINEO-ADS-FIEL-4-1510
  const scene = decodePng(bytes) // KINEO-ADS-FIEL-4-1510
  const at = adsV2ReservedLayout({ sceneW: scene.width, sceneH: scene.height, cutW: cut.width, cutH: cut.height, format: args.format, side: args.side, faces: args.check ? args.check.faces : [] }) // KINEO-ADS-FIEL-4-1510
  const trust = adsV2LockCheckTrust({ check: args.check, expectPeople: true, previous: args.previous ?? null }) // KINEO-ADS-FIEL-4-1510 — toda cena do canto pede gente (adsV2LockCornerAction)
  const r = at.rect // KINEO-ADS-FIEL-4-1510
  const prod = { x0: r.x / at.W, y0: r.y / at.H, x1: (r.x + r.w) / at.W, y1: (r.y + r.h) / at.H } // KINEO-ADS-FIEL-4-1510
  if (adsV2LockCornerBusy({ trusted: trust.trusted, cornerPerson: args.check ? args.check.cornerPerson : null, faces: at.faces, rect: prod })) return { busy: true, trust } // KINEO-ADS-FIEL-4-1510
  const faces = trust.trusted ? at.faces : [] // KINEO-ADS-FIEL-4-1510 — palpite nunca vai às frases de tela
  const out = adsV2ReservedFramePng(scene, cut, args.format, args.side) // KINEO-ADS-FIEL-4-1510
  const name = adsV2ShotRenderId(args.orderId, args.idx, args.attempt) // KINEO-ADS-FIEL-4-1510
  const url = await upload(`${args.userId}/${name}-lock.png`, out.png) // KINEO-ADS-FIEL-4-1510
  if (!url) throw new Error('lock_upload') // KINEO-ADS-FIEL-4-1510
  await uploadJson(`${args.userId}/${name}-lock.json`, adsV2LockSidecarSeen(out.rect, out.width, out.height, faces, args.check ? args.check.faces : [])).catch(() => null) // KINEO-ADS-FIEL-4-1510 — falhou = a regra fixa das frases
  const faceOverlap = Math.round(adsV2FaceOverlap(prod, faces) * 10000) / 10000 // KINEO-ADS-FIEL-4-1510
  return { busy: false, url, rect: out.rect, shade: out.shade, placement: { source: 'reserved', side: args.side, scale: 1, faceOverlap }, trust, faces: faces.length } // KINEO-ADS-FIEL-4-1510
} // KINEO-ADS-FIEL-4-1510

/** KINEO-ADS-FIEL-3-1510 — grava o JSON ao lado do quadro travado (o bucket renders aceita qualquer tipo). Lança se não gravou. */
async function uploadJson(path: string, value: unknown): Promise<void> { // KINEO-ADS-FIEL-3-1510
  const up = await footageAdminClient().storage.from(RENDER_BUCKET).upload(path, new TextEncoder().encode(JSON.stringify(value)), { contentType: 'application/json', upsert: true }) // KINEO-ADS-FIEL-3-1510
  if (up.error) throw new Error('sidecar_upload') // KINEO-ADS-FIEL-3-1510
} // KINEO-ADS-FIEL-3-1510

/** Cancela (melhor esforço) um job da fila da fal abandonado pelo prazo. Nunca lança. */
export async function adsV2CancelFalJob(model: string, requestId: string | null | undefined): Promise<void> {
  const falKey = process.env.FAL_KEY
  if (!falKey || !requestId) return
  try {
    fal.config({ credentials: falKey })
    await fal.queue.cancel(model, { requestId })
  } catch {
    // já rodando ou já terminado: a fal decide; nada a fazer
  }
}
