// KINEO-IDEIA-FICHA-ASSUNTO-1211 (C) — a pessoa e o produto que o cliente DESCREVEU na ideia viram a ÚNICA ficha e a ÚNICA linha de produto
// de todos os planos do filme, com as palavras dele (verbatim, nunca parafraseadas pelo GPT).
// O caso (filme pago "Lumo", 12/11, MiniMax H3 Max Turbo, 15 s, "Let AI structure"): a ideia dizia "A woman in her late twenties with short curly
// red hair and a mustard yellow sweater … holding the Lumo glass water bottle (clear glass, bamboo lid)". O roteiro do escritor trocou isso por
// etiquetas genéricas ("bright kitchen woman smiling") e cada plano inventou a sua mulher (morena de rabo de cavalo, loira) e a sua garrafa
// (pote de vidro, garrafa de metal mostarda, branca, laranja). Onde a descrição se perdia (lido no código):
//   (1) pessoaDoPedido (KINEO-PESSOA-DO-PEDIDO-1111) só aceita os complementos separados por VÍRGULA ("a woman, approximately 25 years old,
//       with …"); escrito de seguida ("A woman in her late twenties with short curly red hair …") o 1º pedaço não é idade nem elo → nada;
//   (2) mesmo quando acha a pessoa, no APRESENTADOR nada a leva aos planos (só a ficha da história/hollywood a usa);
//   (3) não existia leitura nenhuma do PRODUTO da ideia;
//   (4) a frase positiva da embalagem ("Every bottle, box and package is one plain solid colour.") mandava o motor PINTAR a garrafa de vidro.
// A regra (código, sem GPT, sem lista de marcas ou produtos):
//   · pessoa = a mesma leitura de pessoaDoPedido, depois de separar por vírgula — sem trocar palavra — os complementos colados à pessoa
//     (", in her late twenties", ", with …", ", wearing …", ", dressed in …"). A ficha termina onde termina a descrição (o verbo "stands" fecha).
//   · produto = (a) com marca declarada ("brand called X", "brand named X"): o primeiro sintagma com determinante que contém X, até a
//     pontuação, o verbo ou a palavra de função, mais o parêntese colado a ele ("the Lumo glass water bottle (clear glass, bamboo lid)");
//     (b) sem marca: o primeiro sintagma com determinante seguido de parêntese curto sem verbo ("a brass lantern (dented, green glass)").
//   · em CADA plano, no FIM, como toda ficha da casa (nada da cena nem das proibições é cortado ou reordenado): a linha do produto e, por
//     último, a pessoa como "The same main character appears in this scene, consistent design: …" (a frase que o compactador do Kling 4 já
//     reconhece como "Identity:"); plano sem ninguém citado ganha a versão condicional; com produto, a frase da embalagem deixa de pedir cor lisa.
//   · ficha inventada para o MESMO papel na cláusula do elenco ("the woman, a woman in her thirties with wavy hair …") vira as palavras da ideia.
// Atrás do interruptor IDEIA_NA_FICHA: 'internal' = só contas da casa (isInternalEmail); 'all' = todo filme. Desligado = byte a byte o de antes.
// Guardião: scripts/test-ideia-ficha-assunto-1211.mjs.
import { pessoaDoPedido, papelDaPessoa } from '@/lib/cinematic/pessoaDoPedido'
import { textoDoPedidoOriginal } from '@/lib/cinematic/fichaDoPedido'

export type ModoIdeiaNaFicha = 'internal' | 'all'
export const IDEIA_NA_FICHA: ModoIdeiaNaFicha = 'internal' // só a casa até os 2 filmes pagos de prova
export const IDEIA_NA_FICHA_VERSAO = 'ideia_na_ficha_1211_v1'
export const IDEIA_NA_FICHA_TETO_PROMPT = 2500

export function ideiaNaFichaLigada(modo: ModoIdeiaNaFicha, contaDaCasa: boolean): boolean {
  return modo === 'all' || (modo === 'internal' && contaDaCasa === true)
}

/** A ideia do cliente: o "[Idea: …]" do pedido da rota, quando houver; senão o pedido original inteiro. '' = nenhuma. */
export function textoDaIdeia(pedidoDoCliente: unknown, promptDaRota?: unknown): string {
  for (const fonte of [pedidoDoCliente, promptDaRota]) {
    const m = typeof fonte === 'string' ? /^\s*\[Idea:\s*([\s\S]*?)\]\s*(?:\n|$)/i.exec(fonte) : null
    if (m && m[1].trim()) return m[1].trim()
  }
  return typeof pedidoDoCliente === 'string' ? pedidoDoCliente.trim() : ''
}

/** Os complementos colados à pessoa ganham a vírgula que pessoaDoPedido espera; nenhuma palavra muda. */
function comVirgulas(texto: string): string {
  return texto
    .replace(/(?<=[\p{L}\d)])\s+(?=in (?:her|his|their) (?:(?:early|mid|late)[ -])?(?:teens|twenties|thirties|forties|fifties|sixties|seventies|eighties|\d0s)\b)/giu, ', ')
    .replace(/(?<=[\p{L}\d)])\s+(?=(?:with|wearing|dressed in)\s)/giu, ', ')
}

