// KINEO-ADS-ESCOLHA-2310 — chosen live scene for all15s; no original-photo close, card, opaque box or duration extension.
import { ADS_V2_FRAME_RATE } from '../adV2Montage'
import { cenaCaptionElements } from '../v2CenaQuality'
import { ajusteFinalTextElements } from './ajusteMontage'
import { cenaHttps, cenaVoiceModeOf, type CenaPlan } from './plan'
import { escolhaOf, escolhaHasOffer } from './escolhaPlan'
import type { CenaEscolhaState } from './escolhaMedia'
const r6 = (n: number): number => Math.round(n * 1e6) / 1e6
const literal = (s: string): string => s.replace(/\[/gu, '［').replace(/\]/gu, '］')
const norm = (s: string): string => s.replace(/\s+/gu, ' ').trim().toLowerCase()
/** A literal offer occurs in exactly one visual field, even when included in a literal typed CTA. */
export function escolhaFinalTextElements(plan: CenaPlan): Record<string, unknown>[] {
  const cta = plan.input.cta || plan.script.cta, offer = plan.input.oferta ?? ''
  const titleHas = escolhaHasOffer(plan.product, offer), ctaHas = escolhaHasOffer(cta, offer)
  return ajusteFinalTextElements({ ...plan, input: { ...plan.input, oferta: titleHas || ctaHas ? '' : offer }, script: { ...plan.script, cta } }).map(e => ({ ...e, shadow_color: 'rgba(0,0,0,0.65)', shadow_blur: '4px', shadow_y: '3px' }))
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
  const choice = escolhaOf(s.plan)!, center = choice.captionLane === 'top' ? 62 : 70
  const duration = cenaVoiceModeOf(s.plan) === 'narrated' ? s.escolhaMedia!.voice.seconds! : 15
  const height = Math.floor(2 * (1480 - 7 - 1920 * center / 100))
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
  elements.push(...captions(s), ...escolhaFinalTextElements(s.plan))
  if (mode === 'narrated') elements.push({ type: 'audio', track: 50, time: 0, duration: s.escolhaMedia!.voice.seconds, source: s.voiceUrl!, volume: '100%' })
  elements.push(...escolhaMusicElements(s.escolhaMedia?.music.url, mode === 'narrated' ? s.escolhaMedia!.voice.seconds! : 15))
  return { output_format: 'mp4', width: 1080, height: 1920, frame_rate: ADS_V2_FRAME_RATE, duration: 15, snapshot_time: 1, elements }
}
