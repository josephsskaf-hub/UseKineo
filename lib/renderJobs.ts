// ═══ KINEO-RENDER-CONDUZIDO-PELO-SERVIDOR-2026-09-18 — o Generate grava o pedido antes de qualquer coisa ═══
//
// CASO (18/09 23:04 BRT, Axel, Bélgica, veio pelo ChatGPT na página do Veo): pagou Creator, a página de sucesso
// ligou um filme, ele saiu da aba 2 segundos depois. A cadeia do Kineo 1 corre do NAVEGADOR: análise → clipes
// (/api/generate-video-fast) → montagem (/api/compose); cada passo só começa quando o anterior responde à aba.
// Com a aba fechada antes de /api/generate-video-fast, NADA chega ao servidor: zero cenas, zero claim, zero
// filme, zero e-mail — e para a pessoa "fiz um vídeo e não recebi". O resgate finish-stranded-renders só pega
// quem chegou à montagem (fast_compose_recoverable / claim). Fundador: "Vai nos 2" (render conduzido pelo servidor).
//
// DESENHO (mínimo que fecha o buraco sem trocar a arquitetura):
//   1. No clique em Generate (Kineo 1), o navegador grava `render_job_opened` (session_id = attempt_id) com o
//      pedido inteiro: prompt, duração, língua, formato, modo de roteiro. keepalive: sobrevive ao fechar da aba.
//   2. O caminho normal continua idêntico (aba aberta = mesmo fluxo, mesma velocidade).
//   3. O cron finish-orphan-jobs (a cada 10 min) procura pedidos com ≥ ORPHAN_MIN_AGE_MS sem NENHUM progresso do
//      servidor para aquela conta depois do pedido (fast_scene_plan / compose_submission_claim), sem pedido mais
//      novo da mesma conta, e ainda não tomados. Marca `render_job_taken` e chama /api/generate-video-fast EM
//      PROCESSO no modo serviço (o mesmo Bearer CRON_SECRET + x-kineo-service-user do compose). A rota cobra,
//      busca os clipes e grava fast_compose_recoverable — e o finish-stranded-renders (15 min) monta e manda o
//      e-mail "Your film is ready", como já faz hoje para quem morreu na montagem.
//   Custo: nada novo; o filme que a pessoa pediu e pagou é feito uma vez. Teto de MAX_JOBS_PER_RUN por rodada.

export const RENDER_JOB_OPENED_EVENT = 'render_job_opened'
export const RENDER_JOB_TAKEN_EVENT = 'render_job_taken'
export const RENDER_JOB_FINISHED_EVENT = 'render_job_finished'
export const RENDER_JOB_VERSION = 'render_job_v1'

/** Sem progresso do servidor por este tempo = a aba morreu (um Kineo 1 normal chega aos clipes em ~50 s). */
export const ORPHAN_MIN_AGE_MS = 4 * 60 * 1000
/** Mais velho que isto não se termina sozinho: a pessoa provavelmente já fez outro ou desistiu. */
export const ORPHAN_MAX_AGE_MS = 6 * 60 * 60 * 1000
export const MAX_JOBS_PER_RUN = 2
// KINEO-PORTA-FORMATO-2026-09-24 — o mesmo teto de entrada do Studio e da rota no modo em que a IA reescreve
// (lib/analyzeLimits ANALYZE_PROMPT_MAX_CHARS_SOURCE = 20000). Literal de propósito: este módulo é lido cru por
// guardiões e não ganha import; o guardião test-porta-formato-colado confere a igualdade.
export const RENDER_JOB_PROMPT_MAX = 20000

export const RENDER_JOB_DURATIONS = [15, 35, 60, 90] as const
export type RenderJobPayload = {
  attempt_id: string
  engine: 'fast'
  prompt: string
  duration: number
  language: string
  aspect: string
  script_mode: 'ai' | 'verbatim'
}

const UUID = /^[0-9a-f-]{36}$/i

/** Valida o corpo que o navegador manda. Devolve null para qualquer coisa fora do contrato — a rota responde 400. */
export function sanitizeRenderJobPayload(body: unknown): RenderJobPayload | null {
  if (!body || typeof body !== 'object') return null
  const b = body as Record<string, unknown>
  const attempt = typeof b.attempt_id === 'string' ? b.attempt_id.trim() : ''
  if (!UUID.test(attempt)) return null
  if (b.engine !== 'fast') return null
  const prompt = typeof b.prompt === 'string' ? b.prompt.trim() : ''
  if (!prompt || prompt.length > RENDER_JOB_PROMPT_MAX) return null
  const duration = Number(b.duration)
  if (!(RENDER_JOB_DURATIONS as readonly number[]).includes(duration)) return null
  const language = typeof b.language === 'string' && /^[a-z]{2}$/.test(b.language) ? b.language : 'en'
  const aspect = typeof b.aspect === 'string' && /^\d{1,2}:\d{1,2}$/.test(b.aspect) ? b.aspect : '9:16'
  const script_mode = b.script_mode === 'verbatim' ? 'verbatim' : 'ai'
  return { attempt_id: attempt, engine: 'fast', prompt, duration, language, aspect, script_mode }
}

export type OrphanReason =
  | 'too_young'
  | 'too_old'
  | 'already_taken'
  | 'server_progressed'
  | 'newer_job'
  | 'orphan'

export function decideOrphanJob(input: {
  openedAtMs: number
  nowMs: number
  taken: boolean
  /** fast_scene_plan / compose_submission_claim / video_generation_completed da MESMA conta depois do pedido */
  serverProgressAfter: boolean
  /** outro render_job_opened da mesma conta depois deste */
  newerJob: boolean
}): { orphan: boolean; reason: OrphanReason } {
  const age = input.nowMs - input.openedAtMs
  if (age < ORPHAN_MIN_AGE_MS) return { orphan: false, reason: 'too_young' }
  if (age > ORPHAN_MAX_AGE_MS) return { orphan: false, reason: 'too_old' }
  if (input.taken) return { orphan: false, reason: 'already_taken' }
  if (input.serverProgressAfter) return { orphan: false, reason: 'server_progressed' }
  if (input.newerJob) return { orphan: false, reason: 'newer_job' }
  return { orphan: true, reason: 'orphan' }
}

/** O corpo que o cron manda a /api/generate-video-fast: só o que a rota entende, nada do navegador. */
export function fastRequestFromJob(job: RenderJobPayload): Record<string, unknown> {
  return {
    prompt: job.prompt,
    duration: job.duration,
    language: job.language,
    ...(job.aspect !== '9:16' ? { aspect: job.aspect } : {}),
    ...(job.script_mode === 'verbatim' ? { script_mode: 'verbatim' } : {}),
    orphan_job: true,
  }
}
