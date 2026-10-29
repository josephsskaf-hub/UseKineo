import { createHash, createHmac, timingSafeEqual } from 'node:crypto'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  COMPOSE_CLAIM_EVENT,
  COMPOSE_CLAIM_PATH,
  composeClaimId,
  validComposeGenerationId,
  verifyComposeClaim,
} from '@/lib/composeClaim'

export const CINEMATIC_CLAIM_EVENT = 'cinematic_submission_claim'
export const CINEMATIC_CLAIM_PATH = '/api/generate-video-cinematic'
export const CINEMATIC_COST_DRIFT_EVENT = 'cinematic_cost_drift'

// KINEO-BILLING-MISMATCH-2026-09-03 — as razoes terminais de estorno que a
// PRODUCAO realmente emite num claim de nascimento `released`. O regex antigo
// conhecia 3 (`provider_(all_failed|failed|abandoned)_refunded`); o banco tem 7
// (docs/BILLING-MISMATCH-2026-09-03.md secao 5). Toda razao de fora caia no
// mesmo 503 eterno de `/api/compose/status`, com as cenas ja pagas na fal e o
// dinheiro ja devolvido ao cliente — filme jogado fora sem nenhum risco
// financeiro do outro lado. Lista explicita (nunca `/_refunded$/` solto) para
// que uma razao nova precise de decisao humana antes de liberar entrega.
export const CINEMATIC_DELIVERABLE_REFUND_REASONS: ReadonlySet<string> = new Set([
  'provider_all_failed_refunded',
  'provider_failed_refunded',
  'provider_abandoned_refunded',
  'provider_rejected_refunded',
  'provider_balance_rejected_refunded',
  'explicit_pre_provider_failure_refunded',
  'stale_pending_refunded',
  'narration_too_short_no_charge_refunded',
  'dry_run_no_charge_refunded',
])

export type CinematicClaimStatus = 'pending' | 'done' | 'settled' | 'released'

export type CinematicCompletedUrl = string | null
export type CinematicRequestId = string | null
export type CinematicTerminalFailure = { requestId: string; model: string }

export interface CinematicClaimAuthority {
  claimId: string
  userId: string
  generationId: string
  status: CinematicClaimStatus
  fingerprint: string
  creditCost: number
  quality: string
  engine: string
  falRequestIds: CinematicRequestId[]
  falModels: string[]
  authorizedCompletedUrls: CinematicCompletedUrl[]
  responseHash?: string
  resolutionReason?: string
  resolutionReference?: string
}

export interface CinematicClaim {
  id: string
  userId: string
  generationId: string
  status: CinematicClaimStatus
  fingerprint: string
  creditCost: number
  quality: string
  engine: string
  falRequestIds: CinematicRequestId[]
  falModels: string[]
  authorizedCompletedUrls: CinematicCompletedUrl[]
  response: Record<string, unknown> | null
  responseHash: string
  resolutionReason: string
  resolutionReference: string
  startedAt: string
  completedAt: string
  resolvedAt: string
  authority: string
}

type CinematicClaimRow = {
  id?: unknown
  name?: unknown
  user_id?: unknown
  path?: unknown
  session_id?: unknown
  metadata?: unknown
  created_at?: unknown
}

export type CinematicClaimValidation =
  | { ok: true; claim: CinematicClaim }
  | { ok: false; error: string }

export type CinematicClaimLoad =
  | { ok: true; claim: CinematicClaim | null }
  | { ok: false; error: string }

export type CinematicRenderClaimLoad =
  | { ok: true; claim: CinematicClaim | null }
  | { ok: false; error: string }

export type CinematicClaimAcquire =
  | { kind: 'acquired'; claim: CinematicClaim }
  | { kind: 'pending'; claim: CinematicClaim }
  | { kind: 'replay'; claim: CinematicClaim; response: Record<string, unknown> }
  | { kind: 'released'; claim: CinematicClaim }
  | { kind: 'conflict'; error: string }
  | { kind: 'error'; error: string }

export type CinematicClaimMutation =
  | { ok: true; claim: CinematicClaim }
  | { ok: false; error: string; conflict?: boolean }

function deterministicUuid(namespace: string, ...parts: string[]): string {
  const hex = createHash('sha256')
    .update([namespace, ...parts].join(':'))
    .digest('hex')
    .slice(0, 32)
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`
}

export function cinematicClaimId(userId: string, generationId: string): string {
  return deterministicUuid('kineo:cinematic-submission:v1', userId, generationId)
}

export function validCinematicGenerationId(value: unknown): value is string {
  return typeof value === 'string' && /^[A-Za-z0-9_-]{8,100}$/.test(value)
}

function stableJson(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'null'
  if (Array.isArray(value)) return `[${value.map((item) => stableJson(item)).join(',')}]`
  const record = value as Record<string, unknown>
  return `{${Object.keys(record)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableJson(record[key])}`)
    .join(',')}}`
}

export function cinematicValueHash(value: unknown): string {
  return createHash('sha256').update(stableJson(value)).digest('hex')
}

/** Hash the complete, normalized client intent before any paid provider call. */
export function cinematicRequestFingerprint(value: unknown): string {
  return cinematicValueHash(value)
}

function authorityPayload(input: CinematicClaimAuthority): string {
  return stableJson([
    'kineo-cinematic-authority-v1',
    input.claimId,
    input.userId,
    input.generationId,
    input.status,
    input.fingerprint,
    input.creditCost,
    input.quality,
    input.engine,
    input.falRequestIds,
    input.falModels,
    input.authorizedCompletedUrls,
    input.responseHash ?? '',
    input.resolutionReason ?? '',
    input.resolutionReference ?? '',
    CINEMATIC_CLAIM_PATH,
  ])
}

export function signCinematicClaim(secret: string, input: CinematicClaimAuthority): string {
  return createHmac('sha256', secret).update(authorityPayload(input)).digest('hex')
}

export function verifyCinematicClaim(
  secret: string,
  input: CinematicClaimAuthority,
  signature: unknown,
): boolean {
  if (typeof signature !== 'string' || !/^[a-f0-9]{64}$/i.test(signature)) return false
  const expected = signCinematicClaim(secret, input)
  try {
    return timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(signature, 'hex'))
  } catch {
    return false
  }
}

function isHash(value: unknown): value is string {
  return typeof value === 'string' && /^[a-f0-9]{64}$/i.test(value)
}

export const KLING4_PROMO_CLAIM_ENGINE = 'kling4-promo-v1'

/** Zero is reserved for a service-authorized, signed Kling4 promotion claim. */
export function isKling4PromoCinematicClaim(claim: { creditCost: unknown; quality: unknown; engine: unknown }): boolean {
  return claim.creditCost === 0 && claim.quality === 'cinematic_hollywood' && claim.engine === KLING4_PROMO_CLAIM_ENGINE
}

