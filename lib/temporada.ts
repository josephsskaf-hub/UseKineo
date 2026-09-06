// ═══ KINEO-TEMPORADA-2026-09-06 (sprint-assinaturas #18) ═══════════════════
//
// O NÚMERO QUE MANDOU CONSTRUIR ISTO (7 dias, 230 pessoas externas, medido
// no fechamento de 06/09):
//
//   230 cadastros → 145 fizeram o filme 1 → **109 pararam em EXATAMENTE UM**
//   → 36 fizeram 2+ → 2 pagaram.
//
//   E o detalhe que muda tudo: das 109 que pararam, apenas **9 (8%) bateram
//   na parede de crédito**. **65 (60%) ainda têm saldo para outro filme
//   agora** e nunca esbarraram em nada. Elas não foram barradas. Elas foram
//   embora **satisfeitas**, ~30 minutos depois do filme ficar pronto.
//
// A LEITURA (e é ela que justifica esta peça): quem recebe um filme e vai
// embora satisfeito não está insatisfeito com o produto — está com o produto
// ERRADO na cabeça. Ela veio buscar UM VÍDEO, recebeu UM VÍDEO, e o negócio
// fechou. Ninguém assina uma fábrica de coisa que já terminou.
//
// A INVERSÃO: o produto não é "um vídeo", é "o seu canal". No instante em que
// o filme 1 fica pronto, a casa escreve os TÍTULOS dos episódios 2 a 6 da
// mesma série e diz: **a sua temporada já existe**. Deixa de ser "quer fazer
// outro?" (pergunta, exige ideia, morre em formulário em branco) e vira "o
// episódio 3 chama-se assim — quer render?" (afirmação, exige um clique).
//
// POR QUE ISTO MONETIZA SEM TOCAR EM PREÇO: o plano deixa de ser "60 créditos
// por $9.90" (unidade que ninguém sente) e passa a ser "o resto da sua
// temporada". O cálculo de quantos episódios cabem vem SEMPRE de
// `creditCostForDuration` — nunca de número digitado aqui. Esta biblioteca não
// conhece preço, não conhece plano e não escreve oferta.
//
// ⚠ NÃO TOCA NO PIPELINE DE QUALIDADE. Título é texto FORA do pipeline: nada
// aqui lê ou escreve prompt de cena, régua de palavras/segundo, motor, música
// ou narração. O episódio só vira filme pelo fluxo normal, cobrado normalmente.
//
// ⚠ NÃO CRIA TABELA. Mesma escolha do `next_episode_written` (#14): a
// temporada mora em `events`, chaveada por `session_id = videoId`. Sem
// migration, sem DDL, e um `delete from events where name='season_written'`
// desfaz tudo.

/** Nome do evento que guarda a temporada escrita. */
export const TEMPORADA_EVENT = 'season_written'

/** 14 dias — a mesma janela da memória do episódio 2, de propósito: as duas
 *  peças são lidas pelas MESMAS cartas de ciclo de vida, e memórias com
 *  validades diferentes produziriam um e-mail que nomeia o episódio 2 e não
 *  sabe mais o nome do 3. */
export const TEMPORADA_TTL_MS = 14 * 24 * 60 * 60 * 1000

/** Do episódio 2 ao 6. Cinco é escolha de produto, não de engenharia: é o
 *  bastante para a pessoa VER uma temporada (um número menor lê como "mais um
 *  vídeo") e pouco o bastante para caber numa faixa sem rolagem e numa carta
 *  sem virar lista. */
export const PRIMEIRO_EPISODIO = 2
export const ULTIMO_EPISODIO = 6
export const TOTAL_EPISODIOS = ULTIMO_EPISODIO - PRIMEIRO_EPISODIO + 1

export const MAX_TITULO_CHARS = 120
/** A semente é o que vira `prompt` no deeplink. O teto é o mesmo
 *  `MAX_SERIES_SEED_LENGTH` de lib/seriesContinuation, por construção: uma
 *  semente maior que isso seria cortada lá adiante e a pessoa clicaria num
 *  título que não corresponde ao que o compositor recebe. */
