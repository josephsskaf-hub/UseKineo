// KINEO-ADS-CENA-95-2110 — three logical shots, real-photo i2v close, intentional voice and category music.
import { ADS_V2_FRAME_RATE } from '../adV2Montage'
import { cenaFinalTextElements } from './montage'
import { cenaVoiceModeOf, type CenaPlan } from './plan'
import { cena95Captions, cena95DefaultWindows, type Cena95Word, type Cena95SpeechWindow } from './captions95'
export interface Cena95SelectedClip {
  url: string; kind: 'hook' | 'use' | 'close'; seconds: number; keepSeconds: number; start: number;
  trimStart?: number; hasSpeech: boolean; photoReference?: string;
}
export interface Cena95NativeAudioClip { url: string; start: number; seconds: number; keepSeconds: number; trimStart?: number; hasSpeech: boolean }
export interface Cena95MontageInput {
  plan: CenaPlan; selectedClips: Cena95SelectedClip[]; nativeAudioClips?: Cena95NativeAudioClip[];
  voiceUrl?: string; voiceSeconds?: number; words?: Cena95Word[]; speechWindows?: Cena95SpeechWindow[]; musicUrl?: string;
}
export const CENA95_MUSIC_DB = -18
export const CENA95_DUCK_DB = -24
const r6 = (n: number): number => Math.round(n * 1e6) / 1e6
const literal95 = (s: string): string => s.replace(/\[/gu, '［').replace(/\]/gu, '］') // KINEO-ADS-CENA-95-PACING-2110
/** Exceptional final labels page at the market font instead of failing after media was generated. */
function pagedFinal95(plan: CenaPlan, words: Cena95Word[]): Record<string, unknown>[] { // KINEO-ADS-CENA-95-PACING-2110
  const rows = [{ text: plan.product, track: 44, y: '62%' }, ...(plan.input.oferta ? [{ text: plan.input.oferta, track: 45, y: '67%' }] : []), { text: plan.script.cta, track: 46, y: '72%' }]
  const font = 63, width = 1080 * .84 - 14, spoken = words.slice(-plan.script.cta.trim().split(/\s+/u).length)
  return rows.flatMap(row => {
    const pages: { text: string; index: number }[][] = []; let line: { text: string; index: number }[] = [], used = 0
    for (const [index, word] of row.text.trim().split(/\s+/u).entries()) {
      let chunk = '', size = 0
      const flush = () => { if (chunk) { line.push({ text: chunk, index }); used += size; chunk = ''; size = 0 } }
      for (const { segment } of new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(literal95(word))) {
        const advance = Array.from(segment.normalize('NFD')).reduce((n, c) => n + (/\p{M}/u.test(c) ? 0 : /[MWmw@%]/u.test(c) ? 1.1 : /[A-Z]/u.test(c) ? 1 : /[a-z]/u.test(c) ? .75 : 1.2), 0) * font
        if (used + size + advance + (line.length && !chunk ? font * .5 : 0) > width) { flush(); if (line.length) pages.push(line); line = []; used = 0 }
        if (!chunk && line.length) used += font * .5
        chunk += segment; size += advance
      }
      flush()
    }
    if (line.length) pages.push(line)
    const edges = [...new Set([13, 15, ...pages.map((_, k) => 13 + 2 * k / pages.length), ...(row.track === 46 ? spoken.flatMap(w => [Math.max(13, Math.min(15, w.start)), Math.max(13, Math.min(15, w.end))]) : [])])].sort((a, b) => a - b)
    return edges.slice(0, -1).map((start, k) => {
      const end = edges[k + 1], mid = (start + end) / 2, active = row.track === 46 ? spoken.findIndex(w => mid >= w.start && mid < w.end) : -1
      const candidates = active < 0 ? [] : pages.filter(p => p.some(t => t.index === active))
      const page = candidates.length ? candidates[Math.min(candidates.length - 1, Math.floor((mid - spoken[active].start) / (spoken[active].end - spoken[active].start) * candidates.length))] : pages[Math.min(pages.length - 1, Math.floor((mid - 13) / 2 * pages.length))]
      return { type: 'text', track: row.track, time: r6(start), duration: r6(end - start), text: page.map(p => p.index === active ? `[color #FFD400]${p.text}[/color]` : p.text).join(' '), x: '50%', y: row.y, x_anchor: '50%', y_anchor: '50%', x_alignment: '50%', y_alignment: '50%', width: '84%', height: 84, text_wrap: false, text_clip: true, clip: true, font_family: 'Inter', font_size: font, font_weight: '800', line_height: '110%', fill_color: '#ffffff', stroke_color: '#000000', stroke_width: 7 }
    })
  })
}
const https = (s: unknown): s is string => typeof s === 'string' && /^https:\/\/\S+$/iu.test(s)
const near = (a: number, b: number): boolean => Math.abs(a - b) < 1e-5
function clipValid(c: Cena95NativeAudioClip): boolean {
  return https(c.url) && Number.isFinite(c.seconds) && Number.isFinite(c.keepSeconds) && Number.isFinite(c.start) && Number.isFinite(c.trimStart ?? 0) && c.start >= 0 && c.keepSeconds > 0 && (c.trimStart ?? 0) >= 0 && c.seconds + 1e-5 >= (c.trimStart ?? 0) + c.keepSeconds && c.start + c.keepSeconds <= 15 + 1e-5 && typeof c.hasSpeech === 'boolean'
}
function continuous(clips: Cena95NativeAudioClip[], end: number): boolean {
  let cursor = 0
  for (const c of clips) { if (!clipValid(c) || !near(c.start, cursor)) return false; cursor += c.keepSeconds }
  return near(cursor, end)
}
const volume = (db: number): string => `${r6(Math.pow(10, db / 20) * 100)}%`

