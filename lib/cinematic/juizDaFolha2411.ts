// KINEO-JUIZ-DA-FOLHA-2411 [CEO 24/11, prova paga 4: Bolt ab9a1d7a] — a etapa 1 (KINEO-FOLHA-DA-REFERENCIA-2411) devolveu à referência única uma folha que
// NINGUÉM julgou. No Bolt o autor escreveu "small round orange robot with big blue eyes" e a folha saiu um robô alto com cabeça e orelhas de cachorro: o filme
// inteiro seguiu a folha (coerente e fora do pedido). Antes de a folha servir à referência única, UMA leitura de visão barata (o mesmo modelo do crítico de
// still, STILL_CRITIC_MODELO, gpt-4o-mini, ~US$ 0,001 por chamada) OBSERVA a folha e o CÓDIGO decide (o padrão de KINEO-CRITICO-OBSERVA-0911: o modelo
// enxerga certo quando só descreve e erra quando o pedido manda reprovar). Sem exemplo no prompt.
//   · o modelo devolve: o meio da imagem, quantos personagens, e, para cada traço que o AUTOR escreveu (a descrição do autor, lida da ficha), a categoria
//     (species | shape | size | color | feature | clothing) e se ele está visível (yes | no | unclear);
//   · o código julga POR EIXO: traços ('mais_de_um' > 'forma_especie' > 'traco'; "unclear" não reprova) e meio (filme fotorreal com folha cartum, ou filme
//     desenhado com folha foto);
//   · [CEO 24/11, decisão A com tolerância] reprovou: UMA folha nova com o que faltou (os traços nas palavras do autor e/ou o meio do filme). Na 2ª:
//       – traços reprovados → a folha NÃO serve (todo tipo, sem tolerância: é o cachorro-robô);
//       – só o meio reprovado, traços certos: HUMANO em filme fotorreal → não serve (pessoa em desenho num filme de foto é defeito); ANIMAL ou CRIATURA em
//         filme fotorreal → SERVE, com 'meio_tolerado' no claim (o Ember 2a01a29c saiu coerente e fiel com a folha em animação); filme DESENHADO com folha
//         foto → não serve, sempre;
//       – sem leitura → não serve (não julgada).
// Interruptor JUIZ_DA_FOLHA_2411: 'internal' = só a lista EXATA da casa; cliente e 'off' = nada roda (nenhuma chamada, nenhum campo, byte a byte).
import { contaDaCasaExata } from '@/lib/internalAccounts'
import { STILL_CRITIC_MODELO, custoDoCriticoUsd } from '@/lib/cinematic/criticoStill'
import type { FilmQualitySnapshot } from '@/lib/filmComplete/qualityInheritance'
import { descricaoDoAutor } from '@/lib/cinematic/referenciaUnica2411'
import { ESPECIES_DA_FOLHA, PERSONAGEM_FOLHA_USD, PESSOAS_DA_FOLHA } from '@/lib/cinematic/folhaDePersonagem'
// KINEO-FORMA-DA-FOLHA-2511 [CEO 25/11, Bolt addef2b6: o conferente APROVOU um robô laranja com cabeça de cachorro — tracos ok, descartados 1] — H2: o
// conferente só perguntava pelo que o autor escreveu; o que a folha tem A MAIS ninguém perguntava. Agora, quando a descrição do AUTOR nomeia UM ser só
// ("robot"; gente = "person"), o modelo responde duas perguntas fechadas de FORMA: o corpo e a cabeça são daquele ser? há parte de OUTRO ser? O código
// decide: 'no' na 1ª = 'nao_e'; 'yes' na 2ª = 'outra_especie'; 'unclear' não reprova. Híbrido que o autor pediu ("a robot dog", "a cat-like robot",
// "half man"), descrição com dois seres, com negação ou sem ser escrito = não julga ('nao_julgada'). Reprovou: a folha nova pede o corpo e a cabeça do ser.
// Interruptor FORMA_DA_FOLHA_2511: 'off' = byte a byte o de antes (nada perguntado, nada decidido).
// [revisora 24/11, VOLTA, docs/revisoes-2311/CEO-JUIZ-DA-FOLHA-2411.md §11] v3: (1) só conta, e só vai à folha nova, o traço do modelo que EXISTE palavra por palavra na
// descrição do autor e não é negação; o resto é descartado e contado; (2) sem descrição do AUTOR (Slocum; o Elias do cedd1250: a canônica é biografia/ação),
// o eixo traços não julga — só um personagem e o meio; (3) folha sem personagem reprova ('nenhum'); (4) o custo grava a folha nova e o relato grava a 1ª leitura;
// (5) o ensaio do personagem fixo não roda o juiz (rota).

