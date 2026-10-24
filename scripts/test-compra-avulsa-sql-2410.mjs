// KINEO-COMPRA-AVULSA-2410 — execute the proposed SQL in real PostgreSQL/WASM, entirely in memory.
// PGlite has one backend: Promise.all proves racing application requests after backend serialization;
// this does not claim a multi-connection production concurrency test. No .env, Supabase, Stripe or paid calls.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'

const require = createRequire(import.meta.url)
let PGlite
try { ({ PGlite } = require('@electric-sql/pglite')) }
catch (error) {
  if (!process.env.KINEO_PGLITE_PATH) throw new Error('PGlite is required: install the pinned devDependency; this SQL gate never skips.', { cause: error })
  ;({ PGlite } = require(process.env.KINEO_PGLITE_PATH))
}
globalThis.fetch = () => { throw new Error('SQL guard forbids network') }

const SQL_PATH = 'migrations_pending/2026-10-24_one_time_items.sql'
const sql = readFileSync(SQL_PATH, 'utf8').replace(/\r\n/g, '\n')
const U1 = '00000000-0000-4000-8000-000000000001'
const U2 = '00000000-0000-4000-8000-000000000002'
const ORDER = '00000000-0000-4000-8000-000000000003'
const PROC = 'public.fulfill_one_time_item(text,uuid,text,integer,integer,text,text,text,uuid)'
const bootstrap = `
  create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
  grant usage on schema public to anon, authenticated, service_role;
  create table public.profiles (
    id uuid primary key, video_credits integer, has_paid boolean default false,
    ads_access_until timestamptz, plan text default 'free', stripe_subscription_id text,
    is_pro boolean default false, email text
  );
  create table public.stripe_events (id text primary key, received_at timestamptz default now());
  create table public.events (
    id uuid primary key default gen_random_uuid(), name text not null,
    user_id uuid references public.profiles(id), session_id text, path text, metadata jsonb, created_at timestamptz default now()
  );
  insert into public.profiles (id, video_credits, plan, stripe_subscription_id, is_pro) values
    ('${U1}', 10, 'free', null, false), ('${U2}', 25, 'business', 'sub_existing', true);
`
async function world(source = sql) {
  const db = new PGlite()
  try { await db.exec(bootstrap); await db.exec(source); return db }
  catch (error) { await db.close(); throw error }
}
const args = (extra = {}) => ({
  session: 'cs_test_ad', user: U1, sku: 'one_time_ad', credits: 41, amount: 900, currency: 'usd',
  browser: 'browser-session-2410', surface: 'ads_choice', order: ORDER, ...extra,
})
async function fulfill(db, extra = {}) {
  const a = args(extra)
  const r = await db.query('select public.fulfill_one_time_item($1,$2,$3,$4,$5,$6,$7,$8,$9) as granted',
    [a.session, a.user, a.sku, a.credits, a.amount, a.currency, a.browser, a.surface, a.order])
  return r.rows[0].granted
}
async function state(db, user = U1) {
  const { rows } = await db.query(`select video_credits, has_paid, ads_access_until::text, plan, stripe_subscription_id, is_pro,
    (select count(*)::integer from public.one_time_item_purchases) as receipts,
    (select count(*)::integer from public.stripe_events) as markers,
    (select count(*)::integer from public.events where name='one_time_item_purchased') as purchases
    from public.profiles where id=$1`, [user])
  return rows[0]
}
async function reset(db) {
  await db.exec(`truncate public.one_time_item_purchases, public.events, public.stripe_events;
    update public.profiles set video_credits=case when id='${U1}' then 10 else 25 end,
    has_paid=false, ads_access_until=null;`)
}
async function withRole(db, role, run) {
  await db.exec(`set role ${role}`)
  try { return await run() } finally { await db.exec('reset role') }
}
async function rejectAndUnchanged(db, run, pattern = /one_time_item|violates|permission denied|forced/) {
  const before = await state(db)
  await assert.rejects(run, pattern)
  assert.deepEqual(await state(db), before, 'the failed call leaves every financial artifact unchanged')
}

