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

/** Piso de palavras aceito: o que a voz REAL (tts-1-hd a velocidade 1, ~2,45 pal/s medido em 15/09) precisa para encher a
 *  duração do modelo. A régua do modelo (3,1 pal/s, regra da casa) continua sendo o ALVO pedido ao GPT; o piso só impede
 *  que um roteiro de 70 palavras vire um anúncio de 28 s. Teste da padaria 24/09: o gpt-4o-mini entregava ~75% do pedido. */
export function adsScriptMinWords(model: Pick<AdsModel, 'seconds' | 'words'>): number {
  return Math.min(Math.floor(model.words[0] * 0.9), Math.floor(model.seconds * 2.45))
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
  // KINEO-STUDIO-ADS-SELF-SERVE-2026-09-24 — teste da padaria: com o molde curto e sem meta por batida o GPT escrevia
  // ~37 palavras (o modelo pede 100-115) e copiava "Tap the button" no cartão sem o contato. Agora cada batida tem a
  // sua meta de palavras (proporcional aos segundos) e o molde é só a ideia, nunca o texto.
  // O gpt-4o-mini escreve ~30% a menos do que pedem (medido 24/09: 70 palavras para um pedido de 100-115). A meta por
  // batida mira um pouco acima do teto; o validador aceita a faixa do modelo com folga.
  const mid = maxW * 1.1
  const last = model.beats.length - 1
  const beats = model.beats
    .map((b, i) => `${i + 1}. ${b.seconds}s, about ${Math.max(6, Math.round((mid * b.seconds) / model.seconds))} words — on screen: ${b.screen} — idea (do not copy): "${b.speech}"${i === last ? ' — MUST say the contact in full' : ''}`)
    .join('\n')
  const system = [
    'You write the spoken narration of short vertical video ads for small businesses (Reels, TikTok, Shorts).',
    `Write THREE versions of the same ad, in ${languageName}, one per angle: ${ADS_SCRIPT_ANGLES.map((a) => `"${a}" (${ANGLE_HOW[a]})`).join('; ')}.`,
    `Each version has exactly ${model.beats.length} beats, in the order given; each beat is one to three complete spoken sentences.`,
    `Total length of each version: ${minW} to ${maxW} words (it is narrated at about 3 words per second for ${model.seconds} seconds). This is a hard minimum: a version under ${minW} words is thrown away, so aim for about ${Math.round(maxW * 1.1)} words. Give each beat about the word count listed for it, and count before answering.`,
    'The idea next to each beat is only the intention of that moment. Never copy it word for word and never keep its [brackets]: write full, natural sentences with the brief facts.',
    'Hard rules:',
    '- Use ONLY facts written in the brief. Never invent a price, number, rating, deadline, product, dish, service, result, customer count, year or quote. If a beat needs a fact the brief does not have, say something true and general instead, without numbers.',
    '- Every number you write must appear in the brief exactly as given. Numbers written as words count too (a thousand, hundreds, dozens, mil, centenas, miles): never use them unless the brief says so.',
    '- The last beat is the call to action and must contain the contact exactly as written in the brief.',
    '- Plain spoken sentences only: no stage directions, no [brackets], no emojis, no hashtags, no markdown, no labels.',
    '- No health, legal or financial advice, no promise of results.',
    // Teste da padaria (24/09 noite): o exemplo antigo tinha 2 itens em beats e o modelo devolvia 4 "versões" de 2 batidas.
    // O exemplo agora tem EXATAMENTE as batidas do modelo, e a regra diz o número.
    `Answer with JSON only, exactly 3 versions, each with exactly ${model.beats.length} strings in "beats": {"versions":[${ADS_SCRIPT_ANGLES.map((a) => `{"angle":"${a}","beats":[${model.beats.map((_, i) => `"beat ${i + 1}"`).join(',')}]}`).join(',')}]}`,
  ].join('\n')
  const user = [
    `Ad model: ${model.name} (${model.goal}), ${model.seconds} seconds.`,
    `Beats:\n${beats}`,
    'Brief (the only facts you may use):',
    `- Business and what it sells: ${brief.business}`,
    brief.offer ? `- Offer: ${brief.offer}` : '- Offer: (none given — do not invent one)',
    `- Call to action: ${brief.cta} · contact: ${brief.contact}`,
    `- The last beat must say this contact in full, exactly as written: ${brief.contact}`,
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
  // Teste da padaria: "Mais de mil pessoas" passava porque o número estava escrito por extenso. Quantidades por extenso
  // que o brief não diz também são inventadas.
  const WORD_QTY = /\b(mil|milhares|milh(?:ão|ões)|centenas|dezenas|cem|hundreds?|thousands?|millions?|dozens?|miles|millones|cientos|docenas)\b/giu
  const factWords = new Set((facts.toLowerCase().match(WORD_QTY) ?? []).map((w) => w.toLowerCase()))
  const wordQty = (text.match(WORD_QTY) ?? []).map((w) => w.toLowerCase()).filter((w) => !factWords.has(w))
  return [...found.filter((n) => !factDigits.has(n)), ...wordQty]
}

function contactOk(lastBeat: string, contact: string): boolean {
  const norm = (s: string) => s.toLowerCase().replace(/[\s\-().]/g, '')
  if (norm(lastBeat).includes(norm(contact))) return true
  // Telefone falado sem o código do país ("(11) 98765-4321" para "+55 11 98765-4321"): vale se os 8 últimos dígitos
  // do contato aparecem juntos na última batida. O cartão final mostra o contato inteiro de qualquer jeito.
  const cd = contact.replace(/\D/g, '')
  const bd = lastBeat.replace(/\D/g, '')
  return cd.length >= 8 && bd.includes(cd.slice(-8))
}

/** Por que nenhuma versão passou — vira a instrução da segunda tentativa. Pura. */
export function diagnoseAdsScriptOutput(raw: string, model: AdsModel, brief: AdsBrief): string[] {
  const why = new Set<string>()
  let parsed: unknown
  try { parsed = JSON.parse(raw) } catch { return ['Answer with valid JSON only.'] }
  const versions = (parsed as { versions?: unknown })?.versions
  if (!Array.isArray(versions) || versions.length === 0) return ['Return three versions in the JSON.']
  const [minW, maxW] = model.words
  for (const v of versions) {
    const beats = (v as { beats?: unknown })?.beats
    if (!Array.isArray(beats) || beats.length !== model.beats.length) { why.add(`Each version needs exactly ${model.beats.length} beats.`); continue }
    const clean = beats.map((b) => (typeof b === 'string' ? b.replace(/\s+/g, ' ').trim() : ''))
    const script = clean.join('\n\n')
    const words = countWords(script)
    if (words < adsScriptMinWords(model)) why.add(`Your versions are too short (${words} words). Each version must have ${minW} to ${maxW} words: make every beat longer with more true detail from the brief.`)
    if (words > Math.ceil(maxW * 1.25)) why.add(`Your versions are too long (${words} words). Each version must have ${minW} to ${maxW} words.`)
    const inv = inventedNumbers(script, brief)
    if (inv.length) why.add(`Remove these numbers that are not in the brief: ${[...new Set(inv)].join(', ')}.`)
    if (!contactOk(clean[clean.length - 1] ?? '', brief.contact)) why.add(`The last beat must say the contact in full: ${brief.contact}`)
    if (/[[\]{}#*_]|[\u{1F300}-\u{1FAFF}]/u.test(script)) why.add('No brackets, markdown or emojis.')
  }
  return [...why]
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
    if (words < adsScriptMinWords(model) || words > Math.ceil(maxW * 1.25)) continue
    if (inventedNumbers(script, brief).length > 0) continue
    if (!contactOk(clean[clean.length - 1], brief.contact)) continue
    seen.add(angle as string)
    out.push({ angle: angle as AdsScriptAngle, beats: clean, script, words })
  }
  return out.length ? out : null
}
