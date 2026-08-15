import { randomUUID } from 'node:crypto'
import { createClient as createAdminClient, type SupabaseClient } from '@supabase/supabase-js'
import { AvatarSubmitError, checkAvatarJob, submitAnimateJob, type AvatarJobState } from '@/lib/avatar/veed'
import { refundRenderCredits } from '@/lib/credits/refund'
// KINEO-REVERSE-TRIAL-P1-2026-08-06 — todo débito passa pelo wrapper único
// (mesmo RPC; com a flag OFF é byte-idêntico ao rpc direto).
import { debitVideoCredits } from '@/lib/credits/debit'
import {
  confirmAnimateDebit,
  loadVerifiedAnimateClaimByBilling,
  loadVerifiedAnimateJob,
  loadVerifiedAnimateJobByBilling,
  publishAnimateJob,
  releaseAnimateClaim,
} from '@/lib/animate/claim'
import { writeServerEvent } from '@/lib/serverEvents'

export const ANIMATE_COST = 5

// KINEO-ANIMATE-ORFAO-2026-08-15 — mesmo corte do irmão (sweepStaleAnimateClaims)
// e da varredura genérica: 2h. Não é um número novo e não é ele que condena
// nada — quem condena é o estado terminal do provedor. O corte só decide a
// partir de quando vale a pena perguntar, então errar para o generoso é grátis.
const PUBLISHED_ANIMATE_CUTOFF_MS = 2 * 60 * 60 * 1000
// Piso de idade — ver GUARDA-CORPO Nº 2 dentro de sweepPublishedAnimateJobs.
const PUBLISHED_ANIMATE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000

export class AnimateServiceError extends Error {
  readonly status: number
  readonly details?: Record<string, unknown>

  constructor(message: string, status: number, details?: Record<string, unknown>) {
    super(message)
    this.name = 'AnimateServiceError'
    this.status = status
    this.details = details
  }
}

export function normalizeAnimatePrompt(value: unknown): string {
  return typeof value === 'string' && value.trim()
    ? value.trim().slice(0, 500)
    : 'subtle natural motion, cinematic, realistic movement'
}

export function normalizeAnimateDuration(value: unknown): '5' | '10' {
  return String(value) === '10' ? '10' : '5'
}

export async function getAnimateBalance(supabase: SupabaseClient, userId: string): Promise<number> {
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('video_credits')
    .eq('id', userId)
    .single()
  if (error) {
    console.error(`[animate] balance lookup failed user=${userId.slice(0, 8)}:`, error.message)
    throw new AnimateServiceError('Could not verify your credit balance. Please try again.', 503, { retrySafe: true })
  }
  return typeof profile?.video_credits === 'number' ? profile.video_credits : 0
}

export function assertOwnedAnimateImageUrl(imageUrl: string, userId: string): string {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!supabaseUrl) throw new AnimateServiceError('Image storage is not configured.', 500, { retrySafe: true })

  let parsed: URL
  let storageOrigin: string
  try {
    parsed = new URL(imageUrl)
    storageOrigin = new URL(supabaseUrl).origin
  } catch {
    throw new AnimateServiceError('Please upload or import your photo first.', 400, { retrySafe: true })
  }
  const ownedPath = `/storage/v1/object/public/avatars/${userId}/`
  if (parsed.origin !== storageOrigin || !parsed.pathname.startsWith(ownedPath)) {
    throw new AnimateServiceError('Please upload or import your photo first.', 400, { retrySafe: true })
  }
  return parsed.toString()
}

function assertAnimateBillingReference(billingReference: string): string {
  if (!/^animate-[a-f0-9-]{36}$/i.test(billingReference)) {
    throw new AnimateServiceError('Animation billing reference is invalid.', 500, { retrySafe: true })
  }
  return billingReference
}

