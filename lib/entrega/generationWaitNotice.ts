// ═══ KINEO-ENTREGA-NOITE-R6-2026-09-09 ═══════════════════════════════════════
// A TELA DIZ "Generation failed · You can retry safely" PARA ESTADOS EM QUE
// RETENTAR NÃO PODE FUNCIONAR — E O PRODUTO JÁ SABE DISSO.
//
// Medido em 09/09 sobre `generation_failed_screen_shown` (45 dias):
//   screen=generic · cause=other             15 eventos ·  7 pessoas · até 08/09
//   screen=generic · cause=provider_rejected  5 eventos ·  2 pessoas
// e, quebrando `generation_stage_error` (60 dias, papel `cause`) pelo texto que
// o servidor devolveu, o balde `other` é feito de mensagens HONESTAS que o
// classificador do cartão simplesmente não reconhece:
//   · portão de trial/plano ......... 19 pessoas / 41 eventos
//   · prazo estourado (deadline) ....  5 pessoas / 12 eventos
//   · plano de cenas não saiu .......  2 pessoas /  7 eventos
//   · resfriamento de 429 ...........  1 pessoa  /  6 eventos
//
// O caso do 429 é o retrato do defeito. `app/api/generate-video-cinematic/
// route.ts` devolve, junto com a frase, `retry_after_ms: 15 * 60 * 1000` —
// QUINZE MINUTOS, um número exato, calculado pelo servidor. O cliente nunca leu
// esse campo neste ramo: as únicas leituras de `retry_after_ms` no produto são
// backoff de polling, todas com `Math.min(…, 10000)`. Então a tela mostrava
// "You can retry safely" e um botão azul "🔄 Retry" dentro de uma tranca de 15
// minutos. A pessoa apertou onze vezes em doze minutos e foi embora.
//
// Este módulo é a decisão PURA: dado o que o servidor disse (frase, HTTP,
// `retry_after_ms`, `reason`), ele responde a única pergunta que o cartão
// precisava fazer e nunca fez — **apertar de novo muda alguma coisa?**
//
// Três disciplinas, todas por causa de erro já cometido nesta casa:
//  1. FALHA FECHADA: o que não casa devolve `null`, e `null` deixa o cartão
//     exatamente como está hoje. Nenhum estado novo nasce de dúvida.
//  2. NÚMERO SÓ DO SERVIDOR: `waitSeconds` vem de `retryAfterMs` e de mais
//     lugar nenhum. Sem número do servidor, a frase não tem número — o
//     CLAUDE.md proíbe prometer fila que o código não tem.
//  3. DINHEIRO SÓ QUANDO O SERVIDOR FALOU: `serverSaidRefunded` é lido da
//     própria frase do servidor. Este módulo NUNCA afirma estorno por conta
//     própria (memória: `campo-validado-gravado-ecoado-nao-e-honrado`).
//
// Não decide direito de uso, plano, preço nem crédito: só LÊ o que o servidor
// já respondeu. A porta continua sendo do servidor.

/** Em que estado o pedido parou, quando dá para saber com o que o servidor disse. */
export type WaitNoticeKind = 'cooldown' | 'gate' | 'deadline' | 'provider_busy'

/** A pergunta que o cartão nunca fez: apertar "Retry" de novo muda alguma coisa? */
export type RetryWorks = 'no' | 'after_wait' | 'yes'

export interface WaitNoticeInput {
  /** A frase que o servidor devolveu e que a tela já mostra. */
  message: string | null | undefined
  /** O status HTTP da resposta, ou null quando não houve resposta. */
  httpStatus: number | null | undefined
  /** `retry_after_ms` do corpo da resposta. Tri-estado: ausente ≠ zero. */
  retryAfterMs: unknown
  /** O `reason` com que a falha foi registrada em `generation_stage_error`. */
  reason: string | null | undefined
}

export interface WaitNotice {
  kind: WaitNoticeKind
  retryWorks: RetryWorks
  /** Segundos de espera — SOMENTE quando o servidor mandou o número. */
  waitSeconds: number | null
  /** Título honesto do cartão (chave de tradução em INTERFACE_ES/INTERFACE_HI). */
  headline: string
  /** A frase do estado do produto. Nunca repete a mensagem do servidor. */
  detail: string
  /** true só quando a PRÓPRIA frase do servidor diz que devolveu o crédito. */
  serverSaidRefunded: boolean
}

/** Teto de sanidade: 24h. Acima disso o número é lixo, não espera. */
const MAX_WAIT_MS = 24 * 60 * 60 * 1000

