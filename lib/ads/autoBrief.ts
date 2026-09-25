// KINEO-ADS-IA-FAZ-2026-09-26 — modo "a IA faz o anúncio" (fundador 25/09 à noite: "a pessoa manda uma foto, um vídeo,
// e ela quer uma IA. A gente vai fazer, ela não vai precisar fazer muita coisa ... muito parecido com o que a gente faz
// hoje quando a IA faz a sua script").
//
// Módulo PURO (sem import de servidor, sem React). O que ele decide:
//   1. o prompt que transforma UMA frase livre da empresa em brief (AdsBrief) — o GPT só EXTRAI, nunca inventa;
//   2. a validação da extração: todo número e o contato precisam existir no texto que a pessoa escreveu (a mesma regra
//      do roteiro — lib/ads/scriptPrompt.ts —, aplicada um passo antes); campo com número inventado é apagado;
//   3. a escolha do modelo, DETERMINÍSTICA: só modelos que a mídia enviada já libera (adsModelMissingInputs) e, entre
//      eles, o que tem os campos extras preenchidos pela frase. O palpite do GPT desempata, nunca manda.
//   4. o que a tela de confirmação ainda precisa perguntar (contato, oferta) — o validador aceita como fato tudo que
//      está no brief, então contato e oferta passam pelos olhos da pessoa antes do roteiro (painel de 25/09).
// A rota /api/ads/auto-brief chama o modelo; o resto do caminho (roteiro, voz, render) é o de sempre.
import type { AdsBrief } from './types'
import { ADS_MODELS, adsModelMissingInputs, type AdsModel, type AdsModelId } from './models'
import { inventedNumbers } from './scriptPrompt'
import { ADS_BRIEF_LIMITS } from './orderContract'

export const ADS_AUTO_TEXT_MAX_CHARS = 1500
export const ADS_AUTO_TEXT_MIN_CHARS = 12
export const ADS_AUTO_DAILY_CAP = 10
export const ADS_AUTO_SERVED_EVENT = 'ads_auto_brief_served'
export const ADS_AUTO_VERSION = 'ads_ia_faz_v1_20260926'
/** Interruptor único: 'internal' = só contas internas veem o modo (teste do fundador em produção); 'all' = todos com
 *  acesso ao Studio Ads; 'off' = some da tela e a rota responde 404. Virar para 'all' só com o ok do fundador. */
export const ADS_AUTO_MODE: 'off' | 'internal' | 'all' = 'internal'
export function adsAutoVisible(access: string | null | undefined): boolean {
  return ADS_AUTO_MODE === 'all' || (ADS_AUTO_MODE === 'internal' && access === 'internal')
}

/** Os campos extras que algum modelo usa (lib/ads/models.ts inputs.extraFields). */
export const ADS_AUTO_EXTRA_KEYS = [
  'offer', 'deadline', 'hours', 'address', 'pain', 'differentiator', 'turnaround', 'testimonials', 'rating',
  'duration_of_service', 'origin_lines', 'topic', 'three_mistakes', 'seats',
] as const
type ExtraKey = (typeof ADS_AUTO_EXTRA_KEYS)[number]

const CTAS: readonly AdsBrief['cta'][] = ['call', 'whatsapp', 'visit', 'buy', 'book', 'signup']
const TONES: readonly AdsBrief['tone'][] = ['warm', 'direct', 'premium']
const MODEL_IDS = ADS_MODELS.map((m) => m.id) as readonly AdsModelId[]

export interface AdsMediaCount { photos: number; videos: number; logo: boolean }

