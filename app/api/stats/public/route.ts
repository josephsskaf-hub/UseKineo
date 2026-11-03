// PROVA-SOCIAL-REAL-2026-07-02 — public, non-sensitive live stats for the
// marketing funnel (LiveStatsBadge, LiveStatsBand). Returns ONLY aggregate
// counts straight from the database — never invented numbers, never per-user data.
//
// KINEO-COPIA-ORCAMENTO-CONTADOR-0211 — the counting moved to
// lib/publicStatsServer.ts (readPublicStats), the ONE reading behind every
// public counter: completed films only, internal accounts excluded, paginated.
// Before, this route counted every `videos` row (failed renders and the
// house's own test films included) while /api/films-made counted completed
// customer films — two different numbers for the same question on one site.
// The response shape is lib/publicStats.ts (PublicStats) + ok.
//
// Cached: revalidate = 3600 (ISR) + CDN Cache-Control so anonymous traffic
// never hammers the database — at most one real query set per hour.

import { NextResponse } from 'next/server'
import { readPublicStats } from '@/lib/publicStatsServer'

export const revalidate = 3600

const CACHE_HEADERS = {
  'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
}

export async function GET() {
  const stats = await readPublicStats()
  if (!stats) {
    // Config gap or read error — the counters simply won't render. Never surface details.
    return NextResponse.json({ ok: false }, { headers: { 'Cache-Control': 'no-store' } })
  }
  return NextResponse.json({ ok: true, ...stats }, { headers: CACHE_HEADERS })
}
