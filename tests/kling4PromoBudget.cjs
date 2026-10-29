// Embedded Postgres only: no provider, production credentials or paid render.
// node tests/kling4PromoBudget.cjs [path-to-installed-@electric-sql/pglite]
const assert=require('node:assert/strict')
const fs=require('node:fs')
const path=require('node:path')
const {PGlite}=require(process.argv[2]||'@electric-sql/pglite')
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`

async function main(){
 const db=new PGlite()
 try{
  await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;
   grant usage on schema public to service_role;
   create table public.profiles(id uuid primary key,plan text,stripe_subscription_id text,paypal_subscription_id text,dodo_subscription_id text);
   create table public.events(id uuid primary key,name text not null,user_id uuid,path text,metadata jsonb,created_at timestamptz default now());
   grant select,update on public.profiles to service_role;grant select,insert on public.events to service_role;
   create table public.kling4_test_clock(t timestamptz);insert into public.kling4_test_clock values('2026-10-29T12:00:00Z');
   grant select on public.kling4_test_clock to service_role;
   create function public.kling4_test_now() returns timestamptz language sql as $$select t from public.kling4_test_clock$$;`)
  const migration=fs.readdirSync(path.resolve(__dirname,'../supabase/migrations')).find(n=>n.endsWith('_kling4_paid_promo_daily_budget.sql'))
  assert.ok(migration)
  const sql=fs.readFileSync(path.resolve(__dirname,'../supabase/migrations',migration),'utf8')
  assert.match(sql,/security invoker set search_path=''/)
  assert.doesNotMatch(sql,/security definer|auth\.role|delete from/)
  // Deterministic test clock replaces only the clock expression; production RPC has no caller-controlled clock.
  await db.exec(sql.replaceAll('pg_catalog.now()','public.kling4_test_now()'))
  const profile=async(n,provider='stripe')=>db.query(`insert into public.profiles(id,plan,${provider}_subscription_id) values($1,'basic',$2) on conflict(id) do update set plan='basic',${provider}_subscription_id=excluded.${provider}_subscription_id`,[id(n),`sub_${n}`])
  for(let n=1;n<=70;n++)await profile(n)
  const call=async(n,job,extra={})=>{
   const a={kind:'film',seconds:15,extras:1280,plan:'basic',provider:'stripe',subscription:`sub_${n}`,
    started:'2026-10-01T00:00:00Z',through:'2027-01-01T00:00:00Z',verified:'2026-10-29T12:00:00Z',launch:'2026-10-28T00:00:00Z',paid:true,promo:true,...extra}
   return(await db.query(`select public.reserve_kling4_promo($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) r`,
    [id(n),job,a.kind,a.seconds,a.extras,a.plan,a.provider,a.subscription,a.started,a.through,a.verified,a.launch,a.paid,a.promo])).rows[0].r
  }
  const record=async(n,job)=>(await db.query('select public.record_kling4_paid_use($1,$2) r',[id(n),job])).rows[0].r
  await db.exec('set role service_role')
  assert.equal((await call(1,'off',{paid:false})).reason,'paid_off')
  assert.equal((await call(1,'off',{promo:false})).reason,'promo_off')
  assert.equal((await call(1,'unset',{launch:null})).reason,'launch_unconfigured')
  assert.equal((await call(1,'future',{launch:'2026-11-01T00:00:00Z'})).reason,'not_launched')
  for(const extra of [{plan:'free'},{plan:'autopilot_trial'},{subscription:'sub_forged'},{through:'2026-10-29T12:00:00Z'},
   {verified:'2026-10-29T11:58:59Z'},{verified:'2026-10-29T12:00:06Z'}])assert.equal((await call(1,'bad',extra)).reason,'subscription_unverified')
  const one=await call(1,'one',{kind:'film'}),two=await call(1,'two',{kind:'ad'}),three=await call(1,'three',{kind:'film'})
  assert.ok([one,two,three].every(r=>r.is_free===true));assert.equal(three.remaining,0)
  const four=await call(1,'four',{kind:'ad'});assert.equal(four.reason,'daily_limit');assert.equal(four.is_free,false)
  const replay=await call(1,'one',{paid:false,promo:false});assert.equal(replay.duplicate,true);assert.equal(replay.is_free,true)
  assert.equal((await call(1,'one',{seconds:30})).reason,'identity_conflict')
  assert.equal((await record(1,'one')).code,'ok');assert.equal((await record(1,'one')).code,'unchanged')
  const event=(await db.query("select metadata from public.events where name='kling4_paid_engine_used'")).rows
  assert.equal(event.length,1);assert.equal(event[0].metadata.cost_usd,3.635);assert.equal(event[0].metadata.cost_basis,'reserved_upper_bound')
  // Global shared cap across many different people; an ad and a film use the SAME ledger.
  const outcomes=await Promise.all(Array.from({length:40},(_,j)=>call(j+2,'global',{kind:j%2?'film':'ad'})))
  assert.equal(outcomes.filter(r=>r.is_free).length,24)
  assert.equal(outcomes.filter(r=>r.reason==='daily_cap').length,16)
  assert.equal((await db.query('select reserved_milliusd n from public.kling4_promo_days')).rows[0].n,98145)
  assert.equal((await call(2,'global')).duplicate,true)
  // Do not reset a full day, and never replenish after an ambiguous provider failure.
  assert.equal((await db.query('select sum(uses)::int n from public.kling4_promo_user_days')).rows[0].n,27)
  await assert.rejects(db.query('delete from public.kling4_promo_uses'),/permission denied/)
  await db.exec('reset role')
  // UTC rollover frees the new day, but preserves prior identities and the original enrollment.
  await db.exec("update public.kling4_test_clock set t='2026-10-30T00:00:00Z'")
  await db.exec('set role service_role')
  assert.equal((await call(1,'next-day',{verified:'2026-10-30T00:00:00Z'})).is_free,true)
  assert.equal((await call(1,'one')).duplicate,true)
  assert.equal((await db.query('select count(*)::int n from public.kling4_promo_days')).rows[0].n,2)
  await db.exec('reset role')
  // Event write failure rolls back reservation, counters AND enrollment, making retry safe.
  await db.exec('alter table public.events rename to events_unavailable;set role service_role')
  await assert.rejects(call(60,'rollback',{verified:'2026-10-30T00:00:00Z'}),/does not exist/)
  assert.equal((await db.query('select count(*)::int n from public.kling4_promo_uses where user_id=$1',[id(60)])).rows[0].n,0)
  assert.equal((await db.query('select count(*)::int n from public.kling4_promo_enrollments where user_id=$1',[id(60)])).rows[0].n,0)
  await db.exec('reset role;alter table public.events_unavailable rename to events;set role service_role')
  assert.equal((await call(60,'rollback',{verified:'2026-10-30T00:00:00Z'})).is_free,true)
  await db.exec('reset role')
  for(const [n,plan] of [[61,'creator'],[62,'studio']]){
   await db.query('update public.profiles set plan=$1 where id=$2',[plan,id(n)])
   await db.exec('set role service_role')
   assert.equal((await call(n,'legacy',{plan,verified:'2026-10-30T00:00:00Z'})).is_free,true)
   assert.equal((await call(n,'bad-provider',{plan,subscription:'sub_wrong',verified:'2026-10-30T00:00:00Z'})).reason,'subscription_unverified')
   await db.exec('reset role')
  }
  await db.exec('set role service_role')
  // Exact 30-day expiry for existing subscribers, no window reset when they buy another subscription.
  await db.exec('reset role');await db.exec("update public.kling4_test_clock set t='2026-11-27T00:00:00Z'")
  await db.exec('set role service_role')
  assert.equal((await call(1,'expired',{started:'2026-11-26T00:00:00Z',verified:'2026-11-27T00:00:00Z'})).reason,'expired')
  // Last permitted new signup (30 November, UTC) can continue through 30 December.
  await db.exec('reset role');await db.exec("update public.kling4_test_clock set t='2026-12-01T00:00:00Z'");await db.exec('set role service_role')
  const last=await call(65,'last',{started:'2026-11-30T23:59:59.999Z',verified:'2026-12-01T00:00:00Z'})
  assert.equal(last.is_free,true);assert.equal(Date.parse(last.expires_at),Date.parse('2026-12-30T23:59:59.999Z'))
  assert.equal((await call(66,'closed',{started:'2026-12-01T00:00:00Z',verified:'2026-12-01T00:00:00Z'})).reason,'signup_closed')
  await db.exec('reset role')
  for(const role of ['anon','authenticated']){
   await db.exec(`set role ${role}`)
   await assert.rejects(call(1,'forbidden'),/permission denied/)
   await assert.rejects(record(1,'one'),/permission denied/)
   for(const table of ['kling4_promo_days','kling4_promo_user_days','kling4_promo_enrollments','kling4_promo_uses'])
    await assert.rejects(db.query('select * from public.'+table),/permission denied/)
   await db.exec('reset role')
  }
  console.log('PASS Kling4 paid promotion: exact shared $100 fal cap incl extras; 3/day per person across films+ads; immutable replay/window; only verified paid; UTC cutoff/rollover; event rollback; reserved vs accepted events; service-role-only/RLS. Embedded Postgres serializes requests; live multi-connection concurrency is not exercised.')
 }finally{await db.close()}
}
main().catch(error=>{console.error(error);process.exitCode=1})
