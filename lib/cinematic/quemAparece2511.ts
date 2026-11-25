// KINEO-QUEM-APARECE-2511 [CEO 25/11 08:21, docs/semana-2/DECISAO-QUEM-APARECE-NO-PLANO-2511.md; desenho aprovado 08:40, DESENHO-QUEM-APARECE-2511.md] — UMA
// leitura responde, por plano, quem do elenco está VISÍVEL. Nasceu de dois achados da mesma pergunta: a parte B do 2º personagem pelo prenome (lista de
// formas de ausência que a revisão sempre achava furada) e o protagonista posto em plano que o roteiro pede sem ele (Alcatraz, Umudara, Shiro: a regra
// protagonistaEmTodaCena e a cláusula da ficha em toda cena com "alguém").
//   · o modelo (o mesmo gpt-4o-mini do crítico de still, só texto) OBSERVA: por plano e por número do elenco, on_screen (yes | no | unclear) e how
//     (shown | voice_only | stated_absent | memory | not_mentioned). Lê o marcador do autor e a fala de cada plano; o visual que o nosso escritor gerou vai
//     rotulado como nosso e só como contexto. Sem exemplo no pedido (regra de 11/11). Nenhuma lista de palavras decide presença;
//   · o CÓDIGO decide: visível = on_screen 'yes' com how 'shown' ou 'memory'; 'no' = ausente; 'unclear' ou resposta incoerente ('yes' com voz, ausência
//     dita ou não citado) = aquele plano fica com a regra de hoje (null). A saída é conferida por esquema: plano a mais ou faltando, número de elenco
//     fora da lista ou fora de ordem, valor fora do enum = a leitura falhou = a main de hoje no filme inteiro. O texto do cliente só chega ao modelo no
//     papel de dado; o que volta é só número e enum.
//   · interruptor QUEM_APARECE_2511: 'internal' = só a lista EXATA da casa (contaDaCasaExata); cliente e 'off' = nenhuma chamada, nada muda.
import { contaDaCasaExata } from '@/lib/internalAccounts'
import { STILL_CRITIC_MODELO, custoDoCriticoUsd } from '@/lib/cinematic/criticoStill'

export const QUEM_APARECE_2511_VERSAO = 'quem_aparece_2511_v2'
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

export type NaTela = 'yes' | 'no' | 'unclear'
export type Como = 'shown' | 'voice_only' | 'stated_absent' | 'memory' | 'not_mentioned'
const NA_TELA: readonly NaTela[] = ['yes', 'no', 'unclear']
const COMO: readonly Como[] = ['shown', 'voice_only', 'stated_absent', 'memory', 'not_mentioned']
export type PessoaDoElenco = { nome: string; tipo?: 'humano' | 'animal' | 'criatura' | null; genero?: 'man' | 'woman' | null
  /** [CEO 25/11, volta 2] a descrição curta que a rota já tem (a canônica da ficha); sem ela, só o nome. */ descricao?: string | null; canonica?: string | null; protagonista?: boolean }
/** O que mais aparece no plano além do elenco (volta 2, a assimetria): ninguém; uma figura sem nome que pode ser do elenco; outras pessoas que claramente não são. */
export type Outros = 'none' | 'unnamed_figure' | 'distinct_people'
const OUTROS: readonly Outros[] = ['none', 'unnamed_figure', 'distinct_people']
export type PlanoParaLer = { fala: string; marcador: string; visual: string }
/** A leitura conferida: por plano, por pessoa do elenco (na ordem do elenco), o que o modelo viu. */
export type LeituraDePresenca = Array<Array<{ naTela: NaTela; como: Como }> & { outros?: Outros }>
/** O que os consumidores leem: o elenco lido e, por plano, os nomes visíveis ou null (aquele plano fica com a regra de hoje). */
export type PresencaDosPlanos = { elenco: readonly string[]; planos: ReadonlyArray<ReadonlyArray<string> | null> }

const corta = (s: unknown, max: number) => String(s ?? '').replace(/\s+/g, ' ').trim().slice(0, max)
const TIPO_EN: Record<string, string> = { humano: 'person', animal: 'animal', criatura: 'creature' }

/** O protagonista: quem a ficha marca; sem marca, o primeiro do elenco. */
export function indiceDoProtagonista(elenco: readonly PessoaDoElenco[]): number { const i = elenco.findIndex((p) => p.protagonista === true); return i >= 0 ? i : 0 }

