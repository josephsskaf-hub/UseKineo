// KINEO-AFILIADO-30-2026-09-09 — a comissão de afiliado tem UMA fonte.
// Fundador (09/09 00h): "a comissão pode diminuir de quarenta pra trinta".
// Motivo: a 40% recorrente, o Studio V7 ($59/300cr) no pior caso de motor
// (H3, $34,80 de custo) somado à comissão ($23,60) deixava margem ~0.
// A 30%: $17,70 de comissão, ~$5 de sobra no pior caso; nos planos menores
// a margem fica confortável. Lib pura (sem imports): entra em copy pública,
// rota de cadastro de afiliado e cálculo de ilustração.
export const AFFILIATE_COMMISSION_RATE = 0.3
export const AFFILIATE_COMMISSION_PCT = `${Math.round(AFFILIATE_COMMISSION_RATE * 100)}%`