/** A pessoa que a ideia descreve, nas palavras do cliente ("a woman, in her late twenties, with short curly red hair and a mustard yellow sweater"). */
export function pessoaDaIdeia(ideia: string): string | null {
  const texto = textoDoPedidoOriginal(ideia)
  if (!texto) return null
  const direta = pessoaDoPedido(texto) // a leitura de sempre vence: a ficha da rota (pessoaPedida) e a dos planos ficam com as MESMAS palavras
  if (direta) return direta
  const lida = pessoaDoPedido(comVirgulas(texto))
  if (!lida) return null
  // verbatim: sem as vírgulas que só esta leitura pôs, quando é assim que o cliente escreveu
  const semVirgulasPostas = lida.replace(/, (?=in (?:her|his|their) |with |wearing |dressed in )/giu, ' ')
  return semVirgulas(texto).toLowerCase().includes(semVirgulasPostas.toLowerCase()) ? semVirgulasPostas : lida
}
const semVirgulas = (t: string) => t.replace(/\s+/g, ' ')
/** Comparação sem vírgula nem caixa: "a gruff old man, with …" ≡ "a gruff old man with …". */
const chave = (t: string) => t.toLowerCase().replace(/[,;]/g, '').replace(/\s+/g, ' ').trim()

const DETERMINANTE = '(?:the|a|an|her|his|their|its|our|my|your)'
/** Sem marca, o objeto só é "o produto" quando alguém o MANUSEIA na ideia (segura, mostra, usa, abre…): "a dark suit jacket (no face)" no
 *  meio de uma cena não é produto. Classe fechada de verbos de manusear, não lista de produtos. */
const MANUSEIA_RE = /(?<![\p{L}])(?:holding(?: up)?|holds|held|carrying|carries|showing|shows|presenting|presents|using|uses|opening|opens|pouring|pours|applying|applies|unboxing|unboxes|demonstrating|demonstrates|sipping|sips|drinking from|drinks from|reviewing|reviews|tries|trying)\s+$/iu
/** Palavra que fecha o sintagma do produto: função do inglês ou verbo com -s/-ed/-ing (o "fits" de "the bottle fits"). */
const FECHA_SINTAGMA_RE = /^(?:and|or|but|with|without|in|on|at|to|into|onto|from|of|for|by|that|which|who|while|when|as|is|are|was|were|be|been|has|have|had|will|can|could|should|would|may|might|must|does|do|did|than|so|then|after|before|during|over|under|near|beside|inside|outside|it|she|he|they|we|you|i)$/i
const caraDeVerbo = (w: string) => (/^\p{Ll}/u.test(w) && w.length >= 4 && /s$/i.test(w) && !/(?:ss|us|is)$/i.test(w)) || (w.length >= 5 && /(?:ed|ing)$/i.test(w))
const MAX_PALAVRAS_SINTAGMA = 7
const MAX_PALAVRAS_PARENTESE = 12

