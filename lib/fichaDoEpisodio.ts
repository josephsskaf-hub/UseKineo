// ═══ KINEO-PROXIMO-EPISODIO-0111-SEMANTICA — a ficha do personagem por LEITURA, não por lista de palavras (vai do fundador 01/11) ═══
//
// POR QUÊ: as rodadas 1 e 2 do botão "Next episode" deduziam a ficha por regex/léxico (aposto "Nome, a …", "a … named
// Nome", lista de seres, de metáforas, de preposições). As duas revisões adversariais reprovaram com filmes REAIS de produção
// virando personagem — "Main character: Hinterkaifeck, a secluded farm" (4b3b7668), "Thermopylae, a narrow pass" (54fde4c4)
// —, metáfora de finanças virando ficha ("Inflation, a silent thief"), abertura de frase virando nome ("Thanks to Bitcoin, a
// teenager…" → "Bitcoin, a teenager") e a mesma pessoa em duas fichas ("Benjamin Briggs, a man" + "Briggs, a careful
// sailor"). Cada lista consertada abria outro buraco.
//
// O QUE ESTE MÓDULO FAZ: UMA chamada curta ao gpt-4o-mini (AI_TEXT_MODELS.utility, temperatura 0, json_schema estrito,
// prazo de 4 s, no máximo 1 tentativa extra) sobre o pedido e a narração do filme anterior. Devolve
//   { format: "story" | "factual", protagonist: { name, species, appearance } | null, supporting: [...] (≤ 2) }.
// Regra: só existe ficha quando o texto dá NOME e o ser AGE na história; lugar, empresa, moeda, metáfora e coisa nunca.
// Em código, só o que não é adivinhação: o JSON tem de bater com o esquema, todo nome tem de ESTAR no texto (nome que o
// texto não traz = leitura inventada = descartada inteira), nome sem maiúscula numa escrita que tem caixa é papel ("the
// robot"), não nome — sai; a mesma pessoa com variações de nome vira uma ficha só (lib/episodeContinuity mesmoSer).
// FALHA SEGURA: sem chave, erro, prazo, 4xx/5xx, JSON inválido ou nome fora do texto → `aplicada: null` e quem chama NÃO
// MEXE em nada (o prompt do escritor fica o de 13/10; a ideia do Studio fica sem ficha e com "Stay on the same subject").
// A ficha escrita pelo AUTOR com rótulo ("Main character: …") tem precedência e não chama o modelo.
// O resultado vai para a auditoria (metadata do evento next_episode_written e do next_episode_link_ready).
// Calibração (40+ casos rotulados, chamadas reais): docs/calibracao/KINEO-PROXIMO-EPISODIO-0111.json.
// Guardião (mock da chamada, sem rede): scripts/test-proximo-episodio-0111.mts.
import { AI_TEXT_MODELS } from '@/lib/aiModels'
import { fichaRotulada, mesmoSer, MAX_FICHA_CHARS, type FichaAplicada, type FormatoDaFicha } from '@/lib/episodeContinuity'

export const FICHA_SEMANTICA_VERSAO = 'KINEO-PROXIMO-EPISODIO-0111-SEMANTICA-v1'
const MODELO = AI_TEXT_MODELS.utility
/** Prazo de cada tentativa. */
export const FICHA_PRAZO_MS = 4_000
/** Teto do texto lido (pedido + narração). */
export const FICHA_ENTRADA_MAX = 3_500
const MAX_COADJUVANTES = 2
const MAX_NOME = 60
const MAX_ESPECIE = 90
const MAX_APARENCIA = 160

