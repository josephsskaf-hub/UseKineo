// sprint-v1v4 #28 (2026-09-01) — A CAIXA EM BRANCO DE QUEM JA VOLTOU.
//
// O NUMERO QUE ABRIU O BURACO (medido 01/09, 30 dias, so pessoas externas):
// das 285 pessoas que fizeram EXATAMENTE 1 video, 82 voltaram a tela de criar
// e so 36 clicaram no primeiro botao. Ou seja: 46 pessoas abrem o Studio de
// novo e nao apertam nada. Elas nao desistiram do produto — desistiram da
// pagina em branco.
//
// E o produto sabia disso — para o cliente NOVO. O GenerateClient tem o
// pre-preenchimento #455, que planta um tema pronto na caixa de quem nunca fez
// video, e o proprio comentario dele diz, com todas as letras: "never touches
// returning users". A ajuda foi escrita de proposito para nao alcancar
// justamente o grupo que trava.
//
// POR QUE UM TEMA DA PRATELEIRA, E NAO O ROTEIRO ANTIGO DELA:
// a #16 mediu o /viral-now ponta a ponta — 44 de 124 expostos clicaram um tema
// e 20 receberam video em <=2h (45% de quem clicou), 13x a taxa das sugestoes
// personalizadas. E a unica fonte de ideia da casa com conversao provada. Ja
// `videos.topic` guarda o ROTEIRO INTEIRO (o texto comeca no gancho, nao num
// titulo), entao "parte 2 do seu ultimo video" nasceria como um paragrafo solto
// dentro da caixa — pior que o branco.
//
// O QUE ENTRA NA CAIXA: so o TITULO curto do tema (uma linha humana e
// editavel), nunca o roteiro completo. O AUTO-STRUCTURE (#310) transforma
// qualquer texto livre em roteiro estruturado antes do analyze, entao a linha
// curta chega ao mesmo lugar que o prompt longo — e nao assusta quem abriu a
// tela querendo escrever a propria ideia.
//
// TRAVAS (por que isto nao atropela ninguem):
//   1. So age quando a URL nao traz prompt/topic/viral_topic — quem chegou com
//      ideia na mao nunca e tocado.
//   2. So age entre o 1o e o 3o video. Quem nunca fez video continua com o
//      #455; quem ja passou do 4o (o limiar de conversao medido) nao precisa
//      de empurrao.
//   3. Deterministico por (pessoa, no de videos): recarregar a pagina nao
//      troca o texto debaixo da mao dela; fazer mais um video troca.
//   4. Nunca repete assunto que ela ja filmou.

import { VIRAL_TOPICS_POOL, type ViralTopic } from '@/lib/viralTopics'

/** Depois deste numero de videos a pessoa ja provou repeticao sozinha (#28). */
export const SEMENTE_TETO_VIDEOS = 4

/** Palavras vazias demais para provar que dois assuntos sao o mesmo. */
const VAZIAS = new Set([
  'the', 'a', 'an', 'of', 'to', 'and', 'or', 'in', 'on', 'for', 'with', 'that',
  'this', 'it', 'is', 'are', 'was', 'were', 'be', 'by', 'as', 'at', 'from',
  'how', 'why', 'what', 'who', 'when', 'your', 'you', 'their', 'they', 'its',
  'get', 'got', 'make', 'makes', 'made', 'more', 'most', 'than', 'then',
  'about', 'into', 'out', 'up', 'down', 'one', 'two', 'facts', 'fact', 'video',
])

function palavras(texto: string): string[] {
  return texto
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((p) => p.length >= 4 && !VAZIAS.has(p))
}

/** FNV-1a — o mesmo hash ja usado no reparo de trial orfao. Estavel entre deploys. */
function fnv1a(texto: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < texto.length; i += 1) {
    h ^= texto.charCodeAt(i)
    h = Math.imul(h, 0x01000193) >>> 0
  }
  return h >>> 0
}

export type SementeRetorno = {
  topicId: string
  /** O que vai para a caixa: uma linha curta, humana e editavel. */
  texto: string
  vertical: string
  /** Quantos temas do cardapio foram descartados por ja terem sido filmados. */
  descartadosPorRepeticao: number
}

export type EntradaSemente = {
  userId: string
  /** Quantos videos a pessoa ja recebeu. */
  videosFeitos: number
  /** Texto dos videos recentes dela (o roteiro inteiro serve). */
  topicosAnteriores: string[]
  /** True quando a URL ja trouxe ideia (prompt/topic/viral_topic). */
  jaTemIdeiaNaUrl: boolean
  /** Cardapio; injetavel para teste. */
  cardapio?: ViralTopic[]
}

/**
 * Escolhe a linha que vai pre-preencher a caixa de quem ja fez video e voltou.
 * Devolve `null` sempre que a pessoa nao e o alvo — e o silencio e o padrao:
 * na duvida, a caixa continua como esta hoje.
 */
export function escolherSementeDeRetorno(entrada: EntradaSemente): SementeRetorno | null {
  const { userId, videosFeitos, topicosAnteriores, jaTemIdeiaNaUrl } = entrada
  const cardapio = entrada.cardapio ?? VIRAL_TOPICS_POOL

  // Trava 1 — quem chegou com ideia na mao manda na caixa.
  if (jaTemIdeiaNaUrl) return null
  // Trava 2 — so o trecho video-1 -> video-4.
  if (!Number.isFinite(videosFeitos)) return null
  if (videosFeitos < 1 || videosFeitos >= SEMENTE_TETO_VIDEOS) return null
  if (!userId) return null
  if (!cardapio.length) return null

  // Trava 4 — fora tudo que ela ja filmou. A prova e feita por palavra
  // significativa: dois assuntos so sao "o mesmo" com 2+ palavras em comum,
  // para uma coincidencia solta ("money") nao apagar um tema bom.
  const jaFilmadas = new Set<string>()
  for (const anterior of topicosAnteriores) {
    if (typeof anterior !== 'string') continue
    for (const p of palavras(anterior.slice(0, 4000))) jaFilmadas.add(p)
  }

  const disponiveis: ViralTopic[] = []
  let descartadosPorRepeticao = 0
  for (const tema of cardapio) {
    const assunto = palavras(`${tema.title} ${tema.category} ${tema.vertical}`)
    const repetidas = assunto.filter((p) => jaFilmadas.has(p)).length
    if (repetidas >= 2) {
      descartadosPorRepeticao += 1
      continue
    }
    disponiveis.push(tema)
  }

  // Se a faxina esvaziou o cardapio, e melhor um tema repetido que a pagina em
  // branco — mas isso fica registrado no evento.
  const lista = disponiveis.length ? disponiveis : cardapio

  // Trava 3 — deterministico por (pessoa, no de videos). Ordena por id antes de
  // sortear para nao depender da ordem de declaracao do cardapio.
  const ordenada = [...lista].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
  const escolhido = ordenada[fnv1a(`${userId}:${videosFeitos}`) % ordenada.length]

  const texto = escolhido.title.trim().slice(0, 180)
  if (!texto) return null

  return {
    topicId: escolhido.id,
    texto,
    vertical: escolhido.vertical,
    descartadosPorRepeticao,
  }
}
