// KINEO-PROMO-CREATOR-2910 — a promo de 30 dias do Kling 4.0 vale do Creator para cima; Starter anterior à virada mantém.
import assert from 'node:assert/strict'
import { kling4PromoWindow, kling4PromoPlanIncluded } from '../lib/kling4PaidPolicy.ts'
const now = Date.parse('2026-10-30T12:00:00Z')
const policy = { paidLive: true, promoLive: true, launchAt: '2026-10-29T04:24:00.000Z' }
const sub = (plan: string, startedAt: string) => ({ userId: 'u', provider: 'stripe', subscriptionId: 's', plan, status: 'active', startedAt, paidThrough: '2026-11-29T00:00:00Z', verifiedAt: new Date(now).toISOString() }) as any
assert.equal(kling4PromoWindow(sub('basic', '2026-10-30T10:00:00Z'), policy as any, now).reason, 'ok')
assert.equal(kling4PromoWindow(sub('pro', '2026-10-30T10:00:00Z'), policy as any, now).reason, 'ok')
assert.equal(kling4PromoWindow(sub('starter', '2026-10-30T10:00:00Z'), policy as any, now).reason, 'plan_not_included')
assert.equal(kling4PromoWindow(sub('starter', '2026-10-20T10:00:00Z'), policy as any, now).reason, 'ok')
assert.equal(kling4PromoPlanIncluded('starter', null), false)
assert.equal(kling4PromoPlanIncluded('free', '2026-10-01T00:00:00Z'), false)
console.log('promo-creator: 6/6 ok')