/** Continuous music slices keep source phase; no unsupported sidechain or loop+trim combination. Optional music never blocks a render. */
export function cena95MusicElements(url: string | undefined, speech: Cena95SpeechWindow[]): Record<string, unknown>[] {
  if (!https(url)) return []
  const edges = [...new Set([0, 15, ...speech.flatMap(w => [w.start, w.end])])].sort((a, b) => a - b)
  return edges.slice(0, -1).flatMap((start, k) => {
    const end = edges[k + 1]
    if (end <= start) return []
    const duck = speech.some(w => start < w.end && end > w.start)
    return [{ type: 'audio', track: 60, time: start, duration: r6(end - start), source: url, volume: volume(duck ? CENA95_DUCK_DB : CENA95_MUSIC_DB), trim_start: start, ...(k === 0 ? { audio_fade_in: 0.2 } : {}), ...(k === edges.length - 2 ? { audio_fade_out: 0.35 } : {}) }]
  })
}

/** Highlight the spoken CTA on its own final text track, without a second caption behind the offer/name. */
export function cena95FinalTextElements(plan: CenaPlan, words: Cena95Word[]): Record<string, unknown>[] {
  // KINEO-ADS-CENA-95-PACING-2110 — only new plans escape literal markup and repair exceptional final layout.
  const repaired = Boolean((plan.script as CenaPlan['script'] & { normalization?: unknown }).normalization)
  const display = repaired ? { ...plan, product: literal95(plan.product), input: { ...plan.input, oferta: literal95(plan.input.oferta ?? '') }, script: { ...plan.script, cta: literal95(plan.script.cta) } } : plan
  let base: Record<string, unknown>[]
  try { base = cenaFinalTextElements(display) } catch (error) { if (repaired && error instanceof Error && error.message === 'cena_final_text_does_not_fit') return pagedFinal95(plan, words); throw error }
  const cta = base.find(e => e.track === 46)!
  const count = plan.script.cta.trim().split(/\s+/u).length, spoken = words.slice(-count)
  const edges = [...new Set([13, 15, ...spoken.flatMap(w => [Math.max(13, Math.min(15, w.start)), Math.max(13, Math.min(15, w.end))])])].sort((a, b) => a - b)
  const active = edges.slice(0, -1).flatMap((start, k) => {
    const end = edges[k + 1], mid = (start + end) / 2
    if (end <= start) return []
    const selected = spoken.findIndex(w => mid >= w.start && mid < w.end)
    let index = 0
    const text = String(cta.text).split(/(\s+)/u).map(part => /\S/u.test(part) ? index++ === selected ? `[color #FFD400]${part}[/color]` : part : part).join('')
    return [{ ...cta, time: start, duration: r6(end - start), text, ...(k > 0 ? { enter_transition: undefined } : {}) }]
  })
  return [...base.filter(e => e.track !== 46), ...active]
}

