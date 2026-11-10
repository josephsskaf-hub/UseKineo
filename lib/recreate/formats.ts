import { CLIP_EFFECTS, clipEffectCredits } from '@/lib/clips/clipEffects'
import { recreateCreditCost } from '@/lib/checkoutPricing'

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
  /** Swap only. KINEO-RECREATE-TRAVA-1011: true ONLY after a paid swap test (two different photos) swapped EVERY person. */
  swapApproved?: boolean
  /** Swap only, not approved: visible to the exact house allowlist while it is tested — never to customers. */
  swapInTest?: boolean
  /** Swap only: date of the approving paid test (YYYY-MM-DD). */
  approvedOn?: string
  /** Swap only: short note on the test state. */
  swapNote?: string
  /** Swap only: two base-video frame numbers (24 fps, 0-based) the "not swapped" check compares; JPEGs in lib/recreate/assets/check. */
  checkFrames?: readonly [number, number]
}

export const RECREATE_SWAP_PROMPT = 'Face swap only. Replace only the face with the face from the reference photo. Keep the original clothing, body, scene, lighting, camera, movement, cuts and audio unchanged.'
export const RECREATE_ASSETS = {
  'outfit-morph.mp4': { file: 'outfit-morph-v6.mp4', contentType: 'video/mp4' },
  'outfit-morph.png': { file: 'outfit-morph.png', contentType: 'image/png' },
  'elevador.mp4': { file: 'elevador-v1.mp4', contentType: 'video/mp4' },
  'elevador.jpg': { file: 'elevador.jpg', contentType: 'image/jpeg' },
  // KINEO-RECREATE-TRAVA-1011 — house candidates (docs/referencias/vitrine-10-0911), 716×1280, 24 fps; poster = frame at 1 s, 720 px.
  // Money fan (dinheiro) saiu por decisão do fundador em 10/11.
  'passarela.mp4': { file: 'recreate-passarela.mp4', contentType: 'video/mp4' },
  'passarela.jpg': { file: 'recreate-passarela.jpg', contentType: 'image/jpeg' },
  'escolha-o-favorito.mp4': { file: 'recreate-favorito.mp4', contentType: 'video/mp4' },
  'escolha-o-favorito.jpg': { file: 'recreate-favorito.jpg', contentType: 'image/jpeg' },
  'duelo-de-danca.mp4': { file: 'recreate-danca.mp4', contentType: 'video/mp4' },
  'duelo-de-danca.jpg': { file: 'recreate-danca.jpg', contentType: 'image/jpeg' },
} as const

/** KINEO-RECREATE-TRAVA-1011 — frames 84 and 168 (3.5 s and 7.0 s at 24 fps) of base and result feed the "not swapped" check. */
export const RECREATE_CHECK_FRAMES = [84, 168] as const
const swapSource = (id: string) => ({ preview: `/api/recreate/assets/${id}.mp4`, checkFrames: RECREATE_CHECK_FRAMES })

// KINEO-RECREATE-TRAVA-1011 [fundador 10/11: "tem que fazer tudo funcionar agora. Sem erros"] — a swap format reaches customers ONLY
// with swapApproved: true, set by hand after its paid swap test. swapInTest: only the exact house allowlist sees it.
export const RECREATE_FORMATS: readonly RecreateFormat[] = [
  { id: 'outfit-morph', title: 'Outfit Morph', ...swapSource('outfit-morph'), poster: '/api/recreate/assets/outfit-morph.png', seconds: 10, type: 'swap', prompt: RECREATE_SWAP_PROMPT, photoSlots: 1, swapApproved: false, swapInTest: true, swapNote: '10/11: 0 of 4 paid swaps; provider returned the original' },
  { id: 'elevador', title: 'Elevator', ...swapSource('elevador'), poster: '/api/recreate/assets/elevador.jpg', seconds: 10, type: 'swap', prompt: RECREATE_SWAP_PROMPT, photoSlots: 2, swapApproved: false, swapInTest: true, swapNote: '10/11: only 1 of the 2 people swaps (man 2 of 2, woman 0 of 2)' },
  { id: 'passarela', title: 'Runway walk', ...swapSource('passarela'), poster: '/api/recreate/assets/passarela.jpg', seconds: 10, type: 'swap', prompt: RECREATE_SWAP_PROMPT, photoSlots: 1, swapApproved: true, swapInTest: false, approvedOn: '2026-11-10', swapNote: '10/11 paid tests: 2 of 2 swaps; site test: clip 2bccfb65 delivered (40 credits)' },
  { id: 'escolha-o-favorito', title: 'Guess my favorite', ...swapSource('escolha-o-favorito'), poster: '/api/recreate/assets/escolha-o-favorito.jpg', seconds: 8, type: 'swap', prompt: RECREATE_SWAP_PROMPT, photoSlots: 2, swapApproved: true, swapInTest: false, approvedOn: '2026-11-10', swapNote: '10/11 paid tests: 2 of 2 swaps; site test: clip 8e485eef delivered, check swapped 2/2; 8 s = 45 credits (fundador 10/11: "Cobra 45")' },
  { id: 'duelo-de-danca', title: 'Dance duo', ...swapSource('duelo-de-danca'), poster: '/api/recreate/assets/duelo-de-danca.jpg', seconds: 10, type: 'swap', prompt: RECREATE_SWAP_PROMPT, photoSlots: 2, swapApproved: false, swapInTest: true, swapNote: '10/11 paid test: 0 of 1 (full body, small face: does not swap)' },
  ...CLIP_EFFECTS.filter(e => e.preview?.poster).map(e => ({
    id: `effect-${e.key.replaceAll('_', '-')}`, title: e.title, preview: e.preview!.video,
    poster: e.preview!.poster!, seconds: e.seconds, type: 'effect' as const, prompt: e.template ? e.sub : e.prompt,
    photoSlots: e.pair ? 2 : 1, effectKey: e.key,
  })),
]
export const recreateFormat = (id: unknown) => RECREATE_FORMATS.find(f => f.id === id) ?? null
/** KINEO-RECREATE-TRAVA-1011 — a swap is sold only at an approved tariff (RECREATE_PRICING). 8 s = 45 since 10/11 ("Cobra 45"). */
export const recreateSwapPriced = (f: RecreateFormat) => f.type !== 'swap' || recreateCreditCost(f.seconds) !== null
export const RECREATE_UNPRICED_ERROR = 'This video is not available yet: its price for this length is still being decided. Nothing was charged.'
export function recreateEffectCredits(f: RecreateFormat): number | null {
  const effect = CLIP_EFFECTS.find(e => e.key === f.effectKey)
  return effect ? clipEffectCredits(effect) : null
}
