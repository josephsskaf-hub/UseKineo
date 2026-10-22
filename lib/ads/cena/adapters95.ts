// KINEO-ADS-CENA-95-2110 — schemas oficiais fal conferidos em21/10; builders sem SDK ou efeitos.
import { CENA_ROUTES, cenaKeyframeRequest, type CenaRoute } from './adapters'
import type { Cena95Plan } from './plan95'
import { CENA95_TARGET_WPS } from './script95'
export interface Cena95Request { family: 'base' | 'person0' | 'person1' | 'close'; candidate: number; kind: 'image' | 'video'; endpoint: string; input: Record<string, unknown>; seconds: number; keepSeconds: number; unitUsd: number; photoReference?: string }
export interface Cena95NativeSegment { text: string; start: number; seconds: number; pauseSeconds: number; spokenSeconds: number; estimatedWordsPerSecond: number; timingBasis: 'planning_assumption_not_measured' }
/** KINEO-ADS-CENA-95-2110 — cortes de PALAVRAS da narração inteira. Pausa/CTA só no último trecho.
 * Taxa é orçamento de planejamento, não duração medida do áudio. Se quantização ou CTA não cabem, refazer ANTES de cobrar.
 */
export function cena95NativeSegments(script: Pick<Cena95Plan['script'], 'narration' | 'cta' | 'pauseSeconds'>, durations: readonly number[]): Cena95NativeSegment[] {
  const words = script.narration.trim().split(/\s+/u).filter(Boolean), cta = script.cta.trim().split(/\s+/u).filter(Boolean), pause = script.pauseSeconds
  if (!words.length || !cta.length || !Number.isFinite(pause) || pause < 0 || pause >= 1 || durations.length < 1 || durations.some(s => !Number.isFinite(s) || s <= 0) || Math.abs(durations.reduce((a, b) => a + b, 0) - 15) > 1e-8 || words.slice(-cta.length).join(' ') !== cta.join(' ')) throw new Error('cena95_native_speech_does_not_fit')
  const available = durations.map((s, n) => s - (n === durations.length - 1 ? pause : 0))
  const capacities = available.map(s => Math.floor(s * CENA95_TARGET_WPS + 1e-9)), speakingTime = available.reduce((a, b) => a + b, 0)
  if (capacities.some(n => n < 1) || words.length > capacities.reduce((a, b) => a + b, 0) || cta.length > capacities[capacities.length - 1]) throw new Error('cena95_native_speech_does_not_fit')
  let at = 0, start = 0
  return durations.map((seconds, n) => {
    const last = n === durations.length - 1
    const remainingCapacity = capacities.slice(n + 1).reduce((a, b) => a + b, 0)
    const minimum = Math.max(at + 1, words.length - remainingCapacity)
    const maximum = Math.min(at + capacities[n], last ? words.length : words.length - cta.length - (durations.length - n - 2))
    const end = last ? words.length : Math.max(minimum, Math.min(maximum, Math.floor(words.length * (start + seconds) / speakingTime)))
    if (minimum > maximum || end > maximum || end < minimum) throw new Error('cena95_native_speech_does_not_fit')
    const text = words.slice(at, end).join(' '), result: Cena95NativeSegment = { text, start, seconds, pauseSeconds: last ? pause : 0, spokenSeconds: available[n], estimatedWordsPerSecond: (end - at) / available[n], timingBasis: 'planning_assumption_not_measured' }
    at = end; start += seconds
    return result
  })
}
export function cena95BaseRequests(plan: Cena95Plan): Cena95Request[] {
  return [0, 1].map(candidate => ({ ...cenaKeyframeRequest({ productUrl: plan.input.foto, actorUrl: plan.input.actorUrl, prompt: `${plan.keyframePrompts[0]} Composition candidate ${candidate + 1}.` }), family: 'base', candidate, kind: 'image', seconds: 0, keepSeconds: 0, unitUsd: 0.15 }))
}
export function cena95VideoRequests(plan: Cena95Plan, route: CenaRoute, baseUrl: string): Cena95Request[] {
  if (!/^https:\/\//.test(baseUrl)) throw new Error('cena95_base_required')
  const talking = plan.voice_mode === 'talking', root = plan.videoPrompt
  const native = talking && route !== 'veo31' ? cena95NativeSegments(plan.script, route === 'kling3' ? [3, 7, 5] : [3, 12]) : []
  const speech = (segment?: Cena95NativeSegment) => talking && segment ? `${plan.quality95.nativeVoice} Face and mouth visible and speaking. Deliver the supplied words within ${segment.seconds}s, with no repetition or extra words. ${segment.pauseSeconds ? `Pause ${segment.pauseSeconds}s immediately before the final ${plan.script.cta.trim().split(/\s+/u).length} words (the complete CTA). ` : ''}Say ONLY: ${segment.text}` : 'No speech, no dialogue, no lip-sync. Lips remain closed throughout. generate_audio is disabled.'
  const hook = `${root} HOOK: strong forward movement with person AND whole product; energetic but anatomically natural. ${speech(native[0])}`
  const use = `${root} DEMONSTRATION: ${plan.interaction}. ${speech(native[1])}`
  const jobs: Cena95Request[] = []
  for (const candidate of [0, 1]) {
    if (route === 'kling3') {
      const duration = talking ? 15 : 10
      jobs.push({ family: 'person0', candidate, kind: 'video', endpoint: CENA_ROUTES.kling3.endpoint, input: { start_image_url: baseUrl, multi_prompt: [{ prompt: hook, duration: '3' }, { prompt: use, duration: '7' }, ...(talking ? [{ prompt: `${root} Continue face-to-camera speech while the same action continues. ${speech(native[2])}`, duration: '5' }] : [])], shot_type: 'customize', duration: String(duration), generate_audio: talking }, seconds: duration, keepSeconds: duration, unitUsd: duration * (talking ? 0.168 : 0.112) })
    } else if (route === 'veo31') {
      for (const part of [0, 1] as const) jobs.push({ family: part === 0 ? 'person0' : 'person1', candidate, kind: 'video', endpoint: CENA_ROUTES.veo31.endpoint, input: { image_urls: [baseUrl, plan.input.foto], prompt: plan.segmentPrompts[part], duration: '8s', aspect_ratio: '9:16', resolution: '720p', generate_audio: talking }, seconds: 8, keepSeconds: part === 0 ? 8 : 7, unitUsd: 8 * (talking ? 0.4 : 0.2) })
    } else {
      for (const part of [0, 1] as const) { const seconds = part === 0 ? 4 : talking ? 12 : 7
        jobs.push({ family: part === 0 ? 'person0' : 'person1', candidate, kind: 'video', endpoint: CENA_ROUTES.seedance2.endpoint, input: { image_urls: [baseUrl, plan.input.foto], prompt: `@Image1 is the SAME actor and clothing base for every take, @Image2 is the exact product. ${part === 0 ? 'Finish the supplied words within the first3seconds; extra lastsecond is silent and trimmed. ' : ''}${part === 0 ? hook : use}`, duration: String(seconds), resolution: '720p', aspect_ratio: '9:16', generate_audio: talking }, seconds, keepSeconds: part === 0 ? 3 : seconds, unitUsd: seconds * 0.3034 })
      }
    }
  }
  const closePrompt = 'Animate ONLY the exact original customer product photograph. Slow subtle camera push-in or very slight orbit; preserve the entire product, original label, typography, material, dimensions and background. No morphing or new side. No hand, person, extra object, invented accessory, added text or graphics. Product remains stable and whole. Silent video, no dialogue or lip-sync.'
  const seconds = route === 'veo31' ? 6 : 5
  jobs.push({ family: 'close', candidate: 0, kind: 'video', endpoint: route === 'kling3' ? CENA_ROUTES.kling3.endpoint : route === 'veo31' ? 'fal-ai/veo3.1/image-to-video' : 'bytedance/seedance-2.0/image-to-video', input: { ...(route === 'kling3' ? { start_image_url: plan.input.foto } : { image_url: plan.input.foto }), prompt: closePrompt, duration: route === 'veo31' ? '6s' : '5', ...(route === 'kling3' ? {} : { resolution: '720p', aspect_ratio: '9:16' }), generate_audio: false }, seconds, keepSeconds: 5, unitUsd: seconds * (route === 'kling3' ? 0.112 : route === 'veo31' ? 0.2 : 0.3034), photoReference: plan.input.foto })
  return jobs
}
