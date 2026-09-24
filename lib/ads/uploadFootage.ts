// KINEO-STUDIO-ADS-SELF-SERVE-2026-09-24 — envio de foto/vídeo/logo do Studio Ads pelo navegador.
// Cliente puro (sem import de servidor): o /ads/new chama isto UM ARQUIVO POR VEZ — o caminho no bucket é
// clip-<ms>, dois PUT no mesmo milissegundo colidem (x-upsert:false). Fluxo de 3 passos do /api/footage
// (upload-url → PUT com o Content-Type EXATO declarado → confirm), copiado do GenerateClient em vez de importado.
// WEBP e HEIC (recusados pela rota E pelo bucket) viram JPEG no navegador quando ele sabe decodificar; o logo
// vira PNG para não perder a transparência. Largura/altura/duração são lidas ANTES do envio e nunca bloqueiam:
// HEVC .mov não decodifica no Chrome e devolve null.
import type { AdsMediaItem } from '@/lib/ads/types'
import { readClip } from '@/lib/videoEditing/browserEditor'

export const ADS_UPLOAD_MAX_BYTES = 50 * 1024 * 1024
/** O que o seletor de arquivos oferece (o que não for aceito pela rota é convertido ou recusado aqui).
 *  HEIC fica FORA de propósito: sem ele no accept, o iPhone entrega a foto já convertida em JPEG; HEIC escolhido
 *  por "todos os arquivos" ainda passa pela conversão abaixo quando o navegador sabe ler. */
export const ADS_UPLOAD_ACCEPT_MEDIA = 'image/jpeg,image/png,image/webp,video/mp4,video/quicktime,video/webm,.mov'
export const ADS_UPLOAD_ACCEPT_LOGO = 'image/png,image/jpeg,image/webp,.webp'

const ROUTE_TYPES = ['image/jpeg', 'image/png', 'video/mp4', 'video/quicktime', 'video/webm'] as const
type RouteType = (typeof ROUTE_TYPES)[number]
const CONVERTIBLE = ['image/webp', 'image/heic', 'image/heif'] as const

const BY_EXT: Record<string, string> = {
  jpg: 'image/jpeg', jpeg: 'image/jpeg', jfif: 'image/jpeg', png: 'image/png',
  webp: 'image/webp', heic: 'image/heic', heif: 'image/heif',
  mp4: 'video/mp4', m4v: 'video/mp4', mov: 'video/quicktime', qt: 'video/quicktime', webm: 'video/webm',
}

export type AdsUploadRefusal =
  | 'unsupported_type'
  | 'file_too_large'
  | 'logo_must_be_image'
  | 'convert_failed'
  | 'unauthenticated'
  | 'paid_feature'
  | 'quota'
  | 'upload_failed'

/** Erro com motivo curto (vai no evento ads_media_refused) e frase pronta para a tela. */
export class AdsUploadError extends Error {
  readonly reason: AdsUploadRefusal
  readonly status: number | null
  constructor(reason: AdsUploadRefusal, message: string, status: number | null = null) {
    super(message)
    this.name = 'AdsUploadError'
    this.reason = reason
    this.status = status
  }
}

function extOf(name: string): string {
  const m = /\.([a-z0-9]{2,5})$/i.exec(name || '')
  return m ? m[1].toLowerCase() : ''
}

/** Tipo real do arquivo: o do navegador quando existe, senão pela extensão (alguns seletores mandam type vazio). */
export function normalizeFootageType(file: Blob & { name?: string }): string {
  const raw = (file.type || '').toLowerCase().trim()
  if (raw === 'image/jpg' || raw === 'image/pjpeg') return 'image/jpeg'
  if (raw && raw !== 'application/octet-stream') return raw
  return BY_EXT[extOf(file.name ?? '')] ?? ''
}

function isRouteType(t: string): t is RouteType {
  return (ROUTE_TYPES as readonly string[]).includes(t)
}

function baseName(name: string): string {
  const n = (name || 'photo').replace(/\.[a-z0-9]{2,5}$/i, '').replace(/[^\w\- ]+/g, '').trim()
  return n || 'photo'
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    try {
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('encode_failed'))), type, quality)
    } catch (e) {
      reject(e instanceof Error ? e : new Error('encode_failed'))
    }
  })
}

