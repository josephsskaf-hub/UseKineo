// KINEO-ADS-V2-2026-09-28 — brief e texto do anúncio v2 (etapa 2, servidor): setor, nome, oferta, contato, idioma,
// narração de até 30 palavras (15 s) e 2-3 frases de tela, extraídos com gpt-4o-mini da frase (ou do link) do cliente.
//
// REUSO, NÃO CÓPIA:
//   · buildAutoBriefMessages/parseAutoBrief (lib/ads/autoBrief.ts): a extração do brief do modo "a IA faz" — o GPT só
//     EXTRAI; número que o texto não diz é apagado; contato só se estiver no texto.
//   · inventedNumbers/inventedClaims/contactOk (lib/ads/scriptPrompt.ts): os validadores anti-invenção do roteiro v1,
//     aplicados aqui à narração, a CADA frase de tela e a CADA prompt de movimento/cena (especificação, seção 5, passo 2).
// Recusa → 1 correção com o motivo (como /api/ads/script); falhou de novo = a rota devolve 502 com o porquê, nada cobrado.
import { openai } from '@/lib/openai'
import { buildAutoBriefMessages, parseAutoBrief } from '@/lib/ads/autoBrief'
import { briefFactsText, contactOk, countWords, inventedClaims, inventedNumbers } from '@/lib/ads/scriptPrompt'
import type { AdsBrief } from '@/lib/ads/types'
import { ADS_V2_OVERLAY_MAX_CHARS, ADS_V2_SECTORS, isAdsV2Sector, type AdsV2Sector } from '@/lib/ads/v2ShotLists'
import { lowerMidSentence, missingNames, simpleCommonNoun, simpleNames, simpleProductAd } from '@/lib/ads/v2Simple'

export const ADS_V2_BRIEF_MODEL = 'gpt-4o-mini'
/** Teto de planos (chamadas ao GPT) por pessoa em 24 h, contado pelo evento ads_v2_plan_served ANTES do modelo. */
export const ADS_V2_PLAN_DAILY_CAP = 20
const CALL_TIMEOUT_MS = 20_000

export interface AdsV2Copy {
  /** null = narração desligada pelo cliente. */
  narration: string | null
  /** 2 ou 3 frases de tela: marca (antes de 5 s), o que tem/oferta, onde/contato (opcional). */
  overlays: string[]
  sectorHint: AdsV2Sector | null
}

/** Nome da marca = a parte antes do travessão em "<nome> — <o que vende>" (formato do buildAutoBriefMessages). */
export function brandName(brief: Pick<AdsBrief, 'business'>): string {
  return (brief.business ?? '').split(/\s+[—–-]\s+/)[0].trim()
}

/**
 * KINEO-ADS-SIMPLES-ACABAMENTO-2026-09-29 — a voz do modo simples, tirada da FRASE que a pessoa escreveu (regras puras em
 * lib/ads/v2Simple.ts). Teste do fundador (pedido 1ddfcf25): o brief virou "Espaço comercial — à venda ou para alugar",
 * o pedido mandou "Say the business name once" e a narração saiu "Conheça o Espaço comercial…", sem o Edifício Villa
 * Versace e sem São Paulo. Agora: os nomes que a pessoa escreveu são fato do brief (extra.customer_names) e a narração tem
 * de citá-los; se o "nome" do brief é substantivo comum, ele vai em minúscula no meio da frase (pedido E pós-processo).
 */
export interface AdsV2SimpleVoice {
  /** Nomes próprios da frase (lugar, edifício, rua, bairro, cidade, negócio), no máximo 3: a narração cita cada um. */
  names: string[]
  /** O "nome" do brief é substantivo comum: esta forma minúscula vai no meio da frase. null = é nome (ou não dá para saber). */
  commonNoun: string | null
}
export const ADS_V2_CUSTOMER_NAMES_KEY = 'customer_names'