export const FICHA_SISTEMA = `You read the text of a short video (what the creator asked for and/or the narration) and decide whether it has recurring CHARACTERS whose identity must stay the same in the next episode. Reply with JSON only.

format:
- "story": invented fiction: fairy tale, kids' story, cartoon, fable, animal or toy adventure, invented drama, a POV story with invented people.
- "factual": anything about REAL people, places, things or events: history, biography, true crime, mysteries of real places, legends and famous episodes retold, science, space, nature, news, money, crypto, business, products, a real person's profile, tips, explainers. It stays "factual" even when it is told dramatically, like a story, with dialogue and suspense: real historical figures (kings, generals, explorers, inventors, founders) are never story characters.

A CHARACTER exists only when BOTH are true:
1. the text gives it a proper NAME (for example "Pip", "Dr. Ana Reyes", "BRO", "MILO"); and
2. it is a being that ACTS in the story (a person, an animal, a creature, a robot, or a toy or object brought to life) doing, saying, feeling or wanting something.
Never a character, even when it is named or personified: places (towns, farms, islands, ships, planets, mountain passes, buildings), countries, cities, companies, brands, products, coins and currencies, apps, laws, events, dates, diseases, abstract ideas, or anything described with a metaphor ("Inflation, a silent thief", "China, a sleeping dragon", "Bitcoin, the king of crypto", "Nvidia, a chip giant"). A word that opens a sentence or names a place or a time ("Meanwhile", "Later", "In Ohio", "Last Friday", "Thanks to Bitcoin") is never a name. An unnamed role ("a little girl", "the old robot", "a teacher in Texas", "the soldiers") is not a character, and neither is a pronoun ("you", "I", "we", "he", "she"). Never invent a name that is not in the text.

protagonist: the main character, the one the story follows; null when there is none.
supporting: at most 2 other characters; [] when there are none. Never repeat the protagonist.
The same being called by several names ("Benjamin Briggs", "Captain Briggs", "Briggs") is ONE character: give it once, with its fullest name.
name: exactly as written in the text.
species: what kind of being it is, in the text's own words and language, with its identity adjectives and article ("a gruff old man", "a tiny blue milk carton", "uma menina curiosa"). A real person is a person ("a sea captain", "a Spartan king"), never an object or a creature. "" when the text does not say.
appearance: only the look the text describes (hair, clothes, colours, size, marks), copied from the text; "" when it describes none. Never invent details.`

const SER_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['name', 'species', 'appearance'],
  properties: { name: { type: 'string' }, species: { type: 'string' }, appearance: { type: 'string' } },
} as const
export const FICHA_SCHEMA = {
  name: 'next_episode_characters',
  strict: true,
  schema: {
    type: 'object',
    additionalProperties: false,
    required: ['format', 'protagonist', 'supporting'],
    properties: {
      format: { type: 'string', enum: ['story', 'factual'] },
      protagonist: { anyOf: [{ type: 'null' }, SER_SCHEMA] },
      supporting: { type: 'array', items: SER_SCHEMA },
    },
  },
} as const

export interface SerDaFicha { name: string; species: string; appearance: string }
export interface LeituraDaFicha { format: FormatoDaFicha; protagonist: SerDaFicha | null; supporting: SerDaFicha[] }
export type ErroDaFicha = 'sem_chave' | 'sem_texto' | 'timeout' | 'rede' | 'json' | 'nome_fora_do_texto' | `http_${number}`
export interface AuditoriaDaFicha {
  versao: string
  origem: 'autor' | 'modelo' | 'falha'
  formato: FormatoDaFicha | null
  protagonista: string | null
  coadjuvantes: string[]
  fichas: string[]
  ms: number
  tentativas: number
  erro: ErroDaFicha | null
}
export interface ResultadoDaFicha {
  /** null = falha segura: quem chama não mexe em nada. */
  aplicada: FichaAplicada | null
  leitura: LeituraDaFicha | null
  auditoria: AuditoriaDaFicha
}
export interface OpcoesDaFicha {
  /** Para o guardião (mock da chamada); em produção é o fetch global. */
  fetchImpl?: typeof fetch
  /** Chave da OpenAI; padrão process.env.OPENAI_API_KEY (a calibração passa a do .env.local). */
  apiKey?: string
  /** Prazo de cada tentativa (padrão 4 s). */
  prazoMs?: number
  /** Teto da soma das tentativas: a 2ª só sai se sobrar tempo (a rota do escritor tem 30 s no total). */
  prazoTotalMs?: number
  /** 1 ou 2 (padrão 2 = no máximo 1 tentativa extra). */
  tentativas?: 1 | 2
}

const limpa = (s: unknown) => String(s ?? '').replace(/\s+/g, ' ').trim()
const escapaRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** O texto que o modelo lê: pedido e narração (repetidos saem), com rótulo, cortado no teto. '' sem texto. */
export function textoParaLeitura(f: { pedido?: string | null; narracao?: string | null }): string {
  const pedido = String(f.pedido ?? '').replace(/\r\n/g, '\n').trim()
  const narracao = String(f.narracao ?? '').replace(/\r\n/g, '\n').trim()
  const partes: string[] = []
  if (pedido) partes.push(`CREATOR'S REQUEST:\n${pedido}`)
  if (narracao && narracao !== pedido) partes.push(`NARRATION:\n${narracao}`)
  return partes.join('\n\n').slice(0, FICHA_ENTRADA_MAX).trim()
}

