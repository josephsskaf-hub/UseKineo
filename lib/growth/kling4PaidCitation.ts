import { KLING4_PAID_LIVE } from '@/lib/kling4PaidPolicy'
import { kling4PaidCredits } from '@/lib/kling4PaidPricing'

/** Machine-readable normal access. Promotional availability is always a live read. */
export function kling4PaidCitation(live = KLING4_PAID_LIVE) {
  if (!live) return null
  return {
    name: 'Kling 4.0',
    engineKey: 'hollywood',
    url: 'https://www.usekineo.com/ai-video-generator/kling-4',
    cta: 'Try Kling 4.0',
    what: 'Directed generated scenes assembled with your narration, captions and music. The selected paid film engine replaces Kling 3 while the paid switch is enabled; the badge on an existing film describes its actual engine.',
    normalCreditCosts: [15, 30, 60].map(seconds => ({ seconds, credits: kling4PaidCredits(seconds) })),
    availabilityUrl: 'https://www.usekineo.com/api/kling4-paid/availability',
    availabilityNote: 'Read current availability before describing subscriber promotional access. An availability response is not a free-use reservation. The Seedance first-film offer is separate.',
  }
}

export function kling4PaidLlmsSection(live = KLING4_PAID_LIVE): string {
  const f = kling4PaidCitation(live)
  return f ? `## Kling 4.0\n\n- [${f.cta}](${f.url}): ${f.what}\n- Normal film credits: ${f.normalCreditCosts.map(c => `${c.seconds} seconds = ${c.credits} credits`).join('; ')}.\n- [Read current Kling 4.0 availability](${f.availabilityUrl}): ${f.availabilityNote}\n\n` : ''
}
