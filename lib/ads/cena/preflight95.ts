// KINEO-ADS-CENA-95-PACING-2110 — one canonical text/voice/layout gate for planning and measured media.
import type { CenaInput } from './plan'
import type { Cena95Script } from './script95'
import type { Cena95Presenter } from './presenters95'
import type { CenaRoute } from './adapters'
import { cena95SpeechPolicy, cena95CountWords } from './speech95Policy'
import { cena95NativeSegments } from './adapters95'
import { cena95Captions, cena95DefaultWindows, cena95NarratedWindows, type Cena95Word } from './captions95'
import { cena95NarratedVoiceRequest, type Cena95VoiceLanguage } from './voice95'
import { cena95FinalTextElements } from './montage95'

export function cena95Preflight(script: Cena95Script, input: CenaInput, route: CenaRoute, presenter: Cena95Presenter, measured: { voiceSeconds?: number; words?: Cena95Word[]; product?: string } = {}) {
  // A canonical script already contains offer in benefit; never feed it back to the raw GPT parser.
  const rate = script.wordsPerSecond ?? 2.9, words = cena95CountWords(script.narration)
  if (!script.hook || !script.cta || script.narration !== `${script.beforeCta} ${script.cta}` || words / rate + script.pauseSeconds > 15) throw new Error('cena95_required_speech_does_not_fit')
  if (script.normalization && rate !== cena95SpeechPolicy(input.language).wordsPerSecond) throw new Error('cena95_speech_policy_mismatch')
  const mode = input.voice_mode ?? 'narrated'
  const native = mode === 'talking' ? cena95NativeSegments(script, route === 'kling3' ? [3, 7, 5] : route === 'seedance2' ? [3, 12] : [8, 7]) : []
  const voiceRequest = mode === 'narrated' ? cena95NarratedVoiceRequest({ beforeCta: script.beforeCta, cta: script.cta, pauseSeconds: script.pauseSeconds, estimatedWordsPerSecond: rate, language: (input.language ?? 'en') as Cena95VoiceLanguage, gender: presenter.gender, age: presenter.age, formato: input.formato }) : null
  const speechWindows = mode === 'narrated' && measured.voiceSeconds !== undefined ? cena95NarratedWindows(script, input.language ?? 'en', measured.voiceSeconds) : cena95DefaultWindows(script)
  const captions = cena95Captions({ text: script.narration, language: input.language ?? 'en', words: measured.words, speechWindows })
  const finalText = cena95FinalTextElements({ product: measured.product ?? input.frase, input, script }, captions.words)
  return { words, estimatedSeconds: words / rate + script.pauseSeconds, native, voiceRequest, speechWindows, captions, finalText }
}
