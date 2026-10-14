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
// KINEO-ANUNCIO-CONSERTOS-2026-10-12 — a narração e as frases só afirmam o que veio do cliente (regra no pedido + régua + conserto).
// KINEO-ATOR-FTC-2026-10-13 — repairTestimonial: com o ator, a narração consertada em código deixa de ser depoimento de cliente.
import { ADS_V2_HONESTY_RULE, adsV2PlaceRule, honestyIssues, isDemonym, repairHonesty, repairTestimonial, type AdsV2HonestySource } from '@/lib/ads/v2Honesty'
import { adsV2BusinessFallback, adsV2FinishCopyRaw, adsV2GenericBrandUses, adsV2GenericProduct, adsV2GenericRule, adsV2GenericWhy, adsV2HasNarration, adsV2SpeechMinWords, adsV2SpeechNarrationLine, adsV2VariantFirstOverlay, type AdsV2GenericProduct } from '@/lib/ads/v2CopyFit' // KINEO-ADS-RETESTE-1510 — piso de fala (90% do anúncio na voz MiniMax) e produto genérico que não é marca ("da Perfume")
import { adsV2GenericThis, adsV2NarrationBelow } from '@/lib/ads/v2CopyFit' // KINEO-ADS-DEMO-UNIVERSO-1410 — o nome dos fechos de fala no produto genérico ("este perfume") e "a fala ficou abaixo do piso"

export const ADS_V2_BRIEF_MODEL = 'gpt-4o-mini'
/** Teto de planos (chamadas ao GPT) por pessoa em 24 h, contado pelo evento ads_v2_plan_served ANTES do modelo. */
export const ADS_V2_PLAN_DAILY_CAP = 20
// KINEO-ADS-CENA-2026-10-13 — PLANO QUE MORRIA EM TIMEOUT (fundador 13/10 19:10:06 UTC, request fvsq2-1791918606278): o
// /api/ads/v2/plan logou "[ads/v2/plan] falhou: Request timed out." 21,5 s depois de começar — 1,5 s de portas/moderação +
// os 20 s da 1ª chamada (a do brief, 900 tokens). O APIConnectionTimeoutError subia do callJson, o catch da rota devolvia
// plan_failed 502 ("Something went wrong on our side") e nenhum evento contava o porquê. Agora: 15 s por tentativa, UMA
// nova tentativa no timeout (só se cabe no prazo), prazo total amarrado ao maxDuration 60 da rota (o núcleo passa
// deadlineMs = início + ADS_V2_PLAN_MODEL_DEADLINE_MS; sem ele, ADS_V2_BRIEF_BUDGET_MS a partir da extração), e o timeout
// final vira { ok:false, why:[ADS_V2_BRIEF_TIMEOUT_WHY] } — a rota responde 503 'unavailable' ("nada foi cobrado, tente
// em um minuto") com o evento ads_v2_plan_served. O plano nunca cobra: falhar fechado aqui não custa nada a ninguém.
const CALL_TIMEOUT_MS = 15_000 // KINEO-ADS-CENA-2026-10-13 — era 20_000 (uma tentativa só)
/** Prazo das chamadas ao modelo, contado do INÍCIO da rota do plano (maxDuration 60 − ~8 s para gravar e responder). */
export const ADS_V2_PLAN_MODEL_DEADLINE_MS = 52_000
/** Sem prazo vindo de quem chama: o orçamento das chamadas a partir da extração. */
export const ADS_V2_BRIEF_BUDGET_MS = 42_000
/** Menos que isto no prazo = nem tenta (a chamada morreria no meio); é também o mínimo para a nova tentativa. */
export const ADS_V2_BRIEF_MIN_CALL_MS = 5_000
/** Quantas novas tentativas no timeout cabem numa extração inteira (brief + texto + correção). */
export const ADS_V2_BRIEF_TIMEOUT_RETRIES = 1
export const ADS_V2_BRIEF_TIMEOUT_WHY = 'model_timeout'
/** Teto dos fatos públicos que entram no pedido ao modelo (o prompt não incha com a pesquisa). */
export const ADS_V2_BRIEF_FACTS_MAX = 6
export const ADS_V2_BRIEF_FACT_MAX_CHARS = 200

/** O erro é o timeout do SDK da OpenAI (APIConnectionTimeoutError "Request timed out.") ou um abort por prazo? Pura. */
export function isAdsV2ModelTimeout(e: unknown): boolean {
  if (!e || typeof e !== 'object') return false
  const x = e as { name?: unknown; message?: unknown; constructor?: { name?: unknown } }
  const name = `${String(x.name ?? '')} ${String(x.constructor?.name ?? '')}`
  return /APIConnectionTimeoutError|TimeoutError|AdsV2BriefTimeout/.test(name) || /request timed out|timed? ?out/i.test(String(x.message ?? ''))
}

/** O prazo das chamadas de UMA extração: quando acaba e quantas novas tentativas no timeout ainda restam. */
interface AdsV2CallBudget { deadline: number; retriesLeft: number; retried: number }
class AdsV2BriefTimeout extends Error {
  constructor() {
    super('Request timed out.')
    this.name = 'AdsV2BriefTimeout'
  }
}

export interface AdsV2Copy {
  /** null = narração desligada pelo cliente. */
  narration: string | null
  /** 2 ou 3 frases de tela: marca (antes de 5 s), o que tem/oferta, onde/contato (opcional). */
  overlays: string[]
  sectorHint: AdsV2Sector | null
}

