// lib/freeFastQuota.ts — KINEO-DEAD-RESERVATION-2026-08-06
//
// FONTE ÚNICA da contagem de cota Fast do plano free (3 por janela rolante de
// 24h). Duas coisas moram aqui, e é importante não confundi-las:
//
//   1. `countFreeFastUsage` — a REGRA, que decide quem pode gerar. Ela é hoje
//      idêntica, caso a caso, ao que o compose fazia antes desta extração.
//   2. `countUndeliveredReservations` — um INSTRUMENTO, que não decide nada e
//      existe para medir um defeito antes de tentar corrigi-lo.
//
// ── POR QUE EXTRAIR ───────────────────────────────────────────────────────
// `app/api/compose/route.ts` (a porta que RECUSA a pessoa) e
// `app/api/cron/send-credits-back/route.ts` (o e-mail que PROMETE crédito)
// implementavam esta contagem em paralelo, com os mesmos números digitados
// duas vezes. Código copiado em N lugares tem o mesmo bug em N lugares. A
// extração não muda comportamento nenhum: é paridade fiel dos dois lados.
//
// ── O DEFEITO SUSPEITO, E POR QUE A CORREÇÃO **NÃO** ESTÁ AQUI ────────────
// A reserva é criada ANTES do TTS, do Whisper, do Pexels e do POST no
// Creatomate — antes de existir qualquer vídeo. Medido em produção (06/08):
//   · 270 reservas free na história · 235 com linha em `videos` · 35 sem (13%).
//   · 13 pessoas levaram HTTP 402 `free_fast_limit`; 8 delas tinham ao menos
//     uma reserva sem entrega na janela daquele momento.
//
// A correção óbvia — "reserva que não virou vídeo devolve a vaga" — foi
// escrita, revisada e **DESCARTADA**, porque a revisão adversarial mostrou que
// ela abriria uma cota infinita. O motivo está no comentário que já existia em
// `app/api/compose/route.ts`: *"`videos` is written only after the client polls
// a successful render"*. A linha em `videos` é escrita pelo CLIENTE, no
// polling. Quem simplesmente não polla nunca a escreve — e mesmo assim fica com
// o MP4. Ancorar a cota nessa linha significaria: gerar 3, buscar os arquivos
// por fora, esperar o período de graça, e repetir. 3 por 24h viraria ~96/dia.
//
// E a mesma revisão desmontou a própria medição: **9 das 35 reservas "mortas"
// têm download ou visualização do vídeo nas 2h seguintes.** Elas não são
// falhas nossas — são entregas cujo handshake de polling não fechou. Os 13% são
// um TETO da vítima, não a vítima. O número que faltava, e que nenhuma query
// deste repositório consegue produzir hoje, é quantos daqueles renders o
// Creatomate reportou como `failed`.
//
// ── O QUE FECHA ISSO DE VERDADE (próxima sprint) ──────────────────────────
// A prova de entrega tem que nascer no SERVIDOR, não na aba do usuário. Duas
// saídas, nesta ordem de preferência:
//   (a) o servidor registra a conclusão do render (webhook do Creatomate ou
//       varredura por `render_id` num cron), e aí a cota pode olhar entrega;
//   (b) enquanto (a) não existe, a vaga só é devolvida com prova POSITIVA de
//       falha — o Creatomate respondeu `failed`/`cancelled` para aquele
//       `render_id` — nunca por ausência de sinal.
// Devolver vaga por AUSÊNCIA de prova é o erro; foi ele que a revisão pegou.
//
// Até lá a regra abaixo é exatamente a de antes, e o instrumento mede o
// tamanho real do problema em produção.

export const FREE_FAST_PREVIEW_LIMIT = 3
export const FREE_FAST_WINDOW_MS = 24 * 60 * 60 * 1000

/**
 * Acima desta idade, uma reserva sem linha em `videos` é considerada suspeita
 * pelo INSTRUMENTO — e por mais nada. Derivada do tempo real medido entre a
 * reserva e a entrega, nas 235 entregas da história: p50 189s, p90 300s,
 * p99 1110s, **máximo 1436s (24min)**.
 *
 * 45min = 1,9x o máximo já observado. Deliberadamente NÃO é
 * `STALE_GENERATION_MS` (lib/generations.ts, 15min): aquele valor é menor que o
 * p99 e que o máximo daqui, e trata de outro objeto (job de geração, não render
 * do Creatomate). Nenhuma decisão de cota depende desta constante.
 */
export const FREE_FAST_DELIVERY_GRACE_MS = 45 * 60 * 1000

function readString(source: Record<string, unknown>, key: string): string {
  const value = source[key]
  return typeof value === 'string' ? value.trim() : ''
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? value as Record<string, unknown> : {}
}

function renderIdsWithVideoRow(videos: unknown[]): Set<string> {
  const ids = new Set<string>()
  for (const row of videos) {
    const renderId = readString(asRecord(row), 'render_id')
    if (renderId) ids.add(renderId)
  }
  return ids
}