function validCreditCost(value: unknown, quality?: unknown, engine?: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value <= 1000 &&
    (value > 0 || isKling4PromoCinematicClaim({ creditCost: value, quality, engine }))
}

function validQuality(value: unknown): value is string {
  return typeof value === 'string' && /^[a-z0-9_-]{2,80}$/i.test(value)
}

function validEngine(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= 240 && /^[a-z0-9._:/-]+$/i.test(value)
}

function validRequestId(value: unknown): value is CinematicRequestId {
  return value === null || (typeof value === 'string' && value.length > 0 && value.length <= 512)
}

function validModel(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= 300 && /^[a-z0-9._:/-]+$/i.test(value)
}

function validCompletedUrl(value: unknown): value is CinematicCompletedUrl {
  if (value === null) return true
  if (typeof value !== 'string' || value.length === 0 || value.length > 4096) return false
  try {
    return new URL(value).protocol === 'https:'
  } catch {
    return false
  }
}

function stringValue(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function claimAuthority(claim: CinematicClaim): CinematicClaimAuthority {
  return {
    claimId: claim.id,
    userId: claim.userId,
    generationId: claim.generationId,
    status: claim.status,
    fingerprint: claim.fingerprint,
    creditCost: claim.creditCost,
    quality: claim.quality,
    engine: claim.engine,
    falRequestIds: claim.falRequestIds,
    falModels: claim.falModels,
    authorizedCompletedUrls: claim.authorizedCompletedUrls,
    ...(claim.responseHash ? { responseHash: claim.responseHash } : {}),
    ...(claim.resolutionReason ? { resolutionReason: claim.resolutionReason } : {}),
    ...(claim.resolutionReference ? { resolutionReference: claim.resolutionReference } : {}),
  }
}

function sameArray<T>(left: T[], right: T[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index])
}

function terminalFailures(value: unknown): CinematicTerminalFailure[] | null {
  if (value === undefined) return [] // Older signed claims have no failure proof.
  if (!Array.isArray(value)) return null
  const result: CinematicTerminalFailure[] = []
  for (const item of value) {
    if (!item || typeof item !== 'object' || Array.isArray(item) ||
      !validRequestId(item.requestId) || !item.requestId || !validModel(item.model) ||
      result.some(job => job.requestId === item.requestId && job.model === item.model)) return null
    result.push({ requestId: item.requestId, model: item.model })
  }
  return result
}

function validResponseBinding(claim: CinematicClaim): boolean {
  if (!claim.response) return claim.responseHash === ''
  if (isKling4PromoCinematicClaim(claim)) {
    const marker = claim.response.kling4_paid as Record<string, unknown> | undefined
    if (!marker || marker.version !== 'kling4_paid_2810' || marker.promo !== true ||
      ![15, 30, 60].includes(Number(marker.seconds)) || marker.seconds !== claim.response.duration) return false
    if (marker.engine_used === 'kling4') {
      if (claim.falModels.length !== Number(marker.seconds) / 15 ||
        claim.falModels.some(model => model !== 'kling/v4/text-to-video' && model !== 'kling/v4/image-to-video')) return false
    } else if (marker.engine_used === 'seedance15_fallback') {
      if (marker.fallback_finalized !== true || marker.fallback_budget_reserved !== true ||
        !Array.isArray(marker.original_request_ids) || marker.original_request_ids.length !== Number(marker.seconds) / 15 ||
        claim.falModels.length !== Number(marker.seconds) / 5 ||
        claim.falModels.some(model => model !== 'fal-ai/bytedance/seedance/v1.5/pro/text-to-video')) return false
    } else return false
  }
  if (cinematicValueHash(claim.response) !== claim.responseHash) return false
  if (claim.response.generationId !== claim.generationId || claim.response.quality !== claim.quality) return false

  const responseIds = claim.response.fal_request_ids
  if (!Array.isArray(responseIds) || !responseIds.every(validRequestId)) return false
  if (!sameArray(responseIds, claim.falRequestIds)) return false

  const responseModels = claim.response.fal_models
  if (Array.isArray(responseModels)) {
    if (!responseModels.every(validModel) || !sameArray(responseModels, claim.falModels)) return false
  } else {
    const responseModel = claim.response.fal_model
    if (!validModel(responseModel)) return false
    if (!claim.falModels.every((model) => model === responseModel)) return false
  }
  const failed = terminalFailures(claim.response.terminal_failed_jobs)
  if (!failed || failed.some(job => claim.falRequestIds.filter((id, i) =>
    id === job.requestId && claim.falModels[i] === job.model).length !== 1)) return false
  return true
}

/** Call only with a verified signed claim. A missing URL is NOT failed: every
 * accepted job needs its completed URL or durable, ID+model-bound failure proof.
 * Null IDs are conclusive only when the signed submission explicitly excludes
 * ambiguity. Legacy nulls may represent an accepted job whose receipt was lost. */
export function cinematicJobsAreTerminal(claim: CinematicClaim): boolean {
  if ((claim.status !== 'done' && claim.status !== 'settled') ||
    !claim.falRequestIds.length || !claim.falRequestIds.some(Boolean) || !validResponseBinding(claim) ||
    claim.falRequestIds.length !== claim.falModels.length ||
    claim.falRequestIds.length !== claim.authorizedCompletedUrls.length) return false
  const failed = terminalFailures(claim.response?.terminal_failed_jobs) ?? []
  return claim.falRequestIds.every((id, i) => (id === null && claim.response?.submission_uncertain === false) ||
    (Boolean(claim.authorizedCompletedUrls[i]) && validCompletedUrl(claim.authorizedCompletedUrls[i])) ||
    failed.some(job => job.requestId === id && job.model === claim.falModels[i]))
}

/**
 * Verify a raw events row against its deterministic owner/id/path and HMAC.
 * `userId` must come from the authenticated server session, never request JSON.
 */
