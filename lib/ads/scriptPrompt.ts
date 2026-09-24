// KINEO-STUDIO-ADS-2026-09-25 — roteiro do anúncio: prompt a partir das batidas do modelo + brief, e o validador da saída.
// Módulo PURO (sem import de servidor). A rota /api/ads/script chama o modelo; aqui mora o que decide se a resposta serve.
//
// Por que o validador é duro: o brief é o único fato que existe sobre a empresa. Anúncio que inventa preço, nota,
// prazo, número de clientes ou citação é promessa falsa com o nome do cliente e o nosso junto (regra "nunca prometer
// o que o produto não executa"; red-team do GPT em 24/09 pegou o modelo inventando "só esta semana" e um prato que o
// restaurante nunca citou). Por isso: todo NÚMERO da saída tem de existir no brief, a última batida é o CTA com o
// contato EXATO, e a versão que falha é descartada, não corrigida.
import type { AdsBrief } from './types'
import type { AdsModel } from './models'

export const ADS_SCRIPT_DAILY_CAP = 20
export const ADS_SCRIPT_SERVED_EVENT = 'ads_script_served'
export const ADS_SCRIPT_ANGLES = ['question', 'number', 'result'] as const
export type AdsScriptAngle = (typeof ADS_SCRIPT_ANGLES)[number]

export interface AdsScriptVersion {
  angle: AdsScriptAngle
  beats: string[]
  script: string
  words: number
}

const ANGLE_HOW: Record<AdsScriptAngle, string> = {
  question: 'opens with a short question about the pain or desire of the audience',
  number: 'opens with a concrete number or price that the brief gives (if the brief has no number, open with the offer instead)',
  result: 'opens with the end result the customer gets, before explaining anything',
}

export function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length
}

/** Todo o texto factual do brief, para conferir números e o contato. */
export function briefFactsText(brief: AdsBrief): string {
  return [brief.business, brief.offer, brief.contact, brief.audience, ...Object.values(brief.extra ?? {})].join(' \n ')
}

export function buildAdsScriptMessages(model: AdsModel, brief: AdsBrief, languageName: string): { system: string; user: string } {
  const [minW, maxW] = model.words
  const beats = model.beats
    .map((b, i) => `${i + 1}. ~${b.seconds}s — on screen: ${b.screen} — narration mold: "${b.speech}"`)
    .join('\n')
  const system = [
    'You write the spoken narration of short vertical video ads for small businesses (Reels, TikTok, Shorts).',
    `Write THREE versions of the same ad, in ${languageName}, one per angle: ${ADS_SCRIPT_ANGLES.map((a) => `"${a}" (${ANGLE_HOW[a]})`).join('; ')}.`,
    `Each version has exactly ${model.beats.length} beats, in the order given, one short paragraph of spoken narration per beat.`,
    `Total length of each version: ${minW} to ${maxW} words (it is narrated at about 3 words per second for ${model.seconds} seconds).`,
    'Hard rules:',
    '- Use ONLY facts written in the brief. Never invent a price, number, rating, deadline, product, dish, service, result, customer count, year or quote. If a beat needs a fact the brief does not have, say something true and general instead, without numbers.',
    '- Every number you write must appear in the brief exactly as given.',
    '- The last beat is the call to action and must contain the contact exactly as written in the brief.',
    '- Plain spoken sentences only: no stage directions, no [brackets], no emojis, no hashtags, no markdown, no labels.',
    '- No health, legal or financial advice, no promise of results.',
    'Answer with JSON only: {"versions":[{"angle":"question","beats":["...","..."]},{"angle":"number","beats":[...]},{"angle":"result","beats":[...]}]}',
  ].join('\n')
  const user = [
    `Ad model: ${model.name} (${model.goal}), ${model.seconds} seconds.`,
    `Beats:\n${beats}`,
    'Brief (the only facts you may use):',
    `- Business and what it sells: ${brief.business}`,
    brief.offer ? `- Offer: ${brief.offer}` : '- Offer: (none given — do not invent one)',
    `- Call to action: ${brief.cta} · contact: ${brief.contact}`,
    brief.audience ? `- Audience: ${brief.audience}` : '',
    `- Tone: ${brief.tone}`,
    ...Object.entries(brief.extra ?? {}).map(([k, v]) => `- ${k}: ${v}`),
  ].filter(Boolean).join('\n')
  return { system, user }
}

/** Números da saída que NÃO estão no brief (dígitos; ignora separadores de milhar e o "s" de "35s"). */
export function inventedNumbers(text: string, brief: AdsBrief): string[] {
  const facts = briefFactsText(brief).replace(/[.,\s](?=\d{3}\b)/g, '')
  const factDigits = new Set((facts.match(/\d+/g) ?? []))
  const found = (text.replace(/[.,\s](?=\d{3}\b)/g, '').match(/\d+/g) ?? [])
  return found.filter((n) => !factDigits.has(n))
}

function contactOk(lastBeat: string, contact: string): boolean {
  const norm = (s: string) => s.toLowerCase().replace(/[\s\-().]/g, '')
  return norm(lastBeat).includes(norm(contact))
}

/** Valida a resposta do modelo. Devolve só as versões que passam em TODAS as regras; nenhuma = null. */
export function parseAdsScriptOutput(raw: string, model: AdsModel, brief: AdsBrief): AdsScriptVersion[] | null {
  let parsed: unknown
  try { parsed = JSON.parse(raw) } catch { return null }
  const versions = (parsed as { versions?: unknown })?.versions
  if (!Array.isArray(versions)) return null
  const [minW, maxW] = model.words
  const out: AdsScriptVersion[] = []
  const seen = new Set<string>()
  for (const v of versions) {
    const angle = (v as { angle?: unknown })?.angle
    const beats = (v as { beats?: unknown })?.beats
    if (!ADS_SCRIPT_ANGLES.includes(angle as AdsScriptAngle) || seen.has(angle as string)) continue
    if (!Array.isArray(beats) || beats.length !== model.beats.length) continue
    const clean = beats.map((b) => (typeof b === 'string' ? b.replace(/\s+/g, ' ').trim() : ''))
    if (clean.some((b) => !b || b.length > 500)) continue
    const script = clean.join('\n\n')
    if (/[[\]{}#*_]|[\u{1F300}-\u{1FAFF}]/u.test(script)) continue
    const words = countWords(script)
    if (words < Math.floor(minW * 0.9) || words > Math.ceil(maxW * 1.25)) continue
    if (inventedNumbers(script, brief).length > 0) continue
    if (!contactOk(clean[clean.length - 1], brief.contact)) continue
    seen.add(angle as string)
    out.push({ angle: angle as AdsScriptAngle, beats: clean, script, words })
  }
  return out.length ? out : null
}