export const JUIZ_DA_FOLHA_2411_VERSAO = 'KINEO-JUIZ-DA-FOLHA-2411'
export type ModoJuizDaFolha2411 = 'off' | 'internal' | 'public'
export const JUIZ_DA_FOLHA_2411: ModoJuizDaFolha2411 = 'internal'
export const juizDaFolhaLigado = (modo: ModoJuizDaFolha2411, email: string | null | undefined): boolean =>
  modo === 'public' || (modo === 'internal' && contaDaCasaExata(email))
export const JUIZ_DA_FOLHA_TIMEOUT_MS = 8_000

export type MeioDaFolha = 'photo_or_realistic_render' | 'cartoon_3d' | 'cartoon_2d' | 'other'
export type CategoriaDoTraco = 'species' | 'shape' | 'size' | 'color' | 'feature' | 'clothing'
export type LeituraDaFolha = { meio: MeioDaFolha; personagens: number; tracos: Array<{ traco: string; categoria: CategoriaDoTraco; visivel: 'yes' | 'no' | 'unclear' }>
  forma?: { corpo: 'yes' | 'no' | 'unclear'; outra: 'yes' | 'no' | 'unclear' } | null /* KINEO-FORMA-DA-FOLHA-2511 */ }
export type MotivoDosTracos = 'mais_de_um' | 'nenhum' | 'forma_especie' | 'traco'
/** O veredito POR EIXO: traços do autor e meio do filme. */
export type FormaDaFolha = 'ok' | 'nao_e' | 'outra_especie' | 'nao_julgada'
export type VereditoDaFolha = { tracos: 'ok' | MotivoDosTracos; meio: 'ok' | 'meio'; ausentes: string[]; descartados: number; forma: FormaDaFolha; especie: string | null }
export const formaPassa = (v: Pick<VereditoDaFolha, 'forma'>): boolean => v.forma === 'ok' || v.forma === 'nao_julgada'
export const folhaPassa = (v: VereditoDaFolha): boolean => v.tracos === 'ok' && v.meio === 'ok' && formaPassa(v)
export type ModoFormaDaFolha2511 = 'off' | 'on'
export const FORMA_DA_FOLHA_2511: ModoFormaDaFolha2511 = 'on'
const SER_RE = new RegExp(`(?<![\\p{L}\\p{N}])(${ESPECIES_DA_FOLHA.animais}|${ESPECIES_DA_FOLHA.criaturas})(?:s|es)?(?![\\p{L}\\p{N}])`, 'giu')
const GENTE_RE = new RegExp(`(?<![\\p{L}\\p{N}])(?:${PESSOAS_DA_FOLHA})(?:s|es)?(?![\\p{L}\\p{N}])`, 'iu')
const HIBRIDO_RE = /(?<![\p{L}\p{N}])(?:like|half|part|hybrid|mixed|mix|cross|crossbreed)(?![\p{L}\p{N}])/iu // "cat-like", "half man", "part dragon"
/** O ÚNICO ser que a descrição do autor nomeia ("robot"; gente = "person"), ou null: sem descrição, com negação, híbrido, dois seres, nenhum ser. */
export function especieDaDescricao(descricao: string, modo: ModoFormaDaFolha2511 = FORMA_DA_FOLHA_2511): string | null {
  const d = String(descricao ?? '')
  if (modo !== 'on' || !d.trim() || temNegacao(d) || HIBRIDO_RE.test(d)) return null
  const seres = new Set(Array.from(d.matchAll(SER_RE), (m) => m[1].toLowerCase()))
  if (GENTE_RE.test(d)) seres.add('person')
  return seres.size === 1 ? [...seres][0] : null
}

const MEIOS: readonly MeioDaFolha[] = ['photo_or_realistic_render', 'cartoon_3d', 'cartoon_2d', 'other']
const CATEGORIAS: readonly CategoriaDoTraco[] = ['species', 'shape', 'size', 'color', 'feature', 'clothing']
const limpa = (s: unknown) => String(s ?? '').replace(/\s+/g, ' ').trim()

