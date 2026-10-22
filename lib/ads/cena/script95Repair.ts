// KINEO-ADS-CENA-95-PACING-2110 — repair whole sentences, never truncate the spoken core to a word count.
import type { CenaInput } from './plan'
import { cena95CountWords, cena95SpeechPolicy, CENA95_SPEECH_POLICY_VERSION } from './speech95Policy'

const clean = (v: unknown): string => typeof v === 'string' ? v.replace(/\s+/gu, ' ').trim() : ''
const fold = (s: string): string => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()
const firstUpper = (s: string): string => s ? s[0].toLocaleUpperCase() + s.slice(1) : ''
const firstLower = (s: string): string => s ? s[0].toLocaleLowerCase() + s.slice(1) : ''
const stop = (s: string): string => /[.!?][”"']?$/u.test(s) ? s : s + '.'

/** Decimal points and abbreviations are not sentence boundaries. No substring/word truncation. */
export function cena95Sentences(raw: string): string[] {
  const s = raw.replace(/(?:\r?\n)+|\s*[•;]\s*/gu, '. ').trim(), parts: string[] = []
  let start = 0
  for (let at = 0; at < s.length; at++) {
    if (!/[.!?]/u.test(s[at]) || at + 1 < s.length && !/\s/u.test(s[at + 1])) continue
    const before = s.slice(start, at)
    if (s[at] === '.' && /\b(?:mr|mrs|ms|dr|sr|sra|dra|prof|etc)$/iu.test(before)) continue
    const part = clean(s.slice(start, at + 1)).replace(/^[.\s]+/u, '')
    if (part) parts.push(part)
    start = at + 1
  }
  const tail = clean(s.slice(start)).replace(/^[.\s]+/u, '')
  if (tail) parts.push(tail)
  return parts
}
export function cena95VisualDirection(s: string): boolean {
  return /\b(?:watch\s+(?:as|how|the)|see\s+(?:how|the)|look\s+at|they|their|the\s+(?:actor|presenter|athlete)|camera\s+(?:moves|pans|zooms|follows|pushes)|(?:slow|wide|medium|tracking)\s+shot|close[ -]?up|push[ -]?in|cut\s+to|lip[ -]?sync|veja(?:m)?|observe(?:m)?|a\s+c[aâ]mera|enquadramento|plano\s+(?:aberto|fechado)|ela\s+(?:aplica|calça|corre)|ele\s+(?:aplica|calça|corre))\b/iu.test(s)
    || /^(?:speak|say|narrate|smile|pause|deliver|fale|diga|narre|sorria|pause)\b/iu.test(s.trim())
}
function spokenSentence(raw: string, language: string): string {
  let s = clean(raw).replace(/^\s*(?:\d+[.)]\s+|[-–—•]\s*)/u, '')
  if (!s || cena95VisualDirection(s)) return ''
  s = s.replace(/\[[^\]]*\]/gu, '').trim()
  if (!/[\p{L}\p{N}]/u.test(s)) return ''
  if (/^looking\s+for\b/iu.test(s)) s = 'Are you ' + firstLower(s)
  if (/^procurando\b/iu.test(s)) s = 'Está ' + firstLower(s)
  return stop(firstUpper(s))
}
function benefitSentence(raw: string, language: string): string {
  const fragment = clean(raw).replace(/[.!?]+$/u, ''), text = firstLower(fragment)
  if (!text || cena95VisualDirection(text)) return ''
  if (language === 'pt') {
    if (/^(?:o|a|os|as|você|voce|este|esta|ele|ela)\s/iu.test(text)) return spokenSentence(fragment, language)
    if (/^(?:não|nao|pode|tem|é|hidrata|ajuda|oferece|possui|mantém|mantem|reduz|protege|contém|contem|dura)(?=\s|$)/iu.test(text)) return stop('O produto ' + text)
    if (/^(?:leve|macio|macia|flexível|flexivel|ajustável|ajustavel|impermeável|impermeavel)$/iu.test(text)) return stop('O produto é ' + text.replace(/macia$/iu, 'macio'))
    return stop('O produto oferece ' + text)
  }
  if (language === 'es') return stop('El producto ofrece ' + text)
  if (/^(?:it|you|the|this|these|they)\s/iu.test(text)) return spokenSentence(fragment, language)
  if (/^(?:does\s+not|doesn't|can|is|hydrates|helps|offers|has|keeps|reduces|protects|contains|lasts|supports)\b/iu.test(text)) return stop('It ' + text)
  if (/^(?:lightweight|soft|flexible|adjustable|waterproof|comfortable|water[ -]resistant)$/iu.test(text) || /^(?:easy\s+to|suitable\s+for)\b/iu.test(text)) return stop('It is ' + text)
  const noArticle = /^(?:a|an|the|your|free|no|up\s+to)\b/iu.test(text) || /\b(?:comfort|hydration|shipping|storage|support|protection|flexibility|durability|energy)\b/iu.test(text) || /\b\p{L}{3,}s$/u.test(text)
  return stop('It offers ' + (noArticle ? '' : /^[aeiou]/iu.test(text) ? 'an ' : 'a ') + text)
}
export interface Cena95RepairOptions { maxWords?: number; maxCtaWords?: number; acceptSentence?(text: string): boolean }
export interface Cena95TextRepair {
  hooks: [string, string, string]; pain: string; demonstration: string; benefit: string; offer: string; spokenOffer: string; cta: string;
  language: string; wordsPerSecond: number;
  normalization: { version: typeof CENA95_SPEECH_POLICY_VERSION; sourceWords: number; removedSentences: string[]; omittedBenefits: string[]; maxWords: number; originalHooks: string[]; basis: string }
}
export function repairCena95Text(raw: unknown, input: CenaInput, product: string, options: Cena95RepairOptions = {}): Cena95TextRepair {
  const r = (typeof raw === 'string' ? JSON.parse(raw) : raw) as Record<string, unknown>
  if (!r || typeof r !== 'object' || Array.isArray(r)) throw new Error('cena95_script_json')
  const policy = cena95SpeechPolicy(input.language), language = policy.language, maxWords = Math.min(policy.maxWords, options.maxWords ?? policy.maxWords)
  const removedSentences: string[] = [], omittedBenefits: string[] = []
  const originalHooks = (Array.isArray(r.hooks) ? r.hooks : [r.hook ?? r.hooks]).map(clean).filter(Boolean)
  const accept = (s: string) => !options.acceptSentence || options.acceptSentence(s)
  const fallbacks = language === 'pt' ? ['Qual você escolhe?', 'O que prefere?', 'Já decidiu?'] : language === 'es' ? ['¿Cuál prefieres?', '¿Ya elegiste?', '¿Qué eliges?'] : ['Which suits you?', 'What fits you?', 'Are you ready?']
  const hooks = [...originalHooks.flatMap(cena95Sentences).map(s => spokenSentence(s, language)).filter(s => s && cena95CountWords(s) <= policy.maxHookWords && accept(s)), ...fallbacks].filter((s, k, all) => all.findIndex(x => fold(x) === fold(s)) === k).slice(0, 3) as [string, string, string]
  // Replace an invalid entire hook with a complete alternative; pacing never removes the selected hook.
  if (hooks.length !== 3) throw new Error('cena95_required_speech_does_not_fit')
  const offer = input.oferta ?? ''
  const offerIsSentence = /^(?:buy|get|save|shop|order|choose|claim|compre|leve|ganhe|economize|aproveite|peça|peca|escolha|compra|elige|aprovecha)\b/iu.test(offer)
  const spokenOffer = offer ? stop(offerIsSentence ? firstUpper(offer) : (language === 'pt' ? /^frete\b/iu.test(offer) ? 'Aproveite o ' : 'Aproveite ' : language === 'es' ? 'Aprovecha ' : 'Get ') + firstLower(offer)) : ''
  const defaultCta = stop((language === 'pt' ? 'Escolha ' : language === 'es' ? 'Elige ' : 'Choose ') + product)
  const ctaChoices = cena95Sentences(input.cta ?? clean(r.cta)).map(s => spokenSentence(s, language)).filter(s => s && accept(s))
  // Typed CTA is required copy, never a GPT stage direction: preserve labels such as [Pro] and verbs such as "Veja".
  let cta = input.cta ? stop(firstUpper(clean(input.cta))) : ctaChoices[ctaChoices.length - 1] || defaultCta
  if (!input.cta && (cena95CountWords(cta) > (options.maxCtaWords ?? Math.floor(policy.wordsPerSecond * 4.65)) || !fold(cta).includes(fold(product).split(/\s+/u).find(w => w.length > 2) ?? fold(product)))) cta = defaultCta
  const required = [hooks[0], spokenOffer, cta].filter(Boolean).join(' ')
  if (cena95CountWords(required) > maxWords || options.maxCtaWords !== undefined && cena95CountWords(cta) > options.maxCtaWords) throw new Error('cena95_required_speech_does_not_fit')
  const middle = (field: 'pain' | 'demonstration') => cena95Sentences(clean(r[field])).map(s => {
    const fixed = spokenSentence(s, language)
    if (!fixed || !accept(fixed)) { removedSentences.push(s); return '' }
    return fixed
  }).filter(Boolean)
  const pain = middle('pain'), demonstration = middle('demonstration')
  const benefits = (input.beneficios ?? []).flatMap(b => cena95Sentences(b).map(text => ({ original: b, text: benefitSentence(text, language) }))).filter(b => {
    if (b.text && accept(b.text)) return true
    omittedBenefits.push(b.original); return false
  })
  const narration = () => [hooks[0], ...pain, ...demonstration, ...benefits.map(b => b.text), spokenOffer, cta].filter(Boolean).join(' ')
  const sourceWords = cena95CountWords([originalHooks[0], clean(r.pain), clean(r.demonstration), clean(r.benefit), clean(r.offer), clean(r.cta)].join(' '))
  // Least essential middle sentences leave first. Typed benefits may be omitted only as complete sentences, never changed into new claims.
  while (cena95CountWords(narration()) > maxWords) {
    if (demonstration.length) removedSentences.push(demonstration.pop()!)
    else if (pain.length) removedSentences.push(pain.pop()!)
    else if (benefits.length) { const b = benefits.pop()!; removedSentences.push(b.text); omittedBenefits.push(b.original) }
    else throw new Error('cena95_required_speech_does_not_fit')
  }
  return { hooks, pain: pain.join(' '), demonstration: demonstration.join(' '), benefit: benefits.map(b => b.text).join(' '), offer, spokenOffer, cta, language, wordsPerSecond: policy.wordsPerSecond,
    normalization: { version: CENA95_SPEECH_POLICY_VERSION, sourceWords, removedSentences, omittedBenefits, maxWords, originalHooks, basis: policy.basis } }
}
