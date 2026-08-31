// ═══ KINEO-FALHA-CONTADA-UMA-VEZ-2026-08-31 (sprint-v1v4 #12) ══════════════
//
// O DEFEITO, medido em produção agora (14 dias, só pessoas externas):
//
//   448 linhas de `generation_stage_error`  →  209 falhas de verdade.
//   174 das 209 tentativas (83%) gravaram EXATAMENTE 2 linhas: uma com a
//   causa e uma MUDA. 186 das 448 linhas (42%) não têm `reason` nenhum.
//
// Não é gravação repetida. São DOIS EMISSORES diferentes, cada um contando
// metade da história, e ninguém os apresentou um ao outro:
//
//   (A) `trackGenerationFailure(stage, reason, …)` dispara NO PONTO DA RECUSA.
//       Sabe o `reason` (narration_too_short, analyze_not_ok,
//       cinematic_gate_trial_stalled…), o http, o `error_source`. Não sabe
//       qual frase o cliente leu na tela.
//   (B) o efeito de transição de fase dispara quando `phase` vira `failed`
//       (ou volta a `idle` com erro). Sabe a FRASE que o cliente leu. Não
//       sabe o `reason` — nasce com `reason: null` e, quando o estado de erro
//       já foi limpo, com o literal `error: 'unknown'`.
//
// Os dois carregam o MESMO `attempt_id` desde sempre. Dava para parear. Só que
// nenhuma consulta pareia, porque o par não se anuncia — então:
//
//   · toda contagem de falha desta sprint está inflada ~2,1×;
//   · todo `group by reason` joga 42% das linhas no balde NULL;
//   · o vigia `falhas_1h` do /admin/health conta 3 linhas por falha (as duas
//     acima + `video_generation_failed`) e abre alarme com `causas > 2` —
//     ou seja, UMA falha sozinha já produz DUAS causas e quase dispara.
//
// A CURA é declarar o papel de cada linha, e nunca mais deixar a linha (B)
// nascer muda:
//
//   `failure_role='cause'`            → a linha que CONTA. Uma por falha.
//   `failure_role='stage_transition'` → o eco da tela. Existe para guardar a
//                                       frase lida pelo cliente; NUNCA conta.
//
// E a regra de ouro que fecha o buraco de verdade: quando a transição (B)
// acontece sem que ninguém tenha relatado a causa (A), ela NÃO vira eco —
// ela vira a `cause`, com `reason='unreported_stage_failure'`. Assim nenhuma
// falha some da contagem só porque o ramo que a produziu não sabe se explicar,
// e a lista viva desses ramos fica MENSURÁVEL por esse reason — exatamente o
// truque que o `error_source='synthesized'` da #5 usou e que funcionou.
//
// Nada aqui usa React, rede ou banco: é aritmética de rótulo, testável em
// `scripts/test-falha-contada-uma-vez-2026-08-31.mjs`.

/** Papel de uma linha de `generation_stage_error` na contagem de falhas. */
export type FailureRole = 'cause' | 'stage_transition'

/** A linha que conta. Uma por falha. */
export const FAILURE_ROLE_CAUSE: FailureRole = 'cause'

/** O eco da tela: guarda a frase lida pelo cliente e NUNCA entra na contagem. */
export const FAILURE_ROLE_TRANSITION: FailureRole = 'stage_transition'

/**
 * `reason` que a transição de fase assume quando ela é a ÚNICA testemunha da
 * falha. Não é enfeite: é a lista viva dos ramos que morrem sem se explicar.
 */
export const UNREPORTED_STAGE_FAILURE = 'unreported_stage_failure'

/**
 * O literal que o emissor (B) gravava quando o estado de erro já tinha sido
 * limpo. Visto em produção em 31/08 17:55:28Z. Não pode voltar ao banco.
 */
export const CAUSA_MUDA_LEGADA = 'unknown'

/**
 * Sintetiza uma causa a partir do que SEMPRE existe. Vinda do
 * KINEO-CAUSA-SEMPRE-2026-08-31 (#5), agora compartilhada pelos dois
 * emissores para que a frase tenha o mesmo formato nas duas pontas.
 */
