// ═══ KINEO-REMIX-PAGINAS-3110 — o filme compartilhado vira "faça a sua versão" com UM clique ═══════════════════════
//
// A página pública /v/<id> (só existe com o consentimento do dono: videos.published_at) já pedia "Make your own
// version", mas o botão levava a /signup?prompt=<título> e três coisas se perdiam no caminho:
//   1. quem JÁ tinha conta caía no /dashboard (o middleware manda o logado do /signup para o ?redirect=, e não havia
//      redirect) — a ideia do filme sumia;
//   2. o motor e a duração do filme que a pessoa acabou de ver não iam junto (o Studio abria no padrão);
//   3. nada ligava a conta nova ao filme de origem — o laço viral não tinha placar.
// Este módulo é a fonte única do caminho: o destino é o Studio já preenchido (o mesmo contrato ?prompt=&engine=
// &duration=&intent_campaign= que o StudioClient lê e valida), e o filme de origem viaja como utm_content (UUID,
// passa pelo filtro de atribuição do cadastro e pela régua lib/growth/ideiaPousaNoStudio.ts sem tocar em nada).
//
// Privacidade: só entra o que a página pública JÁ mostra (o título) mais motor e duração — nunca `prompt`/`script`
// da linha, que a allow-list de lib/publicVideos.ts proíbe.
//
// Puro, sem imports: roda no guardião scripts/test-remix-paginas-3110.mjs.

export const REMIX_PAGINAS_3110_VERSION = 'remix_paginas_3110' as const
/** A mesma campanha que o botão principal da /v/ já usava — os painéis de funil continuam somando. */
export const REMIX_CAMPAIGN = 'public_video_remake' as const
export const REMIX_TITLE_MAX_CHARS = 160
/** Conta criada há no máximo isto (minutos) conta como remix_signup; quem já tinha conta só gera remix_clicked. */
export const REMIX_SIGNUP_WINDOW_MIN = 60

export type RemixEngine = 'seedance' | 'hollywood'
export type RemixDuration = 15 | 35 | 60 | 90

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function remixSourceVideoId(value: string | null | undefined): string | null {
  const v = (value ?? '').trim()
  return UUID.test(v) ? v.toLowerCase() : null
}

/**
 * `videos.engine_used` → a chave do motor no Studio. Só os valores que o servidor de fato grava (compose/status):
 * 'kling4' é o motor da estrada hollywood (Kling 4.0); 'seedance15_fallback' é o Seedance 1.5. Qualquer outra coisa
 * (a imensa maioria das linhas é null) não chuta motor: o Studio abre no padrão dele.
 */
export function remixEngineFromEngineUsed(engineUsed: string | null | undefined): RemixEngine | null {
  const e = (engineUsed ?? '').trim().toLowerCase()
  if (e === 'kling4') return 'hollywood'
  if (e === 'seedance15_fallback') return 'seedance'
  return null
}

/** Nome honesto do motor para o selo "Made with Kineo" (null = sem selo de motor). */
export function remixEngineLabel(engineUsed: string | null | undefined): string | null {
  const e = (engineUsed ?? '').trim().toLowerCase()
  if (e === 'kling4') return 'Kling 4.0'
  if (e === 'seedance15_fallback') return 'Seedance 1.5'
  return null
}

/**
 * Duração real do arquivo → o alvo que o Studio oferece. 35/60/90 valem em todo motor; 15 só no Seedance (mesma
 * regra do StudioClient). Um filme de 39 s nasceu de um alvo de 35 (a régua é norte: passar do alvo é normal).
 */
export function remixDurationFrom(seconds: number | null | undefined, engine: RemixEngine | null): RemixDuration | null {
  const s = Number(seconds)
  if (!Number.isFinite(s) || s <= 0) return null
  if (s <= 22 && engine === 'seedance') return 15
  if (s <= 47) return 35
  if (s <= 75) return 60
  return 90
}

export interface RemixInput {
  title: string
  sourceVideoId: string
  engineUsed?: string | null
  durationSeconds?: number | null
}

function cleanTitle(title: string): string {
  return (title ?? '').replace(/\s+/g, ' ').trim().slice(0, REMIX_TITLE_MAX_CHARS)
}

function attribution(sourceVideoId: string | null): Array<[string, string]> {
  const pairs: Array<[string, string]> = [
    ['intent_campaign', REMIX_CAMPAIGN],
    ['utm_source', 'public_video'],
    ['utm_medium', 'share'],
    ['utm_campaign', REMIX_CAMPAIGN],
  ]
  if (sourceVideoId) pairs.push(['utm_content', sourceVideoId])
  return pairs
}

/** O Studio já preenchido com a ideia, o motor e a duração do filme de origem. */
export function buildRemixStudioPath(input: RemixInput): string {
  const engine = remixEngineFromEngineUsed(input.engineUsed)
  const duration = remixDurationFrom(input.durationSeconds, engine)
  const q = new URLSearchParams()
  const title = cleanTitle(input.title)
  if (title) q.set('prompt', title)
  if (engine) q.set('engine', engine)
  if (duration) q.set('duration', String(duration))
  for (const [k, v] of attribution(remixSourceVideoId(input.sourceVideoId))) q.set(k, v)
  return `/studio?${q.toString()}`
}

/**
 * O botão da página pública. Sem conta: o cadastro (com a ideia salva na tela e a atribuição) e, depois dele, o
 * Studio preenchido (?redirect= — mesmo destino interno que o cadastro e o callback já validam). Com conta: o
 * middleware vê a sessão no /signup e manda direto para o ?redirect= — o Studio preenchido, sem passar pelo cadastro.
 */
export function buildRemixHref(input: RemixInput): string {
  const q = new URLSearchParams()
  const title = cleanTitle(input.title)
  if (title) q.set('prompt', title)
  for (const [k, v] of attribution(remixSourceVideoId(input.sourceVideoId))) q.set(k, v)
  q.set('redirect', buildRemixStudioPath(input))
  return `/signup?${q.toString()}`
}

/**
 * Da URL de chegada no Studio (o destino do cadastro), o filme que originou a conta — ou null.
 * Exige a campanha do remix E um UUID em utm_content: nenhuma outra campanha vira "remix_signup".
 */
export function remixSourceFromDestination(params: Pick<URLSearchParams, 'get'>): string | null {
  if ((params.get('intent_campaign') ?? '').trim() !== REMIX_CAMPAIGN) return null
  return remixSourceVideoId(params.get('utm_content'))
}
