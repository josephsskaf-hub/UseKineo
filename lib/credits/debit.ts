// KINEO-REVERSE-TRIAL-P1-2026-08-06 — PONTO ÚNICO DE DÉBITO EM CÓDIGO.
//
// Até 06/08 o RPC `debit_video_credits` era chamado direto em 8 lugares
// (compose/status, cinematic, avatar, voice, scene, gesture, animate, render
// legado). O RPC continua sendo a autoridade atômica no banco — este wrapper
// NÃO muda uma vírgula do débito em si: mesmo RPC, mesmos parâmetros, mesmo
// formato de retorno ({ data: saldo novo | null, error }).
//
// O que ele acrescenta: TODO débito bem-sucedido passa por um único lugar, e é
// aqui que o hard cap do reverse trial (40 créditos, adendo A1 de 06/08) é
// contabilizado — atrás
// da flag KINEO_REVERSE_TRIAL_ENABLED (default OFF ⇒ comportamento idêntico
// ao rpc direto, byte a byte). Um débito novo no futuro DEVE usar este wrapper
// em vez do rpc cru; senão ele não soma no cap (a classe de bug que a revisão
// adversarial desta fase existe para pegar).

import type { SupabaseClient } from '@supabase/supabase-js'
import { REVERSE_TRIAL_ENABLED, recordReverseTrialDebit } from '@/lib/reverseTrial'

export interface DebitResult {
  /** Saldo novo devolvido pelo RPC, ou null quando o RPC falhou/atipou. */
  data: number | null
  error: { message?: string; code?: string } | null
}

export async function debitVideoCredits(
  supabase: SupabaseClient,
  args: { userId: string; renderId: string; cost: number },
): Promise<DebitResult> {
  const { data, error } = await supabase.rpc('debit_video_credits', {
    p_render: args.renderId,
    p_cost: args.cost,
  })
  const balance = typeof data === 'number' ? data : null

  // Contabilidade do trial SÓ depois de débito confirmado (error nulo E saldo
  // numérico) e custo > 0. Nunca lança; nunca altera o resultado do débito.
  if (REVERSE_TRIAL_ENABLED && !error && balance !== null && args.cost > 0) {
    try {
      await recordReverseTrialDebit(args.userId, args.cost)
    } catch (e) {
      console.error('[credits/debit] trial cap accounting non-fatal:', e instanceof Error ? e.message : String(e))
    }
  }

  return { data: balance, error: error ?? null }
}
