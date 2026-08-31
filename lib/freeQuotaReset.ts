// lib/freeQuotaReset.ts — sprint-v1v4 #17
//
// A PAREDE QUE NAO DIZIA QUANDO ABRE.
//
// Medido em producao (30 dias, so pessoas externas): 22 pessoas levaram
// `compose_daily_free_limit` e as 36 linhas do evento chegaram ao banco com
// `metadata.error` NULO — mudas. Na tela elas leram uma frase que diz O QUE
// aconteceu ("You've hit today's free limit (3 Fast previews)") e nunca diz a
// unica coisa acionavel que existe: **a que horas a vaga volta**.
//
// A cota nao e diaria de calendario — e uma JANELA ROLANTE de 24h
// (FREE_FAST_WINDOW_MS). Ou seja, "amanha" e uma resposta errada: para quem
// gerou os 3 as 22h de ontem, a vaga volta as 22h de hoje, nao a meia-noite.
// O servidor SEMPRE soube esse instante — ele tem na mao as linhas com
// `created_at` que ele acabou de contar para recusar. Ele so nunca disse.
//
// Por que isso e friccao de video-1 -> video-2, e nao conversa de oferta:
// a pessoa recusada aqui NAO precisa comprar nada para fazer o 2o video. Ela
// precisa VOLTAR na hora certa. Sem a hora, nao existe motivo para voltar, e
// o produto transforma uma espera de poucas horas em um abandono definitivo.
//
// ── FRONTEIRA COM O CODEX (deliberada) ────────────────────────────────────
// Este arquivo nao conhece dolar, plano, SKU, cupom, checkout nem assinatura.
// Ele produz UM instante e UMA frase de tempo. A copy da oferta continua
// vivendo em `lib/freeTierOffer.ts`, intocada byte a byte: o chamador
// ACRESCENTA esta frase a dele, nunca a substitui.
//
// ── REGRA DE OURO ─────────────────────────────────────────────────────────
// Toda duvida erra para o SILENCIO. Timestamp ilegivel, lista curta demais,
// instante no passado, janela absurda -> devolve `null` e a pessoa le
// exatamente a frase de antes. Uma parede sem horario e ruim; uma parede com
// horario ERRADO e pior — ela manda a pessoa voltar e bater na parede de novo.

export type LinhaContada = { created_at?: unknown }

function lerInstante(valor: unknown): number | null {
  if (typeof valor !== 'string') return null
  const ms = Date.parse(valor.trim())
  return Number.isFinite(ms) ? ms : null
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {}
}

/**
 * O instante (epoch ms) em que a proxima vaga free volta a existir.
 *
 * A aritmetica espelha a REGRA que recusa em `app/api/compose/route.ts`:
 * la a recusa acontece quando `usoJaExistente + 1 > limite`, ou seja quando
 * ja existem `limite` unidades na janela. Logo a pessoa volta a poder gerar
 * quando o uso existente cai para `limite - 1` — e isso acontece no momento
 * em que a unidade de indice `n - limite` (0-based, lista crescente) completa
 * a janela.
 *
 * A tentativa que ACABOU de ser recusada nao conta: a rota chama
 * `releaseGenerationClaim()` antes de responder, entao a reserva mais nova da
 * lista ja nao ocupa vaga nenhuma. Por isso ela e descartada aqui — conta-la
 * empurraria o horario para longe e faria o produto mentir para mais tarde.
 *
 * @returns epoch ms, ou `null` quando nao da para afirmar com honestidade.
 */
export function quandoLiberaVaga(input: {
  linhas: unknown[]
  limite: number
  janelaMs: number
  agora: number
  descartarMaisNova?: boolean
}): number | null {
  const { linhas, limite, janelaMs, agora, descartarMaisNova = true } = input

  if (!Array.isArray(linhas)) return null
  if (!Number.isInteger(limite) || limite < 1 || limite > 100) return null
  if (!Number.isFinite(janelaMs) || janelaMs <= 0 || janelaMs > 30 * 24 * 3600 * 1000) return null
  if (!Number.isFinite(agora)) return null

  const instantes: number[] = []
  for (const bruta of linhas) {
    const ms = lerInstante(asRecord(bruta)['created_at'])
    // Linha sem carimbo legivel derruba a resposta inteira: com um instante a
    // menos a lista fica curta e o horario calculado seria CEDO DEMAIS.
    if (ms === null) return null
    // Fora da janela ela ja nao ocupa vaga — nao entra na conta.
    if (agora - ms >= janelaMs) continue
    instantes.push(ms)
  }

  instantes.sort((a, b) => a - b)
  const efetivos = descartarMaisNova ? instantes.slice(0, -1) : instantes
  const n = efetivos.length
  // Se o uso efetivo ja nao alcanca o limite, nao ha parede a explicar.
  if (n < limite) return null

  const liberaEm = efetivos[n - limite] + janelaMs
  // Instante no passado significa que a conta e a regra discordam — cala.
  if (liberaEm <= agora) return null
  // Nunca prometer alem de uma janela inteira a frente.
  if (liberaEm - agora > janelaMs) return null
  return liberaEm
}

/**
 * A frase, em ingles, para o cliente. Curta, factual, sem promessa de preco.
 *
 * Arredonda para CIMA no minuto: "unlocks in 1m" quando faltam 10 segundos e
 * melhor que "in 0m", que soa quebrado; e mandar a pessoa voltar um instante
 * depois da hora nunca a faz bater na parede de novo.
 */
export function fraseDaVolta(liberaEmMs: number | null, agora: number): string | null {
  if (liberaEmMs === null || !Number.isFinite(liberaEmMs) || !Number.isFinite(agora)) return null
  const restanteMs = liberaEmMs - agora
  if (restanteMs <= 0) return null
  if (restanteMs > 30 * 24 * 3600 * 1000) return null

  const minutosTotais = Math.max(1, Math.ceil(restanteMs / 60000))
  const horas = Math.floor(minutosTotais / 60)
  const minutos = minutosTotais % 60

  const quanto =
    horas > 0 && minutos > 0
      ? `${horas}h ${minutos}m`
      : horas > 0
        ? `${horas}h`
        : `${minutos}m`

  return `Your next free video unlocks in ${quanto} — nothing to buy, just come back.`
}

/** Minutos que faltam, para a telemetria do servidor. `null` = nao sabemos. */
export function minutosAteLiberar(liberaEmMs: number | null, agora: number): number | null {
  if (liberaEmMs === null || !Number.isFinite(liberaEmMs) || !Number.isFinite(agora)) return null
  const restanteMs = liberaEmMs - agora
  if (restanteMs <= 0) return null
  return Math.max(1, Math.ceil(restanteMs / 60000))
}