/**
 * Lê `retry_after_ms` sem nunca inventar um número.
 * Só um finito positivo dentro do teto vira segundos; qualquer outra coisa
 * (ausente, null, string, NaN, negativo, absurdo) devolve null.
 */
export function segundosDeEspera(retryAfterMs: unknown): number | null {
  if (typeof retryAfterMs !== 'number') return null
  if (!Number.isFinite(retryAfterMs)) return null
  if (retryAfterMs <= 0) return null
  if (retryAfterMs > MAX_WAIT_MS) return null
  return Math.ceil(retryAfterMs / 1000)
}

/** A frase do servidor afirmou, ela mesma, que o crédito voltou? */
function servidorDisseQueEstornou(texto: string): boolean {
  return /refunded|returned to your balance|nothing was charged|are being returned/i.test(texto)
}

/**
 * O portão de plano/trial. NÃO inclui `credits_held`: aquele estado se resolve
 * sozinho dentro da hora e tem cartão próprio, então ali retentar FUNCIONA e
 * chamar de portão seria mentira na direção contrária.
 */
function ehPortao(texto: string, reason: string): boolean {
  if (reason === 'cinematic_gate_credits_held') return false
  if (/^cinematic_gate_/.test(reason)) return true
  return /part of your trial|reactivate it to keep|not included in your plan/i.test(texto)
}

function ehResfriamento(texto: string, http: number | null): boolean {
  if (http === 429) return true
  return /wait a few minutes before starting another/i.test(texto)
}

function ehPrazoEstourado(reason: string): boolean {
  return /deadline_exceeded|retries_exhausted/.test(reason)
}

function ehFornecedorOcupado(texto: string, http: number | null): boolean {
  if (http === 503) return true
  return /did not accept the job|full capacity|at capacity/i.test(texto)
}

/**
 * A decisão. Devolve `null` — cartão inalterado — sempre que o que chegou não
 * sustenta uma afirmação nova. Ordem: portão antes de resfriamento porque um
 * portão pode chegar com HTTP estranho, e resfriamento antes de fornecedor
 * ocupado porque 429 e 503 são estados opostos (nosso muro × muro do motor).
 */
export function classificarEsperaDaGeracao(input: WaitNoticeInput): WaitNotice | null {
  const texto = typeof input.message === 'string' ? input.message.trim() : ''
  const reason = typeof input.reason === 'string' ? input.reason.trim() : ''
  const http = typeof input.httpStatus === 'number' && Number.isFinite(input.httpStatus)
    ? input.httpStatus
    : null
  // Sem frase E sem reason não há o que afirmar: o cartão genérico já é a
  // resposta certa para "não sabemos".
  if (!texto && !reason) return null
  const estornou = servidorDisseQueEstornou(texto)
  const espera = segundosDeEspera(input.retryAfterMs)

  if (ehPortao(texto, reason)) {
    return {
      kind: 'gate',
      // Portão não é falha e não vira sucesso por insistência.
      retryWorks: 'no',
      waitSeconds: null,
      headline: 'This engine is not available on your account right now',
      detail: 'Retrying the same engine will stop at this same place. Pick another engine to keep going.',
      serverSaidRefunded: estornou,
    }
  }

  if (ehResfriamento(texto, http)) {
    return {
      kind: 'cooldown',
      retryWorks: 'after_wait',
      waitSeconds: espera,
      headline: 'The engine is cooling down after two refunded attempts',
      // Sem número do servidor, a frase não inventa um.
      detail: espera === null
        ? 'Starting another one right now stops at this same place. Give it a few minutes.'
        : 'Starting another one right now stops at this same place. The button below unlocks by itself.',
      serverSaidRefunded: estornou,
    }
  }

  if (ehPrazoEstourado(reason)) {
    return {
      kind: 'deadline',
      // Prazo estourado é azar de uma tentativa: a próxima pode ir até o fim.
      retryWorks: 'yes',
      waitSeconds: null,
      headline: 'We stopped waiting on this render instead of leaving you hanging',
      detail: 'This one ran far longer than any video that finishes here. Starting again is worth it.',
      serverSaidRefunded: estornou,
    }
  }

  if (ehFornecedorOcupado(texto, http)) {
    return {
      kind: 'provider_busy',
      retryWorks: 'yes',
      waitSeconds: espera,
      headline: 'The video engine is busy — this is on our side, not your idea',
      detail: 'Nothing about your text is wrong. Trying again in a few minutes usually goes straight through.',
      serverSaidRefunded: estornou,
    }
  }

  return null
}
