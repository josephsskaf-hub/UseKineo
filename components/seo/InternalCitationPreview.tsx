import type { ReactNode } from 'react'
import { notFound } from 'next/navigation'
import { citationPageVisible } from '@/lib/growth/citationPagesAccess'

// Server-only boundary: getUser verifies the cookie; client-provided e-mail is never accepted.
export default async function InternalCitationPreview({ children }: { children: ReactNode }) {
  let user = null
  try {
    const { createClient } = await import('@/lib/supabase/server')
    const { data, error } = await createClient().auth.getUser()
    if (!error) user = data.user
  } catch { /* Authentication unavailable: closed. */ }
  if (!citationPageVisible(user, 'internal')) notFound()
  return children
}
