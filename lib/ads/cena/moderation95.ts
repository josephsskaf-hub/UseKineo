// KINEO-ADS-CENA-95-PACING-2110 — request-local memoization, never an approval token in body/DB.
import type { moderateContent } from '@/lib/safety/contentModeration'
import type { ModerationVerdict } from '@/lib/safety/contentModeration'
type Moderate = typeof moderateContent
export function memoCena95Moderation(moderate: Moderate): Moderate {
  const cache = new Map<string, ReturnType<Moderate>>()
  return args => {
    const key = JSON.stringify([args.surface, args.stage, args.userId, args.text ?? null, args.imageUrls ?? [], args.omitEvidenceText ?? false])
    let pending = cache.get(key)
    if (!pending) { pending = Promise.resolve().then(() => moderate(args)); cache.set(key, pending) }
    return pending
  }
}
export function cena95ModerationFailure(verdict: boolean | ModerationVerdict): { error: string; status: number } | null {
  if (verdict === true || typeof verdict === 'object' && verdict.ok) return null
  if (verdict === false) return { error: 'moderation', status: 422 }
  return { error: verdict.reason === 'blocked' ? 'moderation' : `moderation_${verdict.reason}`, status: verdict.reason === 'unavailable' ? 503 : 422 }
}
