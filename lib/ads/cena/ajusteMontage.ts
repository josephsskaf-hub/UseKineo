// KINEO-ADS-CENA-RETOMADA-2110 — preserve scene speech, show the customer's own moving photograph at10–15s.
import type { CenaPlan } from './plan'
import { cenaVoiceModeOf } from './plan'
import { buildCenaMontage, cenaFinalTextElements } from './montage'
import { ajusteLiveOf, CENA_AJUSTE_LIVE_VERSION, type AjusteState } from './ajusteMedia'
import { addAjusteQuality } from './ajusteQuality' // KINEO-ADS-CENA-SEGUE-2110
const r6 = (n: number): number => Math.round(n * 1e6) / 1e6
const literal = (text: string): string => text.replace(/\[/gu, '［').replace(/\]/gu, '］')
/** Pure and shared with planning; literal customer labels cannot become Creatomate rich-text commands. */
export function ajusteFinalTextElements(plan: CenaPlan): Record<string, unknown>[] {
  try { return cenaFinalTextElements({ ...plan, product: literal(plan.product), input: { ...plan.input, oferta: literal(plan.input.oferta ?? '') }, script: { ...plan.script, cta: literal(plan.script.cta) } }) } // KINEO-ADS-CENA-SEGUE-2110 — ordinary layout remains exactly the previous helper.
  catch (error) { // KINEO-ADS-CENA-SEGUE-2110
    if (!ajusteLiveOf(plan) || !(error instanceof Error) || error.message !== 'cena_final_text_does_not_fit') throw error // KINEO-ADS-CENA-SEGUE-2110
    const fields = [{ text: plan.product, track: 44 }, ...(plan.input.oferta ? [{ text: plan.input.oferta, track: 45 }] : []), { text: plan.script.cta, track: 46 }] // KINEO-ADS-CENA-SEGUE-2110
    addAjusteQuality(plan, { stage: 'montage', code: 'final_text_paginated', message: 'Long final copy is paginated at the standard font size; every typed character remains in order, but pages may pass quickly. No offer, name or CTA was removed.' }) // KINEO-ADS-CENA-SEGUE-2110
    return fields.flatMap((field, index) => { // KINEO-ADS-CENA-SEGUE-2110
      const chars = Array.from(literal(field.text)), pages = Math.max(1, Math.ceil(chars.length / 11)), y = fields.length === 3 ? [62, 67, 72][index] : [62, 72][index] // KINEO-ADS-CENA-SEGUE-2110 — at most11 codepoints fit conservatively at63px, including wide glyphs.
      return Array.from({ length: pages }, (_p, page) => { const time = r6(13 + 2 * page / pages), end = r6(13 + 2 * (page + 1) / pages); return { type: 'text', track: field.track, time, duration: r6(end - time), text: chars.slice(page * 11, (page + 1) * 11).join(''), x: '50%', y: `${y}%`, x_anchor: '50%', y_anchor: '50%', x_alignment: '50%', y_alignment: '50%', width: '84%', height: 80, clip: true, text_wrap: false, font_family: 'Inter', font_size: 63, font_weight: '800', line_height: '110%', fill_color: '#ffffff', stroke_color: '#000000', stroke_width: 7 } }) // KINEO-ADS-CENA-SEGUE-2110
    }) // KINEO-ADS-CENA-SEGUE-2110
  } // KINEO-ADS-CENA-SEGUE-2110
}
export function ajusteMusicElements(url: string | undefined, voiceSeconds: number, duration = 15): Record<string, unknown>[] { // KINEO-ADS-CENA-SEGUE-2110
  if (!url || !/^https:\/\/\S+$/iu.test(url)) return []
  const speechEnd = Number.isFinite(voiceSeconds) ? Math.max(0, Math.min(duration, voiceSeconds)) : duration // KINEO-ADS-CENA-SEGUE-2110
  return [...new Set([0, speechEnd, duration])].sort((a, b) => a - b).slice(0, -1).flatMap((start, k, edges) => { // KINEO-ADS-CENA-SEGUE-2110
    const end = k + 1 < edges.length ? edges[k + 1] : duration // KINEO-ADS-CENA-SEGUE-2110
    if (end <= start) return []
    return [{ type: 'audio', track: 60, time: start, duration: r6(end - start), source: url, trim_start: start, volume: `${r6(100 * Math.pow(10, (start < speechEnd ? -18 : -15) / 20))}%`, ...(start === 0 ? { audio_fade_in: 0.2 } : {}), ...(end === duration ? { audio_fade_out: 0.35 } : {}) }] // KINEO-ADS-CENA-SEGUE-2110
  })
}
export function buildAjusteMontage(s: AjusteState): Record<string, unknown> {
  if (!ajusteLiveOf(s.plan)) return buildCenaMontage(s)
  const media = s.ajusteMedia, close = media?.close
  if (media?.version !== CENA_AJUSTE_LIVE_VERSION || close?.status !== 'done' || close.photoReference !== s.plan.input.foto || !close.url || !/^https:\/\/\S+$/iu.test(close.url) || close.url === s.plan.input.foto || !(Number.isFinite(close.measuredSeconds) && close.measuredSeconds! > 0)) throw new Error('cena_ajuste_close_required') // KINEO-ADS-CENA-SEGUE-2110
  const finalText = ajusteFinalTextElements(s.plan); let base: Record<string, unknown> // KINEO-ADS-CENA-SEGUE-2110
  try { base = buildCenaMontage(s) } catch (error) { if (!(error instanceof Error) || error.message !== 'cena_final_text_does_not_fit') throw error; base = buildCenaMontage({ ...s, plan: { ...s.plan, product: 'Product', input: { ...s.plan.input, oferta: '' }, script: { ...s.plan.script, cta: 'Continue.' } } }) } // KINEO-ADS-CENA-SEGUE-2110 — base-only placeholders are removed below; the final tracks always use complete literal customer copy.
  const mode = cenaVoiceModeOf(s.plan), old = base.elements as Record<string, unknown>[] // KINEO-ADS-CENA-SEGUE-2110
  if (mode === 'narrated' && media.voiceSeconds !== undefined && !(Number.isFinite(media.voiceSeconds) && media.voiceSeconds > 0)) throw new Error('cena_ajuste_voice_duration_invalid') // KINEO-ADS-CENA-SEGUE-2110 — zero/invalid audio remains a technical failure.
  const visuals = old.filter(e => e.type === 'video' && e.track === 2)
  const duration = mode === 'narrated' && Number.isFinite(media.voiceSeconds) ? Math.max(15, media.voiceSeconds!) : 15, sceneEnd = duration - 5 // KINEO-ADS-CENA-SEGUE-2110
  if (duration > 15) addAjusteQuality(s, { stage: 'voice', code: 'voice_duration_extended', message: `Valid narration lasts ${media.voiceSeconds}s. Output duration extends to ${duration}s, keeping the entire voice and CTA, the final 5s moving close and last 2s overlay; caption timing remains an estimate.` }) // KINEO-ADS-CENA-SEGUE-2110
  const jobs = s.jobs.filter(j => j.kind === 'video' && j.status === 'done').sort((a, b) => a.index - b.index), available = (k: number) => jobs[k]?.measuredSeconds ?? jobs[k]?.seconds ?? Number(visuals[k].duration) // KINEO-ADS-CENA-SEGUE-2110
  if (visuals.some((_e, k) => !(Number.isFinite(available(k)) && available(k) > 0))) throw new Error('cena_ajuste_video_duration_invalid') // KINEO-ADS-CENA-SEGUE-2110
  const scene = visuals.flatMap((e, k) => { // KINEO-ADS-CENA-SEGUE-2110
    const start = Number(e.time), end = k === visuals.length - 1 ? sceneEnd : Math.min(sceneEnd, start + Number(e.duration)), keep = r6(end - start) // KINEO-ADS-CENA-SEGUE-2110
    if (keep <= 0) return []; const clip: Record<string, unknown> = { ...e, duration: keep, volume: '0%', loop: keep > available(k) }; if (clip.loop) { delete clip.trim_start; delete clip.trim_duration }; return [clip] // KINEO-ADS-CENA-SEGUE-2110 — official video loop schema forbids trim properties together with looping.
  }) // KINEO-ADS-CENA-SEGUE-2110
  const native = mode === 'talking' ? visuals.map((e, k) => ({ ...e, track: 1, duration: Math.min(Number(e.duration), available(k)), loop: false, volume: '100%' })) : [] // KINEO-ADS-CENA-SEGUE-2110 — never repeat spoken words to fill a short native clip.
  if (native.some((e, k) => e.duration < Number(visuals[k].duration))) addAjusteQuality(s, { stage: 'voice', code: 'native_audio_short', message: 'Existing native audio plays once in full; the moving visual may loop to cover a short source, without inventing or repeating speech.' }) // KINEO-ADS-CENA-SEGUE-2110
  addAjusteQuality(s, { stage: 'montage', code: 'montage_ready', message: `Montage duration ${duration}s; moving close in its last 5s and name, offer and CTA overlay in its last 2s. Caption times are an estimate.` }) // KINEO-ADS-CENA-SEGUE-2110
  const elements = [
    ...old.filter(e => !(e.type === 'video' && e.track === 2) && ![44, 45, 46].includes(Number(e.track))).map(e => duration <= 15 ? e : e.type === 'audio' && e.track === 50 ? { ...e, duration: media.voiceSeconds } : e.type === 'text' ? { ...e, time: r6(Number(e.time) * duration / 15), duration: r6(Number(e.duration) * duration / 15) } : e), // KINEO-ADS-CENA-SEGUE-2110
    ...native, ...scene,
    { type: 'video', track: 2, time: sceneEnd, duration: 5, source: close.url, ...(close.measuredSeconds! < 5 ? { loop: true } : { loop: false, trim_start: 0 }), fit: 'cover', x: '50%', y: '50%', width: '100%', height: '100%', volume: '0%' }, // KINEO-ADS-CENA-SEGUE-2110
    ...finalText.map(e => duration > 15 ? { ...e, time: r6(Number(e.time) + duration - 15) } : e), ...ajusteMusicElements(media.music.url, mode === 'talking' ? 15 : media.voiceSeconds ?? 15, duration), // KINEO-ADS-CENA-SEGUE-2110 — keep each page within the last2s, never stack all pages at one time.
  ]
  return { ...base, duration, elements } // KINEO-ADS-CENA-SEGUE-2110
}
