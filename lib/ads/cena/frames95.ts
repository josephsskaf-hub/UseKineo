// KINEO-ADS-CENA-95-2110 — tempos de apresentação do MP4, nunca FPS presumido; contrato público conferido em 21/10/2026.
// https://fal.ai/models/fal-ai/workflow-utilities/extract-nth-frame/api — select a cada N quadros, images + frame_count, sem timestamps.
// https://developer.apple.com/documentation/quicktime-file-format/time-to-sample_atom
// https://developer.apple.com/documentation/quicktime-file-format/composition_offset_atom
export const CENA95_FRAME_ENDPOINT = 'fal-ai/workflow-utilities/extract-nth-frame'
export const CENA95_FRAME_MAX_BYTES = 64 * 1024 * 1024
export const CENA95_FRAME_MAX_SAMPLES = 7_200
export const CENA95_FRAME_MAX_FPS = 120
export const CENA95_FRAME_MAX_SECONDS = 30
export const CENA95_FRAME_MAX_IMAGES = 240
const MAX_GAP = 1 / 3 + 0.001 // ~3/s; tolera 29,97 FPS, sem arredondar os timestamps reais.
type Box = { type: string; start: number; end: number }
export interface Cena95Mp4Timeline {
  times: number[]; duration: number; sampleCount: number; timescale: number;
  timingSource: 'mp4_stts_ctts';
}
export interface Cena95FrameSelection { frameInterval: number; maxFrames: number; times: number[] }
const invalid = (): never => { throw new Error('cena95_invalid_mp4_timeline') }

/** MP4 não fragmentado, uma trilha de vídeo, uma amostra por quadro. Sem cortes, dwell ou edits vazios.
 * stts fornece DTS por amostra; ctts fornece PTS. Ordenar PTS é necessário para o select do vídeo decodificado.
 * Um edit único pode remover apenas o deslocamento inicial de composição (B-frames), sem cortar amostras.
 * Outros contêineres/edits retornam null: nenhuma aproximação por mdhd/sample_count ou por FPS médio.
 */
