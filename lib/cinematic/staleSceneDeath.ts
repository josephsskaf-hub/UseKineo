// KINEO-CENA-MORTA-MONTA-0311 — a cena que o cron PROVA morta (presa na fila da fal além de STALE_SCENE_MINUTES)
// passa a ser gravada no claim ASSINADO como falha terminal (`terminal_failed_jobs`), a mesma prova que o portão
// do /api/compose (`cinematicJobsAreTerminal`) já aceita para cena FAILED.
//
// Caso real (render 0535d5e5, Seedance 60 s, 03/11): 8/9 cenas prontas, a 9ª em IN_QUEUE. Aos 120 min o cron
// contou a 9ª como morta e chamou o compose com 8/9 — mas a morte vivia só na memória do cron. No claim a 9ª
// seguia sem URL e sem prova de falha, o compose devolvia 409 "still being finalized" a cada minuto (05:10→05:30
// UTC) e o filme só terminou em estorno (cinematic_abandoned_no_delivery, 35 cr). Trava mútua: o cron esperava
// o compose, o compose esperava a cena que o cron já tinha enterrado.
//
// Regra pura (sem banco): só vira falha terminal a cena que (1) o coletor declarou morta POR IDADE, (2) existe
// uma única vez no par id+modelo do claim, (3) NÃO tem URL autorizada, e (4) o filme que sobra atinge o piso de
// 60% das cenas enviadas. Quem chama é só o cron (servidor, claim verificado) — o cliente não tem caminho para
// escrever `terminal_failed_jobs`, então nenhuma cena VIVA pode ser descartada por pedido do cliente.
import type { CinematicTerminalFailure } from './claim'

export const PISO_DE_CENAS = 0.6

export type CenaMortaPorIdade = { index: number; requestId: string; model: string }

export type DecisaoCenaMorta =
  | { ok: true; failed: CinematicTerminalFailure[] }
  | { ok: false; motivo: 'cena_fora_do_claim' | 'cena_ja_pronta' | 'abaixo_do_piso' }

export function cenasMortasParaOClaim(a: {
  requestIds: ReadonlyArray<string | null>
  models: ReadonlyArray<string>
  prontas: number
  mortas: ReadonlyArray<CenaMortaPorIdade>
  authorizedUrls?: ReadonlyArray<string | null>
  piso?: number
}): DecisaoCenaMorta {
  const failed: CinematicTerminalFailure[] = []
  for (const m of a.mortas) {
    const matches = a.requestIds.filter((id, i) => id === m.requestId && a.models[i] === m.model).length
    if (!m.requestId || a.requestIds[m.index] !== m.requestId || a.models[m.index] !== m.model || matches !== 1) {
      return { ok: false, motivo: 'cena_fora_do_claim' }
    }
    if (a.authorizedUrls?.[m.index]) return { ok: false, motivo: 'cena_ja_pronta' }
    if (!failed.some(f => f.requestId === m.requestId && f.model === m.model)) failed.push({ requestId: m.requestId, model: m.model })
  }
  const enviadas = a.requestIds.filter(Boolean).length
  if (a.prontas <= 0 || a.prontas < Math.ceil(enviadas * (a.piso ?? PISO_DE_CENAS))) return { ok: false, motivo: 'abaixo_do_piso' }
  return { ok: true, failed }
}
