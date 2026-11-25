// KINEO-QUEM-APARECE-2511 [CEO 25/11 08:21, docs/semana-2/DECISAO-QUEM-APARECE-NO-PLANO-2511.md; desenho aprovado 08:40, DESENHO-QUEM-APARECE-2511.md] — UMA
// leitura responde, por plano, quem do elenco está VISÍVEL. Nasceu de dois achados da mesma pergunta: a parte B do 2º personagem pelo prenome (lista de
// formas de ausência que a revisão sempre achava furada) e o protagonista posto em plano que o roteiro pede sem ele (Alcatraz, Umudara, Shiro: a regra
// protagonistaEmTodaCena e a cláusula da ficha em toda cena com "alguém").
//   · o modelo (o mesmo gpt-4o-mini do crítico de still, só texto) OBSERVA e o CÓDIGO decide. Lê o marcador do autor e a fala de cada plano; o visual
//     que o nosso escritor gerou vai rotulado como nosso e só como contexto. Sem exemplo no pedido (regra de 11/11). Nenhuma lista de palavras decide
//     presença. A saída é conferida por esquema; qualquer desvio = a leitura falhou = a main de hoje no filme inteiro. O texto do cliente só chega ao modelo
//     no papel de dado; o que volta é só número e enum. (Voltas 1 e 2 perguntavam on_screen/how por pessoa; a volta 3, abaixo, troca a pergunta.)
//   · interruptor QUEM_APARECE_2511: 'internal' = só a lista EXATA da casa (contaDaCasaExata); cliente e 'off' = nenhuma chamada, nada muda.
// [CEO 25/11 13:15, VOLTA 3 — a pergunta muda] Duas passadas (86 e 126 leituras) mediram o mesmo: o gpt-4o-mini acerta quando o plano mostra OUTRA coisa e
// erra quando precisa dizer a quem um pronome se refere (19 erros TIRAVAM o protagonista de plano dele). A leitura deixa de perguntar "esta pessoa está na
// tela?" e passa a perguntar, por plano, o ASSUNTO PRINCIPAL (enum de três) e, só quando o assunto é alguém, quais ids do elenco estão NOMEADOS e vistos:
//   · 'place_or_object' (lugar ou objeto, ninguém) e 'others_only' (só gente ou criatura claramente diferente do elenco): o plano sai sem ninguém do elenco
//     — é o ÚNICO jeito de a ficha do protagonista sair. Com um id nomeado nesses dois = resposta incoerente = aquele plano fica com a regra de hoje;
//   · 'person_or_creature' (alguém que pode ser do elenco, sozinho ou junto, por nome, pronome, descrição, em qualquer língua): sem o protagonista nomeado
//     (pelo leitor E pelo nome escrito na fala ou no marcador do autor), o plano fica EXATAMENTE com a regra de hoje (null). Com ele nomeado, ele fica; o 2º só
//     ENTRA nomeado pelo leitor e com o nome escrito; quem não foi nomeado fica com a regra de hoje NAQUELE plano (`indecisos`, que o piso completa pela main).
//   Nada de inferência: o 2º nunca entra por pronome; o protagonista nunca sai por pronome. O piso, o teto da imagem-chave e o registro no claim continuam.
import { contaDaCasaExata } from '@/lib/internalAccounts'
import { STILL_CRITIC_MODELO } from '@/lib/cinematic/criticoStill'
import { AI_TEXT_MODELS } from '@/lib/aiModels' // [A/B] a lista fechada de modelos sai do registro da casa
import { TARIFAS_VISAO } from '@/lib/regua95/visaoProvedor' // [A/B] e a tarifa, da tabela que o projeto já usa

export const QUEM_APARECE_2511_VERSAO = 'quem_aparece_2511_v3'
// [CEO 25/11 11:55, o ensaio de 86 leituras NÃO passou na régua: tirou quem estava em 5 casos, pôs quem não estava em 7] 'sonda' = a leitura não entra em
// filme NENHUM (nem da casa) até passar; a sonda (/api/admin/sonda-presenca) continua.
export type ModoQuemAparece2511 = 'off' | 'sonda' | 'internal' | 'public'
export const QUEM_APARECE_2511: ModoQuemAparece2511 = 'sonda'
export const quemApareceLigado = (modo: ModoQuemAparece2511, email: string | null | undefined): boolean =>
  modo === 'public' || (modo === 'internal' && contaDaCasaExata(email))
export const QUEM_APARECE_PRAZO_MS = 6_000
export const QUEM_APARECE_MAX_PLANOS = 12
export const QUEM_APARECE_MAX_ELENCO = 6
const FALA_MAX = 600, MARCADOR_MAX = 300, VISUAL_MAX = 500, NOME_MAX = 80, DESCRICAO_MAX = 200

/** [volta 3] O assunto principal do plano: lugar ou objeto, sem ninguém; só gente ou criatura claramente diferente do elenco; alguém que pode ser do elenco. */
export type Assunto = 'place_or_object' | 'others_only' | 'person_or_creature'
const ASSUNTOS: readonly Assunto[] = ['place_or_object', 'others_only', 'person_or_creature']
export type PessoaDoElenco = { nome: string; tipo?: 'humano' | 'animal' | 'criatura' | null; genero?: 'man' | 'woman' | null
  /** [CEO 25/11, volta 2] a descrição curta que a rota já tem (a canônica da ficha); sem ela, só o nome. */ descricao?: string | null; canonica?: string | null; protagonista?: boolean }
export type PlanoParaLer = { fala: string; marcador: string; visual: string }
/** A leitura conferida: por plano (na ordem dos planos), o assunto e os índices do elenco (0, 1, …) que o leitor diz nomeados e vistos. */
export type LeituraDePresenca = Array<{ assunto: Assunto; nomeados: number[] }>
/** O que os consumidores leem: o elenco lido e, por plano, os nomes visíveis ou null (aquele plano fica com a regra de hoje).
 *  [volta 3] `indecisos`: por plano decidido, quem a leitura NÃO decidiu (fica com a regra de hoje naquele plano; o piso completa pela main). Os consumidores
 *  não leem este campo: só `elenco` e `planos`. */
