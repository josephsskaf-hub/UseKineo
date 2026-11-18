import type { FilmQualitySnapshot } from '@/lib/filmComplete/qualityInheritance'
import { readFilmQualitySnapshot } from '@/lib/filmComplete/qualityInheritance'
import { epocaDaHistoria } from './elencoEpoca'
import { buildKling4ReferenceInput, buildKling4TrialInput, type Kling4CharacterReference } from '@/lib/kling4Trial'
import { kling4TrialClipCostUsd } from '@/lib/kling4TrialPolicy'

export function fixedCharacterEnabled(email: string | null | undefined, requested: unknown) {
  return requested === true && email?.trim().toLowerCase() === 'josephsskaf@gmail.com'
    && process.env.KLING4_FIXED_CHARACTER_ENABLED === 'true'
}

// Work from the cast actually accepted by the pipeline. A crowd, an object or an animal
// is not a substitute for the lead; never pick an unrelated scene's first image.
export function fixedCharacterReference(snapshot: FilmQualitySnapshot | null, story: string): Kling4CharacterReference | null {
  const lead = snapshot?.characters.find(c => c.protagonista)
  if (!snapshot || lead?.tipo !== 'humano') return null
  const url = snapshot.characterReferences.find(r => r.nome === lead.nome)?.url
    ?? snapshot.approvedStills.find(s => s.characterNames.length === 1 && s.characterNames[0] === lead.nome)?.url
  if (!url || !/^https:\/\/[^\s]+$/i.test(url)) return null
  const period = epocaDaHistoria(story, { anoPorExtenso: true })
  const era = period?.ano ?? period?.rotulo
  const setting = snapshot.environmentSheet?.trim()
  const wardrobe = /\b(?:wearing|dressed in)\s+([^.;\n]+)/i.exec(lead.canonica)?.[1]?.trim()
  const continuity = [
    'Keep the face and outfit of @Image1.',
    wardrobe ? Array.from(wardrobe).slice(0, 65).join('') + '.' : '',
    era ? `Use ${era} clothing, architecture and props.` : 'Match the clothing and setting of the story.',
    setting ? Array.from(setting).slice(0, 70).join('') : '',
  ].filter(Boolean).join(' ')
  return { imageUrl: url, continuity }
}

export type ReferenceRehearsalPlan = {
  story: string
  quality: unknown
  voiceovers?: string[]
  wordsPerSecond?: number
  measuredSpeechSeconds?: number
  approvedStills?: (string | null)[]
  shots: { prompt: string; duration: number }[]
}

// A prepared storyboard is necessary to preview an exact wire request without invoking
// the writer, image model or TTS. Client-supplied rehearsal data never enters live dispatch.
export function referenceRehearsal(value: unknown) {
  if (!value || typeof value !== 'object') return null
  const { story, quality, shots, voiceovers, wordsPerSecond = 1, measuredSpeechSeconds, approvedStills = [] } = value as Partial<ReferenceRehearsalPlan>
  if (typeof story !== 'string' || !Array.isArray(shots) || !shots.length || shots.length > 30 ||
      shots.some(s => !s || typeof s.prompt !== 'string' || !s.prompt.trim() || !Number.isInteger(s.duration) || s.duration < 1)) return null
  const total = shots.reduce((sum, shot) => sum + shot.duration, 0)
  if (total < 3 || total > 30) return null
  const snapshot = readFilmQualitySnapshot(quality)
  if (!snapshot || !Array.isArray(approvedStills) || approvedStills.length > shots.length ||
      approvedStills.some(url => url !== null && (typeof url !== 'string' || !/^https:\/\/[^\s]+$/i.test(url)))) return null
  const reference = fixedCharacterReference(snapshot, story)
  if (reference) return { dry_run: true, ...buildKling4ReferenceInput(shots, reference), estimated_video_cost_usd: kling4TrialClipCostUsd(total) }

  // Rehearse a legacy storyboard with its real keyframes and assigned timings.
  // The legacy dispatcher itself admits 15–30 s and at most five shots.
  const speech = voiceovers ?? shots.map(() => '')
  if (total < 15 || shots.length > 5 || !Array.isArray(speech) || speech.length !== shots.length ||
      speech.some(text => typeof text !== 'string') || !Number.isFinite(wordsPerSecond) || wordsPerSecond <= 0) return null
  const request = buildKling4TrialInput(shots.map(s => s.prompt), approvedStills,
    { voiceovers: speech, wordsPerSecond, clipSeconds: total, pelaVoz: measuredSpeechSeconds ? { segundosDaVoz: measuredSpeechSeconds } : null })
  const wireShots = request.input.multi_prompt as { prompt: string; duration: number }[]
  if (wireShots.some((shot, index) => shot.duration !== shots[index].duration)) return null
  return { dry_run: true, ...request, reference_applied: false, estimated_video_cost_usd: kling4TrialClipCostUsd(total) }
}
