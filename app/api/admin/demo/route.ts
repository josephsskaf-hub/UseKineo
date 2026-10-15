// KINEO-DEMO-SOB-MEDIDA-1510 — /api/admin/demo: a máquina de demo sob medida do B2B (regras em lib/ads/demoSobMedida.ts).
//
// GET  → o contador "X de 3 demos nesta semana", o saldo de créditos da conta em uso, o estado da fal, se a conta é da casa, e a
//        lista das demos da semana (fazendo/pronta/falhou, os formatos, o link privado e o texto pronto EN/ES/DE). Antes de ler,
//        dá UM passo nas demos entregues (formatos + aprovação; idempotente — o cron faz o mesmo a cada 5 min).
// POST { link, brand, voice?, scene?, exception?, exception_reason? } → a demo nova (Comercial 15 s 9:16 na conta da CASA em que o
//        admin está logado; dry-run antes; débito normal da casa). 202 = começou; o vídeo NÃO é esperado aqui.
//
// ORDEM DAS PORTAS: sessão (401) → isAdminEmail (403 'forbidden') → [POST] isAdsInternalEmail (403 'not_house_account') → corpo
// (400) → acesso do Studio Ads ('internal') → teto da semana → fal → créditos → link → … (lib/ads/demoSobMedidaServer.ts).
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isAdminEmail, serviceClient } from '@/app/api/admin/_shared/db'
import { isAdsInternalEmail } from '@/lib/ads/access'
import { loadAdsAccess } from '@/lib/ads/serverAccess'
import { adsV2Credits } from '@/lib/ads/v2Tiers'
import { readFalBalancePanel, falRefusalIsFresh, falLastRefusalAt } from '@/lib/supplier/falBalancePanel'
import { DEMO_SECONDS, DEMO_TIER, DEMO_WEEKLY_CAP, demoWeekLabel, sanitizeDemoBody } from '@/lib/ads/demoSobMedida'
import { advanceDemosSobMedida, createDemoSobMedida, demoWeekCount, listDemosOfWeek } from '@/lib/ads/demoSobMedidaServer'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'
export const maxDuration = 300

const noStore = { 'Cache-Control': 'no-store' }
const json = (body: Record<string, unknown>, status = 200) => NextResponse.json(body, { status, headers: noStore })

async function adminUser(): Promise<{ ok: true; user: { id: string; email: string | null } } | { ok: false; res: NextResponse }> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, res: json({ error: 'unauthenticated' }, 401) }
  if (!isAdminEmail(user.email)) return { ok: false, res: json({ error: 'forbidden' }, 403) }
  return { ok: true, user: { id: user.id, email: user.email ?? null } }
}

export async function GET(req: NextRequest) {
  try {
    const gate = await adminUser()
    if (!gate.ok) return gate.res
    const { user } = gate
    const admin = serviceClient()
    if (!admin) return json({ error: 'unavailable' }, 503)
    const now = new Date()
    const secret = process.env.SUPABASE_SERVICE_ROLE_KEY
    const step = await advanceDemosSobMedida(admin, { deadlineMs: Date.now() + 20_000, secret, now })
    const [count, list, prof, panel] = await Promise.all([
      demoWeekCount(admin, now),
      listDemosOfWeek(admin, now, secret, req.nextUrl.origin),
      admin.from('profiles').select('video_credits').eq('id', user.id).maybeSingle(),
      readFalBalancePanel(admin, now).catch(() => null),
    ])
    const balance = prof.error ? null : Number((prof.data as { video_credits?: number } | null)?.video_credits ?? 0)
    return json({
      house: isAdsInternalEmail(user.email),
      week: demoWeekLabel(now),
      count,
      cap: DEMO_WEEKLY_CAP,
      balance,
      cost: adsV2Credits(DEMO_TIER, DEMO_SECONDS),
      fal: { state: !panel ? 'not_measured' : falRefusalIsFresh(panel, now.getTime()) ? 'refused' : 'ok', last_refusal_at: falLastRefusalAt(panel) },
      rows: list.rows,
      list_error: list.error,
      step,
    })
  } catch (e) {
    console.warn('[admin/demo GET] falhou:', e instanceof Error ? e.message : String(e))
    return json({ error: 'unavailable' }, 502)
  }
}

export async function POST(req: NextRequest) {
  const started = Date.now()
  try {
    const gate = await adminUser()
    if (!gate.ok) return gate.res
    const { user } = gate
    if (!isAdsInternalEmail(user.email)) return json({ error: 'not_house_account' }, 403)
    const parsed = sanitizeDemoBody(await req.json().catch(() => null))
    if (!parsed.ok) return json({ error: parsed.error }, 400)
    const access = await loadAdsAccess(user.id, user.email) // a conta da casa age na PRÓPRIA conta (sem workspace de equipe Business)
    const r = await createDemoSobMedida({ admin: access.admin, user, access, body: parsed.value, now: new Date(), started })
    return json(r.body, r.status)
  } catch (e) {
    console.warn('[admin/demo POST] falhou:', e instanceof Error ? e.message : String(e))
    return json({ error: 'start_failed' }, 502)
  }
}
