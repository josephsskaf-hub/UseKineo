import { PLANS } from '@/lib/pricing'
import { creditCostForDuration, DURATION_REFERENCE_SECONDS, type Quality } from '@/lib/credits/engineCost'
import { enginePaused } from '@/lib/engineLaunch'

export const SORA_API_SHUTDOWN = 'Sora 2 shut down on September 24, 2026'
export const SORA_API_SOURCE = 'https://developers.openai.com/api/docs/deprecations'
export const SORA_REPLACEMENTS = ([
  { name: 'Seedance 1.5', quality: 'cinematic_ai', key: 'seedance' },
  { name: 'Kling 3', quality: 'cinematic_hollywood', key: 'hollywood' },
  { name: 'Veo 3.1', quality: 'cinematic_veo', key: 'veo' },
  { name: 'Omni Flash', quality: 'cinematic_omni', key: 'omni' },
] as const).map(engine => {
  const credits = creditCostForDuration(engine.quality as Quality, true, DURATION_REFERENCE_SECONDS)
  return { ...engine, credits, paused: enginePaused(engine.key),
    // Allocated monthly credit value, NOT a new one-off film price.
    allocatedUsd: credits * PLANS.pro.price / PLANS.pro.credits }
})
