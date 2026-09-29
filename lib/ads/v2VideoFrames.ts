// KINEO-ADS-MODO-SIMPLES-2026-09-29 — vídeo vira fotos NO NAVEGADOR (modo simples do /ads/v2). O fundador mandou 8 fotos
// e 1 vídeo do imóvel; o montador só aceitava foto. Aqui um <video> mudo com URL de blob é avançado até cada tempo
// (videoFrameTimes, lib/ads/v2Simple.ts), o quadro é desenhado num canvas do tamanho original e vira JPEG q0.92.
// Nada sobe ao servidor por aqui: os quadros seguem o caminho de sempre (recorte 9:16 → uploadFootage).
//
// SÓ NAVEGADOR e sem import. Quadro quase preto (brilho médio < 0,06 numa amostra 32×32) é trocado pelo quadro de 35% ou
// 65% da duração. Navegador que não decodifica o vídeo (HEVC no Chrome do Windows) = VideoFramesError('decode').

export const VIDEO_FRAME_JPEG_QUALITY = 0.92
export const VIDEO_FRAME_DARK_LUMA = 0.06
export const VIDEO_FRAME_SEEK_TIMEOUT_MS = 15_000
export const VIDEO_FRAME_FALLBACK_FRACTIONS: readonly number[] = [0.35, 0.65]

export class VideoFramesError extends Error {
  code: 'decode' | 'too_long' | 'canvas' | 'aborted'
  constructor(code: 'decode' | 'too_long' | 'canvas' | 'aborted') {
    super(`video_frames_${code}`)
    this.code = code
  }
}

function waitEvent(el: HTMLVideoElement, ok: string, ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    let timer = 0
    const done = (fn: () => void) => {
      window.clearTimeout(timer)
      el.removeEventListener(ok, onOk)
      el.removeEventListener('error', onErr)
      signal?.removeEventListener('abort', onAbort)
      fn()
    }
    const onOk = () => done(resolve)
    const onErr = () => done(() => reject(new VideoFramesError('decode')))
    const onAbort = () => done(() => reject(new VideoFramesError('aborted')))
    el.addEventListener(ok, onOk)
    el.addEventListener('error', onErr)
    signal?.addEventListener('abort', onAbort)
    timer = window.setTimeout(() => done(() => reject(new VideoFramesError('decode'))), ms)
  })
}

function toBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    try {
      canvas.toBlob((b) => (b ? resolve(b) : reject(new VideoFramesError('canvas'))), 'image/jpeg', quality)
    } catch {
      reject(new VideoFramesError('canvas'))
    }
  })
}

/** Brilho médio (0..1) do canvas numa amostra 32×32. */
function meanLuma(source: HTMLCanvasElement): number {
  try {
    const s = document.createElement('canvas')
    s.width = 32
    s.height = 32
    const ctx = s.getContext('2d')
    if (!ctx) return 1
    ctx.drawImage(source, 0, 0, 32, 32)
    const d = ctx.getImageData(0, 0, 32, 32).data
    let sum = 0
    for (let i = 0; i < d.length; i += 4) sum += 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]
    return sum / (d.length / 4) / 255
  } catch {
    return 1
  }
}

/**
 * Tira quadros de um vídeo local. `pickTimes(duration)` devolve os tempos (em segundos). `maxSeconds` recusa vídeo
 * longo demais antes de avançar. Devolve um JPEG por tempo, na ordem, com nome `<arquivo>-quadro-N.jpg`.
 */
export async function grabVideoFrames(
  file: File,
  pickTimes: (duration: number) => number[],
  opts: { maxSeconds?: number; signal?: AbortSignal } = {},
): Promise<File[]> {
  const url = URL.createObjectURL(file)
  const video = document.createElement('video')
  video.muted = true
  video.playsInline = true
  video.preload = 'auto'
  try {
    video.src = url
    await waitEvent(video, 'loadeddata', VIDEO_FRAME_SEEK_TIMEOUT_MS, opts.signal)
    const duration = video.duration
    if (!Number.isFinite(duration) || duration <= 0 || !video.videoWidth || !video.videoHeight) throw new VideoFramesError('decode')
    if (opts.maxSeconds && duration > opts.maxSeconds) throw new VideoFramesError('too_long')
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new VideoFramesError('canvas')

    const drawAt = async (t: number): Promise<number> => {
      if (Math.abs(video.currentTime - t) > 0.001) {
        const seeked = waitEvent(video, 'seeked', VIDEO_FRAME_SEEK_TIMEOUT_MS, opts.signal)
        video.currentTime = t
        await seeked
      }
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
      return meanLuma(canvas)
    }

    const base = (file.name || 'video').replace(/\.[a-z0-9]{2,5}$/i, '').replace(/[^\w-]+/g, '-').slice(0, 40) || 'video'
    const out: File[] = []
    const times = pickTimes(duration)
    for (let i = 0; i < times.length; i++) {
      let luma = await drawAt(times[i])
      if (luma < VIDEO_FRAME_DARK_LUMA) {
        for (const f of VIDEO_FRAME_FALLBACK_FRACTIONS) {
          const alt = Math.min(duration * f, Math.max(0, duration - 0.05))
          luma = await drawAt(alt)
          if (luma >= VIDEO_FRAME_DARK_LUMA) break
        }
        if (luma < VIDEO_FRAME_DARK_LUMA) luma = await drawAt(times[i])
      }
      const blob = await toBlob(canvas, VIDEO_FRAME_JPEG_QUALITY)
      out.push(new File([blob], `${base}-quadro-${i + 1}.jpg`, { type: 'image/jpeg' }))
    }
    return out
  } finally {
    try { video.removeAttribute('src'); video.load() } catch { /* ignore */ }
    try { URL.revokeObjectURL(url) } catch { /* ignore */ }
  }
}