export function verifyCinematicClaimRow(args: {
  row: unknown
  secret: string
  userId: string
  generationId: string
}): CinematicClaimValidation {
  if (!args.secret || !validCinematicGenerationId(args.generationId)) {
    return { ok: false, error: 'invalid claim verifier input' }
  }
  const row = args.row as CinematicClaimRow | null
  const expectedId = cinematicClaimId(args.userId, args.generationId)
  if (
    !row || row.id !== expectedId || row.name !== CINEMATIC_CLAIM_EVENT ||
    row.user_id !== args.userId || row.path !== CINEMATIC_CLAIM_PATH ||
    row.session_id !== args.generationId
  ) {
    return { ok: false, error: 'claim identity mismatch' }
  }

  const metadata = row.metadata && typeof row.metadata === 'object' && !Array.isArray(row.metadata)
    ? row.metadata as Record<string, unknown>
    : null
  if (!metadata || metadata.generation_id !== args.generationId) {
    return { ok: false, error: 'claim metadata mismatch' }
  }

  const status: CinematicClaimStatus | null =
    metadata.status === 'pending' || metadata.status === 'done' ||
    metadata.status === 'settled' || metadata.status === 'released'
      ? metadata.status
      : null
  const fingerprint = metadata.fingerprint
  const creditCost = metadata.credit_cost
  const quality = metadata.quality
  const engine = metadata.engine
  const requestIds = metadata.fal_request_ids
  const models = metadata.fal_models
  const completedUrls = metadata.authorized_completed_urls
  const response = metadata.response && typeof metadata.response === 'object' && !Array.isArray(metadata.response)
    ? metadata.response as Record<string, unknown>
    : null
  const responseHash = stringValue(metadata.response_hash)
  const resolutionReason = stringValue(metadata.resolution_reason)
  const resolutionReference = stringValue(metadata.resolution_reference)

  if (
    !status || !isHash(fingerprint) || !validCreditCost(creditCost, quality, engine) ||
    !validQuality(quality) || !validEngine(engine) ||
    !Array.isArray(requestIds) || !requestIds.every(validRequestId) ||
    !Array.isArray(models) || !models.every(validModel) ||
    !Array.isArray(completedUrls) || !completedUrls.every(validCompletedUrl) ||
    requestIds.length !== models.length || requestIds.length !== completedUrls.length
  ) {
    return { ok: false, error: 'invalid claim authority fields' }
  }

  if (status === 'pending' && (requestIds.length !== 0 || response || responseHash)) {
    return { ok: false, error: 'pending claim contains provider output' }
  }
  if ((status === 'done' || status === 'settled') && (!response || !isHash(responseHash))) {
    return { ok: false, error: 'completed claim is missing its response' }
  }
  if (status === 'done' && (resolutionReason || resolutionReference)) {
    return { ok: false, error: 'unresolved claim contains a resolution' }
  }
  if ((status === 'settled' || status === 'released') && !resolutionReason) {
    return { ok: false, error: 'resolved claim is missing its reason' }
  }
  if (status === 'released' && ((response && !isHash(responseHash)) || (!response && responseHash))) {
    return { ok: false, error: 'released claim response is incomplete' }
  }

  const claim: CinematicClaim = {
    id: expectedId,
    userId: args.userId,
    generationId: args.generationId,
    status,
    fingerprint,
    creditCost,
    quality,
    engine,
    falRequestIds: requestIds,
    falModels: models,
    authorizedCompletedUrls: completedUrls,
    response,
    responseHash,
    resolutionReason,
    resolutionReference,
    startedAt: stringValue(metadata.started_at) || stringValue(row.created_at),
    completedAt: stringValue(metadata.completed_at),
    resolvedAt: stringValue(metadata.resolved_at),
    authority: stringValue(metadata.authority),
  }
  if (!verifyCinematicClaim(args.secret, claimAuthority(claim), claim.authority)) {
    return { ok: false, error: 'invalid claim signature' }
  }
  if (!validResponseBinding(claim)) {
    return { ok: false, error: 'claim response/provider binding mismatch' }
  }
  return { ok: true, claim }
}

export async function loadVerifiedCinematicClaim(args: {
  db: SupabaseClient
  secret: string
  userId: string
  generationId: string
}): Promise<CinematicClaimLoad> {
  if (!validCinematicGenerationId(args.generationId)) {
    return { ok: false, error: 'invalid generation id' }
  }
  const claimId = cinematicClaimId(args.userId, args.generationId)
  const { data, error } = await args.db
    .from('events')
    .select('id,name,user_id,path,session_id,metadata,created_at')
    .eq('id', claimId)
    .eq('user_id', args.userId)
    .eq('name', CINEMATIC_CLAIM_EVENT)
    .maybeSingle()
  if (error) return { ok: false, error: error.message }
  if (!data) return { ok: true, claim: null }
  return verifyCinematicClaimRow({ ...args, row: data })
}

/** Resolve an upstream-debited cinematic birth claim from the signed Compose
 * claim that owns a final render id. Used by compose/status to skip a second
 * debit without trusting query params or mutable client state. */
