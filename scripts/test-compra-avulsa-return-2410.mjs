// KINEO-COMPRA-AVULSA-2410 — actual confirmation endpoint, strictly read-only and scoped to authenticated ownership.
import assert from 'node:assert/strict'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'
const UID = '00000000-0000-4000-8000-000000000001', ORDER = '00000000-0000-4000-8000-000000000002'
async function run({ user = UID, session = 'cs_offline', row = null, dbError = false } = {}) {
  const filters = []
  const query = { select: () => query, eq: (key, value) => { filters.push([key, value]); return query }, maybeSingle: async () => ({ data: row, error: dbError ? { code: 'offline' } : null }) }
  const load = createOfflineLoader({ env: { NEXT_PUBLIC_SUPABASE_URL: 'https://offline.invalid', SUPABASE_SERVICE_ROLE_KEY: 'offline-placeholder' }, mocks: {
    'next/server': { NextResponse: { json: (body, options) => ({ body, ...options }) } },
    '@/lib/supabase/server': { createClient: () => ({ auth: { getUser: async () => ({ data: { user: user ? { id: user } : null } }) } }) },
    '@supabase/supabase-js': { createClient: () => ({ from: table => { assert.equal(table, 'one_time_item_purchases'); return query } }) },
  } })
  const result = await load('app/api/stripe/checkout/item/route.ts').GET({ nextUrl: new URL(`https://www.usekineo.com/api/stripe/checkout/item?session_id=${session}`) })
  assert.match(result.headers['Cache-Control'], /private, no-store/)
  return { result, filters }
}
for (const [options, status, state] of [
  [{}, 202, 'pending'], [{ user: null }, 401, 'auth_required'], [{ session: 'invalid' }, 400, 'invalid'],
  [{ dbError: true }, 503, 'pending'], [{ row: { sku: 'unknown' } }, 409, 'invalid'],
]) { const { result } = await run(options); assert.equal(result.status, status); assert.equal(result.body.state, state); assert.ok(!result.body.next) }
for (const sku of ['one_time_ad', 'one_time_film35']) {
  const { result, filters } = await run({ row: { sku, order_id: sku === 'one_time_ad' ? ORDER : null } })
  assert.equal(result.status, 200); assert.equal(result.body.state, 'fulfilled')
  assert.deepEqual(filters, [['stripe_session_id', 'cs_offline'], ['user_id', UID]])
  assert.match(result.body.next, sku === 'one_time_ad' ? new RegExp(`^/ads/v2\\?mode=simple&order=${ORDER}`) : /^\/studio\?engine=seedance&duration=35&script_mode=ai/)
}
console.log('PASS one-time return: pending before grant, owner/session-only receipt, no writes, no cached state, exact destination')
