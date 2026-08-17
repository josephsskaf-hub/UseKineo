// Browser submit endpoint for photos already stored in this user's avatars
// folder. It shares the durable claim + deterministic credit reservation used
// by /api/animate, so retries cannot submit or charge a second paid job.
import { NextRequest, NextResponse } from 'next/server'
import {
  acquireAnimateClaim,
  admitAnimateAttempt,
  animateValueHash,
  completeAnimateClaim,
  confirmAnimateDebit,
  deletePendingAnimateClaim,
  loadVerifiedAnimateJobByBilling,
  releaseAnimateClaim,
  type AnimateClaimResponse,
  type VerifiedAnimateClaim,
  validAnimateIdempotencyKey,
} from '@/lib/animate/claim'
import { authenticateAnimateRequest } from '@/lib/animate/requestAuth'
import {
  ANIMATE_COST,
  AnimateServiceError,
  assertOwnedAnimateImageUrl,
  getAnimateBalance,
  normalizeAnimateDuration,
  normalizeAnimatePrompt,
  reconcileAnimateCreditRefund,
  reserveAnimateCredits,
  startAnimateJob,
} from '@/lib/animate/service'
import { downloadPublicAnimateImage, RemoteImageError } from '@/lib/animate/remoteImage'

export const maxDuration = 60
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const PENDING_RECONCILE_MS = 90_000
const MAX_RISKY_ATTEMPTS_PER_WINDOW = 10