export function probeCena95Mp4(bytes: ArrayBuffer | Uint8Array): Cena95Mp4Timeline | null {
  try {
    const data = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes)
    if (data.byteLength < 32 || data.byteLength > CENA95_FRAME_MAX_BYTES) return null
    const view = new DataView(data.buffer, data.byteOffset, data.byteLength)
    const u32 = (p: number) => view.getUint32(p, false)
    const i32 = (p: number) => view.getInt32(p, false)
    const u64 = (p: number) => { const n = u32(p) * 0x1_0000_0000 + u32(p + 4); if (!Number.isSafeInteger(n)) invalid(); return n }
    const i64 = (p: number) => { const n = i32(p) * 0x1_0000_0000 + u32(p + 4); if (!Number.isSafeInteger(n)) invalid(); return n }
    const tag = (p: number) => String.fromCharCode(data[p], data[p + 1], data[p + 2], data[p + 3])
    let boxCount = 0
    const boxes = (start: number, end: number): Box[] => {
      const out: Box[] = []
      for (let p = start; p < end;) {
        if (end - p < 8 || ++boxCount > 10_000) invalid()
        let size = u32(p), header = 8
        if (size === 1) { if (end - p < 16) invalid(); size = u64(p + 8); header = 16 }
        else if (size === 0) size = end - p
        if (size < header || size > end - p) invalid()
        out.push({ type: tag(p + 4), start: p + header, end: p + size }); p += size
      }
      return out
    }
    const one = (list: Box[], type: string, required = true): Box | undefined => {
      const found = list.filter(b => b.type === type)
      if (found.length > 1 || (required && found.length !== 1)) invalid()
      return found[0]
    }
    const need = (b: Box, n: number) => { if (b.end - b.start < n) invalid() }
    const full = (b: Box, versions: number[]) => { need(b, 4); if (!versions.includes(data[b.start]) || data[b.start + 1] || data[b.start + 2] || data[b.start + 3]) invalid() }
    const top = boxes(0, data.byteLength), moov = one(top, 'moov')!
    one(top, 'ftyp')
    if (top.some(b => b.type === 'moof')) invalid()
    const mediaBytes = top.filter(b => b.type === 'mdat').reduce((n, b) => n + b.end - b.start, 0)
    if (!mediaBytes) invalid()
    const movie = boxes(moov.start, moov.end)
    if (movie.some(b => b.type === 'mvex')) invalid()
    const mvhd = one(movie, 'mvhd')!
    full(mvhd, [0, 1]); need(mvhd, data[mvhd.start] === 1 ? 32 : 20)
    const movieScale = u32(mvhd.start + (data[mvhd.start] === 1 ? 20 : 12))
    if (!movieScale || movieScale > 1_000_000_000) invalid()
    const videoTracks: { children: Box[]; mdia: Box[] }[] = []
    for (const track of movie.filter(b => b.type === 'trak')) {
      const children = boxes(track.start, track.end), mdiaBox = one(children, 'mdia')!
      const mdia = boxes(mdiaBox.start, mdiaBox.end), hdlr = one(mdia, 'hdlr')!
      full(hdlr, [0]); need(hdlr, 24)
      if (tag(hdlr.start + 8) === 'vide') videoTracks.push({ children, mdia })
    }
    if (videoTracks.length !== 1) invalid()
    const { children, mdia } = videoTracks[0], mdhd = one(mdia, 'mdhd')!
    full(mdhd, [0, 1]); need(mdhd, data[mdhd.start] === 1 ? 36 : 24)
    const version1 = data[mdhd.start] === 1
    const timescale = u32(mdhd.start + (version1 ? 20 : 12))
    const durationTicks = version1 ? u64(mdhd.start + 24) : u32(mdhd.start + 16)
    if (!timescale || timescale > 1_000_000_000 || !durationTicks || durationTicks / timescale > CENA95_FRAME_MAX_SECONDS) invalid()
    const minf = one(mdia, 'minf')!, stbl = one(boxes(minf.start, minf.end), 'stbl')!
    const table = boxes(stbl.start, stbl.end), stts = one(table, 'stts')!, stsz = one(table, 'stsz')!
    full(stts, [0]); need(stts, 8)
    const entries = u32(stts.start + 4)
    if (!entries || entries > CENA95_FRAME_MAX_SAMPLES || stts.end - stts.start !== 8 + entries * 8) invalid()
    const samples: { pts: number; delta: number }[] = []
    let tick = 0
    for (let e = 0; e < entries; e++) {
      const p = stts.start + 8 + e * 8, count = u32(p), delta = u32(p + 4)
      if (!count || !delta || samples.length + count > CENA95_FRAME_MAX_SAMPLES || timescale / delta > CENA95_FRAME_MAX_FPS) invalid()
      for (let n = 0; n < count; n++) { samples.push({ pts: tick, delta }); tick += delta }
      if (!Number.isSafeInteger(tick)) invalid()
    }
    if (tick !== durationTicks) invalid()
    full(stsz, [0]); need(stsz, 12)
    const uniformSize = u32(stsz.start + 4), sampleCount = u32(stsz.start + 8)
    if (sampleCount !== samples.length || stsz.end - stsz.start !== 12 + (uniformSize ? 0 : sampleCount * 4)) invalid()
    let videoBytes = uniformSize * sampleCount
    if (!uniformSize) for (let n = 0; n < sampleCount; n++) { const size = u32(stsz.start + 12 + n * 4); if (!size) invalid(); videoBytes += size }
    if (!videoBytes || !Number.isSafeInteger(videoBytes) || videoBytes > mediaBytes) invalid()
    const ctts = one(table, 'ctts', false)
    if (ctts) {
      full(ctts, [0, 1]); need(ctts, 8)
      const count = u32(ctts.start + 4)
      if (!count || count > sampleCount || ctts.end - ctts.start !== 8 + count * 8) invalid()
      let index = 0
      for (let e = 0; e < count; e++) {
        const p = ctts.start + 8 + e * 8, repeats = u32(p), offset = data[ctts.start] === 1 ? i32(p + 4) : u32(p + 4)
        if (!repeats || index + repeats > sampleCount || Math.abs(offset) > timescale * 2) invalid()
        for (let n = 0; n < repeats; n++) samples[index++].pts += offset
      }
      if (index !== sampleCount) invalid()
    }
    samples.sort((a, b) => a.pts - b.pts)
    let mediaStart = 0, duration = durationTicks / timescale
    const edts = one(children, 'edts', false)
    if (edts) {
      const elst = one(boxes(edts.start, edts.end), 'elst')!
      full(elst, [0, 1]); need(elst, 8)
      const v1 = data[elst.start] === 1, p = elst.start + 8
      if (u32(elst.start + 4) !== 1 || elst.end - elst.start !== (v1 ? 28 : 20)) invalid()
      const editTicks = v1 ? u64(p) : u32(p)
      mediaStart = v1 ? i64(p + 8) : i32(p + 4)
      if (mediaStart < 0 || view.getInt16(p + (v1 ? 16 : 8), false) !== 1 || view.getInt16(p + (v1 ? 18 : 10), false) !== 0) invalid()
      duration = editTicks / movieScale
      if (Math.abs(duration - durationTicks / timescale) > 1 / movieScale + 1 / timescale) invalid()
    }
    if (!samples.length || samples[0].pts !== mediaStart) invalid()
    const last = samples[samples.length - 1]
    if (Math.abs((last.pts + last.delta - mediaStart) / timescale - duration) > 1 / movieScale + 1 / timescale) invalid()
    const times = samples.map((s, n) => {
      if (s.pts < mediaStart || (n > 0 && s.pts <= samples[n - 1].pts)) invalid()
      return (s.pts - mediaStart) / timescale
    })
    if (!Number.isFinite(duration) || duration <= 0 || duration > CENA95_FRAME_MAX_SECONDS || times.some(t => t >= duration)) invalid()
    return { times, duration, sampleCount, timescale, timingSource: 'mp4_stts_ctts' }
  } catch { return null }
}

