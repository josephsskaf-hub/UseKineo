// KINEO-KIDS-VENDA-2010 — GET /api/kids-venda/status: o que a tela /kids-cartoon mostra à pessoa logada — se a venda está aberta para
// ela (KIDS_SALES_LIVE ou conta da casa), se a amostra grátis ainda cabe (antifarm), os pedidos dela (piloto/pack/amostra) com
// contagem e os episódios entregues (vídeo + título + legenda + hashtags). Só lê; nada cobra nem grava. Relógio e regras do SERVIDOR.
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isInternalEmail } from '@/lib/internalAccounts'
import { KIDS_PRICES, KIDS_SALES_OPEN_FOR_PUBLIC, KIDS_VENDA_DURATION, KIDS_VIDEOS, kidsSalesOpen } from '@/lib/kidsVenda/kidsVenda'
import { kidsSampleEligibility, kidsServiceClient, loadKidsStatus } from '@/lib/kidsVenda/server'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'You must be signed in.' }, { status: 401 })
  const internal = isInternalEmail(user.email)
  const open = kidsSalesOpen(KIDS_SALES_OPEN_FOR_PUBLIC, internal)
  const db = kidsServiceClient()
  if (!db) return NextResponse.json({ ready: false, open, orders: [] }, { headers: { 'Cache-Control': 'private, no-store' } })
  const status = await loadKidsStatus(db, user.id)
  const sample = open ? await kidsSampleEligibility(db, { userId: user.id, live: KIDS_SALES_OPEN_FOR_PUBLIC, internal }) : { ok: false as const, reason: 'closed' as const }
  return NextResponse.json({
    ready: status.ready,
    open,
    prices: { autopilot: KIDS_PRICES.autopilot.usdMinor, pack: KIDS_PRICES.pack.usdMinor, currency: 'usd' },
    videos: KIDS_VIDEOS,
    duration: KIDS_VENDA_DURATION,
    sample: sample.ok ? { eligible: true } : { eligible: false, reason: sample.reason },
    orders: status.orders,
  }, { headers: { 'Cache-Control': 'private, no-store' } })
}