export type PresencaDosPlanos = { elenco: readonly string[]; planos: ReadonlyArray<ReadonlyArray<string> | null>; indecisos?: ReadonlyArray<ReadonlyArray<string>> }

const corta = (s: unknown, max: number) => String(s ?? '').replace(/\s+/g, ' ').trim().slice(0, max)
const TIPO_EN: Record<string, string> = { humano: 'person', animal: 'animal', criatura: 'creature' }

/** O protagonista: quem a ficha marca; sem marca, o primeiro do elenco. */
export function indiceDoProtagonista(elenco: readonly PessoaDoElenco[]): number { const i = elenco.findIndex((p) => p.protagonista === true); return i >= 0 ? i : 0 }

/** O pedido ao modelo: só observação, em JSON. Nenhum exemplo; nenhuma ordem de pôr ou tirar ninguém. */
export function pedidoDePresenca(elenco: readonly PessoaDoElenco[], planos: readonly PlanoParaLer[]): { messages: unknown[]; caracteres: number } {
  const sistema = 'You read the plan of a short film. For every numbered shot, say what the shot is mainly about. ' +
    'Judge from the author\'s words for the shot: the author\'s shot note, when there is one, says what the camera shows, and the line spoken over the shot says what happens. The generated visual was written by us, not by the author: use it only to understand the shot, never as the only reason for an answer. ' +
    '"subject" is one of: "place_or_object" = the shot is about a place, a thing, a landscape or an event, and no person or creature is seen; ' +
    '"others_only" = the shot is about people or creatures who are all clearly not any cast member: another role, another kind of being, or another number of people than the cast; ' +
    '"person_or_creature" = the shot is about a person or creature who could be a cast member, alone or together with others; the words can point to them by name, by a pronoun, by a description, or in another language. ' +
    'When you are not sure which subject fits, answer "person_or_creature". ' +
    '"named" lists the ids of the cast members who are seen in the shot and whose name is written in the author\'s words for the shot. A cast member\'s name can also be an ordinary word: list the id only when the word names that cast member. A person\'s belongings, a photo of them or their voice do not put them on screen. When the subject is not "person_or_creature", "named" is an empty list. ' +
    'Answer only with JSON: {"shots": [{"shot": number, "subject": "place_or_object" | "others_only" | "person_or_creature", "named": [number]}]}, one entry per shot, in order.'
  const prot = indiceDoProtagonista(elenco)
  const quem = elenco.map((p, i) => { const nome = corta(p.nome, NOME_MAX), bruta = corta(p.descricao || p.canonica, DESCRICAO_MAX + NOME_MAX + 2)
    const d = corta(bruta.toLowerCase().startsWith(`${nome.toLowerCase()}, `) ? bruta.slice(nome.length + 2) : bruta, DESCRICAO_MAX) // a canônica começa pelo nome ("Elias Ward, a ..."): o nome já está na linha
    return `${i + 1}. ${nome} (${TIPO_EN[p.tipo ?? ''] ?? 'character'}${p.genero === 'man' ? ', male' : p.genero === 'woman' ? ', female' : ''}${i === prot ? ', main character' : ''})${d ? `: ${d}` : ''}` }).join('\n')
  const tomadas = planos.map((p, i) => [`Shot ${i + 1}.`, `Author's shot note: ${corta(p.marcador, MARCADOR_MAX) || '(none)'}`, `Spoken line: ${corta(p.fala, FALA_MAX) || '(none)'}`,
    `Generated visual (ours): ${corta(p.visual, VISUAL_MAX) || '(none)'}`].join('\n')).join('\n\n')
  const texto = `Cast:\n${quem}\n\nShots:\n${tomadas}`
  return { messages: [{ role: 'system', content: sistema }, { role: 'user', content: texto }], caracteres: sistema.length + texto.length }
}

/** [volta 3, item 4] Por que a leitura foi recusada: o esquema estrito garante a forma e o enum, mas não o NÚMERO de planos, a numeração nem a faixa dos ids. */
export type MotivoDoEsquema = 'json' | 'sem_shots' | 'planos_conta' | 'plano_objeto' | 'plano_numero' | 'plano_repetido' | 'assunto' | 'named_lista' | 'named_id'
/** A resposta conferida por esquema, com o motivo da recusa. Planos em qualquer ordem (pelo número de cada um); id repetido conta uma vez. */
export function conferirLeituraDePresenca(raw: string, nElenco: number, nPlanos: number): { leitura: LeituraDePresenca | null; motivo: MotivoDoEsquema | null } {
  const nao = (motivo: MotivoDoEsquema) => ({ leitura: null, motivo })
  let o: unknown
  try { o = JSON.parse(raw) } catch { return nao('json') }
  const shots = o && typeof o === 'object' ? (o as Record<string, unknown>).shots : null
  if (!Array.isArray(shots) || nElenco < 1) return nao('sem_shots')
  if (shots.length !== nPlanos) return nao('planos_conta')
  const out: Array<{ assunto: Assunto; nomeados: number[] } | undefined> = Array.from({ length: nPlanos }, () => undefined)
  for (const bruto of shots) {
    const s = bruto && typeof bruto === 'object' && !Array.isArray(bruto) ? (bruto as Record<string, unknown>) : null
    if (!s) return nao('plano_objeto')
    if (typeof s.shot !== 'number' || !Number.isInteger(s.shot) || s.shot < 1 || s.shot > nPlanos) return nao('plano_numero')
    if (out[s.shot - 1]) return nao('plano_repetido')
    if (!ASSUNTOS.includes(s.subject as Assunto)) return nao('assunto')
    if (!Array.isArray(s.named)) return nao('named_lista')
    const nomeados: number[] = []
    for (const id of s.named) {
      if (typeof id !== 'number' || !Number.isInteger(id) || id < 1 || id > nElenco) return nao('named_id')
      if (!nomeados.includes(id - 1)) nomeados.push(id - 1)
    }
    out[s.shot - 1] = { assunto: s.subject as Assunto, nomeados: nomeados.sort((a, b) => a - b) }
  }
  return { leitura: out as LeituraDePresenca, motivo: null }
}
export const lerLeituraDePresenca = (raw: string, nElenco: number, nPlanos: number): LeituraDePresenca | null => conferirLeituraDePresenca(raw, nElenco, nPlanos).leitura