export const MAX_SEMENTE_CHARS = 180

export type EpisodioDaTemporada = {
  /** 2..6 */
  n: number
  title: string
  /** o tema que vira `prompt` quando a pessoa clica */
  seed: string
}

export type TemporadaEscrita = {
  episodes: EpisodioDaTemporada[]
  /** o filme que originou a temporada — para a carta poder dizer "do seu X" */
  fromTitle: string | null
}

function texto(v: unknown, teto: number): string {
  if (typeof v !== 'string') return ''
  // A ORDEM IMPORTA e ja me pegou: as aspas tem de sair DEPOIS do trim.
  // Um titulo que chega com espaco na frente nao casa com `^["…]` e a aspa
  // sobrevive ate a tela. Trim -> aspas -> trim.
  return v
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^["“”']+|["“”']+$/g, '')
    .trim()
    .slice(0, teto)
}

/**
 * Recorta e valida o que vai ser GRAVADO.
 *
 * Devolve null quando não há temporada de verdade. A regra é deliberadamente
 * dura — **ou os cinco episódios, ou nenhum**: uma temporada com buracos vira,
 * na tela e na carta, "Ep2 · Ep4 · Ep6", que lê como defeito e não como
 * catálogo. Escrever de novo custa uma chamada de gpt-4o-mini; mostrar uma
 * temporada quebrada custa a impressão de que a casa não sabe o que fez.
 */
export function prepararTemporada(bruto: unknown, fromTitle?: unknown): TemporadaEscrita | null {
  const lista = Array.isArray(bruto)
    ? bruto
    : bruto && typeof bruto === 'object' && Array.isArray((bruto as { episodes?: unknown }).episodes)
      ? ((bruto as { episodes: unknown[] }).episodes)
      : null
  if (!lista) return null

  const episodes: EpisodioDaTemporada[] = []
  const vistos = new Set<string>()
  for (let i = 0; i < lista.length && episodes.length < TOTAL_EPISODIOS; i++) {
    const item = lista[i] as { title?: unknown; seed?: unknown; topic?: unknown } | null
    if (!item || typeof item !== 'object') continue
    const title = texto(item.title, MAX_TITULO_CHARS)
    // A semente cai para o título quando o modelo não manda uma. Título é
    // sempre um assunto utilizável; deixar a semente vazia mataria o clique.
    const seed = texto(item.seed ?? item.topic ?? item.title, MAX_SEMENTE_CHARS) || title
    if (!title || !seed) continue
    // Título repetido é o modo de falha mais comum destes modelos e o mais
    // caro aqui: cinco linhas iguais destroem a ideia de temporada.
    const chave = title.toLowerCase()
    if (vistos.has(chave)) continue
    vistos.add(chave)
    episodes.push({ n: PRIMEIRO_EPISODIO + episodes.length, title, seed })
  }

  if (episodes.length < TOTAL_EPISODIOS) return null
  return { episodes, fromTitle: texto(fromTitle, MAX_TITULO_CHARS) || null }
}

/** Lê o que foi gravado. Falha SEMPRE aberta: qualquer coisa estranha devolve
 *  null e quem chama decide (escrever de novo, ou simplesmente não mostrar
 *  temporada). Perder a memória custa uma chamada de modelo; devolver meia
 *  temporada custa a peça inteira. */
export function lerTemporada(metadata: unknown): TemporadaEscrita | null {
  if (!metadata || typeof metadata !== 'object') return null
  const m = metadata as { episodes?: unknown; fromTitle?: unknown }
  return prepararTemporada(m.episodes, m.fromTitle)
}

/** A memória ainda vale? Mesma regra do episódio 2. Data ilegível = NÃO vale
 *  (fail-closed): reescrever é barato, mostrar temporada de duas semanas atrás
 *  como se fosse nova não é. */
export function temporadaAindaVale(criadoEm: string | null | undefined, agora: number): boolean {
  if (!criadoEm) return false
  const t = Date.parse(criadoEm)
  if (!Number.isFinite(t)) return false
  return agora - t < TEMPORADA_TTL_MS
}
