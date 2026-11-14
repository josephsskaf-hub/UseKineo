// ═══ KINEO-RECREATE-FILA-REVISAO-1411 [revisor independente + CEO 14/11, itens 5, 6, 8 e 9] — a PORTA do Recreate "com o seu vídeo" ═══════
// Tudo o que recusa um pedido ANTES de cobrar, numa regra só (a rota app/api/recreate/seu-video/route.ts só lê o banco e aplica):
//   · REPLAY (item 8): o pedido com a mesma Idempotency-Key que já existe NÃO passa pela porta — ele volta como replay. Antes, depois de
//     cobrado e na fila, o replay recebia 429 "Nothing was charged", que era falso.
//   · UM POR VEZ (itens 6 e 9): um pedido aberto do "seu vídeo" por conta. Sem isso, com 1 "não trocou" a conta abria 3 de uma vez e todos
//     passavam pelo teto; e uma conta sozinha ocupava a fila inteira.
//   · TETO de tentativas que não trocam (lib/recreate/tetoNaoTrocou).
//   · FILA CHEIA (lib/recreate/filaKlingEdit).
//   · CASA (item 5): a lista EXATA de contas da casa (releaseVisible(email, 'internal') = INTERNAL_EXACT_EMAILS). Os padrões largos de métrica
//     (test…@, …mailinator…, joseph+…@ em qualquer domínio) NÃO são lista de autorização: quem se cadastra assim é cliente, com teto.
//     A casa fica fora do "um por vez" e do teto, mas ENTRA na fila e na fila cheia.
// A porta não é atômica (vários POST juntos leem o mesmo banco): por isso existe a RECONFERÊNCIA depois de entrar (depoisDeEntrar).
// Módulo puro. Guardião: scripts/test-recreate-fila-revisao-1411.mjs.
import { decidirTeto, fraseDoTeto, TETO_CODIGO, type ResultadoDoClipe } from './tetoNaoTrocou'
import { alemDoLimite, filaCheia, FILA_MOTIVOS, FRASE_FILA_CHEIA, FRASE_UM_POR_VEZ } from './filaKlingEdit'

export const PORTA_UM_POR_VEZ = 'already_in_progress' as const
export const PORTA_LEITURA_FALHOU_EVENTO = 'recreate_seu_video_gate_unavailable' as const

export interface RecusaDaPorta { code: string; status: number; error: string; extra: Record<string, unknown> }
export interface EstadoDaPorta {
  /** Já existe um clipe desta conta com esta Idempotency-Key. */
  replay: boolean
  /** A conta está na lista EXATA da casa. */
  casa: boolean
  pagante: boolean
  /** Pedidos do "seu vídeo" ainda abertos da conta; null = a leitura falhou. */
  abertos: number | null
  /** Resultados "não trocou" da conta; null = a leitura falhou. */
  resultados: ReadonlyArray<ResultadoDoClipe> | null
  /** null = motor sem fila ou leitura que falhou. */
  fila: { naFila: number; vagaOcupada: boolean } | null
  agoraMs: number
}

/** A recusa da porta, ou null = pode seguir para a cobrança. Leitura que falhou não tranca ninguém (leiturasQueFalharam diz qual, para o evento). */
export function decidirPorta(e: EstadoDaPorta): RecusaDaPorta | null {
  if (e.replay) return null
  if (!e.casa && (e.abertos ?? 0) >= 1) return { code: PORTA_UM_POR_VEZ, status: 429, error: FRASE_UM_POR_VEZ, extra: { open: e.abertos, charged: false } }
  const teto = decidirTeto({ casa: e.casa, pagante: e.pagante, resultados: e.resultados ?? [], agoraMs: e.agoraMs })
  if (!teto.ok) return { code: TETO_CODIGO, status: 429, error: fraseDoTeto(teto), extra: { limit: teto.limite, used: teto.usados, retry_at: teto.retryAt, charged: false } }
  if (e.fila && filaCheia(e.fila.naFila, e.fila.vagaOcupada)) return { code: FILA_MOTIVOS.cheia, status: 429, error: FRASE_FILA_CHEIA, extra: { charged: false, retry_after_seconds: 180 } }
  return null
}

/** As leituras que falharam e desligariam uma regra em silêncio (item 6): viram evento de servidor. A casa não lê abertos nem resultados. */
export function leiturasQueFalharam(e: Pick<EstadoDaPorta, 'casa' | 'abertos' | 'resultados'> & { filaEsperada: boolean; fila: EstadoDaPorta['fila'] }): string[] {
  const out: string[] = []
  if (!e.casa && e.abertos === null) out.push('open_requests')
  if (!e.casa && e.resultados === null) out.push('swap_cap')
  if (e.filaEsperada && e.fila === null) out.push('queue')
  return out
}

/** Um pedido aberto da conta: o id e se ele ainda está NA FILA (nada enviado) — o que não está na fila já vai, ou já foi, ao fornecedor. */
export interface AbertoDaConta { id: string; naFila: boolean }
/**
 * Depois de ENTRAR na fila (cobrado, nada enviado): a reconferência. 'sair' = este pedido deve sair com estorno — a conta tem outro pedido
 * aberto que já vai ao fornecedor, ou outro mais antigo na fila (vários POST juntos passaram pela porta), ou ele ficou além do limite da fila.
 * A casa só sai pelo limite da fila.
 */
// KINEO-RECREATE-FILA-REVISAO-3-1411 [revisor 3ª rodada, X1] — dois POST juntos: o MAIS NOVO pegou a vaga e foi direto à fal, o mais antigo ficou na
// fila e era o 1º da lista: ficava, e a conta tinha 2 abertos. Regra nova: sai quem está na fila e não é o único aberto — se algum outro já não está
// na fila (foi ou vai ao fornecedor: esse não sai mais) ou é mais antigo na fila. Quem foi direto não tem reconferência: ninguém o tira da fal.
export function depoisDeEntrar(a: { casa: boolean; clipId: string; abertosDaConta: ReadonlyArray<AbertoDaConta> | null; naFrente: number | null; vagaOcupada: boolean }): { sair: false } | { sair: true; motivo: string } {
  if (!a.casa && a.abertosDaConta) {
    const i = a.abertosDaConta.findIndex((x) => x.id === a.clipId)
    const outros = a.abertosDaConta.filter((x) => x.id !== a.clipId)
    if (outros.some((x) => !x.naFila) || (i > 0 && a.abertosDaConta.slice(0, i).some((x) => x.naFila))) return { sair: true, motivo: FILA_MOTIVOS.umPorVez }
  }
  if (a.naFrente !== null && alemDoLimite(a.naFrente, a.vagaOcupada)) return { sair: true, motivo: FILA_MOTIVOS.cheia }
  return { sair: false }
}