async function basicProof(db) {
  assert.equal(await fulfill(db), true)
  const s = await state(db)
  assert.equal(s.video_credits, 51, 'add 41 to the existing 10 credits')
  assert.equal(s.has_paid, true, 'paid films can render without watermark')
  assert.equal(s.receipts, 1); assert.equal(s.markers, 1); assert.equal(s.purchases, 1)
  assert.equal(s.plan, 'free'); assert.equal(s.stripe_subscription_id, null); assert.equal(s.is_pro, false)
  assert.ok(Date.parse(s.ads_access_until) > Date.now() + 364 * 86_400_000, 'the paid ad actually opens Studio Ads')
  const e = (await db.query('select name,user_id,session_id,path,metadata from public.events')).rows[0]
  assert.equal(e.name, 'one_time_item_purchased'); assert.equal(e.user_id, U1)
  assert.equal(e.session_id, 'browser-session-2410'); assert.equal(e.path, '/api/stripe/webhook')
  assert.deepEqual(e.metadata, { sku: 'one_time_ad', credits: 41, mode: 'payment', stripe_session_id: 'cs_test_ad', amount_total: 900,
    currency: 'usd', surface: 'ads_choice', order_id: ORDER, contract_version: 'one_time_item_v1_2026-10-24' })
  assert.equal(await fulfill(db), false, 'the exact session replay is an explicit no-op')
  await db.query('update public.profiles set video_credits=0 where id=$1', [U1])
  assert.equal(await fulfill(db), false, 'a replay after the balance was spent must not credit again')
  assert.equal((await state(db)).video_credits, 0)
  assert.equal((await state(db)).purchases, 1)
  await rejectAndUnchanged(db, () => fulfill(db, { user: U2 }), /session receipt mismatch/)
  await rejectAndUnchanged(db, () => fulfill(db, { currency: 'brl', amount: 4490 }), /session receipt mismatch/)
  await rejectAndUnchanged(db, () => fulfill(db, { order: null }), /session receipt mismatch/)
  await rejectAndUnchanged(db, () => fulfill(db, { browser: 'other-browser' }), /session receipt mismatch/)
  await rejectAndUnchanged(db, () => fulfill(db, { surface: 'pricing' }), /session receipt mismatch/)
}

async function eventRollbackProof(db) {
  await db.exec(`create function public.force_purchase_event_failure() returns trigger language plpgsql as $$
    begin if new.name='one_time_item_purchased' then raise exception 'forced event outage'; end if; return new; end; $$;
    create trigger purchase_event_failure before insert on public.events for each row execute function public.force_purchase_event_failure();`)
  try { await rejectAndUnchanged(db, () => fulfill(db), /forced event outage/) }
  finally { await db.exec('drop trigger purchase_event_failure on public.events; drop function public.force_purchase_event_failure()') }
  assert.equal(await fulfill(db), true, 'retry after the event recovers fulfills exactly once')
  assert.equal(await fulfill(db), false)
}

async function permissionProof(db) {
  const p = (await db.query(`select
    has_function_privilege('anon',$1,'execute') as anon,
    has_function_privilege('authenticated',$1,'execute') as authenticated,
    has_function_privilege('service_role',$1,'execute') as service,
    (select relrowsecurity from pg_class where oid='public.one_time_item_purchases'::regclass) as rls`, [PROC])).rows[0]
  assert.deepEqual(p, { anon: false, authenticated: false, service: true, rls: true })
  for (const role of ['anon', 'authenticated']) await withRole(db, role, async () => {
    await assert.rejects(() => fulfill(db), /permission denied/)
    await assert.rejects(() => db.query('select * from public.one_time_item_purchases'), /permission denied/)
  })
  const properties = (await db.query(`select prosecdef,proconfig from pg_proc where oid=$1::regprocedure`, [PROC])).rows[0]
  assert.equal(properties.prosecdef, true)
  assert.deepEqual(properties.proconfig, ['search_path=pg_catalog, public, pg_temp'])
  await withRole(db, 'service_role', async () => {
    assert.equal(await fulfill(db), true, 'the server role can fulfill without direct profile/table writes')
    assert.equal((await db.query('select * from public.one_time_item_purchases')).rows.length, 1)
    await assert.rejects(() => db.query('delete from public.one_time_item_purchases'), /permission denied/)
  })
}