export async function reserveAnimateCredits(args: {
  supabase: SupabaseClient
  userId: string
  billingReference: string
}): Promise<number> {
  const billingReference = assertAnimateBillingReference(args.billingReference)
  const { data: newBalance, error } = await debitVideoCredits(args.supabase, {
    userId: args.userId,
    renderId: billingReference,
    cost: ANIMATE_COST,
  })
  if (error || typeof newBalance !== 'number') {
    const message = error?.message ?? 'no balance returned'
    console.error(`[animate] upfront debit failed user=${args.userId.slice(0, 8)}:`, message)
    // The RPC may have committed even if its response was lost. Verify the
    // deterministic ledger key before claiming that nothing was charged.
    const confirmed = await confirmAnimateDebit({ userId: args.userId, billingReference })
    if (confirmed.ok && !confirmed.refunded) {
      try {
        return await getAnimateBalance(args.supabase, args.userId)
      } catch {
        throw new AnimateServiceError(
          'Your 5-credit reservation was recorded while its response is being reconciled. Nothing was submitted yet.',
          503,
          { pending: true, debitCommitted: true, retry: false },
        )
      }
    }
    if (confirmed.ok && confirmed.refunded) {
      throw new AnimateServiceError(
        'This Animate billing key was already refunded. Start again with a new Idempotency-Key.',
        409,
        { use_new_idempotency_key: true, debitRefunded: true, retry: false },
      )
    }
    if (!confirmed.ok) {
      if (confirmed.reason !== 'missing') {
        throw new AnimateServiceError(
          'Your credit reservation is being reconciled. Nothing new was submitted.',
          503,
          { pending: true, debitUnknown: true, retry: false },
        )
      }
    }
    const insufficient = /balance|credit|insufficient/i.test(message)
    if (insufficient) {
      throw new AnimateServiceError(
        `Animating a photo costs ${ANIMATE_COST} credits. Your available balance changed before it could start.`,
        402,
        { balance: typeof newBalance === 'number' ? newBalance : 0, retrySafe: true },
      )
    }
    // A transport failure can be observed before the committed ledger row is
    // visible. Keep the deterministic claim alive until a later reconciliation
    // proves whether the debit happened.
    throw new AnimateServiceError(
      'Your credit reservation is being reconciled. Nothing new was submitted.',
      503,
      { pending: true, debitUnknown: true, retry: false },
    )
  }
  return newBalance
}

export async function reconcileAnimateCreditRefund(args: {
  userId: string
  billingReference: string
}): Promise<
  | { state: 'refunded'; amount: number }
  | { state: 'missing' }
  | { state: 'unconfirmed' }
> {
  await refundRenderCredits(args.billingReference)
  const confirmed = await confirmAnimateDebit(args)
  if (confirmed.ok) {
    return confirmed.refunded
      ? { state: 'refunded', amount: confirmed.amount }
      : { state: 'unconfirmed' }
  }
  return confirmed.reason === 'missing' ? { state: 'missing' } : { state: 'unconfirmed' }
}

export async function refundAnimateCreditsConfirmed(args: {
  userId: string
  billingReference: string
}): Promise<number | null> {
  const result = await reconcileAnimateCreditRefund(args)
  return result.state === 'refunded' ? result.amount : null
}