/** A regra, no código (volta 3). `planos` = os textos lidos: o nome tem de estar ESCRITO na fala ou no marcador do autor para contar como nomeado. */
export function decidirPresenca(l: LeituraDePresenca, elenco: readonly PessoaDoElenco[], planos: ReadonlyArray<{ fala: string; marcador: string }>): PresencaDosPlanos {
  const prot = indiceDoProtagonista(elenco), nomesDoElenco = elenco.map((p) => p.nome)
  const escritos = citadosPeloNome(nomesDoElenco, planos)
  const indecisos: string[][] = []
  const decididos = l.map((a, i) => {
    indecisos.push([])
    // (a) e (b): ninguém do elenco no plano. Um id nomeado aqui contradiz o assunto: aquele plano fica com a regra de hoje
    if (a.assunto !== 'person_or_creature') return a.nomeados.length > 0 ? null : []
    // (c): só decide com o protagonista nomeado pelo leitor E escrito pelo autor; sem isso, EXATAMENTE a regra de hoje naquele plano
    const nomeadoEEscrito = (k: number) => a.nomeados.includes(k) && (escritos[i] ?? []).includes(nomesDoElenco[k])
    if (!nomeadoEEscrito(prot)) return null
    const nomes = [nomesDoElenco[prot]]
    for (let k = 0; k < elenco.length; k++) if (k !== prot) { if (nomeadoEEscrito(k)) nomes.push(nomesDoElenco[k]); else indecisos[i].push(nomesDoElenco[k]) }
    return nomes
  })
  return { elenco: nomesDoElenco, planos: decididos, indecisos: decididos.map((d, i) => (d ? indecisos[i] : [])) }
}

/** [volta 3] Por plano e por pessoa (na ordem do elenco): true visível, false ausente, null = a regra de hoje. É o que a sonda mostra para a régua. */
export function presencaPorPessoa(p: PresencaDosPlanos): Array<Array<boolean | null>> {
  return p.planos.map((d, i) => p.elenco.map((n) => (!d || (p.indecisos?.[i] ?? []).some((x) => mesmaPessoa(x, n)) ? null : d.some((x) => mesmaPessoa(x, n)))))
}

// [CEO 25/11, volta 2 (e); volta 3: o menor esquema] a saída estruturada da OpenAI (json_schema estrito): a forma e o enum vêm garantidos pelo fornecedor; o
// número de planos, a numeração e a faixa dos ids o esquema não sabe, e continuam conferidos por conferirLeituraDePresenca.
export const FORMATO_DA_RESPOSTA = { type: 'json_schema', json_schema: { name: 'assunto_por_plano', strict: true, schema: {
  type: 'object', additionalProperties: false, required: ['shots'], properties: { shots: { type: 'array', items: {
    type: 'object', additionalProperties: false, required: ['shot', 'subject', 'named'], properties: {
      shot: { type: 'integer' }, subject: { type: 'string', enum: [...ASSUNTOS] }, named: { type: 'array', items: { type: 'integer' } } } } } } } } } as const
// ═══ [CEO 25/11, ensaio 3 reprovado — A/B, uma variável por vez] A PERGUNTA v2 (pessoa a pessoa, com others e a assimetria do protagonista), byte a byte a do
// commit 6804eb793, só com os nomes trocados (sufixo V2). Convive com a v3 SÓ para a sonda: o caminho do filme (desligado) usa uma (QUEM_APARECE_VERSAO_DO_FILME). ═══
export type NaTela = 'yes' | 'no' | 'unclear'
export type Como = 'shown' | 'voice_only' | 'stated_absent' | 'memory' | 'not_mentioned'
const NA_TELA: readonly NaTela[] = ['yes', 'no', 'unclear']
const COMO: readonly Como[] = ['shown', 'voice_only', 'stated_absent', 'memory', 'not_mentioned']
/** O que mais aparece no plano além do elenco (volta 2, a assimetria): ninguém; uma figura sem nome que pode ser do elenco; outras pessoas que claramente não são. */
export type Outros = 'none' | 'unnamed_figure' | 'distinct_people'
const OUTROS: readonly Outros[] = ['none', 'unnamed_figure', 'distinct_people']
export type LeituraDePresencaV2 = Array<Array<{ naTela: NaTela; como: Como }> & { outros?: Outros }>

