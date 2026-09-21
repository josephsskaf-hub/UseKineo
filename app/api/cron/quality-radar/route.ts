// KINEO-RADAR-DE-QUALIDADE-2026-09-20 — ver lib/qualityRadar.ts. A cada 15 min: julga filmes novos sem nota e alerta o
// fundador quando um pagante recebe filme ruim. Com ?digest=1 (cron diário 08:05 BRT): resumo das 24 h.
import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { listFastCoherence } from '@/lib/admin/fastCoherence'
import { notifyFounder } from '@/lib/supplier/notify'
import {
  QUALITY_RADAR_VERSION, RADAR_ALERT_EVENT, RADAR_DIGEST_EVENT, RADAR_MAX_JUDGE_PER_RUN,
  decideRadarAlert, radarAlertText, radarDigestText, type RadarFilm,
} from '@/lib/qualityRadar'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 120

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.usekineo.com'
const INTERNAL = ['josephsskaf@gmail.com', 'joseph@usekineo.com']

function isAuthorized(req: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) return false
  return req.headers.get('authorization') === `Bearer ${cronSecret}`
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return NextResponse.json({ error: 'service unavailable' }, { status: 503 })
  const admin = createAdminClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
  const digest = req.nextUrl.searchParams.get('digest') === '1'

  // Julga o que ainda não tem nota (janela curta no tique de 15 min; 24 h no resumo).
  const rows = await listFastCoherence(admin, { hours: digest ? 24 : 6, limit: digest ? 200 : 60, maxCompute: RADAR_MAX_JUDGE_PER_RUN, excludeEmails: INTERNAL })
  const userIds = [...new Set(rows.map((r) => r.user_id))]
  const { data: profs } = userIds.length ? await admin.from('profiles').select('id, has_paid, plan, video_credits').in('id', userIds) : { data: [] as Array<Record<string, unknown>> }
  const paidBy = new Map<string, { hasPaid: boolean; credits: number | null }>()
  for (const p of profs ?? []) {
    const plan = String((p as { plan?: string }).plan ?? 'free').toLowerCase()
    paidBy.set(String((p as { id: string }).id), { hasPaid: (p as { has_paid?: boolean }).has_paid === true || (plan !== 'free' && !plan.endsWith('_trial')), credits: typeof (p as { video_credits?: number }).video_credits === 'number' ? (p as { video_credits: number }).video_credits : null })
  }
  const films: RadarFilm[] = rows.map((r) => ({
    video_id: r.video_id, email: r.email, engine: r.engine, topic: r.topic, created_at: r.created_at,
    score: r.coherence?.score ?? null, visual: r.coherence?.narration_vs_visuals ?? null, texto: r.coherence?.prompt_vs_narration ?? null,
    problems: r.coherence?.problems ?? [],
    hasPaid: paidBy.get(r.user_id)?.hasPaid ?? false, credits: paidBy.get(r.user_id)?.credits ?? null,
  }))

  if (digest) {
    const { subject, text } = radarDigestText(films, APP_URL)
    const sent = await notifyFounder(subject, text)
    await admin.from('events').insert({ name: RADAR_DIGEST_EVENT, path: '/api/cron/quality-radar', metadata: { version: QUALITY_RADAR_VERSION, films: films.length, scored: films.filter((f) => f.score != null).length, delivered: sent.delivered } })
    return NextResponse.json({ ok: true, digest: true, films: films.length, delivered: sent.delivered })
  }

  // Alertas: 1 por filme, nunca repetido (marcador por video_id).
  const ids = films.map((f) => f.video_id)
  const { data: marks } = ids.length ? await admin.from('events').select('session_id').eq('name', RADAR_ALERT_EVENT).in('session_id', ids) : { data: [] as Array<{ session_id: string | null }> }
  const alerted = new Set((marks ?? []).map((m) => m.session_id as string))
  const results: Array<{ video: string; reason: string }> = []
  let sentCount = 0
  for (const f of films) {
    const d = decideRadarAlert({ score: f.score, hasPaid: f.hasPaid, internal: !!f.email && INTERNAL.includes(f.email.toLowerCase()), alreadyAlerted: alerted.has(f.video_id) })
    results.push({ video: f.video_id.slice(0, 8), reason: d.reason })
    if (!d.alert) continue
    const { subject, text } = radarAlertText(f, APP_URL)
    const sent = await notifyFounder(subject, text)
    sentCount += 1
    await admin.from('events').insert({ name: RADAR_ALERT_EVENT, session_id: f.video_id, path: '/api/cron/quality-radar', metadata: { version: QUALITY_RADAR_VERSION, reason: d.reason, score: f.score, engine: f.engine, has_paid: f.hasPaid, email: f.email, delivered: sent.delivered } })
  }
  return NextResponse.json({ ok: true, judged_window_films: films.length, alerts: sentCount, results })
}
