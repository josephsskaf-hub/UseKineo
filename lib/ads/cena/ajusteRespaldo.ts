// KINEO-ADS-CENA-RESPALDO-2110 — diagnose each spoken line, ask GPT twice, then replace only rejected lines.
import type { CenaInput, CenaJson, CenaScript } from './plan'
import type { AdsBrief } from '../types'
import { inventedClaims, inventedNumbers } from '../scriptPrompt'
import { honestyIssues } from '../v2Honesty'
import { adsV2GenericFiller, adsV2MissingBenefits } from '../v2AdsQualidade'
import { AI_TEXT_MODELS } from '@/lib/aiModels'
import type { AjusteQualityNote } from './ajusteQuality' // KINEO-ADS-CENA-SEGUE-2110

export interface AjusteIssue { field: string; phrase: string; rules: string[]; missing?: boolean }
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
const commonProductWord = /^(?:creme|cream|face|facial|hidratante|hydrating|moisturizing|moisturising|skincare|tênis|tenis|shoes?|sneakers?|relógio|relogio|smartwatch|watch|perfume|bolsa|handbag|bag|chá|cha|tea|garrafa|bottle|suplemento|supplement|sérum|serum|sabonete|soap)$/iu // KINEO-ADS-CENA-TEXTO-2310
const truncatedCta = (text: string): boolean => /(?:…|\.{3}|[-—–])\s*[.!?”"']*$/u.test(text) || /\b(?:gar|get|e|ou|para|com|and|or|to|with)\s*[.!?”"']*$/iu.test(text) // KINEO-ADS-CENA-TEXTO-2310 — includes the clipped gar./get. residue of the old punctuation cleanup; never guess the missing words.
const sameLine = (a: string, b: string): boolean => fold(clean(a)).replace(/[.!?]+$/u, '') === fold(clean(b)).replace(/[.!?]+$/u, '') // KINEO-ADS-CENA-TEXTO-2310
const typedSentence = (text: string, input: CenaInput): boolean => [input.cta, input.oferta, ...(input.beneficios ?? [])].some(value => !!value && sameLine(text, value)) // KINEO-ADS-CENA-TEXTO-2310
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
  const common = commonProductWord // KINEO-ADS-CENA-TEXTO-2310
  const name = typed.split(/\s+/u).map(w => common.test(w) && !/^\p{Lu}{2,}$/u.test(w) && !/\p{Ll}\p{Lu}/u.test(w) ? w.toLocaleLowerCase() : w).join(' ') // KINEO-ADS-CENA-TEXTO-2310 — preserve uppercase/camel-case brand spelling, lowercase ordinary descriptive words.
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
  for (const [field, text] of lines(r)) for (const phrase of text.split(/(?<=[.!?])\s+/u).filter(Boolean)) {
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
  for (const [field, phrase] of lines(r).filter(([f]) => f.startsWith('hooks.'))) if (words(phrase) > 10) issues.push({ field, phrase, rules: ['Hook exceeds 10 words; use a short neutral question from the typed input.'] })
  const missing = adsV2MissingBenefits(speech(r), [...(input.beneficios ?? []), ...(input.oferta ? [input.oferta] : [])])
  if (missing.length) issues.push({ field: 'benefit', phrase: clean(r.benefit), missing: true, rules: missing.map(b => `missing typed benefit/offer: ${b}`) })
  if ((input.beneficios?.length || input.oferta) && !clean(r.benefit)) issues.push({ field: 'benefit', phrase: '', missing: true, rules: ['The benefit field is empty despite supplied benefits/offer. Write a natural sentence there, even when a hook already mentions the fact.'] }) // KINEO-ADS-CENA-TEXTO-2310
  if (truncatedCta(clean(r.cta))) issues.push({ field: 'cta', phrase: clean(r.cta), rules: ['The CTA is truncated or ends in an unfinished conjunction/preposition. Return a complete action; preserve the entire typed CTA when supplied.'] }) // KINEO-ADS-CENA-TEXTO-2310
  const named = product ? new RegExp(`(?<![\\p{L}\\p{N}])${esc(product)}(?![\\p{L}\\p{N}])`, 'iu') : null // KINEO-ADS-CENA-TEXTO-2310
  const selected = lines(r).filter(([field]) => !field.startsWith('hooks.') || field === 'hooks.0') // KINEO-ADS-CENA-TEXTO-2310
  for (const [field, text] of selected) for (const phrase of text.split(/(?<=[.!?])\s+/u).filter(Boolean)) if (product && !typedSentence(phrase, input) && new RegExp(`^(?:(?:the|o|a)\\s+)?${esc(product)}\\s+(?:tem|têm|has|have)\\b`, 'iu').test(phrase)) issues.push({ field, phrase, rules: ['Replace the mechanical product-name + tem/has/have template with a natural complete sentence or pronoun, preserving the typed benefit.'] }) // KINEO-ADS-CENA-TEXTO-2310
  if (!(input.language ?? 'en').toLowerCase().startsWith('pt') && named && selected.filter(([, text]) => named.test(text.replace(/https?:\/\/\S+|www\.\S+|\b(?:code|coupon|cupom|código)\s+\S+/giu, ''))).length >= 3) issues.push({ field: 'use', phrase: clean(r.use), rules: ['style: Product name repeats across the selected lines. Name it once, then use natural pronouns or benefit-leading sentences; preserve literal CTA, URLs and codes.'] }) // KINEO-ADS-CENA-TEXTO-2310
  if (words(speech(r)) > 40) {
    const selected = lines(r).filter(([f]) => !f.startsWith('hooks.') || f === 'hooks.0').flatMap(([f, t]) => t.split(/(?<=[.!?])\s+/u).map(s => [f, s] as [string, string]))
    const longest = words(clean(r.cta)) > 40 ? ['cta', clean(r.cta)] : selected.filter(([f]) => f !== 'cta').sort((a, b) => words(b[1]) - words(a[1]))[0]
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
    if (/^[\p{Lu}\p{N}]/u.test(benefit) && /[.!?]$/u.test(clean(benefit)) && /(?:^|\s)(?:não|pode|ajuda|é|tem|contém|hidrata|protege|oferece|dura)(?=\s|$)/iu.test(b)) return clean(benefit) // KINEO-ADS-CENA-TEXTO-2310 — a complete typed sentence is data, not a noun fragment to reframe.
    if (/^(?:não|pode|ajuda|é|tem|contém|hidrata|protege)(?=\s|$)/iu.test(b)) return finish(b)
    if (/^sem\s/iu.test(b)) return `Você prefere ${low}?` // KINEO-ADS-CENA-TEXTO-2310 — complete neutral question, no inferred formula, ingredient or causal result.
    if (/^(?:leve|confortável|respirável|macio|macia|fácil|resistente|impermeável)\b/iu.test(b)) return finish(`É ${low}`) // KINEO-ADS-CENA-TEXTO-2310
    return finish(/^com\s/iu.test(b) ? `Conte ${low}` : `Conte com ${low}`) // KINEO-ADS-CENA-TEXTO-2310 — the original benefit remains intact; never construct "product tem com ...".
  }
  const plural = /\b(?:shoes|sneakers|boots|trainers|leaves)\b/iu.test(product)
  if (/^.+\s(?:does|is|are|has|have|can|helps?|keeps?|lasts?|contains?)\s/iu.test(b)) return finish(b) // KINEO-ADS-CENA-TEXTO-2310 — preserve a complete supplied sentence.
  if (/^(?:does|is|has|can|helps|keeps|lasts|contains)\b/iu.test(b)) return finish(`${plural ? 'They' : 'It'} ${plural ? low.replace(/^(?:does|is|has|helps|keeps|lasts|contains)\b/iu, word => ({ does: 'do', is: 'are', has: 'have', helps: 'help', keeps: 'keep', lasts: 'last', contains: 'contain' } as Record<string, string>)[word.toLowerCase()] ?? word) : low}`) // KINEO-ADS-CENA-TEXTO-2310
  const adjective = /^(?:lightweight|light|comfortable|breathable|soft|easy|waterproof|fragrance-free|scent-free|unscented|made\s)/iu.test(b) && !/\b(?:material|mesh|fabric|design|battery|support)$/iu.test(b)
  if (adjective) return finish(`${plural ? "They're" : "It's"} ${low}`) // KINEO-ADS-CENA-TEXTO-2310
  return finish(`You get ${/^(?:a|an|the|no|more|less|\d+\s)/iu.test(b) || /(?:shipping|support|hydration|comfort|protection|vitamin\s|ingredients?)\b/iu.test(b) ? '' : /^[aeiou]/iu.test(b) ? 'an ' : 'a '}${low}`) // KINEO-ADS-CENA-TEXTO-2310 — literal noun benefit with a viewer subject, never product-name + has.
}
export function repairAjusteLines(raw: unknown, input: CenaInput, product: string, issues: readonly AjusteIssue[]): Record<string, unknown> {
  const r = ajusteProductCase(raw, input, product), pt = (input.language ?? 'en').toLowerCase().startsWith('pt'), label = product
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
      if (issue.missing && field === 'benefit') {
        const missing = adsV2MissingBenefits(speech(out), [...(input.beneficios ?? []), ...(input.oferta ? [input.oferta] : [])])
        out[field] = original ? [original, ...missing.map(b => b === input.oferta ? finish(b) : benefitSentence(b, label, pt))].filter(Boolean).join(' ') : neutral.benefit // KINEO-ADS-CENA-TEXTO-2310 — keep a benefit sentence in its own field even if the hook already carried the same fact.
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
// KINEO-ADS-CENA-SEGUE-2110 — schema/quality repairs are shared by planning and every resumed preflight.
export function ajusteDraft(raw: unknown): Record<string, unknown> {
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    const r = raw as Record<string, unknown>
    return r.script && typeof r.script === 'object' && !Array.isArray(r.script) ? r.script as Record<string, unknown> : r
  }
  if (typeof raw !== 'string') return {}
  const text = raw.trim().replace(/^```(?:json)?\s*/iu, '').replace(/\s*```$/u, '')
  for (const candidate of [text, text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1)]) {
    try { const r = JSON.parse(candidate.replace(/,\s*([}\]])/gu, '$1')); if (r && typeof r === 'object' && !Array.isArray(r)) return ajusteDraft(r) } catch { /* bounded structural repair below */ }
  }
  const recovered: Record<string, unknown> = {}
  for (const key of ['use', 'benefit', 'cta', 'narration', 'hook']) {
    const match = text.match(new RegExp(`"${key}"\\s*:\\s*("(?:[^"\\\\]|\\\\.)*")`, 'u'))
    if (match) try { recovered[key] = JSON.parse(match[1]) } catch { /* keep other usable fields */ }
  }
  return recovered
}
const complete = (text: string, product: string): string => {
  const value = clean(text)
  if (!value) return ''
  const named = product && fold(value).startsWith(fold(product))
  const start = named ? value : value.charAt(0).toLocaleUpperCase() + value.slice(1)
  return /[.!?][”"']?$/u.test(start) ? start : start + '.'
}
const directions = /\b(?:it offers|o produto oferece|the product offers|watch as|they\s+(?:put|hold|run|walk|wear|pick|lift|apply|open|tie|smile)|camera\s+(?:pans?|moves?|zooms?|tilts?|tracks?|dollies|pushes)|(?:speak|say|read)\s+(?:slowly|quickly|softly|loudly)|(?:fale|leia)\s+(?:devagar|lentamente|rapidamente)|close-up|push-in)\b|\[[^\]]*\]/iu
function naturalAjusteReferences(raw: Record<string, unknown>, input: CenaInput, product: string): Record<string, unknown> { // KINEO-ADS-CENA-TEXTO-2310
  if ((input.language ?? 'en').toLowerCase().startsWith('pt') || !product || !product.includes(' ') && commonProductWord.test(product)) return raw // KINEO-ADS-CENA-TEXTO-2310 — do not rewrite an isolated ordinary product noun as though it were a repeated brand.
  const out = { ...raw, hooks: [...raw.hooks as string[]] }, named = new RegExp(`(?<![\\p{L}\\p{N}])(?:(?:the|a|an)\\s+)?${esc(product)}(?![\\p{L}\\p{N}])`, 'giu'), pronoun = /\b(?:shoes|sneakers|boots|trainers|leaves)\b/iu.test(product) ? 'them' : 'it'; let seen = false // KINEO-ADS-CENA-TEXTO-2310
  for (const field of ['hooks.0', 'use', 'benefit', 'cta']) { // KINEO-ADS-CENA-TEXTO-2310
    const text = field === 'hooks.0' ? clean(out.hooks[0]) : clean((out as Record<string, unknown>)[field]) // KINEO-ADS-CENA-TEXTO-2310
    const changed = text.split(/(?<=[.!?])\s+/u).map(sentence => sentence.replace(named, (match, offset: number) => { // KINEO-ADS-CENA-TEXTO-2310
      const token = sentence.slice(0, offset).match(/\S*$/u)?.[0] ?? '', after = sentence.slice(offset + match.length), literal = typedSentence(sentence, input) || /(?:https?:\/\/|www\.)/iu.test(token) || /\b(?:code|coupon|cupom|código)\s*$/iu.test(sentence.slice(0, offset)) || /^[\p{L}\p{N}_/@#=%&-]/u.test(after) // KINEO-ADS-CENA-TEXTO-2310
      if (literal || !seen) { seen = true; return match } // KINEO-ADS-CENA-TEXTO-2310
      const subject = !sentence.slice(0, offset).trim(), word = pronoun === 'them' && subject ? 'they' : pronoun // KINEO-ADS-CENA-TEXTO-2310
      return subject ? word.charAt(0).toLocaleUpperCase() + word.slice(1) : word // KINEO-ADS-CENA-TEXTO-2310
    })).join(' ') // KINEO-ADS-CENA-TEXTO-2310
    if (field === 'hooks.0') out.hooks[0] = changed; else (out as Record<string, unknown>)[field] = changed // KINEO-ADS-CENA-TEXTO-2310
  } // KINEO-ADS-CENA-TEXTO-2310
  return out // KINEO-ADS-CENA-TEXTO-2310
} // KINEO-ADS-CENA-TEXTO-2310
export function fitAjusteScript(raw: unknown, input: CenaInput, product: string, record: (note: AjusteQualityNote) => void = () => {}): CenaScript {
  const pt = (input.language ?? 'en').toLowerCase().startsWith('pt'), label = clean(product) || clean(input.frase).split(/[;.!?]/u)[0]
  if (!/[\p{L}\p{N}]/u.test([label, input.frase, input.cta, input.oferta, ...(input.beneficios ?? [])].filter(Boolean).join(' '))) throw new AjusteScriptError('cena_script_unusable', [{ field: 'script', phrase: '', rules: ['No usable customer text or generated narration.'] }])
  const r = ajusteDraft(raw), fallbackHooks = pt ? ['Vamos conhecer?', 'O que você procura?', 'Que tal conhecer?'] : ['Ready for a closer look?', 'What are you looking for?', 'Shall we take a look?']
  const supplied = Array.isArray(r.hooks) ? r.hooks : [r.hook]
  const hooks = [...supplied.map(clean).filter(h => h && words(h) <= 10 && !directions.test(h)), ...fallbackHooks].filter((h, k, all) => all.findIndex(x => fold(x) === fold(h)) === k).slice(0, 3)
  const neutralUse = complete(`${pt ? 'Conheça' : 'Meet'} ${label}`, label)
  const neutralBenefit = [...(input.beneficios ?? []).map(b => benefitSentence(b, label, pt)), ...(input.oferta ? [complete(input.oferta, label)] : [])].join(' ')
  const rawCta = clean(r.cta), safeCta = input.cta || (truncatedCta(rawCta) ? '' : rawCta) || `${pt ? 'Peça' : 'Choose'} ${label}` // KINEO-ADS-CENA-TEXTO-2310
  if (!input.cta && truncatedCta(rawCta)) record({ stage: 'script', code: 'cta_truncated_repaired', message: `Incomplete generated CTA replaced with a complete neutral action: ${rawCta}` }) // KINEO-ADS-CENA-TEXTO-2310
  if (input.cta && truncatedCta(input.cta)) record({ stage: 'script', code: 'typed_cta_incomplete', message: 'The typed CTA appears incomplete. Preserve the supplied literal instead of guessing missing words; this quality reservation does not cancel the ad.' }) // KINEO-ADS-CENA-TEXTO-2310
  let draft = ajusteProductCase({ hooks, use: complete(clean(r.use) || neutralUse, label), benefit: complete(clean(r.benefit) || neutralBenefit, label), cta: complete(safeCta, label) }, input, label) // KINEO-ADS-CENA-TEXTO-2310
  // Keep valid neighboring sentences; replace scene directions and raw benefit lists before factual repair.
  for (const field of ['use', 'benefit', 'cta']) {
    const text = clean(draft[field]), fallback = field === 'use' ? neutralUse : field === 'benefit' ? neutralBenefit : complete(input.cta || `${pt ? 'Peça' : 'Choose'} ${label}`, label)
    const pieces = text.split(/(?<=[.!?])\s+/u)
    if (pieces.some(p => directions.test(p))) {
      draft[field] = pieces.map(p => directions.test(p) ? fallback : p).filter(Boolean).join(' ')
      record({ stage: 'script', code: 'spoken_direction_repaired', message: `${field}: ${text}` })
    }
  }
  if ((input.beneficios ?? []).some(b => fold(b).replace(/[.!?]+$/u, '') === fold(clean(draft.benefit)).replace(/[.!?]+$/u, ''))) draft.benefit = neutralBenefit
  for (let round = 0; round < 3; round++) {
    const issues = ajusteRespaldoIssues(draft, input, label).filter(i => !i.rules.every(rule => rule.startsWith('Speech exceeds') || rule.startsWith('style:')) && !(i.field === 'cta' && input.cta && i.rules.some(rule => rule.startsWith('The CTA is truncated')))) // KINEO-ADS-CENA-TEXTO-2310 — repetition receives a local pronoun edit; preserve an incomplete literal typed CTA instead of inventing its ending.
    if (!issues.length) break
    for (const issue of issues) record({ stage: 'script', code: 'script_line_repaired', message: `${issue.field}: ${issue.phrase}`, reasons: issue.rules })
    draft = repairAjusteLines(draft, input, label, issues)
  }
  const residual = ajusteRespaldoIssues(draft, input, label).filter(i => !i.rules.every(rule => rule.startsWith('Speech exceeds') || rule.startsWith('style:')) && !(i.field === 'cta' && input.cta && i.rules.some(rule => rule.startsWith('The CTA is truncated')))) // KINEO-ADS-CENA-TEXTO-2310
  if (residual.length) {
    draft = ajusteProductCase({ hooks: fallbackHooks, use: neutralUse, benefit: neutralBenefit, cta: complete(input.cta || `${pt ? 'Peça' : 'Choose'} ${label}`, label) }, input, label)
    record({ stage: 'script', code: 'typed_copy_fallback', message: 'Generated claims could not be repaired locally; using only the typed product, benefits, offer and CTA.' })
  }
  if (!fold(speech(draft)).includes(fold(label))) draft.use = [clean(draft.use), neutralUse].filter(Boolean).join(' ')
  draft = naturalAjusteReferences(draft, input, label) // KINEO-ADS-CENA-TEXTO-2310 — preserve factual GPT prose, changing only redundant later references.
  const before = words(speech(draft)), target = pt ? 30 : 35
  // Drop complete optional sentences only. Typed facts and CTA remain whole even when the core itself exceeds the target.
  for (const field of ['use', 'benefit']) {
    const pieces = clean(draft[field]).split(/(?<=[.!?])\s+/u).filter(Boolean)
    for (let k = pieces.length - 1; k >= 0 && words(speech(draft)) > target; k--) {
      const without = pieces.filter((_, index) => index !== k).join(' '), possible = { ...draft, [field]: without }
      if (field === 'benefit' && (input.beneficios?.length || input.oferta) && !without) continue // KINEO-ADS-CENA-TEXTO-2310 — the dedicated benefit field cannot disappear merely because the hook repeats the fact.
      if (!fold(speech(possible)).includes(fold(label)) || adsV2MissingBenefits(speech(possible), [...(input.beneficios ?? []), ...(input.oferta ? [input.oferta] : [])]).length) continue
      pieces.splice(k, 1); draft[field] = without
    }
  }
  const selectedHooks = (draft.hooks as string[]).map(h => complete(h, label)) as [string, string, string]
  const use = clean(draft.use), benefit = clean(draft.benefit), cta = clean(draft.cta)
  const narration = [selectedHooks[0], use, benefit, cta].filter(Boolean).join(' '), after = words(narration)
  if (after < before) record({ stage: 'script', code: 'word_budget_corrected', message: `${before} to ${after} words; complete optional sentences removed, typed facts and CTA retained.` })
  if (after > target) record({ stage: 'script', code: 'word_budget_exception', message: `${after} words: the typed core exceeds the ${target}-word target; keep the complete facts and CTA and fit the usable voice in montage.` })
  return { hooks: selectedHooks, hook: selectedHooks[0], use, benefit, cta, narration }
}
export async function writeAjusteScript(input: CenaInput, product: string, call: CenaJson, parse: (draft: unknown) => CenaScript, prompt: string, record: (note: AjusteQualityNote) => void = () => {}): Promise<CenaScript> { // KINEO-ADS-CENA-SEGUE-2110
  let draft: unknown, error: unknown, issues: AjusteIssue[] = []
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      draft = await call({ model: AI_TEXT_MODELS.ads, system: prompt, images: [], text: JSON.stringify({ frase: input.frase, oferta: input.oferta, beneficios: input.beneficios, product, cta: input.cta, correction: attempt ? { rule: 'Use only the typed sentence, offer and benefits. No unsupported superlatives. Change only rejected lines, keep the other lines verbatim.', rejected: issues, previous: draft } : undefined }) })
      const recovered = ajusteDraft(draft)
      const valid = parse(recovered)
      const fitted = fitAjusteScript(valid, input, product, record)
      record({ stage: 'script', code: 'script_selected', message: `GPT draft ${attempt + 1} selected after shared text fitting.` })
      return fitted
    } catch (e) {
      error = e; issues = e instanceof AjusteScriptError ? e.issues : [{ field: 'script', phrase: typeof draft === 'string' ? draft.slice(0, 300) : JSON.stringify(draft ?? '').slice(0, 300), rules: [e instanceof Error ? e.message : 'invalid_script'] }]
      for (const issue of issues) record({ stage: 'script', code: 'script_retry', message: `${issue.field}: ${issue.phrase}`, reasons: issue.rules })
    }
  }
  record({ stage: 'script', code: 'script_fallback', message: error instanceof Error ? error.message : 'GPT did not return a usable script; repair from the typed input.' }) // KINEO-ADS-CENA-SEGUE-2110
  return fitAjusteScript(draft, input, product, record) // KINEO-ADS-CENA-SEGUE-2110 — quality never becomes 422/502.
}
