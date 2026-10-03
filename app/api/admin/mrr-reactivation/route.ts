import { NextRequest, NextResponse } from 'next/server'
import { createHash, createHmac, timingSafeEqual } from 'node:crypto'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { loadLifecycleSuppression } from '@/lib/lifecycle/suppression'
import { emailFooterText, unsubscribeHeaders } from '@/lib/emailSuppression'
import { dailyCap, recordResendResponse } from '@/lib/email/quota'
import { eligibleReactivationProfile, readyFilmDraft, readEveryPage, MRR_REACTIVATION_ENABLED, MRR_REACTIVATION_VERSION, MRR_REACTIVATION_SEND_ENABLED, MRR_REACTIVATION_BATCH, MRR_REACTIVATION_CLAIM, MRR_REACTIVATION_SENT } from '@/lib/growth/mrrReactivation'

export const dynamic = 'force-dynamic'
export const maxDuration = 60
type Row = Record<string, any>
const FOUNDER = 'josephsskaf@gmail.com'
const headers = { 'Cache-Control': 'no-store' }
const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers })

async function context() {
  if (!MRR_REACTIVATION_ENABLED) return null
  const { data: { user } } = await createClient().auth.getUser()
  if (!user || user.email?.trim().toLowerCase() !== FOUNDER) return null
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Campaign read unavailable')
  return { actor: user.id, key, db: createAdminClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } }) }
}
type Context = NonNullable<Awaited<ReturnType<typeof context>>>

