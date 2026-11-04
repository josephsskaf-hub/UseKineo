// KINEO-OFERTA-3H-0411 — a oferta do anual desta conta, para o /pricing. O servidor decide: a janela é o created_at da conta (getUser) + 3 h, e has_paid.
// Só lê; nada cobra nem grava. Quem cobra é /api/stripe/checkout, com a MESMA régua (resolveAnnualOffer). Leitura que falha = sem oferta e sem relógio:
// nunca se mostra um relógio que não seja real. Resposta privada: muda por conta e não pode ir para cache nenhum.
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { resolveAnnualOffer } from '@/lib/billing/annualWelcomeOffer'
import { BF2026_ENDS_AT, bf2026Open } from '@/lib/billing/blackFriday2026'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

export async function GET() {
  const nowMs = Date.now()
  let signedIn = false
  let accountCreatedAt: string | null = null
  let hasPaid: boolean | null = true // sem leitura confirmada, a janela fica fechada
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      signedIn = true
      accountCreatedAt = user.created_at
      const { data, error } = await supabase.from('profiles').select('has_paid').eq('id', user.id).single()
      if (!error && data) hasPaid = (data as { has_paid?: boolean | null }).has_paid ?? null
    }
  } catch {
    signedIn = false
  }
  const offer = resolveAnnualOffer({
    tier: 'basic', // a regra é igual nos 3 planos com anual; o preço de cada um sai da tabela
    isAnnual: true,
    signedIn,
    accountCreatedAt,
    hasPaid,
    bfOpen: bf2026Open(nowMs),
    bfEndsAtMs: Date.parse(BF2026_ENDS_AT),
    nowMs,
  })
  return NextResponse.json(
    { nowMs, offer: offer?.kind ?? null, endsAtMs: offer?.endsAtMs ?? null },
    { headers: { 'Cache-Control': 'private, no-store' } },
  )
}