/**
 * KINEO-ANIMATE-ORFAO-2026-08-15 — o IRMÃO QUE FALTAVA de
 * sweepStaleAnimateClaims(). Medido nesta sprint, não inferido.
 *
 * O DEFEITO, em três lugares independentes do código:
 *   1. `sweepStuckRenderDebits()` exclui `animate-%` DE PROPÓSITO (e está
 *      certo: clipes Animate nunca persistem em `videos`, então "sem linha em
 *      videos" é o estado NORMAL de sucesso). O comentário de lá delega:
 *      *"Their failures are refunded live by /api/avatar-status instead."*
 *   2. `sweepStaleAnimateClaims()` (logo abaixo) só alcança o débito cujo job
 *      NUNCA foi publicado no provedor — `if (!jobLoad.ok || jobLoad.job)
 *      continue`. No instante em que `animate_job_submitted` é gravado, ele
 *      pula aquela linha para sempre. O próprio docstring dele declara o
 *      escopo: *"before a signed provider mapping is published"*.
 *   3. Logo, para um job PUBLICADO que falha, o único ator do sistema inteiro
 *      capaz de estornar é `/api/avatar-status` — e ele só roda **se a aba do
 *      cliente continuar aberta e continuar perguntando**.
 *
 * Fechar a aba, portanto, deixa o crédito preso para sempre — sem nenhum ator
 * restante. É EXATAMENTE o buraco que KINEO-CREDIT-INTEGRITY-2026-08-05 já
 * reconheceu e fechou para os motores cinematográficos
 * (`sweepAbandonedCinematicDebits`, cujo comentário no cron diz literalmente
 * *"só tinham refund AO VIVO (dependente da aba do usuário continuar
 * aberta)"*). Animate nunca ganhou o mesmo tratamento. Isto é a simetria.
 *
 * O TAMANHO MEDIDO (produção, 15/08): **14 jobs publicados · 4 pessoas · 70
 * créditos · `refunded_at IS NULL` em 14 de 14 · 0 contas internas.** Animate é
 * o ÚNICO motor da casa com 100% de clientes externos reais. E como não existe
 * nenhum evento terminal (`animate_job_submitted` e `animate_submission_claim`
 * são os únicos eventos `animate*` do banco), hoje é IMPOSSÍVEL distinguir
 * "14 clientes satisfeitos" de "70 créditos presos" — as duas hipóteses
 * produzem exatamente o mesmo rastro. Esta varredura é o que passa a separar
 * as duas, gravando o evento terminal que nunca existiu.
 *
 * REGRA DE DECISÃO — falha FECHADA em toda ambiguidade:
 *   · quem decide é o PROVEDOR, não o relógio. O corte de 2h (idêntico ao do
 *     irmão) só define quando vale a pena PERGUNTAR; nada é condenado por
 *     tempo. Um corte generoso, portanto, não custa nada.
 *   · `checkAvatarJob` devolve `processing` em exceção de transporte (rede,
 *     429, 5xx) — nunca `failed`. Só um estado terminal explícito da fila
 *     estorna.
 *   · sem `FAL_KEY` a função sai ANTES do laço: `configureFal()` falso faz
 *     `checkAvatarJob` devolver `failed` para TUDO, o que estornaria a base
 *     inteira por env faltando. Este é o guarda-corpo mais importante daqui.
 *   · o estorno reusa `reconcileAnimateCreditRefund` — o MESMO caminho
 *     idempotente do vivo (`UPDATE ... WHERE refunded_at IS NULL`), então
 *     rodar junto com a aba do cliente nunca estorna em dobro.
 *   · `done` NUNCA estorna: só conta e grava o evento terminal.
 */
