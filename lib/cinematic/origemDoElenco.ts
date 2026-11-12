// KINEO-ORIGEM-DO-ELENCO-0311 [TRAVA 8.2 — fundador 03/11: "Conserta a etnia agora, universal de todas as etnias"] — DE ONDE É QUEM ESTÁ EM CENA.
//
// Casos reais: enzojimcua (03/11, espanhol, Seedance 15 s grátis, vídeo 23a1412e, nota 7,5): "Se llamaba Hiroo Onoda, teniente japonés…"
// saiu com um velho branco ocidental de chapéu nas 3 cenas (elenco: "the weathered soldier", origem 'autor', juiz de pixel deu 95).
// Yamaguchi 1945 (Hiroshima/Nagasaki) saiu galã ocidental. Pesquisa W2 (docs/revisao-videos/MAPA-DEFEITOS-0311.md): sem a origem escrita,
// o motor desenha o padrão ocidental. O povoDaHistoria (lib/cinematic/elencoEpoca, KINEO-REVISOR-RESTO-3010) só lê LUGAR de uma tabela curta.
//
// O QUE ISTO FAZ — para QUALQUER povo do mundo, sem lista de nacionalidades (quem prova é a palavra do texto, não uma tabela):
//   1. UMA chamada semântica por filme (gpt-4o-mini, perguntaSemantica: temperature 0, json_schema estrito, ~4 s, no máximo 1 tentativa extra).
//      FALHA SEGURA: erro, prazo, JSON inválido = nada muda. Nunca lança.
//   2. O CÓDIGO confere: a evidência tem de estar escrita no texto; sem âncora = null (nunca adivinha por nome comum, língua da narração,
//      profissão ou estereótipo); ser não humano e figura mítica ficam de fora; o NOME da pessoa real nunca vai ao prompt, só a origem.
//   3. As palavras do cliente vencem: se o texto já diz a aparência dele (pele/cabelo), a ficha fica intacta; se diz a origem e a ficha já a
//      carrega, também. Se o texto diz a origem e a ficha NÃO a carrega ("teniente japonés" × ficha "the weathered soldier", o caso real),
//      a linha entra: é a palavra do próprio cliente chegando à imagem, não uma correção dela.
//   4. Cada personagem humano e cada grupo ("the villagers of Oaxaca") tem a sua origem; `geral` só quando TODOS compartilham a mesma.
//   5. A linha é POSITIVA e respeitosa, sem caricatura: "origin: a Japanese man, with the natural features of Japanese people". A aparência
//      sorteada que o cliente não escreveu (cor de cabelo, sardas) sai para não brigar com ela; a escrita por ele fica.
// Serve as duas estradas (clássica pela policy/elencoSecundario, hollywood pela fichaDoProtagonista → characterHint) e todos os motores.
// Guardião: scripts/test-origem-do-elenco-0311.mjs. Calibração (respostas reais): docs/calibracao/KINEO-ORIGEM-DO-ELENCO-0311.json.
// LIMITE CONHECIDO: a evidência e a origem vêm do mesmo modelo; se ele errar as duas juntas, a conferência literal não pega — a proteção
// real é a calibração e os juízes (criticoStill, pixelScore), que perguntam se a pessoa em cena condiz com a origem.
import type { FichaDePersonagem } from '@/lib/cinematic/folhaDePersonagem'
import { mesmoPersonagem } from '@/lib/cinematic/elencoEpoca'
import { perguntaSemantica, type OpcoesSemanticas } from '@/lib/cinematic/sujeitoObrigatorio'

export const MARCA_ORIGEM_DO_ELENCO = 'KINEO-ORIGEM-DO-ELENCO-0311'
export const ORIGEM_DO_ELENCO_VERSAO = 'origem_elenco_0311_v1'
export const EVENTO_ORIGEM_DO_ELENCO = 'cinematic_cast_origin'
/** A marca que os juízes leem no prompt da cena (lib/cinematic/criticoStill.ts e lib/regua95/perguntasHonestas.ts). */
export const FRASE_ORIGEM = (origem: string) => `with the natural features of ${origem} people`
const MARCA_NA_FICHA = 'natural features of '
const ORIGEM_NO_PROMPT_RE = /natural features of ([^.;,]+?) people/g

