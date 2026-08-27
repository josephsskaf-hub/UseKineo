// ═══ KINEO-353A.1-ORQUESTRACAO-DE-DESPACHO-2026-08-26 ══════════════════════
//
// POR QUE ESTE ARQUIVO EXISTE, E POR QUE ELE É IMPORTÁVEL
//
// O #353A escreveu a política de retry num módulo puro, testou 72 casos, e
// NÃO LIGOU NADA DISSO NO CAMINHO VIVO. Na rota, `submitToFal` transformava
// qualquer rejeição explícita em `null` e `submitScene` re-POSTava todo `null`
// depois de 800 ms — ou seja, 400, 401, 402, 403, 404 e 422 eram repetidos,
// apesar de `retry_safety` dizer "never" no módulo ao lado. O teste ficava
// verde e o produto seguia errado. Instrumentação que não governa o caminho
// executado é decoração.
//
// Então a orquestração saiu da rota e virou ESTE módulo, que:
//   · recebe a função de submissão POR PARÂMETRO (o teste injeta uma falsa e
//     exercita ESTA lógica, não uma cópia dela);
//   · tem UM dono de retry — `lib/falQueue`, que já respeita retry-after no
//     429. O retry de fora foi eliminado;
//   · trata i2v → t2v como TENTATIVA DE OUTRO MODELO, nunca como retry
//     escondido, e só depois de rejeição explícita (sem gasto);
//   · devolve UMA disposição final por cena planejada, com o índice REAL da
//     cena — não a ordem de conclusão das promises.
//
// TETO DE CHAMADAS AO FORNECEDOR, POR CENA (provado em teste):
//   sem imagem-âncora:  1 POST  (+1 só se 429, feito dentro do falQueue)
//   com imagem-âncora:  1 POST i2v + 1 POST t2v, cada um com o mesmo direito
//   ambíguo:            1 POST e para. NUNCA rePOST.
//   aceito:             1 POST e para. NUNCA rePOST.

import {
  accepted as cenaAceita,
  classifyProviderFailure,
  failed as cenaFalhou,
  notAttempted,
  type Disposition,
  type SceneOutcome,
} from './sceneDisposition'

/** O erro que `lib/falQueue` lança. Duck-typed para o módulo não depender dele. */
export interface ProviderSubmitError {
  ambiguous?: boolean
  status?: number | null
  message?: string
}

/**
 * Submissão de UMA tentativa. Resolve com o request id, ou lança um erro no
 * formato de `FalQueueSubmitError`. `onPost` conta POSTs reais.
 */
export type SubmitOnce = (
  model: string,
  onPost: () => void,
) => Promise<string>

/** Uma tentativa registrada — o histórico fica SEPARADO da disposição final. */
export interface AttemptRecord {
  model: string
  status: number | null
  ambiguous: boolean
  accepted: boolean
}

export interface SceneDispatch {
  /** UMA disposição final por cena. `scene_index` é o índice REAL da cena. */
  outcome: SceneOutcome
  requestId: string | null
  /** Modelo que efetivamente produziu o desfecho final. */
  model: string
  /** Histórico completo — nunca misturado ao resumo. */
  attempts: AttemptRecord[]
  /** POSTs reais, inclusive retry-after de 429 feito dentro de falQueue. */
  posts: number
}

function lerErro(e: unknown): ProviderSubmitError {
  const err = e as ProviderSubmitError
  return {
    ambiguous: err?.ambiguous === true,
    status: typeof err?.status === 'number' ? err.status : null,
    message: typeof err?.message === 'string' ? err.message : undefined,
  }
}

/**
 * Despacha UMA cena. `models` é a ordem de tentativa: para uma cena com
 * âncora é `[i2vModel, t2vModel]`; sem âncora, `[model]`.
 *
 * O segundo modelo só é tentado após REJEIÇÃO EXPLÍCITA do primeiro — nunca
 * após aceite (o job existe) e nunca após ambíguo (o job PODE existir, e um
 * segundo POST criaria cobrança dupla).
 */
