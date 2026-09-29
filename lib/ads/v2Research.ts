// KINEO-ADS-MODO-SIMPLES-2026-09-29 — pesquisa na web do modo simples do /ads/v2 ("falando isso [Edifício X, bairro Y],
// colocando as fotos, sairia um produto" — fundador, 29/09). A pessoa escreve uma frase; o servidor procura FATOS
// PÚBLICOS COM FONTE sobre o lugar (endereço, o que há perto, dados do edifício ou do negócio) e a tela mostra cada um,
// com o link da fonte, para a pessoa conferir e desmarcar antes de qualquer cobrança.
//
// LIB PURA (nenhum import): o guardião carrega este arquivo direto no Node. A rota app/api/ads/v2/research chama o modelo.
//
// Regras que esta lib garante por CONSTRUÇÃO:
//   · a fonte de cada fato é a anotação url_citation que a OpenAI devolve DENTRO da linha — nunca uma URL escrita pelo
//     modelo no texto. Linha sem anotação = descartada (no_source). Só https.
//   · a consulta leva só a frase da pessoa, sem telefone, e-mail, @perfil, link nem valor em dinheiro (researchQuery).
//     Preço e contato digitados nos campos próprios nunca chegam aqui.
//   · fato com preço/aluguel/valor, com característica de unidade (m², quartos, suítes, vagas…), com promessa ou fama
//     ("valoriza", "melhor", "icônico", "#1") ou com cara de contato é descartado, mesmo com fonte.

export const ADS_V2_RESEARCH_MODEL = 'gpt-4.1-mini'
/** Pesquisas pagas por conta em 24 h (evento ads_v2_research_served, contado ANTES do modelo). */
export const ADS_V2_RESEARCH_DAILY_CAP = 6
export const ADS_V2_RESEARCH_TIMEOUT_MS = 25_000
export const ADS_V2_RESEARCH_MAX_FACTS = 6
export const ADS_V2_RESEARCH_FACT_MAX_CHARS = 140
export const ADS_V2_RESEARCH_QUERY_MAX_CHARS = 200
export const ADS_V2_RESEARCH_MAX_OUTPUT_TOKENS = 700
/** Pesquisa marcada 'running' há mais que isto = tratada como falha (a função morreu no meio); não pesquisa de novo. */
export const ADS_V2_RESEARCH_STALE_MS = 90_000
/**
 * Custo ESTIMADO (conferir na página de preços da OpenAI antes de abrir para todos): a ferramenta web_search_preview
 * com search_context_size 'low' no gpt-4.1-mini ≈ US$ 25 por 1.000 buscas; tokens do 4.1-mini: US$ 0,40 / 1,60 por
 * milhão (entrada/saída). O evento grava buscas e tokens para medir o real.
 */
export const ADS_V2_RESEARCH_USD = { perSearch: 0.025, inputPerMillion: 0.4, outputPerMillion: 1.6 } as const

export interface AdsV2ResearchFact {
  id: string
  text: string
  url: string
  host: string
}
export interface AdsV2ResearchDropped {
  no_source: number
  price: number
  unit: number
  promise: number
  contact: number
  long: number
  duplicate: number
  over: number
}
export interface AdsV2ResearchAnnotation {
  type: string
  url?: string
  start_index?: number
  end_index?: number
}
export type AdsV2ResearchStatus = 'none' | 'running' | 'ok' | 'failed'

const emptyDropped = (): AdsV2ResearchDropped => ({ no_source: 0, price: 0, unit: 0, promise: 0, contact: 0, long: 0, duplicate: 0, over: 0 })

