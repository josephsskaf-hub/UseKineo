import { CLIP_EFFECTS, clipEffectCredits } from '@/lib/clips/clipEffects'

export interface RecreateFormat {
  id: string
  title: string
  preview: string
  poster: string
  seconds: number
  type: 'swap' | 'effect'
  prompt: string
  photoSlots: number
  effectKey?: string
}

export const RECREATE_SWAP_PROMPT = 'Face swap only. Replace only the face with the face from the reference photo. Keep the original clothing, body, scene, lighting, camera, movement, cuts and audio unchanged.'
export const RECREATE_ASSETS = {
  'outfit-morph.mp4': { file: 'outfit-morph-v6.mp4', contentType: 'video/mp4' },
  'outfit-morph.png': { file: 'outfit-morph.png', contentType: 'image/png' },
  'elevador.mp4': { file: 'elevador-v1.mp4', contentType: 'video/mp4' },
  'elevador.jpg': { file: 'elevador.jpg', contentType: 'image/jpeg' },
} as const

export const RECREATE_FORMATS: readonly RecreateFormat[] = [
  { id: 'outfit-morph', title: 'Outfit Morph', preview: '/api/recreate/assets/outfit-morph.mp4', poster: '/api/recreate/assets/outfit-morph.png', seconds: 10, type: 'swap', prompt: RECREATE_SWAP_PROMPT, photoSlots: 1 },
  { id: 'elevador', title: 'Elevator', preview: '/api/recreate/assets/elevador.mp4', poster: '/api/recreate/assets/elevador.jpg', seconds: 10, type: 'swap', prompt: RECREATE_SWAP_PROMPT, photoSlots: 2 },
  ...CLIP_EFFECTS.filter(e => e.preview?.poster).map(e => ({
    id: `effect-${e.key.replaceAll('_', '-')}`, title: e.title, preview: e.preview!.video,
    poster: e.preview!.poster!, seconds: e.seconds, type: 'effect' as const, prompt: e.template ? e.sub : e.prompt,
    photoSlots: e.pair ? 2 : 1, effectKey: e.key,
  })),
]
export const recreateFormat = (id: unknown) => RECREATE_FORMATS.find(f => f.id === id) ?? null
export function recreateEffectCredits(f: RecreateFormat): number | null {
  const effect = CLIP_EFFECTS.find(e => e.key === f.effectKey)
  return effect ? clipEffectCredits(effect) : null
}
