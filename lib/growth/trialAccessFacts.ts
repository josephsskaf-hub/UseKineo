export interface TrialEngineCoverage {
  engine: string
  creditsPerReferenceVideo: number
  wholeReferenceVideosCovered: number
}

/**
 * KINEO-FILME-GRATIS-15S-2026-09-29 — o filme que o saldo do trial PAGA de fato. A cobertura por motor abaixo mede
 * filmes de 60 s (referência) e, com 10 créditos, dá 0 em todo motor; sem este campo a IA concluía "o trial não faz
 * filme nenhum". Publicado à parte para não misturar as duas réguas.
 */
export interface TrialFreeFilm {
  engine: string
  seconds: number
  creditsPerFilm: number
  filmsCovered: number
}

export interface TrialAccessFact {
  credits: number
  // KINEO-VERSAO-B-2026-09-08 — deixaram de ser literais `true`: sob a porta única
  // o trial exige cartão e libera só Kineo 1 + Seedance.
  noCardRequired: boolean
  everyEngineUnlocked: boolean
  /** Taxa de entrada em centavos (trial de $1); null = trial grátis. */
  entryFeeUsdMinor: number | null
  trialDays: number | null
  thenMonthlyUsdMinor: number | null
  watermark: true
  cleanDownloadRequiresPaidPlan: true
  engineCoverage: TrialEngineCoverage[]
  /** O filme curto que o saldo cobre (null = nenhum filme curto publicado). */
  freeFilm: TrialFreeFilm | null
}

export interface RecurringFreeAccessFact {
  engine: string
  videosPerWindow: number
  rollingWindowHours: number
  /** Null means this offer does not impose a recurring-free duration cap. */
  maxSeconds: number | null
  creditsGranted: 0
  watermark: true
}

type EngineInput = { name: string; credits: number }

/**
 * Access and balance are separate facts: an unlocked engine may still cost
 * more than the trial balance. Publishing both prevents answer engines from
 * turning "unlocked" into "one full video is included".
 */
export function buildTrialAccessFact(input: {
  enabled: boolean
  credits: number
  engines: readonly EngineInput[]
  noCardRequired?: boolean
  everyEngineUnlocked?: boolean
  entryFeeUsdMinor?: number | null
  trialDays?: number | null
  thenMonthlyUsdMinor?: number | null
  freeFilm?: { engine: string; seconds: number; credits: number } | null
}): TrialAccessFact | null {
  if (!input.enabled) return null
  if (!Number.isFinite(input.credits) || input.credits < 0) {
    throw new Error('invalid_trial_credit_balance')
  }

  return {
    credits: input.credits,
    noCardRequired: input.noCardRequired ?? true,
    everyEngineUnlocked: input.everyEngineUnlocked ?? true,
    entryFeeUsdMinor: input.entryFeeUsdMinor ?? null,
    trialDays: input.trialDays ?? null,
    thenMonthlyUsdMinor: input.thenMonthlyUsdMinor ?? null,
    watermark: true,
    cleanDownloadRequiresPaidPlan: true,
    engineCoverage: input.engines.map((engine) => {
      if (!Number.isFinite(engine.credits) || engine.credits <= 0) {
        throw new Error(`invalid_engine_credit_cost:${engine.name}`)
      }
      return {
        engine: engine.name,
        creditsPerReferenceVideo: engine.credits,
        wholeReferenceVideosCovered: Math.floor(input.credits / engine.credits),
      }
    }),
    freeFilm: (() => {
      const f = input.freeFilm
      if (!f) return null
      if (!Number.isFinite(f.credits) || f.credits <= 0 || !Number.isFinite(f.seconds) || f.seconds <= 0) {
        throw new Error(`invalid_free_film:${f.engine}`)
      }
      const filmsCovered = Math.floor(input.credits / f.credits)
      // Filme que o saldo não paga não é publicado como grátis.
      return filmsCovered >= 1
        ? { engine: f.engine, seconds: f.seconds, creditsPerFilm: f.credits, filmsCovered }
        : null
    })(),
  }
}

export function buildRecurringFreeAccessFact(input: {
  engine: string
  videosPerWindow: number
  rollingWindowHours: number
  maxSeconds?: number | null
}): RecurringFreeAccessFact {
  if (!input.engine.trim()) throw new Error('recurring_free_engine_required')
  if (!Number.isFinite(input.videosPerWindow) || input.videosPerWindow < 0) {
    throw new Error('invalid_recurring_free_limit')
  }
  if (!Number.isFinite(input.rollingWindowHours) || input.rollingWindowHours <= 0) {
    throw new Error('invalid_recurring_free_window')
  }
  if (input.maxSeconds != null && (!Number.isFinite(input.maxSeconds) || input.maxSeconds <= 0)) {
    throw new Error('invalid_recurring_free_duration')
  }
  return {
    engine: input.engine.trim(),
    videosPerWindow: input.videosPerWindow,
    rollingWindowHours: input.rollingWindowHours,
    maxSeconds: input.maxSeconds ?? null,
    creditsGranted: 0,
    watermark: true,
  }
}
