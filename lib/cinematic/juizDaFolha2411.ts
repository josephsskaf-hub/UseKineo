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
// Interruptor FORMA_DA_FOLHA_2511: 'off' = byte a byte o de antes (nada perguntado, nada decidido); 'sonda' = [CEO 25/11, volta 2] só a sonda da casa
// (lib/cinematic/sondaDaFolha2511) pergunta e decide a forma — o filme (casa e cliente) é byte a byte o de antes: pedido, leitura, corpo à OpenAI e
// relato; 'on' = o filme também.
// Volta 3 [CEO 25/11, sonda 04:02: o leitor respondeu "corpo yes, outra no" nas 4 folhas, inclusive nas 2 com cabeça de bicho — 0 de 2]: a pergunta abstrata
// sai. No lugar, perguntas CONCRETAS sobre a cabeça, sem dizer qual ser se espera ("head_check": com que ser a cabeça parece, orelha de bicho, nariz,
// focinho, pelo), e só para os seres em que o código sabe o que é estranho: robô (orelha de bicho, nariz, focinho, pelo, cabeça de bicho = outro ser) e
// gente (orelha de bicho, focinho, cabeça de bicho). Bicho e outras criaturas não são julgados. Brinquedo, fantasia, figura e robô humanoide também não.
// Continua 'sonda' (fora do filme) até a sonda de leitura provar nas 4 folhas que já existem no bucket.
// KINEO-JUIZ-SEM-PROFISSAO-2511 [CEO 25/11, sonda 2: leituras REAIS da ficha CERTA — Mara "radio operator|feature|no" → 'traco'; Elias "lighthouse keeper|
// species|no" → 'forma_especie'; o filme das duas pessoas teria as duas fichas reprovadas]. Conserto ESTRUTURAL, sem lista de profissões: o leitor marca
// cada traço com "appearance" (yes = uma foto de corpo inteiro em fundo de estúdio mostra isso sozinha: corpo, rosto, cabelo, pelo, cor, tamanho, forma,
// roupa, acessório) e tem a categoria própria "role" (profissão, papel, atividade, idade, história). O código só julga traço com appearance "yes" e
// categoria de aparência; "role" nunca; "species" de GENTE nunca vira 'forma_especie' (gente é gente; "lighthouse keeper|species" é profissão). Sem o
// campo, ou "unclear": não julga (lado seguro).
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
export type CategoriaDoTraco = 'species' | 'shape' | 'size' | 'color' | 'feature' | 'clothing' | 'role'
export type LeituraDaFolha = { meio: MeioDaFolha; personagens: number; tracos: Array<{ traco: string; categoria: CategoriaDoTraco; visivel: 'yes' | 'no' | 'unclear'; aparencia: 'yes' | 'no' | 'unclear' }>
  forma?: { parecido: string; orelhas: SimNao; nariz: SimNao; focinho: SimNao; pelo: SimNao } | null /* KINEO-FORMA-DA-FOLHA-2511 volta 3 */ }