export async function sweepPublishedAnimateJobs(): Promise<{
  scanned: number
  delivered: number
  refunded: number
  creditsReturned: number
  /** Provedor ainda trabalhando ou ilegível: fica para a hora seguinte. */
  ambiguous: number
}> {
  const result = { scanned: 0, delivered: 0, refunded: 0, creditsReturned: 0, ambiguous: 0 }
  // GUARDA-CORPO Nº 1 (ver docstring): sem chave do provedor, checkAvatarJob
  // devolve `failed` para todo mundo. Sair aqui é a diferença entre "não
  // varreu" e "estornou a base inteira porque uma env sumiu".
  if (!process.env.FAL_KEY) return result
  const adminUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const adminKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!adminUrl || !adminKey) return result
  const admin = createAdminClient(adminUrl, adminKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const cutoff = new Date(Date.now() - PUBLISHED_ANIMATE_CUTOFF_MS).toISOString()
  // GUARDA-CORPO Nº 2 — achado da revisão adversarial desta sprint, contra a
  // PRIMEIRA versão desta própria função. Débito Animate BEM-SUCEDIDO fica com
  // `refunded_at NULL` para sempre (é o estado normal de sucesso, por isso a
  // varredura genérica exclui `animate-%`). Sem piso de idade, esta função
  // voltaria a perguntar ao provedor sobre CADA sucesso histórico A CADA HORA,
  // para sempre — custo que só cresce. E há um risco pior junto: resultado
  // velho purgado da fila do fal pode voltar como estado não mapeado, que
  // `checkAvatarJob` traduz para `failed` — ou seja, estornaríamos um clipe que
  // a pessoa recebeu. 7 dias cobre com folga os 14 jobs vivos (o mais velho tem
  // 8 dias) e fecha as duas pontas.
  const floor = new Date(Date.now() - PUBLISHED_ANIMATE_MAX_AGE_MS).toISOString()
  const { data: debits, error } = await admin
    .from('credit_debits')
    .select('render_id,user_id,amount,created_at')
    .eq('kind', 'video')
    .like('render_id', 'animate-%')
    .is('refunded_at', null)
    .lt('created_at', cutoff)
    .gt('created_at', floor)
    // Mesma ordenação do irmão e pelo mesmo motivo: débitos Animate
    // BEM-SUCEDIDOS ficam para sempre com refunded_at NULL, então varrer do
    // mais antigo primeiro deixaria sucessos históricos entupirem a janela.
    .order('created_at', { ascending: false })
    .limit(200)
  if (error) {
    console.error('[animate/published-sweep] debit lookup failed:', error.message)
    return result
  }

  for (const row of debits ?? []) {
    const billingReference = typeof row.render_id === 'string' ? row.render_id : ''
    const userId = typeof row.user_id === 'string' ? row.user_id : ''
    if (!userId || !/^animate-[a-f0-9-]{36}$/i.test(billingReference)) continue
    result.scanned += 1

    // Só jobs PUBLICADOS — o inverso exato da linha que o irmão usa para
    // pular. Sem mapeamento assinado, a linha é problema dele, não daqui.
    const jobLoad = await loadVerifiedAnimateJobByBilling({ userId, billingReference })
    if (!jobLoad.ok || !jobLoad.job) continue
    const requestId = jobLoad.job.requestId
    if (!requestId) continue

    // GUARDA-CORPO Nº 3 (mesma revisão adversarial): o que faz esta varredura
    // CONVERGIR. Um `delivered` não muda o débito de estado nenhum — sem esta
    // checagem o mesmo job entregue seria reperguntado ao provedor em toda
    // rodada dentro da janela de 7 dias (168 chamadas pagas por clipe feliz).
    // Com ela, cada job custa no máximo uma resolução.
    const { data: settled, error: settledError } = await admin
      .from('events')
      .select('id')
      .eq('name', 'animate_job_settled')
      .eq('user_id', userId)
      .contains('metadata', { billing_reference: billingReference })
      .limit(1)
    // Falha FECHADA: sem conseguir ler, não pergunta e não estorna nesta rodada.
    if (settledError) {
      console.warn(`[animate/published-sweep] settled lookup failed ref=${billingReference}:`, settledError.message)
      continue
    }
    if (settled?.length) continue

    const state = await checkAvatarJob(requestId, 'animate')

    if (state.status === 'done') {
      // Sucesso: o crédito está corretamente gasto e NÃO se toca nele. O que
      // muda é só o silêncio — este é o evento terminal que nunca existiu.
      result.delivered += 1
      await writeServerEvent({
        name: 'animate_job_settled',
        userId,
        metadata: {
          outcome: 'delivered',
          billing_reference: billingReference,
          request_id: requestId,
          settled_by: 'published_sweep',
          age_ms: Math.max(0, Date.now() - Date.parse(String(row.created_at))),
        },
      })
      continue
    }

    if (state.status !== 'failed') {
      // pending / processing — inclusive toda exceção de transporte, que
      // checkAvatarJob mapeia para `processing` de propósito. Fica vivo.
      result.ambiguous += 1
      continue
    }

    const refund = await reconcileAnimateCreditRefund({ userId, billingReference })
    if (refund.state !== 'refunded') {
      // `unconfirmed`/`missing` — falha FECHADA, tenta de novo na hora que vem.
      result.ambiguous += 1
      continue
    }
    result.refunded += 1
    result.creditsReturned += refund.amount
    await writeServerEvent({
      name: 'animate_job_settled',
      userId,
      metadata: {
        outcome: 'refunded',
        billing_reference: billingReference,
        request_id: requestId,
        credits: refund.amount,
        settled_by: 'published_sweep',
        age_ms: Math.max(0, Date.now() - Date.parse(String(row.created_at))),
      },
    })
  }

  return result
}

