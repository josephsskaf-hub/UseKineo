// KINEO-EQUIPE-BUSINESS-2026-10-10 — /ads/team: a equipe do plano Business (lib/ads/team.ts tem o porquê).
// Dono do Business: convida até BUSINESS_SEATS colegas por e-mail (o link aparece UMA vez para copiar), vê pendentes e ativos,
// cancela convite e tira membro. Membro: vê em qual workspace está e pode sair. Os dados vêm de /api/ads/team (a tela não lê
// o banco). Portas: sem login → /login?redirect=/ads/team. Quem não é dono de Business nem membro vê o convite ao plano.
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ADS_TEAM_INVITE_DAYS, BUSINESS_SEATS } from '@/lib/ads/team'
import { BUSINESS_PAGE_PATH } from '@/lib/businessPlan'
import TeamClient from './TeamClient'

export const metadata = { title: 'Team — Studio Ads — Kineo' }
export const dynamic = 'force-dynamic'

export default async function AdsTeamPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/login?redirect=${encodeURIComponent('/ads/team')}`)
  return <TeamClient seats={BUSINESS_SEATS} inviteDays={ADS_TEAM_INVITE_DAYS} businessHref={BUSINESS_PAGE_PATH} />
}