export function pedidoDePresencaV2(elenco: readonly PessoaDoElenco[], planos: readonly PlanoParaLer[]): { messages: unknown[]; caracteres: number } {
  const sistema = 'You read the plan of a short film. For every numbered shot and every numbered cast member, say whether that cast member is visible on screen in that shot. ' +
    'Judge from the author\'s words for the shot: the author\'s shot note, when there is one, and the line spoken over the shot. The generated visual was written by us, not by the author: use it only to understand the shot, never as the only reason to put someone on screen. ' +
    'The words point to a cast member in any way they can: the name, a pronoun, a description that fits that cast member\'s description, or the same words in another language. ' + // KINEO-QUEM-APARECE-2511 volta 2
    'A cast member\'s name can also be an ordinary word; decide from the sentence whether the word names the cast member. A person\'s belongings, a photo of them or their voice do not put them on screen. ' +
    'When the words show a figure without a name and it is not clear whether it is a cast member or someone else, answer "unclear" for that cast member. ' +
    'Answer only with JSON: {"shots": [{"shot": number, "others": "none" | "unnamed_figure" | "distinct_people", "cast": [{"id": number, "on_screen": "yes" | "no" | "unclear", "how": "shown" | "voice_only" | "stated_absent" | "memory" | "not_mentioned"}]}]}, ' +
    'one entry per shot in order and, inside each, one entry per cast member in order. "others" says who else is on screen besides the cast: "none" = nobody else, "unnamed_figure" = a person or creature without a name who could be one of the cast, "distinct_people" = other people or creatures who are clearly not any cast member. ' +
    '"how" says how the shot relates to that cast member: "shown" = seen in the shot, "voice_only" = only heard, ' +
    '"stated_absent" = the words say the person is not there, "memory" = seen in a memory or flashback, "not_mentioned" = the shot does not involve the person.'
  const prot = indiceDoProtagonista(elenco)
  const quem = elenco.map((p, i) => { const nome = corta(p.nome, NOME_MAX), bruta = corta(p.descricao || p.canonica, DESCRICAO_MAX + NOME_MAX + 2)
    const d = corta(bruta.toLowerCase().startsWith(`${nome.toLowerCase()}, `) ? bruta.slice(nome.length + 2) : bruta, DESCRICAO_MAX) // a canônica começa pelo nome ("Elias Ward, a ..."): o nome já está na linha
    return `${i + 1}. ${nome} (${TIPO_EN[p.tipo ?? ''] ?? 'character'}${p.genero === 'man' ? ', male' : p.genero === 'woman' ? ', female' : ''}${i === prot ? ', main character' : ''})${d ? `: ${d}` : ''}` }).join('\n')
  const tomadas = planos.map((p, i) => [`Shot ${i + 1}.`, `Author's shot note: ${corta(p.marcador, MARCADOR_MAX) || '(none)'}`, `Spoken line: ${corta(p.fala, FALA_MAX) || '(none)'}`,
    `Generated visual (ours): ${corta(p.visual, VISUAL_MAX) || '(none)'}`].join('\n')).join('\n\n')
  const texto = `Cast:\n${quem}\n\nShots:\n${tomadas}`
  return { messages: [{ role: 'system', content: sistema }, { role: 'user', content: texto }], caracteres: sistema.length + texto.length }
}

/** A resposta conferida por esquema. Qualquer desvio = null (a leitura falhou). */
export function lerLeituraDePresencaV2(raw: string, nElenco: number, nPlanos: number): LeituraDePresencaV2 | null {
  let o: unknown
  try { o = JSON.parse(raw) } catch { return null }
  const shots = o && typeof o === 'object' ? (o as Record<string, unknown>).shots : null
  if (!Array.isArray(shots) || shots.length !== nPlanos || nElenco < 1) return null
  const out: LeituraDePresencaV2 = []
  for (let i = 0; i < shots.length; i++) {
    const s = shots[i] && typeof shots[i] === 'object' ? (shots[i] as Record<string, unknown>) : null
    if (!s || s.shot !== i + 1 || !Array.isArray(s.cast) || s.cast.length !== nElenco || !OUTROS.includes(s.others as Outros)) return null
    const linha = [] as Array<{ naTela: NaTela; como: Como }> & { outros?: Outros }
    linha.outros = s.others as Outros
    for (let k = 0; k < s.cast.length; k++) {
      const c = s.cast[k] && typeof s.cast[k] === 'object' ? (s.cast[k] as Record<string, unknown>) : null
      if (!c || c.id !== k + 1 || !NA_TELA.includes(c.on_screen as NaTela) || !COMO.includes(c.how as Como)) return null
      linha.push({ naTela: c.on_screen as NaTela, como: c.how as Como })
    }
    out.push(linha)
  }
  return out
}

/** A regra, no código: visível = 'yes' visto (ou lembrança); ausente = 'no'; o resto = aquele plano fica com a regra de hoje. */
export function decidirPresencaV2(l: LeituraDePresencaV2, elenco: readonly PessoaDoElenco[]): PresencaDosPlanos {
  const prot = indiceDoProtagonista(elenco)
  const planos = l.map((linha) => {
    const nomes: string[] = []
    for (let k = 0; k < linha.length; k++) {
      const { naTela, como } = linha[k]
      if (naTela === 'unclear') return null
      if (naTela === 'no' && (como === 'shown' || como === 'memory')) return null // [revisora, volta 1 §2] viu e não está: incoerente = a regra de hoje
      // [CEO 25/11, volta 2 (c)] TIRAR o protagonista pede certeza: só com o plano sem ninguém ou com outras pessoas claramente distintas; figura sem nome = a regra de hoje
      if (naTela === 'no' && k === prot && linha.outros !== 'none' && linha.outros !== 'distinct_people') return null
      // [CEO 25/11, volta 2 (d)] o 2º personagem só entra visto; lembrança dele = a regra de hoje
      if (naTela === 'yes' && k !== prot && como !== 'shown') return null
      if (naTela === 'yes') { if (como !== 'shown' && como !== 'memory') return null; nomes.push(elenco[k].nome) }
    }
    return nomes
  })
  return { elenco: elenco.map((p) => p.nome), planos }
}

// [CEO 25/11, volta 2 (e)] a saída estruturada da OpenAI (json_schema estrito): a forma e os valores vêm garantidos pelo fornecedor; o número de planos e de
// pessoas e a ordem dos ids o esquema não sabe, e continuam conferidos por lerLeituraDePresencaV2.
export const FORMATO_DA_RESPOSTA_V2 = { type: 'json_schema', json_schema: { name: 'presenca_por_plano', strict: true, schema: {
  type: 'object', additionalProperties: false, required: ['shots'], properties: { shots: { type: 'array', items: {
    type: 'object', additionalProperties: false, required: ['shot', 'others', 'cast'], properties: {
      shot: { type: 'integer' }, others: { type: 'string', enum: [...OUTROS] },
      cast: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['id', 'on_screen', 'how'], properties: {
        id: { type: 'integer' }, on_screen: { type: 'string', enum: [...NA_TELA] }, how: { type: 'string', enum: [...COMO] } } } } } } } } } } } as const