let proofs = 0
async function check(name, run) { await run(); proofs++; console.log('ok SQL ' + name) }
const db = await world()
try {
  await check('migration can re-run; the SQL V1 matches the actual existing cost/settlement sources', async () => {
    await db.exec(sql)
    const load = createOfflineLoader({ mocks: { './checkoutPricing': {} } })
    assert.equal(load('lib/ads/v2Tiers.ts').adsV2Credits('commercial', 15), 41)
    assert.equal(load('lib/credits/engineCost.ts').creditCostForDuration('cinematic_ai', true, 35), 21)
    const settlement = load('lib/settlementCurrency.ts')
    assert.equal(settlement.settlementAmountMinor(900, 'brl'), 4490)
    assert.equal(settlement.settlementAmountMinor(500, 'brl'), 2490)
  })
  await check('receipt, exact grant, access, event and replay after spending', () => basicProof(db))
  await reset(db)
  await check('both SKUs settle in USD/BRL, preserve subscriptions and never shorten access', async () => {
    await db.query("update public.profiles set ads_access_until='2030-01-01T00:00:00Z' where id=$1", [U2])
    for (const currency of ['usd', 'brl']) {
      assert.equal(await fulfill(db, { session: 'cs_test_ad_' + currency, user: U2, currency, amount: currency === 'usd' ? 900 : 4490 }), true)
      assert.equal(await fulfill(db, { session: 'cs_test_film_' + currency, sku: 'one_time_film35', credits: 21, currency,
        amount: currency === 'usd' ? 500 : 2490, order: null, browser: null, surface: null }), true)
    }
    const paid = await state(db, U2), film = await state(db)
    assert.equal(paid.video_credits, 107); assert.equal(paid.plan, 'business'); assert.equal(paid.stripe_subscription_id, 'sub_existing'); assert.equal(paid.is_pro, true)
    assert.equal(Date.parse(paid.ads_access_until), Date.parse('2030-01-01T00:00:00Z'))
    assert.equal(film.video_credits, 52); assert.equal(film.has_paid, true); assert.equal(film.ads_access_until, null)
  })
  await reset(db)
  await check('invalid identities, quantities, contracts, prices and currencies fail without artifacts', async () => {
    for (const change of [{ session: null }, { session: 'garbage' }, { user: null }, { sku: null }, { sku: 'starter' },
      { credits: null }, { credits: 0 }, { credits: 82 }, { amount: null }, { amount: 500 }, { amount: 899 },
      { currency: null }, { currency: 'eur' }, { currency: 'brl' }, { browser: 'x'.repeat(65) }, { surface: 'x'.repeat(65) }]) {
      await rejectAndUnchanged(db, () => fulfill(db, change))
    }
    await rejectAndUnchanged(db, () => fulfill(db, { user: '00000000-0000-4000-8000-000000009999' }))
  })
  await check('a final event failure rolls back every financial write and can retry', () => eventRollbackProof(db))
  await reset(db)
  await check('preexisting legacy marker without a receipt fails closed', async () => {
    await db.query("insert into public.stripe_events(id) values('checkout_fulfilled:cs_test_ad')")
    await rejectAndUnchanged(db, () => fulfill(db), /duplicate key/)
  })
  await reset(db)
  await check('profile or marker failure rolls back the receipt and all other writes', async () => {
    for (const [table, label] of [['profiles', 'profile'], ['stripe_events', 'marker']]) {
      await db.exec(`create function public.force_failure() returns trigger language plpgsql as $$ begin raise exception 'forced ${label} outage'; end; $$;
        create trigger force_failure before ${table === 'profiles' ? 'update' : 'insert'} on public.${table} for each row execute function public.force_failure();`)
      try { await rejectAndUnchanged(db, () => fulfill(db), new RegExp('forced ' + label + ' outage')) }
      finally { await db.exec(`drop trigger force_failure on public.${table}; drop function public.force_failure()` ) }
    }
  })
  await check('an interrupted enclosing transaction rolls back successful RPC work', async () => {
    await rejectAndUnchanged(db, () => db.transaction(async tx => { assert.equal(await fulfill(tx), true); throw new Error('forced interruption') }), /forced interruption/)
  })
  await check('racing request submissions keep a single grant and distinct purchases add without lost balance', async () => {
    const same = await Promise.all(Array.from({ length: 20 }, () => fulfill(db)))
    assert.equal(same.filter(Boolean).length, 1)
    assert.equal((await state(db)).video_credits, 51)
    await reset(db)
    const different = await Promise.all(Array.from({ length: 20 }, (_, i) => fulfill(db, { session: 'cs_test_distinct_' + i })))
    assert.equal(different.filter(Boolean).length, 20)
    const s = await state(db)
    assert.equal(s.video_credits, 10 + 20 * 41); assert.equal(s.receipts, 20); assert.equal(s.purchases, 20); assert.equal(s.markers, 20)
  })
  await reset(db)
  await check('browser roles are closed; only the server executes the fixed-path definer', () => permissionProof(db))
} finally { await db.close() }

