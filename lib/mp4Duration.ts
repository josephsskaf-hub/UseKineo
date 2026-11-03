// KINEO-DURACAO-REAL-DO-CLIPE-2026-09-14 — a proteção pendente do item 7 da
// auditoria (Board 14/09): os timestamps do Whisper NÃO medem o arquivo. Esta
// sonda lê o cabeçalho `mvhd` do próprio MP4 (timescale + duration) e devolve
// a duração real da mídia. Puro, sem I/O, sem ffprobe. Devolve null quando o
// arquivo não é um MP4 legível (o chamador decide o que fazer com o silêncio).
export function probeMp4DurationSeconds(bytes: ArrayBuffer | Uint8Array): number | null {
  const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes)
  const dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength)
  const type = (o: number) => String.fromCharCode(u8[o], u8[o + 1], u8[o + 2], u8[o + 3])
  const walk = (start: number, end: number): number | null => {
    let o = start
    while (o + 8 <= end) {
      let size = dv.getUint32(o)
      const box = type(o + 4)
      let header = 8
      if (size === 1) {
        if (o + 16 > end) return null
        const hi = dv.getUint32(o + 8)
        const lo = dv.getUint32(o + 12)
        size = hi * 4294967296 + lo
        header = 16
      } else if (size === 0) size = end - o
      if (size < header || o + size > end) return null
      if (box === 'moov') {
        const inner = walk(o + header, o + size)
        if (inner != null) return inner
      } else if (box === 'mvhd') {
        const version = u8[o + header]
        if (version === 1) {
          const timescale = dv.getUint32(o + header + 20)
          const duration = dv.getUint32(o + header + 24) * 4294967296 + dv.getUint32(o + header + 28)
          return timescale > 0 ? duration / timescale : null
        }
        const timescale = dv.getUint32(o + header + 12)
        const duration = dv.getUint32(o + header + 16)
        return timescale > 0 ? duration / timescale : null
      }
      o += size
    }
    return null
  }
  try {
    const d = walk(0, u8.byteLength)
    return d != null && Number.isFinite(d) && d > 0 ? Math.round(d * 1000) / 1000 : null
  } catch {
    return null
  }
}

// ═══ KINEO-FRENTE-A-SEM-LOOP-0311 [TRAVA 8.2 — fundador 03/11: "vamos pegar todos esses defeitos que já são conhecidos e arrumar todos, universalizar"] ═══
// A montagem do hollywood (lib/compose.ts, buildHollywoodCreatomateSource) monta cada cena de b-roll com loop:true: quando o clipe
// que a fal devolveu é mais CURTO que a janela da cena (a fal arredonda os segundos — 7,4 s planejados viram um clipe de 7 s —, e o
// crossfade ainda estende 0,25 s por baixo da cena seguinte), o clipe RECOMEÇA e o quadro de abertura pisca de novo antes do corte:
// o "mesmo plano repetido" que o revisor marca. Para trocar o laço por segurar o fim, a montagem precisa da duração REAL do arquivo.
// Aqui: lê só o cabeçalho (Range de 256 KB no começo; se o moov estiver no fim, 256 KB do fim) e acha a caixa mvhd. Falha aberta:
// qualquer erro, prazo ou formato desconhecido → null, e a montagem faz exatamente o que fazia antes.

/** Acha a caixa mvhd num TRECHO qualquer do MP4 (começo ou fim do arquivo) e devolve a duração. Confere tamanho e versão da caixa. */
export function duracaoMvhdNoTrecho(bytes: ArrayBuffer | Uint8Array): number | null {
  try {
    const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes)
    const dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength)
    for (let i = 4; i + 4 <= u8.length; i++) {
      if (u8[i] !== 0x6d || u8[i + 1] !== 0x76 || u8[i + 2] !== 0x68 || u8[i + 3] !== 0x64) continue // 'mvhd'
      const o = i - 4
      const size = dv.getUint32(o)
      const version = u8[o + 8]
      if (version === 0 && size === 108 && o + 28 <= u8.length) {
        const timescale = dv.getUint32(o + 20), duration = dv.getUint32(o + 24)
        const d = timescale > 0 ? duration / timescale : 0
        if (d > 0.1 && d < 3600) return Math.round(d * 1000) / 1000
      } else if (version === 1 && size === 120 && o + 40 <= u8.length) {
        const timescale = dv.getUint32(o + 28), duration = dv.getUint32(o + 32) * 4294967296 + dv.getUint32(o + 36)
        const d = timescale > 0 ? duration / timescale : 0
        if (d > 0.1 && d < 3600) return Math.round(d * 1000) / 1000
      }
    }
    return null
  } catch {
    return null
  }
}

const SONDA_BYTES = 262144
const SONDA_PRAZO_MS = 2500

async function lerTrecho(url: string, range: string, f: typeof fetch): Promise<{ bytes: Uint8Array; total: number | null } | null> {
  const res = await f(url, { headers: { Range: range }, signal: AbortSignal.timeout(SONDA_PRAZO_MS) })
  if (!res || !res.ok || !res.body) return null
  const total = Number(/\/(\d+)\s*$/.exec(res.headers.get('content-range') ?? '')?.[1] ?? NaN)
  // Servidor que ignora o Range (200 com o arquivo inteiro): lê só os primeiros SONDA_BYTES e cancela o resto.
  const reader = res.body.getReader()
  const partes: Uint8Array[] = []
  let lidos = 0
  while (lidos < SONDA_BYTES) {
    const { done, value } = await reader.read()
    if (done || !value) break
    partes.push(value)
    lidos += value.length
  }
  try { await reader.cancel() } catch { /* já terminou */ }
  const bytes = new Uint8Array(Math.min(lidos, SONDA_BYTES))
  let p = 0
  for (const parte of partes) { const n = Math.min(parte.length, bytes.length - p); if (n <= 0) break; bytes.set(parte.subarray(0, n), p); p += n }
  return { bytes, total: Number.isFinite(total) && total > 0 ? total : null }
}

/** Duração real (s) de um MP4 remoto pelo cabeçalho, ou null. Nunca lança. */
export async function sondarDuracaoDoClipe(url: string | null | undefined, f: typeof fetch = fetch): Promise<number | null> {
  try {
    if (typeof url !== 'string' || !/^https:\/\//i.test(url)) return null
    const inicio = await lerTrecho(url, `bytes=0-${SONDA_BYTES - 1}`, f)
    if (!inicio) return null
    const noInicio = duracaoMvhdNoTrecho(inicio.bytes)
    if (noInicio != null) return noInicio
    if (!inicio.total || inicio.total <= SONDA_BYTES) return null
    const fim = await lerTrecho(url, `bytes=${inicio.total - SONDA_BYTES}-${inicio.total - 1}`, f)
    return fim ? duracaoMvhdNoTrecho(fim.bytes) : null
  } catch {
    return null
  }
}

/** Uma sonda por clipe, em paralelo (null onde não há url ou a leitura falhou). */
export async function sondarDuracaoDosClipes(urls: ReadonlyArray<string | null | undefined>, f: typeof fetch = fetch): Promise<Array<number | null>> {
  try {
    return await Promise.all(urls.map((u) => (u ? sondarDuracaoDoClipe(u, f) : Promise.resolve(null))))
  } catch {
    return urls.map(() => null)
  }
}
