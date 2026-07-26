import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AccountClient from './AccountClient'

export default async function AccountPage() {
  const supabase = createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_pro, has_paid, plan, email, stripe_customer_id, created_at')
    .eq('id', user.id)
    .single()

  // PUSH #96 — see app/(dashboard)/layout.tsx for full rationale:
  // `generations_used` is a dead column (written only by the legacy
  // app/api/generate/route.ts, never by the real video pipeline). AccountClient
  // requires a `generationsUsed` prop but AccountInner never destructures/uses
  // it today (verified) — pass the real video count so the value is honest if
  // it's ever surfaced, reusing the videos_count approach from
  // app/api/admin/users/route.ts.
  const { count: videosCount } = await supabase
    .from('videos')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)

  return (
    <AccountClient
      email={profile?.email ?? user.email ?? ''}
      isPro={profile?.is_pro ?? false}
      generationsUsed={videosCount ?? 0}
      hasStripeCustomer={!!profile?.stripe_customer_id}
      hasPaid={profile?.has_paid === true}
      createdAt={profile?.created_at ?? null}
      planTier={normalizePlanTier(profile?.plan, profile?.is_pro ?? false)}
    />
  )
}

function normalizePlanTier(
  rawPlan: string | null | undefined,
  isPro: boolean,
): 'free' | 'starter' | 'basic' | 'pro' {
  const plan = (rawPlan ?? '').toLowerCase().replace(/_trial$/, '')
  if (plan === 'starter') return 'starter'
  if (plan === 'basic' || plan === 'creator') return 'basic'
  if (plan === 'pro' || plan === 'studio') return 'pro'
  return isPro ? 'pro' : 'free'
}
