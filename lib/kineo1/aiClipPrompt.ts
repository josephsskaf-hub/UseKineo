// KINEO1-CLIPE-IA-PROMPT-2026-09-28 — o prompt do clipe de IA do Kineo 1 (Seedance 1.5 t2v, 5 s) nasce do que a cena
// MOSTRA, não da frase falada; sem marca, domínio, URL ou @handle (viram letra na tela); um só sufixo negativo firme;
// pessoas só de costas/sem rosto reconhecível; e uma seed determinística (refazer reproduz).
//
// Por quê (DEFEITOS-KINEO1-10-ANUNCIOS-2026-09-28, D3): em "Use my script as is" com prosa, a descrição da cena É o
// bloco da narração (description === voiceover). O prompt do Seedance virava a frase falada com marca e domínio dentro
// ("Stay connected with eCredit.ng… eCredit dot n g") e o motor escrevia isso na tela: homem num CRT abrindo e fechando
// o eCredit, celulares com interface chinesa, logo da Apple no MadLabs. A chamada não mandava seed, então refazer nunca
// reproduzia. A troca por silhueta só cobria man|woman|person|people|guy|girl|boy|kid|child: father, wife, daughter,
// sons, students, employees, team e evaluators passavam com rosto.
//
// Módulo PURO (sem import): lib/fastAiClips.ts e lib/fastAiHook.ts delegam aqui; os guardiões o executam por
// readFileSync + transpileModule. As assinaturas que a rota (trava 8.2) chama não mudam.
//
// REVISÃO 28/09 (revisor cético, 2 defeitos que o cliente via):
//   · SEED — nascia só do prompt: duas cenas do MESMO filme com a mesma fala (prosa verbatim repete "Visit x.com")
//     ganhavam a MESMA seed e o MESMO clipe (antes, sem seed, saíam diferentes = variedade). Agora a seed mistura o
//     prompt com um discriminador por chamada (aiClipSeedFromPrompt): índice quando quem chama o tem, senão contador.
//   · LIMPEZA DE MARCA engolia texto legítimo: "St. Louis" → "Louis" (a frase "St." caía no filtro de < 2 palavras),
//     NASA/CEO/RUIS sumiam como marca em caixa alta, "cold.In the morning" virava "the morning" (o TLD "in" numa lista
//     de 100+ TLDs comia a frase). Agora: só TLDs conhecidos; URL/www/@handle/domínio falado/CamelCase seguem; caixa
//     alta NÃO é marca; "Xx." de 2-3 letras seguido de espaço não fecha frase; ponto colado entre palavra minúscula e
//     Palavra capitalizada ganha espaço ANTES da limpeza.

/** Sufixo negativo único — aparece UMA vez em todo prompt de clipe de IA. */
export const AI_CLIP_NEGATIVE_SUFFIX = 'no readable text, no letters, no logos, no brand names, no signs, no subtitles, no watermarks'
/** Pessoa real: só de costas ou sem rosto reconhecível (decisão de produto — manter). */
export const AI_CLIP_FACELESS = 'people only seen from behind or at a distance, no recognizable human faces'
/** Desenho: o personagem desenhado pode aparecer inteiro; o que não pode é semelhança com pessoa real. */
export const AI_CLIP_DRAWN_LIKENESS = "no real person's likeness"
/** Tela/celular/app na cena: de lado e fora de foco, para o motor não inventar interface com letras. */
export const AI_CLIP_SCREEN_HINT = 'any screen shown at an angle and softly out of focus, without interface text'
export const AI_CLIP_FALLBACK_SUBJECT = 'abstract cinematic atmosphere, soft light and shadow'

