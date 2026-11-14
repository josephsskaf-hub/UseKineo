// ═══ KINEO-RECREATE-TETO-NAO-TROCOU-1411 [CEO 14/11, pedido 2] — teto de tentativas que NÃO trocam, antes de abrir aos clientes ═══════════
// Cada "não trocou" do Recreate "com o seu vídeo" custa à casa de US$ 0,94 a US$ 2,82 de fal (14/11 00:19: duas partes de 12 s = US$ 4,53) e o
// cliente recebe os créditos de volta: sem teto, alguém repete sem parar às nossas custas. Regra, por conta, numa janela corrida de 24 h:
//   · conta SEM plano: no máximo 2 resultados swap_unchanged; conta COM plano: 4. A tentativa seguinte é recusada ANTES de cobrar e antes da fal.
//   · conta da casa: fora do teto.
//   · contam swap_unchanged e swap_partial (decisão da CEO de 14/11: a parcial custa a mesma fal e estorna inteiro). Recusa do motor, vencimento,
//     falha de cópia, as falhas da fila e swap_uncertain não contam. Só clipes do "seu vídeo" (o vídeo em recreate-uploads/), nunca os do catálogo.
//   · um pedido aberto por conta (lib/recreate/portaDoSeuVideo): sem isso, com 1 "não trocou" a conta abria 3 de uma vez e todos passavam.
//   · a recusa orienta: foto de frente, nítida, uma pessoa só; vídeo mais curto. E diz quando volta (o resultado mais antigo sai da janela).
//   · leitura do banco que falha = segue (nunca tranca cliente por erro nosso).
// Módulo PURO: a rota (app/api/recreate/seu-video) lê as linhas e chama decidirTeto. Guardião: scripts/test-recreate-teto-nao-trocou-1411.mjs.
export const TETO_NAO_TROCOU = { semPlano: 2, comPlano: 4, janelaHoras: 24 } as const
export const TETO_MOTIVO = 'swap_unchanged' as const
/** KINEO-RECREATE-FILA-REVISAO-1411 [CEO 14/11: decisão dela] — swap_partial TAMBÉM conta: custa a mesma fal e estorna inteiro. */
export const TETO_MOTIVOS: readonly string[] = ['swap_unchanged', 'swap_partial']
export const TETO_CODIGO = 'swap_cap' as const
export const TETO_EVENTO = 'recreate_seu_video_swap_cap' as const

export interface ResultadoDoClipe { failure_reason: string | null; settled_at?: string | null; created_at?: string | null }
export type DecisaoDoTeto =
  | { ok: true; usados: number; limite: number | null }
  | { ok: false; usados: number; limite: number; retryAt: string; horas: number }

const quando = (r: ResultadoDoClipe): number => {
  const t = Date.parse(String(r.settled_at ?? r.created_at ?? ''))
  return Number.isFinite(t) ? t : NaN
}

/** O teto para ESTA tentativa. `resultados` = os clipes do "seu vídeo" da conta (qualquer motivo): só os TETO_MOTIVOS dentro de 24 h contam. */
export function decidirTeto(a: { casa: boolean; pagante: boolean; resultados: ReadonlyArray<ResultadoDoClipe>; agoraMs: number }): DecisaoDoTeto {
  if (a.casa) return { ok: true, usados: 0, limite: null }
  const janela = TETO_NAO_TROCOU.janelaHoras * 60 * 60 * 1000
  const naJanela = a.resultados
    .filter((r) => typeof r.failure_reason === 'string' && TETO_MOTIVOS.includes(r.failure_reason))
    .map(quando)
    .filter((t) => Number.isFinite(t) && t > a.agoraMs - janela && t <= a.agoraMs)
    .sort((x, y) => x - y)
  const limite = a.pagante ? TETO_NAO_TROCOU.comPlano : TETO_NAO_TROCOU.semPlano
  if (naJanela.length < limite) return { ok: true, usados: naJanela.length, limite }
  // Volta quando o resultado que ocupa a vaga mais antiga DENTRO do teto sair da janela.
  const libera = naJanela[naJanela.length - limite] + janela
  return { ok: false, usados: naJanela.length, limite, retryAt: new Date(libera).toISOString(), horas: Math.max(1, Math.ceil((libera - a.agoraMs) / (60 * 60 * 1000))) }
}

/** A frase da recusa (inglês, curta, orienta e diz que nada foi cobrado). */
export function fraseDoTeto(d: { usados: number; horas: number }): string {
  return `The person was not swapped in your last ${d.usados} tries, so new tries are paused for about ${d.horas} ${d.horas === 1 ? 'hour' : 'hours'}. For a better result, use a sharp, front-facing photo of one person and a shorter video. Nothing was charged.`
}
