// ═══ KINEO-PESSOA-DO-PEDIDO-1111 [CEO 11/11, revisão do 1º filme de cliente no formato de 4 planos] — A PESSOA SEM NOME DO PEDIDO ═══
//
// O FILME DE 11/11 09:16 (vídeo 24564d97, Kling 4 grátis, espanhol, nota 7,0): o pedido dizia "A young blonde woman, approximately
// 25 years old, with natural makeup and a casual pastel pink outfit, in a beautiful but realistic modern home…". Saiu uma morena de
// perfil, de regata. Onde a descrição se perdeu (lido no despacho real):
//   (1) o FORMATO foi decidido sobre o roteiro de 15 s (só as 4 falas em espanhol, sem ninguém) → 'documentary_faceless' (padrão);
//   (2) no faceless a rota apaga a pessoa da cena ("A young woman" → "A young woman seen in silhouette from behind") e cola "faceless
//       cinematic b-roll, no foreground human faces" — a moça virou silhueta antes de qualquer ficha;
//   (3) a ficha do pedido (KINEO-FICHA-DO-PEDIDO-0911) só lê o aposto de NOME PRÓPRIO ("Mara, a young …"); esta pessoa não tem nome →
//       elenco vazio ("sem_personagem"), nenhuma ficha, nenhum "Visible:" no plano. O compactador de 512 não tinha o que cortar.
//
// O CONSERTO (puro, sem rede): lê no PEDIDO ORIGINAL a pessoa descrita sem nome — artigo + cabeça com substantivo de pessoa ("A young
// blonde woman") + os complementos de aparência colados por vírgula ("approximately 25 years old", "with natural makeup and a casual
// pastel pink outfit"), parando no primeiro trecho que não descreve gente ("in a beautiful … home", "holds the pen"). A rota usa isso em
// dois pontos, nas duas estradas: o formato que caiu no faceless SÓ por padrão vira história com personagem (pessoa muda, narrador por
// cima — nunca apresentador), e a ficha da história/hollywood que não existia passa a ser estas palavras, verbatim.
// Fica como estava: sem pedido original, pessoa nua ("a man", "a woman" sem nenhuma aparência), pedido em outra língua que não o inglês
// (o vocabulário de descrição do pt/es é o da ficha do pedido; trecho que ele não reconhece não entra), tag [faceless], faceless pedido
// em palavras ("sem apresentador" — o motivo não é o padrão), apresentador, estrela, qualidade herdada.
// Guardião: scripts/test-pessoa-do-pedido-1111.mjs (o pedido real do 24564d97 + controles + mutantes).
import { textoDoPedidoOriginal, trechoDescreve } from '@/lib/cinematic/fichaDoPedido'
import { canonicaLiteral } from '@/lib/cinematic/juizFicha'
import type { FichaDePersonagem } from '@/lib/cinematic/folhaDePersonagem'
import type { DecisaoFormato } from '@/lib/cinematic/visualMode'

export const MARCA_PESSOA_DO_PEDIDO = 'KINEO-PESSOA-DO-PEDIDO-1111'
export const PESSOA_DO_PEDIDO_VERSAO = 'pessoa_do_pedido_1111_v2'
export const PESSOA_DO_PEDIDO_MAX_PALAVRAS = 40

/** Substantivo de UMA pessoa, em inglês (a cabeça da descrição). */
const PESSOA_RE = /(?<![\p{L}\p{N}-])(an?) ((?:[\p{L}\d-]+ ){0,4}?)(woman|man|girl|boy|lady|guy|person|teenager|teen|mother|father|mom|dad|grandmother|grandfather|grandma|grandpa|influencer|creator|model|nurse|doctor|chef|student|fisherman|sailor|soldier|guard|worker|businessman|businesswoman|athlete)(?![\p{L}\p{N}-])/giu
/** Idade colada à pessoa: "approximately 25 years old", "around 30", "in her late twenties". */
const IDADE_RE = /^(?:(?:approximately|about|around|roughly|aged|age)\s+)?\d{1,3}(?:\s*-\s*\d{1,3})?(?:\s+years?\s+old|\s*y\/?o)?$|^in (?:her|his|their) (?:(?:early|mid|late)[ -])?(?:teens|twenties|thirties|forties|fifties|sixties|seventies|eighties|\d0s)$/iu
/** Complemento de aparência aberto por elo (o resto é conferido por trechoDescreve, da ficha do pedido). */
const ELO_DE_APARENCIA_RE = /^(?:with|wearing|dressed in|in (?:a|an) (?:[\p{L}-]+ ){0,3}(?:outfit|dress|suit|uniform|jacket|coat|sweater|hoodie|shirt|t-shirt|top|blouse|skirt|jeans))\b/iu
/** Elo que abre uma LISTA de traços ou de roupa: depois dele, o pedaço seguinte sem elo continua a mesma lista ("with warm brown skin, expressive … eyes"). */
const ELO_DE_LISTA_RE = /^(?:with|wearing|dressed in)\b/iu
/**
 * KINEO-PESSOA-DO-PEDIDO-1111 (2) — as frases seguintes sobre a mesma pessoa: "She wears a cream blouse and elegant black trousers." (657ad797,
 * 11/11: a roupa vivia na 2ª frase e o filme saiu de jaqueta escura). Só o sujeito pronome da pessoa + verbo de vestir/ter.
 */
