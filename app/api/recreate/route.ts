import { NextRequest, NextResponse } from 'next/server'
import { clipsAdmin, engineAccessFor, loadClipAccount } from '@/lib/clips/clipServer'
import { submitClip } from '@/lib/clips/clipFlow'
import { clipEffectByKey, resolveClipEffectRequest } from '@/lib/clips/clipEffects'
import { isPayingPlan } from '@/app/api/admin/_shared/mrr'
import { recreateFormat, RECREATE_FORMATS, recreateEffectCredits } from '@/lib/recreate/formats'
import { planRecreate } from '@/lib/recreate/generation'
import { recreateCreditCost } from '@/lib/checkoutPricing'
import { recreateEngineAccess, recreateSession, recreateSubmitDeps, RECREATE_HEADERS } from '@/lib/recreate/server'
import { writeServerEvent } from '@/lib/serverEvents'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'
export const maxDuration = 60
export const runtime = 'nodejs'
const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: RECREATE_HEADERS })

export async function GET() {
  const { supabase, user } = await recreateSession()
  if (!user) return json({ error: 'Not found.' }, 404)
  const admin = clipsAdmin()
  const account = await loadClipAccount(supabase, user)
  if (!admin || !account) return json({ error: 'Could not load your account. Please retry.' }, 503)
  const access = engineAccessFor(account)
  return json({ catalog: RECREATE_FORMATS.map(f => {
    const credits = f.type === 'swap' ? recreateCreditCost(f.seconds) : recreateEffectCredits(f)
    return { id: f.id, credits, shortfall: credits === null ? 0 : Math.max(0, credits - account.balance), available: credits !== null && (f.type === 'swap' ? recreateEngineAccess().ok : access(clipEffectByKey(f.effectKey)!.engine).ok) }
  }) })
}

export async function POST(req: NextRequest) {
  const { supabase, user } = await recreateSession()
  if (!user) return json({ error: 'Not found.' }, 404)
  if (req.headers.get('origin') && req.headers.get('origin') !== req.nextUrl.origin) return json({ error: 'Invalid origin.' }, 403)
  let raw: Record<string, unknown>
  try { raw = await req.json() } catch { return json({ error: 'Invalid request.' }, 400) }
  const format = recreateFormat(raw.format)
  if (!format) return json({ error: 'Choose a format from the catalog.' }, 400)
  if (raw.mode && raw.mode !== 'swap') return json({ error: 'This mode is unavailable.' }, 400)
  // Simulation exits before profile reads, moderation, writes, debits, uploads or provider calls.
  if (raw.simulate === true) return json({ simulation: true, format: format.title, seconds: format.seconds, photos: format.photoSlots, credits: format.type === 'swap' ? recreateCreditCost(format.seconds) : recreateEffectCredits(format), mode: format.type === 'swap' ? 'Face swap' : 'Photo effect', charged: false })
  if (raw.consent !== true) return json({ error: 'Confirm you have permission to use these photos.' }, 400)
  const admin = clipsAdmin()
  const account = await loadClipAccount(supabase, user)
  if (!admin || !account) return json({ error: 'Could not start your clip. Nothing was charged.' }, 503)
  const key = req.headers.get('idempotency-key')?.trim() ?? ''
  const deps = recreateSubmitDeps(admin, supabase, account, format)
  try {
    let body
    let recreatePlan
    if (format.type === 'swap') {
      const resolved = planRecreate(raw, { userId: user.id, supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? '', paying: isPayingPlan(account.plan) })
      if (!resolved.ok) return json({ error: resolved.error }, resolved.status)
      body = resolved.plan.body
      recreatePlan = resolved.plan
    } else {
      // Existing effect engine, fixed prompt, duration and tariff; pair composition uses the existing browser recipe.
      const resolved = resolveClipEffectRequest(format.effectKey, { visible: true, imageUrl: raw.image_url })
      if (!resolved.ok) return json({ error: resolved.error }, resolved.status)
      body = resolved.body
    }
    const result = await submitClip(deps, { userId: user.id, idempotencyKey: key, body, recreatePlan })
    if (!result.ok) {
      if (result.code === 'credits' || result.code === 'debit_failed') {
        const credits = recreatePlan?.credits ?? recreateEffectCredits(format)
        const balance = result.balance ?? (await loadClipAccount(supabase, user))?.balance
        if (credits !== null && balance !== undefined && credits > balance) {
          const shortfall = credits - balance
          return json({ error: `You need ${shortfall} more credits.`, code: 'credits', shortfall, plans: '/pricing' }, result.status)
        }
      }
      return json({ error: result.code === 'idempotency_conflict' ? 'This request is already reserved. Check your clips before trying again.' : 'Could not start this clip. Check your photos, plan and balance, then retry.', code: result.code }, result.status)
    }
    if (!result.replay) await writeServerEvent({ name: 'recreate_started', userId: user.id, path: '/api/recreate', metadata: { format: format.id, clip_id: result.clip.id, seconds: result.clip.seconds, credits: result.clip.credits } }).catch(() => false)
    return json({ clip: { id: result.clip.id, status: result.clip.status }, replay: result.replay }, result.status)
  } catch {
    return json({ error: 'Could not confirm this request. Keep this page open and retry with the same request key.' }, 503)
  }
}
