import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AccountClient from './AccountClient'
// KINEO-TRIAL-SURFACES-2026-08-07 — o trial NAO escreve `plan` nem `has_paid`
// (de proposito: escrever plan='creator' numa conta que nao pagou contaminaria
// MRR, coortes de e-mail e webhook da Stripe — ver lib/reverseTrial.ts). A
// consequencia e que esta pagina, que decide tudo por `plan`/`has_paid`, lia
// uma conta em trial como free e afirmava quatro coisas falsas sobre ela. A
// verdade e resolvida AQUI, no servidor, pela mesma funcao que os gates usam.
import { REVERSE_TRIAL_ENABLED, isTrialActive, TRIAL_ENTITLEMENT_COLUMNS } from '@/lib/reverseTrial'

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

  // Leitura SEPARADA e best-effort das colunas de trial, pelo mesmo motivo de
  // /api/credits: um ambiente onde a migration ainda nao rodou nao pode derrubar
  // a pagina de conta inteira. Qualquer falha ⇒ trialActive=false ⇒ a tela e
  // exatamente a de hoje. Com a flag OFF a query nem acontece.
  let trialActive = false
  let trialEndsAt: string | null = null
  if (REVERSE_TRIAL_ENABLED) {
    try {
      const { data: trialRow, error: trialErr } = await supabase
        .from('profiles')
        .select(`id, ${TRIAL_ENTITLEMENT_COLUMNS}`)
        .eq('id', user.id)
        .single()
      if (!trialErr && trialRow) {
        const row = trialRow as unknown as { trial_status?: unknown; trial_ends_at?: unknown; trial_credits_used?: unknown }
        trialActive = isTrialActive(row)
        trialEndsAt = typeof row.trial_ends_at === 'string' ? row.trial_ends_at : null
      }
    } catch { /* best-effort — sem trial a tela e a de hoje */ }
  }

  return (
    <AccountClient
      email={profile?.email ?? user.email ?? ''}
      isPro={profile?.is_pro ?? false}
      generationsUsed={videosCount ?? 0}
      hasStripeCustomer={!!profile?.stripe_customer_id}
      hasPaid={profile?.has_paid === true}
      createdAt={profile?.created_at ?? null}
      planTier={normalizePlanTier(profile?.plan, profile?.is_pro ?? false)}
      trialActive={trialActive}
      trialEndsAt={trialEndsAt}
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
