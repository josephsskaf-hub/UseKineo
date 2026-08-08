import { FAL_SUBMIT_RATE_LIMIT, rateLimitWaitMs, sleep } from '@/lib/rateLimit'

/**
 * A paid Fal queue submission must be sent exactly once. The SDK may retry
 * POSTs after a transport/gateway failure even though Fal accepted the first
 * request, which can create duplicate billable jobs. This helper deliberately
 * performs one raw POST and tells durable callers whether a failure is
 * ambiguous (the job may exist) or an explicit rejection (safe to close).
 */
export class FalQueueSubmitError extends Error {
  readonly ambiguous: boolean
  readonly status: number | null
  readonly providerBody: unknown

  constructor(message: string, options: {
    ambiguous: boolean
    status?: number | null
    providerBody?: unknown
    cause?: unknown
  }) {
    super(message, options.cause === undefined ? undefined : { cause: options.cause })
    this.name = 'FalQueueSubmitError'
    this.ambiguous = options.ambiguous
    this.status = options.status ?? null
    this.providerBody = options.providerBody
  }
}

export async function submitFalQueueOnce(
  model: string,
  input: Record<string, unknown>,
): Promise<string> {
  const key = process.env.FAL_KEY
  if (!key) {
    throw new FalQueueSubmitError('FAL_KEY is not configured', { ambiguous: false })
  }

  // KINEO-CREDIT-STUCK-2026-08-08 — 429 é o ÚNICO status repetido aqui.
  // O contrato "exactly once" desta função continua intacto: 429 significa que
  // o fal recusou o pedido (nada foi enfileirado, nada foi cobrado), então o
  // POST seguinte não pode criar um job duplicado. Falha de transporte e 5xx
  // seguem AMBÍGUAS e NUNCA são repetidas — é o caso em que o fal pode ter
  // aceitado sem conseguir responder.
  //
  // ⚠️ O ORÇAMENTO AQUI É MÍNIMO POR CAUSA DE UMA RETENTATIVA QUE JÁ EXISTE
  // POR FORA: `submitScene` em app/api/generate-video-cinematic/route.ts repete
  // a submissão uma vez após 800ms quando o id volta null. As duas camadas se
  // multiplicam, e a rota tem `maxDuration = 60` com um caminho SERIAL de até 9
  // cenas — um teto generoso aqui viraria timeout de lambda com o débito vivo,
  // que é exatamente o defeito que este commit fecha. Ver FAL_SUBMIT_RATE_LIMIT.
  const policy = FAL_SUBMIT_RATE_LIMIT
  let attempt = 0
  let response: Response
  let raw = ''
  let payload: Record<string, unknown> = {}

  for (;;) {
    try {
      response = await fetch(`https://queue.fal.run/${model}`, {
        method: 'POST',
        headers: {
          Authorization: `Key ${key}`,
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(input),
        cache: 'no-store',
      })
    } catch (error) {
      throw new FalQueueSubmitError('Fal queue submit transport failed', {
        ambiguous: true,
        cause: error,
      })
    }

    raw = await response.text().catch(() => '')
    payload = {}
    try {
      payload = raw ? JSON.parse(raw) as Record<string, unknown> : {}
    } catch {
      payload = {}
    }

    if (response.status !== 429 || attempt >= policy.retries) break

    attempt += 1
    const waitMs = rateLimitWaitMs(policy, attempt, response.headers.get('retry-after'))
    console.warn(
      `[fal/queue] 429 em ${model} — tentativa ${attempt}/${policy.retries} em ${waitMs}ms ` +
      '(rate limit e transiente; o pedido NAO foi enfileirado)',
    )
    await sleep(waitMs)
  }

  if (!response.ok) {
    const detail = typeof payload.detail === 'string'
      ? payload.detail
      : typeof payload.error === 'string'
        ? payload.error
        : raw.slice(0, 300)
    const ambiguous = response.status === 408 || response.status >= 500
    throw new FalQueueSubmitError(
      `Fal queue rejected submit (${response.status})${detail ? `: ${detail}` : ''}`,
      {
        ambiguous,
        status: response.status,
        providerBody: payload,
      },
    )
  }

  const requestId = typeof payload.request_id === 'string' ? payload.request_id.trim() : ''
  if (!requestId) {
    throw new FalQueueSubmitError('Fal queue response had no request id', {
      ambiguous: true,
      status: response.status,
      providerBody: payload,
    })
  }
  return requestId
}