const FRASE_SEGUINTE_RE = /^(?:she|he|they)\s+(?:wears|is wearing|are wearing|is dressed in|are dressed in|has|have)\s+(.+)$/iu
const VESTIR_RE = /^(?:she|he|they)\s+(?:wears|is wearing|are wearing|is dressed in|are dressed in)\s/iu
/** Quantas frases depois da 1ª ainda são lidas (a descrição de uma pessoa vem junto; mais longe já é outra coisa). */
export const FRASES_SEGUINTES_MAX = 3
const HUMANO = { nome: '', nucleo: '', tipo: 'humano' } as const
/** A 1ª palavra de um pedaço SEM elo com cara de verbo do inglês (-s, -ed, -ing): ação, não traço ("walks home", "smiled"). */
const CARA_DE_VERBO_RE = /^\p{L}{3,}(?:s|ed|ing)$/iu

/** O maior começo do trecho (em palavras) que ainda é descrição da pessoa: "… long neat black braids sits alone at …" → "… braids". '' = nenhum. */
function comecoQueDescreve(cabeca: string, artigo: string, trecho: string): string {
  const palavras = trecho.split(/\s+/).filter(Boolean)
  for (let n = palavras.length; n >= 2; n--) {
    const parte = palavras.slice(0, n).join(' ')
    if (trechoDescreve(`${cabeca} ${parte}`, artigo, HUMANO)) return parte
  }
  return ''
}

/** A pessoa sem nome que o pedido original descreve, verbatim ("a young blonde woman, approximately 25 years old, with …"). null = não há. */
export function pessoaDoPedido(ideiaOriginal: unknown): string | null {
  const pedido = textoDoPedidoOriginal(ideiaOriginal)
  if (!pedido) return null
  for (const m of pedido.matchAll(PESSOA_RE)) {
    const artigo = m[1].toLowerCase()
    const cabeca = `${m[2]}${m[3]}`.trim()
    // a cabeça com adjetivo tem de ser descrição de gente; a cabeça nua ("a woman") só vale com idade ou aparência colada por vírgula
    const nua = m[2].trim() === ''
    if (!nua && !trechoDescreve(cabeca, artigo, HUMANO)) continue
    const ini = (m.index ?? 0) + m[0].length
    const fimDaFrase = pedido.slice(ini).search(/[.;:!?\n]/u)
    const resto = pedido.slice(ini, fimDaFrase < 0 ? undefined : ini + fimDaFrase)
    const partes = resto.split(',').map((p) => p.trim())
    const aceitos: string[] = []
    let lista = '' // o elo da lista aberta ("with", "wearing"): o pedaço seguinte sem elo continua nela
    for (const [i, p] of partes.entries()) {
      if (!p) { if (i === 0) continue; break } // "woman, approximately…": o 1º pedaço é vazio
      if (IDADE_RE.test(p)) { aceitos.push(p); lista = ''; continue }
      const elo = ELO_DE_APARENCIA_RE.test(p)
      const parte = elo ? comecoQueDescreve(cabeca, artigo, p)
        : lista && !CARA_DE_VERBO_RE.test(p.split(/\s+/)[0]) ? comecoQueDescreve(cabeca, artigo, `${lista} ${p}`).slice(lista.length).trim() : '' // "…, walks home": verbo não continua a lista
      if (!parte) break // o primeiro trecho que não descreve a pessoa fecha a ficha: lugar, ação, outra oração
      aceitos.push(parte)
      if (elo) lista = ELO_DE_LISTA_RE.exec(p)?.[0].toLowerCase() ?? ''
      if (parte !== p) break // o verbo cortou o pedaço ("… braids sits alone"): o resto da frase é ação
    }
    if (nua && aceitos.length === 0) continue // pessoa nua
    // as frases seguintes sobre a mesma pessoa ("She wears …", "She has …")
    const depois = fimDaFrase < 0 ? '' : pedido.slice(ini + fimDaFrase + 1)
    const seguintes = depois.split(/(?<=[.;!?\n])/u).map((f) => f.trim()).filter(Boolean).slice(0, FRASES_SEGUINTES_MAX)
    for (const f of seguintes) {
      const s = FRASE_SEGUINTE_RE.exec(f.replace(/[.;!?]+$/u, ''))
      if (!s) continue
      const parte = comecoQueDescreve(cabeca, artigo, `${VESTIR_RE.test(f) ? 'wearing' : 'with'} ${s[1]}`)
      if (parte) aceitos.push(parte)
    }
    const frase = [`${artigo} ${cabeca}`, ...aceitos].join(', ')
    if (frase.split(/\s+/).length > PESSOA_DO_PEDIDO_MAX_PALAVRAS) continue
    return frase
  }
  return null
}

