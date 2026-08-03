// KINEO-ADMIN-CEO-2026-08-03 — /admin/leads: where the Hot Leads table from
// the rejected Admin HQ page (commit 30cd789) now lives.
//
// It was the one genuinely useful block on that page, but it is a long table
// and the founder wants /admin short, so it moved here and the CEO home links
// to it from the checkout-leak banner.
//
// Two lists, both "someone who wants to pay and hasn't":
//   1. Heavy free users — ≥5 downloads or ≥1 unlock click, still on free.
//   2. Abandoned Stripe checkouts — expired sessions, freshest first.
//
// Access gate: cookie session + ADMIN_EMAILS, server-side, before render.

import { createClient } from '@/lib/supabase/server'
import { isAdminEmail } from '@/app/api/admin/_shared/db'
import LeadsClient from './LeadsClient'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export default async function AdminLeadsPage() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user || !isAdminEmail(user.email)) {
    return <LeadsClient denied />
  }
  return <LeadsClient />
}
