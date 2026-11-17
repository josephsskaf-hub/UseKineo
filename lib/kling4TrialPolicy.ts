// Founder decision, 2026-10-28. One rollback switch; country/admission policy stays upstream.
export const KLING4_TRIAL_LIVE = true

export function kling4TrialEligible(f: {
  paid: boolean; admitted: boolean; shortFilm: boolean
  priorFilms: number | null; priorDebits: number | null; live?: boolean
}): boolean {
  return (f.live ?? KLING4_TRIAL_LIVE) && !f.paid && f.admitted && f.shortFilm &&
    f.priorFilms === 0 && f.priorDebits === 0
}

// KINEO-K4-GRATIS-20S-1711 [dono 17/11, opção A] — o clipe do Kling 4 grátis nasce do tamanho da voz MEDIDA, até este teto.
// 15 = desligado: o comportamento de hoje, byte a byte (voz ≤ 15,5 s → clipe de 15 s; acima → encaixe ou reserva H3 Turbo).
// 20 = ligado: voz entre 15,5 s e 20,5 s fica no Kling 4 com clipe de ⌈voz⌉ s (16 a 20; US$ 0,157/s em 720p); acima → como hoje.
// Ligar só depois do teste pago de 2 filmes da CEO, mostrado ao dono. ATENÇÃO antes de ligar: o razão do teto diário
// (kling4_trial_films / reserve_kling4_trial) só aceita reserva de 2355 milésimos — o filme mais longo ainda conta como 15 s.
export const KLING4_TRIAL_MAX_SECONDS: number = 15
/** O teto do ensaio do fundador (`k4_gratis_ensaio: true`, só isDryRunAccount): o caminho de até 20 s para UM pedido, sem ligar a ninguém. */
export const KLING4_TRIAL_MAX_SECONDS_ENSAIO = 20
/** Preço do Kling 4 em 720p na fal (US$ 2,355 / 15 s, o mesmo de KLING4_TRIAL_COST_USD). */
export const KLING4_TRIAL_USD_PER_SECOND = 0.157

/** A voz medida pode ir ao Kling 4 até aqui (s): o teto do clipe + 0,5 s de sobra no fim, a mesma folga do 15,5 de hoje. */
export function kling4TrialTetoDaFala(maxSeconds: number = KLING4_TRIAL_MAX_SECONDS): number {
  const max = Number.isInteger(maxSeconds) && maxSeconds > 15 && maxSeconds <= 30 ? maxSeconds : 15
  return max + 0.5
}

/**
 * Segundos do clipe único do Kling 4 grátis para a voz medida: ≤ 15,5 s → 15 (hoje); até o teto → ⌈voz⌉ (nunca acima do teto);
 * acima do teto ou sem medida → null (o caminho de hoje decide: encaixe ou reserva).
 */
export function kling4TrialClipSeconds(falaSeconds: number | null, maxSeconds: number = KLING4_TRIAL_MAX_SECONDS): number | null {
  if (typeof falaSeconds !== 'number' || !Number.isFinite(falaSeconds) || falaSeconds <= 0) return null
  if (falaSeconds <= 15.5) return 15
  if (falaSeconds > kling4TrialTetoDaFala(maxSeconds)) return null
  const max = kling4TrialTetoDaFala(maxSeconds) - 0.5
  return Math.min(max, Math.max(16, Math.ceil(falaSeconds - 1e-9)))
}

/** Custo previsto do clipe (US$), na régua da fal (720p). */
export function kling4TrialClipCostUsd(clipSeconds: number): number {
  return Math.round(clipSeconds * KLING4_TRIAL_USD_PER_SECOND * 1000) / 1000
}
