// KINEO-ADS-CENA-95-2110 — pure karaoke layout; supplied alignment or an explicitly labelled syllable estimate.
export interface Cena95Word { word: string; start: number; end: number }
export interface Cena95SpeechWindow { start: number; end: number; text?: string }
export interface Cena95CaptionInput {
  text: string; language: string; words?: Cena95Word[]; speechWindows?: Cena95SpeechWindow[];
  width?: number; height?: number; track?: number;
}
export interface Cena95CaptionResult {
  elements: Record<string, unknown>[]; words: Cena95Word[];
  timingSource: 'provided_alignment' | 'syllable_estimate'; speechWindows: Cena95SpeechWindow[];
}
const r6 = (n: number): number => Math.round(n * 1e6) / 1e6
const tokens = (s: string): string[] => String(s ?? '').trim().split(/\s+/u).filter(Boolean)
const key = (s: string): string => s.normalize('NFC').toLowerCase().replace(/[^\p{L}\p{N}]/gu, '')
const validWindow = (w: Cena95SpeechWindow): boolean => Number.isFinite(w.start) && Number.isFinite(w.end) && w.start >= 0 && w.end > w.start && w.end <= 15

/** Orthographic timing weight, not a phonetic transcription or forced alignment. PT treats common diphthongs as one nucleus. */
export function cena95Syllables(word: string, language: string): number {
  const raw = word.toLowerCase().normalize('NFC').replace(/[^\p{L}]/gu, '')
  if (!raw) return 1
  if (/^pt(?:-|$)/i.test(language)) {
    const units = raw.replace(/qu(?=[eiéê])/gu, 'q').replace(/gu(?=[eiéê])/gu, 'g')
      .replace(/(?:ãe|ão|õe|ai|au|ei|eu|oi|ou|ui)/gu, 'a')
    return Math.max(1, (units.match(/[aeiouáéíóúâêôãõàü]/gu) ?? []).length)
  }
  if (/^en(?:-|$)/i.test(language)) {
    let units = raw.replace(/(?:[^aeiouy])e$/u, m => m[0])
    if (/[^aeiouy]le$/u.test(raw)) units = raw
    let n = (units.match(/[aeiouy]+/gu) ?? []).length
    if (/[^td]ed$/u.test(raw) && n > 1) n--
    return Math.max(1, n)
  }
  // Other languages retain a deterministic vowel-nucleus estimate; never label this measured alignment.
  return Math.max(1, (raw.normalize('NFD').replace(/\p{M}/gu, '').match(/[aeiouy]+/gu) ?? []).length)
}

/** CTA pause is explicit. A fallback never fabricates sub-second measured precision. */
export function cena95DefaultWindows(script: { hook: string; use: string; benefit: string; cta: string }): Cena95SpeechWindow[] {
  return [{ start: 0, end: 1.5, text: script.hook }, { start: 1.5, end: 10, text: script.use }, { start: 10, end: 13, text: script.benefit }, { start: 13.35, end: 15, text: script.cta }]
}

/** Estimate word windows within measured TTS duration, including the 0.35s silence already inserted by the audio composer.
 * This helper schedules that pause; it cannot prove a pause exists in an audio file. Native speech keeps planned windows.
 * A faster measured voice may finish its CTA before the final overlay starts at13s; timing is never shifted to pretend otherwise. */
export function cena95NarratedWindows(script: { hook: string; use: string; benefit: string; cta: string; narration: string; normalization?: unknown }, language: string, voiceSeconds: number): Cena95SpeechWindow[] {
  const pause = 0.35, parts = [script.hook, script.use, script.benefit, script.cta]
  if (!(Number.isFinite(voiceSeconds) && voiceSeconds > pause && voiceSeconds <= 15) || (script.normalization ? [parts[0], parts[3]] : [parts[0], parts[1], parts[3]]).some(s => !tokens(s).length)) throw new Error('cena95_narrated_duration_invalid') // KINEO-ADS-CENA-95-PACING-2110 — a repaired core may have no optional middle sentence.
  if (tokens(parts.join(' ')).join(' ') !== tokens(script.narration).join(' ')) throw new Error('cena95_narrated_text_mismatch')
  const weights = parts.map(s => tokens(s).reduce((sum, word) => sum + cena95Syllables(word, language), 0)), total = weights.reduce((a, b) => a + b, 0)
  const speechSeconds = voiceSeconds - pause
  let before = 0
  const windows = parts.map((text, k) => {
    const start = r6(speechSeconds * before / total + (k === 3 ? pause : 0))
    before += weights[k]
    return { text, start, end: k === 3 ? voiceSeconds : r6(speechSeconds * before / total) }
  }).filter(w => tokens(w.text).length > 0) // KINEO-ADS-CENA-95-PLAN-FAILED-2110 — retirar apenas a janela sem fala; preservar CTA e pausa.
  if (windows.some(w => !validWindow(w))) throw new Error('cena95_narrated_duration_invalid')
  return windows
}

