import type Stripe from 'stripe'
import { stripe } from '@/lib/stripe'

// KINEO-AFILIADO-50-2610 — founder decision 26/10: 50% on the first invoice.
export const AFFILIATE_COUPON_ID = 'KINEO_AFFILIATE_50'
export const LEGACY_AFFILIATE_COUPON_ID = 'KINEO_AFFILIATE_20'
export const AFFILIATE_COUPON_PERCENT = 50
export const AFFILIATE_COUPON_NAME = 'Partner 50% first month'
const MIGRATION_MARKER = 'kineo_affiliate_50_migration'

export type AffiliateCouponStripe = Pick<Stripe, 'coupons' | 'promotionCodes'>
export interface AffiliateCouponAdminDb {
  from(table: string): {
    update(values: Record<string, unknown>): {
      eq(col: string, val: string): Promise<{ error: { message: string } | null }>
    }
  }
}

const provisioned = new WeakMap<AffiliateCouponStripe, Map<string, Promise<string | null>>>()

export function couponTextFor(code: string): string {
  return `KINEO${String(code).toUpperCase().replace(/[^A-Z0-9]/g, '')}`.slice(0, 24)
}

function acceptsAffiliateOffer(coupon: Stripe.Coupon | Stripe.DeletedCoupon): coupon is Stripe.Coupon {
  return !coupon.deleted && coupon.valid && coupon.percent_off === AFFILIATE_COUPON_PERCENT
    && coupon.duration === 'once' && !coupon.amount_off && !coupon.applies_to?.products?.length
}

function missingResource(error: unknown): boolean {
  const detail = error as { code?: string; statusCode?: number } | null
  return detail?.code === 'resource_missing' || detail?.statusCode === 404
}

async function readBaseCoupon(client: AffiliateCouponStripe, override?: string): Promise<Stripe.Coupon> {
  if (override) {
    try {
      const coupon = await client.coupons.retrieve(override)
      if (acceptsAffiliateOffer(coupon)) return coupon
    } catch {
      // An obsolete override must never silently retain the old 20% offer.
    }
  }
  try {
    const coupon = await client.coupons.retrieve(AFFILIATE_COUPON_ID)
    if (!acceptsAffiliateOffer(coupon)) throw new Error('Invalid affiliate coupon contract')
    return coupon
  } catch (error) {
    if (!missingResource(error)) throw error
  }
  try {
    const coupon = await client.coupons.create({
      id: AFFILIATE_COUPON_ID,
      percent_off: AFFILIATE_COUPON_PERCENT,
      duration: 'once',
      name: AFFILIATE_COUPON_NAME,
    })
    if (!acceptsAffiliateOffer(coupon)) throw new Error('Invalid created affiliate coupon')
    return coupon
  } catch {
    // Another request may have created the same immutable coupon meanwhile.
    const coupon = await client.coupons.retrieve(AFFILIATE_COUPON_ID)
    if (!acceptsAffiliateOffer(coupon)) throw new Error('Invalid affiliate coupon after create race')
    return coupon
  }
}

async function listAllCodes(
  client: AffiliateCouponStripe,
  filter: Stripe.PromotionCodeListParams,
): Promise<Stripe.PromotionCode[]> {
  const all: Stripe.PromotionCode[] = []
  let cursor: string | undefined
  do {
    const page = await client.promotionCodes.list({ ...filter, limit: 100, ...(cursor ? { starting_after: cursor } : {}) })
    all.push(...page.data)
    if (!page.has_more) return all
    const next = page.data[page.data.length - 1]?.id
    if (!next || next === cursor) throw new Error('Affiliate coupon pagination did not advance')
    cursor = next
  } while (cursor)
  return all
}

function customerId(code: Stripe.PromotionCode): string | null {
  return typeof code.customer === 'string' ? code.customer : code.customer?.id ?? null
}

async function findReplacement(client: AffiliateCouponStripe, old: Stripe.PromotionCode, couponId: string) {
  const codes = await listAllCodes(client, { code: old.code, active: true })
  return codes.find(code => code.coupon.id === couponId && customerId(code) === customerId(old)) ?? null
}

