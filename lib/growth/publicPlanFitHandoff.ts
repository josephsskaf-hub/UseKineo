import type { PlanFitQuality } from './planFit'

// Shared with the earnings projection so the displayed month and the carried
// production month can never round the same weekly cadence differently.
export const WEEKS_PER_MONTH = 4.345
const MAX_MONTHLY_VIDEOS = 60
const DEFAULT_DURATION = 60
const DEFAULT_ENGINE: PlanFitQuality = 'fast'
const SOURCE = 'shorts_money_calculator' as const

const ENGINES = new Set<PlanFitQuality>([
  'fast',
  'cinematic_ai',
  'cinematic_h3',
  'cinematic_kling',
  'cinematic_veo',
  'cinematic_hollywood',
  'cinematic_omni',
])
const DURATIONS = new Set([35, 60, 90])

export type PublicPlanFitHandoff = {
  source: typeof SOURCE
  quality: PlanFitQuality
  seconds: 35 | 60 | 90
  monthlyVideos: number
}

export type PublicPlanFitLink = PublicPlanFitHandoff & {
  href: string
  requestedMonthlyVideos: number
  capped: boolean
}

function integerInRange(raw: string | null, min: number, max: number): number | null {
  if (!raw || !/^\d+$/.test(raw)) return null
  const value = Number(raw)
  return Number.isSafeInteger(value) && value >= min && value <= max ? value : null
}

export function buildPublicPlanFitLink(input: {
  shortsPerWeek: number
  quality?: PlanFitQuality
  seconds?: 35 | 60 | 90
}): PublicPlanFitLink {
  const weekly = Number.isFinite(input.shortsPerWeek) ? Math.max(0, input.shortsPerWeek) : 0
  const requestedMonthlyVideos = Math.max(1, Math.ceil(weekly * WEEKS_PER_MONTH))
  const monthlyVideos = Math.min(MAX_MONTHLY_VIDEOS, requestedMonthlyVideos)
  const quality = input.quality && ENGINES.has(input.quality) ? input.quality : DEFAULT_ENGINE
  const seconds = input.seconds && DURATIONS.has(input.seconds) ? input.seconds : DEFAULT_DURATION
  const params = new URLSearchParams({
    plan_source: SOURCE,
    engine: quality,
    seconds: String(seconds),
    monthly_videos: String(monthlyVideos),
    internal_source: '/shorts-money-calculator',
  })

  return {
    source: SOURCE,
    quality,
    seconds,
    monthlyVideos,
    requestedMonthlyVideos,
    capped: requestedMonthlyVideos > MAX_MONTHLY_VIDEOS,
    href: `/cheapest-ai-shorts-maker?${params.toString()}#short-cost-calculator-title`,
  }
}

export function readPublicPlanFitHandoff(search: string | URLSearchParams): PublicPlanFitHandoff | null {
  const params = typeof search === 'string'
    ? new URLSearchParams(search.startsWith('?') ? search.slice(1) : search)
    : search
  if (params.get('plan_source') !== SOURCE) return null

  const monthlyVideos = integerInRange(params.get('monthly_videos'), 1, MAX_MONTHLY_VIDEOS)
  const seconds = integerInRange(params.get('seconds'), 35, 90)
  const quality = params.get('engine') as PlanFitQuality | null
  if (!monthlyVideos || !seconds || !DURATIONS.has(seconds) || !quality || !ENGINES.has(quality)) return null

  return {
    source: SOURCE,
    quality,
    seconds: seconds as 35 | 60 | 90,
    monthlyVideos,
  }
}
