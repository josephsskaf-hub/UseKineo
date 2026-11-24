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

export const JUIZ_DA_FOLHA_2411_VERSAO = 'KINEO-JUIZ-DA-FOLHA-2411'
export type ModoJuizDaFolha2411 = 'off' | 'internal' | 'public'
export const JUIZ_DA_FOLHA_2411: ModoJuizDaFolha2411 = 'internal'
export const juizDaFolhaLigado = (modo: ModoJuizDaFolha2411, email: string | null | undefined): boolean =>
  modo === 'public' || (modo === 'internal' && contaDaCasaExata(email))
export const JUIZ_DA_FOLHA_TIMEOUT_MS = 8_000

export type MeioDaFolha = 'photo_or_realistic_render' | 'cartoon_3d' | 'cartoon_2d' | 'other'
export type CategoriaDoTraco = 'species' | 'shape' | 'size' | 'color' | 'feature' | 'clothing'
export type LeituraDaFolha = { meio: MeioDaFolha; personagens: number; tracos: Array<{ traco: string; categoria: CategoriaDoTraco; visivel: 'yes' | 'no' | 'unclear' }> }
export type MotivoDosTracos = 'mais_de_um' | 'forma_especie' | 'traco'
/** O veredito POR EIXO: traços do autor e meio do filme. */
export type VereditoDaFolha = { tracos: 'ok' | MotivoDosTracos; meio: 'ok' | 'meio'; ausentes: string[] }
export const folhaPassa = (v: VereditoDaFolha): boolean => v.tracos === 'ok' && v.meio === 'ok'

const MEIOS: readonly MeioDaFolha[] = ['photo_or_realistic_render', 'cartoon_3d', 'cartoon_2d', 'other']
const CATEGORIAS: readonly CategoriaDoTraco[] = ['species', 'shape', 'size', 'color', 'feature', 'clothing']
const limpa = (s: unknown) => String(s ?? '').replace(/\s+/g, ' ').trim()

/** O que o AUTOR escreveu do personagem: o trecho entre aspas de "exactly as the author wrote:"; senão a canônica sem o nome, sem âncoras e sem a linha
 *  de estilo (texto NOSSO). Vazio = nada a conferir além do meio e da contagem. */
export function descricaoParaOJuiz(ficha: { nome: string; canonica: string }): string {
  const c = limpa(ficha.canonica)
  const autor = /exactly as the author wrote:\s*"([^"]+)"/u.exec(c)?.[1]
  if (autor && limpa(autor)) return limpa(autor)
  const semNome = c.replace(new RegExp(`^${ficha.nome.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')},\\s*`, 'iu'), '')
  return limpa(semNome.split(';')[0].replace(/\bexactly as the author wrote\b/giu, ''))
}

/** O pedido ao modelo: só observação, em JSON. Nenhum exemplo; nenhuma ordem de reprovar. */
export function pedidoAoJuizDaFolha(descricao: string, url: string): { messages: unknown[]; imagens: number; caracteres: number } {
  const sistema = 'You describe one character reference image. Answer only with JSON: {"medium": one of ' + MEIOS.map((m) => `"${m}"`).join(', ') +
    ', "characters": number of distinct characters drawn, "traits": [{"trait": string, "category": one of ' + CATEGORIAS.map((c) => `"${c}"`).join(', ') +
    ', "visible": "yes" | "no" | "unclear"}]}. For "traits", split the author description into its separate traits (each kind of being, body shape, size, colour, named feature and garment), copy each trait in the author\'s own words, and say whether the image shows it.'
  const texto = `Author description of the character: ${descricao || '(none)'}`
  return { messages: [{ role: 'system', content: sistema }, { role: 'user', content: [{ type: 'text', text: texto }, { type: 'image_url', image_url: { url, detail: 'low' } }] }], imagens: 1, caracteres: sistema.length + texto.length }
}

/** A resposta do modelo, conferida campo a campo. Fora do formato = null (leitura falhou). */
export function lerLeituraDaFolha(raw: string): LeituraDaFolha | null {
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
  return { meio, personagens, tracos }
}

