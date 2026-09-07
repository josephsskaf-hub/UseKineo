/**
 * KINEO-SILENCIO-POS-ENTREGA-2026-09-07 — o instrumento que faltava.
 *
 * MEDIDO (12 dias, contando PESSOAS): 220 pessoas concluiram a PRIMEIRA
 * entrega. Plan Fit, que reserva o slot unico dessa tela para essa coorte
 * exata, somou 30 impressoes. E 89 dessas 220 — 61 delas com
 * `video_ready_viewed` confirmado — nao viram NENHUMA oferta: nem a pergunta
 * do trial, nem o bridge, nem o episodio 2, nem Plan Fit, nem a caixa
 * generica.
 *
 * O produto nao tinha como saber disso. Toda superficie emite `*_viewed`
 * quando aparece; NENHUMA emite nada quando o slot fica reservado e nada
 * renderiza. Ausencia de evento e indistinguivel de ausencia de gente, e foi
 * por isso que o buraco viveu 12 dias.
 *
 * Esta funcao e pura: nao concede, nao gasta, nao renderiza e nao decide o que
 * aparece. Ela apenas NOMEIA o que esta acontecendo na tela de filme pronto,
 * para que o silencio tenha denominador.
 */

export interface PostDeliveryOfferAuditInput {
  /** A entrega terminou e existe filme na tela. Fora disso nao ha slot. */
  delivered: boolean
  /** A pergunta comercial do trial (a de maior conversao medida: 17%). */
  askShown: boolean
  /** Plan Fit — primeira entrega. */
  planFitShown: boolean
  /** O proximo passo gratis (Seedance) que o saldo do trial ja cobre. */
  bridgeShown: boolean
  /** O episodio 2 antes da assinatura. */
  repeatShown: boolean
  /** A caixa generica de export limpo (conta free, sem trial). */
  exportChoiceShown: boolean
  /** Plan Fit tomou o slot recorrente. */
  planFitOwnsSlot: boolean
  /** O lookup de primeira entrega ainda nao deu resposta definitiva. */
  lookupPending: boolean
  /** A fase do trial na entrega, se houver. */
  trialPhase: 'active' | 'ending' | null
}

export type PostDeliverySilenceReason =
  | 'plan_fit_reserved_pending_lookup'
  | 'plan_fit_reserved_eligible'
  | 'no_trial_phase'
  | 'unknown'

export interface PostDeliveryOfferAuditResult {
  /** true = a tela de maior intencao de compra da casa nao pediu NADA. */
  silent: boolean
  /** Qual guarda respondeu pelo silencio. */
  reason: PostDeliverySilenceReason | null
}

/**
 * Um slot, cinco superficies possiveis. Se a entrega aconteceu e nenhuma delas
 * apareceu, o silencio recebe nome — na ordem em que as guardas de fato correm,
 * para que o motivo aponte a guarda que decidiu, nunca a que veio depois.
 */
export function auditPostDeliveryOffer(
  input: PostDeliveryOfferAuditInput,
): PostDeliveryOfferAuditResult {
  if (!input.delivered) return { silent: false, reason: null }

  const anyShown =
    input.askShown ||
    input.planFitShown ||
    input.bridgeShown ||
    input.repeatShown ||
    input.exportChoiceShown
  if (anyShown) return { silent: false, reason: null }

  // A ordem importa: `planFitOwnsSlot` e a guarda que apaga a pergunta, e ela
  // tem DOIS motivos distintos com consertos distintos — um e um lookup que
  // nunca respondeu (defeito), o outro e a precedencia de primeira entrega
  // (decisao de produto). Colapsar os dois num motivo so devolveria um numero
  // que nao diz o que fazer.
  if (input.planFitOwnsSlot) {
    return {
      silent: true,
      reason: input.lookupPending
        ? 'plan_fit_reserved_pending_lookup'
        : 'plan_fit_reserved_eligible',
    }
  }
  if (input.trialPhase === null) return { silent: true, reason: 'no_trial_phase' }
  return { silent: true, reason: 'unknown' }
}