// ── filtros de fato (regex literais; fronteira de palavra Unicode por lookaround, porque \b não vê letra acentuada) ──
const PRICE_RE = /(R\$|US\$|U\$|€|£|¥|\$\s?\d|(?<![\p{L}\p{N}])(\d[\d.,]*\s?(reais|real|d[oó]lares|dollars?|euros?|milh[oõ]es|million|bilh[oõ]es|billion)|pre[çc]os?|prices?|priced|precios?|aluguel|alugu[eé]is|alugar|aluga-se|rent|rents|rental|alquiler(es)?|alquila|custa|custam|cost|costs|cuesta|cuestan|iptu|taxa|taxas|fee|fees|valor|valores|value|worth|vendido por|sold for)(?![\p{L}\p{N}]))/iu
const UNIT_RE = /(\d\s?(m²|m2|sq\.?\s?ft|ft²)|(?<![\p{L}\p{N}])(m²|m2|metros quadrados|metros cuadrados|square (feet|meters|metres)|quartos?|su[ií]tes?|dormit[oó]rios?|dormitorios?|vagas?|bedrooms?|bathrooms?|banheiros?|habitaciones?|rec[aá]maras?|ba[ñn]os?|estacionamientos?|parking spaces?|garage spaces?)(?![\p{L}\p{N}]))/iu
const PROMISE_RE = /((?<![\p{L}\p{N}])(valoriz\p{L}*|investimentos?|investments?|invest|inversi[oó]n(es)?|oportunidades?|opportunit(y|ies)|melhor(es)?|best|mejor(es)?|n[uú]mero um|number one|ic[oô]nic[oa]s?|iconic|[ií]cones?|famos[oa]s?|famous|renowned|renomad[oa]s?|prestigi\p{L}*|exclusiv\p{L}*|luxo|luxuos[oa]s?|luxury|lujo|lujos[oa]s?|imperd[ií]vel|unmissable|garant\p{L}*|guarante\p{L}*|premiad[oa]s?|award\p{L}*|perfeit[oa]s?|perfect|incr[ií]vel|amazing|sonho|dream)(?![\p{L}\p{N}])|#\s?1(?!\d))/iu
/** ESPELHO de CONTACTISH (lib/ads/v2Brief.ts): o guardião confere que é o mesmo texto. */
const CONTACTISH = /(https?:\/\/|www\.|\b[a-z0-9-]+\.(com|net|org|io|app|co|br|jo|me|shop|store)\b|@[a-z0-9_.]{2,}|\d[\d\s().-]{6,}\d)/i

/** Por que um fato não pode entrar (null = pode). Mesma régua para a pesquisa e para o plano B do link. */
export function factRefusal(text: string): 'price' | 'unit' | 'promise' | 'contact' | 'long' | null {
  if (PRICE_RE.test(text)) return 'price'
  if (UNIT_RE.test(text)) return 'unit'
  if (PROMISE_RE.test(text)) return 'promise'
  if (CONTACTISH.test(text)) return 'contact'
  if (text.length > ADS_V2_RESEARCH_FACT_MAX_CHARS) return 'long'
  return null
}

/**
 * O que vai para a busca: SÓ a frase da pessoa, sem telefone, e-mail, @perfil, link nem valor em dinheiro, até 200
 * caracteres (corte em fronteira de palavra). Pura.
 */
export function researchQuery(sentence: string): string {
  let q = String(sentence ?? '')
  q = q.replace(/https?:\/\/\S+|www\.\S+/gi, ' ')
  q = q.replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, ' ')
  q = q.replace(/@[\w.]{2,}/g, ' ')
  q = q.replace(/(R\$|US\$|U\$|€|£|\$)\s?\d[\d.,]*(\s?(mil|k|mi|milh[oõ]es|million|bi|bilh[oõ]es|billion)(?![\p{L}\p{N}]))?/giu, ' ')
  q = q.replace(/\d[\d.,]*\s?(mil\s)?(reais|d[oó]lares|dollars?|euros?)(?![\p{L}\p{N}])/giu, ' ')
  q = q.replace(/\+?\d[\d\s().-]{6,}\d/g, ' ')
  q = q.replace(/\s+/g, ' ').replace(/\s+([,.;:])/g, '$1').replace(/^[\s,.;:-]+|[\s,;:-]+$/g, '').trim()
  if (q.length <= ADS_V2_RESEARCH_QUERY_MAX_CHARS) return q
  const cut = q.slice(0, ADS_V2_RESEARCH_QUERY_MAX_CHARS)
  const sp = cut.lastIndexOf(' ')
  return (sp > 120 ? cut.slice(0, sp) : cut).trim()
}

/** O pedido ao modelo com a ferramenta de busca: 3 a 6 linhas "- fato", na língua do texto, cada uma com fonte. */
export function buildResearchMessages(query: string, languageName: string): { instructions: string; input: string } {
  const instructions = [
    'You look up PUBLIC facts on the web about a place or a business that someone wants to show in a short video ad.',
    'Search the web first. Then answer ONLY with 3 to 6 lines. Each line starts with "- " and is one short fact (under 20 words) with its source cited.',
    `Write every line in ${languageName}.`,
    'Allowed: the address, the street and the neighborhood; what is nearby (parks, stations, schools, shops, landmarks); public facts about the building or the business (name, year it was built, architect, number of floors, shared amenities).',
    'Forbidden: any price, rent, fee, cost or appreciation; any promise or opinion (for example "best", "iconic", "great investment"); anything about one specific unit or apartment (size, square meters, bedrooms, suites, which floor, parking spaces); any data about people (owners, residents, names, phone numbers, e-mails).',
    'Never invent. Never write a fact without a source. If you find nothing reliable, answer with the single line: - none',
  ].join('\n')
  return { instructions, input: `Place or business to look up: ${query}` }
}