export function buildAutoBriefMessages(text: string, languageName: string): { system: string; user: string } {
  const system = [
    'You read a short free-text description a small business wrote about itself and turn it into a structured ad brief.',
    'You ONLY extract. Copy facts exactly as written. Never invent a price, number, rating, deadline, product, address, phone, link, customer count or quote.',
    'If a field is not in the text, return an empty string for it. An empty field is always better than a guessed one.',
    'The contact must be copied character by character from the text (phone, WhatsApp number, address, website or @handle). If there is none, return "".',
    `Write business, offer, audience and extra values in ${languageName}, as short phrases (not sentences), keeping every number and name exactly as written.`,
    'business is written as "<business name> — <what it sells>" (name, a space, an em dash, a space, then what it sells). If the text has no name, use only what it sells.',
    `cta: one of ${CTAS.join(', ')} — whatsapp if the text mentions WhatsApp; call for a phone; visit for an address; buy for an online store link; book for appointments or reservations; signup for events, courses or classes.`,
    `tone: one of ${TONES.join(', ')}.`,
    `model_hint: the ad format that best fits the text, one of ${MODEL_IDS.join(', ')}.`,
    'Answer with JSON only: {"business":"","offer":"","cta":"","contact":"","audience":"","tone":"","extra":{' + ADS_AUTO_EXTRA_KEYS.map((k) => `"${k}":""`).join(',') + '},"model_hint":""}',
  ].join('\n')
  const user = `Business text (the only facts you may use):\n"""\n${text}\n"""`
  return { system, user }
}

const clip = (v: unknown, max: number): string => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, max) : '')
const norm = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[\s\-().]/g, '')

/** O contato só vale se estiver no texto da pessoa (inteiro, ou os 8 últimos dígitos de um telefone). */
export function contactFromText(contact: string, text: string): boolean {
  if (!contact) return false
  if (norm(text).includes(norm(contact))) return true
  const cd = contact.replace(/\D/g, '')
  return cd.length >= 8 && text.replace(/\D/g, '').includes(cd.slice(-8))
}

/** Números de um valor extraído que não estão no texto original (mesma régua do validador do roteiro). */
function numbersNotInText(value: string, text: string): string[] {
  const asBrief: AdsBrief = { business: text, offer: '', cta: 'visit', contact: '', language: 'en', tone: 'warm', audience: '', extra: {} }
  return inventedNumbers(value, asBrief)
}

export interface AutoBriefResult {
  brief: AdsBrief
  /** O que a tela de confirmação precisa pedir ou mostrar em destaque antes do roteiro. */
  needs: ('business' | 'contact')[]
  /** Campos apagados porque tinham número que o texto não diz. */
  dropped: string[]
  modelHint: AdsModelId | null
}

/** Valida e limpa a resposta do modelo contra o texto da pessoa. Pura; nunca lança. */
export function parseAutoBrief(raw: string, text: string, language: string): AutoBriefResult {
  let p: Record<string, unknown> = {}
  try { const j = JSON.parse(raw); if (j && typeof j === 'object') p = j as Record<string, unknown> } catch { /* vazio */ }
  const dropped: string[] = []
  const keep = (name: string, value: string): string => {
    if (!value) return ''
    if (numbersNotInText(value, text).length > 0) { dropped.push(name); return '' }
    return value
  }
  const business = keep('business', clip(p.business, ADS_BRIEF_LIMITS.business))
  const offer = keep('offer', clip(p.offer, ADS_BRIEF_LIMITS.offer))
  const audience = keep('audience', clip(p.audience, ADS_BRIEF_LIMITS.audience))
  let contact = clip(p.contact, ADS_BRIEF_LIMITS.contact)
  if (contact && !contactFromText(contact, text)) { dropped.push('contact'); contact = '' }
  const rawExtra = (p.extra && typeof p.extra === 'object' ? p.extra : {}) as Record<string, unknown>
  const extra: Record<string, string> = {}
  for (const k of ADS_AUTO_EXTRA_KEYS) {
    if (k === 'offer') continue // offer é campo próprio do brief
    const v = keep(`extra.${k}`, clip(rawExtra[k], ADS_BRIEF_LIMITS.extraValue))
    if (v) extra[k] = v
  }
  const cta = CTAS.includes(p.cta as AdsBrief['cta']) ? (p.cta as AdsBrief['cta']) : guessCta(contact, text)
  const tone = TONES.includes(p.tone as AdsBrief['tone']) ? (p.tone as AdsBrief['tone']) : 'warm'
  const modelHint = MODEL_IDS.includes(p.model_hint as AdsModelId) ? (p.model_hint as AdsModelId) : null
  const needs: AutoBriefResult['needs'] = []
  if (!business) needs.push('business')
  if (!contact) needs.push('contact')
  return { brief: { business, offer, cta, contact, language, tone, audience, extra }, needs, dropped, modelHint }
}

