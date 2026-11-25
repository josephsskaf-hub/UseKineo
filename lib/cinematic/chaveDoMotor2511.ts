// KINEO-TOMADA-DO-MOTOR-2511 [CEO 25/11 16:25: "o dono quer trocar o motor do filme grátis sem deploy"] — o ponto único que decide o motor do filme
// grátis de 15 s lendo uma chave que a CEO muda no banco (tabela public.chaves_de_motor, migration em docs/migracoes-pendentes/20261125_chaves_de_motor.sql,
// NÃO aplicada até a revisão do outro CEO). Regra: sem a linha, sem a tabela, valor fora da lista ou erro de leitura = null = vale o código.
//   'gemini'  → o Gemini (com referência e 15 s), mesmo com GEMINI_NA_ESTEIRA_2511 desligado;
//   'kling4'  → nenhum pedido ao Gemini: o Kling 4 (reference, com a foto) no próximo pedido;
//   'reserva' → o Kling 4 grátis nem reserva: o filme vai à reserva de hoje (reserveKling4Trial devolve 'chave_reserva').
// Cache de 30 s por instância: a troca vale no próximo pedido de cada instância em até 30 s. Pedido já enviado não lê a chave.
// Só o servidor chama (o admin com service role); nada vai ao navegador.
import type { SupabaseClient } from '@supabase/supabase-js'

export type MotorDoFilmeGratis2511 = 'gemini' | 'kling4' | 'reserva'
export const CHAVES_DE_MOTOR_TABELA = 'chaves_de_motor'
export const CHAVE_FILME_GRATIS_15S = 'filme_gratis_15s'
export const CHAVE_DO_MOTOR_CACHE_MS = 30_000
const VALORES: readonly MotorDoFilmeGratis2511[] = ['gemini', 'kling4', 'reserva']

/** O valor da linha, conferido: fora da lista = null (o código). */
export function lerValorDoMotor2511(v: unknown): MotorDoFilmeGratis2511 | null {
  return typeof v === 'string' && (VALORES as readonly string[]).includes(v) ? (v as MotorDoFilmeGratis2511) : null
}

let cache: { em: number; valor: MotorDoFilmeGratis2511 | null } | null = null
/** Só para o guardião: esquece o cache. */
export function esquecerChaveDoMotor2511(): void { cache = null }

/** A chave do motor do filme grátis. Nunca lança: qualquer falha = null (o código). O erro também fica 30 s no cache (a tabela ausente não vira uma
 *  leitura por pedido). */
export async function motorDoFilmeGratis2511(admin: Pick<SupabaseClient, 'from'> | null | undefined, agora: number = Date.now()): Promise<MotorDoFilmeGratis2511 | null> {
  if (cache && agora - cache.em >= 0 && agora - cache.em < CHAVE_DO_MOTOR_CACHE_MS) return cache.valor
  let valor: MotorDoFilmeGratis2511 | null = null
  try {
    if (admin) {
      const { data, error } = await admin.from(CHAVES_DE_MOTOR_TABELA).select('valor').eq('chave', CHAVE_FILME_GRATIS_15S).maybeSingle()
      valor = error ? null : lerValorDoMotor2511((data as { valor?: unknown } | null)?.valor)
    }
  } catch { valor = null }
  cache = { em: agora, valor }
  return valor
}
