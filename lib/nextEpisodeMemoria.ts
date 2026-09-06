// ═══ KINEO-EPISODIO2-MEMORIA-2026-09-06 (sprint-assinaturas #14) ═══════════
//
// O NÚMERO QUE MANDOU CONSTRUIR ISTO (medido 06/09 em produção):
//
//   `/api/next-episode` escreve o episódio 2 INTEIRO — título e narração — e
//   o joga fora no fim da requisição. Em 04-06/09 a rota escreveu para 17
//   pessoas; 8 delas fizeram outro filme (47%), contra ~30% de todo mundo que
//   fez o filme 1 (13 de 44 no funil do fundador). É o degrau mais eficiente
//   da casa e o único episódio escrito vive em `useState` de UMA aba.
//
//   Enquanto isso, QUATRO famílias de e-mail dizem à pessoa que o próximo
//   episódio "já está escrito" e mandam um link com a SEMENTE (o tema), não
//   com o texto. Desde que a porta de e-mail subiu (05/09 17:50 UTC) saíram
//   ~40 cartas com esse botão e `episode_link_clicked` = 0 — a sonda desta
//   rotação provou que o contador funciona, então o zero é real.
//
// O QUE ESTA PEÇA MUDA, e é UMA coisa só: a casa passa a LEMBRAR o episódio
// que ela mesma escreveu. Quem volta — pelo e-mail, por outra aba, por
// recarregar a tela — encontra O MESMO episódio 2, não um episódio diferente
// e não um card vazio.
//
// ⚠ NÃO TOCA NO PIPELINE DE QUALIDADE. Nenhuma palavra do prompt, do modelo,
// dos marcadores ou da narração muda. Esta camada devolve BYTE A BYTE o que a
// rota já tinha produzido; ela não escreve texto nenhum. Régua de palavras/
// segundo, escolha de motor e prompt de cena não são lidos aqui.
//
// ⚠ NÃO CRIA TABELA. A memória mora em `events` (`next_episode_written`),
// chaveada por `session_id = fromVideoId` — o handle durável do filme, o mesmo
// que a rota já usa para montar a memória da série. Sem migration, sem DDL,
// e um `delete from events where name='next_episode_written'` desfaz tudo.

/** Nome do evento que guarda o episódio escrito. */
export const EPISODIO_ESCRITO_EVENT = 'next_episode_written'

/** 14 dias. O ciclo de vida do trial inteiro cabe aqui, e as quatro cartas que
 *  prometem o episódio 2 (`ending_soon`, `downgraded_loss`, `expired_offer_d5`,
 *  `expired_lastcall_d10`) saem dentro dessa janela. Depois disso o episódio é
 *  velho o bastante para valer mais reescrever do que repetir. */
export const MEMORIA_TTL_MS = 14 * 24 * 60 * 60 * 1000

/** Teto do que vai para `jsonb`. Um episódio de 60s tem ~160 palavras (~1KB);
 *  4000 caracteres cobrem 90s com folga e impedem que um retorno anômalo do
 *  modelo empurre um blob para dentro da tabela de eventos. */
export const MAX_SCRIPT_CHARS = 4000
export const MAX_TITULO_CHARS = 160

export type EpisodioEscrito = {
  title: string
  script: string
  words: number
  episodeNumber: number
  markersVia: string | null
}

/** Recorta e valida o que vai ser GRAVADO. Devolve null quando não há
 *  episódio de verdade — gravar meio episódio é pior que não gravar, porque a
 *  leitura devolveria um card quebrado no lugar de escrever um novo. */
export function prepararParaGravar(v: {
  title?: unknown
  script?: unknown
  words?: unknown
  episodeNumber?: unknown
  markersVia?: unknown
}): EpisodioEscrito | null {
  const script = typeof v.script === 'string' ? v.script.trim() : ''
  if (!script) return null
  // Um "episódio" de duas palavras não é episódio. O piso é baixo de propósito:
  // quem julga a qualidade do texto é o pipeline, não esta camada.
  if (script.length < 40) return null
  if (script.length > MAX_SCRIPT_CHARS) return null
  const title = typeof v.title === 'string' ? v.title.trim().slice(0, MAX_TITULO_CHARS) : ''
  if (!title) return null
  const words = typeof v.words === 'number' && Number.isFinite(v.words) && v.words > 0 ? Math.floor(v.words) : 0
  if (words <= 0) return null
  const episodeNumber =
    typeof v.episodeNumber === 'number' && Number.isFinite(v.episodeNumber) && v.episodeNumber >= 2
      ? Math.floor(v.episodeNumber)
      : 2
  const markersVia = typeof v.markersVia === 'string' && v.markersVia ? v.markersVia.slice(0, 32) : null
  return { title, script, words, episodeNumber, markersVia }
}

/** Lê de volta o que foi gravado. Mesmo rigor da escrita: qualquer campo
 *  faltando devolve null, e null significa "escreva um novo" — nunca "mostre
 *  um card pela metade". */
export function lerGravado(metadata: unknown): EpisodioEscrito | null {
  if (!metadata || typeof metadata !== 'object') return null
  const m = metadata as Record<string, unknown>
  return prepararParaGravar({
    title: m.title,
    script: m.script,
    words: m.words,
    episodeNumber: m.episodeNumber,
    markersVia: m.markersVia,
  })
}

/** A memória só é válida dentro da janela. Relógio entra por parâmetro para o
 *  teste não depender da hora da máquina. */
export function memoriaAindaVale(criadoEm: string | null | undefined, agora: number): boolean {
  if (!criadoEm) return false
  const t = new Date(criadoEm).getTime()
  if (!Number.isFinite(t)) return false
  const idade = agora - t
  // Idade negativa (relógio do banco à frente do da lambda, o incidente
  // JWT-skew de 28/08 mostrou que isso acontece) conta como recente, não como
  // inválida: o episódio existe.
  if (idade < 0) return true
  return idade <= MEMORIA_TTL_MS
}