export async function loadSettledCinematicClaimForRender(args: {
  db: SupabaseClient
  secret: string
  userId: string
  renderId: string
}): Promise<CinematicRenderClaimLoad> {
  if (!args.renderId) return { ok: true, claim: null }
  const { data: compose, error } = await args.db
    .from('events')
    .select('id,name,user_id,path,session_id,metadata')
    .eq('name', COMPOSE_CLAIM_EVENT)
    .eq('user_id', args.userId)
    .contains('metadata', { status: 'done', render_id: args.renderId })
    .limit(1)
    .maybeSingle()
  if (error) return { ok: false, error: error.message }
  if (!compose) return { ok: true, claim: null }

  const metadata = compose.metadata && typeof compose.metadata === 'object'
    ? compose.metadata as Record<string, unknown>
    : {}
  const generationId = typeof compose.session_id === 'string' ? compose.session_id : ''
  const quality = typeof metadata.quality === 'string' ? metadata.quality : ''
  const cost = typeof metadata.cost === 'number' && Number.isInteger(metadata.cost)
    ? metadata.cost
    : null
  const composeId = typeof compose.id === 'string' ? compose.id : ''
  if (
    !validComposeGenerationId(generationId) || !quality || cost === null || cost < 0 ||
    composeId !== composeClaimId(args.userId, generationId) ||
    compose.name !== COMPOSE_CLAIM_EVENT || compose.user_id !== args.userId ||
    compose.path !== COMPOSE_CLAIM_PATH || metadata.generation_id !== generationId ||
    !verifyComposeClaim(args.secret, {
      claimId: composeId,
      userId: args.userId,
      generationId,
      status: 'done',
      renderId: args.renderId,
      quality,
      cost,
    }, metadata.authority)
  ) {
    return { ok: false, error: 'invalid compose claim for cinematic render' }
  }

  const birth = await loadVerifiedCinematicClaim({
    db: args.db,
    secret: args.secret,
    userId: args.userId,
    generationId,
  })
  if (!birth.ok) return birth
  if (!birth.claim) return cost === 0
    ? { ok: false, error: 'zero-cost cinematic render is missing its promotion birth' }
    : { ok: true, claim: null }
  if (cost === 0 && !isKling4PromoCinematicClaim(birth.claim)) {
    return { ok: false, error: 'zero-cost cinematic render requires a signed Kling4 promotion claim' }
  }
  const isDebited =
    birth.claim.status === 'settled' &&
    (birth.claim.resolutionReason === 'provider_submitted_and_debited' ||
      (isKling4PromoCinematicClaim(birth.claim) && birth.claim.resolutionReason === 'provider_submitted_promo'))
  const isRefunded =
    birth.claim.status === 'released' &&
    // KINEO-CREDIT-INTEGRITY-2026-08-05 — `abandoned` joins the terminal
    // refunded reasons: the cron sweep releases a settled claim whose render
    // never delivered (closed tab / stalled fal poll) after refunding it.
    // KINEO-BILLING-MISMATCH-2026-09-03 — a lista virou constante explicita com
    // as razoes que a producao emite (o regex de 3 barrava as outras 4).
    CINEMATIC_DELIVERABLE_REFUND_REASONS.has(birth.claim.resolutionReason)
  if (
    (!isDebited && !isRefunded) || birth.claim.quality !== quality ||
    !birth.claim.resolutionReference.startsWith('cinematic-')
  ) {
    return { ok: false, error: 'cinematic birth/compose billing mismatch' }
  }
  // KINEO-BILLING-MISMATCH-2026-09-03 — `birth.claim.creditCost !== cost` SAIU
  // da recusa. O preco era calculado duas vezes (nascimento = duracao PEDIDA;
  // compose = duracao ENTREGUE) e a diferenca — que nasce da propria regra da
  // casa de o filme fechar onde a fala termina — recusava a entrega de um filme
  // PRONTO, com o credito ja estornado: 5 divergencias na historia, 5 filmes
  // perdidos, 100%. Cobranca dobrada continua impossivel pelos dois meios de
  // sempre: `debit_video_credits` e idempotente pela PK `render_id` e o guarda
  // da linha em `videos` barra o segundo debito. O que prova POSSE continua
  // duro logo acima: quality, prefixo `cinematic-`, assinatura do claim de
  // compose e `composeId` derivado do usuario. Divergencia virou SINAL.
  if (birth.claim.creditCost !== cost) {
    await recordCinematicCostDrift({
      db: args.db,
      userId: args.userId,
      generationId,
      renderId: args.renderId,
      birthCost: birth.claim.creditCost,
      composeCost: cost,
      quality,
      birthStatus: birth.claim.status,
      resolutionReason: birth.claim.resolutionReason,
      composeDuration: typeof metadata.duration === 'number' ? metadata.duration : null,
    })
  }
  return { ok: true, claim: birth.claim }
}

/**
 * KINEO-BILLING-MISMATCH-2026-09-03 — registra a divergencia de preco entre o
 * claim de nascimento e o de compose SEM nunca bloquear a entrega. Id
 * deterministico por (usuario, generation, render): a rota de status e polida
 * dezenas de vezes por render, e sem isso um filme divergente encheria a tabela
 * `events` de linhas iguais. Duplicata (23505) e o caminho normal, nao erro.
 * Falha de escrita e engolida de proposito: observabilidade nunca derruba filme.
 */
async function recordCinematicCostDrift(args: {
  db: SupabaseClient
  userId: string
  generationId: string
  renderId: string
  birthCost: number
  composeCost: number
  quality: string
  birthStatus: CinematicClaimStatus
  resolutionReason: string
  composeDuration: number | null
}): Promise<void> {
  try {
    await args.db.from('events').insert({
      id: deterministicUuid(
        'kineo:cinematic-cost-drift:v1',
        args.userId,
        args.generationId,
        args.renderId,
      ),
      user_id: args.userId,
      name: CINEMATIC_COST_DRIFT_EVENT,
      path: CINEMATIC_CLAIM_PATH,
      session_id: args.generationId,
      metadata: {
        render_id: args.renderId,
        birth_credit_cost: args.birthCost,
        compose_credit_cost: args.composeCost,
        drift: args.composeCost - args.birthCost,
        quality: args.quality,
        birth_status: args.birthStatus,
        resolution_reason: args.resolutionReason,
        ...(args.composeDuration === null ? {} : { compose_duration: args.composeDuration }),
        delivered: true,
      },
    })
  } catch {
    // observabilidade nunca derruba entrega
  }
}

function metadataForClaim(claim: CinematicClaim): Record<string, unknown> {
  return {
    generation_id: claim.generationId,
    status: claim.status,
    fingerprint: claim.fingerprint,
    credit_cost: claim.creditCost,
    quality: claim.quality,
    engine: claim.engine,
    fal_request_ids: claim.falRequestIds,
    fal_models: claim.falModels,
    authorized_completed_urls: claim.authorizedCompletedUrls,
    ...(claim.response ? { response: claim.response, response_hash: claim.responseHash } : {}),
    ...(claim.resolutionReason ? { resolution_reason: claim.resolutionReason } : {}),
    ...(claim.resolutionReference ? { resolution_reference: claim.resolutionReference } : {}),
    started_at: claim.startedAt,
    ...(claim.completedAt ? { completed_at: claim.completedAt } : {}),
    ...(claim.resolvedAt ? { resolved_at: claim.resolvedAt } : {}),
    authority: claim.authority,
  }
}

function withSignature(secret: string, claim: Omit<CinematicClaim, 'authority'>): CinematicClaim {
  const unsigned = { ...claim, authority: '' }
  return { ...unsigned, authority: signCinematicClaim(secret, claimAuthority(unsigned)) }
}

function sameIntent(
  claim: CinematicClaim,
  input: { fingerprint: string; creditCost: number; quality: string; engine: string },
): boolean {
  return claim.fingerprint === input.fingerprint && claim.creditCost === input.creditCost &&
    claim.quality === input.quality && claim.engine === input.engine
}