/**
 * Daily backstop for callers that disappear after a debit but before a signed
 * provider mapping is published. Normal retries reconcile in ~90 seconds; this
 * sweep guarantees that closing a tab or abandoning an API process cannot keep
 * credits reserved forever.
 *
 * ⚠️ ESCOPO (não alargar sem ler sweepPublishedAnimateJobs acima): esta função
 * para no job PUBLICADO de propósito — a linha `if (!jobLoad.ok ||
 * jobLoad.job) continue`. Quem cuida do publicado é a varredura irmã.
 */
export async function sweepStaleAnimateClaims(): Promise<{
  scanned: number
  refunded: number
  released: number
}> {
  const result = { scanned: 0, refunded: 0, released: 0 }
  const adminUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const adminKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!adminUrl || !adminKey) return result
  const admin = createAdminClient(adminUrl, adminKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const cutoff = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
  const { data: debits, error } = await admin
    .from('credit_debits')
    .select('render_id,user_id,created_at')
    .like('render_id', 'animate-%')
    .is('refunded_at', null)
    .lt('created_at', cutoff)
    // Newest stale reservations first: successful Animate debits remain
    // unrefunded forever, so ordering oldest-first would let historical
    // successes permanently crowd this recovery window.
    .order('created_at', { ascending: false })
    .limit(1000)
  if (error) {
    console.error('[animate/sweep] debit lookup failed:', error.message)
    return result
  }

  for (const row of debits ?? []) {
    const billingReference = typeof row.render_id === 'string' ? row.render_id : ''
    const userId = typeof row.user_id === 'string' ? row.user_id : ''
    if (!userId || !/^animate-[a-f0-9-]{36}$/i.test(billingReference)) continue
    result.scanned += 1

    const claimLoad = await loadVerifiedAnimateClaimByBilling({ userId, billingReference })
    if (!claimLoad.ok || !claimLoad.claim || claimLoad.claim.status !== 'pending') continue
    if (Date.parse(claimLoad.claim.startedAt) > Date.parse(cutoff)) continue

    const jobLoad = await loadVerifiedAnimateJobByBilling({ userId, billingReference })
    if (!jobLoad.ok || jobLoad.job) continue

    const refund = await reconcileAnimateCreditRefund({ userId, billingReference })
    if (refund.state !== 'refunded') continue
    result.refunded += 1
    const released = await releaseAnimateClaim({
      claim: claimLoad.claim,
      reason: 'daily_stale_submission_refunded',
    })
    if (released) result.released += 1
  }
  return result
}

export interface AnimateStartResult {
  requestId: string
  imageUrl: string
  duration: '5' | '10'
  creditsCharged: number
  balance: number
}

