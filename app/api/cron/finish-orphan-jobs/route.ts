// KINEO-RENDER-CONDUZIDO-PELO-SERVIDOR-2026-09-18 — termina o pedido de Kineo 1 cuja aba morreu antes dos clipes.
// Ver lib/renderJobs.ts. A cada 10 min: pedido (render_job_opened) com ≥ 4 min, sem progresso do servidor para a
// conta depois dele, sem pedido mais novo, não tomado → marca render_job_taken e chama /api/generate-video-fast
// EM PROCESSO no modo serviço (mesmo contrato do compose no finish-stranded-renders). A rota cobra os créditos
// como se a pessoa tivesse ficado, busca os clipes e grava fast_compose_recoverable; o finish-stranded-renders
// (15 min) monta e manda "Your film is ready". Custo de fornecedor: o de UM filme pedido e pago.
import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { POST as fastPost } from '@/app/api/generate-video-fast/route'
import {
  RENDER_JOB_OPENED_EVENT, RENDER_JOB_TAKEN_EVENT, RENDER_JOB_FINISHED_EVENT, RENDER_JOB_VERSION,
  ORPHAN_MIN_AGE_MS, ORPHAN_MAX_AGE_MS, MAX_JOBS_PER_RUN,
  decideOrphanJob, fastRequestFromJob, sanitizeRenderJobPayload,
} from '@/lib/renderJobs'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 300

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.usekineo.com'
const PROGRESS_EVENTS = ['fast_scene_plan', 'compose_submission_claim', 'video_generation_completed', 'fast_compose_recoverable']

function isAuthorized(req: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) return false
  return req.headers.get('authorization') === `Bearer ${cronSecret}`
}

function serviceHeaders(userId: string): Record<string, string> {
  return {
    'content-type': 'application/json',
    authorization: `Bearer ${process.env.CRON_SECRET}`,
    'x-kineo-service-user': userId,
  }
}

function isInternalOrJunkEmail(email: string): boolean {
  const e = email.toLowerCase()
  return (
    e.startsWith('josephsskaf') || e.startsWith('josephskaf') ||
    e.endsWith('@shortsforgeai.com') || e.startsWith('test') ||
    e.includes('mailinator') || e.includes('yopmail') || e.includes('tempmail')
  )
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return NextResponse.json({ error: 'service unavailable' }, { status: 503 })
  const admin = createAdminClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })

  const now = Date.now()
  const minIso = new Date(now - ORPHAN_MAX_AGE_MS).toISOString()
  const maxIso = new Date(now - ORPHAN_MIN_AGE_MS).toISOString()
  const { data: jobs, error } = await admin
    .from('events')
    .select('user_id, session_id, metadata, created_at')
    .eq('name', RENDER_JOB_OPENED_EVENT)
    .gte('created_at', minIso)
    .lte('created_at', maxIso)
    .order('created_at', { ascending: false })
    .limit(60)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const results: Array<{ attempt: string; outcome: string; status?: number }> = []
  let finished = 0
  for (const row of jobs ?? []) {
    const attemptId = row.session_id as string | null
    const userId = row.user_id as string | null
    const job = sanitizeRenderJobPayload(row.metadata)
    if (!attemptId || !userId || !job) { results.push({ attempt: attemptId?.slice(0, 8) ?? '?', outcome: 'invalid' }); continue }
    const a8 = attemptId.slice(0, 8)
    if (finished >= MAX_JOBS_PER_RUN) { results.push({ attempt: a8, outcome: 'deferred_budget' }); break }
    const openedAt = new Date(row.created_at as string).getTime()

    const [{ data: taken }, { data: progress }, { data: newer }] = await Promise.all([
      admin.from('events').select('id').eq('name', RENDER_JOB_TAKEN_EVENT).eq('session_id', attemptId).limit(1),
      admin.from('events').select('id').eq('user_id', userId).in('name', PROGRESS_EVENTS).gt('created_at', row.created_at as string).limit(1),
      admin.from('events').select('id').eq('user_id', userId).eq('name', RENDER_JOB_OPENED_EVENT).gt('created_at', row.created_at as string).limit(1),
    ])
    const decision = decideOrphanJob({
      openedAtMs: openedAt, nowMs: now,
      taken: (taken ?? []).length > 0,
      serverProgressAfter: (progress ?? []).length > 0,
      newerJob: (newer ?? []).length > 0,
    })
    if (!decision.orphan) { results.push({ attempt: a8, outcome: decision.reason }); continue }

    const { data: prof } = await admin.from('profiles').select('email, email_opted_out').eq('id', userId).maybeSingle()
    const email = (prof?.email ?? '') as string
    if (!email || isInternalOrJunkEmail(email) || prof?.email_opted_out === true) { results.push({ attempt: a8, outcome: 'skipped_account' }); continue }

    // Marca ANTES de chamar: uma rodada concorrente nunca faz o mesmo filme duas vezes.
    const { error: takenErr } = await admin.from('events').insert({ user_id: userId, name: RENDER_JOB_TAKEN_EVENT, session_id: attemptId, path: '/api/cron/finish-orphan-jobs', metadata: { version: RENDER_JOB_VERSION, opened_at: row.created_at } })
    if (takenErr) { results.push({ attempt: a8, outcome: 'taken_marker_failed' }); continue }

    finished += 1
    let status = 0
    let outcome = 'fast_threw'
    try {
      const fastReq = new NextRequest(`${APP_URL}/api/generate-video-fast`, { method: 'POST', headers: serviceHeaders(userId), body: JSON.stringify(fastRequestFromJob(job)) })
      const res = await fastPost(fastReq)
      status = res.status
      outcome = res.ok ? 'fast_ok' : 'fast_failed'
      if (!res.ok) {
        const txt = await res.text().catch(() => '')
        console.error(`[orphan-jobs] fast failed attempt=${a8} status=${status} ${txt.slice(0, 200)}`)
      } else {
        console.log(`[orphan-jobs] fast ok attempt=${a8} user=${userId.slice(0, 8)} — o finish-stranded-renders monta na próxima rodada`)
      }
    } catch (e) {
      console.error(`[orphan-jobs] fast threw attempt=${a8}:`, e instanceof Error ? e.message : String(e))
    }
    await admin.from('events').insert({ user_id: userId, name: RENDER_JOB_FINISHED_EVENT, session_id: attemptId, path: '/api/cron/finish-orphan-jobs', metadata: { version: RENDER_JOB_VERSION, outcome, status, duration: job.duration, language: job.language } })
    results.push({ attempt: a8, outcome, status })
  }
  return NextResponse.json({ ok: true, scanned: (jobs ?? []).length, finished, results })
}
