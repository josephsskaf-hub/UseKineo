import { narrationTokens, joinNarrationTokens, captionFontFor, DEFAULT_CAPTION_FONT } from '@/lib/textLanguage' // KINEO-IDIOMAS-FORMATOS-2410
// KINEO-ADS-ESCOLHA-2310 — chosen live scene for all15s; no original-photo close, card, opaque box or duration extension.
// KINEO-ADS-ESCOLHA-PUBLICO-2410 — relocate captions around the human-selected preview's observed product/face boxes.
import { ADS_V2_FRAME_RATE } from '../adV2Montage'
import { cenaCaptionElements } from '../v2CenaQuality'
import { ajusteFinalTextElements } from './ajusteMontage'
import { cenaHttps, cenaVoiceModeOf, type CenaPlan } from './plan'
import { escolhaOf, escolhaHasOffer } from './escolhaPlan'
import type { CenaEscolhaState } from './escolhaMedia'
import { escolhaCaptionLayout } from './escolhaCaptionLayout'
import { addAjusteQuality } from './ajusteQuality'
import { isEscolhaSamplePlan, escolhaSeconds } from './escolhaSamplePolicy' // KINEO-AMOSTRA-ANUNCIO-2410
import { adsV2MusicTrimStart } from '../v2Music' // KINEO-AMOSTRA-ANUNCIO-2410
const r6 = (n: number): number => Math.round(n * 1e6) / 1e6
const literal = (s: string): string => s.replace(/\[/gu, '［').replace(/\]/gu, '］')
const norm = (s: string): string => s.replace(/\s+/gu, ' ').trim().toLowerCase()
/** A literal offer occurs in exactly one visual field, even when included in a literal typed CTA. */
export function escolhaFinalTextElements(plan: CenaPlan, expectedImageUrl?: string): Record<string, unknown>[] {
  const cta = plan.input.cta || plan.script.cta, offer = plan.input.oferta ?? ''
  const titleHas = escolhaHasOffer(plan.product, offer), ctaHas = escolhaHasOffer(cta, offer)
  const elements: Record<string, unknown>[] = ajusteFinalTextElements({ ...plan, input: { ...plan.input, oferta: titleHas || ctaHas ? '' : offer }, script: { ...plan.script, cta } }).map(e => ({ ...e, ...(captionFontFor(plan.input.language) !== DEFAULT_CAPTION_FONT ? { font_family: captionFontFor(plan.input.language) } : {}), shadow_color: 'rgba(0,0,0,0.65)', shadow_blur: '4px', shadow_y: '3px' }))
  if (isEscolhaSamplePlan(plan)) for (const e of elements) e.time = r6(Number(e.time) - 7) // KINEO-AMOSTRA-ANUNCIO-2410 — every final field stays within the live scene at6–8s, including paginated copy.
  const choice = escolhaOf(plan)
  if (!choice) return elements
  const ranges = elements.map(e => {
    const center = parseFloat(String(e.y)) * 1920 / 100
    const height = typeof e.height === 'number' ? e.height : String(e.text).split('\n').length * Number(e.font_size) * 1.1
    return { top: center - height / 2, bottom: center + height / 2 }
  })
  const top = Math.min(...ranges.map(r => r.top)), bottom = Math.max(...ranges.map(r => r.bottom)), center = (top + bottom) / 2 / 1920 * 100
  const grounding = expectedImageUrl === undefined || choice.captionGrounding?.imageUrl === expectedImageUrl ? choice.captionGrounding : undefined
  const layout = escolhaCaptionLayout(choice.captionLane, grounding, bottom - top, center)
  if (!layout) {
    addAjusteQuality(plan, { stage: 'montage', code: 'final_text_grounding_unavailable', message: 'The complete customer name, offer and CTA retain their readable layout because no observed empty band can fit the whole group. Product avoidance for this final copy has not been verified; no customer text was removed.' })
    return elements
  }
  addAjusteQuality(plan, { stage: 'montage', code: 'final_text_preview_grounded', message: 'The final name, offer and CTA move together around the product and face observed in the chosen preview. Later moving close-up frames have not been measured.' })
  const shift = layout.center - center
  return elements.map(e => ({ ...e, y: `${parseFloat(String(e.y)) + shift}%` }))
}
function wrap(text: string, font: number): string {
  const compact = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Thai}]/u.test(text), columns = Math.max(1, Math.floor(890 / (font * (compact ? 1.2 : .75)))), lines: string[] = [] // KINEO-IDIOMAS-FORMATOS-2410
  for (const word of narrationTokens(text)) {
    const glyphs = Array.from(new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(word), x => x.segment) // KINEO-IDIOMAS-FORMATOS-2410 — never split Thai combining marks.
    const chunks = glyphs.reduce<string[]>((out, c) => { if (!out.length || Array.from(new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(out[out.length - 1])).length >= columns) out.push(c); else out[out.length - 1] += c; return out }, [])
    for (const chunk of chunks) { const last = lines[lines.length - 1]; if (last && Array.from(joinNarrationTokens([last, chunk])).length <= columns) lines[lines.length - 1] = joinNarrationTokens([last, chunk]); else lines.push(chunk) }
  }
  return lines.join('\n')
}
function captions(s: CenaEscolhaState): Record<string, unknown>[] {
  const choice = escolhaOf(s.plan)!, grounding = choice.captionGrounding?.imageUrl === s.keyframe ? choice.captionGrounding : undefined
  const layout = escolhaCaptionLayout(choice.captionLane, grounding)
  if (!layout) {
    addAjusteQuality(s, { stage: 'montage', code: 'caption_grounding_unavailable', message: 'Narration captions were omitted because the selected preview has no reliable product geometry or no empty caption band. The complete narration and final customer copy remain; no guessed band covers the product.' })
    return []
  }
  const { center, height } = layout
  addAjusteQuality(s, { stage: 'montage', code: 'caption_preview_grounded', message: `Caption band at ${center}% avoids the product and face observed in the chosen preview. This is opening-image grounding; later moving video frames have not been measured.` })
  const duration = cenaVoiceModeOf(s.plan) === 'narrated' ? s.escolhaMedia!.voice.seconds! : escolhaSeconds(s.plan) // KINEO-AMOSTRA-ANUNCIO-2410
  // Timing is a proportional word estimate from measured audio length, never claimed forced alignment.
  return cenaCaptionElements({ text: literal(s.plan.script.narration), seconds: duration, width: 1080, height: 1920, track: 40, fontFamily: captionFontFor(s.plan.input.language) === DEFAULT_CAPTION_FONT ? 'Inter' : captionFontFor(s.plan.input.language) }).flatMap(e => {
    const time = Number(e.time), end = Math.min(escolhaSeconds(s.plan) - 2, time + Number(e.duration)) // KINEO-AMOSTRA-ANUNCIO-2410
    if (time >= end) return []
    let font = 63, text = wrap(String(e.text), font)
    while (text.split('\n').length * font * 1.1 + 14 > height && font > 6) { font--; text = wrap(String(e.text), font) }
    return [{ ...e, duration: r6(end - time), text, y: `${center}%`, height, y_alignment: '50%', text_wrap: false, clip: true, font_size: font, stroke_width: 7, shadow_color: 'rgba(0,0,0,0.65)', shadow_blur: '4px', shadow_y: '3px' }]
  })
}
/** Music remains below speech; a native take keeps its original audio once, without a second narration. */
/** KINEO-ADS-RENDER-FIX-2310 — fundador 24/10: "faltou o som" / ASMR das unhas no pote: no modo narrado o Kling gera só som ambiente (sem fala) e ele entra baixo sob a narração. */
export const ESCOLHA_AMBIENT_VOLUME = '35%'
export function escolhaMusicElements(url: string | undefined, speechSeconds: number, seconds = 15, trimStart = 0): Record<string, unknown>[] { // KINEO-AMOSTRA-ANUNCIO-2410
  if (!cenaHttps(url)) return []
  const stop = Math.min(seconds, Math.max(0, speechSeconds)), edges = [...new Set([0, stop, seconds])].sort((a, b) => a - b) // KINEO-AMOSTRA-ANUNCIO-2410
  return edges.slice(0, -1).map((start, k) => ({ type: 'audio', track: 60, time: start, duration: r6(edges[k + 1] - start), trim_start: trimStart + start, source: url, volume: `${r6(100 * Math.pow(10, (start < stop ? -18 : -15) / 20))}%`, ...(start === 0 ? { audio_fade_in: .2 } : {}), ...(edges[k + 1] === seconds ? { audio_fade_out: .35 } : {}) })) // KINEO-AMOSTRA-ANUNCIO-2410
}
export function buildCenaEscolhaMontage(s: CenaEscolhaState): Record<string, unknown> {
  const clips = s.jobs.filter(j => j.kind === 'video' && j.status === 'done').sort((a, b) => a.index - b.index), mode = cenaVoiceModeOf(s.plan)
  const sample = isEscolhaSamplePlan(s.plan), seconds = escolhaSeconds(s.plan) // KINEO-AMOSTRA-ANUNCIO-2410
  if (sample && (s.route !== 'kling3' || mode !== 'narrated')) throw new Error('escolha_sample_requires_silent_kling3') // KINEO-AMOSTRA-ANUNCIO-2410
  if (!escolhaOf(s.plan) || s.phase !== 'ready' || clips.length !== (s.route === 'veo31' ? 2 : 1) || clips.some(j => !cenaHttps(j.url))) throw new Error('escolha_video_not_ready')
  if (mode === 'narrated' && (!cenaHttps(s.voiceUrl) || s.escolhaMedia?.voice.status !== 'done' || !(s.escolhaMedia.voice.seconds! > 0 && s.escolhaMedia.voice.seconds! <= seconds))) throw new Error('escolha_voice_unusable') // KINEO-AMOSTRA-ANUNCIO-2410
  if (mode === 'talking' && s.voiceUrl) throw new Error('cena_talking_voiceover_forbidden')
  const elements: Record<string, unknown>[] = []
  clips.forEach((j, k) => {
    const time = k === 0 ? 0 : 8, duration = clips.length === 1 ? seconds : k === 0 ? 8 : 7, available = j.measuredSeconds ?? j.seconds // KINEO-AMOSTRA-ANUNCIO-2410
    if (!(Number.isFinite(available) && available > 0)) throw new Error('escolha_video_unusable')
    const base = { type: 'video', time, source: j.url!, fit: 'cover', x: '50%', y: '50%', width: '100%', height: '100%', color_filter: 'contrast', color_filter_value: 5 }
    elements.push({ ...base, track: 2, duration, volume: mode === 'narrated' && !sample ? ESCOLHA_AMBIENT_VOLUME : '0%', ...(available < duration ? { loop: true } : { loop: false, trim_start: 0 }) }) // KINEO-AMOSTRA-ANUNCIO-2410 — sample video has no native audio; paid ambient volume is preserved.
    if (mode === 'talking') elements.push({ ...base, track: 1, duration: Math.min(duration, available), volume: '100%', loop: false, trim_start: 0 })
  })
  elements.push(...captions(s), ...escolhaFinalTextElements(s.plan, s.keyframe))
  if (mode === 'narrated') elements.push({ type: 'audio', track: 50, time: 0, duration: s.escolhaMedia!.voice.seconds, source: s.voiceUrl!, volume: '100%' })
  elements.push(...escolhaMusicElements(s.escolhaMedia?.music.url, mode === 'narrated' ? s.escolhaMedia!.voice.seconds! : seconds, seconds, sample ? adsV2MusicTrimStart(s.escolhaMedia?.music.url) : 0)) // KINEO-AMOSTRA-ANUNCIO-2410
  if (sample) elements.push({ type: 'text', track: 90, time: 0, duration: seconds, text: 'usekineo.com', x: '77%', y: '7%', width: '42%', height: 72, x_anchor: '50%', y_anchor: '50%', x_alignment: '50%', y_alignment: '50%', font_family: 'Inter', font_size: 42, font_weight: '800', fill_color: '#ffffff', stroke_color: '#000000', stroke_width: 5, shadow_color: 'rgba(0,0,0,0.8)', shadow_blur: '4px', opacity: '100%', text_wrap: false }) // KINEO-AMOSTRA-ANUNCIO-2410 — permanent visible watermark burned into the delivered MP4.
  return { output_format: 'mp4', width: 1080, height: 1920, frame_rate: ADS_V2_FRAME_RATE, duration: seconds, snapshot_time: 1, elements } // KINEO-AMOSTRA-ANUNCIO-2410
}
