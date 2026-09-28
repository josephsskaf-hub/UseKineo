// KINEO-ADS-V2-2026-09-28 — cron do anúncio v2: avança os pedidos em andamento (generating/assembling) com a aba do
// cliente fechada. Mesmo motor da tela (lib/ads/v2Advance.ts); tela e cron juntos são seguros (transições
// condicionais). Não existe webhook da fal nem do Creatomate — sem este cron, anúncio de aba fechada nunca é entregue.
//
// Agenda em vercel.json: '2-57/5 * * * *' — folga de minuto em relação a finish-stranded-renders e demo-render
// (*/5, minuto 0/5) e ao refund-sweep (:30): cron no mesmo minuto não tem ordem.
// Esta rota NÃO lê ?confirm: não envia e-mail nem decide campanha; só avança o que o cliente já pagou.
// Lote pequeno, o mais parado primeiro; o estorno de pedido parado > 2 h mora no refund-sweep (rede de trás).
import { NextRequest, NextResponse } from 'next/server'
import { footageAdminClient } from '@/lib/userFootage'
import { isMissingAdsTable } from '@/lib/ads/serverAccess'
import { advanceAdsV2Order } from '@/lib/ads/v2Advance'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
// Rota só-GET: sem isto, o supabase-js lê o banco do Data Cache da Vercel (KINEO-DATA-CACHE-2026-09-02).
export const fetchCache = 'force-no-store'
export const maxDuration = 300

const BATCH = 6
const TOTAL_BUDGET_MS = 240_000
const PER_ORDER_BUDGET_MS = 60_000

// Padrão de autenticação de cron da casa: falha FECHADA quando a env some (app/api/cron/refund-sweep/route.ts).
function isAuthorized(req: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) return false
  return req.headers.get('authorization') === `Bearer ${cronSecret}`
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const started = Date.now()
  const admin = footageAdminClient()
  const { data, error } = await admin
    .from('ads_v2_orders')
    .select('id, status, updated_at')
    .in('status', ['generating', 'assembling'])
    .order('updated_at', { ascending: true })
    .limit(BATCH)
  if (error) {
    if (isMissingAdsTable(error.code)) return NextResponse.json({ ok: true, not_ready: true })
    console.error('[cron/ads-v2-advance] leitura falhou:', error.message)
    return NextResponse.json({ ok: false, error: 'orders_read_failed' })
  }
  const results: { order_id: string; before: string; after: string | null }[] = []
  for (const o of (data ?? []) as { id: string; status: string }[]) {
    if (Date.now() - started > TOTAL_BUDGET_MS) break
    const view = await advanceAdsV2Order(admin, o.id, { deadlineMs: Math.min(started + TOTAL_BUDGET_MS, Date.now() + PER_ORDER_BUDGET_MS) })
    results.push({ order_id: o.id, before: o.status, after: view?.status ?? null })
  }
  console.log('[cron/ads-v2-advance]', JSON.stringify({ scanned: results.length, results, ms: Date.now() - started }))
  return NextResponse.json({ ok: true, scanned: results.length, results })
}
