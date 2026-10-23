// KINEO-ADS-ESCOLHA-2310 — three sequential full-frame takes, one selected identity/composition reference.
import { cenaVideoRequests, type CenaRoute, type CenaVideoRequest } from './adapters'
import type { CenaPlan } from './plan'
/** fal Kling3 schema checked 23/10/2026: multi_prompt replaces prompt, customize, three 5s shots. */
export function escolhaVideoRequests(plan: CenaPlan, route: CenaRoute, keyframeUrl: string): CenaVideoRequest[] {
  const selected = plan.escolha
  if (selected?.marker !== 'KINEO-ADS-ESCOLHA-2310' || selected.shotPrompts.length !== 3 || selected.shotPrompts.some(p => !p.trim())) throw new Error('escolha_three_shots_required')
  const requests = cenaVideoRequests(route, { keyframeUrl, productUrl: plan.input.foto, prompt: plan.videoPrompt, segmentPrompts: plan.segmentPrompts, language: plan.input.language, voiceMode: plan.voice_mode })
  if (route !== 'kling3') return requests
  // Do not send an ending wide reference: the final take is the close of the real product in this same scene.
  const { prompt: _singlePrompt, end_image_url: _endImage, ...input } = requests[0].input
  return [{ ...requests[0], input: { ...input, shot_type: 'customize', multi_prompt: selected.shotPrompts.map(prompt => ({ prompt, duration: '5' })) } }]
}
