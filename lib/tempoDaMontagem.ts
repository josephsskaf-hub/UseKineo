// KINEO-FILME-RAPIDO-1710 — TEMPO POR ETAPA DA MONTAGEM (auditoria 17/10: "os 53 s da etapa 4 só puderam ser medidos como
// bloco"). Um cronômetro por requisição de /api/compose: voz (TTS), transcrição (Whisper + upload da voz), música,
// envio ao Creatomate — em ms, somando quando a etapa se repete (cenas da estrada hollywood). O evento
// `compose_stage_timing` sai uma vez, quando o Creatomate aceitou a montagem; o render e a cópia ao bucket saem da rota de
// status no mesmo evento-irmão `compose_status_timing`. Sem import: o guardião executa este arquivo.

export const COMPOSE_STAGE_TIMING_EVENT = 'compose_stage_timing'
export const COMPOSE_STATUS_TIMING_EVENT = 'compose_status_timing'
export type EtapaDaMontagem = 'voz' | 'transcricao' | 'musica' | 'envio_creatomate'

export function cronometroDaMontagem(agora: () => number = () => Date.now()) {
  const t0 = agora()
  const abertas = new Map<string, number>()
  const etapas: Record<string, number> = {}
  return {
    inicio(etapa: EtapaDaMontagem): void {
      abertas.set(etapa, agora())
    },
    fim(etapa: EtapaDaMontagem): void {
      const t = abertas.get(etapa)
      if (t === undefined) return
      abertas.delete(etapa)
      etapas[`${etapa}_ms`] = (etapas[`${etapa}_ms`] ?? 0) + Math.max(0, agora() - t)
    },
    /** O que vai no evento: as etapas medidas + o total desde o começo da requisição. */
    metadados(extra: Record<string, unknown> = {}): Record<string, unknown> {
      return { ...etapas, total_ms: Math.max(0, agora() - t0), ...extra, version: 'filme_rapido_1710' }
    },
  }
}
