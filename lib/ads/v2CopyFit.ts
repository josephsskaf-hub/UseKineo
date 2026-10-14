// KINEO-ADS-RETESTE-1510 — reteste do Studio Ads v2 de 15/10 (foto de perfume + "perfume num hotel com chuva"). Módulo PURO
// (sem modelo, sem banco, sem fetch), chamado por lib/ads/v2Brief.ts. Conserta dois defeitos do TEXTO do anúncio:
//
// 1. A NARRAÇÃO ACABAVA AOS ~10 s NUM ANÚNCIO DE 15 s (os 5 s finais mudos). Causa: o pedido ao modelo era "15 a 30 palavras"
//    (piso = 50% do teto de 30) e a voz do Ads NÃO é a tts-1-hd da casa (3,1 pal/s): é a MiniMax speech-2.8-hd na fal
//    (lib/ttsFallback.ts, chamada por lib/ads/v2Advance.ts), MEDIDA em 28 anúncios entregues a ~2,0 pal/s (en 2,09 · pt 1,92;
//    pedido a37360f7: 15 palavras = 9,6 s). 15 palavras = metade do anúncio calado. Agora o piso é 90% do anúncio em fala na
//    régua da MiniMax: ADS_V2_SPEECH_SHARE × segundos × ADS_V2_VOICE_WPS = 0,9 × o teto de sempre (30 → 27 em 15 s; 40 → 36
//    em 20 s; 60 → 54 em 30 s). O TETO não muda (é o mesmo do PATCH de edição, v2Contract ADS_V2_EDIT_NARRATION_WORDS_15, e o
//    de sempre do v2ShotLists: 30 palavras a ~1,6 pal/s no pior caso medido ainda cabem no cartão que cresce até +4 s). Preço,
//    créditos e débito não são tocados. Passar do alvo é bom; ficar abaixo é defeito: o pedido diz o piso, a régua recusa
//    abaixo dele (a 1 correção de sempre pede de novo com o número) e, se a 2ª resposta ainda vier curta, adsV2FitNarration
//    completa em código com uma frase de chamada SEM fato nenhum ("Confira de perto.") — ou corta a última frase se passou do teto.
//
// 2. "PERFUME" VIRAVA MARCA: "Descubra a essência única da Perfume", "Perfume, onde você encontra fragrâncias". Causa: sem marca
//    na frase, o brief virou business "Perfume —" (o formato "<nome> — <o que vende>" sem nome), brandName() deu "Perfume" e o
//    pedido de texto mandou "Say the business name once" — o modelo tratou o substantivo como NOME PRÓPRIO, com artigo feminino
//    ("da Perfume") e maiúscula no meio da frase. simpleCommonNoun() não pegou porque "perfume" não é palavra de imóvel/negócio.
//    Agora: o "nome" do brief que é SÓ um produto genérico (ADS_V2_PRODUCT_WORDS inteiro: perfume, vela aromática, tênis…),
//    sem nome próprio na frase e sem página de produto lida, é PRODUTO GENÉRICO: o pedido proíbe usá-lo como marca e ensina a
//    forma certa na língua ("este perfume", "this perfume"); a régua acusa o uso de marca (maiúscula no meio da frase, artigo do
//    gênero errado, "at/from Perfume", frase que começa com o substantivo sem artigo) e o conserto em código troca pela forma
//    certa. A 1ª frase de tela ("Perfume — Fragrâncias") e o cartão final podem manter o nome do produto como título.
import { countWords } from '@/lib/ads/scriptPrompt'
import { ADS_V2_PRODUCT_WORDS, isProductSentence, simpleNames, simpleTitle } from '@/lib/ads/v2Simple'
import { adsV2SentenceReady } from '@/lib/ads/v2AutoPlan'

// ═══ 1. piso de fala ════════════════════════════════════════════════════════════════════════════════════════════════
/** A voz do Ads (MiniMax speech-2.8-hd), medida: ~2,0 palavras por segundo (en 2,09 · pt 1,92 em 28 anúncios entregues). */
export const ADS_V2_VOICE_WPS = 2.0
/** A fração do anúncio que a fala tem de ocupar (no mínimo). */
export const ADS_V2_SPEECH_SHARE = 0.9
/** Teto de palavras de sempre = 2 pal/s × segundos (v2ShotLists adsV2NarrationMaxWords): o piso de fala é 90% dele. Puro. */
export function adsV2SpeechMinWords(maxWords: number): number {
  if (!Number.isFinite(maxWords) || maxWords <= 0) return 0
  const seconds = maxWords / 2
  return Math.min(maxWords, Math.ceil(ADS_V2_SPEECH_SHARE * seconds * ADS_V2_VOICE_WPS))
}
/** A fala estimada (s) de um texto na voz do Ads. Pura. */
export function adsV2SpeechSeconds(text: string | null | undefined): number {
  return countWords(String(text ?? '')) / ADS_V2_VOICE_WPS
}

