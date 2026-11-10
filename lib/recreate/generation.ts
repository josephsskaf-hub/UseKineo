import { ownedClipImageUrl, type ClipRequestInput } from '@/lib/clips/clipCatalog'
import { RECREATE_MOTION_ENABLED } from './access'
import { RECREATE_SWAP_PROMPT, RECREATE_UNPRICED_ERROR, recreateFormat, recreateSwapPriced } from './formats'
import { recreateCreditCost } from '@/lib/checkoutPricing'
export { RECREATE_PRICING } from '@/lib/checkoutPricing'

// Approved 09/11: new product tariff only; no change to existing clip/effect pricing.
export const RECREATE_USD_PER_SECOND = 0.30
export const RECREATE_MODEL = 'minimax/h3-max/recast'
export const RECREATE_PROVIDER_ORIGIN = 'https://www.usekineo.com'

/** Trusted server-only argument to submitClip. Never copied from a browser body. */
export interface RecreatePlan {
  body: ClipRequestInput
  model: typeof RECREATE_MODEL
  credits: number
  falUsd: number
  photos: string[]
  input: Record<string, unknown>
}
export type RecreatePlanResult = { ok: true; plan: RecreatePlan } | { ok: false; status: number; error: string }

export function planRecreate(raw: Record<string, unknown>, ctx: { userId: string; supabaseUrl: string; paying: boolean }): RecreatePlanResult {
  const bad = (error: string, status = 400): RecreatePlanResult => ({ ok: false, status, error })
  const f = recreateFormat(raw.format)
  if (!f || f.type !== 'swap') return bad('Choose a video from the Kineo catalog.')
  if (!recreateSwapPriced(f)) return bad(RECREATE_UNPRICED_ERROR, 409) // KINEO-RECREATE-TRAVA-1011 — a source length without an approved tariff is never sold
  if (raw.mode && raw.mode !== 'swap') return bad(RECREATE_MOTION_ENABLED ? 'This mode is not ready.' : 'This mode is unavailable.')
  if (raw.consent !== true) return bad('Confirm you have permission to use these photos.')
  const seconds = Number(raw.seconds)
  const credits = recreateCreditCost(seconds) // KINEO-RECREATE-TRAVA-1011 — one source of truth: 8 → 45 ('Cobra 45', 10/11), 10 → 40, 15 → 60
  if (credits === null) return bad('Choose an available duration.')
  if (seconds === 15 && !ctx.paying) return bad('Upgrade your plan to use this duration.', 402)
  // Recast inherits source duration; its API has no duration parameter. Never sell 15 s from a 10 s source.
  if (seconds !== f.seconds) return bad('This duration needs an approved source video of the same length.', 409)
  if (!Array.isArray(raw.photos) || raw.photos.length !== f.photoSlots) return bad('Add a photo for each person in this format.')
  const photos: string[] = []
  for (const value of raw.photos) {
    const url = typeof value === 'string' ? ownedClipImageUrl(value, ctx.userId, ctx.supabaseUrl) : null
    if (!url) return bad('Upload photos to your own account before continuing.', 403)
    photos.push(url)
  }
  const text = typeof raw.prompt === 'string' ? raw.prompt.trim() : ''
  if (text.length > 550) return bad('Keep the description under 550 characters.')
  const prompt = `${RECREATE_SWAP_PROMPT}${text && text !== RECREATE_SWAP_PROMPT ? ` Additional face instructions: ${text}` : ''}`
  return { ok: true, plan: {
    body: { engine: 'h3', seconds, aspect: null, prompt, imageUrl: photos[0] },
    model: RECREATE_MODEL, credits, falUsd: seconds * RECREATE_USD_PER_SECOND, photos,
    input: { video_url: RECREATE_PROVIDER_ORIGIN + f.preview, reference_image_urls: photos, prompt, resolution: '768P', enable_safety_checker: true },
  } }
}
