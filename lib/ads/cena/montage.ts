// KINEO-ADS-CENA-AJUSTE-2110 — continuous scene, text-only close and one intentional voice path.
import { ADS_V2_FRAME_RATE } from '../adV2Montage' // KINEO-ADS-CENA-AJUSTE-2110
import { cenaCaptionElements, CENA_CAPTION_HEIGHT_RATIO, CENA_CAPTION_STROKE_AT_1920 } from '../v2CenaQuality' // KINEO-ADS-CENA-AJUSTE-2110
import { cenaVoiceModeOf } from './plan' // KINEO-ADS-CENA-AJUSTE-2110
import type { CenaState } from './pipeline' // KINEO-ADS-CENA-AJUSTE-2110
const r3 = (n: number): number => Math.round(n * 1000) / 1000 // KINEO-ADS-CENA-AJUSTE-2110
const clean = (v: unknown): string => typeof v === 'string' ? v.replace(/\s+/gu, ' ').trim() : '' // KINEO-ADS-CENA-AJUSTE-2110
const https = (v: unknown): v is string => typeof v === 'string' && /^https:\/\/\S+$/i.test(v) // KINEO-ADS-CENA-AJUSTE-2110
interface FinalText { text: string; track: number; font: number; lines: string[]; height: number } // KINEO-ADS-CENA-AJUSTE-2110
/** Conservative Inter bold width for wrapping offline; preserve all words and never truncate typed offer/CTA. */ // KINEO-ADS-CENA-AJUSTE-2110
function lineWidth(text: string, px: number): number { // KINEO-ADS-CENA-AJUSTE-2110
  return Array.from(text).reduce((sum, c) => sum + (/\s/u.test(c) ? 0.34 : /[MW@%]/u.test(c) ? 0.94 : /[ilI.,:!|'’]/u.test(c) ? 0.36 : /[\u2E80-\uFFFF]/u.test(c) ? 1 : 0.65), 0) * px // KINEO-ADS-CENA-AJUSTE-2110
} // KINEO-ADS-CENA-AJUSTE-2110
function fitLines(text: string, px: number, width: number): string[] { // KINEO-ADS-CENA-AJUSTE-2110
  const lines: string[] = [] // KINEO-ADS-CENA-AJUSTE-2110
  for (const word of text.split(' ')) { // KINEO-ADS-CENA-AJUSTE-2110
    const last = lines[lines.length - 1] // KINEO-ADS-CENA-AJUSTE-2110
    if (last && lineWidth(last + ' ' + word, px) <= width) lines[lines.length - 1] = last + ' ' + word // KINEO-ADS-CENA-AJUSTE-2110
    else lines.push(word) // KINEO-ADS-CENA-AJUSTE-2110
  } // KINEO-ADS-CENA-AJUSTE-2110
  return lines // KINEO-ADS-CENA-AJUSTE-2110
} // KINEO-ADS-CENA-AJUSTE-2110
/** Last two seconds: separate text tracks above the moving scene, never an image, panel, pill or opaque shape. */ // KINEO-ADS-CENA-AJUSTE-2110
export function cenaFinalTextElements(plan: CenaState['plan'], width = 1080, height = 1920): Record<string, unknown>[] { // KINEO-ADS-CENA-AJUSTE-2110
  const title = clean(plan.product), offer = clean(plan.input.oferta), cta = clean(plan.script.cta) // KINEO-ADS-CENA-AJUSTE-2110
  if (!title || !cta) throw new Error('cena_final_text_required') // KINEO-ADS-CENA-AJUSTE-2110
  const boxWidth = width * 0.84, firstCenter = height * 0.62, lastCenter = height * 0.72, lower = height * 1480 / 1920, gap = height * 0.00625 // KINEO-ADS-CENA-AJUSTE-2110
  const items: FinalText[] = [{ text: title, track: 44 }, ...(offer ? [{ text: offer, track: 45 }] : []), { text: cta, track: 46 }].map(x => ({ ...x, font: Math.round(height * CENA_CAPTION_HEIGHT_RATIO), lines: [], height: 0 })) // KINEO-ADS-CENA-AJUSTE-2110
  const measure = () => { for (const x of items) { x.lines = fitLines(x.text, x.font, boxWidth); x.height = x.lines.length * x.font * 1.1 } } // KINEO-ADS-CENA-AJUSTE-2110
  const span = () => items.slice(1).reduce((sum, x, k) => sum + items[k].height / 2 + x.height / 2 + gap, 0) // KINEO-ADS-CENA-AJUSTE-2110
  const fits = () => span() <= lastCenter - firstCenter && firstCenter - items[0].height / 2 >= height * 0.56 && lastCenter + items[items.length - 1].height / 2 <= lower && items.every(x => x.lines.every(l => lineWidth(l, x.font) <= boxWidth)) // KINEO-ADS-CENA-AJUSTE-2110
  measure() // KINEO-ADS-CENA-AJUSTE-2110
  while (!fits()) { // KINEO-ADS-CENA-AJUSTE-2110
    const next = [...items].filter(x => x.font > 12).sort((a, b) => b.height - a.height || b.text.length - a.text.length)[0] // KINEO-ADS-CENA-AJUSTE-2110
    if (!next) throw new Error('cena_final_text_does_not_fit') // KINEO-ADS-CENA-AJUSTE-2110
    next.font--; measure() // KINEO-ADS-CENA-AJUSTE-2110
  } // KINEO-ADS-CENA-AJUSTE-2110
  const extraGap = (lastCenter - firstCenter - span()) / (items.length - 1) // KINEO-ADS-CENA-AJUSTE-2110
  let center = firstCenter // KINEO-ADS-CENA-AJUSTE-2110
  return items.map((x, k) => { // KINEO-ADS-CENA-AJUSTE-2110
    if (k) center += items[k - 1].height / 2 + x.height / 2 + gap + extraGap // KINEO-ADS-CENA-AJUSTE-2110
    return { type: 'text', track: x.track, time: 13, duration: 2, text: x.lines.join('\n'), x: '50%', y: `${r3(center / height * 100)}%`, x_anchor: '50%', y_anchor: '50%', x_alignment: '50%', width: '84%', font_family: 'Inter', font_size: x.font, font_weight: '800', line_height: '110%', fill_color: '#ffffff', stroke_color: '#000000', stroke_width: r3(CENA_CAPTION_STROKE_AT_1920 * height / 1920), enter_transition: { type: 'fade', duration: 0.15 } } // KINEO-ADS-CENA-AJUSTE-2110
  }) // KINEO-ADS-CENA-AJUSTE-2110
} // KINEO-ADS-CENA-AJUSTE-2110
export function buildCenaMontage(s: CenaState): Record<string, unknown> { // KINEO-ADS-CENA-AJUSTE-2110
  const clips = s.jobs.filter(j => j.kind === 'video' && j.status === 'done').sort((a, b) => a.index - b.index) // KINEO-ADS-CENA-AJUSTE-2110
  if (s.phase !== 'ready' || clips.length !== (s.route === 'veo31' ? 2 : 1) || clips.some(j => !https(j.url))) throw new Error('cena_video_not_ready') // KINEO-ADS-CENA-AJUSTE-2110
  const width = 1080, height = 1920, mode = cenaVoiceModeOf(s.plan) // KINEO-ADS-CENA-AJUSTE-2110
  if (mode === 'talking' && s.voiceUrl) throw new Error('cena_talking_voiceover_forbidden') // KINEO-ADS-CENA-AJUSTE-2110
  if (mode === 'narrated' && !https(s.voiceUrl)) throw new Error('cena_voiceover_required') // KINEO-ADS-CENA-AJUSTE-2110
  const elements: Record<string, unknown>[] = clips.map((j, k) => { // KINEO-ADS-CENA-AJUSTE-2110
    const time = k === 0 ? 0 : 8, duration = clips.length === 1 ? 15 : k === 0 ? 8 : 7 // KINEO-ADS-CENA-AJUSTE-2110
    if (!(Number.isFinite(j.seconds) && j.seconds >= duration)) throw new Error('cena_video_too_short') // KINEO-ADS-CENA-AJUSTE-2110
    return { type: 'video', track: 2, time, duration, source: j.url!, fit: 'cover', loop: false, trim_start: 0, x: '50%', y: '50%', width: '100%', height: '100%', volume: mode === 'narrated' ? '0%' : '100%' } // KINEO-ADS-CENA-AJUSTE-2110
  }) // KINEO-ADS-CENA-AJUSTE-2110
  const beats = [{ text: s.plan.script.hook, start: 0, seconds: 3 }, { text: s.plan.script.use, start: 3, seconds: 7 }, { text: s.plan.script.benefit, start: 10, seconds: 3 }] // KINEO-ADS-CENA-AJUSTE-2110
  for (const b of beats) elements.push(...cenaCaptionElements({ ...b, width, height, track: 40 })) // KINEO-ADS-CENA-AJUSTE-2110
  elements.push(...cenaFinalTextElements(s.plan, width, height)) // KINEO-ADS-CENA-AJUSTE-2110
  if (mode === 'narrated') elements.push({ type: 'audio', track: 50, time: 0, duration: 15, source: s.voiceUrl!, volume: '100%' }) // KINEO-ADS-CENA-AJUSTE-2110
  return { output_format: 'mp4', width, height, frame_rate: ADS_V2_FRAME_RATE, duration: 15, snapshot_time: 1, elements } // KINEO-ADS-CENA-AJUSTE-2110
} // KINEO-ADS-CENA-AJUSTE-2110
