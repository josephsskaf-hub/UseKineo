// Push #298 — CEO Dashboard API.
// KINEO-ADMIN-CEO-2026-08-03 — all the aggregation moved to ./compute.ts so
// this route, the /admin/ceo page and the /admin home cannot drift apart again
// (they had already: the page and the route were two hand-maintained copies of
// the same 150 lines). This file is now just the gate + the JSON envelope.

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isAdminEmail } from '../_shared/db'
import { computeCeoData } from './compute'

export const dynamic = 'force-dynamic'
// ═══ KINEO-DATA-CACHE-2026-09-02 (sprint-assinaturas #17) ═══════════════════
// Rota SO-GET no Next 14.2: sem POST no modulo, o store nasce com
// revalidate=false, e `dynamic='force-dynamic'` NAO muda isso (so pula o proxy
// que marcaria a rota como dinamica). Resultado: todo GET do supabase-js (e da
// fal/Creatomate) com URL estavel ia para o Data Cache da Vercel PARA SEMPRE —
// a rota lia o banco como ele estava na PRIMEIRA vez que aquela URL foi pedida.
// Provado em producao 02/09: cron de resgate contando 1 tentativa com 3 no
// banco, marcador stranded_composed invisivel 13 min depois de gravado,
// "claim row missing" logo apos 23505 no MESMO id, e-mail de video pronto
// repetido 15 min depois (be9c6314). Esta linha e o unico interruptor que
// zera o revalidate ANTES do primeiro fetch. Nao remover.
export const fetchCache = 'force-no-store'
export const runtime = 'nodejs'

// Re-exported so existing imports (`import type { CeoData } from
// '@/app/api/admin/ceo/route'`) keep working.
export type { CeoData, FunnelWindow, FunnelStep, PlanRevenueRow } from './compute'

export async function GET() {
  try {
    const cookieClient = createClient()
    const {
      data: { user },
    } = await cookieClient.auth.getUser()
    if (!user || !isAdminEmail(user.email)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const data = await computeCeoData()
    if (!data) {
      return NextResponse.json({ error: 'Service role not configured' }, { status: 500 })
    }

    return NextResponse.json({ data, updatedAt: data.generatedAt })
  } catch (err) {
    console.error('[admin/ceo] unexpected:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