/** FFmpeg select n=0,N,2N… na ordem de apresentação. Confere o maior vão REAL, incluindo o fim do arquivo. */
export function cena95FrameSelection(probe: Cena95Mp4Timeline, seconds: number): Cena95FrameSelection | null {
  if (!Number.isFinite(seconds) || seconds < 1 || seconds > CENA95_FRAME_MAX_SECONDS || !probe || !Array.isArray(probe.times) || probe.times.length !== probe.sampleCount || !probe.times.length || probe.times.length > CENA95_FRAME_MAX_SAMPLES || probe.duration + 0.001 < seconds || probe.duration > CENA95_FRAME_MAX_SECONDS || probe.times[0] !== 0) return null
  if (probe.times.some((t, n) => !Number.isFinite(t) || t < 0 || t >= probe.duration || (n > 0 && t <= probe.times[n - 1]))) return null
  const sections = seconds <= 3 ? [[0, seconds]] : seconds <= 10 ? [[0, 3], [3, seconds]] : [[0, 3], [3, 10], [10, seconds]]
  for (let interval = Math.floor(CENA95_FRAME_MAX_FPS / 3); interval >= 1; interval--) {
    const times = probe.times.filter((_, n) => n % interval === 0)
    if (times.length > CENA95_FRAME_MAX_IMAGES || times.length < 3) continue
    if (times.some((t, n) => n > 0 && t - times[n - 1] > MAX_GAP) || probe.duration - times[times.length - 1] > MAX_GAP) continue
    if (sections.some(([a, b]) => times.filter(t => t >= a && t < b).length < 3)) continue
    return { frameInterval: interval, maxFrames: times.length, times }
  }
  return null
}

