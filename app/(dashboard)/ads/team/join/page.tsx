// KINEO-EQUIPE-BUSINESS-2026-10-10 — /ads/team/join?token=…: o link do convite da equipe Business.
// Sem login → /login?redirect=<este link> (o convite volta inteiro). Logado → a tela pede o clique "Join" e o servidor
// (/api/ads/team, action 'accept') confere TUDO: assinatura, validade, dono, uso único, o mesmo e-mail e o plano do dono.
// Esta página não lê nem grava nada no banco.
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import JoinClient from './JoinClient'

export const metadata = { title: 'Join a team — Studio Ads — Kineo' }
export const dynamic = 'force-dynamic'

export default async function AdsTeamJoinPage({ searchParams }: { searchParams?: { token?: string | string[] } }) {
  const raw = searchParams?.token
  const token = typeof raw === 'string' ? raw.slice(0, 400) : ''
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/login?redirect=${encodeURIComponent(`/ads/team/join?token=${encodeURIComponent(token)}`)}`)
  return <JoinClient token={token} email={user.email ?? null} />
}