/**
 * Frases de chamada SEM fato (nada de preço, número, prazo, fama ou benefício): só completam a fala quando o modelo, mesmo
 * corrigido, escreveu curto. Por língua; língua sem lista = nada é completado (o texto fica como veio).
 */
export const ADS_V2_SPEECH_PADS: Readonly<Record<string, readonly string[]>> = {
  en: ['Take a closer look.', 'See it for yourself.', 'Make your choice today.'],
  pt: ['Confira de perto.', 'Veja com seus próprios olhos.', 'Faça a sua escolha.'],
  es: ['Descubre más de cerca.', 'Compruébalo con tus propios ojos.', 'Haz tu elección.'],
  fr: ['À découvrir de près.', 'Voyez par vous-même.', 'Faites votre choix.'],
  it: ['Da scoprire da vicino.', 'Guarda con i tuoi occhi.', 'Fai la tua scelta.'],
  de: ['Schau es dir genauer an.', 'Überzeug dich selbst.', 'Triff deine Wahl.'],
}

const sentencesOf = (t: string): string[] => t.split(/(?<=[.!?…])\s+/u).map((s) => s.trim()).filter(Boolean)

// KINEO-ADS-MELHORIAS-1410 — CHAMADA REPETIDA. Reteste de 14/10 (roteiro B, pt): a fala terminou "Veja com seus próprios olhos. Confira de perto." —
// o enchimento de fala colou uma chamada atrás de outra que já dizia o mesmo. Regra: nunca duas frases de chamada seguidas; um
// enchimento que repete palavras da última frase é pulado e vale o próximo que não repete. "Chamada" = frase com uma das palavras
// de chamada da língua (ver/olhar/conferir/escolher…), comparadas sem acento e sem pontuação.
export const ADS_V2_CTA_WORDS: Readonly<Record<string, readonly string[]>> = {
  en: ['see', 'look', 'check', 'closer', 'yourself', 'choice', 'choose', 'discover', 'try', 'shop', 'order', 'visit', 'grab'],
  pt: ['veja', 'ver', 'confira', 'conferir', 'olhe', 'olhos', 'perto', 'escolha', 'descubra', 'conheca', 'experimente', 'garanta', 'compre', 'peca', 'venha'],
  es: ['mira', 'ven', 'venga', 'descubre', 'comprueba', 'compruebalo', 'ojos', 'cerca', 'eleccion', 'elige', 'prueba', 'pruebalo', 'conoce', 'compra', 'pide'],
  fr: ['voyez', 'voir', 'decouvrir', 'decouvrez', 'pres', 'choix', 'choisissez', 'essayez', 'commandez'],
  it: ['guarda', 'scoprire', 'scopri', 'vicino', 'occhi', 'scelta', 'scegli', 'prova', 'ordina'],
  de: ['schau', 'genauer', 'uberzeug', 'selbst', 'wahl', 'entdecke', 'probier', 'bestell'],
}
const normWords = (t: string): string[] => String(t ?? '').toLowerCase().normalize('NFD').replace(/\p{M}/gu, '').replace(/[^\p{L}\p{N}\s]/gu, ' ').split(/\s+/).filter(Boolean)
/** A frase é uma chamada (tem palavra de chamada da língua)? Língua sem lista = nunca. Pura. */
export function adsV2CtaLike(sentence: string, language: string): boolean {
  const list = ADS_V2_CTA_WORDS[String(language ?? '').toLowerCase().slice(0, 2)] ?? []
  return normWords(sentence).some((w) => list.includes(w))
}
/** O enchimento repete a última frase (alguma palavra de 3+ letras em comum, sem acento)? Pura. */
export function adsV2PadOverlaps(pad: string, last: string, language: string): boolean {
  const a = new Set(normWords(last).filter((w) => w.length >= 3))
  return normWords(pad).some((w) => w.length >= 3 && a.has(w))
}

/**
 * Encaixa a narração entre min e max palavras, em código: passou do teto por UMA frase = sai a última (nunca a única);
 * abaixo do piso = até 3 frases de chamada (distintas) sem fato da língua, sem passar do teto (a que encaixa no intervalo, a menor
 * primeiro). Não dá para encaixar = o melhor que coube (a régua decide). Pura.
 */
