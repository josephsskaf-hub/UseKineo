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