function publicHttps(value: unknown): value is string {
  if (typeof value !== 'string' || value.length > 8_192) return false
  try { const u = new URL(value); return u.protocol === 'https:' && !u.username && !u.password && !!u.hostname && !u.hash } catch { return false }
}
async function boundedBody(response: Response, cap: number): Promise<Uint8Array> {
  const length = response.headers.get('content-length'), declared = length === null ? null : Number(length)
  if (declared !== null && (!/^\d+$/u.test(length!) || !Number.isSafeInteger(declared) || declared < 1 || declared > cap)) invalid()
  if (!response.body) invalid()
  const reader = response.body!.getReader(), chunks: Uint8Array[] = []
  let total = 0
  try {
    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      total += value.byteLength
      if (total > cap) { await reader.cancel(); invalid() }
      chunks.push(value)
    }
  } finally { reader.releaseLock() }
  if (!total || (declared !== null && !response.headers.get('content-encoding') && total !== declared)) invalid()
  const body = new Uint8Array(total)
  let offset = 0
  for (const chunk of chunks) { body.set(chunk, offset); offset += chunk.byteLength }
  return body
}
export interface Cena95FrameDependencies { fetchImpl?: typeof fetch; falKey?: string; timeoutMs?: number }
export interface Cena95ExtractedFrames { frames: { url: string; t: number }[]; wallMs: number; actualComputeSeconds: null }
/** Um GET completo e limitado + UM POST síncrono. Timeout/429/erro ambíguo nunca repete uma submissão paga.
 * O chamador persiste intenção antes de chamar. wallMs é latência, NÃO medição de CPU faturada.
 * A chave só entra por dependência explícita; não há leitura de env, SDK, queue/fallback ou serviço em testes.
 */
export async function extractCena95Frames(videoUrl: string, seconds: number, deps: Cena95FrameDependencies = {}): Promise<Cena95ExtractedFrames | null> {
  const start = Date.now()
  try {
    const timeoutMs = deps.timeoutMs ?? 90_000
    if (!publicHttps(videoUrl) || !deps.falKey || !Number.isFinite(timeoutMs) || timeoutMs < 100 || timeoutMs > 120_000 || !Number.isFinite(seconds) || seconds < 1 || seconds > CENA95_FRAME_MAX_SECONDS) return null
    const fetchImpl = deps.fetchImpl ?? globalThis.fetch, signal = AbortSignal.timeout(timeoutMs)
    const video = await fetchImpl(videoUrl, { method: 'GET', signal, redirect: 'error' })
    if (video.status !== 200) return null
    const mime = video.headers.get('content-type')?.split(';')[0].trim().toLowerCase()
    if (mime && !['video/mp4', 'video/quicktime', 'application/octet-stream'].includes(mime)) return null
    const bytes = await boundedBody(video, CENA95_FRAME_MAX_BYTES), probe = probeCena95Mp4(bytes)
    if (!probe) return null
    const selection = cena95FrameSelection(probe, seconds)
    if (!selection) return null
    const response = await fetchImpl(`https://fal.run/${CENA95_FRAME_ENDPOINT}`, {
      method: 'POST', signal, redirect: 'error',
      headers: { Authorization: `Key ${deps.falKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ video_url: videoUrl, frame_interval: selection.frameInterval, max_frames: selection.maxFrames, output_format: 'jpg', quality: 90 }),
    })
    if (response.status !== 200) return null
    const raw = JSON.parse(new TextDecoder().decode(await boundedBody(response, 2 * 1024 * 1024))) as { images?: { url?: unknown }[]; frame_count?: number }
    if (!Array.isArray(raw.images) || raw.frame_count !== selection.maxFrames || raw.images.length !== selection.maxFrames) return null
    const urls = raw.images.map(image => image?.url)
    if (!urls.every(publicHttps) || new Set(urls).size !== urls.length) return null
    return { frames: urls.map((url, n) => ({ url: url as string, t: selection.times[n] })), wallMs: Math.max(0, Date.now() - start), actualComputeSeconds: null }
  } catch { return null }
}
