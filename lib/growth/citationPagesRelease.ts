export type CitationPagesRelease = 'off' | 'internal' | 'public'
// Owner approved public release on 24/11 ("Liga hoje") after the internal check in production.
export const CITATION_PAGES_RELEASE: CitationPagesRelease = 'public'
export const CITATION_PAGES_REVIEWED_ISO = '2026-11-23'
export const CITATION_DRAFT_SLUGS = ['cartoon-videos', 'animated-story-videos', 'animal-story-videos'] as const
export const CITATION_TOOLS_RELEASE: CitationPagesRelease = 'off'
export const CITATION_TOOL_DRAFT_SLUGS = ["urdu-story-videos","urdu-moral-story-videos","german-faceless-shorts","portuguese-story-shorts","bedtime-story-videos","moral-story-shorts","scary-story-shorts","history-fact-shorts","animal-fable-videos","cartoon-youtube-shorts"] as const
export function citationReleaseForSlug(slug: string): CitationPagesRelease {
  return (CITATION_TOOL_DRAFT_SLUGS as readonly string[]).includes(slug) ? CITATION_TOOLS_RELEASE : CITATION_PAGES_RELEASE
}
export function isCitationDraftSlug(slug: string): boolean {
  return (CITATION_DRAFT_SLUGS as readonly string[]).includes(slug) || (CITATION_TOOL_DRAFT_SLUGS as readonly string[]).includes(slug)
}

/** Internal previews use request cookies without changing the public route's static policy. */
export function citationFormatPreviewPath(pathname: string): string | null {
  const prefix = '/ai-video-generator/for/'
  if (!pathname.startsWith(prefix)) return null
  const slug = pathname.slice(prefix.length)
  if (citationReleaseForSlug(slug) !== 'internal') return null
  return isCitationDraftSlug(slug) ? '/internal/citation-formats/' + slug : null
}
