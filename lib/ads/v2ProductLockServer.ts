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
import { adsV2ShotRenderId } from '@/lib/ads/v2Shots'

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
export async function adsV2CutoutFor(userId: string, lock: Pick<AdsV2ProductLock, 'footageId' | 'url'>): Promise<AdsV2Rgba> {
  const path = adsV2CutoutPath(userId, lock.footageId)
  const admin = footageAdminClient()
  const cachedUrl = admin.storage.from(RENDER_BUCKET).getPublicUrl(path).data?.publicUrl ?? null
  let bytes = cachedUrl ? await download(cachedUrl, 15_000) : null
  if (!bytes || !isPng(bytes)) {
    const falUrl = await runCutout(lock.url)
    if (!falUrl) throw new Error('cutout_provider')
    bytes = await download(falUrl)
    if (!bytes || !isPng(bytes)) throw new Error('cutout_download')
    await upload(path, bytes).catch(() => null)
  }
  return trimCutout(decodePng(bytes))
}

/** O ESBOÇO no bucket (URL pública) — a 1ª referência da cena travada. Lança com o motivo. */
export async function adsV2PrepareLockedScene(args: { userId: string; orderId: string; idx: number; attempt: number; lock: AdsV2ProductLock; format: AdsV2Format }): Promise<string> {
  const cut = await adsV2CutoutFor(args.userId, args.lock)
  const png = adsV2LayoutPng(cut, args.format, args.lock.mode)
  const url = await upload(`${args.userId}/${adsV2ShotRenderId(args.orderId, args.idx, args.attempt)}-layout.png`, png)
  if (!url) throw new Error('layout_upload')
  return url
}

/** O QUADRO TRAVADO no bucket (URL pública), a partir da cena PNG do Nano Banana. Lança com o motivo. */
export async function adsV2FinishLockedScene(args: { userId: string; orderId: string; idx: number; attempt: number; lock: AdsV2ProductLock; format: AdsV2Format; sceneUrl: string }): Promise<{ url: string; rect: { x: number; y: number; w: number; h: number } }> {
  const bytes = await download(args.sceneUrl)
  if (!bytes) throw new Error('scene_download')
  if (!isPng(bytes)) throw new Error('scene_not_png')
  const cut = await adsV2CutoutFor(args.userId, args.lock)
  const out = adsV2LockedFramePng(decodePng(bytes), cut, args.format, args.lock.mode)
  const url = await upload(`${args.userId}/${adsV2ShotRenderId(args.orderId, args.idx, args.attempt)}-lock.png`, out.png)
  if (!url) throw new Error('lock_upload')
  return { url, rect: out.rect }
}

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
