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

/** Os 10 do 1º print de 24/08 (30%). Case-insensitive. */
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

// KINEO-CREATOR50-2026-08-24 — 2º print do fundador no mesmo dia, ordem: 50%
// no 1º mês do Creator. Os 3 nomes que aparecem nos DOIS prints
// (mauricejerry1, n.kraam, londonugochukwu0) ficam de propósito SÓ na lista
// de 30%: receberam o e-mail de 30% às 14:15 de hoje, e mostrar 50% na tela
// duas horas depois ensinaria que esperar aumenta o desconto — além de trair
// quem comprou rápido. Se não converterem até 27/08, escalar para 50% aí sim
// (escada temporal parece natural; contradição no mesmo dia parece desespero).
const COHORT50 = new Set([
  'yousseffouad122005@gmail.com',
  'tstarfemoria@gmail.com',
  'ramadanabdullahi2028@gmail.com',
  'dkzehri07@gmail.com',
  'vivaciousyogjalandhar@gmail.com',
  'alexandraugwuc@gmail.com',
  'sharanwork007@gmail.com',
  'priyojeet143@gmail.com',
  'collinskamu699@gmail.com',
  'marinarobot69@gmail.com',
  'seemakhalid0088@gmail.com',
])

/** A oferta morre sozinha em 31/08 — código pode ficar, campanha não. */
const OFFER_ENDS_MS = Date.UTC(2026, 7, 31, 23, 59, 59)

export async function GET() {
  try {
    if (Date.now() > OFFER_ENDS_MS) return NextResponse.json({ eligible: false })
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const email = (user?.email ?? '').trim().toLowerCase()
    // COHORT50 tem precedência — mas por construção as listas não se cruzam
    // (os 3 overlaps do 2º print ficaram só no 30%; ver nota acima).
    const promo = COHORT50.has(email) ? 'CREATOR50' : COHORT.has(email) ? 'CREATOR30' : null
    if (!email || !promo) return NextResponse.json({ eligible: false })
    // Quem já paga não precisa de desconto de primeira fatura.
    const { data: prof } = await supabase
      .from('profiles')
      .select('has_paid')
      .eq('id', user!.id)
      .maybeSingle()
    if (prof?.has_paid === true) return NextResponse.json({ eligible: false })
    return NextResponse.json({
      eligible: true,
      endsAt: OFFER_ENDS_MS,
      promo,
      percent: promo === 'CREATOR50' ? 50 : 30,
    })
  } catch {
    // Falha de leitura nunca pode virar modal errado: na dúvida, não mostra.
    return NextResponse.json({ eligible: false })
  }
}
