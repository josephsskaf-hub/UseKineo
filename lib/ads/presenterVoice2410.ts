// KINEO-APRESENTADORES-2410 — editorial voice profiles for the new, founder-reviewed candidates only.
// IDs rechecked 24/10/2026: https://platform.minimax.io/docs/faq/system-voice-id
// Model and 37 explicit language boosts: https://fal.ai/models/fal-ai/minimax/speech-2.8-hd/api
// Prepared from documented voices; gender/age fit and accent still require listening, not a claim of audio validation.
import { minimaxLanguageBoost, narrationLanguage } from '@/lib/textLanguage'
import { CENA95_MINIMAX_ENDPOINT, CENA95_NARRATOR_VOICES, type Cena95VoiceAge } from './cena/voice95'

export interface PresenterCandidateVoiceEntry2410 {
  gender: 'woman' | 'man'
  ageMin: number
  ageMax?: number
}

export function presenterCandidateVoiceAge2410(entry: PresenterCandidateVoiceEntry2410): Cena95VoiceAge {
  const minimum = entry?.ageMin, maximum = entry?.ageMax ?? minimum
  if (!entry || !['woman', 'man'].includes(entry.gender) || !Number.isInteger(minimum) || !Number.isInteger(maximum) || minimum < 20 || maximum > 65 || maximum < minimum) throw new Error('presenter_candidate_voice_bad_profile')
  return minimum >= 50 ? 'mature' : maximum <= 30 ? 'young_adult' : 'adult'
}

/** Preserve age and gender across languages; never fall back to the provider's default voice. */
export function presenterCandidateVoice2410(entry: PresenterCandidateVoiceEntry2410, language: unknown): { model: string; voiceId: string; languageBoost: string; speed: number } {
  const age = presenterCandidateVoiceAge2410(entry), code = narrationLanguage(language), languageBoost = minimaxLanguageBoost(code)
  // Urdu/Bengali are legacy app languages, outside the provider's explicit 37-language contract.
  if (!code || languageBoost === 'auto') throw new Error('presenter_candidate_voice_language_unsupported')
  const gender = entry.gender === 'man' ? 'male' : 'female'
  // The existing native EN/PT/ES age profiles are kept. Other supported languages use the documented
  // English profile multilingually with their own explicit language boost, preserving the selected voice age/gender.
  // This is an editorial choice, not proof of native accent or a measured apparent age in every language.
  const voices = code === 'pt' || code === 'es' ? CENA95_NARRATOR_VOICES[code] : CENA95_NARRATOR_VOICES.en
  return { model: CENA95_MINIMAX_ENDPOINT, voiceId: voices[gender][age], languageBoost, speed: 1 }
}
