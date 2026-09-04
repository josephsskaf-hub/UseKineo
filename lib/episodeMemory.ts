// ═══════════════════════════════════════════════════════════════════════════
// sprint-retencao #4 (2026-09-04) — O FILME NÃO LEMBRAVA O QUE ELE MESMO FALOU
//
// MEDIDO EM PRODUÇÃO (04/09, contas externas, 45 dias):
//
//   select count(*), count(script) from videos where status='completed'
//     and created_at > now() - interval '45 days';
//   → 1013 filmes entregues, 0 com roteiro gravado.
//
// A coluna `public.videos.script` EXISTE, é citada NOMINALMENTE no comentário
// do próprio INSERT canônico (`app/api/compose/status/[renderId]`, Push #357:
// "Real prod columns: … topic, script, hashtags …") e nunca foi escrita uma
// única vez desde 13/05/2026. Mesma doença do `thumbnail_url` (0 de 1129).
//
// POR QUE ISSO BLOQUEIA A PISTA INTEIRA: a continuação de série
// (lib/seriesContinuation.ts) é a peça mais eficiente da casa — 48 dos 58
// primeiros cliques em 30d vieram de gente com UM filme e 60% delas entregaram
// outro filme em 24h, contra 6,6% de base. Mas a ordem que ela manda para o
// gerador é genérica: "same subject, same format, a completely new hook, new
// facts and a fresh payoff. Do not repeat the previous episode." O gerador é
// PROIBIDO de repetir e ao mesmo tempo NÃO SABE o que foi dito. Não há como
// escrever o episódio 2 a partir do episódio 1 quando o episódio 1 não deixou
// rastro do que falou. Este módulo cria o rastro; quem consome vem depois.
//
// CONTRATO DELIBERADO:
//  - função PURA, ZERO import — dá para exercitar em teste sem subir servidor
//    e sem tocar em nenhum módulo da trava de qualidade;
//  - devolve `null` (nunca string vazia) quando não há narração utilizável,
//    para que o caller possa OMITIR a coluna em vez de gravar lixo;
//  - corta em fronteira de palavra: narração cortada no meio da palavra é
//    exatamente o defeito que a semente de série levou 3 rodadas para matar;
//  - piso de 40 caracteres: abaixo disso não é narração, é sobra de marcador.
// ═══════════════════════════════════════════════════════════════════════════

/** Teto do que viaja no claim e é gravado em `videos.script`. Uma narração de
 *  90s no teto da régua clássica (3,1 pal/s × 90 = ~290 palavras) dá ~1.800
 *  caracteres; 4.000 cobre isso com folga e mantém o metadata do claim
 *  pequeno o bastante para não pesar em nenhuma leitura de evento. */
export const MAX_EPISODE_MEMORY_CHARS = 4000

/** Abaixo disto não é narração de filme nenhum — é resto de marcador, um
 *  título solto, ou o `topic` cru que o degrau 3 do compose usa como último
 *  socorro. Gravar isso em `videos.script` criaria memória FALSA, que é pior
 *  que memória nenhuma: o episódio 2 evitaria fatos que nunca foram ditos. */
export const MIN_EPISODE_MEMORY_CHARS = 40

/**
 * Normaliza a narração real do filme para virar memória do episódio.
 *
 * Não reescreve, não resume e não interpreta: só achata espaços, apara e
 * corta com limite. O texto que entra aqui já passou pelo `stripScriptMarkers`
 * do /api/compose — é a fala, não o roteiro com marcadores.
 */
export function episodeNarrationForMemory(value: string | null | undefined): string | null {
  const flat = (value ?? '')
    .toString()
    .replace(/\s+/g, ' ')
    .trim()
  if (flat.length < MIN_EPISODE_MEMORY_CHARS) return null
  if (flat.length <= MAX_EPISODE_MEMORY_CHARS) return flat

  const window = flat.slice(0, MAX_EPISODE_MEMORY_CHARS)
  // Última frase inteira, se ela ainda guarda metade do teto (senão um "Mr."
  // no começo viraria a memória inteira); caso contrário, último espaço.
  const sentence = window.match(/^([\s\S]*[.!?…])(?=\s|$)/)
  let cut = sentence && sentence[1].length >= MAX_EPISODE_MEMORY_CHARS / 2 ? sentence[1] : ''
  if (!cut) {
    const lastSpace = window.lastIndexOf(' ')
    cut = lastSpace > 0 ? window.slice(0, lastSpace) : window
  }
  cut = cut.trim()
  return cut.length >= MIN_EPISODE_MEMORY_CHARS ? cut : null
}
