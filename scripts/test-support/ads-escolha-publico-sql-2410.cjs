// KINEO-ADS-ESCOLHA-PUBLICO-2410 — optional embedded Postgres proof; no credential, network or real database.
// node scripts/test-support/ads-escolha-publico-sql-2410.cjs <installed-PGlite-module-path> [migration-file]
const fs = require('node:fs');
const assert = require('node:assert/strict');
const { PGlite } = require(process.argv[2] || '@electric-sql/pglite');
(async () => {
const db = new PGlite();
await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
create table public.ads_v2_orders (id uuid primary key,user_id uuid,status text,assembly_lease_at timestamptz,plan jsonb);
grant usage on schema public to service_role;grant select,update on public.ads_v2_orders to service_role;`);
await db.exec(fs.readFileSync(process.argv[3] || 'supabase/migrations/20261024035403_ads_escolha_photo_quota.sql','utf8'));
const owner='00000000-0000-4000-8000-000000000001', actor='00000000-0000-4000-8000-000000000002', other='00000000-0000-4000-8000-000000000003', lease='2026-10-24T03:00:00.000Z';
const ids=Array.from({length:9},(_,i)=>`10000000-0000-4000-8000-${String(i+1).padStart(12,'0')}`);
for(const id of ids)await db.query('insert into ads_v2_orders values($1,$2,$3,$4,$5)',[id,owner,'planned',lease,{escolhaFlow:{marker:'KINEO-ADS-ESCOLHA-2310'}}]);
await db.exec('set role service_role');
const reserve=async(id,o=owner,a=actor,l=lease)=>(await db.query('select public.reserve_ads_escolha_photos($1,$2,$3,$4) as result',[id,o,a,l])).rows[0].result;
for(const id of ids.slice(0,6))assert.equal((await reserve(id)).code,'ok');
assert.equal((await reserve(ids[6])).code,'cena_photo_daily_limit');
assert.equal((await reserve(ids[0])).code,'ok');
assert.equal((await reserve(ids[7],other)).code,'cena_photo_quota_unavailable');
assert.equal((await reserve(ids[7],owner,actor,'2026-10-24T03:00:01Z')).code,'cena_photo_quota_unavailable');
await db.exec('reset role');
assert.equal((await db.query('select count(*)::int as n from ads_escolha_photo_requests')).rows[0].n,6);
await db.exec(`update ads_escolha_photo_requests set requested_at=requested_at-interval '1 day',request_day=request_day-1`);
await db.exec('set role service_role');
assert.equal((await reserve(ids[0])).code,'ok','yesterday order consumes a new slot today');
await db.exec('reset role');
assert.equal((await db.query('select count(*)::int as n from ads_escolha_photo_requests')).rows[0].n,7);
await db.query("update ads_v2_orders set status='delivered' where id=$1",[ids[0]]);
assert.equal((await db.query('select count(*)::int as n from ads_escolha_ready_notices')).rows[0].n,1,'choice delivery atomically creates a notice');
await db.query("update ads_v2_orders set status='delivered' where id=$1",[ids[0]]);
assert.equal((await db.query('select count(*)::int as n from ads_escolha_ready_notices')).rows[0].n,1,'replayed delivery creates no duplicate notice');
await db.query("update ads_v2_orders set status='delivered',plan='{}'::jsonb where id=$1",[ids[8]]);
assert.equal((await db.query('select count(*)::int as n from ads_escolha_ready_notices')).rows[0].n,1,'legacy delivery creates no choice notice');
for(const role of ['anon','authenticated']){
 await db.exec('set role '+role);
 await assert.rejects(reserve(ids[8]),/permission denied/);
 await assert.rejects(db.query('select * from ads_escolha_photo_requests'),/permission denied/);
 await assert.rejects(db.query('select * from ads_escolha_ready_notices'),/permission denied/);
 await db.exec('reset role');
}
console.log('SQL green: migration executes in embedded Postgres,6 allowed,7th blocked,replay,ownership,lease,UTC rollover,atomic delivery notice,service-only permissions. Advisory lock executes; parallel live DB not exercised.');
await db.close();
})().catch(e=>{console.error(e);process.exitCode=1});
