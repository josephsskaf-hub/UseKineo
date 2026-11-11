// KINEO-CONFERENCIA-RECEITA-1111 — a tela de CONFERÊNCIA da casa para as duas peças de receita que nascem 'internal'
// (a recarga do assinante + a barra, KINEO-RECARGA-ASSINANTE-1111; a pausa de 1 mês no "Before you go",
// KINEO-PAUSA-VOLUNTARIA-1111). Por que existe: as telas de verdade só montam o aviso de sem crédito quando o saldo NÃO paga
// o filme — a conta da casa, com ~1.400 créditos, nunca o veria. Aqui o MESMO componente é montado sem depender do saldo, e
// o servidor continua decidindo tudo: a casa recebe a oferta marcada como conferência (o clique volta sem abrir cobrança;
// a pausa responde sem tocar na Stripe). Só a lista EXATA da casa (releaseVisible 'internal'); o resto recebe 404; nunca
// indexada; nenhum link para ela no site.
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { releaseVisible } from '@/lib/recreate/access'
import ConferenciaReceitaClient from './ConferenciaReceitaClient'

export const metadata = { title: 'Conferência — Kineo', robots: { index: false, follow: false } }
export const dynamic = 'force-dynamic'

export default async function ConferenciaReceitaPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?redirect=/conferencia-receita')
  if (!releaseVisible(user.email, 'internal')) notFound()
  return <ConferenciaReceitaClient />
}