/** Pronome nunca é nome (classe fechada: o "You" do POV "You wake up as a gladiator" virava ficha "You, a gladiator"). */
const PRONOME_RE = /^(?:you|i|we|he|she|they|it|me|us|him|her|them|your|my|our|eu|você|voce|tu|nós|nos|ele|ela|eles|elas|yo|usted|él|ella|ellos|ellas|nosotros|vous|je|nous|il|elle)$/i
/** Escrita com caixa (latina, grega, cirílica…)? Nas outras (árabe, CJK, devanágari) "tem maiúscula" não diz nada. */
const temCaixa = (s: string) => s.toUpperCase() !== s.toLowerCase()
/** O nome está no texto? Todas as partes do nome, com fronteira de palavra, sem diferença de caixa. */
export function nomeEstaNoTexto(nome: string, texto: string): boolean {
  const partes = limpa(nome).split(/[\s]+/u).map((p) => p.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '')).filter((p) => p.length >= 1)
  if (!partes.length) return false
  return partes.every((p) => new RegExp(`(?<![\\p{L}\\p{N}])${escapaRe(p)}(?![\\p{L}\\p{N}])`, 'iu').test(texto))
}

function serValido(bruto: unknown): SerDaFicha | null {
  if (!bruto || typeof bruto !== 'object') return null
  const o = bruto as Record<string, unknown>
  if (typeof o.name !== 'string' || typeof o.species !== 'string' || typeof o.appearance !== 'string') return null
  return { name: limpa(o.name).slice(0, MAX_NOME), species: limpa(o.species).slice(0, MAX_ESPECIE), appearance: limpa(o.appearance).slice(0, MAX_APARENCIA) }
}

/**
 * Lê a resposta do modelo contra o texto lido. null = não dá para confiar (quem chama não mexe em nada):
 * fora do esquema, ou algum nome que o texto não traz (leitura inventada). Nome sem maiúscula numa escrita com caixa
 * ("the robot", "a girl") é papel, não nome: só esse ser sai. Mesma pessoa repetida vira uma ficha só.
 */
export function lerRespostaDaFicha(conteudo: string, texto: string): { leitura: LeituraDaFicha | null; erro: ErroDaFicha | null } {
  let parsed: unknown
  try { parsed = JSON.parse(String(conteudo ?? '')) } catch { return { leitura: null, erro: 'json' } }
  if (!parsed || typeof parsed !== 'object') return { leitura: null, erro: 'json' }
  const o = parsed as Record<string, unknown>
  if (o.format !== 'story' && o.format !== 'factual') return { leitura: null, erro: 'json' }
  if (o.protagonist !== null && (typeof o.protagonist !== 'object' || Array.isArray(o.protagonist))) return { leitura: null, erro: 'json' }
  if (!Array.isArray(o.supporting)) return { leitura: null, erro: 'json' }
  const prot = o.protagonist === null ? null : serValido(o.protagonist)
  if (o.protagonist !== null && !prot) return { leitura: null, erro: 'json' }
  const sup: SerDaFicha[] = []
  for (const s of o.supporting) { const v = serValido(s); if (!v) return { leitura: null, erro: 'json' }; sup.push(v) }
  // papel ("the soldiers", "The robot", "a lion") e pronome (o "You" do POV) não são nome: só esse ser sai, a leitura fica.
  // (Antes do teste de nome no texto: o "the soldiers" do filme real f7ac21dd derrubava a leitura inteira do Kael.)
  const ehNome = (s: SerDaFicha | null): s is SerDaFicha => {
    if (!s || !s.name || PRONOME_RE.test(s.name)) return false
    const semArtigo = s.name.replace(/^(?:the|a|an|o|os|as|um|uma|el|la|los|las|un|una)\s+/i, '')
    return Boolean(semArtigo) && (!temCaixa(semArtigo) || /\p{Lu}/u.test(semArtigo))
  }
  // todo NOME tem de estar no texto: um só inventado derruba a leitura inteira
  for (const s of [prot, ...sup]) if (ehNome(s) && !nomeEstaNoTexto(s.name, texto)) return { leitura: null, erro: 'nome_fora_do_texto' }
  let protagonista: SerDaFicha | null = ehNome(prot) ? prot : null
  const outros: SerDaFicha[] = []
  for (const s of sup) {
    if (!ehNome(s)) continue
    if (protagonista && mesmoSer(s.name, protagonista.name)) { protagonista = juntar(protagonista, s); continue }
    const i = outros.findIndex((x) => mesmoSer(x.name, s.name))
    if (i >= 0) { outros[i] = juntar(outros[i], s); continue }
    outros.push(s)
  }
  // sem protagonista válido, o 1º coadjuvante válido não é promovido: a leitura não disse quem a história segue
  return { leitura: { format: o.format, protagonist: protagonista, supporting: protagonista ? outros.slice(0, MAX_COADJUVANTES) : [] }, erro: null }
}
/** A mesma pessoa citada duas vezes: o nome mais completo, a descrição mais rica. */
function juntar(a: SerDaFicha, b: SerDaFicha): SerDaFicha {
  return {
    name: b.name.length > a.name.length ? b.name : a.name,
    species: b.species.length > a.species.length ? b.species : a.species,
    appearance: b.appearance.length > a.appearance.length ? b.appearance : a.appearance,
  }
}