export async function acquireCinematicClaim(args: {
  db: SupabaseClient
  secret: string
  userId: string
  generationId: string
  fingerprint: string
  creditCost: number
  quality: string
  engine: string
  /** Required only for the zero-credit promotion. Never derive this proof from request metadata. */
  promoSeconds?: number
}): Promise<CinematicClaimAcquire> {
  if (
    !args.secret || !validCinematicGenerationId(args.generationId) || !isHash(args.fingerprint) ||
    !validCreditCost(args.creditCost, args.quality, args.engine) || !validQuality(args.quality) || !validEngine(args.engine)
  ) {
    return { kind: 'error', error: 'invalid cinematic claim input' }
  }

  if (args.creditCost === 0) {
    if (![15, 30, 60].includes(args.promoSeconds ?? 0)) return { kind: 'error', error: 'invalid Kling4 promotion duration' }
    try {
      const { verifyKling4PromoReservation, validateKling4PromoStart } = await import('@/lib/kling4PromoServer')
      if (!await verifyKling4PromoReservation(args.db, { userId: args.userId, jobId: args.generationId,
        kind: 'film', seconds: args.promoSeconds })) return { kind: 'error', error: 'Kling4 promotion reservation is not authorized' }
      const prior = await loadVerifiedCinematicClaim(args)
      if (!prior.ok) return { kind: 'error', error: prior.error }
      if (!prior.claim) {
        const start = await validateKling4PromoStart(args.db, { userId: args.userId, jobId: args.generationId,
          kind: 'film', seconds: args.promoSeconds })
        if (!start.isFree) return { kind: 'error', error: 'Kling4 promotion first start is no longer authorized' }
      }
    } catch { return { kind: 'error', error: 'Kling4 promotion verification is unavailable' } }
  }

  const now = new Date().toISOString()
  const claim = withSignature(args.secret, {
    id: cinematicClaimId(args.userId, args.generationId),
    userId: args.userId,
    generationId: args.generationId,
    status: 'pending',
    fingerprint: args.fingerprint,
    creditCost: args.creditCost,
    quality: args.quality,
    engine: args.engine,
    falRequestIds: [],
    falModels: [],
    authorizedCompletedUrls: [],
    response: null,
    responseHash: '',
    resolutionReason: '',
    resolutionReference: '',
    startedAt: now,
    completedAt: '',
    resolvedAt: '',
  })
  const { data, error } = await args.db.from('events').insert({
    id: claim.id,
    user_id: args.userId,
    name: CINEMATIC_CLAIM_EVENT,
    path: CINEMATIC_CLAIM_PATH,
    session_id: args.generationId,
    metadata: metadataForClaim(claim),
  }).select('id,name,user_id,path,session_id,metadata,created_at').maybeSingle()

  if (!error && data) {
    const verified = verifyCinematicClaimRow({ ...args, row: data })
    return verified.ok
      ? { kind: 'acquired', claim: verified.claim }
      : { kind: 'error', error: verified.error }
  }
  if (!error || (error as { code?: string }).code !== '23505') {
    return { kind: 'error', error: error?.message ?? 'claim insert returned no row' }
  }

  const existing = await loadVerifiedCinematicClaim(args)
  if (!existing.ok) return { kind: 'error', error: existing.error }
  if (!existing.claim) return { kind: 'error', error: 'duplicate claim could not be loaded' }
  if (!sameIntent(existing.claim, args)) {
    return { kind: 'conflict', error: 'generation id belongs to a different cinematic request' }
  }
  if (existing.claim.status === 'pending') return { kind: 'pending', claim: existing.claim }
  if (existing.claim.status === 'released') return { kind: 'released', claim: existing.claim }
  if (!existing.claim.response) return { kind: 'error', error: 'replay response is unavailable' }
  return { kind: 'replay', claim: existing.claim, response: existing.claim.response }
}

function normalizeResponse(value: Record<string, unknown>): Record<string, unknown> | null {
  try {
    const parsed: unknown = JSON.parse(JSON.stringify(value))
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : null
  } catch {
    return null
  }
}

async function updateClaim(args: {
  db: SupabaseClient
  secret: string
  previous: CinematicClaim
  next: CinematicClaim
}): Promise<CinematicClaimMutation> {
  const { data, error } = await args.db
    .from('events')
    .update({ metadata: metadataForClaim(args.next) })
    .eq('id', args.previous.id)
    .eq('user_id', args.previous.userId)
    .eq('name', CINEMATIC_CLAIM_EVENT)
    .eq('metadata->>authority', args.previous.authority)
    .select('id,name,user_id,path,session_id,metadata,created_at')
    .maybeSingle()
  if (error) return { ok: false, error: error.message }
  if (!data) return { ok: false, error: 'claim changed concurrently', conflict: true }
  const verified = verifyCinematicClaimRow({
    row: data,
    secret: args.secret,
    userId: args.previous.userId,
    generationId: args.previous.generationId,
  })
  return verified.ok ? verified : { ok: false, error: verified.error }
}

export async function completeCinematicClaim(args: {
  db: SupabaseClient
  secret: string
  userId: string
  generationId: string
  fingerprint: string
  creditCost: number
  quality: string
  engine: string
  response: Record<string, unknown>
  falRequestIds: CinematicRequestId[]
  falModels: string[]
  authorizedCompletedUrls?: CinematicCompletedUrl[]
}): Promise<CinematicClaimMutation> {
  const loaded = await loadVerifiedCinematicClaim(args)
  if (!loaded.ok || !loaded.claim) return { ok: false, error: loaded.ok ? 'claim not found' : loaded.error }
  const current = loaded.claim
  if (!sameIntent(current, args)) return { ok: false, error: 'claim intent mismatch', conflict: true }
  const paidMarker = args.response.kling4_paid as Record<string, unknown> | undefined
  const paidQueueBirth = current.quality === 'cinematic_hollywood' && ['kling4-paid-v1', KLING4_PROMO_CLAIM_ENGINE].includes(current.engine) &&
    paidMarker?.version === 'kling4_paid_2810' && paidMarker.engine_used === 'kling4' && paidMarker.fallback_budget_reserved === true
  if (
    !args.falRequestIds.every(validRequestId) || !args.falModels.every(validModel) ||
    args.falRequestIds.length !== args.falModels.length || (!args.falRequestIds.some(Boolean) && !paidQueueBirth)
  ) {
    return { ok: false, error: 'invalid provider binding' }
  }
  const completedUrls = args.authorizedCompletedUrls ?? args.falRequestIds.map(() => null)
  if (completedUrls.length !== args.falRequestIds.length || !completedUrls.every(validCompletedUrl)) {
    return { ok: false, error: 'invalid completed URL binding' }
  }
  const response = normalizeResponse(args.response)
  if (!response) return { ok: false, error: 'response is not JSON serializable' }
  const responseHash = cinematicValueHash(response)

  const candidate = withSignature(args.secret, {
    ...current,
    status: 'done',
    falRequestIds: [...args.falRequestIds],
    falModels: [...args.falModels],
    authorizedCompletedUrls: [...completedUrls],
    response,
    responseHash,
    resolutionReason: '',
    resolutionReference: '',
    completedAt: current.completedAt || new Date().toISOString(),
    resolvedAt: '',
  })
  if (!validResponseBinding(candidate)) return { ok: false, error: 'response does not match provider binding' }

  if (current.status !== 'pending') {
    const idempotent = (current.status === 'done' || current.status === 'settled') &&
      current.responseHash === responseHash && sameArray(current.falRequestIds, args.falRequestIds) &&
      sameArray(current.falModels, args.falModels)
    return idempotent
      ? { ok: true, claim: current }
      : { ok: false, error: `cannot complete ${current.status} claim`, conflict: true }
  }
  return updateClaim({ db: args.db, secret: args.secret, previous: current, next: candidate })
}