/** O que o AUTOR escreveu do personagem (o mesmo leitor da referência única, descricaoDoAutor: o trecho entre aspas de "exactly as the author wrote:" e o de
 *  "as the request describes:"). Nada disso = '' = o eixo traços não julga (a canônica sem aspas é biografia/ação, não aparência: Slocum, Elias). */
export function descricaoParaOJuiz(ficha: { nome: string; canonica: string }): string {
  return limpa(descricaoDoAutor(ficha.canonica) ?? '')
}
// [CEO 25/11 01:42, docs/semana-2/DECISAO-CONFERENTE-NEGACAO-2511.md] volta 5, regra ÚNICA: se a descrição do autor tem QUALQUER negação, nenhum traço
// daquela ficha é julgado (nada vai a "clearly visible"); meio e contagem seguem julgados. Sem negação, o traço conta se aparece palavra por palavra.
// Substitui a leitura de alcance por oração e vírgula das voltas 3 e 4: cada frase nova abria um furo ("without ears, a tail, and an antenna").
const NEGACOES = new Set(['no', 'not', 'without', 'never', 'non', 'nor', 'none', 'neither', 'nothing', 'sans', 'missing', 'lacking', 'lacks', 'lack',
  'dont', 'doesnt', 'isnt', 'arent', 'wasnt', 'werent', 'cant', 'cannot', 'wont', 'didnt', 'hasnt', 'havent',
  'sem', 'não', 'nao', 'nem', 'nunca', 'jamais', 'nenhum', 'nenhuma',
  'sin', 'ni', 'jamás', 'ningún', 'ninguno', 'ninguna'])