async function prepare({ db }: Context) {
  const cutoff = new Date(Date.now() - 30 * 86400000).toISOString()
  const quiet = new Date(Date.now() - 86400000).toISOString()
  const profiles = await readEveryPage<Row>((a, b) => db.from('profiles').select('id,email,email_opted_out,has_paid,plan,created_at').order('id').range(a, b))
  // An alias with another paid/opted-out profile is excluded, not counted twice.
  const bannedEmails = new Set(profiles.filter(p => !eligibleReactivationProfile(p)).map(p => String(p.email ?? '').trim().toLowerCase()))
  const pool = profiles.filter(p => p.created_at >= cutoff && p.created_at < quiet && eligibleReactivationProfile(p) && !bannedEmails.has(p.email.trim().toLowerCase()))
  const rows: Array<{ id: string; email: string; videoId: string; subject: string; text: string }> = []
  const used = new Set<string>()
  for (let n = 0; n < pool.length; n += 100) {
    const batch = pool.slice(n, n + 100), ids = batch.map(p => p.id)
    const events = await readEveryPage<Row>((a, b) => db.from('events').select('id,user_id,name').in('user_id', ids)
      .in('name', ['payment_success', 'checkout_started', 'checkout_attempted', MRR_REACTIVATION_CLAIM, MRR_REACTIVATION_SENT]).order('id').range(a, b))
    const reserved = new Set(events.map(e => e.user_id))
    const videos = await readEveryPage<Row>((a, b) => db.from('videos').select('id,user_id,status,video_url,title,created_at')
      .in('user_id', ids).eq('status', 'completed').gte('created_at', cutoff).lt('created_at', quiet).order('created_at', { ascending: false }).order('id').range(a, b))
    const suppression = await loadLifecycleSuppression(db, ids)
    if (suppression.degraded || suppression.eventsDegraded) throw new Error('Suppression unavailable')
    for (const p of batch) {
      const email = p.email.trim().toLowerCase()
      if (reserved.has(p.id) || used.has(email) || suppression.isSuppressed(p.id)) continue
      const film = videos.find(v => v.user_id === p.id && typeof v.video_url === 'string' && /^https:\/\//.test(v.video_url))
      if (!film) continue // never promise an unfinished or newly generated film
      const draft = readyFilmDraft(film.title)
      rows.push({ id: p.id, email, videoId: film.id, ...draft, text: draft.text + emailFooterText(p.id) })
      used.add(email)
    }
  }
  return rows.sort((a, b) => a.id.localeCompare(b.id))
}

function reviewToken(ctx: Context, rows: unknown, expires: number) {
  return createHmac('sha256', ctx.key).update(JSON.stringify({ actor: ctx.actor, version: MRR_REACTIVATION_VERSION, rows, expires })).digest('hex')
}
function matches(left: unknown, right: string) {
  return typeof left === 'string' && /^[a-f0-9]{64}$/.test(left) && timingSafeEqual(Buffer.from(left), Buffer.from(right))
}

/** GET, including ?confirm=SEND, is ALWAYS read-only. No cron-secret or machine-auth door. */
export async function GET() {
  try {
    const ctx = await context()
    if (!ctx) return json({ error: 'Founder session required' }, 403)
    const eligible = await prepare(ctx), recipients = eligible.slice(0, MRR_REACTIVATION_BATCH)
    const expires = Date.now() + 10 * 60000
    return json({ dryRun: true, sent: 0, version: MRR_REACTIVATION_VERSION, eligible: eligible.length, recipients, expires, reviewToken: reviewToken(ctx, recipients, expires) })
  } catch { return json({ error: 'Campaign preview unavailable; no email sent' }, 503) }
}

export async function POST(req: NextRequest) {
  // A link opens the review page. Only an explicit founder click POSTs the reviewed batch.
  if (req.headers.get('origin') !== req.nextUrl.origin) return json({ error: 'Same-origin founder action required' }, 403)
  try {
    const ctx = await context()
    if (!ctx) return json({ error: 'Founder session required' }, 403)
    const body = await req.json()
    if (body.dryRun !== false) return GET()
    if (!MRR_REACTIVATION_SEND_ENABLED) return json({ error: 'Commercial email HOLD: explicit founder release required; no email sent' }, 423)
    if (body.confirm !== 'SEND_REVIEWED_READY_FILMS' || !Array.isArray(body.ids) || body.ids.length < 1 || body.ids.length > MRR_REACTIVATION_BATCH
      || !Number.isFinite(body.expires) || body.expires < Date.now() || body.expires > Date.now() + 10 * 60000) return json({ error: 'Review the current batch first' }, 409)
    const eligible = await prepare(ctx)
    const recipients = eligible.filter(p => body.ids.includes(p.id))
    if (recipients.length !== body.ids.length || !matches(body.reviewToken, reviewToken(ctx, recipients, body.expires))) return json({ error: 'Batch changed. Refresh the preview.' }, 409)
    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) return json({ error: 'Sender unavailable' }, 503)
    // Read-only quota gate. Do not call claimEmailSlot: its "yield" branch writes even in preview.
    const quota = await ctx.db.from('email_send_log').select('id', { count: 'exact', head: true }).eq('ok', true)
      .gte('sent_at', new Date(new Date().setUTCHours(0, 0, 0, 0)).toISOString())
    if (quota.error || quota.count === null || quota.count + recipients.length > Math.floor(dailyCap() * 0.6)) return json({ error: 'Campaign quota unavailable or reserved for transactional mail' }, 409)
    const results: Array<{ id: string; status: string }> = []
    for (const person of recipients) {
      // Deterministic primary key = at most one attempt per person for this campaign, even across concurrent clicks.
      const hex = createHash('sha256').update(`${MRR_REACTIVATION_VERSION}:${person.id}`).digest('hex').slice(0, 32)
      const claimId = `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
      const claim = await ctx.db.from('events').insert({ id: claimId, user_id: person.id, name: MRR_REACTIVATION_CLAIM, path: '/api/admin/mrr-reactivation', metadata: { version: MRR_REACTIVATION_VERSION, founder_id: ctx.actor } })
      if (claim.error) { results.push({ id: person.id, status: 'not_sent_claim_unavailable' }); break }
      const res = await fetch('https://api.resend.com/emails', { method: 'POST', signal: AbortSignal.timeout(10000), headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: 'Joseph | Kineo <joseph@usekineo.com>', reply_to: 'joseph@usekineo.com', to: [person.email], subject: person.subject, text: person.text, headers: unsubscribeHeaders(person.id) }) })
      await recordResendResponse({ kind: MRR_REACTIVATION_VERSION, priority: 'growth', userId: person.id, res, admin: ctx.db })
      if (!res.ok) { results.push({ id: person.id, status: 'provider_rejected_no_retry' }); break }
      const receipt = await res.json().catch(() => null)
      const stamp = await ctx.db.from('events').insert({ user_id: person.id, name: MRR_REACTIVATION_SENT, path: '/api/admin/mrr-reactivation', metadata: { version: MRR_REACTIVATION_VERSION, video_id: person.videoId, provider_id: typeof receipt?.id === 'string' ? receipt.id : null } })
      results.push({ id: person.id, status: stamp.error ? 'accepted_stamp_failed_no_retry' : 'accepted_delivery_unknown' })
      if (stamp.error) break
    }
    return json({ dryRun: false, results })
  } catch { return json({ error: 'Stopped. Inspect the ledger before any further action; an attempt may be unresolved.' }, 503) }
}