/** Service-only paid queue transition; never changes ownership, credit cost or the trial state. */
export async function replaceKling4PaidBinding(args: {
  db: SupabaseClient; secret: string; userId: string; generationId: string; expectedAuthority: string
  response: Record<string, unknown>; falRequestIds: CinematicRequestId[]; falModels: string[]
  authorizedCompletedUrls: CinematicCompletedUrl[]; reason: string
}): Promise<CinematicClaimMutation> {
  const loaded = await loadVerifiedCinematicClaim(args)
  if (!loaded.ok || !loaded.claim) return { ok: false, error: loaded.ok ? 'claim not found' : loaded.error }
  const current = loaded.claim
  const before = current.response?.kling4_paid as Record<string, unknown> | undefined
  const response = normalizeResponse(args.response)
  const after = response?.kling4_paid as Record<string, unknown> | undefined
  if (current.authority !== args.expectedAuthority || current.status !== 'settled' || current.quality !== 'cinematic_hollywood' ||
    !before || before.version !== 'kling4_paid_2810' || !response || !after || after.version !== before.version ||
    before.seconds !== after.seconds || before.promo !== after.promo || !args.reason.trim() ||
    args.falRequestIds.length !== args.falModels.length || args.falRequestIds.length !== args.authorizedCompletedUrls.length ||
    !args.falRequestIds.every(validRequestId) || !args.falModels.every(validModel) ||
    !args.authorizedCompletedUrls.every(validCompletedUrl)) return { ok: false, error: 'invalid paid queue transition', conflict: true }
  if (after.engine_used === 'seedance15_fallback' && before.engine_used === 'kling4') {
    if (current.authorizedCompletedUrls.some(Boolean) || !Array.isArray(after.original_request_ids) ||
      !sameArray(after.original_request_ids, current.falRequestIds)) return { ok: false, error: 'paid fallback source changed', conflict: true }
  }
  if (after.fallback_started === true && before.fallback_started !== true && current.authorizedCompletedUrls.some(Boolean)) {
    return { ok: false, error: 'paid source already completed', conflict: true }
  }
  const candidate = withSignature(args.secret, { ...current, response, responseHash: cinematicValueHash(response),
    falRequestIds: [...args.falRequestIds], falModels: [...args.falModels], authorizedCompletedUrls: [...args.authorizedCompletedUrls] })
  if (!validResponseBinding(candidate)) return { ok: false, error: 'invalid paid fallback response binding' }
  return updateClaim({ db: args.db, secret: args.secret, previous: current, next: candidate })
}

/**
 * KINEO-H3-AUDIT2-2026-08-20 — RETARGET DE UMA CENA RE-TENTADA.
 * A rota /api/retry-hollywood-scene re-submete uma cena que falhou no
 * fornecedor e devolve um request id NOVO — mas o claim assinado continuava
 * com o id velho. Resultado: o próximo poll do cliente falhava no
 * `sameArray(requestedIds, claim.falRequestIds)` do poller e a geração
 * inteira morria em 404 ("Generation not found"). O retry estava
 * estruturalmente quebrado desde que o claim endureceu.
 * Este helper troca UM id no claim com as mesmas garantias do resto do
 * sistema: dono verificado, modelo IMUTÁVEL no slot (retry nunca troca de
 * motor — impede rebaixar um filme de 150cr pra um clipe barato), slot ainda
 * sem URL autorizada, e o response assinado é re-hasheado junto (senão o
 * validResponseBinding do compose rejeitaria o claim retargetado).
 */
export async function retargetCinematicRequestId(args: {
  db: SupabaseClient
  secret: string
  userId: string
  generationId: string
  // Slot por ÍNDICE: cena que nunca foi submetida (fal recusou o submit no
  // nascimento) tem falRequestIds[index] === null — buscar por id não a
  // encontraria. oldRequestId null = "o slot deve estar vazio".
  index: number
  oldRequestId: string | null
  newRequestId: string
  model: string
}): Promise<CinematicClaimMutation> {
  if (!validRequestId(args.newRequestId) || !args.newRequestId) {
    return { ok: false, error: 'invalid new request id' }
  }
  if (!Number.isInteger(args.index) || args.index < 0) {
    return { ok: false, error: 'invalid scene index' }
  }
  const loaded = await loadVerifiedCinematicClaim(args)
  if (!loaded.ok || !loaded.claim) return { ok: false, error: loaded.ok ? 'claim not found' : loaded.error }
  const current = loaded.claim
  if (current.status !== 'done' && current.status !== 'settled') {
    return { ok: false, error: `cannot retarget ${current.status} claim`, conflict: true }
  }
  // Idempotência: o id novo já está no claim (retry duplo/replay) → ok.
  if (current.falRequestIds.includes(args.newRequestId)) return { ok: true, claim: current }
  const index = args.index
  if (index >= current.falRequestIds.length) return { ok: false, error: 'scene index out of range', conflict: true }
  if (current.falRequestIds[index] !== args.oldRequestId) {
    return { ok: false, error: 'slot request id mismatch', conflict: true }
  }
  if (current.falModels[index] !== args.model) {
    return { ok: false, error: 'retarget model mismatch', conflict: true }
  }
  if (current.authorizedCompletedUrls[index]) {
    return { ok: false, error: 'scene already has an authorized URL', conflict: true }
  }
  const falRequestIds = [...current.falRequestIds]
  falRequestIds[index] = args.newRequestId
  let response = current.response
  let responseHash = current.responseHash
  if (response && Array.isArray(response.fal_request_ids)) {
    const respIds = [...(response.fal_request_ids as CinematicRequestId[])]
    if ((respIds[index] ?? null) !== args.oldRequestId) {
      return { ok: false, error: 'response request id mismatch', conflict: true }
    }
    respIds[index] = args.newRequestId
    response = { ...response, fal_request_ids: respIds }
    // A replacement starts unresolved. Never transfer the old job's terminal
    // evidence to its slot (or keep stale proofs that could later be reused).
    if (response.terminal_failed_jobs !== undefined) {
      response.terminal_failed_jobs = (terminalFailures(response.terminal_failed_jobs) ?? [])
        .filter(job => job.requestId !== args.oldRequestId)
    }
    responseHash = cinematicValueHash(response)
  }
  const next = withSignature(args.secret, { ...current, falRequestIds, response, responseHash })
  return updateClaim({ db: args.db, secret: args.secret, previous: current, next })
}

/**
 * Bind provider-completed URLs to their signed request id/model slots. Once a
 * slot is authorized, it cannot be changed to a different URL.
 */
