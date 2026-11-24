export type CitationPagesRelease = 'off' | 'internal' | 'public'
// New URLs remain off until owner approval and independent review.
export const CITATION_PAGES_RELEASE: CitationPagesRelease = 'internal'
export const CITATION_PAGES_REVIEWED_ISO = '2026-11-23'
export const CITATION_DRAFT_SLUGS = ['cartoon-videos', 'animated-story-videos', 'animal-story-videos'] as const
export function isCitationDraftSlug(slug: string): boolean { return (CITATION_DRAFT_SLUGS as readonly string[]).includes(slug) }

/** Internal previews use request cookies without changing the public route's static policy. */
export function citationFormatPreviewPath(pathname: string): string | null {
  if (CITATION_PAGES_RELEASE !== 'internal') return null
  const prefix = '/ai-video-generator/for/'
  if (!pathname.startsWith(prefix)) return null
  const slug = pathname.slice(prefix.length)
  return isCitationDraftSlug(slug) ? '/internal/citation-formats/' + slug : null
}
