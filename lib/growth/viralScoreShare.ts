export const VIRAL_SCORE_SHARE_VARIANT = 'viral_score_scorecard_share_v1' as const
export const VIRAL_SCORE_SHARE_SOURCE = 'viral_score_result' as const
export const VIRAL_SCORE_SHARE_MEDIUM = 'referral' as const
export const VIRAL_SCORE_SHARE_CAMPAIGN = 'viral_score_scorecard_share_v1' as const

export type ViralScoreShareNumbers = {
  overall: number
  hook: number
  trend: number
  retention: number
  share: number
}

function boundedInteger(value: number, minimum: number, maximum: number): number {
  if (!Number.isFinite(value)) return minimum
  return Math.min(maximum, Math.max(minimum, Math.round(value)))
}

export function viralScoreShareScoreBand(overall: number): number {
  const safe = boundedInteger(overall, 0, 100)
  return Math.floor(safe / 10) * 10
}

/**
 * Builds a closed scorecard from numbers only. The caller cannot accidentally
 * expose the visitor's idea, verdict or model-generated tips.
 */
export function buildViralScoreShareAsset(input: ViralScoreShareNumbers) {
  const score = {
    overall: boundedInteger(input.overall, 0, 100),
    hook: boundedInteger(input.hook, 0, 10),
    trend: boundedInteger(input.trend, 0, 10),
    retention: boundedInteger(input.retention, 0, 10),
    share: boundedInteger(input.share, 0, 10),
  }
  const url = new URL('https://www.usekineo.com/viral-score')
  url.searchParams.set('utm_source', VIRAL_SCORE_SHARE_SOURCE)
  url.searchParams.set('utm_medium', VIRAL_SCORE_SHARE_MEDIUM)
  url.searchParams.set('utm_campaign', VIRAL_SCORE_SHARE_CAMPAIGN)
  const text = [
    `My Shorts idea scored ${score.overall}/100 on Kineo.`,
    `Hook ${score.hook}/10 · Trend ${score.trend}/10 · Retention ${score.retention}/10 · Shareability ${score.share}/10.`,
    'Can yours beat it?',
  ].join(' ')
  return {
    title: 'My Kineo Viral Score',
    text,
    url: url.toString(),
    clipboardText: `${text}\n${url.toString()}`,
    scoreBand: viralScoreShareScoreBand(score.overall),
  }
}

export function viralScoreShareEventMetadata(
  method: 'native' | 'clipboard',
  scoreBand: number,
) {
  return {
    variant: VIRAL_SCORE_SHARE_VARIANT,
    method,
    score_band: viralScoreShareScoreBand(scoreBand),
  }
}

export type ViralScoreShareTransport = {
  share?: (payload: { title: string; text: string; url: string }) => Promise<void>
  clipboard?: { writeText: (value: string) => Promise<void> }
}

export type ViralScoreShareOutcome = 'native' | 'clipboard' | 'cancelled' | 'manual'

export async function requestViralScoreShare(
  asset: ReturnType<typeof buildViralScoreShareAsset>,
  transport: ViralScoreShareTransport,
): Promise<ViralScoreShareOutcome> {
  if (typeof transport.share === 'function') {
    try {
      await transport.share({ title: asset.title, text: asset.text, url: asset.url })
      return 'native'
    } catch (error) {
      if (typeof error === 'object' && error !== null && 'name' in error && error.name === 'AbortError') {
        return 'cancelled'
      }
    }
  }
  if (typeof transport.clipboard?.writeText === 'function') {
    try {
      await transport.clipboard.writeText(asset.clipboardText)
      return 'clipboard'
    } catch {
      // Manual selection remains available below.
    }
  }
  return 'manual'
}
