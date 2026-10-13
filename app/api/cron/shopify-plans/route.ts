// KINEO-SHOPIFY-2026-10-13 (etapa 2) — o vigia diário dos planos da Shopify App Pricing.
//
// Apps inscritos depois de abril de 2026 NÃO recebem o webhook de assinatura: cancelamento, congelamento e o ciclo novo só
// aparecem pela Partner API. Uma vez por dia, cada loja instalada e vinculada tem o plano relido (lib/shopify/billing.ts
// syncShopPlan) e, se o ciclo pago é novo, ganha os créditos do mês — a MESMA função da tela, idempotente por loja + ciclo (o
// recibo e o crédito na mesma transação: rodar duas vezes, ou junto com a tela, soma uma vez só).
// Leve: até 200 lojas por execução, as lidas há mais tempo primeiro. Autenticação de cron da casa (CRON_SECRET, falha FECHADA).
// Com o interruptor desligado: 404, nada lido.
// ⚠ Entra no vercel.json no dia do "vai shopify" (linha pronta em docs/SHOPIFY-APP-PLANO-2026-10-13.md), não antes.
import { NextRequest, NextResponse } from 'next/server'
import { shopifyAppLive, shopifyNotFound } from '@/lib/shopify/core'
import { SHOPIFY_SHOPS_TABLE, shopifyAdmin } from '@/lib/shopify/server'
import { syncShopPlan } from '@/lib/shopify/billing'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'
export const maxDuration = 300

const BATCH = 200
const BUDGET_MS = 240_000

function isAuthorized(req: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) return false
  return req.headers.get('authorization') === `Bearer ${cronSecret}`
}

export async function GET(req: NextRequest) {
  if (!shopifyAppLive()) return shopifyNotFound()
  if (!isAuthorized(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const started = Date.now()
  const admin = shopifyAdmin()
  if (!admin) return NextResponse.json({ error: 'not_ready' }, { status: 503 })
  const { data, error } = await admin
    .from(SHOPIFY_SHOPS_TABLE)
    .select('shop_domain')
    .eq('status', 'installed')
    .not('owner_user_id', 'is', null)
    .order('plan_checked_at', { ascending: true, nullsFirst: true })
    .limit(BATCH)
  if (error) return NextResponse.json({ error: 'read_failed' }, { status: 502 })
  const out = { scanned: 0, synced: 0, granted: 0, credits: 0, unavailable: 0, not_configured: 0 }
  for (const r of (data ?? []) as { shop_domain: string }[]) {
    if (Date.now() - started > BUDGET_MS) break
    out.scanned++
    const s = await syncShopPlan(admin, r.shop_domain).catch(() => ({ state: 'unavailable' as const }))
    if (s.state === 'synced') {
      out.synced++
      if (s.granted) { out.granted++; out.credits += s.credits }
    } else if (s.state === 'not_configured') {
      out.not_configured++
      break
    } else out.unavailable++
  }
  return NextResponse.json({ ok: true, ...out, ms: Date.now() - started }, { headers: { 'cache-control': 'no-store' } })
}