export function adsV2FitNarration(text: string, opts: { min: number; max: number; language: string }): { text: string; fixes: string[] } {
  let t = String(text ?? '').replace(/\s+/g, ' ').trim()
  const fixes: string[] = []
  if (!t) return { text: t, fixes }
  let s = sentencesOf(t)
  // Só UMA frase sai (a última, e nunca a única): a versão que só cabe muito encurtada continua reprovada (KINEO-ADS-ROTEIROS B3).
  if (countWords(s.join(' ')) > opts.max && s.length > 1 && countWords(s.slice(0, -1).join(' ')) <= opts.max) {
    s = s.slice(0, -1)
    fixes.push('speech_trim')
  }
  t = s.join(' ')
  const pads = ADS_V2_SPEECH_PADS[String(opts.language ?? '').toLowerCase().slice(0, 2)] ?? []
  for (let round = 0; round < 3 && countWords(t) < opts.min; round++) {
    const w = countWords(t)
    const low = t.toLowerCase()
    const last = sentencesOf(t).slice(-1)[0] ?? '' // KINEO-ADS-MELHORIAS-1410
    if (adsV2CtaLike(last, opts.language)) break // KINEO-ADS-MELHORIAS-1410 — a fala já termina numa chamada (ou acabamos de pôr uma): nunca duas seguidas
    const usable = pads.filter((p) => !low.includes(p.toLowerCase().replace(/[.!?]$/, '')) && !adsV2PadOverlaps(p, last, opts.language) && w + countWords(p) <= opts.max) // KINEO-ADS-MELHORIAS-1410 — pula o que repete a última frase; vale o próximo
    if (!usable.length) break
    const fits = usable.filter((p) => w + countWords(p) >= opts.min).sort((a, b) => countWords(a) - countWords(b))
    const pick = fits[0] ?? usable.sort((a, b) => countWords(b) - countWords(a))[0]
    t = `${/[.!?…]$/u.test(t) ? t : `${t}.`} ${pick}`
    fixes.push('speech_pad')
  }
  return { text: t, fixes }
}

// ═══ 2. produto genérico não é marca ════════════════════════════════════════════════════════════════════════════════
export interface AdsV2GenericProduct {
  /** O substantivo como a pessoa (ou o brief) escreveu ("Perfume"). */
  written: string
  /** Em minúscula ("perfume"): a forma do meio da frase. */
  noun: string
  /** Língua (2 letras) da narração. */
  lang: string
  /** pt/es: gênero e número pelo final da palavra (perfume = m. sg.; vela = f. sg.). */
  fem: boolean
  plural: boolean
}

const FEM_PT = /(a|as|ção|ções|são|sões|gem|gens|dade|dades)$/u
const FEM_ES = /(a|as|ción|ciones|sión|siones|dad|dades)$/u

/**
 * O "nome" do brief é SÓ um produto genérico (o texto inteiro casa com ADS_V2_PRODUCT_WORDS — "Perfume", "Vela aromática",
 * "Tênis") e a frase da pessoa não tem nome próprio nem veio a página do produto (link lido)? Então não há marca: devolve o
 * substantivo; senão null (na dúvida, nada muda). Pura.
 */
export function adsV2GenericProduct(brand: string, sentence: string, language: string, opts: { pageRead: boolean }): AdsV2GenericProduct | null {
  const b = String(brand ?? '').replace(/\s*[—–-]\s*$/u, '').replace(/\s+/g, ' ').trim()
  if (!b || opts.pageRead) return null
  const m = b.match(ADS_V2_PRODUCT_WORDS)
  if (!m || m.index !== 0 || m[0].length !== b.length) return null
  if (simpleNames(String(sentence ?? '')).length > 0) return null
  const lang = String(language ?? '').toLowerCase().slice(0, 2)
  const noun = b.toLocaleLowerCase(lang || 'en')
  const last = noun.split(' ')[0]
  const plural = /s$/u.test(last) && !/^t[eê]nis$/u.test(last)
  const fem = lang === 'pt' ? FEM_PT.test(last) : lang === 'es' ? FEM_ES.test(last) : false
  return { written: b, noun, lang, fem, plural }
}

/** "este perfume" / "this perfume": a forma certa de falar do produto genérico, na língua. Pura. */
export function adsV2GenericThis(g: AdsV2GenericProduct): string {
  if (g.lang === 'pt') return `${g.plural ? (g.fem ? 'estas' : 'estes') : g.fem ? 'esta' : 'este'} ${g.noun}`
  if (g.lang === 'es') return `${g.plural ? (g.fem ? 'estas' : 'estos') : g.fem ? 'esta' : 'este'} ${g.noun}`
  if (g.lang === 'en') return `${g.plural ? 'these' : 'this'} ${g.noun}`
  return g.noun
}