async function replacePromotionCode(client: AffiliateCouponStripe, old: Stripe.PromotionCode, couponId: string) {
  const replacement = await findReplacement(client, old, couponId)
  if (replacement) return replacement
  const remaining = old.max_redemptions == null ? null : old.max_redemptions - old.times_redeemed
  if (remaining !== null && remaining <= 0) throw new Error('Affiliate promotion code exhausted')
  const restrictions: Stripe.PromotionCodeCreateParams.Restrictions = {
    first_time_transaction: old.restrictions.first_time_transaction,
    ...(old.restrictions.minimum_amount != null ? { minimum_amount: old.restrictions.minimum_amount } : {}),
    ...(old.restrictions.minimum_amount_currency ? { minimum_amount_currency: old.restrictions.minimum_amount_currency } : {}),
    ...(old.restrictions.currency_options ? { currency_options: old.restrictions.currency_options } : {}),
  }
  try {
    await client.promotionCodes.update(old.id, {
      active: false,
      metadata: { ...old.metadata, [MIGRATION_MARKER]: couponId },
    })
    return await client.promotionCodes.create({
      coupon: couponId,
      code: old.code,
      ...(customerId(old) ? { customer: customerId(old)! } : {}),
      ...(old.expires_at != null ? { expires_at: old.expires_at } : {}),
      ...(remaining !== null ? { max_redemptions: remaining } : {}),
      ...(old.metadata ? { metadata: Object.fromEntries(Object.entries(old.metadata).filter(([key]) => key !== MIGRATION_MARKER)) } : {}),
      restrictions,
    })
  } catch (error) {
    // Lost response / competing process: reconcile before rolling back. An
    // explicitly archived code can be reactivated while it is still redeemable.
    try {
      const raced = await findReplacement(client, old, couponId)
      if (raced) return raced
    } catch {
      // A failed lookup is not proof that the replacement was created.
    }
    try {
      await client.promotionCodes.update(old.id, { active: true, metadata: { [MIGRATION_MARKER]: '' } })
    } catch {
      console.warn('[affiliate coupon] legacy code recovery requires retry')
    }
    throw error
  }
}

export async function ensureAffiliateBaseCoupon(
  client: AffiliateCouponStripe = stripe,
  override = process.env.AFFILIATE_STRIPE_COUPON_ID,
): Promise<string | null> {
  let byOverride = provisioned.get(client)
  if (!byOverride) {
    byOverride = new Map()
    provisioned.set(client, byOverride)
  }
  const cacheKey = override ?? ''
  const existing = byOverride.get(cacheKey)
  if (existing) return existing
  const pending = (async () => {
    try {
      const coupon = await readBaseCoupon(client, override)
      if (coupon.name !== AFFILIATE_COUPON_NAME) {
        await client.coupons.update(coupon.id, { name: AFFILIATE_COUPON_NAME })
      }
      // Collect every page before mutating the active filter. Preserves the
      // public KINEO{CODE} strings, including partners who never reopen /me.
      const legacy = await listAllCodes(client, { coupon: LEGACY_AFFILIATE_COUPON_ID, active: true })
      const interrupted = (await listAllCodes(client, { coupon: LEGACY_AFFILIATE_COUPON_ID, active: false }))
        .filter(old => old.metadata?.[MIGRATION_MARKER] === coupon.id)
      for (const old of [...legacy, ...interrupted]) await replacePromotionCode(client, old, coupon.id)
      return coupon.id
    } catch {
      console.warn('[affiliate coupon] 50% first-invoice provisioning incomplete')
      return null
    }
  })()
  byOverride.set(cacheKey, pending)
  const couponId = await pending
  if (!couponId) byOverride.delete(cacheKey)
  return couponId
}

export async function mintCouponIfMissing(
  admin: AffiliateCouponAdminDb,
  affiliate: { id: string; code: string; status: string; coupon_code: string | null },
  client: AffiliateCouponStripe = stripe,
  override = process.env.AFFILIATE_STRIPE_COUPON_ID,
): Promise<string | null> {
  if (affiliate.status !== 'active') return null
  const baseCoupon = await ensureAffiliateBaseCoupon(client, override)
  if (!baseCoupon) return null
  const text = affiliate.coupon_code || couponTextFor(affiliate.code)
  try {
    const active = await listAllCodes(client, { code: text, active: true })
    let promo = active.find(code => code.coupon.id === baseCoupon && customerId(code) === null)
    if (!promo) {
      const legacy = active.find(code => code.coupon.id === LEGACY_AFFILIATE_COUPON_ID && customerId(code) === null)
      if (legacy) promo = await replacePromotionCode(client, legacy, baseCoupon)
      else {
        try {
          promo = await client.promotionCodes.create({
            coupon: baseCoupon,
            code: text,
            metadata: { affiliate_id: affiliate.id, source: 'kineo_affiliate_auto' },
          })
        } catch {
          promo = (await listAllCodes(client, { code: text, active: true }))
            .find(code => code.coupon.id === baseCoupon && customerId(code) === null)
        }
      }
    }
    if (!promo) return null
    // Never show a newly minted code until the commission ledger can find its owner.
    if (affiliate.coupon_code !== text) {
      const { error } = await admin.from('affiliates').update({ coupon_code: text }).eq('id', affiliate.id)
      if (error) return null
    }
    return text
  } catch {
    console.warn('[affiliate coupon] partner code reconciliation failed')
    return null
  }
}
