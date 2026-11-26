// KINEO-OFERTA-3H-0411 — a oferta do anual desta conta, para o /pricing. O servidor decide: a janela é o created_at da conta (getUser) + 3 h, e has_paid.
// Só lê; nada cobra nem grava. Quem cobra é /api/stripe/checkout, com a MESMA régua (resolveAnnualOffer). Leitura que falha = sem oferta e sem relógio:
// nunca se mostra um relógio que não seja real. Resposta privada: muda por conta e não pode ir para cache nenhum.
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { resolveAnnualOffer } from '@/lib/billing/annualWelcomeOffer'
import { BF2026_ENDS_AT, bf2026CheckoutEligible } from '@/lib/billing/blackFriday2026'
import { MONTHLY_FIRST_MONTH_3H_LIVE, MONTHLY_FIRST_MONTH_OFFER_KIND, monthlyFirstMonthWindow } from '@/lib/billing/monthlyFirstMonthOffer' // KINEO-MENSAL-3H-0911

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
  // KINEO-BF-SO-STARTER-2311 [fundador 16/11] — a Black Friday vale só no Starter. Dois campos, cada um com o seu relógio:
  //   · `offer`/`endsAtMs`: o MESMO de antes (com a Black Friday aberta, 'black_friday_2026' até BF2026_ENDS_AT; fora dela, as 3 h ou nada). A barra do
  //     topo, a caixa de presente e o /pricing recebem o que sempre receberam; o /pricing só pinta a Black Friday nos planos de bf2026CoversTier.
  //   · `welcomeOffer`/`welcomeEndsAtMs`: SÓ com a Black Friday aberta — as 3 h da conta nova nos planos que a Black Friday não cobre (o Creator), com o
  //     fim em created_at + 3 h, pelo MESMO portão por plano do checkout. Fora da Black Friday é sempre null (as 3 h já estão em `offer`).
  // KINEO-BF-TODOS-ANUAIS-2611 [dono 26/11] — com os 3 anuais na Black Friday o Creator também sai 'black_friday_2026', então `welcomeOffer` fica null na
  // janela (o campo segue aqui para o dia em que a lista da BF encolher de novo). Fora da Black Friday nada muda.
  const base = { isAnnual: true, signedIn, accountCreatedAt, hasPaid, bfEndsAtMs: Date.parse(BF2026_ENDS_AT), nowMs }
  const offer = resolveAnnualOffer({ ...base, tier: 'starter', bfOpen: bf2026CheckoutEligible({ tier: 'starter', isAnnual: true, nowMs }) })
  const creator = offer?.kind === 'black_friday_2026'
    ? resolveAnnualOffer({ ...base, tier: 'basic', bfOpen: bf2026CheckoutEligible({ tier: 'basic', isAnnual: true, nowMs }) })
    : null
  const welcomeOffer = creator?.kind === 'welcome_3h' ? creator : null
  // KINEO-MENSAL-3H-0911 [fundador 09/11: "vai para 30% nas 3 primeiras horas"] — os 30% do 1º mês no mensal: o MESMO relógio (created_at + 3 h) e a mesma
  // leitura de has_paid. Independe da Black Friday (que só mexe no anual). Quem cobra é o checkout, que confere de novo (parceiro, cupom, uso anterior).
  const monthly = monthlyFirstMonthWindow({ live: MONTHLY_FIRST_MONTH_3H_LIVE, signedIn, accountCreatedAt, hasPaid, nowMs })
  return NextResponse.json(
    {
      nowMs, offer: offer?.kind ?? null, endsAtMs: offer?.endsAtMs ?? null,
      welcomeOffer: welcomeOffer ? welcomeOffer.kind : null, welcomeEndsAtMs: welcomeOffer?.endsAtMs ?? null, // KINEO-BF-SO-STARTER-2311
      monthlyOffer: monthly ? MONTHLY_FIRST_MONTH_OFFER_KIND : null, monthlyEndsAtMs: monthly?.endsAtMs ?? null,
    },
    { headers: { 'Cache-Control': 'private, no-store' } },
  )
}