// ═══ fim da pergunta v2 ═══

// ═══ [CEO 25/11, A/B] versão da pergunta e modelo: listas FECHADAS ═══
/** As duas perguntas. A sonda sem `versao` usa a v2; o caminho do filme (desligado: chave 'sonda') usaria esta, e só ela, quando ligar. */
export type VersaoDaPergunta = 'v2' | 'v3'
export const VERSOES_DA_PERGUNTA: readonly VersaoDaPergunta[] = ['v2', 'v3']
export const QUEM_APARECE_VERSAO_DA_SONDA: VersaoDaPergunta = 'v2'
export const QUEM_APARECE_VERSAO_DO_FILME: VersaoDaPergunta = 'v3'
/** Os modelos de TEXTO de chat da OpenAI que o projeto já usa em produção (lib/aiModels.ts AI_TEXT_MODELS), com a tarifa que o projeto já registra
 *  (lib/regua95/visaoProvedor.ts TARIFAS_VISAO, US$ por milhão de tokens). Nenhum modelo novo. `raciocinio` = não aceita temperature nem max_tokens
 *  (usa max_completion_tokens), a mesma regra de visaoProvedor. O de hoje é o do crítico de still (STILL_CRITIC_MODELO). */
export const MODELOS_DA_SONDA: Readonly<Record<string, { inPerM: number; outPerM: number; raciocinio: boolean; papel: string }>> = {
  [STILL_CRITIC_MODELO]: { ...TARIFAS_VISAO[AI_TEXT_MODELS.vision], raciocinio: false, papel: 'crítico de still, analyzer, utility (o de hoje)' },
  [AI_TEXT_MODELS.research]: { ...TARIFAS_VISAO[AI_TEXT_MODELS.research], raciocinio: false, papel: 'pesquisa (Ads v2, Espaços, GEO)' },
  [AI_TEXT_MODELS.writer]: { ...TARIFAS_VISAO[AI_TEXT_MODELS.writer], raciocinio: false, papel: 'escritor e planejador' },
  [AI_TEXT_MODELS.filmJudge]: { ...TARIFAS_VISAO[AI_TEXT_MODELS.filmJudge], raciocinio: true, papel: 'juiz da nota automática (na sombra)' },
}
export const QUEM_APARECE_MODELO_PADRAO = STILL_CRITIC_MODELO
export const modeloDaSondaValido = (m: unknown): m is string => typeof m === 'string' && Object.prototype.hasOwnProperty.call(MODELOS_DA_SONDA, m)
/** Teto de saída de um modelo de raciocínio (o raciocínio conta como saída). */
export const QUEM_APARECE_MAX_SAIDA_RACIOCINIO = 4000
/** [revisão cruzada 25/11, kineo 3d] O custo NUNCA fica abaixo do real.
 *  · com o uso informado (as duas partes): a conta exata pela tarifa do modelo, arredondada PARA CIMA em 1e-9 (US$ 0,0001812 sai 0,0001812, nunca 0,000181);
 *  · sem o uso (ou sem uma das partes, ou a chamada caiu no prazo depois de enviada): o TETO demonstrado — a entrada não passa dos bytes UTF-8 do pedido mais 8
 *    por mensagem e 8 de abertura (cada token cobre ao menos 1 byte), e a saída não passa do máximo que o pedido permite. `teto` diz que é teto. */
export const QUEM_APARECE_TOKENS_POR_MENSAGEM = 8
export type LimitesDaLeitura = { bytesDeEntrada: number; mensagens: number; saidaMaxima: number }
const paraCima = (usd: number) => Math.ceil(Math.round(usd * 1e12) / 1e3) / 1e9
export function custoDaLeitura(modelo: string, usage: { prompt_tokens?: unknown; completion_tokens?: unknown } | null | undefined, limites: LimitesDaLeitura): { usd: number; teto: boolean } {
  const t = MODELOS_DA_SONDA[modelo]
  if (!t) return { usd: 0, teto: false }
  const e = Number(usage?.prompt_tokens), s = Number(usage?.completion_tokens)
  const temE = Number.isFinite(e) && e >= 0 && usage?.prompt_tokens !== undefined && usage?.prompt_tokens !== null, temS = Number.isFinite(s) && s >= 0 && usage?.completion_tokens !== undefined && usage?.completion_tokens !== null
  const entrada = temE ? e : Math.max(0, limites.bytesDeEntrada) + QUEM_APARECE_TOKENS_POR_MENSAGEM * (Math.max(0, limites.mensagens) + 1)
  const saida = temS ? s : Math.max(0, limites.saidaMaxima)
  return { usd: paraCima((entrada * t.inPerM + saida * t.outPerM) / 1_000_000), teto: !(temE && temS) }
}
/** Os limites de UM pedido: bytes UTF-8 das mensagens, quantas mensagens, e a saída máxima que ele permite. */
export function limitesDoPedido(messages: ReadonlyArray<{ content?: unknown }>, saidaMaxima: number): LimitesDaLeitura {
  const enc = new TextEncoder()
  return { bytesDeEntrada: messages.reduce((n, m) => n + enc.encode(String(m?.content ?? '')).length, 0), mensagens: messages.length, saidaMaxima }
}

export type ChamadaDePresenca = { presenca: PresencaDosPlanos | null; custoUsd: number; ms: number; erro: string | null; unclear: number
  /** [volta 2] o que o modelo respondeu, conferido, e os tokens da chamada. [volta 3] a resposta BRUTA e o motivo, só quando o esquema recusou (o diagnóstico
   *  das "fora_do_esquema"); o fim da geração e se houve recusa do modelo. Sob o esquema estrito a resposta só tem números e enum.
   *  [A/B] a versão da pergunta e o modelo usados; `leitura` vem no formato da versão (v2: por pessoa; v3: assunto e nomeados). */
  /** [revisão cruzada] true = o custo é o TETO (sem o uso informado), não a conta exata. */ custoEhTeto?: boolean
  leitura?: LeituraDePresenca | LeituraDePresencaV2 | null; tokens?: { entrada: number | null; saida: number | null }; bruta?: string | null; motivoDoEsquema?: MotivoDoEsquema | null; fim?: string | null; recusa?: boolean
  versao?: VersaoDaPergunta; modelo?: string }