/**
 * Achata o `output` da Responses API: o texto das partes output_text (juntas por '\n'), as anotações com o índice
 * deslocado para o texto junto, e quantas buscas o modelo fez (itens web_search_call). Pura; nunca lança.
 */
export function flattenResearchOutput(output: unknown): { text: string; annotations: AdsV2ResearchAnnotation[]; searches: number } {
  let text = ''
  const annotations: AdsV2ResearchAnnotation[] = []
  let searches = 0
  if (!Array.isArray(output)) return { text, annotations, searches }
  for (const item of output) {
    if (!item || typeof item !== 'object') continue
    const it = item as { type?: unknown; content?: unknown }
    if (it.type === 'web_search_call') { searches += 1; continue }
    if (it.type !== 'message' || !Array.isArray(it.content)) continue
    for (const part of it.content) {
      if (!part || typeof part !== 'object') continue
      const p = part as { type?: unknown; text?: unknown; annotations?: unknown }
      if (p.type !== 'output_text' || typeof p.text !== 'string') continue
      if (text) text += '\n'
      const base = text.length
      text += p.text
      if (!Array.isArray(p.annotations)) continue
      for (const a of p.annotations) {
        if (!a || typeof a !== 'object') continue
        const an = a as { type?: unknown; url?: unknown; start_index?: unknown; end_index?: unknown }
        if (an.type !== 'url_citation' || typeof an.url !== 'string') continue
        const s = typeof an.start_index === 'number' ? an.start_index : -1
        const e = typeof an.end_index === 'number' ? an.end_index : -1
        if (s < 0 || e < s) continue
        annotations.push({ type: 'url_citation', url: an.url, start_index: base + s, end_index: base + e })
      }
    }
  }
  return { text, annotations, searches }
}

/** URL da fonte: só https; sai o ?utm_source=openai que a ferramenta acrescenta. null = inválida. */
export function cleanSourceUrl(raw: unknown): { url: string; host: string } | null {
  if (typeof raw !== 'string' || !raw) return null
  let u: URL
  try {
    u = new URL(raw)
  } catch {
    return null
  }
  if (u.protocol !== 'https:' || !u.hostname) return null
  if (u.searchParams.get('utm_source') === 'openai') u.searchParams.delete('utm_source')
  const url = u.toString().replace(/\?$/, '')
  return { url, host: u.hostname.replace(/^www\./i, '').toLowerCase() }
}

