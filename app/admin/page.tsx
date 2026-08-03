// KINEO-ADMIN-HQ-2026-08-03 — Admin HQ (consolidated single screen).
//
// /admin used to be the Push #482 server overview (now kept verbatim at
// /admin/overview). The founder asked for ONE tighter screen instead of
// hopping between users/ceo/metrics/funnel, so this page is now a thin
// server gate around AdminHqClient: scoreboard → hot leads → compact
// funnel → full users table. All data comes from /api/admin/users (which
// paginates past 500 users and knows the real PAID_PLANS — same push).
// The old sub-pages (/admin/users, /admin/ceo, /admin/metrics,
// /admin/funnel, /admin/affiliates) still work and are linked in the footer.
//
// Access gate: identical to the /api/admin/* routes — cookie session +
// ADMIN_EMAILS allowlist, checked server-side before anything renders.

import { createClient } from '@/lib/supabase/server'
import AdminHqClient from './AdminHqClient'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const ADMIN_EMAILS = new Set([
  'josephsskaf@gmail.com',
  'josephskaf@gmail.com',
  'joseph-test@shortsforgeai.com',
])

export default async function AdminHqPage() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const email = user?.email?.toLowerCase() ?? ''
  if (!user || !ADMIN_EMAILS.has(email)) {
    return <AdminHqClient denied />
  }

  return <AdminHqClient viewerEmail={email} />
}