export function buildCena95Montage(s: Cena95MontageInput): Record<string, unknown> {
  const clips = [...s.selectedClips].sort((a, b) => a.start - b.start)
  if (!continuous(clips, 15)) throw new Error('cena95_visual_timeline_invalid')
  if (clips[0]?.kind !== 'hook' || !near(clips[0].start, 0) || !near(clips[0].keepSeconds, 3)) throw new Error('cena95_hook_required')
  const use = clips.filter(c => c.kind === 'use'), close = clips.filter(c => c.kind === 'close')
  if (!use.length || !near(use[0].start, 3) || !near(use.reduce((n, c) => n + c.keepSeconds, 0), 7) || use.some(c => c.start < 3 || c.start + c.keepSeconds > 10 + 1e-5)) throw new Error('cena95_use_required')
  if (close.length !== 1 || !near(close[0].start, 10) || !near(close[0].keepSeconds, 5) || close[0].photoReference !== s.plan.input.foto || close[0].hasSpeech || close[0].url === s.plan.input.foto) throw new Error('cena95_real_photo_i2v_close_required')
  if (clips.some(c => !['hook', 'use', 'close'].includes(c.kind)) || clips.length !== use.length + 2) throw new Error('cena95_unexpected_visual')
  const mode = cenaVoiceModeOf(s.plan)
  if (mode === 'narrated' && (!https(s.voiceUrl) || s.nativeAudioClips?.length)) throw new Error('cena95_narration_required')
  if (mode === 'talking' && s.voiceUrl) throw new Error('cena95_talking_tts_forbidden')
  const native = [...(s.nativeAudioClips ?? [])].sort((a, b) => a.start - b.start)
  if (mode === 'talking' && (!continuous(native, 15) || !native.every(c => c.hasSpeech === true))) throw new Error('cena95_native_audio_required')
  if (s.voiceSeconds !== undefined && !(Number.isFinite(s.voiceSeconds) && s.voiceSeconds > 0 && s.voiceSeconds <= 15)) throw new Error('cena95_voice_duration_invalid')
  const captions = cena95Captions({ text: s.plan.script.narration, language: s.plan.input.language ?? 'en', words: s.words, speechWindows: s.speechWindows ?? cena95DefaultWindows(s.plan.script) })
  const elements: Record<string, unknown>[] = clips.map(c => ({ type: 'video', track: 2, time: c.start, duration: c.keepSeconds, source: c.url, trim_start: c.trimStart ?? 0, loop: false, fit: 'cover', x: '50%', y: '50%', width: '100%', height: '100%', volume: '0%' }))
  // MP4 é vídeo pelo schema oficial. Sua imagem fica sob a cena opaca da trilha2, sem apagar a voz até15s.
  if (mode === 'talking') elements.push(...native.map(c => ({ type: 'video', track: 1, time: c.start, duration: c.keepSeconds, source: c.url, trim_start: c.trimStart ?? 0, volume: c.hasSpeech ? '100%' : '0%', fit: 'cover', x: '50%', y: '50%', width: '100%', height: '100%', loop: false })))
  else elements.push({ type: 'audio', track: 50, time: 0, duration: s.voiceSeconds ?? 15, source: s.voiceUrl!, volume: '100%' })
  // Final overlays take the caption region from 13s. Native/TTS CTA keeps playing, with no duplicate caption behind it.
  elements.push(...captions.elements.flatMap(e => { const start = Number(e.time), end = Math.min(13, start + Number(e.duration)); return end > start ? [{ ...e, duration: r6(end - start) }] : [] }))
  elements.push(...cena95FinalTextElements(s.plan, captions.words), ...cena95MusicElements(s.musicUrl, captions.speechWindows))
  return { output_format: 'mp4', width: 1080, height: 1920, frame_rate: ADS_V2_FRAME_RATE, duration: 15, snapshot_time: 1, elements }
}