const limpa = (s: unknown) => String(s ?? '').replace(/\s+/g, ' ').trim()
const normaliza = (s: unknown) => limpa(s).toLowerCase().replace(/ı/g, 'i').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[’`]/g, "'")
const escapaRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const artigo = (s: string) => (/^[aeiou]/i.test(s) ? 'an' : 'a')

/** O trecho inteiro no texto (sem caixa, sem acento, em fronteira de palavra). */
export function citaNoTexto(texto: string, trecho: string): boolean {
  const t = normaliza(trecho)
  if (!t) return false
  return new RegExp(`(?<![\\p{L}\\p{N}])${escapaRe(t)}(?![\\p{L}\\p{N}])`, 'u').test(normaliza(texto))
}

// ═══ 1. A PERGUNTA ═════════════════════════════════════════════════════════════════════════════════════════════════════
export type TipoDeEvidencia = 'place' | 'nationality' | 'army' | 'people_group' | 'known_person' | 'none'
export type ConfiancaDaOrigem = 'high' | 'medium' | 'low'
export type DitoPeloTexto = 'none' | 'origin' | 'appearance' | 'both'
const TIPOS: ReadonlyArray<TipoDeEvidencia> = ['place', 'nationality', 'army', 'people_group', 'known_person', 'none']
const CONFIANCAS: ReadonlyArray<ConfiancaDaOrigem> = ['high', 'medium', 'low']
const DITOS: ReadonlyArray<DitoPeloTexto> = ['none', 'origin', 'appearance', 'both']

export const SYSTEM_ORIGEM_0311 =
  'You read a short-film request and its narration and report, ONLY from words written in that text, where each HUMAN character or group of the story is from, so the image model does not default everyone to one look. ' +
  'This must work the same for ANY people, nationality or ethnic group on Earth, including European and North American ones. ' +
  'Start with "reasoning" (at most 25 words). Then, for each human character or group (at most 5), give: ' +
  '"role": the plain common noun in lowercase English ("soldier", "fisherman", "villagers"), never a name; ' +
  '"name": how the text names them, or null; "is_group": true for a group; "is_human": false for animals, robots, gods, mythical or invented beings; ' +
  '"origin": the English demonym or people name the text supports ("Japanese", "Nigerian", "Malian", "Irish", "Quechua", "Roma", "Black American", "Ashkenazi Jewish"), or null; never a colour or a body description; ' +
  '"evidence": the EXACT words copied from the text (same language, same spelling) that prove it, or null: a place they are from or live in, a nationality, the army or nation they serve, a people\'s name, or the name of a well-known real historical person (then use what history records about that person); ' +
  '"evidence_type": place, nationality, army, people_group, known_person or none; "confidence": high, medium or low; ' +
  '"stated_by_text": whether the text itself describes THIS character\'s origin or looks: "origin" ("a Japanese restaurant owner"), "appearance" (skin or hair: "a blonde girl"), "both" ("a blonde Swedish girl") or "none"; "stated_words": those exact words, or null. ' +
  'Hard rules: no anchor means origin null. Never guess from the language of the text, from a fictional or ordinary first name, from a job, food, religion, clothing or any stereotype: a generic "a man in a bar" is null. ' +
  'A place counts only when the character belongs there; someone visiting or coming from elsewhere keeps where they come from. ' +
  'Finally "overall": the one origin that EVERY human in the story shares, with its evidence; origin null when origins are mixed or any human has no anchor.'

const CAMPO_CRU = { type: ['string', 'null'] } as const
const ESQUEMA_DA_ORIGEM = {
  type: 'object', additionalProperties: false, required: ['origin', 'evidence', 'evidence_type', 'confidence'],
  properties: { origin: CAMPO_CRU, evidence: CAMPO_CRU, evidence_type: { type: 'string', enum: TIPOS }, confidence: { type: 'string', enum: CONFIANCAS } },
} as const
export const SCHEMA_ORIGEM_0311 = {
  type: 'object', additionalProperties: false, required: ['reasoning', 'characters', 'overall'],
  properties: {
    reasoning: { type: 'string' },
    characters: {
      type: 'array',
      items: {
        type: 'object', additionalProperties: false,
        required: ['role', 'name', 'is_group', 'is_human', 'origin', 'evidence', 'evidence_type', 'confidence', 'stated_by_text', 'stated_words'],
        properties: { role: { type: 'string' }, name: CAMPO_CRU, is_group: { type: 'boolean' }, is_human: { type: 'boolean' }, ...ESQUEMA_DA_ORIGEM.properties, stated_by_text: { type: 'string', enum: DITOS }, stated_words: CAMPO_CRU },
      },
    },
    overall: ESQUEMA_DA_ORIGEM,
  },
} as const

const R = (reasoning: string, characters: unknown[], overall: unknown) => JSON.stringify({ reasoning, characters, overall })
const NADA = { origin: null, evidence: null, evidence_type: 'none', confidence: 'high' }
const P = (role: string, name: string | null, origin: string | null, evidence: string | null, evidence_type: TipoDeEvidencia, stated_by_text: DitoPeloTexto = 'none', stated_words: string | null = null, is_group = false) => ({ role, name, is_group, is_human: true, origin, evidence, evidence_type, confidence: 'high', stated_by_text, stated_words })
/** Exemplos resolvidos (nenhum do conjunto de calibração). */
export const EXEMPLOS_ORIGEM_0311: ReadonlyArray<{ user: string; assistant: string }> = [
  { user: 'REQUEST: (not given)\nNARRATION: Rosa Parks refused to give up her seat on a bus in Montgomery.', assistant: R('Rosa Parks is a real historical person.', [P('activist', 'Rosa Parks', 'Black American', 'Rosa Parks', 'known_person')], { origin: 'Black American', evidence: 'Rosa Parks', evidence_type: 'known_person', confidence: 'high' }) },
  { user: 'REQUEST: (not given)\nNARRATION: An American pilot crashes in the jungle and villagers from Quang Tri hide him.', assistant: R('The pilot is American; the villagers are from a Vietnamese province.', [P('pilot', null, 'American', 'American pilot', 'nationality', 'origin', 'American pilot'), P('villagers', null, 'Vietnamese', 'Quang Tri', 'place', 'none', null, true)], NADA) },
  { user: 'REQUEST: (not given)\nNARRATION: A lonely lighthouse keeper finds a bottle on the beach. His dog barks at the waves.', assistant: R('Nothing says where the keeper is from; a dog is not human.', [P('lighthouse keeper', null, null, null, 'none')], NADA) },
  { user: 'REQUEST: Una niña rubia se pierde en Tokio\nNARRATION: Una niña rubia se pierde en Tokio y un taxista la lleva a casa.', assistant: R('The girl looks are stated; the driver belongs to Tokyo.', [P('girl', null, null, null, 'none', 'appearance', 'niña rubia'), P('taxi driver', null, 'Japanese', 'Tokio', 'place')], NADA) },
  { user: 'REQUEST: (not given)\nNARRATION: Emiliano Zapata rode through Morelos with his peasant army.', assistant: R('Zapata is a real Mexican revolutionary; his army shares that origin.', [P('revolutionary', 'Emiliano Zapata', 'Mexican', 'Emiliano Zapata', 'known_person'), P('peasant army', null, 'Mexican', 'Morelos', 'place', 'none', null, true)], { origin: 'Mexican', evidence: 'Morelos', evidence_type: 'place', confidence: 'high' }) },
  { user: 'REQUEST: (not given)\nNARRATION: A dragon named Flick guards a cave full of glowing eggs.', assistant: R('Only an invented creature, no human.', [], NADA) },
]

/** O que o modelo lê: o pedido original + a narração, sem as pistas de busca ([Pexels: …]). */
export function textoDaOrigem(prompt: unknown, ideiaOriginal: unknown): { pedido: string; narracao: string; inteiro: string } {
  const semPista = (t: unknown) => limpa(String(t ?? '').replace(/\[[^\]]*\]/g, ' '))
  const pedido = typeof ideiaOriginal === 'string' ? semPista(ideiaOriginal).slice(0, 2500) : ''
  const narracao = semPista(prompt).slice(0, 3500)
  return { pedido, narracao, inteiro: `${pedido}\n${narracao}` }
}

// ═══ 2. A RESPOSTA, CONFERIDA EM CÓDIGO ════════════════════════════════════════════════════════════════════════════════
export interface OrigemValida {
  papel: string
  nome: string | null
  grupo: boolean
  origem: string | null
  evidencia: string | null
  tipo: TipoDeEvidencia
  dito: DitoPeloTexto
  palavras_ditas: string | null
  motivo: string | null
}
export interface LeituraDeOrigem {
  raciocinio: string
  personagens: OrigemValida[]
  geral: { origem: string; evidencia: string } | null
  motivo_geral: string | null
}
/** Não é origem: palavra vaga ou descrição de corpo/cor (a pessoa não vira uma cor). */
const ORIGEM_VAGA_RE = /^(?:unknown|none|null|n\/?a|not specified|unspecified|mixed|various|multiple|ambiguous|international|foreign|local|native|western|human|person|people|man|woman|white|black|brown|yellow|red|caucasian|colored|coloured)$/i
const DESCRICAO_DE_CORPO_RE = /\b(?:skin|skinned|hair|haired|eyed|eyes|blond|blonde|brunette|complexion|features|looking|race)\b/i
/** Só o formato: letras latinas, 1-4 palavras, inicial maiúscula. Sem lista de povos: "Diné", "Roma", "Black American", "Ashkenazi Jewish" passam. */
const FORMA_DA_ORIGEM_RE = /^\p{Lu}[\p{Script=Latin}'-]*(?: [\p{Script=Latin}'-]+){0,3}$/u
export function origemBemFormada(bruta: unknown): string | null {
  const o = limpa(bruta).replace(/[’`]/g, "'").replace(/\s+(?:people|peoples|person|persons)$/i, '')
  const n = Array.from(o).length
  if (n < 3 || n > 40 || !FORMA_DA_ORIGEM_RE.test(o) || ORIGEM_VAGA_RE.test(o) || DESCRICAO_DE_CORPO_RE.test(o)) return null
  return o
}
const papelBemFormado = (bruto: unknown): string | null => {
  const p = limpa(bruto)
  return /^[a-z][a-z' -]{1,40}$/.test(p) ? p : null
}
/** Evidência literal: curta demais ou fora do texto não prova nada. Escrita sem caixa (CJK, árabe, devanágari) vale com 2 letras. */
function evidenciaValida(evidencia: string, texto: string): boolean {
  const letras = Array.from(evidencia.replace(/[^\p{L}\p{N}]/gu, ''))
  const latina = /^[\p{Script=Latin}\p{N}]+$/u.test(letras.join(''))
  return letras.length >= (latina ? 3 : 2) && citaNoTexto(texto, evidencia)
}
/** A conferência comum de uma origem (personagem ou geral). */
function conferir(c: { origin?: unknown; evidence?: unknown; evidence_type?: unknown; confidence?: unknown; name?: unknown }, texto: string): { origem: string | null; evidencia: string | null; motivo: string | null } {
  if (c.origin === null || c.origin === undefined || limpa(c.origin) === '') return { origem: null, evidencia: null, motivo: 'sem_ancora' }
  const origem = origemBemFormada(c.origin)
  if (!origem) return { origem: null, evidencia: null, motivo: 'origem_mal_formada' }
  const evidencia = limpa(c.evidence)
  if (!evidencia || c.evidence_type === 'none') return { origem: null, evidencia: null, motivo: 'sem_evidencia' }
  if (!evidenciaValida(evidencia, texto)) return { origem: null, evidencia: null, motivo: 'evidencia_fora_do_texto' }
  if (c.confidence === 'low') return { origem: null, evidencia: null, motivo: 'confianca_baixa' }
  if (c.evidence_type === 'known_person' && c.confidence !== 'high') return { origem: null, evidencia: null, motivo: 'pessoa_sem_certeza' }
  // o nome da pessoa nunca vira "origem" (e nunca vai ao prompt)
  const nomes = normaliza(`${limpa(c.name)} ${c.evidence_type === 'known_person' ? evidencia : ''}`).split(/[^\p{L}\p{N}]+/u).filter(Boolean)
  if (normaliza(origem).split(' ').some((w) => nomes.includes(w))) return { origem: null, evidencia: null, motivo: 'origem_igual_ao_nome' }
  return { origem, evidencia, motivo: null }
}
/** O JSON do modelo vira a leitura conferida contra o texto. Formato errado = null (conta como falha: nada muda). */
export function avaliarOrigem(bruto: unknown, texto: string): LeituraDeOrigem | null {
  const o = bruto && typeof bruto === 'object' ? (bruto as Record<string, unknown>) : null
  if (!o || !Array.isArray(o.characters) || !o.overall || typeof o.overall !== 'object') return null
  const personagens: OrigemValida[] = []
  for (const cru of o.characters.slice(0, 5) as Array<Record<string, unknown>>) {
    if (!cru || typeof cru !== 'object' || cru.is_human === false) continue
    const papel = papelBemFormado(cru.role)
    if (!papel) continue
    const nome = limpa(cru.name) || null
    if (nome && normaliza(papel).split(/[ -]/).some((w) => w.length > 2 && normaliza(nome).split(/[^\p{L}\p{N}]+/u).includes(w))) continue // o papel trouxe o nome: fora
    const dito: DitoPeloTexto = DITOS.includes(cru.stated_by_text as DitoPeloTexto) ? (cru.stated_by_text as DitoPeloTexto) : 'none'
    const palavras = limpa(cru.stated_words) || null
    // "disse" sem as palavras escritas no texto: a leitura desse personagem não merece confiança
    if (dito !== 'none' && (!palavras || !citaNoTexto(texto, palavras))) { personagens.push({ papel, nome, grupo: cru.is_group === true, origem: null, evidencia: null, tipo: 'none', dito: 'none', palavras_ditas: null, motivo: 'palavras_do_cliente_fora_do_texto' }); continue }
    const c = conferir(cru, texto)
    personagens.push({ papel, nome, grupo: cru.is_group === true, origem: c.origem, evidencia: c.evidencia, tipo: TIPOS.includes(cru.evidence_type as TipoDeEvidencia) ? (cru.evidence_type as TipoDeEvidencia) : 'none', dito, palavras_ditas: palavras, motivo: c.motivo })
  }
  const g = conferir(o.overall as Record<string, unknown>, texto)
  let geral = g.origem && g.evidencia ? { origem: g.origem, evidencia: g.evidencia } : null
  let motivo_geral = g.motivo
  // geral que contradiz um personagem, ou com a aparência dita pelo cliente: não vale (as palavras dele vencem)
  if (geral && personagens.some((p) => p.dito === 'appearance' || (!!p.origem && normaliza(p.origem) !== normaliza(geral!.origem)))) { geral = null; motivo_geral = 'geral_contradiz_personagem' }
  return { raciocinio: limpa(o.reasoning).slice(0, 240), personagens, geral, motivo_geral }
}

export interface RespostaDaOrigem { ok: boolean; leitura: LeituraDeOrigem | null; erro: string | null; ms: number; tentativas: number; model: string }
/** A chamada do filme. Nunca lança; { ok: false } = nada muda. */
export async function pedirOrigemDoElenco(prompt: unknown, ideiaOriginal: unknown, opts: OpcoesSemanticas = {}): Promise<RespostaDaOrigem> {
  try {
    const t = textoDaOrigem(prompt, ideiaOriginal)
    if (!t.narracao && !t.pedido) return { ok: false, leitura: null, erro: 'sem_texto', ms: 0, tentativas: 0, model: '' }
    const r = await perguntaSemantica<LeituraDeOrigem>({
      system: SYSTEM_ORIGEM_0311, user: `REQUEST: ${t.pedido || '(not given)'}\nNARRATION: ${t.narracao}`, nome: 'origem_do_elenco',
      schema: SCHEMA_ORIGEM_0311 as unknown as Record<string, unknown>, maxTokens: 500, exemplos: EXEMPLOS_ORIGEM_0311, ler: (o) => avaliarOrigem(o, t.inteiro),
    }, { timeoutMs: 4_000, tentativasExtras: 1, ...opts })
    return r.ok ? { ok: true, leitura: r.valor, erro: null, ms: r.ms, tentativas: r.tentativas, model: r.model } : { ok: false, leitura: null, erro: r.erro, ms: r.ms, tentativas: r.tentativas, model: r.model }
  } catch (e) {
    return { ok: false, leitura: null, erro: `erro_${e instanceof Error ? e.name : 'desconhecido'}`, ms: 0, tentativas: 0, model: '' }
  }
}

// ═══ 3. A DECISÃO POR PERSONAGEM ═══════════════════════════════════════════════════════════════════════════════════════
export interface OrigemDoFilme {
  leitura: LeituraDeOrigem
  /** O texto do cliente (pedido + narração): onde se confere se a palavra é dele. */
  texto: string
  /** false no modo presenter: o apresentador não é personagem da história, a origem geral não vale para ele. */
  usarGeral: boolean
}
export function montarOrigemDoFilme(resposta: RespostaDaOrigem | null | undefined, prompt: unknown, ideiaOriginal: unknown, opcoes: { presenter?: boolean } = {}): OrigemDoFilme | null {
  if (!resposta || !resposta.ok || !resposta.leitura) return null
  return { leitura: resposta.leitura, texto: textoDaOrigem(prompt, ideiaOriginal).inteiro, usarGeral: opcoes.presenter !== true }
}
/** A chamada só sai quando o filme pode receber a origem: herdado, Estrela (fotos reais), [faceless] e desenho infantil ficam como estão. */
export function origemLigadaNoFilme(a: { herdada: boolean; estrela: boolean; tagFaceless: boolean; desenhoInfantil: boolean }): boolean {
  return !a.herdada && !a.estrela && !a.tagFaceless && !a.desenhoInfantil
}

const singular = (w: string) => w.replace(/(?:ies)$/, 'y').replace(/(?<=[a-z]{2})s$/, '')
const palavrasDe = (s: string) => normaliza(s).split(/[^\p{L}\p{N}]+/u).filter(Boolean).map(singular)
/** A aparência que o CLIENTE escreveu na ficha ("a tall woman with red hair", "a Korean fisherman"): as palavras dele vencem qualquer leitura. */
const APARENCIA_ESCRITA_RE = /\b(?:[\p{L}-]+\s+(?:hair|skin)|[\p{L}-]+-skinned|blond|blonde|brunette|redhead|freckled)\b/giu
const POVO_NA_DESCRICAO_RE = /(?<=\b(?:an?|the)\s)\p{Lu}[\p{Ll}'-]{2,}(?=\s\p{Ll})/gu // "a Korean fisherman"; "on Lubang island" não conta
function fichaTemPalavraDoCliente(f: Pick<FichaDePersonagem, 'nome' | 'canonica' | 'origem'>, texto: string): boolean {
  if (f.origem !== 'autor') return false
  const desc = String(f.canonica ?? '').replace(new RegExp(`^${escapaRe(f.nome)},?\\s*`, 'i'), '').split('; ')[0]
  const aparencia = desc.match(APARENCIA_ESCRITA_RE) ?? []
  const proprias = desc.match(POVO_NA_DESCRICAO_RE) ?? []
  return [...aparencia, ...proprias].some((t) => citaNoTexto(texto, t))
}

export type MotivoDaFicha = 'aplicada' | 'palavra_do_cliente_fora_da_ficha' | 'nao_humano' | 'ja_tem' | 'sem_ancora' | 'ambiguo' | 'cliente_disse'
export interface DecisaoDaOrigem { origem: string | null; evidencia: string | null; motivo: MotivoDaFicha }

/** De onde é esta pessoa do elenco: pelo nome, pelo papel, por ser a única da história; senão, a origem geral. */
export function origemDaPessoa(f: Pick<FichaDePersonagem, 'nome' | 'nucleo' | 'tipo' | 'canonica' | 'origem'>, filme: OrigemDoFilme, humanosNoElenco = 1): DecisaoDaOrigem {
  const nada = (motivo: MotivoDaFicha): DecisaoDaOrigem => ({ origem: null, evidencia: null, motivo })
  if (f.tipo !== 'humano' || (f.origem as string) === 'mitica') return nada('nao_humano')
  const canonica = String(f.canonica ?? '')
  if (canonica.includes(MARCA_NA_FICHA)) return nada('ja_tem')
  if (fichaTemPalavraDoCliente(f, filme.texto)) return nada('cliente_disse')
  const { personagens, geral } = filme.leitura
  const chaves = new Set([...palavrasDe(f.nome), ...palavrasDe(f.nucleo ?? '')])
  const porNome = personagens.filter((p) => p.nome && mesmoPersonagem(p.nome, f.nome))
  const porPapel = porNome.length > 0 ? [] : personagens.filter((p) => { const nucleo = palavrasDe(p.papel).pop(); return !!nucleo && chaves.has(nucleo) })
  const individuais = personagens.filter((p) => !p.grupo)
  const unico = porNome.length === 0 && porPapel.length === 0 && individuais.length === 1 && humanosNoElenco === 1 ? individuais : []
  const candidatos = porNome.length > 0 ? porNome : porPapel.length > 0 ? porPapel : unico
  if (candidatos.length > 0) {
    if (new Set(candidatos.map((c) => normaliza(c.origem))).size > 1) return nada('ambiguo')
    const c = candidatos[0]
    if (c.dito === 'appearance') return nada('cliente_disse')
    if (c.dito === 'origin' || c.dito === 'both') {
      if (citaNoTexto(canonica, c.origem ?? '') || (c.palavras_ditas && citaNoTexto(canonica, c.palavras_ditas))) return nada('cliente_disse')
      return c.origem ? { origem: c.origem, evidencia: c.evidencia, motivo: 'palavra_do_cliente_fora_da_ficha' } : nada('cliente_disse')
    }
    if (c.origem) return citaNoTexto(canonica, c.origem) ? nada('ja_tem') : { origem: c.origem, evidencia: c.evidencia, motivo: 'aplicada' }
    return nada('sem_ancora')
  }
  if (geral && filme.usarGeral) return citaNoTexto(canonica, geral.origem) ? nada('ja_tem') : { origem: geral.origem, evidencia: geral.evidencia, motivo: 'aplicada' }
  return nada('sem_ancora')
}

// ═══ 4. A FICHA E A CENA ═══════════════════════════════════════════════════════════════════════════════════════════════
/** "a Japanese man", "a Nigerian girl", "an Irish person": o gênero vem da ficha; criança nunca vira "man". */
function quemE(f: Pick<FichaDePersonagem, 'nome' | 'canonica' | 'genero'>, origem: string, opcoes?: OpcoesDaOrigem): string {
  const desc = String(f.canonica ?? '').split('; ')[0]
  // KINEO-ELENCO-PROVA-DE-GENTE-1211 — a pessoa que a PRÓPRIA ficha descreve vence o gênero guardado ao lado (657ad797: "the man, a man in their
  // early thirties…; origin: a South African woman" — o gênero da ficha veio dos pronomes da história, que eram da mulher). Só sem substantivo na ficha o gênero decide.
  const daFicha = /\b(?:woman|lady)\b/i.test(desc) ? 'woman' : /\bman\b/i.test(desc) ? 'man' : null
  if (opcoes?.nucleoVence && daFicha) f = { ...f, genero: daFicha } // KINEO-ELENCO-PROVA-DE-GENTE-1211
  const quem = /\bgirl\b/i.test(desc) ? 'girl' : /\bboy\b/i.test(desc) ? 'boy' : /\b(?:child|kid|toddler|baby)\b/i.test(desc) ? 'child'
    : f.genero === 'woman' ? 'woman' : f.genero === 'man' ? 'man' : /\bwoman\b/i.test(desc) ? 'woman' : /\bman\b/i.test(desc) ? 'man' : 'person'
  return `${artigo(origem)} ${origem} ${quem}`
}
/** KINEO-ELENCO-PROVA-DE-GENTE-1211 — nucleoVence: a linha de origem diz a pessoa que a ficha descreve; ausente = byte a byte o de antes. */
export interface OpcoesDaOrigem { nucleoVence?: boolean }
export function linhaDeOrigem(f: Pick<FichaDePersonagem, 'nome' | 'canonica' | 'genero'>, origem: string, opcoes?: OpcoesDaOrigem): string {
  return `origin: ${quemE(f, origem, opcoes)}, ${FRASE_ORIGEM(origem)}`
}
/** A aparência sorteada/escrita por máquina que brigaria com a origem sai; o que o cliente escreveu (citado no texto dele) fica. Vale para todo povo. */
export function semAparenciaInventada(canonica: string, textoDoCliente: string): string {
  const fica = (trecho: string) => citaNoTexto(textoDoCliente, trecho)
  return String(canonica ?? '')
    .replace(/\b(?:light brown|sandy-blond|sandy blond|blond|blonde|chestnut|reddish|red|ginger|auburn|brown|dark|black|fair)\s+hair\b/gi, (m) => (fica(m) ? m : 'hair'))
    .replace(/\b(?:blue|green|grey|gray|hazel)\s+eyes\b/gi, (m) => (fica(m) ? m : 'eyes'))
    .replace(/\bfreckles and a small nose\b/gi, (m) => (fica(m) ? m : 'a natural face'))
    .replace(/,?\s*\b(?:pale|fair|light|olive|tan|tanned|dark|brown)[- ](?:skin(?:ned)?|complexion)\b/gi, (m) => (fica(m.replace(/^,?\s*/, '')) ? m : ''))
    .replace(/,?\s*\bfreckles\b(?! and)/gi, (m) => (fica('freckles') ? m : ''))
}
/** A ficha com a origem: uma linha depois da descrição, idempotente pela marca. Sem origem, ser não humano ou ficha mítica: a mesma ficha. */
export function fichaComOrigem(f: FichaDePersonagem, origem: string | null, textoDoCliente = '', opcoes?: OpcoesDaOrigem): FichaDePersonagem { // KINEO-ELENCO-PROVA-DE-GENTE-1211: opcoes
  if (!origem || f.tipo !== 'humano' || (f.origem as string) === 'mitica' || String(f.canonica ?? '').includes(MARCA_NA_FICHA)) return f
  const [desc, ...resto] = semAparenciaInventada(f.canonica, textoDoCliente).split('; ')
  return { ...f, canonica: [desc, linhaDeOrigem(f, origem, opcoes), ...resto].join('; ') }
}

/** O elenco inteiro com a origem (cada personagem a sua). `trocas` alimenta trocarFichaNoPrompt/trocasDaFicha: mesmos pares da trava do estilo. */
export function elencoComOrigem(elenco: ReadonlyArray<FichaDePersonagem>, filme: OrigemDoFilme, opcoes?: OpcoesDaOrigem): { elenco: FichaDePersonagem[]; trocas: Array<[string, string]>; decisoes: Array<{ nome: string } & DecisaoDaOrigem> } { // KINEO-ELENCO-PROVA-DE-GENTE-1211: opcoes
  const humanos = elenco.filter((f) => f.tipo === 'humano' && (f.origem as string) !== 'mitica').length
  const decisoes = elenco.map((f) => ({ nome: f.nome, ...origemDaPessoa(f, filme, humanos) }))
  const novo = elenco.map((f, i) => fichaComOrigem(f, decisoes[i].origem, filme.texto, opcoes)) // KINEO-ELENCO-PROVA-DE-GENTE-1211
  return { elenco: novo, trocas: novo.flatMap((f, i): Array<[string, string]> => (f.canonica !== elenco[i].canonica ? [[elenco[i].canonica, f.canonica]] : [])), decisoes }
}

/** A folha/âncora do planejador hollywood sem elenco: o personagem que ele inventou ganha a origem GERAL do filme. */
export function sheetComOrigem(sheet: string | null | undefined, filme: OrigemDoFilme): string | null | undefined {
  const g = filme.usarGeral ? filme.leitura.geral : null
  if (!g || !sheet || !limpa(sheet) || sheet.includes(MARCA_NA_FICHA)) return sheet
  return `${sheet.replace(/[\s.;,]+$/, '')}; origin: ${g.origem}, ${FRASE_ORIGEM(g.origem)}`
}

/** O que a camada elencoEpoca recebe (injeção: ela não importa rede nenhuma; ausente = byte a byte o de antes). */
export interface OrigemParaCenas {
  /** A descrição do personagem lido do texto já com a origem (e sem o povo da tabela, se discorda); null = fica como está. */
  descricao: (p: { nome: string; genero: 'man' | 'woman' | null; tipo: string; descricao: string }, povoDaTabela: string | null) => string | null
  /** A frase da cena com gente sem ficha que a carregue; '' = nada a acrescentar. */
  frase: (prompt: string) => string
  /** O figurino da época sem a lista ocidental (fedora, trench coat), quando a cena carrega uma origem. */
  roupaDaEpoca: (rotulo: string) => string
}
export function origemParaCenas(filme: OrigemDoFilme | null | undefined, opcoes?: OpcoesDaOrigem): OrigemParaCenas | null { // KINEO-ELENCO-PROVA-DE-GENTE-1211: opcoes
  if (!filme) return null
  return {
    descricao: (p, povoDaTabela) => {
      const f = { nome: p.nome, nucleo: p.nome.split(' ').pop() ?? p.nome, tipo: p.tipo as FichaDePersonagem['tipo'], canonica: p.descricao, origem: 'deterministica' as const, genero: p.genero }
      const d = origemDaPessoa(f, filme)
      if (!d.origem) return null
      let base = semAparenciaInventada(p.descricao, filme.texto)
      if (povoDaTabela && normaliza(povoDaTabela) !== normaliza(d.origem)) base = base.replace(new RegExp(`\\b(?:a|an) ${escapaRe(povoDaTabela)} (\\S)`), (_m, letra: string) => `${artigo(letra)} ${letra}`)
      return `${base}, ${linhaDeOrigem(f, d.origem, opcoes)}` // KINEO-ELENCO-PROVA-DE-GENTE-1211: opcoes
    },
    frase: (prompt) => {
      if (String(prompt ?? '').includes(MARCA_NA_FICHA)) return ''
      const { geral, personagens } = filme.leitura
      // condicional de propósito: nunca é ordem de pôr gente (a lição de Tunguska em KINEO-EPOCA-SEM-GENTE-INVENTADA-0311), e não obriga os figurantes
      if (geral && filme.usarGeral) return `The main person, if one is shown in this shot, is ${geral.origem}, ${FRASE_ORIGEM(geral.origem)}. `
      const frases: string[] = []
      for (const p of personagens) {
        if (!p.origem || p.dito === 'appearance' || frases.length >= 2) continue
        const nucleo = limpa(p.papel).split(' ').pop() ?? ''
        const cita = citaNoTexto(prompt, p.papel) || citaNoTexto(prompt, nucleo) || citaNoTexto(prompt, singular(nucleo)) || citaNoTexto(prompt, `${singular(nucleo)}s`)
        if (!cita) continue
        // o mesmo papel com duas origens ("the soldier" americano e japonês): nenhum dos dois
        if (personagens.some((q) => q !== p && singular(limpa(q.papel).split(' ').pop() ?? '') === singular(nucleo) && normaliza(q.origem) !== normaliza(p.origem))) continue
        frases.push(`The ${p.papel} in this shot ${p.grupo ? 'are' : 'is'} ${p.origem}, ${FRASE_ORIGEM(p.origem)}.`)
      }
      return frases.length ? `${frases.join(' ')} ` : ''
    },
    roupaDaEpoca: (rotulo) => `period-accurate ${rotulo} clothing true to their own place and role`,
  }
}

/** As origens distintas que o prompt da cena carrega (os juízes só perguntam quando há exatamente uma). */
export function origensNoPrompt(prompt: unknown): string[] {
  return [...new Set([...String(prompt ?? '').matchAll(ORIGEM_NO_PROMPT_RE)].map((m) => m[1]))]
}

// ═══ 5. O EVENTO ═══════════════════════════════════════════════════════════════════════════════════════════════════════
/** Metadado de cinematic_cast_origin: a origem, a prova, se entrou e por que não. */
export function relatoDaOrigem(args: { generationId: string; engine: unknown; resposta: RespostaDaOrigem; filme: OrigemDoFilme | null; decisoes: ReadonlyArray<{ nome: string } & DecisaoDaOrigem> }) {
  const { resposta, filme, decisoes } = args
  const leitura = filme?.leitura ?? null
  const primeira = decisoes.find((d) => d.origem) ?? null
  const achada = primeira?.origem ?? leitura?.geral?.origem ?? leitura?.personagens.find((p) => p.origem)?.origem ?? null
  const prova = primeira?.evidencia ?? leitura?.geral?.evidencia ?? leitura?.personagens.find((p) => p.origem)?.evidencia ?? null
  return {
    version: ORIGEM_DO_ELENCO_VERSAO, generation_id: args.generationId, engine: typeof args.engine === 'string' ? args.engine : null,
    origin: achada, evidence: prova, applied: !!achada,
    motive: achada ? null : resposta.ok ? (decisoes[0]?.motivo ?? leitura?.motivo_geral ?? 'sem_ancora') : resposta.erro,
    ms: resposta.ms, attempts: resposta.tentativas,
    cast: decisoes.map((d) => ({ nome: d.nome, origin: d.origem, evidence: d.evidencia, motive: d.motivo })),
    people: (leitura?.personagens ?? []).map((p) => ({ role: p.papel, group: p.grupo, origin: p.origem, evidence: p.evidencia, stated: p.dito, motive: p.motivo })),
    overall: leitura?.geral ?? null,
  }
}