/** A regra do pedido de texto (no lugar de "Say the business name once."). Pura. */
export function adsV2GenericRule(g: AdsV2GenericProduct): string {
  const W = g.written.charAt(0).toLocaleUpperCase(g.lang || 'en') + g.written.slice(1)
  return `There is no brand name: what is advertised is a generic product, "${g.noun}". Never use "${W}" as a proper name — no article or preposition in front of it as if it were a brand (never "da ${W}", "na ${W}", "at ${W}", "from ${W}"), never a capital letter in the middle of a sentence, and never start a sentence with "${W}" alone. Refer to it as the product, for example "${adsV2GenericThis(g)}".`
}

const ART: Readonly<Record<string, { fem: readonly string[]; masc: readonly string[] }>> = {
  pt: {
    fem: ['a', 'as', 'da', 'das', 'na', 'nas', 'pela', 'pelas', 'à', 'às', 'uma', 'umas', 'esta', 'estas', 'essa', 'essas', 'desta', 'destas', 'nesta', 'nestas', 'dessa', 'nessa', 'numa', 'duma', 'nossa'],
    masc: ['o', 'os', 'do', 'dos', 'no', 'nos', 'pelo', 'pelos', 'ao', 'aos', 'um', 'uns', 'este', 'estes', 'esse', 'esses', 'deste', 'destes', 'neste', 'nestes', 'desse', 'nesse', 'num', 'dum', 'nosso'],
  },
  es: {
    fem: ['la', 'las', 'una', 'unas', 'esta', 'estas', 'esa', 'esas', 'nuestra'],
    masc: ['el', 'los', 'del', 'al', 'un', 'unos', 'este', 'estos', 'ese', 'esos', 'nuestro'],
  },
}
const EN_BRAND_PREP = ['at', 'from', 'by', 'with']

interface Hit { start: number; end: number; prevStart: number; prev: string; kind: 'mid_cap' | 'wrong_article' | 'bare_start' | 'brand_prep' }

/** Os usos do produto genérico COMO MARCA num texto (posições). Pura. */
function genericHits(text: string, g: AdsV2GenericProduct): Hit[] {
  const t = String(text ?? '')
  const esc = g.noun.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/ /g, '\\s+')
  const re = new RegExp(`(?<![\\p{L}\\p{N}])${esc}(?![\\p{L}\\p{N}])`, 'giu')
  const hits: Hit[] = []
  for (const m of t.matchAll(re)) {
    const start = m.index ?? 0
    const end = start + m[0].length
    const before = t.slice(0, start)
    const pm = before.match(/([\p{L}]+)\s+$/u)
    const prev = pm ? pm[1] : ''
    const prevStart = pm ? start - pm[0].length : start
    const atStart = !/\S/.test(before) || /[.!?…]["”')\]]*\s*$/u.test(before)
    const cap = /^\p{Lu}/u.test(m[0])
    const pl = prev.toLowerCase()
    const arts = ART[g.lang]
    if (arts && (g.fem ? arts.masc : arts.fem).includes(pl)) hits.push({ start, end, prevStart, prev, kind: 'wrong_article' })
    else if (g.lang === 'en' && EN_BRAND_PREP.includes(pl)) hits.push({ start, end, prevStart, prev, kind: 'brand_prep' })
    else if (!atStart && cap) hits.push({ start, end, prevStart, prev, kind: 'mid_cap' })
    else if (atStart && arts) hits.push({ start, end, prevStart: start, prev: '', kind: 'bare_start' })
  }
  return hits
}

/** Pura: o texto usa o produto genérico como marca? Devolve os trechos ("da Perfume", "at Perfume"…). */
export function adsV2GenericBrandUses(text: string, g: AdsV2GenericProduct | null | undefined): string[] {
  if (!g) return []
  const t = String(text ?? '')
  return genericHits(t, g).map((h) => t.slice(h.prevStart, h.end).trim())
}

const PT_PREP: Readonly<Record<string, string>> = { da: 'de', do: 'de', das: 'de', dos: 'de', na: 'em', no: 'em', nas: 'em', nos: 'em', pela: 'por', pelo: 'por', pelas: 'por', pelos: 'por', 'à': 'a', ao: 'a', 'às': 'a', aos: 'a' }
const ES_PREP: Readonly<Record<string, string>> = { del: 'de', al: 'a' }
/** pt: preposição solta antes do substantivo com maiúscula ("de Perfume", "com Perfume"). */
const PT_BARE_PREP: readonly string[] = ['em', 'por', 'com', 'para']

/** "de" + "este perfume" = "deste perfume"; "em" + "esta vela" = "nesta vela"; "por"/"a" ficam separados. Pura. */
function ptJoin(prep: string, phrase: string): string {
  if (prep === 'de') return `d${phrase}`
  if (prep === 'em') return `n${phrase}`
  return `${prep} ${phrase}`
}

