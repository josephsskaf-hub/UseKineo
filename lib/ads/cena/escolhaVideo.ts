// KINEO-ADS-ESCOLHA-2310 — three sequential full-frame takes, one selected identity/composition reference.
import { cenaVideoRequests, type CenaRoute, type CenaVideoRequest } from './adapters'
import type { CenaPlan } from './plan'
/** fal Kling3 schema checked 23/10/2026: multi_prompt replaces prompt, customize, three 5s shots. */
export function escolhaVideoRequests(plan: CenaPlan, route: CenaRoute, keyframeUrl: string): CenaVideoRequest[] {
  const selected = plan.escolha && { ...plan.escolha, shotPrompts: plan.escolha.shotPrompts.map(p => escolhaShotPromptFit(p)) as [string, string, string] } // KINEO-ADS-RENDER-FIX-2310 — each Kling3 shot prompt fits the provider's 2500-char limit
  if (selected?.marker !== 'KINEO-ADS-ESCOLHA-2310' || selected.shotPrompts.length !== 3 || selected.shotPrompts.some(p => !p.trim())) throw new Error('escolha_three_shots_required')
  const requests = cenaVideoRequests(route, { keyframeUrl, productUrl: plan.input.foto, prompt: plan.videoPrompt, segmentPrompts: plan.segmentPrompts, language: plan.input.language, voiceMode: plan.voice_mode })
  if (route !== 'kling3') return requests
  // Do not send an ending wide reference: the final take is the close of the real product in this same scene.
  const { prompt: _singlePrompt, end_image_url: _endImage, ...input } = requests[0].input
  return [{ ...requests[0], input: { ...input, shot_type: 'customize', multi_prompt: selected.shotPrompts.map(prompt => ({ prompt, duration: '5' })) } }]
}

/** KINEO-ADS-RENDER-FIX-2310 — fal Kling3 prompt maxLength is 2500 (openapi 23/10/2026); the 23/10 render (order 1a09131b) sent 2642–2819 chars per shot and failed with no error recorded. */
export const ESCOLHA_SHOT_PROMPT_MAX = 2400 // KINEO-ADS-RENDER-FIX-2310 — margin below the provider's 2500
/** KINEO-ADS-RENDER-FIX-2310 — keeps the first sentence (chosen still) and the whole shot-specific tail ("Absolute…"), then fills with the shared rules in their original order while they fit; whole sentences only. */
export function escolhaShotPromptFit(prompt: string, max = ESCOLHA_SHOT_PROMPT_MAX): string { // KINEO-ADS-RENDER-FIX-2310
  const text = prompt.replace(/\s+/g, ' ').trim() // KINEO-ADS-RENDER-FIX-2310
  if (text.length <= max) return text // KINEO-ADS-RENDER-FIX-2310
  const sentences = text.match(/[^.!?]+[.!?]+(?=\s|$)|[^.!?]+$/g)?.map(s => s.trim()).filter(Boolean) ?? [text] // KINEO-ADS-RENDER-FIX-2310
  const shot = sentences.findIndex(s => /^Absolute\s*\d/.test(s)) // KINEO-ADS-RENDER-FIX-2310
  const tail = shot > 0 ? sentences.slice(shot) : sentences.slice(-2) // KINEO-ADS-RENDER-FIX-2310
  const head = sentences.slice(0, shot > 0 ? shot : Math.max(0, sentences.length - 2)) // KINEO-ADS-RENDER-FIX-2310
  const kept: string[] = [] // KINEO-ADS-RENDER-FIX-2310
  let size = tail.join(' ').length // KINEO-ADS-RENDER-FIX-2310
  for (const s of head) { if (size + 1 + s.length <= max) { kept.push(s); size += 1 + s.length } } // KINEO-ADS-RENDER-FIX-2310
  const fitted = [...kept, ...tail].join(' ') // KINEO-ADS-RENDER-FIX-2310
  return fitted.length <= max ? fitted : fitted.slice(0, max) // KINEO-ADS-RENDER-FIX-2310 — last resort; the tail alone never reaches it in today's plans
}