export type SimNao = 'yes' | 'no' | 'unclear'
export type MotivoDosTracos = 'mais_de_um' | 'nenhum' | 'forma_especie' | 'traco'
/** O veredito POR EIXO: traços do autor e meio do filme. */
export type FormaDaFolha = 'ok' | 'outra_especie' | 'nao_julgada'
export type VereditoDaFolha = { tracos: 'ok' | MotivoDosTracos; meio: 'ok' | 'meio'; ausentes: string[]; descartados: number; forma: FormaDaFolha; especie: string | null }
export const formaPassa = (v: Pick<VereditoDaFolha, 'forma'>): boolean => v.forma === 'ok' || v.forma === 'nao_julgada'
export const folhaPassa = (v: VereditoDaFolha): boolean => v.tracos === 'ok' && v.meio === 'ok' && formaPassa(v)
// KINEO-FORMA-NOS-FILMES-2511 [CEO 25/11 07:50, sonda 06:07: 7 de 7, e o head_check acertou 4 de 4] 'internal' = a forma vale nos filmes da CASA (a lista
// exata, contaDaCasaExata): o leitor recebe o head_check e a folha lida como 'outra_especie' tem o MESMO tratamento da reprovação do conferente (UMA folha
// nova com o corpo e a cabeça do ser; reprovou de novo ou sem leitura = a admissão não lê aquela folha). Fora da casa, e com 'off' ou 'sonda', o filme é
// byte a byte o de antes (formaNoFilme = 'off'). 'on' = todo filme em que o conferente roda.
export type ModoFormaDaFolha2511 = 'off' | 'sonda' | 'internal' | 'on'
export const FORMA_DA_FOLHA_2511: ModoFormaDaFolha2511 = 'internal'
/** O modo que o FILME usa (a rota): 'on' só para a casa exata com 'internal', ou para todos com 'on'; o resto = 'off' (nada perguntado, nada decidido). */
export const formaNoFilme = (modo: ModoFormaDaFolha2511, email: string | null | undefined): ModoFormaDaFolha2511 =>
  modo === 'on' || (modo === 'internal' && contaDaCasaExata(email)) ? 'on' : 'off'
/** O modo que a SONDA usa: pergunta a forma sempre que o interruptor não está 'off'. */
export const formaNaSonda = (modo: ModoFormaDaFolha2511 = FORMA_DA_FOLHA_2511): ModoFormaDaFolha2511 => (modo === 'off' ? 'off' : 'on')
const SER_RE = new RegExp(`(?<![\\p{L}\\p{N}])(${ESPECIES_DA_FOLHA.animais}|${ESPECIES_DA_FOLHA.criaturas})(?:s|es)?(?![\\p{L}\\p{N}])`, 'giu')
const GENTE_RE = new RegExp(`(?<![\\p{L}\\p{N}])(?:${PESSOAS_DA_FOLHA})(?:s|es)?(?![\\p{L}\\p{N}])`, 'iu')
const HIBRIDO_RE = /(?<![\p{L}\p{N}])(?:like|half|part|hybrid|mixed|mix|cross|crossbreed)(?![\p{L}\p{N}])/iu // "cat-like", "half man", "part dragon"
// [revisora 25/11 §5] brinquedo, figura, fantasia e robô com rosto de gente: o corpo não é "de verdade" daquele ser, ou o rosto é humano por definição
const NAO_JULGA_FORMA_RE = /(?<![\p{L}\p{N}])(?:teddy|plush|toy|stuffed|doll|gingerbread|tin|snowman|snow|statue|figurine|puppet|costume|mask|humanoid|android|cyborg|human)(?![\p{L}\p{N}])/iu
/** Os seres em que o código sabe o que é estranho na cabeça (volta 3): robô e gente. */
const SERES_DA_FORMA = new Set(['robot', 'person'])
/** O ÚNICO ser que a descrição do autor nomeia, quando ele é robô ou gente ("robot", "person"); null: sem descrição, com negação, híbrido, brinquedo ou
 *  figura, dois seres, nenhum ser, ou outro ser (bicho e outras criaturas não são julgados). */
export function especieDaDescricao(descricao: string, modo: ModoFormaDaFolha2511 = FORMA_DA_FOLHA_2511): string | null {
  const d = String(descricao ?? '')
  if (modo !== 'on' || !d.trim() || temNegacao(d) || HIBRIDO_RE.test(d) || NAO_JULGA_FORMA_RE.test(d)) return null
  const seres = new Set(Array.from(d.matchAll(SER_RE), (m) => m[1].toLowerCase()))
  if (GENTE_RE.test(d)) seres.add('person')
  const ser = seres.size === 1 ? [...seres][0] : null
  return ser && SERES_DA_FORMA.has(ser) ? ser : null
}
const BICHO_RE = new RegExp(`^(?:${ESPECIES_DA_FOLHA.animais})(?:s|es)?$`, 'i')
/** A cabeça parece um bicho: alguma palavra do "resembles" é da lista de bichos. */
export const pareceBicho = (parecido: string): boolean => String(parecido ?? '').toLowerCase().split(/[^\p{L}]+/u).some((w) => BICHO_RE.test(w))