/** A regra, no código, POR EIXO. Traços: contagem > espécie/forma/tamanho > outros traços. Meio: cartum em filme fotorreal, foto em filme desenhado. */
export function decidirDaFolha(l: LeituraDaFolha, filmeFotorreal: boolean): VereditoDaFolha {
  const ausentes = (cats: readonly CategoriaDoTraco[]) => l.tracos.filter((t) => t.visivel === 'no' && cats.includes(t.categoria)).map((t) => t.traco)
  const forma = ausentes(['species', 'shape', 'size']), outros = ausentes(['color', 'feature', 'clothing'])
  const tracos: VereditoDaFolha['tracos'] = l.personagens > 1 ? 'mais_de_um' : forma.length ? 'forma_especie' : outros.length ? 'traco' : 'ok'
  const cartum = l.meio === 'cartoon_3d' || l.meio === 'cartoon_2d'
  const meio: VereditoDaFolha['meio'] = (filmeFotorreal ? cartum : l.meio === 'photo_or_realistic_render') ? 'meio' : 'ok'
  return { tracos, meio, ausentes: tracos === 'forma_especie' ? forma : tracos === 'traco' ? outros : [] }
}

/** A instrução da folha nova: POSITIVA (o motor desenha o que é nomeado), os traços que faltaram com as palavras do autor, e o meio do filme. */
export function instrucaoDaFolhaNova(v: VereditoDaFolha, lookPhrase: string): string {
  if (folhaPassa(v)) return ''
  const um = v.tracos === 'mais_de_um' ? ' Exactly one character alone in the frame.' : ''
  const tracos = v.ausentes.length ? ` Exactly as the author wrote, clearly visible: ${v.ausentes.join('; ')}.` : ''
  return `${um}${tracos} Rendered in ${limpa(lookPhrase) || 'the film\'s own look'}.`
}

export type ChamadaDaFolha = { leitura: LeituraDaFolha | null; custoUsd: number; erro: string | null }
/** Uma leitura (rede). Nunca lança. Sem chave, prazo ou JSON torto = leitura null. */
export async function lerAFolha(descricao: string, url: string, opts: { timeoutMs?: number; fetchImpl?: typeof fetch; apiKey?: string } = {}): Promise<ChamadaDaFolha> {
  const key = opts.apiKey ?? (typeof process !== 'undefined' ? process.env.OPENAI_API_KEY : undefined)
  if (!key) return { leitura: null, custoUsd: 0, erro: 'sem_chave' }
  const { messages, imagens, caracteres } = pedidoAoJuizDaFolha(descricao, url)
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), Math.max(1, opts.timeoutMs ?? JUIZ_DA_FOLHA_TIMEOUT_MS))
  try {
    const res = await (opts.fetchImpl ?? fetch)('https://api.openai.com/v1/chat/completions', { method: 'POST', signal: ctrl.signal, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({ model: STILL_CRITIC_MODELO, temperature: 0, max_tokens: 400, response_format: { type: 'json_object' }, messages }) })
    if (!res.ok) return { leitura: null, custoUsd: 0, erro: `http_${res.status}` }
    const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }>; usage?: { prompt_tokens?: number; completion_tokens?: number } }
    const leitura = lerLeituraDaFolha(data.choices?.[0]?.message?.content ?? '')
    return { leitura, custoUsd: custoDoCriticoUsd(data.usage, imagens, caracteres), erro: leitura ? null : 'resposta_ilegivel' }
  } catch {
    return { leitura: null, custoUsd: custoDoCriticoUsd(null, imagens, caracteres), erro: ctrl.signal.aborted ? 'timeout' : 'fetch' }
  } finally { clearTimeout(timer) }
}

/** Para o claim: só código e número. `tentativa` = a folha que serviu (1 = a de hoje, 2 = a nova; null = nenhuma serviu). */
export type RelatoDaFolha = { tipo: 'humano' | 'animal' | 'criatura' | null; tracos: 'ok' | MotivoDosTracos | 'sem_leitura'; meio: 'ok' | 'meio' | 'meio_tolerado' | 'sem_leitura'
  serve: boolean; tentativa: 1 | 2 | null; regerou: boolean; custo_usd: number }
