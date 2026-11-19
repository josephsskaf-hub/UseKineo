import type { SupabaseClient } from '@supabase/supabase-js'
import { creditCostForDuration, normalizeQuality, type Quality } from '@/lib/credits/engineCost'
import { creditBalanceNotice, type RecargaAssinanteProfile } from '@/lib/billing/recargaAssinante'

const FILM_QUALITIES: readonly Quality[] = [
  'fast', 'basic', 'basic_ai', 'pro', 'cinematic_ai', 'cinematic_kling', 'cinematic_veo',
  'cinematic_sora', 'cinematic_hollywood', 'cinematic_h3', 'cinematic_h3max', 'cinematic_omni', 'cinematic_s25',
]
const DAY_MS = 24 * 60 * 60 * 1000

type CompletedFilm = { quality_mode: string; duration: number; credits_used: number | null }

export function repeatFilmCredits(film: CompletedFilm | null): number | null {
  if (!film || !Number.isSafeInteger(film.duration) || film.duration < 10 || film.duration > 180) return null
  const quality = normalizeQuality(film.quality_mode)
  if (quality !== film.quality_mode || !FILM_QUALITIES.includes(quality)) return null
  const cost = creditCostForDuration(quality, true, film.duration)
  // The completed record confirms a standard film at this duration. Avoid quoting
  // a deficit for legacy, promotional or customized jobs whose cost differs.
  return cost > 0 && cost === film.credits_used ? cost : null
}

export async function loadCreditBalanceNotice(db: SupabaseClient, userId: string, profile: RecargaAssinanteProfile, now = Date.now()) {
  const balance = profile.video_credits
  if (typeof balance !== 'number' || !Number.isSafeInteger(balance) || balance < 0) return null

  const { data: film } = await db.from('videos').select('quality_mode, duration, credits_used')
    .eq('user_id', userId).eq('status', 'completed').in('quality_mode', FILM_QUALITIES)
    .not('render_id', 'is', null).order('created_at', { ascending: false }).limit(1).maybeSingle()
  const nextFilmCost = repeatFilmCredits(film)
  const immediate = creditBalanceNotice(balance, nextFilmCost, null, 0)
  if (immediate || !profile.stripe_subscription_id) return immediate

  // Both the first paid invoice and renewals record the grant in the server event
  // ledger. Carryover counts only when the event confirms the opening balance.
  const { data: cycle } = await db.from('events').select('created_at, metadata')
    .eq('user_id', userId).in('name', ['subscription_invoice_paid', 'payment_success'])
    .eq('metadata->>stripe_subscription_id', profile.stripe_subscription_id)
    .order('created_at', { ascending: false }).limit(1).maybeSingle()
  const openingBalance = cycle?.metadata?.balance_after ?? cycle?.metadata?.credits_granted
  const cycleStart = typeof cycle?.created_at === 'string' ? Date.parse(cycle.created_at) : NaN
  if (typeof openingBalance !== 'number' || !Number.isSafeInteger(openingBalance) || openingBalance <= 0 ||
      !Number.isFinite(cycleStart) || cycleStart > now) return null

  const { data: debits, error } = await db.from('credit_debits').select('amount')
    .eq('user_id', userId).is('refunded_at', null).gt('amount', 0)
    .gte('created_at', new Date(Math.max(cycleStart, now - DAY_MS)).toISOString())
    .lte('created_at', new Date(now).toISOString())
  if (error || !debits) return null
  const spent = debits.reduce((total, { amount }) => total + (Number.isSafeInteger(amount) && amount > 0 ? amount : 0), 0)
  return creditBalanceNotice(balance, nextFilmCost, openingBalance, spent)
}
