import { createHash } from 'node:crypto'
import type { SupabaseClient } from '@supabase/supabase-js'

export type PaymentDb = SupabaseClient
export type AlternativeProvider = 'paypal' | 'mercadopago' | 'hotmart'

// A statement rejected by Postgres did not grant anything. A network failure
// is different: its outcome is unknown, so it must NEVER release the journal.
export class GrantNotAppliedError extends Error {}

export function paymentEventId(provider: string, key: string): string {
  const hex = createHash('sha256').update(`alternative-payment:${provider}:${key}`).digest('hex').slice(0, 32)
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

export function paymentError(reason: string, error?: { code?: string } | null): Error {
  // Provider payloads / database messages can contain PII or credentials.
  return new Error(`${reason}${error?.code ? ` (${error.code})` : ''}`)
}

async function readEvent(db: PaymentDb, provider: string, key: string) {
  const { data, error } = await db.from('events').select('id,user_id,metadata')
    .eq('id', paymentEventId(provider, key)).maybeSingle()
  if (error) throw paymentError('event_lookup_failed', error)
  return data as { id: string; user_id: string | null; metadata: Record<string, unknown> } | null
}

async function insertEvent(db: PaymentDb, provider: AlternativeProvider, key: string, name: string,
  userId: string | null, metadata: Record<string, unknown>) {
  const { error } = await db.from('events').insert({
    id: paymentEventId(provider, key), name, user_id: userId,
    path: `/api/${provider}/webhook`, metadata: { ...metadata, provider, source: `${provider}_webhook` },
  })
  if (error && error.code !== '23505') throw paymentError(`${name}_write_failed`, error)
}

export async function paymentWasProcessed(db: PaymentDb, provider: AlternativeProvider, eventId: string) {
  return !!await readEvent(db, provider, `event:${eventId}`)
}

export async function markPaymentProcessed(db: PaymentDb, provider: AlternativeProvider, eventId: string) {
  await insertEvent(db, provider, `event:${eventId}`, 'alternative_payment_processed', null,
    { event_id: eventId, state: 'processed' })
}

export async function paymentWasReversed(db: PaymentDb, provider: AlternativeProvider, paymentId: string) {
  return !!await readEvent(db, provider, `reversal:${paymentId}`)
}

export async function reversePayment(db: PaymentDb, provider: AlternativeProvider, paymentId: string, eventId: string) {
  // Permanent tombstone by PURCHASE, not by notification. An APPROVED with a
  // different event ID must not revive a purchase refunded before delivery.
  await insertEvent(db, provider, `reversal:${paymentId}`, 'alternative_payment_reversed', null,
    { payment_id: paymentId, event_id: eventId, state: 'reversed' })
}

export async function reportPaymentFailure(provider: AlternativeProvider, eventId: string | null,
  userId: string | null, error: unknown, db?: PaymentDb) {
  const reason = error instanceof Error ? error.message : 'payment_handler_failed'
  const metadata = { provider, event_id: eventId, reason, source: `${provider}_webhook` }
  // Also emit to the server log: during a database outage it is impossible to
  // persist the failure in that same database. Never convert this into a 200.
  console.error('[alternative-payment]', JSON.stringify({ name: 'payment_webhook_failed', user_id: userId, ...metadata }))
  if (!db) return
  try {
    const { error: logError } = await db.from('events').insert({ name: 'payment_webhook_failed',
      user_id: userId, path: `/api/${provider}/webhook`, metadata })
    if (logError) console.error('[alternative-payment] failure_event_write_failed', logError.code)
  } catch {
    console.error('[alternative-payment] failure_event_write_unavailable')
  }
}

export async function requirePaymentProfile(db: PaymentDb, userId: string) {
  try {
    const { data, error } = await db.from('profiles')
      .select('id,email,video_credits,is_pro,plan,paypal_subscription_id,updated_at')
      .eq('id', userId).maybeSingle()
    if (error || !data) throw paymentError('payment_profile_unavailable', error)
    return data
  } catch {
    // This helper only READS; every failure here is safe to retry.
    throw new GrantNotAppliedError('payment_profile_unavailable')
  }
}

export async function updatePaymentProfile(db: PaymentDb, userId: string,
  build: (profile: Record<string, any>) => Record<string, unknown>) {
  const profile = await requirePaymentProfile(db, userId)
  let query = db.from('profiles').update(build(profile)).eq('id', userId)
  query = profile.video_credits == null ? query.is('video_credits', null) : query.eq('video_credits', profile.video_credits)
  query = profile.updated_at == null ? query.is('updated_at', null) : query.eq('updated_at', profile.updated_at)
  const { data, error } = await query.select('id').maybeSingle()
  if (error) {
    // SQLSTATE class 22/23/42 is a rejected statement, not a transport timeout.
    if (/^(22|23|42)/.test(error.code ?? '')) throw new GrantNotAppliedError(`grant_rejected (${error.code})`)
    throw paymentError('grant_outcome_unknown_reconciliation_required', error)
  }
  if (!data) throw new GrantNotAppliedError('profile_changed_retry')
}

export async function grantAlternativePack(db: PaymentDb, userId: string, credits: number) {
  if (!Number.isSafeInteger(credits) || credits <= 0) throw new GrantNotAppliedError('grant_credits_invalid')
  await updatePaymentProfile(db, userId, (profile) => ({
    video_credits: (profile.video_credits ?? 0) + credits, has_paid: true,
  }))
}

export async function fulfillAlternativePayment(args: {
  db: PaymentDb; provider: AlternativeProvider; eventId: string; paymentId: string; userId: string
  metadata: Record<string, unknown>; grant: () => Promise<void>; recordOrder: () => Promise<void>
}) {
  const { db, provider, eventId, paymentId, userId } = args
  if (await paymentWasReversed(db, provider, paymentId)) return 'reversed'
  const key = `grant:${paymentId}`
  let journal = await readEvent(db, provider, key)
  if (!journal) {
    await insertEvent(db, provider, key, 'alternative_payment_grant', userId,
      { payment_id: paymentId, event_id: eventId, state: 'pending' })
    journal = await readEvent(db, provider, key)
  }
  if (!journal || journal.user_id !== userId) throw paymentError('grant_identity_mismatch')
  if (journal.metadata.state === 'applying') throw paymentError('grant_in_progress_or_unknown_reconciliation_required')
  if (journal.metadata.state === 'pending') {
    const { data: acquired, error } = await db.from('events')
      .update({ metadata: { ...journal.metadata, state: 'applying' } })
      .eq('id', journal.id).eq('metadata->>state', 'pending').select('id').maybeSingle()
    if (error) throw paymentError('grant_journal_unavailable', error)
    if (!acquired) throw paymentError('grant_concurrent_retry')
    try {
      // This read happens BEFORE grant, so even a transport failure here is
      // known to have made no entitlement change and is safe to retry.
      let reversed: boolean
      try { reversed = await paymentWasReversed(db, provider, paymentId) }
      catch { throw new GrantNotAppliedError('pregrant_reversal_lookup_failed') }
      if (reversed) return 'reversed'
      await args.grant()
    } catch (error) {
      if (error instanceof GrantNotAppliedError) {
        const { data: released, error: releaseError } = await db.from('events')
          .update({ metadata: { ...journal.metadata, state: 'pending' } })
          .eq('id', journal.id).eq('metadata->>state', 'applying').select('id').maybeSingle()
        if (releaseError || !released) throw paymentError('grant_retry_state_unavailable', releaseError)
      }
      throw error
    }
    // No transaction-capable grant ledger exists in the checked-in schema.
    // If this write fails AFTER the grant, retain applying and return 500:
    // reconciliation is required; silently granting again would double money.
    const { data: confirmed, error: confirmError } = await db.from('events')
      .update({ metadata: { ...journal.metadata, state: 'granted' } })
      .eq('id', journal.id).eq('metadata->>state', 'applying').select('id').maybeSingle()
    if (confirmError || !confirmed) throw paymentError('grant_confirmation_unknown_reconciliation_required', confirmError)
  } else if (journal.metadata.state !== 'granted') {
    throw paymentError('grant_state_unknown')
  }
  await args.recordOrder()
  await insertEvent(db, provider, `success:${paymentId}`, 'payment_success', userId, {
    ...args.metadata, payment_id: paymentId, event_id: eventId,
  })
  return 'granted'
}

export async function recordAlternativeOrder(db: PaymentDb, table: string, row: Record<string, unknown>) {
  const { error } = await db.from(table).insert(row)
  if (error && error.code !== '23505') throw paymentError('processed_order_write_failed', error)
}
