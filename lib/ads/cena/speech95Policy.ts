// KINEO-ADS-CENA-95-PACING-2110 — conservative editorial budgets, NOT measured voice speeds.
export const CENA95_SPEECH_POLICY_VERSION = 'KINEO-ADS-CENA-95-PACING-2110' as const
export function cena95SpeechPolicy(language = 'en') {
  const locale = language.toLowerCase().split('-')[0]
  const wordsPerSecond = locale === 'pt' ? 2.25 : locale === 'es' ? 2.4 : 2.6
  const pauseSeconds = 0.35, seconds = 15, hookSeconds = 1.5
  return { version: CENA95_SPEECH_POLICY_VERSION, language: locale, wordsPerSecond, pauseSeconds, seconds, hookSeconds,
    maxWords: Math.floor((seconds - pauseSeconds) * wordsPerSecond), maxHookWords: Math.floor(hookSeconds * wordsPerSecond),
    basis: 'conservative_editorial_budget_not_measured_voice' as const }
}
export const cena95CountWords = (s: string): number => s.trim().split(/\s+/u).filter(Boolean).length
