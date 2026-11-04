// KINEO-DURACAO-COLADA-SALDO-0411 [TRAVA 8.2 — aval permanente do fundador 01/11 (laço do revisor)] — "esta conta paga?" não depende de quem respondeu primeiro.
//
// O DEFEITO (medido, 30 d, contas free sem pagar, diretiva colada na chegada): 58 subidas sem o saldo segurar e 68 seguradas, para
// o MESMO tipo de conta. A análise automática espera /api/credits (decidirAutoanalyze) e dispara ~0,9 s depois de abrir a página;
// o predicado da tela exigia também /api/me/plan (`planTier === null ? null : …`), que ninguém espera. Plano atrasado = "não sei" =
// a regra do saldo não vale: "de 40 segundos" subia 15 → 60 numa conta de 10 cr, e o próximo passo era a tela de pagamento.
// (manolopez69 04/11 subiu; youbykh 02/11, mesma conta, mesmo "40", foi segurado em 15 s e viu o plano do filme.)
//
// O CONSERTO: /api/credits, com os direitos resolvidos, já prova sozinho que a conta não paga (a tela guarda isso como
// activationAccountStatus 'free'; o `hasPaid: false` sozinho NÃO prova: é o padrão quando a leitura secundária falha). Quem paga
// responde true com qualquer sinal; sem nenhuma resposta, continua null ("não sei"), e o "não sei" segue como sempre.
// Puro e sem import.

export function contaPagaNaTela(f: {
  hasPaid: boolean
  isStarter: boolean
  isCreator: boolean
  isStudio: boolean
  /** /api/me/plan já respondeu (planTier !== null). */
  planoLido: boolean
  /** /api/credits respondeu com os direitos resolvidos e a conta não paga (activationAccountStatus === 'free'). */
  provadoQueNaoPaga: boolean
}): boolean | null {
  if (f.hasPaid || f.isStarter || f.isCreator || f.isStudio) return true
  return f.planoLido || f.provadoQueNaoPaga ? false : null
}
