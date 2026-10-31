// KINEO-FILME15-PERFEITO-2610 — canonical text repair for the Seedance 15 s gate.
// Timing is APPROXIMATE, derived proportionally from the canonical script and the
// measured audio duration. These internal positions are NEVER ASR/audio evidence.
import { buildCaptionElements } from '@/lib/compose'
import { agruparLegendaFaceless15 } from '@/lib/filmes/faceless15'
import { narrationTokens } from '@/lib/textLanguage'

export const FREE15_CANONICAL_CAPTION_TIMING = 'approximate' as const
type Element = Record<string, unknown>
const caption = (e: unknown): e is Element => !!e && typeof e === 'object' &&
  (e as Element).type === 'text' && [5, 7].includes(Number((e as Element).track))
const r3 = (value: number): number => Math.round(value * 1000) / 1000
const STYLE_KEYS = ['x', 'y', 'x_anchor', 'y_anchor', 'width', 'height', 'x_alignment', 'y_alignment',
  'font_family', 'font_size', 'font_weight', 'font_style', 'line_height', 'fill_color', 'stroke_color',
  'stroke_width', 'background_color', 'background_x_padding', 'background_y_padding', 'border_radius'] as const

/** Only caption elements are returned; source/cuts/audio are never mutated.
 * The caller must limit this helper to the Seedance 1.5 15 s gate and retain
 * FREE15_CANONICAL_CAPTION_TIMING in its own quality metadata. Compact writing
 * systems keep the existing builder path: Latin grouping rules are uncalibrated.
 */
export function buildFree15CanonicalCaptions(input: { script: string; audioSeconds: number; source: Record<string, unknown> }): unknown[] {
  const existing = Array.isArray(input.source.elements) ? input.source.elements.filter(caption) : []
  const seconds = input.audioSeconds
  if (!Number.isFinite(seconds) || seconds <= 0 || seconds > 90 || !input.script.trim()) return []
  if (/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Thai}]/u.test(input.script)) return existing.map(e => ({ ...e }))
  const tokens = narrationTokens(input.script)
  if (!tokens.length || tokens.length > 250) return []
  const proportional = tokens.map((word, i) => ({
    word, start: r3(seconds * i / tokens.length), end: r3(seconds * (i + 1) / tokens.length),
    sentenceEnd: /[.!?…؟۔।。！？]["'”’»)\]」』]*$/.test(word), // KINEO-LEGENDA-PONTO-ALFABETOS
  }))
  const blocks = agruparLegendaFaceless15(proportional, seconds)
  const styles = existing.filter(e => Number(e.track) === 5 && typeof e.time === 'number' && Number.isFinite(e.time))
    .slice().sort((a, b) => Number(a.time) - Number(b.time))
  return blocks.flatMap((block, i) => {
    const time = i === 0 ? 0 : block.words[0].start
    const end = i + 1 < blocks.length ? blocks[i + 1].words[0].start : r3(seconds)
    if (end <= time) return []
    const sample = styles.filter(e => Number(e.time) <= time).slice(-1)[0] ?? styles[0]
    const style = Object.fromEntries(STYLE_KEYS.filter(key => sample && sample[key] !== undefined).map(key => [key, sample![key]]))
    // No invented word-level karaoke: a proportional block is one visible line.
    return buildCaptionElements({ text: block.text, time, duration: r3(end - time), highlight: block.highlight })
      .map(element => ({ ...element, ...style }))
  })
}
