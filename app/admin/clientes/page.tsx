// KINEO-ADMIN-JORNADA-1510 — a aba "Clientes" da página principal do /admin (também /admin?aba=clientes).
// Portão idêntico a toda tela /admin: sessão por cookie + allowlist isAdminEmail, no servidor, ANTES de criar o cliente
// service role ou ler qualquer linha. Só leitura (lib/admin/clientesJornada.ts não grava nada).
import { createClient } from '@/lib/supabase/server'
import { isAdminEmail, serviceClient } from '@/app/api/admin/_shared/db'
import { carregarClientes } from '@/lib/admin/clientesJornada'
import { lerParametros } from '@/lib/admin/clientesJornadaRegras'
import AdminAbas from '@/components/admin/AdminAbas'
import ClientesJornada from '@/components/admin/ClientesJornada'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'
export const runtime = 'nodejs'

export default async function AdminClientesPage({ searchParams }: { searchParams?: Record<string, string | string[] | undefined> }) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const email = user?.email?.toLowerCase() ?? ''
  if (!user || !isAdminEmail(email)) {
    return <div style={{ padding: 40, color: 'var(--text2)' }}>403</div>
  }
  const admin = serviceClient()
  if (!admin) return <div style={{ padding: 40, color: 'var(--text2)' }}>service unavailable</div>

  const pagina = await carregarClientes(admin, lerParametros(searchParams))
  return (
    <>
      <AdminAbas atual="clientes" />
      <ClientesJornada pagina={pagina} />
    </>
  )
}
