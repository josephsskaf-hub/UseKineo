// KINEO-ADS-CENA-95-2110 — fala calibrada sem preencher a contagem com alegações ou clichês.
import { inventedClaims, inventedNumbers } from '../scriptPrompt'
import { honestyIssues } from '../v2Honesty'
import type { AdsBrief } from '../types'
import type { CenaInput, CenaScript } from './plan'
export const CENA95_CLICHES = ['game changer', 'game-changer', 'revolutionary', 'revolucionario', 'voce precisa', 'you need this', 'elevate your', 'upgrade your life', 'must have', 'must-have', 'enjoy it', 'embrace the essence', 'transform your life', 'experimente a revolucao'] as const
export const CENA95_PAUSE_SECONDS = 0.35
export const CENA95_TARGET_WPS = 2.9
const clean = (x: unknown): string => typeof x === 'string' ? x.replace(/\s+/gu, ' ').trim() : ''
const fold = (s: string): string => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()
export const cena95WordCount = (s: string): number => clean(s).split(/\s+/u).filter(Boolean).length
export interface Cena95Script extends CenaScript { pain: string; demonstration: string; offer: string; beforeCta: string; words: number; hookEstimatedSeconds: number; estimatedSeconds: number; timingBasis: 'rate_estimate'; pauseSeconds: number }
export function parseCena95Script(raw: unknown, input: CenaInput, product: string): Cena95Script {
  const r = (typeof raw === 'string' ? JSON.parse(raw) : raw) as Record<string, unknown>
  if (!r || typeof r !== 'object') throw new Error('cena95_script_json')
  const hooks = Array.isArray(r.hooks) ? r.hooks.map(clean) : []
  if (hooks.length !== 3 || new Set(hooks.map(fold)).size !== 3 || hooks.some(h => !h || cena95WordCount(h) > 7 || cena95WordCount(h) / CENA95_TARGET_WPS > 1.5)) throw new Error('cena95_hook_too_long')
  const pain = clean(r.pain), demonstration = clean(r.demonstration), benefit = clean(r.benefit), offer = clean(r.offer), cta = clean(r.cta)
  if (!pain || !demonstration || !benefit || !cta || offer !== (input.oferta ?? '')) throw new Error('cena95_script_structure')
  const beforeCta = [hooks[0], pain, demonstration, benefit, offer].filter(Boolean).join(' ')
  const narration = `${beforeCta} ${cta}`, words = cena95WordCount(narration)
  const estimatedSeconds = words / CENA95_TARGET_WPS + CENA95_PAUSE_SECONDS
  if (words < 39 || words > 43 || estimatedSeconds > 15 || words / 15 < 2.6 || words / 15 > 2.9) throw new Error('cena95_speech_pacing')
  const facts = [input.frase, input.oferta, ...(input.beneficios ?? [])].join(' ')
  const all = [...hooks, pain, demonstration, benefit, offer, cta].join(' ')
  if (CENA95_CLICHES.some(c => fold(all).includes(c))) throw new Error('cena95_cliche')
  if ((input.beneficios ?? []).some(b => !fold(benefit).includes(fold(b)))) throw new Error('cena95_missing_typed_benefit')
  const name = fold(product).split(/\s+/).filter(w => w.length > 2)
  if (name.length && !name.some(w => fold(cta).includes(w))) throw new Error('cena95_specific_cta_required')
  const brief: AdsBrief = { business: input.frase, offer: input.oferta ?? '', contact: '', cta: 'buy', audience: '', tone: 'direct', language: input.language ?? 'en', extra: { benefits: (input.beneficios ?? []).join('; ') } }
  if (inventedNumbers(all, brief).length || inventedClaims(all, brief).length || honestyIssues(all, { source: facts, typed: facts, product: true, places: [], presenter: true }, 'narration').length) throw new Error('cena95_unsubstantiated_script')
  return { hooks: hooks as [string, string, string], hook: hooks[0], pain, demonstration, use: [pain, demonstration].join(' '), benefit: [benefit, offer].filter(Boolean).join(' '), offer, cta, narration, beforeCta, words, estimatedSeconds, hookEstimatedSeconds: cena95WordCount(hooks[0]) / CENA95_TARGET_WPS, pauseSeconds: CENA95_PAUSE_SECONDS, timingBasis: 'rate_estimate' }
}
