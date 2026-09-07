// ═══════════════════════════════════════════════════════════════════════════
// KINEO-D0-ALCANCE-2026-09-07 — A PRIMEIRA CARTA DA CASA PROMETIA O ÚNICO
// MOTOR QUE O SALDO DELA NÃO ALCANÇA
// ═══════════════════════════════════════════════════════════════════════════
//
// O `d0_welcome` é a MAIOR superfície da casa: 720 envios para 719 pessoas em
// 60 dias (184 em 7 dias), e é a PRIMEIRA coisa que uma conta nova lê. Ele
// chega ≥4h depois do cadastro (D0_MIN_AGE_MS) — ou seja, dentro da janela em
// que a casa realmente vende (dez dos doze pagantes de 90 dias pagaram em
// menos de 48h; oito deles pagaram em menos de 4,2h, ou seja ANTES desta
// carta poder sair).
//
// A frase que ele mandava era:
//
//     "EVERY engine is unlocked, Kling 3 included."
//
// A ARITMÉTICA, lida das constantes e não de um documento:
//
//     TRIAL_CREDIT_CAP ............................  25   (lib/reverseTrial)
//     creditCostFor('cinematic_hollywood')  Kling 3  150  (lib/credits/engineCost)
//     creditCostFor('cinematic_ai')      Seedance 1.5 25  (idem)
//     CARD_TRIAL_GRANT_CREDITS (trial de $1) .....   80   (lib/checkoutPricing)
//     TIER_CREDITS.basic  (Creator) ..............   90   (idem)
//     TIER_CREDITS.pro    (Studio) ...............  180   (idem)
//
// Kling 3 custa SEIS VEZES o trial inteiro. Não cabe nos 25 do trial, não cabe
// nos 80 do trial de $1, e não cabe nos 90 do Creator: o único degrau em que um
// filme Kling 3 cabe é o Studio (180) — e o próprio comentário de TIER_CREDITS
// diz isso com todas as letras ("180 mantém verdadeira a promessa... um filme
// Kling 3 (150cr) por mês com folga").
//
// O comentário KINEO-D0-EMAIL-REVIEW-2026-08-07 que fica logo acima do ramo
// AFIRMA ter corrigido exatamente esta frase ("a frase passa a ser 'every
// engine except Studio'"). A string nunca mudou. Um comentário de conserto não
// é o conserto — é por isso que esta linha agora nasce de uma FUNÇÃO que lê a
// tabela do cobrador, e de um guardião que refaz a divisão.
//
// O QUE ESTA FUNÇÃO NÃO FAZ, DE PROPÓSITO: ela não encolhe a oferta pública.
// "every engine is unlocked" é a copy aprovada do fundador (ON_COPY em
// lib/freeTierOffer.ts) e continua inteira na carta. O que sai é o NOME do
// motor que o saldo não alcança; o que entra é o motor que ele alcança, com a
// conta feita. Encolher a promessa pública é decisão de preço, e preço é dele.
//
// ⚠️ A MESMA PROMESSA VIVE EM lib/freeTierOffer.ts (ON_COPY: `headline`,
// `sentence`, `planCardBody` — as três dizem "including Kling 3" / "Kling 3
// included" com o mesmo saldo de 25). Aquelas quatro strings são VITRINE
// PÚBLICA e não foram tocadas aqui de propósito. Ver o diário desta rotação.

import { creditCostFor } from '@/lib/credits/engineCost'

/**
 * O motor que o saldo do trial ALCANÇA — e o nome público dele.
 * `cinematic_ai` custa exatamente TRIAL_CREDIT_CAP: o comentário
 * KINEO-V6.1-2026-08-25 em engineCost.ts diz que isso é desenho, não acaso
 * ("o trial de 25cr segue comprando EXATAMENTE 1 Seedance").
 */
export const TRIAL_REACH_QUALITY = 'cinematic_ai' as const
export const TRIAL_REACH_ENGINE_NAME = 'Seedance 1.5'

/** O motor que ele NÃO alcança, e que a carta nomeava. Existe para o guardião. */
export const TRIAL_OUT_OF_REACH_QUALITY = 'cinematic_hollywood' as const
export const TRIAL_OUT_OF_REACH_ENGINE_NAME = 'Kling 3'

/**
 * Quantos filmes do motor alcançável o saldo cobre. Zero é resposta legítima
 * (saldo abaixo do custo de um render) e o chamador PRECISA tratá-la — é por
 * isso que a função devolve o número e não a frase pronta.
 *
 * `creditCostFor` recebe `isPaidUser`; para `cinematic_ai` os dois ramos
 * devolvem o mesmo número, e o guardião prova que continuam iguais — se um dia
 * divergirem, quem manda é o ramo do trial (`treatAsPaid === true`).
 */
export function trialFilmsWithinReach(creditsLeft: number): number {
  const cost = creditCostFor(TRIAL_REACH_QUALITY, true)
  if (!Number.isFinite(creditsLeft) || !Number.isFinite(cost) || cost <= 0) return 0
  if (creditsLeft < cost) return 0
  return Math.floor(creditsLeft / cost)
}

/**
 * A cláusula do meio da primeira carta. Devolve `null` quando o saldo não
 * cobre um render — aí o chamador usa a frase sem a conta, em vez de publicar
 * "enough for 0 films".
 *
 * O PLURAL É DERIVADO DO NÚMERO, na mesma expressão que o número (lição de
 * KINEO-TRIAL-25-2026-08-21 em lib/freeTierOffer.ts: com o grant em 80 a frase
 * dizia "4 films" e o plural era verdade por acidente; com 25 a MESMA frase
 * publicaria "1 films" na primeira linha que um estrangeiro lê do produto).
 */
export function trialReachClause(creditsLeft: number): string | null {
  const films = trialFilmsWithinReach(creditsLeft)
  if (films < 1) return null
  const noun = films === 1 ? 'film' : 'films'
  const counted = films === 1 ? 'one full' : `${films} full`
  return `every engine is unlocked, and that covers ${counted} ${TRIAL_REACH_ENGINE_NAME} ${noun} start to finish`
}