export function sintetizarCausa(
  stage: string,
  reason: string,
  httpStatus: number | null,
): string {
  const partes = [
    `no_detail:${reason}`,
    `stage=${stage}`,
    `http=${typeof httpStatus === 'number' ? httpStatus : 'none'}`,
  ]
  return partes.join('|').slice(0, 180)
}

/** O que a transição de fase sabe quando vai gravar. */
export type EntradaTransicao = {
  /** Fase de destino: 'failed' ou 'idle'. */
  stage: string
  /** A tentativa que está morrendo. Null quando nem isso existe. */
  attemptId: string | null
  /**
   * O `reason` que o emissor (A) já relatou PARA ESTA MESMA tentativa.
   * Null = ninguém relatou; esta linha vira a testemunha única.
   */
  reasonJaRelatado: string | null
  /** A frase que o cliente leu na tela. Pode vir vazia/nula. */
  mensagemNaTela: string | null | undefined
}

/** O que a transição de fase deve gravar. */
export type SaidaTransicao = {
  failure_role: FailureRole
  reason: string
  error: string
  error_source: 'screen' | 'synthesized'
  /** True quando esta linha é eco de uma causa já contada. */
  duplicate_of_cause: boolean
}

/**
 * Rotula a linha da transição de fase.
 *
 * Duas decisões, e só duas:
 *  1. Se a causa já foi relatada para esta tentativa, esta linha é ECO
 *     (`stage_transition`) e herda o `reason` — para que um `group by reason`
 *     sobre as duas linhas dê a MESMA causa, não uma causa e um NULL.
 *  2. Se ninguém relatou (ou nem `attempt_id` existe, e aí não há como parear),
 *     esta linha é a CAUSA, com `reason='unreported_stage_failure'`.
 *
 * Em nenhum dos dois casos o `error` pode sair mudo: a frase da tela quando
 * existe, causa sintetizada quando não.
 */
export function rotularTransicao(entrada: EntradaTransicao): SaidaTransicao {
  const relatado =
    typeof entrada.reasonJaRelatado === 'string' && entrada.reasonJaRelatado.trim().length > 0
      ? entrada.reasonJaRelatado.trim()
      : null

  // Sem `attempt_id` não existe pareamento possível — 29 linhas de 14 dias
  // estão nesse estado. Tratar como eco esconderia a falha inteira.
  const podeParear = typeof entrada.attemptId === 'string' && entrada.attemptId.trim().length > 0
  const ehEco = podeParear && relatado !== null

  const reason = ehEco ? (relatado as string) : UNREPORTED_STAGE_FAILURE

  const naTela =
    typeof entrada.mensagemNaTela === 'string' ? entrada.mensagemNaTela.trim() : ''
  const temFrase = naTela.length > 0 && naTela !== CAUSA_MUDA_LEGADA

  return {
    failure_role: ehEco ? FAILURE_ROLE_TRANSITION : FAILURE_ROLE_CAUSE,
    reason,
    error: temFrase
      ? naTela.slice(0, 180)
      : sintetizarCausa(entrada.stage, reason, null),
    error_source: temFrase ? 'screen' : 'synthesized',
    duplicate_of_cause: ehEco,
  }
}

/**
 * A REGRA DE CONTAGEM, em um lugar só, para que painel, vigia e consulta usem
 * a mesma. Uma linha conta quando:
 *   · `failure_role='cause'`  (mundo novo), ou
 *   · não tem `failure_role` NENHUM e tem `reason`  (linhas antigas, de antes
 *     desta rodada: lá, a linha com `reason` sempre foi a do emissor (A)).
 *
 * O que NUNCA conta: `failure_role='stage_transition'`, e a linha antiga sem
 * `reason` — que é exatamente a metade muda do par.
 */
export function contaComoFalha(metadata: Record<string, unknown> | null | undefined): boolean {
  const m = metadata ?? {}
  const papel = typeof m.failure_role === 'string' ? m.failure_role : null
  if (papel === FAILURE_ROLE_CAUSE) return true
  if (papel === FAILURE_ROLE_TRANSITION) return false
  const reason = typeof m.reason === 'string' ? m.reason.trim() : ''
  return reason.length > 0
}