/** CTA pelo tipo de contato, quando o modelo não disse. */
export function guessCta(contact: string, text: string): AdsBrief['cta'] {
  const t = text.toLowerCase()
  if (/whats\s?app|wa\.me|zap\b/.test(t)) return 'whatsapp'
  if (/https?:\/\/|www\.|\.com\b|\.br\b/.test(contact)) return 'buy'
  if (contact.replace(/\D/g, '').length >= 8) return 'call'
  return 'visit'
}

/** Quantos dos campos extras do modelo a frase preencheu (offer conta pelo campo do brief). */
function filledExtras(model: AdsModel, brief: AdsBrief): { filled: number; total: number } {
  const keys = model.inputs.extraFields
  const filled = keys.filter((k) => (k === 'offer' ? Boolean(brief.offer) : Boolean(brief.extra[k as ExtraKey]))).length
  return { filled, total: keys.length }
}

/** Ordem de desempate quando nada na frase aponta um formato: os mais genéricos primeiro. */
const FALLBACK_ORDER: readonly AdsModelId[] = ['vitrine_fotos', 'oferta_relampago', 'problema_solucao', 'antes_depois', 'depoimento_cartao', 'contagem_prazo', 'historia_fundador', 'tres_erros']

export interface AutoModelChoice {
  model: AdsModel | null
  /** Modelos que a mídia libera, do melhor para o pior (a tela pode oferecer "trocar formato"). */
  eligible: AdsModelId[]
  /** O que falta para liberar QUALQUER modelo (ex.: logo, fotos). Vazio quando há escolha. */
  missing: string[]
}

/** Escolhe o modelo: só os liberados pela mídia; ganha quem tem mais campos extras preenchidos; o palpite do GPT desempata. */
export function chooseAutoModel(brief: AdsBrief, have: AdsMediaCount, hint: AdsModelId | null): AutoModelChoice {
  const open = ADS_MODELS.filter((m) => adsModelMissingInputs(m, have).length === 0)
  if (open.length === 0) {
    const easiest = ADS_MODELS.slice().sort((a, b) => adsModelMissingInputs(a, have).length - adsModelMissingInputs(b, have).length || a.inputs.minPhotos - b.inputs.minPhotos)[0]
    return { model: null, eligible: [], missing: adsModelMissingInputs(easiest, have) }
  }
  const score = (m: AdsModel) => {
    const { filled, total } = filledExtras(m, brief)
    const ratio = total === 0 ? 0.5 : filled / total
    return ratio * 10 + (m.id === hint ? 3 : 0) - FALLBACK_ORDER.indexOf(m.id) * 0.01
  }
  // Modelos que dependem de um fato específico (depoimento, prazo, antes/depois, história, erros) só entram se a frase
  // trouxe ao menos metade dos campos deles — senão o roteiro sai genérico com colchetes sem resposta.
  const specific = (m: AdsModel) => m.id !== 'vitrine_fotos' && m.id !== 'problema_solucao'
  const usable = open.filter((m) => !specific(m) || filledExtras(m, brief).filled * 2 >= filledExtras(m, brief).total)
  const pool = usable.length ? usable : open
  const ranked = pool.slice().sort((a, b) => score(b) - score(a))
  return { model: ranked[0], eligible: ranked.map((m) => m.id), missing: [] }
}

/** Conta a mídia do pedido como os modelos pedem (o logo não conta como foto). */
export function countAdsMedia(media: ReadonlyArray<{ kind: string; isLogo?: boolean }>): AdsMediaCount {
  return {
    photos: media.filter((m) => m.kind === 'image' && !m.isLogo).length,
    videos: media.filter((m) => m.kind === 'video').length,
    logo: media.some((m) => m.isLogo === true),
  }
}
