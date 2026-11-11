// KINEO-PAREDE-MENSAL-1111 [CEO 11/11, decisão do FUNDADOR — só publica com o sim dele] — a parede de crédito (o modal de
// components/offers/ConversionUpgrade.tsx, o único que usa este interruptor) passa a ABRIR NO MENSAL. Nada de preço muda: o anual
// continua a um clique, com o mesmo "Annual · save 30%" e o mesmo "Save $X/yr". O /pricing NÃO lê este arquivo.
//
// Por quê (medido 11/11, 14 dias, externos): 29 pessoas bateram na parede; 26 viram só o preço ANUAL ("Starter · $76 /year") e
// 0 delas abriram checkout anual; os 4 checkouts que saíram da parede foram 3 mensais + 1 passe (dos 6 que viram o MENSAL
// no modal, 1 abriu checkout mensal). Em 60 dias: 12 compras, 12 mensais,
// 0 anuais no checkout. O plano de entrada de US$ 9/mês ficava atrás da aba "Monthly".
//
// Volta: KINEO_PAREDE_MENSAL_1111 = 'off' → a parede abre no anual, como antes (a impressão passa a gravar billing_default='annual').
// Leitura em 7 dias: docs/queries/PAREDE-MENSAL-2026-11-11.sql. O corte antes/depois é o campo `billing_default` no
// conversion_offer_viewed (offer_id 'menu'), NUNCA o relógio.

/** Pura (sem import de execução): o guardião a carrega sozinha. */
export type ParedeBilling = 'monthly' | 'annual'

export const KINEO_PAREDE_MENSAL_1111 = 'on' as 'on' | 'off'
export const PAREDE_MENSAL_VERSION = 'parede_mensal_1111'

/** A aba que a parede abre selecionada. 'on' = mensal; 'off' = anual (o de antes). */
export function paredeBillingInicial(chave: 'on' | 'off' = KINEO_PAREDE_MENSAL_1111): ParedeBilling {
  return chave === 'on' ? 'monthly' : 'annual'
}

/** O que a impressão da parede (conversion_offer_viewed, offer_id 'menu') carrega a mais: qual aba ela abriu. */
export function paredeViewMetadata(chave: 'on' | 'off' = KINEO_PAREDE_MENSAL_1111): { billing_default: ParedeBilling; billing_default_version: string } {
  return { billing_default: paredeBillingInicial(chave), billing_default_version: PAREDE_MENSAL_VERSION }
}
