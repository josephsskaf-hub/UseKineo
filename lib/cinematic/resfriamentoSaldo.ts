// KINEO-RESFRIAMENTO-SALDO-1111 — a trava anti-abuso do filme (15 min depois de 2 tentativas estornadas) existe para que prompts
// que falham DE PROPÓSITO não virem trabalho pago grátis na fal. A recusa por SALDO da fal (`provider_balance_rejected_refunded`
// e a parcial) não é culpa da pessoa nem dá para provocar: é a conta da casa sem crédito. Medido em 14 dias até 11/11: 4 pessoas,
// todas no 1º filme, leram "Two AI attempts were just refunded" depois de o filme estacionar por falta de saldo — e a retomada
// automática do estacionado batia na mesma trava. Lib PURA: a rota e o guardião leem daqui.
// Guardião: scripts/test-resfriamento-saldo-1111.mjs.

/** Motivos de estorno que são a fal sem saldo — nunca contam para a trava. */
export const MOTIVOS_DE_SALDO: readonly string[] = ['provider_balance_rejected_refunded', 'provider_balance_rejected_partial_refunded']

/** O estorno foi por falta de saldo da casa na fal? */
export function estornoPorSaldo(reason: unknown): boolean {
  return typeof reason === 'string' && MOTIVOS_DE_SALDO.includes(reason)
}
