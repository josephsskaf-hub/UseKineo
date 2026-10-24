import { narrationWordCount } from '@/lib/textLanguage' // KINEO-IDIOMAS-FORMATOS-2410
// KINEO-ADS-CENA-95-2110 — fala calibrada sem preencher a contagem com alegações ou clichês.
import { inventedClaims, inventedNumbers } from '../scriptPrompt'
import { honestyIssues } from '../v2Honesty'
import type { AdsBrief } from '../types'
import type { CenaInput, CenaScript } from './plan'
import { repairCena95Text, type Cena95RepairOptions, type Cena95TextRepair } from './script95Repair' // KINEO-ADS-CENA-95-PACING-2110
export const CENA95_CLICHES = ['game changer', 'game-changer', 'revolutionary', 'revolucionario', 'voce precisa', 'you need this', 'elevate your', 'upgrade your life', 'must have', 'must-have', 'enjoy it', 'embrace the essence', 'transform your life', 'experimente a revolucao'] as const
export const CENA95_PAUSE_SECONDS = 0.35
export const CENA95_TARGET_WPS = 2.9
const clean = (x: unknown): string => typeof x === 'string' ? x.replace(/\s+/gu, ' ').trim() : ''
const fold = (s: string): string => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()
export const cena95WordCount = (s: string): number => narrationWordCount(clean(s)) // KINEO-IDIOMAS-FORMATOS-2410
export interface Cena95Script extends CenaScript { pain: string; demonstration: string; offer: string; spokenOffer?: string; rawBenefit?: string; beforeCta: string; words: number; hookEstimatedSeconds: number; estimatedSeconds: number; timingBasis: 'rate_estimate'; pauseSeconds: number; language?: string; wordsPerSecond?: number; normalization?: Cena95TextRepair['normalization'] }
export function parseCena95Script(raw: unknown, input: CenaInput, product: string, options: Cena95RepairOptions = {}): Cena95Script {
  // KINEO-ADS-CENA-95-PACING-2110 — length is repaired deterministically; honesty remains a hard constraint.
  const facts = [input.frase, input.oferta, input.cta, ...(input.beneficios ?? [])].filter(Boolean).join(' ')
  const brief: AdsBrief = { business: input.frase, offer: input.oferta ?? '', contact: '', cta: 'buy', audience: '', tone: 'direct', language: input.language ?? 'en', extra: { benefits: (input.beneficios ?? []).join('; '), typedCta: input.cta ?? '' } }
  const honest = (text: string) => !CENA95_CLICHES.some(c => fold(text).includes(c)) && !inventedNumbers(text, brief).length && !inventedClaims(text, brief).length && !honestyIssues(text, { source: facts, typed: facts, product: true, places: [], presenter: true }, 'narration').length
  const r = repairCena95Text(raw, input, product, { ...options, acceptSentence: honest })
  const { hooks, pain, demonstration, offer, spokenOffer, cta, wordsPerSecond, language, normalization } = r
  const beforeCta = [hooks[0], pain, demonstration, r.benefit, spokenOffer].filter(Boolean).join(' ')
  const narration = `${beforeCta} ${cta}`, words = cena95WordCount(narration), estimatedSeconds = words / wordsPerSecond + CENA95_PAUSE_SECONDS
  if (!honest(narration)) throw new Error('cena95_unsubstantiated_script')
  if (estimatedSeconds > 15) throw new Error('cena95_required_speech_does_not_fit')
  return { hooks, hook: hooks[0], pain, demonstration, use: [pain, demonstration].filter(Boolean).join(' '), benefit: [r.benefit, spokenOffer].filter(Boolean).join(' '), rawBenefit: r.benefit, offer, spokenOffer, cta, narration, beforeCta, words, estimatedSeconds, hookEstimatedSeconds: cena95WordCount(hooks[0]) / wordsPerSecond, pauseSeconds: CENA95_PAUSE_SECONDS, timingBasis: 'rate_estimate', wordsPerSecond, language, normalization }
}