/** Select the fallback before any paid Seedance POST. URL authorization and this transition use the SAME authority CAS:
 * a completed Kling source wins without fallback spend, or fallback wins and later Kling receipts are excluded. */
export async function startKling4TrialFallback(args: {
  db: SupabaseClient; secret: string; userId: string; generationId: string; originalRequestId: string
  reason: 'provider_failed' | 'timeout'
}): Promise<CinematicClaimMutation> {
  const loaded = await loadVerifiedCinematicClaim(args)
  if (!loaded.ok || !loaded.claim) return { ok: false, error: loaded.ok ? 'claim not found' : loaded.error }
  const current = loaded.claim
  const response = current.response
  const marker = response?.kling4_trial as Record<string, unknown> | undefined
  if ((current.status !== 'done' && current.status !== 'settled') || current.quality !== 'cinematic_ai' ||
      response?.duration !== 15 || response.aspect !== '9:16' || !marker || marker.version !== 'kling4_trial_2810' ||
      marker.original_request_id !== args.originalRequestId || !['provider_failed','timeout'].includes(args.reason)) {
    return { ok: false, error: 'not an async Kling trial' }
  }
  if (marker.engine_used === 'seedance15_fallback' || (marker.engine_used === 'kling4' && marker.fallback_started === true)) return { ok: true, claim: current }
  if (marker.engine_used !== 'kling4' || current.falRequestIds.length !== 1 || current.falRequestIds[0] !== args.originalRequestId ||
      !['kling/v4/text-to-video','kling/v4/image-to-video'].includes(current.falModels[0]) || current.authorizedCompletedUrls.some(Boolean)) {
    return { ok: false, error: 'original source changed or already authorized', conflict: true }
  }
  const nextResponse = { ...response, kling4_trial: { ...marker, fallback_started: true, fallback_reason: args.reason } }
  const candidate = withSignature(args.secret, { ...current, response: nextResponse, responseHash: cinematicValueHash(nextResponse) })
  return updateClaim({ db: args.db, secret: args.secret, previous: current, next: candidate })
}

/** Only the signed free-film Kling experiment may replace its one unresolved source with the frozen Seedance fallback.
 * This never changes paid intent/cost, never replaces an authorized URL, and uses the existing authority CAS. */
export async function switchKling4TrialToSeedanceFallback(args: {
  db: SupabaseClient; secret: string; userId: string; generationId: string
  originalRequestId: string; requestIds: CinematicRequestId[]; ambiguous: boolean; reason: string
}): Promise<CinematicClaimMutation> {
  if (args.requestIds.length !== 3 || !args.requestIds.every(validRequestId)) return { ok: false, error: 'invalid fallback vector' }
  const loaded = await loadVerifiedCinematicClaim(args)
  if (!loaded.ok || !loaded.claim) return { ok: false, error: loaded.ok ? 'claim not found' : loaded.error }
  const current = loaded.claim
  const response = current.response
  const marker = response?.kling4_trial as Record<string, unknown> | undefined
  if ((current.status !== 'done' && current.status !== 'settled') || current.quality !== 'cinematic_ai' ||
      response?.duration !== 15 || response.aspect !== '9:16' || !marker || marker.version !== 'kling4_trial_2810' ||
      marker.original_request_id !== args.originalRequestId) return { ok: false, error: 'not an async Kling trial' }
  if (marker.engine_used === 'seedance15_fallback') {
    return sameArray(current.falRequestIds, args.requestIds) ? { ok: true, claim: current } : { ok: false, error: 'fallback already frozen', conflict: true }
  }
  if (marker.engine_used !== 'kling4' || marker.fallback_started !== true || current.falRequestIds.length !== 1 || current.falRequestIds[0] !== args.originalRequestId ||
      !['kling/v4/text-to-video','kling/v4/image-to-video'].includes(current.falModels[0]) || current.authorizedCompletedUrls.some(Boolean)) {
    return { ok: false, error: 'original source changed or already authorized', conflict: true }
  }
  const fallback = marker.fallback_response as Record<string, unknown> | undefined
  const shots = marker.fallback_scenes as Array<{ prompt?: unknown; duration?: unknown }> | undefined
  if (!fallback || !Array.isArray(fallback.scenes) || fallback.scenes.length !== 3 ||
      !fallback.scenes.every(s => typeof s === 'string') || !Array.isArray(shots) || shots.length !== 3 ||
      shots.some(s => !s || typeof s.prompt !== 'string' || !s.prompt.trim() || ![6,7,8].includes(Number(s.duration)))) {
    return { ok: false, error: 'signed fallback plan missing' }
  }
  const model = 'fal-ai/bytedance/seedance/v1.5/pro/text-to-video'
  const nextResponse = { ...response, scenes: fallback.scenes,
    scene_captions: Array.isArray(fallback.scene_captions) ? fallback.scene_captions : ['', '', ''],
    clip_word_starts: Array.isArray(fallback.clip_word_starts) ? fallback.clip_word_starts : [0, 0, 0],
    fal_request_ids: [...args.requestIds], fal_models: args.requestIds.map(() => model), fal_model: model,
    scene_prompts: shots.map(s => s.prompt),
    scene_fal_inputs: shots.map(s => ({ prompt: s.prompt, duration: String(s.duration), resolution: '720p', aspect_ratio: '9:16', generate_audio: false })),
    clip_seconds: shots.map(s => Number(s.duration)),
    // Null slots are deliberately excluded after the three once-only attempts finish. They are never retried.
    submission_uncertain: false, terminal_failed_jobs: [],
    kling4_trial: { ...marker, engine_used: 'seedance15_fallback', fallback_finalized: true,
      fallback_ambiguous: args.ambiguous, fallback_reason: args.reason, video_url: undefined },
  }
  const normalized = normalizeResponse(nextResponse)
  if (!normalized) return { ok: false, error: 'invalid fallback response' }
  const candidate = withSignature(args.secret, { ...current, falRequestIds: [...args.requestIds],
    falModels: args.requestIds.map(() => model), authorizedCompletedUrls: args.requestIds.map(() => null),
    response: normalized, responseHash: cinematicValueHash(normalized) })
  if (!validResponseBinding(candidate)) return { ok: false, error: 'invalid fallback binding' }
  return updateClaim({ db: args.db, secret: args.secret, previous: current, next: candidate })
}