/** A ficha escrita: "Nome, espécie, aparência" (sem o que o texto não disse). */
export function fichaDoSer(s: SerDaFicha): string {
  const aparencia = limpa(s.appearance)
  const repetida = aparencia && limpa(s.species).toLowerCase().includes(aparencia.toLowerCase().replace(/[.\s]+$/, ''))
  const partes = [s.name, s.species, repetida ? '' : aparencia].map(limpa).filter(Boolean)
  const t = partes.join(', ')
  if (t.length <= MAX_FICHA_CHARS) return t
  const janela = t.slice(0, MAX_FICHA_CHARS)
  return janela.slice(0, Math.max(0, janela.lastIndexOf(' '))).replace(/[,;:\s]+$/, '')
}

/** A leitura vira ficha aplicada: fichas só em HISTÓRIA com protagonista (factual mantém "Stay on the same subject"). */
export function aplicarLeitura(l: LeituraDaFicha): FichaAplicada {
  const fichas = l.format === 'story' && l.protagonist ? [l.protagonist, ...l.supporting].slice(0, 1 + MAX_COADJUVANTES).map(fichaDoSer) : []
  return { formato: l.format, fichas: fichas.slice(0, 2), origem: 'modelo' }
}

function mensagens(texto: string) {
  return [
    { role: 'system', content: FICHA_SISTEMA },
    { role: 'user', content: texto },
  ]
}

/** O corpo exato da chamada (o guardião confere modelo, temperatura e esquema). */
export function corpoDaChamada(texto: string): Record<string, unknown> {
  return { model: MODELO, temperature: 0, max_tokens: 400, response_format: { type: 'json_schema', json_schema: FICHA_SCHEMA }, messages: mensagens(texto) }
}

interface Chamada { leitura: LeituraDaFicha | null; erro: ErroDaFicha | null; tentativas: number; ms: number }

/** A chamada com prazo, no máximo 1 tentativa extra (só se sobrar tempo) e falha segura. Nunca lança. */
export async function chamarLeitura(texto: string, opts: OpcoesDaFicha = {}): Promise<Chamada> {
  const inicio = Date.now()
  if (!texto) return { leitura: null, erro: 'sem_texto', tentativas: 0, ms: 0 }
  const key = opts.apiKey ?? process.env.OPENAI_API_KEY
  if (!key) return { leitura: null, erro: 'sem_chave', tentativas: 0, ms: 0 }
  const doFetch = opts.fetchImpl ?? fetch
  const prazo = Math.max(500, opts.prazoMs ?? FICHA_PRAZO_MS)
  const total = Math.max(prazo, opts.prazoTotalMs ?? prazo * 2)
  const maxTentativas = opts.tentativas === 1 ? 1 : 2
  let erro: ErroDaFicha | null = null
  let tentativas = 0
  while (tentativas < maxTentativas) {
    const resta = total - (Date.now() - inicio)
    if (tentativas > 0 && resta < 1_200) break // a 2ª tentativa só sai se couber
    tentativas += 1
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), Math.min(prazo, Math.max(500, resta)))
    try {
      const res = await doFetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        signal: ctrl.signal,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
        body: JSON.stringify(corpoDaChamada(texto)),
      })
      if (!res.ok) { erro = `http_${res.status}`; if (res.status >= 400 && res.status < 500 && res.status !== 408 && res.status !== 429) break; continue }
      const data = (await res.json()) as { choices?: Array<{ message?: { content?: string; refusal?: string | null } }> }
      const lido = lerRespostaDaFicha(data.choices?.[0]?.message?.content ?? '', texto)
      if (lido.leitura) return { leitura: lido.leitura, erro: null, tentativas, ms: Date.now() - inicio }
      erro = lido.erro
      if (erro === 'nome_fora_do_texto') break // temperatura 0: repetir daria o mesmo nome inventado
    } catch (e) {
      erro = ctrl.signal.aborted || (e instanceof Error && e.name === 'AbortError') ? 'timeout' : 'rede'
    } finally {
      clearTimeout(timer)
    }
  }
  return { leitura: null, erro: erro ?? 'rede', tentativas, ms: Date.now() - inicio }
}

