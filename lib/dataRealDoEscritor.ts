// KINEO-ANO-INVENTADO-0211 [TRAVA 8.2 — aval permanente do fundador 01/11 (laço do revisor)]
// Caso real (02/11/2026): a ideia "In today's world, understanding money is crucial…" (sem ano nenhum) virou o gancho
// "Want to master your money game in 2023?" — gravado no filme como título e legenda. O "agora" do treino do modelo vazava
// para o roteiro. Todo escritor que produz fala ou texto de tela recebe a data REAL (calculada no pedido) e esta regra.

/** A regra única, compartilhada por todos os escritores de fala/título. */
export const REGRA_ANO_INVENTADO =
  "Never mention a specific year, date or 'this year' unless the user's own text contains it; if the user's text names a year, keep it exactly."

/** O bloco que vai no system prompt: a data real de hoje (no momento do pedido) + a regra. `agora` injetável para teste. */
export function regraDaDataReal(agora: Date = new Date()): string {
  return `TODAY'S REAL DATE: ${agora.toISOString().slice(0, 10)}. ${REGRA_ANO_INVENTADO}`
}