/**
 * KINEO-ATOR-AJUSTES-2026-10-09 — QUEM fala e DO QUÊ. Canário 7112d56c (09/10, LUME eau de parfum, ator ligado): a voz saiu
 * de loja ("At LUME, we offer a captivating selection of eau de parfum that elevates your fragrance experience…") — o modo
 * simples não sabia que era um PRODUTO e o pedido de texto não sabia que uma PESSOA ia falar para a câmera.
 *   · product: anúncio de produto físico (lib/ads/v2Simple.ts simpleProductAd) — a voz fala DO PRODUTO, nunca "de loja";
 *   · presenter: o ator de IA (lib/ads/v2Presenter.ts) fala a narração segurando o produto — 1ª pessoa, tom de criador (UGC).
 * Ausente = o pedido de texto e a régua de sempre, byte a byte (guardiões Z3 do modo simples/completo).
 */
export interface AdsV2AdVoice {
  product: boolean
  presenter: boolean
}
export const ADS_V2_PRODUCT_NARRATION_RULE =
  'narration: this is a PRODUCT ad. Talk about the product itself, not about a shop: what it is, its main benefit, one sensory detail (how it looks, feels, smells or tastes — only what the brief says or what is plain from the product), and a short call to action. Speak directly to the viewer. Never sound like a store: never "At <brand>, we offer", "a selection of", "our store", "our collection" or "visit us".'
export const ADS_V2_PRESENTER_NARRATION_RULE =
  'narration: a real person says it on camera while holding the product, like a creator\'s video (UGC). Write it in the FIRST PERSON, as that person talking naturally to the camera: short, casual sentences, in the spirit of "Okay, I have to tell you about…" (written in the ad\'s language). Not an announcer, never "we offer". Keep within the word count above.'
export const ADS_V2_SHOP_TALK_WHY = 'narration: this is a product ad — talk about the product itself (what it is, the benefit, how it feels), not like a shop ("we offer", "a selection of", "our store", "visit us").'
/** Fala de LOJA num anúncio de produto (en/pt/es): "At LUME, we offer…", "a selection of", "our store", "visit us". */
export const ADS_V2_AT_BRAND_WE = /(?<![\p{L}\p{N}])[Aa]t \p{Lu}[\p{L}\p{N}&'’.-]*(?: \p{Lu}[\p{L}\p{N}&'’.-]*)*,? [Ww]e(?![\p{L}\p{N}])/u
export const ADS_V2_SHOP_TALK = /(?<![\p{L}\p{N}])(we offer|we carry|we have a (?:wide |great |curated )?(?:selection|range|collection)|(?:a|our) (?:wide |great |curated |captivating )?selection of|our (?:store|shop|boutique|collection)|visit (?:us|our)|n[oó]s oferecemos|oferecemos|nossa loja|temos uma (?:sele[cç][aã]o|variedade|linha)|uma sele[cç][aã]o de|visite (?:a )?nossa|ofrecemos|nuestra tienda|una selecci[oó]n de|vis[ií]tanos)(?![\p{L}\p{N}])/iu
/** Pura: a narração fala como loja? ("At LUME, we…" com a marca em maiúscula, ou qualquer frase de vitrine acima). */
export function isShopTalk(text: string): boolean {
  const t = String(text ?? '')
  return ADS_V2_AT_BRAND_WE.test(t) || ADS_V2_SHOP_TALK.test(t)
}
export function simpleVoiceFor(brief: Pick<AdsBrief, 'business'>, sentence: string, language: string): AdsV2SimpleVoice {
  return { names: simpleNames(sentence), commonNoun: simpleCommonNoun(brandName(brief), sentence, language) }
}
/** Os nomes que a pessoa escreveu entram no brief como fato (a régua anti-invenção lê extra: "Rua 25 de Março" não vira
 *  número inventado). Sem nomes = o brief de antes. Pura. */
export function withCustomerNames(brief: AdsBrief, names: readonly string[]): AdsBrief {
  if (!names.length) return brief
  return { ...brief, extra: { ...(brief.extra ?? {}), [ADS_V2_CUSTOMER_NAMES_KEY]: names.join('; ') } }
}

