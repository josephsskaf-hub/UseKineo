import { createClient as createAdmin } from '@supabase/supabase-js'

type AffiliateAttributionReason =
  | 'invalid_code'
  | 'invalid_click_proof'
  | 'ineligible_existing_account'
  | 'configuration_missing'
  | 'lookup_failed'
  | 'unknown_code'
  | 'inactive_affiliate'
  | 'self_referral'
  | 'insert_failed'
  | 'reconciliation_failed'
  | 'profile_stamp_failed'
  | 'unexpected_failure'

type AffiliateAttributionResult =
  | { ok: true; affiliateId: string; already: boolean }
  | { ok: false; reason: AffiliateAttributionReason; affiliateId?: string }

type AffiliateUser = {
  id: string
  email?: string | null
  createdAt?: string | null
}

const AFFILIATE_CLICK_MAX_AGE_MS = 90 * 24 * 60 * 60 * 1000
// Both timestamps are server-owned (Postgres/Auth), so reverse clock skew must
// never let an already-existing account become a paid acquisition after click.
const AFFILIATE_CLICK_CLOCK_SKEW_MS = 0

export function normalizeAffiliateCode(value: string | null | undefined): string | null {
  const code = (value ?? '').trim().toUpperCase()
  return /^[A-HJ-NP-Z2-9]{8}$/.test(code) ? code : null
}

export function normalizeAffiliateClickId(value: string | null | undefined): string | null {
  const clickId = (value ?? '').trim().toLowerCase()
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(clickId)
    ? clickId
    : null
}

export function isAffiliateClickEligible(args: {
  accountCreatedAt: string | null | undefined
  clickCreatedAt: string | null | undefined
  nowMs?: number
}): boolean {
  const accountCreatedAtMs = Date.parse(args.accountCreatedAt ?? '')
  const clickCreatedAtMs = Date.parse(args.clickCreatedAt ?? '')
  const nowMs = args.nowMs ?? Date.now()
  return Number.isFinite(accountCreatedAtMs) &&
    Number.isFinite(clickCreatedAtMs) &&
    accountCreatedAtMs >= clickCreatedAtMs - AFFILIATE_CLICK_CLOCK_SKEW_MS &&
    nowMs >= clickCreatedAtMs &&
    nowMs - clickCreatedAtMs <= AFFILIATE_CLICK_MAX_AGE_MS
}

// One server-side first-touch primitive is shared by the post-signup trigger
// and its route contract. The unique referred_user_id constraint remains the
// final race arbiter; if another request wins, we re-read and stamp that winner.
export async function attributeAffiliateForUser(
  rawCode: string | null | undefined,
  user: AffiliateUser,
  options: { allowNewAttribution?: boolean; clickId?: string | null } = {},
): Promise<AffiliateAttributionResult> {
  const code = normalizeAffiliateCode(rawCode)

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) return { ok: false, reason: 'configuration_missing' }

  try {
    const admin = createAdmin(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })

    const { data: existing, error: existingError } = await admin
      .from('affiliate_referrals')
      .select('id, affiliate_id')
      .eq('referred_user_id', user.id)
      .maybeSingle()
    if (existingError) return { ok: false, reason: 'lookup_failed' }

    const stampProfile = async (affiliateId: string): Promise<boolean> => {
      const { data: stamped, error } = await admin
        .from('profiles')
        .update({ affiliate_id: affiliateId })
        .eq('id', user.id)
        .select('id, affiliate_id')
        .maybeSingle()
      return !error && stamped?.id === user.id && stamped?.affiliate_id === affiliateId
    }

    if (existing?.affiliate_id) {
      const affiliateId = existing.affiliate_id as string
      const repaired = await stampProfile(affiliateId)
      return repaired
        ? { ok: true, affiliateId, already: true }
        : { ok: false, reason: 'profile_stamp_failed', affiliateId }
    }

    // Existing canonical referrals are always repairable. Creating a new one
    // is a separate privilege: post-signup and Checkout must explicitly prove
    // that this is a genuinely new account, rather than trusting the
    // client-writable profiles.affiliate_id field.
    if (options.allowNewAttribution === false) {
      return { ok: false, reason: 'ineligible_existing_account' }
    }
    if (!code) return { ok: false, reason: 'invalid_code' }

    const { data: affiliate, error: affiliateError } = await admin
      .from('affiliates')
      .select('id, user_id, status')
      .eq('code', code)
      .maybeSingle()
    if (affiliateError) return { ok: false, reason: 'lookup_failed' }
    if (!affiliate) return { ok: false, reason: 'unknown_code' }
    if (affiliate.status !== 'active') return { ok: false, reason: 'inactive_affiliate' }
    if (affiliate.user_id && affiliate.user_id === user.id) {
      return { ok: false, reason: 'self_referral' }
    }

    // A new referral needs a protected click row minted by /a/[code]. The Auth
    // account must have been created after that click (within clock skew), and
    // the click remains valid for the publicly promised 90-day first touch.
    // Existing accounts that merely click a partner link later cannot become a
    // retroactive acquisition, regardless of client-writable profile fields.
    const clickId = normalizeAffiliateClickId(options.clickId)
    if (!clickId) return { ok: false, reason: 'invalid_click_proof' }
    const { data: click, error: clickError } = await admin
      .from('affiliate_clicks')
      .select('id, affiliate_id, created_at')
      .eq('id', clickId)
      .eq('affiliate_id', affiliate.id)
      .maybeSingle()
    if (clickError) return { ok: false, reason: 'lookup_failed' }
    if (!click?.id) return { ok: false, reason: 'invalid_click_proof' }

    let accountCreatedAt = user.createdAt ?? null
    if (!accountCreatedAt) {
      const { data: authUserResult, error: authUserError } = await admin.auth.admin.getUserById(user.id)
      if (authUserError) return { ok: false, reason: 'lookup_failed' }
      accountCreatedAt = authUserResult.user?.created_at ?? null
    }
    if (!isAffiliateClickEligible({ accountCreatedAt, clickCreatedAt: click.created_at })) {
      return { ok: false, reason: 'ineligible_existing_account' }
    }

    const { data: inserted, error: insertError } = await admin
      .from('affiliate_referrals')
      .insert({
        affiliate_id: affiliate.id,
        referred_user_id: user.id,
        email: user.email ?? null,
        status: 'signup',
      })
      .select('id, affiliate_id')
      .maybeSingle()
    if (insertError && insertError.code !== '23505') {
      return { ok: false, reason: 'insert_failed' }
    }

    let canonicalAffiliateId = inserted?.affiliate_id as string | undefined
    if (!canonicalAffiliateId) {
      const { data: canonical, error: canonicalError } = await admin
        .from('affiliate_referrals')
        .select('affiliate_id')
        .eq('referred_user_id', user.id)
        .maybeSingle()
      if (canonicalError || !canonical?.affiliate_id) {
        return { ok: false, reason: 'reconciliation_failed' }
      }
      canonicalAffiliateId = canonical.affiliate_id as string
    }

    const stamped = await stampProfile(canonicalAffiliateId)
    return stamped
      ? { ok: true, affiliateId: canonicalAffiliateId, already: false }
      : { ok: false, reason: 'profile_stamp_failed', affiliateId: canonicalAffiliateId }
  } catch {
    return { ok: false, reason: 'unexpected_failure' }
  }
}
