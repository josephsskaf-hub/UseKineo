// KINEO-REGUA-UNICA-2026-09-14 — direção do fundador (14/09): planejamento e
// portão medem com a MESMA estimativa por configuração de voz, velocidade e
// idioma. Não é "trocar 2,3 por 3,1": hollywood (Kling 3/H3/Omni/S25, voz
// própria) segue 2,3 pal/s; clássicos (Seedance 1.5/Kling 2.5/Veo/Kineo 1, TTS
// da casa) 3,1 pal/s — as duas réguas da casa, numa fonte só.
// ESTIMATIVA, não áudio medido: a duração do arquivo entregue é lida do MP4
// (lib/mp4Duration) e gravada em `render_delivered_measured`.
// lib/narrationFit.ts está sob a trava 8.2 e NÃO é tocado: as funções abaixo
// envolvem a régua de lá (mesma aritmética, mesmas constantes exportadas).
import {
  narrationFit, autofitDown, WORDS_PER_SECOND, MIN_COVERAGE, MIN_AUTOFIT_DOWN_COVERAGE,
  AUTOFIT_DOWN_FLOOR_SECONDS, AUTOFIT_DOWN_STEP_SECONDS, type NarrationFit, type AutofitDown,
} from '@/lib/narrationFit'

export type SpeechFamily = 'classic' | 'hollywood'
export const SPEECH_RATE_BASE: Record<SpeechFamily, number> = { classic: 3.1, hollywood: 2.3 }
export interface SpeechRate {
  family: SpeechFamily
  wordsPerSecond: number
  speed: number
  language: string
  /** Sempre 'estimate': nenhuma régua aqui mede áudio. */
  basis: 'estimate'
}
export function speechRateFor(opts: { family: SpeechFamily; speed?: number | null; language?: string | null }): SpeechRate {
  const speed = typeof opts.speed === 'number' && Number.isFinite(opts.speed) && opts.speed > 0 ? Math.min(2, Math.max(0.5, opts.speed)) : 1
  // Idioma: sem medição que justifique fator; fica 1,0 e registrado como estimativa.
  const language = (opts.language ?? 'en').toString()
  const wordsPerSecond = Math.round(SPEECH_RATE_BASE[opts.family] * speed * 100) / 100
  return { family: opts.family, wordsPerSecond, speed, language, basis: 'estimate' }
}

/** narrationFit na régua da configuração. Com 2,3 é a própria narrationFit. */
export function narrationFitAt(script: string, targetSeconds: number, rate: SpeechRate): NarrationFit {
  const base = narrationFit(script, targetSeconds)
  if (rate.wordsPerSecond === WORDS_PER_SECOND) return base
  const speech = base.speech * (WORDS_PER_SECOND / rate.wordsPerSecond)
  const target = base.target
  if (target === 0) return { ...base, speech }
  const coverage = speech / target
  const ok = coverage >= MIN_COVERAGE
  return { speech, target, silence: target - speech, coverage, ok, missingWords: ok ? 0 : Math.ceil((target * MIN_COVERAGE - speech) * rate.wordsPerSecond) }
}

/** autofitDown na régua da configuração. Com 2,3 delega à própria autofitDown; senão, a mesma aritmética. */
export function autofitDownAt(script: string, requestedSeconds: number, rate: SpeechRate, opts: { floorSeconds?: number } = {}): AutofitDown {
  if (rate.wordsPerSecond === WORDS_PER_SECOND) return autofitDown(script, requestedSeconds, opts)
  const floor = Number.isFinite(opts.floorSeconds) && (opts.floorSeconds as number) > 0 ? (opts.floorSeconds as number) : AUTOFIT_DOWN_FLOOR_SECONDS
  const requested = Number.isFinite(requestedSeconds) && requestedSeconds > 0 ? requestedSeconds : 0
  const fit = narrationFitAt(script, requested, rate)
  const base = { requestedSeconds: requested, effectiveSeconds: requested, speechSeconds: fit.speech, coverage: fit.coverage, lost60sFloor: false }
  if (fit.speech <= 0) return { ...base, applied: false, reason: 'no_narration' }
  if (fit.ok) return { ...base, applied: false, reason: 'fits' }
  if (fit.coverage < MIN_AUTOFIT_DOWN_COVERAGE) return { ...base, applied: false, reason: 'coverage_below_floor' }
  const candidate = Math.floor(fit.speech / AUTOFIT_DOWN_STEP_SECONDS) * AUTOFIT_DOWN_STEP_SECONDS
  if (candidate < floor) return { ...base, applied: false, reason: 'below_floor_seconds' }
  if (candidate >= requested) return { ...base, applied: false, reason: 'refit_failed' }
  const refit = narrationFitAt(script, candidate, rate)
  if (!refit.ok) return { ...base, applied: false, reason: 'refit_failed' }
  return { ...base, applied: true, reason: 'applied', effectiveSeconds: candidate, lost60sFloor: requested >= 60 && candidate < 60 }
}
