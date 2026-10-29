import { KLING4_TRIAL_LIVE } from '@/lib/kling4TrialPolicy'

export const KLING4_TRIAL_NOTICE_COPY = 'First film free — made with Kling 4.0'
export const KLING4_TRIAL_NOTICE_REFRESH_MS = 15_000

/** A short server lease, not a cached promise of capacity. Unknown, expired or malformed state hides the copy. */
export function kling4TrialNoticeVisible(state: unknown, now: number, live = KLING4_TRIAL_LIVE): boolean {
  if (!live || !state || typeof state !== 'object' || !Number.isFinite(now)) return false
  const s = state as Record<string, unknown>
  if (s.available !== true || typeof s.utcDay !== 'string' || typeof s.checkedAt !== 'string' || typeof s.validUntil !== 'string') return false
  const checked = Date.parse(s.checkedAt), until = Date.parse(s.validUntil)
  if (!Number.isFinite(checked) || !Number.isFinite(until) || checked > now || until <= now || until <= checked) return false
  return until - checked <= KLING4_TRIAL_NOTICE_REFRESH_MS &&
    s.utcDay === new Date(now).toISOString().slice(0, 10) &&
    s.utcDay === new Date(checked).toISOString().slice(0, 10) &&
    until <= Date.parse(`${s.utcDay}T00:00:00.000Z`) + 86_400_000
}
