// KINEO-TRIAL-1DOLAR-NA-ENTREGA-2026-09-07 — A PORTA DE $1 NO ÚNICO LUGAR ONDE
// EXISTE UM MOTIVO CONCRETO PARA PAGAR AGORA.
//
// O QUE ESTÁ ERRADO, MEDIDO (eventos, contas externas, contando pessoas):
//   · A caixa comercial da tela de filme pronto (`trial_post_video_offer_viewed`)
//     foi vista por 241 pessoas em 60 dias. O ÚLTIMO clique no botão dela é de
//     22/08 17:16 UTC. Desde então: 35 pessoas, 37 impressões, ZERO cliques.
//   · O botão pede assinatura mensal cheia ($7 Starter ou $15 Creator). A pessoa
//     está em trial, acabou de receber um filme COM MARCA D'ÁGUA e o que ela quer
//     é ESTE arquivo limpo — não um compromisso mensal.
//   · O trial pago de $1 foi LIGADO hoje (07/09 15:43, `c902516f`), e a porta
//     dele só existe em `/pricing` e nos cards do app. `pricing_trial_1usd_clicked`
//     tem ZERO linhas em toda a história: a oferta está no ar e ninguém a encontra.
//
// A JOGADA: a mesma caixa passa a abrir com a porta de $1, porque é a única
// oferta da casa que resolve o desejo do instante (este filme, limpo) por um
// preço que não é uma decisão mensal. O plano continua VISÍVEL logo abaixo —
// ordem do fundador: "nunca esconder o plano".
//
// ═══ AS TRÊS TRAVAS DE HONESTIDADE (memória: vitrine-oferece-o-que-o-cobrador-recusa)
// O servidor (`app/api/stripe/checkout/route.ts`) recusa `?trial=1` em dois casos,
// e uma tela que anuncia $1 para quem vai ser cobrado outro valor é uma mentira
// medível. Este módulo replica o predicado do COBRADOR, não o reescreve:
//   1. `hasPaid` → o servidor zera `wantsTrial` (`card_trial_denied: 'has_paid'`)
//      e cobra o Creator cheio. Quem já pagou não vê a porta.
//   2. `tier !== 'basic'` → `TRIAL_TIER` é `basic`. A porta é SEMPRE Creator,
//      mesmo quando a escada do pós-vídeo elege Starter como plano primário.
//      Por isso ela não substitui o botão de plano: ela se soma a ele.
//   3. Sem moeda resolvida não há rótulo honesto. A taxa de entrada é 100
//      unidades MENORES da moeda de quem compra (`unit_amount` + `currency` no
//      `add_invoice_items`), não "um dólar convertido" — então o rótulo tem de
//      vir de `formatCheckoutMoney(currency, ...)`. Sem moeda, sem porta.
//      (memória: o preço literal digitado à mão quebra para os 12% da base que
//      não estão em dólar.)
//
// Este arquivo é PURO e SEM IMPORTS de propósito: o guardião o compila sozinho
// num diretório temporário (memória: guardioes-com-alias-nao-rodam). Todo
// rótulo de dinheiro entra pronto, formatado pela fonte canônica de preço.

export type CleanFilmTrialDoorInput = {
  /**
   * Dono do slot único da tela de filme pronto (`decidePostDeliverySlot`).
   * `null` é um estado real e frequente — significa que NENHUMA superfície
   * ganhou o slot. Aceitar `null` aqui é o que impede a porta de aparecer
   * sozinha, fora de qualquer caixa.
   */
  slotOwner: string | null
  /** `profiles.has_paid` — a MESMA coluna que o servidor consulta. */
  hasPaid: boolean
  /** Rótulo já formatado da taxa de entrada, ou null se a moeda não resolveu. */
  entryFeeLabel: string | null
  /** Rótulo já formatado da mensalidade do Creator depois do trial. */
  monthlyLabel: string | null
  /** O filme que está na mão da pessoa saiu com marca d'água? */
  unlocksCurrentFilm: boolean
  /** Créditos concedidos no ato pelo trial pago (`CARD_TRIAL_GRANT_CREDITS`). */
  grantCredits: number
  /** Dias do trial pago (`CARD_TRIAL_DAYS`). */
  trialDays: number
}

export type CleanFilmTrialDoorDecision = {
  visible: boolean
  /** Por que a porta não apareceu — auditável no evento de impressão. */
  reason: 'ok' | 'not_slot_owner' | 'already_paid' | 'price_unresolved'
  buttonLabel: string | null
  priceNote: string | null
}

/**
 * A porta de $1 aparece SOMENTE dentro da caixa comercial, para quem o cobrador
 * de fato aceitaria no trial, e só quando dá para dizer o preço sem mentir.
 */
export function decideCleanFilmTrialDoor(
  input: CleanFilmTrialDoorInput,
): CleanFilmTrialDoorDecision {
  const blocked = (reason: CleanFilmTrialDoorDecision['reason']): CleanFilmTrialDoorDecision => ({
    visible: false,
    reason,
    buttonLabel: null,
    priceNote: null,
  })

  // A porta é um degrau DENTRO da caixa comercial. Fora dela o slot pertence a
  // outra superfície, e empilhar ofertas nesse slot é o defeito que a rotação
  // anterior acabou de consertar.
  if (input.slotOwner !== 'commercial_ask') return blocked('not_slot_owner')

  // Trava 1 — o cobrador recusa `?trial=1` para quem já pagou alguma vez.
  if (input.hasPaid) return blocked('already_paid')

  // Trava 3 — sem os dois rótulos não existe promessa auditável.
  if (!input.entryFeeLabel || !input.monthlyLabel) return blocked('price_unresolved')

  // A manchete lidera com o que a pessoa já tem na mão quando o filme saiu
  // marcado; quando saiu limpo, o trial vale pelo que ele é. Em nenhum dos dois
  // casos a frase promete motor, fila ou qualidade que o produto não entrega.
  const buttonLabel = input.unlocksCurrentFilm
    ? `Get this film clean — ${input.trialDays} days of Creator for ${input.entryFeeLabel} →`
    : `Try Creator ${input.trialDays} days for ${input.entryFeeLabel} →`

  // A nota de preço diz as TRÊS coisas que decidem a compra e que o cliente
  // descobriria depois de qualquer jeito: o que sai hoje, o que sai no dia 8, e
  // que dá para cancelar. `cancel anytime` é o mesmo compromisso que /pricing já
  // imprime, e `trial_settings.missing_payment_method: 'cancel'` o sustenta.
  const priceNote =
    `${input.entryFeeLabel} today · ${input.grantCredits} credits now · ` +
    `then ${input.monthlyLabel}/month from day ${input.trialDays + 1} · cancel anytime`

  return { visible: true, reason: 'ok', buttonLabel, priceNote }
}
