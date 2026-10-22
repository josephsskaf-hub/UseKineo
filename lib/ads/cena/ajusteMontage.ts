// KINEO-ADS-CENA-RETOMADA-2110 — preserve scene speech, show the customer's own moving photograph at10–15s.
import type { CenaPlan } from './plan'
import { cenaVoiceModeOf } from './plan'
import { buildCenaMontage, cenaFinalTextElements } from './montage'
import { ajusteLiveOf, CENA_AJUSTE_LIVE_VERSION, type AjusteState } from './ajusteMedia'
const r6 = (n: number): number => Math.round(n * 1e6) / 1e6
const literal = (text: string): string => text.replace(/\[/gu, '［').replace(/\]/gu, '］')
/** Pure and shared with planning; literal customer labels cannot become Creatomate rich-text commands. */
export function ajusteFinalTextElements(plan: CenaPlan): Record<string, unknown>[] {
  return cenaFinalTextElements({ ...plan, product: literal(plan.product), input: { ...plan.input, oferta: literal(plan.input.oferta ?? '') }, script: { ...plan.script, cta: literal(plan.script.cta) } })
}
export function ajusteMusicElements(url: string | undefined, voiceSeconds: number): Record<string, unknown>[] {
  if (!url || !/^https:\/\/\S+$/iu.test(url)) return []
  const speechEnd = Number.isFinite(voiceSeconds) ? Math.max(0, Math.min(15, voiceSeconds)) : 15
  return [...new Set([0, speechEnd, 15])].sort((a, b) => a - b).slice(0, -1).flatMap((start, k, edges) => {
    const end = k + 1 < edges.length ? edges[k + 1] : 15
    if (end <= start) return []
    return [{ type: 'audio', track: 60, time: start, duration: r6(end - start), source: url, trim_start: start, volume: `${r6(100 * Math.pow(10, (start < speechEnd ? -24 : -18) / 20))}%`, ...(start === 0 ? { audio_fade_in: 0.2 } : {}), ...(end === 15 ? { audio_fade_out: 0.35 } : {}) }]
  })
}
export function buildAjusteMontage(s: AjusteState): Record<string, unknown> {
  if (!ajusteLiveOf(s.plan)) return buildCenaMontage(s)
  const media = s.ajusteMedia, close = media?.close
  if (media?.version !== CENA_AJUSTE_LIVE_VERSION || close?.status !== 'done' || close.photoReference !== s.plan.input.foto || !close.url || !/^https:\/\/\S+$/iu.test(close.url) || close.url === s.plan.input.foto || !(close.measuredSeconds! >= 5)) throw new Error('cena_ajuste_close_required')
  const base = buildCenaMontage(s), mode = cenaVoiceModeOf(s.plan), old = base.elements as Record<string, unknown>[]
  const visuals = old.filter(e => e.type === 'video' && e.track === 2)
  const scene = visuals.flatMap(e => {
    const start = Number(e.time), end = Math.min(10, start + Number(e.duration))
    return end > start ? [{ ...e, duration: r6(end - start), volume: '0%' }] : []
  })
  const native = mode === 'talking' ? visuals.map(e => ({ ...e, track: 1, volume: '100%' })) : []
  const elements = [
    ...old.filter(e => !(e.type === 'video' && e.track === 2) && ![44, 45, 46].includes(Number(e.track))),
    ...native, ...scene,
    { type: 'video', track: 2, time: 10, duration: 5, source: close.url, trim_start: 0, fit: 'cover', loop: false, x: '50%', y: '50%', width: '100%', height: '100%', volume: '0%' },
    ...ajusteFinalTextElements(s.plan), ...ajusteMusicElements(media.music.url, mode === 'talking' ? 15 : media.voiceSeconds ?? 15),
  ]
  return { ...base, elements }
}