const VAZIAS = new Set(['a', 'an', 'the', 'with', 'and', 'or', 'of', 'in', 'on', 'at', 'to', 'by', 'for', 'his', 'her', 'its', 'their', 'is', 'are'])
const minusculo = (s: unknown) => String(s ?? '').toLowerCase().replace(/’/g, "'")
const palavras = (s: unknown): string[] => Array.from(minusculo(s).matchAll(/[\p{L}\p{N}]+(?:'[\p{L}]+)*/gu), (m) => m[0])
/** Há negação no texto: uma palavra da lista, "n't" (doesn't), "free of" ou "-free" (beard-free). */
export function temNegacao(texto: string): boolean {
  const ws = palavras(texto)
  return ws.some((w, i) => NEGACOES.has(w) || /n't$/.test(w) || (w === 'free' && ws[i + 1] === 'of')) || /[\p{L}\p{N}]-free(?![\p{L}\p{N}])/u.test(minusculo(texto))
}
/** O traço do modelo é do AUTOR: a descrição do autor não tem negação nenhuma, e as palavras do traço existem nela, em sequência (então o traço
 *  também não tem negação); o traço não é só palavra vazia ("with"). */
export function tracoDoAutor(traco: string, descricao: string): boolean {
  const k = palavras(traco), autor = palavras(descricao)
  if (k.length === 0 || k.every((w) => VAZIAS.has(w)) || temNegacao(descricao)) return false
  for (let i = 0; i + k.length <= autor.length; i++) if (k.every((w, j) => autor[i + j] === w)) return true
  return false
}

/** O pedido ao modelo: só observação, em JSON. Nenhum exemplo; nenhuma ordem de reprovar. */
export function pedidoAoJuizDaFolha(descricao: string, url: string, especie: string | null = null /* KINEO-FORMA-DA-FOLHA-2511 */): { messages: unknown[]; imagens: number; caracteres: number } {
  const sistema = 'You describe one character reference image. Answer only with JSON: {"medium": one of ' + MEIOS.map((m) => `"${m}"`).join(', ') +
    ', "characters": number of distinct characters drawn, "traits": [{"trait": string, "category": one of ' + CATEGORIAS.map((c) => `"${c}"`).join(', ') +
    ', "visible": "yes" | "no" | "unclear"}]}. For "traits", split the author description into its separate traits (each kind of being, body shape, size, colour, named feature and garment), copy each trait in the author\'s own words, and say whether the image shows it.' +
    (especie ? ` Also answer "kind_check": {"body_and_head_match": "yes" | "no" | "unclear", "other_kind_parts": "yes" | "no" | "unclear"}. "body_and_head_match" says whether the character's body and head are those of a ${especie}. "other_kind_parts" says whether the character's own body (not clothing, not objects) has any part that belongs to a kind of being other than a ${especie}.` : '') // KINEO-FORMA-DA-FOLHA-2511
  const texto = `Author description of the character: ${descricao || '(none)'}`
  return { messages: [{ role: 'system', content: sistema }, { role: 'user', content: [{ type: 'text', text: texto }, { type: 'image_url', image_url: { url, detail: 'low' } }] }], imagens: 1, caracteres: sistema.length + texto.length }
}

/** A resposta do modelo, conferida campo a campo. Fora do formato = null (leitura falhou). */
export function lerLeituraDaFolha(raw: string, exigeForma = false /* KINEO-FORMA-DA-FOLHA-2511: perguntada e fora do formato = leitura falhou */): LeituraDaFolha | null {
  let o: Record<string, unknown>
  try { o = JSON.parse(raw) } catch { return null }
  if (!o || typeof o !== 'object') return null
  const meio = MEIOS.includes(o.medium as MeioDaFolha) ? (o.medium as MeioDaFolha) : null
  const personagens = typeof o.characters === 'number' && Number.isInteger(o.characters) && o.characters >= 0 ? o.characters : null
  if (!meio || personagens === null || !Array.isArray(o.traits)) return null
  const tracos = (o.traits as unknown[]).flatMap((t) => {
    const r = t && typeof t === 'object' ? (t as Record<string, unknown>) : null
    const categoria = CATEGORIAS.includes(r?.category as CategoriaDoTraco) ? (r!.category as CategoriaDoTraco) : null
    const visivel: LeituraDaFolha['tracos'][number]['visivel'] | null = r?.visible === 'yes' || r?.visible === 'no' || r?.visible === 'unclear' ? r.visible : null
    return r && categoria && visivel && limpa(r.trait) ? [{ traco: limpa(r.trait).slice(0, 80), categoria, visivel }] : []
  })
  const k = o.kind_check && typeof o.kind_check === 'object' ? (o.kind_check as Record<string, unknown>) : null
  const sn = (x: unknown): 'yes' | 'no' | 'unclear' | null => (x === 'yes' || x === 'no' || x === 'unclear' ? x : null)
  const forma = k && sn(k.body_and_head_match) && sn(k.other_kind_parts) ? { corpo: sn(k.body_and_head_match)!, outra: sn(k.other_kind_parts)! } : null
  if (exigeForma && !forma) return null
  return exigeForma ? { meio, personagens, tracos, forma } : { meio, personagens, tracos }
}

/** A regra, no código, POR EIXO. Traços: contagem > espécie/forma/tamanho > outros traços. Meio: cartum em filme fotorreal, foto em filme desenhado. */
export function decidirDaFolha(l: LeituraDaFolha, filmeFotorreal: boolean, descricao: string = ''): VereditoDaFolha {
  const doAutor = l.tracos.filter((t) => tracoDoAutor(t.traco, descricao)) // sem descrição do autor = nenhum traço conta
  const ausentes = (cats: readonly CategoriaDoTraco[]) => doAutor.filter((t) => t.visivel === 'no' && cats.includes(t.categoria)).map((t) => t.traco)
  const forma = ausentes(['species', 'shape', 'size']), outros = ausentes(['color', 'feature', 'clothing'])
  const tracos: VereditoDaFolha['tracos'] = l.personagens > 1 ? 'mais_de_um' : l.personagens < 1 ? 'nenhum' : forma.length ? 'forma_especie' : outros.length ? 'traco' : 'ok'
  const cartum = l.meio === 'cartoon_3d' || l.meio === 'cartoon_2d'
  const meio: VereditoDaFolha['meio'] = (filmeFotorreal ? cartum : l.meio === 'photo_or_realistic_render') ? 'meio' : 'ok'
  const especie = especieDaDescricao(descricao) // KINEO-FORMA-DA-FOLHA-2511
  const formaV: FormaDaFolha = !especie || !l.forma ? 'nao_julgada' : l.forma.corpo === 'no' ? 'nao_e' : l.forma.outra === 'yes' ? 'outra_especie' : 'ok'
  return { tracos, meio, ausentes: tracos === 'forma_especie' ? forma : tracos === 'traco' ? outros : [], descartados: l.tracos.length - doAutor.length, forma: formaV, especie }
}

/** A instrução da folha nova: POSITIVA (o motor desenha o que é nomeado), os traços que faltaram com as palavras do autor, e o meio do filme. */
export function instrucaoDaFolhaNova(v: VereditoDaFolha, lookPhrase: string): string {
  if (folhaPassa(v)) return ''
  const um = v.tracos === 'mais_de_um' || v.tracos === 'nenhum' ? ' Exactly one character alone in the frame.' : ''
  const tracos = v.ausentes.length ? ` Exactly as the author wrote, clearly visible: ${v.ausentes.join('; ')}.` : ''
  const ser = !formaPassa(v) && v.especie ? ` Its body and head are entirely those of ${/^[aeiou]/.test(v.especie) ? 'an' : 'a'} ${v.especie}.` : '' // KINEO-FORMA-DA-FOLHA-2511
  return `${um}${ser}${tracos} Rendered in ${limpa(lookPhrase) || 'the film\'s own look'}.`
}

export type ChamadaDaFolha = { leitura: LeituraDaFolha | null; custoUsd: number; erro: string | null }
/** Uma leitura (rede). Nunca lança. Sem chave, prazo ou JSON torto = leitura null. */
export async function lerAFolha(descricao: string, url: string, opts: { timeoutMs?: number; fetchImpl?: typeof fetch; apiKey?: string } = {}): Promise<ChamadaDaFolha> {
  const key = opts.apiKey ?? (typeof process !== 'undefined' ? process.env.OPENAI_API_KEY : undefined)
  if (!key) return { leitura: null, custoUsd: 0, erro: 'sem_chave' }
  const especie = especieDaDescricao(descricao) // KINEO-FORMA-DA-FOLHA-2511
  const { messages, imagens, caracteres } = pedidoAoJuizDaFolha(descricao, url, especie)
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), Math.max(1, opts.timeoutMs ?? JUIZ_DA_FOLHA_TIMEOUT_MS))
  try {
    const res = await (opts.fetchImpl ?? fetch)('https://api.openai.com/v1/chat/completions', { method: 'POST', signal: ctrl.signal, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({ model: STILL_CRITIC_MODELO, temperature: 0, max_tokens: 400, response_format: { type: 'json_object' }, messages }) })
    if (!res.ok) return { leitura: null, custoUsd: 0, erro: `http_${res.status}` }
    const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }>; usage?: { prompt_tokens?: number; completion_tokens?: number } }
    const leitura = lerLeituraDaFolha(data.choices?.[0]?.message?.content ?? '', especie !== null)
    return { leitura, custoUsd: custoDoCriticoUsd(data.usage, imagens, caracteres), erro: leitura ? null : 'resposta_ilegivel' }
  } catch {
    return { leitura: null, custoUsd: custoDoCriticoUsd(null, imagens, caracteres), erro: ctrl.signal.aborted ? 'timeout' : 'fetch' }
  } finally { clearTimeout(timer) }
}