/**
 * A REGRA. Conta a cota Fast free consumida, por usuário, a partir das linhas
 * cruas já lidas pelo chamador. Função pura, sem I/O.
 *
 * Comportamento idêntico ao que o compose e o send-credits-back faziam em suas
 * cópias separadas: **toda reserva na janela ocupa uma vaga**, tenha ou não
 * virado vídeo. Previews anteriores ao PUSH19 têm linha em `videos` sem
 * reserva e contam uma vez — a dedupe é contra os `render_id` VINDOS DE
 * RESERVAS, e só contra eles, então dois vídeos que compartilhassem um
 * `render_id` sem reserva contariam 2 (fiel ao comportamento anterior; hoje
 * impossível, `videos.render_id` é único).
 *
 * @param defaultUserId dono das linhas que não trazem `user_id` — é o caso do
 *   compose, cujas duas queries já filtram por um único usuário autenticado.
 *
 * @param onUnknownUser o que fazer com linha sem `user_id` e sem
 *   `defaultUserId`. **Os dois chamadores querem coisas diferentes, e tratá-los
 *   igual é bug nos dois sentidos:**
 *
 *   · `'throw'` (padrão, usado pelo compose) — ali toda linha pertence ao
 *     usuário autenticado por construção, então uma linha sem dono é sinal de
 *     que a query mudou por baixo. Numa contagem de cota isso não pode virar
 *     silenciosamente zero, que seria o lado que ABRE a cota.
 *
 *   · `'skip'` (usado pelo cron) — ali a query varre a base inteira, e
 *     `events.user_id` é `ON DELETE SET NULL` (005_events_staging.sql): apagar
 *     uma conta deixa para trás reservas órfãs com `user_id` NULL. Elas não
 *     pertencem a ninguém vivo e não podem afetar a contagem de ninguém, então
 *     pular é o comportamento CORRETO — não um silenciamento. Lançar aqui
 *     trocaria um skip certo por um 500 que zera o job inteiro, e ele se
 *     repetiria a cada rodada até a linha órfã sair da janela de 24h.
 */
export function countFreeFastUsage(input: {
  claims: unknown[]
  videos: unknown[]
  defaultUserId?: string
  onUnknownUser?: 'throw' | 'skip'
}): Map<string, number> {
  const { claims, videos, defaultUserId, onUnknownUser = 'throw' } = input
  const usageByUser = new Map<string, number>()
  const countedRenderIds = new Set<string>()

  const resolveUser = (row: Record<string, unknown>, kind: string): string | null => {
    const userId = readString(row, 'user_id') || (defaultUserId ?? '')
    if (userId) return userId
    if (onUnknownUser === 'skip') return null
    throw new Error(`[freeFastQuota] ${kind} row without user_id and no defaultUserId`)
  }

  const add = (userId: string) => usageByUser.set(userId, (usageByUser.get(userId) ?? 0) + 1)

  for (const raw of claims) {
    const row = asRecord(raw)
    const userId = resolveUser(row, 'claim')
    // O render_id é registrado mesmo para linha órfã: ele ainda deduplica o
    // vídeo correspondente, que também não deve ser contado para ninguém.
    const renderId = readString(asRecord(row.metadata), 'render_id')
    if (renderId) countedRenderIds.add(renderId)
    if (userId) add(userId)
  }

  for (const raw of videos) {
    const row = asRecord(raw)
    const renderId = readString(row, 'render_id')
    if (renderId && countedRenderIds.has(renderId)) continue
    const userId = resolveUser(row, 'video')
    if (userId) add(userId)
  }

  return usageByUser
}

/**
 * O INSTRUMENTO. Quantas reservas, por usuário, não têm linha em `videos` e já
 * passaram do período de graça.
 *
 * **Não decide nada.** Serve para medir em produção, com o denominador certo,
 * quantas pessoas são recusadas com uma reserva sem entrega em aberto — e, na
 * próxima sprint, para comparar esse número com o que o Creatomate diz que
 * realmente falhou. Ausência de linha em `videos` NÃO é prova de falha: 9 das
 * 35 reservas nessa condição tiveram download ou visualização logo depois.
 */
export function countUndeliveredReservations(input: {
  claims: unknown[]
  videos: unknown[]
  now: number
  defaultUserId?: string
}): Map<string, number> {
  const { claims, videos, now, defaultUserId } = input
  const delivered = renderIdsWithVideoRow(videos)
  const undeliveredByUser = new Map<string, number>()

  for (const raw of claims) {
    const row = asRecord(raw)
    const userId = readString(row, 'user_id') || (defaultUserId ?? '')
    if (!userId) continue

    const renderId = readString(asRecord(row.metadata), 'render_id')
    if (renderId && delivered.has(renderId)) continue

    // Sem `created_at` legível a reserva é tratada como recente, para o
    // instrumento nunca superestimar o problema que ele mede.
    const createdAtMs = Date.parse(readString(row, 'created_at'))
    if (!Number.isFinite(createdAtMs)) continue
    if ((now - createdAtMs) < FREE_FAST_DELIVERY_GRACE_MS) continue

    undeliveredByUser.set(userId, (undeliveredByUser.get(userId) ?? 0) + 1)
  }

  return undeliveredByUser
}