/** WEBP/HEIC → JPEG (foto) ou PNG (logo), só quando o navegador sabe decodificar. Lado maior limitado a 3840 px. */
async function reencodeImage(file: File, asPng: boolean): Promise<File> {
  if (typeof createImageBitmap !== 'function' || typeof document === 'undefined') {
    throw new AdsUploadError('convert_failed', 'Your browser cannot convert this photo. Save it as JPG or PNG and upload it again.')
  }
  let bmp: ImageBitmap
  try {
    bmp = await createImageBitmap(file)
  } catch {
    throw new AdsUploadError('convert_failed', 'Your browser cannot open this photo. Save it as JPG (on iPhone: Settings → Camera → Formats → Most Compatible) and upload it again.')
  }
  try {
    const max = 3840
    const scale = Math.min(1, max / Math.max(bmp.width, bmp.height))
    const w = Math.max(1, Math.round(bmp.width * scale))
    const h = Math.max(1, Math.round(bmp.height * scale))
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('no_ctx')
    if (!asPng) {
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, w, h)
    }
    ctx.drawImage(bmp, 0, 0, w, h)
    const type = asPng ? 'image/png' : 'image/jpeg'
    const blob = await canvasToBlob(canvas, type, asPng ? undefined : 0.9)
    return new File([blob], `${baseName(file.name)}.${asPng ? 'png' : 'jpg'}`, { type })
  } catch (e) {
    if (e instanceof AdsUploadError) throw e
    throw new AdsUploadError('convert_failed', 'This photo could not be converted. Save it as JPG or PNG and upload it again.')
  } finally {
    try { bmp.close() } catch { /* ignore */ }
  }
}

export interface PreparedFootage {
  file: File
  type: RouteType
  kind: 'image' | 'video'
}

/** Normaliza o tipo, converte WEBP/HEIC e recusa localmente o que a rota recusaria (tipo e tamanho). */
export async function prepareFootageFile(input: File, opts: { isLogo?: boolean } = {}): Promise<PreparedFootage> {
  const isLogo = opts.isLogo === true
  let file = input
  let type = normalizeFootageType(file)
  if (isLogo && !type.startsWith('image/')) {
    throw new AdsUploadError('logo_must_be_image', 'The logo must be an image: PNG or JPG.')
  }
  if ((CONVERTIBLE as readonly string[]).includes(type)) {
    file = await reencodeImage(file, isLogo)
    type = file.type
  }
  if (!isRouteType(type)) {
    throw new AdsUploadError(
      'unsupported_type',
      isLogo ? 'Upload the logo as PNG or JPG.' : 'Use JPG or PNG photos and MP4, MOV or WebM videos.',
    )
  }
  if (!file.size || file.size > ADS_UPLOAD_MAX_BYTES) {
    throw new AdsUploadError('file_too_large', 'Each file must be under 50 MB.')
  }
  // Garante que o corpo do PUT carrega exatamente o tipo declarado (o bucket confere).
  if (file.type !== type) file = new File([file], file.name || `upload.${extOf(file.name) || 'bin'}`, { type })
  return { file, type, kind: type.startsWith('video/') ? 'video' : 'image' }
}

export interface FootageProbe {
  width: number | null
  height: number | null
  seconds: number | null
}

/** Largura/altura (foto) e duração (vídeo) lidas no navegador. Falha = null, nunca bloqueia o envio. */
export async function probeFootage(file: File, kind: 'image' | 'video'): Promise<FootageProbe> {
  const empty: FootageProbe = { width: null, height: null, seconds: null }
  if (typeof window === 'undefined') return empty
  if (kind === 'video') {
    const ac = new AbortController()
    try {
      const info = await readClip(file, ac.signal)
      return {
        width: Math.round(info.width) || null,
        height: Math.round(info.height) || null,
        seconds: Number.isFinite(info.duration) ? Math.round(info.duration * 10) / 10 : null,
      }
    } catch {
      return empty
    } finally {
      ac.abort()
    }
  }
  try {
    if (typeof createImageBitmap === 'function') {
      const bmp = await createImageBitmap(file)
      const out = { width: bmp.width || null, height: bmp.height || null, seconds: null }
      try { bmp.close() } catch { /* ignore */ }
      return out
    }
  } catch { /* cai no <img> */ }
  return new Promise<FootageProbe>((resolve) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    const done = (v: FootageProbe) => { URL.revokeObjectURL(url); resolve(v) }
    img.onload = () => done({ width: img.naturalWidth || null, height: img.naturalHeight || null, seconds: null })
    img.onerror = () => done(empty)
    img.src = url
  })
}