/** O papel (o substantivo de pessoa) da descrição: "woman" em "a beautiful … woman, with …". */
export function papelDaPessoa(pessoa: string | null): string | null {
  if (!pessoa) return null
  const m = new RegExp(PESSOA_RE.source, 'iu').exec(pessoa)
  return m ? m[3].toLowerCase() : null
}

/**
 * A ficha da história/hollywood com a pessoa do pedido: a derivada do roteiro ("a beautiful 26-year-old South African woman, with warm brown
 * skin" — a 1ª oração só) dá lugar às palavras inteiras do cliente quando fala do MESMO papel. Derivada de nome próprio ("Mara, the guard")
 * ou de outro papel fica; sem derivada, a pessoa do pedido.
 */
export function fichaDaPessoa(derivada: string | null, pessoa: string | null): string | null {
  if (!pessoa) return derivada
  if (!derivada) return pessoa
  if (/^(?!(?:A|An|The)\b)\p{Lu}[\p{L}'’.-]*(?: \p{Lu}[\p{L}'’.-]*)*,/u.test(derivada.trim())) return derivada
  const papel = papelDaPessoa(pessoa)
  return papel && new RegExp(`(?<![\\p{L}])${papel}(?![\\p{L}])`, 'iu').test(derivada) ? pessoa : derivada
}

/**
 * O elenco com a pessoa do pedido: o personagem SEM nome próprio cujo papel é o da descrição ("the woman", sorteado pelo elenco
 * determinístico — 657ad797: "wavy hair … dark blue jacket over a grey t-shirt") passa a ser as palavras do cliente, verbatim, origem 'autor'.
 * Mesma forma de saída da ficha do pedido: `trocas` = [canônica de antes, canônica literal], para os prompts já escritos. Um só personagem
 * recebe (o primeiro do papel); ficha do autor, nome próprio, bicho e criatura ficam.
 */
export function elencoComPessoaDoPedido(pessoa: string | null, elenco: ReadonlyArray<FichaDePersonagem>): { elenco: FichaDePersonagem[]; literais: string[]; trocas: Array<[string, string]> } {
  const papel = papelDaPessoa(pessoa)
  const literais: string[] = []
  const trocas: Array<[string, string]> = []
  let usada = false
  const saida = elenco.map((f) => {
    if (!pessoa || !papel || usada || f.origem === 'autor' || f.tipo !== 'humano') return { ...f }
    const nome = String(f.nome ?? '').trim().toLowerCase().replace(/^(?:the|a|an)\s+/u, '')
    if (nome !== papel) return { ...f }
    usada = true
    const canonica = canonicaLiteral(f, pessoa.replace(/^an?\s+/iu, ''), null, null)
    literais.push(f.nome)
    trocas.push([f.canonica, canonica])
    return { ...f, canonica, origem: 'autor' as FichaDePersonagem['origem'] }
  })
  return { elenco: saida, literais, trocas }
}

/**
 * O formato do filme com a pessoa do pedido: SÓ o faceless que veio do padrão (o roteiro não cita ninguém) vira história com personagem —
 * pessoa muda, narrador por cima. Tag [faceless], "sem apresentador", apresentador e história ficam como estão.
 */
export function formatoComPessoaDoPedido(decisao: DecisaoFormato, pessoa: string | null): DecisaoFormato {
  if (!pessoa || decisao.modo !== 'documentary_faceless' || !/^padrao:/u.test(decisao.motivo)) return decisao
  return { modo: 'character_story', motivo: `o pedido original descreve a pessoa ("${pessoa}"): pessoa muda, narrador por cima`, apresentadorPedido: false }
}