/** O texto de um fato sem o link em markdown, sem URL solta, sem marcador e sem enfeite. */
function cleanFactText(line: string): string {
  return line
    .replace(/^\s*(?:[-•*]|\d+[.)])\s+/, '')
    .replace(/\(\s*\[[^\]]*\]\([^)]*\)\s*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, ' ')
    .replace(/https?:\/\/\S+/gi, ' ')
    .replace(/\*\*|__|`/g, '')
    .replace(/\s+/g, ' ')
    .replace(/\s+([,.;:!?])/g, '$1')
    .replace(/^["'“”\s]+|["'“”\s]+$/g, '')
    .trim()
}

/**
 * Da resposta do modelo aos fatos: só linhas "- …"; a fonte de cada uma é a PRIMEIRA anotação url_citation que cai
 * dentro da linha; sem anotação = no_source. Depois os filtros (preço, unidade, promessa, contato, tamanho), sem
 * repetição, no máximo 6. Pura; nunca lança.
 */
export function parseResearchOutput(outputText: string, annotations: readonly AdsV2ResearchAnnotation[]): { facts: AdsV2ResearchFact[]; dropped: AdsV2ResearchDropped; found: number } {
  const dropped = emptyDropped()
  const facts: AdsV2ResearchFact[] = []
  const seen = new Set<string>()
  let found = 0
  const text = typeof outputText === 'string' ? outputText : ''
  const cites = (Array.isArray(annotations) ? annotations : []).filter(
    (a) => a && a.type === 'url_citation' && typeof a.url === 'string' && typeof a.start_index === 'number' && typeof a.end_index === 'number',
  )
  let offset = 0
  for (const line of text.split('\n')) {
    const start = offset
    const end = offset + line.length
    offset = end + 1
    if (!/^\s*(?:[-•*]|\d+[.)])\s+/.test(line)) continue
    const body = cleanFactText(line)
    if (!body || /^(none|nenhum|nada|ninguno|nothing)\.?$/i.test(body)) continue
    found += 1
    const cite = cites.find((a) => (a.start_index as number) < end && (a.end_index as number) > start)
    const src = cite ? cleanSourceUrl(cite.url) : null
    if (!src) { dropped.no_source += 1; continue }
    const why = factRefusal(body)
    if (why) { dropped[why] += 1; continue }
    const key = body.toLowerCase()
    if (seen.has(key)) { dropped.duplicate += 1; continue }
    if (facts.length >= ADS_V2_RESEARCH_MAX_FACTS) { dropped.over += 1; continue }
    seen.add(key)
    facts.push({ id: `f${facts.length + 1}`, text: body, url: src.url, host: src.host })
  }
  return { facts, dropped, found }
}

/**
 * Plano B (a OpenAI recusou a ferramenta ou o modelo e a frase trazia o link do negócio): as frases que a própria
 * página diz viram fatos com ESSA URL como fonte, pela mesma régua, no máximo 3. Pura.
 */
export function factsFromPageText(pageText: string, url: string): { facts: AdsV2ResearchFact[]; dropped: AdsV2ResearchDropped; found: number } {
  const dropped = emptyDropped()
  const facts: AdsV2ResearchFact[] = []
  const src = cleanSourceUrl(url)
  if (!src) return { facts, dropped, found: 0 }
  const parts = String(pageText ?? '').split(/(?<=[.!?])\s+|\n+/).map((s) => cleanFactText(s)).filter((s) => s.length >= 12)
  const seen = new Set<string>()
  for (const body of parts) {
    const why = factRefusal(body)
    if (why) { dropped[why] += 1; continue }
    const key = body.toLowerCase()
    if (seen.has(key)) { dropped.duplicate += 1; continue }
    if (facts.length >= 3) { dropped.over += 1; continue }
    seen.add(key)
    facts.push({ id: `f${facts.length + 1}`, text: body, url: src.url, host: src.host })
  }
  return { facts, dropped, found: parts.length }
}

/** Primeira URL https/http escrita na frase (para o plano B do link). */
export function firstLinkInSentence(sentence: string): string | null {
  const m = /https?:\/\/[^\s)]+/i.exec(String(sentence ?? ''))
  return m ? m[0].replace(/[.,;:!?]+$/, '') : null
}

export function estimateResearchUsd(u: { searches: number; inputTokens: number; outputTokens: number }): number {
  const n = (v: number) => (Number.isFinite(v) && v > 0 ? v : 0)
  const usd = n(u.searches) * ADS_V2_RESEARCH_USD.perSearch + (n(u.inputTokens) * ADS_V2_RESEARCH_USD.inputPerMillion + n(u.outputTokens) * ADS_V2_RESEARCH_USD.outputPerMillion) / 1_000_000
  return Math.round(usd * 10_000) / 10_000
}

/** Estado da pesquisa gravada no pedido (brief.research). 'running' velho (> 90 s) conta como falha. */
export function researchState(research: unknown, nowMs: number): AdsV2ResearchStatus {
  if (!research || typeof research !== 'object') return 'none'
  const r = research as { status?: unknown; at?: unknown }
  if (r.status === 'ok') return 'ok'
  if (r.status === 'failed') return 'failed'
  if (r.status === 'running') {
    const at = typeof r.at === 'string' ? Date.parse(r.at) : NaN
    return Number.isFinite(at) && nowMs - at <= ADS_V2_RESEARCH_STALE_MS ? 'running' : 'failed'
  }
  return 'none'
}

/** Os fatos gravados, conferidos um a um (id f1..f6, texto, https). Lixo = lista vazia. Pura. */
export function storedResearchFacts(research: unknown): AdsV2ResearchFact[] {
  if (!research || typeof research !== 'object') return []
  const r = research as { status?: unknown; facts?: unknown }
  if (r.status !== 'ok' || !Array.isArray(r.facts)) return []
  const out: AdsV2ResearchFact[] = []
  for (const f of r.facts) {
    if (!f || typeof f !== 'object') continue
    const x = f as { id?: unknown; text?: unknown; url?: unknown; host?: unknown }
    if (typeof x.id !== 'string' || !/^f[1-6]$/.test(x.id) || typeof x.text !== 'string' || !x.text.trim()) continue
    const src = cleanSourceUrl(x.url)
    if (!src) continue
    out.push({ id: x.id, text: x.text.trim(), url: src.url, host: src.host })
  }
  return out.slice(0, ADS_V2_RESEARCH_MAX_FACTS)
}
