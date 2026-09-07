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

/**
 * As ÚNICAS caixas que podem hospedar a porta. Lista fechada de propósito: a
 * ordem do fundador de 07/09 16:40 põe o trial de $1 como primeira opção
 * "onde houver preço na tela", e a caixa de export limpo é nomeada por ele —
 * mas "onde houver preço" não é licença para pendurar a porta em superfície
 * que não vende nada.
 */
export const HOST_BOXES = ['commercial_ask', 'clean_export'] as const

export type CleanFilmTrialDoorInput = {
  /**
   * A caixa que hospeda a porta. `null` é um estado real e frequente —
   * significa que NENHUMA caixa está na tela. Aceitar `null` aqui é o que
   * impede a porta de aparecer sozinha, fora de qualquer caixa.
   *
   * Dois valores são aceitos hoje, e os dois são CAIXAS QUE JÁ PEDEM DINHEIRO
   * PARA O MESMO FILME — a porta nunca cria caixa, só entra na frente da
   * pergunta que já estava lá:
   *   · `commercial_ask` — o slot único da tela de filme pronto
   *     (`decidePostDeliverySlot`), quem está EM trial.
   *   · `clean_export`  — a caixa "Want it clean?" (`showPostVideoExportChoice`),
   *     que exige `currentResultHasWatermark` e existe para quem NÃO está em
   *     trial. As duas condições são mutuamente exclusivas por construção
   *     (`showPostVideoExportChoice` exige `trialPostVideoPhase === null`),
   *     então a porta nunca aparece duas vezes na mesma tela.
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

// ═══════════════════════════════════════════════════════════════════════════
// KINEO-PORTA-1DOLAR-NO-FIM-DO-TRIAL-2026-09-07 (fv-r9) — O NÚCLEO PASSA A SER
// COMPARTILHADO, PORQUE A CASA GANHOU UMA SEGUNDA SUPERFÍCIE PARA A MESMA PORTA
// ═══════════════════════════════════════════════════════════════════════════
// O QUE ESTAVA ERRADO, MEDIDO (eventos, contas externas, 30 dias):
//   · `trial_downgrade_modal_shown` = 81 impressões / 75 pessoas; 23 pessoas em
//     7 dias; a última hoje (07/09 16:18 UTC). É o modal que abre no instante
//     em que o trial morre.
//   · `trial_downgrade_modal_cta` = 18 cliques / 15 pessoas em 30d (~22% de
//     CTR) — a superfície que PEDE DINHEIRO mais clicada da casa, muito acima
//     da caixa do pós-vídeo (cujo último clique é de 22/08).
//   · E o botão levava a `?tier=basic&intro=1`: Creator CHEIO. Desde hoje
//     15:43 a oferta padrão da casa é o trial de $1 (`CARD_TRIAL_ENABLED` =
//     true), e a carta `downgraded_loss` — o e-mail do MESMO instante — já
//     leva à porta de $1 (va-r6, `e8b401c4`). Tela e e-mail do mesmo momento
//     ofereciam preços diferentes.
//
// POR QUE O COMENTÁRIO DO MODAL DEIXOU DE VALER: ele dizia que `intro=1` "é o
// mesmo link de TODAS as outras superfícies de Creator do app, e omiti-lo faria
// esta tela ser a única a cobrar mais caro". Era verdade quando foi escrito e
// virou falso hoje — `/pricing` e `components/PricingCards.tsx` passaram a
// levar `trial=1`. A própria lógica do comentário agora pede a mudança.
//
// POR QUE UM NÚCLEO COMPARTILHADO E NÃO UMA CÓPIA: a regra de honestidade desta
// porta (quem o cobrador aceita, e quando dá para dizer o preço) já mora aqui.
// Recopiá-la no modal criaria a bomba-relógio que a fv-r7 acabou de desarmar —
// superfície escolhida por uma decisão central e pintada por uma cópia local da
// mesma regra (memória `superficie-medida-por-copia-da-regra`).
// `decideCleanFilmTrialDoor` continua sendo a ÚNICA porta do pós-vídeo e agora
// delega o miolo; para o chamador dela nada muda, byte a byte.

export type TrialDoorOfferInput = {
  /** `profiles.has_paid` — a MESMA coluna que o servidor consulta. */
  hasPaid: boolean
  /** Rótulo já formatado da taxa de entrada, ou null se a moeda não resolveu. */
  entryFeeLabel: string | null
  /** Rótulo já formatado da mensalidade do Creator depois do trial. */
  monthlyLabel: string | null
  /** Créditos concedidos no ato pelo trial pago (`CARD_TRIAL_GRANT_CREDITS`). */
  grantCredits: number
  /** Dias do trial pago (`CARD_TRIAL_DAYS`). */
  trialDays: number
  /**
   * Existe um filme marcado na mão da pessoa AGORA? Só a tela de filme pronto
   * pode dizer que sim; no fim do trial não há arquivo em foco, então a
   * manchete não pode prometer "este filme limpo".
   */
  unlocksCurrentFilm: boolean
}

