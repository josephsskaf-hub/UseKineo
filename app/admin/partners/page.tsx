// KINEO-PARTNERS-PACOTE-2026-10-03 — /admin/partners: gate idêntico a toda tela /admin (sessão + ADMIN_EMAILS no
// servidor); o client busca /api/admin/partners (mesmo gate lá).
import { createClient } from '@/lib/supabase/server'
import { isAdminEmail } from '@/app/api/admin/_shared/db'
import PartnersClient from './PartnersClient'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export default async function AdminPartnersPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !isAdminEmail(user.email)) return <PartnersClient denied />
  return <PartnersClient />
}
