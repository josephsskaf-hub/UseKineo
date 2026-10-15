// KINEO-DEMO-SOB-MEDIDA-1510 — /admin/demo: a máquina de demo sob medida do B2B (regras em lib/ads/demoSobMedida.ts).
// Portão igual a todo /admin/*: sessão por cookie + ADMIN_EMAILS no servidor, ANTES de qualquer dado. O cliente fala só com
// /api/admin/demo (o mesmo portão lá, e a conta da casa no POST).
import { createClient } from '@/lib/supabase/server'
import { isAdminEmail } from '@/app/api/admin/_shared/db'
import DemoClient from './DemoClient'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const metadata = { title: 'Admin · Demo sob medida', robots: { index: false, follow: false } }

export default async function AdminDemoPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !isAdminEmail(user.email)) return <DemoClient denied />
  return <DemoClient />
}
