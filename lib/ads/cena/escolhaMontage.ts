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
const r6 = (n: number): number => Math.round(n * 1e6) / 1e6
const literal = (s: string): string => s.replace(/\[/gu, '［').replace(/\]/gu, '］')
const norm = (s: string): string => s.replace(/\s+/gu, ' ').trim().toLowerCase()
/** A literal offer occurs in exactly one visual field, even when included in a literal typed CTA. */
export function escolhaFinalTextElements(plan: CenaPlan, expectedImageUrl?: string): Record<string, unknown>[] {
  const cta = plan.input.cta || plan.script.cta, offer = plan.input.oferta ?? ''
  const titleHas = escolhaHasOffer(plan.product, offer), ctaHas = escolhaHasOffer(cta, offer)
  const elements: Record<string, unknown>[] = ajusteFinalTextElements({ ...plan, input: { ...plan.input, oferta: titleHas || ctaHas ? '' : offer }, script: { ...plan.script, cta } }).map(e => ({ ...e, shadow_color: 'rgba(0,0,0,0.65)', shadow_blur: '4px', shadow_y: '3px' }))
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
  const columns = Math.max(1, Math.floor(890 / (font * .75))), lines: string[] = []
  for (const word of text.split(/\s+/u)) {
    const chunks = Array.from(word).reduce<string[]>((out, c) => { if (!out.length || Array.from(out[out.length - 1]).length >= columns) out.push(c); else out[out.length - 1] += c; return out }, [])
    for (const chunk of chunks) { const last = lines[lines.length - 1]; if (last && Array.from(last + ' ' + chunk).length <= columns) lines[lines.length - 1] = last + ' ' + chunk; else lines.push(chunk) }
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
  const duration = cenaVoiceModeOf(s.plan) === 'narrated' ? s.escolhaMedia!.voice.seconds! : 15
  // Timing is a proportional word estimate from measured audio length, never claimed forced alignment.
  return cenaCaptionElements({ text: literal(s.plan.script.narration), seconds: duration, width: 1080, height: 1920, track: 40 }).flatMap(e => {
    const time = Number(e.time), end = Math.min(13, time + Number(e.duration))
    if (time >= end) return []
    let font = 63, text = wrap(String(e.text), font)
    while (text.split('\n').length * font * 1.1 + 14 > height && font > 6) { font--; text = wrap(String(e.text), font) }
    return [{ ...e, duration: r6(end - time), text, y: `${center}%`, height, y_alignment: '50%', text_wrap: false, clip: true, font_size: font, stroke_width: 7, shadow_color: 'rgba(0,0,0,0.65)', shadow_blur: '4px', shadow_y: '3px' }]
  })
}
/** Music remains below speech; a native take keeps its original audio once, without a second narration. */
/** KINEO-ADS-RENDER-FIX-2310 — fundador 24/10: "faltou o som" / ASMR das unhas no pote: no modo narrado o Kling gera só som ambiente (sem fala) e ele entra baixo sob a narração. */
export const ESCOLHA_AMBIENT_VOLUME = '35%'
export function escolhaMusicElements(url: string | undefined, speechSeconds: number): Record<string, unknown>[] {
  if (!cenaHttps(url)) return []
  const stop = Math.min(15, Math.max(0, speechSeconds)), edges = [...new Set([0, stop, 15])].sort((a, b) => a - b)
  return edges.slice(0, -1).map((start, k) => ({ type: 'audio', track: 60, time: start, duration: r6(edges[k + 1] - start), trim_start: start, source: url, volume: `${r6(100 * Math.pow(10, (start < stop ? -18 : -15) / 20))}%`, ...(start === 0 ? { audio_fade_in: .2 } : {}), ...(edges[k + 1] === 15 ? { audio_fade_out: .35 } : {}) }))
}
export function buildCenaEscolhaMontage(s: CenaEscolhaState): Record<string, unknown> {
  const clips = s.jobs.filter(j => j.kind === 'video' && j.status === 'done').sort((a, b) => a.index - b.index), mode = cenaVoiceModeOf(s.plan)
  if (!escolhaOf(s.plan) || s.phase !== 'ready' || clips.length !== (s.route === 'veo31' ? 2 : 1) || clips.some(j => !cenaHttps(j.url))) throw new Error('escolha_video_not_ready')
  if (mode === 'narrated' && (!cenaHttps(s.voiceUrl) || s.escolhaMedia?.voice.status !== 'done' || !(s.escolhaMedia.voice.seconds! > 0 && s.escolhaMedia.voice.seconds! <= 15))) throw new Error('escolha_voice_unusable')
  if (mode === 'talking' && s.voiceUrl) throw new Error('cena_talking_voiceover_forbidden')
  const elements: Record<string, unknown>[] = []
  clips.forEach((j, k) => {
    const time = k === 0 ? 0 : 8, duration = clips.length === 1 ? 15 : k === 0 ? 8 : 7, available = j.measuredSeconds ?? j.seconds
    if (!(Number.isFinite(available) && available > 0)) throw new Error('escolha_video_unusable')
    const base = { type: 'video', time, source: j.url!, fit: 'cover', x: '50%', y: '50%', width: '100%', height: '100%', color_filter: 'contrast', color_filter_value: 5 }
    elements.push({ ...base, track: 2, duration, volume: mode === 'narrated' ? ESCOLHA_AMBIENT_VOLUME : '0%', ...(available < duration ? { loop: true } : { loop: false, trim_start: 0 }) }) // KINEO-ADS-RENDER-FIX-2310 — narrado: o som ambiente nativo da cena (toque das unhas, mar, passos) fica baixo sob a voz
    if (mode === 'talking') elements.push({ ...base, track: 1, duration: Math.min(duration, available), volume: '100%', loop: false, trim_start: 0 })
  })
  elements.push(...captions(s), ...escolhaFinalTextElements(s.plan, s.keyframe))
  if (mode === 'narrated') elements.push({ type: 'audio', track: 50, time: 0, duration: s.escolhaMedia!.voice.seconds, source: s.voiceUrl!, volume: '100%' })
  elements.push(...escolhaMusicElements(s.escolhaMedia?.music.url, mode === 'narrated' ? s.escolhaMedia!.voice.seconds! : 15))
  return { output_format: 'mp4', width: 1080, height: 1920, frame_rate: ADS_V2_FRAME_RATE, duration: 15, snapshot_time: 1, elements }
}
