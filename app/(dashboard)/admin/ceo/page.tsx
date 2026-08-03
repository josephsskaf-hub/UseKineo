// Push #298 — CEO Dashboard page (server component + SSR seed).
// KINEO-ADMIN-CEO-2026-08-03 — the 130 lines of duplicated aggregation that
// used to live here are gone; both this page and /api/admin/ceo now call
// computeCeoData(). /admin renders the exact same screen.

import { createClient } from '@/lib/supabase/server'
import { isAdminEmail } from '@/app/api/admin/_shared/db'
import { computeCeoData } from '@/app/api/admin/ceo/compute'
import CeoClient from './CeoClient'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export default async function AdminCeoPage() {
  const cookieClient = createClient()
  const {
    data: { user },
  } = await cookieClient.auth.getUser()
  const email = user?.email?.toLowerCase() ?? ''
  if (!user || !isAdminEmail(email)) {
    return <CeoClient denied />
  }

  const data = await computeCeoData()
  return <CeoClient data={data ?? undefined} viewerEmail={email} />
}