export const BRUTA_MAX = 2000
/** UMA leitura (rede). Nunca lança. Sem chave, prazo, HTTP, JSON torto ou fora do esquema = presenca null (a main de hoje). Versão ou modelo fora da lista
 *  fechada = recusa SEM chamada. Sem `versao`/`modelo`: a pergunta do filme (QUEM_APARECE_VERSAO_DO_FILME) com o modelo de hoje. */
export async function lerQuemAparece(elenco: readonly PessoaDoElenco[], planos: readonly PlanoParaLer[], opts: { timeoutMs?: number; fetchImpl?: typeof fetch; apiKey?: string; agora?: () => number; versao?: VersaoDaPergunta; modelo?: string } = {}): Promise<ChamadaDePresenca> {
  const agora = opts.agora ?? Date.now, t0 = agora()
  const versao = opts.versao ?? QUEM_APARECE_VERSAO_DO_FILME, modelo = opts.modelo ?? QUEM_APARECE_MODELO_PADRAO
  const fim = (presenca: PresencaDosPlanos | null, custoUsd: number, erro: string | null, extra: Partial<ChamadaDePresenca> = {}): ChamadaDePresenca =>
    ({ presenca, custoUsd, ms: Math.max(0, agora() - t0), erro, unclear: presenca ? presenca.planos.filter((p) => p === null).length : 0, versao, modelo, ...extra })
  if (!VERSOES_DA_PERGUNTA.includes(versao)) return fim(null, 0, 'versao_fora_da_lista')
  if (!modeloDaSondaValido(modelo)) return fim(null, 0, 'modelo_fora_da_lista')
  if (elenco.length < 1 || elenco.length > QUEM_APARECE_MAX_ELENCO || planos.length < 1 || planos.length > QUEM_APARECE_MAX_PLANOS) return fim(null, 0, 'fora_do_tamanho')
  const key = opts.apiKey ?? (typeof process !== 'undefined' ? process.env.OPENAI_API_KEY : undefined)
  if (!key) return fim(null, 0, 'sem_chave')
  const { messages } = versao === 'v2' ? pedidoDePresencaV2(elenco, planos) : pedidoDePresenca(elenco, planos)
  const raciocinio = MODELOS_DA_SONDA[modelo]?.raciocinio === true, saidaMaxima = raciocinio ? QUEM_APARECE_MAX_SAIDA_RACIOCINIO : versao === 'v2' ? 900 : 600
  const tamanho = raciocinio ? { max_completion_tokens: saidaMaxima } : { temperature: 0, max_tokens: saidaMaxima }
  const limites = limitesDoPedido(messages as Array<{ content?: unknown }>, saidaMaxima)
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), Math.max(1, opts.timeoutMs ?? QUEM_APARECE_PRAZO_MS))
  try {
    const res = await (opts.fetchImpl ?? fetch)('https://api.openai.com/v1/chat/completions', { method: 'POST', signal: ctrl.signal, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({ model: modelo, ...tamanho, response_format: versao === 'v2' ? FORMATO_DA_RESPOSTA_V2 : FORMATO_DA_RESPOSTA, messages }) })
    if (!res.ok) return fim(null, 0, `http_${res.status}`)
    const data = (await res.json()) as { choices?: Array<{ finish_reason?: string; message?: { content?: string | null; refusal?: string | null } }>; usage?: { prompt_tokens?: number; completion_tokens?: number } }
    const c$ = custoDaLeitura(modelo, data.usage, limites), custo = c$.usd
    const escolha = data.choices?.[0], conteudo = typeof escolha?.message?.content === 'string' ? escolha.message.content : ''
    const num = (x: unknown) => (typeof x === 'number' && Number.isFinite(x) ? x : null)
    const comum: Partial<ChamadaDePresenca> = { tokens: { entrada: num(data.usage?.prompt_tokens), saida: num(data.usage?.completion_tokens) },
      fim: typeof escolha?.finish_reason === 'string' ? escolha.finish_reason.slice(0, 40) : null, recusa: !!escolha?.message?.refusal, custoEhTeto: c$.teto }
    if (versao === 'v2') {
      const l2 = lerLeituraDePresencaV2(conteudo, elenco.length, planos.length)
      return l2 ? fim(decidirPresencaV2(l2, elenco), custo, null, { ...comum, leitura: l2 }) : fim(null, custo, 'fora_do_esquema', { ...comum, leitura: null, bruta: conteudo.slice(0, BRUTA_MAX), motivoDoEsquema: null })
    }
    const { leitura: l, motivo } = conferirLeituraDePresenca(conteudo, elenco.length, planos.length)
    const extra: Partial<ChamadaDePresenca> = { ...comum, leitura: l }
    return l ? fim(decidirPresenca(l, elenco, planos), custo, null, extra) : fim(null, custo, 'fora_do_esquema', { ...extra, bruta: conteudo.slice(0, BRUTA_MAX), motivoDoEsquema: motivo })
  } catch {
    return fim(null, custoDaLeitura(modelo, null, limites).usd, ctrl.signal.aborted ? 'prazo' : 'fetch', { custoEhTeto: true }) // o pedido pode ter sido cobrado: o teto
  } finally { clearTimeout(timer) }
}

