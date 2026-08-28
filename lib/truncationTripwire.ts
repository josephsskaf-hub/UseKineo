// KINEO-TRIPWIRE-1000-2026-08-28 — a trava que faltava contra o teto invisível.
//
// O PostgREST deste projeto corta TODA resposta em 1.000 linhas e não devolve
// erro (`db.max_rows = 1000`). Esse corte silencioso já produziu, medidos:
//   · o painel /admin mostrando 435 visitantes nas janelas de 7d E de 24h
//     (as duas liam as MESMAS 1000 linhas; o real era 1.820/574);
//   · o REENVIO 8× de 21/08 — 29 pessoas receberam a mesma campanha até oito
//     vezes porque a leitura do carimbo "já enviei" veio truncada e o dedupe
//     enxergou só parte dos enviados (KINEO-REENVIO-8X-2026-08-21).
//
// Este helper existe para UMA classe de leitura: a TRAVA DE DEDUPE das
// campanhas de e-mail. Nessa classe, resposta truncada não é imprecisão — é
// cliente real recebendo spam da própria casa. A política é fail-closed:
// bater no teto ABORTA a campanha inteira. Campanha que não sai hoje é um
// atraso; campanha duplicada é um cliente queimado e um domínio na lista de
// spam. A auditoria de 28/08 encontrou 7 campanhas com essa bomba armada,
// duas delas (send-oneoff-unlock, send-first50-quentes) plantadas por
// CORREÇÕES do reenvio 8× — o conserto de um bug carregou o próximo.
//
// Não usar para leituras analíticas (lá o certo é fetchAllRows/count exact);
// aqui o contrato é: ou a lista de "já recebeu" está COMPLETA, ou ninguém
// recebe nada.

export class DedupeTruncatedError extends Error {
  constructor(label: string, rows: number) {
    super(
      `[tripwire-1000] ${label}: a leitura da trava de dedupe voltou com ${rows} linhas — ` +
      `bateu no teto de 1000 do PostgREST e está INCOMPLETA. Campanha abortada para não ` +
      `reenviar a quem já recebeu (o mecanismo exato do reenvio 8× de 21/08). ` +
      `Conserto: paginar este carimbo com fetchAllRows ou mover o dedupe para o banco.`,
    )
    this.name = 'DedupeTruncatedError'
  }
}

/**
 * Passa o resultado adiante quando está comprovadamente completo; ABORTA a
 * campanha quando a resposta encostou no teto de 1000 do PostgREST.
 * `limit` é o teto EFETIVO da query (min(limit pedido, 1000)): encostar nele
 * significa "pode haver mais linhas que não vieram".
 */
export function dedupeTripwire<T>(rows: T[] | null | undefined, label: string, limit = 1000): T[] {
  const list = rows ?? []
  const effective = Math.min(limit, 1000)
  if (list.length >= effective) throw new DedupeTruncatedError(label, list.length)
  return list
}
