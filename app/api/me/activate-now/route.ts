import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { stripe } from '@/lib/stripe'

// ═══ KINEO-ATIVAR-AGORA-2026-08-20 — ENCERRAR O TRIAL A PEDIDO ═══════════
//
// A regra que este arquivo existe para respeitar, e que o fundador e eu
// fechamos juntos: cobrança antecipada SÓ COM O CLIQUE DA PESSOA.
//
// O caso: ela entra no trial pago, gosta, e queima os 80 créditos em dois
// dias. Fazer ela esperar até o dia 8 para voltar a produzir é perder o
// momento exato em que ela está mais convencida — o pior momento possível
// para uma fila. Mas cobrar sozinho quando o saldo zera seria pior ainda: a
// pessoa não pediu, não esperava, e cobrança inesperada vira contestação de
// cartão. Contestação em volume derruba a conta Stripe.
//
// A saída é a única honesta: a pessoa CLICA "ativar agora" e o trial termina
// naquele instante. O Stripe fatura imediatamente (trial_end: 'now'), o
// webhook de invoice.payment_succeeded credita o plano pelo caminho que já
// existe, e ela volta a produzir em segundos.
//
// SEGURANÇA: só a própria pessoa (sessão autenticada), só a assinatura DELA,
// e só se estiver realmente em `trialing` — nunca antecipa cobrança de quem
// já é cliente, nem de assinatura de terceiro.
export const dynamic = 'force-dynamic'

export async function POST() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: prof } = await supabase
    .from('profiles')
    .select('stripe_subscription_id')
    .eq('id', user.id)
    .maybeSingle()

  const subId = (prof?.stripe_subscription_id ?? '') as string
  if (!subId) return NextResponse.json({ error: 'No subscription to activate.' }, { status: 400 })

  try {
    const sub = await stripe.subscriptions.retrieve(subId)
    // Gate duro: fora de `trialing` não há o que antecipar. Protege contra
    // clique duplo, aba velha e qualquer chamada fora de contexto.
    if (sub.status !== 'trialing') {
      return NextResponse.json({ error: 'This subscription is not in a trial.', status: sub.status }, { status: 409 })
    }
    // Encerra o trial AGORA. O Stripe emite a primeira fatura no ato; o
    // webhook `invoice.payment_succeeded` concede os créditos do plano pela
    // rota que já existe — nenhum caminho novo de crédito é criado aqui.
    const updated = await stripe.subscriptions.update(subId, { trial_end: 'now' })
    console.log(`[activate-now] user=${user.id.slice(0, 8)} sub=${subId} trial encerrado a pedido`)
    return NextResponse.json({ ok: true, status: updated.status })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('[activate-now] falhou:', msg)
    // Cartão recusado é o caso comum e merece mensagem própria: a pessoa
    // precisa saber que o problema é o cartão, não o produto.
    return NextResponse.json(
      { error: 'We could not start your plan right now. Check your card details and try again.' },
      { status: 502 },
    )
  }
}
