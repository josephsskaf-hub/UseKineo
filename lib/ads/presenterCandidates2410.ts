// KINEO-APRESENTADORES-2410 — preparation is separate from founder approval.
import candidates from './presenterCandidates2410.json'
import type { AdsV2PresenterEntry } from './v2Presenter'

export interface PresenterCandidate2410 extends Omit<AdsV2PresenterEntry, 'voice' | 'clip'> {
  style: string
  ethnicity: string
  voiceProfile: 'young' | 'adult' | 'mature'
  status: 'pending' | 'approved' | 'rejected'
  facePortrait: string | null
  reviewedBy: string | null
  reviewedAt: string | null
  checks: { eyesOpen: boolean; naturalHands: boolean; neutralClothes: boolean; identityMatch: boolean; voiceMatch: boolean }
  assetHashes: { portrait: string; facePortrait: string; voiceSample: string } | null
}

export const PRESENTER_CANDIDATES_2410: readonly PresenterCandidate2410[] = candidates as PresenterCandidate2410[]
export const PRESENTER_EXISTING_APPROVED_2410: readonly string[] = ['sofia', 'amara', 'rahul', 'kenji', 'jade', 'robert']
export function presenterCandidateById2410(id: unknown): PresenterCandidate2410 | null {
  return typeof id === 'string' ? PRESENTER_CANDIDATES_2410.find(p => p.id === id) ?? null : null
}

/** Promotion requires the founder's recorded review of both images and the voice.
 * The local admin also verifies actual bytes/hashes before saving; CI verifies them again.
 * Replacing an asset clears the decision. Pending/rejected entries never enter a picker,
 * including internal accounts and the legacy approved-only override.
 */
export function presenterCandidateApproved2410(p: PresenterCandidate2410): boolean {
  const keys = ['eyesOpen', 'naturalHands', 'neutralClothes', 'identityMatch', 'voiceMatch'] as const
  return /^[a-z]+$/.test(p.id) && ['woman', 'man'].includes(p.gender) &&
    Number.isInteger(p.ageMin) && Number.isInteger(p.ageMax) && p.ageMin >= 20 && p.ageMax <= 65 && p.ageMax >= p.ageMin &&
    p.voiceProfile === (p.ageMin >= 50 ? 'mature' : p.ageMax <= 30 ? 'young' : 'adult') &&
    p.status === 'approved' && p.reviewedBy === 'Joseph Skaf' &&
    typeof p.reviewedAt === 'string' && Number.isFinite(Date.parse(p.reviewedAt)) &&
    p.portrait === `/ads/presenters/${p.id}.webp` &&
    p.facePortrait === `/ads/presenters/${p.id}-face.webp` &&
    p.voiceSample === `/ads/presenters/${p.id}-voice.mp3` &&
    !!p.checks && Object.keys(p.checks).length === keys.length && keys.every(k => Object.prototype.hasOwnProperty.call(p.checks, k) && p.checks[k] === true) &&
    !!p.assetHashes && ['portrait', 'facePortrait', 'voiceSample'].every(k => /^[a-f0-9]{64}$/.test(p.assetHashes![k as keyof NonNullable<PresenterCandidate2410['assetHashes']>]))
}
export const PRESENTER_CANDIDATES_APPROVED_2410 = PRESENTER_CANDIDATES_2410.filter(presenterCandidateApproved2410)
export const PRESENTER_APPROVED_IDS_2410: readonly string[] = [...PRESENTER_EXISTING_APPROVED_2410, ...PRESENTER_CANDIDATES_APPROVED_2410.map(p => p.id)]
export const PRESENTER_APPROVED_ENTRIES_2410: readonly AdsV2PresenterEntry[] = PRESENTER_CANDIDATES_APPROVED_2410.map(p => ({
  id: p.id, name: p.name, gender: p.gender, ageMin: p.ageMin, ageMax: p.ageMax,
  tag: p.tag, look: p.look, pronoun: p.pronoun, portrait: p.portrait,
  voice: { engine: 'minimax' }, voiceSample: p.voiceSample, clip: null,
}))

/** One Nano Banana full-body image; face crop retains the same identity, at no second generation cost. */
export function presenterCandidatePortraitPrompt2410(p: PresenterCandidate2410): string {
  return `Photorealistic full-length head-to-toe portrait of ${p.look}. Fictional adult AI presenter, age ${p.ageMin} to ${p.ageMax}. Both eyes fully OPEN, looking directly at the camera, clear visible pupils, relaxed attentive expression, lips gently closed. Natural daylight from a large window, plain light neutral background. Neutral unbranded clothing and shoes, no text, no logos, no props. Both arms relaxed, both hands fully visible with five natural fingers each; anatomically correct hands. Entire body including head, hands and feet inside the frame with generous margins. Face large and sharply focused enough for a separate face crop. Stable straight camera, realistic skin texture, no beauty filter, no glamour retouching, no closed eyes, no sunglasses, no motion blur. Vertical 9:16.`
}