function alignment(i: Cena95CaptionInput): { words: Cena95Word[]; timingSource: Cena95CaptionResult['timingSource'] } {
  const textWords = tokens(i.text)
  if (!textWords.length) throw new Error('cena95_caption_bad_text') // KINEO-ADS-CENA-95-PACING-2110 — escape brackets in display, preserve the spoken words.
  if (i.words !== undefined) {
    if (!Array.isArray(i.words) || i.words.length !== textWords.length) throw new Error('cena95_caption_alignment_mismatch')
    let previous = 0
    const words = i.words.map((w, k) => {
      if (!w || typeof w.word !== 'string' || key(w.word) !== key(textWords[k]) || !validWindow(w) || w.start < previous - 1e-6) throw new Error('cena95_caption_bad_alignment')
      previous = w.end
      return { word: textWords[k], start: w.start, end: w.end }
    })
    return { words, timingSource: 'provided_alignment' }
  }
  const windows = i.speechWindows
  if (!windows?.length || windows.some((w, k) => !validWindow(w) || k > 0 && w.start < windows[k - 1].end)) throw new Error('cena95_caption_windows_required')
  if (windows.some(w => typeof w.text !== 'string')) throw new Error('cena95_caption_window_text_required')
  if (tokens(windows.map(w => w.text).join(' ')).map(key).join('|') !== textWords.map(key).join('|')) throw new Error('cena95_caption_window_text_mismatch')
  let cursor = 0
  const words = windows.flatMap(w => {
    const parts = tokens(w.text!), weights = parts.map(s => cena95Syllables(s, i.language)), total = weights.reduce((a, b) => a + b, 0)
    let before = 0
    return parts.map((_, k) => {
      const start = r6(w.start + (w.end - w.start) * before / total)
      before += weights[k]
      return { word: textWords[cursor++], start, end: k === parts.length - 1 ? w.end : r6(w.start + (w.end - w.start) * before / total) }
    })
  })
  return { words, timingSource: 'syllable_estimate' }
}

/** Conservative advance allowance, not measured font metrics. Explicit clipping is the renderer's final safety bound. */
function captionLines(words: Cena95Word[], font: number, width: number): Cena95Word[][] | null {
  const lines: Cena95Word[][] = []; let used = 0
  for (const word of words) {
    const advance = Array.from(word.word.normalize('NFD')).reduce((sum, c) => sum + (/\p{M}/u.test(c) ? 0 : /[MWmw@%]/u.test(c) ? 1.1 : /[A-Z]/u.test(c) ? 1 : /[a-z]/u.test(c) ? 0.75 : 1.2), 0) * font
    if (advance > width) return null
    if (!lines.length || used + font * 0.5 + advance > width) { lines.push([word]); used = advance }
    else { lines[lines.length - 1].push(word); used += font * 0.5 + advance }
  }
  return lines
}
// KINEO-ADS-CENA-95-PACING-2110 — page an unbreakable label at grapheme boundaries instead of failing or shrinking the market font.
const displayWord = (s: string): string => s.replace(/\[/gu, '［').replace(/\]/gu, '］')
function longWordPages(word: string, font: number, width: number, maxLines: number): string[] {
  const lines: string[] = []; let line = '', advance = 0
  const glyphs = Array.from(new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(displayWord(word)), x => x.segment)
  for (const glyph of glyphs) {
    const size = Array.from(glyph.normalize('NFD')).reduce((n, c) => n + (/\p{M}/u.test(c) ? 0 : /[MWmw@%]/u.test(c) ? 1.1 : /[A-Z]/u.test(c) ? 1 : /[a-z]/u.test(c) ? .75 : 1.2), 0) * font
    if (line && advance + size > width) { lines.push(line); line = ''; advance = 0 }
    line += glyph; advance += size
  }
  if (line) lines.push(line)
  const pages: string[] = []
  for (let k = 0; k < lines.length; k += maxLines) pages.push(lines.slice(k, k + maxLines).join('\n'))
  return pages
}
function balancedBlocks(words: Cena95Word[], font: number, width: number, height: number, stroke: number): Cena95Word[][][] {
  const minimum = Math.max(1, Math.ceil(words.length / 6)), maximum = Math.max(minimum, Math.floor(words.length / 3))
  for (let n = minimum; n <= maximum; n++) {
    const size = Math.floor(words.length / n), extra = words.length % n; let cursor = 0
    const blocks = Array.from({ length: n }, (_, k) => { const count = size + (k < extra ? 1 : 0); const block = words.slice(cursor, cursor + count); cursor += count; return captionLines(block, font, width) })
    if (blocks.every((lines): lines is Cena95Word[][] => lines !== null && lines.length * font * 1.1 + stroke * 2 <= height)) return blocks
  }
  throw new Error('cena95_caption_text_does_not_fit')
}