// Memória curta em processo: a rota do Studio chama o escritor EM PROCESSO (app/api/next-episode/studio → POST de
// app/api/next-episode), e os dois leem o mesmo filme. A mesma leitura (inclusive a que está em voo) serve aos dois:
// uma chamada por filme, não duas. Falha não fica guardada (a próxima tenta de novo).
const MEMORIA = new Map<string, { expira: number; p: Promise<Chamada> }>()
const MEMORIA_TTL_MS = 10 * 60_000
const MEMORIA_MAX = 200
/** Para o guardião. */
export function esquecerLeiturasDaFicha(): void { MEMORIA.clear() }

function lerComMemoria(texto: string, opts: OpcoesDaFicha): Promise<Chamada> {
  if (opts.fetchImpl) return chamarLeitura(texto, opts) // guardião: sem memória entre casos
  const agora = Date.now()
  const guardada = MEMORIA.get(texto)
  if (guardada && guardada.expira > agora) return guardada.p
  if (MEMORIA.size >= MEMORIA_MAX) for (const [k, v] of MEMORIA) if (v.expira <= agora || MEMORIA.size >= MEMORIA_MAX) MEMORIA.delete(k)
  const p = chamarLeitura(texto, opts).then((r) => { if (!r.leitura) MEMORIA.delete(texto); return r })
  MEMORIA.set(texto, { expira: agora + MEMORIA_TTL_MS, p })
  return p
}

function auditoria(origem: AuditoriaDaFicha['origem'], aplicada: FichaAplicada | null, leitura: LeituraDaFicha | null, c: Pick<Chamada, 'ms' | 'tentativas' | 'erro'>): AuditoriaDaFicha {
  return {
    versao: FICHA_SEMANTICA_VERSAO,
    origem,
    formato: aplicada?.formato ?? null,
    protagonista: leitura?.protagonist?.name ?? null,
    coadjuvantes: (leitura?.supporting ?? []).map((s) => s.name),
    fichas: aplicada ? [...aplicada.fichas] : [],
    ms: c.ms,
    tentativas: c.tentativas,
    erro: c.erro,
  }
}

/**
 * A ficha do filme de origem. Precedência: o rótulo do AUTOR ("Main character: …", sem modelo); senão a leitura
 * semântica do pedido + narração. Falha de qualquer tipo = `aplicada: null` (não mexer). Nunca lança.
 */
export async function lerFichaDoFilme(
  f: { pedido?: string | null; narracao?: string | null; titulo?: string | null },
  opts: OpcoesDaFicha = {},
): Promise<ResultadoDaFicha> {
  const doAutor = fichaRotulada(f.pedido, f.narracao, f.titulo)
  if (doAutor) return { aplicada: doAutor, leitura: null, auditoria: auditoria('autor', doAutor, null, { ms: 0, tentativas: 0, erro: null }) }
  const texto = textoParaLeitura({ pedido: f.pedido || f.titulo, narracao: f.narracao })
  try {
    const c = await lerComMemoria(texto, opts)
    if (!c.leitura) return { aplicada: null, leitura: null, auditoria: auditoria('falha', null, null, c) }
    const aplicada = aplicarLeitura(c.leitura)
    return { aplicada, leitura: c.leitura, auditoria: auditoria('modelo', aplicada, c.leitura, c) }
  } catch {
    return { aplicada: null, leitura: null, auditoria: auditoria('falha', null, null, { ms: 0, tentativas: 0, erro: 'rede' }) }
  }
}

/**
 * Quem o EPISÓDIO ESCRITO segue (o filtro de assunto pergunta se o protagonista foi trocado por outro: "While Roland slept,
 * Mia opened the mailbox. Mia read the letter."). string = o protagonista que a leitura achou; null = a leitura não achou
 * protagonista nomeado; undefined = não deu para ler (falha segura: o filtro fica só com a checagem determinística).
 */
export async function protagonistaDoEpisodio(
  ep: { title?: string | null; script?: string | null },
  opts: OpcoesDaFicha = {},
): Promise<string | null | undefined> {
  const texto = textoParaLeitura({ narracao: `${limpa(ep.title)}\n${String(ep.script ?? '')}`.trim() })
  try {
    const c = await lerComMemoria(texto, opts)
    if (!c.leitura) return undefined
    return c.leitura.protagonist?.name ?? null
  } catch {
    return undefined
  }
}