const MEIOS: readonly MeioDaFolha[] = ['photo_or_realistic_render', 'cartoon_3d', 'cartoon_2d', 'other']
const CATEGORIAS: readonly CategoriaDoTraco[] = ['species', 'shape', 'size', 'color', 'feature', 'clothing', 'role']
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
  'sin', 'ni', 'jamás', 'ningún', 'ninguno', 'ninguna',
  // KINEO-FORMA-NOS-FILMES-2511 (3) [revisora, volta 5 §2]: troca, exceção, contagem zero e ausência. "menos" e "salvo" sozinhos ficam de fora ("menos de
  // 30 anos", "salvo" de salva-vidas); "rather" sozinho também ("a rather tall man"): entram só nas locuções abaixo. "0" também fica de fora: nos 264 pedidos
  // reais de cliente dos últimos 30 dias, os 30 com "0" sozinho eram marcação de tempo ("hook (0-2s)", "0:00"), nenhum "with 0 whiskers" (docs/semana-2/NEGACAO-NO-CORPUS-2511.md).
  'instead', 'except', 'exceto', 'excepto', 'tampouco', 'tampoco', 'zero', 'minus', 'devoid'])
/** Locuções de negação: a palavra e a que vem logo depois ("rather than", "em vez", "menos o", "w/o" = "w" + "o"). */
const PARES_DE_NEGACAO = new Map<string, ReadonlySet<string>>([['free', new Set(['from'])], ['rather', new Set(['than'])], ['anything', new Set(['but'])],
  ['em', new Set(['vez', 'lugar'])], ['ao', new Set(['invés', 'inves'])], ['en', new Set(['vez', 'lugar'])], ['nada', new Set(['de'])],
  ['menos', new Set(['o', 'a', 'os', 'as'])], ['w', new Set(['o'])]])
