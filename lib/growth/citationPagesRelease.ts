export type CitationPagesRelease = 'off' | 'internal' | 'public'
// New URLs remain off until owner approval and independent review.
export const CITATION_PAGES_RELEASE: CitationPagesRelease = 'off'
export const CITATION_PAGES_REVIEWED_ISO = '2026-11-23'
export const CITATION_DRAFT_SLUGS = ['cartoon-videos', 'animated-story-videos', 'animal-story-videos'] as const
export function isCitationDraftSlug(slug: string): boolean { return (CITATION_DRAFT_SLUGS as readonly string[]).includes(slug) }