/** Same full block on one track for each active-word interval. Creatomate inline [color] is already used by lib/compose.ts. */
export function cena95Captions(i: Cena95CaptionInput): Cena95CaptionResult {
  const width = i.width ?? 1080, height = i.height ?? 1920
  if (!(Number.isFinite(width) && width > 0 && Number.isFinite(height) && height > 0)) throw new Error('cena95_caption_bad_frame')
  const { words, timingSource } = alignment(i)
  const font = Math.round(height * 0.033), stroke = 7 * height / 1920
  const captionHeight = Math.floor(2 * (height * 1480 / 1920 - height * 0.67 - stroke))
  if (captionHeight <= 0) throw new Error('cena95_caption_bad_frame')
  // Fixed dimensions and documented element clipping enforce the lower bound even on unexpected font metrics.
  const base = { type: 'text', track: i.track ?? 40, x: '50%', y: '67%', x_anchor: '50%', y_anchor: '50%', x_alignment: '50%', y_alignment: '50%', width: '84%', height: captionHeight, text_wrap: false, text_clip: true, clip: true, font_family: 'Inter', font_size: font, font_weight: '800', line_height: '110%', fill_color: '#ffffff', stroke_color: '#000000', stroke_width: stroke }
  const elements: Record<string, unknown>[] = []
  // Keep blocks inside speech windows, including the explicit pre-CTA pause. Very short beats may have <3 words truthfully.
  const runs: Cena95Word[][] = []
  for (const [index, word] of words.entries()) {
    const last = runs[runs.length - 1]
    const long = captionLines([word], font, width * .84 - stroke * 2) === null
    const lastLong = last?.length === 1 && captionLines(last, font, width * .84 - stroke * 2) === null
    if (!last || long || lastLong || word.start - last[last.length - 1].end >= 0.15 && last.length >= 3 && words.length - index >= 3) runs.push([word]); else last.push(word)
  }
  for (const run of runs) {
    if (run.length === 1 && captionLines(run, font, width * .84 - stroke * 2) === null) {
      const w = run[0], maxLines = Math.max(1, Math.floor((captionHeight - stroke * 2) / (font * 1.1)))
      const pages = longWordPages(w.word, font, width * .84 - stroke * 2, maxLines)
      for (const [k, text] of pages.entries()) elements.push({ ...base, time: r6(w.start + (w.end - w.start) * k / pages.length), duration: r6((w.end - w.start) / pages.length), text: `[color #FFD400]${text}[/color]` })
      continue
    }
    for (const lines of balancedBlocks(run, font, width * 0.84 - stroke * 2, captionHeight, stroke)) {
    const block = lines.flat()
    const text = (active?: Cena95Word): string => lines.map(line => line.map(x => x === active ? `[color #FFD400]${displayWord(x.word)}[/color]` : displayWord(x.word)).join(' ')).join('\n')
    for (let k = 0; k < block.length; k++) {
      const w = block[k]
      elements.push({ ...base, time: w.start, duration: r6(w.end - w.start), text: text(w) })
      const next = block[k + 1]
      if (next && next.start > w.end + 1e-6) elements.push({ ...base, time: w.end, duration: r6(next.start - w.end), text: text() })
    }
  }
  }
  // Audio ducking uses actual word extents, never a full 15s guess. Short gaps are merged; CTA silence remains.
  const speechWindows: Cena95SpeechWindow[] = []
  for (const w of words) {
    const last = speechWindows[speechWindows.length - 1]
    if (last && w.start - last.end < 0.15) last.end = w.end
    else speechWindows.push({ start: w.start, end: w.end })
  }
  return { elements, words, timingSource, speechWindows }
}
