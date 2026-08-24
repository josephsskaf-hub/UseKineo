// KINEO-CREATOR30-2026-08-24 — elegibilidade do modal de 30% off Creator.
//
// A COORTE É UM PRINT, LITERALMENTE: o fundador tirou print do /admin/live
// (24/08) e disse "oferece 30% pra todos esses". São 10 contas em dois grupos
// que a investigação do dia explicou:
//   · 6 tiveram crédito PRESO pelo órfão-pendente (#299) — pagaram 15cr num
//     Seedance que nunca chegou, ficaram dias travadas, foram estornadas hoje.
//   · 4 queimaram ou deixaram vencer o trial sem converter.
// Ou seja: gente que TENTOU usar o produto e foi mal atendida. O desconto é
// o pedido de desculpas com prazo, não um cupom público — por isso a lista é
// fixa em código (auditável, expira junto com a campanha) e NÃO uma flag no
// banco que alguém esquece ligada para sempre.
//
// O cupom em si vive no gate CREATOR30 do /api/stripe/checkout (mesmo padrão
// auto-provisionado do CREATOR20): este endpoint só responde "mostra o modal
// ou não". Quem não está na lista recebe {eligible:false} e nenhuma
// informação sobre a campanha — não vaza oferta para quem não era o alvo.
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

/** Os 10 do print de 24/08. Case-insensitive. */
const COHORT = new Set([
  'mauricejerry1@gmail.com',
  'n.kraam@googlemail.com',
  'scheickd05@myyahoo.com',
  'londonugochukwu0@gmail.com',
  'okoyoruth75@gmail.com',
  'gugtenterf+oyvme@gmail.com',
  'tworldsoftware@gmail.com',
  'matholtham@gmail.com',
  'zyxaustin1997@gmail.com',
  'a0929138683@gmail.com',
])

/** A oferta morre sozinha em 31/08 — código pode ficar, campanha não. */
const OFFER_ENDS_MS = Date.UTC(2026, 7, 31, 23, 59, 59)

export async function GET() {
  try {
    if (Date.now() > OFFER_ENDS_MS) return NextResponse.json({ eligible: false })
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const email = (user?.email ?? '').trim().toLowerCase()
    if (!email || !COHORT.has(email)) return NextResponse.json({ eligible: false })
    // Quem já paga não precisa de desconto de primeira fatura.
    const { data: prof } = await supabase
      .from('profiles')
      .select('has_paid')
      .eq('id', user!.id)
      .maybeSingle()
    if (prof?.has_paid === true) return NextResponse.json({ eligible: false })
    return NextResponse.json({ eligible: true, endsAt: OFFER_ENDS_MS })
  } catch {
    // Falha de leitura nunca pode virar modal errado: na dúvida, não mostra.
    return NextResponse.json({ eligible: false })
  }
}
