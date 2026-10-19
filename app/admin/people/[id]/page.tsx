// KINEO-ADMIN-PESSOA-1910 — a TELA DA PESSOA: /admin/people/<id> (ou /admin/people/<e-mail>). Portão idêntico a toda tela
// /admin: sessão por cookie + allowlist isAdminEmail, no servidor, ANTES de criar o cliente service role ou ler qualquer linha.
// Tudo é montado no servidor (lib/admin/pessoaTela.ts, só leitura); o navegador recebe só o HTML pronto.
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { isAdminEmail, serviceClient } from '@/app/api/admin/_shared/db'
import { carregarTelaPessoa } from '@/lib/admin/pessoaTela'
import { lerChavePessoa } from '@/lib/admin/pessoaTelaRegras'
import PessoaTela from '@/components/admin/PessoaTela'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'
export const runtime = 'nodejs'

export default async function AdminPessoaPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const email = user?.email?.toLowerCase() ?? ''
  if (!user || !isAdminEmail(email)) {
    return <div style={{ padding: 40, color: 'var(--text2)' }}>403</div>
  }
  const chave = lerChavePessoa(params?.id)
  if (!chave) notFound()
  const admin = serviceClient()
  if (!admin) return <div style={{ padding: 40, color: 'var(--text2)' }}>service unavailable</div>
  const tela = await carregarTelaPessoa(admin, chave)
  if (!tela) notFound()
  return <PessoaTela t={tela} />
}
