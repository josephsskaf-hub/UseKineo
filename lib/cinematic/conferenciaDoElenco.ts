// KINEO-SO-GENTE-NA-FICHA-0411 [TRAVA 8.2 — fundador 04/11: "Concerta tudo, melhora todos os proximos videos"] — palavra comum não vira personagem.
//
// Caso real (breakthroughs2026, 04/11, pagante, 1º filme, Seedance 1.5, 90 s, generation a3b48be4): "The Empire State Building stands…" e "Lituya Bay
// acted like a funnel" fizeram de "Building" e "Bay" dois personagens HUMANOS. O casting escreveu "30-40, light skin, wearing sweater, dress shirt, tie",
// a folha custou US$ 1,33 a mais e cada cena recebeu um homem de colete e uma mulher de chapéu que o roteiro não tem. Em 14 dias, a mesma leitura por lista de
// palavras deu: Moral, Essential, Sound, Ending, Laughter, Bears, Skymaster, Cute, Among, Incomplete. Consertar uma palavra por vez nunca acaba.
//
// A leitura semântica (lib/cinematic/elencoSemantico) já acerta esses casos, mas só decidia quando achava um protagonista NOMEADO; "não há personagem aqui"
// devolvia o controle à lista de palavras. Agora, quando a leitura responde, ela também RETIRA: nome que ela não leu como personagem sai da ficha e da cena.
//   · Vale nas duas estradas: clássica (Seedance 1.5, Veo, Kling 2.5) e hollywood (Kling 3, H3, H3 Max, Omni, S25, Kling 4).
//   · Leitura que falha ou estoura o prazo: nada muda (a lista de sempre, reforçada por PALAVRAS_NUNCA_NOME).
//   · Papel sem nome ("the woman"), figura mítica da tabela e ficha escrita pelo autor nunca saem.
//   · Escrita não latina (árabe, híndi…): a leitura devolve o nome na escrita original e a lista lê a tradução; não dá para comparar, então nada muda.
// Módulo puro: sem rede. Guardião: scripts/test-so-gente-na-ficha-0411.mjs.
import { mesmoPersonagem } from '@/lib/cinematic/elencoEpoca'
import type { ElencoSemantico } from '@/lib/cinematic/elencoSemantico'

export const CONFERENCIA_ELENCO_VERSAO = 'so_gente_na_ficha_0411_v1'
export const EVENTO_CONFERENCIA_ELENCO = 'cinematic_cast_checked'
const FATIA_LATINA_MINIMA = 0.7

export interface ConferenciaDoElenco { nomes: string[]; protagonista: string }

/** Texto em que a leitura e a lista de nomes escrevem o nome do mesmo jeito (a maioria das letras é latina). Sem letras: false. */
export function escritaLatina(texto: string): boolean {
  const semTags = String(texto ?? '').replace(/\[[^\]]*\]/g, ' ')
  const letras = semTags.match(/\p{L}/gu)?.length ?? 0
  if (letras === 0) return false
  return (semTags.match(/\p{Script=Latin}/gu)?.length ?? 0) / letras >= FATIA_LATINA_MINIMA
}

/** A leitura pronta para conferir; null = sem leitura (erro, prazo, JSON inválido): nada é retirado. */
export function conferenciaDaLeitura(leitura: ElencoSemantico | null | undefined): ConferenciaDoElenco | null {
  if (!leitura) return null
  const nomes = [leitura.protagonist, ...leitura.supporting].flatMap((p) => (p?.name ? [p.name] : []))
  return { nomes, protagonista: leitura.protagonist?.name ?? '' }
}

/** O elenco sem os nomes que a leitura não leu como personagem. Sem conferência: o mesmo elenco. Sobrou gente sem protagonista: o 1º assume. */
export function elencoConferido<T extends { nome: string; origem: string; protagonista: boolean }>(elenco: ReadonlyArray<T>, conferencia: ConferenciaDoElenco | null): { elenco: T[]; removidos: string[] } {
  if (!conferencia) return { elenco: [...elenco], removidos: [] }
  const removidos: string[] = []
  const fica = elenco.filter((f) => {
    if (/^(?:the|a|an)\s/i.test(f.nome) || f.origem === 'mitica' || f.origem === 'autor' || conferencia.nomes.some((n) => mesmoPersonagem(n, f.nome))) return true
    removidos.push(f.nome)
    return false
  })
  if (removidos.length === 0) return { elenco: [...elenco], removidos }
  const saida = fica.map((f) => ({ ...f }))
  if (saida.length > 0 && !saida.some((f) => f.protagonista)) saida[0].protagonista = true
  return { elenco: saida, removidos }
}