/** Conserta, em código, cada uso do produto genérico como marca pela forma certa ("da Perfume" → "deste perfume"). Pura. */
export function adsV2GenericRepair(text: string, g: AdsV2GenericProduct | null | undefined): { text: string; fixes: string[] } {
  const t = String(text ?? '')
  if (!g) return { text: t, fixes: [] }
  const hits = genericHits(t, g)
  if (!hits.length) return { text: t, fixes: [] }
  const proper = adsV2GenericThis(g)
  let out = ''
  let from = 0
  for (const h of hits) {
    const pl = h.prev.toLowerCase()
    let repl: string
    let cut = h.start
    if (h.kind === 'wrong_article' || (h.kind === 'mid_cap' && ART[g.lang] && (ART[g.lang].fem.includes(pl) || ART[g.lang].masc.includes(pl)))) {
      cut = h.prevStart
      const prep = g.lang === 'pt' ? PT_PREP[pl] : g.lang === 'es' ? ES_PREP[pl] : undefined
      repl = g.lang === 'pt' && prep ? ptJoin(prep, proper) : g.lang === 'es' && prep ? `${prep} ${proper}` : proper
      if (/^\p{Lu}/u.test(h.prev)) repl = repl.charAt(0).toLocaleUpperCase(g.lang) + repl.slice(1)
    } else if (h.kind === 'brand_prep') {
      cut = h.prevStart
      repl = `${pl === 'at' ? 'with' : pl} ${proper}`
      if (/^\p{Lu}/u.test(h.prev)) repl = repl.charAt(0).toUpperCase() + repl.slice(1)
    } else if (h.kind === 'bare_start') {
      repl = proper.charAt(0).toLocaleUpperCase(g.lang) + proper.slice(1)
    } else if (g.lang === 'pt' && PT_BARE_PREP.includes(pl)) {
      // "com Perfume" → "com este perfume"; "em Perfume" → "neste perfume" ("frasco de Perfume" só perde a maiúscula, abaixo)
      cut = h.prevStart
      repl = ptJoin(pl, proper)
      if (/^\p{Lu}/u.test(h.prev)) repl = repl.charAt(0).toLocaleUpperCase('pt') + repl.slice(1)
    } else {
      // maiúscula no meio da frase sem artigo ("Descubra Perfume") — en: "this perfume" ("the Perfume" → "the perfume");
      // pt/es: "este perfume"; outras: só a minúscula
      // "frasco de Perfume" → "frasco de perfume" (pt/es: depois de "de"/"sem"/"sin" o substantivo vai sem artigo)
      repl = g.lang === 'en' && ['the', 'a', 'an', 'this', 'that', 'your', 'our', 'these', 'those'].includes(pl) ? g.noun
        : (g.lang === 'pt' || g.lang === 'es') && ['de', 'sem', 'sin'].includes(pl) ? g.noun : proper
    }
    out += t.slice(from, cut) + repl
    from = h.end
  }
  return { text: out + t.slice(from), fixes: hits.map((h) => `generic_${h.kind}`) }
}

// ═══ 3. o que lib/ads/v2Brief.ts chama ══════════════════════════════════════════════════════════════════════════════
/** A linha da narração no pedido de texto com o piso de fala (no lugar de "one to three…, metade do teto"). Pura. */
export function adsV2SpeechNarrationLine(min: number, max: number, nameRule: string): string {
  return `narration: two to four short spoken sentences, ${min} to ${max} words in total (count them) — the voice-over must fill the whole ad: fewer than ${min} words leaves the end of the video silent. Warm and natural. ${nameRule} No phone number, link or address unless copied exactly from the brief.`
}

/** O motivo da recusa quando o texto usa o produto genérico como marca. Pura. */
export function adsV2GenericWhy(label: string, g: AdsV2GenericProduct, uses: readonly string[]): string {
  return `${label}: "${g.written}" is not a brand name — it is the product itself. Do not write ${uses.map((u) => `"${u}"`).join(', ')}; refer to it as "${adsV2GenericThis(g)}" (or describe it), with the right article, in lowercase in the middle of a sentence.`
}

/**
 * O brief não achou "nome do negócio" (business vazio → "We could not tell which business this is"), mas a frase é de
 * PRODUTO claro (isProductSentence: "Perfume", "vela aromática de lavanda") ou a foto está marcada como produto e a frase
 * tem pelo menos 3 letras: o "nome" vira o próprio produto (simpleTitle da frase). Frase vazia/curta ("a") = null (a recusa
 * de sempre). Pura.
 */
export function adsV2BusinessFallback(sentence: string | undefined, productPhoto: boolean | undefined): string | null {
  const s = String(sentence ?? '').replace(/\s+/g, ' ').trim()
  if (!adsV2SentenceReady(s)) return null
  if (!isProductSentence(s) && productPhoto !== true) return null
  const title = simpleTitle(s)
  return title || null
}

