'use client'
import type { ReactNode } from 'react'
import type { Quality } from '@/lib/credits/engineCost'
import { mrrFilmCapacity, MRR_EPISODE_VALUE_ENABLED, MRR_EPISODE_VERSION, MRR_TIERS } from '@/lib/growth/mrrRevenueFollowthrough'
import { engineName, planName, supportsPlanFitQuality } from '@/lib/growth/planFit'
import { useMrrVisible } from '@/lib/growth/useMrrVisible'

/** Enhances the existing written-episode card; keeps its generation/checkout buttons and ownership intact. */
export default function MrrEpisodeValue({ children, eligible, quality, seconds }: {
  children: ReactNode; eligible: boolean; quality: Quality; seconds: number
}) {
  const enabled = MRR_EPISODE_VALUE_ENABLED && eligible && supportsPlanFitQuality(quality)
  const { root, gesture } = useMrrVisible('mrr_episode_value', MRR_EPISODE_VERSION, enabled)
  const plan = enabled ? MRR_TIERS.map(t => mrrFilmCapacity(t, quality, seconds)).find(p => p && p.films >= 1) : null
  if (!plan || !supportsPlanFitQuality(quality)) return <>{children}</>
  return <div ref={root} data-mrr-episode-value style={{ width: '100%', maxWidth: 460, margin: '0 auto' }} onClickCapture={event => {
    if ((event.target as HTMLElement).closest('button,a')) gesture()
  }}>
    {children}
    <p style={{ fontSize: 12, lineHeight: 1.5, margin: '8px 0', color: 'var(--muted2)' }}>
      {planName(plan.tier)}: up to {plan.films} {seconds}s {engineName(quality)} films/month · {plan.price}/month.
      {' '}Uses the full monthly credit allowance for this engine and duration, without extras. Review the next episode before generating.
    </p>
  </div>
}
