// KINEO-PRECO-REAIS-PORTA-PT-2026-10-02 — preço em REAIS na /gerador-de-shorts-gratis, ATRÁS DE INTERRUPTOR (nasce false).
//
// O pedido do dia foi "mostrar R$ 49,90". A fonte que COBRA hoje diz outra coisa: lib/settlementCurrency.ts
// BRL_PLAN_PRICES_MINOR.starter.monthly = 6490 (R$ 64,90, tabela V8-A de 28/09, usdToBrlMinor sobre o Starter em USD).
// R$ 49,90 é a tabela V5 (09/09 → 28/09), que só sobrevive como piso do grant de quem já assinava nela
// (LEGACY_V5_BRL_PLAN_PRICES_MINOR). Publicar 49,90 seria prometer um preço que o checkout não cobra — exatamente o
// erro que lib/marketingPrice.ts existe para impedir. Por isso o valor vem da tabela vigente, nunca digitado; se o
// fundador quiser 49,90 de novo, a decisão é na TABELA (e o checkout passa a cobrar o mesmo), não aqui.
//
// Preço público = decisão do fundador: com GERADOR_BRL_PRICE_LIVE = false a página fica byte a byte como estava.
import { BRL_PLAN_PRICES_MINOR, formatSettlementMoney } from '@/lib/settlementCurrency'

export const GERADOR_BRL_PRICE_LIVE = false

/** "R$ 64,90" — o Starter mensal na moeda de liquidação brasileira, da tabela que o checkout usa. */
export function starterBrlMonthlyLabel(): string {
  return formatSettlementMoney('brl', BRL_PLAN_PRICES_MINOR.starter.monthly)
}

/**
 * A frase de preço da pergunta "É grátis mesmo?" na porta PT. Desligado = a frase de hoje (USD de referência + "confira
 * o valor no checkout"); ligado = o valor em reais que o checkout cobra, com o USD de referência ao lado.
 */
export function geradorPaidPlansSentence(starterUsdAmount: string, live: boolean = GERADOR_BRL_PRICE_LIVE): string {
  if (!live) {
    return 'Planos pagos liberam o MP4 limpo, a partir de US$ ' + starterUsdAmount + ' por mês como preço de referência em USD. Para clientes no Brasil, a cobrança normalmente é em reais; confira o valor no checkout.'
  }
  return 'Planos pagos liberam o MP4 limpo, a partir de ' + starterBrlMonthlyLabel() + ' por mês para quem paga no Brasil (cobrança em reais no checkout; preço de referência internacional: US$ ' + starterUsdAmount + ').'
}