/** Nome da marca = a parte antes do travessão em "<nome> — <o que vende>" (formato do buildAutoBriefMessages). */
export function brandName(brief: Pick<AdsBrief, 'business'>): string {
  return (brief.business ?? '').split(/\s+[—–-]\s+/)[0].trim().replace(/\s*[—–-]\s*$/, '') // KINEO-ADS-CONSERTOS-1410 — "perfume —" (travessão sem nada depois) não vira "perfume —" na tela
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
 *   · presenter: o ator de IA (lib/ads/v2Presenter.ts) fala a narração segurando o produto — APRESENTADOR, terceira pessoa /
 *     voz de marca, nunca depoimento de cliente (KINEO-ATOR-FTC-2026-10-13; antes era 1ª pessoa de criador, UGC).
 * Ausente = o pedido de texto e a régua de sempre, byte a byte (guardiões Z3 do modo simples/completo).
 */
export interface AdsV2AdVoice {
  product: boolean
  presenter: boolean
}
export const ADS_V2_PRODUCT_NARRATION_RULE =
  'narration: this is a PRODUCT ad. Talk about the product itself, not about a shop: what it is, its main benefit, one sensory detail (how it looks, feels, smells or tastes — only what the brief says or what is plain from the product), and a short call to action. Speak directly to the viewer. Never sound like a store: never "At <brand>, we offer", "a selection of", "our store", "our collection" or "visit us".'
// KINEO-ATOR-FTC-2026-10-13 — era "FIRST PERSON… like a creator's video (UGC)… 'Okay, I have to tell you about…'": a pessoa
// de IA falava como CLIENTE que usou o produto (depoimento falso / endosso enganoso para a FTC). Agora é APRESENTADOR, em
// terceira pessoa / voz de marca; a régua em código (lib/ads/v2Honesty.ts testimonialMarks/repairTestimonial) confere.
export const ADS_V2_PRESENTER_NARRATION_RULE =
  'narration: an AI presenter says it on camera while holding the product. The presenter is NOT a customer and never used the product: write it as a presenter or in the brand\'s voice — third person, or speaking to the viewer — in the spirit of "Meet <name>…", "This is <name> — …" or "Here\'s why…" (written in the ad\'s language). Never a testimonial: no "I bought", "I use", "I\'ve been using", "I tried", "I love it", "I recommend", "my skin", "changed my life", no personal result and no before/after. Short, natural sentences; never "we offer". Keep within the word count above.'
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
export function buildV2CopyMessages(brief: AdsBrief, languageName: string, opts: { maxWords: number; narration: boolean; overlays?: boolean; simple?: AdsV2SimpleVoice; ad?: AdsV2AdVoice; honesty?: AdsV2HonestySource; speechMin?: number; generic?: AdsV2GenericProduct | null }): { system: string; user: string } { // KINEO-ADS-RETESTE-1510 — speechMin/generic opcionais: ausentes = o pedido de sempre, byte a byte (Z3)
  const brand = brandName(brief)
  const noOverlays = opts.overlays === false
  const voice = opts.simple
  // Modo simples: "Espaço comercial" não é nome — vai em minúscula no meio da frase. Sem `simple` = a frase de sempre (Z3).
  const sayName = voice?.commonNoun
    ? `What is advertised ("${voice.commonNoun}") is not a name: in the middle of a sentence write it in lowercase, "${voice.commonNoun}".`
    : 'Say the business name once.'
  const nameRule = opts.generic ? adsV2GenericRule(opts.generic) : sayName // KINEO-ADS-RETESTE-1510 — produto genérico ("Perfume"): nunca como marca, "este perfume"
  const system = [
    'You write the on-screen phrases and the short voice-over of a vertical video ad for a small business. The video shows the business\'s own real photos in motion.',
    'Use ONLY the facts of the brief. Never invent a price, number, discount, deadline, rating, award, customer count, product, dish, service or place.',
    // KINEO-ANUNCIO-CONSERTOS-2026-10-12 — com a fonte do cliente (a rota sempre passa), a regra de honestidade. Sem = Z3.
    ...(opts.honesty ? [ADS_V2_HONESTY_RULE] : []),
    `Write everything in ${languageName}.`,
    opts.narration
      ? typeof opts.speechMin === 'number' ? adsV2SpeechNarrationLine(opts.speechMin, opts.maxWords, nameRule) : `narration: one to three short spoken sentences, ${Math.ceil(opts.maxWords * 0.5)} to ${opts.maxWords} words in total (count them). Warm and natural. ${nameRule} No phone number, link or address unless copied exactly from the brief.` // KINEO-ADS-RETESTE-1510 — com o piso de fala, a linha nova; sem ele, a de sempre
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
    // KINEO-ANUNCIO-CONSERTOS-2026-10-12 — produto: o lugar é opcional e só em forma natural ("made in the UK", "from Toronto").
    ...(opts.honesty?.product && opts.narration ? [adsV2PlaceRule(opts.honesty.places)] : []),
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
export function checkV2Copy(raw: string, brief: AdsBrief, opts: { maxWords: number; narration: boolean; overlays?: boolean; simple?: AdsV2SimpleVoice; ad?: AdsV2AdVoice; honesty?: AdsV2HonestySource; minWords?: number; speechMin?: number; generic?: AdsV2GenericProduct | null }): { ok: true; copy: AdsV2Copy } | { ok: false; why: string[] } { // KINEO-ADS-RETESTE-1510 — speechMin = piso de fala; generic = produto que não é marca
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
    const genericUses = opts.generic ? adsV2GenericBrandUses(narration, opts.generic) : [] // KINEO-ADS-RETESTE-1510 — lido ANTES da minúscula ("da Perfume" vira "da perfume" e ainda é marca)
    if (opts.generic && genericUses.length) why.push(adsV2GenericWhy('narration', opts.generic, genericUses)) // KINEO-ADS-RETESTE-1510
    if (voice?.commonNoun) narration = lowerMidSentence(narration, voice.commonNoun, voice.commonNoun)
    const missing = voice ? missingNames(narration, voice.names) : []
    if (missing.length) why.push(`narration: say ${missing.map((n) => `"${n}"`).join(', ')} exactly as the customer wrote ${missing.length > 1 ? 'them' : 'it'} — it is where the ad takes place.`)
    const words = countWords(narration)
    // KINEO-ANUNCIO-CONSERTOS-2026-10-12 — minWords: só o texto CONSERTADO em código (a frase inventada saiu) aceita menos palavras.
    const min = typeof opts.minWords === 'number' ? opts.minWords : typeof opts.speechMin === 'number' ? opts.speechMin : Math.ceil(opts.maxWords * 0.5) // KINEO-ADS-RETESTE-1510 — o piso de fala vale quando vem; o conserto em código (minWords) continua mandando
    if (words < min || words > opts.maxWords) why.push(`narration: write ${min} to ${opts.maxWords} words (you wrote ${words}).`)
    if (DECOR.test(narration)) why.push('narration: no brackets, markdown or emojis.')
    // KINEO-ATOR-AJUSTES-2026-10-09 — anúncio de produto não fala como loja ("At LUME, we offer a selection of…").
    if (opts.ad?.product && isShopTalk(narration)) why.push(ADS_V2_SHOP_TALK_WHY)
    why.push(...textIssues(narration, brief, 'narration'))
    if (opts.honesty) why.push(...honestyIssues(narration, opts.honesty, 'narration'))
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
    if (opts.honesty) why.push(...honestyIssues(o, opts.honesty, `overlays[${i}]`))
    if (i > 0 && opts.generic && adsV2GenericBrandUses(o, opts.generic).length) why.push(adsV2GenericWhy(`overlays[${i}]`, opts.generic, adsV2GenericBrandUses(o, opts.generic))) // KINEO-ADS-RETESTE-1510 — a 1ª frase é o título (pode ter o nome)
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

/** KINEO-ANUNCIO-CONSERTOS-2026-10-12 — conserta narração e frases de uma resposta JSON (repairHonesty); frase de tela que
 *  ficou vazia sai. null = nada a consertar (ou JSON ilegível). Pura. */
export function repairCopyRaw(raw: string, honesty: AdsV2HonestySource): { raw: string; fixes: string[] } | null {
  let p: Record<string, unknown>
  try {
    const j = JSON.parse(raw)
    if (!j || typeof j !== 'object' || Array.isArray(j)) return null
    p = j as Record<string, unknown>
  } catch {
    return null
  }
  const fixes: string[] = []
  const out: Record<string, unknown> = { ...p }
  if (typeof p.narration === 'string') {
    const r = repairHonesty(p.narration, honesty)
    if (r.fixes.length) { out.narration = r.text; fixes.push(...r.fixes) }
    // KINEO-ATOR-FTC-2026-10-13 — com o ator: gancho de criador vira apresentação; a frase de cliente (uso/compra/gosto/resultado) sai.
    if (honesty.presenter) {
      const t = repairTestimonial(String(out.narration ?? ''), honesty.brand)
      if (t.fixes.length) { out.narration = t.text; fixes.push(...t.fixes) }
    }
  }
  if (Array.isArray(p.overlays)) {
    out.overlays = p.overlays
      .map((o) => {
        if (typeof o !== 'string') return o
        const r = repairHonesty(o, honesty)
        if (r.fixes.length) fixes.push(...r.fixes.map((f) => `overlay:${f}`))
        return r.fixes.length ? r.text : o
      })
      .filter((o) => typeof o !== 'string' || o.trim())
  }
  return fixes.length ? { raw: JSON.stringify(out), fixes } : null
}

async function callJson(messages: { role: 'system' | 'user' | 'assistant'; content: string }[], temperature: number, maxTokens: number, budget?: AdsV2CallBudget): Promise<string> {
  // KINEO-ADS-CENA-2026-10-13 — cada tentativa cabe no prazo (nunca passa de CALL_TIMEOUT_MS nem do que resta); timeout =
  // UMA nova tentativa por extração, só se ainda há ADS_V2_BRIEF_MIN_CALL_MS de prazo. Erro que não é timeout sobe igual.
  const room = () => (budget ? budget.deadline - Date.now() : CALL_TIMEOUT_MS)
  const once = (timeout: number) => openai.chat.completions.create(
    { model: ADS_V2_BRIEF_MODEL, messages, temperature, max_tokens: maxTokens, response_format: { type: 'json_object' } },
    { timeout, maxRetries: 0 },
  )
  const first = Math.min(CALL_TIMEOUT_MS, room())
  if (first < ADS_V2_BRIEF_MIN_CALL_MS) throw new AdsV2BriefTimeout()
  let completion
  try {
    completion = await once(first)
  } catch (e) {
    const left = room()
    if (!budget || !isAdsV2ModelTimeout(e) || budget.retriesLeft <= 0 || left < ADS_V2_BRIEF_MIN_CALL_MS) throw e
    budget.retriesLeft -= 1
    budget.retried += 1
    completion = await once(Math.min(CALL_TIMEOUT_MS, left))
  }
  return completion.choices[0]?.message?.content ?? ''
}

// ═══ KINEO-ADS-ROTEIROS-2026-10-13 — 2 a 3 roteiros para escolher ════════════════════════════════════════════════════
// O texto de sempre é o roteiro 1 (tom 'benefit'). Com scripts: true, UMA chamada a mais (em paralelo com a do texto, sob o
// MESMO prazo, sem nova tentativa) pede 2 versões em outros tons. Cada versão passa pela MESMA régua do texto de sempre
// (checkV2Copy com as mesmas opções; o afrouxamento de nomes/tom de loja e o conserto em código de repairCopyRaw, como o
// texto de sempre) — mas SEM baixar o piso de palavras: versão que só passa encurtada sai. Timeout, erro ou JSON ruim = 0
// versões e o plano segue com 1 roteiro. Ausente scripts = nenhuma chamada a mais (os guardiões contam as chamadas).
export type AdsV2AltTone = 'bold' | 'story'
export const ADS_V2_ALT_TONES: readonly AdsV2AltTone[] = ['bold', 'story']
/** max_tokens da chamada das versões (≠ 900 do brief e 700 do texto: os simuladores dos guardiões respondem por ele). */
export const ADS_V2_VARIANTS_MAX_TOKENS = 1100
export const ADS_V2_VARIANTS_HEADER =
  'Now write TWO alternative versions of this same ad, each in a different tone. Each version follows EVERY rule above: only the facts of the brief, the same language, the same word count for the narration, the same on-screen phrases rules (the business name in the 1st one). The two versions must not repeat each other\'s sentences.'
export const ADS_V2_TONE_RULES: Readonly<Record<AdsV2AltTone, string>> = {
  bold: 'Version "bold": open with a scroll-stopping hook in the first words — a short question or a bold statement built ONLY from the brief (never fake urgency, scarcity, a deadline, a ranking, a superlative or a number the brief does not have) — then the product and a crisp call to action. Punchy, short sentences.',
  story: 'Version "story": open on a small everyday moment or mood the viewer recognizes, then bring in what is advertised as the answer, and close warmly with the call to action. Never a personal experience or result, never a testimonial, never "I" or "my". Warm and evocative.',
}
/** A cena que a pessoa escolheu (KINEO-ADS-CENA) pode dar o clima da versão "story" — nunca vira fato do produto. */
export function adsV2StorySceneRule(scene: string): string {
  return `The video is set in this scene chosen by the customer: "${scene}". The "story" version may borrow its mood. It only describes the place and the light of the video — never present it as a fact about the product.`
}

export interface AdsV2CopyVariant { tone: AdsV2AltTone; copy: AdsV2Copy; honestyFixes?: string[] }
/** O que aconteceu com as versões: pedidas, aprovadas e por que faltou (timeout/error/bad_json/skipped). */
export interface AdsV2VariantsInfo { asked: number; kept: number; dropped: number; why?: string }

/** O pedido das versões: o MESMO system do texto (todas as regras), sem a linha de resposta, + tons + a forma {variants}. Pura. */
export function buildV2VariantMessages(copyMsgs: { system: string; user: string }, opts: { overlays?: boolean; scene?: string | null }): { system: string; user: string } {
  const cut = copyMsgs.system.lastIndexOf('\nAnswer with JSON only:')
  const rules = cut >= 0 ? copyMsgs.system.slice(0, cut) : copyMsgs.system
  const ov = opts.overlays === false ? '[]' : '["",""]'
  const system = [
    rules,
    ADS_V2_VARIANTS_HEADER,
    ADS_V2_TONE_RULES.bold,
    ADS_V2_TONE_RULES.story,
    ...(opts.scene ? [adsV2StorySceneRule(opts.scene)] : []),
    `Answer with JSON only: {"variants":[{"tone":"bold","narration":"","overlays":${ov}},{"tone":"story","narration":"","overlays":${ov}}]}`,
  ].join('\n')
  return { system, user: copyMsgs.user }
}

/** As versões da resposta, cada uma no formato do texto de sempre ({narration, overlays, sector}). Sem tom conhecido = o tom
 *  da posição; tom repetido sai; no máximo 2. JSON ruim = null. Pura. */
export function parseV2Variants(raw: string): { tone: AdsV2AltTone; raw: string }[] | null {
  let p: unknown
  try {
    p = JSON.parse(raw)
  } catch {
    return null
  }
  const list = p && typeof p === 'object' && !Array.isArray(p) ? (p as { variants?: unknown }).variants : null
  if (!Array.isArray(list)) return null
  const out: { tone: AdsV2AltTone; raw: string }[] = []
  list.slice(0, ADS_V2_ALT_TONES.length).forEach((v, i) => {
    if (!v || typeof v !== 'object' || Array.isArray(v)) return
    const x = v as Record<string, unknown>
    const tone = (ADS_V2_ALT_TONES as readonly unknown[]).includes(x.tone) ? (x.tone as AdsV2AltTone) : ADS_V2_ALT_TONES[i]
    if (out.some((o) => o.tone === tone)) return
    out.push({ tone, raw: JSON.stringify({ narration: x.narration ?? '', overlays: x.overlays ?? [], sector: '' }) })
  })
  return out
}

type AdsV2CopyOpts = Parameters<typeof checkV2Copy>[2]
/** UMA versão pela MESMA régua do texto de sempre (sem baixar o piso de palavras). Pura; nunca lança. */
export function checkV2Variant(raw: string, brief: AdsBrief, opts: AdsV2CopyOpts, relaxedOpts: AdsV2CopyOpts, honesty: AdsV2HonestySource): { ok: true; copy: AdsV2Copy; fixes: string[] } | { ok: false; why: string[] } {
  let c = checkV2Copy(raw, brief, opts)
  if (!c.ok) {
    const r = checkV2Copy(raw, brief, relaxedOpts)
    if (r.ok) c = r
  }
  let fixes: string[] = []
  if (!c.ok) {
    const repaired = repairCopyRaw(raw, honesty)
    if (repaired) {
      const again = checkV2Copy(repaired.raw, brief, relaxedOpts)
      if (again.ok) { c = again; fixes = repaired.fixes }
    }
  }
  return c.ok ? { ok: true, copy: c.copy, fixes } : { ok: false, why: c.why }
}

/** A chamada das versões: prazo próprio (o MESMO deadline, sem nova tentativa) e NUNCA rejeita. */
async function variantsCall(msgs: { system: string; user: string }, deadline: number): Promise<{ list: { tone: AdsV2AltTone; raw: string }[]; why?: string }> {
  try {
    const raw = await callJson([{ role: 'system', content: msgs.system }, { role: 'user', content: msgs.user }], 0.8, ADS_V2_VARIANTS_MAX_TOKENS, { deadline, retriesLeft: 0, retried: 0 })
    const list = parseV2Variants(raw)
    return list ? { list } : { list: [], why: 'bad_json' }
  } catch (e) {
    return { list: [], why: isAdsV2ModelTimeout(e) ? 'timeout' : 'error' }
  }
}

export type AdsV2BriefResult =
  | { ok: true; brief: AdsBrief; copy: AdsV2Copy; dropped: string[]; attempts: number; voice?: AdsV2SimpleVoice & { namesMissing: string[] }; ad?: AdsV2AdVoice; honestyFixes?: string[]; timeoutRetries?: number; variants?: AdsV2CopyVariant[]; variantsInfo?: AdsV2VariantsInfo; speechShort?: boolean } // KINEO-ADS-RETESTE-1510
  | { ok: false; stage: 'brief' | 'copy' | 'timeout'; why: string[]; attempts: number; timeoutRetries?: number }

/** Fatos públicos escolhidos (modo simples) entram no brief como extra.public_fact_N: o texto os enxerga e a régua
 *  anti-invenção (briefFactsText lê extra) os trata como fato. Pura.
 *  KINEO-ADS-CENA-2026-10-13 — no máximo ADS_V2_BRIEF_FACTS_MAX fatos de até ADS_V2_BRIEF_FACT_MAX_CHARS (o prompt não incha). */
export function withPublicFacts(brief: AdsBrief, facts: readonly string[] | undefined): AdsBrief {
  const list = (facts ?? []).map((f) => f.replace(/\s+/g, ' ').trim().slice(0, ADS_V2_BRIEF_FACT_MAX_CHARS)).filter(Boolean).slice(0, ADS_V2_BRIEF_FACTS_MAX)
  if (!list.length) return brief
  const extra: Record<string, string> = { ...(brief.extra ?? {}) }
  list.forEach((f, i) => { extra[`public_fact_${i + 1}`] = f })
  return { ...brief, extra }
}

/**
 * Extrai o brief (1 chamada) e escreve o texto (1 chamada + no máximo 1 correção com o motivo).
 * KINEO-ADS-CENA-2026-10-13 — tudo dentro de UM prazo (deadlineMs absoluto, vindo do núcleo do /plan; sem ele,
 * ADS_V2_BRIEF_BUDGET_MS a partir daqui) com no máximo ADS_V2_BRIEF_TIMEOUT_RETRIES nova tentativa no timeout. Timeout que
 * sobra = { ok:false, stage:'timeout', why:[ADS_V2_BRIEF_TIMEOUT_WHY] } — nunca mais exceção crua até o catch da rota.
 */
export async function extractAdsV2Brief(args: AdsV2ExtractArgs & { deadlineMs?: number }): Promise<AdsV2BriefResult> {
  const deadline = typeof args.deadlineMs === 'number' && Number.isFinite(args.deadlineMs) ? args.deadlineMs : Date.now() + ADS_V2_BRIEF_BUDGET_MS
  const budget: AdsV2CallBudget = { deadline, retriesLeft: ADS_V2_BRIEF_TIMEOUT_RETRIES, retried: 0 }
  try {
    const r = await extractWithBudget(args, budget)
    return budget.retried ? { ...r, timeoutRetries: budget.retried } : r
  } catch (e) {
    if (!isAdsV2ModelTimeout(e)) throw e
    return { ok: false, stage: 'timeout', why: [ADS_V2_BRIEF_TIMEOUT_WHY], attempts: 0, timeoutRetries: budget.retried }
  }
}

type AdsV2ExtractArgs = Parameters<typeof extractWithBudget>[0]

async function extractWithBudget(args: {
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
  /** KINEO-ANUNCIO-CONSERTOS-2026-10-12 — só o que a pessoa DIGITOU (frase + preço + contato), sem a página do link: alegação de
   *  saúde só vale se estiver aqui. Ausente = a frase (ou o texto). */
  typed?: string
  /** KINEO-ADS-ROTEIROS-2026-10-13 — true = pede também 2 versões em outros tons (o /plan). Ausente = nenhuma chamada a mais. */
  scripts?: boolean
  /** KINEO-ADS-ROTEIROS-2026-10-13 — a cena já limpa (adsV2SceneSetting) dá o clima da versão "story". */
  scene?: string | null
}, budget: AdsV2CallBudget): Promise<AdsV2BriefResult> {
  const briefMsgs = buildAutoBriefMessages(args.text, args.languageName)
  const briefRaw = await callJson([{ role: 'system', content: briefMsgs.system }, { role: 'user', content: briefMsgs.user }], 0.2, 900, budget)
  const parsed = parseAutoBrief(briefRaw, args.text, args.language)
  let attempts = 1
  // KINEO-ADS-RETESTE-1510 — frase de PRODUTO claro sem nome ("Perfume", foto marcada como produto): o brief não achou "negócio" e a
  // KINEO-ADS-RETESTE-1510 — tela dizia "We could not tell which business this is". O "nome" vira o próprio produto (genérico, abaixo).
  if (parsed.needs.includes('business')) { const fb = adsV2BusinessFallback(args.sentence ?? args.text, args.productPhoto); if (fb) { parsed.brief.business = fb; parsed.needs = parsed.needs.filter((n) => n !== 'business') } } // KINEO-ADS-RETESTE-1510
  if (parsed.needs.includes('business')) return { ok: false, stage: 'brief', why: ['business_name_missing'], attempts }
  // KINEO-ATOR-AJUSTES-2026-10-09 — produto e/ou ator: o pedido de texto ganha as regras de quem fala e do quê.
  const productAd = typeof args.sentence === 'string' && simpleProductAd(args.sentence, args.productPhoto === true)
  const voiceRaw = typeof args.sentence === 'string' ? simpleVoiceFor(parsed.brief, args.sentence, args.language) : null
  // KINEO-ANUNCIO-CONSERTOS-2026-10-12 — prospecção de 12/10: "glow in Toronto today", "today in Australian", "made in
  // British". A exigência de citar TODO nome próprio (feita para o imóvel) colava a cidade e o adjetivo de nacionalidade em
  // qualquer frase do anúncio de PRODUTO. Agora: adjetivo de nacionalidade nunca é nome exigido; no anúncio de produto
  // nenhum lugar é exigido — os lugares (fora da marca) viram opção, só em forma natural (adsV2PlaceRule + placeMisuse).
  // Os nomes continuam no brief como fato (customer_names): "Rua 25 de Março" segue sem virar número inventado.
  const business = String(parsed.brief.business ?? '').toLowerCase()
  const places = voiceRaw && productAd ? voiceRaw.names.filter((n) => !isDemonym(n) && !business.includes(n.toLowerCase())) : []
  const voice = voiceRaw ? { ...voiceRaw, names: productAd ? [] : voiceRaw.names.filter((n) => !isDemonym(n)) } : null
  const brief = withCustomerNames(withPublicFacts(parsed.brief, args.facts), voiceRaw?.names ?? [])
  const base0 = args.overlays === false ? { maxWords: args.maxWords, narration: args.narration, overlays: false } : { maxWords: args.maxWords, narration: args.narration }
  const base1 = voice ? { ...base0, simple: voice } : base0
  const ad: AdsV2AdVoice | null = productAd || args.presenter === true ? { product: productAd, presenter: args.presenter === true } : null
  // A fonte da régua de honestidade: tudo o que o cliente deu (frase, preço, contato, página do produto, fatos marcados) e só
  // o que ele DIGITOU (alegação de saúde só vale dali — nunca copiada da página).
  // KINEO-ATOR-FTC-2026-10-13 — com o ator, a régua também recusa (e conserta) depoimento de cliente na narração.
  const honesty: AdsV2HonestySource = { source: [args.text, ...(args.facts ?? [])].join('\n'), typed: args.typed ?? args.sentence ?? args.text, product: productAd, places, ...(args.presenter === true ? { presenter: true, brand: brandName(parsed.brief) } : {}) }
  const opts: typeof base1 & { ad?: AdsV2AdVoice; honesty: AdsV2HonestySource } = ad ? { ...base1, ad, honesty } : { ...base1, honesty }
  // KINEO-ADS-RETESTE-1510 — o piso de fala (90% do anúncio na voz MiniMax do Ads: 27 palavras em 15 s) e o produto genérico
  // KINEO-ADS-RETESTE-1510 — ("Perfume" sem marca, sem nome próprio na frase e sem página lida) entram no pedido E na régua.
  const speechMin = args.narration ? adsV2SpeechMinWords(args.maxWords) : 0 // KINEO-ADS-RETESTE-1510
  const generic = adsV2GenericProduct(brandName(parsed.brief), args.sentence ?? args.text, args.language, { pageRead: /\nFrom the product page:/.test(args.text) }) // KINEO-ADS-RETESTE-1510
  if (speechMin > 0) Object.assign(opts, { speechMin }) // KINEO-ADS-RETESTE-1510
  if (generic) Object.assign(opts, { generic }) // KINEO-ADS-RETESTE-1510
  const fitOpts = { generic, speech: speechMin > 0 ? { min: speechMin, max: args.maxWords, language: args.language } : null } // KINEO-ADS-RETESTE-1510
  const fitFixes: string[] = [] // KINEO-ADS-RETESTE-1510
  // KINEO-ADS-DEMO-UNIVERSO-1410 — o piso de fala em TODOS os roteiros: os fechos sem fato usam o nome que o brief já tem (marca, ou
  // KINEO-ADS-DEMO-UNIVERSO-1410 — "este perfume" no produto genérico) e um conjunto `used` dividido entre o principal e as versões.
  const speechClose = { name: generic ? adsV2GenericThis(generic) : brandName(brief), brand: !generic, used: new Set<string>() } // KINEO-ADS-DEMO-UNIVERSO-1410
  if (fitOpts.speech) Object.assign(fitOpts.speech, { close: speechClose }) // KINEO-ADS-DEMO-UNIVERSO-1410
  const copyMsgs = buildV2CopyMessages(brief, args.languageName, opts)
  const base = [{ role: 'system' as const, content: copyMsgs.system }, { role: 'user' as const, content: copyMsgs.user }]
  // KINEO-ADS-ROTEIROS-2026-10-13 — as versões saem em paralelo com o texto de sempre (que sai PRIMEIRO), sob o mesmo prazo;
  // a promessa das versões nunca rejeita.
  const rawP = callJson(base, 0.6, 700, budget)
  const wantVariants = args.scripts === true && (args.narration || args.overlays !== false)
  const variantsP = wantVariants ? variantsCall(buildV2VariantMessages(copyMsgs, { overlays: args.overlays, scene: args.scene ?? null }), budget.deadline) : null
  let raw = await rawP
  const rawFirst = raw // KINEO-ADS-RETESTE-1510 — a 1ª resposta: se a correção piorar (lixo/timeout), ela volta no piso de antes
  attempts += 1
  let checked = checkV2Copy(raw, brief, opts)
  if (!checked.ok) {
    // 1 correção com o motivo da recusa (padrão do /api/ads/script).
    const fix = checked.why
    // KINEO-ADS-CENA-2026-10-13 — a correção que estoura o prazo não derruba o plano: segue com a 1ª resposta para o
    // afrouxamento e o conserto em código abaixo (que passam pela régua inteira de novo).
    try {
      raw = await callJson([
        ...base,
        { role: 'assistant', content: raw.slice(0, 4000) || '{}' },
        { role: 'user', content: `This cannot be used. Fix all of this and answer again:\n- ${fix.join('\n- ')}\nKeep every other rule. Answer with the JSON only.` },
      ], 0.4, 700, budget)
      attempts += 1
      checked = checkV2Copy(raw, brief, opts)
    } catch (e) {
      if (!isAdsV2ModelTimeout(e)) throw e
    }
  }
  // KINEO-ADS-RETESTE-1510 — a resposta corrigida AINDA usa o produto genérico como marca: conserto em código ("da Perfume" → "deste
  // KINEO-ADS-RETESTE-1510 — perfume") e a régua inteira de novo. A fala curta do texto de sempre é RE-PEDIDA (a correção acima diz o número).
  if (!checked.ok && generic) { const fin = adsV2FinishCopyRaw(raw, { generic, speech: null }); if (fin) { raw = fin.raw; fitFixes.push(...fin.fixes); checked = checkV2Copy(raw, brief, opts) } } // KINEO-ADS-RETESTE-1510
  // KINEO-ADS-DEMO-UNIVERSO-1410 — demo de 14/10: o roteiro A, re-pedido e AINDA curto, era aceito como veio (voz até 10,7 s num anúncio de 15 s).
  // KINEO-ADS-DEMO-UNIVERSO-1410 — Agora, SÓ quando a fala está abaixo do piso, ele é completado em código do mesmo jeito que as versões, antes de qualquer
  // KINEO-ADS-DEMO-UNIVERSO-1410 — afrouxamento; o completado só vale se passar pela régua INTEIRA (outro defeito = o caminho de sempre, com o texto de antes).
  if (!checked.ok && fitOpts.speech && adsV2NarrationBelow(raw, fitOpts.speech.min)) { const fin = adsV2FinishCopyRaw(raw, { generic, speech: fitOpts.speech }); const again = fin ? checkV2Copy(fin.raw, brief, opts) : null; if (fin && again && again.ok) { raw = fin.raw; fitFixes.push(...fin.fixes); checked = again } } // KINEO-ADS-DEMO-UNIVERSO-1410
  // Os nomes são acabamento, não honestidade: se a 2ª resposta só deixou de citar algum nome (e passa em TODO o resto —
  // número, fama, contato, tamanho), ela é aceita e o que faltou vai para o evento. Nunca um 502 por causa de um nome.
  // KINEO-ATOR-AJUSTES-2026-10-09 — a fala de loja num anúncio de produto também é acabamento (o pedido e 1 correção já a
  // recusaram): nunca um 502 por causa do tom.
  let namesMissing: string[] = []
  const relaxNames = !!voice && voice.names.length > 0
  const relaxShop = opts.ad?.product === true
  const relaxedOpts = { ...opts, ...(voice ? { simple: { ...voice, names: [] } } : {}), ...(opts.ad ? { ad: { ...opts.ad, product: false } } : {}) }
  if (!checked.ok && (relaxNames || relaxShop)) {
    const relaxed = checkV2Copy(raw, brief, relaxedOpts)
    if (relaxed.ok) {
      namesMissing = voice ? missingNames(relaxed.copy.narration ?? '', voice.names) : []
      checked = relaxed
    }
  }
  // KINEO-ANUNCIO-CONSERTOS-2026-10-12 — a 2ª resposta AINDA tem alegação sem fonte ou lugar mal colado: o conserto é em
  // código (repairHonesty: a frase inventada sai inteira; "made in British" → "made in the UK"; "in Toronto" colado sai) e o
  // texto consertado passa por TODA a régua de novo (número, contato, fama, honestidade). Só a contagem mínima de palavras
  // afrouxa — tirar a frase inventada encurta a fala, e fala curta e verdadeira vale mais que 502.
  let honestyFixes: string[] = []
  if (!checked.ok) {
    const fixed = repairCopyRaw(raw, honesty)
    if (fixed) {
      let again = checkV2Copy(fixed.raw, brief, { ...relaxedOpts, minWords: Math.max(5, Math.ceil(args.maxWords * 0.25)) })
      // KINEO-ATOR-FTC-2026-10-13 — o depoimento tirado da boca do ator nunca derruba o plano: a fala curta que sobrou (no limite,
      // só a marca) passa se estiver limpa em todo o resto (número, contato, fama, honestidade).
      if (!again.ok && fixed.fixes.some((f) => f.startsWith('testimonial'))) again = checkV2Copy(fixed.raw, brief, { ...relaxedOpts, minWords: 1 })
      if (again.ok) {
        namesMissing = voice ? missingNames(again.copy.narration ?? '', voice.names) : []
        honestyFixes = fixed.fixes
        checked = again
      }
    }
  }
  // KINEO-ADS-RETESTE-1510 — fala curta nunca vira 502: re-pedida e ainda curta (ou a correção veio pior), o piso de antes (metade do
  // KINEO-ADS-RETESTE-1510 — teto) decide — a resposta corrigida; a 1ª só se a correção não trouxe narração. O resultado conta (speechShort).
  let speechShort = false // KINEO-ADS-RETESTE-1510
  const shortOpts = { ...opts, speechMin: undefined, ...(relaxNames && voice ? { simple: { ...voice, names: [] } } : {}), ...(relaxShop && opts.ad ? { ad: { ...opts.ad, product: false } } : {}) } // KINEO-ADS-RETESTE-1510 — só os afrouxamentos que a régua acima já permite
  if (!checked.ok && speechMin > 0) { for (const cand of [raw, ...(raw !== rawFirst && !adsV2HasNarration(raw) ? [rawFirst] : [])]) { const old = checkV2Copy(cand, brief, shortOpts); if (old.ok) { checked = old; speechShort = true; namesMissing = voice ? missingNames(old.copy.narration ?? '', voice.names) : []; break } } } // KINEO-ADS-RETESTE-1510
  if (!checked.ok) return { ok: false, stage: 'copy', why: checked.why.slice(0, 6), attempts }
  // KINEO-ADS-ROTEIROS-2026-10-13 — cada versão pela MESMA régua; reprovada sai (nunca derruba o plano).
  let variants: AdsV2CopyVariant[] = []
  let variantsInfo: AdsV2VariantsInfo | null = null
  if (variantsP) {
    const alt = await variantsP
    // KINEO-ADS-RETESTE-1510 — reteste 15/10 (pt): 2 roteiros em vez de 3, a versão "story" caía calada (scripts_dropped 1 nos 2 planos).
    // KINEO-ADS-RETESTE-1510 — Agora cada versão ganha o MESMO acabamento em código do texto de sempre (1ª frase de tela com o nome, piso
    // KINEO-ADS-RETESTE-1510 — de fala, produto genérico) antes da régua inteira, e fala curta não derruba a versão (o piso de antes decide).
    const dropWhy: string[] = [] // KINEO-ADS-RETESTE-1510 — o motivo de cada versão que caiu vai para o evento (scripts_why)
    const mainFirst = checked.ok ? checked.copy.overlays[0] ?? null : null // KINEO-ADS-RETESTE-1510
    const checkVariantFit = (raw0: string) => { const raw1 = adsV2VariantFirstOverlay(raw0, brandName(brief), mainFirst); const fin = adsV2FinishCopyRaw(raw1, fitOpts); const raw2 = fin ? fin.raw : raw1; let r = checkV2Variant(raw2, brief, opts, relaxedOpts, honesty); if (!r.ok && speechMin > 0) { const o = checkV2Variant(raw2, brief, { ...opts, speechMin: undefined }, { ...relaxedOpts, speechMin: undefined }, honesty); if (o.ok) r = o } if (!r.ok) dropWhy.push(String(r.why[0] ?? 'unknown').slice(0, 120)); return r.ok && fin ? { ...r, fixes: [...r.fixes, ...fin.fixes] } : r } // KINEO-ADS-RETESTE-1510
    for (const v of alt.list) {
      const r = checkVariantFit(v.raw) // KINEO-ADS-RETESTE-1510 — era checkV2Variant(v.raw, …) direto
      if (r.ok) variants.push({ tone: v.tone, copy: r.copy, ...(r.fixes.length ? { honestyFixes: r.fixes } : {}) })
    }
    variants = variants.slice(0, ADS_V2_ALT_TONES.length)
    variantsInfo = { asked: ADS_V2_ALT_TONES.length, kept: variants.length, dropped: alt.list.length - variants.length, ...(alt.why ? { why: alt.why } : {}) }
    if (!variantsInfo.why && dropWhy.length) variantsInfo.why = `dropped: ${dropWhy.join(' | ')}`.slice(0, 300) // KINEO-ADS-RETESTE-1510
  }
  if (fitFixes.length) honestyFixes = [...honestyFixes, ...fitFixes] // KINEO-ADS-RETESTE-1510 — o acabamento em código vai para o evento (honesty_fixes), como os outros consertos
  return { ok: true, brief, copy: checked.copy, dropped: parsed.dropped, attempts, ...(voice ? { voice: { ...voice, namesMissing } } : {}), ...(ad ? { ad } : {}), ...(honestyFixes.length ? { honestyFixes } : {}), ...(variantsInfo ? { variants, variantsInfo } : {}), ...(speechShort ? { speechShort } : {}) } // KINEO-ADS-RETESTE-1510 — speechShort: a fala ficou no piso de antes
}