export type TrialDoorOfferDecision = {
  visible: boolean
  reason: 'ok' | 'already_paid' | 'price_unresolved'
  buttonLabel: string | null
  priceNote: string | null
}

/**
 * As DUAS travas de honestidade que valem em QUALQUER superfície, e a copy de
 * dinheiro. A trava de slot é exclusiva do pós-vídeo e mora no chamador.
 */
export function decideTrialDoorOffer(input: TrialDoorOfferInput): TrialDoorOfferDecision {
  // Trava 1 — o cobrador recusa `?trial=1` para quem já pagou alguma vez
  // (`card_trial_denied: 'has_paid'`). Anunciar a taxa de entrada a quem será
  // cobrado a mensalidade cheia é uma mentira medível (memória
  // `vitrine-oferece-o-que-o-cobrador-recusa`).
  if (input.hasPaid) {
    return { visible: false, reason: 'already_paid', buttonLabel: null, priceNote: null }
  }

  // Trava 2 — sem os dois rótulos não existe promessa auditável. Dinheiro nunca
  // é digitado à mão aqui: os rótulos chegam prontos de `formatCheckoutMoney`.
  if (!input.entryFeeLabel || !input.monthlyLabel) {
    return { visible: false, reason: 'price_unresolved', buttonLabel: null, priceNote: null }
  }

  const buttonLabel = input.unlocksCurrentFilm
    ? `Get this film clean — ${input.trialDays} days of Creator for ${input.entryFeeLabel} →`
    : `Try Creator ${input.trialDays} days for ${input.entryFeeLabel} →`

  const priceNote =
    `${input.entryFeeLabel} today · ${input.grantCredits} credits now · ` +
    `then ${input.monthlyLabel}/month from day ${input.trialDays + 1} · cancel anytime`

  return { visible: true, reason: 'ok', buttonLabel, priceNote }
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

  // A porta é um degrau DENTRO de uma caixa que já pede dinheiro. Fora delas o
  // espaço pertence a outra superfície, e empilhar ofertas ali é o defeito que
  // a rotação do slot acabou de consertar.
  if (!HOST_BOXES.includes(input.slotOwner as (typeof HOST_BOXES)[number])) {
    return blocked('not_slot_owner')
  }

  // Travas 1 e 3 + a copy de dinheiro vivem no núcleo compartilhado. A manchete
  // e a nota de preço saem byte a byte iguais às que esta função devolvia antes
  // da extração — é isso que o guardião desta porta continua provando (memória
  // `campo-validado-gravado-ecoado-nao-e-honrado`: importar a fonte única em
  // vez de consertar a cópia).
  const core = decideTrialDoorOffer({
    hasPaid: input.hasPaid,
    entryFeeLabel: input.entryFeeLabel,
    monthlyLabel: input.monthlyLabel,
    grantCredits: input.grantCredits,
    trialDays: input.trialDays,
    unlocksCurrentFilm: input.unlocksCurrentFilm,
  })
  if (!core.visible) return blocked(core.reason)

  return { visible: true, reason: 'ok', buttonLabel: core.buttonLabel, priceNote: core.priceNote }
}