/**
 * Acabamento em código de uma resposta JSON ({narration, overlays}): o produto genérico usado como marca vira a forma certa
 * (narração e frases de tela da 2ª em diante — a 1ª é o título e pode ter o nome) e a narração é encaixada no piso/teto de
 * fala. null = nada mudou (ou JSON ilegível). Pura.
 */
export function adsV2FinishCopyRaw(raw: string, opts: { generic?: AdsV2GenericProduct | null; speech?: { min: number; max: number; language: string; close?: AdsV2SpeechClose | null } | null }): { raw: string; fixes: string[] } | null { // KINEO-ADS-DEMO-UNIVERSO-1410 — + close (opcional): ausente = o acabamento de sempre, byte a byte
  let p: Record<string, unknown>
  try {
    const j = JSON.parse(raw)
    if (!j || typeof j !== 'object' || Array.isArray(j)) return null
    p = j as Record<string, unknown>
  } catch {
    return null
  }
  const out: Record<string, unknown> = { ...p }
  const fixes: string[] = []
  if (typeof p.narration === 'string' && p.narration.trim()) {
    let n = p.narration
    if (opts.generic) {
      const r = adsV2GenericRepair(n, opts.generic)
      n = r.text
      fixes.push(...r.fixes)
    }
    if (opts.speech) {
      const f = adsV2FitNarration(n, opts.speech.close ? { ...opts.speech, min: 0 } : opts.speech) // KINEO-ADS-DEMO-UNIVERSO-1410 — com close, aqui só a apara do teto; o piso vem abaixo
      n = f.text
      fixes.push(...f.fixes)
      if (opts.speech.close) { const c = adsV2CompleteSpeech(n, opts.speech); n = c.text; fixes.push(...c.fixes) } // KINEO-ADS-DEMO-UNIVERSO-1410 — o piso por fechos sem fato (chamada ↔ nome, sem repetir no conjunto A/B/C)
    }
    out.narration = n
  }
  if (opts.generic && Array.isArray(p.overlays)) {
    out.overlays = p.overlays.map((o, i) => {
      if (i === 0 || typeof o !== 'string') return o
      const r = adsV2GenericRepair(o, opts.generic)
      fixes.push(...r.fixes.map((f) => `overlay:${f}`))
      return r.text
    })
  }
  return fixes.length ? { raw: JSON.stringify(out), fixes } : null
}

/**
 * Versão (bold/story) cuja 1ª frase de tela não traz o nome da marca: recebe a 1ª frase do roteiro de sempre (que a régua já
 * aprovou com o nome) — a versão não cai por isso. Sem marca, sem frases ou já com o nome = igual. Pura.
 */
export function adsV2VariantFirstOverlay(raw: string, brand: string, mainFirst: string | null | undefined): string {
  if (!brand || !mainFirst) return raw
  try {
    const j = JSON.parse(raw) as Record<string, unknown>
    if (!j || typeof j !== 'object' || !Array.isArray(j.overlays) || !j.overlays.length) return raw
    const first = typeof j.overlays[0] === 'string' ? j.overlays[0] : ''
    if (first.toLowerCase().includes(brand.toLowerCase())) return raw
    return JSON.stringify({ ...j, overlays: [mainFirst, ...j.overlays.slice(1)] })
  } catch {
    return raw
  }
}

/** A resposta JSON traz uma narração não vazia? (a correção que voltou lixo, "{}" ou estourou não traz). Pura. */
export function adsV2HasNarration(raw: string): boolean {
  try {
    const j = JSON.parse(raw) as { narration?: unknown } | null
    return !!j && typeof j === 'object' && typeof j.narration === 'string' && j.narration.trim().length > 0
  } catch {
    return false
  }
}

// ═══ 4. KINEO-ADS-DEMO-UNIVERSO-1410 — a fala chega ao piso em TODOS os roteiros (A/B/C) ════════════════════════════
// Demo de 14/10 (Comercial, 15 s, pt): o roteiro A escolhido acabou a voz aos 10,7 s (~4 s só de música). O piso de 27 palavras
// (KINEO-ADS-RETESTE-1510) era RE-PEDIDO uma vez ao modelo e, ainda curto, ACEITO como veio (speechShort); as versões B/C só
// recebiam as 3 chamadas genéricas, e a regra "nunca duas chamadas seguidas" (KINEO-ADS-MELHORIAS-1410) parava o enchimento
// assim que a fala terminava numa chamada ("Garanta o seu.") — a versão saía curta do mesmo jeito. Agora o roteiro principal,
// curto depois da correção, e cada versão são COMPLETADOS em código do mesmo jeito: frases de fecho SEM fato (as chamadas
// genéricas de sempre + o NOME do produto/marca que o brief já tem, numa frase neutra "Atheeri, para você." ou numa chamada
// "Conheça Atheeri hoje."), alternando para nunca pôr duas chamadas seguidas, nunca a mesma frase duas vezes (nem entre A, B e
// C: o conjunto `used` é dividido), no máximo 2 frases com o nome, e sem passar do teto de palavras NEM do teto da voz
// (voice_too_long: o cartão cresce até +4 s → a voz cabe em segundos + 3,5 s = 18,5 s em 15 s, medida aqui pela voz MAIS LENTA
// medida, 1,6 pal/s). Línguas sem lista de chamadas (só en/pt/es/fr/it/de têm) = nada é completado (o piso de antes decide).