/** O sintagma que começa no determinante em `ini` (até 7 palavras), com o parêntese colado. */
function sintagmaEm(texto: string, ini: number): { frase: string; temParentese: boolean } | null {
  const resto = texto.slice(ini)
  const det = new RegExp(`^${DETERMINANTE}\\s+`, 'iu').exec(resto)
  if (!det) return null
  const palavras: string[] = []
  let pos = det[0].length
  while (palavras.length < MAX_PALAVRAS_SINTAGMA) {
    const m = /^([\p{L}\p{N}][\p{L}\p{N}'’-]*)(\s*)/u.exec(resto.slice(pos))
    if (!m) break
    if (FECHA_SINTAGMA_RE.test(m[1]) || (palavras.length > 0 && caraDeVerbo(m[1]))) break
    palavras.push(m[1]); pos += m[0].length
  }
  if (palavras.length === 0) return null
  let frase = `${det[0]}${palavras.join(' ')}`.replace(/\s+/g, ' ').trim()
  const par = /^\s*\(([^()\n]{2,200})\)/u.exec(resto.slice(det[0].length + palavras.join(' ').length))
  const conteudo = par?.[1].trim() ?? ''
  const parValido = !!par && conteudo.split(/\s+/).length <= MAX_PALAVRAS_PARENTESE && !conteudo.split(/[\s,;]+/).some((w) => /^(?:is|are|was|were|has|have|had|it|she|he|they|we|i|you|see|click|visit|www|no|not|never|without)$/i.test(w)) // parêntese de oração ou de chamada não é descrição; particípio adjetivo ("dented") é
  if (parValido) frase = `${frase} (${conteudo})`
  return { frase, temParentese: parValido }
}

/** O produto que a ideia descreve, nas palavras do cliente ("the Lumo glass water bottle (clear glass, bamboo lid)"). null = não há. */
export function produtoDaIdeia(ideia: string): string | null {
  const texto = String(ideia ?? '').replace(/\r\n?/g, '\n').replace(/[^\S\n]+/g, ' ').trim()
  if (!texto) return null
  const marca = /\b(?:brand|company|label|product)\s+(?:called|named)\s+["“']?(\p{Lu}[\p{L}\p{N}'’-]*)/u.exec(texto)
  const detRe = new RegExp(`(?<![\\p{L}\\p{N}])${DETERMINANTE}\\s`, 'giu')
  for (const d of texto.matchAll(detRe)) {
    const s = sintagmaEm(texto, d.index ?? 0)
    if (!s) continue
    if (marca) {
      if (!new RegExp(`(?<![\\p{L}\\p{N}])${marca[1]}(?![\\p{L}\\p{N}])`, 'u').test(s.frase)) continue
      if ((d.index ?? 0) <= (marca.index ?? 0) + marca[0].length && (d.index ?? 0) >= (marca.index ?? 0)) continue // o próprio "brand called X"
      if (s.frase.split(/\s+/).length < 3) continue // "the Lumo" sozinho não descreve nada
      return s.frase
    }
    if (s.temParentese && MANUSEIA_RE.test(texto.slice(Math.max(0, (d.index ?? 0) - 24), d.index ?? 0))) return s.frase
  }
  return null
}

export interface FichaDaIdeia { versao: string; pessoa: string | null; produto: string | null }
/** A ficha da ideia; null = a ideia não descreve nem pessoa nem produto. */
export function fichaDaIdeia(pedidoDoCliente: unknown, promptDaRota?: unknown): FichaDaIdeia | null {
  const ideia = textoDaIdeia(pedidoDoCliente, promptDaRota)
  if (!ideia) return null
  const pessoa = pessoaDaIdeia(ideia)
  const produto = produtoDaIdeia(ideia)
  return pessoa || produto ? { versao: IDEIA_NA_FICHA_VERSAO, pessoa, produto } : null
}

export const FRASE_PESSOA_DA_IDEIA = (pessoa: string) => `The same main character appears in this scene, consistent design: ${pessoa}. `
export const FRASE_PESSOA_CONDICIONAL = (pessoa: string) => `Any person or hand shown is this same person: ${pessoa}. `
export const FRASE_PRODUTO_MARCA = 'The product shown is always this same one:' // o compactador do Kling 4 (filmQuality) lê esta marca e põe "Product: …" na frente
export const FRASE_PRODUTO_DA_IDEIA = (produto: string) => `${FRASE_PRODUTO_MARCA} ${produto}. `
export const EMBALAGEM_COR_LISA = 'Every bottle, box and package is one plain solid colour.'
export const EMBALAGEM_DO_PRODUTO = 'Every bottle, box and package keeps its described material and colour, unprinted.'
const GENTE_NA_CENA_RE = /(?<![\p{L}])(?:woman|women|man|men|girl|boy|person|people|she|her|he|his|him|hands?|fingers?|someone|presenter|influencer|creator|character|lady|guy)(?![\p{L}])/iu

/**
 * O plano com a ficha da ideia: produto e pessoa no fim do plano (a convenção da ficha da casa), a ficha inventada do mesmo
 * papel trocada pelas palavras da ideia e, com produto, a embalagem sem cor lisa. Passou do teto: o plano de antes (nada é cortado).
 */
export function comIdeiaNaCena(prompt: string, ficha: FichaDaIdeia | null, opcoes: { semPessoa?: boolean } = {}): string {
  const original = String(prompt ?? '')
  if (!ficha) return original
  let p = original
  const pessoa = opcoes.semPessoa ? null : ficha.pessoa
  const nucleoPessoa = pessoa ? chave(pessoa.replace(/^(?:a|an)\s+/iu, '')) : ''
  if (pessoa) {
    // a ficha inventada do mesmo papel ("the woman, a woman in her thirties with …") vira a da ideia: nada inventado fica ao lado
    const papel = papelDaPessoa(pessoa)
    if (papel) p = p.replace(new RegExp(`(Characters? in this shot: (?:[^—;]*; )*the ${papel}, )(?:an?\\s[^;—]+?)(\\s*)(?=[;—])`, 'iu'), (_m, ini: string, espaco: string) => `${ini}${pessoa}${espaco}`)
  }
  // no FIM, como a cláusula da ficha de sempre (CLAUSULA_FICHA, sceneStyle, kidsCartoon): o produto e, por último, a pessoa — o compactador do
  // Kling 4 lê "The same main character…" como a ficha e descarta o que vem depois dela; nada da cena existente é cortado nem reordenado
  const fim: string[] = []
  if (ficha.produto && !p.includes(ficha.produto)) fim.push(FRASE_PRODUTO_DA_IDEIA(ficha.produto))
  if (pessoa && !chave(p).includes(nucleoPessoa)) fim.push(GENTE_NA_CENA_RE.test(p) ? FRASE_PESSOA_DA_IDEIA(pessoa) : FRASE_PESSOA_CONDICIONAL(pessoa))
  if (ficha.produto) p = p.split(EMBALAGEM_COR_LISA).join(EMBALAGEM_DO_PRODUTO)
  if (fim.length) p = `${p.replace(/\s+$/u, '')} ${fim.join('').trim()}`
  return Array.from(p).length <= IDEIA_NA_FICHA_TETO_PROMPT ? p : original
}
