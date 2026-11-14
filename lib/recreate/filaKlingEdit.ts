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
//
// ═══ KINEO-RECREATE-FILA-REVISAO-1411 [revisor independente + CEO 14/11] — o que a 1ª versão errava, achado EXECUTANDO o código ═══════════
//   (2) A fal já tinha entregue o pedido A, mas ninguém o liquidou em 8 min (aba fechada; o cron olhava outro clipe): o próximo fechava A como
//       preso — fal cobrada, cliente estornado e sem vídeo. Agora, vaga vencida de um clipe que ESTÁ no fornecedor: primeiro liquida esse
//       clipe (pronto = entrega; ainda rodando = a vaga é renovada por VAGA_RENOVA_MS, até o teto duro VAGA_TETO_DURO_MS desde que foi tomada).
//   (3) O ator pegava a vaga para B, mandava, e a gravação do pedido falhava: a vaga ficava em nome de B "na fila" e ninguém passava até os
//       15 min. Agora o vencimento é conferido ANTES da regra "vaga do mesmo clipe": vaga vencida de clipe que não chegou ao fornecedor =
//       fecha com estorno e solta.
//   (4) Decisão sobre linha lida antes: (a) a tela mandava B perto dos 15 min e o cron aplicava o teto na mesma linha (enviado E estornado);
//       (b) uma passada longa mandava de novo um clipe que já tinha saído e terminado. Agora quem sai da fila tem de ser, no BANCO, o mais
//       antigo da fila (`daFila`), e tanto o envio quanto o teto de espera são UPDATE condicionais à marca (FILA_ENVIANDO / expire): um só vence.
// Números novos: VAGA_RENOVA_MS = 2 min (o cron de 1 min volta a olhar antes disso); VAGA_TETO_DURO_MS = 20 min (quase 5× o pior pedido
// medido: depois disso o pedido é fechado com estorno mesmo que o fornecedor ainda responda "rodando").
export const FILA_MARCA = 'queue_kling_edit' as const
/** A linha que SAIU da fila e está sendo mandada ao fornecedor (ainda pending, sem request_id). Só um ator consegue pôr esta marca. */
export const FILA_ENVIANDO = 'queue_sending' as const
export const FILA_VAGA_NOME = 'kling4-edit-vaga' as const
export const FILA_VAGA_EVENTO = 'recreate_kling_edit_slot' as const
export const FILA_VAGA_PATH = '/lib/recreate/filaKlingEdit' as const
export const VAGA_TTL_MS = 8 * 60 * 1000
export const VAGA_RENOVA_MS = 2 * 60 * 1000
export const VAGA_TETO_DURO_MS = 20 * 60 * 1000
export const FILA_TETO_ESPERA_MS = 15 * 60 * 1000
export const FILA_MAX_NA_FRENTE = 3
export const FILA_MOTIVOS = { preso: 'queue_stuck', tempo: 'queue_timeout', cheia: 'queue_full', umPorVez: 'queue_one_per_account' } as const
/** Motivos de falha da fila que fecham com failed ANTES do estorno: a varredura horária de estornos órfãos tem de cobri-los. */
export const FILA_MOTIVOS_DE_ESTORNO: readonly string[] = [FILA_MOTIVOS.preso, FILA_MOTIVOS.tempo, FILA_MOTIVOS.cheia, FILA_MOTIVOS.umPorVez]
export const FRASE_FILA_CHEIA = 'Recreate is busy right now. Try again in a few minutes. Nothing was charged.'
export const FRASE_FILA_CHEIA_ESTORNADA = 'Recreate is busy right now, so we returned your credits. Try again in a few minutes.'
export const FRASE_FILA_FALHOU = 'Your video could not be completed in time, so we returned your credits. Please try again.'
/** Quando a falha da fila ainda NÃO tem o estorno gravado (o estorno falhou naquela hora): a varredura horária o refaz. Nunca dizer "returned". */
export const FRASE_FILA_FALHOU_SEM_ESTORNO = 'Your video could not be completed in time. Your credits will be returned within the hour.'
export const FRASE_UM_POR_VEZ = 'You already have a Recreate in progress. Wait for it to finish before starting another. Nothing was charged.'

/** A frase da falha da fila: "returned" só com o estorno GRAVADO na linha. */
export const fraseDaFalhaDaFila = (creditsRefunded: number) => (creditsRefunded > 0 ? FRASE_FILA_FALHOU : FRASE_FILA_FALHOU_SEM_ESTORNO)

