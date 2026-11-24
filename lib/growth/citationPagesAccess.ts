import { contaDaCasaExata } from '@/lib/internalAccounts'
import { CITATION_PAGES_RELEASE, type CitationPagesRelease } from './citationPagesRelease'
export { CITATION_PAGES_RELEASE, CITATION_PAGES_REVIEWED_ISO, CITATION_DRAFT_SLUGS, isCitationDraftSlug, type CitationPagesRelease } from './citationPagesRelease'

// Server authorization only. Public configuration lives in citationPagesRelease.
export function citationPageVisible(user: { email?: string | null; email_confirmed_at?: string | null } | null, release: CitationPagesRelease = CITATION_PAGES_RELEASE): boolean {
  return release === 'public' || (release === 'internal' && !!user?.email_confirmed_at && contaDaCasaExata(user.email))
}