/** A voz mais lenta medida no Ads (pior caso de 28 anúncios): o teto da voz é conferido nela. */
export const ADS_V2_VOICE_WPS_SLOW = 1.6
/** O cartão final cresce até +4 s; a voz começa em 0,3 s e precisa de 0,2 s de folga: sobra segundos + 3,5 s para a fala. */
export const ADS_V2_VOICE_CEILING_EXTRA_SECONDS = 3.5
/** O teto da voz (s) de um anúncio cujo teto de palavras é `maxWords` (2 pal/s × segundos): 15 s → 18,5 s. Pura. */
export function adsV2VoiceCeilingSeconds(maxWords: number): number {
  return Math.max(0, maxWords / 2) + ADS_V2_VOICE_CEILING_EXTRA_SECONDS
}
/** Quantas palavras cabem na voz mais lenta sem passar do teto da voz e sem passar do teto de palavras. Pura. */
export function adsV2SpeechCap(maxWords: number): number {
  return Math.min(maxWords, Math.floor(adsV2VoiceCeilingSeconds(maxWords) * ADS_V2_VOICE_WPS_SLOW))
}

/** Frases de fecho com o NOME (sem fato): `cta` = é chamada; `brand` = só com nome de marca (não com "este perfume"). */
export const ADS_V2_NAME_CLOSES: Readonly<Record<string, readonly { t: string; cta: boolean; brand?: boolean }[]>> = {
  en: [{ t: '{name}, for you.', cta: false }, { t: 'This is {name}.', cta: false, brand: true }, { t: '{name}, your way.', cta: false }, { t: 'Now, {name}.', cta: false }, { t: 'Discover {name} today.', cta: true }, { t: 'Try {name}.', cta: true }, { t: 'Choose {name}.', cta: true }],
  pt: [{ t: '{name}, para você.', cta: false }, { t: 'Isto é {name}.', cta: false, brand: true }, { t: '{name}, do seu jeito.', cta: false }, { t: 'Agora, {name}.', cta: false }, { t: 'Conheça {name} hoje.', cta: true }, { t: 'Experimente {name}.', cta: true }, { t: 'Escolha {name}.', cta: true }],
  es: [{ t: '{name}, para ti.', cta: false }, { t: 'Esto es {name}.', cta: false, brand: true }, { t: '{name}, a tu manera.', cta: false }, { t: 'Ahora, {name}.', cta: false }, { t: 'Descubre {name} hoy.', cta: true }, { t: 'Prueba {name}.', cta: true }, { t: 'Elige {name}.', cta: true }],
  fr: [{ t: '{name}, pour vous.', cta: false }, { t: 'Voici {name}.', cta: false, brand: true }, { t: '{name}, à votre façon.', cta: false }, { t: 'Maintenant, {name}.', cta: false }, { t: 'Découvrez {name} dès aujourd’hui.', cta: true }, { t: 'Essayez {name}.', cta: true }, { t: 'Choisissez {name}.', cta: true }],
  it: [{ t: '{name}, per te.', cta: false }, { t: 'Questo è {name}.', cta: false, brand: true }, { t: '{name}, a modo tuo.', cta: false }, { t: 'Adesso, {name}.', cta: false }, { t: 'Scopri {name} oggi.', cta: true }, { t: 'Prova {name}.', cta: true }, { t: 'Scegli {name}.', cta: true }],
  de: [{ t: '{name}, für dich.', cta: false }, { t: 'Das ist {name}.', cta: false, brand: true }, { t: '{name}, ganz nach deinem Stil.', cta: false }, { t: 'Jetzt: {name}.', cta: false }, { t: 'Entdecke {name} noch heute.', cta: true }, { t: 'Probier {name}.', cta: true }, { t: 'Wähl {name}.', cta: true }],
}

