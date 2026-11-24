export type CitationPagesRelease = 'off' | 'internal' | 'public'
// Owner approved public release on 24/11 ("Liga hoje") after the internal check in production.
export const CITATION_PAGES_RELEASE: CitationPagesRelease = 'public'
export const CITATION_PAGES_REVIEWED_ISO = '2026-11-23'
export const CITATION_DRAFT_SLUGS = ['cartoon-videos', 'animated-story-videos', 'animal-story-videos'] as const
export const CITATION_TOOL_DRAFT_SLUGS = ["urdu-story-videos","urdu-moral-story-videos","german-faceless-shorts","portuguese-story-shorts","bedtime-story-videos","moral-story-shorts","scary-story-shorts","history-fact-shorts","animal-fable-videos","cartoon-youtube-shorts"] as const
export function isCitationDraftSlug(slug: string): boolean { return [...CITATION_DRAFT_SLUGS,...CITATION_TOOL_DRAFT_SLUGS].includes(slug as typeof CITATION_DRAFT_SLUGS[number]) }

/** Internal previews use request cookies without changing the public route's static policy. */
export function citationFormatPreviewPath(pathname: string): string | null {
  if (CITATION_PAGES_RELEASE !== 'internal') return null
  const prefix = '/ai-video-generator/for/'
  if (!pathname.startsWith(prefix)) return null
  const slug = pathname.slice(prefix.length)
  return isCitationDraftSlug(slug) ? '/internal/citation-formats/' + slug : null
}
