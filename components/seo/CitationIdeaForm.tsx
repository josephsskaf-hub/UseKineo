'use client'

import { useEffect, useRef, useState } from 'react'
import TextToVideoIntentForm from '@/app/text-to-video-shorts/TextToVideoIntentForm'
import { CITATION_IDEA_RELEASE } from '@/lib/growth/citationIdeaRelease'
import { citationIdeaServerVisible } from '@/lib/growth/citationIdeaVisibilityClient'

type VerifiedUser = { id?: string; email?: string | null; email_confirmed_at?: string | null }

export default function CitationIdeaForm({ article }: { article: 'best' | 'pay' }) {
  const [user, setUser] = useState<VerifiedUser | null>(null)
  const [accessGranted, setAccessGranted] = useState(false)
  const verified = useRef<VerifiedUser | null>(null)
  const [draftVersion, setDraftVersion] = useState(0)
  useEffect(() => {
    if (CITATION_IDEA_RELEASE !== 'internal') return
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
          const allowed = await citationIdeaServerVisible(next.id)
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

  if (CITATION_IDEA_RELEASE !== 'public' && !(CITATION_IDEA_RELEASE === 'internal' && accessGranted)) return null
  return (
    <aside data-kineo="citation-idea-2311" aria-label="Start from your idea or finished script">
      <TextToVideoIntentForm key={`${user?.id ?? 'public'}:${draftVersion}`} formId={`citation-idea-${article}-2311`} campaign={`citation_idea_${article}_2311`} placement="article_intro_2311" preserveHandoffForSignedIn />
    </aside>
  )
}
