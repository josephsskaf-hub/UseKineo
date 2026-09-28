// KINEO-ADS-V2-2026-09-28 — cenas criadas do anúncio v2 (Comercial e Cinema): Nano Banana Pro edit com as fotos do
// cliente como ÚNICA referência (etapa 2, servidor). A imagem nasce ANTES do vídeo do plano: o image-to-video da cena
// criada parte dela.
//
// Mesmo contrato de envio dos planos (lib/ads/v2Shots.ts submitShotOnce): um POST, corrida de 25 s, ambíguo nunca
// reenviado às cegas. O resultado (images[0].url, CDN da fal que expira) é copiado para o bucket renders em
// '<uid>/adsv2-<order>-p<i>-a<n>-scene.<ext>' antes de virar entrada do vídeo.
import { footageAdminClient } from '@/lib/userFootage'
import { buildSceneImageInput } from '@/lib/ads/v2Engines'
import { ADS_V2_SCENE_IMAGE_SLUG } from '@/lib/ads/v2Tiers'
import { adsV2ShotRenderId, pollFalJob, submitShotOnce, type AdsV2Poll, type AdsV2SubmitOutcome } from '@/lib/ads/v2Shots'

const RENDER_BUCKET = 'renders'
const IMAGE_MAX_BYTES = 30 * 1024 * 1024

export async function submitSceneImage(
  scene: { prompt: string; referenceUrls: readonly string[] },
  ctx: { userId: string; orderId: string },
): Promise<AdsV2SubmitOutcome> {
  const input = buildSceneImageInput(scene)
  return submitShotOnce(ADS_V2_SCENE_IMAGE_SLUG, input as unknown as Record<string, unknown>, ctx)
}

export function pollSceneImage(requestId: string, ctx: { userId: string; orderId: string }): Promise<AdsV2Poll> {
  return pollFalJob(ADS_V2_SCENE_IMAGE_SLUG, requestId, 'image', ctx)
}

function imageExt(b: Uint8Array): { ext: 'jpg' | 'png' | 'webp'; type: string } | null {
  if (b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return { ext: 'jpg', type: 'image/jpeg' }
  if (b.length > 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return { ext: 'png', type: 'image/png' }
  if (b.length > 12 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) return { ext: 'webp', type: 'image/webp' }
  return null
}

/** Copia a imagem da cena para o nosso bucket. null = cópia falhou (o avanço tenta de novo). Nunca lança. */
export async function persistSceneImage(args: { userId: string; orderId: string; idx: number; attempt: number; falUrl: string }): Promise<string | null> {
  try {
    const res = await fetch(args.falUrl, { signal: AbortSignal.timeout(30_000), cache: 'no-store' })
    if (!res.ok) return null
    const buf = new Uint8Array(await res.arrayBuffer())
    if (buf.byteLength === 0 || buf.byteLength > IMAGE_MAX_BYTES) return null
    const kind = imageExt(buf)
    if (!kind) return null
    const admin = footageAdminClient()
    const path = `${args.userId}/${adsV2ShotRenderId(args.orderId, args.idx, args.attempt)}-scene.${kind.ext}`
    const up = await admin.storage.from(RENDER_BUCKET).upload(path, buf, { contentType: kind.type, upsert: true })
    if (up.error) return null
    const url = admin.storage.from(RENDER_BUCKET).getPublicUrl(path).data?.publicUrl ?? null
    return url && url !== args.falUrl ? url : null
  } catch {
    return null
  }
}

/** Copia um áudio público (trilha Lyria na CDN da fal) para o bucket renders. null = falhou. */
export async function persistAudioCopy(args: { userId: string; name: string; sourceUrl: string }): Promise<string | null> {
  try {
    const res = await fetch(args.sourceUrl, { signal: AbortSignal.timeout(30_000), cache: 'no-store' })
    if (!res.ok) return null
    const buf = new Uint8Array(await res.arrayBuffer())
    if (buf.byteLength < 1000 || buf.byteLength > IMAGE_MAX_BYTES) return null
    const admin = footageAdminClient()
    const path = `${args.userId}/${args.name}.mp3`
    const up = await admin.storage.from(RENDER_BUCKET).upload(path, buf, { contentType: 'audio/mpeg', upsert: true })
    if (up.error) return null
    const url = admin.storage.from(RENDER_BUCKET).getPublicUrl(path).data?.publicUrl ?? null
    return url && url !== args.sourceUrl ? url : null
  } catch {
    return null
  }
}
