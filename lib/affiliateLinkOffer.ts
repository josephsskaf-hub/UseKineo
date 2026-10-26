import { createClient as createAdmin } from '@supabase/supabase-js'
import { normalizeAffiliateCode } from '@/lib/affiliateCode'
import { normalizeAffiliateClickId } from '@/lib/affiliateAttribution'

/** Server-only offer lookup. No email, customer or financial data reaches pricing. */
export type AffiliateLinkOffer = { id: string; code: string; partnerName: string | null }

const CLICK_MAX_AGE_MS = 90 * 24 * 60 * 60 * 1000

function affiliateOfferDb() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  return url && key ? createAdmin(url, key, { auth: { persistSession: false, autoRefreshToken: false } }) : null
}

function offerFromRow(row: { id?: unknown; code?: unknown; status?: unknown; name?: unknown } | null): AffiliateLinkOffer | null {
  if (!row || row.status !== 'active' || typeof row.id !== 'string' || typeof row.code !== 'string') return null
  const code = normalizeAffiliateCode(row.code)
  if (!code) return null
  const partnerName = typeof row.name === 'string' ? row.name.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 120) : ''
  return { id: row.id, code, partnerName: partnerName || null }
}

/** Canonical first-touch attribution wins over a different cookie in the same browser. */
export async function readAffiliateOfferById(affiliateId: string): Promise<AffiliateLinkOffer | null> {
  if (!normalizeAffiliateClickId(affiliateId)) return null
  const db = affiliateOfferDb()
  if (!db) return null
  try {
    const { data, error } = await db.from('affiliates').select('id, code, status, name').eq('id', affiliateId).maybeSingle()
    return error ? null : offerFromRow(data)
  } catch {
    return null
  }
}

/** A writable sf_aff alone cannot announce or grant an offer: require its protected click proof. */
export async function resolveAffiliateLinkOffer(rawCode: string | undefined, rawClickId?: string): Promise<AffiliateLinkOffer | null> {
  const code = normalizeAffiliateCode(rawCode)
  const clickId = normalizeAffiliateClickId(rawClickId)
  if (!code || !clickId) return null
  const db = affiliateOfferDb()
  if (!db) return null
  try {
    const affiliate = await db.from('affiliates').select('id, code, status, name').eq('code', code).maybeSingle()
    if (affiliate.error) return null
    const offer = offerFromRow(affiliate.data)
    if (!offer) return null
    const click = await db.from('affiliate_clicks').select('id, created_at').eq('id', clickId).eq('affiliate_id', offer.id).maybeSingle()
    if (click.error || !click.data?.id) return null
    const createdAt = Date.parse(String(click.data.created_at ?? ''))
    const ageMs = Date.now() - createdAt
    return Number.isFinite(ageMs) && ageMs >= 0 && ageMs <= CLICK_MAX_AGE_MS ? offer : null
  } catch {
    return null
  }
}

/** Read-only display resolution; canonical referrals cannot be replaced by a new cookie. */
export async function resolveAffiliateDisplayOffer(userId: string | null, rawCode: string | undefined, rawClickId?: string): Promise<AffiliateLinkOffer | null> {
  if (userId) {
    const db = affiliateOfferDb()
    if (!db) return null
    try {
      const referral = await db.from('affiliate_referrals').select('affiliate_id').eq('referred_user_id', userId).maybeSingle()
      if (referral.error) return null
      if (typeof referral.data?.affiliate_id === 'string') return readAffiliateOfferById(referral.data.affiliate_id)
    } catch {
      return null
    }
  }
  return resolveAffiliateLinkOffer(rawCode, rawClickId)
}
