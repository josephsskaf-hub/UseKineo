// KINEO-ANO-INVENTADO-0211 [TRAVA 8.2 — aval permanente do fundador 01/11 (laço do revisor)]
// Caso real (02/11/2026): a ideia "In today's world, understanding money is crucial…" (sem ano nenhum) virou o gancho
// "Want to master your money game in 2023?" — gravado no filme como título e legenda. O "agora" do treino do modelo vazava
// para o roteiro. Todo escritor que produz fala ou texto de tela recebe a data REAL (calculada no pedido) e esta regra.
// KINEO-ANO-INVENTADO-0211b — a 1ª versão proibia QUALQUER ano/data e batia de frente com o "names, numbers, dates" do
// próprio escritor (Hiroshima sem "August 6, 1945", Titanic sem "1912"). A regra agora só proíbe o ano ATUAL/recente
// inventado; data correta de fato histórico é permitida e incentivada.

/** A regra única, compartilhada por todos os escritores de fala/título. */
export const REGRA_ANO_INVENTADO =
  "Never state or imply the current or a recent year (no 'in 2023', 'this year', 'in 2024', 'nowadays in …') unless the user's own text names it — say 'today' or 'now' instead. Dates of real historical events are allowed and encouraged when they are correct."

/** O bloco que vai no system prompt: a data real de hoje (no momento do pedido) + a regra. `agora` injetável para teste. */
export function regraDaDataReal(agora: Date = new Date()): string {
  return `Today is ${agora.toISOString().slice(0, 10)}. ${REGRA_ANO_INVENTADO}`
}