// ── KINEO-ADS-VIDEO-DO-CLIENTE-2026-09-29 — o vídeo entra COMO VÍDEO ─────────────────────────────────────────────────────
// Lê duração/largura/altura, amostra quadros minúsculos (32×18) para achar o trecho mais "vivo" (a regra pura mora em
// lib/ads/v2UserVideo.ts: sampleTimes e pickStart chegam por parâmetro — este arquivo continua SEM import) e tira UMA
// miniatura JPEG no meio desse trecho, que é o que a tela mostra e o que a pessoa arrasta para escolher o enquadramento.
// Nada sobe por aqui: o arquivo original sobe depois pelo /api/footage (uploadFootage). Falha = VideoFramesError('decode')
// e a tela cai no plano B (grabVideoFrames: quadros viram fotos).

export interface UserVideoRead {
  seconds: number
  width: number
  height: number
  /** Início sugerido do trecho (s) — o servidor ainda confere contra a duração que ELE mede. */
  start: number
  /** Miniatura JPEG do trecho escolhido (só para a tela). */
  thumb: File
}

/** Brilho (0..1) de cada célula de uma amostra 32×18 do quadro atual. */
function lumaGrid(video: HTMLVideoElement, ctx: CanvasRenderingContext2D): Float32Array {
  ctx.drawImage(video, 0, 0, 32, 18)
  const d = ctx.getImageData(0, 0, 32, 18).data
  const out = new Float32Array(d.length / 4)
  for (let i = 0, j = 0; i < d.length; i += 4, j++) out[j] = (0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]) / 255
  return out
}

export async function readUserVideo(
  file: File,
  sampleTimes: (duration: number) => number[],
  pickStart: (times: number[], diffs: number[], duration: number) => number,
  opts: { signal?: AbortSignal; thumbOffset?: number } = {},
): Promise<UserVideoRead> {
  const url = URL.createObjectURL(file)
  const video = document.createElement('video')
  video.muted = true
  video.playsInline = true
  video.preload = 'auto'
  try {
    video.src = url
    await waitEvent(video, 'loadeddata', VIDEO_FRAME_SEEK_TIMEOUT_MS, opts.signal)
    const duration = video.duration
    const width = video.videoWidth
    const height = video.videoHeight
    if (!Number.isFinite(duration) || duration <= 0 || !width || !height) throw new VideoFramesError('decode')
    const seekTo = async (t: number) => {
      if (Math.abs(video.currentTime - t) > 0.001) {
        const seeked = waitEvent(video, 'seeked', VIDEO_FRAME_SEEK_TIMEOUT_MS, opts.signal)
        video.currentTime = t
        await seeked
      }
    }
    const small = document.createElement('canvas')
    small.width = 32
    small.height = 18
    const sctx = small.getContext('2d', { willReadFrequently: true } as CanvasRenderingContext2DSettings)
    if (!sctx) throw new VideoFramesError('canvas')
    const times = sampleTimes(duration)
    const diffs: number[] = []
    let prev: Float32Array | null = null
    for (const t of times) {
      await seekTo(t)
      let grid: Float32Array | null = null
      try { grid = lumaGrid(video, sctx) } catch { grid = null }
      if (prev && grid) {
        let sum = 0
        for (let i = 0; i < grid.length; i++) sum += Math.abs(grid[i] - prev[i])
        diffs.push(sum / grid.length)
      } else if (prev) {
        diffs.push(0)
      }
      prev = grid
    }
    const start = pickStart(times, diffs, duration)
    // Miniatura no meio do trecho escolhido, no tamanho original (limitado a 1920 px no lado maior).
    await seekTo(Math.min(Math.max(0, duration - 0.05), start + (opts.thumbOffset ?? 1)))
    const scale = Math.min(1, 1920 / Math.max(width, height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(width * scale))
    canvas.height = Math.max(1, Math.round(height * scale))
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new VideoFramesError('canvas')
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    const blob = await toBlob(canvas, VIDEO_FRAME_JPEG_QUALITY)
    const base = (file.name || 'video').replace(/\.[a-z0-9]{2,5}$/i, '').replace(/[^\w-]+/g, '-').slice(0, 40) || 'video'
    return { seconds: duration, width, height, start, thumb: new File([blob], `${base}-miniatura.jpg`, { type: 'image/jpeg' }) }
  } finally {
    try { video.removeAttribute('src'); video.load() } catch { /* ignore */ }
    try { URL.revokeObjectURL(url) } catch { /* ignore */ }
  }
}