/** O juiz inteiro para UMA folha: lê; reprovou → UMA folha nova com a instrução → lê de novo; a tolerância do meio só na 2ª e só para bicho e criatura
 *  em filme fotorreal. Devolve a URL que serve (a nova, se foi ela) ou null. */
export async function julgarAFolha(args: { ficha: { nome: string; canonica: string; tipo?: unknown }; url: string; filmeFotorreal: boolean; lookPhrase: string },
  deps: { ler: (descricao: string, url: string) => Promise<ChamadaDaFolha>; gerar: (instrucao: string) => Promise<string | null> }): Promise<{ url: string | null; nome: string; relato: RelatoDaFolha }> {
  const descricao = descricaoParaOJuiz(args.ficha)
  const tipo: RelatoDaFolha['tipo'] = args.ficha.tipo === 'humano' || args.ficha.tipo === 'animal' || args.ficha.tipo === 'criatura' ? args.ficha.tipo : null
  let custo = 0
  const fim = (url: string | null, v: VereditoDaFolha | null, meio: RelatoDaFolha['meio'] | null, tentativa: 1 | 2 | null, regerou: boolean) =>
    ({ url, nome: args.ficha.nome, relato: { tipo, tracos: v ? v.tracos : 'sem_leitura' as const, meio: meio ?? (v ? v.meio : 'sem_leitura' as const), serve: url !== null, tentativa, regerou, custo_usd: Math.round(custo * 1e6) / 1e6 } })
  const r1 = await deps.ler(descricao, args.url)
  custo += r1.custoUsd
  if (!r1.leitura) return fim(null, null, null, null, false) // não julgada = não serve (é o furo que o juiz fecha)
  const v1 = decidirDaFolha(r1.leitura, args.filmeFotorreal)
  if (folhaPassa(v1)) return fim(args.url, v1, null, 1, false)
  const nova = await deps.gerar(instrucaoDaFolhaNova(v1, args.lookPhrase)).catch(() => null)
  if (!nova || !/^https:\/\/[^\s]+$/i.test(nova)) return fim(null, v1, null, null, false)
  const r2 = await deps.ler(descricao, nova)
  custo += r2.custoUsd
  if (!r2.leitura) return fim(null, null, null, null, true)
  const v2 = decidirDaFolha(r2.leitura, args.filmeFotorreal)
  if (folhaPassa(v2)) return fim(nova, v2, null, 2, true)
  // a tolerância: traços certos, só o meio errado, bicho ou criatura, filme fotorreal (folha de animação num filme de foto). Humano e filme desenhado: nunca.
  if (v2.tracos === 'ok' && v2.meio === 'meio' && args.filmeFotorreal && (tipo === 'animal' || tipo === 'criatura')) return fim(nova, v2, 'meio_tolerado', 2, true)
  return fim(null, v2, null, null, true)
}

/** O retrato que a ADMISSÃO lê, sem as folhas que o juiz reprovou (nem as imagens-chave que as levam): a referência delas não sai. Nada reprovado =
 *  o MESMO objeto. Só a admissão lê isto: o retrato do filme, a herança e o claim não mudam. */
export function retratoSemFolhaReprovada2411(snapshot: FilmQualitySnapshot | null, reprovadas: ReadonlySet<string> | null | undefined): FilmQualitySnapshot | null {
  if (!snapshot || !reprovadas || reprovadas.size === 0 || !Array.isArray(snapshot.characterReferences) || !Array.isArray(snapshot.approvedStills)) return snapshot
  return { ...snapshot, characterReferences: snapshot.characterReferences.filter((r) => !reprovadas.has(r?.nome)),
    approvedStills: snapshot.approvedStills.filter((s) => !(Array.isArray(s?.characterNames) && s.characterNames.some((n) => reprovadas.has(n)))) }
}
