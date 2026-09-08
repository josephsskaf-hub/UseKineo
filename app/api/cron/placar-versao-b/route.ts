// KINEO-PLACAR-B-DIARIO-2026-09-08 — TAREFA 10: o placar da porta de $1 todo dia,
// sem ninguém calcular na mão. Roda às 12:05 UTC (09:05 BRT) pelo cron da Vercel
// (vercel.json), lê os eventos do dia anterior (UTC) e desde o marco, e grava UMA
// linha `placar_versao_b_daily` com os números — que o /admin/overview e a tarefa
// agendada do diário leem. Mesma função do painel (lib/admin/versaoBFunnel):
// nunca duas contas.
//
// Auth fail-closed com CRON_SECRET (padrão da casa). Sem env → 401, nunca 200.
import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { isInternalEmail } from '@/lib/internalAccounts'
import { fetchAllRows } from '@/app/api/admin/_shared/db'
import { funilVersaoB, funilVersaoBLinha, VERSAO_B_EVENT_NAMES, VERSAO_B_SINCE, type EventRow } from '@/lib/admin/versaoBFunnel'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

const DAY_MS = 24 * 60 * 60 * 1000

function autorizado(req: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) return false
  return req.headers.get('authorization') === `Bearer ${cronSecret}`
}

export async function GET(req: NextRequest) {
  if (!autorizado(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const svc = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !svc) return NextResponse.json({ error: 'env missing' }, { status: 500 })
  const admin = createAdminClient(url, svc, { auth: { persistSession: false, autoRefreshToken: false } })

  // "ontem" em UTC: do 00:00 ao 00:00 seguinte. ?day=YYYY-MM-DD recalcula um dia.
  const dayParam = req.nextUrl.searchParams.get('day')
  const dayStart = dayParam && /^\d{4}-\d{2}-\d{2}$/.test(dayParam)
    ? Date.parse(`${dayParam}T00:00:00.000Z`)
    : (() => { const t = new Date(); t.setUTCHours(0, 0, 0, 0); return t.getTime() - DAY_MS })()
  const dayEnd = dayStart + DAY_MS
  const day = new Date(dayStart).toISOString().slice(0, 10)

  const [profiles, events] = await Promise.all([
    fetchAllRows<{ id: string; email: string | null }>(admin, 'profiles', 'id, email'),
    fetchAllRows<EventRow>(admin, 'events', 'id, name, user_id, created_at, metadata', { column: 'name', values: [...VERSAO_B_EVENT_NAMES] }),
  ])
  const extIds = new Set(profiles.filter((p) => !isInternalEmail(p.email)).map((p) => p.id))
  const dia = funilVersaoB(events, dayStart, extIds, dayEnd)
  const total = funilVersaoB(events, Date.parse(VERSAO_B_SINCE), extIds)
  const linhaDia = funilVersaoBLinha(day, dia)
  const linhaTotal = funilVersaoBLinha('desde 08/09', total)

  // 1 linha por dia: apaga a anterior do mesmo dia antes de gravar (recálculo idempotente)
  await admin.from('events').delete().eq('name', 'placar_versao_b_daily').contains('metadata', { day })
  const { error } = await admin.from('events').insert({
    name: 'placar_versao_b_daily',
    path: '/api/cron/placar-versao-b',
    metadata: { day, funnel_day: dia, funnel_total: total, linha_dia: linhaDia, linha_total: linhaTotal, since: VERSAO_B_SINCE, version: 'placar_b_v1' },
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, day, linha_dia: linhaDia, linha_total: linhaTotal, funnel_day: dia, funnel_total: total })
}
