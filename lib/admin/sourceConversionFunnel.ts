export type SourceConversionProfile = {
  id: string
  source: string
}

export type SourceConversionRow = {
  source: string
  signups: number
  completedVideos: number
  checkoutAfterVideo: number
  paidAfterCheckout: number
  signupToVideoRate: string
  videoToCheckoutRate: string
  checkoutToPaidRate: string
}

function pct(numerator: number, denominator: number): string {
  if (denominator <= 0) return '—'
  return `${((numerator / denominator) * 100).toFixed(1)}%`
}

/**
 * Person-level, nested source journey.
 *
 * A checkout is counted here only when the same source-attributed person also
 * has a completed video. A payment is counted only when that person is in both
 * earlier stages. The intersections keep the displayed path monotonic without
 * pretending that unrelated row totals form a causal funnel.
 */
export function buildSourceConversionFunnel(
  profiles: SourceConversionProfile[],
  completedVideoUserIds: ReadonlySet<string>,
  checkoutUserIds: ReadonlySet<string>,
  paidUserIds: ReadonlySet<string>,
): SourceConversionRow[] {
  const uniqueProfiles = new Map<string, SourceConversionProfile>()
  for (const profile of profiles) {
    if (!profile.id || uniqueProfiles.has(profile.id)) continue
    uniqueProfiles.set(profile.id, profile)
  }

  const bySource = new Map<string, Omit<SourceConversionRow,
    'signupToVideoRate' | 'videoToCheckoutRate' | 'checkoutToPaidRate'>>()

  for (const profile of uniqueProfiles.values()) {
    const source = profile.source || 'direct'
    let row = bySource.get(source)
    if (!row) {
      row = {
        source,
        signups: 0,
        completedVideos: 0,
        checkoutAfterVideo: 0,
        paidAfterCheckout: 0,
      }
      bySource.set(source, row)
    }

    row.signups += 1
    if (!completedVideoUserIds.has(profile.id)) continue
    row.completedVideos += 1
    if (!checkoutUserIds.has(profile.id)) continue
    row.checkoutAfterVideo += 1
    if (paidUserIds.has(profile.id)) row.paidAfterCheckout += 1
  }

  return Array.from(bySource.values())
    .map((row) => ({
      ...row,
      signupToVideoRate: pct(row.completedVideos, row.signups),
      videoToCheckoutRate: pct(row.checkoutAfterVideo, row.completedVideos),
      checkoutToPaidRate: pct(row.paidAfterCheckout, row.checkoutAfterVideo),
    }))
    .sort((a, b) => b.signups - a.signups || a.source.localeCompare(b.source))
}
