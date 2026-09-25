// KINEO-MODERACAO-2026-09-25 — o tipo de um arquivo pelos primeiros bytes (puro, sem import).
// Revisão adversarial de 25/09: o /api/footage confiava no `kind` que o cliente mandava, e kind:'video' numa foto pulava a
// moderação. Assinaturas: JPEG FF D8 FF · PNG 89 50 4E 47 · WebM/Matroska 1A 45 DF A3 · MP4/MOV "ftyp" no byte 4 (marca
// M4A/M4B = áudio) · MP3 "ID3" ou quadro FF Ex · WAV "RIFF....WAVE". Qualquer outra coisa = null (a rota recusa).

export type MediaKind = 'image' | 'video' | 'audio'

export function sniffMediaKind(b: Uint8Array): MediaKind | null {
  if (!b || b.length < 4) return null
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image'
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return 'image'
  if (b[0] === 0x1a && b[1] === 0x45 && b[2] === 0xdf && b[3] === 0xa3) return 'video'
  const ascii = (from: number, to: number) => String.fromCharCode(...Array.from(b.slice(from, to)))
  if (b.length >= 12 && ascii(4, 8) === 'ftyp') return /^M4[AB]/.test(ascii(8, 12)) ? 'audio' : 'video'
  // MOV antigo começa por outro átomo QuickTime em vez de ftyp.
  if (b.length >= 8 && ['moov', 'mdat', 'wide', 'free', 'skip', 'pnot'].includes(ascii(4, 8))) return 'video'
  if (ascii(0, 3) === 'ID3') return 'audio'
  if (b[0] === 0xff && (b[1] & 0xe0) === 0xe0) return 'audio'
  if (b.length >= 12 && ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WAVE') return 'audio'
  return null
}