/** Para o claim: só código e número. `tentativa` = a folha que serviu (1 = a de hoje, 2 = a nova; null = nenhuma serviu). */
export type RelatoDaFolha = { tipo: 'humano' | 'animal' | 'criatura' | null; tracos: 'ok' | MotivoDosTracos | 'sem_leitura'; meio: 'ok' | 'meio' | 'meio_tolerado' | 'sem_leitura'
  serve: boolean; tentativa: 1 | 2 | null; regerou: boolean; custo_usd: number
  tracos_1: 'ok' | MotivoDosTracos | 'sem_leitura'; meio_1: 'ok' | 'meio' | 'sem_leitura'; descartados: number /* [revisora, v3] a 1ª leitura e os traços do modelo que não eram do autor */
  tracos_nao_julgados: 'negacao' | null /* [CEO, volta 5] a descrição do autor tem negação: nenhum traço julgado (só meio e contagem) */
  forma: FormaDaFolha | 'sem_leitura'; forma_1: FormaDaFolha | 'sem_leitura' /* KINEO-FORMA-DA-FOLHA-2511 */ }
/** O juiz inteiro para UMA folha: lê; reprovou → UMA folha nova com a instrução → lê de novo; a tolerância do meio só na 2ª e só para bicho e criatura
 *  em filme fotorreal. Devolve a URL que serve (a nova, se foi ela) ou null. */