const VAZIAS = new Set(['a', 'an', 'the', 'with', 'and', 'or', 'of', 'in', 'on', 'at', 'to', 'by', 'for', 'his', 'her', 'its', 'their', 'is', 'are'])
const minusculo = (s: unknown) => String(s ?? '').toLowerCase().replace(/’/g, "'")
const palavras = (s: unknown): string[] => Array.from(minusculo(s).matchAll(/[\p{L}\p{N}]+(?:'[\p{L}]+)*/gu), (m) => m[0])
/** Há negação no texto: uma palavra da lista, "n't" (doesn't), "free of" ou "-free" (beard-free). */
export function temNegacao(texto: string): boolean {
  const ws = palavras(texto)
  return ws.some((w, i) => NEGACOES.has(w) || /n't$/.test(w) || (w === 'free' && ws[i + 1] === 'of') || PARES_DE_NEGACAO.get(w)?.has(ws[i + 1]) === true) || /[\p{L}\p{N}]-free(?![\p{L}\p{N}])/u.test(minusculo(texto))
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
    ', "appearance": "yes" | "no", "visible": "yes" | "no" | "unclear"}]}. For "traits", split the author description into its separate traits (each kind of being, body shape, size, colour, named feature, garment, and each job, occupation, role, activity or age), copy each trait in the author\'s own words, and say whether the image shows it. "role" is the category of a job, occupation, role, activity, age or story detail. "appearance" says whether one full-body picture of the character alone on a plain studio background can show the trait by itself: body, face, hair, fur, colour, size, shape, clothing or an accessory.' + // KINEO-JUIZ-SEM-PROFISSAO-2511
    (especie ? ' Also answer "head_check": {"resembles": string, "animal_ears": "yes" | "no" | "unclear", "nose": "yes" | "no" | "unclear", "snout_or_muzzle": "yes" | "no" | "unclear", "fur": "yes" | "no" | "unclear"}, about the character\'s own head and body only, never clothing, headwear, accessories or objects: "resembles" is the one kind of being the head looks most like, in one word; "animal_ears" says whether the head has ears shaped like an animal\'s; "nose" says whether the face has a nose; "snout_or_muzzle" says whether the face sticks out into a snout or muzzle; "fur" says whether the head or body is covered in fur.' : '') // KINEO-FORMA-DA-FOLHA-2511 volta 3: o ser esperado NÃO vai no pedido
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
    const aparencia: LeituraDaFolha['tracos'][number]['aparencia'] = r?.appearance === 'yes' || r?.appearance === 'no' ? r.appearance : 'unclear' // sem o campo = não julga
    return r && categoria && visivel && limpa(r.trait) ? [{ traco: limpa(r.trait).slice(0, 80), categoria, visivel, aparencia }] : []
  })
  const k = o.head_check && typeof o.head_check === 'object' ? (o.head_check as Record<string, unknown>) : null
  const sn = (x: unknown): SimNao | null => (x === 'yes' || x === 'no' || x === 'unclear' ? x : null)
  const parecido = k && typeof k.resembles === 'string' && limpa(k.resembles) ? limpa(k.resembles).toLowerCase().slice(0, 40) : null
  const [orelhas, nariz, focinho, pelo] = k ? [sn(k.animal_ears), sn(k.nose), sn(k.snout_or_muzzle), sn(k.fur)] : [null, null, null, null]
  const forma = parecido && orelhas && nariz && focinho && pelo ? { parecido, orelhas, nariz, focinho, pelo } : null
  if (exigeForma && !forma) return null
  return exigeForma ? { meio, personagens, tracos, forma } : { meio, personagens, tracos }
}

type TipoDaFicha = 'humano' | 'animal' | 'criatura' | null
/** KINEO-JUIZ-SEM-PROFISSAO-2511: o traço pode ser julgado — o leitor disse que é aparência, e "species" de gente nunca. */
export const tracoJulgavel = (t: LeituraDaFolha['tracos'][number], tipo: TipoDaFicha): boolean => t.aparencia === 'yes' && !(tipo === 'humano' && t.categoria === 'species')
// KINEO-FORMA-NOS-FILMES-2511 (2) [revisora, volta 5 da ficha §3(d): sem "appearance" o conferente fica cego e o relato sai igual ao de uma folha certa]
export type TracosNaoJulgados = 'negacao' | 'sem_descricao' | 'sem_aparencia' | 'nenhum_julgavel'
/** Por que NENHUM traço do autor foi julgado nesta leitura: 'negacao' (a descrição do autor nega algo; vem só da descrição, como na volta 5 do juiz),
 *  'sem_descricao' (a ficha não tem descrição do autor), 'sem_aparencia' (a leitura veio sem "appearance" julgável em traço nenhum), 'nenhum_julgavel'
 *  (nenhum traço do autor é aparência julgável: só papel, só "no", ou nenhum traço do autor na leitura). null = algum traço foi julgado, ou não houve
 *  leitura (o relato já diz 'sem_leitura'). Só conta: não muda o veredito. */
export function tracosNaoJulgados(l: LeituraDaFolha | null, descricao: string, tipo: TipoDaFicha = null): TracosNaoJulgados | null {
  if (temNegacao(descricao)) return 'negacao'
  if (!l) return null
  if (!limpa(descricao)) return 'sem_descricao'
  if (l.tracos.length > 0 && l.tracos.every((t) => t.aparencia === 'unclear')) return 'sem_aparencia'
  return l.tracos.some((t) => t.categoria !== 'role' && tracoJulgavel(t, tipo) && tracoDoAutor(t.traco, descricao)) ? null : 'nenhum_julgavel'
}

/** A regra, no código, POR EIXO. Traços: contagem > espécie/forma/tamanho > outros traços. Meio: cartum em filme fotorreal, foto em filme desenhado. */
export function decidirDaFolha(l: LeituraDaFolha, filmeFotorreal: boolean, descricao: string = '', modoForma: ModoFormaDaFolha2511 = FORMA_DA_FOLHA_2511, tipo: 'humano' | 'animal' | 'criatura' | null = null): VereditoDaFolha {
  const doAutor = l.tracos.filter((t) => tracoDoAutor(t.traco, descricao)) // sem descrição do autor = nenhum traço conta
  // KINEO-JUIZ-SEM-PROFISSAO-2511: só aparência é julgada; papel/profissão nunca; "species" de gente nunca
  const julgavel = (t: LeituraDaFolha['tracos'][number]) => tracoJulgavel(t, tipo) // "role" não está em nenhuma lista de ausentes abaixo: nunca julga
  const ausentes = (cats: readonly CategoriaDoTraco[]) => doAutor.filter((t) => julgavel(t) && t.visivel === 'no' && cats.includes(t.categoria)).map((t) => t.traco)
  const forma = ausentes(['species', 'shape', 'size']), outros = ausentes(['color', 'feature', 'clothing'])
  const tracos: VereditoDaFolha['tracos'] = l.personagens > 1 ? 'mais_de_um' : l.personagens < 1 ? 'nenhum' : forma.length ? 'forma_especie' : outros.length ? 'traco' : 'ok'
  const cartum = l.meio === 'cartoon_3d' || l.meio === 'cartoon_2d'
  const meio: VereditoDaFolha['meio'] = (filmeFotorreal ? cartum : l.meio === 'photo_or_realistic_render') ? 'meio' : 'ok'
  const especie = especieDaDescricao(descricao, modoForma) // KINEO-FORMA-DA-FOLHA-2511
  const f = l.forma
  const estranha = !!f && (f.orelhas === 'yes' || f.focinho === 'yes' || pareceBicho(f.parecido) || (especie === 'robot' && (f.nariz === 'yes' || f.pelo === 'yes')))
  const formaV: FormaDaFolha = !especie || !f ? 'nao_julgada' : estranha ? 'outra_especie' : 'ok'
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
export async function lerAFolha(descricao: string, url: string, opts: { timeoutMs?: number; fetchImpl?: typeof fetch; apiKey?: string; forma?: ModoFormaDaFolha2511 } = {}): Promise<ChamadaDaFolha> {
  const key = opts.apiKey ?? (typeof process !== 'undefined' ? process.env.OPENAI_API_KEY : undefined)
  if (!key) return { leitura: null, custoUsd: 0, erro: 'sem_chave' }
  const especie = especieDaDescricao(descricao, opts.forma ?? FORMA_DA_FOLHA_2511) // KINEO-FORMA-DA-FOLHA-2511 (a sonda passa formaNaSonda())
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
  tracos_nao_julgados: TracosNaoJulgados | null /* [CEO, volta 5] negação; KINEO-FORMA-NOS-FILMES-2511: e o conferente cego (sem descrição, sem "appearance", nada julgável) */
  forma?: FormaDaFolha | 'sem_leitura'; forma_1?: FormaDaFolha | 'sem_leitura' /* KINEO-FORMA-DA-FOLHA-2511: só com a forma no filme ('on' para este filme) */ }
/** O juiz inteiro para UMA folha: lê; reprovou → UMA folha nova com a instrução → lê de novo; a tolerância do meio só na 2ª e só para bicho e criatura
 *  em filme fotorreal. Devolve a URL que serve (a nova, se foi ela) ou null. */
export async function julgarAFolha(args: { ficha: { nome: string; canonica: string; tipo?: unknown }; url: string; filmeFotorreal: boolean; lookPhrase: string; forma?: ModoFormaDaFolha2511 /* KINEO-FORMA-NOS-FILMES-2511: formaNoFilme; sem ele = 'off' */ },
  deps: { ler: (descricao: string, url: string) => Promise<ChamadaDaFolha>; gerar: (instrucao: string) => Promise<string | null> }): Promise<{ url: string | null; nome: string; relato: RelatoDaFolha }> {
  const descricao = descricaoParaOJuiz(args.ficha)
  const tipo: RelatoDaFolha['tipo'] = args.ficha.tipo === 'humano' || args.ficha.tipo === 'animal' || args.ficha.tipo === 'criatura' ? args.ficha.tipo : null
  const modoForma: ModoFormaDaFolha2511 = args.forma ?? 'off' // KINEO-FORMA-NOS-FILMES-2511
  let custo = 0, descartados = 0, v1: VereditoDaFolha | null = null
  const fim = (url: string | null, v: VereditoDaFolha | null, meio: RelatoDaFolha['meio'] | null, tentativa: 1 | 2 | null, regerou: boolean, l: LeituraDaFolha | null = null /* a leitura do veredito v */) =>
    ({ url, nome: args.ficha.nome, relato: { tipo, tracos: v ? v.tracos : 'sem_leitura' as const, meio: meio ?? (v ? v.meio : 'sem_leitura' as const), serve: url !== null, tentativa, regerou, custo_usd: Math.round(custo * 1e6) / 1e6,
      tracos_1: v1 ? v1.tracos : 'sem_leitura' as const, meio_1: v1 ? v1.meio : 'sem_leitura' as const, descartados,
      tracos_nao_julgados: tracosNaoJulgados(l, descricao, tipo),
      ...(modoForma === 'on' ? { forma: v ? v.forma : 'sem_leitura' as const, forma_1: v1 ? v1.forma : 'sem_leitura' as const } : {}) } })
  const r1 = await deps.ler(descricao, args.url)
  custo += r1.custoUsd
  if (!r1.leitura) return fim(null, null, null, null, false) // não julgada = não serve (é o furo que o juiz fecha)
  v1 = decidirDaFolha(r1.leitura, args.filmeFotorreal, descricao, modoForma, tipo)
  descartados += v1.descartados
  if (folhaPassa(v1)) return fim(args.url, v1, null, 1, false, r1.leitura)
  custo += PERSONAGEM_FOLHA_USD // a folha nova (FLUX) é paga quando pedida, saia ou não
  const nova = await deps.gerar(instrucaoDaFolhaNova(v1, args.lookPhrase)).catch(() => null)
  if (!nova || !/^https:\/\/[^\s]+$/i.test(nova)) return fim(null, v1, null, null, false, r1.leitura)
  const r2 = await deps.ler(descricao, nova)
  custo += r2.custoUsd
  if (!r2.leitura) return fim(null, null, null, null, true)
  const v2 = decidirDaFolha(r2.leitura, args.filmeFotorreal, descricao, modoForma, tipo)
  descartados += v2.descartados
  if (folhaPassa(v2)) return fim(nova, v2, null, 2, true, r2.leitura)
  // a tolerância: traços certos, só o meio errado, bicho ou criatura, filme fotorreal (folha de animação num filme de foto). Humano e filme desenhado: nunca.
  if (v2.tracos === 'ok' && formaPassa(v2) /* KINEO-FORMA-DA-FOLHA-2511 */ && v2.meio === 'meio' && args.filmeFotorreal && (tipo === 'animal' || tipo === 'criatura')) return fim(nova, v2, 'meio_tolerado', 2, true, r2.leitura)
  return fim(null, v2, null, null, true, r2.leitura)
}

/** O retrato que a ADMISSÃO lê, sem as folhas que o juiz reprovou (nem as imagens-chave que as levam): a referência delas não sai. Nada reprovado =
 *  o MESMO objeto. Só a admissão lê isto: o retrato do filme, a herança e o claim não mudam. */
export function retratoSemFolhaReprovada2411(snapshot: FilmQualitySnapshot | null, reprovadas: ReadonlySet<string> | null | undefined): FilmQualitySnapshot | null {
  if (!snapshot || !reprovadas || reprovadas.size === 0 || !Array.isArray(snapshot.characterReferences) || !Array.isArray(snapshot.approvedStills)) return snapshot
  return { ...snapshot, characterReferences: snapshot.characterReferences.filter((r) => !reprovadas.has(r?.nome)),
    approvedStills: snapshot.approvedStills.filter((s) => !(Array.isArray(s?.characterNames) && s.characterNames.some((n) => reprovadas.has(n)))) }
}