// [revisora, volta 1 §1/§2; CEO 25/11 10:20] O PISO: uma leitura burra dentro do esquema ("tudo no", "tudo yes") não manda no filme.
//   · a leitura que tira o protagonista de TODOS os planos em que a main o põe = o filme inteiro na main (fonte 'piso', motivo 'protagonista_sumiu');
//   · quem não é o protagonista só entra nos planos em que a main já o põe ou em que a fala ou o marcador do autor o citam pelo NOME; nos outros, fica
//     como a main (ausente). O pronome do 2º personagem, sem o nome, fica com a regra de hoje (é o preço do piso).
export type PisoDaPresenca = { presenca: PresencaDosPlanos | null; motivo: 'protagonista_sumiu' | null; segundo_contido: number }
export function pisoDaPresenca(p: PresencaDosPlanos, a: { protagonista: string | null; hoje: ReadonlyArray<ReadonlyArray<string>>; citados: ReadonlyArray<ReadonlyArray<string>> }): PisoDaPresenca {
  const prot = a.protagonista && p.elenco.some((n) => mesmaPessoa(n, a.protagonista as string)) ? a.protagonista : null
  if (prot) {
    const daMain = p.planos.map((_, i) => i).filter((i) => (a.hoje[i] ?? []).some((n) => mesmaPessoa(n, prot)))
    if (daMain.length > 0 && daMain.every((i) => { const d = p.planos[i]; return !!d && !d.some((n) => mesmaPessoa(n, prot)) })) return { presenca: null, motivo: 'protagonista_sumiu', segundo_contido: 0 }
  }
  let contido = 0
  const planos = p.planos.map((d, i) => d && [...d.filter((n) => {
    if (prot && mesmaPessoa(n, prot)) return true
    const pode = (a.hoje[i] ?? []).some((x) => mesmaPessoa(x, n)) || (a.citados[i] ?? []).some((x) => mesmaPessoa(x, n))
    if (!pode) contido++
    return pode
  }), // [volta 3] quem a leitura não decidiu naquele plano fica como a main o põe (a regra de hoje, pessoa a pessoa)
  ...(p.indecisos?.[i] ?? []).filter((n) => !d.some((x) => mesmaPessoa(x, n)) && (a.hoje[i] ?? []).some((x) => mesmaPessoa(x, n)))])
  return { presenca: { elenco: p.elenco, planos }, motivo: null, segundo_contido: contido }
}
/** Por plano, quem do elenco a fala ou o marcador do autor citam pelo NOME (uma palavra do nome com 3 letras ou mais, sem o "the"; sem caixa). */
export function citadosPeloNome(nomes: readonly string[], planos: ReadonlyArray<{ fala: string; marcador: string }>): string[][] {
  const palavras = (t: string) => new Set(Array.from(t.toLowerCase().matchAll(/[\p{L}\p{N}]+/gu), (m) => m[0]))
  return planos.map((pl) => { const ws = palavras(`${pl.fala ?? ''} ${pl.marcador ?? ''}`)
    return nomes.filter((n) => String(n).toLowerCase().replace(/^the\s+/, '').split(/[^\p{L}\p{N}]+/u).filter((w) => w.length >= 3).some((w) => ws.has(w))) })
}

const base = (s: string) => String(s ?? '').toLowerCase().replace(/^the\s+/, '').trim()
/** A mesma pessoa: o nome igual, sem caixa e sem o "the" da frente. */
export const mesmaPessoa = (a: string, b: string): boolean => !!base(a) && base(a) === base(b)
/** O que a leitura diz desta pessoa neste plano: true visível, false ausente, null = a regra de hoje (sem leitura, plano incerto ou pessoa fora do elenco lido). */
export function presencaDe(p: PresencaDosPlanos | null | undefined, plano: number, nome: string): boolean | null {
  if (!p || !p.elenco.some((n) => mesmaPessoa(n, nome))) return null
  const d = p.planos[plano]
  return d ? d.some((n) => mesmaPessoa(n, nome)) : null
}
/** Por plano, a presença de uma pessoa que tem vários nomes (a referência única: `nomes` da ficha): a primeira decisão que a leitura tem. */
export function presencaPorPlano(p: PresencaDosPlanos | null | undefined, nPlanos: number, nomes: readonly string[]): Array<boolean | null> {
  return Array.from({ length: nPlanos }, (_, i) => { for (const n of nomes) { const d = presencaDe(p, i, n); if (d !== null) return d } return null })
}

// As cenas de hoje corrigidas pela leitura moram na camada que as decide (personagemAjuste cenasComPresenca2511; elencoEpoca e filme15Elenco com a mesma
// regra inline), porque essas camadas não importam este módulo.

/** Para o claim: só número. `mudou` = os planos em que a leitura trocou quem está em relação à regra de hoje. */
export type RelatoQuemAparece = { versao: string; fonte: 'leitura' | 'main' | 'piso'; motivo: string | null; ms: number; custo_usd: number; planos: Array<number[] | null>; unclear: number; mudou: number[]; sem_imagem_chave: number[]; segundo_contido: number }
export function relatoQuemAparece(c: ChamadaDePresenca, elenco: readonly PessoaDoElenco[], mudou: readonly number[] = [], semImagemChave: readonly number[] = [], piso: PisoDaPresenca | null = null): RelatoQuemAparece {
  return { versao: QUEM_APARECE_2511_VERSAO, fonte: !c.presenca ? 'main' : piso?.motivo ? 'piso' : 'leitura', motivo: c.erro ?? piso?.motivo ?? null, ms: c.ms, custo_usd: Math.round(c.custoUsd * 1e6) / 1e6, segundo_contido: piso?.segundo_contido ?? 0,
    planos: c.presenca ? c.presenca.planos.map((d) => (d ? d.map((n) => elenco.findIndex((e) => mesmaPessoa(e.nome, n)) + 1) : null)) : [], unclear: c.unclear,
    mudou: [...mudou], sem_imagem_chave: [...semImagemChave] }
}

