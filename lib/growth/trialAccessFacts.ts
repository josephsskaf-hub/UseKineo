export interface TrialEngineCoverage {
  engine: string
  creditsPerReferenceVideo: number
  wholeReferenceVideosCovered: number
}

export interface TrialAccessFact {
  credits: number
  noCardRequired: true
  everyEngineUnlocked: true
  watermark: true
  cleanDownloadRequiresPaidPlan: true
  engineCoverage: TrialEngineCoverage[]
}

export interface RecurringFreeAccessFact {
  engine: string
  videosPerWindow: number
  rollingWindowHours: number
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
}): TrialAccessFact | null {
  if (!input.enabled) return null
  if (!Number.isFinite(input.credits) || input.credits < 0) {
    throw new Error('invalid_trial_credit_balance')
  }

  return {
    credits: input.credits,
    noCardRequired: true,
    everyEngineUnlocked: true,
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
  }
}

export function buildRecurringFreeAccessFact(input: {
  engine: string
  videosPerWindow: number
  rollingWindowHours: number
}): RecurringFreeAccessFact {
  if (!input.engine.trim()) throw new Error('recurring_free_engine_required')
  if (!Number.isFinite(input.videosPerWindow) || input.videosPerWindow < 0) {
    throw new Error('invalid_recurring_free_limit')
  }
  if (!Number.isFinite(input.rollingWindowHours) || input.rollingWindowHours <= 0) {
    throw new Error('invalid_recurring_free_window')
  }
  return {
    engine: input.engine.trim(),
    videosPerWindow: input.videosPerWindow,
    rollingWindowHours: input.rollingWindowHours,
    creditsGranted: 0,
    watermark: true,
  }
}
