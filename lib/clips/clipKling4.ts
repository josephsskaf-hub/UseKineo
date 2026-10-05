// Kling 4: a catalog preparation, never a guessed provider/model/cost.
// Official source checked 2026-10-05: https://fal.ai/kling-4 (early access by contact).
// No public endpoint, schema or price has been verified. Existing dispatch/billing stays untouched.
import { CLIP_MIN_CREDITS, CREATOR_USD_PER_CREDIT, STUDIO_USD_PER_CREDIT } from './clipPricing'
import { MARKET_DISCOUNT, MARKET_MARGIN_FLOOR } from './clipPriceVsMarket'

export const KLING4_CLIPS_ENABLED = false
export interface Kling4Facts {
  provider: 'fal'
  modelId: string | null
  falUsdPerSecond: number | null
  falModelSource: string | null
  falCostSource: string | null
  verifiedOn: string | null
  schemaReviewed: boolean
  dispatchReviewed: boolean
  marketUsdPerSecond: number | null
  marketSource: string | null
  sameModelResolutionAndAudio: boolean
  samePriceShelf: boolean
}
export const KLING4_FACTS: Kling4Facts = {
  provider: 'fal',
  modelId: null,
  falUsdPerSecond: null,
  falModelSource: null,
  falCostSource: null,
  verifiedOn: null,
  schemaReviewed: false,
  dispatchReviewed: false,
  marketUsdPerSecond: null,
  marketSource: null,
  sameModelResolutionAndAudio: false,
  samePriceShelf: false,
}
const positive = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && value > 0
function officialFalSource(value: string | null, modelId: string | null): boolean {
  if (!value || !modelId) return false
  try {
    const url = new URL(value)
    const modelPath = '/models/' + modelId
    return url.protocol === 'https:' && url.hostname === 'fal.ai' && (url.pathname === modelPath || url.pathname.startsWith(modelPath + '/'))
  } catch { return false }
}
export function kling4Blockers(facts: Kling4Facts = KLING4_FACTS): string[] {
  const blockers: string[] = []
  if (facts.provider !== 'fal') blockers.push('provider_requires_founder')
  if (!facts.modelId || !/^[a-z0-9-]+\/[a-z0-9/-]+$/.test(facts.modelId)) blockers.push('real_model_id')
  if (!positive(facts.falUsdPerSecond)) blockers.push('real_fal_cost')
  if (!officialFalSource(facts.falModelSource, facts.modelId)) blockers.push('official_model_source')
  if (!officialFalSource(facts.falCostSource, facts.modelId)) blockers.push('official_cost_source')
  if (!facts.verifiedOn || !/^\d{4}-\d{2}-\d{2}$/.test(facts.verifiedOn) || !Number.isFinite(Date.parse(facts.verifiedOn))) blockers.push('verification_date')
  if (!facts.schemaReviewed) blockers.push('official_schema_review')
  if (!facts.dispatchReviewed) blockers.push('dispatch_guardian_review')
  if (!positive(facts.marketUsdPerSecond) || !facts.marketSource || !facts.sameModelResolutionAndAudio || !facts.samePriceShelf) blockers.push('comparable_market_quote')
  return blockers
}
export function assertKling4Launch(enabled = KLING4_CLIPS_ENABLED, facts = KLING4_FACTS): void {
  if (!enabled) return
  const blockers = kling4Blockers(facts)
  if (blockers.length) throw new Error('Kling 4 launch blocked: ' + blockers.join(', '))
}
// Flipping the switch alone fails module loading/build and the offline guardian, before any debit.
assertKling4Launch()

export const PREPARED_CLIP_ENGINES = {
  kling4: { key: 'kling4', label: 'Kling 4.0', provider: 'fal', enabled: KLING4_CLIPS_ENABLED, facts: KLING4_FACTS },
} as const

// Planning quote ONLY, using the existing clip rule and canonical credit ratios.
// It is not connected to debitVideoCredits or a public quote. No number is invented for production.
export function quotePreparedKling4(seconds: number, facts: Kling4Facts = KLING4_FACTS) {
  assertKling4Launch(true, facts)
  if (!Number.isInteger(seconds) || seconds <= 0) throw new Error('Kling 4: positive integer duration required')
  const round = (value: number, places: number) => Math.round(value * 10 ** places) / 10 ** places
  const falUsd = round(facts.falUsdPerSecond! * seconds, 4)
  const targetUsd = round((1 - MARKET_DISCOUNT) * facts.marketUsdPerSecond! * seconds, 6)
  const floorCredits = Math.ceil(round(falUsd / (STUDIO_USD_PER_CREDIT * (1 - MARKET_MARGIN_FLOOR)), 6))
  const targetCredits = Math.floor(round(targetUsd / CREATOR_USD_PER_CREDIT, 6))
  const credits = Math.max(CLIP_MIN_CREDITS, floorCredits, targetCredits)
  const status = floorCredits > targetCredits ? 'margin_floor' : CLIP_MIN_CREDITS > targetCredits ? 'house_minimum' : 'below_market'
  return { credits, falUsd, targetUsd, floorCredits, targetCredits, status, marginAtStudio: 1 - falUsd / (credits * STUDIO_USD_PER_CREDIT) }
}
