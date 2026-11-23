import { contaDaCasaExata } from '@/lib/internalAccounts'

export type CitationPagesRelease = 'off' | 'internal' | 'public'
// New URLs require the owner's photo approval before public activation.
export const CITATION_PAGES_RELEASE: CitationPagesRelease = 'off'
export const CITATION_PAGES_REVIEWED_ISO = '2026-11-23'
export const CITATION_DRAFT_SLUGS = ['cartoon-videos', 'animated-story-videos', 'animal-story-videos'] as const
export function isCitationDraftSlug(slug: string): boolean { return (CITATION_DRAFT_SLUGS as readonly string[]).includes(slug) }
export function citationPageVisible(user: { email?: string | null; email_confirmed_at?: string | null } | null, release: CitationPagesRelease = CITATION_PAGES_RELEASE): boolean {
  return release === 'public' || (release === 'internal' && !!user?.email_confirmed_at && contaDaCasaExata(user.email))
}
