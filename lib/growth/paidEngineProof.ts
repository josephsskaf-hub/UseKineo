import { getTierPrice, formatCheckoutMoney, TIER_CREDITS } from '../checkoutPricing'
import { creditCostForDuration, type Quality } from '../credits/engineCost'
import { MARKETING_REFERENCE_SECONDS } from '../marketingPrice'
import { PUBLIC_ENGINE_EXAMPLES } from '../publicExamples'

// Existing canonical routes. Never apply to Kineo 1 or change engine access.
export const PAID_ENGINE_PROOF = {
  seedance: { quality: 'cinematic_ai', ids: ['a88b7564-3592-4b12-9560-1646ea998e78', '86653d2d-8d31-4937-8d98-e56c50706fd2'] },
  veo: { quality: 'cinematic_veo', ids: ['98a5ac54-3c28-4a8f-8ba2-4071bc0388c4', 'dc0fe3a6-f34d-40cb-91f4-da15841a2970'] },
  kling: { quality: 'cinematic_kling', ids: ['c4e4fbab-0978-4daa-9fcf-119096370210', '26d25419-6719-47ab-b24b-df214e007fbd'] },
  // Historical EXAMPLES_BEST IDs lack the current public ownership allow-list.
  // These newer house samples are explicitly authorized for this same engine.
  'kling-3': { quality: 'cinematic_hollywood', ids: ['7efd12b8-925b-46d2-b68e-c6095cd3e92e', '94d551a3-fe7a-4903-8c2b-f252bed39c4c'] },
} satisfies Record<string, { quality: Quality; ids: string[] }>

export function paidEngineBudget(slug: string) {
  if (!Object.hasOwn(PAID_ENGINE_PROOF, slug)) return null
  const config = PAID_ENGINE_PROOF[slug as keyof typeof PAID_ENGINE_PROOF]
  const seconds = MARKETING_REFERENCE_SECONDS
  const cost = creditCostForDuration(config.quality, true, seconds)
  if (!Number.isFinite(cost) || cost <= 0) return null
  const tier = Math.floor(TIER_CREDITS.starter / cost) >= 1 ? 'starter' : 'basic'
  const films = Math.floor(TIER_CREDITS[tier] / cost)
  if (films < 1) return null
  return { tier, label: tier === 'starter' ? 'Starter' : 'Creator', films, seconds, cost,
    price: formatCheckoutMoney('usd', getTierPrice(tier, 'usd', 'standard')) }
}

export function paidEngineExamples(slug: string, badge: string) {
  if (!Object.hasOwn(PAID_ENGINE_PROOF, slug)) return []
  const config = PAID_ENGINE_PROOF[slug as keyof typeof PAID_ENGINE_PROOF]
  return config.ids.flatMap(id => {
    const example = PUBLIC_ENGINE_EXAMPLES.find(v => v.id === id && v.engine === config.quality && v.ownershipEvidence === 'founder_confirmed_owned')
    return example ? [{ id, title: example.title, engine: example.engine, badge,
      videoUrl: example.videoPath, posterUrl: `/posters/${id}.jpg` }] : []
  })
}