export async function dispatchOneScene(args: {
  sceneIndex: number
  models: string[]
  submit: SubmitOnce
}): Promise<SceneDispatch> {
  const { sceneIndex, models, submit } = args
  const attempts: AttemptRecord[] = []
  let posts = 0
  const contar = () => { posts += 1 }

  if (models.length === 0) {
    return { outcome: notAttempted(sceneIndex, ''), requestId: null, model: '', attempts, posts }
  }

  let ultimo: SceneOutcome | null = null

  for (const model of models) {
    try {
      const id = await submit(model, contar)
      attempts.push({ model, status: 200, ambiguous: false, accepted: true })
      return {
        outcome: { ...cenaAceita(sceneIndex, model, posts), attempt_count: posts },
        requestId: id,
        model,
        attempts,
        posts,
      }
    } catch (e) {
      const err = lerErro(e)
      attempts.push({ model, status: err.status ?? null, ambiguous: err.ambiguous === true, accepted: false })
      const classe = classifyProviderFailure({
        status: err.status ?? null,
        ambiguous: err.ambiguous === true,
        message: err.message,
      })
      ultimo = {
        ...cenaFalhou({
          scene_index: sceneIndex,
          model,
          status: err.status ?? null,
          ambiguous: err.ambiguous === true,
          message: err.message,
        }),
        attempt_count: posts,
      }
      // AMBÍGUO É PAREDE. O job pode existir do outro lado; tentar outro
      // modelo aqui seria pagar duas vezes pela mesma cena.
      if (classe.disposition === 'ambiguous') break
      // Rejeição explícita: nada foi enfileirado, então tentar o PRÓXIMO
      // MODELO é seguro. Não é retry — é outro produto, e vai registrado como
      // tentativa própria, com o seu próprio modelo e status.
    }
  }

  return {
    outcome: ultimo ?? notAttempted(sceneIndex, models[0]),
    requestId: null,
    model: attempts[attempts.length - 1]?.model ?? models[0],
    attempts,
    posts,
  }
}

const SENSITIVE_VISUAL_TERMS = /\b(?:blood(?:y)?|gore|corpse|dead body|murder|kill(?:ing|ed)?|assassin(?:ate|ated|ation)?|shoot(?:ing|er|s)?|stab(?:bing|bed)?|suicide|torture|violent|violence|injur(?:y|ed)|abuse|weapon|gun|rifle|pistol|knife|bomb|explosive|explosion|missile|nuclear|attack|battle|war|warfare|terror(?:ism|ist)?|nude|nudity|naked|sexual|porn(?:ography)?|rape|cocaine|heroin|meth(?:amphetamine)?|drug use)\b/gi

/**
 * Fallback visual determinístico. Nunca recebe narração nem chama outro modelo:
 * reduz o contexto visual a uma dica curta e neutra, e remove termos que mais
 * frequentemente acionam moderação. O teto também elimina 400/422 por prompt
 * excessivo. É deliberadamente menos específico que o primeiro prompt.
 */
