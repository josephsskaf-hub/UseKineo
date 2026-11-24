import { contaDaCasaExata } from '@/lib/internalAccounts'
import { CITATION_IDEA_RELEASE, type CitationIdeaRelease } from './citationIdeaRelease'

export { CITATION_IDEA_RELEASE, type CitationIdeaRelease } from './citationIdeaRelease'

// Server-side authorization: never import this module from a client dependency.
export function citationIdeaVisible(user: { email?: string | null; email_confirmed_at?: string | null } | null, release: CitationIdeaRelease = CITATION_IDEA_RELEASE): boolean {
  return release === 'public' || (release === 'internal' && !!user?.email_confirmed_at && contaDaCasaExata(user.email))
}
