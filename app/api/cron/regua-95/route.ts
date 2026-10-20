// KINEO-META95-REGUA-1910 — cron da RÉGUA 95 (vercel.json, a cada 10 min). Ver lib/regua95/coletar.ts.
// Julga as entregas novas de todos os produtos (Filmes, Ads, UGC/avatar, Clipes) com as duas notas novas — coherence_v2
// (texto contra a ideia original, prompt inteiro, 2 leituras) e pixel_score (quadros do MP4 final num modelo de visão) — e
// grava um evento por nota. Só medição: roda depois da entrega, nunca bloqueia nem muda o que o cliente recebe.
// ?hours=N (1–336, padrão 6) e ?max=N (0–12, padrão 4) para recuperar uma janela maior à mão.
import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { readAll } from '@/lib/supabase/readAll'
import { freshFetch } from '@/lib/lifecycle/freshFetch'
import { julgarPendentesRegua } from '@/lib/regua95/coletar'

export const dynamic = 'force-dynamic'
// KINEO-DATA-CACHE-2026-09-02 — rota só-GET nasce com revalidate=false; sem esta linha o marcador "já julgado" viria do
// Data Cache da Vercel e o mesmo vídeo seria julgado (e cobrado) a cada giro.
export const fetchCache = 'force-no-store'
export const runtime = 'nodejs'
export const maxDuration = 300

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
  const admin = createAdminClient(url, key, { auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: freshFetch } })
  const hoursRaw = Number(req.nextUrl.searchParams.get('hours'))
  const maxRaw = Number(req.nextUrl.searchParams.get('max'))
  try {
    const r = await julgarPendentesRegua(admin, {
      route: '/api/cron/regua-95',
      hours: Number.isFinite(hoursRaw) && hoursRaw > 0 ? hoursRaw : 6,
      maxJudge: Number.isFinite(maxRaw) && maxRaw >= 0 ? maxRaw : 4,
      limit: 200,
    }, readAll)
    return NextResponse.json({ ok: true, ...r })
  } catch (e) {
    console.warn('[cron/regua-95] falhou:', e instanceof Error ? e.message : String(e))
    return NextResponse.json({ ok: false, error: 'failed' }, { status: 502 })
  }
}
