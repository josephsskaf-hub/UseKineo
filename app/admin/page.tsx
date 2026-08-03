// KINEO-ADMIN-CEO-2026-08-03 — /admin is the CEO screen again.
//
// HISTORY, so nobody repeats it: commit 30cd789 turned /admin into a single
// long "Admin HQ" page (scoreboard → hot leads → funnel → the full 900-row
// users table) and moved the CEO view out of the way. The founder rejected it
// — the CEO screen is the one he actually uses, because it consolidates MRR
// and paying customers in one glance, and an infinite-scroll page buries that.
//
// So: /admin now renders the SAME CeoClient as /admin/ceo (one component, one
// computeCeoData(), zero duplicated logic) with `home` on, which adds the
// navigation cards. Everything long lives on its own screen:
//   · /admin/paying   — paying customers + MRR per plan   (new)
//   · /admin/leads    — hot leads (moved out of the HQ page) (new)
//   · /admin/users    — the full users table               (unchanged)
//   · /admin/overview — the Push #482 server overview      (unchanged)
//   · /admin/funnel · /admin/metrics · /admin/affiliates   (unchanged)
//
// Access gate: identical to every /api/admin/* route — cookie session +
// ADMIN_EMAILS allowlist, checked server-side before any data is fetched.

import { createClient } from '@/lib/supabase/server'
import { isAdminEmail } from '@/app/api/admin/_shared/db'
import { computeCeoData } from '@/app/api/admin/ceo/compute'
import CeoClient from '@/app/(dashboard)/admin/ceo/CeoClient'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export default async function AdminHomePage() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const email = user?.email?.toLowerCase() ?? ''
  if (!user || !isAdminEmail(email)) {
    return <CeoClient denied home />
  }

  const data = await computeCeoData()
  return <CeoClient data={data ?? undefined} viewerEmail={email} home />
}
