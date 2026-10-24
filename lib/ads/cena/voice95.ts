import { minimaxLanguageBoost, minimaxVoiceFor, narrationLanguage, type NarrationLanguage } from '@/lib/textLanguage' // KINEO-IDIOMAS-FORMATOS-2410
// KINEO-ADS-CENA-95-2110 — MiniMax existente, contrato conferido em 21/10/2026; nenhum SDK, env ou efeito neste módulo.
export const CENA95_MINIMAX_ENDPOINT = 'fal-ai/minimax/speech-2.8-hd'
export const CENA95_VOICE_DOCS = 'https://fal.ai/models/fal-ai/minimax/speech-2.8-hd/api'
export const CENA95_VOICE_CATALOG_SOURCE = 'https://platform.minimax.io/docs/faq/system-voice-id'
export type Cena95VoiceLanguage = NarrationLanguage // KINEO-IDIOMAS-FORMATOS-2410
export type Cena95VoiceGender = 'female' | 'male'
export type Cena95VoiceAge = 'young_adult' | 'adult' | 'mature'
type Voices = Record<Cena95VoiceGender, Record<Cena95VoiceAge, string>>
/** IDs documentados, não uma alegação de idade exata ou de qualidade vocal já ouvida/testada. */
export const CENA95_NARRATOR_VOICES: Record<'en' | 'pt' | 'es', Voices> = {
  en: { female: { young_adult: 'English_compelling_lady1', adult: 'English_ConfidentWoman', mature: 'English_Wiselady' }, male: { young_adult: 'English_ReservedYoungMan', adult: 'English_Trustworth_Man', mature: 'English_Deep-VoicedGentleman' } },
  pt: { female: { young_adult: 'Portuguese_LovelyLady', adult: 'Portuguese_ConfidentWoman', mature: 'Portuguese_Wiselady' }, male: { young_adult: 'Portuguese_ReservedYoungMan', adult: 'Portuguese_ReliableMan', mature: 'Portuguese_Deep-VoicedGentleman' } },
  es: { female: { young_adult: 'Spanish_SophisticatedLady', adult: 'Spanish_ConfidentWoman', mature: 'Spanish_Wiselady' }, male: { young_adult: 'Spanish_ReservedYoungMan', adult: 'Spanish_ReliableMan', mature: 'Spanish_Deep-tonedMan' } },
}
export interface Cena95NarratedVoiceInput {
  text?: string; beforeCta?: string; cta?: string; pauseSeconds?: number;
  language: Cena95VoiceLanguage; gender: Cena95VoiceGender; age: Cena95VoiceAge;
  formato?: 'ugc' | 'product' | 'product_in_hand' | 'unboxing'; speed?: number; estimatedWordsPerSecond?: number;
}
export function cena95NarratedVoiceRequest(data: Cena95NarratedVoiceInput) {
  const clean = (v: unknown) => typeof v === 'string' ? v.replace(/\s+/gu, ' ').trim() : ''
  const split = data.beforeCta !== undefined || data.cta !== undefined
  if (split && (data.text !== undefined || !clean(data.beforeCta) || !clean(data.cta))) throw new Error('cena95_voice_bad_cta_parts')
  if (!split && data.pauseSeconds !== undefined) throw new Error('cena95_voice_pause_needs_cta_parts')
  const pause = split ? data.pauseSeconds ?? 0.35 : 0
  if (split && (!Number.isFinite(pause) || pause < 0.01 || pause > 99.99)) throw new Error('cena95_voice_bad_pause')
  const text = split ? `${clean(data.beforeCta)} <#${pause.toFixed(2)}#> ${clean(data.cta)}` : clean(data.text)
  if (!text || text.length > 10_000) throw new Error('cena95_voice_bad_text')
  const language = data.language, gender = data.gender, age = data.age
  if (!narrationLanguage(language) || !['female', 'male'].includes(gender) || !['young_adult', 'adult', 'mature'].includes(age)) throw new Error('cena95_voice_bad_profile')
  if (data.formato !== undefined && !['ugc', 'product', 'product_in_hand', 'unboxing'].includes(data.formato)) throw new Error('cena95_voice_bad_format')
  // Direções de planejamento independentes, não uma calibração medida de speed→palavras/s; a resposta mede duration_ms.
  const speed = data.speed ?? 1.05, wps = data.estimatedWordsPerSecond ?? 2.9
  if (!Number.isFinite(speed) || speed < 0.5 || speed > 2) throw new Error('cena95_voice_bad_speed')
  if (!Number.isFinite(wps) || wps < 2 || wps > 2.9) throw new Error('cena95_voice_bad_estimated_rate') // KINEO-ADS-CENA-95-PACING-2110 — conservative per-language planning; model speed remains unchanged.
  const legacy = language === 'en' || language === 'pt' || language === 'es' ? CENA95_NARRATOR_VOICES[language] : null // KINEO-IDIOMAS-FORMATOS-2410
  const voiceId = legacy?.[gender][age] ?? minimaxVoiceFor(language, gender) // KINEO-IDIOMAS-FORMATOS-2410
  const languageBoost = minimaxLanguageBoost(language) // KINEO-IDIOMAS-FORMATOS-2410
  const formato = data.formato ?? 'product'
  const emotion: 'happy' | 'neutral' = formato === 'ugc' ? 'happy' : 'neutral'
  return {
    endpoint: CENA95_MINIMAX_ENDPOINT,
    input: { prompt: text, output_format: 'url' as const, language_boost: languageBoost,
      voice_setting: { voice_id: voiceId, speed, pitch: 0, vol: 1, emotion },
      audio_setting: { format: 'mp3' as const, sample_rate: 44100, bitrate: 128000, channel: 1 },
    },
    profile: { language, gender, age, voiceId, formato, style: formato === 'ugc' ? 'conversational' : 'confident_product_demonstration',
      ageBasis: 'editorial_direction_not_measured_age', availability: 'documented_not_audio_validated', source: CENA95_VOICE_CATALOG_SOURCE },
    // Limite conservador: conta todos os caracteres enviados, inclusive espaços, marcador e pares UTF-16.
    billingCharacters: text.length,
    estimated: { wordsPerSecond: wps, seconds: text.replace(/<#\d+(?:\.\d+)?#>/gu, '').trim().split(/\s+/u).length / wps + pause, pauseSeconds: pause, basis: 'planning_assumption_not_measured' },
  }
}
/** O endpoint fornece duração e arquivo, não word timestamps. Não inventar tempos a partir da previsão de palavras/s. */
export function cena95VoiceResult(raw: unknown): { url: string; seconds: number; timingSource: 'not_returned_by_endpoint' } {
  const envelope = raw && typeof raw === 'object' ? raw as Record<string, unknown> : null
  const body = envelope?.data && typeof envelope.data === 'object' ? envelope.data as Record<string, unknown> : envelope
  const audio = body?.audio && typeof body.audio === 'object' ? body.audio as Record<string, unknown> : null
  let url: URL
  try { url = new URL(typeof audio?.url === 'string' ? audio.url : '') } catch { throw new Error('cena95_voice_bad_audio') }
  if (url.protocol !== 'https:' || url.username || url.password) throw new Error('cena95_voice_bad_audio')
  const ms = body?.duration_ms
  if (typeof ms !== 'number' || !Number.isInteger(ms) || ms <= 0) throw new Error('cena95_voice_missing_duration')
  if (ms > 15_000) throw new Error('cena95_voice_does_not_fit')
  return { url: url.href, seconds: ms / 1000, timingSource: 'not_returned_by_endpoint' }
}
