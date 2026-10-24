// KINEO-CARTOON-TRACAO-2210 — no cron/caller. Dry-run by default; explicit SEND + limit required.
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient, type SupabaseClient } from '@supabase/supabase-js'
import { readAll } from '@/lib/supabase/readAll'
import { unsubscribeHeaders } from '@/lib/emailSuppression'
import { loadLifecycleSuppression } from '@/lib/lifecycle/suppression'
import { dailyCap, recordResendResponse } from '@/lib/email/quota'
import {
  KIDS_LAUNCH_SENT, KIDS_LAUNCH_CLAIM, KIDS_LAUNCH_MAX_BATCH,
  kidsLaunchRecipients, kidsLaunchClaimId, kidsLaunchEmail, type KidsLaunchProfile,
} from '@/lib/growth/kidsLaunchEmail'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'
export const maxDuration = 300

const PATH = '/api/admin/send-kids-launch'
const ADMIN_EMAILS = new Set(['josephsskaf@gmail.com', 'josephskaf@gmail.com', 'joseph-test@shortsforgeai.com', 'josephskaf@hotmail.com'])
const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } })

async function prepare(admin: SupabaseClient, ids?: string[]) {
  const { data: rows } = await readAll(() => {
    const q = admin.from('profiles').select('id,email,email_opted_out,signup_country,last_country').order('created_at', { ascending: true })
    return ids ? q.in('id', ids) : q
  }, { route: PATH, table: 'profiles' })
  const profiles = (rows ?? []) as KidsLaunchProfile[]
  // ALL order states/kinds count, including an earlier sample or a cancelled order.
  const [{ data: orders }, { data: events }] = await Promise.all([
    readAll(() => {
      const q = admin.from('kids_orders').select('user_id')
      return ids ? q.in('user_id', ids) : q
    }, { route: PATH, table: 'kids_orders' }),
    readAll(() => {
      const q = admin.from('events').select('id,user_id,name').in('name', [KIDS_LAUNCH_SENT, KIDS_LAUNCH_CLAIM])
      return ids ? q.in('user_id', ids) : q
    }, { route: PATH, table: 'events' }),
  ])
  const blockedIds = new Set<string>()
  for (const row of [...orders ?? [], ...events ?? []]) if (typeof row.user_id === 'string') blockedIds.add(row.user_id)
  const claimIds = new Set((events ?? []).map(row => row.id))
  for (let i = 0; i < profiles.length; i += 100) {
    const part = profiles.slice(i, i + 100).map(p => p.id)
    const suppression = await loadLifecycleSuppression(admin, part)
    if (suppression.degraded || suppression.eventsDegraded) throw new Error('Suppression unavailable')
    for (const id of part) if (suppression.isSuppressed(id)) blockedIds.add(id)
  }
  const recipients = kidsLaunchRecipients(profiles, blockedIds).filter(p => !claimIds.has(kidsLaunchClaimId(p.email)))
  return { profiles, recipients }
}

