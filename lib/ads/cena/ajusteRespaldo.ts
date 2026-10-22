// KINEO-ADS-CENA-RESPALDO-2110 — diagnose each spoken line, ask GPT twice, then replace only rejected lines.
import type { CenaInput, CenaJson, CenaScript } from './plan'
import type { AdsBrief } from '../types'
import { inventedClaims, inventedNumbers } from '../scriptPrompt'
import { honestyIssues } from '../v2Honesty'
import { adsV2GenericFiller, adsV2MissingBenefits } from '../v2AdsQualidade'
import { AI_TEXT_MODELS } from '@/lib/aiModels'

export interface AjusteIssue { field: string; phrase: string; rules: string[] }
export class AjusteScriptError extends Error {
  readonly reason_detail: string
  constructor(message: string, readonly issues: AjusteIssue[]) {
    super(message)
    this.reason_detail = issues.map(i => `${i.field}: ${i.phrase} (${i.rules.join('; ')})`).join('\n').slice(0, 1000)
  }
}
const clean = (v: unknown): string => typeof v === 'string' ? v.replace(/\s+/gu, ' ').trim() : ''
const fold = (s: string): string => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()
const esc = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&')
const words = (s: string): number => s.trim() ? s.trim().split(/\s+/u).length : 0
const data = (raw: unknown): Record<string, unknown> => {
  const r = typeof raw === 'string' ? JSON.parse(raw) : raw
  if (!r || typeof r !== 'object' || Array.isArray(r)) throw new AjusteScriptError('cena_invalid_json', [{ field: 'script', phrase: String(raw).slice(0, 300), rules: ['Return the requested JSON object.'] }])
  return r as Record<string, unknown>
}
const lines = (r: Record<string, unknown>): [string, string][] => [
  ...(Array.isArray(r.hooks) ? r.hooks.map((h, k): [string, string] => [`hooks.${k}`, clean(h)]) : []),
  ...['use', 'benefit', 'cta'].map((k): [string, string] => [k, clean(r[k])]),
]
const speech = (r: Record<string, unknown>): string => [Array.isArray(r.hooks) ? clean(r.hooks[0]) : '', clean(r.use), clean(r.benefit), clean(r.cta)].filter(Boolean).join(' ')
const source = (i: CenaInput): string => [i.frase, i.oferta, i.cta, ...(i.beneficios ?? [])].filter(Boolean).join(' ')
/** Preserve typed proper names; lowercase ordinary product nouns only inside a sentence. */
export function ajusteProductCase(raw: unknown, input: CenaInput, product: string): Record<string, unknown> {
  const r = data(raw), out: Record<string, unknown> = { ...r, ...(Array.isArray(r.hooks) ? { hooks: [...r.hooks] } : {}) }
  if (!product) return out
  const typed = input.frase.match(new RegExp(esc(product), 'iu'))?.[0] ?? product
  const common = /^(?:creme|cream|face|facial|skincare|tênis|tenis|shoes?|sneakers?|relógio|relogio|smartwatch|watch|perfume|bolsa|handbag|bag|chá|cha|tea|garrafa|bottle|suplemento|supplement|sérum|serum|sabonete|soap)$/iu
  const name = typed.split(/\s+/u).map(w => common.test(w) ? w.toLocaleLowerCase() : w).join(' ')
  for (const [field, text] of lines(r)) {
    const changed = text.replace(new RegExp(`(?<![\\p{L}\\p{N}])${esc(product)}(?![\\p{L}\\p{N}])`, 'giu'), (_m, offset: number) => {
      const start = !text.slice(0, offset).trim() || /[.!?]\s*$/u.test(text.slice(0, offset))
      return start && common.test(typed.split(/\s+/u)[0]) ? name.charAt(0).toLocaleUpperCase() + name.slice(1) : name
    })
    if (field.startsWith('hooks.')) (out.hooks as unknown[])[Number(field.slice(6))] = changed
    else out[field] = changed
  }
  return out
}
export function ajusteRespaldoIssues(raw: unknown, input: CenaInput, product: string): AjusteIssue[] {
  const r = data(raw), facts = source(input), typed = [facts], issues: AjusteIssue[] = []
  const brief: AdsBrief = { business: input.frase, offer: input.oferta ?? '', contact: '', cta: 'buy', audience: '', tone: 'direct', language: input.language ?? 'en', extra: { benefits: (input.beneficios ?? []).join('; '), typedCta: input.cta ?? '' } }
  for (const [field, text] of lines(r)) for (const phrase of text.split(/(?<=[.!?])\s+(?=[\p{Lu}¿¡])/u).filter(Boolean)) {
    const rules = [
      ...inventedNumbers(phrase, brief).map(n => `number not typed: ${n}`),
      ...inventedClaims(phrase, brief),
      ...honestyIssues(phrase, { source: facts, typed: facts, product: true, places: [], presenter: true, brand: product }, 'narration'),
      ...adsV2GenericFiller(phrase, typed).map(g => `generic unsupported copy: ${g}`),
    ]
    const exaggerations = phrase.match(/\b(?:on clouds|like never before|elevate your game|best|greatest|ultimate|perfect|unmatched|unbeatable|revolutionary|nas nuvens|como nunca antes|eleve (?:seu|o seu) (?:jogo|nível)|melhor|melhores|perfeit[oa]s?|inigualável|imbatível|revolucionári[oa]s?)\b/giu) ?? []
    rules.push(...exaggerations.filter(x => !fold(facts).includes(fold(x))).map(x => `superlative or metaphor not typed: ${x}`))
    if (/[—–]/u.test(phrase)) rules.push('Use complete sentences without dashes.')
    if (rules.length) issues.push({ field, phrase, rules })
  }
  const missing = adsV2MissingBenefits(speech(r), [...(input.beneficios ?? []), ...(input.oferta ? [input.oferta] : [])])
  if (missing.length) issues.push({ field: 'benefit', phrase: '', rules: missing.map(b => `missing typed benefit/offer: ${b}`) })
  if (words(speech(r)) > 40) {
    const selected = lines(r).filter(([f]) => !f.startsWith('hooks.') || f === 'hooks.0').flatMap(([f, t]) => t.split(/(?<=[.!?])\s+(?=[\p{Lu}¿¡])/u).map(s => [f, s] as [string, string]))
    const longest = selected.filter(([f]) => f !== 'cta').sort((a, b) => words(b[1]) - words(a[1]))[0]
    if (longest) issues.push({ field: longest[0], phrase: longest[1], rules: ['Speech exceeds the AJUSTE 40-word budget. Shorten this line; keep typed facts and CTA.'] })
  }
  return issues
}
const finish = (s: string): string => {
  const t = clean(s).replace(/[.!?]+$/u, '')
  return t ? t.charAt(0).toLocaleUpperCase() + t.slice(1) + '.' : ''
}
/** No invented property: only neutral grammar around the customer's own benefit text. */
function benefitSentence(benefit: string, product: string, pt: boolean): string {
  const b = clean(benefit).replace(/[.!?]+$/u, ''), low = b.charAt(0).toLocaleLowerCase() + b.slice(1)
  if (!b) return ''
  if (pt) {
    if (/^(?:não|pode|ajuda|é|tem|contém|hidrata|protege)(?=\s|$)/iu.test(b)) return finish(b)
    if (/^sem\s/iu.test(b)) return finish(`${product} vem ${low}`)
    if (/^(?:leve|confortável|respirável|macio|macia|fácil|resistente|impermeável)\b/iu.test(b)) return finish(`${product} é ${low}`)
    return finish(`${product} tem ${low}`)
  }
  if (/^(?:does|is|has|can|helps|keeps|lasts|contains)\b/iu.test(b)) return finish(`${product} ${low}`)
  const plural = /\b(?:shoes|sneakers|boots|trainers|leaves)\b/iu.test(product)
  const adjective = /^(?:lightweight|light|comfortable|breathable|soft|easy|waterproof|fragrance-free|scent-free|unscented|made\s)/iu.test(b) && !/\b(?:material|mesh|fabric|design|battery|support)$/iu.test(b)
  return finish(`${product} ${adjective ? plural ? 'are' : 'is' : plural ? 'have' : 'has'} ${low}`)
}
export function repairAjusteLines(raw: unknown, input: CenaInput, product: string, issues: readonly AjusteIssue[]): Record<string, unknown> {
  const r = data(raw), pt = (input.language ?? 'en').toLowerCase().startsWith('pt'), label = product
  const benefit = clean(input.beneficios?.[0]).replace(/[.!?]+$/u, '')
  const hooks = [benefit && words(benefit) <= 10 ? `${benefit}?` : pt ? `Conhece ${label}?` : `Have you seen ${label}?`, pt ? `Vamos conhecer ${label}?` : `Meet ${label}?`, pt ? `${label} na sua rotina?` : `A closer look at ${label}?`]
  const neutral: Record<string, string> = { use: finish(`${pt ? 'Conheça' : 'Meet'} ${label}`), benefit: [...(input.beneficios ?? []).map(b => benefitSentence(b, label, pt)), ...(input.oferta ? [finish(input.oferta)] : [])].join(' '), cta: finish(input.cta || `${pt ? 'Peça' : 'Choose'} ${label}`) }
  const out: Record<string, unknown> = { ...r, hooks: Array.isArray(r.hooks) ? [...r.hooks] : [] }
  for (const issue of issues) {
    const field = issue.field
    if (field.startsWith('hooks.')) {
      const slot = Number(field.slice(6)); let h = hooks[slot]
      h = [h, ...hooks, pt ? `Quer conhecer ${label}?` : `Ready to meet ${label}?`].find(candidate => !(out.hooks as unknown[]).some((x, k) => k !== slot && fold(clean(x)) === fold(candidate))) ?? h
      ;(out.hooks as unknown[])[slot] = finish(h).replace(/\.$/u, '?')
    } else if (Object.hasOwn(neutral, field)) {
      const original = clean(out[field])
      if (!issue.phrase && field === 'benefit') {
        const missing = adsV2MissingBenefits(speech(out), [...(input.beneficios ?? []), ...(input.oferta ? [input.oferta] : [])])
        out[field] = [original, ...missing.map(b => b === input.oferta ? finish(b) : benefitSentence(b, label, pt))].filter(Boolean).join(' ')
      } else {
        const remaining = original.replace(issue.phrase, '').trim()
        let replacement = remaining.includes(neutral[field]) ? '' : neutral[field]
        if (field === 'benefit') {
          const missing = adsV2MissingBenefits(speech({ ...out, benefit: remaining }), [...(input.beneficios ?? []), ...(input.oferta ? [input.oferta] : [])])
          replacement = missing.map(b => b === input.oferta ? finish(b) : benefitSentence(b, label, pt)).join(' ')
          if (!remaining && !replacement) replacement = finish(`${pt ? 'Conheça' : 'Meet'} ${label}`)
        }
        out[field] = original.replace(issue.phrase, replacement).replace(/\s+/gu, ' ').trim()
      }
    }
  }
  return ajusteProductCase(out, input, product)
}
export async function writeAjusteScript(input: CenaInput, product: string, call: CenaJson, parse: (draft: unknown) => CenaScript, prompt: string): Promise<CenaScript> {
  let draft: unknown, error: unknown, issues: AjusteIssue[] = []
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      draft = await call({ model: AI_TEXT_MODELS.ads, system: prompt, images: [], text: JSON.stringify({ frase: input.frase, oferta: input.oferta, beneficios: input.beneficios, product, cta: input.cta, correction: attempt ? { rule: 'Use only the typed sentence, offer and benefits. No unsupported superlatives. Change only rejected lines, keep the other lines verbatim.', rejected: issues, previous: draft } : undefined }) })
      return parse(draft)
    } catch (e) { error = e; issues = e instanceof AjusteScriptError ? e.issues : [{ field: 'script', phrase: typeof draft === 'string' ? draft.slice(0, 300) : JSON.stringify(draft ?? '').slice(0, 300), rules: [e instanceof Error ? e.message : 'invalid_script'] }] }
  }
  if (error instanceof AjusteScriptError && error.message === 'cena_unsubstantiated_script') {
    // Recheck neutral repairs; never silently disable factual gates. Unrelated good lines survive verbatim.
    for (let round = 0; round < 6; round++) {
      draft = repairAjusteLines(draft, input, product, issues)
      try { return parse(draft) } catch (e) {
        if (!(e instanceof AjusteScriptError) || e.message !== 'cena_unsubstantiated_script') throw e
        if (JSON.stringify(e.issues) === JSON.stringify(issues)) throw new AjusteScriptError('cena_ajuste_required_text_does_not_fit', e.issues)
        issues = e.issues
      }
    }
    throw new AjusteScriptError('cena_ajuste_required_text_does_not_fit', issues)
  }
  throw error instanceof AjusteScriptError ? error : new AjusteScriptError(error instanceof Error ? error.message : 'cena_script_failed', issues)
}
