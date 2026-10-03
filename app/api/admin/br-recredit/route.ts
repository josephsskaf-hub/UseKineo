// KINEO-BRASIL-VOLTA-2026-10-03 — recrédito das contas BR que nasceram 'region_paid_only' entre 29/09 e a volta do
// Brasil à lista (regra pura em lib/brRecredit.ts).
// GET                    → DRY-RUN: lista (ids curtos, sem e-mail) de quem seria recreditado, créditos e custo estimado.
// POST ?confirm=APPLY    → aplica o MESMO grant do trial (lib/reverseTrial.ts) com compare-and-set em
//                          trial_status='region_paid_only', um evento admin_br_trial_recredited por conta. Sem o confirm,
//                          o POST também é só dry-run. Aplicar é DECISÃO DO FUNDADOR — esta sessão nunca aplica.
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isAdminEmail, serviceClient } from '../_shared/db'
import { TRIAL_GRANT_CREDITS, TRIAL_VARIANT_DAYS, trialVariantFor } from '@/lib/reverseTrial'
import { TRIAL_REGION_EXCLUDED_EVENT } from '@/lib/freeFilmPolicy'
import { FREE_WEEKLY_FILM_CREDITS } from '@/lib/freeWeeklyFilm'
import { writeServerEvent } from '@/lib/serverEvents'
import {
  BR_RECREDIT_CONFIRM,
  BR_RECREDIT_MAX_PER_CALL,
  BR_RECREDIT_SINCE_ISO,
  brRecreditCreditsTotal,
  brRecreditEligible,
  brRecreditPatch,
  type BrRecreditProfile,
} from '@/lib/brRecredit'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'
export const runtime = 'nodejs'

async function candidates() {
  const db = serviceClient()
  if (!db) return { error: 'Service unavailable' as const }
  const ev = await db.from('events').select('user_id, metadata').eq('name', TRIAL_REGION_EXCLUDED_EVENT).gte('created_at', BR_RECREDIT_SINCE_ISO).eq('metadata->>country', 'BR').limit(2000)
  if (ev.error) return { error: ev.error.message }
  const ids = Array.from(new Set((ev.data ?? []).map((r) => (r as { user_id?: string | null }).user_id).filter((x): x is string => typeof x === 'string')))
  if (ids.length === 0) return { db, list: [] as BrRecreditProfile[] }
  const prof = await db.from('profiles').select('id, trial_status, has_paid, plan, video_credits, created_at').in('id', ids.slice(0, 1000))
  if (prof.error) return { error: prof.error.message }
  const list = ((prof.data ?? []) as BrRecreditProfile[]).filter((p) => brRecreditEligible(p, 'BR'))
  return { db, list }
}

async function handle(req: NextRequest, apply: boolean) {
  const { data: { user } } = await createClient().auth.getUser()
  if (!user || !isAdminEmail(user.email)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const c = await candidates()
  if ('error' in c) return NextResponse.json({ error: c.error }, { status: 503 })
  const list = c.list.slice(0, BR_RECREDIT_MAX_PER_CALL)
  const summary = {
    since: BR_RECREDIT_SINCE_ISO,
    accounts: c.list.length,
    this_call: list.length,
    credits_per_account: TRIAL_GRANT_CREDITS,
    credits_total: brRecreditCreditsTotal(list.length, TRIAL_GRANT_CREDITS),
    // O trial de 10 cr paga no máximo um filme da cota (Seedance 15 s = FREE_WEEKLY_FILM_CREDITS). O custo em US$ é o
    // de quantos desses filmes saírem — ver docs/HANDOFF-ATIVACAO-2026-10-05.md (estimativa, não fatura).
    films_at_most: Math.floor(TRIAL_GRANT_CREDITS / FREE_WEEKLY_FILM_CREDITS) * list.length,
    accounts_preview: list.map((p) => ({ id: p.id.slice(0, 8), created_at: p.created_at, balance: p.video_credits ?? 0 })),
  }
  if (!apply) return NextResponse.json({ dry_run: true, apply_with: `POST ?confirm=${BR_RECREDIT_CONFIRM}`, ...summary }, { headers: { 'Cache-Control': 'no-store' } })

  let applied = 0
  for (const p of list) {
    const variant = trialVariantFor(p.id)
    const patch = brRecreditPatch({ balance: p.video_credits, grantCredits: TRIAL_GRANT_CREDITS, variantDays: TRIAL_VARIANT_DAYS[variant], variant, now: Date.now() })
    let q = c.db.from('profiles').update(patch).eq('id', p.id).eq('trial_status', 'region_paid_only')
    q = p.video_credits === null ? q.is('video_credits', null) : q.eq('video_credits', p.video_credits)
    const { data, error } = await q.select('id')
    if (error || !data || data.length === 0) continue
    applied += 1
    await writeServerEvent({ name: 'admin_br_trial_recredited', userId: p.id, path: '/api/admin/br-recredit', metadata: { by: user.email, credits: TRIAL_GRANT_CREDITS, variant } })
  }
  return NextResponse.json({ dry_run: false, applied, ...summary }, { headers: { 'Cache-Control': 'no-store' } })
}

export async function GET(req: NextRequest) {
  return handle(req, false)
}

export async function POST(req: NextRequest) {
  return handle(req, req.nextUrl.searchParams.get('confirm') === BR_RECREDIT_CONFIRM)
}