export async function GET(req: NextRequest) {
  try {
    const { data: { user } } = await createClient().auth.getUser()
    if (!user || !ADMIN_EMAILS.has((user.email ?? '').trim().toLowerCase())) return json({ error: 'Forbidden' }, 403)

    const confirm = req.nextUrl.searchParams.get('confirm') === 'SEND'
    const rawLimit = req.nextUrl.searchParams.get('limit')
    const limit = Number(rawLimit)
    if (confirm && (!rawLimit || !/^[1-9]\d*$/.test(rawLimit) || !Number.isSafeInteger(limit) || limit > KIDS_LAUNCH_MAX_BATCH)) {
      return json({ error: 'SEND requires an integer limit from 1 to 60; no email sent' }, 400)
    }
    if (confirm && (req.headers.get('sec-fetch-site') === 'cross-site'
      || (req.headers.get('origin') && req.headers.get('origin') !== req.nextUrl.origin))) {
      return json({ error: 'Same-origin admin action required; no email sent' }, 403)
    }
    const batch = Number.isSafeInteger(limit) && limit > 0 ? Math.min(limit, KIDS_LAUNCH_MAX_BATCH) : KIDS_LAUNCH_MAX_BATCH
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !serviceKey) return json({ error: 'Campaign read unavailable; no email sent' }, 503)
    const admin = createAdminClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })
    const { profiles, recipients } = await prepare(admin)
    if (!confirm) return json({
      mode: 'DRY_RUN', sent: 0,
      eligible_people: recipients.length,
      remaining_unemailed: recipients.length,
      next_batch_size: Math.min(batch, recipients.length),
      by_language: { pt: recipients.filter(p => p.language === 'pt').length, en: recipients.filter(p => p.language === 'en').length },
      cohort: 'external accounts; opted-out aliases, any kids order, prior launch attempt/send and recent lifecycle mail excluded; one normalized address per person',
      hint: 'Nothing was sent or written. Sending requires ?confirm=SEND&limit=N (integer 1–60).',
    })

    // A preview needs no provider key and never touches the quota's write path.
    const resendKey = process.env.RESEND_API_KEY
    if (!resendKey) return json({ error: 'Sender unavailable; no email sent' }, 503)
    const selected = recipients.slice(0, batch)
    const today = new Date()
    const quota = await admin.from('email_send_log').select('id', { count: 'exact', head: true }).eq('ok', true)
      .gte('sent_at', new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())).toISOString())
    if (quota.error || typeof quota.count !== 'number' || quota.count + selected.length > Math.floor(dailyCap() * 0.6)) {
      return json({ error: 'Growth quota unavailable or reserved for transactional mail; no email sent' }, 409)
    }

    let sent = 0
    const results: Array<{ id: string; outcome: string }> = []
    for (const person of selected) {
      // Recheck opt-out, orders and suppression immediately before reserving this person.
      const aliases = profiles.filter(p => (p.email ?? '').trim().toLowerCase() === person.email).map(p => p.id)
      const fresh = await prepare(admin, aliases)
      const current = fresh.recipients.find(p => p.email === person.email)
      if (!current) { results.push({ id: person.id, outcome: 'skipped_after_recheck' }); continue }
      const claimId = kidsLaunchClaimId(person.email)
      const claim = await admin.from('events').insert({
        id: claimId, user_id: current.id, name: KIDS_LAUNCH_CLAIM, path: PATH,
        metadata: { campaign: 'cartoon_tracao_2210', actor_id: user.id },
      })
      if (claim.error) {
        results.push({ id: current.id, outcome: claim.error.code === '23505' ? 'already_reserved' : 'claim_unavailable' })
        if (claim.error.code === '23505') continue
        break
      }
      // Never delete a claim: timeout/rejection/failed stamp needs manual review, not a blind retry.
      const email = kidsLaunchEmail(current.id, current.language)
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST', signal: AbortSignal.timeout(10000),
        headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json', 'Idempotency-Key': claimId },
        body: JSON.stringify({ from: 'Joseph at Kineo <joseph@usekineo.com>', reply_to: 'joseph@usekineo.com', to: [current.email], ...email, headers: unsubscribeHeaders(current.id) }),
      })
      await recordResendResponse({ kind: 'kids_launch_2210', priority: 'growth', userId: current.id, res, admin })
      if (!res.ok) { results.push({ id: current.id, outcome: 'provider_rejected_no_retry' }); break }
      sent += 1 // accepted by provider; delivery is unknown
      const receipt = await res.json().catch(() => null)
      const stamp = await admin.from('events').insert({
        user_id: current.id, name: KIDS_LAUNCH_SENT, path: PATH,
        metadata: { campaign: 'cartoon_tracao_2210', language: current.language, provider_id: typeof receipt?.id === 'string' ? receipt.id : null },
      })
      results.push({ id: current.id, outcome: stamp.error ? 'accepted_stamp_failed_no_retry' : 'accepted_delivery_unknown' })
      if (stamp.error) break
      await new Promise(resolve => setTimeout(resolve, 700))
    }
    return json({ mode: 'SEND', sent, delivery: 'unknown', results })
  } catch {
    return json({ error: 'Campaign stopped. Inspect claims before any further attempt; delivery may be unresolved.' }, 503)
  }
}