// ── a sonda da casa (/api/admin/sonda-presenca): uma por vez, a mesma leitura não repete, teto por instância ─────────────────────────────────────
export const SONDA_PRESENCA_TETO_POR_INSTANCIA = 120
export type EstadoDaSondaDePresenca = { ocupada: boolean; feitas: Set<string>; leituras: number; tempos: number[] }
export const novoEstadoDaSondaDePresenca = (): EstadoDaSondaDePresenca => ({ ocupada: false, feitas: new Set(), leituras: 0, tempos: [] })
export type PedidoDePresenca = { elenco: PessoaDoElenco[]; planos: PlanoParaLer[]; /** [A/B] sem o campo: v2 */ versao: VersaoDaPergunta; /** [A/B] sem o campo: o de hoje */ modelo: string }
const txt = (x: unknown, max: number, vazio = false) => (typeof x === 'string' && x.length <= max && (vazio || x.trim()) && !/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/.test(x) ? x.trim() : null)
/** O corpo do POST da sonda, campo a campo. Fora do formato = null. */
export function lerPedidoDePresenca(body: unknown): PedidoDePresenca | null {
  const b = body && typeof body === 'object' ? (body as Record<string, unknown>) : null
  if (!b || !Array.isArray(b.elenco) || !Array.isArray(b.planos) || b.elenco.length < 1 || b.elenco.length > QUEM_APARECE_MAX_ELENCO || b.planos.length < 1 || b.planos.length > QUEM_APARECE_MAX_PLANOS) return null
  const elenco: PessoaDoElenco[] = []
  for (const e of b.elenco as unknown[]) {
    const r = e && typeof e === 'object' ? (e as Record<string, unknown>) : null
    const nome = r ? txt(r.nome, NOME_MAX) : null
    const tipo = r?.tipo === undefined || r?.tipo === null ? null : r.tipo === 'humano' || r.tipo === 'animal' || r.tipo === 'criatura' ? r.tipo : undefined
    const genero = r?.genero === undefined || r?.genero === null ? null : r.genero === 'man' || r.genero === 'woman' ? r.genero : undefined
    const descricao = r?.descricao === undefined || r?.descricao === null ? null : txt(r.descricao, DESCRICAO_MAX) ?? undefined // [volta 2] a descrição da ficha
    const protagonista = r?.protagonista === undefined ? false : r.protagonista === true || r.protagonista === false ? r.protagonista : undefined
    if (!nome || tipo === undefined || genero === undefined || descricao === undefined || protagonista === undefined || elenco.some((x) => mesmaPessoa(x.nome, nome))) return null
    elenco.push({ nome, tipo, genero, descricao, protagonista })
  }
  const planos: PlanoParaLer[] = []
  for (const p of b.planos as unknown[]) {
    const r = p && typeof p === 'object' ? (p as Record<string, unknown>) : null
    const fala = r ? txt(r.fala ?? '', FALA_MAX, true) : null, marcador = r ? txt(r.marcador ?? '', MARCADOR_MAX, true) : null, visual = r ? txt(r.visual ?? '', VISUAL_MAX, true) : null
    if (fala === null || marcador === null || visual === null || !(fala || marcador || visual)) return null
    planos.push({ fala, marcador, visual })
  }
  if (elenco.filter((e) => e.protagonista).length > 1) return null
  // [A/B] versão e modelo: opcionais, de listas FECHADAS; fora da lista = o pedido inteiro recusado (nenhuma chamada)
  const versao = b.versao === undefined ? QUEM_APARECE_VERSAO_DA_SONDA : VERSOES_DA_PERGUNTA.includes(b.versao as VersaoDaPergunta) ? (b.versao as VersaoDaPergunta) : null
  const modelo = b.modelo === undefined ? QUEM_APARECE_MODELO_PADRAO : modeloDaSondaValido(b.modelo) ? b.modelo : null
  if (!versao || !modelo) return null
  return { elenco, planos, versao, modelo }
}
export const chaveDaPresenca = (p: PedidoDePresenca) => JSON.stringify([p.elenco.map((e) => [e.nome, e.tipo, e.genero, e.descricao ?? null, e.protagonista === true]), p.planos.map((x) => [x.fala, x.marcador, x.visual]), p.versao, p.modelo]) // [A/B] o mesmo caso em outra versão ou outro modelo não é repetido
/** [A/B] A leitura no formato da versão que respondeu (v2: others e, por pessoa, on_screen/how; v3: subject e named), para a sonda. */
export function leituraParaASonda(c: ChamadaDePresenca): unknown {
  if (!c.leitura) return null
  if (c.versao === 'v2') return (c.leitura as LeituraDePresencaV2).map((linha) => ({ others: linha.outros ?? null, cast: linha.map((x) => ({ on_screen: x.naTela, how: x.como })) }))
  return (c.leitura as LeituraDePresenca).map((p) => ({ subject: p.assunto, named: p.nomeados.map((k) => k + 1) }))
}
export type AdmissaoDePresenca = 'ok' | 'nao_e_da_casa' | 'ocupada' | 'repetida' | 'teto'
/** A trava, antes da chamada. 'ok' reserva a vez; o chamador libera com liberarSondaDePresenca. */
export function admitirSondaDePresenca(e: EstadoDaSondaDePresenca, email: string | null | undefined, chave: string): AdmissaoDePresenca {
  if (!contaDaCasaExata(email)) return 'nao_e_da_casa'
  if (e.ocupada) return 'ocupada'
  if (e.feitas.has(chave)) return 'repetida'
  if (e.leituras >= SONDA_PRESENCA_TETO_POR_INSTANCIA) return 'teto'
  e.ocupada = true; e.leituras++; e.feitas.add(chave)
  return 'ok'
}
export function liberarSondaDePresenca(e: EstadoDaSondaDePresenca, ms: number | null = null): void { e.ocupada = false; if (typeof ms === 'number' && Number.isFinite(ms)) e.tempos.push(ms) }
/** O p95 dos tempos desta instância (para comparar com o prazo de 6 s). Sem tempo = null. */
export function p95(tempos: readonly number[]): number | null {
  if (!tempos.length) return null
  const t = [...tempos].sort((a, b) => a - b)
  return t[Math.min(t.length - 1, Math.ceil(0.95 * t.length) - 1)]
}
