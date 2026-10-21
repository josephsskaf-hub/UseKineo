// KINEO-ADS-CENA-2110 — shared, offline caption and paid-UGC failure policy. No SDK, environment or storage.
export const CENA_CAPTION_HEIGHT_RATIO = 0.033
export const CENA_CAPTION_CENTER = 0.67
export const CENA_CAPTION_STROKE_AT_1920 = 7
export const CENA_UGC_FIRST_DEADLINE_MS = 10 * 60 * 1000
export const CENA_UGC_RETRY_DEADLINE_MS = 20 * 60 * 1000
const r3 = (n: number): number => Math.round(n * 1000) / 1000

/** Preserve every word. Balance 3–6 words per block; a whole input shorter than 3 stays truthful. */
export function cenaCaptionBlocks(text: string): string[] {
  const words = String(text ?? '').replace(/\s+/gu, ' ').trim().split(' ').filter(Boolean)
  if (!words.length) return []
  const count = Math.max(1, Math.ceil(words.length / 6))
  const size = Math.floor(words.length / count), extra = words.length % count
  let cursor = 0
  return Array.from({ length: count }, (_, k) => {
    const n = size + (k < extra ? 1 : 0)
    const block = words.slice(cursor, cursor + n).join(' ')
    cursor += n
    return block
  })
}

/** Estimated block timing from measured speech duration, not forced word alignment. */
export function cenaCaptionElements(i: { text: string; width: number; height: number; seconds: number; start?: number; track?: number; fontFamily?: string }): Record<string, unknown>[] {
  if (!(Number.isFinite(i.width) && i.width > 0 && Number.isFinite(i.height) && i.height > 0 && Number.isFinite(i.seconds) && i.seconds > 0)) throw new Error('cena_caption_bad_timeline')
  const start = i.start ?? 0
  if (!Number.isFinite(start) || start < 0) throw new Error('cena_caption_bad_start')
  const blocks = cenaCaptionBlocks(i.text)
  const weights = blocks.map((s) => s.split(' ').length)
  const total = weights.reduce((a, b) => a + b, 0)
  let wordsBefore = 0
  return blocks.map((text, k) => {
    const time = r3(start + i.seconds * wordsBefore / total)
    wordsBefore += weights[k]
    const end = r3(start + i.seconds * wordsBefore / total)
    return { type: 'text', track: i.track ?? 40, time, duration: r3(end - time), text, x: '50%', y: `${r3(Math.min(CENA_CAPTION_CENTER, 1480 / 1920) * 100)}%`, x_anchor: '50%', y_anchor: '50%', x_alignment: '50%', width: '84%', font_family: i.fontFamily ?? 'Inter', font_size: Math.round(i.height * CENA_CAPTION_HEIGHT_RATIO), font_weight: '800', line_height: '110%', fill_color: '#ffffff', stroke_color: '#000000', stroke_width: r3(CENA_CAPTION_STROKE_AT_1920 * i.height / 1920) }
  })
}

/** Replace only legacy captions. End card, product, sound, watermark and source metadata survive. */
export function cenaApplyCaptions(i: { source: Record<string, unknown>; text: string | null; seconds: number | null; start?: number; legacyTextTrack: number; fontFamily: string }): Record<string, unknown> {
  const elements = Array.isArray(i.source.elements) ? i.source.elements as Record<string, unknown>[] : []
  const old = elements.filter((e) => e.type === 'text' && e.track === i.legacyTextTrack)
  const frame = { width: Number(i.source.width), height: Number(i.source.height), fontFamily: i.fontFamily }
  const captions = i.text && i.seconds ? cenaCaptionElements({ ...frame, text: i.text, seconds: i.seconds, start: i.start, track: 40 }) : old.flatMap((e) => cenaCaptionElements({ ...frame, text: String(e.text ?? ''), seconds: Number(e.duration), start: Number(e.time), track: 40 }))
  return { ...i.source, elements: [...elements.filter((e) => !(e.type === 'text' && e.track === i.legacyTextTrack)), ...captions] }
}

export interface CenaUgcAttempt { attempt: number; status: string; reason?: string | null; reason_class?: string | null; created_at?: string | null }
/** One new attempt, including the old deadline classified local_policy_gate. Unretryable policy/account errors refund. */
export function cenaUgcFailureAction(row: CenaUgcAttempt): 'wait' | 'retry' | 'refund' {
  if (row.status !== 'failed' && row.status !== 'stuck') return 'wait'
  if (row.attempt >= 2) return 'refund'
  if (row.reason === 'presenter_deadline') return 'retry'
  return ['balance_quota', 'auth_model_access', 'local_policy_gate'].includes(row.reason_class ?? '') ? 'refund' : 'retry'
}
/** Second attempt owns its clock; it cannot inherit an already-expired order deadline. */
export function cenaUgcAttemptDeadline(row: CenaUgcAttempt): number {
  return row.attempt >= 2 ? CENA_UGC_RETRY_DEADLINE_MS : CENA_UGC_FIRST_DEADLINE_MS
}
export function cenaUgcAttemptExpired(row: CenaUgcAttempt, orderStartedAt: string | null, now: number): boolean {
  const origin = row.attempt >= 2 ? row.created_at : orderStartedAt
  const at = origin ? Date.parse(origin) : NaN
  return Number.isFinite(at) && now - at > cenaUgcAttemptDeadline(row)
}