export function buildContextualSafeVisualPrompt(rawVisualContext: string): string {
  const context = (rawVisualContext || '')
    .normalize('NFKC')
    .replace(/https?:\/\/\S+|www\.\S+|\S+@\S+/gi, ' ')
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(SENSITIVE_VISUAL_TERMS, 'event')
    .replace(/[^\p{L}\p{N}\s,.'-]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .slice(0, 24)
    .join(' ')

  const subject = context || 'the story topic'
  return (
    `Family-safe neutral cinematic documentary b-roll representing ${subject}. ` +
    'Show only an empty environment, ordinary objects, architecture, landscape, light and weather. ' +
    'No people, faces, identities or readable text. Calm photorealistic establishing shot, smooth camera motion, 9:16 vertical.'
  )
}

/**
 * O compositor padrão consegue preencher a duração inteira repetindo os
 * clipes aceitos. Portanto o lote clássico só é irrecuperável quando nenhum
 * request id existe; cobertura abaixo de 50% é degradação, não falha técnica.
 */
export function hasRenderableClassicScene(requestIds: Array<string | null>): boolean {
  return requestIds.some((requestId) => typeof requestId === 'string' && requestId.length > 0)
}

export type SubmitVisualOnce = (
  model: string,
  visualPrompt: string,
  onPost: () => void,
) => Promise<string>

/**
 * Uma única segunda chance com prompt visual neutro, apenas depois de uma
 * recusa explícita de moderação/payload. Aceite e ambiguidade são terminais;
 * a segunda chance usa só o modelo final, portanto acrescenta no máximo um
 * POST desta camada (o retry de 429 continua pertencendo ao falQueue).
 */
export async function dispatchOneSceneWithSafeVisualRetry(args: {
  sceneIndex: number
  models: string[]
  visualPrompt: string
  safeVisualPrompt: string
  submit: SubmitVisualOnce
}): Promise<SceneDispatch> {
  const first = await dispatchOneScene({
    sceneIndex: args.sceneIndex,
    models: args.models,
    submit: (model, onPost) => args.submit(model, args.visualPrompt, onPost),
  })

  const retryableReason = first.outcome.reason_class === 'provider_moderation'
    || first.outcome.reason_class === 'invalid_payload'
  const safePrompt = args.safeVisualPrompt.trim()
  if (
    first.requestId !== null
    || first.outcome.disposition !== 'explicit_reject'
    || !retryableReason
    || !safePrompt
    || safePrompt === args.visualPrompt.trim()
    || !first.model
  ) {
    return first
  }

  const second = await dispatchOneScene({
    sceneIndex: args.sceneIndex,
    models: [first.model],
    submit: (model, onPost) => args.submit(model, safePrompt, onPost),
  })
  const posts = first.posts + second.posts
  return {
    ...second,
    outcome: { ...second.outcome, attempt_count: posts },
    attempts: [...first.attempts, ...second.attempts],
    posts,
  }
}

export interface DispatchPlanResult {
  /** Exatamente `planned` disposições, na ordem das cenas. */
  outcomes: SceneOutcome[]
  /** Index-alinhado com `outcomes`. */
  requestIds: (string | null)[]
  models: string[]
  attempts: AttemptRecord[][]
  /** POSTs reais ao fornecedor, somados. Campo SEPARADO de `attempted`. */
  totalPosts: number
}

/**
 * Constrói o vetor final de um plano inteiro, garantindo o invariante:
 *
 *     accepted + rejected + ambiguous + not_attempted === planned
 *
 * Cenas que nunca foram tentadas (orçamento, aborto após ambiguidade) entram
 * como `not_attempted` — nunca somem, nunca viram cena fantasma.
 */
export function montarPlano(
  planned: number,
  modeloPadrao: string,
  resultados: Map<number, SceneDispatch>,
): DispatchPlanResult {
  const outcomes: SceneOutcome[] = []
  const requestIds: (string | null)[] = []
  const models: string[] = []
  const attempts: AttemptRecord[][] = []
  let totalPosts = 0

  for (let i = 0; i < planned; i++) {
    const r = resultados.get(i)
    if (r) {
      outcomes.push(r.outcome)
      requestIds.push(r.requestId)
      models.push(r.model || modeloPadrao)
      attempts.push(r.attempts)
      totalPosts += r.posts
    } else {
      outcomes.push(notAttempted(i, modeloPadrao))
      requestIds.push(null)
      models.push(modeloPadrao)
      attempts.push([])
    }
  }
  return { outcomes, requestIds, models, attempts, totalPosts }
}

/**
 * Resumo derivado SOMENTE das disposições finais. O #353A usava `find()` para
 * pegar `reason_class` de uma cena e `provider_http_status` de outra — dois
 * campos de cenas diferentes na mesma linha de telemetria, o que é pior que
 * não ter campo nenhum.
 */
export interface PlanSummary {
  planned: number
  attempted: number
  accepted: number
  rejected: number
  ambiguous: number
  not_attempted: number
  total_posts: number
  /** Histograma de classes, sanitizado. Nunca uma classe "representante". */
  reason_histogram: Record<string, number>
  /** Histograma de status do fornecedor. */
  provider_status_histogram: Record<string, number>
}

export function resumirPlano(plano: DispatchPlanResult): PlanSummary {
  const conta = (d: Disposition) => plano.outcomes.filter((o) => o.disposition === d).length
  const reason_histogram: Record<string, number> = {}
  const provider_status_histogram: Record<string, number> = {}
  for (const o of plano.outcomes) {
    reason_histogram[o.reason_class] = (reason_histogram[o.reason_class] ?? 0) + 1
  }
  for (const lista of plano.attempts) {
    for (const a of lista) {
      const k = a.accepted ? '200' : String(a.status ?? 'none')
      provider_status_histogram[k] = (provider_status_histogram[k] ?? 0) + 1
    }
  }
  const not_attempted = conta('not_attempted')
  return {
    planned: plano.outcomes.length,
    // "attempted" = cenas ÚNICAS com pelo menos um POST.
    attempted: plano.attempts.filter((a) => a.length > 0).length,
    accepted: conta('accepted'),
    rejected: conta('explicit_reject') + conta('terminal_failed'),
    ambiguous: conta('ambiguous'),
    not_attempted,
    total_posts: plano.totalPosts,
    reason_histogram,
    provider_status_histogram,
  }
}

/** O invariante, exposto para o teste e para o chamador. */
export function invarianteFecha(s: PlanSummary): boolean {
  return s.accepted + s.rejected + s.ambiguous + s.not_attempted === s.planned
}