/** O pedido ao modelo: só observação, em JSON. Nenhum exemplo; nenhuma ordem de pôr ou tirar ninguém. */
export function pedidoDePresenca(elenco: readonly PessoaDoElenco[], planos: readonly PlanoParaLer[]): { messages: unknown[]; caracteres: number } {
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
export function lerLeituraDePresenca(raw: string, nElenco: number, nPlanos: number): LeituraDePresenca | null {
  let o: unknown
  try { o = JSON.parse(raw) } catch { return null }
  const shots = o && typeof o === 'object' ? (o as Record<string, unknown>).shots : null
  if (!Array.isArray(shots) || shots.length !== nPlanos || nElenco < 1) return null
  const out: LeituraDePresenca = []
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
export function decidirPresenca(l: LeituraDePresenca, elenco: readonly PessoaDoElenco[]): PresencaDosPlanos {
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
// pessoas e a ordem dos ids o esquema não sabe, e continuam conferidos por lerLeituraDePresenca.
export const FORMATO_DA_RESPOSTA = { type: 'json_schema', json_schema: { name: 'presenca_por_plano', strict: true, schema: {
  type: 'object', additionalProperties: false, required: ['shots'], properties: { shots: { type: 'array', items: {
    type: 'object', additionalProperties: false, required: ['shot', 'others', 'cast'], properties: {
      shot: { type: 'integer' }, others: { type: 'string', enum: [...OUTROS] },
      cast: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['id', 'on_screen', 'how'], properties: {
        id: { type: 'integer' }, on_screen: { type: 'string', enum: [...NA_TELA] }, how: { type: 'string', enum: [...COMO] } } } } } } } } } } } as const
export type ChamadaDePresenca = { presenca: PresencaDosPlanos | null; custoUsd: number; ms: number; erro: string | null; unclear: number
  /** [volta 2] o que o modelo respondeu, conferido (a sonda mostra para o diagnóstico), e os tokens da chamada (o tempo vem da saída). */ leitura?: LeituraDePresenca | null; tokens?: { entrada: number | null; saida: number | null } }
/** UMA leitura (rede). Nunca lança. Sem chave, prazo, HTTP, JSON torto ou fora do esquema = presenca null (a main de hoje). */
export async function lerQuemAparece(elenco: readonly PessoaDoElenco[], planos: readonly PlanoParaLer[], opts: { timeoutMs?: number; fetchImpl?: typeof fetch; apiKey?: string; agora?: () => number } = {}): Promise<ChamadaDePresenca> {
  const agora = opts.agora ?? Date.now, t0 = agora()
  const fim = (presenca: PresencaDosPlanos | null, custoUsd: number, erro: string | null, extra: Pick<ChamadaDePresenca, 'leitura' | 'tokens'> = {}): ChamadaDePresenca =>
    ({ presenca, custoUsd, ms: Math.max(0, agora() - t0), erro, unclear: presenca ? presenca.planos.filter((p) => p === null).length : 0, ...extra })
  if (elenco.length < 1 || elenco.length > QUEM_APARECE_MAX_ELENCO || planos.length < 1 || planos.length > QUEM_APARECE_MAX_PLANOS) return fim(null, 0, 'fora_do_tamanho')
  const key = opts.apiKey ?? (typeof process !== 'undefined' ? process.env.OPENAI_API_KEY : undefined)
  if (!key) return fim(null, 0, 'sem_chave')
  const { messages, caracteres } = pedidoDePresenca(elenco, planos)
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), Math.max(1, opts.timeoutMs ?? QUEM_APARECE_PRAZO_MS))
  try {
    const res = await (opts.fetchImpl ?? fetch)('https://api.openai.com/v1/chat/completions', { method: 'POST', signal: ctrl.signal, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({ model: STILL_CRITIC_MODELO, temperature: 0, max_tokens: 900, response_format: FORMATO_DA_RESPOSTA, messages }) })
    if (!res.ok) return fim(null, 0, `http_${res.status}`)
    const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }>; usage?: { prompt_tokens?: number; completion_tokens?: number } }
    const custo = custoDoCriticoUsd(data.usage, 0, caracteres)
    const l = lerLeituraDePresenca(data.choices?.[0]?.message?.content ?? '', elenco.length, planos.length)
    const num = (x: unknown) => (typeof x === 'number' && Number.isFinite(x) ? x : null)
    const extra = { leitura: l, tokens: { entrada: num(data.usage?.prompt_tokens), saida: num(data.usage?.completion_tokens) } }
    return l ? fim(decidirPresenca(l, elenco), custo, null, extra) : fim(null, custo, 'fora_do_esquema', extra)
  } catch {
    return fim(null, custoDoCriticoUsd(null, 0, caracteres), ctrl.signal.aborted ? 'prazo' : 'fetch')
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
  const planos = p.planos.map((d, i) => d && d.filter((n) => {
    if (prot && mesmaPessoa(n, prot)) return true
    const pode = (a.hoje[i] ?? []).some((x) => mesmaPessoa(x, n)) || (a.citados[i] ?? []).some((x) => mesmaPessoa(x, n))
    if (!pode) contido++
    return pode
  }))
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
export type PedidoDePresenca = { elenco: PessoaDoElenco[]; planos: PlanoParaLer[] }
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
  return { elenco, planos }
}
export const chaveDaPresenca = (p: PedidoDePresenca) => JSON.stringify([p.elenco.map((e) => [e.nome, e.tipo, e.genero, e.descricao ?? null, e.protagonista === true]), p.planos.map((x) => [x.fala, x.marcador, x.visual])])
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
