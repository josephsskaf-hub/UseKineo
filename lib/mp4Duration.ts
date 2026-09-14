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
