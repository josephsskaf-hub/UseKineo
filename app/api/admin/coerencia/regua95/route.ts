// KINEO-META95-REGUA-1910 — POST /api/admin/coerencia/regua95: o botão "Avaliar agora (régua 95)" do /admin/coerencia.
// O cron /api/cron/regua-95 faz isto sozinho a cada 10 min; o botão serve para não esperar (e para a primeira prova em
// produção: um clique julga até 2 entregas da janela e grava coherence_v2 + pixel_score). Gate idêntico a toda rota
// /api/admin: sessão + isAdminEmail, ANTES de criar o cliente service role.
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { readAll } from '@/lib/supabase/readAll'
import { isAdminEmail, serviceClient } from '../../_shared/db'
import { julgarPendentesRegua, resumoRegua95, REGUA95_JANELA_HORAS } from '@/lib/regua95/coletar'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'
export const runtime = 'nodejs'
export const maxDuration = 120

const REGUA95_BOTAO_MAX = 2

export async function POST(req: Request) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || !isAdminEmail(user.email?.toLowerCase() ?? '')) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 })
    }
    const admin = serviceClient()
    if (!admin) return NextResponse.json({ error: 'unavailable' }, { status: 503 })
    const body = (await req.json().catch(() => ({}))) as { hours?: unknown }
    const hoursRaw = Number(body.hours)
    const hours = Number.isFinite(hoursRaw) && hoursRaw > 0 ? Math.min(hoursRaw, 336) : REGUA95_JANELA_HORAS // KINEO-META95-REGUA-AJUSTE-1910 — era 48 h
    const t0 = Date.now()
    const r = await julgarPendentesRegua(admin, { route: '/api/admin/coerencia/regua95', hours, maxJudge: REGUA95_BOTAO_MAX, limit: 300 }, readAll)
    console.log('[admin/coerencia/regua95]', resumoRegua95(r, Date.now() - t0)) // KINEO-META95-REGUA-AJUSTE-1910
    return NextResponse.json({ ok: true, ...r })
  } catch (e) {
    console.warn('[admin/coerencia/regua95] falhou:', e instanceof Error ? e.message : String(e))
    return NextResponse.json({ error: 'failed' }, { status: 502 })
  }
}