if (process.argv.includes('--mutants')) {
  const replaceOnce = (source, from, to) => { assert.equal(source.split(from).length, 2, 'mutant anchor is unique'); return source.replace(from, to) }
  const receiptBlock = sql.slice(sql.indexOf('  insert into public.one_time_item_purchases ('), sql.indexOf('  if v_inserted = 0 then'))
  const eventStart = sql.indexOf('  insert into public.events (name, user_id, session_id, path, metadata)')
  const eventEnd = sql.indexOf('\n  return true;', eventStart)
  const eventBlock = sql.slice(eventStart, eventEnd)
  const mutants = [
    ['omit receipt', replaceOnce(sql, receiptBlock, '  v_inserted := 1;\n'), basicProof],
    ['omit has_paid', replaceOnce(sql, 'has_paid = true,', 'has_paid = has_paid,'), basicProof],
    ['overwrite balance', replaceOnce(sql, 'coalesce(video_credits, 0) + p_credits', 'p_credits'), basicProof],
    ['omit access', replaceOnce(sql, "then greatest(coalesce(ads_access_until, '-infinity'::timestamptz), now() + interval '365 days')", 'then ads_access_until'), basicProof],
    ['ignore receipt mismatch', replaceOnce(sql, "      raise exception 'one_time_item: session receipt mismatch';", '      return false;'), basicProof],
    ['omit fulfillment marker', replaceOnce(sql, "  insert into public.stripe_events (id) values ('checkout_fulfilled:' || p_session_id);", '  null;'), basicProof],
    ['swallow final event failure', replaceOnce(sql, eventBlock, `  begin\n${eventBlock}\n  exception when others then null;\n  end;`), eventRollbackProof],
    ['grant publicly executable', replaceOnce(sql, '  from public, anon, authenticated;\ngrant execute', '  from anon, authenticated;\ngrant execute'), permissionProof],
  ]
  for (const [name, source, proof] of mutants) {
    const mutated = await world(source) // Invalid SQL is not counted as a killed behavioral mutant.
    try { await assert.rejects(() => proof(mutated), undefined, 'mutant survived: ' + name) }
    finally { await mutated.close() }
    proofs++; console.log('ok SQL mutant rejected: ' + name)
  }
}
console.log(`ok ${proofs} SQL proofs; actual PostgreSQL/WASM, no network or credentials; proposed migration remains unapplied`)
