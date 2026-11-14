// ═══ KINEO-RECREATE-AUDITORIA-DA-TRAVA-1411 [CEO 14/11, pedido 1] — a saída do motor que a trava "não trocou" reprovou fica guardada 48 h ═══
// Caso de 14/11 00:19 (clips b7eb08f8 e bf198385, o Reel de referência do dono em 2 partes de 12 s): a trava reprovou e ACERTOU, mas para ver
// a saída do motor a CEO teve de mandar um agente ao painel da fal — a rota descartava o arquivo. Agora, em swap_unchanged/swap_partial, o
// arquivo do motor é copiado para um caminho PRIVADO e o caminho vai no evento recreate_swap_check. É só auditoria da casa: o cliente
// continua vendo "não trocou" e recebendo o estorno; nenhuma tela lê este caminho.
//   · Onde: o bucket PRIVADO que a casa já tem (lib/safety/quarantine QUARANTINE_BUCKET, public=false, só a chave de serviço lê), numa pasta
//     SÓ desta auditoria (AUDITORIA_PASTA), plana: <pasta>/<id do clipe>.mp4. Nada de bucket novo, nada no bucket público `renders`.
//   · Por quanto tempo: 48 h. A limpeza roda na varredura horária de clipes que já existe (sweepClipJobs, /api/cron/refund-sweep) e só toca
//     ESTA pasta — a prova de incidente da quarentena (outras pastas do bucket) nunca é apagada por aqui.
//   · Ordem na liquidação (lib/clips/clipFlow settleClip): failed → estorno → cópia (com teto de tempo; falhou = segue sem) → eventos. O
//     estorno do cliente nunca espera nem depende da cópia.
// Módulo PURO: caminho, prazo e a escolha do que venceu. O servidor (lib/clips/clipServer.ts) liga o bucket.
export const AUDITORIA_PASTA = 'recreate-nao-trocou'
export const AUDITORIA_HORAS = 48
/** Teto de tempo da cópia dentro da rota de status (maxDuration 60 s; a checagem já gastou até 40 s). */
export const AUDITORIA_TETO_MS = 15_000
/** Abaixo disso não vale começar a cópia: os eventos e a resposta ao cliente vêm primeiro. */
export const AUDITORIA_MINIMO_MS = 3_000
/** Orçamento da liquidação antes de a rota de status estourar (60 s), com folga para os eventos. */
export const LIQUIDACAO_ORCAMENTO_MS = 52_000
export const AUDITORIA_MAX_BYTES = 200 * 1024 * 1024

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** O caminho privado da saída reprovada. null = id que não é uuid (nunca monta caminho com texto de fora). */
export function caminhoDaAuditoria(clipId: unknown): string | null {
  return typeof clipId === 'string' && UUID.test(clipId) ? `${AUDITORIA_PASTA}/${clipId.toLowerCase()}.mp4` : null
}

/** Quanto tempo a cópia pode levar, dado o que a liquidação já gastou. 0 = não começa. */
export function orcamentoDaCopia(gastoMs: number): number {
  const resta = LIQUIDACAO_ORCAMENTO_MS - Math.max(0, gastoMs)
  return resta >= AUDITORIA_MINIMO_MS ? Math.min(AUDITORIA_TETO_MS, resta) : 0
}

/** Quando o arquivo guardado em `agora` deixa de existir (para o evento). */
export const venceEm = (agoraMs: number) => new Date(agoraMs + AUDITORIA_HORAS * 60 * 60 * 1000).toISOString()

/**
 * Da listagem da pasta, os arquivos com mais de 48 h (caminhos completos, prontos para remover). Só nomes no formato desta auditoria
 * (<uuid>.mp4): qualquer outro arquivo que apareça na pasta fica onde está. Data ilegível = não vence (nunca apaga na dúvida).
 */
export function vencidos(lista: ReadonlyArray<{ name?: unknown; created_at?: unknown }>, agoraMs: number): string[] {
  const corte = agoraMs - AUDITORIA_HORAS * 60 * 60 * 1000
  const out: string[] = []
  for (const item of lista) {
    const nome = typeof item?.name === 'string' ? item.name : ''
    if (!nome.endsWith('.mp4') || !UUID.test(nome.slice(0, -4))) continue
    const criado = typeof item.created_at === 'string' ? Date.parse(item.created_at) : NaN
    if (Number.isFinite(criado) && criado < corte) out.push(`${AUDITORIA_PASTA}/${nome}`)
  }
  return out
}
