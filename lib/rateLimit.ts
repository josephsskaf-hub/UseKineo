// KINEO-CREDIT-STUCK-2026-08-08 — 429 é TRANSIENTE, não é veredito.
//
// O BURACO: `submitFalQueueOnce` (lib/falQueue.ts) e `submitCreatomateRender`
// (lib/compose.ts) classificavam a falha de submissão assim:
//     ambiguous = status === 408 || status >= 500
// Ou seja: **429 caía no ramo "rejeição explícita"** — o mesmo tratamento de um
// 400 (payload inválido) ou de um 401 (chave errada). Num pico do TAAFT é
// exatamente o status que os dois provedores mais devolvem, e a consequência é a
// pior possível para o cliente: o pedido morre com "Render service rejected the
// job" sem NENHUMA espera, porque o provedor estava ocupado por um segundo.
//
// POR QUE REPETIR UM 429 É SEGURO (e um 5xx não é): 429 é o provedor dizendo
// explicitamente que **não aceitou** o pedido — não há job enfileirado nem
// cobrado, então o POST seguinte não pode criar um segundo job pago. Já um
// 5xx/408/timeout é AMBÍGUO (pode ter sido aceito sem conseguir responder) e por
// isso continua sem NENHUMA retentativa nos dois arquivos.
//
// ─────────────────────────────────────────────────────────────────────────────
// POR QUE DUAS POLÍTICAS, E NÃO UMA CONSTANTE COMPARTILHADA
// ─────────────────────────────────────────────────────────────────────────────
// A primeira versão desta correção usava um único teto (2 retentativas, espera
// de até 6s) nos dois provedores. **A revisão adversarial derrubou**, porque o
// caminho do fal JÁ TEM UMA RETENTATIVA POR FORA:
//
//   app/api/generate-video-cinematic/route.ts, `submitScene`:
//     let id = await submitToFal(...)
//     if (id === null) {            // rejeição explícita — hoje inclui 429
//       await new Promise((r) => setTimeout(r, 800))
//       id = await submitToFal(...)  // "One real retry after a short backoff
//     }                              //  clears a transient burst/rate-limit 4xx"
//
// Com um teto interno generoso, as duas camadas se MULTIPLICAM: até 6 POSTs e
// ~25s por cena. Na rota cinematográfica isso é fatal — `maxDuration = 60`, o
// caminho do Kling é SERIAL (9 cenas com stagger de 450ms) e o do Seedance/Veo
// roda em lotes de 3. Um pico de 429 deixaria de ser "vídeo falhou e crédito
// voltou na hora" e viraria **timeout da lambda com o débito vivo** — ou seja,
// o commit que existe para não prender crédito passaria a prender crédito.
//
// Daí os dois orçamentos abaixo. Eles são deliberadamente assimétricos.
// ─────────────────────────────────────────────────────────────────────────────

export interface RateLimitPolicy {
  /** Quantas novas tentativas além da primeira. */
  readonly retries: number
  /** Teto para a espera, inclusive quando o provedor manda `Retry-After` maior. */
  readonly maxWaitMs: number
  /** Espera por tentativa quando não vem `Retry-After` (índice = tentativa-1). */
  readonly backoffMs: readonly number[]
}

/**
 * fal — orçamento MÍNIMO, de propósito.
 *
 * Uma retentativa e no máximo 1s de espera. Pior caso adicionado por cena:
 * 2 chamadas (a de fora já existia) × 1s = 2s; no caminho serial de 9 cenas,
 * ~18s sobre os ~22s atuais — dentro de `maxDuration = 60` com folga. No
 * caminho paralelo (Seedance/Veo, os únicos alcançáveis no trial) são 3 lotes,
 * ou seja ~6s no total.
 *
 * O valor real que isto agrega sobre a retentativa já existente é honrar
 * `Retry-After` e distinguir 429 de "rejeitado de verdade" no log. Quando o
 * provedor pede mais que 1s, não dá para honrar dentro da lambda — a retentativa
 * externa de 800ms dá a segunda chance, e se ainda assim falhar o caminho de
 * falha estorna, que é o comportamento correto.
 */
export const FAL_SUBMIT_RATE_LIMIT: RateLimitPolicy = {
  retries: 1,
  maxWaitMs: 1_000,
  backoffMs: [600],
}

/**
 * Creatomate — orçamento MAIOR, porque aqui não há retentativa por fora.
 *
 * `app/api/compose/route.ts` tem `maxDuration = 300` e faz UM submit por render,
 * e uma rejeição explícita solta o claim e devolve 502 direto para a tela. É o
 * provedor que entra em TODO render (Fast ou IA), logo é o gargalo real do pico:
 * gastar até ~4s esperando é infinitamente mais barato que matar o vídeo.
 */
export const CREATOMATE_SUBMIT_RATE_LIMIT: RateLimitPolicy = {
  retries: 2,
  maxWaitMs: 4_000,
  backoffMs: [1_000, 3_000],
}

/**
 * `Retry-After` vem em segundos (`120`) ou como HTTP-date
 * (`Wed, 21 Oct 2015 07:28:00 GMT`) — RFC 9110 §10.2.3. Devolve null quando
 * ausente/ilegível, e o chamador cai no backoff padrão da política.
 * O resultado é sempre limitado por `policy.maxWaitMs`.
 */
export function parseRetryAfterMs(
  headerValue: string | null,
  policy: RateLimitPolicy,
): number | null {
  const raw = (headerValue ?? '').trim()
  if (!raw) return null

  // delta-seconds
  if (/^\d+$/.test(raw)) {
    const seconds = Number(raw)
    if (!Number.isFinite(seconds) || seconds < 0) return null
    return Math.min(seconds * 1_000, policy.maxWaitMs)
  }

  // HTTP-date
  const when = Date.parse(raw)
  if (Number.isNaN(when)) return null
  const delta = when - Date.now()
  if (delta <= 0) return 0
  return Math.min(delta, policy.maxWaitMs)
}

/** Quanto esperar antes da tentativa `attempt` (1-based) depois de um 429. */
export function rateLimitWaitMs(
  policy: RateLimitPolicy,
  attempt: number,
  headerValue: string | null,
): number {
  const fromHeader = parseRetryAfterMs(headerValue, policy)
  if (fromHeader !== null) return fromHeader
  const index = Math.min(Math.max(attempt, 1), policy.backoffMs.length) - 1
  return Math.min(policy.backoffMs[index], policy.maxWaitMs)
}

export function sleep(ms: number): Promise<void> {
  if (!(ms > 0)) return Promise.resolve()
  return new Promise((resolve) => setTimeout(resolve, ms))
}
