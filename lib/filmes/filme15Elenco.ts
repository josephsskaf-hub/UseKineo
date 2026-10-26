// [TRAVA 8.2 — vai do fundador 26/10 "o maior defeito é que ele não segue o personagem… tinha que seguir o menino depressivo"]
// KINEO-FILME15-ELENCO-2610 — O ELENCO DO FILME GRÁTIS DE 15 s: em qualquer língua, e o protagonista em TODA cena.
//
// Dois furos medidos em 26/10, com a folha de personagem já ligada (KINEO-FILME15-ROSTO-2610):
//   1. "Uma menina encontra… o avô" (render a9cf79be): nenhuma folha. O elenco sai de elencoDoRoteiro(prompt), que só lê inglês
//      (artigos a/an/the + papéis em inglês) e só pega UM papel sem nome. Pedido em português/espanhol = elenco vazio = sem folha.
//      Conserto: quando o pedido não dá elenco, ler os VISUAIS das cenas (o escritor de cenas os escreve em inglês) — cada visual
//      pelo mesmo extrator, juntando papéis diferentes (até PERSONAGEM_MAX_PERSONAGENS = 2: a menina E o avô).
//   2. "Por que os problemas parecem piores à noite" (supercellgamea40, 26/10 16:56Z): o rapaz das cenas 1-2 some e a cena 3 mostra
//      "uma mulher na janela com luz". A cena que não cita o protagonista ganhava outra pessoa. Conserto: no 15 s, cena sem
//      ninguém do elenco passa a mostrar o PROTAGONISTA (o visual ganha o nome dele na frente, então a folha entra nela também; o
//      prompt final ganha a ordem "a única pessoa do quadro é o personagem principal").
// Peças puras (o extrator e o casador de cenas entram por parâmetro): testáveis sem rede. Só roda no filme de 15 s com a folha.
import type { FichaDePersonagem } from '@/lib/cinematic/folhaDePersonagem'

export const FILME15_ELENCO_MAX = 2

/** O elenco do 15 s: o do pedido quando existe; senão, o dos visuais das cenas (papéis distintos, até 2, o 1º é o protagonista). */
export function elencoDoFilme15(args: {
  elencoDoPedido: ReadonlyArray<FichaDePersonagem>
  visuals: ReadonlyArray<string>
  extrair: (texto: string) => FichaDePersonagem[]
}): { elenco: FichaDePersonagem[]; origem: 'pedido' | 'cenas' | 'nenhum' } {
  if (args.elencoDoPedido.length > 0) return { elenco: args.elencoDoPedido.map((f) => ({ ...f })), origem: 'pedido' }
  // 1. Por cena, os papéis que o extrator acha. Ele pega UM papel sem nome por texto: tira o papel achado e lê de novo
  //    ("the girl hands the key to an elderly man" → girl, depois man).
  const porCena: Array<Array<{ chave: string; ficha: FichaDePersonagem }>> = args.visuals.map((visual) => {
    let resto = String(visual ?? '')
    const achados: Array<{ chave: string; ficha: FichaDePersonagem }> = []
    for (let volta = 0; volta < 3; volta++) {
      const f = args.extrair(resto).find((x) => nucleoDe(x) && !achados.some((a) => a.chave === nucleoDe(x)))
      if (!f) break
      achados.push({ chave: nucleoDe(f), ficha: f })
      resto = semPalavra(resto, nucleoDe(f))
    }
    return achados
  })
  // 2. O protagonista: o 1º papel da 1ª cena que tem gente. Os outros só entram se aparecem em 2+ cenas OU na mesma cena que o
  //    protagonista (o avô que recebe a chave da menina). Quem aparece uma vez, sozinho, é INTRUSO (a "mulher na janela" que
  //    tomou o lugar do rapaz) — não entra no elenco, e a cena dele passa a mostrar o protagonista.
  const primeiro = porCena.find((c) => c.length > 0)?.[0]
  if (!primeiro) return { elenco: [], origem: 'nenhum' }
  const elenco: FichaDePersonagem[] = [{ ...primeiro.ficha, protagonista: true }]
  const contagem = new Map<string, number>()
  for (const c of porCena) for (const a of c) contagem.set(a.chave, (contagem.get(a.chave) ?? 0) + 1)
  for (const c of porCena) {
    for (const a of c) {
      if (elenco.length >= FILME15_ELENCO_MAX) break
      if (a.chave === primeiro.chave || elenco.some((e) => nucleoDe(e) === a.chave)) continue
      const comOProtagonista = c.some((x) => x.chave === primeiro.chave)
      if ((contagem.get(a.chave) ?? 0) >= 2 || comOProtagonista) elenco.push({ ...a.ficha, protagonista: false })
    }
  }
  return { elenco, origem: 'cenas' }
}

const nucleoDe = (f: FichaDePersonagem): string => String(f.nucleo || f.nome.split(' ').pop() || '').trim().toLowerCase()
/** Palavras do texto (letras Unicode), em minúsculas: "man" nunca casa "woman". */
const palavras = (t: string): string[] => String(t ?? '').toLowerCase().split(/[^\p{L}]+/u).filter(Boolean)
const citaPalavra = (t: string, w: string): boolean => !!w && palavras(t).includes(w)
/** Tira a palavra inteira do texto (para o extrator achar o próximo papel). */
const semPalavra = (t: string, w: string): string => String(t ?? '').split(/(\p{L}+)/u).map((p) => (p.toLowerCase() === w ? ' ' : p)).join('')
/** A cena cita alguém do elenco? Só pela palavra do papel/nome inteira ("man" não casa "woman"). */
export function cenaCitaElenco(visual: string, elenco: ReadonlyArray<FichaDePersonagem>): boolean {
  return elenco.some((f) => citaPalavra(visual, nucleoDe(f)))
}

/** Ordem do prompt final da cena forçada (vai na frente do prompt do still e do clipe). */
export const ORDEM_DO_PROTAGONISTA = (canonica: string) =>
  `The only person in this shot is the same main character (${canonica}); any other person described below is replaced by this same character. `

/**
 * O protagonista em toda cena: cena cujo visual não cita ninguém do elenco pela palavra do papel (cenaCitaElenco — o casador antigo
 * dava "a woman by the window" ao rapaz pelo pronome/figura humana e a mulher ficava no prompt) recebe o nome do protagonista na
 * frente do visual (a folha entra nela) e entra em `forcadas` (o prompt final ganha ORDEM_DO_PROTAGONISTA).
 */
export function protagonistaEmTodaCena(args: {
  visuals: ReadonlyArray<string>
  elenco: ReadonlyArray<FichaDePersonagem>
}): { visuals: string[]; forcadas: number[] } {
  const protagonista = args.elenco.find((f) => f.protagonista) ?? args.elenco[0]
  const visuals = args.visuals.map((v) => String(v ?? ''))
  if (!protagonista) return { visuals, forcadas: [] }
  const forcadas: number[] = []
  const saida = visuals.map((v, i) => {
    if (cenaCitaElenco(v, args.elenco)) return v
    forcadas.push(i)
    return `${protagonista.nome}, the only person in the shot — ${v}`
  })
  return { visuals: saida, forcadas }
}