export async function startAnimateJob(args: {
  supabase: SupabaseClient
  userId: string
  imageUrl: string
  prompt: string
  duration: '5' | '10'
  billingReference?: string
  prepaidBalance?: number
}): Promise<AnimateStartResult> {
  if (!process.env.FAL_KEY) {
    throw new AnimateServiceError('Animation engine is not configured.', 500, { retrySafe: true })
  }

  const imageUrl = assertOwnedAnimateImageUrl(args.imageUrl, args.userId)
  const billingReference = assertAnimateBillingReference(args.billingReference ?? `animate-${randomUUID()}`)
  let newBalance: number
  if (typeof args.prepaidBalance === 'number') {
    const debit = await confirmAnimateDebit({ userId: args.userId, billingReference })
    if (!debit.ok || debit.refunded) {
      throw new AnimateServiceError('Your reserved Animate charge could not be verified. Nothing was submitted.', 503, { retrySafe: true })
    }
    newBalance = args.prepaidBalance
  } else {
    const balance = await getAnimateBalance(args.supabase, args.userId)
    if (balance < ANIMATE_COST) {
      throw new AnimateServiceError(
        `Animating a photo costs ${ANIMATE_COST} credits. You have ${balance}.`,
        402,
        { balance, retrySafe: true },
      )
    }
    // The RPC is the concurrency boundary: credits are reserved atomically
    // before the first paid provider POST, so parallel calls cannot overspend.
    newBalance = await reserveAnimateCredits({
      supabase: args.supabase,
      userId: args.userId,
      billingReference,
    })
  }

  const refundAndConfirm = () => refundAnimateCreditsConfirmed({
    userId: args.userId,
    billingReference,
  })

  let requestId: string | null
  try {
    requestId = await submitAnimateJob({
      imageUrl,
      prompt: normalizeAnimatePrompt(args.prompt),
      duration: args.duration,
    })
  } catch (error) {
    if (error instanceof AvatarSubmitError && error.ambiguous) {
      const refunded = await refundAndConfirm()
      throw new AnimateServiceError(
        refunded !== null
          ? `The provider response was uncertain. Your ${refunded} credits were refunded, but do not submit this same image again yet; contact support so we can check for the original job.`
          : 'The provider response was uncertain and your automatic refund is still being confirmed. Do not submit again yet.',
        refunded !== null ? 409 : 503,
        { pending: true, retry: false, credits_refunded: refunded ?? 0 },
      )
    }
    const refunded = await refundAndConfirm()
    throw new AnimateServiceError(
      refunded !== null
        ? `The animation engine rejected the job. Your ${refunded} credits were refunded automatically.`
        : 'The animation engine rejected the job and your refund is still being confirmed.',
      refunded !== null ? 502 : 503,
      { pending: refunded === null, retrySafe: refunded !== null, credits_refunded: refunded ?? 0 },
    )
  }

  if (!requestId) {
    const refunded = await refundAndConfirm()
    console.error(`[animate] provider rejected submit user=${args.userId.slice(0, 8)}`)
    throw new AnimateServiceError(
      refunded !== null
        ? `The animation engine could not accept the job. Your ${refunded} credits were refunded automatically.`
        : 'The animation engine could not accept the job and your refund is still being confirmed.',
      refunded !== null ? 502 : 503,
      { pending: refunded === null, retrySafe: refunded !== null, credits_refunded: refunded ?? 0 },
    )
  }

  // This signed mapping is authoritative for ownership and refunds. Do not
  // reveal requestId until it is durable.
  const published = await publishAnimateJob({
    userId: args.userId,
    requestId,
    billingReference,
    imageUrl,
    duration: args.duration,
    balance: newBalance,
  })
  if (!published.ok) {
    console.error(`[animate] durable job publication failed request=${requestId}:`, published.error)
    if (published.pending) {
      throw new AnimateServiceError(
        'The provider accepted your clip while secure tracking is being reconciled. Do not submit again.',
        503,
        { pending: true, retry: false, request_id: requestId, debitCommitted: true },
      )
    }
    const refunded = await refundAndConfirm()
    throw new AnimateServiceError(
      refunded !== null
        ? `The provider accepted the clip, but secure tracking failed. Your ${refunded} credits were refunded; do not submit it again yet.`
        : 'The provider accepted the clip, but secure tracking and refund reconciliation are still in progress. Do not submit again.',
      503,
      { pending: true, retry: false, request_id: requestId, credits_refunded: refunded ?? 0 },
    )
  }

  // Keep the legacy lookup table populated for operational visibility. The
  // signed events record above remains the authorization source.
  const adminUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const adminKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (adminUrl && adminKey) {
    try {
      const admin = createAdminClient(adminUrl, adminKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      })
      const { error: ownerMapError } = await admin.from('avatar_jobs').insert({
        request_id: requestId,
        user_id: args.userId,
        engine: 'animate',
      })
      if (ownerMapError && ownerMapError.code !== '23505') {
        console.error('[animate] owner mapping failed:', ownerMapError.message)
      }
    } catch (error) {
      console.error('[animate] legacy owner mapping threw (non-blocking):', error instanceof Error ? error.message : String(error))
    }
  }

  console.log(`[animate] submitted user=${args.userId.slice(0, 8)} request=${requestId} duration=${args.duration}s`)
  return {
    requestId,
    imageUrl,
    duration: args.duration,
    creditsCharged: ANIMATE_COST,
    balance: newBalance,
  }
}