/** Só TLDs conhecidos (revisão 28/09): a lista de 100+ ("team", "life", "one", "top", "money"…) comia frase comum. */
const TLD = 'com|net|org|io|ai|app|co|ng|br|uk|de|fr|es|it|nl|in|us|me|tv|dev|xyz|info|biz|shop|store'
const URL_RE = /\bhttps?:\/\/[^\s)\]]+/gi
const WWW_RE = /\bwww\.[^\s)\]]+/gi
const DOMAIN_RE = new RegExp(`\\b([a-z0-9][\\w-]*)(?:\\.[\\w-]+)*\\.(?:${TLD})\\b(?:\\/[^\\s)\\]]*)?`, 'gi')
/** "eCredit dot n g", "admitiy dot in", "kineo dot com" — o domínio falado por extenso. */
const SPOKEN_DOMAIN_RE = /\b([A-Za-z][\w-]*)\s+dot\s+(?:[a-z]{1,4}\b\s*){1,3}/gi
const HANDLE_RE = /(?:^|[\s(])@([\w.]{2,})/g
/** Marca escrita como CamelCase interno (eCredit, SmartTender, MadLabs, eQMS, iPhone). */
const CAMEL_RE = /\b(?:[a-z]+[A-Z][A-Za-z0-9]*|[A-Z][a-z]+[A-Z][A-Za-z0-9]*)\b/g
/**
 * "cold.In the morning" — ponto COLADO entre palavra minúscula e Palavra capitalizada é fim de frase sem espaço, não
 * domínio ("cold.in" casava o TLD "in" e a frase inteira sumia). Roda ANTES de extrair/limpar. "eCredit.ng",
 * "admitiy.com", "Kineo.AI" não casam (o que segue o ponto é minúsculo ou tudo maiúsculo).
 */
const PONTO_COLADO_RE = /(\p{Ll})\.(\p{Lu}\p{Ll})/gu
const separarPontoColado = (s: string) => s.replace(PONTO_COLADO_RE, '$1. $2')
/**
 * Fim de frase = [.!?] + espaço — mas NÃO depois de abreviação "Xx." de 2-3 letras (St. Louis, Mt. Fuji, Dr. Lee,
 * Mr., Ms.): antes, "St." virava uma "frase" de 1 palavra e caía no filtro (St. Louis → Louis).
 */
const FIM_DE_FRASE_RE = /(?<=[.!?])(?<!\b\p{Lu}\p{Ll}{1,2}\.)\s+/u
const frases = (s: string) => s.split(FIM_DE_FRASE_RE)
const CTA_SENTENCE_RE = /^(visit|go to|download|call|follow|subscribe|sign up|check out|learn more|contact|click|order|book|try|get started|join|see what|stay connected|find us|search|dm|message|whatsapp|text)\b/i
const LEAD_FILLER_RE = /^(tonight|today|meet|introducing|welcome to|imagine|picture this|this is|here is|here's|now|so|and|but|because|that's why|at)\b[,:]?\s*/i
const PEOPLE_RE = /\b(men|women|man|woman|persons?|people|guys?|girls?|boys?|kids?|child|children|influencers?|models?|fathers?|mothers?|dad|mom|wife|wives|husbands?|daughters?|sons?|students?|employees?|workers?|teams?|customers?|clients?|users?|families|family|owners?|founders?|entrepreneurs?|evaluators?|doctors?|nurses?|patients?|teachers?|friends?|couples?|players?|athletes?|fans|crowd|audience|staff|managers?|experts?|farmers?|travelers?|tourists?|chefs?|drivers?|creators?|professionals?|colleagues?)\b/gi
const SCREEN_RE = /\b(phone|smartphone|mobile|app|apps|screen|screens|website|online|laptop|computer|interface|dashboard|software|tablet|browser|platform)\b/i

const norm = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim()
const tidy = (s: string) =>
  s
    .replace(/\s+/g, ' ')
    .replace(/\s+([,.;:!?])/g, '$1')
    .replace(/([,.;:!?])\1+/g, '$1')
    .replace(/,\s*\./g, '.')
    .replace(/\(\s*\)/g, '')
    .replace(/^[\s,;:]+|[\s,;:]+$/g, '')
    .trim()

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Nomes de marca que o texto carrega (minúsculas): base de domínio, domínio falado, @handle, CamelCase.
 * CAIXA ALTA NÃO é marca (revisão 28/09): NASA, CEO, FBI, RUIS ficam — sigla legítima não se distingue de marca gritada,
 * e o sufixo negativo do prompt já proíbe letra na tela. A marca em caixa alta que TAMBÉM aparece como domínio/handle
 * ("ADMITIY … admitiy dot in") continua saindo: a troca é case-insensitive.
 */
export function extractBrandTokens(text: string): string[] {
  const out = new Set<string>()
  const t = separarPontoColado(text ?? '')
  for (const m of t.matchAll(new RegExp(DOMAIN_RE.source, 'gi'))) if (m[1] && m[1].toLowerCase() !== 'www') out.add(m[1].toLowerCase())
  for (const m of t.matchAll(new RegExp(WWW_RE.source, 'gi'))) {
    const base = m[0].replace(/^www\./i, '').split('.')[0]
    if (base) out.add(base.toLowerCase())
  }
  for (const m of t.matchAll(new RegExp(SPOKEN_DOMAIN_RE.source, 'gi'))) if (m[1]) out.add(m[1].toLowerCase())
  for (const m of t.matchAll(new RegExp(HANDLE_RE.source, 'g'))) if (m[1]) out.add(m[1].replace(/\.+$/, '').toLowerCase())
  for (const m of t.matchAll(new RegExp(CAMEL_RE.source, 'g'))) out.add(m[0].toLowerCase())
  return [...out].filter((b) => b.length >= 2)
}

/**
 * Tira do texto URLs, domínios (x.com / x.ng / "x dot in"), @handles e os nomes de marca (também onde aparecem soltos:
 * "Visit admitiy.com" e depois "ADMITIY is building" perdem os dois). Frases que sobram com menos de 2 palavras caem.
 */
export function stripBrandsAndUrls(text: string, extraBrands: string[] = []): string {
  let t = separarPontoColado((text ?? '').replace(/\s+/g, ' '))
  const brands = new Set<string>([...extractBrandTokens(t), ...extraBrands.map((b) => b.toLowerCase()).filter(Boolean)])
  // ordem: URL e @handle ANTES do domínio (senão "@madlabs.io" vira "@" órfão)
  t = t.replace(URL_RE, ' ').replace(HANDLE_RE, ' ').replace(WWW_RE, ' ').replace(SPOKEN_DOMAIN_RE, ' ').replace(new RegExp(DOMAIN_RE.source, 'gi'), ' ')
  for (const b of brands) t = t.replace(new RegExp(`(?<![\\p{L}\\p{N}])${escapeRe(b)}(?:'s)?(?![\\p{L}\\p{N}])`, 'giu'), ' ')
  // "dot" órfão de um domínio já removido ("at dot", "dot .")
  t = t.replace(/\bdot\b/gi, ' ').replace(/\b(?:at|on|to|in|with|via|of|for|from|by)\s*(?=[.!?,]|$)/gi, '')
  const sentences = frases(tidy(t)).map(tidy).filter((s) => (s.match(/[\p{L}\p{N}]+/gu) ?? []).length >= 2)
  return tidy(sentences.join(' '))
}

/** Pessoa real vira figura distante em silhueta (a regra é de pessoa REAL; o desenho não passa por aqui). */
export function personsToSilhouette(text: string): string {
  return (text ?? '').replace(PEOPLE_RE, 'distant silhouetted figure')
}

/** A busca de reserva do plano (4 primeiras palavras da fala) não é sujeito visual — e busca com marca também não serve. */
function isJunkQuery(query: string, voiceover: string, brands: string[] = []): boolean {
  const q = norm(query)
  if (!q || q.split(' ').length < 2) return true
  if (extractBrandTokens(query).length > 0 || brands.some((b) => new RegExp(`(?<![\\p{L}\\p{N}])${escapeRe(b)}(?![\\p{L}\\p{N}])`, 'iu').test(query))) return true
  const vo = norm(voiceover)
  return !!vo && vo.startsWith(q)
}

/** Descrição que na verdade é fala: 1ª/2ª pessoa, chamada para ação ou 3+ frases (o gancho recebe só a descrição). */
export function looksLikeSpeech(text: string): boolean {
  const t = (text ?? '').trim()
  if (!t) return false
  if (/\b(you|your|yours|we|our|us|i|my|me|let's)\b/i.test(t)) return true
  const sentences = frases(t).filter(Boolean)
  if (sentences.some((s) => CTA_SENTENCE_RE.test(s))) return true
  return sentences.length >= 3
}

/** A primeira frase descritiva da fala, sem chamada para ação e sem marca — o que a frase descreve. */
export function subjectFromSpeech(voiceover: string): string {
  const clean = stripBrandsAndUrls(voiceover)
  const sentences = frases(clean).map(tidy).filter(Boolean)
  const descriptive = sentences.filter((s) => !CTA_SENTENCE_RE.test(s) && (s.match(/[\p{L}\p{N}]+/gu) ?? []).length >= 3)
  const pick = descriptive[0] ?? sentences.sort((a, b) => b.length - a.length)[0] ?? ''
  // a marca era o sujeito ("eCredit.ng is a platform…"): sem ela, cai o verbo de ligação órfão ("is a platform…")
  let s = tidy(pick.replace(LEAD_FILLER_RE, '')).replace(/^(is|are|was|were)\b\s*/i, '').replace(/[.!?]+$/, '')
  if (s.length > 160) s = s.slice(0, 160).replace(/\s+\S*$/, '')
  return s
}

export interface AiClipPromptInput {
  description?: string | null
  voiceover?: string | null
  query?: string | null
}

/**
 * A base visual do clipe: (1) a descrição da cena, quando é uma descrição de verdade (≠ fala); (2) senão a busca do
 * plano (o sujeito/ação em inglês), quando não é a reserva de 4 palavras nem carrega marca; (3) senão a frase
 * descritiva da fala. Em todos os casos sem marca/domínio/URL/@handle.
 */
export function visualBase(input: AiClipPromptInput): string {
  const desc = tidy(input.description ?? '')
  const vo = tidy(input.voiceover ?? '')
  const q = tidy(input.query ?? '')
  const brands = extractBrandTokens([desc, vo, q].join(' '))
  const descIsSpeech = !desc || (!!vo && norm(desc) === norm(vo)) || looksLikeSpeech(desc)
  let base = ''
  if (!descIsSpeech) base = stripBrandsAndUrls(desc, brands)
  if (!base && q && !isJunkQuery(q, vo || desc, brands)) base = stripBrandsAndUrls(q, brands)
  if (!base) base = stripBrandsAndUrls(subjectFromSpeech(vo || desc || q), brands)
  if (!base) base = stripBrandsAndUrls(q || desc || vo, brands)
  return tidy(base).slice(0, 300) || AI_CLIP_FALLBACK_SUBJECT
}

/** Clipe de cena / gancho fotorreal, sem rosto, com o sufixo negativo uma vez. */
export function buildFacelessClipPrompt(input: AiClipPromptInput, kind: 'scene' | 'hook' = 'scene'): string {
  const base = personsToSilhouette(visualBase(input))
  const screen = SCREEN_RE.test(base) ? `, ${AI_CLIP_SCREEN_HINT}` : ''
  const shot = kind === 'hook' ? 'cinematic establishing shot, photorealistic, dramatic lighting, dark moody atmosphere' : 'cinematic shot, slow camera movement, photorealistic, dramatic lighting'
  return `${base}, ${shot}, high detail${screen}, ${AI_CLIP_NEGATIVE_SUFFIX}, ${AI_CLIP_FACELESS}`
}

export interface DrawnLook {
  lookPhrase: string
  suffix: string
}

/** Clipe desenhado: o look pedido em vez de "photorealistic"; o personagem desenhado pode aparecer inteiro. */
export function buildDrawnClipPrompt(input: AiClipPromptInput, look: DrawnLook, kind: 'scene' | 'hook' = 'scene'): string {
  const base = visualBase(input)
  const shot = kind === 'hook' ? 'establishing shot, gentle camera movement' : 'gentle camera movement'
  return `${base}, ${look.lookPhrase}, ${shot}, soft lighting, high detail, ${AI_CLIP_NEGATIVE_SUFFIX}, ${AI_CLIP_DRAWN_LIKENESS}${look.suffix}`
}

/** FNV-1a 32 bits — o mesmo hash da casa (reparo de trial órfão, returningSeed). Estável entre deploys. */
export function fnv1a(texto: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < texto.length; i += 1) {
    h ^= texto.charCodeAt(i)
    h = Math.imul(h, 0x01000193) >>> 0
  }
  return h >>> 0
}

/** Seed inteira positiva (1 … 2^31-2) para a fal — o schema do Seedance 1.5 Pro t2v aceita `seed: integer | null`. */
const SEED_MOD = 2147483646
export function aiClipSeed(generationId: string, sceneIndex: number): number {
  return (fnv1a(`${generationId}:${Math.max(0, Math.floor(sceneIndex))}`) % SEED_MOD) + 1
}
/**
 * Quando quem submete não tem o generationId (a rota só o cria depois — trava 8.2): a seed nasce do prompt MAIS um
 * discriminador por chamada. REVISÃO 28/09: só do prompt, duas cenas do MESMO filme com a mesma fala (prosa verbatim
 * repete a chamada "Visit x.com" em várias cenas) recebiam a MESMA seed → o MESMO clipe duas vezes; antes da seed
 * saíam diferentes (variedade). `indice` (cena/posição), quando quem chama o tem → estável para o mesmo par
 * (prompt, índice) e diferente entre índices; sem ele, um contador de chamadas por processo: a cena seguinte do mesmo
 * pedido nunca repete a anterior (a rota, travada, chama com 1 argumento). Prefixos distintos (i/n) para o índice 2 e
 * a 2ª chamada não colidirem.
 */
let chamadasSemIndice = 0
export function aiClipSeedFromPrompt(prompt: string, indice?: number): number {
  const d = typeof indice === 'number' && Number.isFinite(indice) ? `i${Math.max(0, Math.floor(indice))}` : `n${++chamadasSemIndice}`
  return (fnv1a(`prompt:${prompt}#${d}`) % SEED_MOD) + 1
}
