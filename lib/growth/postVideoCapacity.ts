import { TIER_CREDITS, type CheckoutTier } from '@/lib/checkoutPricing'
import { creditCostForDuration, type Quality } from '@/lib/credits/engineCost'
import { nomePublicoDoMotor, supportedDurationsFor } from '@/lib/durationByEngine'
import {
  DURACOES_CURTAS_PUBLIC,
  H3MAX_PUBLIC,
  S25_PUBLIC,
  SEEDANCE_15S_PUBLIC,
  engineOffered,
  enginePaused,
} from '@/lib/engineLaunch'
import { decideEngineGate } from '@/lib/enginePlanGate'

export const POST_VIDEO_CAPACITY_VERSION = 'purchase_clarity_20261026_v1' as const

export interface PostVideoCapacityInput {
  tier: CheckoutTier
  /** The delivered film's canonical quality and requested duration; never guessed. */
  quality?: string | null
  seconds?: number | null
  /** Resolved account entitlement from the caller, not inferred from buying a plan. */
  kineo1Allowed?: boolean | null
  /** Required by the canonical premium-engine grandfather rule. */
  profileCreatedAt?: string | null
}

type UnavailableReason =
  | 'unknown_plan'
  | 'unknown_engine'
  | 'unknown_duration'
  | 'engine_unavailable'
  | 'engine_access_unconfirmed'
  | 'duration_unavailable'
  | 'invalid_cost'
  | 'insufficient_monthly_credits'

export type PostVideoCapacity =
  | {
    status: 'ready'
    tier: CheckoutTier
    monthlyCredits: number
    quality: Quality
    seconds: number
    engineName: string
    creditsPerFilm: number
    filmsPerMonth: number
  }
  | {
    status: 'unavailable'
    reason: UnavailableReason
    monthlyCredits: number | null
    creditsPerFilm?: number
  }

// Only public film engines have a monthly-film projection. In particular,
// legacy qualities, avatars and unknown keys must not default to Seedance.
const FILM_ENGINES: Readonly<Record<string, string>> = {
  fast: 'fast',
  cinematic_ai: 'seedance',
  cinematic_kling: 'kling',
  cinematic_veo: 'veo',
  cinematic_hollywood: 'hollywood',
  cinematic_h3: 'h3',
  cinematic_h3max: 'h3max',
  cinematic_s25: 's25',
}

/** Monthly grant capacity, not the person's balance, a render promise or an entitlement. */
export function getPostVideoCapacity(input: PostVideoCapacityInput): PostVideoCapacity {
  if (!['starter', 'basic', 'pro'].includes(input.tier)) {
    return { status: 'unavailable', reason: 'unknown_plan', monthlyCredits: null }
  }
  const monthlyCredits = TIER_CREDITS[input.tier]
  const unavailable = (reason: UnavailableReason): PostVideoCapacity => ({
    status: 'unavailable', reason, monthlyCredits,
  })
  const quality = input.quality
  if (typeof quality !== 'string' || !Object.hasOwn(FILM_ENGINES, quality)) {
    return unavailable('unknown_engine')
  }
  const engine = FILM_ENGINES[quality]
  if (!engineOffered(engine) || enginePaused(engine)
    || (engine === 'h3max' && !H3MAX_PUBLIC)
    || (engine === 's25' && !S25_PUBLIC)
    || (engine === 'fast' && input.kineo1Allowed !== true)) {
    return unavailable('engine_unavailable')
  }
  if (!decideEngineGate({
    engine: quality, plan: input.tier, profileCreatedAt: input.profileCreatedAt,
  }).allowed) {
    return unavailable('engine_access_unconfirmed')
  }
  const seconds = input.seconds
  if (typeof seconds !== 'number' || !Number.isFinite(seconds) || !Number.isInteger(seconds) || seconds <= 0) {
    return unavailable('unknown_duration')
  }
  if (!supportedDurationsFor(engine, { curtas: DURACOES_CURTAS_PUBLIC }).includes(seconds)
    || (engine === 'seedance' && seconds === 15 && !SEEDANCE_15S_PUBLIC)) {
    return unavailable('duration_unavailable')
  }
  // A monthly subscription always uses paid costs; the free first-film grant
  // must never inflate this calculation (notably Kineo 1's free cost of zero).
  const creditsPerFilm = creditCostForDuration(quality as Quality, true, seconds)
  if (!Number.isSafeInteger(monthlyCredits) || monthlyCredits <= 0
    || !Number.isSafeInteger(creditsPerFilm) || creditsPerFilm <= 0) {
    return unavailable('invalid_cost')
  }
  const filmsPerMonth = Math.floor(monthlyCredits / creditsPerFilm)
  if (filmsPerMonth < 1) {
    return { status: 'unavailable', reason: 'insufficient_monthly_credits', monthlyCredits, creditsPerFilm }
  }
  return {
    status: 'ready', tier: input.tier, monthlyCredits, quality: quality as Quality,
    seconds, engineName: engine === 'fast' ? 'Kineo 1' : nomePublicoDoMotor(engine),
    creditsPerFilm, filmsPerMonth,
  }
}