export async function getAnimateJobStatus(args: {
  userId: string
  requestId: string
}): Promise<AvatarJobState & { creditsRefunded?: number }> {
  const requestId = args.requestId.trim()
  if (!requestId || requestId.length > 200 || !/^[a-zA-Z0-9_-]+$/.test(requestId)) {
    throw new AnimateServiceError('Animation job not found.', 404)
  }

  const adminUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const adminKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!adminUrl || !adminKey) {
    throw new AnimateServiceError('Status safety check is temporarily unavailable.', 503)
  }
  const admin = createAdminClient(adminUrl, adminKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const modern = await loadVerifiedAnimateJob({ userId: args.userId, requestId })
  if (!modern.ok) {
    if (modern.reason === 'not_found') {
      throw new AnimateServiceError('Animation job not found.', 404)
    }
    console.error('[animate] signed owner lookup failed:', modern.error)
    throw new AnimateServiceError('Status safety check is temporarily unavailable.', 503)
  }

  let billingReference = modern.job?.billingReference ?? ''
  if (modern.job) {
    const debit = await confirmAnimateDebit({ userId: args.userId, billingReference })
    if (!debit.ok) {
      console.error('[animate] debit verification failed:', debit.error)
      throw new AnimateServiceError('Your animation is safe while we verify its credit charge. Please retry shortly.', 503)
    }
    if (debit.refunded) {
      return { status: 'failed', videoUrl: null, creditsRefunded: debit.amount }
    }
  } else {
    // Migration fallback for jobs created before signed mappings existed.
    billingReference = `animate-${requestId}`
    const { data: job, error: jobError } = await admin
      .from('avatar_jobs')
      .select('request_id,user_id,engine')
      .eq('request_id', requestId)
      .maybeSingle()
    if (jobError) {
      console.error('[animate] legacy owner lookup failed:', jobError.message)
      throw new AnimateServiceError('Status safety check is temporarily unavailable.', 503)
    }
    // A caller can choose p_render when invoking the debit RPC, so a debit row
    // alone is never ownership authority. Legacy access requires avatar_jobs.
    const owned = job?.user_id === args.userId && job?.engine === 'animate'
    if (!owned) throw new AnimateServiceError('Animation job not found.', 404)
  }

  const state = await checkAvatarJob(requestId, 'animate')
  if (state.status !== 'failed') return state

  await refundRenderCredits(billingReference)
  const confirmed = await confirmAnimateDebit({ userId: args.userId, billingReference })
  if (!confirmed.ok) {
    // The old flow allowed a provider job even when its post-submit debit
    // failed. Such a legacy job has nothing to refund.
    if (!modern.job && confirmed.reason === 'missing') {
      return { ...state, creditsRefunded: 0 }
    }
    console.error('[animate] refund confirmation failed:', confirmed.error)
    throw new AnimateServiceError('Finalizing your automatic refund. Please retry this status check.', 503)
  }
  if (!confirmed.refunded) {
    throw new AnimateServiceError('Finalizing your automatic refund. Please retry this status check.', 503)
  }
  return { ...state, creditsRefunded: confirmed.amount }
}
