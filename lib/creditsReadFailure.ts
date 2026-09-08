// KINEO-TELA-QUE-NAO-MENTE-2026-09-08 (madrugada-produto M10)
//
// O DEFEITO. Em 28/08 o PostgREST do Supabase recusou todo token fresco
// (PGRST303, relógio adiantado). A leitura do saldo falhou — e as telas
// mostraram o resultado como se fosse um FATO: "0 credits". O próprio
// fundador abriu o app e viu 0 créditos com 1.489 no banco, e três cadastros
// vindos do ChatGPT bateram 24 vezes em erro e desistiram. O incidente foi
// curado por infra, mas a MENTIRA continuou no código: nenhuma das superfícies
// distingue "seu saldo é zero" de "não consegui ler seu saldo".
//
// POR QUE PIOROU EM 08/09. Com a versão B (`lib/entryPolicy.ts`,
// CARD_ENTRY_ONLY), conta nova nasce legitimamente com 0 créditos e o produto
// reage a isso: banner de porta de $1, ponte de saldo baixo, chip vermelho
// apontando para a loja. Um zero falso agora não é só um número errado — é o
// produto tratando um cliente pagante como quem precisa passar o cartão.
//
// A DEFESA, EM UM LUGAR SÓ. A rota `/api/credits` passa a MARCAR a falha de
// leitura (`readFailed: true`) em vez de mandar `credits: 0` junto com o erro,
// e as três superfícies que leem essa rota decidem pelo MESMO predicado —
// importado daqui, não recopiado. Regra que veio de errar antes: consertar uma
// cópia deixa as outras mentindo.
//
// LIMITE DELIBERADO: 401 (visitante deslogado) e 200 com `migrationNeeded` /
// perfil ausente NÃO são falha de leitura. São respostas honestas do servidor,
// e continuam tratadas como antes.

/** Nome do campo que a rota usa para admitir que não conseguiu ler. */
export const CREDITS_READ_FAILED_FIELD = 'readFailed'

/** Evento emitido quando uma tela RENDERIZA o estado de leitura falhada. */
export const READ_FAILED_EVENT = 'read_failed_shown'

/** Texto único mostrado no lugar do saldo. Nunca um número. */
export const READ_FAILED_LABEL = 'Balance unavailable'

/** Explicação curta (tooltip / segunda linha). Diz o que fazer. */
export const READ_FAILED_HINT = 'Unstable right now — retry'

/**
 * A resposta de `/api/credits` é uma FALHA DE LEITURA?
 *
 * Verdadeiro quando o HTTP não foi ok (5xx/503 do erro desconhecido) ou quando
 * o corpo carrega a marca explícita. Falso para 401 — o chamador trata o
 * visitante deslogado antes de chegar aqui.
 */
export function isCreditsReadFailure(
  status: number,
  body: unknown,
): boolean {
  if (status === 401) return false
  if (status < 200 || status >= 300) return true
  if (body && typeof body === 'object') {
    const marked = (body as Record<string, unknown>)[CREDITS_READ_FAILED_FIELD]
    if (marked === true) return true
  }
  return false
}
