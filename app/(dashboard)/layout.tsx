import { createClient } from '@/lib/supabase/server'
import DashboardShell from './DashboardShell'
// Push #423 — mobile users see a one-tap "Install app" banner (Android)
// or the Add-to-Home-Screen hint (iOS). Dashboard only, so the public
// landing/ads funnel stays distraction-free.
import InstallAppBanner from '@/components/InstallAppBanner'
// Push #427 — push-notification opt-in ("know when your video is ready")
import EnablePushBanner from '@/components/EnablePushBanner'
// Push #443 — referral loop: fires attribute+qualify on any authenticated page
import ReferralAutoTrigger from '@/components/ReferralAutoTrigger'
// #479 — affiliate attribution: finalizes first-touch on any authenticated page
import AffiliateAutoTrigger from '@/components/AffiliateAutoTrigger'
// PUSH #100 — o loop de indicação (#443) está vivo ponta a ponta desde então,
// mas o banner que o anuncia (components/ReferralPromoBanner.tsx, #452) nunca
// foi importado em lugar nenhum: um grep no repo inteiro só encontrava o
// próprio arquivo. Montado aqui ao lado do InstallAppBanner, que é o padrão de
// banner de dashboard. Só para usuário logado — /referral exige sessão, e um
// visitante deslogado clicando em "Get my link" cairia numa parede de login.
import ReferralPromoBanner from '@/components/ReferralPromoBanner'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // No redirect — dashboard is public. Auth is enforced at the generate action.
  let profile = null
  let videosCount = 0
  if (user) {
    const { data } = await supabase
      .from('profiles')
      .select('is_pro, email')
      .eq('id', user.id)
      .single()
    profile = data

    // PUSH #96 — `generations_used` is a dead column: it's written only by the
    // legacy app/api/generate/route.ts (old /create flow), never by the real
    // video pipeline (generate-video-fast/compose), so it's stuck at 0 for
    // every profile created since 2026-06-01. DashboardShell/Sidebar require a
    // `generationsUsed` number prop but never actually render its value today
    // (verified: Sidebar.tsx doesn't destructure it) — still, if it's ever
    // wired up for display, it should reflect something real. Reusing the
    // same "count rows in `videos`" approach as videos_count in
    // app/api/admin/users/route.ts.
    const { count } = await supabase
      .from('videos')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
    videosCount = count ?? 0
  }

  return (
    <DashboardShell
      userEmail={profile?.email ?? user?.email ?? ''}
      isPro={profile?.is_pro ?? false}
      generationsUsed={videosCount}
      isLoggedIn={!!user}
    >
      {children}
      <InstallAppBanner />
      {user && <ReferralPromoBanner />}
      <EnablePushBanner />
      {user && <ReferralAutoTrigger />}
      {user && <AffiliateAutoTrigger />}
    </DashboardShell>
  )
}
