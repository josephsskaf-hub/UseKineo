// Run this in Supabase SQL editor if `video_credits` doesn't exist:
// ALTER TABLE profiles ADD COLUMN IF NOT EXISTS video_credits integer DEFAULT 3;

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
// KINEO-REVERSE-TRIAL-P2-2026-08-06 — ver o bloco antes do recordReverseTrialDebit.
import { recordReverseTrialDebit } from '@/lib/reverseTrial'

export async function POST() {
  try {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized', success: false }, { status: 401 })
    }

    const { data: profile, error: fetchError } = await supabase
      .from('profiles')
      .select('video_credits')
      .eq('id', user.id)
      .single()

    if (fetchError) {
      console.error('[credits/deduct] fetch error:', fetchError.message)
      return NextResponse.json(
        { error: 'Could not load credit balance', success: false },
        { status: 500 }
      )
    }

    const current = profile?.video_credits ?? 0
    if (current <= 0) {
      return NextResponse.json(
        { error: 'No credits remaining', credits: 0, success: false },
        { status: 402 }
      )
    }

    const next = current - 1
    // KINEO-TRIAL-DOUBLECOUNT-2026-08-07 — `.select()` para saber se a UPDATE
    // MUDOU alguma linha. Sem isto, uma corrida que zerou o saldo entre o read e
    // o write devolve `error: null` com ZERO linhas afetadas: nenhum crédito
    // saiu, mas o teto do trial somava 1 assim mesmo — a mesma classe de bug do
    // replay do RPC cinematic, na versão manual desta rota.
    const { data: updatedRows, error: updateError } = await supabase
      .from('profiles')
      .update({ video_credits: next })
      .eq('id', user.id)
      .gt('video_credits', 0)
      .select('video_credits')

    if (updateError) {
      console.error('[credits/deduct] update error:', updateError.message)
      return NextResponse.json(
        { error: 'Failed to deduct credit', success: false },
        { status: 500 }
      )
    }

    // ═══ KINEO-REVERSE-TRIAL-P2-2026-08-06 — BURACO NO TETO DE 40 ════════════
    // Esta rota decrementa video_credits NA MÃO (read→compute→write), fora do
    // ponto único lib/credits/debit.ts. Ou seja: era um débito real que NUNCA
    // somava em trial_credits_used. Com o grant de 40 ligado, uma conta em trial
    // podia queimar os 40 inteiros por aqui (o CreateClient chama esta rota em
    // TODO render legado bem-sucedido) sem nunca bater no cap e sem nunca
    // expirar por consumo — exatamente a classe de bug que o wrapper existe para
    // impedir. Achado da revisão adversarial desta sprint.
    // Com a flag OFF isto retorna antes de qualquer leitura (no-op absoluto).
    // Nunca lança: contabilidade jamais derruba um débito já efetivado.
    //
    // DÍVIDA SEPARADA, NÃO CORRIGIDA AQUI (está no relatório): o fluxo /create
    // cobraria DUAS vezes pelo mesmo vídeo — 1 crédito em /api/render
    // (debit_video_credits, chave `legacy-<id>`) e mais 1 nesta rota. Escrito no
    // CONDICIONAL de propósito: a medição de hoje diz que ninguém passa por lá
    // (0 eventos em `/create` na história inteira, 0 linhas `legacy-%` em
    // credit_debits desde 12/06). É uma armadilha carregada, não um vazamento
    // ativo — e é a razão de ela não ser tratada como incidente nesta sprint.
    //
    // KINEO-TRIAL-DOUBLECOUNT-2026-08-07 — REPLAY, o outro lado do mesmo bug:
    // aqui NÃO existe render_id, então não há como o ledger por render (a trava
    // de lib/credits/debit.ts) valer. O que substitui a trava é o fato de esta
    // rota não ser idempotente: cada chamada bem-sucedida tira 1 crédito DE
    // VERDADE, logo cada uma deve somar 1 no teto — chamar duas vezes cobra duas
    // vezes, e contar duas vezes é o correto. O único caso de "sem erro e sem
    // débito" era a corrida que zerou o saldo (0 linhas afetadas), e é
    // exatamente o que `debited` abaixo passa a exigir.
    const debitedRow = (updatedRows ?? [])[0]
    const debited = Boolean(debitedRow)
    if (debited) {
      try {
        await recordReverseTrialDebit(user.id, 1)
      } catch (e) {
        console.error('[credits/deduct] trial cap accounting non-fatal:', e instanceof Error ? e.message : String(e))
      }
    } else {
      console.warn('[credits/deduct] update affected 0 rows — balance raced to zero, nothing debited')
    }

    // Saldo devolvido: o valor REAL da linha quando ela mudou; 0 quando a
    // corrida zerou o saldo (o `.gt(0)` só falha nesse caso) — devolver
    // `current - 1` ali seria informar um crédito que não existe.
    const remaining = typeof debitedRow?.video_credits === 'number'
      ? debitedRow.video_credits
      : (debited ? next : 0)
    return NextResponse.json({ credits: remaining, success: true })
  } catch (err) {
    console.error('[credits/deduct] unexpected:', err)
    return NextResponse.json(
      { error: 'Unexpected error', success: false },
      { status: 500 }
    )
  }
}