/** Cara de contato (link, domínio, @, telefone): se aparecer, tem de ser o contato do brief (contactOk). */
const CONTACTISH = /(https?:\/\/|www\.|\b[a-z0-9-]+\.(com|net|org|io|app|co|br|jo|me|shop|store)\b|@[a-z0-9_.]{2,}|\d[\d\s().-]{6,}\d)/i
const DECOR = /[[\]{}#*_]|[\u{1F300}-\u{1FAFF}]|[\u{2600}-\u{27BF}]/u

/**
 * KINEO-ADS-MODO-SIMPLES-2026-09-29 — opts.overlays === false (modo simples, "sem frases na tela"): o pedido manda
 * devolver overlays: [] e some a regra da marca. overlays ausente = o texto de sempre, byte a byte (guardião Z3).
 */
export function buildV2CopyMessages(brief: AdsBrief, languageName: string, opts: { maxWords: number; narration: boolean; overlays?: boolean; simple?: AdsV2SimpleVoice; ad?: AdsV2AdVoice }): { system: string; user: string } {
  const brand = brandName(brief)
  const noOverlays = opts.overlays === false
  const voice = opts.simple
  // Modo simples: "Espaço comercial" não é nome — vai em minúscula no meio da frase. Sem `simple` = a frase de sempre (Z3).
  const sayName = voice?.commonNoun
    ? `What is advertised ("${voice.commonNoun}") is not a name: in the middle of a sentence write it in lowercase, "${voice.commonNoun}".`
    : 'Say the business name once.'
  const system = [
    'You write the on-screen phrases and the short voice-over of a vertical video ad for a small business. The video shows the business\'s own real photos in motion.',
    'Use ONLY the facts of the brief. Never invent a price, number, discount, deadline, rating, award, customer count, product, dish, service or place.',
    `Write everything in ${languageName}.`,
    opts.narration
      ? `narration: one to three short spoken sentences, ${Math.ceil(opts.maxWords * 0.5)} to ${opts.maxWords} words in total (count them). Warm and natural. ${sayName} No phone number, link or address unless copied exactly from the brief.`
      : 'narration: return "" (the customer turned the voice-over off).',
    ...(voice && opts.narration
      ? [
          ...(voice.names.length
            ? [`narration: say each of these names exactly as the customer wrote it, at least once: ${voice.names.map((n) => `"${n}"`).join(', ')}. They only say WHERE it is (the place, the building, the street, the neighborhood, the city): never turn a name into a feature of what is advertised (a building's name or brand says nothing about the unit's finishes, furniture, size or view).`]
            : []),
          'narration: be concrete, in the customer\'s own words — what it is, where it is, and for sale or for rent if the customer said so. No empty filler such as "great opportunities" or "come and check out the opportunities".',
        ]
      : []),
    // KINEO-ATOR-AJUSTES-2026-10-09 — produto fala do produto; com o ator, 1ª pessoa para a câmera. Sem `ad` = nenhuma linha.
    ...(opts.ad?.product && opts.narration ? [ADS_V2_PRODUCT_NARRATION_RULE] : []),
    ...(opts.ad?.presenter && opts.narration ? [ADS_V2_PRESENTER_NARRATION_RULE] : []),
    ...(noOverlays
      ? ['overlays: return [] (the customer turned the on-screen phrases off).']
      : [
          `overlays: 2 or 3 very short on-screen phrases, at most ${ADS_V2_OVERLAY_MAX_CHARS} characters each, no emojis, no hashtags, no quotes.`,
          brand ? `  1st = the business name exactly as "${brand}" (you may add 2-3 words of what it sells).` : '  1st = what the business sells, in 2-4 words.',
          '  2nd = the offer, or what makes it worth it, taken from the brief.',
          '  3rd (optional) = the contact copied exactly from the brief, or where to find it. Omit it if the brief has no contact.',
        ]),
    `sector: one of ${ADS_V2_SECTORS.join(', ')}.`,
    noOverlays ? 'Answer with JSON only: {"narration":"","overlays":[],"sector":""}' : 'Answer with JSON only: {"narration":"","overlays":["",""],"sector":""}',
  ].join('\n')
  const user = [
    'Brief (the only facts you may use):',
    `- Business: ${brief.business}`,
    brief.offer ? `- Offer: ${brief.offer}` : '- Offer: (none — do not invent one)',
    brief.contact ? `- Contact: ${brief.contact}` : '- Contact: (none)',
    brief.audience ? `- Audience: ${brief.audience}` : '',
    ...Object.entries(brief.extra ?? {}).filter(([k]) => !PUBLIC_FACT_KEY.test(k)).map(([k, v]) => `- ${k}: ${v}`),
    ...publicFactsBlock(brief),
  ].filter(Boolean).join('\n')
  return { system, user }
}

/**
 * KINEO-ADS-MODO-SIMPLES-2026-09-29 (revisão de honestidade) — os fatos públicos da pesquisa são do PRÉDIO, da rua ou do
 * bairro, nunca do imóvel anunciado ("interiores assinados pela grife" é do prédio, não da loja à venda). Por isso vão
 * num bloco próprio, com a ordem de nunca atribuí-los ao imóvel. Sem fatos = nenhuma linha (o pedido fica byte a byte o
 * de antes; guardião Z3).
 */
const PUBLIC_FACT_KEY = /^public_fact_\d+$/
export const ADS_V2_PUBLIC_FACTS_HEADER =
  'Public facts found on the web about the BUILDING, the street or the neighborhood — NOT about the property or unit being advertised. Never describe them as features of the advertised property (its size, rooms, interiors, finishes, furniture, view or floor). If you use one, say it is about the building or the neighborhood ("the building has…", "the neighborhood has…"):'
function publicFactsBlock(brief: AdsBrief): string[] {
  const facts = Object.entries(brief.extra ?? {}).filter(([k]) => PUBLIC_FACT_KEY.test(k)).map(([, v]) => `- ${v}`)
  return facts.length ? [ADS_V2_PUBLIC_FACTS_HEADER, ...facts] : []
}

/** Número seguido de medida/cômodo/andar do IMÓVEL ("300 m²", "3 quartos", "5º andar"). */
const UNIT_AFTER_NUMBER = /^\s*(º|°|ª)?\s*(m²|m2|metros? quadrados?|metros? cuadrados?|sq\.?\s?ft|ft²|square (feet|foot|meters?|metres?)|quartos?|su[ií]tes?|dormit[oó]rios?|vagas?|banheiros?|bedrooms?|bathrooms?|beds?|baths?|habitaciones?|rec[aá]maras?|ba[ñn]os?|parking|garage|andar|floor|piso)(?![\p{L}\p{N}])/iu

/**
 * Números que só existem nos fatos públicos (não no que a PESSOA escreveu) usados como tamanho, cômodo, vaga ou andar
 * do imóvel: o "300" de "a 300 metros do parque" virando "300 m²". Sem fatos públicos = [] (modo completo intocado). Pura.
 */
export function factNumberMisuse(text: string, brief: AdsBrief): string[] {
  const entries = Object.entries(brief.extra ?? {})
  if (!entries.some(([k]) => PUBLIC_FACT_KEY.test(k))) return []
  const own: AdsBrief = { ...brief, extra: Object.fromEntries(entries.filter(([k]) => !PUBLIC_FACT_KEY.test(k))) }
  const ownDigits = new Set(briefFactsText(own).replace(/[.,\s](?=\d{3}\b)/g, '').match(/\d+/g) ?? [])
  const t = String(text ?? '').replace(/[.,\s](?=\d{3}\b)/g, '')
  const out: string[] = []
  for (const m of t.matchAll(/\d+/g)) {
    if (ownDigits.has(m[0])) continue
    if (UNIT_AFTER_NUMBER.test(t.slice((m.index ?? 0) + m[0].length))) out.push(m[0])
  }
  return [...new Set(out)]
}

/** Anti-invenção sobre um texto qualquer do anúncio (número, fama/urgência, contato). Devolve os motivos. */
export function textIssues(text: string, brief: AdsBrief, label: string): string[] {
  const why: string[] = []
  const nums = inventedNumbers(text, brief)
  if (nums.length) why.push(`${label}: remove these numbers that are not in the brief: ${[...new Set(nums)].join(', ')}.`)
  const claims = inventedClaims(text, brief)
  if (claims.length) why.push(`${label}: remove these claims that the brief does not support: ${claims.join('; ')}.`)
  const misuse = factNumberMisuse(text, brief)
  if (misuse.length) why.push(`${label}: ${misuse.join(', ')} comes from the public facts about the building or the neighborhood; never use it as the size, rooms, parking or floor of the advertised property.`)
  if (CONTACTISH.test(text) && !(brief.contact && contactOk(text, brief.contact))) {
    why.push(`${label}: a phone, link, @handle or address must be copied exactly from the brief${brief.contact ? ` (${brief.contact})` : ' — the brief has none, so remove it'}.`)
  }
  return why
}

/** Valida a resposta do modelo. Pura; nunca lança. */
export function checkV2Copy(raw: string, brief: AdsBrief, opts: { maxWords: number; narration: boolean; overlays?: boolean; simple?: AdsV2SimpleVoice; ad?: AdsV2AdVoice }): { ok: true; copy: AdsV2Copy } | { ok: false; why: string[] } {
  let p: Record<string, unknown>
  try {
    const j = JSON.parse(raw)
    if (!j || typeof j !== 'object' || Array.isArray(j)) return { ok: false, why: ['Answer with valid JSON only.'] }
    p = j as Record<string, unknown>
  } catch {
    return { ok: false, why: ['Answer with valid JSON only.'] }
  }
  const why: string[] = []
  let narration: string | null = null
  if (opts.narration) {
    narration = typeof p.narration === 'string' ? p.narration.replace(/\s+/g, ' ').trim() : ''
    // Modo simples: substantivo comum com maiúscula no meio da frase volta à minúscula ("Conheça o Espaço comercial" →
    // "Conheça o espaço comercial"); e cada nome que a pessoa escreveu tem de estar na narração.
    const voice = opts.simple
    if (voice?.commonNoun) narration = lowerMidSentence(narration, voice.commonNoun, voice.commonNoun)
    const missing = voice ? missingNames(narration, voice.names) : []
    if (missing.length) why.push(`narration: say ${missing.map((n) => `"${n}"`).join(', ')} exactly as the customer wrote ${missing.length > 1 ? 'them' : 'it'} — it is where the ad takes place.`)
    const words = countWords(narration)
    const min = Math.ceil(opts.maxWords * 0.5)
    if (words < min || words > opts.maxWords) why.push(`narration: write ${min} to ${opts.maxWords} words (you wrote ${words}).`)
    if (DECOR.test(narration)) why.push('narration: no brackets, markdown or emojis.')
    // KINEO-ATOR-AJUSTES-2026-10-09 — anúncio de produto não fala como loja ("At LUME, we offer a selection of…").
    if (opts.ad?.product && isShopTalk(narration)) why.push(ADS_V2_SHOP_TALK_WHY)
    why.push(...textIssues(narration, brief, 'narration'))
  }
  // Modo simples com as frases desligadas: o que o modelo mandar em overlays é IGNORADO (nenhuma frase na tela).
  if (opts.overlays === false) {
    if (why.length) return { ok: false, why }
    return { ok: true, copy: { narration, overlays: [], sectorHint: isAdsV2Sector(p.sector) ? p.sector : null } }
  }
  const rawOverlays = Array.isArray(p.overlays) ? p.overlays : []
  const common = opts.simple?.commonNoun ?? null
  const overlays = rawOverlays.map((o) => (typeof o === 'string' ? o.replace(/\s+/g, ' ').trim() : '')).filter(Boolean).map((o) => (common ? lowerMidSentence(o, common, common) : o))
  if (overlays.length < 2 || overlays.length > 3) why.push('overlays: return 2 or 3 non-empty phrases.')
  overlays.forEach((o, i) => {
    if (o.length > ADS_V2_OVERLAY_MAX_CHARS) why.push(`overlays[${i}]: at most ${ADS_V2_OVERLAY_MAX_CHARS} characters (it has ${o.length}).`)
    if (DECOR.test(o) || /["“”]/.test(o)) why.push(`overlays[${i}]: no quotes, brackets, hashtags or emojis.`)
    why.push(...textIssues(o, brief, `overlays[${i}]`))
  })
  const brand = brandName(brief)
  if (brand && brand.length <= ADS_V2_OVERLAY_MAX_CHARS && overlays[0] && !overlays[0].toLowerCase().includes(brand.toLowerCase())) {
    why.push(`overlays[0]: must contain the business name exactly as "${brand}" (the brand shows in the first 5 seconds).`)
  }
  if (why.length) return { ok: false, why }
  const sectorHint = isAdsV2Sector(p.sector) ? p.sector : null
  return { ok: true, copy: { narration, overlays, sectorHint } }
}

/**
 * Os prompts de movimento e de cena são MOLDES em código (lib/ads/v2ShotLists.ts), mas passam pela mesma régua:
 * se um dia um molde ganhar número, fama ou um contato, o plano é recusado antes de ir à fal. Só dois literais de
 * câmera são permitidos, porque não são fato do cliente: a proporção "9:16" e o ângulo "N-degree" dos movimentos
 * ("Slow 20-degree orbit"). Sem esta exceção o próprio molde reprovaria todo plano de produto cujo brief não diz 20
 * (achado do guardião test-ads-v2-servidor V7 na 1ª rodada).
 */
export function checkV2Prompts(prompts: readonly string[], brief: AdsBrief): string[] {
  const why: string[] = []
  prompts.forEach((p, i) => {
    const bare = p.replace(/\b9:16\b/g, ' ').replace(/\b\d{1,3}-degree\b/g, 'degree')
    why.push(...textIssues(bare, brief, `prompt[${i}]`))
  })
  return why
}

async function callJson(messages: { role: 'system' | 'user' | 'assistant'; content: string }[], temperature: number, maxTokens: number): Promise<string> {
  const completion = await openai.chat.completions.create(
    { model: ADS_V2_BRIEF_MODEL, messages, temperature, max_tokens: maxTokens, response_format: { type: 'json_object' } },
    { timeout: CALL_TIMEOUT_MS, maxRetries: 0 },
  )
  return completion.choices[0]?.message?.content ?? ''
}

export type AdsV2BriefResult =
  | { ok: true; brief: AdsBrief; copy: AdsV2Copy; dropped: string[]; attempts: number; voice?: AdsV2SimpleVoice & { namesMissing: string[] }; ad?: AdsV2AdVoice }
  | { ok: false; stage: 'brief' | 'copy'; why: string[]; attempts: number }

/** Fatos públicos escolhidos (modo simples) entram no brief como extra.public_fact_N: o texto os enxerga e a régua
 *  anti-invenção (briefFactsText lê extra) os trata como fato. Pura. */
export function withPublicFacts(brief: AdsBrief, facts: readonly string[] | undefined): AdsBrief {
  const list = (facts ?? []).map((f) => f.replace(/\s+/g, ' ').trim()).filter(Boolean)
  if (!list.length) return brief
  const extra: Record<string, string> = { ...(brief.extra ?? {}) }
  list.forEach((f, i) => { extra[`public_fact_${i + 1}`] = f })
  return { ...brief, extra }
}

/** Extrai o brief (1 chamada) e escreve o texto (1 chamada + no máximo 1 correção com o motivo). */
export async function extractAdsV2Brief(args: {
  text: string
  language: string
  languageName: string
  maxWords: number
  narration: boolean
  /** Modo simples: false = sem frases na tela. Ausente = como sempre. */
  overlays?: boolean
  /** Modo simples: fatos públicos com fonte que a pessoa deixou marcados (texto resolvido NO SERVIDOR). */
  facts?: string[]
  /** Modo simples: a frase EXATA que a pessoa escreveu (sem as linhas de preço/contato). Dela saem os nomes que a narração
   *  cita e se o "nome" do brief é substantivo comum. Ausente = como sempre (modo completo intocado). */
  sentence?: string
  /** KINEO-ATOR-AJUSTES-2026-10-09 — modo simples: alguma foto marcada como produto (com a frase, decide se o anúncio é de
   *  PRODUTO — simpleProductAd); e o ATOR fala a narração. Ausentes = como sempre. */
  productPhoto?: boolean
  presenter?: boolean
}): Promise<AdsV2BriefResult> {
  const briefMsgs = buildAutoBriefMessages(args.text, args.languageName)
  const briefRaw = await callJson([{ role: 'system', content: briefMsgs.system }, { role: 'user', content: briefMsgs.user }], 0.2, 900)
  const parsed = parseAutoBrief(briefRaw, args.text, args.language)
  let attempts = 1
  if (parsed.needs.includes('business')) return { ok: false, stage: 'brief', why: ['business_name_missing'], attempts }
  const voice = typeof args.sentence === 'string' ? simpleVoiceFor(parsed.brief, args.sentence, args.language) : null
  const brief = withCustomerNames(withPublicFacts(parsed.brief, args.facts), voice?.names ?? [])
  const base0 = args.overlays === false ? { maxWords: args.maxWords, narration: args.narration, overlays: false } : { maxWords: args.maxWords, narration: args.narration }
  const base1 = voice ? { ...base0, simple: voice } : base0
  // KINEO-ATOR-AJUSTES-2026-10-09 — produto e/ou ator: o pedido de texto ganha as regras de quem fala e do quê.
  const productAd = typeof args.sentence === 'string' && simpleProductAd(args.sentence, args.productPhoto === true)
  const ad: AdsV2AdVoice | null = productAd || args.presenter === true ? { product: productAd, presenter: args.presenter === true } : null
  const opts: typeof base1 & { ad?: AdsV2AdVoice } = ad ? { ...base1, ad } : base1
  const copyMsgs = buildV2CopyMessages(brief, args.languageName, opts)
  const base = [{ role: 'system' as const, content: copyMsgs.system }, { role: 'user' as const, content: copyMsgs.user }]
  let raw = await callJson(base, 0.6, 700)
  attempts += 1
  let checked = checkV2Copy(raw, brief, opts)
  if (!checked.ok) {
    // 1 correção com o motivo da recusa (padrão do /api/ads/script).
    const fix = checked.why
    raw = await callJson([
      ...base,
      { role: 'assistant', content: raw.slice(0, 4000) || '{}' },
      { role: 'user', content: `This cannot be used. Fix all of this and answer again:\n- ${fix.join('\n- ')}\nKeep every other rule. Answer with the JSON only.` },
    ], 0.4, 700)
    attempts += 1
    checked = checkV2Copy(raw, brief, opts)
  }
  // Os nomes são acabamento, não honestidade: se a 2ª resposta só deixou de citar algum nome (e passa em TODO o resto —
  // número, fama, contato, tamanho), ela é aceita e o que faltou vai para o evento. Nunca um 502 por causa de um nome.
  // KINEO-ATOR-AJUSTES-2026-10-09 — a fala de loja num anúncio de produto também é acabamento (o pedido e 1 correção já a
  // recusaram): nunca um 502 por causa do tom.
  let namesMissing: string[] = []
  const relaxNames = !!voice && voice.names.length > 0
  const relaxShop = opts.ad?.product === true
  if (!checked.ok && (relaxNames || relaxShop)) {
    const relaxedOpts = { ...opts, ...(voice ? { simple: { ...voice, names: [] } } : {}), ...(opts.ad ? { ad: { ...opts.ad, product: false } } : {}) }
    const relaxed = checkV2Copy(raw, brief, relaxedOpts)
    if (relaxed.ok) {
      namesMissing = voice ? missingNames(relaxed.copy.narration ?? '', voice.names) : []
      checked = relaxed
    }
  }
  if (!checked.ok) return { ok: false, stage: 'copy', why: checked.why.slice(0, 6), attempts }
  return { ok: true, brief, copy: checked.copy, dropped: parsed.dropped, attempts, ...(voice ? { voice: { ...voice, namesMissing } } : {}), ...(ad ? { ad } : {}) }
}