export async function authorizeCinematicCompletedUrls(args: {
  db: SupabaseClient
  secret: string
  userId: string
  generationId: string
  completed: Array<{ requestId: string; model?: string; url: string }>
}): Promise<CinematicClaimMutation> {
  const loaded = await loadVerifiedCinematicClaim(args)
  if (!loaded.ok || !loaded.claim) return { ok: false, error: loaded.ok ? 'claim not found' : loaded.error }
  const current = loaded.claim
  if (current.status !== 'done' && current.status !== 'settled') {
    return { ok: false, error: `cannot authorize URLs for ${current.status} claim`, conflict: true }
  }
  const trial = current.response?.kling4_trial as Record<string, unknown> | undefined
  if (trial?.version === 'kling4_trial_2810' && trial.fallback_started === true &&
      args.completed.some(item => item.requestId === trial.original_request_id)) {
    return { ok: false, error: 'Kling source excluded by started fallback', conflict: true }
  }
  const paid = current.response?.kling4_paid as Record<string, unknown> | undefined
  if (paid?.version === 'kling4_paid_2810' && paid.fallback_started === true && Array.isArray(paid.original_request_ids) &&
    args.completed.some(item => (paid.original_request_ids as unknown[]).includes(item.requestId))) {
    return { ok: false, error: 'Paid Kling source excluded by started fallback', conflict: true }
  }
  const urls = [...current.authorizedCompletedUrls]
  for (const completed of args.completed) {
    if (!validCompletedUrl(completed.url) || !completed.url) return { ok: false, error: 'invalid completed URL' }
    const indexes = current.falRequestIds
      .map((requestId, index) => requestId === completed.requestId ? index : -1)
      .filter((index) => index >= 0)
    if (indexes.length !== 1) return { ok: false, error: 'request id is not uniquely authorized', conflict: true }
    const index = indexes[0]
    if (completed.model && completed.model !== current.falModels[index]) {
      return { ok: false, error: 'request model mismatch', conflict: true }
    }
    if (urls[index] && urls[index] !== completed.url) {
      return { ok: false, error: 'completed URL is already bound', conflict: true }
    }
    urls[index] = completed.url
  }
  if (sameArray(urls, current.authorizedCompletedUrls)) return { ok: true, claim: current }
  const next = withSignature(args.secret, { ...current, authorizedCompletedUrls: urls })
  return updateClaim({ db: args.db, secret: args.secret, previous: current, next })
}

/** Persist only failures already proven by the server's provider poller. This
 * helper is NOT a client assertion endpoint and never polls, retries or refunds.
 * The response hash/HMAC and existing authority CAS cover the exact job pairs. */
export async function authorizeCinematicTerminalFailures(args: {
  db: SupabaseClient
  secret: string
  userId: string
  generationId: string
  failed: CinematicTerminalFailure[]
}): Promise<CinematicClaimMutation> {
  const loaded = await loadVerifiedCinematicClaim(args)
  if (!loaded.ok || !loaded.claim) return { ok: false, error: loaded.ok ? 'claim not found' : loaded.error }
  const current = loaded.claim
  if ((current.status !== 'done' && current.status !== 'settled') || !current.response) {
    return { ok: false, error: `cannot authorize failures for ${current.status} claim`, conflict: true }
  }
  const incoming = terminalFailures(args.failed)
  if (!incoming || incoming.some(job => current.falRequestIds.filter((id, i) =>
    id === job.requestId && current.falModels[i] === job.model).length !== 1)) {
    return { ok: false, error: 'terminal job is not uniquely authorized', conflict: true }
  }
  const failed = terminalFailures(current.response.terminal_failed_jobs) ?? []
  for (const job of incoming) {
    if (!failed.some(existing => existing.requestId === job.requestId && existing.model === job.model)) failed.push(job)
  }
  if (failed.length === (terminalFailures(current.response.terminal_failed_jobs) ?? []).length) {
    return { ok: true, claim: current }
  }
  const response = { ...current.response, terminal_failed_jobs: failed }
  const next = withSignature(args.secret, { ...current, response, responseHash: cinematicValueHash(response) })
  return updateClaim({ db: args.db, secret: args.secret, previous: current, next })
}

export async function settleCinematicClaim(args: {
  db: SupabaseClient
  secret: string
  userId: string
  generationId: string
  reason: string
  renderId: string
}): Promise<CinematicClaimMutation> {
  const loaded = await loadVerifiedCinematicClaim(args)
  if (!loaded.ok || !loaded.claim) return { ok: false, error: loaded.ok ? 'claim not found' : loaded.error }
  const current = loaded.claim
  const reason = args.reason.trim().slice(0, 160)
  const renderId = args.renderId.trim().slice(0, 200)
  if (!reason || !renderId) return { ok: false, error: 'settlement reason and render id are required' }
  if (current.status === 'settled') {
    return current.resolutionReason === reason && current.resolutionReference === renderId
      ? { ok: true, claim: current }
      : { ok: false, error: 'claim was settled differently', conflict: true }
  }
  if (current.status !== 'done') {
    return { ok: false, error: `cannot settle ${current.status} claim`, conflict: true }
  }
  const next = withSignature(args.secret, {
    ...current,
    status: 'settled',
    resolutionReason: reason,
    resolutionReference: renderId,
    resolvedAt: new Date().toISOString(),
  })
  return updateClaim({ db: args.db, secret: args.secret, previous: current, next })
}

export async function releaseCinematicClaim(args: {
  db: SupabaseClient
  secret: string
  userId: string
  generationId: string
  reason: string
  reference?: string
}): Promise<CinematicClaimMutation> {
  const loaded = await loadVerifiedCinematicClaim(args)
  if (!loaded.ok || !loaded.claim) return { ok: false, error: loaded.ok ? 'claim not found' : loaded.error }
  const current = loaded.claim
  const reason = args.reason.trim().slice(0, 160)
  const reference = (args.reference ?? '').trim().slice(0, 200)
  if (!reason) return { ok: false, error: 'release reason is required' }
  if (current.status === 'released') {
    return current.resolutionReason === reason && current.resolutionReference === reference
      ? { ok: true, claim: current }
      : { ok: false, error: 'claim was released differently', conflict: true }
  }
  if (current.status === 'settled') {
    // A provider can still fail every queued clip after the deterministic
    // upfront debit. The status route refunds that exact billing reference
    // first, then records the terminal released state here.
    // KINEO-CREDIT-INTEGRITY-2026-08-05 — `provider_abandoned_refunded` is the
    // same shape for a render that never reached delivery at all (tab closed
    // mid-`fal_polling`, poll never resumed): the cron sweep refunds the exact
    // billing reference first, then lands the claim here.
    if (!/^provider_(all_failed|failed|abandoned)_refunded$/.test(reason) || reference !== current.resolutionReference) {
      return { ok: false, error: 'settled claim can only be released after its provider debit is refunded', conflict: true }
    }
  }
  const next = withSignature(args.secret, {
    ...current,
    status: 'released',
    resolutionReason: reason,
    resolutionReference: reference,
    resolvedAt: new Date().toISOString(),
  })
  return updateClaim({ db: args.db, secret: args.secret, previous: current, next })
}