async function readJson(res: Response): Promise<Record<string, unknown>> {
  try {
    const j = await res.json()
    return j && typeof j === 'object' ? (j as Record<string, unknown>) : {}
  } catch {
    return {}
  }
}

function refusalFromStatus(status: number, body: Record<string, unknown>): AdsUploadError {
  const msg = typeof body.error === 'string' && body.error.trim() ? body.error : ''
  if (status === 401) return new AdsUploadError('unauthenticated', 'Sign in again to upload your files.', status)
  if (status === 402) return new AdsUploadError('paid_feature', msg || 'Uploading your own files needs the Studio Ads pass or a paid plan.', status)
  if (status === 409) return new AdsUploadError('quota', msg || 'Your file storage is full. Delete something to upload more.', status)
  if (status === 400 && /under 50 MB/i.test(msg)) return new AdsUploadError('file_too_large', msg, status)
  if (status === 400 && /JPG|PNG|MP4/i.test(msg)) return new AdsUploadError('unsupported_type', msg, status)
  return new AdsUploadError('upload_failed', msg || 'The upload did not finish. Try again.', status)
}

export interface UploadFootageResult extends AdsMediaItem {
  /** URL local (blob:) do arquivo enviado — para miniatura e para o cartão final sem passar pela rede. */
  localUrl: string | null
}

/**
 * Envia UM arquivo pelo /api/footage e devolve o item no formato do pedido (AdsMediaItem).
 * Lança AdsUploadError com `reason` curto e mensagem pronta para a tela.
 */
export async function uploadFootage(input: File, opts: { isLogo?: boolean } = {}): Promise<UploadFootageResult> {
  const isLogo = opts.isLogo === true
  const prepared = await prepareFootageFile(input, { isLogo })
  const { file, type, kind } = prepared
  const probe = await probeFootage(file, kind)

  let startRes: Response
  try {
    startRes = await fetch('/api/footage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'upload-url', contentType: type, sizeBytes: file.size }),
    })
  } catch {
    throw new AdsUploadError('upload_failed', 'No connection. Check your internet and try again.')
  }
  const start = await readJson(startRes)
  if (!startRes.ok || typeof start.signedUrl !== 'string' || typeof start.path !== 'string') {
    throw refusalFromStatus(startRes.status, start)
  }

  let putRes: Response
  try {
    putRes = await fetch(start.signedUrl, {
      method: 'PUT',
      headers: { 'Content-Type': type, 'x-upsert': 'false' },
      body: file,
    })
  } catch {
    throw new AdsUploadError('upload_failed', 'The upload was interrupted. Try again.')
  }
  if (!putRes.ok) throw new AdsUploadError('upload_failed', 'The upload did not finish. Try again.', putRes.status)

  let confirmRes: Response
  try {
    confirmRes = await fetch('/api/footage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'confirm', path: start.path, kind: typeof start.kind === 'string' ? start.kind : kind, sizeBytes: file.size }),
    })
  } catch {
    throw new AdsUploadError('upload_failed', 'No connection. Check your internet and try again.')
  }
  const confirm = await readJson(confirmRes)
  const item = confirm.item as { id?: unknown; url?: unknown; kind?: unknown; size_bytes?: unknown } | undefined
  if (!confirmRes.ok || !item || typeof item.id !== 'string' || typeof item.url !== 'string') {
    throw refusalFromStatus(confirmRes.status, confirm)
  }

  let localUrl: string | null = null
  try { localUrl = URL.createObjectURL(file) } catch { localUrl = null }

  return {
    footageId: item.id,
    url: item.url,
    kind: item.kind === 'video' ? 'video' : 'image',
    isLogo,
    bytes: typeof item.size_bytes === 'number' ? item.size_bytes : file.size,
    width: probe.width,
    height: probe.height,
    seconds: probe.seconds,
    localUrl,
  }
}
