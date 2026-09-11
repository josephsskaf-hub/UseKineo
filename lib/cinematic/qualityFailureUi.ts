/** Client presentation only. Financial authority stays with the server. */
export interface VideoQualityFailure {
  generationId: string
  reason: string
  refunded: boolean
  refundConfirmed: boolean
  claimReleased: boolean
  noDebit: boolean
  canEdit: boolean
  retryable: false
}

const safeGenerationId = (value: unknown): string =>
  typeof value === 'string' && /^[A-Za-z0-9_-]{8,100}$/.test(value) ? value : ''

export function parseVideoQualityFailure(value: unknown, expectedGenerationId?: string): VideoQualityFailure | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const data = value as Record<string, unknown>
  if (data.qualityCheckFailed !== true) return null
  const expected = safeGenerationId(expectedGenerationId)
  const received = safeGenerationId(data.generationId)
  const identityMatches = !!received && (!expected || expected === received)
  const refunded = identityMatches && data.refunded === true
  const refundConfirmed = identityMatches && data.refundConfirmed === true
  const claimReleased = identityMatches && data.claimReleased === true
  const noDebit = identityMatches && data.noDebit === true
  return {
    generationId: expected || received,
    reason: typeof data.reason === 'string' && /^[a-z0-9_:-]{1,80}$/i.test(data.reason) ? data.reason : 'quality_check_failed',
    refunded, refundConfirmed, claimReleased, noDebit,
    canEdit: noDebit || (refunded && refundConfirmed && claimReleased),
    retryable: false,
  }
}

/** Never clear another tab's newer generation, even under the same user key. */
export function qualityFailureOwnsSnapshot(failure: VideoQualityFailure, value: unknown): boolean {
  if (!failure.canEdit || !value || typeof value !== 'object' || Array.isArray(value)) return false
  const snapshot = value as Record<string, unknown>
  const payload = snapshot.composePayload
  return !!payload && typeof payload === 'object' && !Array.isArray(payload) &&
    (payload as Record<string, unknown>).generationId === failure.generationId
}
