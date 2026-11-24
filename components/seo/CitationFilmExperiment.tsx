'use client'

import { createContext, useContext, useEffect, useRef, useState, Fragment, type ReactNode } from 'react'
import { CITATION_FILM_RELEASE } from '@/lib/growth/citationFilmRelease'
import { citationFilmServerVisible } from '@/lib/growth/citationFilmVisibilityClient'

type VerifiedUser = { id?: string; email?: string | null; email_confirmed_at?: string | null }

const FILM_LAYOUT = `@media(max-width:640px){
main:has([data-citation-film-controls-2411])[style*="padding:64px"]{padding-top:24px!important}
main:has([data-citation-film-controls-2411])>div[style*="max-width"][style*="padding:64px"],
main:has([data-citation-film-controls-2411])>div[style*="max-width"][style*="padding:48px"]{padding-top:24px!important}
}`

const Context = createContext({ enabled: false, draftKey: 'public:0' })

export default function CitationFilmExperiment({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<VerifiedUser | null>(null)
  const [accessGranted, setAccessGranted] = useState(false)
  const verified = useRef<VerifiedUser | null>(null)
  const [draftVersion, setDraftVersion] = useState(0)
  useEffect(() => {
    if (CITATION_FILM_RELEASE !== 'internal') return
    let active = true
    let generation = 0
    let unsubscribe = () => {}
    // Only private previews bind a draft to a verified account; public guest handoff is unchanged.
    void import('@/lib/supabase/client').then(({ createClient }) => {
      if (!active) return
      const client = createClient()
      function forgetDraft() {
        verified.current = null
        setUser(null)
        setAccessGranted(false)
        setDraftVersion(value => value + 1)
      }
      async function verify(expectedId?: string) {
        const current = ++generation
        try {
          const { data, error } = await client.auth.getUser()
          if (!active || current !== generation) return
          const next = error ? null : data.user
          if (!next?.id || (expectedId && next.id !== expectedId)) {
            forgetDraft()
            return
          }
          const allowed = await citationFilmServerVisible(next.id)
          if (!active || current !== generation) return
          if (!allowed) {
            forgetDraft()
            return
          }
          const previous = verified.current
          if (previous && (previous.id !== next.id || previous.email?.trim().toLowerCase() !== next.email?.trim().toLowerCase())) forgetDraft()
          verified.current = next
          setUser(next)
          setAccessGranted(true)
        } catch {
          if (active && current === generation) forgetDraft()
        }
      }
      void verify()
      const { data: { subscription } } = client.auth.onAuthStateChange((event, session) => {
        if (!active) return
        const hint = session?.user
        if (event === 'SIGNED_OUT' || !hint?.id) {
          generation++
          forgetDraft()
          return
        }
        // A session event may preserve existing access, never grant new access without getUser.
        if (verified.current?.id !== hint.id) forgetDraft()
        void verify(hint.id)
      })
      unsubscribe = () => subscription.unsubscribe()
    }).catch(() => { if (active) { verified.current = null; setUser(null); setAccessGranted(false); setDraftVersion(value => value + 1) } })
    return () => { active = false; generation++; unsubscribe() }
  }, [])

  const enabled = CITATION_FILM_RELEASE === 'public' || (CITATION_FILM_RELEASE === 'internal' && accessGranted)
  return <Context.Provider value={{ enabled, draftKey: `${user?.id ?? 'public'}:${draftVersion}` }}>{enabled ? <style data-citation-film-layout-2411="" dangerouslySetInnerHTML={{ __html: FILM_LAYOUT }} /> : null}{children}</Context.Provider>
}

// Both positions share one decision: never two forms, including during auth revalidation.
export function CitationFilmSlot({ active, children }: { active: boolean; children: ReactNode }) {
  const state = useContext(Context)
  if (state.enabled !== active) return null
  return <Fragment key={state.draftKey}>{children}</Fragment>
}

export function useCitationFilmExperiment() { return useContext(Context) }

export function CitationFilmDraftScope({ children }: { children: ReactNode }) {
  const { draftKey } = useContext(Context)
  return <Fragment key={draftKey}>{children}</Fragment>
}
