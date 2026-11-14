// ═══ KINEO-RECREATE-FILA-KLING-EDIT-1411 [CEO 14/11 01:09, pedido 3] — UM pedido nosso por vez no kling/v4/video-to-video/edit ═════════════
// Causa provada pela CEO com uma variável só: o MESMO vídeo, a MESMA foto e o MESMO texto mandados junto com outros 2 pedidos (clip c39d70ce,
// 00:52) voltaram "não trocou"; mandados SOZINHOS (clip cb3f214c, 01:02), trocaram. Placar do dia: sozinho trocou 10 de 10; em paralelo com
// outro pedido nosso, 0 de 5 — e a fal cobra. Conferido no banco: nesses horários não havia nenhum outro Kling 4 pela nossa chave, só edit com
// edit. Então: no máximo UM pedido em andamento na fal para este modelo, somando todos os usuários (conta da casa também entra na fila).
//
// COMO (sem tabela, sem coluna e sem cron novos):
//   · A VAGA é uma linha única em `events` (id fixo, o mesmo desenho de lib/cronLease): quem consegue inserir é o único que pode mandar à fal.
//     Guarda o clipe que a ocupa e quando vence. Fecha o clipe (done, failed) → a vaga é apagada. Dois pedidos no mesmo instante: só um insere.
//   · Quem não consegue a vaga fica NA FILA: a linha do clipe continua `pending`, com a marca FILA_MARCA em failure_reason. Os créditos já
//     foram reservados (o débito de sempre) e NADA foi à fal. A fila anda em toda liquidação (o /api/recreate/status da tela, o cron de 1 min
//     que já liquida todo clipe em andamento) e na chegada de um pedido novo: o MAIS ANTIGO da fila pega a vaga livre e só então vai à fal.
//   · PEDIDO PRESO: a vaga vence em VAGA_TTL_MS. Vencida, o próximo a toma e o preso é fechado como falha com estorno (queue_stuck).
//   · TETO DE ESPERA: FILA_TETO_ESPERA_MS na fila sem sair = falha com estorno (queue_timeout). E a rota recusa ANTES de cobrar quando já há
//     FILA_MAX_NA_FRENTE pedidos na frente (queue_full): melhor dizer "tente em alguns minutos" do que cobrar, esperar e estornar.
// OS NÚMEROS (medidos em 13–14/11, 14 pedidos: do envio ao fim, com a checagem, de 88 a 259 s; a CEO dá 150–210 s por pedido):
//   · VAGA_TTL_MS = 8 min: quase 2× o pior caso visto (259 s). Um pedido saudável nunca é fechado como preso.
//   · FILA_MAX_NA_FRENTE = 3 e FILA_TETO_ESPERA_MS = 15 min: 3 na frente × ~4 min = ~12 min no pior caso saudável, com 3 min de folga.
// Módulo PURO (io injetado): o guardião scripts/test-recreate-fila-kling-edit-1411.mjs executa a vaga e a fila com um banco de mentira.
export const FILA_MARCA = 'queue_kling_edit' as const
export const FILA_VAGA_NOME = 'kling4-edit-vaga' as const
export const FILA_VAGA_EVENTO = 'recreate_kling_edit_slot' as const
export const FILA_VAGA_PATH = '/lib/recreate/filaKlingEdit' as const
export const VAGA_TTL_MS = 8 * 60 * 1000
export const FILA_TETO_ESPERA_MS = 15 * 60 * 1000
export const FILA_MAX_NA_FRENTE = 3
export const FILA_MOTIVOS = { preso: 'queue_stuck', tempo: 'queue_timeout', cheia: 'queue_full' } as const
export const FRASE_FILA_CHEIA = 'Recreate is busy right now. Try again in a few minutes. Nothing was charged.'
export const FRASE_FILA_FALHOU = 'Your video could not be completed in time, so we returned your credits. Please try again.'

export interface VagaOcupada { clipId: string; expiraEm: number }
export interface FilaIo {
  now(): number
  /** O clipe mais antigo NA FILA (pending + marca), de qualquer conta. null = fila vazia. */
  maisAntigoNaFila(): Promise<string | null>
  /** Tenta ocupar a vaga (INSERT de id fixo). false = já existe uma linha. Erro de banco: lança. */
  criarVaga(clipId: string, expiraEm: number): Promise<boolean>
  lerVaga(): Promise<VagaOcupada | null>
  /** Apaga a vaga SÓ se for deste clipe. */
  apagarVaga(clipId: string): Promise<void>
  /** Fecha como falha com estorno o clipe que ocupava a vaga vencida (se ainda estiver aberto). */
  fecharPreso(clipId: string): Promise<void>
}

/** A linha está na fila? (pending, sem pedido na fal, com a marca) */
export function naFila(row: { status: string; fal_request_id: string | null; failure_reason: string | null }): boolean {
  return row.status === 'pending' && !row.fal_request_id && row.failure_reason === FILA_MARCA
}

/**
 * É a vez deste clipe E a vaga agora é dele? true = ESTE ator (e só ele) manda à fal. false = espera.
 * Ordem: (1) ninguém mais antigo na fila; (2) inserir a vaga; (3) vaga ocupada e válida = espera; vaga VENCIDA = fecha o preso, apaga e
 * tenta de novo. Vaga já em nome deste clipe = outro ator do mesmo clipe está mandando: espera (nunca dois envios do mesmo clipe).
 */
export async function tomarVaga(io: FilaIo, clipId: string): Promise<boolean> {
  const primeiro = await io.maisAntigoNaFila()
  if (primeiro && primeiro !== clipId) return false
  for (let tentativa = 0; tentativa < 2; tentativa++) {
    if (await io.criarVaga(clipId, io.now() + VAGA_TTL_MS)) return true
    const vaga = await io.lerVaga()
    if (!vaga) continue // liberada entre o insert e a leitura
    if (vaga.clipId === clipId) return false
    if (vaga.expiraEm > io.now()) return false
    await io.apagarVaga(vaga.clipId)
    await io.fecharPreso(vaga.clipId)
  }
  return false
}

/** Posição na fila para a tela: quantos estão na frente (os mais antigos na fila + o que ocupa a vaga) + 1. */
export const posicaoNaFila = (naFrenteNaFila: number, vagaOcupada: boolean) => Math.max(0, naFrenteNaFila) + (vagaOcupada ? 1 : 0) + 1

/** A fila está cheia para um pedido NOVO? (recusa antes de cobrar) */
export const filaCheia = (naFila: number, vagaOcupada: boolean) => naFila + (vagaOcupada ? 1 : 0) >= FILA_MAX_NA_FRENTE

/** Modelo e entrada da fal gravados na impressão do pedido ([pedido, modelo, entrada]) — é o que o clipe da fila manda quando chega a vez. */
export function entradaDaLinha(row: { model: string; fingerprint: string }): { model: string; input: Record<string, unknown> } | null {
  try {
    const p: unknown = JSON.parse(row.fingerprint)
    if (!Array.isArray(p) || p[1] !== row.model || !p[2] || typeof p[2] !== 'object' || Array.isArray(p[2])) return null
    return { model: row.model, input: p[2] as Record<string, unknown> }
  } catch {
    return null
  }
}
