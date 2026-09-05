import { buildSeriesContinuationHref, type SeriesContinuationSource } from '@/lib/seriesContinuation'
import { resolveActivationCreationContract } from '@/lib/creationHandoff'

// UX adapter only. The canonical series writer and email links remain owned
// by Claude. Handles TOPIC links in Studio, home, archives and ready notice, not
// the already-authored episode or any render/retry/credit contract.
const VERSION = 'topic-v1'
const SOURCES = ['studio_milestone', 'studio_video_tile', 'landing_resume_strip', 'history_milestone', 'history_video_card', 'library_video_card', 'render_pill'] as const
type StudioSeriesSource = typeof SOURCES[number]
type QueryReader = Pick<URLSearchParams, 'get'>

export function buildStudioSeriesReviewHref(
  topic: string | null | undefined,
  source: StudioSeriesSource,
): string {
  const legacy = buildSeriesContinuationHref(topic, source satisfies SeriesContinuationSource)
  if (!legacy.startsWith('/studio/create?')) return '/studio'
  const original = new URLSearchParams(legacy.slice('/studio/create?'.length))
  // Preserve the old composer's effective default, not Studio's 60s default.
  // The contract is pure; no activation or request happens here.
  const duration = resolveActivationCreationContract(original).duration
  const review = new URLSearchParams({
    prompt: original.get('prompt') ?? '',
    series: '1',
    continuation_source: source,
    studio_continuation: VERSION,
    script_mode: 'ai',
    engine: original.get('engine') || 'fast',
    duration: String(duration),
    intent_campaign: 'studio_series_review_v1',
  })
  return `/studio?${review.toString()}`
}

export function isStudioSeriesReview(params: QueryReader): boolean {
  return params.get('studio_continuation') === VERSION &&
    params.get('series') === '1' && Boolean(params.get('prompt')?.trim()) &&
    SOURCES.some((source) => source === params.get('continuation_source'))
}

export function carryStudioSeriesReview(params: QueryReader, target: URLSearchParams): void {
  if (!isStudioSeriesReview(params)) return
  // Carry attribution only. The person's current text, mode, duration and
  // engine in the editor win over the initial link after explicit Generate.
  target.set('series', '1')
  target.set('continuation_source', params.get('continuation_source')!)
}
