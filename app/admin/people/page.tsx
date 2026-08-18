// KINEO-ADMIN-PEOPLE-2026-08-18 — gate idêntico a toda tela /admin: sessão por
// cookie + allowlist ADMIN_EMAILS, verificado server-side antes de qualquer
// dado. O client busca /api/admin/people (mesmo gate lá).
import { createClient } from '@/lib/supabase/server'
import { isAdminEmail } from '@/app/api/admin/_shared/db'
import PeopleClient from './PeopleClient'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export default async function AdminPeoplePage() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const email = user?.email?.toLowerCase() ?? ''
  if (!user || !isAdminEmail(email)) {
    return <PeopleClient denied />
  }
  return <PeopleClient />
}
