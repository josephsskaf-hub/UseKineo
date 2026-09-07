/**
 * KINEO-SLOT-PEDE-DINHEIRO-2026-09-07 — quem ganha o slot unico da tela de
 * filme pronto quando existe algo concreto para vender.
 *
 * O QUE ESTAVA ERRADO (medido hoje, contando PESSOAS):
 *   · 17-23/08 a pergunta comercial aparecia para ~90% de quem terminava um
 *     filme (34 de 35 em 19/08). Em 02-07/09 ela aparece para ~1 pessoa por
 *     dia enquanto 13 a 31 pessoas por dia terminam um filme.
 *   · A tela nao quebrou: o slot foi ocupado por superficies GRATIS nascidas
 *     entre 27/08 e 06/09 (Plan Fit 27/08, bridge de saldo 30/08, episodio 2
 *     30/08, next action 06/09). Todas dizem "faca outro video". Nenhuma
 *     pede dinheiro.
 *   · Conversao medida em 60 dias: a pergunta comercial 22 cliques em 241
 *     impressoes (9,1%); o bridge de saldo 5 em 88 (5,7%). A pergunta e a
 *     unica das duas que termina em checkout.
 *
 * A REGRA, e por que ela e nova a partir de hoje: desde
 * KINEO-TRIAL-WATERMARK-2026-09-07 o filme de uma conta em trial sai COM
 * marca d'agua. Pela primeira vez existe, no instante da entrega, uma coisa
 * concreta que a pessoa quer e que so o dinheiro resolve: ESTE filme, limpo.
 * Quando essa coisa existe, a pergunta comercial ganha o slot. Quando o filme
 * ja saiu limpo, nao ha o que vender ali e a ordem antiga fica intacta.
 *
 * K1 — quem quer o gratis leva o gratis: esta decisao NAO esconde o download.
 * O filme com marca d'agua continua baixavel primeiro e de graca; o que muda
 * e apenas qual CAIXA ocupa o slot logo abaixo dele.
 *
 * Esta funcao e pura: nao concede, nao gasta, nao reserva, nao renderiza e
 * nao inicia render.
 */

export type PostDeliverySlotOwner =
  | 'commercial_ask'
  | 'balance_bridge'
  | 'repeat_episode'
  | null

export interface PostDeliverySlotInput {
  /**
   * A caixa do trial pode aparecer: fase de trial != null e Plan Fit nao
   * reservou o slot. Fora disso nao ha slot para distribuir.
   */
  askEligible: boolean
  /**
   * O filme ENTREGUE carrega marca d'agua — ou seja, existe export limpo para
   * vender neste exato instante. Vem da verdade do servidor (`watermark` na
   * resposta do compose), nunca de um predicado remontado no navegador.
   */
  deliveredFilmWatermarked: boolean
  /** O saldo do trial ja cobre um proximo filme mais forte (Seedance). */
  bridgeEligible: boolean
  /** O episodio 2 antes da assinatura. */
  repeatEligible: boolean
}

/**
 * Um slot, tres superficies. A ordem antiga era bridge -> episodio ->
 * pergunta, e a pergunta so sobrava quando as duas gratis desistiam. A unica
 * mudanca: quando ha filme marcado na mao, a pergunta vem primeiro.
 */
export function decidePostDeliverySlot(
  input: PostDeliverySlotInput,
): PostDeliverySlotOwner {
  if (!input.askEligible) return null

  // A VIRADA. Ler `deliveredFilmWatermarked` antes das duas gratis e o unico
  // comportamento que este modulo muda em relacao a tela de ontem.
  if (input.deliveredFilmWatermarked) return 'commercial_ask'

  if (input.bridgeEligible) return 'balance_bridge'
  if (input.repeatEligible) return 'repeat_episode'
  return 'commercial_ask'
}
