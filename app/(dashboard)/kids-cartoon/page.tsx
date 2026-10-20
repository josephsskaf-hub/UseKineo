// KINEO-BEBE-QUE-FALA-2010 — /kids-cartoon: o template de 1 clique "AI Kids Cartoon Stories" (escolhe o personagem, escreve ou
// escolhe a ideia, língua e duração → a história sai escrita → "Make my cartoon" abre o fluxo de filme de sempre no Seedance 1.5).
// Portas (o guardião scripts/test-bebe-que-fala-2010.mjs confere): sem login → /login?redirect=/kids-cartoon; produto desligado
// (KIDS_CARTOON_LIVE=false) e conta de fora → 404. Nunca indexada (é tela do app; a página pública é /ai-kids-cartoon-videos).
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { isInternalEmail } from '@/lib/internalAccounts'
import { KIDS_CARTOON_LIVE, KIDS_CARTOON_TEMPLATE_PATH, kidsCartoonOn } from '@/lib/kidsCartoon/kidsCartoon'
import KidsCartoonTemplate from '@/components/kidsCartoon/KidsCartoonTemplate'
import KidsVendaPanel from '@/components/kidsCartoon/KidsVendaPanel' // KINEO-KIDS-VENDA-2010 — meus episódios + planos (piloto/pack/grátis); o servidor decide se aparece (KIDS_SALES_LIVE ou casa)

export const metadata = { title: 'AI Kids Cartoon Stories — Kineo', robots: { index: false, follow: false } }
export const dynamic = 'force-dynamic'

export default async function KidsCartoonPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/login?redirect=${encodeURIComponent(KIDS_CARTOON_TEMPLATE_PATH)}`)
  if (!kidsCartoonOn(KIDS_CARTOON_LIVE, isInternalEmail(user.email))) notFound()
  return <><KidsVendaPanel />{/* KINEO-KIDS-VENDA-2010 — acima do template: nada muda no template em si */}<KidsCartoonTemplate /></>
}