function jobResponse(response: AnimateClaimResponse, extra?: Record<string, unknown>) {
  return NextResponse.json(
    {
      status: 'processing',
      ...response,
      engine: 'animate',
      ...extra,
    },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}

function closedClaimResponse(args: {
  released: boolean
  releasedMessage: string
  pendingMessage: string
}) {
  return NextResponse.json(
    {
      error: args.released ? args.releasedMessage : args.pendingMessage,
      use_new_idempotency_key: args.released,
      pending: !args.released,
    },
    {
      status: args.released ? 409 : 503,
      headers: {
        'Cache-Control': 'no-store',
        ...(!args.released ? { 'Retry-After': '5' } : {}),
      },
    },
  )
}

export async function POST(req: NextRequest) {
  let claim: VerifiedAnimateClaim | null = null
  let creditsReserved = false
  let providerStageStarted = false

  try {
    const auth = await authenticateAnimateRequest(req)
    if (!auth) {
      return NextResponse.json({ error: 'You must be signed in.' }, { status: 401 })
    }

    let body: {
      imageUrl?: unknown
      prompt?: unknown
      duration?: unknown
      idempotencyKey?: unknown
      idempotency_key?: unknown
    }
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
    }

    const imageUrl = typeof body.imageUrl === 'string' ? body.imageUrl.trim() : ''
    const prompt = normalizeAnimatePrompt(body.prompt)
    const duration = normalizeAnimateDuration(body.duration)
    const headerKey = req.headers.get('idempotency-key')?.trim() ?? ''
    const camelKey = typeof body.idempotencyKey === 'string' ? body.idempotencyKey.trim() : ''
    const snakeKey = typeof body.idempotency_key === 'string' ? body.idempotency_key.trim() : ''
    const idempotencyKey = headerKey || camelKey || snakeKey
    if (!validAnimateIdempotencyKey(idempotencyKey)) {
      return NextResponse.json(
        { error: 'A valid Animate submission key is required. Please try again.' },
        { status: 400 },
      )
    }

    const fingerprint = animateValueHash({
      source: 'owned-upload',
      image_url: imageUrl,
      motion_prompt: prompt,
      duration,
    })
    const acquired = await acquireAnimateClaim({
      userId: auth.user.id,
      idempotencyKey,
      fingerprint,
    })

    if (acquired.kind === 'error') {
      console.error('[animate-image] claim acquire failed:', acquired.error)
      return NextResponse.json(
        { error: 'Animate submission safety is temporarily unavailable. Nothing was submitted.' },
        { status: 503, headers: { 'Retry-After': '5' } },
      )
    }
    if (acquired.kind === 'conflict') {
      return NextResponse.json({ error: acquired.error }, { status: 409 })
    }
    if (acquired.kind === 'replay') {
      return jobResponse(acquired.response, { idempotent_replay: true })
    }
    if (acquired.kind === 'released') {
      return NextResponse.json(
        {
          error: 'This Animate attempt was closed after a confirmed refund. Please try again.',
          use_new_idempotency_key: true,
        },
        { status: 409, headers: { 'Cache-Control': 'no-store' } },
      )
    }

    if (acquired.kind === 'pending') {
      // Recover a job whose signed mapping committed just before the original
      // invocation ended, without ever sending the paid POST again.
      const recovered = await loadVerifiedAnimateJobByBilling({
        userId: auth.user.id,
        billingReference: acquired.claim.billingReference,
      })
      if (!recovered.ok) {
        console.error('[animate-image] pending claim recovery failed:', recovered.error)
        return NextResponse.json(
          { error: 'This Animate request is safe while it is reconciled.', pending: true },
          { status: 503, headers: { 'Cache-Control': 'no-store', 'Retry-After': '5' } },
        )
      }
      if (recovered.job) {
        const response: AnimateClaimResponse = {
          request_id: recovered.job.requestId,
          image_url: recovered.job.imageUrl,
          duration: recovered.job.duration,
          credits_charged: ANIMATE_COST,
          balance: recovered.job.balance,
        }
        const saved = await completeAnimateClaim({
          claim: acquired.claim,
          idempotencyKey,
          response,
        })
        return jobResponse(response, {
          idempotent_replay: true,
          recovered: true,
          idempotency_saved: saved,
        })
      }

      const ageMs = Date.now() - Date.parse(acquired.claim.startedAt)
      const debit = await confirmAnimateDebit({
        userId: auth.user.id,
        billingReference: acquired.claim.billingReference,
      })
      if (debit.ok && debit.refunded) {
        const released = await releaseAnimateClaim({
          claim: acquired.claim,
          reason: 'refund_confirmed_before_job_publication',
        })
        return closedClaimResponse({
          released,
          releasedMessage: 'The previous Animate attempt was refunded. Please try again.',
          pendingMessage: 'The previous refund is confirmed while its request is being closed.',
        })
      }
      if (!debit.ok && debit.reason !== 'missing') {
        console.error('[animate-image] pending debit reconciliation failed:', debit.error)
        return NextResponse.json(
          { error: 'This Animate request is safe while its credit reservation is reconciled.', pending: true },
          { status: 503, headers: { 'Cache-Control': 'no-store', 'Retry-After': '5' } },
        )
      }

      if (Number.isFinite(ageMs) && ageMs >= PENDING_RECONCILE_MS) {
        let closeMode: 'delete' | 'release' | null = debit.ok ? 'release' : 'delete'
        if (debit.ok) {
          const refund = await reconcileAnimateCreditRefund({
            userId: auth.user.id,
            billingReference: acquired.claim.billingReference,
          })
          if (refund.state === 'unconfirmed') closeMode = null
          else if (refund.state === 'missing') closeMode = 'delete'
          else closeMode = 'release'
        }
        if (!closeMode) {
          return NextResponse.json(
            { error: 'The stale Animate attempt is being refunded. Please retry shortly.', pending: true },
            { status: 503, headers: { 'Cache-Control': 'no-store', 'Retry-After': '5' } },
          )
        }
        const closed = closeMode === 'release'
          ? await releaseAnimateClaim({ claim: acquired.claim, reason: 'stale_attempt_refunded' })
          : await deletePendingAnimateClaim(acquired.claim)
        return NextResponse.json(
          {
            error: closed
              ? closeMode === 'release'
                ? 'The stale Animate attempt was refunded. Please try again.'
                : 'The stale pre-charge attempt was closed. Please try again.'
              : 'The stale Animate attempt is still being reconciled.',
            use_new_idempotency_key: closed && closeMode === 'release',
            retry_same_idempotency_key: closed && closeMode === 'delete',
            pending: !closed,
          },
          {
            status: closed ? 409 : 503,
            headers: { 'Cache-Control': 'no-store', ...(!closed ? { 'Retry-After': '5' } : {}) },
          },
        )
      }

      return NextResponse.json(
        { error: 'This Animate request is already being submitted. Please retry shortly.', pending: true },
        { status: 409, headers: { 'Cache-Control': 'no-store', 'Retry-After': '3' } },
      )
    }

    claim = acquired.claim
    // Do not trust a public storage URL merely because it is under this user's
    // folder. Verify the stored bytes are still a real JPG/PNG within 8 MB.
    const ownedImageUrl = assertOwnedAnimateImageUrl(imageUrl, auth.user.id)

    const balance = await getAnimateBalance(auth.supabase, auth.user.id)
    if (balance < ANIMATE_COST) {
      await deletePendingAnimateClaim(claim)
      claim = null
      return NextResponse.json(
        { error: `Animating a photo costs ${ANIMATE_COST} credits. You have ${balance}.`, balance },
        { status: 402 },
      )
    }

    const reservedBalance = await reserveAnimateCredits({
      supabase: auth.supabase,
      userId: auth.user.id,
      billingReference: claim.billingReference,
    })
    creditsReserved = true
    const admission = await admitAnimateAttempt({
      userId: auth.user.id,
      billingReference: claim.billingReference,
      refundedSinceIso: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
      activeSinceIso: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
      maxAttempts: MAX_RISKY_ATTEMPTS_PER_WINDOW,
    })
    if (!admission.ok || !admission.allowed) {
      const refund = await reconcileAnimateCreditRefund({
        userId: auth.user.id,
        billingReference: claim.billingReference,
      })
      if (refund.state !== 'refunded') {
        throw new AnimateServiceError(
          'Your Animate reservation is being reconciled. Nothing was submitted.',
          503,
          { pending: true, debitCommitted: true },
        )
      }
      const released = await releaseAnimateClaim({
        claim,
        reason: admission.ok ? 'attempt_window_limit_refunded' : 'admission_check_refunded',
      })
      if (!released) {
        throw new AnimateServiceError(
          'Your credits were refunded while this request is being closed.',
          503,
          { pending: true, debitRefunded: true },
        )
      }
      creditsReserved = false
      claim = null
      return NextResponse.json(
        {
          error: admission.ok
            ? 'Too many recent or refunded Animate attempts. Please wait before starting another batch.'
            : 'Animate safety checks are temporarily unavailable. Your credits were refunded.',
          use_new_idempotency_key: true,
        },
        {
          status: admission.ok ? 429 : 503,
          headers: {
            'Cache-Control': 'no-store',
            'Retry-After': admission.ok ? '120' : '5',
          },
        },
      )
    }
    await downloadPublicAnimateImage(ownedImageUrl)
    providerStageStarted = true
    const result = await startAnimateJob({
      supabase: auth.supabase,
      userId: auth.user.id,
      imageUrl: ownedImageUrl,
      prompt,
      duration,
      billingReference: claim.billingReference,
      prepaidBalance: reservedBalance,
    })
    const response: AnimateClaimResponse = {
      request_id: result.requestId,
      image_url: result.imageUrl,
      duration: result.duration,
      credits_charged: result.creditsCharged,
      balance: result.balance,
    }
    const idempotencySaved = await completeAnimateClaim({ claim, idempotencyKey, response })
    if (!idempotencySaved) {
      console.error(`[animate-image] job started but claim completion needs recovery request=${result.requestId}`)
    }
    return jobResponse(response, { idempotency_saved: idempotencySaved })
  } catch (error) {
    const retrySafe = error instanceof AnimateServiceError && error.details?.retrySafe === true
    const canReleaseClaim = !providerStageStarted || retrySafe
    const debitCommitted = error instanceof AnimateServiceError && error.details?.debitCommitted === true
    const debitUnknown = error instanceof AnimateServiceError && error.details?.debitUnknown === true
    const debitRefunded = error instanceof AnimateServiceError && error.details?.debitRefunded === true
    const knownDebit = creditsReserved || debitCommitted
    const debitMayExist = knownDebit || debitUnknown || debitRefunded
    let lifecycleReconciliationFailed = false
    let claimReleased = false

    if (claim && canReleaseClaim) {
      if (debitMayExist) {
        const refund = await reconcileAnimateCreditRefund({
          userId: claim.userId,
          billingReference: claim.billingReference,
        })
        if (refund.state === 'unconfirmed' || (refund.state === 'missing' && debitMayExist)) {
          lifecycleReconciliationFailed = true
        } else if (refund.state === 'refunded') {
          claimReleased = await releaseAnimateClaim({ claim, reason: 'submission_closed_after_refund' })
          lifecycleReconciliationFailed = !claimReleased
        } else {
          const deleted = await deletePendingAnimateClaim(claim)
          lifecycleReconciliationFailed = !deleted
        }
      } else {
        const deleted = await deletePendingAnimateClaim(claim)
        lifecycleReconciliationFailed = !deleted
      }
    }

    if (lifecycleReconciliationFailed) {
      return NextResponse.json(
        {
          error: 'Your image was not submitted while we reconcile its credit reservation. Please retry in 90 seconds.',
          pending: true,
        },
        { status: 503, headers: { 'Cache-Control': 'no-store', 'Retry-After': '90' } },
      )
    }
    if (error instanceof AnimateServiceError) {
      return NextResponse.json(
        {
          error: error.message,
          ...(error.details ?? {}),
          ...(claimReleased ? { use_new_idempotency_key: true } : {}),
        },
        {
          status: error.status,
          headers: {
            'Cache-Control': 'no-store',
            ...(error.details?.pending === true ? { 'Retry-After': '5' } : {}),
          },
        },
      )
    }
    if (error instanceof RemoteImageError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status, headers: { 'Cache-Control': 'no-store' } },
      )
    }
    console.error('[animate-image] unexpected error:', error instanceof Error ? error.message : String(error))
    if (claim && providerStageStarted) {
      return NextResponse.json(
        {
          error: 'This Animate submission is being reconciled. Please keep this request open.',
          pending: true,
        },
        { status: 503, headers: { 'Cache-Control': 'no-store', 'Retry-After': '5' } },
      )
    }
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
  }
}