export async function julgarAFolha(args: { ficha: { nome: string; canonica: string; tipo?: unknown }; url: string; filmeFotorreal: boolean; lookPhrase: string },
  deps: { ler: (descricao: string, url: string) => Promise<ChamadaDaFolha>; gerar: (instrucao: string) => Promise<string | null> }): Promise<{ url: string | null; nome: string; relato: RelatoDaFolha }> {
  const descricao = descricaoParaOJuiz(args.ficha)
  const tipo: RelatoDaFolha['tipo'] = args.ficha.tipo === 'humano' || args.ficha.tipo === 'animal' || args.ficha.tipo === 'criatura' ? args.ficha.tipo : null
  let custo = 0, descartados = 0, v1: VereditoDaFolha | null = null
  const fim = (url: string | null, v: VereditoDaFolha | null, meio: RelatoDaFolha['meio'] | null, tentativa: 1 | 2 | null, regerou: boolean) =>
    ({ url, nome: args.ficha.nome, relato: { tipo, tracos: v ? v.tracos : 'sem_leitura' as const, meio: meio ?? (v ? v.meio : 'sem_leitura' as const), serve: url !== null, tentativa, regerou, custo_usd: Math.round(custo * 1e6) / 1e6,
      tracos_1: v1 ? v1.tracos : 'sem_leitura' as const, meio_1: v1 ? v1.meio : 'sem_leitura' as const, descartados,
      tracos_nao_julgados: temNegacao(descricao) ? 'negacao' as const : null, forma: v ? v.forma : 'sem_leitura' as const, forma_1: v1 ? v1.forma : 'sem_leitura' as const } })
  const r1 = await deps.ler(descricao, args.url)
  custo += r1.custoUsd
  if (!r1.leitura) return fim(null, null, null, null, false) // não julgada = não serve (é o furo que o juiz fecha)
  v1 = decidirDaFolha(r1.leitura, args.filmeFotorreal, descricao)
  descartados += v1.descartados
  if (folhaPassa(v1)) return fim(args.url, v1, null, 1, false)
  custo += PERSONAGEM_FOLHA_USD // a folha nova (FLUX) é paga quando pedida, saia ou não
  const nova = await deps.gerar(instrucaoDaFolhaNova(v1, args.lookPhrase)).catch(() => null)
  if (!nova || !/^https:\/\/[^\s]+$/i.test(nova)) return fim(null, v1, null, null, false)
  const r2 = await deps.ler(descricao, nova)
  custo += r2.custoUsd
  if (!r2.leitura) return fim(null, null, null, null, true)
  const v2 = decidirDaFolha(r2.leitura, args.filmeFotorreal, descricao)
  descartados += v2.descartados
  if (folhaPassa(v2)) return fim(nova, v2, null, 2, true)
  // a tolerância: traços certos, só o meio errado, bicho ou criatura, filme fotorreal (folha de animação num filme de foto). Humano e filme desenhado: nunca.
  if (v2.tracos === 'ok' && formaPassa(v2) /* KINEO-FORMA-DA-FOLHA-2511 */ && v2.meio === 'meio' && args.filmeFotorreal && (tipo === 'animal' || tipo === 'criatura')) return fim(nova, v2, 'meio_tolerado', 2, true)
  return fim(null, v2, null, null, true)
}

/** O retrato que a ADMISSÃO lê, sem as folhas que o juiz reprovou (nem as imagens-chave que as levam): a referência delas não sai. Nada reprovado =
 *  o MESMO objeto. Só a admissão lê isto: o retrato do filme, a herança e o claim não mudam. */
export function retratoSemFolhaReprovada2411(snapshot: FilmQualitySnapshot | null, reprovadas: ReadonlySet<string> | null | undefined): FilmQualitySnapshot | null {
  if (!snapshot || !reprovadas || reprovadas.size === 0 || !Array.isArray(snapshot.characterReferences) || !Array.isArray(snapshot.approvedStills)) return snapshot
  return { ...snapshot, characterReferences: snapshot.characterReferences.filter((r) => !reprovadas.has(r?.nome)),
    approvedStills: snapshot.approvedStills.filter((s) => !(Array.isArray(s?.characterNames) && s.characterNames.some((n) => reprovadas.has(n)))) }
}