export interface VagaOcupada { clipId: string; expiraEm: number; tomadaEm: number }
/** Onde está o clipe dono de uma vaga: fechado (pronto, falhou ou sumiu), ainda fora do fornecedor (pending, sem request_id), ou no fornecedor. */
export type EstadoDoDono = 'fechado' | 'fora_do_fornecedor' | 'no_fornecedor'
export interface FilaIo {
  now(): number
  /** O clipe mais antigo NA FILA (pending + marca), de qualquer conta, lido AGORA do banco. null = fila vazia. */
  maisAntigoNaFila(): Promise<string | null>
  /** Tenta ocupar a vaga (INSERT de id fixo). false = já existe uma linha. Erro de banco: lança. */
  criarVaga(clipId: string, expiraEm: number): Promise<boolean>
  lerVaga(): Promise<VagaOcupada | null>
  /** Apaga a vaga SÓ se for deste clipe. */
  apagarVaga(clipId: string): Promise<void>
  /** Empurra o vencimento da vaga deste clipe. */
  renovarVaga(clipId: string, expiraEm: number): Promise<void>
  estadoDoDono(clipId: string): Promise<EstadoDoDono>
  /** Roda a liquidação de verdade do clipe que está no fornecedor (consulta, entrega ou falha). Devolve se ele fechou. */
  liquidar(clipId: string): Promise<'fechado' | 'aberto'>
  /** Fecha como falha (queue_stuck) com estorno, SÓ se ainda aberto: failed primeiro (condicional), estorno depois. */
  fecharComEstorno(clipId: string): Promise<void>
}

/** A linha está na fila? (pending, sem pedido na fal, com a marca) */
export function naFila(row: { status: string; fal_request_id: string | null; failure_reason: string | null }): boolean {
  return row.status === 'pending' && !row.fal_request_id && row.failure_reason === FILA_MARCA
}

/**
 * A vaga VENCEU: o que fazer com o dono antes de alguém passar. Devolve 'ocupada' quando o dono ainda roda no fornecedor dentro do teto duro
 * (a vaga é renovada) e 'livre' quando a vaga foi solta. Nunca fecha como preso um pedido que o fornecedor já entregou.
 */
export async function resolverVagaVencida(io: FilaIo, vaga: VagaOcupada): Promise<'livre' | 'ocupada'> {
  const estado = await io.estadoDoDono(vaga.clipId)
  if (estado === 'no_fornecedor') {
    if ((await io.liquidar(vaga.clipId)) === 'aberto') {
      if (io.now() - vaga.tomadaEm < VAGA_TETO_DURO_MS) { await io.renovarVaga(vaga.clipId, io.now() + VAGA_RENOVA_MS); return 'ocupada' }
      await io.fecharComEstorno(vaga.clipId)
    }
  } else if (estado === 'fora_do_fornecedor') {
    await io.fecharComEstorno(vaga.clipId)
  }
  await io.apagarVaga(vaga.clipId)
  return 'livre'
}

/**
 * É a vez deste clipe E a vaga agora é dele? true = ESTE ator (e só ele) pode mandar ao fornecedor. false = espera.
 * `daFila`: o clipe está saindo da fila — no BANCO ele tem de ser o mais antigo da fila (linha lida antes não vale). Pedido novo (sem
 * `daFila`): só passa com a fila vazia. Depois: inserir a vaga; vaga válida de qualquer clipe = espera; vaga VENCIDA = resolve o dono
 * (resolverVagaVencida) e tenta de novo — menos quando a vaga vencida é do PRÓPRIO clipe: aí ele foi resolvido (fechado) e não manda.
 */
export async function tomarVaga(io: FilaIo, clipId: string, opts: { daFila?: boolean } = {}): Promise<boolean> {
  const primeiro = await io.maisAntigoNaFila()
  if (opts.daFila ? primeiro !== clipId : primeiro !== null && primeiro !== clipId) return false
  for (let tentativa = 0; tentativa < 2; tentativa++) {
    if (await io.criarVaga(clipId, io.now() + VAGA_TTL_MS)) return true
    const vaga = await io.lerVaga()
    if (!vaga) continue // liberada entre o insert e a leitura
    if (vaga.expiraEm > io.now()) return false
    const resolvida = await resolverVagaVencida(io, vaga)
    if (vaga.clipId === clipId || resolvida === 'ocupada') return false
  }
  return false
}

/** Posição na fila para a tela: quantos estão na frente (os mais antigos na fila + o que ocupa a vaga) + 1. */
export const posicaoNaFila = (naFrenteNaFila: number, vagaOcupada: boolean) => Math.max(0, naFrenteNaFila) + (vagaOcupada ? 1 : 0) + 1

/** A fila está cheia para um pedido NOVO? (recusa antes de cobrar) */
export const filaCheia = (naFila: number, vagaOcupada: boolean) => naFila + (vagaOcupada ? 1 : 0) >= FILA_MAX_NA_FRENTE

/** Depois de entrar: este pedido ficou ALÉM do limite (a porta não é atômica: vários entram juntos)? Então sai com estorno. */
export const alemDoLimite = (naFrenteNaFila: number, vagaOcupada: boolean) => naFrenteNaFila + (vagaOcupada ? 1 : 0) > FILA_MAX_NA_FRENTE

/** O que dizer a quem espera: a posição e a espera estimada (cada pedido leva ~4 min no pior caso saudável). Nunca "About 2 minutes". */
export function esperaNaFila(posicao: number): { label: string; minutes: number } {
  const minutes = Math.max(1, posicao - 1) * 4 + 3
  return { label: `In line · position ${posicao} · about ${minutes} minutes`, minutes }
}

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
