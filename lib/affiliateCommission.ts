// KINEO-AFILIADO-30-2026-09-09 — a comissão de afiliado tem UMA fonte.
// Fundador (09/09 00h): "a comissão pode diminuir de quarenta pra trinta".
// Motivo: a 40% recorrente, o Studio V7 ($59/300cr) no pior caso de motor
// (H3, $34,80 de custo) somado à comissão ($23,60) deixava margem ~0.
// A 30%: $17,70 de comissão, ~$5 de sobra no pior caso; nos planos menores
// a margem fica confortável. Lib pura (sem imports): entra em copy pública,
// rota de cadastro de afiliado e cálculo de ilustração.
export const AFFILIATE_COMMISSION_RATE = 0.3
export const AFFILIATE_COMMISSION_PCT = `${Math.round(AFFILIATE_COMMISSION_RATE * 100)}%`

// KINEO-AFILIADO-TERMOS-2026-09-09 — termos de repasse e bônus DECIDIDOS pelo
// fundador em 09/09 ("mínimo US$20, repasse mensal até dia 15, carência de 30
// dias; bônus US$3 uma vez por afiliado, teto 20 afiliados/US$60, pago junto da
// primeira comissão"). Uma fonte: /partners, painel do afiliado, kit e admin
// leem daqui. Pagamento é MANUAL (PayPal, fundador) — nada aqui move dinheiro.
export const AFFILIATE_PAYOUT_MIN_USD = 20
export const AFFILIATE_PAYOUT_DAY_OF_MONTH = 15
export const AFFILIATE_HOLD_DAYS = 30
export const AFFILIATE_ACTIVATION_BONUS_USD = 3
export const AFFILIATE_ACTIVATION_BONUS_CAP = 20
export const AFFILIATE_PAYOUT_TERMS =
  `Commissions are released ${AFFILIATE_HOLD_DAYS} days after the customer's payment (refund window), ` +
  `paid via PayPal once a month by the ${AFFILIATE_PAYOUT_DAY_OF_MONTH}th, with a $${AFFILIATE_PAYOUT_MIN_USD} minimum balance. ` +
  `Balances below the minimum roll over to the next month.`
export const AFFILIATE_BONUS_TERMS =
  `Activation bonus: a one-time $${AFFILIATE_ACTIVATION_BONUS_USD} after your first referred customer's first approved monthly payment, ` +
  `for the first ${AFFILIATE_ACTIVATION_BONUS_CAP} affiliates to get there. It is added to your balance and paid together with your first commission, never as a separate payout.`