export interface AdsV2SpeechClose {
  /** O nome que o brief já tem (marca) ou a forma do produto genérico ("este perfume"); vazio = só as chamadas genéricas. */
  name?: string | null
  /** true = o nome é a marca (vale "Isto é Atheeri."); false = produto genérico ("este perfume"). */
  brand?: boolean
  /** As frases de fecho já usadas no CONJUNTO (A, B e C dividem o mesmo): nunca a mesma duas vezes. */
  used?: Set<string>
}

const closeKey = (s: string) => normWords(s).join(' ')

/**
 * Completa a fala até o piso com frases de fecho sem fato (as chamadas genéricas + as do NOME), alternando chamada e frase
 * neutra (nunca duas chamadas seguidas), sem repetir frase (no texto e no conjunto `used`), no máximo 2 com o nome (nunca logo
 * depois de uma frase que já diz o nome), sem passar
 * de adsV2SpeechCap(max). Não dá para chegar ao piso = o melhor que coube (a régua decide). Pura (só escreve em `close.used`).
 */
export function adsV2CompleteSpeech(text: string, opts: { min: number; max: number; language: string; close?: AdsV2SpeechClose | null }): { text: string; fixes: string[] } {
  let t = String(text ?? '').replace(/\s+/g, ' ').trim()
  const fixes: string[] = []
  if (!t) return { text: t, fixes }
  const lang = String(opts.language ?? '').toLowerCase().slice(0, 2)
  const cap = adsV2SpeechCap(opts.max)
  const used = opts.close?.used ?? new Set<string>()
  const name = String(opts.close?.name ?? '').replace(/\s+/g, ' ').trim()
  const nameWords = new Set(normWords(name))
  const cands: { s: string; cta: boolean; named: boolean }[] = [
    ...(ADS_V2_SPEECH_PADS[lang] ?? []).map((s) => ({ s, cta: true, named: false })),
    ...(name ? (ADS_V2_NAME_CLOSES[lang] ?? []).filter((c) => !c.brand || opts.close?.brand !== false).map((c) => {
      const s = c.t.split('{name}').join(name)
      return { s: /^\p{Ll}/u.test(s) ? s.charAt(0).toLocaleUpperCase(lang) + s.slice(1) : s, cta: c.cta, named: true }
    }) : []),
  ]
  if (!cands.length) return { text: t, fixes }
  let named = 0
  for (let round = 0; round < 6 && countWords(t) < opts.min; round++) {
    const w = countWords(t)
    const last = sentencesOf(t).slice(-1)[0] ?? ''
    const lastCta = adsV2CtaLike(last, lang)
    const lastKey = new Set(normWords(last).filter((x) => x.length >= 3 && !nameWords.has(x)))
    const textKey = closeKey(t)
    const lastNamed = nameWords.size > 0 && [...nameWords].every((x) => normWords(last).includes(x))
    // Regras DURAS (nunca afrouxam): sem repetir frase (texto e conjunto), nunca chamada depois de chamada, nunca acima do teto.
    const hard = cands.filter((c) => !used.has(closeKey(c.s)) && !textKey.includes(closeKey(c.s)) && !(lastCta && c.cta) && w + countWords(c.s) <= cap)
    // Regras de naturalidade: até 2 frases com o nome, nunca logo depois de outra que já diz o nome, sem repetir palavra da última.
    const soft = hard.filter((c) => !(c.named && (named >= 2 || lastNamed)) && !normWords(c.s).some((x) => x.length >= 3 && !nameWords.has(x) && lastKey.has(x)))
    const ok = soft.length ? soft : hard
    if (!ok.length) break
    const reach = ok.filter((c) => w + countWords(c.s) >= opts.min).sort((a, b) => Number(b.cta) - Number(a.cta) || countWords(a.s) - countWords(b.s))
    // Não chega ainda: o tipo OPOSTO ao da última frase (alterna chamada ↔ neutra), a mais longa; sem ele, a mais longa que houver.
    const pick = reach[0] ?? ok.slice().sort((a, b) => Number(a.cta === lastCta) - Number(b.cta === lastCta) || countWords(b.s) - countWords(a.s))[0]
    t = `${/[.!?…]$/u.test(t) ? t : `${t}.`} ${pick.s}`
    used.add(closeKey(pick.s))
    if (pick.named) named++
    fixes.push(pick.named ? 'speech_close_name' : 'speech_close')
  }
  return { text: t, fixes }
}

/** KINEO-ADS-DEMO-UNIVERSO-1410 — a resposta JSON traz narração MAIS CURTA que o piso? (só aí o roteiro é completado). Pura. */
export function adsV2NarrationBelow(raw: string, min: number): boolean {
  try {
    const j = JSON.parse(raw) as { narration?: unknown } | null
    return !!j && typeof j === 'object' && typeof j.narration === 'string' && j.narration.trim().length > 0 && countWords(j.narration) < min
  } catch {
    return false
  }
}
